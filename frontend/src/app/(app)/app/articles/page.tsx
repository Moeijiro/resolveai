"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { ArticleEditor } from "@/components/dashboard/article-editor";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge, Card, EmptyState, ErrorNote, Spinner } from "@/components/ui";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import type { ArticleSummary } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export default function ArticlesPage() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<ArticleSummary | null>(null);
  const articles = useAsync(() => api.allArticles(q), `all-articles-${q}`);
  const kbs = useAsync(() => api.knowledgeBases(), "kbs");
  const kbName = new Map((kbs.data ?? []).map((kb) => [kb.id, kb.name]));

  return (
    <>
      <PageHeader
        title="Articles"
        description="Every article across your knowledge bases. Add new ones from a knowledge base."
      />
      <Card>
        <div className="border-b border-[var(--color-border)] px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-subtle)]" aria-hidden />
            <label htmlFor="all-article-search" className="sr-only">Search articles</label>
            <input
              id="all-article-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search every article"
              className="h-9 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-canvas)] pr-3 pl-8 text-sm placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>
        {articles.loading && !articles.data ? (
          <Spinner />
        ) : articles.error ? (
          <div className="p-5"><ErrorNote message={articles.error} /></div>
        ) : articles.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
                <tr className="border-b border-[var(--color-border)]">
                  <th scope="col" className="px-5 py-2.5 font-medium">Title</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Knowledge base</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Category</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {articles.data.map((article) => (
                  <tr key={article.id} className="transition-colors hover:bg-[var(--color-surface-raised)]/60">
                    <td className="px-5 py-3">
                      <button type="button" onClick={() => setEditing(article)} className="flex items-center gap-2.5 text-left hover:text-[var(--color-accent)]">
                        <FileText className="h-4 w-4 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
                        {article.title}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--color-ink-muted)]">
                      <Link href={`/app/knowledge-bases/${article.knowledge_base_id}`} className="hover:text-[var(--color-ink)]">
                        {kbName.get(article.knowledge_base_id) ?? "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{article.category ? <Badge>{article.category}</Badge> : <span className="text-xs text-[var(--color-ink-subtle)]">—</span>}</td>
                    <td className="px-5 py-3 text-right text-xs text-[var(--color-ink-subtle)]">{relativeTime(article.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={q ? "No articles match" : "No articles yet"} hint={q ? undefined : "Open a knowledge base to write or upload articles."} />
        )}
      </Card>
      {editing ? (
        <ArticleEditor
          knowledgeBaseId={editing.knowledge_base_id}
          articleId={editing.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            articles.reload();
          }}
        />
      ) : null}
    </>
  );
}
