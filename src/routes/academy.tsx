import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ACADEMY } from "@/lib/academy/curriculum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/academy")({
  component: AcademyPage,
  head: () => ({
    meta: [
      { title: "Operations Academy — Gharpayy Floor Handbook" },
      { name: "description", content: "Page by page, feature by feature, button by button: why it exists, how to execute, what not to do, and what can go wrong." },
      { property: "og:title", content: "Operations Academy — Gharpayy Floor Handbook" },
      { property: "og:description", content: "The complete operating manual for the leads, review and labelling floor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AcademyPage() {
  const [activeId, setActiveId] = useState(ACADEMY[0]!.id);
  const active = ACADEMY.find((m) => m.id === activeId)!;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <Badge variant="secondary">Owner learning</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Operations Academy</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Every screen, every button — what it is, why it exists, exactly how to run it, what not to do,
          what can go wrong, and the if/else you follow when reality is messy. No one-word instructions.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {ACADEMY.map((m) => (
          <Button
            key={m.id}
            size="sm"
            variant={m.id === activeId ? "default" : "outline"}
            onClick={() => setActiveId(m.id)}
          >
            {m.title}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {active.title}
            <Badge variant="outline" className="font-mono text-xs">{active.route}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{active.oneLine}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="Why this screen exists">
            <p className="text-sm leading-relaxed text-muted-foreground">{active.purpose}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Who lives here: {active.whoUses.join(" · ")}
            </p>
          </Section>

          <Section title="Before you open it">
            <List items={active.before} />
          </Section>

          <Section title="The ritual — a normal working session">
            <ol className="space-y-2">
              {active.ritual.map((r, i) => (
                <li key={r.step} className="rounded-md border p-3 text-sm">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}</span>
                  <span className="font-medium">{r.step}</span>
                  <p className="mt-1 text-muted-foreground">{r.detail}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Button by button">
            <Accordion type="multiple" className="w-full">
              {active.buttons.map((b) => (
                <AccordionItem key={b.name} value={b.name}>
                  <AccordionTrigger className="text-left">
                    <span>
                      <span className="font-medium">{b.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{b.where}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Block label="What it does">{b.what}</Block>
                    <Block label="Why it exists">{b.why}</Block>
                    <div>
                      <Label>How to execute</Label>
                      <List items={b.how} />
                    </div>
                    <div>
                      <Label>What not to do</Label>
                      <List items={b.notThis} tone="danger" />
                    </div>
                    <div>
                      <Label>What problems can occur</Label>
                      <List items={b.risks} tone="warn" />
                    </div>
                    <div>
                      <Label>If / else</Label>
                      <div className="space-y-1">
                        {b.branches.map((br) => (
                          <p key={br.condition} className="rounded-md bg-muted/50 p-2 text-sm">
                            <span className="font-medium">If</span> {br.condition} →{" "}
                            <span className="text-muted-foreground">{br.then}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Section>

          <Section title="Numbers you are judged on">
            <div className="grid gap-3 md:grid-cols-2">
              {active.metrics.map((m) => (
                <div key={m.name} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-muted-foreground">{m.meaning}</p>
                  <p className="mt-1 text-xs"><span className="font-medium">Good:</span> {m.good}</p>
                  <p className="text-xs"><span className="font-medium">Bad:</span> {m.bad}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Most common mistakes">
            <List items={active.mistakes} tone="danger" />
          </Section>

          <Section title="You have graduated when">
            <p className="rounded-md border border-dashed p-3 text-sm">{active.graduation}</p>
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function List({ items, tone }: { items: string[]; tone?: "danger" | "warn" }) {
  const dot = tone === "danger" ? "bg-destructive" : tone === "warn" ? "bg-amber-500" : "bg-primary";
  return (
    <ul className="space-y-1">
      {items.map((it) => (
        <li key={it} className="flex gap-2 text-sm text-muted-foreground">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
