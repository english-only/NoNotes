"use client";

import { useCallback, useRef, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Key,
  Loader2,
  PlugZap,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_GEMINI_MODEL,
  getProviderConfig,
  isProviderConfigured,
  setProviderConfig,
  type ProviderId,
} from "@/lib/ai/config";
import { cn } from "@/lib/utils";

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  if (!htmlFor) {
    // Static heading-style label, not tied to a form control.
    return (
      <span className="text-sm font-medium text-foreground">{children}</span>
    );
  }
  return (
    <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

/** A masked secret input with a show/hide toggle and remove button. */
function SecretRow({
  value,
  onChange,
  onRemove,
  label,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
  label: string;
  placeholder?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={shown ? "text" : "password"}
          value={shown ? value : maskKey(value)}
        />
        <Button
          aria-label={shown ? `Hide ${label}` : `Show ${label}`}
          className="absolute top-1 right-1 -translate-y-1/2"
          onClick={() => setShown((s) => !s)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {shown ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </Button>
      </div>
      <Button
        aria-label={`Remove ${label}`}
        className="shrink-0"
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}

/** True when composing a valid OpenAI-compatible request path. */
function normalizeOacUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function AiProviderSection() {
  const [config, setConfig] = useState(() => getProviderConfig());
  const [showKeys, setShowKeys] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const pendingKeyRef = useRef("");

  const commit = useCallback((next: typeof config, withFeedback = true) => {
    setProviderConfig(next);
    setConfig(next);
    setTestResult(null);
    if (withFeedback) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, []);

  const setActiveProvider = useCallback(
    (id: ProviderId) => {
      commit({ ...config, activeProviderId: id });
    },
    [config, commit]
  );

  // ── Gemini modifications ────────────────────────────────────────
  const setGeminiModel = useCallback(
    (model: string) => {
      commit({ ...config, gemini: { ...config.gemini, model } }, false);
    },
    [config, commit]
  );

  const addGeminiKey = useCallback(() => {
    const key = pendingKeyRef.current.trim();
    if (!key) return;
    commit({
      ...config,
      gemini: { ...config.gemini, apiKeys: [...config.gemini.apiKeys, key] },
    });
    pendingKeyRef.current = "";
  }, [config, commit]);

  const updateGeminiKey = useCallback(
    (index: number, value: string) => {
      const apiKeys = config.gemini.apiKeys.map((k, i) =>
        i === index ? value : k
      );
      commit({ ...config, gemini: { ...config.gemini, apiKeys } }, false);
    },
    [config, commit]
  );

  const removeGeminiKey = useCallback(
    (index: number) => {
      const apiKeys = config.gemini.apiKeys.filter((_, i) => i !== index);
      commit({ ...config, gemini: { ...config.gemini, apiKeys } }, false);
    },
    [config, commit]
  );

  // ── OpenAI-compatible modifications ─────────────────────────────
  const setOac = useCallback(
    (patch: Partial<typeof config.openAiCompatible>) => {
      commit(
        { ...config, openAiCompatible: { ...config.openAiCompatible, ...patch } },
        false
      );
    },
    [config, commit]
  );

  const handleTestConnection = useCallback(async () => {
    const oac = config.openAiCompatible;
    const baseUrl = normalizeOacUrl(oac.baseUrl);
    if (!baseUrl || !oac.model) {
      setTestResult({
        ok: false,
        message: "Enter a base URL and model before testing.",
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const path = /\/chat\/completions$/i.test(baseUrl)
        ? baseUrl
        : `${baseUrl}/chat/completions`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000);
      let res: Response;
      try {
        res = await fetch(path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${oac.apiKey}`,
          },
          body: JSON.stringify({
            model: oac.model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (res.ok) {
        setTestResult({ ok: true, message: "Connection successful." });
      } else {
        setTestResult({
          ok: false,
          message: `Provider returned ${res.status}. Check the base URL, model, and key.`,
        });
      }
    } catch {
      setTestResult({
        ok: false,
        message: "Could not reach the provider. Check the base URL and your network.",
      });
    } finally {
      setTesting(false);
    }
  }, [config.openAiCompatible]);

  const configured = isProviderConfigured();
  const geminiKeys = config.gemini.apiKeys;

  return (
    <section className="border border-border/80 bg-card/60 p-6">
      <div className="flex items-center gap-3">
        <Key aria-hidden="true" className="size-5 text-primary" />
        <div>
          <h2 className="font-heading text-lg font-semibold">AI Provider</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how NoNotes powers AI flashcards and Feynman feedback. Keys
            stay in your browser and are never exported.
          </p>
        </div>
      </div>

      {/* Primary provider picker */}
      <div className="mt-6">
        <p className="text-sm font-medium text-foreground">Primary provider</p>
        <div
          aria-label="Primary AI provider"
          className="mt-2 grid grid-cols-2 gap-2"
          role="radiogroup"
        >
          {(
            [
              { id: "gemini", label: "Gemini" },
              { id: "openai-compatible", label: "OpenAI-compatible" },
            ] as const
          ).map((option) => {
            const active = config.activeProviderId === option.id;
            return (
              <button
                aria-checked={active}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10"
                    : "border-border/80 hover:border-border"
                )}
                key={option.id}
                onClick={() => setActiveProvider(option.id)}
                role="radio"
                type="button"
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {option.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {option.id === "gemini"
                    ? "Google AI Studio key (free tier)"
                    : "Bring your own endpoint (Ollama, Groq, OpenRouter…)"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Gemini config ────────────────────────────────────────── */}
      {config.activeProviderId === "gemini" && (
        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="gemini-model">Model</FieldLabel>
            <Input
              id="gemini-model"
              onChange={(e) => setGeminiModel(e.target.value)}
              placeholder={DEFAULT_GEMINI_MODEL}
              value={config.gemini.model}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to {DEFAULT_GEMINI_MODEL}. Add multiple keys below — key 1
              is tried first, then key 2, etc.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel>API keys ({geminiKeys.length})</FieldLabel>
            <div className="flex flex-col gap-2">
              {geminiKeys.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No Gemini keys yet. Add a free key from{" "}
                  <a
                    className="text-primary underline underline-offset-2 hover:text-foreground"
                    href="https://aistudio.google.com/apikey"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Google AI Studio
                  </a>
                  .
                </p>
              )}
              {geminiKeys.map((key, index) => (
                <SecretRow
                  key={`${index}-${key.slice(0, 4)}`}
                  label="Gemini API key"
                  onChange={(v) => updateGeminiKey(index, v)}
                  onRemove={() => removeGeminiKey(index)}
                  placeholder="AIza..."
                  value={key}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                aria-label="New Gemini API key"
                onChange={(e) => {
                  pendingKeyRef.current = e.target.value;
                }}
                placeholder="Paste a new Gemini API key"
                type="password"
              />
              <Button onClick={addGeminiKey} type="button" variant="outline">
                <Plus aria-hidden="true" className="size-4" />
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── OpenAI-compatible config ─────────────────────────────── */}
      {config.activeProviderId === "openai-compatible" && (
        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="oac-name">Display name</FieldLabel>
            <Input
              id="oac-name"
              onChange={(e) => setOac({ displayName: e.target.value })}
              placeholder="e.g., Ollama, Groq, OpenRouter"
              value={config.openAiCompatible.displayName}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="oac-base-url">Base URL</FieldLabel>
            <Input
              id="oac-base-url"
              onChange={(e) => setOac({ baseUrl: e.target.value })}
              placeholder="https://api.groq.com/openai/v1 or http://localhost:11434/v1"
              value={config.openAiCompatible.baseUrl}
            />
            <p className="text-xs text-muted-foreground">
              The provider&apos;s OpenAI-compatible root, e.g.{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                /v1
              </code>{" "}
              for Groq/OpenRouter, or{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                http://localhost:11434/v1
              </code>{" "}
              for Ollama.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="oac-model">Model ID</FieldLabel>
            <Input
              id="oac-model"
              onChange={(e) => setOac({ model: e.target.value })}
              placeholder="llama-3.3-70b-versatile"
              value={config.openAiCompatible.model}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="oac-key">API key</FieldLabel>
            <div className="relative">
              <Input
                id="oac-key"
                onChange={(e) => setOac({ apiKey: e.target.value })}
                placeholder={
                  config.openAiCompatible.displayName || "Provider API key"
                }
                type={showKeys ? "text" : "password"}
                value={config.openAiCompatible.apiKey}
              />
              <Button
                aria-label={showKeys ? "Hide API key" : "Show API key"}
                className="absolute top-1 right-1 -translate-y-1/2"
                onClick={() => setShowKeys((s) => !s)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                {showKeys ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              disabled={testing}
              onClick={() => void handleTestConnection()}
              type="button"
              variant="outline"
            >
              {testing ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <PlugZap aria-hidden="true" className="size-4" />
              )}
              {testing ? "Testing…" : "Test connection"}
            </Button>
            {testResult && (
              <p
                className={cn(
                  "text-sm",
                  testResult.ok ? "text-emerald-400" : "text-destructive"
                )}
                role="status"
              >
                <Check aria-hidden="true" className="mr-1 inline size-4" />
                {testResult.message}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Requests are sent directly from your browser, so the endpoint must
            allow browser (CORS) access — enable CORS in Ollama
            (<code className="rounded bg-muted px-1 py-0.5">OLLAMA_ORIGINS</code>)
            or LM Studio if a request is blocked. Local options work with no
            key; the provider receives your source context only when you
            generate.
          </p>
        </div>
      )}

      {saved && (
        <p className="mt-4 text-sm text-emerald-400" role="status">
          Provider configuration saved.
        </p>
      )}
      {!configured && (
        <p className="mt-4 text-sm text-muted-foreground">
          No active provider is configured. AI features will prompt you to
          configure one.
        </p>
      )}
    </section>
  );
}

/** Mask a secret key, revealing only the final 4 chars. */
function maskKey(key: string): string {
  if (key.length <= 4) return "••••";
  return `••••${key.slice(-4)}`;
}