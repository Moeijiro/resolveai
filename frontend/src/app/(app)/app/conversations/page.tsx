"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { PageHeader } from "@/components/dashboard/shell";
import { Button, Card, EmptyState, ErrorNote, Select, Spinner } from "@/components/ui";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE = 25;
const STATUSES = [
  { value: "", label: "All" },
  { value: "answered", label: "Answered" },
  { value: "unresolved", label: "Unresolved" },
  { value: "error", label: "Error" },
];

function Conversations() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const channel = params.get("channel") ?? "";
  const kb = params.get("kb") ?? "";
  const offset = Number(params.get("offset") ?? 0);

  const kbs = useAsync(() => api.knowledgeBases(), "kbs");
  const page = useAsync(
    () => api.conversations({ status, channel, knowledge_base_id: kb ? Number(kb) : undefined, limit: PAGE, offset }),
    `conv-${status}-${channel}-${kb}-${offset}`,
  );

  function set(next: Record<string, string>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    if (!("offset" in next)) search.delete("offset");
    router.replace(`${pathname}?${search.toString()}`);
  }

  const total = page.data?.total ?? 0;
  return (
    <>
      <PageHeader title="Conversations" description="Every question with its answer, sources, coverage and timing. No visitor data is stored." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-3 md:flex-row md:items-center md:justify-between">
          <div role="tablist" aria-label="Status" className="flex gap-1 overflow-x-auto">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                role="tab"
                aria-selected={status === s.value}
                onClick={() => set({ status: s.value })}
                className={cn("rounded-md px-3 py-1.5 text-xs whitespace-nowrap", status === s.value ? "bg-[var(--color-surface-raised)] font-medium text-[var(--color-ink)]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]")}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label htmlFor="filter-kb" className="sr-only">Knowledge base</label>
            <Select id="filter-kb" value={kb} onChange={(e) => set({ kb: e.target.value })} className="h-8 py-0 text-xs md:w-48">
              <option value="">All knowledge bases</option>
              {kbs.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <label htmlFor="filter-channel" className="sr-only">Channel</label>
            <Select id="filter-channel" value={channel} onChange={(e) => set({ channel: e.target.value })} className="h-8 py-0 text-xs md:w-36">
              <option value="">All channels</option>
              <option value="widget">Widget</option>
              <option value="api">API</option>
              <option value="preview">Preview</option>
            </Select>
          </div>
        </div>
        {page.loading && !page.data ? (
          <Spinner />
        ) : page.error ? (
          <div className="p-5"><ErrorNote message={page.error} /></div>
        ) : page.data?.items.length ? (
          <>
            <ConversationList items={page.data.items} />
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-xs text-[var(--color-ink-muted)]">
              <span>{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
              <div className="flex gap-2">
                <Button size="sm" disabled={offset === 0} onClick={() => set({ offset: String(Math.max(0, offset - PAGE)) })}>Previous</Button>
                <Button size="sm" disabled={offset + PAGE >= total} onClick={() => set({ offset: String(offset + PAGE) })}>Next</Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No conversations match" hint={status === "unresolved" ? "Nothing unresolved — your docs covered every question." : "Questions from the widget, the API and previews appear here."} />
        )}
      </Card>
    </>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Conversations />
    </Suspense>
  );
}
