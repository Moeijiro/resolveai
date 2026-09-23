"use client";

import { useSession } from "@/components/dashboard/session";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui";
import { useAsync } from "@/hooks/use-async";
import { api, API_BASE } from "@/lib/api";
import { absoluteTime } from "@/lib/utils";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const user = useSession();
  const config = useAsync(() => api.config(), "config");
  const provider = config.data?.ai_provider;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" />
          <CardBody>
            <dl className="divide-y divide-[var(--color-border)]">
              <Row label="Name">{user.name || "—"}</Row>
              <Row label="Email">{user.email}</Row>
              <Row label="Member since">{absoluteTime(user.created_at)}</Row>
              <Row label="Workspace">{user.is_demo ? <Badge tone="violet">Demo · fictional data</Badge> : <Badge>Personal</Badge>}</Row>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="AI provider" description="Configured on the server with environment variables, not here." />
          <CardBody className="space-y-3">
            <dl className="divide-y divide-[var(--color-border)]">
              <Row label="Provider">{provider ? <Badge tone={provider === "mock" ? "neutral" : "accent"}>{provider}</Badge> : "…"}</Row>
              <Row label="API">{API_BASE}</Row>
            </dl>
            <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {provider === "mock"
                ? "The mock provider answers by quoting the most relevant sentences from the retrieved passages. It needs no key and makes no network calls, so it shows the full pipeline — retrieval, the unresolved gate, citations — without an AI bill. Set AI_PROVIDER=openai and OPENAI_API_KEY to use a real model."
                : "A real model writes the answer from the retrieved passages only. Its output is checked: any citation that does not match a retrieved article is dropped."}
            </p>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="How answers are decided" />
          <CardBody>
            <ol className="grid gap-4 text-xs leading-relaxed text-[var(--color-ink-muted)] sm:grid-cols-3">
              <li><span className="mb-1 block font-mono text-[var(--color-accent)]">1 · retrieve</span>Articles are split into passages at their headings and ranked with BM25 against the question.</li>
              <li><span className="mb-1 block font-mono text-[var(--color-accent)]">2 · gate</span>If the best passages don&apos;t cover at least half of the question&apos;s key terms, the question is marked unresolved and the model is never called.</li>
              <li><span className="mb-1 block font-mono text-[var(--color-accent)]">3 · answer</span>The provider answers from those passages only; the sources shown are the retrieved articles it actually used.</li>
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
