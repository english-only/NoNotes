"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createSource,
} from "@/lib/db/repositories/source-repository";
import { processSource } from "@/lib/ingestion/processor";
import { extractPdfText } from "@/lib/ingestion/pdf-extractor";
import { extractUrlContent } from "@/lib/ingestion/url-extractor";

type SourceType = "text" | "markdown" | "pdf" | "url";

type CreateSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  topicId?: string;
  onSaved: () => void;
};

export function CreateSourceDialog({
  open,
  onOpenChange,
  courseId,
  topicId,
  onSaved,
}: CreateSourceDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<SourceType>("text");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (open && !wasOpen) {
    setTitle("");
    setContent("");
    setType("text");
    setUrl("");
    setError(null);
    setSaving(false);
    setProcessing(false);
    setProcessingMessage("");
    setSelectedFile(null);
  }
  if (wasOpen !== open) {
    setWasOpen(open);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let rawContent = content;
      let sourceTitle = title;

      if (type === "pdf" && selectedFile) {
        // Extract text from PDF
        setProcessing(true);
        setProcessingMessage("Extracting text from PDF...");
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const result = await extractPdfText(arrayBuffer, selectedFile.name);
          rawContent = result.text;
          // Use PDF title if no custom title provided
          if (!title.trim() && result.title) {
            sourceTitle = result.title;
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to extract PDF text.");
          setSaving(false);
          setProcessing(false);
          return;
        }
        setProcessing(false);
      }

      if (type === "url" && url.trim()) {
        // Extract content from URL
        setProcessing(true);
        setProcessingMessage("Fetching content from URL...");
        try {
          const result = await extractUrlContent(url.trim());
          rawContent = result.text;
          // Use page title if no custom title provided
          if (!title.trim() && result.title) {
            sourceTitle = result.title;
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to extract URL content.");
          setSaving(false);
          setProcessing(false);
          return;
        }
        setProcessing(false);
      }

      if (!sourceTitle.trim()) {
        setError("Title is required.");
        setSaving(false);
        return;
      }

      if (!rawContent.trim()) {
        setError("Content is required.");
        setSaving(false);
        return;
      }

      const source = await createSource({
        courseId,
        topicId,
        title: sourceTitle.trim(),
        type,
        rawContent,
        processedContent: rawContent,
      });
      await processSource(source.id);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the source."
      );
    } finally {
      setSaving(false);
      setProcessing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-set title from filename if empty
      if (!title.trim()) {
        const name = file.name.replace(/\.pdf$/i, "");
        setTitle(name);
      }
    }
  }

  const isBusy = saving || processing;
  const canSubmit =
    !isBusy &&
    title.trim() &&
    (((type === "text" || type === "markdown") && content.trim()) ||
    (type === "pdf" && selectedFile) ||
    (type === "url" && url.trim()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add source material</DialogTitle>
          <DialogDescription>
            Add text, Markdown, PDF, or URL content. It will be cleaned and
            split into chunks for study material generation.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="source-title">
              Title
            </label>
            <Input
              id="source-title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3 notes"
              required
              value={title}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="source-type">
              Format
            </label>
            <select
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              id="source-type"
              onChange={(e) => setType(e.target.value as SourceType)}
              value={type}
            >
              <option value="text">Plain text</option>
              <option value="markdown">Markdown</option>
              <option value="pdf">PDF file</option>
              <option value="url">URL</option>
            </select>
          </div>

          {/* Text / Markdown input */}
          {(type === "text" || type === "markdown") && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="source-content">
                Content
              </label>
              <Textarea
                className="min-h-[200px] font-mono text-sm"
                id="source-content"
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your study material here..."
                required
                value={content}
              />
            </div>
          )}

          {/* PDF upload */}
          {type === "pdf" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="source-pdf">
                PDF file
              </label>
              <input
                accept=".pdf"
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground hover:file:bg-primary/90"
                id="source-pdf"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum file size: 10 MB. Scanned/image-only PDFs are not supported.
              </p>
            </div>
          )}

          {/* URL input */}
          {type === "url" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="source-url">
                URL
              </label>
              <Input
                id="source-url"
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                type="url"
                value={url}
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to a web page or article. Content will be
                extracted automatically.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {processing && (
            <p className="text-sm text-muted-foreground" role="status">
              {processingMessage}
            </p>
          )}

          <DialogFooter>
            <Button disabled={!canSubmit} type="submit">
              {processing
                ? "Processing…"
                : saving
                  ? "Saving…"
                  : "Add source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
