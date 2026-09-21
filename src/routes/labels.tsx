import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientOnly } from "@/components/ClientOnly";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Search, Tag } from "lucide-react";
import { useAppState } from "@/myt/lib/app-context";
import { teamMembers } from "@/myt/lib/mock-data";
import { LEAD_LABELS, LABEL_BY_ID, LABEL_GROUPS, SEVERITY_LABEL, SEVERITY_STYLE } from "@/lib/labels/catalog";
import { isOverdue, labelStats, resolveLabel, useLeadLabels } from "@/lib/labels/store";
import { LabelManual, LeadLabelStrip } from "@/components/labels/LeadLabelStrip";
import { HowButton } from "@/components/common/HowButton";

export const Route = createFileRoute("/labels")({
  head: () => ({
    meta: [
      { title: "Lead Labels — Instruction Console | Gharpayy" },
      { name: "description", content: "Search any lead and attach an instruction the owner cannot misread: priority, no question sent, ask this question, follow up like this — each with why, how, don'ts and if/else." },
      { property: "og:title", content: "Lead Labels — Instruction Console" },
      { property: "og:description", content: "Control Tower labelling for the marketplace and every claimed lead, with a full operating manual behind every label." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LabelsPage,
});

function LabelsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Lead Label Console</h1>
            <HowButton
              withText
              title="How to run the Label Console"
              why="A label is an order, not a tag. It tells the lead's owner exactly what to fix, by when, and the reviewer can verify it was done."
              howToExecute={[
                "Search the lead by name, phone or area — never label from memory.",
                "Pick the label that matches what you actually saw in the chat or call recording.",
                "Write the customer's own words in the note so the owner does not have to guess.",
                "Come back to 'Open instructions' and clear anything overdue before end of shift.",
                "Attach a close promise on the same lead so the instruction has a deadline behind it.",
              ]}
              whatNotToDo={[
                "Do not stack five labels on one lead — the owner will action none of them.",
                "Do not label without a note; a bare label gets ignored.",
                "Do not resolve your own label without evidence in the thread.",
              ]}
              problemsThatCanOccur={[
                "Labels pile up past SLA and the console becomes wallpaper.",
                "Two reviewers label the same lead differently and the owner freezes.",
              ]}
              branches={[
                { condition: "The same label repeats across a person's leads", then: "It is a training gap — raise it in the daily review, not on each lead." },
                { condition: "Label is overdue by more than one SLA cycle", then: "Escalate to the zone lead and reassign the lead." },
                { condition: "Owner disputes the label", then: "Re-listen to the call, then either keep it with evidence or remove it with a reason." },
              ]}
              doneWhen="Zero overdue instructions and every high-intent lead carries at most one open label."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Search any lead in the marketplace or in anyone's queue, and attach an instruction that carries its
            own manual — why it exists, how to execute it, what not to do, what can go wrong, and the if/else
            branches. One word is not an instruction; this is.
          </p>
        </header>
        <ClientOnly fallback={<p className="py-10 text-center text-sm text-muted-foreground">Loading leads…</p>}>
          <Console />
        </ClientOnly>
      </div>
    </AppShell>
  );
}

function Console() {
  const { leads, currentMemberId } = useAppState();
  const labels = useLeadLabels();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const actorName = teamMembers.find((m) => m.id === currentMemberId)?.name ?? "Control Tower";
  const stats = labelStats(labels);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return leads
      .filter((l) => {
        if (!term) return true;
        return (
          l.name?.toLowerCase().includes(term) ||
          l.phone?.toLowerCase().includes(term) ||
          l.area?.toLowerCase().includes(term) ||
          (l.tags ?? []).some((t) => t.toLowerCase().includes(term))
        );
      })
      .filter((l) => {
        if (filter === "all") return true;
        if (filter === "unlabelled") return !labels.some((x) => x.leadId === l.id && !x.resolvedAt);
        if (filter === "overdue") return labels.some((x) => x.leadId === l.id && isOverdue(x));
        if (filter.startsWith("g:")) {
          const g = filter.slice(2);
          return labels.some((x) => x.leadId === l.id && !x.resolvedAt && LABEL_BY_ID[x.labelId]?.group === g);
        }
        return labels.some((x) => x.leadId === l.id && x.labelId === filter && !x.resolvedAt);
      })
      .slice(0, 60);
  }, [leads, labels, q, filter]);

  const open = labels.filter((l) => !l.resolvedAt);

  return (
    <Tabs defaultValue="search">
      <TabsList>
        <TabsTrigger value="search">Search &amp; label</TabsTrigger>
        <TabsTrigger value="open">Open instructions ({stats.open})</TabsTrigger>
        <TabsTrigger value="manual">Label manual</TabsTrigger>
      </TabsList>

      <TabsContent value="search" className="mt-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-4">
          <Stat label="Open instructions" value={stats.open} />
          <Stat label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? "bad" : undefined} />
          <Stat label="Cleared today" value={stats.resolvedToday} tone="good" />
          <Stat label="Leads visible" value={results.length} />
        </div>

        <Card className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8"
              placeholder="Search by name, phone, area or existing tag…" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All leads</FilterChip>
            <FilterChip active={filter === "unlabelled"} onClick={() => setFilter("unlabelled")}>No open label</FilterChip>
            <FilterChip active={filter === "overdue"} onClick={() => setFilter("overdue")}>Overdue instruction</FilterChip>
            {LABEL_GROUPS.map((g) => (
              <FilterChip key={g.id} active={filter === `g:${g.id}`} onClick={() => setFilter(`g:${g.id}`)}>{g.title}</FilterChip>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {LEAD_LABELS.length} instructions across {LABEL_GROUPS.length} groups. Filter by group, then open a lead
            and search the exact scenario inside the picker.
          </p>

        </Card>

        <div className="space-y-2">
          {results.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nothing matches. Clear the filter, or search by the last four digits of the phone number.
            </Card>
          )}
          {results.map((l) => (
            <Card key={l.id} className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {l.name}
                    <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                      {l.phone} · {l.area} · ₹{l.budget?.toLocaleString?.() ?? l.budget}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.claimedBy
                      ? `Owned by ${teamMembers.find((m) => m.id === l.claimedBy)?.name ?? "someone"}`
                      : "Unclaimed — sitting in the marketplace"}
                    {l.status ? ` · ${l.status}` : ""}
                  </p>
                </div>
                <LeadLabelStrip leadId={l.id} leadName={l.name} leadPhone={l.phone ?? ""} actorName={actorName} variant="full" />
              </div>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="open" className="mt-4 space-y-2">
        {open.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No open instructions. Either the floor is clean, or nobody is reviewing — check the daily 100 before celebrating.
          </Card>
        )}
        {open
          .slice()
          .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
          .map((l) => {
            const def = LABEL_BY_ID[l.labelId];
            if (!def) return null;
            const late = isOverdue(l);
            return (
              <Card key={l.id} className={cn("p-3", late && "border-destructive/50")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", SEVERITY_STYLE[def.severity])}>
                      <Tag className="h-2.5 w-2.5" />{def.label}
                    </span>
                    <p className="mt-1 text-sm font-medium">{l.leadName} <span className="text-[11px] font-normal text-muted-foreground">{l.leadPhone}</span></p>
                    {l.note && <p className="mt-0.5 text-[11px] text-muted-foreground">"{l.note}"</p>}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Set by {l.appliedBy} · due {new Date(l.dueAt).toLocaleString()}
                      {late && <span className="ml-1 font-semibold text-destructive"><AlertTriangle className="inline h-3 w-3" /> overdue</span>}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => resolveLabel(l.id, "Control Tower", "Cleared from the console")}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark done
                  </Button>
                </div>
              </Card>
            );
          })}
      </TabsContent>

      <TabsContent value="manual" className="mt-4 space-y-3">
        <Card className="p-3 text-[11px] text-muted-foreground">
          Read this once, properly. Every label below is a contract between the Control Tower and the floor:
          the reviewer promises to be specific, and the owner promises to act inside the window. If a label
          is used without its note, the contract is broken and the label should be rejected.
        </Card>
        {LEAD_LABELS.map((def) => (
          <Card key={def.id} className="p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{LABEL_GROUPS.find((g) => g.id === def.group)?.title ?? def.group}</Badge>
              <Badge variant="outline" className={SEVERITY_STYLE[def.severity]}>{SEVERITY_LABEL[def.severity]}</Badge>
              <span className="text-[10px] text-muted-foreground">Action window {def.slaHours}h</span>
            </div>
            <LabelManual def={def} compactHeader />
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  return (
    <Card className={cn("p-3", tone === "bad" && "border-destructive/40", tone === "good" && "border-emerald-500/40")}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("rounded-full border px-2.5 py-0.5 text-[11px] transition",
        active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}>
      {children}
    </button>
  );
}
