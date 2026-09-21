import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useAdminFocusOptional } from "@/founder/lib/admin-focus";
import { PersonLink } from "@/founder/components/admin/PersonLink";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EMPLOYEES } from "@/founder/data/seed";
import { RoleGate } from "@/founder/components/RoleGate";
import { getAllRecords, getRecordsInRange, subscribeDyn, dynVersion, getDay } from "@/founder/lib/execution/dyn-store";
import { getAllPlaybooks, resolvePlaybookFor, defaultPlaybookForRole, subscribePlaybooks, playbooksVersion } from "@/founder/lib/execution/playbooks";
import { getField } from "@/founder/lib/execution/field-library";
import { WhatsAppCopyBlock } from "@/founder/components/execution/WhatsAppCopyBlock";
import { aggregate, RANGE_PRESETS, toCSV, downloadCSV, type GroupBy, type RecordCtx } from "@/founder/lib/execution/aggregate";
import { stageTimings, totalActiveMs, fmtDuration, stageMedians, saveTimeHints } from "@/founder/lib/execution/insights";
import { prettyStageLabel } from "@/founder/components/execution/StageRenderer";
import { Activity, Filter, Download, LayoutGrid, LineChart, ListTree, Settings2, ChevronRight, AlertTriangle, Clock, Lightbulb, Plus, Trash2, RotateCcw, Users } from "lucide-react";
import {
  getKpiKeys, setKpiKeys, getAllPhaseCopy, setPhaseCopy, resetDailyCfg,
  subscribeDailyCfg, dailyCfgVersion,
} from "@/founder/lib/execution/daily-config";
import { getAllFields } from "@/founder/lib/execution/field-library";

export const Route = createFileRoute("/admin/ops")({
  head: () => ({
    meta: [
      { title: "Ops Dashboard — Gharpayy Execution OS" },
      { name: "description", content: "Live wallboard, per-person timeline, deep analytics, stack & queue — every operator, every role, in one place." },
    ],
  }),
  component: () => <RoleGate allow={["leadership", "hr", "leader"]}><OpsDashboard /></RoleGate>,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Not found.</div>,
});

function OpsDashboard() {
  useSyncExternalStore(subscribeDyn, dynVersion, () => 0);
  useSyncExternalStore(subscribePlaybooks, playbooksVersion, () => 0);
  useSyncExternalStore(subscribeDailyCfg, dailyCfgVersion, () => 0);
  const [tab, setTab] = useState<"live" | "timeline" | "insights" | "analytics" | "stack" | "config">("live");

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Command · Every operator, every proof, live</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Ops Dashboard</h1>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="live"><Activity className="h-3.5 w-3.5 mr-1.5" />Live</TabsTrigger>
          <TabsTrigger value="timeline"><ListTree className="h-3.5 w-3.5 mr-1.5" />Timeline</TabsTrigger>
          <TabsTrigger value="insights"><Lightbulb className="h-3.5 w-3.5 mr-1.5" />Insights</TabsTrigger>
          <TabsTrigger value="analytics"><LineChart className="h-3.5 w-3.5 mr-1.5" />Analytics</TabsTrigger>
          <TabsTrigger value="stack"><LayoutGrid className="h-3.5 w-3.5 mr-1.5" />Stack</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="h-3.5 w-3.5 mr-1.5" />Config</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4"><LiveTab /></TabsContent>
        <TabsContent value="timeline" className="mt-4"><TimelineTab /></TabsContent>
        <TabsContent value="insights" className="mt-4"><InsightsTab /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><AnalyticsTab /></TabsContent>
        <TabsContent value="stack" className="mt-4"><StackTab /></TabsContent>
        <TabsContent value="config" className="mt-4"><ConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// -------------------- LIVE TAB --------------------
function LiveTab() {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [riskOnly, setRiskOnly] = useState(false);

  const roles = Array.from(new Set(EMPLOYEES.map((e) => e.role)));
  const teams = Array.from(new Set(EMPLOYEES.map((e) => e.team)));

  const cards = EMPLOYEES
    .filter((e) => roleFilter === "all" || e.role === roleFilter)
    .filter((e) => teamFilter === "all" || e.team === teamFilter)
    .map((e) => {
      const pb = resolvePlaybookFor(e.id, () => defaultPlaybookForRole(e.role));
      const rec = getDay(e.id);
      const stages = pb?.stages || [];
      const cur = rec?.stageIdx ?? 0;
      const missed = rec && rec.startedAt && Date.now() - rec.startedAt > 60 * 60_000 && cur < stages.length && Object.keys(rec.submissions).length === 0;
      return { e, pb, rec, cur, total: stages.length, currentStage: stages[cur]?.label, missed };
    })
    .filter((c) => !riskOnly || c.missed);

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select className="h-8 rounded border bg-background px-2 text-xs" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="h-8 rounded border bg-background px-2 text-xs" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
          <option value="all">All teams</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="text-xs flex items-center gap-1">
          <input type="checkbox" checked={riskOnly} onChange={(e) => setRiskOnly(e.target.checked)} /> Missed-gate only
        </label>
        <span className="text-xs text-muted-foreground ml-auto">{cards.length} people</span>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards.map(({ e, pb, rec, cur, total, currentStage, missed }) => {
          const pct = total ? Math.round((cur / total) * 100) : 0;
          const done = rec && cur >= total;
          return (
            <Card key={e.id} className={`p-3 space-y-2 ${missed ? "border-red-500/50 bg-red-500/5" : done ? "border-emerald-500/40" : ""}`}>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20 grid place-items-center text-xs font-semibold">{e.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate"><PersonLink name={e.name} /></div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground truncate">{e.role} · {e.team}</div>
                </div>
                {missed && <AlertTriangle className="h-4 w-4 text-red-500" />}
                {done && <Badge variant="outline" className="text-[10px] border-emerald-500/60 text-emerald-600">Done</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{pb?.name || "no playbook"}</div>
              <div className="text-xs">
                <span className="text-muted-foreground">Stage:</span> {currentStage || "not started"}
              </div>
              <div className="h-1.5 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>{cur}/{total} stages</span>
                <span>{pct}%</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// -------------------- TIMELINE TAB --------------------
function TimelineTab() {
  const [empId, setEmpId] = useState(EMPLOYEES[0].id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const emp = EMPLOYEES.find((e) => e.id === empId)!;
  const pb = resolvePlaybookFor(empId, () => defaultPlaybookForRole(emp.role));
  const rec = getDay(empId, date);

  const stageOrder = pb?.stages.map((s) => s.id) || [];
  const timings = rec ? stageTimings(rec, stageOrder) : [];
  const timingMap = new Map(timings.map((t) => [t.stageId, t]));
  const totalMs = rec ? totalActiveMs(rec) : 0;
  const avgMs = timings.length ? Math.round(timings.reduce((s, t) => s + t.durationMs, 0) / timings.length) : 0;
  const slowest = timings.length ? timings.reduce((a, b) => (a.durationMs > b.durationMs ? a : b)) : null;

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap gap-2 items-end">
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Person</div>
          <select className="h-9 rounded border bg-background px-2 text-sm min-w-48" value={empId} onChange={(e) => setEmpId(e.target.value)}>
            {EMPLOYEES.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Date</div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40" />
        </div>
      </Card>

      {/* Time insights bar */}
      {rec && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard label="Total on flow" value={fmtDuration(totalMs)} />
          <StatCard label="Steps done" value={`${Object.keys(rec.submissions).length}/${stageOrder.length}`} />
          <StatCard label="Avg / step" value={fmtDuration(avgMs)} />
          <StatCard label="Slowest step" value={slowest ? fmtDuration(slowest.durationMs) : "—"} />
        </div>
      )}

      {!rec ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No submissions on {date}.</Card>
      ) : (
        <div className="space-y-3">
          {pb?.stages.map((stage, i) => {
            const sub = rec.submissions[stage.id];
            const done = !!sub;
            const t = timingMap.get(stage.id);
            const isSlowest = slowest && slowest.stageId === stage.id;
            return (
              <Card key={stage.id} className={`p-4 ${done ? "border-emerald-500/40" : "opacity-60"} ${isSlowest ? "ring-1 ring-amber-500/40" : ""}`}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[10px]">#{i + 1}</Badge>
                  <h3 className="font-medium">{prettyStageLabel(stage.label)}</h3>
                  {stage.time && <span className="text-[10px] font-mono text-muted-foreground">{stage.time}</span>}
                  {t && (
                    <span className={`text-[10px] font-mono inline-flex items-center gap-1 ${isSlowest ? "text-amber-600" : "text-muted-foreground"}`}>
                      <Clock className="h-3 w-3" /> {fmtDuration(t.durationMs)} to fill
                    </span>
                  )}
                  {sub && <span className="ml-auto text-[10px] font-mono text-muted-foreground">{new Date(sub.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
                {sub && (
                  <>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {sub.proofs.selfie && <img src={sub.proofs.selfie} className="h-14 w-14 rounded object-cover ring-1 ring-border" />}
                      {sub.proofs.whatsapp && <img src={sub.proofs.whatsapp} className="h-14 w-14 rounded object-cover ring-1 ring-border" />}
                      {sub.proofs.crm_ss && <img src={sub.proofs.crm_ss} className="h-14 w-14 rounded object-cover ring-1 ring-border" />}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {Object.entries(sub.values).map(([k, v]) => {
                        const f = getField(k);
                        return (
                          <div key={k} className="p-2 rounded bg-muted/40">
                            <div className="text-[10px] font-mono uppercase text-muted-foreground truncate">{f?.label || k}</div>
                            <div className="truncate">{String(v)}</div>
                          </div>
                        );
                      })}
                    </div>
                    {sub.waMessage && <WhatsAppCopyBlock text={sub.waMessage} />}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -------------------- INSIGHTS TAB --------------------
function InsightsTab() {
  const [rangeId, setRangeId] = useState("last7");
  const range = RANGE_PRESETS.find((r) => r.id === rangeId)!;
  const records = getRecordsInRange(range.from(), range.to());

  // Group by playbook so medians reflect that role's flow
  const byPlaybook = new Map<string, typeof records>();
  for (const r of records) {
    const arr = byPlaybook.get(r.playbookId) || [];
    arr.push(r); byPlaybook.set(r.playbookId, arr);
  }

  const playbooks = getAllPlaybooks();

  const totalTime = records.reduce((s, r) => s + totalActiveMs(r), 0);
  const totalSteps = records.reduce((s, r) => s + Object.keys(r.submissions).length, 0);
  const uniquePeople = new Set(records.map((r) => r.employeeId)).size;

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap gap-2 items-end">
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Range</div>
          <select className="h-9 rounded border bg-background px-2 text-sm" value={rangeId} onChange={(e) => setRangeId(e.target.value)}>
            {RANGE_PRESETS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">{records.length} day-records</div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="People active" value={String(uniquePeople)} />
        <StatCard label="Steps submitted" value={String(totalSteps)} />
        <StatCard label="Total time on flow" value={fmtDuration(totalTime)} />
        <StatCard label="Avg / person" value={uniquePeople ? fmtDuration(Math.round(totalTime / uniquePeople)) : "—"} />
      </div>

      <ActivelyFillingCard />

      <WeeklyLedgerCard />




      {[...byPlaybook.entries()].map(([pbId, recs]) => {
        const pb = playbooks.find((p) => p.id === pbId);
        if (!pb) return null;
        const stageOrder = pb.stages.map((s) => s.id);
        const stageLabels = Object.fromEntries(pb.stages.map((s) => [s.id, prettyStageLabel(s.label)]));
        const medians = stageMedians(recs, stageOrder).sort((a, b) => b.medianMs - a.medianMs);
        const hints = saveTimeHints(medians, stageLabels);
        return (
          <Card key={pbId} className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-display font-semibold">{pb.name}</h3>
              <Badge variant="outline" className="font-mono text-[10px]">{recs.length} runs</Badge>
            </div>

            {hints.length > 0 && (
              <div className="space-y-1.5">
                {hints.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded border border-amber-500/30 bg-amber-500/5 text-xs">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div><span className="font-medium">{h.label}.</span> <span className="text-muted-foreground">{h.detail}</span></div>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-1.5 pr-2">Step</th>
                    <th className="text-right py-1.5 px-2">Median fill</th>
                    <th className="text-right py-1.5 px-2">Slowest</th>
                    <th className="text-right py-1.5 pl-2">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {medians.map((m) => (
                    <tr key={m.stageId} className="border-b last:border-0">
                      <td className="py-1.5 pr-2 truncate max-w-xs">{stageLabels[m.stageId]}</td>
                      <td className="text-right py-1.5 px-2 font-mono">{fmtDuration(m.medianMs)}</td>
                      <td className="text-right py-1.5 px-2 font-mono text-muted-foreground">{fmtDuration(m.slowest)}</td>
                      <td className="text-right py-1.5 pl-2 font-mono text-muted-foreground">{m.samples}</td>
                    </tr>
                  ))}
                  {medians.length === 0 && <tr><td colSpan={4} className="text-center py-3 text-muted-foreground">No timing data yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      {byPlaybook.size === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">No submissions in this range yet.</Card>
      )}
    </div>
  );
}


// -------------------- ANALYTICS TAB --------------------
function AnalyticsTab() {
  const [rangeId, setRangeId] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [roleFilter, setRoleFilter] = useState("all");

  const range = RANGE_PRESETS.find((r) => r.id === rangeId);
  const from = customFrom || range?.from() || new Date().toISOString().slice(0, 10);
  const to = customTo || range?.to() || new Date().toISOString().slice(0, 10);

  const records = getRecordsInRange(from, to);
  const ctxs: RecordCtx[] = records
    .map((r) => {
      const emp = EMPLOYEES.find((e) => e.id === r.employeeId);
      const pb = getAllPlaybooks().find((p) => p.id === r.playbookId);
      if (!emp) return null;
      return { rec: r, employeeName: emp.name, role: emp.role, team: emp.team, playbookName: pb?.name || "—" };
    })
    .filter(Boolean) as RecordCtx[];

  const filtered = roleFilter === "all" ? ctxs : ctxs.filter((c) => c.role === roleFilter);
  const KPI_FIELDS = ["calls","connected","tours_done","prebook","movein","deals","revenue","screens","interviews","offers","tickets"];
  const rows = aggregate(filtered, groupBy, KPI_FIELDS);

  const roles = Array.from(new Set(EMPLOYEES.map((e) => e.role)));

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap gap-2 items-end">
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Range</div>
          <select className="h-9 rounded border bg-background px-2 text-sm" value={rangeId} onChange={(e) => { setRangeId(e.target.value); setCustomFrom(""); setCustomTo(""); }}>
            {RANGE_PRESETS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            <option value="custom">Custom…</option>
          </select>
        </div>
        {rangeId === "custom" && (
          <>
            <div><div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">From</div><Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-40" /></div>
            <div><div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">To</div><Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-40" /></div>
          </>
        )}
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Group by</div>
          <select className="h-9 rounded border bg-background px-2 text-sm" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
            {["day","week","month","quarter","user","role","team","playbook"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Role filter</div>
          <select className="h-9 rounded border bg-background px-2 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => downloadCSV(`exec-${from}-${to}`, toCSV(rows, KPI_FIELDS))}>
          <Download className="h-3 w-3 mr-1" /> CSV
        </Button>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2">Bucket</th>
              <th className="text-right px-2 py-2">Days</th>
              <th className="text-right px-2 py-2">Stages</th>
              {KPI_FIELDS.map((f) => <th key={f} className="text-right px-2 py-2 font-mono">{f}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3 + KPI_FIELDS.length} className="text-center p-6 text-muted-foreground">No data in this range.</td></tr>}
            {rows.map((r) => (
              <tr key={r.bucket} className="border-t">
                <td className="px-3 py-2 font-medium">{r.bucket}</td>
                <td className="text-right px-2 py-2 font-mono">{r.daysActive}</td>
                <td className="text-right px-2 py-2 font-mono">{r.stagesCompleted}</td>
                {KPI_FIELDS.map((f) => <td key={f} className="text-right px-2 py-2 font-mono">{r.totals[f] || 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="People active" value={String(new Set(filtered.map((c) => c.rec.employeeId)).size)} />
        <StatCard label="Total submissions" value={String(filtered.reduce((s, c) => s + Object.keys(c.rec.submissions).length, 0))} />
        <StatCard label="Days covered" value={String(new Set(filtered.map((c) => c.rec.date)).size)} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-[10px] font-mono uppercase text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-semibold">{value}</div>
    </Card>
  );
}

// -------------------- STACK & QUEUE --------------------
function StackTab() {
  const stack = useMemo(() => {
    const items: { id: string; kind: string; who: string; note: string; urgent: boolean }[] = [];
    for (const emp of EMPLOYEES) {
      const pb = resolvePlaybookFor(emp.id, () => defaultPlaybookForRole(emp.role));
      const rec = getDay(emp.id);
      if (!pb) continue;
      if (!rec) {
        items.push({ id: `nostart-${emp.id}`, kind: "Missed gate", who: emp.name, note: "Day not started", urgent: true });
      } else if (rec.stageIdx < pb.stages.length) {
        const stage = pb.stages[rec.stageIdx];
        const now = Date.now();
        const last = Object.values(rec.submissions).sort((a, b) => b.ts - a.ts)[0]?.ts || rec.startedAt || now;
        if (now - last > 90 * 60_000) {
          items.push({ id: `stale-${emp.id}`, kind: "Stalled", who: emp.name, note: `On "${stage.label}" for >90 min`, urgent: true });
        }
      }
    }
    return items;
  }, [dynVersion()]);

  const queue = useMemo(() => {
    const items: { id: string; kind: string; who: string; note: string }[] = [];
    for (const emp of EMPLOYEES) {
      const pb = resolvePlaybookFor(emp.id, () => defaultPlaybookForRole(emp.role));
      const rec = getDay(emp.id);
      if (!pb || !rec || rec.stageIdx >= pb.stages.length) continue;
      const next = pb.stages[rec.stageIdx];
      items.push({ id: `next-${emp.id}`, kind: next.label, who: emp.name, note: next.time || "scheduled" });
    }
    return items;
  }, [dynVersion()]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-4">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Stack · action needed</h3>
        <div className="space-y-2">
          {stack.length === 0 && <div className="text-sm text-muted-foreground">Nothing needs attention. Rare.</div>}
          {stack.map((s) => (
            <div key={s.id} className={`p-2 rounded border text-sm ${s.urgent ? "border-red-500/40 bg-red-500/5" : ""}`}>
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{s.kind}</Badge><span className="font-medium">{s.who}</span></div>
              <div className="text-xs text-muted-foreground mt-1">{s.note}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><ChevronRight className="h-4 w-4 text-primary" /> Queue · up next</h3>
        <div className="space-y-2">
          {queue.length === 0 && <div className="text-sm text-muted-foreground">Queue is empty.</div>}
          {queue.map((s) => (
            <div key={s.id} className="p-2 rounded border text-sm">
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{s.kind}</Badge><span className="font-medium">{s.who}</span></div>
              <div className="text-xs text-muted-foreground mt-1">{s.note}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// -------------------- CONFIG TAB --------------------
function ConfigTab() {
  const kpiKeys = getKpiKeys();
  const phases = getAllPhaseCopy();
  const allFields = getAllFields();
  const numericFields = allFields.filter((f) => ["number", "currency", "percent", "kpiChip"].includes(f.type));
  const [newKpi, setNewKpi] = useState<string>("");

  const addKpi = () => {
    if (!newKpi) return;
    if (kpiKeys.includes(newKpi)) { setNewKpi(""); return; }
    setKpiKeys([...kpiKeys, newKpi]);
    setNewKpi("");
  };
  const removeKpi = (k: string) => setKpiKeys(kpiKeys.filter((x) => x !== k));

  return (
    <div className="space-y-4">
      {/* KPI keys shown on Daily Flow */}
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-display font-semibold">KPIs shown to employees</h3>
            <p className="text-xs text-muted-foreground mt-1">
              These metrics appear on each person's Daily Flow after they submit their first stage.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={resetDailyCfg}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to defaults
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {kpiKeys.map((k) => {
            const f = allFields.find((x) => x.id === k);
            return (
              <span key={k} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs bg-muted/40">
                <span className="font-medium">{f?.label || k}</span>
                <span className="text-muted-foreground font-mono text-[10px]">{k}</span>
                <button onClick={() => removeKpi(k)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          {kpiKeys.length === 0 && <span className="text-xs text-muted-foreground">No KPIs configured. Add one below.</span>}
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded border bg-background px-2 text-sm min-w-56" value={newKpi} onChange={(e) => setNewKpi(e.target.value)}>
            <option value="">Select a field to add</option>
            {numericFields.filter((f) => !kpiKeys.includes(f.id)).map((f) => (
              <option key={f.id} value={f.id}>{f.label} ({f.id})</option>
            ))}
          </select>
          <Button size="sm" onClick={addKpi} disabled={!newKpi}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add KPI
          </Button>
        </div>
      </Card>

      {/* Phase commentary */}
      <Card className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold">Phase commentary</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Edit the title and helper text shown for each phase of the daily flow. Changes apply to every employee.
          </p>
        </div>
        <div className="space-y-3">
          {phases.map((p) => (
            <div key={p.id} className="p-3 border rounded-md space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Phase · {p.id}</div>
              <Input
                value={p.title}
                onChange={(e) => setPhaseCopy(p.id, { title: e.target.value })}
                className="h-9 text-sm"
                placeholder="Phase title"
              />
              <textarea
                value={p.hint}
                onChange={(e) => setPhaseCopy(p.id, { hint: e.target.value })}
                className="w-full min-h-16 rounded border bg-background px-2 py-1.5 text-sm resize-y"
                placeholder="Helper text shown under the phase title"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Deep links to other config surfaces */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/admin/playbooks" className="block"><Card className="p-4 hover:border-primary transition-colors">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Playbooks</div>
          <h3 className="font-display font-semibold mt-1">Playbook Builder</h3>
          <p className="text-xs text-muted-foreground mt-2">Create, edit, version and assign playbooks per role or per person.</p>
        </Card></Link>
        <Link to="/admin/playbooks" search={{ tab: "fields" }} className="block"><Card className="p-4 hover:border-primary transition-colors">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Fields</div>
          <h3 className="font-display font-semibold mt-1">Field Library</h3>
          <p className="text-xs text-muted-foreground mt-2">Add, archive, or edit any field including targets and units.</p>
        </Card></Link>
        <Link to="/admin/playbooks" search={{ tab: "assign" }} className="block"><Card className="p-4 hover:border-primary transition-colors">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Assign</div>
          <h3 className="font-display font-semibold mt-1">Per-user overrides</h3>
          <p className="text-xs text-muted-foreground mt-2">Add, hide, or require fields for any single person. Custom targets.</p>
        </Card></Link>
      </div>
    </div>
  );
}
// ---- Actively-filling live card ----
function ActivelyFillingCard() {
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const rows = EMPLOYEES.map((e) => {
    const rec = getDay(e.id, today);
    if (!rec) return null;
    const subs = Object.values(rec.submissions);
    const draftIds = rec.drafts ? Object.keys(rec.drafts) : [];
    const lastTs = Math.max(rec.startedAt || 0, ...subs.map((s) => s.ts), ...(rec.drafts ? Object.values(rec.drafts).map((d) => d.updatedAt) : []));
    const minutesSince = lastTs ? Math.round((now - lastTs) / 60_000) : Infinity;
    const status: "filling" | "recent" | "idle" =
      minutesSince <= 5 ? "filling" : minutesSince <= 60 ? "recent" : "idle";
    return { emp: e, subs: subs.length, drafts: draftIds.length, minutesSince, status, lastTs };
  }).filter(Boolean) as Array<{ emp: typeof EMPLOYEES[number]; subs: number; drafts: number; minutesSince: number; status: "filling" | "recent" | "idle"; lastTs: number }>;

  const active = rows.filter((r) => r.status !== "idle").sort((a, b) => a.minutesSince - b.minutesSince);

  if (active.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display font-semibold">Currently filling</h3>
        </div>
        <p className="text-xs text-muted-foreground">No one has activity in the last hour.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold">Currently filling</h3>
        <Badge variant="outline" className="font-mono text-[10px] ml-auto">{active.length} active</Badge>
      </div>
      <div className="space-y-1.5">
        {active.map((r) => (
          <div key={r.emp.id} className="flex items-center gap-3 text-sm">
            <span className={`h-2 w-2 rounded-full ${r.status === "filling" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="font-medium truncate flex-1"><PersonLink name={r.emp.name} /></span>
            <span className="text-xs text-muted-foreground truncate hidden md:inline">{r.emp.role}</span>
            <span className="text-[11px] font-mono text-muted-foreground">{r.subs} submitted{r.drafts > 0 ? `, ${r.drafts} draft` : ""}</span>
            <span className="text-[11px] font-mono text-muted-foreground w-16 text-right">
              {r.status === "filling" ? "now" : `${r.minutesSince}m ago`}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Weekly ledger (bank-statement view for admins) ----
function weekBoundsAdmin(anchorISO: string, offsetWeeks: number): { from: string; to: string } {
  const d = new Date(anchorISO + "T00:00:00");
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day - offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}

function WeeklyLedgerCard() {
  const kpiKeys = getKpiKeys();
  const today = new Date().toISOString().slice(0, 10);
  const tw = weekBoundsAdmin(today, 0);
  const lw = weekBoundsAdmin(today, 1);

  const sumRange = (empId: string, from: string, to: string) => {
    const out: Record<string, number> = Object.fromEntries(kpiKeys.map((k) => [k, 0]));
    const start = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      const rec = getDay(empId, iso);
      if (!rec) continue;
      for (const sub of Object.values(rec.submissions)) {
        for (const k of kpiKeys) {
          const v = Number(sub.values[k]);
          if (!isNaN(v)) out[k] += v;
        }
      }
    }
    return out;
  };

  const rows = EMPLOYEES.map((e) => {
    const t = sumRange(e.id, tw.from, tw.to);
    const l = sumRange(e.id, lw.from, lw.to);
    const tTotal = Object.values(t).reduce((a, b) => a + b, 0);
    const lTotal = Object.values(l).reduce((a, b) => a + b, 0);
    return { emp: e, thisWeek: t, lastWeek: l, tTotal, lTotal };
  }).filter((r) => r.tTotal > 0 || r.lTotal > 0)
    .sort((a, b) => b.tTotal - a.tTotal);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-display font-semibold">Weekly ledger</h3>
        <Badge variant="outline" className="font-mono text-[10px]">This week vs last week</Badge>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {tw.from} → {tw.to} vs {lw.from} → {lw.to}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No KPI activity yet in the current or previous week.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="text-left py-1.5 pr-2">Person</th>
                {kpiKeys.map((k) => (
                  <th key={k} className="text-right py-1.5 px-2 font-mono uppercase text-[10px] tracking-wider">{k}</th>
                ))}
                <th className="text-right py-1.5 pl-2 font-mono uppercase text-[10px] tracking-wider">Total Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const totalDelta = r.tTotal - r.lTotal;
                const tone = totalDelta > 0 ? "text-emerald-600" : totalDelta < 0 ? "text-rose-600" : "text-muted-foreground";
                return (
                  <tr key={r.emp.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">
                      <div className="font-medium"><PersonLink name={r.emp.name} /></div>
                      <div className="text-[10px] font-mono text-muted-foreground">{r.emp.role}</div>
                    </td>
                    {kpiKeys.map((k) => {
                      const t = r.thisWeek[k] || 0;
                      const l = r.lastWeek[k] || 0;
                      const d = t - l;
                      const dtone = d > 0 ? "text-emerald-600" : d < 0 ? "text-rose-600" : "text-muted-foreground";
                      return (
                        <td key={k} className="text-right py-1.5 px-2 font-mono tabular-nums">
                          <span className="font-semibold">{t}</span>
                          <span className="text-muted-foreground"> / {l}</span>
                          <span className={`ml-1 text-[10px] ${dtone}`}>{d > 0 ? "+" : ""}{d}</span>
                        </td>
                      );
                    })}
                    <td className={`text-right py-1.5 pl-2 font-mono font-semibold tabular-nums ${tone}`}>
                      {totalDelta > 0 ? "+" : ""}{totalDelta}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
