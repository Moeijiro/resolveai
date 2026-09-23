import { cn } from "@/lib/utils";

/** The ResolveAI mark: a speech bubble resolving into a check. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-violet)]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#04161b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 20 12z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    </span>
  );
}
