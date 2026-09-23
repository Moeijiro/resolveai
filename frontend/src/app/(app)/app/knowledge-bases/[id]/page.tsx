"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Plus, Search, Upload } from "lucide-react";
import { ArticleEditor } from "@/components/dashboard/article-editor";
import { ChatPreview } from "@/components/dashboard/chat-preview";
import { useSession } from "@/components/dashboard/session";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorNote, Select, Spinner } from "@/components/ui";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/utils";

/** Only offered in the demo workspace, where the seeded articles answer them. */
const DEMO_SUGGESTIONS = ["How do I create an API key?", "Why is my webhook returning 401?", "Do you support SSO?"];

export default function KnowledgeBaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useSession();
  const kbId = Number(params.id);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const kb = useAsync(() => api.knowledgeBase(kbId), `kb-${kbId}`);
  const articles = useAsync(() => api.articles(kbId, { q, category }), `articles-${kbId}-${q}-${category}`);

  function refresh() {
    kb.reload();
    articles.reload();
  }

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const article = await api.uploadArticle(kbId, file);
      setNotice(`Imported “${article.title}”.`);
      refresh();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function toggleStatus() {
    if (!kb.data) return;
    const updated = await api.updateKnowledgeBase(kbId, { status: kb.data.status === "active" ? "paused" : "active" });
    kb.setData(updated);
  }

  async function remove() {
    if (!kb.data || !window.confirm(`Delete “${kb.data.name}”, its articles, widget and conversation history?`)) return;
    await api.deleteKnowledgeBase(kbId);
    router.push("/app/knowledge-bases");
  }

  if (kb.loading && !kb.data) return <Spinner />;
  if (kb.error || !kb.data) return <ErrorNote message={kb.error ?? "Knowledge base not found."} />;
  const base = kb.data;

  return (
    <>
      <Link href="/app/knowledge-bases" className="mb-3 inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Knowledge Bases
      </Link>
      <PageHeader
        title={base.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={base.status === "active" ? "answered" : "neutral"}>{base.status}</Badge>
            <span className="font-mono text-xs">{base.public_id}</span>
            <span className="text-xs">· {base.article_count} articles · {base.questions} questions</span>
          </span>
        }
        action={
          <>
            <Button size="sm" onClick={toggleStatus}>{base.status === "active" ? "Pause" : "Activate"}</Button>
            <Link href={`/app/widget?kb=${base.id}`}><Button size="sm">Widget</Button></Link>
            <Button size="sm" variant="danger" onClick={remove}>Delete</Button>
          </>
        }
      />
      {base.status === "paused" ? (
        <p className="mb-4 rounded-lg border border-[#5a4520] bg-[#241c0f] px-3 py-2 text-xs text-[var(--color-unresolved)]">
          Paused: the widget and the API refuse questions for this knowledge base. Dashboard previews still work.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader
            title="Articles"
            description="Edits are searchable on the next question."
            action={
              <div className="flex gap-2">
                <input ref={fileInput} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                <Button size="sm" onClick={() => fileInput.current?.click()} loading={uploading}>
                  {uploading ? null : <Upload className="h-3.5 w-3.5" aria-hidden />}
                  Upload
                </Button>
                <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add
                </Button>
              </div>
            }
          />
          <div className="flex flex-col gap-2 border-b border-[var(--color-border)] px-5 py-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-subtle)]" aria-hidden />
              <label htmlFor="article-search" className="sr-only">Search articles</label>
              <input
                id="article-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search titles and content"
                className="h-9 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-canvas)] pr-3 pl-8 text-sm placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>
            <label htmlFor="article-category-filter" className="sr-only">Category</label>
            <Select id="article-category-filter" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 py-0 sm:w-44">
              <option value="">All categories</option>
              {base.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          {notice ? <p className="border-b border-[var(--color-border)] bg-[#0d2119] px-5 py-2 text-xs text-[var(--color-answered)]">{notice}</p> : null}
          {uploadError ? <div className="px-5 pt-3"><ErrorNote message={uploadError} /></div> : null}
          {articles.loading && !articles.data ? (
            <Spinner />
          ) : articles.data?.length ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {articles.data.map((article) => (
                <li key={article.id}>
                  <button type="button" onClick={() => setEditing(article.id)} className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--color-surface-raised)]/60">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm">{article.title}</span>
                        {article.source === "upload" ? <Badge tone="violet">uploaded</Badge> : null}
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-xs text-[var(--color-ink-subtle)]">{article.excerpt}</span>
                    </span>
                    {article.category ? <Badge className="hidden sm:inline-flex">{article.category}</Badge> : null}
                    <span className="hidden w-20 text-right text-[11px] text-[var(--color-ink-subtle)] md:block">{relativeTime(article.updated_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={q || category ? "No articles match" : "No articles yet"}
              hint={q || category ? "Try another search." : "Write one here, or upload a Markdown or text file — its first heading becomes the title."}
            />
          )}
        </Card>

        <Card className="self-start">
          <CardHeader title="Test it" description="Runs the real pipeline. Recorded as a preview conversation." />
          <ChatPreview knowledgeBaseId={kbId} suggestions={user.is_demo ? DEMO_SUGGESTIONS : []} />
        </Card>
      </div>

      {editing !== null ? (
        <ArticleEditor
          knowledgeBaseId={kbId}
          articleId={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(article) => {
            setEditing(null);
            setNotice(article ? `Saved “${article.title}”.` : "Article deleted.");
            refresh();
          }}
        />
      ) : null}
    </>
  );
}
