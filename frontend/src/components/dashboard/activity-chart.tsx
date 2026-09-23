import type { Overview } from "@/lib/types";

const SERIES = [
  { key: "answered", label: "Answered", color: "var(--color-answered)" },
  { key: "unresolved", label: "Unresolved", color: "var(--color-unresolved)" },
  { key: "error", label: "Error", color: "var(--color-error)" },
] as const;

/** Stacked daily bars for the last 14 days. Plain divs: no chart library. */
export function ActivityChart({ series }: { series: Overview["series"] }) {
  const max = Math.max(1, ...series.map((day) => day.answered + day.unresolved + day.error));
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Questions per day over the last 14 days">
        {series.map((day) => {
          const total = day.answered + day.unresolved + day.error;
          return (
            <div key={day.day} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="flex flex-col-reverse overflow-hidden rounded-sm" style={{ height: `${(total / max) * 100}%` }}>
                {SERIES.map((s) => (day[s.key] ? <span key={s.key} style={{ flexGrow: day[s.key], backgroundColor: s.color }} /> : null))}
              </div>
              {total === 0 ? <span className="h-px w-full bg-[var(--color-border-strong)]" /> : null}
              <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-2 py-0.5 font-mono text-[10px] whitespace-nowrap group-hover:block">
                {day.day.slice(5)} · {total}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-[var(--color-ink-subtle)]">
        <span>{series[0]?.day.slice(5)}</span>
        <span>today</span>
      </div>
      <div className="mt-3 flex gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
