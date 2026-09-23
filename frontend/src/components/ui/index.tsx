"use client";

import { forwardRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { AlertTriangle, Check, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[#25b3cb] shadow-[0_8px_24px_-12px_rgba(44,198,224,0.9)]",
  secondary:
    "border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] hover:border-[#3a4252] hover:bg-[#161a23]",
  ghost: "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)]",
  danger: "border border-[#4a2630] bg-[#241419] text-[var(--color-error)] hover:border-[var(--color-error)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <span className="mt-0.5 text-[var(--color-ink-subtle)]">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

type Tone = "neutral" | "accent" | "answered" | "unresolved" | "error" | "violet";
const TONES: Record<Tone, string> = {
  neutral: "border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)]",
  accent: "border-[#1b4a55] bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  violet: "border-[#3a3470] bg-[#1a1735] text-[#b8adff]",
  answered: "border-[#1f5241] bg-[#0d2119] text-[var(--color-answered)]",
  unresolved: "border-[#5a4520] bg-[#241c0f] text-[var(--color-unresolved)]",
  error: "border-[#4a2630] bg-[#241419] text-[var(--color-error)]",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone = status === "answered" ? "answered" : status === "unresolved" ? "unresolved" : "error";
  return <Badge tone={tone}>{status}</Badge>;
}

const CONTROL =
  "w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] transition-colors focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50";

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-[var(--color-ink-muted)]">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-[var(--color-ink-subtle)]">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-28 resize-y leading-relaxed", className)} {...rest} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL, "appearance-none", className)} {...rest} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]")}
      >
        <span className={cn("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
      </button>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--color-ink-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-[#4a2630] bg-[#1a0f13] px-3 py-2 text-xs text-[var(--color-error)]">
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-[var(--color-ink-muted)]">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function CodeBlock({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("relative", className)}>
      {label ? <p className="mb-1.5 text-[11px] uppercase tracking-wide text-[var(--color-ink-subtle)]">{label}</p> : null}
      <pre className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[#05060a] p-3.5 pr-12 font-mono text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
        {value}
      </pre>
      <button
        type="button"
        aria-label="Copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked outside a secure context */
          }
        }}
        className="absolute right-2 bottom-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[var(--color-answered)]" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </div>
  );
}
