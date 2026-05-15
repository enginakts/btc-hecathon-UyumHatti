from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional, Tuple

_POLICY_CACHE: Optional[str] = None


def _policy_path() -> Path:
    return Path(__file__).resolve().parent.parent / "data" / "synthetic_policy.md"


def load_policy_text() -> str:
    global _POLICY_CACHE
    if _POLICY_CACHE is None:
        p = _policy_path()
        _POLICY_CACHE = p.read_text(encoding="utf-8") if p.exists() else ""
    return _POLICY_CACHE


def retrieve_policy_snippets(listing_text: str, max_chunks: int = 3) -> List[str]:
    """Basit anahtar kelime örtüşmesi ile chunk seçimi (MVP; vektör RAG sonraya)."""
    text = listing_text.lower()
    chunks = [c.strip() for c in load_policy_text().split("\n\n") if c.strip()]
    scored: List[Tuple[int, str]] = []
    for ch in chunks:
        words = re.findall(r"[\wğüşıöçĞÜŞİÖÇ]+", ch.lower())
        if not words:
            continue
        score = sum(1 for w in words if len(w) > 3 and w in text)
        scored.append((score, ch))
    scored.sort(key=lambda x: x[0], reverse=True)
    picked = [c for s, c in scored if s > 0][:max_chunks]
    if not picked and chunks:
        picked = chunks[:max_chunks]
    return picked
