"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#widget", label: "Widget" },
  { href: "#developers", label: "Developers" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors",
        scrolled ? "border-[var(--color-border)] bg-[var(--color-canvas)]/85 backdrop-blur-md" : "border-transparent",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="ResolveAI home">
          <Logo />
          <span className="text-sm font-semibold tracking-tight">ResolveAI</span>
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href="/register"><Button variant="primary" size="sm">Get started</Button></Link>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg p-2 text-[var(--color-ink-muted)] md:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </nav>
      {open ? (
        <div id="mobile-nav" className="border-t border-[var(--color-border)] bg-[var(--color-canvas)] px-5 py-4 md:hidden">
          <ul className="space-y-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/login"><Button className="w-full">Sign in</Button></Link>
            <Link href="/register"><Button variant="primary" className="w-full">Get started</Button></Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-sm font-semibold tracking-tight">ResolveAI</span>
          </div>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--color-ink-muted)]">
            Answers from your own documentation, with the sources they came from. A portfolio
            project — not a commercial service.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--color-ink-muted)]">
          <a href="#how-it-works" className="hover:text-[var(--color-ink)]">How it works</a>
          <a href="#developers" className="hover:text-[var(--color-ink)]">API</a>
          <a href="#pricing" className="hover:text-[var(--color-ink)]">Pricing</a>
          <Link href="/login" className="hover:text-[var(--color-ink)]">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Section({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-16 border-t border-[var(--color-border)] py-20 sm:py-24", className)}>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, description, align = "center" }: { eyebrow?: string; title: string; description?: string; align?: "center" | "left" }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-[var(--color-accent)] uppercase">{eyebrow}</p> : null}
      <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {description ? <p className="mt-3 text-pretty text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-base">{description}</p> : null}
    </div>
  );
}
