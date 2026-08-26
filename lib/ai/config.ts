/**
 * Provider configuration persistence (client-side only).
 *
 * All config lives in localStorage next to the API keys. It is deliberately
 * NOT stored in IndexedDB and NEVER included in exports — mirroring the
 * existing single-key invariant.
 */

export type ProviderId = "gemini" | "openai-compatible";

export type GeminiConfig = {
  /** One or more Gemini API keys, tried in order on eligible failures. */
  apiKeys: string[];
  /** Gemini model id. Defaults to gemini-2.0-flash for parity. */
  model: string;
};

export type OpenAiCompatibleConfig = {
  /** User-visible label, e.g. "Ollama" or "Groq". */
  displayName: string;
  baseUrl: string;
  model: string;
  apiKey: string;
};

export type ProviderConfig = {
  activeProviderId: ProviderId;
  gemini: GeminiConfig;
  openAiCompatible: OpenAiCompatibleConfig;
};

const CONFIG_KEY = "nonotes:ai-provider-config";

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

const DEFAULT_CONFIG: ProviderConfig = {
  activeProviderId: "gemini",
  gemini: {
    apiKeys: [],
    model: DEFAULT_GEMINI_MODEL,
  },
  openAiCompatible: {
    displayName: "OpenAI-compatible",
    baseUrl: "",
    model: "",
    apiKey: "",
  },
};

function hasLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.localStorage !== "undefined";
}

/** Read the stored provider config, merging with defaults so old data survives. */
export function getProviderConfig(): ProviderConfig {
  if (!hasLocalStorage()) return structuredClone(DEFAULT_CONFIG);
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const parsed = JSON.parse(raw) as Partial<ProviderConfig>;
    return {
      activeProviderId:
        parsed.activeProviderId === "openai-compatible" ? "openai-compatible" : "gemini",
      gemini: {
        apiKeys: Array.isArray(parsed.gemini?.apiKeys)
          ? parsed.gemini!.apiKeys!.filter((k): k is string => typeof k === "string" && k.length > 0)
          : [],
        model:
          typeof parsed.gemini?.model === "string" && parsed.gemini.model.length > 0
            ? parsed.gemini.model
            : DEFAULT_GEMINI_MODEL,
      },
      openAiCompatible: {
        displayName:
          typeof parsed.openAiCompatible?.displayName === "string" &&
          parsed.openAiCompatible.displayName.length > 0
            ? parsed.openAiCompatible.displayName
            : "OpenAI-compatible",
        baseUrl:
          typeof parsed.openAiCompatible?.baseUrl === "string"
            ? parsed.openAiCompatible.baseUrl
            : "",
        model:
          typeof parsed.openAiCompatible?.model === "string"
            ? parsed.openAiCompatible.model
            : "",
        apiKey:
          typeof parsed.openAiCompatible?.apiKey === "string"
            ? parsed.openAiCompatible.apiKey
            : "",
      },
    } satisfies ProviderConfig;
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function setProviderConfig(config: ProviderConfig): void {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/** True when the active provider has the credentials needed to run. */
export function isProviderConfigured(): boolean {
  const config = getProviderConfig();
  if (config.activeProviderId === "gemini") {
    return config.gemini.apiKeys.some((k) => k.length > 0);
  }
  return (
    config.openAiCompatible.baseUrl.length > 0 &&
    config.openAiCompatible.model.length > 0 &&
    config.openAiCompatible.apiKey.length > 0
  );
}

/** Human label for the active provider, for UI hints. */
export function getActiveProviderLabel(): string {
  const config = getProviderConfig();
  if (config.activeProviderId === "openai-compatible") {
    return config.openAiCompatible.displayName || "OpenAI-compatible";
  }
  return "Gemini";
}

// ── Backwards-compatible single Gemini key helpers ──────────────────────
// These keep the old `nonotes:ai-api-key` behavior working: the single key
// is treated as the first Gemini key so existing users are not interrupted.

const LEGACY_KEY = "nonotes:ai-api-key";

/** Retrieve the first configured Gemini key (legacy getApiKey equivalent). */
export function getApiKey(): string | null {
  if (!hasLocalStorage()) return null;
  return getProviderConfig().gemini.apiKeys[0] ?? null;
}

/** Store a Gemini key, replacing the existing single key (legacy setApiKey). */
export function setApiKey(key: string): void {
  if (!hasLocalStorage()) return;
  const config = getProviderConfig();
  if (key) {
    config.gemini.apiKeys = [key];
  }
  setProviderConfig(config);
  if (key) window.localStorage.setItem(LEGACY_KEY, key);
  else window.localStorage.removeItem(LEGACY_KEY);
}

export function clearApiKey(): void {
  if (!hasLocalStorage()) return;
  const config = getProviderConfig();
  config.gemini.apiKeys = [];
  setProviderConfig(config);
  window.localStorage.removeItem(LEGACY_KEY);
}

export function hasApiKey(): boolean {
  return getProviderConfig().gemini.apiKeys.some((k) => k.length > 0);
}