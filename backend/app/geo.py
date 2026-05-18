"""Coğrafi düzenleme analizi — risk kodlarını bölgesel yasalara eşler."""

from __future__ import annotations

from typing import Dict, List

from app.schemas import GeoLaw, GeoRegulation, RiskItem

# ── Bölgesel yasa veritabanı ──────────────────────────────────────────────

_TR_LAWS: Dict[str, List[GeoLaw]] = {
    "UNSUB_HEALTH": [
        GeoLaw(
            code="TKHK-6502/61",
            name="Tüketicinin Korunması Hakkında Kanun",
            relevant_articles=["Madde 61 — Ticari reklamlarda yanıltıcı ifade yasağı"],
            url="https://tuketici.ticaret.gov.tr",
            note="Sağlık ve tedavi iddiası içeren reklamlar Sağlık Bakanlığı onayı gerektirir.",
        ),
        GeoLaw(
            code="TRKHY-12/7",
            name="Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği",
            relevant_articles=["Madde 7 — Aldatıcı reklamlar", "Madde 12 — Sağlık beyanları"],
            note="Tıbbi, kozmetik veya biyolojik etki iddiası bilimsel kanıt olmadan kullanılamaz.",
        ),
    ],
    "UNSUB_GUARANTEE": [
        GeoLaw(
            code="TKHK-6502/56",
            name="Tüketicinin Korunması Hakkında Kanun",
            relevant_articles=["Madde 56 — Garanti belgesi", "Madde 61 — Yanıltıcı reklam"],
            note="Garanti koşulları açıkça belirtilmeli; mutlak garanti iddiası belgeli olmalıdır.",
        ),
    ],
    "UNSUB_SUPERLATIVE": [
        GeoLaw(
            code="TRKHY-8",
            name="Ticari Reklam Yönetmeliği",
            relevant_articles=["Madde 8 — Karşılaştırmalı ve üstünlük iddiası içeren reklamlar"],
            note="\"En iyi\", \"bir numara\" gibi ifadeler bağımsız kanıtla desteklenmelidir.",
        ),
    ],
    "UNSUB_ENV": [
        GeoLaw(
            code="TRKHY-14",
            name="Ticari Reklam Yönetmeliği",
            relevant_articles=["Madde 14 — Çevresel beyanlar"],
            note="Çevre iddiası sertifika veya ölçülebilir veriyle desteklenmelidir.",
        ),
    ],
    "UNSUB_URGENCY": [
        GeoLaw(
            code="TKHK-6502/62",
            name="Tüketicinin Korunması Hakkında Kanun",
            relevant_articles=["Madde 62 — Haksız ticari uygulamalar"],
            note="Sahte aciliyet baskısı haksız ticari uygulama sayılır.",
        ),
    ],
    "UNSUB_DISCOUNT": [
        GeoLaw(
            code="TKHK-6502/63",
            name="Tüketicinin Korunması Hakkında Kanun",
            relevant_articles=["Madde 63 — İndirimli satışlar"],
            note="Referans fiyat gerçek satış geçmişine dayanmalı; yanıltıcı indirim yasaktır.",
        ),
    ],
    "SPEC_HALLUCINATION": [
        GeoLaw(
            code="TKHK-6502/61",
            name="Tüketicinin Korunması Hakkında Kanun",
            relevant_articles=["Madde 61 — Yanıltıcı reklam"],
            note="Ürün özellikleri gerçeğe uygun şekilde tanıtılmalıdır.",
        ),
    ],
}

_EU_LAWS: Dict[str, List[GeoLaw]] = {
    "UNSUB_HEALTH": [
        GeoLaw(
            code="EC-1924/2006",
            name="Nutrition and Health Claims Regulation",
            relevant_articles=["Article 3 — General conditions", "Article 10 — Health claims"],
            url="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006R1924",
            note="Health claims require EFSA-authorized wording; unauthorized claims are prohibited.",
        ),
        GeoLaw(
            code="UCPD-2005/29",
            name="Unfair Commercial Practices Directive",
            relevant_articles=["Article 6 — Misleading actions", "Article 7 — Misleading omissions"],
            note="Making unsubstantiated health claims is considered a misleading commercial practice.",
        ),
    ],
    "UNSUB_GUARANTEE": [
        GeoLaw(
            code="CRD-2011/83",
            name="Consumer Rights Directive",
            relevant_articles=["Article 6 — Information requirements"],
            note="Guarantee conditions must be clearly communicated before purchase.",
        ),
    ],
    "UNSUB_SUPERLATIVE": [
        GeoLaw(
            code="UCPD-2005/29",
            name="Unfair Commercial Practices Directive",
            relevant_articles=["Article 6 — Misleading actions"],
            note="Superlative claims without evidence are considered misleading.",
        ),
    ],
    "UNSUB_ENV": [
        GeoLaw(
            code="EU-GCD-2023",
            name="Green Claims Directive (proposal)",
            relevant_articles=["Article 3 — Substantiation of environmental claims"],
            url="https://environment.ec.europa.eu/topics/circular-economy/green-claims_en",
            note="Generic green claims (eco-friendly, sustainable) require LCA-based evidence.",
        ),
        GeoLaw(
            code="UCPD-2005/29",
            name="Unfair Commercial Practices Directive",
            relevant_articles=["Annex I, No. 4 — Environmental claims"],
            note="Unsubstantiated environmental claims are on the blacklist of unfair practices.",
        ),
    ],
    "UNSUB_URGENCY": [
        GeoLaw(
            code="UCPD-2005/29",
            name="Unfair Commercial Practices Directive",
            relevant_articles=["Article 6(1)(c) — Creating false urgency"],
            note="Fabricated urgency or scarcity is classified as an aggressive commercial practice.",
        ),
    ],
    "UNSUB_DISCOUNT": [
        GeoLaw(
            code="PID-98/6",
            name="Price Indication Directive",
            relevant_articles=["Article 6a — Price reductions (Omnibus amendment)"],
            note="Price reduction must reference the lowest price from the prior 30 days.",
        ),
    ],
    "SPEC_HALLUCINATION": [
        GeoLaw(
            code="UCPD-2005/29",
            name="Unfair Commercial Practices Directive",
            relevant_articles=["Article 6(1)(b) — Misleading product characteristics"],
            note="Misrepresenting product specifications is a misleading action.",
        ),
    ],
}

_US_LAWS: Dict[str, List[GeoLaw]] = {
    "UNSUB_HEALTH": [
        GeoLaw(
            code="FTC-Act-§5",
            name="FTC Act — Section 5",
            relevant_articles=["Section 5(a) — Unfair or deceptive acts"],
            note="Health claims require competent and reliable scientific evidence.",
        ),
        GeoLaw(
            code="FDA-21CFR101",
            name="FDA Food & Supplement Labeling",
            relevant_articles=["21 CFR 101.93 — Structure/function claims disclaimer"],
            note="Structure/function claims must include FDA disclaimer.",
        ),
    ],
    "UNSUB_GUARANTEE": [
        GeoLaw(
            code="FTC-Act-§5",
            name="FTC Act — Section 5",
            relevant_articles=["Section 5(a) — Deceptive guarantees"],
            note="Money-back guarantees must be honored; conditions must be disclosed.",
        ),
    ],
    "UNSUB_ENV": [
        GeoLaw(
            code="FTC-GreenGuides",
            name="FTC Green Guides (16 CFR Part 260)",
            relevant_articles=["§260.3 — General environmental benefit claims"],
            url="https://www.ftc.gov/sites/default/files/documents/federal_register_notices/guides-use-environmental-marketing-claims-green-guides/greenguides.pdf",
            note="Broad environmental claims should be qualified; 'eco-friendly' is too vague.",
        ),
    ],
    "UNSUB_SUPERLATIVE": [
        GeoLaw(
            code="FTC-Act-§5",
            name="FTC Act — Section 5",
            relevant_articles=["Substantiation doctrine"],
            note="Comparative superiority claims require head-to-head evidence.",
        ),
    ],
    "UNSUB_URGENCY": [
        GeoLaw(
            code="FTC-Act-§5",
            name="FTC Act — Section 5",
            relevant_articles=["Dark patterns policy statement"],
            note="Manufactured urgency may constitute a deceptive practice.",
        ),
    ],
    "UNSUB_DISCOUNT": [
        GeoLaw(
            code="FTC-Guides-§233",
            name="FTC Guides Against Deceptive Pricing (16 CFR Part 233)",
            relevant_articles=["§233.1 — Former price comparisons"],
            note="Reference price must be a genuine former selling price.",
        ),
    ],
    "SPEC_HALLUCINATION": [
        GeoLaw(
            code="FTC-Act-§5",
            name="FTC Act — Section 5",
            relevant_articles=["Section 5(a) — Misrepresentation"],
            note="Misrepresenting material product attributes is deceptive.",
        ),
    ],
}

_REGION_DB = {
    "TR": ("Türkiye", "🇹🇷", _TR_LAWS),
    "EU": ("Avrupa Birliği", "🇪🇺", _EU_LAWS),
    "US": ("Amerika Birleşik Devletleri", "🇺🇸", _US_LAWS),
}

_SEVERITY_WEIGHT = {"high": 30, "medium": 15, "low": 5}


def analyze_geo(risks: List[RiskItem], target_regions: List[str]) -> List[GeoRegulation]:
    """Risk listesine göre hedef bölgelerin düzenleyici analizini üretir."""
    results: List[GeoRegulation] = []

    for region_code in target_regions:
        entry = _REGION_DB.get(region_code.upper())
        if not entry:
            continue
        region_name, flag, law_db = entry

        applicable: List[GeoLaw] = []
        recommendations: List[str] = []
        penalty = 0
        seen_codes: set[str] = set()

        for risk in risks:
            laws = law_db.get(risk.code, [])
            for law in laws:
                if law.code not in seen_codes:
                    applicable.append(law)
                    seen_codes.add(law.code)
                if law.note and law.note not in recommendations:
                    recommendations.append(law.note)
            penalty += _SEVERITY_WEIGHT.get(risk.severity, 5)

        compliance = max(0, 100 - penalty)

        if compliance >= 80:
            summary = "Düşük risk — büyük ölçüde uyumlu."
        elif compliance >= 50:
            summary = "Orta risk — bazı düzenlemelerle uyumsuzluk olabilir."
        elif compliance >= 25:
            summary = "Yüksek risk — ciddi düzenleyici ihlal potansiyeli."
        else:
            summary = "Çok yüksek risk — birden fazla ihlal tespit edildi."

        results.append(
            GeoRegulation(
                region=region_code.upper(),
                region_name=region_name,
                flag_emoji=flag,
                applicable_laws=applicable,
                compliance_score=compliance,
                risk_summary=summary,
                recommendations=recommendations[:6],
            )
        )

    return results
