"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui";
import type { Conversation } from "@/lib/types";
import { absoluteTime, CHANNEL_LABEL, cn, relativeTime } from "@/lib/utils";

/** Expandable rows: the question up front, the answer and its sources on demand. */
export function ConversationList({ items, compact = false }: { items: Conversation[]; compact?: boolean }) {
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : item.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--color-surface-raised)]/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{item.question}</span>
                {!compact ? (
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--color-ink-subtle)]">
                    {item.knowledge_base_name} · {CHANNEL_LABEL[item.channel] ?? item.channel}
                  </span>
                ) : null}
              </span>
              <StatusBadge status={item.status} />
              <span className="hidden w-20 text-right text-[11px] text-[var(--color-ink-subtle)] sm:block" title={absoluteTime(item.created_at)}>
                {relativeTime(item.created_at)}
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--color-ink-subtle)] transition-transform", open && "rotate-180")} aria-hidden />
            </button>
            {open ? (
              <div className="space-y-3 border-t border-[var(--color-border)] bg-[var(--color-canvas)]/40 px-5 py-4">
                <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--color-ink-muted)]">{item.answer ?? item.error ?? "No answer recorded."}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.sources.length ? (
                    item.sources.map((source) => (
                      <Badge key={source.id}>
                        <FileText className="h-3 w-3" aria-hidden />
                        {source.title}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[11px] text-[var(--color-ink-subtle)]">No sources cited</span>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[11px] text-[var(--color-ink-subtle)] sm:grid-cols-4">
                  <div><dt className="inline">channel </dt><dd className="inline text-[var(--color-ink-muted)]">{item.channel}</dd></div>
                  <div><dt className="inline">coverage </dt><dd className="inline text-[var(--color-ink-muted)]">{item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "—"}</dd></div>
                  <div><dt className="inline">time </dt><dd className="inline text-[var(--color-ink-muted)]">{item.response_ms != null ? `${item.response_ms} ms` : "—"}</dd></div>
                  <div><dt className="inline">provider </dt><dd className="inline text-[var(--color-ink-muted)]">{item.provider}</dd></div>
                </dl>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
