"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Building2, Check, Code2, FileText, GraduationCap, LifeBuoy, ShoppingBag, Upload } from "lucide-react";
import { Badge, Button, CodeBlock } from "@/components/ui";
import { Reveal } from "@/components/site/chrome";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";

export function HowItWorks() {
  const steps = [
    { n: "01", title: "Add your documentation", body: "Write articles in the dashboard or upload Markdown and text files. Each article is split into passages when it is saved." },
    { n: "02", title: "Questions find the right passages", body: "BM25 retrieval ranks passages by the words the visitor used. If nothing covers the question well enough, it is marked unresolved instead of guessed at." },
    { n: "03", title: "Answers cite their sources", body: "The model — or the free mock provider — answers only from those passages, and the answer lists the articles it actually used." },
  ];
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {steps.map((step, index) => (
        <Reveal key={step.n} delay={index * 0.06} className="relative pl-12">
          <span className="absolute top-0 left-0 font-mono text-sm text-[var(--color-accent)]">{step.n}</span>
          <h3 className="text-sm font-medium">{step.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">{step.body}</p>
        </Reveal>
      ))}
    </div>
  );
}

export function KnowledgeBaseShowcase() {
  const articles = [
    { title: "Getting Started", category: "Guides", updated: "2 hours ago" },
    { title: "API Keys", category: "Developers", updated: "yesterday" },
    { title: "Webhooks", category: "Developers", updated: "3 days ago" },
    { title: "Billing FAQ", category: "Billing", updated: "last week" },
  ];
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div>
        <ul className="space-y-3 text-sm text-[var(--color-ink-muted)]">
          {[
            "Write articles in Markdown, or upload .md and .txt files",
            "Categories and full-text search across every knowledge base",
            "Edits are searchable on the very next question — no re-indexing job",
            "Unresolved questions show you exactly which article to write next",
          ].map((line) => (
            <li key={line} className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-answered)]" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </div>
      <Reveal>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Product Documentation</p>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">42 articles · updated 2 hours ago</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-lg border border-[var(--color-border-strong)] px-2.5 py-1 text-[11px]"><Upload className="mr-1 inline h-3 w-3" aria-hidden />Upload</span>
              <span className="rounded-lg bg-[var(--color-accent)] px-2.5 py-1 text-[11px] text-[var(--color-accent-ink)]">Add article</span>
            </div>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {articles.map((article) => (
              <li key={article.title} className="flex items-center gap-3 px-5 py-3">
                <FileText className="h-4 w-4 text-[var(--color-ink-subtle)]" aria-hidden />
                <span className="flex-1 text-sm">{article.title}</span>
                <Badge>{article.category}</Badge>
                <span className="hidden text-[11px] text-[var(--color-ink-subtle)] sm:inline">{article.updated}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-[var(--color-border)] px-5 py-2.5 text-[10px] text-[var(--color-ink-subtle)]">Illustration of the dashboard — sample content</p>
        </div>
      </Reveal>
    </div>
  );
}

export function WidgetShowcase() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <Reveal>
        <div className="relative h-[420px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#f5f6f9]">
          <div className="border-b border-[#e3e6ee] bg-white px-4 py-3 text-[13px] font-semibold text-[#1b2230]">yourcompany.com/help</div>
          <div className="space-y-2 p-5">
            <div className="h-3 w-2/3 rounded bg-[#e3e6ee]" />
            <div className="h-3 w-1/2 rounded bg-[#e3e6ee]" />
            <div className="h-3 w-3/5 rounded bg-[#e3e6ee]" />
          </div>
          <div className="absolute right-4 bottom-4 w-[280px] overflow-hidden rounded-2xl border border-[#1f2430] bg-[#0b0d12] text-[#e8ebf1] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[#1f2430] bg-gradient-to-b from-[#2cc6e0]/20 to-transparent px-3.5 py-3">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
              <span className="text-[13px] font-semibold">Support</span>
            </div>
            <div className="space-y-2.5 p-3.5 text-[12.5px] leading-relaxed">
              <div className="ml-auto w-fit rounded-xl rounded-br bg-[var(--color-accent)] px-3 py-2 text-[#07121a]">Why is my webhook returning 401?</div>
              <div className="w-[88%] rounded-xl rounded-bl border border-[#1f2430] bg-[#151922] px-3 py-2">
                Your endpoint is usually rejecting the signature. Verify the raw body exactly as received, using that endpoint&apos;s signing secret.
                <div className="mt-2 border-t border-[#232937] pt-1.5 text-[10.5px] text-[#8a92a6]">Sources <span className="ml-1 rounded-full border border-[#2a3141] px-1.5">Webhooks</span></div>
              </div>
            </div>
            <div className="border-t border-[#1f2430] p-2.5 text-[11px] text-[#5d6578]">Ask a question…</div>
          </div>
        </div>
      </Reveal>
      <div className="space-y-5">
        <ul className="space-y-3 text-sm text-[var(--color-ink-muted)]">
          {[
            "One script tag, no dependencies, isolated in a Shadow DOM",
            "Title, welcome message, accent colour and position are yours",
            "Only a public id in the page — never an API key",
            "Allowed domains are enforced on the server, not just by CORS",
            "Full-screen on phones, keyboard-closable, reduced-motion aware",
          ].map((line) => (
            <li key={line} className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-answered)]" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
        <CodeBlock value={`<script src="${API_BASE}/widget.js"\n        data-project="kb_xxxxxxxx" async></script>`} />
        <a href={`${API_BASE}/demo-site`} target="_blank" rel="noreferrer">
          <Button size="sm">Open the live demo site</Button>
        </a>
      </div>
    </div>
  );
}

const SNIPPETS: Record<string, string> = {
  curl: `curl -X POST ${API_BASE}/v1/ask \\
  -H "X-API-Key: rsv_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"knowledge_base_id": 1, "question": "How do I reset my password?"}'`,
  python: `import httpx

response = httpx.post(
    "${API_BASE}/v1/ask",
    headers={"X-API-Key": RESOLVEAI_KEY},
    json={"knowledge_base_id": 1, "question": "How do I reset my password?"},
)
answer = response.json()
print(answer["answer"], [s["title"] for s in answer["sources"]])`,
  javascript: `const response = await fetch("${API_BASE}/v1/ask", {
  method: "POST",
  headers: { "X-API-Key": process.env.RESOLVEAI_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ knowledge_base_id: 1, question: "How do I reset my password?" }),
});
const { answer, sources, status } = await response.json();`,
};

export function DeveloperApi() {
  const [tab, setTab] = useState("curl");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div role="tablist" aria-label="Language" className="mb-3 flex gap-1">
          {Object.keys(SNIPPETS).map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={cn("rounded-md px-2.5 py-1 text-xs", tab === name ? "bg-[var(--color-surface-raised)] font-medium" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]")}
            >
              {name}
            </button>
          ))}
        </div>
        <CodeBlock value={SNIPPETS[tab]} />
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <p className="mb-3 flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <Code2 className="h-3.5 w-3.5" aria-hidden />
          Response
        </p>
        <CodeBlock
          value={`{
  "answer": "To reset your password, open the sign-in page and click Forgot password…",
  "sources": [{ "id": 12, "title": "Authentication", "score": 4.61 }],
  "status": "answered",
  "confidence": 1.0,
  "response_ms": 3,
  "provider": "mock"
}`}
        />
        <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">
          <code className="font-mono">status</code> is <code className="font-mono">answered</code>,{" "}
          <code className="font-mono">unresolved</code> or <code className="font-mono">error</code>.
          Sources are only articles that were retrieved <em>and</em> used.
        </p>
      </div>
    </div>
  );
}

export function UseCases() {
  const cases = [
    { icon: LifeBuoy, title: "SaaS help centres", body: "Deflect the repetitive how-do-I questions and see which ones your docs miss." },
    { icon: ShoppingBag, title: "E-commerce", body: "Shipping, returns and sizing answers from the policy pages you already wrote." },
    { icon: Building2, title: "Internal knowledge", body: "Point it at runbooks and onboarding docs for an answer bot inside your team." },
    { icon: GraduationCap, title: "Course platforms", body: "Students ask about schedules and requirements; answers cite the syllabus." },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cases.map((item, index) => (
        <Reveal key={item.title} delay={index * 0.05}>
          <div className="h-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-border-strong)]">
            <item.icon className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />
            <h3 className="mt-4 text-sm font-medium">{item.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">{item.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function Pricing() {
  const plans = [
    { name: "Starter", price: "$0", note: "forever", features: ["1 knowledge base", "50 articles", "Mock provider or your own OpenAI key", "Embeddable widget"], cta: "Start free", highlight: false },
    { name: "Team", price: "$29", note: "per month", features: ["5 knowledge bases", "1,000 articles", "Allowed-domain restrictions", "Developer API keys", "Unresolved-question reports"], cta: "Choose Team", highlight: true },
    { name: "Business", price: "$99", note: "per month", features: ["Unlimited knowledge bases", "Priority support", "Custom widget branding", "Longer conversation history"], cta: "Choose Business", highlight: false },
  ];
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className={cn("relative flex flex-col rounded-2xl border p-6", plan.highlight ? "border-[#1b4a55] bg-[var(--color-surface-raised)] shadow-[0_24px_70px_-50px_rgba(44,198,224,1)]" : "border-[var(--color-border)] bg-[var(--color-surface)]")}>
            {plan.highlight ? <span className="absolute -top-2.5 left-6"><Badge tone="accent">Most popular</Badge></span> : null}
            <h3 className="text-sm font-semibold">{plan.name}</h3>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl tracking-tight">{plan.price}</span>
              <span className="text-xs text-[var(--color-ink-subtle)]">{plan.note}</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-xs text-[var(--color-ink-muted)]">
                  <Check className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--color-answered)]" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/register" className="mt-6"><Button variant={plan.highlight ? "primary" : "secondary"} className="w-full">{plan.cta}</Button></Link>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-[var(--color-ink-subtle)]">
        Illustrative pricing. ResolveAI is a portfolio project: there is no billing, nothing is
        charged, and AI costs — if you configure a real provider — are between you and that provider.
      </p>
    </div>
  );
}

export function Faq() {
  const items = [
    { q: "Does ResolveAI train a model on my documentation?", a: "No. Nothing is trained or fine-tuned. Each question retrieves the most relevant passages from your articles and sends only those to the model as context, alongside instructions to answer from them alone." },
    { q: "What happens when the documentation doesn't cover a question?", a: "If retrieval doesn't find passages that cover the question well enough, the model isn't called at all. The visitor is told plainly that the docs don't cover it, and the question appears in your Unresolved list — which is effectively a list of articles to write." },
    { q: "Can it still be wrong?", a: "Yes. Grounding in your documentation and verified citations reduce invented answers, but a language model can misread or over-generalise a passage. Answers show their sources so a reader can check, and the widget says that AI answers can be wrong." },
    { q: "Do I need an OpenAI key?", a: "No. The default mock provider runs with no key and no network: it builds answers from sentences in your own articles. Set AI_PROVIDER=openai and a key to use a real model — any OpenAI-compatible endpoint works." },
    { q: "What does the widget store about visitors?", a: "The question, the answer, the cited sources, the confidence and the timing. No IP address, no user agent, no cookie." },
  ];
  return (
    <div className="mx-auto max-w-3xl divide-y divide-[var(--color-border)]">
      {items.map((item) => (
        <details key={item.q} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
            {item.q}
            <span className="text-[var(--color-ink-subtle)] transition-transform group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function Cta() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center sm:px-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 glow" aria-hidden />
      <div className="relative">
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Your docs already have the answers.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--color-ink-muted)]">Put them in front of the people asking — with the sources attached.</p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="w-full sm:w-auto"><Button variant="primary" size="lg" className="w-full sm:w-auto">Create a knowledge base</Button></Link>
          <Link href="/login?demo=1" className="w-full sm:w-auto"><Button size="lg" className="w-full sm:w-auto"><BookOpen className="h-4 w-4" aria-hidden />Explore the demo</Button></Link>
        </div>
      </div>
    </div>
  );
}
