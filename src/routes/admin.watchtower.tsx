/**
 * WATCHTOWER — one screen that tells the founder what is broken, where the day
 * lands, and which zone is winning. Everything on it is clickable into the same
 * global drill drawer / person sheet used by every other admin tab.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ClipboardCopy, Download, Gauge, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAdminFocus } from "@/founder/lib/admin-focus";
import {
  alertsWhatsApp, buildAlerts, buildLeague, buildPace, downloadCsv, leagueWhatsApp,
  PACE_CLASS, paceWhatsApp, rowsToCsv, type AlertLevel,
} from "@/founder/lib/brain/watchtower";
import { nextCheckpoint, useDecisions } from "@/founder/lib/admin/decisions-store";

export const Route = createFileRoute("/admin/watchtower")({
  head: () => ({
    meta: [
      { title: "Watchtower — Founder Admin | Gharpayy" },
      { name: "description", content: "Every live risk ranked, today's projected landing against target, and the zone league in one founder screen." },
      { property: "og:title", content: "Watchtower — Founder Admin | Gharpayy" },
      { property: "og:description", content: "Ranked alerts, pace-to-target projection and zone league for the whole company." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Watchtower,
});

const LEVEL_STYLE: Record<AlertLevel, string> = {
  critical: "border-destructive/50 bg-destructive/5",
  warning: "border-amber-500/50 bg-amber-500/5",
  watch: "border-border",
};

const LEVEL_BADGE: Record<AlertLevel, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  warning: "secondary",
  watch: "outline",
};

const copy = (text: string, what: string) => {
  void navigator.clipboard?.writeText(text);
  toast.success(`${what} copied for WhatsApp`);
};

function Watchtower() {
  const f = useAdminFocus();
  const dec = useDecisions();
  const [level, setLevel] = useState<AlertLevel | "all">("all");
  const owned = new Set(dec.items.filter((d) => d.status === "open").map((d) => d.sourceId));

  const alerts = useMemo(
    () => buildAlerts(f.company, f.zone ? [f.zone] : f.zones, f.people),
    [f.company, f.zone, f.zones, f.people],
  );
  const pace = useMemo(() => buildPace(f.total, f.range.partialDay), [f.total, f.range.partialDay]);
  const league = useMemo(() => buildLeague(f.zones), [f.zones]);

  const shown = level === "all" ? alerts : alerts.filter((a) => a.level === level);
  const counts = {
    all: alerts.length,
    critical: alerts.filter((a) => a.level === "critical").length,
    warning: alerts.filter((a) => a.level === "warning").length,
    watch: alerts.filter((a) => a.level === "watch").length,
  };

  if (!f.hydrated) return <div className="p-6 text-sm text-muted-foreground">Reading the CRM…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        Watchtower <span className="text-sm font-normal text-muted-foreground">· {f.zone ? f.zone.name : "all zones"} · {f.range.label}</span>
      </h1>

      {/* PACE */}
      <Card className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <div className="font-semibold">Where today lands</div>
          <span className="text-xs text-muted-foreground">
            {f.range.partialDay ? "projected at the current rate" : "closed window — actuals"}
          </span>
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs"
            onClick={() => copy(paceWhatsApp(pace, f.range.label), "Pace")}>
            <ClipboardCopy className="mr-1 h-3 w-3" /> Copy pace
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          {pace.map((p) => (
            <button key={p.key} onClick={() => f.openDrill(p.label, p.rows, `${p.actual} in ${f.range.label} · projected ${p.projected} vs target ${p.target}`)}
              className="rounded-md border p-2 text-left hover:bg-muted">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.label}</div>
              <div className="text-lg font-bold">{p.actual}</div>
              <div className={`text-[11px] font-medium ${PACE_CLASS[p.band]}`}>
                → {p.projected} of {p.target} ({p.pct}%)
              </div>
              {p.band !== "ahead" && p.band !== "on-track" && (
                <div className="text-[10px] text-muted-foreground">needs {Math.max(0, p.target - p.projected)} more</div>
              )}
            </button>
          ))}
          {pace.length === 0 && <div className="text-sm text-muted-foreground">No people in scope.</div>}
        </div>
      </Card>

      {/* ALERTS */}
      <Card className="p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <div className="font-semibold">Live alerts</div>
          {(["all", "critical", "warning", "watch"] as const).map((l) => (
            <button key={l} onClick={() => setLevel(l)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] capitalize ${level === l ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {l} {counts[l]}
            </button>
          ))}
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs"
            onClick={() => copy(alertsWhatsApp(alerts, f.range.label), "Watchtower")}>
            <ClipboardCopy className="mr-1 h-3 w-3" /> Copy alerts
          </Button>
        </div>

        <div className="space-y-2">
          {shown.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing here. This scope is clean.
            </div>
          )}
          {shown.map((a) => (
            <div key={a.id} className={`rounded-md border p-2.5 ${LEVEL_STYLE[a.level]}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={LEVEL_BADGE[a.level]} className="text-[10px] uppercase">{a.level}</Badge>
                <div className="text-sm font-semibold">{a.title}</div>
                <Badge variant="outline" className="text-[10px]">{a.zone}</Badge>
                {a.money > 0 && <Badge variant="secondary" className="text-[10px]">₹{a.money.toLocaleString("en-IN")} at stake</Badge>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{a.because}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge className="text-[10px]">Fix: {a.fix}</Badge>
                <Button size="sm" className="h-7 text-xs" disabled={owned.has(a.id)}
                  onClick={() => {
                    const gate = nextCheckpoint();
                    dec.add({
                      title: a.title, why: a.because, fix: a.fix,
                      owner: a.person?.name ?? (f.zone ? `${f.zone.name} manager` : "Founder"),
                      ownerId: a.person?.id, zone: a.zone, count: a.count, money: a.money,
                      level: a.level, dueAt: gate.at, sourceId: a.id,
                    });
                    toast.success(`Owned — due by ${gate.label}`);
                  }}>
                  {owned.has(a.id) ? "Owned" : "Own it"}
                </Button>
                {a.rows.length > 0 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => f.openDrill(a.title, a.rows, a.because)}>
                    Open {a.rows.length} customer{a.rows.length === 1 ? "" : "s"}
                  </Button>
                )}
                {a.person && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => f.openPerson(a.person!)}>
                    {a.person.name} 360
                  </Button>
                )}
                {a.rows.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs"
                    onClick={() => downloadCsv(`${a.id.replace(/[:]/g, "-")}.csv`, rowsToCsv(a.rows))}>
                    <Download className="mr-1 h-3 w-3" /> CSV
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* LEAGUE */}
      <Card className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <div className="font-semibold">Zone league</div>
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs"
            onClick={() => copy(leagueWhatsApp(league, f.range.label), "League")}>
            <ClipboardCopy className="mr-1 h-3 w-3" /> Copy league
          </Button>
        </div>
        <div className="space-y-1">
          {league.map((r) => (
            <div key={r.zone.name}
              className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm ${f.zoneName === r.zone.name ? "border-primary" : ""}`}>
              <span className="w-6 text-center font-bold text-muted-foreground">{r.rank}</span>
              <button className="font-semibold hover:underline" onClick={() => f.setZoneName(r.zone.name)}>{r.zone.name}</button>
              <button className="text-xs text-primary hover:underline" onClick={() => f.openPerson(r.zone.total)}>zone 360</button>
              <span className="text-xs text-muted-foreground">
                {r.bookings} bookings · {r.zone.total.v.toursDone ?? 0} tours done · {r.zone.total.v.calls ?? 0} calls · score {r.zone.score}
              </span>
              <Badge variant={r.move > 0 ? "default" : r.move < 0 ? "destructive" : "outline"} className="text-[10px]">
                {r.move > 0 ? "+" : ""}{r.move} vs prev
              </Badge>
              {r.risk > 0 && <Badge variant="secondary" className="text-[10px]">risk {r.risk}</Badge>}
              <div className="ml-auto flex flex-wrap gap-1">
                {r.zone.people.slice(0, 6).map((p) => (
                  <button key={p.id} onClick={() => f.openPerson(p)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] hover:bg-muted ${p.zeroDay && p.loggedInToday ? "border-destructive text-destructive" : p.star ? "border-emerald-500 text-emerald-600" : ""}`}>
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {league.length === 0 && <div className="text-sm text-muted-foreground">No zones in the CRM yet.</div>}
        </div>
      </Card>
    </div>
  );
}
