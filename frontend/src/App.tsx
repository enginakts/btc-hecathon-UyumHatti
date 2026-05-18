import { useEffect, useRef, useState } from "react";
import {
  clearApiSettings,
  formatSavedAt,
  GEMINI_API_ENDPOINT,
  GEMINI_DEFAULT_MODEL,
  GEMINI_MODELS,
  loadApiSettings,
  maskApiKey,
  saveApiSettings,
} from "./apiSettings";
import type { ApiResponse, GeoRegulation, PipelineStep, RiskItem, Severity } from "./types/api";
import {
  IconAlertTriangle,
  IconBadgeCheck,
  IconBookOpen,
  IconFileSearch,
  IconFileText,
  IconGlobe,
  IconInbox,
  IconKey,
  IconListTimeline,
  IconPanelCompare,
  IconScale,
  IconSettings,
  IconShieldAlert,
  IconShieldCheck,
  IconUserCheck,
  IconCheck,
  IconX,
} from "./icons";

const sampleTitle = "Doğal Ahşap Detoks Kremi — %100 şifa garantili en iyi çözüm";
const sampleDesc = `Cildinizi yeniler. Kanser hücrelerine karşı korur diyenler oldu; biz kesin sonuç vaat ediyoruz.\nSon 3 adet! Çevre dostu yeşil ürün. #1 satış rekoru.`;

const sevLabel = (s: Severity) => s === "high" ? "Yüksek" : s === "medium" ? "Orta" : "Düşük";
const decisionLabel = (d: string) =>
  d === "approved" ? "Onaylandı" : d === "needs_revision" ? "Revizyon gerekli" : "Reddedildi";
const scoreColor = (s: number) => s >= 70 ? "var(--success)" : s >= 40 ? "var(--warn)" : "var(--danger)";
const scoreClass = (s: number) => s >= 70 ? "high" : s >= 40 ? "mid" : "low";

const REGIONS = [
  { code: "TR", label: "Türkiye" },
  { code: "EU", label: "Avrupa Birliği" },
  { code: "US", label: "ABD" },
];

/* ── Gauge SVG ── */
function Gauge({ score }: { score: number }) {
  const r = 50, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="gauge-wrap">
      <svg className="gauge-svg" viewBox="0 0 120 120">
        <circle className="gauge-bg" cx="60" cy="60" r={r} />
        <circle className="gauge-fill" cx="60" cy="60" r={r}
          stroke={scoreColor(score)} strokeDasharray={c} strokeDashoffset={offset} />
        <text className="gauge-text" x="60" y="60">{score}</text>
      </svg>
      <span className="gauge-label">Uyumluluk Skoru</span>
    </div>
  );
}

/* ── Pipeline Tracker ── */
function PipelineTracker({ steps }: { steps: PipelineStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="pipeline">
      {steps.map((s, i) => (
        <div className="pipe-step" key={s.step}>
          <div className={`pipe-dot ${s.status}`}>
            {s.status === "done" ? (
              <IconCheck size={14} className="pipe-dot-icon" />
            ) : s.status === "running" ? (
              <span className="pipe-dot-ellipsis" aria-hidden>
                ···
              </span>
            ) : s.status === "error" ? (
              <IconX size={12} className="pipe-dot-icon pipe-dot-icon--err" />
            ) : (
              <span className="pipe-dot-num">{i + 1}</span>
            )}
          </div>
          <div className="pipe-info">
            <div className="pipe-label">{s.label}</div>
            <div className="pipe-msg">{s.duration_ms > 0 ? `${s.duration_ms}ms` : ""} {s.message}</div>
          </div>
          {i < steps.length - 1 && <div className={`pipe-line ${s.status === "done" ? "done" : ""}`} />}
        </div>
      ))}
    </div>
  );
}

/* ── Risk Card ── */
function RiskCard({ risk }: { risk: RiskItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`risk-item ${risk.severity}`}>
      <div className="risk-header" onClick={() => setOpen(!open)}>
        <span className={`sev-dot ${risk.severity}`} />
        <span className={`risk-code-tag ${risk.severity}`}>{risk.code}</span>
        <span className="risk-label">{risk.message}</span>
        <span className={`sev-badge ${risk.severity}`}>{sevLabel(risk.severity)}</span>
      </div>
      {open && (
        <div className="risk-detail">
          {risk.policy_hint && <p>{risk.policy_hint}</p>}
          {risk.excerpt && <p className="excerpt">{risk.excerpt}</p>}
        </div>
      )}
    </div>
  );
}

/* ── Geo Card ── */
function GeoCard({ geo }: { geo: GeoRegulation }) {
  const [showLaws, setShowLaws] = useState(false);
  return (
    <div className="geo-card">
      <div className="geo-card-top">
        <span className="geo-code-badge" title={geo.region_name}>
          {geo.region}
        </span>
        <span className="geo-region">{geo.region_name}</span>
        <div className="geo-score-bar">
          <span className={`geo-score-num ${scoreClass(geo.compliance_score)}`}>{geo.compliance_score}</span>
          <span style={{ fontSize: 10, color: "var(--text3)" }}>/100</span>
        </div>
      </div>
      <div className="geo-summary">{geo.risk_summary}</div>
      {geo.applicable_laws.length > 0 && (
        <>
          <button className="btn-sm" onClick={() => setShowLaws(!showLaws)} style={{ marginBottom: 8 }}>
            {showLaws ? "Yasaları gizle" : `${geo.applicable_laws.length} ilgili yasa göster`}
          </button>
          {showLaws && (
            <div className="geo-laws">
              {geo.applicable_laws.map((law) => (
                <div className="geo-law" key={law.code}>
                  <strong>{law.code} — {law.name}</strong>
                  {law.note && <p>{law.note}</p>}
                  {law.relevant_articles.length > 0 && (
                    <p className="articles">{law.relevant_articles.join(" · ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {geo.recommendations.length > 0 && (
        <details className="geo-recs">
          <summary>Öneriler ({geo.recommendations.length})</summary>
          {geo.recommendations.map((r, i) => <p className="geo-rec-item" key={i}>{r}</p>)}
        </details>
      )}
    </div>
  );
}

/* ════════════════════ MAIN APP ════════════════════ */

export default function App() {
  const [title, setTitle] = useState(sampleTitle);
  const [desc, setDesc] = useState(sampleDesc);
  const [materials, setMaterials] = useState("ABS plastik gövde");
  const [profile, setProfile] = useState("general");
  const [regions, setRegions] = useState<string[]>(["TR", "EU"]);

  const [apiKey, setApiKey] = useState(() => loadApiSettings().apiKey);
  const [model, setModel] = useState(() => loadApiSettings().model);
  const [useLlm, setUseLlm] = useState(() => loadApiSettings().useLlm);
  const [savedAt, setSavedAt] = useState(() => loadApiSettings().savedAt);
  const [showApi, setShowApi] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const skip = useRef(true);

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const s = saveApiSettings({ apiKey, model, useLlm });
    if (s?.savedAt) setSavedAt(s.savedAt);
  }, [apiKey, model, useLlm]);

  const toggleRegion = (code: string) => {
    setRegions((prev) => prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]);
  };

  async function run() {
    setLoading(true); setError(null); setData(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(), description: desc.trim(), use_llm: useLlm,
        marketplace_profile: profile, target_regions: regions,
      };
      if (materials.trim()) body.product_facts = { materials: materials.trim() };
      if (apiKey.trim()) body.gemini_api_key = apiKey.trim();
      if (model.trim()) body.gemini_model = model.trim();

      const res = await fetch("/api/stress-test", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      setData(await res.json() as ApiResponse);
    } catch (e) { setError(e instanceof Error ? e.message : "İstek başarısız"); }
    finally { setLoading(false); }
  }

  const hasKey = apiKey.trim().length > 0;
  const risks = data?.critic.risks ?? [];

  return (
    <>
      {/* ── NAVBAR ── */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo" aria-hidden>
            <IconShieldCheck size={20} />
          </div>
          <span className="nav-title">İddia Stres Testi</span>
          <span className="nav-badge">Liste uyumu</span>
        </div>
        <div className="nav-right">
          <button type="button" className={`nav-pill ${showApi ? "nav-pill--active" : ""}`} onClick={() => setShowApi(!showApi)}>
            <span className="nav-pill-inner">
              {hasKey ? <IconBadgeCheck size={17} /> : <IconSettings size={17} />}
              <span>{hasKey ? "Gemini · kayıtlı" : "Gemini API"}</span>
            </span>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero">
        <div className="hero-eyebrow">İçerik denetimi</div>
        <h1>Listeleme metninizi<br /><span>uyumluluk taramasından</span> geçirin</h1>
        <p className="hero-desc">
          Üç aşamalı inceleme: risk tespiti, metin önerisi ve denetçi özeti. İsteğe bağlı olarak Google Gemini ile
          derinlemesine analiz; ayrıca seçtiğiniz bölgelere göre düzenleyici özet.
        </p>
      </div>

      {/* ── API SETTINGS ── */}
      {showApi && (
        <div className="workspace full-width" style={{ paddingBottom: 0 }}>
          <div className="card full-width settings-panel">
            <div className="card-header">
              <div className="card-icon icon-input" aria-hidden>
                <IconKey size={20} />
              </div>
              <div className="card-title-group">
                <div className="card-title">Google Gemini API</div>
                <div className="card-subtitle">Anahtar tarayıcıda saklanır · bağlantı adresi otomatik</div>
              </div>
            </div>
            <div className="card-body">
              <p className="panel-hint" style={{ marginBottom: 14 }}>
                API anahtarı almak için{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                  Google AI Studio
                </a>
                sayfasını kullanın.
              </p>
              {hasKey && (
                <div className="saved-status">
                  Kayıtlı anahtar: <strong>{maskApiKey(apiKey)}</strong>
                  {formatSavedAt(savedAt) && <> · {formatSavedAt(savedAt)}</>}
                </div>
              )}
              <div className="field">
                <label htmlFor="api-key">Gemini API anahtarı</label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="api-model">Model</label>
                <select id="api-model" value={model} onChange={(e) => setModel(e.target.value)}>
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="api-endpoint-note">
                Bağlantı adresi (otomatik): <code>{GEMINI_API_ENDPOINT}</code>
              </p>
              <label className="checkbox-row">
                <input type="checkbox" checked={useLlm} onChange={(e) => setUseLlm(e.target.checked)} />
                Gemini ile yapay zekâ analizi
              </label>
              {!hasKey && useLlm && (
                <div className="hint-warn">Gemini API anahtarı girilmedi — kural tabanlı mod kullanılacak.</div>
              )}
              {hasKey && (
                <button
                  type="button"
                  className="btn-text-danger"
                  onClick={() => {
                    clearApiSettings();
                    setApiKey("");
                    setModel(GEMINI_DEFAULT_MODEL);
                  }}
                >
                  Kayıtlı anahtarı sil
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WORKSPACE ── */}
      <main className="workspace">

        {/* ① INPUT */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon icon-input" aria-hidden>
              <IconFileText size={20} />
            </div>
            <div className="card-title-group">
              <div className="card-title">Listeleme Metni</div>
              <div className="card-subtitle">Başlık, açıklama ve hedef bölgeleri belirleyin</div>
            </div>
          </div>
          <div className="card-body">
            <div className="field">
              <label>Ürün Başlığı</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={500} />
            </div>
            <div className="field">
              <label>Ürün Açıklaması</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} placeholder="Ürün açıklaması…" />
            </div>
            <div className="field">
              <label>Malzeme / Ürün Gerçekleri</label>
              <input type="text" value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="Örn: ABS plastik gövde" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Pazaryeri Profili</label>
                <select value={profile} onChange={(e) => setProfile(e.target.value)}>
                  <option value="general">Genel</option>
                  <option value="kozmetik">Kozmetik</option>
                  <option value="elektronik">Elektronik</option>
                  <option value="gida">Gıda / Takviye</option>
                </select>
              </div>
              <div className="field">
                <label>Hedef Bölgeler</label>
                <div className="chip-group">
                  {REGIONS.map((r) => (
                    <button key={r.code} className={`chip ${regions.includes(r.code) ? "chip--active" : ""}`}
                      onClick={() => toggleRegion(r.code)}>{r.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <button type="button" className="btn-run" onClick={run} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden />
                  Analiz ediliyor…
                </>
              ) : (
                <>
                  <IconFileSearch size={18} className="btn-run-icon" />
                  Analizi başlat
                </>
              )}
            </button>
            {error && <div className="hint-warn" style={{ marginTop: 12, borderColor: "var(--danger-border)", background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}
            {data && data.error_message && (
              <div className="hint-warn hint-warn--inline" role="status">
                <IconAlertTriangle size={18} className="hint-warn-icon" />
                <span>{data.error_message}</span>
              </div>
            )}
          </div>
        </div>

        {/* ② RISK PANEL */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon icon-risk" aria-hidden>
              <IconShieldAlert size={20} />
            </div>
            <div className="card-title-group">
              <div className="card-title">Risk Analizi</div>
              <div className="card-subtitle">Tespit edilen uyarılar ve özet skor</div>
            </div>
            {data && <span className={`mode-badge ${data.mode}`}>{data.mode === "llm" ? "Model" : "Kurallar"}</span>}
          </div>
          <div className="card-body">
            {!data && !loading && (
              <div className="empty-state">
                <div className="empty-icon-wrap" aria-hidden>
                  <IconInbox size={28} />
                </div>
                <p className="empty-state-text">Metni doldurup analizi başlatın.</p>
              </div>
            )}
            {loading && <><div className="skeleton lg" /><div className="skeleton md" /><div className="skeleton" /><div className="skeleton" /></>}
            {data && !loading && (
              <>
                <Gauge score={data.overall_compliance_score} />
                {data.critic.human_review_required && (
                  <div className="human-alert">
                    <span className="human-alert-icon" aria-hidden>
                      <IconUserCheck size={22} />
                    </span>
                    <p>
                      <strong>İnsan incelemesi önerilir</strong> — yüksek risk veya sağlık iddiası içeriyor olabilir.
                    </p>
                  </div>
                )}
                {data.critic.summary && <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>{data.critic.summary}</p>}
                <div className="risk-list">
                  {risks.length === 0 ? <p style={{ color: "var(--text3)", fontSize: 12 }}>Belirgin risk bulunamadı.</p>
                    : risks.map((r) => <RiskCard key={r.code + r.message} risk={r} />)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ③ PIPELINE TRACKER (full-width) */}
        {data && data.pipeline_steps.length > 0 && (
          <div className="card full-width">
            <div className="card-header">
              <div className="card-icon icon-pipeline" aria-hidden>
                <IconListTimeline size={20} />
              </div>
              <div className="card-title-group">
                <div className="card-title">İşlem adımları</div>
                <div className="card-subtitle">Tarama ve model çağrılarının özeti</div>
              </div>
              {data.token_usage && (
                <div className="token-bar">
                  <span className="token-item">Toplam: <span className="num">{data.token_usage.total_tokens}</span> token</span>
                  {data.token_usage.estimated_cost_usd > 0 && <span className="token-cost">${data.token_usage.estimated_cost_usd}</span>}
                </div>
              )}
            </div>
            <PipelineTracker steps={data.pipeline_steps} />
          </div>
        )}

        {/* ④ ARBITER */}
        {data?.arbiter && (
          <div className="card">
            <div className="card-header">
              <div className="card-icon icon-arbiter" aria-hidden>
                <IconScale size={20} />
              </div>
              <div className="card-title-group">
                <div className="card-title">Denetçi özeti</div>
                <div className="card-subtitle">Riskler ile önerilen metin arasındaki değerlendirme</div>
              </div>
            </div>
            <div className="card-body">
              <div className="arbiter-card">
                <div className={`arbiter-decision ${data.arbiter.decision}`}>
                  {decisionLabel(data.arbiter.decision)}
                </div>
                <p className="arbiter-reasoning">{data.arbiter.reasoning}</p>
                {data.arbiter.consensus_notes.length > 0 && (
                  <ul className="arbiter-notes">
                    {data.arbiter.consensus_notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                )}
                {data.arbiter.human_review_required && (
                  <div className="human-alert human-alert--tight">
                    <span className="human-alert-icon" aria-hidden>
                      <IconUserCheck size={22} />
                    </span>
                    <p>
                      İnsan incelemesi <strong>zorunlu</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑤ GEO */}
        {data && data.geo_regulations.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-icon icon-geo" aria-hidden>
                <IconGlobe size={20} />
              </div>
              <div className="card-title-group">
                <div className="card-title">Coğrafi Uyumluluk</div>
                <div className="card-subtitle">Hedef bölgelerin düzenleyici analizi</div>
              </div>
            </div>
            <div className="card-body">
              <div className="geo-grid">
                {data.geo_regulations.map((g) => <GeoCard key={g.region} geo={g} />)}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ DIFF + SUGGESTED TEXT */}
        {data && (
          <div className="card full-width">
            <div className="card-header">
              <div className="card-icon icon-suggest" aria-hidden>
                <IconPanelCompare size={20} />
              </div>
              <div className="card-title-group">
                <div className="card-title">Metin Karşılaştırması & Öneriler</div>
                <div className="card-subtitle">Orijinal ↔ düzeltilmiş metin</div>
              </div>
            </div>
            <div className="card-body">
              {/* Diff */}
              <div className="suggest-label new">Başlık Karşılaştırması</div>
              <div className="diff-wrap">
                <div className="diff-col">
                  <div className="diff-col-label original">Orijinal</div>
                  <div className="diff-text">{title}</div>
                </div>
                <div className="diff-col">
                  <div className="diff-col-label revised">Düzeltilmiş</div>
                  <div className="diff-text">{data.editor.revised_title}</div>
                </div>
              </div>

              <div style={{ marginTop: 18 }} />
              <div className="suggest-label new">Açıklama Karşılaştırması</div>
              <div className="diff-wrap">
                <div className="diff-col">
                  <div className="diff-col-label original">Orijinal</div>
                  <div className="diff-text">{desc}</div>
                </div>
                <div className="diff-col">
                  <div className="diff-col-label revised">Düzeltilmiş</div>
                  <div className="diff-text">{data.editor.revised_description}</div>
                </div>
              </div>

              {/* Changelog */}
              {data.editor.changelog.length > 0 && (
                <>
                  <div className="divider" />
                  <div className="suggest-label changes">Değişiklik Özeti</div>
                  <div className="change-list">
                    {data.editor.changelog.map((c, i) => (
                      <div className="change-item" key={i}>
                        <span className="change-tag">{c.split(":")[0] || "EDIT"}</span>
                        <span className="change-desc">{c}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ⑦ POLICY */}
        {data && data.policy_snippets_used.length > 0 && (
          <div className="card full-width">
            <div className="card-header">
              <div className="card-icon icon-policy" aria-hidden>
                <IconBookOpen size={20} />
              </div>
              <div className="card-title-group">
                <div className="card-title">Politika Pasajları</div>
                <div className="card-subtitle">Analizde kullanılan platform kuralları</div>
              </div>
            </div>
            <div className="card-body">
              <div className="policy-acc">
                <button className="policy-toggle" onClick={() => setPolicyOpen(!policyOpen)}>
                  Politika maddelerini görüntüle ({data.policy_snippets_used.length})
                  <span className={`policy-chevron ${policyOpen ? "open" : ""}`}>▼</span>
                </button>
                {policyOpen && (
                  <div className="policy-body">
                    {data.policy_snippets_used.map((s, i) => <div className="policy-block" key={i}>{s}</div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        Hukuki danışmanlık değildir. Yayın öncesi kararlarınızı uzmanla doğrulayın. · v0.2
      </footer>
    </>
  );
}
