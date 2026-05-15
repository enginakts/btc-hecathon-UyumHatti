import { useEffect, useRef, useState } from "react";
import {
  clearApiSettings,
  formatSavedAt,
  loadApiSettings,
  maskApiKey,
  saveApiSettings,
} from "./apiSettings";

type Severity = "low" | "medium" | "high";

interface RiskItem {
  code: string;
  severity: Severity;
  message: string;
  excerpt: string | null;
  policy_hint: string | null;
}

interface ApiResponse {
  mode: "llm" | "mock";
  critic: {
    risks: RiskItem[];
    summary: string;
    human_review_required: boolean;
  };
  editor: {
    revised_title: string;
    revised_description: string;
    changelog: string[];
    remaining_risks: string[];
  };
  policy_snippets_used: string[];
}

const sampleTitle = "Doğal Ahşap Detoks Kremi — %100 şifa garantili en iyi çözüm";
const sampleDesc = `Cildinizi yeniler. Kanser hücrelerine karşı korur diyenler oldu; biz kesin sonuç vaat ediyoruz.
Son 3 adet! Çevre dostu yeşil ürün. #1 satış rekoru.`;

function sevLabel(s: Severity): string {
  if (s === "high") return "Yüksek";
  if (s === "medium") return "Orta";
  return "Düşük";
}

export default function App() {
  const initialApi = loadApiSettings();

  const [title, setTitle] = useState(sampleTitle);
  const [description, setDescription] = useState(sampleDesc);
  const [materials, setMaterials] = useState("ABS plastik gövde");

  const [apiKey, setApiKey] = useState(initialApi.apiKey);
  const [baseUrl, setBaseUrl] = useState(initialApi.baseUrl);
  const [model, setModel] = useState(initialApi.model);
  const [useLlm, setUseLlm] = useState(initialApi.useLlm);
  const [savedAt, setSavedAt] = useState(initialApi.savedAt);
  const [storageOk, setStorageOk] = useState(true);
  const [showApi, setShowApi] = useState(() => initialApi.apiKey.trim().length > 0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const skipInitialPersist = useRef(true);

  useEffect(() => {
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    const saved = saveApiSettings({ apiKey, baseUrl, model, useLlm });
    setStorageOk(saved !== null);
    if (saved?.savedAt) setSavedAt(saved.savedAt);
  }, [apiKey, baseUrl, model, useLlm]);

  function handleClearApi() {
    clearApiSettings();
    setApiKey("");
    setBaseUrl("");
    setModel("gpt-4o-mini");
    setUseLlm(true);
    setSavedAt(undefined);
  }

  const hasApiKey = apiKey.trim().length > 0;
  const willUseLlm = useLlm && hasApiKey;
  const savedLabel = formatSavedAt(savedAt);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        use_llm: useLlm,
      };
      const mat = materials.trim();
      if (mat) body.product_facts = { materials: mat };

      const key = apiKey.trim();
      if (key) body.openai_api_key = key;
      const url = baseUrl.trim();
      if (url) body.openai_base_url = url;
      const m = model.trim();
      if (m) body.openai_model = m;

      const res = await fetch("/api/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      setData((await res.json()) as ApiResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "İstek başarısız");
    } finally {
      setLoading(false);
    }
  }

  const risks = data?.critic.risks ?? [];

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>İddia Stres Testi</h1>
          <p className="header-sub">Ürün listeleme metninizi risk ve uyum açısından kontrol edin.</p>
        </div>
        <button
          type="button"
          className={`btn-secondary ${hasApiKey ? "btn-secondary--saved" : ""}`}
          onClick={() => setShowApi((v) => !v)}
          aria-expanded={showApi}
        >
          {showApi ? "Ayarları gizle" : hasApiKey ? "API ayarları (kayıtlı)" : "API ayarları"}
        </button>
      </header>

      {showApi && (
        <section className="panel panel-api" aria-label="API ayarları">
          <p className="panel-hint">
            API anahtarınız bu tarayıcıda kalıcı olarak saklanır; sayfayı kapatsanız veya bilgisayarı yeniden
            başlatsanız bile sonraki oturumlarda otomatik yüklenir. Anahtar yalnızca analiz isteğiyle sunucuya
            gönderilir.
          </p>
          {hasApiKey && (
            <p className="saved-status" role="status">
              Kayıtlı anahtar: <strong>{maskApiKey(apiKey)}</strong>
              {savedLabel && <> · Son kayıt: {savedLabel}</>}
            </p>
          )}
          {!storageOk && (
            <p className="hint-warn">
              Tarayıcı depolaması kullanılamıyor; anahtar bu oturumda kalıcı olmayabilir.
            </p>
          )}
          <div className="field">
            <label htmlFor="api-key">API anahtarı</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="api-base">API adresi (isteğe bağlı)</label>
              <input
                id="api-base"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="api-model">Model</label>
              <input
                id="api-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
                autoComplete="off"
              />
            </div>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={useLlm} onChange={(e) => setUseLlm(e.target.checked)} />
            <span>Yapay zekâ ile analiz et (kapalıysa kural tabanlı tarama)</span>
          </label>
          {!hasApiKey && useLlm && (
            <p className="hint-warn">API anahtarı girilmedi — kural tabanlı mod kullanılacak.</p>
          )}
          {hasApiKey && (
            <button type="button" className="btn-text-danger" onClick={handleClearApi}>
              Kayıtlı anahtarı sil
            </button>
          )}
        </section>
      )}

      <div className="layout">
        <section className="panel">
          <h2 className="panel-title">Metniniz</h2>

          <div className="field">
            <label htmlFor="title">Başlık</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="field">
            <label htmlFor="desc">Açıklama</label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Ürün açıklaması…"
            />
          </div>

          <details className="details-extra">
            <summary>Ek bilgiler (isteğe bağlı)</summary>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="mat">Malzeme / ürün gerçekleri</label>
              <input
                id="mat"
                type="text"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="Örn: ABS plastik gövde"
              />
            </div>
          </details>

          <button type="button" className="btn-primary" onClick={run} disabled={loading}>
            {loading ? "Analiz ediliyor…" : "Analiz et"}
          </button>

          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
        </section>

        <section className="panel panel-results">
          <div className="panel-title-row">
            <h2 className="panel-title">Sonuçlar</h2>
            {data && (
              <span className={`badge ${data.mode === "llm" ? "badge-llm" : "badge-mock"}`}>
                {data.mode === "llm" ? "AI" : "Kural tabanlı"}
              </span>
            )}
          </div>

          {!data && !loading && (
            <p className="empty">
              {willUseLlm
                ? "Metni girin ve analiz edin. AI anahtarınız kullanılacak."
                : "Metni girin ve analiz edin. Kural tabanlı tarama kullanılacak."}
            </p>
          )}

          {loading && <p className="empty">Lütfen bekleyin…</p>}

          {data && !loading && (
            <div className="results">
              {data.critic.human_review_required && (
                <div className="alert alert-warn">
                  İnsan incelemesi önerilir — yüksek risk veya sağlık iddiası tespit edildi.
                </div>
              )}

              {data.critic.summary && <p className="summary">{data.critic.summary}</p>}

              <h3 className="section-label">
                Riskler {risks.length > 0 && <span className="count">{risks.length}</span>}
              </h3>
              {risks.length === 0 ? (
                <p className="muted">Belirgin risk bulunamadı.</p>
              ) : (
                <ul className="risk-list">
                  {risks.map((r) => (
                    <li key={r.code + r.message} className={`risk risk-${r.severity}`}>
                      <div className="risk-top">
                        <span className="risk-code">{r.code}</span>
                        <span className="risk-sev">{sevLabel(r.severity)}</span>
                      </div>
                      <p className="risk-msg">{r.message}</p>
                      {(r.excerpt || r.policy_hint) && (
                        <p className="risk-quote">{r.excerpt || r.policy_hint}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="section-label">Önerilen metin</h3>
              <div className="revised-block">
                <p className="revised-label">Başlık</p>
                <p className="revised-text">{data.editor.revised_title}</p>
              </div>
              <div className="revised-block">
                <p className="revised-label">Açıklama</p>
                <p className="revised-text revised-desc">{data.editor.revised_description}</p>
              </div>

              {data.editor.changelog.length > 0 && (
                <>
                  <h3 className="section-label">Yapılan değişiklikler</h3>
                  <ul className="changelog">
                    {data.editor.changelog.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </>
              )}

              {data.policy_snippets_used.length > 0 && (
                <details className="details-policy">
                  <summary>Politika pasajları ({data.policy_snippets_used.length})</summary>
                  {data.policy_snippets_used.map((s, i) => (
                    <pre key={i} className="policy-snippet">
                      {s}
                    </pre>
                  ))}
                </details>
              )}
            </div>
          )}
        </section>
      </div>

      <footer className="footer">
        Bu araç hukuki danışmanlık sunmaz. Kesin uyum için uzman görüşü alın.
      </footer>
    </div>
  );
}
