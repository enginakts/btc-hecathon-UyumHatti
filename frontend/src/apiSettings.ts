/** Tarayıcıda kalıcı API ayarları (localStorage) */

export interface ApiSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  useLlm: boolean;
  savedAt?: string;
}

const STORAGE_KEY = "iddia_api_settings_v1";

/** Eski ayrı anahtarlar — geriye dönük uyumluluk */
const LEGACY_KEYS = {
  apiKey: "iddia_openai_api_key",
  baseUrl: "iddia_openai_base_url",
  model: "iddia_openai_model",
  useLlm: "iddia_use_llm",
} as const;

const DEFAULTS: ApiSettings = {
  apiKey: "",
  baseUrl: "",
  model: "gpt-4o-mini",
  useLlm: true,
};

function readLegacy(): Partial<ApiSettings> | null {
  try {
    const apiKey = localStorage.getItem(LEGACY_KEYS.apiKey);
    const baseUrl = localStorage.getItem(LEGACY_KEYS.baseUrl);
    const model = localStorage.getItem(LEGACY_KEYS.model);
    const useLlmRaw = localStorage.getItem(LEGACY_KEYS.useLlm);
    if (!apiKey && !baseUrl && !model && useLlmRaw === null) return null;
    return {
      apiKey: apiKey ?? "",
      baseUrl: baseUrl ?? "",
      model: model || DEFAULTS.model,
      useLlm: useLlmRaw !== "false",
    };
  } catch {
    return null;
  }
}

function clearLegacy() {
  try {
    Object.values(LEGACY_KEYS).forEach((k) => localStorage.removeItem(k));
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
        baseUrl: parsed.baseUrl ?? "",
        model: parsed.model?.trim() || DEFAULTS.model,
        useLlm: parsed.useLlm !== false,
        savedAt: parsed.savedAt,
      };
    }
  } catch {
    /* bozuk JSON */
  }

  const legacy = readLegacy();
  if (legacy) {
    const merged: ApiSettings = { ...DEFAULTS, ...legacy, savedAt: new Date().toISOString() };
    saveApiSettings(merged);
    clearLegacy();
    return merged;
  }

  return { ...DEFAULTS };
}

export function saveApiSettings(settings: ApiSettings): ApiSettings | null {
  try {
    const payload: ApiSettings = {
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      model: settings.model.trim() || DEFAULTS.model,
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
    clearLegacy();
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
