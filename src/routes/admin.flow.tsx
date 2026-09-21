import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLOYEES } from "@/founder/data/seed";
import {
  CORE_ROLES, BAND_META, bandFor, currentCheckpoint, CHECKPOINT_LABEL, targetAt,
  WORKING_DAYS_WEEK, WORKING_DAYS_MONTH, type CoreRole,
} from "@/founder/lib/execution/core-roles";
import { phasesFor } from "@/founder/lib/execution/core-tasks";
import { subscribeCore, coreVersion, allToday, history } from "@/founder/lib/execution/core-progress";
import { seedCoreDemo, coreRoleOf } from "@/founder/lib/execution/core-seed";
import {
  PRESENCE_META, effectiveState, fmtSince, presenceFor, presenceVersion,
  seedPresence, subscribePresence, type EffectiveState,
} from "@/founder/lib/presence-store";
import { DAYOFF_LABEL, dayOffVersion, nameOf, plansOn, subscribeDayOff, tomorrowKey } from "@/founder/lib/dayoff-store";
import { AlertTriangle, ArrowRight, ShieldAlert, TrendingUp, Users, Activity, CalendarOff, FileText } from "lucide-react";
import { ROLE_FLOWS } from "@/founder/lib/execution/role-flows";

export const Route = createFileRoute("/admin/flow")({
  head: () => ({
    meta: [
      { title: "Admin Analytics · 100X Execution Reporting" },
      { name: "description", content: "Live org-wide reporting across Control Tower, Flow Ops, Tour Conversion and Closing — who is doing what, achievement percentages, alerts and recovery plans." },
      { property: "og:title", content: "Admin Analytics · 100X Execution Reporting" },
      { property: "og:description", content: "Achievement bands, checkpoint pace, primary gaps, recovery tracking and forecasting for all four core roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAnalytics,
});

const pct = (h: number, w: number) => (w <= 0 ? 100 : Math.round((h / w) * 100));

function AdminAnalytics() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { seedCoreDemo(); seedPresence(); setHydrated(true); }, []);
  const v = useSyncExternalStore(subscribeCore, () => coreVersion(), () => 0);
  const pv = useSyncExternalStore(subscribePresence, () => presenceVersion(), () => 0);
  const dv = useSyncExternalStore(subscribeDayOff, () => dayOffVersion(), () => 0);
  const cp = currentCheckpoint();

  const data = useMemo(() => {
    void v; void pv;
    if (!hydrated) return [];
    return CORE_ROLES.map((role) => {
      const today = allToday(role.id);
      const people = EMPLOYEES.filter((e) => coreRoleOf(e.role).id === role.id).map((p) => {
        const rec = today.find((r) => r.employeeId === p.id);
        const counts = rec?.counts || {};
        const lines = role.targets.map((t) => {
          const have = counts[t.id] || 0;
          const want = targetAt(t, cp);
          return { t, have, want, pct: pct(have, want), gap: Math.max(0, want - have) };
        });
        const avg = Math.round(lines.reduce((a, l) => a + Math.min(150, l.pct), 0) / lines.length);
        const primary = [...lines].sort((a, b) => b.gap - a.gap)[0];
        const phases = phasesFor(role);
        const totalSteps = phases.flatMap((p) => p.steps).length;
        const steps = Object.keys(rec?.checks || {}).length;
        const presRec = presenceFor(p.id);
        return {
          p, lines, avg, primary, steps, totalSteps,
          recoveries: rec?.recoveries || [],
          phases,
          submissions: rec?.submissions || {},
          pres: presRec,
          eff: effectiveState(presRec) as EffectiveState,
        };
      });
      const roleAvg = people.length ? Math.round(people.reduce((a, x) => a + x.avg, 0) / people.length) : 0;
      const delivered = role.targets.map((t) => ({
        t,
        have: people.reduce((a, x) => a + (x.lines.find((l) => l.t.id === t.id)?.have || 0), 0),
        want: people.length * targetAt(t, cp),
        eodWant: people.length * t.eod,
      }));
      return { role, people, roleAvg, delivered };
    });
  }, [v, pv, cp, hydrated]);

  const everyone = data.flatMap((d) => d.people.map((x) => ({ ...x, role: d.role })));
  const floor = everyone.reduce<Record<EffectiveState, number>>(
    (acc, x) => { acc[x.eff] = (acc[x.eff] || 0) + 1; return acc; },
    { active: 0, idle: 0, away: 0, break: 0, offline: 0 },
  );
  const tk = tomorrowKey();
  const offTomorrow = hydrated ? (void dv, plansOn(tk)) : [];

  const alerts = data.flatMap((d) =>
    d.people
      .filter((x) => x.avg < 90)
      .map((x) => ({
        role: d.role, name: x.p.name, avg: x.avg,
        metric: x.primary.t.label, gap: x.primary.gap,
        severe: x.avg < 75, planned: x.recoveries.length > 0,
      })),
  ).sort((a, b) => a.avg - b.avg);

  const orgAvg = data.length ? Math.round(data.reduce((a, d) => a + d.roleAvg, 0) / data.length) : 0;
  const teamFlows = ROLE_FLOWS.filter((flow) =>
    ["TEC-BUILD", "HR-PEOPLE", "REC-HIRE"].includes(flow.roleId),
  );

  if (!hydrated) return <div className="p-6 text-sm text-muted-foreground">Loading execution reporting…</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Execution reporting</div>
          <h1 className="font-display text-2xl font-semibold">Admin analytics</h1>
          <p className="text-sm text-muted-foreground">Who is doing what, right now, across all four core roles.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono">{CHECKPOINT_LABEL[cp]}</Badge>
          <Badge variant="outline" className={BAND_META[bandFor(orgAvg)].tone}>Org {orgAvg}% · {BAND_META[bandFor(orgAvg)].label}</Badge>
          <Badge variant="outline" className={alerts.length ? "border-destructive/40 text-destructive" : ""}>{alerts.length} alerts</Badge>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-primary">Team role flows</div>
            <h2 className="font-display text-xl font-semibold">Tech, HR &amp; Recruitment</h2>
          </div>
          <Link to="/admin/flow" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            See all role flows <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {teamFlows.map((flow) => (
            <Card key={flow.roleId} className="p-4 space-y-2 border-primary/30">
              <Badge variant="outline" className="font-mono text-[10px]">{flow.roleId}</Badge>
              <div className="font-display font-semibold">{flow.roleName}</div>
              <p className="text-xs text-muted-foreground line-clamp-3">{flow.result}</p>
              <Link
                to="/admin/flow"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Open role flow <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <Card className="p-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Floor status right now</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(["active", "idle", "break", "away", "offline"] as EffectiveState[]).map((s) => (
            <div key={s} className={`rounded-md border p-3 ${PRESENCE_META[s].tone}`}>
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest">
                <span className={`h-2 w-2 rounded-full ${PRESENCE_META[s].dot}`} />{PRESENCE_META[s].label}
              </div>
              <div className="font-display text-2xl font-semibold mt-1">{floor[s] || 0}</div>
            </div>
          ))}
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <CalendarOff className="h-3 w-3" /> Off tomorrow
            </div>
            <div className="font-display text-2xl font-semibold mt-1">{offTomorrow.length}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.map(({ role, roleAvg, people, delivered }) => (
          <Card key={role.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-sm">{role.name}</div>
              <Badge variant="outline" className={BAND_META[bandFor(roleAvg)].tone}>{roleAvg}%</Badge>
            </div>
            {delivered.map((d) => (
              <div key={d.t.id}>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{d.t.label}</span><span className="font-mono">{d.have}/{d.want}</span></div>
                <Progress value={Math.min(100, pct(d.have, d.want))} className="mt-1" />
              </div>
            ))}
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {people.length} people
            </div>
            <Link to="/admin/flow" className="inline-flex items-center gap-1 text-xs text-primary">
              Open flow <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="people">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="floor">Floor &amp; planning</TabsTrigger>
          <TabsTrigger value="reports">Phase reports</TabsTrigger>
          <TabsTrigger value="alerts">Alerts &amp; recovery</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="compliance">Flow compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="space-y-5 mt-5">
          {data.map(({ role, people }) => (
            <Card key={role.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">{role.name}</div>
                <div className="text-xs text-muted-foreground">{role.finalResult}</div>
              </div>
              {people.length === 0 ? (
                <div className="text-sm text-muted-foreground">No one mapped to this role yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                        <th className="py-2">Person</th>
                        <th>Presence</th>
                        {role.targets.map((t) => <th key={t.id}>{t.label}</th>)}
                        <th>Primary gap</th><th>Steps</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...people].sort((a, b) => b.avg - a.avg).map((x) => (
                        <tr key={x.p.id} className="border-t border-border">
                          <td className="py-2">
                            <div className="font-medium">{x.p.name}</div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{x.p.team} · {x.p.zone}</div>
                          </td>
                          <td className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <span className={`h-2 w-2 rounded-full ${PRESENCE_META[x.eff].dot}`} />
                              {PRESENCE_META[x.eff].label}
                              <span className="text-muted-foreground font-mono text-[10px]">{fmtSince(x.pres.since)}</span>
                            </span>
                          </td>
                          {x.lines.map((l) => (
                            <td key={l.t.id} className="whitespace-nowrap">{l.have}<span className="text-muted-foreground">/{l.want}</span></td>
                          ))}
                          <td className="whitespace-nowrap">{x.primary.gap > 0 ? `${x.primary.gap} ${x.primary.t.label}` : "—"}</td>
                          <td className="font-mono">{x.steps}/{x.totalSteps}</td>
                          <td><Badge variant="outline" className={BAND_META[bandFor(x.avg)].tone}>{BAND_META[bandFor(x.avg)].label} · {x.avg}%</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="floor" className="space-y-5 mt-5">
          <Card className="p-5">
            <div className="flex items-center gap-2 font-medium mb-3"><Activity className="h-4 w-4 text-primary" /> Who is working, who is idle, who stepped away</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <th className="py-2">Person</th><th>Role</th><th>Presence</th><th>For</th><th>Last activity</th><th>Achievement</th>
                  </tr>
                </thead>
                <tbody>
                  {[...everyone]
                    .sort((a, b) => ["active", "idle", "break", "away", "offline"].indexOf(a.eff) - ["active", "idle", "break", "away", "offline"].indexOf(b.eff))
                    .map((x) => (
                      <tr key={x.p.id} className="border-t border-border">
                        <td className="py-2 font-medium">{x.p.name}</td>
                        <td className="text-muted-foreground">{x.role.name}</td>
                        <td>
                          <Badge variant="outline" className={PRESENCE_META[x.eff].tone}>
                            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${PRESENCE_META[x.eff].dot}`} />
                            {PRESENCE_META[x.eff].label}
                          </Badge>
                        </td>
                        <td className="font-mono text-xs">{fmtSince(x.pres.since)}</td>
                        <td className="font-mono text-xs text-muted-foreground">{fmtSince(x.pres.lastSeen)} ago</td>
                        <td><Badge variant="outline" className={BAND_META[bandFor(x.avg)].tone}>{x.avg}%</Badge></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 font-medium mb-3">
              <CalendarOff className="h-4 w-4 text-primary" /> Planned off tomorrow · {tk}
            </div>
            {offTomorrow.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Nobody has filed for tomorrow yet. The window closes 12 hours before the shift starts.
              </div>
            ) : (
              <div className="space-y-2">
                {offTomorrow.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-sm">
                    <span className="font-medium">{nameOf(p.employeeId)}</span>
                    <Badge variant="outline">{DAYOFF_LABEL[p.kind]}</Badge>
                    <span className="text-muted-foreground">{p.reason}</span>
                    <span className="ml-auto text-[11px] font-mono uppercase tracking-widest text-muted-foreground">cover: {p.coverOwner}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-5 mt-5">
          {data.map(({ role, people }) => (
            <Card key={role.id} className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 text-primary" /> {role.name} · phase reports submitted today</div>
              {people.length === 0 && <div className="text-sm text-muted-foreground">No one mapped.</div>}
              {people.map((x) => (
                <div key={x.p.id} className="border-t border-border pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{x.p.name}</span>
                    {x.phases.map((ph) => {
                      const got = !!x.submissions[ph.id];
                      return (
                        <Badge key={ph.id} variant="outline" className={got ? "border-success/40 text-success" : "border-border text-muted-foreground"}>
                          {ph.codename}{got ? " ✓" : " —"}
                        </Badge>
                      );
                    })}
                  </div>
                  {x.phases.filter((ph) => x.submissions[ph.id]).map((ph) => (
                    <div key={ph.id} className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/50 pl-3 py-1">
                      <div className="font-mono uppercase tracking-widest">{ph.codename} · {new Date(x.submissions[ph.id]!.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      {ph.report.map((fl) => {
                        const val = x.submissions[ph.id]!.values[fl.id];
                        return val ? <div key={fl.id}>• {fl.label}: <span className="text-foreground">{val}</span></div> : null;
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-5">
          {alerts.length === 0 ? (
            <Card className="p-5 text-sm text-success">Everyone is at or above 90% of checkpoint pace. No alerts.</Card>
          ) : alerts.map((a, i) => (
            <Card key={i} className={`p-4 flex flex-wrap items-center gap-3 ${a.severe ? "border-destructive/50 bg-destructive/5" : "border-warning/50 bg-warning/5"}`}>
              {a.severe ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{a.name} · {a.role.name}</div>
                <div className="text-xs text-muted-foreground">
                  {a.severe ? "Missed" : "At Risk"} at {a.avg}% of {CHECKPOINT_LABEL[cp]} pace · gap {a.gap} {a.metric} · recovery plan due within 15 minutes.
                </div>
              </div>
              <Badge variant="outline" className={a.planned ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}>
                {a.planned ? "Plan submitted" : "Plan pending"}
              </Badge>
            </Card>
          ))}
          <Card className="p-5 text-xs text-muted-foreground">
            Two daily misses trigger coaching and an execution audit. Three misses trigger Performance Enforcer review. EOD cannot close without evidence or an approved recovery plan. False evidence places the incentive on hold immediately.
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-5 mt-5">
          {CORE_ROLES.map((role) => <Forecast key={role.id} role={role} />)}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-5 mt-5">
          {data.map(({ role, people }) => (
            <Card key={role.id} className="p-5">
              <div className="flex items-center gap-2 font-medium mb-3"><Activity className="h-4 w-4 text-primary" /> {role.name} · checklist compliance today</div>
              <div className="space-y-2">
                {people.map((x) => (
                  <div key={x.p.id}>
                    <div className="flex justify-between text-sm"><span>{x.p.name}</span><span className="font-mono">{x.steps}/{x.totalSteps}</span></div>
                    <Progress value={pct(x.steps, x.totalSteps)} className="mt-1" />
                  </div>
                ))}
                {people.length === 0 && <div className="text-sm text-muted-foreground">No one mapped.</div>}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Forecast({ role }: { role: CoreRole }) {
  const v = useSyncExternalStore(subscribeCore, () => coreVersion(), () => 0);
  const people = EMPLOYEES.filter((e) => coreRoleOf(e.role).id === role.id);
  const rows = useMemo(() => {
    void v;
    return role.targets.map((t) => {
      let week = 0;
      for (const p of people) {
        const days = history(p.id, role.id, WORKING_DAYS_WEEK);
        week += days.reduce((a, d) => a + (d.counts[t.id] || 0), 0);
      }
      const capacityWeek = people.length * t.weekly;
      const perDay = week / WORKING_DAYS_WEEK;
      const monthForecast = Math.round(perDay * WORKING_DAYS_MONTH);
      const capacityMonth = people.length * t.monthly;
      return { t, week, capacityWeek, monthForecast, capacityMonth, perDay };
    });
  }, [role, people, v]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{role.name}</div>
        <Badge variant="outline">{people.length} people</Badge>
      </div>
      {rows.map((r) => (
        <div key={r.t.id} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{r.t.label} · weekly</span>
            <span className="font-mono">{r.week} / {r.capacityWeek}</span>
          </div>
          <Progress value={Math.min(100, pct(r.week, r.capacityWeek))} />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{r.t.label} · monthly forecast</span>
            <span className="font-mono">{r.monthForecast} / {r.capacityMonth}</span>
          </div>
          <Progress value={Math.min(100, pct(r.monthForecast, r.capacityMonth))} />
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Team pace {r.perDay.toFixed(1)}/day vs {people.length * r.t.eod}/day required
          </div>
        </div>
      ))}
    </Card>
  );
}
