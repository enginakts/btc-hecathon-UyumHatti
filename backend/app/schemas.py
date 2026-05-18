from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ProductFacts(BaseModel):
    """Satıcının doğruladığı yapılandırılmış gerçekler (halüsinasyon azaltma)."""

    sku: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    materials: Optional[str] = None
    certifications: Optional[str] = None
    forbidden_claims: Optional[str] = Field(
        default=None,
        description="Kesinlikle kullanılmaması gereken ifadeler, noktalı virgülle",
    )


class StressTestRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=20000)
    product_facts: Optional[ProductFacts] = None
    marketplace_profile: str = Field(
        default="general",
        description="Pazaryeri profili: general, kozmetik, elektronik, gida",
    )
    target_regions: List[str] = Field(
        default=["TR", "EU"],
        description="Hedef coğrafi bölgeler: TR, EU, US",
    )
    use_llm: bool = Field(default=True, description="False ise sadece kural tabanlı mock")
    gemini_api_key: Optional[str] = Field(default=None)
    gemini_model: Optional[str] = Field(default="gemini-1.5-flash")


class RiskItem(BaseModel):
    code: str
    severity: Literal["low", "medium", "high"]
    message: str
    excerpt: Optional[str] = None
    policy_hint: Optional[str] = None


class CriticOutput(BaseModel):
    risks: List[RiskItem]
    summary: str
    human_review_required: bool = False


class EditorOutput(BaseModel):
    revised_title: str
    revised_description: str
    changelog: List[str]
    remaining_risks: List[str]


class ArbiterOutput(BaseModel):
    """Denetçi (hakem) ajanı çıktısı — savcı ve düzeltici arasındaki çelişkileri çözer."""

    decision: Literal["approved", "needs_revision", "rejected"]
    reasoning: str
    final_title: str
    final_description: str
    human_review_required: bool = False
    consensus_notes: List[str] = Field(default_factory=list)


class GeoLaw(BaseModel):
    code: str
    name: str
    relevant_articles: List[str] = Field(default_factory=list)
    url: str = ""
    note: str = ""


class GeoRegulation(BaseModel):
    region: str
    region_name: str
    flag_emoji: str = ""
    applicable_laws: List[GeoLaw] = Field(default_factory=list)
    compliance_score: int = Field(default=50, ge=0, le=100)
    risk_summary: str = ""
    recommendations: List[str] = Field(default_factory=list)


class TokenUsage(BaseModel):
    critic_tokens: int = 0
    editor_tokens: int = 0
    arbiter_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0


class PipelineStep(BaseModel):
    step: str
    label: str
    status: Literal["pending", "running", "done", "skipped", "error"]
    duration_ms: int = 0
    message: str = ""


class StressTestResponse(BaseModel):
    mode: Literal["llm", "mock"]
    critic: CriticOutput
    editor: EditorOutput
    arbiter: Optional[ArbiterOutput] = None
    geo_regulations: List[GeoRegulation] = Field(default_factory=list)
    policy_snippets_used: List[str] = Field(default_factory=list)
    token_usage: Optional[TokenUsage] = None
    pipeline_steps: List[PipelineStep] = Field(default_factory=list)
    overall_compliance_score: int = Field(default=50, ge=0, le=100)
    error_message: Optional[str] = None

