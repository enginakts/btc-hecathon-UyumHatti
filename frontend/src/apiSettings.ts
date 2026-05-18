/** Tarayıcıda kalıcı Gemini API ayarları (localStorage) */

export const GEMINI_DEFAULT_MODEL = "gemini-1.5-flash";

/** Backend ile aynı — kullanıcıdan istenmez */
export const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

export interface ApiSettings {
  apiKey: string;
  model: string;
  useLlm: boolean;
  savedAt?: string;
}

const STORAGE_KEY = "iddia_gemini_settings_v1";
const STORAGE_KEY_V0 = "iddia_api_settings_v1";

const LEGACY_KEYS = {
  apiKey: "iddia_openai_api_key",
  model: "iddia_openai_model",
  useLlm: "iddia_use_llm",
} as const;

const DEFAULTS: ApiSettings = {
  apiKey: "",
  model: GEMINI_DEFAULT_MODEL,
  useLlm: true,
};

export const GEMINI_MODELS = [
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (hızlı, önerilen)" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (daha güçlü)" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
] as const;

function readLegacy(): Partial<ApiSettings> | null {
  try {
    const apiKey = localStorage.getItem(LEGACY_KEYS.apiKey);
    const model = localStorage.getItem(LEGACY_KEYS.model);
    const useLlmRaw = localStorage.getItem(LEGACY_KEYS.useLlm);
    if (!apiKey && !model && useLlmRaw === null) return null;
    const m = model?.trim() || "";
    const isOpenAiModel = m.startsWith("gpt-");
    return {
      apiKey: apiKey ?? "",
      model: isOpenAiModel ? GEMINI_DEFAULT_MODEL : m || GEMINI_DEFAULT_MODEL,
      useLlm: useLlmRaw !== "false",
    };
  } catch {
    return null;
  }
}

function readV0Blob(): Partial<ApiSettings> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V0);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApiSettings & { baseUrl?: string }>;
    const m = parsed.model?.trim() || "";
    const isOpenAiModel = m.startsWith("gpt-");
    return {
      apiKey: parsed.apiKey ?? "",
      model: isOpenAiModel ? GEMINI_DEFAULT_MODEL : m || GEMINI_DEFAULT_MODEL,
      useLlm: parsed.useLlm !== false,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function clearLegacyStorage() {
  try {
    Object.values(LEGACY_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(STORAGE_KEY_V0);
  } catch {
    /* ignore */
  }
}

export function loadApiSettings(): ApiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ApiSettings>;
      return {
        apiKey: parsed.apiKey ?? "",
        model: parsed.model?.trim() || GEMINI_DEFAULT_MODEL,
        useLlm: parsed.useLlm !== false,
        savedAt: parsed.savedAt,
      };
    }
  } catch {
    /* bozuk JSON */
  }

  const fromV0 = readV0Blob();
  if (fromV0) {
    const merged: ApiSettings = { ...DEFAULTS, ...fromV0 };
    saveApiSettings(merged);
    clearLegacyStorage();
    return merged;
  }

  const legacy = readLegacy();
  if (legacy) {
    const merged: ApiSettings = { ...DEFAULTS, ...legacy, savedAt: new Date().toISOString() };
    saveApiSettings(merged);
    clearLegacyStorage();
    return merged;
  }

  return { ...DEFAULTS };
}

export function saveApiSettings(settings: ApiSettings): ApiSettings | null {
  try {
    const payload: ApiSettings = {
      apiKey: settings.apiKey,
      model: settings.model.trim() || GEMINI_DEFAULT_MODEL,
      useLlm: settings.useLlm,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function clearApiSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    clearLegacyStorage();
  } catch {
    /* ignore */
  }
}

export function maskApiKey(key: string): string {
  const k = key.trim();
  if (k.length <= 8) return "••••••••";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export function formatSavedAt(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}
