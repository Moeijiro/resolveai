"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Spinner, Textarea } from "@/components/ui";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/utils";

export default function KnowledgeBasesPage() {
  const router = useRouter();
  const list = useAsync(() => api.knowledgeBases(), "kbs");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const kb = await api.createKnowledgeBase(name, description);
      router.push(`/app/knowledge-bases/${kb.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Knowledge Bases"
        description="Each knowledge base has its own articles, widget and public id."
        action={<Button variant="primary" onClick={() => setCreating((value) => !value)}><Plus className="h-4 w-4" aria-hidden />New knowledge base</Button>}
      />

      {creating ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
            <Field label="Name" htmlFor="kb-name">
              <Input id="kb-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Product Documentation" autoFocus />
            </Field>
            <Field label="Description" htmlFor="kb-description">
              <Textarea id="kb-description" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-0 h-[38px] py-2" placeholder="Optional" />
            </Field>
            <Button type="submit" variant="primary" loading={busy}>Create</Button>
            {error ? <div className="sm:col-span-3"><ErrorNote message={error} /></div> : null}
          </form>
        </Card>
      ) : null}

      {list.loading && !list.data ? (
        <Spinner />
      ) : list.error ? (
        <ErrorNote message={list.error} />
      ) : list.data?.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.data.map((kb) => (
            <Link key={kb.id} href={`/app/knowledge-bases/${kb.id}`} className="group">
              <Card className="h-full p-5 transition-colors group-hover:border-[var(--color-border-strong)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                      <BookOpen className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">{kb.name}</h2>
                      <p className="truncate font-mono text-[11px] text-[var(--color-ink-subtle)]">{kb.public_id}</p>
                    </div>
                  </div>
                  <Badge tone={kb.status === "active" ? "answered" : "neutral"}>{kb.status}</Badge>
                </div>
                {kb.description ? <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">{kb.description}</p> : null}
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-3 text-[11px]">
                  <div><dt className="text-[var(--color-ink-subtle)]">Articles</dt><dd className="mt-0.5 font-mono text-sm">{kb.article_count}</dd></div>
                  <div><dt className="text-[var(--color-ink-subtle)]">Questions</dt><dd className="mt-0.5 font-mono text-sm">{kb.questions}</dd></div>
                  <div><dt className="text-[var(--color-ink-subtle)]">Unresolved</dt><dd className="mt-0.5 font-mono text-sm text-[var(--color-unresolved)]">{kb.unresolved}</dd></div>
                </dl>
                <p className="mt-3 text-[11px] text-[var(--color-ink-subtle)]">Last article update {relativeTime(kb.last_article_update)}</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState title="No knowledge bases yet" hint="Create one, then add articles by writing them or uploading .md and .txt files." />
        </Card>
      )}
    </>
  );
}
