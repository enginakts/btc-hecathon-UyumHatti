from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agents import run_stress_test
from app.policy import load_policy_text, retrieve_policy_snippets
from app.schemas import StressTestRequest, StressTestResponse

_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env)
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

app = FastAPI(title="İddia Stres Testi API", version="0.1.0")


@app.get("/")
async def root():
    """Tarayıcıda kök URL açıldığında 404 yerine yönlendirme bilgisi."""
    return {
        "service": "iddia-stres-testi-api",
        "docs": "/docs",
        "health": "/api/health",
        "stress_test_post": "/api/stress-test",
    }


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/stress-test", response_model=StressTestResponse)
async def stress_test(body: StressTestRequest) -> StressTestResponse:
    return await run_stress_test(body)


@app.get("/api/policy-preview")
async def policy_preview(q: str = ""):
    snippets = retrieve_policy_snippets(q, max_chunks=5) if q else retrieve_policy_snippets(load_policy_text()[:200], max_chunks=5)
    return {"snippets": snippets}
