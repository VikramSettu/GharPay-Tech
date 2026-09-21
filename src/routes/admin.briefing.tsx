/**
 * BRIEFING — the console writes the founder's message for them.
 *
 * One narrative built from live CRM data: where the day stands, what is
 * winning, what is broken, who is accountable, and the orders to give next.
 * Copy for WhatsApp or print it for the stand-up.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, Printer, Sunrise, Sunset } from "lucide-react";
import { toast } from "sonner";
import { useAdminFocus } from "@/founder/lib/admin-focus";
import { buildAlerts, buildLeague, buildPace } from "@/founder/lib/brain/watchtower";
import { useDecisions } from "@/founder/lib/admin/decisions-store";

export const Route = createFileRoute("/admin/briefing")({
  head: () => ({
    meta: [
      { title: "Briefing — Founder Admin | Gharpayy" },
      { name: "description", content: "Auto-written morning brief and end-of-day close: pace, zone league, risks, accountable people and the next orders." },
      { property: "og:title", content: "Briefing — Founder Admin | Gharpayy" },
      { property: "og:description", content: "The founder's morning brief and EOD close, written from live CRM data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Briefing,
});

type Mode = "brief" | "eod";

function Briefing() {
  const f = useAdminFocus();
  const decisions = useDecisions();
  const [mode, setMode] = useState<Mode>(new Date().getHours() >= 17 ? "eod" : "brief");

  const alerts = useMemo(
    () => buildAlerts(f.company, f.zone ? [f.zone] : f.zones, f.people),
    [f.company, f.zone, f.zones, f.people],
  );
  const pace = useMemo(() => buildPace(f.total, f.range.partialDay), [f.total, f.range.partialDay]);
  const league = useMemo(() => buildLeague(f.zones), [f.zones]);

  const scope = f.zone ? f.zone.name : "All zones";
  const v = f.total?.v ?? {};
  const openDecisions = decisions.items.filter((d) => d.status === "open");
  const closedToday = decisions.items.filter((d) => d.status === "done");
  const zeros = f.people.filter((p) => p.zeroDay && p.loggedInToday);
  const ghosts = f.people.filter((p) => !p.loggedInToday);
  const stars = f.people.filter((p) => p.star);
  const behind = pace.filter((p) => p.band === "behind" || p.band === "critical");
  const orders = alerts.slice(0, 3);

  const sections: { title: string; lines: string[] }[] = [
    {
      title: mode === "brief" ? "Where we stand" : "What the day closed at",
      lines: [
        `${v.calls ?? 0} calls · ${v.connected ?? 0} connected (${v.connectRate ?? 0}%)`,
        `${v.toursScheduled ?? 0} tours booked · ${v.toursDone ?? 0} done · ${v.quotes ?? 0} quotations`,
        `${v.bookings ?? 0} bookings · ${v.checkins ?? 0} check-ins`,
        `${v.untouched ?? 0} untouched leads · ${v.overdue ?? 0} overdue follow-ups · ${v.momentsStuck ?? 0} stuck between moments`,
      ],
    },
    {
      title: mode === "brief" ? "Where today lands" : "Target vs actual",
      lines: pace.length
        ? pace.map((p) => `${p.label}: ${p.actual}${f.range.partialDay && mode === "brief" ? ` → ${p.projected}` : ""} of ${p.target} (${p.pct}%)`)
        : ["No people in scope."],
    },
    {
      title: "Zone league",
      lines: league.length
        ? league.map((r) => `${r.rank}. ${r.zone.name} — ${r.bookings} bookings (${r.move >= 0 ? "+" : ""}${r.move} vs prev) · risk ${r.risk}`)
        : ["No zones in scope."],
    },
    {
      title: "People",
      lines: [
        stars.length ? `Stars: ${stars.map((p) => p.name).join(", ")}` : "No stars in this window.",
        zeros.length ? `Logged in with zero output: ${zeros.map((p) => p.name).join(", ")}` : "Nobody logged in with zero output.",
        ghosts.length ? `Never logged in: ${ghosts.map((p) => p.name).join(", ")}` : "Full attendance.",
      ],
    },
    {
      title: mode === "brief" ? "Orders for the next checkpoint" : "Carry into tomorrow",
      lines: orders.length
        ? orders.map((a) => `${a.title} → ${a.fix}`)
        : ["Nothing critical open — keep the queue running."],
    },
    {
      title: "Accountability",
      lines: [
        `${openDecisions.length} open decisions · ${closedToday.length} closed`,
        ...openDecisions.slice(0, 6).map((d) => `• ${d.title} — ${d.owner}`),
      ],
    },
    ...(behind.length && mode === "eod"
      ? [{ title: "Missed and why", lines: behind.map((p) => `${p.label} finished ${p.actual}/${p.target} (${p.pct}%)`) }]
      : []),
  ];

  const text = [
    `GHARPAYY ${mode === "brief" ? "MORNING BRIEF" : "EOD CLOSE"} — ${scope} · ${f.range.label}`,
    "",
    ...sections.flatMap((s) => [s.title.toUpperCase(), ...s.lines.map((l) => (l.startsWith("•") ? l : `• ${l}`)), ""]),
  ].join("\n");

  if (!f.hydrated) return <div className="p-6 text-sm text-muted-foreground">Reading the CRM…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <h1 className="text-xl font-bold">
          Briefing <span className="text-sm font-normal text-muted-foreground">· {scope} · {f.range.label}</span>
        </h1>
        <div className="flex gap-1">
          <Button size="sm" variant={mode === "brief" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setMode("brief")}>
            <Sunrise className="mr-1 h-3 w-3" /> Morning brief
          </Button>
          <Button size="sm" variant={mode === "eod" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setMode("eod")}>
            <Sunset className="mr-1 h-3 w-3" /> EOD close
          </Button>
        </div>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs"
          onClick={() => { void navigator.clipboard?.writeText(text); toast.success("Briefing copied for WhatsApp"); }}>
          <ClipboardCopy className="mr-1 h-3 w-3" /> Copy briefing
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.print()}>
          <Printer className="mr-1 h-3 w-3" /> Print
        </Button>
      </div>

      <Card className="p-4">
        <div className="mb-3 border-b pb-2">
          <div className="text-lg font-bold">{mode === "brief" ? "Morning brief" : "End of day close"}</div>
          <div className="text-xs text-muted-foreground">{scope} · {f.range.label} · written from live CRM data</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <div key={s.title}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</div>
              <ul className="space-y-1 text-sm">
                {s.lines.map((l, i) => (
                  <li key={`${s.title}-${i}`} className="flex gap-2">
                    <span className="text-muted-foreground">·</span>
                    <span>{l.replace(/^• /, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-3 print:hidden">
        <div className="mb-2 flex items-center gap-2">
          <div className="font-semibold">Act on the brief</div>
          <Badge variant="outline" className="text-[10px]">{alerts.length} live risks</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {orders.map((a) => (
            <Button key={a.id} size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => (a.rows.length ? f.openDrill(a.title, a.rows, a.because) : a.person ? f.openPerson(a.person) : undefined)}>
              {a.title}
            </Button>
          ))}
          {stars.map((p) => (
            <Button key={p.id} size="sm" variant="ghost" className="h-7 text-xs text-emerald-600" onClick={() => f.openPerson(p)}>
              ★ {p.name}
            </Button>
          ))}
          {zeros.map((p) => (
            <Button key={p.id} size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => f.openPerson(p)}>
              0 {p.name}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
