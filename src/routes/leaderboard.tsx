import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { computeTcmPerformance } from "@/lib/engine";
import { useMountedNow } from "@/hooks/use-now";
import { Trophy, TrendingUp, Flame, Clock } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Gharpayy" },
      { name: "description", content: "TCM performance: conversion, response, discipline, revenue. Live ranking." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { tcms, leads, tours, followUps, bookings } = useApp();
  const [now] = useMountedNow();

  const rows = useMemo(() => {
    return tcms
      .map((t) => {
        const perf = computeTcmPerformance(t.id, leads, tours, followUps, now);
        const revenue = bookings.filter((b) => b.tcmId === t.id).reduce((s, b) => s + b.amount, 0);
        return { tcm: t, perf, revenue };
      })
      .sort((a, b) => {
        // Combined ranking: conversion + discipline - pending
        const sa = a.perf.conversion * 1.5 + a.perf.discipline - a.perf.pendingPostTour * 10;
        const sb = b.perf.conversion * 1.5 + b.perf.discipline - b.perf.pendingPostTour * 10;
        return sb - sa;
      });
  }, [tcms, leads, tours, followUps, bookings, now]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
            <Trophy className="h-6 w-6 text-accent" /> TCM Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conversion × discipline × speed. Updated live. Rank changes when you fill that post-tour form.
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">#</th>
                <th className="text-left px-4 py-2.5 font-medium">TCM</th>
                <th className="text-left px-4 py-2.5 font-medium">Zone</th>
                <th className="text-right px-4 py-2.5 font-medium">Leads</th>
                <th className="text-right px-4 py-2.5 font-medium">Tours</th>
                <th className="text-right px-4 py-2.5 font-medium">Bookings</th>
                <th className="text-right px-4 py-2.5 font-medium">Conv %</th>
                <th className="text-right px-4 py-2.5 font-medium">Discipline</th>
                <th className="text-right px-4 py-2.5 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ tcm, perf, revenue }, i) => (
                <tr key={tcm.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">
                    {i === 0 ? <Trophy className="h-4 w-4 text-accent" /> : `#${i + 1}`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-semibold">
                        {tcm.initials}
                      </div>
                      <span className="font-medium">{tcm.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tcm.zone}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{perf.leadCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{perf.toursDone}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-success">{perf.bookings}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={perf.conversion >= 35 ? "text-success font-semibold" : ""}>
                      {perf.conversion}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={
                      perf.discipline >= 75 ? "text-success" :
                      perf.discipline >= 50 ? "text-warning-foreground" : "text-destructive"
                    }>
                      {perf.discipline}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">
                    ₹{(revenue / 1000).toFixed(0)}k
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card icon={Flame} title="Top closer" value={rows[0]?.tcm.name ?? "—"} sub={`${rows[0]?.perf.conversion ?? 0}% conversion`} />
          <Card icon={Clock} title="Fastest response" value={[...tcms].sort((a, b) => a.avgResponseMins - b.avgResponseMins)[0]?.name ?? "—"} sub={`${[...tcms].sort((a, b) => a.avgResponseMins - b.avgResponseMins)[0]?.avgResponseMins ?? 0}m avg`} />
          <Card icon={TrendingUp} title="Highest discipline" value={[...rows].sort((a, b) => b.perf.discipline - a.perf.discipline)[0]?.tcm.name ?? "—"} sub={`${[...rows].sort((a, b) => b.perf.discipline - a.perf.discipline)[0]?.perf.discipline ?? 0}/100`} />
        </div>
      </div>
    </AppShell>
  );
}

function Card({ icon: Icon, title, value, sub }: { icon: typeof Trophy; title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="font-display text-lg font-semibold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
