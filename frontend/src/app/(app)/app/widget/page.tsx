"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/shell";
import { WidgetForm } from "@/components/dashboard/widget-form";
import { Button, Card, EmptyState, ErrorNote, Select, Spinner } from "@/components/ui";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";

function Widget() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const kbs = useAsync(() => api.knowledgeBases(), "kbs");
  const selected = Number(params.get("kb")) || kbs.data?.[0]?.id || 0;
  const widget = useAsync(() => (selected ? api.widget(selected) : Promise.resolve(null)), `widget-${selected}`);

  if (kbs.loading && !kbs.data) return <Spinner />;
  if (kbs.error) return <ErrorNote message={kbs.error} />;
  if (!kbs.data?.length) {
    return (
      <>
        <PageHeader title="Widget" />
        <Card>
          <EmptyState title="No knowledge base yet" hint="A widget answers from one knowledge base. Create one first." action={<Link href="/app/knowledge-bases"><Button variant="primary">Create a knowledge base</Button></Link>} />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Widget"
        description="A chat bubble for your website that answers from one knowledge base."
        action={
          <>
            <label htmlFor="widget-kb" className="sr-only">Knowledge base</label>
            <Select id="widget-kb" value={selected} onChange={(e) => router.replace(`${pathname}?kb=${e.target.value}`)} className="h-9 w-60 py-0">
              {kbs.data.map((kb) => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
            </Select>
          </>
        }
      />
      {widget.loading ? (
        <Spinner />
      ) : widget.error ? (
        <ErrorNote message={widget.error} />
      ) : widget.data ? (
        <WidgetForm key={selected} knowledgeBaseId={selected} initial={widget.data} />
      ) : null}
    </>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Widget />
    </Suspense>
  );
}
