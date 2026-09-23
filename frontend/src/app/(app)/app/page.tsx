"use client";

import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { PageHeader } from "@/components/dashboard/shell";
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorNote, Spinner } from "@/components/ui";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/utils";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
      <p className="mt-2 font-mono text-2xl tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-[var(--color-ink-subtle)]">{hint}</p> : null}
    </Card>
  );
}

export default function OverviewPage() {
  const overview = useAsync(() => api.overview(), "overview");
  const recent = useAsync(() => api.conversations({ limit: 6 }), "recent");
  const unresolved = useAsync(() => api.unresolved(5), "unresolved");

  if (overview.loading && !overview.data) return <Spinner />;
  if (overview.error || !overview.data) return <ErrorNote message={overview.error ?? "Could not load the overview."} />;
  const data = overview.data;

  if (data.knowledge_bases === 0) {
    return (
      <>
        <PageHeader title="Overview" />
        <Card>
          <EmptyState
            title="Create your first knowledge base"
            hint="Add a few articles, ask a test question, then embed the widget or call the API."
            action={<Link href="/app/knowledge-bases"><Button variant="primary">Create a knowledge base</Button></Link>}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Overview" description="Questions asked across the widget, the API and dashboard previews." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Questions" value={String(data.questions_total)} hint={`${data.questions_today} today`} />
        <Stat label="Answer rate" value={data.answer_rate == null ? "—" : `${Math.round(data.answer_rate * 100)}%`} hint="answered ÷ all questions" />
        <Stat label="Unresolved" value={String(data.unresolved)} hint="not covered by the docs" />
        <Stat label="Avg. response" value={data.avg_response_ms == null ? "—" : data.avg_response_ms < 1 ? "<1 ms" : `${Math.round(data.avg_response_ms)} ms`} hint={`${data.articles} articles · ${data.knowledge_bases} KB`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Last 14 days" description="Daily questions by outcome" />
          <CardBody><ActivityChart series={data.series} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Most cited articles" description="Sources that answers actually used" />
          {data.top_articles.length ? (
            <ol className="divide-y divide-[var(--color-border)]">
              {data.top_articles.map((article, index) => (
                <li key={article.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="w-4 font-mono text-[11px] text-[var(--color-ink-subtle)]">{index + 1}</span>
                  <span className="flex-1 truncate">{article.title}</span>
                  <span className="font-mono text-xs text-[var(--color-ink-muted)]">{article.uses}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No citations yet" hint="Answered questions will list the articles they used here." />
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Unresolved questions"
            description="What people asked that your docs don't cover — each one is an article worth writing."
            icon={<CircleHelp className="h-4 w-4 text-[var(--color-unresolved)]" aria-hidden />}
            action={<Link href="/app/conversations?status=unresolved"><Button size="sm" variant="ghost">All<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Button></Link>}
          />
          {unresolved.data?.items.length ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {unresolved.data.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{item.question}</span>
                    <span className="block text-[11px] text-[var(--color-ink-subtle)]">{item.knowledge_base_name}</span>
                  </span>
                  <span className="text-[11px] text-[var(--color-ink-subtle)]">{relativeTime(item.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : unresolved.loading ? (
            <Spinner />
          ) : (
            <EmptyState title="Nothing unresolved" hint="Every question so far found an answer in your docs." />
          )}
        </Card>
        <Card>
          <CardHeader
            title="Recent conversations"
            action={<Link href="/app/conversations"><Button size="sm" variant="ghost">All<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Button></Link>}
          />
          {recent.data?.items.length ? <ConversationList items={recent.data.items} /> : recent.loading ? <Spinner /> : <EmptyState title="No conversations yet" />}
        </Card>
      </div>
    </>
  );
}
