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
    use_llm: bool = Field(default=True, description="False ise sadece kural tabanlı mock")
    openai_api_key: Optional[str] = Field(
        default=None,
        description="İstek ile gönderilen API anahtarı (sunucu .env değerinden öncelikli)",
    )
    openai_base_url: Optional[str] = Field(default=None, description="İsteğe bağlı OpenAI uyumlu API taban URL")
    openai_model: Optional[str] = Field(default=None, description="İsteğe bağlı model adı")


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


class StressTestResponse(BaseModel):
    mode: Literal["llm", "mock"]
    critic: CriticOutput
    editor: EditorOutput
    policy_snippets_used: List[str] = Field(default_factory=list)
