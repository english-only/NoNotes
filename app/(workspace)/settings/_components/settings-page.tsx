"use client";

import { useCallback, useEffect, useRef, startTransition, useState } from "react";
import {
  Eye,
  EyeOff,
  Key,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  Database,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearApiKey,
  getApiKey,
  setApiKey,
} from "@/lib/ai/provider";
import {
  exportAllData,
  downloadExport,
} from "@/lib/data-export";
import {
  validateImport,
  importData,
  parseImportFile,
  clearAllData,
  getStorageInfo,
  type ImportMode,
} from "@/lib/data-import";

export function SettingsPage() {
  // ── API Key state ────────────────────────────────────────────────
  const [apiKey, setApiKeyState] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setApiKeyState(getApiKey() ?? "");
    });
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      setApiKey(trimmed);
      setApiKeyState(trimmed);
    } else {
      clearApiKey();
      setApiKeyState("");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [apiKey]);

  const handleClear = useCallback(() => {
    clearApiKey();
    setApiKeyState("");
    setShowKey(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  // ── Export state ─────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      const data = await exportAllData();
      downloadExport(data);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Could not export your data.",
      );
    } finally {
      setExporting(false);
    }
  }, []);

  // ── Import state ─────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    data: unknown;
    validation: Awaited<ReturnType<typeof validateImport>>;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportResult(null);
    try {
      const parsed = await parseImportFile(file);
      const validation = await validateImport(parsed);
      setImportPreview({ data: parsed, validation });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to read file.";
      setImportResult(`Error: ${message}`);
    }

    // Reset input so re-selecting the same file triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!importPreview) return;

    setImporting(true);
    setImportResult(null);
    try {
      const result = await importData(importPreview.data, importMode);
      if (result.success) {
        const s = result.imported;
        setImportResult(
          `Imported ${s.courses} courses, ${s.decks} decks, ${s.flashcards} cards, ` +
          `${s.reviewLogs} reviews, ${s.sources} sources, ${s.chunks} chunks, ` +
          `${s.feynmanAttempts} Feynman attempts.`,
        );
        setImportPreview(null);
        // Reload to reflect new data
        window.location.reload();
      } else {
        setImportResult(`Import failed: ${result.errors.join("; ")}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setImportResult(`Import failed: ${message}`);
    } finally {
      setImporting(false);
    }
  }, [importPreview, importMode]);

  const handleImportCancel = useCallback(() => {
    setImportPreview(null);
    setImportResult(null);
  }, []);

  // ── Storage info ─────────────────────────────────────────────────
  const [storageInfo, setStorageInfo] = useState<{
    tables: Record<string, number>;
    totalRecords: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStorageInfo().then((info) => {
      if (!cancelled) setStorageInfo(info);
    });
    return () => { cancelled = true; };
  }, [importResult]); // Refresh after import

  // ── Data reset ───────────────────────────────────────────────────
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleReset = useCallback(async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    setResetting(true);
    setResetError(null);
    try {
      await clearAllData();
      window.location.reload();
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : "Could not reset your data.",
      );
      setResetting(false);
    }
  }, [resetConfirm]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Workspace controls
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            Your workspace, your defaults.
          </h1>
        </div>
      </section>

      {/* ── AI Provider ──────────────────────────────────────────── */}
      <section className="border border-border/80 bg-card/60 p-6">
        <div className="flex items-center gap-3">
          <Key aria-hidden="true" className="size-5 text-primary" />
          <div>
            <h2 className="font-heading text-lg font-semibold">
              AI Provider
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure your Gemini API key to enable AI-powered flashcard
              generation. Your key is stored locally in your browser and never
              sent to our servers.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="api-key">
              Gemini API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  onChange={(e) => {
                    setApiKeyState(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="AIza..."
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                />
                <Button
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  onClick={() => setShowKey(!showKey)}
                  size="icon-sm"
                  variant="ghost"
                >
                  {showKey ? (
                    <EyeOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Eye aria-hidden="true" className="size-4" />
                  )}
                </Button>
              </div>
              <Button onClick={handleSave} variant="outline">
                Save
              </Button>
              {apiKey.length > 0 && (
                <Button aria-label="Clear API key" onClick={handleClear} variant="ghost">
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {saved && (
            <p className="text-sm text-emerald-400" role="status">
              {apiKey.trim() ? "API key saved." : "API key cleared."}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Get a free API key at{" "}
            <a
              className="text-primary underline underline-offset-2 hover:text-foreground"
              href="https://aistudio.google.com/apikey"
              rel="noopener noreferrer"
              target="_blank"
            >
              Google AI Studio
            </a>
            . No credit card required.
          </p>
        </div>
      </section>

      {/* ── Data Export ──────────────────────────────────────────── */}
      <section className="border border-border/80 bg-card/60 p-6">
        <div className="flex items-center gap-3">
          <Download aria-hidden="true" className="size-5 text-primary" />
          <div>
            <h2 className="font-heading text-lg font-semibold">Export Data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Download all your study data as a JSON file. This includes
              courses, decks, flashcards, review history, sources, and
              Feynman attempts. Your API key is never included.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button
            disabled={exporting}
            onClick={handleExport}
            variant="outline"
          >
            {exporting ? (
              <RefreshCw aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Download aria-hidden="true" className="size-4" />
            )}
            {exporting ? "Exporting..." : "Export all data"}
          </Button>
          {exportError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {exportError}
            </p>
          )}
        </div>
      </section>

      {/* ── Data Import ──────────────────────────────────────────── */}
      <section className="border border-border/80 bg-card/60 p-6">
        <div className="flex items-center gap-3">
          <Upload aria-hidden="true" className="size-5 text-primary" />
          <div>
            <h2 className="font-heading text-lg font-semibold">Import Data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Restore data from a previously exported NoNotes JSON file.
              Choose whether to merge with existing data or replace it
              entirely.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <input
            ref={fileInputRef}
            accept=".json"
            aria-label="Select JSON file to import"
            className="hidden"
            onChange={handleFileSelect}
            type="file"
          />

          {!importPreview ? (
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              <Upload aria-hidden="true" className="size-4" />
              Choose JSON file
            </Button>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Preview */}
              <div className="rounded-md border border-border/50 bg-muted/30 p-4">
                <h3 className="text-sm font-medium">Import Preview</h3>
                {importPreview.validation.valid ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>Found:</p>
                    <ul className="mt-1 list-inside list-disc">
                      {importPreview.validation.summary.courses > 0 && (
                        <li>{importPreview.validation.summary.courses} course(s)</li>
                      )}
                      {importPreview.validation.summary.decks > 0 && (
                        <li>{importPreview.validation.summary.decks} deck(s)</li>
                      )}
                      {importPreview.validation.summary.flashcards > 0 && (
                        <li>{importPreview.validation.summary.flashcards} flashcard(s)</li>
                      )}
                      {importPreview.validation.summary.reviewLogs > 0 && (
                        <li>{importPreview.validation.summary.reviewLogs} review log(s)</li>
                      )}
                      {importPreview.validation.summary.sources > 0 && (
                        <li>{importPreview.validation.summary.sources} source(s)</li>
                      )}
                      {importPreview.validation.summary.chunks > 0 && (
                        <li>{importPreview.validation.summary.chunks} chunk(s)</li>
                      )}
                      {importPreview.validation.summary.feynmanAttempts > 0 && (
                        <li>{importPreview.validation.summary.feynmanAttempts} Feynman attempt(s)</li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-destructive">
                    {importPreview.validation.errors.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                )}

                {importPreview.validation.warnings.length > 0 && (
                  <div className="mt-2 text-sm text-amber-400">
                    {importPreview.validation.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Mode selector */}
              {importPreview.validation.valid && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Import mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={importMode === "merge"}
                        name="importMode"
                        onChange={() => setImportMode("merge")}
                        type="radio"
                      />
                      Merge (add new, skip existing)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={importMode === "replace"}
                        name="importMode"
                        onChange={() => setImportMode("replace")}
                        type="radio"
                      />
                      Replace (clear all, then import)
                    </label>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  disabled={!importPreview.validation.valid || importing}
                  onClick={handleImportConfirm}
                  variant="default"
                >
                  {importing ? "Importing..." : "Confirm import"}
                </Button>
                <Button onClick={handleImportCancel} variant="ghost">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {importResult && (
            <p
              className={`text-sm ${importResult.startsWith("Error") || importResult.startsWith("Import failed") ? "text-destructive" : "text-emerald-400"}`}
              role="status"
            >
              {importResult}
            </p>
          )}
        </div>
      </section>

      {/* ── Storage ──────────────────────────────────────────────── */}
      <section className="border border-border/80 bg-card/60 p-6">
        <div className="flex items-center gap-3">
          <Database aria-hidden="true" className="size-5 text-primary" />
          <div>
            <h2 className="font-heading text-lg font-semibold">Storage</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All data is stored locally in your browser using IndexedDB.
              Nothing is sent to external servers unless you explicitly use AI
              generation (which requires your own API key).
            </p>
          </div>
        </div>

        {storageInfo && (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {Object.entries(storageInfo.tables).map(([table, count]) => (
                <div key={table} className="flex flex-col">
                  <span className="text-xs text-muted-foreground capitalize">
                    {table}
                  </span>
                  <span className="font-medium">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Total: {storageInfo.totalRecords.toLocaleString()} records
            </p>
          </div>
        )}
      </section>

      {/* ── Danger Zone ──────────────────────────────────────────── */}
      <section className="border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle aria-hidden="true" className="size-5 text-destructive" />
          <div>
            <h2 className="font-heading text-lg font-semibold text-destructive">
              Danger Zone
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete all study data from this browser. This action
              cannot be undone. Export your data first if you want a backup.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button
            disabled={resetting}
            onClick={handleReset}
            variant="destructive"
          >
            {resetting
              ? "Deleting…"
              : resetConfirm
                ? "Confirm delete all data"
                : "Delete all data"}
          </Button>
          {resetConfirm && (
            <Button
              className="ml-2"
              onClick={() => setResetConfirm(false)}
              variant="ghost"
            >
              Cancel
            </Button>
          )}
          {resetError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {resetError}
            </p>
          )}
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────── */}
      <section className="border border-border/80 bg-card/60 p-6">
        <h2 className="font-heading text-lg font-semibold">Privacy</h2>
        <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            All study data is stored locally in your browser using IndexedDB.
            Nothing is sent to external servers unless you explicitly use AI
            generation (which requires your own API key).
          </p>
          <p>
            Your API key is stored in localStorage and is only used to make
            direct requests to Google&apos;s Gemini API from your browser.
          </p>
        </div>
      </section>
    </div>
  );
}
