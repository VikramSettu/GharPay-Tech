import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/founder/components/RoleGate";
import { useAdminFocus } from "@/founder/lib/admin-focus";
import { PersonLink } from "@/founder/components/admin/PersonLink";
import { useCrmLink } from "@/founder/hooks/useCrmLink";
import {
  buildBrain, searchBrain, DATE_OPTIONS, DEFAULT_FILTERS,
  type BrainFilters, type DateKey, type HealthKey, type BrainRow,
} from "@/founder/lib/brain/engine";
import {
  BUSINESSES, ROLE_LABEL, useBrainTargets, currentPhase, targetsFor,
  band, BAND_CLASS, BAND_LABEL, type BrainRole, type PhaseId,
} from "@/founder/lib/brain/targets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/command-center")({
  component: () => (
    <RoleGate>
      <CommandCenter />
    </RoleGate>
  ),
  head: () => ({
    meta: [
      { title: "Gharpayy Command Center · Admin Operating Brain" },
      { name: "description", content: "One page to operate Gharpayy: BBD targets, reverse funnel planner, impact queue, zone and person drill-downs, checkpoints and admin actions from live CRM data." },
      { property: "og:title", content: "Gharpayy Command Center · Admin Operating Brain" },
      { property: "og:description", content: "What happened, what is going wrong, who owns it, what must happen next — from one interconnected admin page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const HEALTH: { id: HealthKey; label: string }[] = [
  { id: "all", label: "All health" },
  { id: "healthy", label: "Healthy" },
  { id: "action-due", label: "Action due" },
  { id: "at-risk", label: "At risk" },
  { id: "breached", label: "Breached" },
  { id: "blocked", label: "Supply blocked" },
  { id: "orphaned", label: "Orphaned" },
  { id: "handoff-pending", label: "Handoff pending" },
  { id: "recovery", label: "Recovery" },
];

const ROLES: (BrainRole | "all")[] = ["all", "control-tower", "flow-ops", "tcm", "closing"];
const PHASES: PhaseId[] = ["p1", "p2", "eod", "week", "month"];
const PHASE_LABEL: Record<PhaseId, string> = { p1: "P1 · 1 PM", p2: "P2 · 5 PM", eod: "EOD", week: "Week", month: "Month" };

/** the battlefield bar speaks in PeriodKey; the brain engine speaks in DateKey */
function periodToDateKey(p: string, fallback: DateKey): DateKey {
  const map: Record<string, DateKey> = {
    now: "today", "1h": "today", "3h": "today", "6h": "today", "12h": "today",
    today: "today", yesterday: "yesterday", "24h": "today", "48h": "last-7",
    "3d": "last-7", "7d": "last-7", "14d": "last-14",
    "this-week": "this-week", "prev-week": "last-week", "this-month": "this-month",
  };
  return map[p] ?? fallback;
}

function CommandCenter() {
  useCrmLink(); // re-render on every CRM mutation
  const business = useBrainTargets((s) => s.business);
  const setBusiness = useBrainTargets((s) => s.setBusiness);
  const overrides = useBrainTargets((s) => s.overrides);
  const setOverride = useBrainTargets((s) => s.setOverride);

  const focusCtx = useAdminFocus();

  const [localFilters, setFilters] = useState<BrainFilters>(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"brain" | "sheet">("brain");
  const [sheetSet, setSheetSet] = useState<"people" | "leads">("people");
  const [done, setDone] = useState<Record<string, boolean>>({});

  // the shared battlefield scope wins: zone and time come from the admin bar
  const filters: BrainFilters = {
    ...localFilters,
    zone: focusCtx.zoneName,
    date: periodToDateKey(focusCtx.period, localFilters.date),
  };

  const patch = (p: Partial<BrainFilters>) => {
    if (p.zone !== undefined) focusCtx.setZoneName(p.zone);
    setFilters((f) => ({ ...f, ...p }));
  };
  const model = useMemo(
    () => buildBrain(filters, business, undefined, Date.now()),
    [filters.date, filters.zone, filters.role, filters.source, filters.intent, filters.health, filters.employees, business, overrides],
  );
  const results = useMemo(() => searchBrain(model, query), [model, query]);
  const phase = currentPhase();

  const open = (title: string, rows: BrainRow[], subtitle?: string) => focusCtx.openDrill(title, rows, subtitle);
  const focusPerson = (name: string) => focusCtx.focusByName(name);


  return (
    <div className="space-y-4 pb-16">
      {/* ---------------------------------------------------------- hero */}
      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gharpayy Command Center</h1>
            <p className="text-sm text-muted-foreground">
              What needs your attention right now? · {model.range.label} · Phase {phase.toUpperCase()} · counted live from the CRM
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={business} onValueChange={(v) => setBusiness(v as typeof business)}>
              <SelectTrigger className="w-[190px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{BUSINESSES.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex rounded-md border p-0.5">
              {(["brain", "sheet"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn("px-3 py-1.5 text-xs rounded", mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {m === "brain" ? "Operating brain" : "Sheet view"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {model.attention.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              Every checkpoint is green for this scope. Protect the pace and verify booking evidence.
            </div>
          )}
          {model.attention.map((a, i) => (
            <div key={a.id} className="rounded-md border p-3">
              <div className="text-[10px] font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</div>
              <div className="font-semibold text-sm">{a.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{a.metricLine}</div>
              <ul className="mt-2 space-y-0.5 text-xs">
                {a.reasons.filter(Boolean).map((r) => <li key={r} className="text-muted-foreground">· {r}</li>)}
              </ul>
              <Button size="sm" className="mt-2 h-7 text-xs" onClick={() => open(a.title, a.rows, a.metricLine)}>
                {a.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------- filter bar */}
      <section className="sticky top-[68px] z-30 rounded-lg border bg-card/95 backdrop-blur p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.date} onValueChange={(v) => patch({ date: v as DateKey })}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{DATE_OPTIONS.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.zone} onValueChange={(v) => patch({ zone: v })}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Zone" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              {model.zoneNames.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.role} onValueChange={(v) => patch({ role: v as BrainFilters["role"] })}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{r === "all" ? "All roles" : ROLE_LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.source} onValueChange={(v) => patch({ source: v })}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {model.sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.intent} onValueChange={(v) => patch({ intent: v as BrainFilters["intent"] })}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All intent</SelectItem>
              <SelectItem value="hot">Hard / hot</SelectItem>
              <SelectItem value="warm">Medium</SelectItem>
              <SelectItem value="cold">Soft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.health} onValueChange={(v) => patch({ health: v as HealthKey })}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{HEALTH.map((h) => <SelectItem key={h.id} value={h.id}>{h.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex-1 min-w-[220px]">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 text-xs"
              placeholder="Search lead, phone, employee, zone… or: leads never called, completed tours without quotation, payment promises due" />
          </div>
          {(filters.zone !== "all" || filters.role !== "all" || filters.health !== "all" || filters.intent !== "all" || filters.source !== "all") && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setFilters({ ...DEFAULT_FILTERS, date: filters.date })}>Clear</Button>
          )}
        </div>

        {query && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-md border">
            {results.length === 0 && <div className="p-3 text-xs text-muted-foreground">No match. Try a phone number, a person, a zone or an operational query.</div>}
            {results.map((r) => (
              <button key={r.kind + r.id} onClick={() => open(r.title, [r], r.subtitle)}
                className="w-full text-left px-3 py-2 text-xs border-b last:border-0 hover:bg-muted">
                <span className="font-medium">{r.title}</span>
                <span className="text-muted-foreground"> · {r.subtitle} · {r.owner} · {r.zone}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {mode === "sheet" ? (
        <SheetMode model={model} setSheet={setSheetSet} sheetSet={sheetSet} open={open} />
      ) : (
        <>
          {/* -------------------------------------------- score strip */}
          <section className="grid gap-2 lg:grid-cols-5">
            {model.groups.map((g) => (
              <div key={g.key} className="rounded-lg border bg-card">
                <div className="px-3 py-2 border-b text-[10px] uppercase tracking-widest text-muted-foreground">{g.label}</div>
                <div className="divide-y">
                  {g.metrics.map((m) => (
                    <button key={m.key} disabled={m.rows.length === 0}
                      onClick={() => open(`${g.label} · ${m.label}`, m.rows)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 text-sm text-left",
                        m.rows.length ? "hover:bg-muted cursor-pointer" : "cursor-default",
                      )}>
                      <span className="text-muted-foreground text-xs">{m.label}</span>
                      <span className={cn("font-mono font-semibold",
                        m.tone === "good" && "text-emerald-600 dark:text-emerald-400",
                        m.tone === "warn" && "text-amber-600 dark:text-amber-400",
                        m.tone === "bad" && m.value > 0 && "text-destructive")}>
                        {m.suffix === "₹" ? `₹${m.value.toLocaleString("en-IN")}` : m.value}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* --------------------------------- reverse funnel planner */}
          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border bg-card">
              <div className="px-4 py-2 border-b flex items-center justify-between">
                <div className="text-sm font-semibold">Reverse funnel planner</div>
                <Badge variant={model.plan.structuralGap > 0 ? "destructive" : "secondary"} className="text-[10px]">
                  {model.plan.structuralGap > 0 ? `Structural gap ${model.plan.structuralGap}` : "Pipeline sufficient"}
                </Badge>
              </div>
              <div className="p-3 space-y-1.5">
                <div className="text-xs text-muted-foreground">
                  To land {model.plan.target} BBD at current conversion, the pipeline must carry:
                </div>
                {model.plan.requirements.map((r) => {
                  const short = r.available < r.required;
                  return (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground text-xs">{r.label}</span>
                      <span className="font-mono text-xs">
                        <span className={short ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>{r.available}</span>
                        <span className="text-muted-foreground"> / {r.required}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ------------------------------------- 14 checkpoints */}
            <div className="rounded-lg border bg-card">
              <div className="px-4 py-2 border-b text-sm font-semibold">Control Tower · 14 checkpoints</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                {model.checkpoints.map((c) => (
                  <button key={c.id} onClick={() => open(`Checkpoint ${c.id} · ${c.label}`, c.failures, c.detail)}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted">
                    <span className={cn("h-2 w-2 rounded-full shrink-0",
                      c.state === "green" && "bg-emerald-500", c.state === "amber" && "bg-amber-500", c.state === "red" && "bg-destructive")} />
                    <span className="truncate flex-1">{c.label}</span>
                    <span className="font-mono text-muted-foreground">{c.failures.length}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* --------------------------------------------- funnel view */}
          <section className="rounded-lg border bg-card">
            <div className="px-4 py-2 border-b text-sm font-semibold">Funnel · click any stage to open the customers</div>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 p-3">
              {model.funnel.map((s) => (
                <button key={s.key} onClick={() => open(`${s.label} · ${s.count}`, s.rows)}
                  className="rounded-md border p-3 text-left hover:bg-muted">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{s.label}</div>
                  <div className="text-xl font-semibold">{s.count}</div>
                  <div className="text-[10px] text-muted-foreground">{s.conversion}% from previous{s.breaches ? ` · ${s.breaches} overdue` : ""}</div>
                </button>
              ))}
            </div>
          </section>

          {/* ------------------------------------------- impact queue */}
          <section className="rounded-lg border bg-card">
            <div className="px-4 py-2 border-b flex items-center justify-between">
              <div className="text-sm font-semibold">Fix now · ranked by downstream business damage</div>
              <Badge variant="outline" className="text-[10px]">{model.impact.length} open</Badge>
            </div>
            <div className="divide-y max-h-[420px] overflow-y-auto">
              {model.impact.length === 0 && <div className="p-4 text-sm text-muted-foreground">Queue clear — no case is currently damaging the target.</div>}
              {model.impact.slice(0, 40).map((r, i) => (
                <div key={r.kind + r.id + i} className="px-3 py-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center hover:bg-muted/50">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.title} <span className="text-xs text-muted-foreground">· {r.owner} · {r.zone}</span></div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.problem}{r.impact ? ` — ${r.impact}` : ""}{r.overdue ? ` · ${r.overdue}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-xs" onClick={() => open(r.title, [r], r.problem)}>Fix</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => toast.success(`Escalated to ${r.owner}`, { description: r.nextAction })}>Escalate</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* -------------------------------------------- zone command */}
          <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {model.zones.map((z) => (
              <div key={z.name} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between">
                  <button className="font-semibold text-sm uppercase tracking-wide hover:text-primary"
                    onClick={() => focusCtx.setZoneName(focusCtx.zoneName === z.name ? "all" : z.name)}
                    title="Run the whole admin on this zone">{z.name}</button>
                  <span className={cn("text-xs font-mono", BAND_CLASS[band(z.bbdActual, z.bbdTarget)])}>
                    {z.bbdActual}/{z.bbdTarget} BBD · {BAND_LABEL[band(z.bbdActual, z.bbdTarget)]}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1 text-center text-xs">
                  {[["Tours", z.tours], ["Done", z.done], ["Quotes", z.quotes], ["Hot", z.highIntent],
                    ["No next", z.noNextAction], ["SLA", z.sla], ["Supply", z.supplyBlocked], ["People", z.people]].map(([l, v]) => (
                    <div key={l as string} className="rounded border py-1">
                      <div className="font-mono font-semibold">{v as number}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{l as string}</div>
                    </div>
                  ))}
                </div>
                {z.reasons.length > 0 && (
                  <ul className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                    {z.reasons.slice(0, 3).map((r) => <li key={r}>· {r}</li>)}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => open(`Zone 360 · ${z.name}`, z.rows, `Why behind: ${z.reasons.join(" · ") || "on plan"} → Do: ${z.actions.join(" · ")}`)}>
                    Open Zone 360
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs"
                    onClick={() => {
                      void navigator.clipboard?.writeText(
                        `${z.name.toUpperCase()} · ${model.range.label}\nBBD ${z.bbdActual}/${z.bbdTarget} (forecast ${z.forecast})\nTours ${z.tours} · Done ${z.done} · Quotes ${z.quotes}\nHot ${z.highIntent} · No next action ${z.noNextAction} · SLA ${z.sla}\nDo now: ${z.actions.join(", ")}`,
                      );
                      toast.success("Zone update copied for WhatsApp");
                    }}>Copy to WhatsApp</Button>
                </div>
              </div>
            ))}
          </section>

          {/* -------------------------------- zone × people matrix */}
          <section className="rounded-lg border bg-card overflow-x-auto">
            <div className="px-4 py-2 border-b text-sm font-semibold">Zone × people matrix · target vs executable work</div>
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {["Person", "Role", "Zone", "P1", "P2", "EOD", "Week", "Month", "Work available", "SLA", "Classification"].map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-1.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {model.people.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className="px-3 py-1.5">
                      <button className="font-medium hover:underline"
                        onClick={() => {
                          if (!focusPerson(p.name)) open(`Person 360 · ${p.name}`, p.rows, `${p.zone} · EOD ${p.eod.actual}/${p.eod.target} · queue ${p.executable} executable vs ${p.requiredWork} required · ${p.slaBreaches} SLA breaches · ${p.classification}`);
                        }}>
                        {p.name}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{ROLE_LABEL[p.role]}</td>
                    <td className="px-3 py-1.5">{p.zone}</td>
                    {(["p1", "p2", "eod", "week", "month"] as const).map((k) => (
                      <td key={k} className={cn("px-3 py-1.5 font-mono", BAND_CLASS[band(p[k].actual, p[k].target)])}>
                        {p[k].actual}/{p[k].target}
                      </td>
                    ))}
                    <td className={cn("px-3 py-1.5 font-mono", p.executable < p.requiredWork && "text-destructive")}>
                      {p.executable}/{p.requiredWork}
                    </td>
                    <td className={cn("px-3 py-1.5 font-mono", p.slaBreaches > 0 && "text-destructive")}>{p.slaBreaches}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant={p.classification === "on-target" ? "secondary" : p.classification === "upstream" ? "outline" : "destructive"} className="text-[10px]">
                        {p.classification}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {model.people.length === 0 && (
                  <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">No people in this scope.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* ---------------------------------- must-win + targets */}
          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border bg-card">
              <div className="px-4 py-2 border-b text-sm font-semibold">Must win today</div>
              <div className="p-3 space-y-1.5">
                {model.mustWin.map((m, i) => (
                  <label key={m} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={!!done[m]}
                      onChange={(e) => setDone((d) => ({ ...d, [m]: e.target.checked }))} />
                    <span className={cn(done[m] && "line-through text-muted-foreground")}>
                      <span className="font-mono text-xs text-muted-foreground mr-1">{i + 1}.</span>{m}
                    </span>
                  </label>
                ))}
                <Button size="sm" variant="outline" className="h-7 text-xs mt-2"
                  onClick={() => {
                    const g = model.groups;
                    void navigator.clipboard?.writeText(
                      `${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} GHARPAYY\nBBD: ${model.plan.actual} / ${model.plan.target} (forecast ${model.plan.projection})\nGap: ${model.plan.gap}\nTours: ${g[2].metrics[0].value} scheduled · ${g[2].metrics[1].value} done\nQuotations: ${g[3].metrics[0].value}\nImmediate opportunities:\n• ${g[3].metrics[2].value} payment promises\n• ${g[4].metrics[2].value} done tours need quote\n• ${g[1].metrics[5].value} leads without next action\nAdmin priorities:\n${model.mustWin.map((m, i) => `${i + 1}. ${m}`).join("\n")}`,
                    );
                    toast.success("Company update copied for WhatsApp");
                  }}>Copy company update</Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="px-4 py-2 border-b text-sm font-semibold">Locked targets · admin editable</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr><th className="text-left px-3 py-1.5">Role</th>{PHASES.map((p) => <th key={p} className="text-left px-3 py-1.5">{PHASE_LABEL[p]}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {(["control-tower", "flow-ops", "tcm", "closing"] as BrainRole[]).map((role) => (
                      <tr key={role}>
                        <td className="px-3 py-1.5 font-medium whitespace-nowrap">{ROLE_LABEL[role]}</td>
                        {PHASES.map((p) => {
                          const t = targetsFor(business, role, p, overrides);
                          return (
                            <td key={p} className="px-3 py-1.5 space-y-1">
                              {Object.entries(t).map(([metric, val]) => (
                                <div key={metric} className="flex items-center gap-1">
                                  <Input type="number" value={val as number}
                                    onChange={(e) => setOverride(business, role, p, metric as never, e.target.value === "" ? null : Number(e.target.value))}
                                    className="h-6 w-14 text-[11px] px-1" />
                                  <span className="text-[10px] text-muted-foreground">{metric}</span>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

    </div>
  );
}

/* --------------------------------------------------------------- sheet */

function SheetMode({
  model, sheetSet, setSheet, open,
}: {
  model: ReturnType<typeof buildBrain>;
  sheetSet: "people" | "leads";
  setSheet: (s: "people" | "leads") => void;
  open: (title: string, rows: BrainRow[], subtitle?: string) => void;
}) {
  const leadRows = model.groups[1].metrics[1].rows;
  return (
    <section className="rounded-lg border bg-card">
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div className="text-sm font-semibold">Sheet view</div>
        <div className="flex rounded-md border p-0.5">
          {(["people", "leads"] as const).map((s) => (
            <button key={s} onClick={() => setSheet(s)}
              className={cn("px-3 py-1 text-xs rounded capitalize", sheetSet === s ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{s}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto max-h-[70vh]">
        {sheetSet === "people" ? (
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground sticky top-0">
              <tr>{["Name", "Role", "Zone", "P1", "P2", "EOD", "Week", "Month", "Executable", "Required", "SLA", "Miss class"].map((h) => (
                <th key={h} className="text-left font-medium px-3 py-1.5 whitespace-nowrap">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y">
              {model.people.map((p) => (
                <tr key={p.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => open(`Person 360 · ${p.name}`, p.rows)}>
                  <td className="px-3 py-1.5 font-medium"><PersonLink name={p.name} /></td>
                  <td className="px-3 py-1.5">{p.role}</td>
                  <td className="px-3 py-1.5">{p.zone}</td>
                  {(["p1", "p2", "eod", "week", "month"] as const).map((k) => (
                    <td key={k} className="px-3 py-1.5 font-mono">{p[k].actual}/{p[k].target}</td>
                  ))}
                  <td className="px-3 py-1.5 font-mono">{p.executable}</td>
                  <td className="px-3 py-1.5 font-mono">{p.requiredWork}</td>
                  <td className="px-3 py-1.5 font-mono">{p.slaBreaches}</td>
                  <td className="px-3 py-1.5">{p.classification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground sticky top-0">
              <tr>{["Lead", "Detail", "Owner", "Zone", "Problem", "Next action"].map((h) => (
                <th key={h} className="text-left font-medium px-3 py-1.5 whitespace-nowrap">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y">
              {leadRows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => open(r.title, [r], r.subtitle)}>
                  <td className="px-3 py-1.5 font-medium">{r.title}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.subtitle}</td>
                  <td className="px-3 py-1.5">{r.owner}</td>
                  <td className="px-3 py-1.5">{r.zone}</td>
                  <td className="px-3 py-1.5 text-destructive">{r.problem ?? ""}</td>
                  <td className="px-3 py-1.5">{r.nextAction}</td>
                </tr>
              ))}
              {leadRows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No leads in this scope.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
