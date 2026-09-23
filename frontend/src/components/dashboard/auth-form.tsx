"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/app/logo";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";

const DEMO = { email: "demo@resolveai.dev", password: "resolveai-demo-1234" };

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const prefillDemo = mode === "login" && params.get("demo") === "1";

  const [email, setEmail] = useState(prefillDemo ? DEMO.email : "");
  const [password, setPassword] = useState(prefillDemo ? DEMO.password : "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await api.login(email, password);
      else await api.register(email, password, name);
      router.push("/app");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const isLogin = mode === "login";
  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 glow" aria-hidden />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5" aria-label="ResolveAI home">
          <Logo />
          <span className="text-sm font-semibold tracking-tight">ResolveAI</span>
        </Link>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7">
          <h1 className="text-lg font-semibold tracking-tight">{isLogin ? "Sign in" : "Create your account"}</h1>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            {isLogin ? "Welcome back. Your knowledge bases are waiting." : "Free, no card. The mock AI provider works without any key."}
          </p>
          {prefillDemo ? (
            <p className="mt-4 rounded-lg border border-[#1b4a55] bg-[var(--color-accent-soft)] px-3 py-2 text-xs text-[var(--color-accent)]">
              Demo credentials are filled in. The demo workspace holds a fictional product&apos;s docs.
            </p>
          ) : null}
          <form onSubmit={submit} className="mt-5 space-y-4">
            {!isLogin ? (
              <Field label="Name" htmlFor="name">
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </Field>
            ) : null}
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="password" hint={isLogin ? undefined : "At least 10 characters."}>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={isLogin ? undefined : 10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error ? <ErrorNote message={error} /> : null}
            <Button type="submit" variant="primary" className="w-full" loading={busy}>
              {isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>
        <p className="mt-5 text-center text-xs text-[var(--color-ink-muted)]">
          {isLogin ? (
            <>No account? <Link href="/register" className="text-[var(--color-accent)] hover:underline">Create one</Link> · <Link href="/login?demo=1" className="text-[var(--color-accent)] hover:underline">Use the demo</Link></>
          ) : (
            <>Already registered? <Link href="/login" className="text-[var(--color-accent)] hover:underline">Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
