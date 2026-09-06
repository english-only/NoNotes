import { classifyProviderError, ProviderError } from "./errors";
import {
  FeynmanEvaluationInputSchema,
  FeynmanEvaluationOutputSchema,
  FlashcardGenerationInputSchema,
  FlashcardGenerationOutputSchema,
  type AIProvider,
  type FeynmanEvaluationInput,
  type FeynmanEvaluationOutput,
  type FlashcardGenerationInput,
  type FlashcardGenerationOutput,
} from "./provider";

export type OpenAiCompatibleOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Optional user-visible label; defaults to "OpenAI-compatible". */
  displayName?: string;
  /** Request timeout in ms. */
  timeoutMs?: number;
  /** Max attempts for transient failures (429 / 5xx / network). Default 3. */
  retryAttempts?: number;
};

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_RETRY_ATTEMPTS = 3;

/** Transient failure classes that warrant an in-provider retry. */
const RETRYABLE_TYPES: ReadonlySet<string> = new Set([
  "rate-limit",
  "unavailable",
  "network",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse a `Retry-After` header value (seconds or HTTP-date → null). */
function parseRetryAfter(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function normalizedBaseUrl(input: string): string {
  let url = input.trim();
  if (!url) throw new Error("OpenAI-compatible base URL is required.");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // Strip a trailing slash so the path below joins predictably.
  return url.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string): string {
  // Support both a full endpoint path (…/v1/chat/completions) and a base URL.
  if (/\/chat\/completions$/i.test(baseUrl)) return baseUrl;
  return `${baseUrl}/chat/completions`;
}

/** A standard OpenAI-compatible chat message. */
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Build a JSON-only chat messages array for flashcard generation, instructing
 * the model to respond with exactly the flashcards schema.
 */
function buildGenerationMessages(input: FlashcardGenerationInput): ChatMessage[] {
  const chunkText = input.chunks
    .map((c) => `[Chunk ${c.ordinal}]\n${c.content}`)
    .join("\n\n");

  return [
    {
      role: "system" as const,
      content:
        "You are a study material generator. Respond with JSON only, no markdown fences.",
    },
    {
      role: "user" as const,
      content: `Generate exactly ${input.cardCount} flashcards for the deck "${input.deckTitle}" in the course "${input.courseTitle}". Base every card strictly on the SOURCE MATERIAL below. Do not invent facts not present in the source. Questions should test understanding; answers concise but complete.

SOURCE MATERIAL:
${chunkText}

OUTPUT FORMAT (JSON only):
{"flashcards":[{"prompt":"Question text","answer":"Answer text"}]}`,
    },
  ];
}

function buildEvaluationMessages(
  input: FeynmanEvaluationInput
): ChatMessage[] {
  const chunkText = input.chunks
    .map((c) => `[Chunk ${c.ordinal}]\n${c.content}`)
    .join("\n\n");

  return [
    {
      role: "system" as const,
      content:
        "You are an expert tutor evaluating a student's understanding. Respond with JSON only, no markdown fences.",
    },
    {
      role: "user" as const,
      content: `Course: ${input.courseTitle}\nConcept: ${input.concept}\n\nSOURCE MATERIAL:\n${chunkText}\n\nSTUDENT'S EXPLANATION:\n${input.explanation}\n\nEvaluate the student's explanation, grounded in the source material. Prioritize genuine understanding over keyword matching.\n\nOUTPUT FORMAT (JSON only):\n{"correctness":<0.0 to 1.0>,"completeness":<0.0 to 1.0>,"clarity":<0.0 to 1.0>,"misconceptions":[...],"missingConcepts":[...],"corrections":[...],"summary":"...","improvement":"...","followUp":"..."}`,
    },
  ];
}

function parseJsonLoose(text: string): string {
  // Strip optional markdown fences and any stray whitespace before/after.
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

/**
 * A generic OpenAI-compatible provider (`POST {baseUrl}/chat/completions`).
 *
 * Covers Ollama, LM Studio, Groq, OpenRouter, Together, DeepSeek, and any
 * other service exposing the standard chat-completions shape. The same
 * schema validation and prompt-builders as Gemini are reused here, so the
 * contract is identical.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai-compatible";
  readonly displayName: string;
  readonly label: string;

  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private retryAttempts: number;

  constructor(options: OpenAiCompatibleOptions) {
    this.displayName =
      options.displayName && options.displayName.trim().length > 0
        ? options.displayName.trim()
        : "OpenAI-compatible";
    this.label = this.displayName;
    this.baseUrl = normalizedBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryAttempts = Math.max(1, options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS);
  }

  private async request(messages: ChatMessage[]): Promise<string> {
    const body: {
      model: string;
      messages: ChatMessage[];
      temperature: number;
      max_tokens: number;
    } = {
      model: this.model,
      messages,
      temperature: 0.4,
      max_tokens: 8192,
    };

    let attempt = 0;
    while (true) {
      attempt += 1;
      const outcome = await this.tryRequest(body);
      if (outcome.ok) return outcome.text;

      const { error, retryAfterSeconds } = outcome;
      // Only transient failures retry in place; auth/quota/malformed/timeout
      // surface immediately (timeout already burned the full request budget).
      if (
        !RETRYABLE_TYPES.has(error.type) ||
        attempt >= this.retryAttempts
      ) {
        throw error;
      }

      // Honor Retry-After when the provider sends it, else exponential
      // backoff with jitter so concurrent clients don't thundering-herd.
      const delayMs =
        retryAfterSeconds !== null
          ? retryAfterSeconds * 1000
          : Math.min(8_000, 1_000 * 2 ** (attempt - 1)) + Math.random() * 200;
      await sleep(delayMs);
    }
  }

  /**
   * One HTTP attempt. Returns the raw text on success, or a classified
   * ProviderError (plus any Retry-After hint) without reading the body,
   * so provider internals never surface and secrets can't leak.
   */
  private async tryRequest(body: {
    model: string;
    messages: ChatMessage[];
    temperature: number;
    max_tokens: number;
  }): Promise<
    | { ok: true; text: string }
    | { ok: false; error: ProviderError; retryAfterSeconds: number | null }
  > {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let response: Response;
      try {
        response = await fetch(buildUrl(this.baseUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return { ok: false, error: new ProviderError("timeout", this.label), retryAfterSeconds: null };
        }
        return {
          ok: false,
          error: classifyProviderError(err, this.label),
          retryAfterSeconds: null,
        };
      }

      if (!response.ok) {
        const classified = classifyProviderError(
          { status: response.status, statusText: response.statusText },
          this.label
        );
        let retryAfterSeconds: number | null = null;
        if (classified.type === "rate-limit" || classified.type === "unavailable") {
          retryAfterSeconds = parseRetryAfter(
            typeof response.headers?.get === "function"
              ? response.headers.get("retry-after")
              : null
          );
        }
        return { ok: false, error: classified, retryAfterSeconds };
      }

      const data: unknown = await response.json();
      const text =
        typeof data === "object" &&
        data !== null &&
        "choices" in data &&
        Array.isArray((data as { choices?: unknown[] }).choices) &&
        (data as { choices: unknown[] }).choices.length > 0
          ? (data as { choices: { message?: { content?: unknown } }[] }).choices[0]
              ?.message?.content
          : undefined;

      if (typeof text !== "string" || text.trim().length === 0) {
        return {
          ok: false,
          error: new ProviderError(
            "malformed",
            this.label,
            "Provider returned an empty response"
          ),
          retryAfterSeconds: null,
        };
      }
      return { ok: true, text };
    } finally {
      clearTimeout(timer);
    }
  }

  async generateFlashcards(
    input: FlashcardGenerationInput
  ): Promise<FlashcardGenerationOutput> {
    const validated = FlashcardGenerationInputSchema.parse(input);
    const raw = await this.request(buildGenerationMessages(validated));
    const cleaned = parseJsonLoose(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new ProviderError("malformed", this.label, `Invalid JSON from ${this.label}`);
    }

    const result = FlashcardGenerationOutputSchema.safeParse(parsed);
    if (!result.success) {
      throw new ProviderError("malformed", this.label, `${this.label} output validation failed`);
    }
    return result.data;
  }

  async evaluateExplanation(
    input: FeynmanEvaluationInput
  ): Promise<FeynmanEvaluationOutput> {
    const validated = FeynmanEvaluationInputSchema.parse(input);
    const raw = await this.request(buildEvaluationMessages(validated));
    const cleaned = parseJsonLoose(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new ProviderError("malformed", this.label, `Invalid JSON from ${this.label}`);
    }

    const result = FeynmanEvaluationOutputSchema.safeParse(parsed);
    if (!result.success) {
      throw new ProviderError("malformed", this.label, `${this.label} output validation failed`);
    }
    return result.data;
  }
}