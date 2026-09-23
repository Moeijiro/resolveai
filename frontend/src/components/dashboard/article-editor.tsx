"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button, ErrorNote, Field, Input, Spinner, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import type { Article } from "@/lib/types";

/**
 * Slide-over editor for creating or editing an article. `articleId` null means
 * a new article in `knowledgeBaseId`.
 */
export function ArticleEditor({
  knowledgeBaseId,
  articleId,
  onClose,
  onSaved,
}: {
  knowledgeBaseId: number;
  articleId: number | null;
  onClose: () => void;
  onSaved: (article: Article | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(articleId !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (articleId === null) return;
    let cancelled = false;
    api
      .article(articleId)
      .then((article) => {
        if (cancelled) return;
        setTitle(article.title);
        setCategory(article.category ?? "");
        setContent(article.content);
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = { title, content, category: category.trim() || null };
    try {
      const saved = articleId === null ? await api.createArticle(knowledgeBaseId, body) : await api.updateArticle(articleId, body);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (articleId === null || !window.confirm("Delete this article? Answers will stop citing it immediately.")) return;
    setBusy(true);
    try {
      await api.deleteArticle(articleId);
      onSaved(null);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <button type="button" aria-label="Close editor" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 id="editor-title" className="text-sm font-semibold">{articleId === null ? "New article" : "Edit article"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {loading ? (
          <Spinner label="Loading article" />
        ) : (
          <form onSubmit={save} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <Field label="Title" htmlFor="article-title">
                <Input id="article-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Category" htmlFor="article-category">
                <Input id="article-category" maxLength={60} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Optional" />
              </Field>
            </div>
            <Field label="Content" htmlFor="article-content" hint="Markdown. Headings (##) split the article into passages, which is what answers are retrieved from.">
              <Textarea id="article-content" required value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[340px] font-mono text-[13px]" />
            </Field>
            {error ? <ErrorNote message={error} /> : null}
            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              {articleId !== null ? <Button type="button" variant="danger" onClick={remove} disabled={busy}>Delete</Button> : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" loading={busy}>Save article</Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
