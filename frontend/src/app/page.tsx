import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Footer, MotionProvider, Navbar, Reveal, Section, SectionHeading } from "@/components/site/chrome";
import { Pipeline } from "@/components/site/pipeline";
import { ProductDemo } from "@/components/site/product-demo";
import { Cta, DeveloperApi, Faq, HowItWorks, KnowledgeBaseShowcase, Pricing, UseCases, WidgetShowcase } from "@/components/site/sections";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <MotionProvider>
      <Navbar />
      <main id="main">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] glow" aria-hidden />
          <div className="relative mx-auto grid grid-cols-1 w-full max-w-6xl items-center gap-12 px-5 pt-14 pb-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-3 py-1 text-xs text-[var(--color-ink-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-answered)]" aria-hidden />
                Runs free with the mock provider · bring your own model
              </p>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                <span className="text-gradient">Turn your documentation into </span>
                <span className="text-accent-gradient">instant answers.</span>
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-[var(--color-ink-muted)] sm:text-lg">
                Give customers fast answers from your own knowledge base using a support widget
                and developer API — every answer grounded in your articles, with its sources shown.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto">
                    Get started
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                <Link href="/login?demo=1" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto">View the demo</Button>
                </Link>
              </div>
            </div>
            <Reveal>
              <ProductDemo />
            </Reveal>
          </div>
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4 backdrop-blur-sm sm:p-5">
              <Pipeline />
            </div>
          </div>
        </div>

        <Section id="how-it-works">
          <SectionHeading eyebrow="How it works" title="Retrieval first, then an answer" description="The model never sees your whole knowledge base — only the passages that match the question. If none match well enough, it isn't asked at all." />
          <div className="mt-12"><HowItWorks /></div>
        </Section>

        <Section id="knowledge-base">
          <SectionHeading eyebrow="Knowledge base" title="Documentation you already have" description="Write, upload, categorise and search articles. The retrieval index follows every edit." align="left" />
          <div className="mt-10"><KnowledgeBaseShowcase /></div>
        </Section>

        <Section id="widget">
          <SectionHeading eyebrow="Support widget" title="One script tag on your site" description="A chat bubble that answers from your docs and shows where each answer came from." align="left" />
          <div className="mt-10"><WidgetShowcase /></div>
        </Section>

        <Section id="developers">
          <SectionHeading eyebrow="Developer API" title="Ask from your own backend" description="POST /v1/ask with a server-side API key. Keys are hashed at rest and shown once." />
          <div className="mt-10"><DeveloperApi /></div>
        </Section>

        <Section id="use-cases">
          <SectionHeading eyebrow="Use cases" title="Anywhere questions repeat" />
          <div className="mt-10"><UseCases /></div>
        </Section>

        <Section id="pricing">
          <SectionHeading eyebrow="Pricing" title="Plans, illustratively" description="How this would be packaged as a product. Nothing is charged." />
          <div className="mt-10"><Pricing /></div>
        </Section>

        <Section id="faq">
          <SectionHeading eyebrow="FAQ" title="How the AI part actually works" />
          <div className="mt-8"><Faq /></div>
        </Section>

        <Section className="border-t-0"><Cta /></Section>
      </main>
      <Footer />
    </MotionProvider>
  );
}
