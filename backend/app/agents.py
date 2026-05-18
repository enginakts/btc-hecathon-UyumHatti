from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

from openai import AsyncOpenAI

from app.config import get_settings
from app.geo import analyze_geo
from app.policy import load_policy_text, retrieve_policy_snippets
from app.schemas import (
    ArbiterOutput,
    CriticOutput,
    EditorOutput,
    PipelineStep,
    ProductFacts,
    RiskItem,
    StressTestRequest,
    StressTestResponse,
    TokenUsage,
)

# ── Kural tabanlı risk tarayıcı ──────────────────────────────────────────

_RULES: List[Tuple[str, str, str, str]] = [
    (r"\bşifa\b|\btedavi\b|\bkanser\b|\btanı\b|\bilaç\b", "UNSUB_HEALTH", "high", "Sağlık/tedavi iması"),
    (
        r"\bgaranti\b|\bgarantili\b|\bkesin sonuç\b|\b%100\b|\byüzde yüz\b",
        "UNSUB_GUARANTEE",
        "medium",
        "Mutlak garanti / kesin sonuç iddiası",
    ),
    (r"\ben iyi\b|\bbir numara\b|\b#1\b|\bpiyasadaki tek\b", "UNSUB_SUPERLATIVE", "medium", "Kanıtsız üstünlük iddiası"),
    (r"\bçevre dostu\b|\byeşil ürün\b|\bkarbon nötr\b", "UNSUB_ENV", "low", "Genel çevre iddiası (ölçüt gerekir)"),
    (r"\bson \d+ adet\b|\bson dakika\b|\bhemen\b", "UNSUB_URGENCY", "low", "Aciliyet / stok baskısı (doğrulanmalı)"),
    (r"\b%?\d+\s*indirim\b|\breferans fiyat\b", "UNSUB_DISCOUNT", "low", "İndirim / referans fiyat (koşullara uygun olmalı)"),
]


def _full_listing(req: StressTestRequest) -> str:
    parts = [req.title.strip(), req.description.strip()]
    if req.product_facts:
        parts.append("\n--- Ürün gerçekleri (satıcı onayı) ---\n" + req.product_facts.model_dump_json(exclude_none=True))
    return "\n\n".join(parts)


def _mock_find_excerpts(text: str, pattern: str) -> List[str]:
    out: List[str] = []
    for m in re.finditer(pattern, text, flags=re.IGNORECASE | re.UNICODE):
        span = text[max(0, m.start() - 40) : min(len(text), m.end() + 40)].replace("\n", " ")
        out.append(span.strip())
        if len(out) >= 3:
            break
    return out


def run_rule_scan(listing: str) -> List[RiskItem]:
    risks: List[RiskItem] = []
    for pattern, code, sev, label in _RULES:
        if re.search(pattern, listing, flags=re.IGNORECASE | re.UNICODE):
            excerpts = _mock_find_excerpts(listing, pattern)
            ex = excerpts[0] if excerpts else None
            risks.append(
                RiskItem(
                    code=code,
                    severity=sev,  # type: ignore[arg-type]
                    message=label,
                    excerpt=ex,
                    policy_hint="Sentetik Politika: ilgili bölümde iddiaların doğrulanabilir olması gerekir.",
                )
            )
    return risks


def _facts_conflict_scan(listing: str, facts: Optional[ProductFacts]) -> List[RiskItem]:
    if not facts:
        return []
    mat = (facts.materials or "").strip().lower()
    if not mat:
        return []
    risks: List[RiskItem] = []
    if "plastik" in mat and re.search(r"\bahşap\b|\b100\s*%\s*doğal\b", listing, re.I):
        risks.append(
            RiskItem(
                code="SPEC_HALLUCINATION",
                severity="high",
                message="Metin, satıcının verdiği malzeme bilgisiyle çelişiyor olabilir.",
                excerpt=None,
                policy_hint="Ürün gerçekleri ile metin uyumu kontrol edilmeli.",
            )
        )
    return risks


def _calculate_compliance(risks: List[RiskItem]) -> int:
    penalty = sum({"high": 18, "medium": 10, "low": 4}.get(r.severity, 4) for r in risks)
    return max(5, min(100, 100 - penalty))


# ── Mock arbiter ──────────────────────────────────────────────────────────

def _mock_arbiter(critic: CriticOutput, editor: EditorOutput, req: StressTestRequest) -> ArbiterOutput:
    """Kural tabanlı denetçi — savcı ve düzeltici çıktılarını karşılaştırır."""
    high_risks = [r for r in critic.risks if r.severity == "high"]
    remaining = editor.remaining_risks

    notes: List[str] = []
    human_required = critic.human_review_required

    if high_risks and not remaining:
        notes.append("Savcı yüksek risk tespit etti, düzeltici riskleri giderdi — onaylandı.")
        decision = "approved"
    elif high_risks and remaining:
        notes.append("Yüksek riskler tam giderilemedi — insan incelemesi zorunlu.")
        decision = "needs_revision"
        human_required = True
    elif critic.risks and not remaining:
        notes.append("Orta/düşük riskler düzeltici tarafından giderildi.")
        decision = "approved"
    elif not critic.risks:
        notes.append("Risk bulunamadı — metin uyumlu görünüyor.")
        decision = "approved"
    else:
        notes.append("Bazı riskler kaldı — revizyon önerilir.")
        decision = "needs_revision"

    health_risks = [r for r in critic.risks if r.code == "UNSUB_HEALTH"]
    if health_risks:
        notes.append("Sağlık iddiası içeriyor — hukuki inceleme şart.")
        human_required = True

    return ArbiterOutput(
        decision=decision,  # type: ignore[arg-type]
        reasoning=" | ".join(notes),
        final_title=editor.revised_title,
        final_description=editor.revised_description,
        human_review_required=human_required,
        consensus_notes=notes,
    )


# ── Mock pipeline ────────────────────────────────────────────────────────

def mock_pipeline(req: StressTestRequest) -> StressTestResponse:
    steps: List[PipelineStep] = []

    # Step 1: Kural tarama
    t0 = time.perf_counter_ns()
    listing = _full_listing(req)
    snippets = retrieve_policy_snippets(listing)
    risks = run_rule_scan(listing) + _facts_conflict_scan(listing, req.product_facts)
    dur1 = (time.perf_counter_ns() - t0) // 1_000_000
    steps.append(PipelineStep(step="rule_scan", label="Kural Tarama", status="done", duration_ms=dur1, message=f"{len(risks)} risk bulundu"))

    # Step 2: Savcı (critic)
    human = any(r.severity == "high" for r in risks) or any(r.code == "UNSUB_HEALTH" for r in risks)
    critic = CriticOutput(
        risks=risks,
        summary="Kural tabanlı tarama tamamlandı." if risks else "Belirgin kural ihlali bulunamadı (mock).",
        human_review_required=human,
    )
    steps.append(PipelineStep(step="critic", label="Savcı Analizi", status="done", duration_ms=dur1, message=critic.summary))

    # Step 3: Düzeltici (editor)
    t2 = time.perf_counter_ns()
    rev_title, rev_desc = req.title, req.description
    changelog: List[str] = []
    replacements = [
        (r"\bşifa\b", "rahatlatıcı etki (tıbbi iddia değildir)", "UNSUB_HEALTH"),
        (r"\btedavi\b", "bakım", "UNSUB_HEALTH"),
        (r"\bkesin sonuç\b", "kişiye göre değişen sonuç", "UNSUB_GUARANTEE"),
        (r"\b%100\b|\byüzde yüz\b", "yüksek oranda", "UNSUB_GUARANTEE"),
        (r"\bgarantili\b", "koşullara tabi garanti (satış belgelerine bakınız)", "UNSUB_GUARANTEE"),
        (r"\bgaranti\b", "koşullara tabi garanti (satış belgelerine bakınız)", "UNSUB_GUARANTEE"),
        (r"\ben iyi\b", "öne çıkan", "UNSUB_SUPERLATIVE"),
        (r"\b#1\b", "çok tercih edilenler arasında", "UNSUB_SUPERLATIVE"),
        (r"\bpiyasadaki tek\b", "belirgin özelliklere sahip", "UNSUB_SUPERLATIVE"),
    ]
    for pat, rep, code in replacements:
        if any(r.code == code for r in risks):
            new_t, n1 = re.subn(pat, rep, rev_title, flags=re.I)
            new_d, n2 = re.subn(pat, rep, rev_desc, flags=re.I)
            if n1 or n2:
                changelog.append(f"{code}: '{pat}' → önerilen ifade")
            rev_title, rev_desc = new_t, new_d
    remaining = [r.code for r in risks if r.severity == "high" and r.code == "SPEC_HALLUCINATION"]
    editor = EditorOutput(
        revised_title=rev_title.strip(),
        revised_description=rev_desc.strip(),
        changelog=changelog or ["Otomatik değişiklik uygulanmadı; metin manuel gözden geçirilmeli."],
        remaining_risks=remaining,
    )
    dur3 = (time.perf_counter_ns() - t2) // 1_000_000
    steps.append(PipelineStep(step="editor", label="Düzeltici", status="done", duration_ms=dur3, message=f"{len(changelog)} değişiklik"))

    # Step 4: Denetçi (arbiter)
    t3 = time.perf_counter_ns()
    arbiter = _mock_arbiter(critic, editor, req)
    dur4 = (time.perf_counter_ns() - t3) // 1_000_000
    steps.append(PipelineStep(step="arbiter", label="Denetçi", status="done", duration_ms=dur4, message=arbiter.decision))

    # Step 5: Coğrafi analiz
    t4 = time.perf_counter_ns()
    geo = analyze_geo(risks, req.target_regions)
    dur5 = (time.perf_counter_ns() - t4) // 1_000_000
    steps.append(PipelineStep(step="geo", label="Coğrafi Analiz", status="done", duration_ms=dur5, message=f"{len(geo)} bölge analiz edildi"))

    compliance = _calculate_compliance(risks)

    return StressTestResponse(
        mode="mock",
        critic=critic,
        editor=editor,
        arbiter=arbiter,
        geo_regulations=geo,
        policy_snippets_used=snippets[:3],
        pipeline_steps=steps,
        overall_compliance_score=compliance,
    )


# ── LLM prompts ──────────────────────────────────────────────────────────

CRITIC_SCHEMA_HINT = """{
  "risks": [{"code": "string", "severity": "low|medium|high", "message": "string", "excerpt": "string|null", "policy_hint": "string|null"}],
  "summary": "string",
  "human_review_required": boolean
}"""

EDITOR_SCHEMA_HINT = """{
  "revised_title": "string",
  "revised_description": "string",
  "changelog": ["string"],
  "remaining_risks": ["string"]
}"""

ARBITER_SCHEMA_HINT = """{
  "decision": "approved|needs_revision|rejected",
  "reasoning": "string",
  "final_title": "string",
  "final_description": "string",
  "human_review_required": boolean,
  "consensus_notes": ["string"]
}"""


def _llm_config(req: StressTestRequest) -> Tuple[str, str, str]:
    settings = get_settings()
    api_key = (req.gemini_api_key or settings.gemini_api_key or "").strip()
    base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
    model = (req.gemini_model or settings.gemini_model or "gemini-1.5-flash").strip()
    return api_key, base_url, model


def _track_tokens(resp: Any) -> int:
    """OpenAI response nesnesinden toplam token kullanımını çıkarır."""
    try:
        return resp.usage.total_tokens if resp.usage else 0
    except Exception:
        return 0


async def llm_pipeline(req: StressTestRequest) -> StressTestResponse:
    api_key, base_url, model = _llm_config(req)
    listing = _full_listing(req)
    snippets = retrieve_policy_snippets(listing)
    policy_block = "\n---\n".join(snippets) if snippets else (load_policy_text()[:4000])
    steps: List[PipelineStep] = []
    token_usage = TokenUsage()

    client_kw: Dict[str, Any] = {"api_key": api_key}
    if base_url:
        client_kw["base_url"] = base_url
    client = AsyncOpenAI(**client_kw)

    # Step 0: Kural tarama (hibrit)
    t0 = time.perf_counter_ns()
    rule_risks = run_rule_scan(listing) + _facts_conflict_scan(listing, req.product_facts)
    dur0 = (time.perf_counter_ns() - t0) // 1_000_000
    steps.append(PipelineStep(step="rule_scan", label="Kural Tarama", status="done", duration_ms=dur0, message=f"{len(rule_risks)} kural eşleşmesi"))

    # Step 1: Savcı (Critic)
    t1 = time.perf_counter_ns()
    critic_prompt = f"""Sen bir pazaryeri içerik denetçisisin (savcı rolü). Aşağıdaki politika özetine ve ürün listeleme metnine göre riskleri çıkar.
Politika özeti:
{policy_block}

Listeleme metni:
{listing}

Kural motorunun önceden bulduğu riskler (referans): {json.dumps([r.model_dump() for r in rule_risks], ensure_ascii=False)}

Yanıtı SADECE şu JSON şemasına uygun tek bir JSON nesnesi olarak ver (başka metin yok): {CRITIC_SCHEMA_HINT}
Türkçe yaz. excerpt alıntı kısa olsun."""

    c_resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Yanıtın yalnızca geçerli JSON olmalı."},
            {"role": "user", "content": critic_prompt},
        ],
        response_format={"type": "json_object"},
    )
    token_usage.critic_tokens = _track_tokens(c_resp)
    critic_raw = c_resp.choices[0].message.content or "{}"
    dur1 = (time.perf_counter_ns() - t1) // 1_000_000
    try:
        critic = CriticOutput.model_validate(json.loads(critic_raw))
    except Exception:
        raise ValueError("critic_json_invalid")
    steps.append(PipelineStep(step="critic", label="Savcı Analizi", status="done", duration_ms=dur1, message=critic.summary[:80]))

    # Step 2: Düzeltici (Editor)
    t2 = time.perf_counter_ns()
    editor_prompt = f"""Sen düzenleyicisin. Listeleme metnini savcı risklerine göre yasal ve politika güvenli hale getir; abartıyı kaldır, kanıtsız iddiaları yumuşat veya sil.
Orijinal başlık: {req.title}
Orijinal açıklama: {req.description}

Savcı özeti: {critic.summary}
Savcı riskleri JSON: {json.dumps([r.model_dump() for r in critic.risks], ensure_ascii=False)}

Yanıtı SADECE şu JSON şemasına uygun tek bir JSON nesnesi olarak ver: {EDITOR_SCHEMA_HINT}
Türkçe yaz."""

    e_resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Yanıtın yalnızca geçerli JSON olmalı."},
            {"role": "user", "content": editor_prompt},
        ],
        response_format={"type": "json_object"},
    )
    token_usage.editor_tokens = _track_tokens(e_resp)
    editor_raw = e_resp.choices[0].message.content or "{}"
    dur2 = (time.perf_counter_ns() - t2) // 1_000_000
    try:
        editor = EditorOutput.model_validate(json.loads(editor_raw))
    except Exception:
        raise ValueError("editor_json_invalid")
    steps.append(PipelineStep(step="editor", label="Düzeltici", status="done", duration_ms=dur2, message=f"{len(editor.changelog)} değişiklik"))

    # Step 3: Denetçi (Arbiter)
    t3 = time.perf_counter_ns()
    arbiter_prompt = f"""Sen hakemsin (arbiter). Savcı riskleri ile düzeltici çıktısını karşılaştır ve son kararı ver.

Savcı riskleri: {json.dumps([r.model_dump() for r in critic.risks], ensure_ascii=False)}
Savcı özeti: {critic.summary}
Savcı insan incelemesi gerekli mi: {critic.human_review_required}

Düzeltici revize başlık: {editor.revised_title}
Düzeltici revize açıklama: {editor.revised_description}
Düzeltici kalan riskler: {json.dumps(editor.remaining_risks, ensure_ascii=False)}

Karar ver: approved (riskler giderildi), needs_revision (eksikler var), rejected (ciddi sorun devam ediyor).
Yanıtı SADECE şu JSON şemasına uygun tek bir JSON nesnesi olarak ver: {ARBITER_SCHEMA_HINT}
Türkçe yaz."""

    a_resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Yanıtın yalnızca geçerli JSON olmalı."},
            {"role": "user", "content": arbiter_prompt},
        ],
        response_format={"type": "json_object"},
    )
    token_usage.arbiter_tokens = _track_tokens(a_resp)
    arbiter_raw = a_resp.choices[0].message.content or "{}"
    dur3 = (time.perf_counter_ns() - t3) // 1_000_000
    try:
        arbiter = ArbiterOutput.model_validate(json.loads(arbiter_raw))
    except Exception:
        arbiter = _mock_arbiter(critic, editor, req)
    steps.append(PipelineStep(step="arbiter", label="Denetçi", status="done", duration_ms=dur3, message=arbiter.decision))

    # Step 4: Coğrafi analiz
    t4 = time.perf_counter_ns()
    geo = analyze_geo(critic.risks, req.target_regions)
    dur4 = (time.perf_counter_ns() - t4) // 1_000_000
    steps.append(PipelineStep(step="geo", label="Coğrafi Analiz", status="done", duration_ms=dur4, message=f"{len(geo)} bölge"))

    token_usage.total_tokens = token_usage.critic_tokens + token_usage.editor_tokens + token_usage.arbiter_tokens
    token_usage.estimated_cost_usd = round(token_usage.total_tokens * 0.00015 / 1000, 4)

    compliance = _calculate_compliance(critic.risks)

    return StressTestResponse(
        mode="llm",
        critic=critic,
        editor=editor,
        arbiter=arbiter,
        geo_regulations=geo,
        policy_snippets_used=snippets,
        token_usage=token_usage,
        pipeline_steps=steps,
        overall_compliance_score=compliance,
    )


async def run_stress_test(req: StressTestRequest) -> StressTestResponse:
    api_key, _, _ = _llm_config(req)
    use_llm = req.use_llm and bool(api_key)
    if not use_llm:
        return mock_pipeline(req)
    try:
        return await llm_pipeline(req)
    except Exception as e:
        logger.exception("LLM Pipeline failed. Falling back to Mock Pipeline.")
        res = mock_pipeline(req)
        res.error_message = f"LLM Analiz Hatası: {type(e).__name__} - {str(e)}"
        return res
