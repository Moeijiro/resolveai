"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Check, Loader2, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = [
  "Searching knowledge base…",
  "2 relevant articles found",
  "Generating answer…",
];

/**
 * A scripted walk-through for visitors who have not signed up yet. It is
 * labelled as a demo: the same question against the real pipeline is one
 * click away in the dashboard.
 */
export function ProductDemo() {
  const [step, setStep] = useState<Step>(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const play = () => {
    timers.current.forEach(clearTimeout);
    setStep(1);
    timers.current = [
      setTimeout(() => setStep(2), 800),
      setTimeout(() => setStep(3), 1500),
      setTimeout(() => setStep(4), 2400),
    ];
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_40px_120px_-60px_rgba(44,198,224,0.6)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
        <p className="text-xs text-[var(--color-ink-muted)]">Ask ResolveAI…</p>
        <span className="rounded-md border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-ink-subtle)]">
          scripted demo
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[var(--color-accent)] px-4 py-2.5 text-sm text-[var(--color-accent-ink)]">
            How do I create an API key?
          </div>
        </div>

        <ol className="space-y-2" aria-live="polite">
          {STEPS.map((label, index) => {
            const reached = step > index;
            const active = step === index + 1;
            return (
              <li key={label} className={cn("flex items-center gap-2 text-xs transition-opacity", reached || active ? "opacity-100" : "opacity-30")}>
                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", reached && !active ? "border-[#1f5241] bg-[#0d2119] text-[var(--color-answered)]" : "border-[var(--color-border-strong)]")}>
                  {active ? <Loader2 className="h-2.5 w-2.5 animate-spin text-[var(--color-accent)]" aria-hidden /> : reached ? <Check className="h-2.5 w-2.5" aria-hidden /> : null}
                </span>
                <span className={active ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"}>{label}</span>
              </li>
            );
          })}
        </ol>

        {step === 4 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[90%] rounded-2xl rounded-bl-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm leading-relaxed">
            Go to <strong>Settings → API keys</strong> and click <strong>Create key</strong>. Give it a
            name that says where it will be used. The full key is shown only once, so copy it into
            your secret manager straight away.
            <div className="mt-3 border-t border-[var(--color-border)] pt-2.5">
              <p className="mb-1.5 text-[11px] text-[var(--color-ink-subtle)]">Sources</p>
              <div className="flex flex-wrap gap-1.5">
                {["API Keys", "Getting Started"].map((title) => (
                  <span key={title} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] px-2 py-0.5 text-[11px] text-[var(--color-ink-muted)]">
                    <BookOpen className="h-3 w-3" aria-hidden />
                    {title}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}

        <div className="flex items-center gap-3 pt-1">
          <Button variant={step === 0 ? "primary" : "secondary"} size="sm" onClick={play} disabled={step > 0 && step < 4}>
            {step === 4 ? <RotateCcw className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
            {step === 4 ? "Replay" : "Ask"}
          </Button>
          <span className="text-[11px] text-[var(--color-ink-subtle)]">
            Mirrors the real pipeline — try the live widget on the demo site
          </span>
        </div>
      </div>
    </div>
  );
}
