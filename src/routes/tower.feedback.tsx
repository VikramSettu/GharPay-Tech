import { RoleGate } from "@/components/tower/RoleGate";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTowerAuth } from "@/lib/tower/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DAILY_TARGET, STATUS_CLASS, STATUS_LABEL, TEAM_LABEL, bandMeta, fmtTime, istDay } from "@/lib/tower/review-os";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/tower/feedback")({
  component: () => <RoleGate module="feedback"><MyFeedback /></RoleGate>,
  head: () => ({
    meta: [
      { title: "Feedback Action Centre — Gharpayy Review OS" },
      { name: "description", content: "Your pending reviews, corrections and deadlines — acknowledge, correct, submit evidence and close the loop." },
      { property: "og:title", content: "Feedback Action Centre — Gharpayy Review OS" },
      { property: "og:description", content: "Every correction tracked until the customer receives the right response." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Review = Database["public"]["Tables"]["reviews"]["Row"];

function MyFeedback() {
  const auth = useTowerAuth();
  const [rows, setRows] = useState<Review[]>([]);

  const load = async () => {
    if (!auth.user) return;
    const { data } = await supabase.from("reviews").select("*").eq("reviewee_id", auth.user.id).order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as Review[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [auth.user?.id]);
  useEffect(() => {
    const ch = supabase.channel("my-feedback").on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = istDay();
  const stats = useMemo(() => {
    const t = rows.filter((r) => r.review_day === today);
    const scored = rows.filter((r) => r.total_score > 0);
    const avg = scored.length ? Math.round(scored.reduce((s, r) => s + r.total_score, 0) / scored.length) : 0;
    const open = rows.filter((r) => r.status !== "closed");
    const overdue = open.filter((r) => r.deadline && new Date(r.deadline) < new Date());
    const criticals = rows.filter((r) => r.critical_error);

    // strongest / weakest criterion across scored reviews
    const agg: Record<string, { sum: number; n: number }> = {};
    scored.forEach((r) => {
      Object.entries((r.scores ?? {}) as Record<string, number>).forEach(([k, v]) => {
        agg[k] = { sum: (agg[k]?.sum ?? 0) + Number(v), n: (agg[k]?.n ?? 0) + 1 };
      });
    });
    const ranked = Object.entries(agg).map(([k, v]) => [k, v.sum / v.n] as [string, number]).sort((a, b) => b[1] - a[1]);

    return {
      todayChat: t.filter((r) => r.kind === "chat").length,
      todayCall: t.filter((r) => r.kind === "call").length,
      todayJourney: t.filter((r) => r.kind === "lead_journey").length,
      avg, open, overdue, criticals,
      strongest: ranked[0]?.[0] ?? "—",
      weakest: ranked[ranked.length - 1]?.[0] ?? "—",
      best: [...scored].sort((a, b) => b.total_score - a.total_score)[0] ?? null,
    };
  }, [rows, today]);

  if (!auth.user) return <Card className="p-6 text-sm">Pick who you are (top right) to see your feedback.</Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Feedback Action Centre</h1>
          <p className="text-sm text-muted-foreground">Your daily Quality Card. A correction is done only when the customer has the right response.</p>
        </div>
        <Link to="/tower/review"><Button size="sm" variant="outline">Review Queue</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Coverage label="Chats reviewed today" value={stats.todayChat} target={DAILY_TARGET.chat} />
        <Coverage label="Calls reviewed today" value={stats.todayCall} target={DAILY_TARGET.call} />
        <Coverage label="Lead journeys today" value={stats.todayJourney} target={DAILY_TARGET.lead_journey} />
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Average score</div>
          <div className="text-2xl font-bold">{stats.avg}</div>
          <div className="text-[10px] text-muted-foreground">{stats.criticals.length} critical error(s) all-time</div>
        </Card>
      </div>

      <Card className="p-4 grid md:grid-cols-3 gap-3 text-sm">
        <div><div className="text-xs text-muted-foreground">Strongest skill</div><div className="font-medium capitalize">{stats.strongest}</div></div>
        <div><div className="text-xs text-muted-foreground">Weakest skill</div><div className="font-medium capitalize">{stats.weakest}</div></div>
        <div>
          <div className="text-xs text-muted-foreground">Best reviewed interaction</div>
          {stats.best ? (
            <Link to="/tower/review/$id" params={{ id: stats.best.id }} className="font-medium text-primary underline">{stats.best.total_score}/100 · {fmtTime(stats.best.occurred_at)}</Link>
          ) : <div className="font-medium">—</div>}
        </div>
      </Card>

      <div>
        <div className="font-semibold text-sm mb-2">Open corrections ({stats.open.length}{stats.overdue.length > 0 ? ` · ${stats.overdue.length} overdue` : ""})</div>
        <div className="space-y-2">
          {stats.open.length === 0 && <Card className="p-6 text-sm text-muted-foreground">Nothing pending. Loop closed.</Card>}
          {stats.open.map((r) => {
            const band = bandMeta(r.band);
            const late = r.deadline && new Date(r.deadline) < new Date();
            return (
              <Link key={r.id} to="/tower/review/$id" params={{ id: r.id }} className="block">
                <Card className={`p-3 hover:border-primary/60 ${late ? "border-red-500/60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{TEAM_LABEL[r.team]}</Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize">{r.kind.replace("_", " ")}</Badge>
                    <Badge className={`text-[10px] ${band.className}`}>{r.total_score}/100</Badge>
                    <Badge className={`text-[10px] ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</Badge>
                    {r.critical_error && <Badge className="text-[10px] bg-red-600 text-white">Critical</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground">Due {fmtTime(r.deadline)}</span>
                  </div>
                  <div className="text-xs mt-1"><span className="font-medium">Action:</span> {r.corrective_action || "Awaiting reviewer"}</div>
                  {r.what_was_missed && <div className="text-xs text-muted-foreground mt-0.5">Missed: {r.what_was_missed}</div>}
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Coverage({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <Card className="p-3 space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}<span className="text-sm text-muted-foreground">/{target}</span></div>
      <Progress value={pct} className="h-1.5" />
    </Card>
  );
}
