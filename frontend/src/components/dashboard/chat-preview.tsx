"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Send } from "lucide-react";
import { Badge, Button, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { Answer } from "@/lib/types";

interface Turn {
  id: number;
  question: string;
  answer?: Answer;
  error?: string;
}

/**
 * Ask the knowledge base from inside the dashboard. It runs the same pipeline
 * as the widget and the API, and records the result on the "preview" channel.
 */
export function ChatPreview({ knowledgeBaseId, suggestions = [] }: { knowledgeBaseId: number; suggestions?: string[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2 || busy) return;
    const id = Date.now();
    setTurns((current) => [...current, { id, question: trimmed }]);
    setQuestion("");
    setBusy(true);
    try {
      const answer = await api.chat(knowledgeBaseId, trimmed);
      setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, answer } : turn)));
    } catch (err) {
      setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, error: (err as Error).message } : turn)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[520px] flex-col">
      <div ref={logRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {turns.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-[var(--color-ink-muted)]">Ask something your articles should answer.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((text) => (
                <button key={text} type="button" onClick={() => ask(text)} className="rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-xs text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]">
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2">
            <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-[var(--color-accent)] px-3.5 py-2 text-sm text-[var(--color-accent-ink)]">
              {turn.question}
            </div>
            {turn.answer ? (
              <div className="max-w-[92%] rounded-xl rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3.5 py-2.5">
                <p className="text-sm leading-relaxed whitespace-pre-line">{turn.answer.answer}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] pt-2">
                  <StatusBadge status={turn.answer.status} />
                  {turn.answer.sources.map((source) => (
                    <Badge key={source.id}>
                      <FileText className="h-3 w-3" aria-hidden />
                      {source.title}
                    </Badge>
                  ))}
                  <span className="ml-auto font-mono text-[10.5px] text-[var(--color-ink-subtle)]">
                    {Math.round(turn.answer.confidence * 100)}% coverage · {turn.answer.response_ms} ms · {turn.answer.provider}
                  </span>
                </div>
              </div>
            ) : turn.error ? (
              <p className="text-xs text-[var(--color-error)]">{turn.error}</p>
            ) : (
              <div className="flex w-fit gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3.5 py-3" aria-label="Answering">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-ink-subtle)]" style={{ animationDelay: `${dot * 150}ms` }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
        className="flex gap-2 border-t border-[var(--color-border)] p-3"
      >
        <label htmlFor={`ask-${knowledgeBaseId}`} className="sr-only">Question</label>
        <input
          id={`ask-${knowledgeBaseId}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask ResolveAI…"
          maxLength={500}
          className="flex-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 text-sm placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-accent)] focus:outline-none"
        />
        <Button type="submit" variant="primary" loading={busy} aria-label="Send">
          {busy ? null : <Send className="h-4 w-4" aria-hidden />}
        </Button>
      </form>
    </div>
  );
}
