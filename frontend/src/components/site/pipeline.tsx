"use client";

import { useReducedMotion } from "motion/react";
import { BookOpen, MessageSquareText, Search, Sparkles } from "lucide-react";

const STAGES = [
  { icon: MessageSquareText, title: "Question", detail: "“How do I rotate an API key?”" },
  { icon: Search, title: "Knowledge search", detail: "BM25 over article passages" },
  { icon: BookOpen, title: "Relevant articles", detail: "API Keys · Authentication" },
  { icon: Sparkles, title: "AI answer", detail: "Grounded, with sources" },
];

/** The hero diagram. Stages are real elements; the connectors are small SVGs
 *  with an animateMotion packet, dropped entirely under reduced motion. */
export function Pipeline() {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-stretch lg:flex-row lg:items-center">
      {STAGES.map((stage, index) => (
        <div key={stage.title} className="contents">
          <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-canvas)]">
                <stage.icon className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{stage.title}</p>
                <p className="truncate font-mono text-[11px] text-[var(--color-ink-subtle)]">{stage.detail}</p>
              </div>
            </div>
          </div>
          {index < STAGES.length - 1 ? (
            <>
              <div className="flex h-7 items-center justify-center lg:hidden" aria-hidden>
                <svg width="12" height="28" viewBox="0 0 12 28" fill="none">
                  <path d="M6 0 V28" stroke="var(--color-border-strong)" strokeWidth="1.5" />
                  {!reduce ? (
                    <circle r="2.5" fill="var(--color-accent)">
                      <animateMotion dur="1.6s" begin={`${index * 0.4}s`} repeatCount="indefinite" path="M6 0 V28" />
                    </circle>
                  ) : null}
                </svg>
              </div>
              <div className="hidden w-10 shrink-0 items-center justify-center lg:flex" aria-hidden>
                <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
                  <path d="M0 6 H40" stroke="var(--color-border-strong)" strokeWidth="1.5" />
                  {!reduce ? (
                    <circle r="2.5" fill="var(--color-accent)">
                      <animateMotion dur="1.6s" begin={`${index * 0.4}s`} repeatCount="indefinite" path="M0 6 H40" />
                    </circle>
                  ) : null}
                </svg>
              </div>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
