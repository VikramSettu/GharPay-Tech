import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { PersonLink } from "@/founder/components/admin/PersonLink";
import { Download, ShieldCheck, Trash2, ChevronDown, ChevronRight, Search } from "lucide-react";
import { RoleGate } from "@/founder/components/RoleGate";
import { Avatar } from "@/founder/components/Avatar";
import { useAttendanceState } from "@/founder/hooks/useAttendance";
import { EMPLOYEES } from "@/founder/data/seed";
import { PLAYBOOK_BY_OWNER, PLAYBOOKS, playbookFor, type PlaybookKey } from "@/founder/data/playbooks";
import { useAllConsoleState, deleteConsoleDay, type DayState } from "@/founder/lib/console-store";

export const Route = createFileRoute("/admin/console")({
  component: () => (
    <RoleGate allow={["leadership", "hr"]}>
      <AdminConsole />
    </RoleGate>
  ),
});

type Row = {
  actorId: string;
  actorName: string;
  role: string;
  team: string;
  date: string;
  playbookKey: PlaybookKey | null;
  playbookTitle: string;
  day: DayState;
  score: number;
  kpiHit: number;
  kpiTotal: number;
  sprintsDone: number;
  sprintsTotal: number;
  windowsSent: number;
  windowsTotal: number;
  eodFilled: number;
  eodTotal: number;
  decisions: number;
};

function computeRow(day: DayState): Row | null {
  const emp = EMPLOYEES.find((e) => e.id === day.actorId);
  if (!emp) return null;
  const key = PLAYBOOK_BY_OWNER[day.actorId] ?? null;
  const pb = key ? PLAYBOOKS[key] : undefined;
  if (!pb) {
    return {
      actorId: day.actorId, actorName: emp.name, role: emp.role, team: emp.team,
      date: day.date, playbookKey: null, playbookTitle: "—", day,
      score: 0, kpiHit: 0, kpiTotal: 0,
      sprintsDone: Object.values(day.sprints).filter(Boolean).length, sprintsTotal: 0,
      windowsSent: Object.keys(day.windowsSent).length, windowsTotal: 0,
      eodFilled: Object.values(day.eod).filter((v) => (v ?? "").trim().length > 0).length,
      eodTotal: 0, decisions: day.decisions.length,
    };
  }
  let hit = 0;
  pb.kpis.forEach((k) => {
    const v = day.kpis[k.id] ?? 0;
    if (k.kind === "boolean") { if (v >= 1) hit++; }
    else if (v >= k.target) hit++;
  });
  const sprintsDone = pb.sprints.filter((s) => day.sprints[s.id]).length;
  const windowsSent = pb.commWindows.filter((w) => day.windowsSent[w.id]).length;
  const eodFilled = pb.eodFields.filter((f) => ((day.eod[f.id] ?? "").trim().length > 0)).length;
  const score = Math.round((hit / pb.kpis.length) * 100);
  return {
    actorId: day.actorId, actorName: emp.name, role: emp.role, team: emp.team,
    date: day.date, playbookKey: key, playbookTitle: pb.title, day,
    score, kpiHit: hit, kpiTotal: pb.kpis.length,
    sprintsDone, sprintsTotal: pb.sprints.length,
    windowsSent, windowsTotal: pb.commWindows.length,
    eodFilled, eodTotal: pb.eodFields.length,
    decisions: day.decisions.length,
  };
}

function AdminConsole() {
  const { actor } = useAttendanceState();
  const state = useAllConsoleState();

  const [q, setQ] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [playbookFilter, setPlaybookFilter] = useState<"all" | PlaybookKey>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [status, setStatus] = useState<"all" | "onfire" | "ontrack" | "behind" | "red" | "notstarted">("all");
  const [eodOnly, setEodOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "score" | "actor" | "sprints" | "kpis">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const raw = state.days.map(computeRow).filter(Boolean) as Row[];
    let out = raw;
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((r) => r.actorName.toLowerCase().includes(s) || r.role.toLowerCase().includes(s) || r.team.toLowerCase().includes(s) || r.playbookTitle.toLowerCase().includes(s));
    }
    if (actorFilter !== "all") out = out.filter((r) => r.actorId === actorFilter);
    if (playbookFilter !== "all") out = out.filter((r) => r.playbookKey === playbookFilter);
    if (from) out = out.filter((r) => r.date >= from);
    if (to) out = out.filter((r) => r.date <= to);
    if (minScore > 0) out = out.filter((r) => r.score >= minScore);
    if (status !== "all") {
      out = out.filter((r) => {
        if (status === "onfire") return r.score >= 90;
        if (status === "ontrack") return r.score >= 70 && r.score < 90;
        if (status === "behind") return r.score >= 40 && r.score < 70;
        if (status === "red") return r.score > 0 && r.score < 40;
        if (status === "notstarted") return r.score === 0 && r.sprintsDone === 0;
        return true;
      });
    }
    if (eodOnly) out = out.filter((r) => r.eodFilled === r.eodTotal && r.eodTotal > 0);

    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      if (sortBy === "date") return a.date.localeCompare(b.date) * dir;
      if (sortBy === "score") return (a.score - b.score) * dir;
      if (sortBy === "actor") return a.actorName.localeCompare(b.actorName) * dir;
      if (sortBy === "sprints") return (a.sprintsDone - b.sprintsDone) * dir;
      if (sortBy === "kpis") return (a.kpiHit - b.kpiHit) * dir;
      return 0;
    });
    return out;
  }, [state.days, q, actorFilter, playbookFilter, from, to, minScore, status, eodOnly, sortBy, sortDir]);

  const stats = useMemo(() => {
    const total = rows.length;
    const avg = total ? Math.round(rows.reduce((s, r) => s + r.score, 0) / total) : 0;
    const onfire = rows.filter((r) => r.score >= 90).length;
    const red = rows.filter((r) => r.score > 0 && r.score < 40).length;
    const notStarted = rows.filter((r) => r.score === 0 && r.sprintsDone === 0).length;
    return { total, avg, onfire, red, notStarted };
  }, [rows]);

  const employeesWithPlaybook = EMPLOYEES.filter((e) => playbookFor(e.id));

  function exportCsv() {
    const header = [
      "Date", "Actor", "Role", "Team", "Playbook", "Score%", "KPI Hit", "KPI Total",
      "Sprints Done", "Sprints Total", "Windows Sent", "Windows Total",
      "EOD Filled", "EOD Total", "Decisions",
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push([
        r.date, `"${r.actorName}"`, `"${r.role}"`, `"${r.team}"`, `"${r.playbookTitle}"`,
        r.score, r.kpiHit, r.kpiTotal, r.sprintsDone, r.sprintsTotal,
        r.windowsSent, r.windowsTotal, r.eodFilled, r.eodTotal, r.decisions,
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `console-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function statusColor(score: number, sprintsDone: number) {
    if (score === 0 && sprintsDone === 0) return "bg-muted text-muted-foreground";
    if (score >= 90) return "bg-success/20 text-success border border-success/30";
    if (score >= 70) return "bg-primary/20 text-primary border border-primary/30";
    if (score >= 40) return "bg-warning/20 text-warning border border-warning/30";
    return "bg-destructive/20 text-destructive border border-destructive/30";
  }
  function statusLabel(score: number, sprintsDone: number) {
    if (score === 0 && sprintsDone === 0) return "Not started";
    if (score >= 90) return "On fire";
    if (score >= 70) return "On track";
    if (score >= 40) return "Behind";
    return "Red zone";
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Admin — Operator Console
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Every day. Every operator. One table.</h1>
          <p className="text-sm text-muted-foreground mt-1">Signed in as <span className="text-foreground font-medium">{actor.name}</span> · admin view of all console submissions.</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Download className="h-4 w-4" /> Export CSV ({rows.length})
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: "Days shown", v: stats.total },
          { l: "Avg score", v: `${stats.avg}%` },
          { l: "On fire", v: stats.onfire, tone: "text-success" },
          { l: "Red zone", v: stats.red, tone: "text-destructive" },
          { l: "Not started", v: stats.notStarted, tone: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.l} className="rounded-lg bg-card border border-border p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
            <div className={`font-display text-2xl font-semibold mt-1 ${s.tone ?? ""}`}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-card border border-border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Search</label>
            <div className="relative mt-1">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, role, team, playbook…"
                className="w-full h-9 pl-8 pr-3 rounded-md bg-background border border-border text-sm" />
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Actor</label>
            <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="w-full h-9 mt-1 px-2 rounded-md bg-background border border-border text-sm">
              <option value="all">All operators</option>
              {employeesWithPlaybook.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Playbook</label>
            <select value={playbookFilter} onChange={(e) => setPlaybookFilter(e.target.value as PlaybookKey | "all")} className="w-full h-9 mt-1 px-2 rounded-md bg-background border border-border text-sm">
              <option value="all">All playbooks</option>
              {(Object.keys(PLAYBOOKS) as PlaybookKey[]).map((k) => <option key={k} value={k}>{PLAYBOOKS[k].title}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full h-9 mt-1 px-2 rounded-md bg-background border border-border text-sm" />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full h-9 mt-1 px-2 rounded-md bg-background border border-border text-sm" />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Min score %</label>
            <input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value) || 0)} className="w-full h-9 mt-1 px-2 rounded-md bg-background border border-border text-sm" />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-full h-9 mt-1 px-2 rounded-md bg-background border border-border text-sm">
              <option value="all">All</option>
              <option value="onfire">On fire (≥90)</option>
              <option value="ontrack">On track (70–89)</option>
              <option value="behind">Behind (40–69)</option>
              <option value="red">Red zone (&lt;40)</option>
              <option value="notstarted">Not started</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer h-9">
              <input type="checkbox" checked={eodOnly} onChange={(e) => setEodOnly(e.target.checked)} className="rounded" />
              EOD complete only
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Sort by</span>
          {(["date", "score", "actor", "sprints", "kpis"] as const).map((k) => (
            <button key={k} onClick={() => { if (sortBy === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(k); setSortDir("desc"); } }}
              className={`h-7 px-2.5 rounded text-xs font-medium ${sortBy === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {k}{sortBy === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </button>
          ))}
          <button onClick={() => { setQ(""); setActorFilter("all"); setPlaybookFilter("all"); setFrom(""); setTo(""); setMinScore(0); setStatus("all"); setEodOnly(false); }}
            className="h-7 px-2.5 rounded text-xs font-medium bg-secondary text-muted-foreground ml-auto">
            Reset filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Operator</th>
                <th className="px-3 py-2">Playbook</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">KPIs</th>
                <th className="px-3 py-2">Sprints</th>
                <th className="px-3 py-2">Windows</th>
                <th className="px-3 py-2">EOD</th>
                <th className="px-3 py-2">Decisions</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={12} className="px-3 py-16 text-center text-sm text-muted-foreground">
                  No console entries match. When operators fill their /console, rows appear here.
                </td></tr>
              )}
              {rows.map((r) => {
                const key = `${r.actorId}:${r.date}`;
                const isOpen = expanded === key;
                return (
                  <Fragment key={key}>
                    <tr className="border-t border-border hover:bg-secondary/30">
                      <td className="px-3 py-2">
                        <button onClick={() => setExpanded(isOpen ? null : key)} className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-secondary">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.date}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar id={r.actorId} size={24} />
                          <div>
                            <div className="font-medium leading-tight"><PersonLink name={r.actorName} /></div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{r.role} · {r.team}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">{r.playbookTitle}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest ${statusColor(r.score, r.sprintsDone)}`}>
                          {statusLabel(r.score, r.sprintsDone)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold">{r.score}%</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.kpiHit}/{r.kpiTotal}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.sprintsDone}/{r.sprintsTotal}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.windowsSent}/{r.windowsTotal}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.eodFilled}/{r.eodTotal}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.decisions}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => { if (confirm(`Delete ${r.actorName}'s ${r.date} entry?`)) deleteConsoleDay(r.actorId, r.date); }}
                          className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete entry">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {isOpen && <ExpandedRow r={r} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ExpandedRow({ r }: { r: Row }) {
  const pb = r.playbookKey ? PLAYBOOKS[r.playbookKey] : null;
  return (
    <tr className="bg-background/50 border-t border-border">
      <td colSpan={12} className="px-6 py-4">
        {!pb ? (
          <div className="text-sm text-muted-foreground">No playbook mapped for this operator.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">KPIs</div>
              <div className="space-y-1.5">
                {pb.kpis.map((k) => {
                  const v = r.day.kpis[k.id] ?? 0;
                  const hit = k.kind === "boolean" ? v >= 1 : v >= k.target;
                  return (
                    <div key={k.id} className="flex items-center justify-between text-xs">
                      <span className="truncate pr-2">{k.label}</span>
                      <span className={`font-mono ${hit ? "text-success" : "text-muted-foreground"}`}>{v}/{k.target}{k.kind === "percent" ? "%" : ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Sprints & Windows</div>
              <div className="space-y-1.5 text-xs">
                {pb.sprints.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${r.day.sprints[s.id] ? "bg-success" : "bg-muted-foreground/30"}`} />
                    <span className="truncate">{s.name}</span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-border" />
                {pb.commWindows.map((w) => (
                  <div key={w.id} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${r.day.windowsSent[w.id] ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    <span className="truncate">{w.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">EOD Report</div>
              <div className="space-y-1.5 text-xs">
                {pb.eodFields.map((f) => (
                  <div key={f.id}>
                    <div className="text-muted-foreground">{f.label}</div>
                    <div className="font-medium">{r.day.eod[f.id] || <span className="text-muted-foreground">—</span>}</div>
                  </div>
                ))}
              </div>
              {r.day.decisions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Hard decisions</div>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    {r.day.decisions.map((d) => <li key={d.id}>{d.text}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
