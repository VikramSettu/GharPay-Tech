import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrillDrawer, type Drill } from "@/founder/components/brain/DrillDrawer";
import { buildPulse, WINDOW_OPTIONS, type PersonPulse, type WindowKey } from "@/founder/lib/brain/pulse";
import type { Metric } from "@/founder/lib/brain/engine";
import { useCrmLink } from "@/founder/hooks/useCrmLink";
import { crmSnapshot } from "@/founder/lib/crm-link";

export const Route = createFileRoute("/admin/pulse")({
  head: () => ({
    meta: [
      { title: "Company Pulse & People Desk — Gharpayy Admin" },
      { name: "description", content: "Live 6-hour to 7-day company pulse: leads moving to closing, tours, quotations, bookings and a per-person performance deep dive." },
      { property: "og:title", content: "Company Pulse & People Desk — Gharpayy Admin" },
      { property: "og:description", content: "See what happened in the last 6 hours, 48 hours or week and who actually moved it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PulsePage,
});

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const toneCls: Record<string, string> = {
  good: "border-emerald-500/40 bg-emerald-500/5",
  warn: "border-amber-500/40 bg-amber-500/5",
  bad: "border-destructive/40 bg-destructive/5",
  plain: "",
};

function MetricCard({ m, onOpen }: { m: Metric; onOpen: (d: Drill) => void }) {
  const clickable = m.rows.length > 0;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onOpen({ title: m.label, subtitle: `${m.rows.length} rows behind this number`, rows: m.rows })}
      className={`text-left rounded-lg border p-3 transition ${toneCls[m.tone ?? "plain"]} ${clickable ? "hover:shadow-sm hover:border-primary/50" : "opacity-80"}`}
    >
      <div className="text-2xl font-semibold tabular-nums">
        {m.suffix === "₹" ? money(m.value) : m.value.toLocaleString("en-IN")}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
      {clickable && <div className="text-[10px] mt-1 text-primary">Tap to see why →</div>}
    </button>
  );
}

function Cell({ value, label, rows, person, onOpen, danger }: {
  value: number; label: string; rows: BrainRowList; person: PersonPulse; onOpen: (d: Drill) => void; danger?: boolean;
}) {
  const clickable = rows.length > 0;
  return (
    <td className="px-2 py-2 text-center">
      <button
        type="button"
        disabled={!clickable}
        onClick={() => onOpen({ title: `${person.name} · ${label}`, subtitle: `${rows.length} rows`, rows })}
        className={`tabular-nums text-sm rounded px-2 py-0.5 ${danger && value > 0 ? "text-destructive font-semibold" : ""} ${clickable ? "hover:bg-muted" : "opacity-50"}`}
      >
        {value}
      </button>
    </td>
  );
}

type BrainRowList = PersonPulse["drills"][string];

function PulsePage() {
  useCrmLink();
  const [win, setWin] = useState<WindowKey>("today");
  const [zone, setZone] = useState("all");
  const [drill, setDrill] = useState<Drill | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const zones = useMemo(() => [...new Set(crmSnapshot().tcms.map((t) => t.zone))].sort(), []);
  const model = useMemo(() => buildPulse(win, crmSnapshot(), Date.now(), zone), [win, zone]);

  const best = model.people[0];
  const worst = model.people[model.people.length - 1];

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-6">
      {/* controls */}
      <div className="sticky top-[57px] z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b">
        <div className="flex flex-wrap items-center gap-2">
          {WINDOW_OPTIONS.map((w) => (
            <button
              key={w.id}
              onClick={() => setWin(w.id)}
              title={w.hint}
              className={`px-3 py-1.5 rounded-full text-xs border ${win === w.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
            >
              {w.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="h-8 rounded border bg-background px-2 text-xs"
            aria-label="Zone filter"
          >
            <option value="all">All zones</option>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <span className="ml-auto text-xs text-muted-foreground">
            {model.range.label} · {model.totals.perHour} activities/hour · {model.totals.leadsTouched} leads talked to
          </span>
        </div>
      </div>

      {/* headline */}
      <section className="space-y-2">
        <h1 className="text-lg font-semibold">What is actually happening — {model.range.label}</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {model.headline.map((m) => <MetricCard key={m.key} m={m} onOpen={setDrill} />)}
        </div>
      </section>

      {/* movement */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Movement</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {model.movement.map((m) => <MetricCard key={m.key} m={m} onOpen={setDrill} />)}
        </div>
      </section>

      {/* risk */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">What is rotting</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {model.risk.map((m) => <MetricCard key={m.key} m={m} onOpen={setDrill} />)}
        </div>
      </section>

      {/* people */}
      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">People desk — who is making it happen</h2>
          {best && worst && best.id !== worst.id && (
            <div className="text-xs text-muted-foreground">
              Top: <span className="font-medium text-foreground">{best.name}</span> ({best.score}) ·
              Needs a push: <span className="font-medium text-destructive">{worst.name}</span> ({worst.score})
            </div>
          )}
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Person</th>
                <th className="px-2 py-2">Score</th>
                <th className="px-2 py-2">Calls</th>
                <th className="px-2 py-2">Activities</th>
                <th className="px-2 py-2">Talked to</th>
                <th className="px-2 py-2">Tours set</th>
                <th className="px-2 py-2">Tours done</th>
                <th className="px-2 py-2">No outcome</th>
                <th className="px-2 py-2">Quote/token</th>
                <th className="px-2 py-2">Bookings</th>
                <th className="px-2 py-2">Owned</th>
                <th className="px-2 py-2">Untouched</th>
                <th className="px-2 py-2">Cold 3d</th>
                <th className="px-2 py-2">No next</th>
                <th className="px-2 py-2">Overdue</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {model.people.map((p) => (
                <>
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">{p.zone} · {p.activeLeads} active</div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Badge variant={p.grade === "A" ? "default" : p.grade === "D" ? "destructive" : "secondary"}>
                        {p.grade} · {p.score}
                      </Badge>
                    </td>
                    <Cell value={p.calls} label="Calls" rows={p.drills.calls} person={p} onOpen={setDrill} />
                    <Cell value={p.activities} label="Activities" rows={p.drills.activities} person={p} onOpen={setDrill} />
                    <Cell value={p.leadsTouched} label="Leads talked to" rows={p.drills.touched} person={p} onOpen={setDrill} />
                    <Cell value={p.toursScheduled} label="Tours scheduled" rows={p.drills.scheduled} person={p} onOpen={setDrill} />
                    <Cell value={p.toursDone} label="Tours completed" rows={p.drills.done} person={p} onOpen={setDrill} />
                    <Cell value={p.toursNoOutcome} label="Tours without outcome" rows={p.drills.noOutcome} person={p} onOpen={setDrill} danger />
                    <Cell value={p.quotes} label="Quotation / token talk" rows={p.drills.quotes} person={p} onOpen={setDrill} />
                    <Cell value={p.bookings} label="Bookings" rows={p.drills.bookings} person={p} onOpen={setDrill} />
                    <Cell value={p.leadsOwned} label="Leads owned" rows={p.drills.owned} person={p} onOpen={setDrill} />
                    <Cell value={p.untouched} label="Untouched leads" rows={p.drills.untouched} person={p} onOpen={setDrill} danger />
                    <Cell value={p.stale3d} label="Cold 3+ days" rows={p.drills.stale} person={p} onOpen={setDrill} danger />
                    <Cell value={p.noNextAction} label="No next action" rows={p.drills.noNext} person={p} onOpen={setDrill} danger />
                    <Cell value={p.overdue} label="Overdue follow-ups" rows={p.drills.overdue} person={p} onOpen={setDrill} danger />
                    <td className="px-2 py-2 text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                        {expanded === p.id ? "Hide" : "Why"}
                      </Button>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr key={`${p.id}-why`} className="border-t bg-muted/20">
                      <td colSpan={16} className="px-3 py-3">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <div className="text-xs font-semibold mb-1">Score breakdown</div>
                            <div className="space-y-1 text-xs">
                              {[["Effort (calls vs window target)", p.effort], ["Outcome (tours, quotes, bookings)", p.outcome], ["Discipline (hygiene)", p.discipline]].map(([l, v]) => (
                                <div key={l as string}>
                                  <div className="flex justify-between"><span>{l}</span><span className="tabular-nums">{v as number}</span></div>
                                  <div className="h-1.5 rounded bg-muted overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${v as number}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold mb-1">Flags</div>
                            {p.flags.length === 0
                              ? <div className="text-xs text-muted-foreground">Clean. Nothing to correct right now.</div>
                              : <ul className="space-y-1 text-xs">{p.flags.map((f) => <li key={f} className="text-destructive">• {f}</li>)}</ul>}
                          </div>
                          <div>
                            <div className="text-xs font-semibold mb-1">Funnel discipline</div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>Tours set → done: {p.toursScheduled ? Math.round((p.toursDone / p.toursScheduled) * 100) : 0}%</div>
                              <div>Tours done → quote talk: {p.toursDone ? Math.round((p.quotes / p.toursDone) * 100) : 0}%</div>
                              <div>Quote → booking: {p.quotes ? Math.round((p.bookings / p.quotes) * 100) : 0}%</div>
                              <div>Booked value: {money(p.revenue)}</div>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs"><Link to="/leads">Open leads</Link></Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => setDrill({ title: `${p.name} · everything to fix`, subtitle: "Untouched, cold, overdue and tours without outcome", rows: [...p.drills.untouched, ...p.drills.stale, ...p.drills.overdue, ...p.drills.noOutcome] })}>
                                Fix list
                              </Button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {model.people.length === 0 && (
                <tr><td colSpan={16} className="px-3 py-8 text-center text-sm text-muted-foreground">No people in this zone.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* feed */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live feed — {model.range.label}</h2>
        <div className="rounded-lg border divide-y max-h-[420px] overflow-y-auto">
          {model.feed.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nothing was logged in this window. That is the signal.</div>}
          {model.feed.map((r, i) => (
            <button key={r.id + i} className="w-full text-left px-3 py-2 hover:bg-muted/40"
              onClick={() => setDrill({ title: r.title, subtitle: r.subtitle, rows: [r] })}>
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{r.owner}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <DrillDrawer drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}
