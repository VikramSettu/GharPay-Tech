import { RoleGate } from "@/components/tower/RoleGate";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BANDS, CADENCE, DAILY_TARGET, HANDOVER_FIELDS, NON_NEGOTIABLES, STATUS_CLASS, STATUS_LABEL,
  TEAMS, TEAM_LABEL, WEEKLY_TARGET, bandMeta, fmtTime, istDay,
} from "@/lib/tower/review-os";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/tower/quality")({
  component: () => <RoleGate module="quality"><QualityDashboard /></RoleGate>,
  head: () => ({
    meta: [
      { title: "Quality Dashboard — Gharpayy Review OS" },
      { name: "description", content: "Company, team and individual quality dashboards: review coverage, scores, critical errors, pending corrections and daily cadence." },
      { property: "og:title", content: "Quality Dashboard — Gharpayy Review OS" },
      { property: "og:description", content: "Gharpayy Quality Pulse: coverage, scores, corrections and repeat errors across every team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Review = Database["public"]["Tables"]["reviews"]["Row"];
type Profile = { user_id: string; full_name: string | null };

function QualityDashboard() {
  const [rows, setRows] = useState<Review[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const today = istDay();

  useEffect(() => {
    const load = async () => {
      const [r, p] = await Promise.all([
        supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("profiles").select("user_id, full_name").order("full_name"),
      ]);
      setRows((r.data ?? []) as Review[]);
      setPeople((p.data ?? []) as Profile[]);
    };
    load();
    const ch = supabase.channel("quality-dash").on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const nameOf = (id: string) => people.find((p) => p.user_id === id)?.full_name ?? "Member";

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const todays = rows.filter((r) => r.review_day === today);
  const week = rows.filter((r) => r.review_day >= weekAgo);

  const avg = (list: Review[]) => {
    const s = list.filter((r) => r.total_score > 0);
    return s.length ? Math.round(s.reduce((a, r) => a + r.total_score, 0) / s.length) : 0;
  };

  const perPerson = useMemo(() => people.map((p) => {
    const mine = rows.filter((r) => r.reviewee_id === p.user_id);
    const t = mine.filter((r) => r.review_day === today);
    const w = mine.filter((r) => r.review_day >= weekAgo);
    const open = mine.filter((r) => r.status !== "closed");
    const tagCounts: Record<string, number> = {};
    w.forEach((r) => r.tags.forEach((tg) => { tagCounts[tg] = (tagCounts[tg] ?? 0) + 1; }));
    const repeat = Object.entries(tagCounts).filter(([, n]) => n >= 2);
    return {
      p,
      todayChat: t.filter((r) => r.kind === "chat").length,
      todayCall: t.filter((r) => r.kind === "call").length,
      todayJourney: t.filter((r) => r.kind === "lead_journey").length,
      weekChat: w.filter((r) => r.kind === "chat").length,
      weekCall: w.filter((r) => r.kind === "call").length,
      avg: avg(mine),
      open: open.length,
      critical: mine.filter((r) => r.critical_error).length,
      repeat,
      covered: t.length > 0,
    };
  }), [people, rows, today, weekAgo]);

  const mostCommonError = useMemo(() => {
    const counts: Record<string, number> = {};
    week.forEach((r) => r.tags.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1; }));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]} (${top[1]})` : "—";
  }, [week]);

  const pending = rows.filter((r) => !["closed"].includes(r.status));
  const completed = rows.filter((r) => r.status === "closed");
  const coverage = people.length ? Math.round((perPerson.filter((x) => x.covered).length / people.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Gharpayy Quality Pulse</h1>
          <p className="text-sm text-muted-foreground">Company, team and individual quality — updated live for every team.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/tower/review"><Button size="sm" variant="outline">Review Queue</Button></Link>
          <Link to="/tower/feedback"><Button size="sm" variant="outline">My Feedback</Button></Link>
        </div>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="people">Team & individuals</TabsTrigger>
          <TabsTrigger value="cadence">Daily cadence</TabsTrigger>
          <TabsTrigger value="standard">The standard</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Kpi label="Chats reviewed today" value={todays.filter((r) => r.kind === "chat").length} />
            <Kpi label="Calls reviewed today" value={todays.filter((r) => r.kind === "call").length} />
            <Kpi label="Journeys today" value={todays.filter((r) => r.kind === "lead_journey").length} />
            <Kpi label="Avg chat score" value={avg(week.filter((r) => r.kind === "chat"))} hint="last 7 days" />
            <Kpi label="Avg call score" value={avg(week.filter((r) => r.kind === "call"))} hint="last 7 days" />
            <Kpi label="Review coverage" value={coverage} suffix="%" hint="people reviewed today" />
            <Kpi label="Critical errors" value={rows.filter((r) => r.critical_error).length} danger />
            <Kpi label="Corrections pending" value={pending.length} />
            <Kpi label="Corrections completed" value={completed.length} />
            <Kpi label="Repeat errors (7d)" value={perPerson.reduce((s, x) => s + x.repeat.length, 0)} />
            <Kpi label="Mandatory cases" value={rows.filter((r) => r.mandatory_reason).length} />
            <Kpi label="Escalated" value={rows.filter((r) => r.status === "escalated").length} danger />
          </div>

          <Card className="p-4 space-y-2">
            <div className="font-semibold text-sm">Conversion by quality band</div>
            {BANDS.map((b) => {
              const n = rows.filter((r) => r.band === b.id && r.total_score > 0).length;
              const pct = rows.length ? Math.round((n / rows.length) * 100) : 0;
              return (
                <div key={b.id} className="flex items-center gap-3">
                  <Badge className={`${b.className} w-40 justify-center text-[10px]`}>{b.min}–{b.max} {b.label}</Badge>
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="text-xs w-16 text-right">{n} ({pct}%)</span>
                </div>
              );
            })}
            <div className="text-[11px] text-muted-foreground">Most common error this week: <span className="font-medium">{mostCommonError}</span></div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="font-semibold text-sm">Open loops needing attention</div>
            {pending.slice(0, 10).map((r) => (
              <Link key={r.id} to="/tower/review/$id" params={{ id: r.id }} className="flex flex-wrap items-center gap-2 text-xs border-b last:border-0 py-1.5">
                <Badge variant="outline" className="text-[10px]">{TEAM_LABEL[r.team]}</Badge>
                <span className="font-medium">{nameOf(r.reviewee_id)}</span>
                <Badge className={`text-[10px] ${bandMeta(r.band).className}`}>{r.total_score}</Badge>
                <Badge className={`text-[10px] ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</Badge>
                <span className="text-muted-foreground truncate max-w-[420px]">{r.corrective_action}</span>
                <span className="ml-auto text-muted-foreground">Due {fmtTime(r.deadline)}</span>
              </Link>
            ))}
            {pending.length === 0 && <div className="text-sm text-muted-foreground">Every review is closed.</div>}
          </Card>
        </TabsContent>

        <TabsContent value="people" className="space-y-3 pt-3">
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  {["Employee", "Chats today", "Calls today", "Journeys", "Week chats", "Week calls", "Avg score", "Open", "Critical", "Repeat errors"].map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perPerson.map((x) => (
                  <tr key={x.p.user_id} className="border-t">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{x.p.full_name ?? "Member"}</td>
                    <Cell v={x.todayChat} target={DAILY_TARGET.chat} />
                    <Cell v={x.todayCall} target={DAILY_TARGET.call} />
                    <Cell v={x.todayJourney} target={DAILY_TARGET.lead_journey} />
                    <Cell v={x.weekChat} target={WEEKLY_TARGET.chat} />
                    <Cell v={x.weekCall} target={WEEKLY_TARGET.call} />
                    <td className="px-3 py-2">{x.avg || "—"}</td>
                    <td className="px-3 py-2">{x.open}</td>
                    <td className={`px-3 py-2 ${x.critical ? "text-red-500 font-semibold" : ""}`}>{x.critical}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{x.repeat.map(([t, n]) => `${t}×${n}`).join(", ") || "—"}</td>
                  </tr>
                ))}
                {perPerson.length === 0 && <tr><td className="px-3 py-4 text-sm text-muted-foreground" colSpan={10}>No team members yet.</td></tr>}
              </tbody>
            </table>
          </Card>
          <Card className="p-4">
            <div className="font-semibold text-sm mb-2">Review ownership matrix</div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEAMS.map((t) => (
                <div key={t.id} className="rounded border p-3">
                  <div className="font-medium text-sm">{t.label}</div>
                  <ul className="list-disc pl-4 text-xs text-muted-foreground mt-1 space-y-0.5">{t.owns.map((o) => <li key={o}>{o}</li>)}</ul>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="cadence" className="space-y-3 pt-3">
          {CADENCE.map((c) => (
            <Card key={c.time} className="p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{c.time}</Badge>
                <span className="font-semibold text-sm">{c.title}</span>
              </div>
              <ul className="list-disc pl-5 text-xs text-muted-foreground mt-2 space-y-0.5">{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="standard" className="space-y-3 pt-3">
          <Card className="p-4">
            <div className="font-semibold text-sm mb-2">Non-negotiables</div>
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-0.5">{NON_NEGOTIABLES.map((n) => <li key={n}>{n}</li>)}</ul>
          </Card>
          <Card className="p-4">
            <div className="font-semibold text-sm mb-2">Handover standard — every handover must carry</div>
            <div className="flex flex-wrap gap-1">{HANDOVER_FIELDS.map((h) => <Badge key={h} variant="outline" className="text-[10px]">{h}</Badge>)}</div>
            <div className="text-[11px] text-muted-foreground mt-2">Until the receiving employee accepts, the previous employee remains responsible.</div>
          </Card>
          <Card className="p-4">
            <div className="font-semibold text-sm mb-2">Scoring bands</div>
            {BANDS.map((b) => (
              <div key={b.id} className="flex items-center gap-3 text-xs py-1 border-b last:border-0">
                <Badge className={`${b.className} w-40 justify-center text-[10px]`}>{b.min}–{b.max} {b.label}</Badge>
                <span className="text-muted-foreground">{b.action}</span>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, hint, suffix, danger }: { label: string; value: number; hint?: string; suffix?: string; danger?: boolean }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${danger && value > 0 ? "text-red-500" : ""}`}>{value}{suffix}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function Cell({ v, target }: { v: number; target: number }) {
  return <td className={`px-3 py-2 ${v >= target ? "text-emerald-600" : "text-amber-600"}`}>{v}/{target}</td>;
}
