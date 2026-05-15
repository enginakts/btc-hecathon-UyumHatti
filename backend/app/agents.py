from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Tuple

from openai import AsyncOpenAI

from app.config import get_settings
from app.policy import load_policy_text, retrieve_policy_snippets
from app.schemas import (
    CriticOutput,
    EditorOutput,
    ProductFacts,
    RiskItem,
    StressTestRequest,
    StressTestResponse,
)

# (regex veya anahtar kelime, kod, şiddet, kullanıcı mesajı şablonu)
_RULES: List[Tuple[str, str, str, str]] = [
    (r"\bşifa\b|\btedavi\b|\bkanser\b|\btanı\b|\bilaç\b", "UNSUB_HEALTH", "high", "Sağlık/tedavi iması"),
    (
        r"\bgaranti\b|\bgarantili\b|\bkesin sonuç\b|\b%100\b|\byüzde yüz\b",
        "UNSUB_GUARANTEE",
        "medium",
        "Mutlak garanti / kesin sonuç iddiası",
    ),
    (r"\ben iyi\b|\bbir numara\b|\b#1\b|\bpiyasadaki tek\b", "UNSUB_SUPERLATIVE", "medium", "Kanitsız üstünlük iddiası"),
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


def mock_pipeline(req: StressTestRequest) -> StressTestResponse:
    listing = _full_listing(req)
    snippets = retrieve_policy_snippets(listing)
    risks = run_rule_scan(listing) + _facts_conflict_scan(listing, req.product_facts)
    human = any(r.severity == "high" for r in risks) or any(r.code == "UNSUB_HEALTH" for r in risks)
    critic = CriticOutput(
        risks=risks,
        summary="Kural tabanlı tarama tamamlandı." if risks else "Belirgin kural ihlali bulunamadı (mock).",
        human_review_required=human,
    )
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
    return StressTestResponse(mode="mock", critic=critic, editor=editor, policy_snippets_used=snippets[:2])


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


def _llm_config(req: StressTestRequest) -> Tuple[str, str, str]:
    """(api_key, base_url, model) — istek alanları sunucu ayarlarından önceliklidir."""
    settings = get_settings()
    api_key = (req.openai_api_key or settings.openai_api_key or "").strip()
    base_url = (req.openai_base_url or settings.openai_base_url or "").strip().rstrip("/")
    model = (req.openai_model or settings.openai_model or "gpt-4o-mini").strip()
    return api_key, base_url, model


async def llm_pipeline(req: StressTestRequest) -> StressTestResponse:
    api_key, base_url, model = _llm_config(req)
    listing = _full_listing(req)
    snippets = retrieve_policy_snippets(listing)
    policy_block = "\n---\n".join(snippets) if snippets else (load_policy_text()[:4000])

    client_kw: Dict[str, Any] = {"api_key": api_key}
    if base_url:
        client_kw["base_url"] = base_url
    client = AsyncOpenAI(**client_kw)

    critic_prompt = f"""Sen bir pazaryeri içerik denetçisisin (savcı rolü). Aşağıdaki politika özetine ve ürün listeleme metnine göre riskleri çıkar.
Politika özeti:
{policy_block}

Listeleme metni:
{listing}

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
    critic_raw = c_resp.choices[0].message.content or "{}"
    try:
        critic_data = json.loads(critic_raw)
    except json.JSONDecodeError as e:
        raise ValueError("critic_json_decode") from e
    try:
        critic = CriticOutput.model_validate(critic_data)
    except Exception:
        raise ValueError("critic_json_invalid") from None

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
    editor_raw = e_resp.choices[0].message.content or "{}"
    try:
        editor_data = json.loads(editor_raw)
    except json.JSONDecodeError as e:
        raise ValueError("editor_json_decode") from e
    try:
        editor = EditorOutput.model_validate(editor_data)
    except Exception:
        raise ValueError("editor_json_invalid") from None

    return StressTestResponse(mode="llm", critic=critic, editor=editor, policy_snippets_used=snippets)


async def run_stress_test(req: StressTestRequest) -> StressTestResponse:
    api_key, _, _ = _llm_config(req)
    use_llm = req.use_llm and bool(api_key)
    if not use_llm:
        return mock_pipeline(req)
    try:
        return await llm_pipeline(req)
    except Exception:
        return mock_pipeline(req)
