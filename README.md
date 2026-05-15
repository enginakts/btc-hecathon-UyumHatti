# İddia Stres Testi (Satıcı Ürün Metni Denetimi) — Araştırma ve Yol Haritası

## 0. Projeyi çalıştırma (kod iskeleti)

Hızlı başlatma (Windows): `run_backend.cmd` ve ayrı pencerede `run_frontend.cmd`.

```powershell
cd C:\Users\engin\Desktop\folders\btk_projects\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\.env.example .env
# İsteğe bağlı: .env içine OPENAI_API_KEY=...
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Ayrı terminal:

```powershell
cd C:\Users\engin\Desktop\folders\btk_projects\frontend
npm install
npm run dev
```

Tarayıcı: `http://localhost:5173` — API `http://127.0.0.1:8000` üzerinden Vite proxy ile `/api` altında. Anahtar yokken uç nokta **mock** (kural tabanlı) döner.

**Klasör yapısı:** `backend/app` (FastAPI, savcı+düzenleyici), `backend/data/synthetic_policy.md`, `frontend` (Vite + React).

---

Bu belge, hackathon kapsamındaki **Fikir 7** için: pazar ihtiyacı, düzenleyici ve platform bağlamı, teknik mimari, agentic tasarım ve uygulanabilir bir **yol haritası** sunar. Yasal metinler özet niteliğindedir; **hukuki danışmanlık değildir**.

---

## 1. Ürün tanımı (tek cümle)

Satıcı veya içerik üreticisi, pazaryeri / D2C için hazırladığı **başlık + açıklama + iddialı maddeler** metnini sisteme verir; çok ajanlı bir hat **(1) savcı/itiraz**, **(2) düzeltici/uyarlanmış metin**, isteğe bağlı **(3) denetçi/konsensüs** üzerinden riskleri ve kanıt ihtiyaçlarını üretir.

---

## 2. Problem alanı ve kullanıcı değeri (rubrik: Kullanıcı Değeri, 20)

### 2.1 Neden gerçek bir acı var?

- **Pazaryeri cezaları:** Yanlış veya abartılı iddialar; listeleme askıya alma, hesap sağlığı düşüşü, iade oranı artışı.
- **AI ile üretilen içerik riski:** Kaynak verilmeyen ürün özelliği uydurma, “garanti / #1 / tıbbi etki” gibi **politikaya aykırı** dil sızması, çevresel iddiaların genel ve kanıtsız kalması. Büyük pazaryerleri satıcıyı **doğrulanabilir iddia** ve **yanıltıcı olmayan** ifadeler konusunda yükümlü tutar (ör. sağlık/performans iddialarında bilimsel kanıt beklentisi; çevre iddialarında spesifiklik). Kaynak örneği: [Amazon Seller Central — Listing restrictions (CA)](https://sellercentral.amazon.ca/help/hub/reference/external/200832300?locale=en-CA).
- **Tüketici güveni ve iade:** Yanıltıcı tanıtım, beklenti uyumsuzluğu → iade, şikayet, marka itibarı kaybı.

### 2.2 Hedef kullanıcı

| Segment | Değer |
|--------|--------|
| Pazaryeri satıcısı (KOBİ) | Yayın öncesi “red sebebi” simülasyonu, dil sadeleştirme |
| İçerik / SEO ajansı | Toplu metinlerde tutarlı uyum kontrolü |
| Marka (D2C) | Yasal/pazaryeri dilinin marka tonu ile birleştirilmesi |

### 2.3 Ürünün sınırı (jüriye dürüstçe)

Bu sistem **yasal onay veya avukatlık hizmeti değildir**; “olası risk işaretleme + düzenleme önerisi + kanıt gereksinimi listesi” sunar. Yanlış negatif/yanlış pozitif riski için **insan onayı** vurgulanmalıdır.

---

## 3. Düzenleyici ve politika bağlamı (özet)

### 3.1 Türkiye (yüksek seviye)

- **6502 sayılı TKHK** ve **Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği** çerçevesinde reklamların dürüst olması, tüketicinin deneyim/bilgi eksikliğinin istismar edilmemesi, **yanıltıcı indirim** gibi uygulamalara özel kurallar (referans fiyat, süre, stok vb.) gündemdedir. Resmi metin örneği: [Tüketicinin Korunması Hakkında Kanun (Ticaret Bakanlığı)](https://tuketici.ticaret.gov.tr/data/5e81982d13b876a1b04c7a42/Tuketicinin_Korunmasi_Hakkinda_Kanun_6502_Ocak_2021.pdf). Yönetmelik örneği: [Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği (ROK)](https://www.rok.org.tr/wp-content/uploads/2024/12/Ticari-Reklam-ve-Haksiz-Ticari-Uygulamalar-Yonetmeligi.pdf).
- **Pratik çıkarım (ürün özellikleri):** “%100 doğal”, “en iyi”, “garantili şifa”, “sınırlı stok” (kanıtsız), **yanıltıcı referans fiyat** ve **belirsiz çevre iddiası** gibi kalıpları risk sınıflarına bağlamak.

### 3.2 AB / küresel eğilim (konuşma ve AR-GE gerekçesi)

- AB tarafında tüketici hukuku ve **dijital adalet** ekseninde (yanıltıcı pazarlama, karanlık desenler, fiyat indirimi algısı vb.) güncel değerlendirme ve uygulama örnekleri tartışılmaktadır. Örnek bağlam: [Commission — Fitness Check on EU consumer law on digital fairness](https://commission.europa.eu/document/download/707d7404-78e5-4aef-acfa-82b4cf639f55_en?filename=Commission+Staff+Working+Document+Fitness+Check+on+EU+consumer+law+on+digital+fairness.pdf).

### 3.3 Pazaryeri “kurallar” RAG’i

Demo ve MVP için **kısa, lisansı açık veya kendi yazdığınız** “iç politika özeti” dokümanları kullanın (Trendyol/Hepsiburada/Amazon metinlerini **tüm metin** olarak kopyalamak telif ve kullanım koşulu riski taşır). Hackathon için: **sentetik “Pazaryeri-X Satıcı Politikası v0.1”** PDF/MD üretin; savcı ajanı bu metne **atıflı** çalışsın.

---

## 4. Teknik ve ürün araştırması

### 4.1 Risk sınıfları (savcı ajanının taksonomisi)

Aşağıdaki etiketler hem **çıktı şeması** hem de **değerlendirme** için kullanılabilir:

| Kod | Örnek tetikleyici |
|-----|-------------------|
| `UNSUB_HEALTH` | Tıbbi/terapötik ima, “kanser”, “şifa”, “tanı” |
| `UNSUB_SUPERLATIVE` | “En”, “bir numara”, “kesin çözüm” (kanıtsız) |
| `UNSUB_GUARANTEE` | “Sonsuz garanti”, “para iadesi” (koşulsuz ima) |
| `UNSUB_ENV` | “Çevre dostu”, “yeşil” (ölçülebilir ölçüt yok) |
| `UNSUB_COMPARISON` | Rakipsiz üstünlük, belirsiz kıyaslama |
| `UNSUB_URGENCY` | Sahte aciliyet / stok baskısı |
| `UNSUB_DISCOUNT` | Referans fiyat / indirim iddiası (TR özelinde ek kontrol listesi) |
| `UNSUB_TESTIMONIAL` | İzinsiz alıntı / bağlantısı gizlenmiş övgü |
| `SPEC_HALLUCINATION` | Verilen özellik listesiyle çelişen cümle (teknik doğrulama) |

### 4.2 Hallucination’a karşı “çapa” (Performans ve Doğruluk, 10)

- Satıcıdan **Yapılandırılmış Ürün Gerçekleri** alın: SKU, kategori, malzeme, boyut, sertifika URL’leri (varsa), “kesinlikle iddia edilmeyecekler” listesi.
- Savcı çıktısı **alıntı aralığı** (span) veya cümle ID’si ile işaretlenmeli; düzeltici aynı ID üzerinden revize etmeli.
- İsteğe bağlı: basit **kural motoru** (regex + keyword denylist) → LLM’den önce **kesin red**; LLM **açıklama ve alternatif metin** üretir (hibrit doğruluk).

### 4.3 Agentic mimari (Agentic Yapılar, 10)

Önerilen minimum **3 rol** (hackathon anlatımı güçlenir):

1. **Savcı (Critic):** Şema: `{ risks[], severity, policy_refs[], spans[] }`. Politika pasajları RAG’den; yoksa “genel tüketici hukuku özeti” uyarısı basın.
2. **Düzeltici (Editor):** Şema: `{ revised_title, revised_description, changelog[], remaining_risks[] }`. “Risk kabul edilemezse metni yumuşat veya kaldır” politikası.
3. **Denetçi (Arbiter) — opsiyonel ama puanlı:** Savcı ile düzeltici çelişirse (ör. savcı “hâlâ tıbbi ima var” der, düzeltici reddeder) tek tur **kısa hakem** çıktısı: `{ decision, final_text, human_review_required: boolean }`.

**Orkestrasyon:** LangGraph / özel state machine / OpenAI Agents benzeri; önemli olan jüride **durum diyagramı** gösterebilmek.

### 4.4 Değerlendirme (hackathon demo metriği)

- **20 altın örnek** (10 temiz, 10 kasıtlı riskli): Beklenen etiketlerle **F1** veya en azından **precision@risk**.
- **Latency bütçesi:** Savcı + düzeltici toplam hedef (ör. `< 15 sn` demo modunda küçük model veya tek tur birleşik).
- **Maliyet:** Token sayacı ve “tur başına” maliyet raporu (sunum slaytına 1 rakam).

---

## 5. Farklılaşma (Yenilikçilik, 10)

| Yaygın yaklaşım | Bu proje |
|-----------------|----------|
| Tek LLM “düzelt” | Çok ajan + çelişki çözümü + kanıt/kanıt eksikliği listesi |
| Sadece yasak kelime filtresi | Politika gerekçeli span işaretleme + revizyon günlüğü (`changelog`) |
| Sadece Türkçe metin | İsteğe bağlı “pazaryeri şablonu” (başlık uzunluğu, yasak HTML, emoji politikası) |

---

## 6. Yol haritası

### Faz 0 — Hazırlık (0,5–1 gün)

- [ ] Sentetik **politika özeti** (8–15 sayfa eşdeğeri MD) + 20 altın örnek veri seti.
- [ ] JSON şemaları: `CriticOutput`, `EditorOutput`, `ArbiterOutput`.
- [ ] Ürün adı, kısa slogan, “yasal uyarı” footer metni.

### Faz 1 — MVP (1–2 gün)

- [ ] Tek sayfa UI: metin girişi, “stres testi” butonu, risk kartları, revize metin.
- [ ] Savcı + düzeltici sıralı çağrı; şema zorunluluğu (JSON mode / structured output).
- [ ] Basit denylist + (varsa) kategori bazlı ipuçları.

### Faz 2 — Agentic derinlik (1–2 gün)

- [ ] RAG: politika chunk’ları + atıf snippet’i (kaynak adı + madde no’su *sizin dokümanınızda*).
- [ ] Denetçi turu: `human_review_required` kuralları (ör. `UNSUB_HEALTH` ≥ orta → zorunlu insan).
- [ ] Ürün gerçekleri formu (key-value) ve **çelişki kontrolü**.

### Faz 3 — Cila ve sunum (0,5–1 gün)

- [ ] Örnek senaryo kaydı (ekran görüntüsü veya kısa video).
- [ ] “Başarısızlık modları”: model cevap vermezse, şema parse hatası, rate limit — kullanıcıya anlamlı hata.
- [ ] Tek sayfalık **etik beyan**: veri saklama, üçüncü taraf API, loglama.

### Faz 4 — İsteğe bağlı (zaman kalırsa)

- [ ] Toplu dosya (CSV) işleme.
- [ ] İkinci dil (EN) veya ikinci “pazaryeri profili”.
- [ ] Küçük kullanıcı testi (1–3 satıcı) ve anket sonucu slayta 1 bullet.

---

## 7. Teknoloji yığını (öneri, bağlayıcı değil)

| Katman | Seçenekler |
|--------|------------|
| UI | Next.js, Vite+React, veya Streamlit (hız için Streamlit) |
| API | Python FastAPI veya Node |
| LLM | Hackathon API’sine göre; structured output şart |
| Vektör / RAG | pgvector, Chroma, veya basit TF-IDF (MVP yeter) |
| Orkestrasyon | LangGraph veya hafif state machine |

---

## 8. Riskler ve azaltma

| Risk | Azaltma |
|------|---------|
| Model halüsinasyonu | Ürün gerçekleri çapası + şema + denylist |
| Hukuki yanlış güven | Açık disclaimer + “insan onayı” bayrağı |
| Telif (platform kuralları metni) | Kendi sentetik politika dokümanınız |
| Jüri “bu ChatGPT” der | Tur diyagramı, şema, ölçüm, çok ajan |

---

## 9. Kaynakça (seçilmiş)

1. Amazon Seller Central — Listing restrictions (claims, substantiation, environmental claims). `https://sellercentral.amazon.ca/help/hub/reference/external/200832300?locale=en-CA`
2. European Commission — Fitness Check on EU consumer law on digital fairness (Staff Working Document). `https://commission.europa.eu/document/download/707d7404-78e5-4aef-acfa-82b4cf639f55_en?filename=Commission+Staff+Working+Document+Fitness+Check+on+EU+consumer+law+on+digital+fairness.pdf`
3. Tüketicinin Korunması Hakkında Kanun (6502) — Ticaret Bakanlığı PDF. `https://tuketici.ticaret.gov.tr/data/5e81982d13b876a1b04c7a42/Tuketicinin_Korunmasi_Hakkinda_Kanun_6502_Ocak_2021.pdf`
4. Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği (ROK). `https://www.rok.org.tr/wp-content/uploads/2024/12/Ticari-Reklam-ve-Haksiz-Ticari-Uygulamalar-Yonetmeligi.pdf`
5. Satıcı forumu / sektör yazıları (AI listing riskleri — ikincil kaynak): `https://sellercentral.amazon.com/seller-forums/discussions/t/244956ab-87e2-4fe0-b9ff-657790f0607f`

---

## 10. Sonraki adım (sizin için kontrol listesi)

1. Hackathon **API anahtarı / model** kısıtını netleştirin (structured output destekliyor mu?).  
2. **Pazaryeri profili** seçin: genel, kozmetik, elektronik (kategori risk sözlüğü değişir).  
3. Faz 1’i bitirince README’ye **ekran görüntüsü** ve “20 örnekte başarı tablosu” ekleyin.

---

*Belge sürümü: 1.0 — Fikir 7 (İddia Stres Testi) için hazırlanmıştır.*
