"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, MessageCircle, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, CodeBlock, ErrorNote, Field, Input, Select, Textarea, Toggle } from "@/components/ui";
import { api, API_BASE } from "@/lib/api";
import type { WidgetConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Settings on the left, a faithful static preview of the widget on the right. */
export function WidgetForm({ knowledgeBaseId, initial }: { knowledgeBaseId: number; initial: WidgetConfig }) {
  const [config, setConfig] = useState(initial);
  const [domains, setDomains] = useState(initial.allowed_domains.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => {
    setSaved(false);
    setConfig((current) => ({ ...current, [key]: value }));
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await api.saveWidget(knowledgeBaseId, {
        title: config.title,
        welcome_message: config.welcome_message,
        accent_color: config.accent_color,
        position: config.position,
        enabled: config.enabled,
        allowed_domains: domains.split(/[\s,]+/).filter(Boolean),
      });
      setConfig(next);
      setDomains(next.allowed_domains.join("\n"));
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const noDomains = domains.trim() === "";
  const left = config.position === "bottom-left";

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Appearance and access" description="Changes apply to every page the widget is embedded on." />
        <form onSubmit={save}>
          <CardBody className="space-y-4">
            <Toggle checked={config.enabled} onChange={(value) => update("enabled", value)} label="Widget enabled" description="When off, the script shows nothing and questions are refused." />
            <Field label="Title" htmlFor="w-title">
              <Input id="w-title" required maxLength={60} value={config.title} onChange={(e) => update("title", e.target.value)} />
            </Field>
            <Field label="Welcome message" htmlFor="w-welcome">
              <Textarea id="w-welcome" required maxLength={300} value={config.welcome_message} onChange={(e) => update("welcome_message", e.target.value)} className="min-h-20" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Accent colour" htmlFor="w-accent">
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label="Pick accent colour"
                    value={/^#[0-9a-f]{6}$/i.test(config.accent_color) ? config.accent_color : "#2cc6e0"}
                    onChange={(e) => update("accent_color", e.target.value)}
                    className="h-[38px] w-11 shrink-0 cursor-pointer rounded-lg border border-[var(--color-border-strong)] bg-transparent p-1"
                  />
                  <Input id="w-accent" value={config.accent_color} onChange={(e) => update("accent_color", e.target.value)} className="font-mono" maxLength={7} />
                </div>
              </Field>
              <Field label="Position" htmlFor="w-position">
                <Select id="w-position" value={config.position} onChange={(e) => update("position", e.target.value as WidgetConfig["position"])}>
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                </Select>
              </Field>
            </div>
            <Field
              label="Allowed domains"
              htmlFor="w-domains"
              hint={<>One per line. <code className="font-mono">*.example.com</code> covers subdomains. Checked on the server for every question.</>}
            >
              <Textarea id="w-domains" value={domains} onChange={(e) => { setSaved(false); setDomains(e.target.value); }} placeholder={"example.com\n*.example.com"} className="min-h-24 font-mono text-[13px]" />
            </Field>
            {noDomains ? (
              <p className="flex gap-2 rounded-lg border border-[#5a4520] bg-[#241c0f] px-3 py-2 text-xs text-[var(--color-unresolved)]">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                No domains listed: any website can embed this widget and spend your answers. Fine for testing — add your domains before going live.
              </p>
            ) : null}
            {error ? <ErrorNote message={error} /> : null}
            <div className="flex items-center justify-end gap-3">
              {saved ? <span className="text-xs text-[var(--color-answered)]" role="status">Saved</span> : null}
              <Button type="submit" variant="primary" loading={busy}>Save widget</Button>
            </div>
          </CardBody>
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Preview"
            description="Static preview of your settings."
            action={
              <a href={`${API_BASE}/demo-site?project=${config.public_id}`} target="_blank" rel="noreferrer">
                <Button size="sm">Try it live<ExternalLink className="h-3.5 w-3.5" aria-hidden /></Button>
              </a>
            }
          />
          <div className="relative h-[380px] overflow-hidden rounded-b-xl bg-[#eef0f4]">
            <div className="space-y-2 p-5" aria-hidden>
              <div className="h-3 w-1/2 rounded bg-[#dde1e8]" />
              <div className="h-3 w-2/3 rounded bg-[#dde1e8]" />
              <div className="h-3 w-2/5 rounded bg-[#dde1e8]" />
            </div>
            <div className={cn("absolute bottom-16 w-[270px] overflow-hidden rounded-2xl border border-[#1f2430] bg-[#0b0d12] text-[#e8ebf1] shadow-2xl", left ? "left-4" : "right-4", !config.enabled && "opacity-40")}>
              <div className="flex items-center gap-2 border-b border-[#1f2430] px-3.5 py-3" style={{ background: `linear-gradient(180deg, ${config.accent_color}33, transparent)` }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.accent_color }} />
                <span className="flex-1 truncate text-[13px] font-semibold">{config.title || "Support"}</span>
                <X className="h-3.5 w-3.5 text-[#8a92a6]" aria-hidden />
              </div>
              <div className="p-3.5">
                <p className="w-[90%] rounded-xl rounded-bl border border-[#1f2430] bg-[#151922] px-3 py-2 text-[12px] leading-relaxed">{config.welcome_message}</p>
              </div>
              <div className="border-t border-[#1f2430] px-3 py-2.5 text-[11px] text-[#5d6578]">Ask a question…</div>
              <p className="border-t border-[#1f2430] px-3 py-1.5 text-[9.5px] text-[#5d6578]">AI answers from the docs can be wrong.</p>
            </div>
            <span className={cn("absolute bottom-3 flex h-11 w-11 items-center justify-center rounded-full shadow-lg", left ? "left-4" : "right-4")} style={{ backgroundColor: config.accent_color }}>
              <MessageCircle className="h-5 w-5 text-[#07121a]" aria-hidden />
            </span>
          </div>
        </Card>
        <Card>
          <CardHeader title="Embed code" description="Paste before </body>. The public id is safe to expose — it can only ask questions." />
          <CardBody><CodeBlock value={config.embed_code} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
