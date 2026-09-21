import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/tower/RoleGate";
import { useTowerAuth } from "@/lib/tower/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildSnapshot, pct, STATUS_DOT, STATUS_TEXT, TEAM_TARGETS,
  type Assignment, type Breach, type Lead, type Profile, type Review, type Snapshot, type Timeline,
} from "@/lib/tower/analytics";
import { TEAM_LABEL, DAILY_TARGET } from "@/lib/tower/review-os";

export const Route = createFileRoute("/tower/analytics")({
  component: () => <RoleGate module="analytics"><Analytics /></RoleGate>,
  head: () => ({
    meta: [
      { title: "100x Analytics — Gharpayy Control Tower" },
      { name: "description", content: "One interconnected view: lead flow, SLA, chat and call reviews, feedback closure and the 14 Control Tower checkpoints, person by person." },
      { property: "og:title", content: "100x Analytics — Gharpayy Control Tower" },
      { property: "og:description", content: "Lead edit to lead feedback in one screen: coverage, quality, SLA and checkpoint RAG for every team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Analytics() {
  const auth = useTowerAuth();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [l, a, r, t, b, p] = await Promise.all([
        supabase.from("leads").select("*").limit(2000),
        supabase.from("assignments").select("*").order("assigned_at", { ascending: false }).limit(2000),
        supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(2000),
        supabase.from("lead_timeline").select("*").order("at", { ascending: false }).limit(3000),
        supabase.from("sla_breaches").select("*").limit(2000),
        supabase.from("profiles").select("user_id, full_name, team, performer_category"),
      ]);
      if (!alive) return;
      const profiles = (p.data ?? []) as Profile[];
      setNames(Object.fromEntries(profiles.map((x) => [x.user_id, x.full_name ?? "Member"])));
      setSnap(buildSnapshot({
        leads: (l.data ?? []) as Lead[],
        assignments: (a.data ?? []) as Assignment[],
        reviews: (r.data ?? []) as Review[],
        timeline: (t.data ?? []) as Timeline[],
        breaches: (b.data ?? []) as Breach[],
        profiles,
        now: Date.now(),
      }));
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("analytics-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  const me = useMemo(
    () => snap?.people.find((x) => x.profile.user_id === auth.user?.id) ?? null,
    [snap, auth.user],
  );

  if (loading || !snap) return <div className="text-sm text-muted-foreground p-6">Building the interconnected view…</div>;

  const green = snap.checkpoints.filter((c) => c.status === "green").length;
  const red = snap.checkpoints.filter((c) => c.status === "red").length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">100x Analytics</h1>
          <p className="text-sm text-muted-foreground">
            One screen from lead edit to lead feedback — flow, SLA, chat &amp; call quality and the 14 checkpoints, live.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/tower/review"><Button size="sm" variant="outline">Review OS</Button></Link>
          <Link to="/tower/quality"><Button size="sm" variant="outline">Quality Pulse</Button></Link>
          <Link to="/tower/eod"><Button size="sm" variant="outline">EOD</Button></Link>
        </div>
      </div>

      {/* Top interconnected KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="24h review coverage" value={`${snap.coverage}%`} hint={`${snap.assigned24.length} leads assigned`} tone={snap.coverage >= 80 ? "green" : snap.coverage >= 50 ? "amber" : "red"} />
        <Kpi label="Checkpoints green" value={`${green}/14`} hint={`${red} red`} tone={red === 0 ? "green" : red <= 2 ? "amber" : "red"} />
        <Kpi label="Loops open" value={snap.loopHealth.open} hint={`${snap.loopHealth.overdue} overdue`} tone={snap.loopHealth.overdue ? "red" : "green"} />
        <Kpi label="Median closure" value={`${snap.loopHealth.medianHours}h`} hint="target ≤ 24h" tone={snap.loopHealth.medianHours <= 24 ? "green" : "amber"} />
        <Kpi label="Reviews in 24h" value={snap.reviews24.length} hint={`${snap.people.filter((p) => p.reviewsToday > 0).length} people covered`} />
        <Kpi label="Critical errors" value={snap.people.reduce((s, p) => s + p.critical, 0)} tone={snap.people.some((p) => p.critical) ? "red" : "green"} />
      </div>

      {me && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold">Your 100x card — {me.profile.full_name ?? "You"}</div>
            <Badge variant="outline">{me.team ? TEAM_LABEL[me.team] : "No team"}</Badge>
            <span className={`text-sm font-bold ${STATUS_TEXT[me.status]}`}>Health {me.healthScore}</span>
            <span className="text-xs text-muted-foreground">
              {me.assigned24} leads in 24h · {me.chatsToday}/{DAILY_TARGET.chat} chats · {me.callsToday}/{DAILY_TARGET.call} calls · avg {me.avgScore || "—"} · {me.openLoops} open loop{me.openLoops === 1 ? "" : "s"}
            </span>
            <Link to="/tower/feedback" className="ml-auto"><Button size="sm">Open my feedback</Button></Link>
          </div>
        </Card>
      )}

      <Tabs defaultValue="checkpoints">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="checkpoints">14 Checkpoints</TabsTrigger>
          <TabsTrigger value="people">Person 360</TabsTrigger>
          <TabsTrigger value="teams">Teams &amp; targets</TabsTrigger>
          <TabsTrigger value="funnel">Lead → feedback funnel</TabsTrigger>
          <TabsTrigger value="loops">Open loops</TabsTrigger>
        </TabsList>

        <TabsContent value="checkpoints" className="pt-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {snap.checkpoints.map((c) => (
              <Card key={c.id} className="p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[c.status]}`} />
                  <span className="text-xs font-mono text-muted-foreground">{c.id}</span>
                  <span className="text-sm font-semibold">{c.title}</span>
                  <span className={`ml-auto text-xs font-medium ${STATUS_TEXT[c.status]}`}>{c.actual}</span>
                </div>
                <div className="text-xs text-muted-foreground">{c.pass}</div>
                <div className="text-[11px] text-muted-foreground">
                  {c.status === "green" ? c.detail : <span className="text-amber-600">Red trigger: {c.redTrigger}</span>}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="people" className="pt-3">
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  {["Person", "Team", "Leads 24h", "Accepted", "First action", "Chats", "Calls", "Coverage", "Avg score", "Open loops", "SLA", "Health", ""].map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...snap.people].sort((a, b) => b.healthScore - a.healthScore).map((p) => (
                  <tr key={p.profile.user_id} className="border-t">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{p.profile.full_name ?? "Member"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{p.team ? TEAM_LABEL[p.team] : "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{p.assigned24}</td>
                    <td className="px-3 py-2 tabular-nums">{p.accepted24} <span className="text-xs text-muted-foreground">({p.acceptRate}%)</span></td>
                    <td className="px-3 py-2 tabular-nums">{p.firstAction24} <span className="text-xs text-muted-foreground">({p.actionRate}%)</span></td>
                    <td className={`px-3 py-2 tabular-nums ${p.chatsToday >= DAILY_TARGET.chat ? "text-emerald-600" : "text-amber-600"}`}>{p.chatsToday}/{DAILY_TARGET.chat}</td>
                    <td className={`px-3 py-2 tabular-nums ${p.callsToday >= DAILY_TARGET.call ? "text-emerald-600" : "text-amber-600"}`}>{p.callsToday}/{DAILY_TARGET.call}</td>
                    <td className="px-3 py-2 tabular-nums">{p.coverage}%</td>
                    <td className="px-3 py-2 tabular-nums">{p.avgScore || "—"}</td>
                    <td className={`px-3 py-2 tabular-nums ${p.overdueLoops ? "text-red-500 font-semibold" : ""}`}>{p.openLoops}{p.overdueLoops ? ` (${p.overdueLoops} late)` : ""}</td>
                    <td className={`px-3 py-2 tabular-nums ${p.breaches ? "text-red-500" : ""}`}>{p.breaches}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${STATUS_TEXT[p.status]}`}>
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[p.status]}`} />{p.healthScore}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link to="/tower/review" search={{ reviewee: p.profile.user_id } as never} className="text-xs underline">Review</Link>
                    </td>
                  </tr>
                ))}
                {snap.people.length === 0 && <tr><td colSpan={13} className="px-3 py-4 text-sm text-muted-foreground">No team members yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-3 pt-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {snap.teams.filter((t) => t.people > 0).map((t) => (
              <Card key={t.team} className="p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[t.status]}`} />
                  <span className="font-semibold text-sm">{t.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{t.people} people</span>
                </div>
                <div className="text-xs text-muted-foreground">{t.assigned24} leads in 24h · {t.reviews24} reviews · {t.openLoops} open loops · {t.breaches} SLA</div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] w-16 text-muted-foreground">Coverage</span>
                  <Progress value={t.coverage} className="h-2 flex-1" />
                  <span className="text-xs w-10 text-right tabular-nums">{t.coverage}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] w-16 text-muted-foreground">Avg score</span>
                  <Progress value={t.avgScore} className="h-2 flex-1" />
                  <span className="text-xs w-10 text-right tabular-nums">{t.avgScore}</span>
                </div>
              </Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {TEAM_TARGETS.map((t) => (
              <Card key={t.team} className="p-3 space-y-1">
                <div className="font-semibold text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground">Final result owned: {t.finalResult}</div>
                <ul className="text-xs space-y-0.5 mt-1">
                  <li><Badge variant="outline" className="font-mono text-[10px] mr-2">1 PM</Badge>{t.phase1}</li>
                  <li><Badge variant="outline" className="font-mono text-[10px] mr-2">5 PM</Badge>{t.phase2}</li>
                  <li><Badge variant="outline" className="font-mono text-[10px] mr-2">EOD</Badge>{t.eod}</li>
                  <li className="text-muted-foreground pt-0.5">Monthly: {t.monthly}</li>
                </ul>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="pt-3">
          <Card className="p-4 space-y-3">
            <div className="font-semibold text-sm">Lead edit → lead feedback, end to end</div>
            {snap.funnel.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-48 text-xs">{f.label}</span>
                <Progress value={pct(f.value, f.of)} className="h-2.5 flex-1" />
                <span className="text-xs w-24 text-right tabular-nums">{f.value} ({pct(f.value, f.of)}%)</span>
              </div>
            ))}
            <div className="text-[11px] text-muted-foreground">
              A lead is only &quot;done&quot; when its review loop is closed — the last bar is the real number.
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="loops" className="pt-3">
          <Card className="p-4 space-y-2">
            <div className="font-semibold text-sm">Every open loop, oldest first</div>
            {snap.people.flatMap((p) => (p.openLoops ? [p] : [])).length === 0 && (
              <div className="text-sm text-muted-foreground">Every loop is closed. Zero lead left behind.</div>
            )}
            {[...snap.people].filter((p) => p.openLoops).sort((a, b) => b.overdueLoops - a.overdueLoops).map((p) => (
              <div key={p.profile.user_id} className="flex flex-wrap items-center gap-2 text-xs border-b last:border-0 py-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[p.status]}`} />
                <span className="font-medium">{p.profile.full_name ?? names[p.profile.user_id] ?? "Member"}</span>
                <Badge variant="outline" className="text-[10px]">{p.team ? TEAM_LABEL[p.team] : "—"}</Badge>
                <span className="text-muted-foreground">{p.openLoops} open · {p.overdueLoops} past deadline · avg {p.avgScore || "—"}</span>
                <Link to="/tower/feedback" className="ml-auto underline">Open loop</Link>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "green" | "amber" | "red" }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${tone ? STATUS_TEXT[tone] : ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}
