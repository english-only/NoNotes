import { GeminiProvider } from "./gemini";
import { getProviderConfig, isProviderConfigured, type ProviderId } from "./config";
import { classifyProviderError, isFallbackEligible, ProviderError } from "./errors";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { AIProvider, FeynmanEvaluationOutput, FlashcardGenerationOutput } from "./provider";

/**
 * Provider factory + registry.
 *
 * UI components MUST NOT instantiate provider implementations directly.
 * `createProvider()` (or `generateFlashcards` / `evaluateExplanation`)
 * resolves the stored config, builds the correct provider, and runs the
 * deterministic fallback chain on eligible provider failures.
 */

/** The ordered set of fallback providers that could be tried for a request. */
export type FallbackPlan = {
  activeProviderId: ProviderId;
  /** Resolved provider instances, highest priority first. */
  providers: AIProvider[];
};

/**
 * Build the provider instances from the current config, in fallback order.
 */
export function buildProviderInstances(): AIProvider[] {
  const config = getProviderConfig();
  const instances: AIProvider[] = [];

  // Gemini keys are tried in order (multi-key rotation).
  for (const key of config.gemini.apiKeys) {
    if (!key || key.trim().length === 0) continue;
    instances.push(new GeminiProvider(key.trim(), config.gemini.model));
  }

  // A configured OpenAI-compatible endpoint is always the final fallback,
  // regardless of which provider is primary, so a broken primary never
  // bricks the user's local/self-hosted option.
  const oac = config.openAiCompatible;
  if (
    oac.baseUrl.trim().length > 0 &&
    oac.model.trim().length > 0
  ) {
    instances.push(
      new OpenAICompatibleProvider({
        baseUrl: oac.baseUrl,
        apiKey: oac.apiKey,
        model: oac.model,
        displayName: oac.displayName,
      })
    );
  }

  return instances;
}

/** True when at least one provider can run. */
export function hasConfiguredProvider(): boolean {
  return isProviderConfigured();
}

/**
 * Run `run` across the provider chain. Eligible failures advance to the next
 * provider; non-eligible failures (malformed output, not configured) surface
 * immediately. The final error carries a classification for UI copy.
 */
async function runChain<T>(
  run: (p: AIProvider) => Promise<T>
): Promise<{ value: T; providerLabel: string }> {
  if (!hasConfiguredProvider()) {
    throw new ProviderError("not-configured", "AI");
  }

  const providers = buildProviderInstances();
  if (providers.length === 0) {
    throw new ProviderError("not-configured", "AI");
  }

  let lastEligible: ProviderError | null = null;
  for (const provider of providers) {
    try {
      const value = await run(provider);
      return { value, providerLabel: providerLabel(provider) };
    } catch (err) {
      // Classify raw provider errors (SDK throws, network, quota text) so
      // eligible failures rotate to the next key/provider in the chain.
      const classified =
        err instanceof ProviderError
          ? err
          : classifyProviderError(err, providerLabel(provider));
      if (!isFallbackEligible(classified.type)) {
        throw classified;
      }
      lastEligible = classified;
    }
  }

  // All providers exhausted on eligible failures.
  if (lastEligible) throw lastEligible;
  throw new ProviderError("unknown", "AI");
}

function providerLabel(provider: AIProvider): string {
  if (provider instanceof OpenAICompatibleProvider) return provider.label;
  return provider.name;
}

/**
 * Generate flashcards using the configured provider chain.
 * Returns the validated output; throws a classified ProviderError on failure.
 */
export function generateFlashcards(
  input: Parameters<AIProvider["generateFlashcards"]>[0]
): Promise<FlashcardGenerationOutput> {
  return runChain((p) => p.generateFlashcards(input)).then(
    (r) => r.value
  );
}

/**
 * Evaluate a Feynman explanation using the configured provider chain.
 */
export function evaluateExplanation(
  input: Parameters<AIProvider["evaluateExplanation"]>[0]
): Promise<FeynmanEvaluationOutput> {
  return runChain((p) => p.evaluateExplanation(input)).then((r) => r.value);
}

/** Visibility for tests: build the current fallback plan. */
export function getFallbackPlan(): FallbackPlan {
  const config = getProviderConfig();
  return {
    activeProviderId: config.activeProviderId,
    providers: buildProviderInstances(),
  };
}