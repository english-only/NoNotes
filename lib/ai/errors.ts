/**
 * Classified AI provider errors.
 *
 * Provider failures are surfaced to the user as one of a finite set of
 * recoverable categories — never raw provider responses or credentials.
 */

export type ProviderErrorType =
  | "authentication"
  | "quota"
  | "rate-limit"
  | "network"
  | "timeout"
  | "malformed"
  | "not-configured"
  | "unknown";

const DEFAULT_MESSAGES: Record<ProviderErrorType, string> = {
  authentication:
    "The provider rejected the API key. Check your key in Settings.",
  quota: "The provider account is out of quota. Try a different key or provider in Settings.",
  "rate-limit": "The provider is rate-limited. Wait a moment and try again.",
  network: "Could not reach the AI provider. Check your connection.",
  timeout: "The provider took too long to respond. Try again.",
  malformed: "The provider returned a response we couldn't parse. Try again.",
  "not-configured":
    "No AI provider is configured. Add a key in Settings to enable AI features.",
  unknown: "Something went wrong with the AI provider. Try again.",
};

/** Whether a failure is safe to use as a trigger for provider fallback. */
export function isFallbackEligible(type: ProviderErrorType): boolean {
  return (
    type === "authentication" ||
    type === "quota" ||
    type === "rate-limit" ||
    type === "network" ||
    type === "timeout"
  );
}

/**
 * An error tied to a specific AI provider attempt. `type` is used both for a
 * user-facing message and as the filter for the fallback chain.
 */
export class ProviderError extends Error {
  readonly type: ProviderErrorType;
  readonly providerLabel: string;

  constructor(type: ProviderErrorType, providerLabel: string, detail?: string) {
    const message =
      detail || DEFAULT_MESSAGES[type];
    super(message);
    this.name = "ProviderError";
    this.type = type;
    this.providerLabel = providerLabel;
  }
}

/** Human-readable label summarizing a provider + its display name. */
export function describeProvider(providerLabel: string, type: ProviderErrorType): string {
  const suffix = DEFAULT_MESSAGES[type];
  return `${providerLabel}: ${suffix}`;
}

/**
 * Classify an unknown thrown value into a provider error type using heuristics
 * on status codes and common API error text. Unknown errors default to
 * "unknown" and surface a generic message rather than provider internals.
 */
export function classifyProviderError(
  err: unknown,
  providerLabel: string
): ProviderError {
  if (err instanceof ProviderError) return err;

  const raw = err instanceof Error ? err.message : String(err);
  const status =
    err && typeof err === "object" && "status" in err
      ? (err as { status?: unknown }).status
      : undefined;

  // HTTP status codes take precedence.
  if (typeof status === "number") {
    switch (status) {
      case 400:
      case 401:
      case 403:
        return new ProviderError("authentication", providerLabel);
      case 402:
        return new ProviderError("quota", providerLabel);
      case 429:
        return new ProviderError("rate-limit", providerLabel);
      case 408:
      case 504:
        return new ProviderError("timeout", providerLabel);
      case 500:
      case 502:
      case 503:
        return new ProviderError("quota", providerLabel);
      default:
        break;
    }
  }

  if (/unauthorized|invalid api|api.?key|403|401|permission/i.test(raw)) {
    return new ProviderError("authentication", providerLabel);
  }
  if (/rate.?limit|too many requests|429/i.test(raw)) {
    return new ProviderError("rate-limit", providerLabel);
  }
  if (/quota|insufficient|402|exceeded/i.test(raw)) {
    return new ProviderError("quota", providerLabel);
  }
  if (/timed? ?out|timeout|abort/i.test(raw)) {
    return new ProviderError("timeout", providerLabel);
  }
  if (/network|fetch failed|load failed|offline|no connection|ECONN/i.test(raw)) {
    return new ProviderError("network", providerLabel);
  }
  if (/json|parse|unexpected|malformed|schema|validation/i.test(raw)) {
    return new ProviderError("malformed", providerLabel);
  }

  return new ProviderError("unknown", providerLabel);
}