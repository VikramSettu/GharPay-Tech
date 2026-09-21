import { useMemo, useState } from "react";
import {
  useProductivity, rollupByPerson, rollupByLead, productivityScore,
  fmtDuration, isSameDay, TARGET_SEC, SessionKind, dayBreakdown, IDLE_AFTER_SEC,
} from "@/lib/productivity/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Timer, Users, Target, AlertTriangle, Gauge, Coffee } from "lucide-react";

type Range = "today" | "7d" | "all";

const KIND_LABEL: Record<SessionKind, string> = {
  drawer: "Lead drawer",
  claim: "Claim flow",
  call: "Call",
  followup: "Follow-up",
};

export function ProductivityBoard() {
  const sessions = useProductivity((s) => s.sessions);
  const pages = useProductivity((s) => s.pages);
  const marks = useProductivity((s) => s.marks);
  const clear = useProductivity((s) => s.clear);
  const [range, setRange] = useState<Range>("today");

  const inRange = (iso: string) => {
    if (range === "all") return true;
    if (range === "today") return isSameDay(iso, new Date());
    return Date.parse(iso) >= Date.now() - 7 * 86_400_000;
  };

  const scoped = useMemo(() => sessions.filter((s) => inRange(s.startedAt)), [sessions, range]);
  const scopedPages = useMemo(() => pages.filter((p) => inRange(p.lastAt)), [pages, range]);
  const scopedMarks = useMemo(() => marks.filter((m) => inRange(m.lastActionAt)), [marks, range]);

  const people = useMemo(() => rollupByPerson(scoped), [scoped]);
  const leads = useMemo(() => rollupByLead(scoped), [scoped]);
  const days = useMemo(
    () => dayBreakdown(scoped, scopedPages, scopedMarks),
    [scoped, scopedPages, scopedMarks],
  );

  const totalSec = scoped.reduce((a, s) => a + s.durationSec, 0);
  const over = scoped.filter((s) => s.overTarget).length;
  const uniqueLeads = new Set(scoped.map((s) => s.leadId)).size;
  const avg = scoped.length ? Math.round(totalSec / scoped.length) : 0;
  const idleTotal = scopedPages.reduce((a, p) => a + p.idleSec, 0);


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-display font-semibold">
            <Timer className="h-5 w-5 text-primary" /> Productivity
          </h1>
          <p className="text-sm text-muted-foreground">
            Every lead drawer, claim and call is timed against a {TARGET_SEC}s target — see where the day went.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(["today", "7d", "all"] as Range[]).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setRange(r)}>
              {r === "today" ? "Today" : r === "7d" ? "Last 7 days" : "All time"}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground" onClick={clear}>Reset</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Kpi icon={<Timer className="h-3 w-3" />} label="Time on leads" value={fmtDuration(totalSec)} />
        <Kpi icon={<Coffee className="h-3 w-3" />} label="Idle time" value={fmtDuration(idleTotal)} accent={idleTotal > totalSec ? "red" : idleTotal ? "amber" : "green"} />
        <Kpi icon={<Target className="h-3 w-3" />} label="Leads touched" value={String(uniqueLeads)} />
        <Kpi icon={<Gauge className="h-3 w-3" />} label="Avg per session" value={fmtDuration(avg)} accent={avg > TARGET_SEC ? "red" : "green"} />
        <Kpi icon={<AlertTriangle className="h-3 w-3" />} label={`Over ${TARGET_SEC}s`} value={`${over}/${scoped.length}`} accent={over ? "amber" : "green"} />
      </div>

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day"><Coffee className="mr-1 h-3.5 w-3.5" />Where the day went</TabsTrigger>
          <TabsTrigger value="people"><Users className="mr-1 h-3.5 w-3.5" />People</TabsTrigger>
          <TabsTrigger value="leads">Per lead</TabsTrigger>
          <TabsTrigger value="log">Session log</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-3 space-y-2">
          {days.length === 0 && <Empty />}
          {days.map((d) => {
            const bars = [
              { key: "lead", label: "On leads", sec: d.leadSec, cls: "bg-primary" },
              { key: "other", label: "Other CRM pages", sec: d.otherSec, cls: "bg-accent" },
              { key: "idle", label: `Idle (>${IDLE_AFTER_SEC}s no input)`, sec: d.idleSec, cls: "bg-muted-foreground/50" },
              { key: "away", label: "Away / app closed", sec: d.unaccountedSec, cls: "bg-destructive/60" },
            ];
            const denom = Math.max(1, bars.reduce((a, b) => a + b.sec, 0));
            const t = (iso?: string) =>
              iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
            return (
              <div key={d.actorId} className="rounded-xl border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{d.actorName}</div>
                  <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    Started {t(d.firstActionAt)} · Last action {t(d.lastActionAt)} · Span {fmtDuration(d.spanSec)}
                  </div>
                </div>

                <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-muted">
                  {bars.map((b) => b.sec > 0 && (
                    <div key={b.key} className={cn("h-full", b.cls)} style={{ width: `${(b.sec / denom) * 100}%` }} title={`${b.label} · ${fmtDuration(b.sec)}`} />
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] md:grid-cols-4">
                  {bars.map((b) => (
                    <span key={b.key} className="flex items-center gap-1.5 text-muted-foreground">
                      <span className={cn("h-2 w-2 rounded-full", b.cls)} />
                      {b.label} <span className="font-mono tabular-nums text-foreground">{fmtDuration(b.sec)}</span>
                    </span>
                  ))}
                </div>

                {d.pages.length > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Page by page</div>
                    {d.pages.slice(0, 8).map((p) => (
                      <div key={p.path} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="min-w-0 flex-1 truncate">{p.label}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {fmtDuration(p.activeSec)} active
                          {p.idleSec > 0 && <span className="text-destructive"> · {fmtDuration(p.idleSec)} idle</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>


        <TabsContent value="people" className="mt-3 space-y-2">
          {people.length === 0 && <Empty />}
          {people.map((p) => {
            const v = productivityScore(p);
            return (
              <div key={p.actorId} className="rounded-xl border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{p.actorName}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={v.score >= 70 ? "default" : v.score >= 45 ? "secondary" : "destructive"} className="text-[10px]">
                      {v.verdict} · {v.score}
                    </Badge>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{fmtDuration(p.totalSec)}</span>
                  </div>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground md:grid-cols-4">
                  <span>{p.leads} leads · {p.sessions} sessions</span>
                  <span>Avg {fmtDuration(p.avgSec)}</span>
                  <span className={cn(p.overTarget && "text-destructive")}>{p.overTarget} over target</span>
                  <span>Drawer {fmtDuration(p.byKind.drawer)} · Calls {fmtDuration(p.byKind.call + p.byKind.claim)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full", v.score >= 70 ? "bg-primary" : v.score >= 45 ? "bg-accent" : "bg-destructive")} style={{ width: `${v.score}%` }} />
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="leads" className="mt-3 space-y-1.5">
          {leads.length === 0 && <Empty />}
          {leads.map((l) => (
            <div key={l.leadId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{l.leadName || l.leadId}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {l.people.join(", ")} · {l.sessions} session{l.sessions === 1 ? "" : "s"}
                  {l.outcomes.length ? ` · ${l.outcomes[l.outcomes.length - 1]}` : ""}
                </div>
              </div>
              <span className={cn("font-mono text-xs tabular-nums", l.totalSec > TARGET_SEC * l.sessions ? "text-destructive" : "text-muted-foreground")}>
                {fmtDuration(l.totalSec)}
              </span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="log" className="mt-3 space-y-1">
          {scoped.length === 0 && <Empty />}
          {scoped.slice(0, 200).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 text-[11px]">
              <span className="w-16 shrink-0 font-mono text-muted-foreground">
                {new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="w-24 shrink-0 truncate">{s.actorName}</span>
              <span className="min-w-0 flex-1 truncate">{KIND_LABEL[s.kind]} · {s.leadName || s.leadId}</span>
              <span className={cn("shrink-0 font-mono tabular-nums", s.overTarget ? "text-destructive" : "text-muted-foreground")}>
                {fmtDuration(s.durationSec)}
              </span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: "green" | "amber" | "red" }) {
  return (
    <div className="rounded-xl border bg-card p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className={cn(
        "mt-0.5 text-xl font-bold tabular-nums",
        accent === "green" && "text-primary",
        accent === "amber" && "text-accent",
        accent === "red" && "text-destructive",
      )}>{value}</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      No timed sessions yet — open a lead drawer or start a claim and the clock starts automatically.
    </div>
  );
}
