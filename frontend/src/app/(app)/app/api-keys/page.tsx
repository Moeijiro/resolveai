"use client";

import { useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge, Button, Card, CardBody, CardHeader, CodeBlock, EmptyState, ErrorNote, Input, Spinner } from "@/components/ui";
import { useAsync } from "@/hooks/use-async";
import { api, API_BASE } from "@/lib/api";
import type { CreatedApiKey } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export default function ApiKeysPage() {
  const keys = useAsync(() => api.keys(), "keys");
  const kbs = useAsync(() => api.knowledgeBases(), "kbs");
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const key = await api.createKey(name);
      setCreated(key);
      setName("");
      keys.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: number) {
    if (!window.confirm("Revoke this key? Requests using it will fail immediately.")) return;
    await api.revokeKey(id).catch((err: Error) => setError(err.message));
    keys.reload();
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this key permanently?")) return;
    await api.deleteKey(id).catch((err: Error) => setError(err.message));
    keys.reload();
  }

  const kbId = kbs.data?.[0]?.id ?? 1;
  return (
    <>
      <PageHeader title="API Keys" description="Server-side keys for POST /v1/ask. Never put one in a web page — the widget uses a public id instead." />

      {created ? (
        <Card className="mb-4 border-[#1b4a55]">
          <CardHeader title="Copy your new key now" description={created.warning} icon={<KeyRound className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />} action={<Button size="sm" variant="ghost" onClick={() => setCreated(null)}>Done</Button>} />
          <CardBody><CodeBlock value={created.key} /></CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Keys" description="Stored as SHA-256 digests; only the prefix is kept readable." />
          <form onSubmit={create} className="flex gap-2 border-b border-[var(--color-border)] px-5 py-3">
            <div className="flex-1">
              <label htmlFor="key-name" className="sr-only">Key name</label>
              <Input id="key-name" required maxLength={64} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Production backend" />
            </div>
            <Button type="submit" variant="primary" loading={busy}>{busy ? null : <Plus className="h-4 w-4" aria-hidden />}Create</Button>
          </form>
          {error ? <div className="px-5 pt-3"><ErrorNote message={error} /></div> : null}
          {keys.loading && !keys.data ? (
            <Spinner />
          ) : keys.data?.length ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {keys.data.map((key) => {
                const revoked = Boolean(key.revoked_at);
                return (
                  <li key={key.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm">
                        {key.name}
                        <Badge tone={revoked ? "error" : "answered"}>{revoked ? "revoked" : "active"}</Badge>
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--color-ink-subtle)]">
                        {key.prefix}… · created {relativeTime(key.created_at)} · last used {key.last_used_at ? relativeTime(key.last_used_at) : "never"}
                      </p>
                    </div>
                    {revoked ? (
                      <Button size="sm" variant="ghost" onClick={() => remove(key.id)}>Delete</Button>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => revoke(key.id)}>Revoke</Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No API keys" hint="Create one to call /v1/ask from your own backend." />
          )}
        </Card>

        <Card className="self-start">
          <CardHeader title="Quick start" description="Ask a knowledge base from any backend." />
          <CardBody className="space-y-3">
            <CodeBlock
              value={`curl -X POST ${API_BASE}/v1/ask \\
  -H "X-API-Key: $RESOLVEAI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"knowledge_base_id": ${kbId}, "question": "How do I reset my password?"}'`}
            />
            <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              Returns <code className="font-mono">answer</code>, <code className="font-mono">sources</code>, <code className="font-mono">status</code>,{" "}
              <code className="font-mono">confidence</code> and <code className="font-mono">response_ms</code>. Full reference at{" "}
              <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] hover:underline">/docs</a>.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
