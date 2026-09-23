"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, FileText, KeyRound, LayoutDashboard, LogOut, Menu, MessageSquare, MessageSquareCode, Settings, X } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { SessionContext } from "@/components/dashboard/session";
import { Badge, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/knowledge-bases", label: "Knowledge Bases", icon: BookOpen },
  { href: "/app/articles", label: "Articles", icon: FileText },
  { href: "/app/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/app/widget", label: "Widget", icon: MessageSquareCode },
  { href: "/app/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
      });
  }, [router]);

  async function logout() {
    await api.logout().catch(() => undefined);
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading workspace" />
      </div>
    );
  }

  const nav = (
    <nav aria-label="Dashboard" className="flex h-full flex-col">
      <Link href="/" className="flex h-16 items-center gap-2.5 px-5" aria-label="ResolveAI home">
        <Logo />
        <span className="text-sm font-semibold tracking-tight">ResolveAI</span>
      </Link>
      <ul className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-[var(--color-surface-raised)] text-[var(--color-ink)]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
                )}
              >
                <item.icon className={cn("h-4 w-4", active ? "text-[var(--color-accent)]" : "")} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-[var(--color-border)] p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-xs font-medium uppercase">
            {(user.name || user.email).slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user.name || user.email}</p>
            <p className="truncate text-[11px] text-[var(--color-ink-subtle)]">{user.email}</p>
          </div>
          <button type="button" onClick={logout} aria-label="Sign out" className="rounded-md p-1.5 text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]">
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <SessionContext.Provider value={user}>
      <div className="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:block">{nav}</aside>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <aside className="relative h-full w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)]">{nav}</aside>
          </div>
        ) : null}
        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/85 px-4 backdrop-blur-md sm:px-6">
            <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 text-[var(--color-ink-muted)] lg:hidden">
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
            <p className="text-sm font-medium lg:hidden">ResolveAI</p>
            <div className="ml-auto flex items-center gap-2">
              {user.is_demo ? <Badge tone="violet">Demo workspace · fictional data</Badge> : null}
            </div>
          </header>
          <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
