/**
 * WATCHTOWER — the admin's early-warning and pace engine.
 *
 * Three things the console was missing:
 *  1. Alerts: every risk in the company, ranked by money and urgency, each one
 *     carrying the exact customers behind it so it opens in the drill drawer.
 *  2. Pace: where today lands if the current rate holds (projection vs target).
 *  3. League: zone ranking with movement vs the comparison window.
 */
import type { BrainRow } from "@/founder/lib/brain/engine";
import type { CompanyNow } from "@/founder/lib/brain/company-now";
import type { PersonNow, ZoneDesk } from "@/founder/lib/brain/people-now";
import { dayProgress } from "@/founder/lib/brain/targets";

export type AlertLevel = "critical" | "warning" | "watch";

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  because: string;
  fix: string;
  zone: string;
  person?: PersonNow;
  count: number;
  money: number;
  severity: number;
  rows: BrainRow[];
}

const LEVEL_WEIGHT: Record<AlertLevel, number> = { critical: 1000, warning: 400, watch: 100 };

function mk(a: Omit<Alert, "severity">): Alert {
  return { ...a, severity: LEVEL_WEIGHT[a.level] + a.count * 6 + a.money / 5000 };
}

const rowsOf = (p: PersonNow, key: string): BrainRow[] =>
  p.metrics.flatMap((g) => g.items.filter((i) => i.key === key).flatMap((i) => i.rows));

/** Every live risk in the company, ranked. Company buckets + per-person + per-zone. */
export function buildAlerts(company: CompanyNow | null, zones: ZoneDesk[], people: PersonNow[]): Alert[] {
  const out: Alert[] = [];

  (company?.recovery ?? []).forEach((b) => {
    const level: AlertLevel = b.id === "sla" || b.id === "payment" ? "critical" : b.id === "quote" ? "warning" : "watch";
    out.push(mk({
      id: `recovery:${b.id}`,
      level,
      title: b.title,
      because: `${b.count} customers · ${b.bookings} bookings recoverable`,
      fix: `Clear before ${b.deadline}`,
      zone: "All zones",
      count: b.count,
      money: b.revenue,
      rows: b.rows,
    }));
  });

  people.forEach((p) => {
    if (p.zeroDay && p.loggedInToday) {
      out.push(mk({
        id: `zero:${p.id}`,
        level: "critical",
        title: `${p.name} logged in with zero output`,
        because: "No calls, tours, quotations or bookings in this window",
        fix: "Call them now and put leads on their desk",
        zone: p.zone,
        person: p,
        count: p.v.leads ?? 0,
        money: 0,
        rows: rowsOf(p, "untouched"),
      }));
    }
    if (!p.loggedInToday) {
      out.push(mk({
        id: `ghost:${p.id}`,
        level: "critical",
        title: `${p.name} never logged in`,
        because: `Last seen ${p.lastSeen}`,
        fix: "Confirm attendance and reassign their leads",
        zone: p.zone,
        person: p,
        count: p.v.active ?? 0,
        money: 0,
        rows: rowsOf(p, "untouched"),
      }));
    }
    if ((p.v.untouched ?? 0) >= 3) {
      out.push(mk({
        id: `untouched:${p.id}`,
        level: "warning",
        title: `${p.name} sitting on ${p.v.untouched} untouched leads`,
        because: "Assigned but never contacted in this window",
        fix: "Force a contact pass before the next checkpoint",
        zone: p.zone,
        person: p,
        count: p.v.untouched ?? 0,
        money: 0,
        rows: rowsOf(p, "untouched"),
      }));
    }
    if ((p.v.overdue ?? 0) >= 2) {
      out.push(mk({
        id: `overdue:${p.id}`,
        level: "warning",
        title: `${p.name} has ${p.v.overdue} overdue follow-ups`,
        because: "Promised call-backs already past their time",
        fix: "Clear the overdue list first, then new leads",
        zone: p.zone,
        person: p,
        count: p.v.overdue ?? 0,
        money: 0,
        rows: rowsOf(p, "overdue"),
      }));
    }
    const stuck = p.moments.filter((mo) => mo.stuck > 0);
    if (stuck.length) {
      out.push(mk({
        id: `stuck:${p.id}`,
        level: "warning",
        title: `${p.name} has ${p.v.momentsStuck ?? stuck.reduce((s, x) => s + x.stuck, 0)} customers stuck mid-journey`,
        because: stuck.map((x) => `${x.label} ${x.to}/${x.from}`).join(" · "),
        fix: "Move each one to the next moment today",
        zone: p.zone,
        person: p,
        count: stuck.reduce((s, x) => s + x.stuck, 0),
        money: 0,
        rows: stuck.flatMap((x) => x.stuckRows),
      }));
    }
    const missed = p.checkpoints.filter((c) => c.state === "missed").length;
    if (missed >= 2) {
      out.push(mk({
        id: `gates:${p.id}`,
        level: "watch",
        title: `${p.name} missed ${missed} reporting gates`,
        because: p.checkpoints.filter((c) => c.state === "missed").map((c) => c.at).join(", "),
        fix: "Ask for the missing reports before EOD",
        zone: p.zone,
        person: p,
        count: missed,
        money: 0,
        rows: [],
      }));
    }
  });

  zones.forEach((z) => {
    if ((z.total.v.bookings ?? 0) === 0 && (z.total.v.quotes ?? 0) > 0) {
      out.push(mk({
        id: `zone-dry:${z.name}`,
        level: "critical",
        title: `${z.name} sent quotations but closed nothing`,
        because: `${z.total.v.quotes} quotations · 0 bookings`,
        fix: "Get on the calls with the quoted customers now",
        zone: z.name,
        count: z.total.v.quotes ?? 0,
        money: 0,
        rows: z.moments.find((mo) => mo.key.includes("book"))?.stuckRows ?? [],
      }));
    }
  });

  return out.sort((a, b) => b.severity - a.severity);
}

export interface PaceLine {
  key: string;
  label: string;
  actual: number;
  projected: number;
  target: number;
  pct: number;
  band: "ahead" | "on-track" | "behind" | "critical";
  rows: BrainRow[];
}

const BAND = (pct: number): PaceLine["band"] =>
  pct >= 110 ? "ahead" : pct >= 90 ? "on-track" : pct >= 65 ? "behind" : "critical";

export const PACE_CLASS: Record<PaceLine["band"], string> = {
  ahead: "text-emerald-600",
  "on-track": "text-emerald-600",
  behind: "text-amber-600",
  critical: "text-destructive",
};

/**
 * Where the day lands if the current rate holds. `partial` should be true only
 * for a live window (today); anything closed projects to its actual.
 */
export function buildPace(total: PersonNow | null, partial: boolean, targets?: Partial<Record<string, number>>): PaceLine[] {
  if (!total) return [];
  const progress = partial ? Math.max(dayProgress(), 0.08) : 1;
  const rows = (key: string) => total.metrics.flatMap((g) => g.items.filter((i) => i.key === key).flatMap((i) => i.rows));

  const defs: { key: string; label: string; target: number }[] = [
    { key: "calls", label: "Calls", target: targets?.calls ?? Math.max(40, (total.v.calls ?? 0) * 1.3) },
    { key: "connected", label: "Connected", target: targets?.connected ?? Math.max(24, (total.v.connected ?? 0) * 1.3) },
    { key: "toursScheduled", label: "Tours booked", target: targets?.toursScheduled ?? Math.max(8, (total.v.toursScheduled ?? 0) * 1.25) },
    { key: "toursDone", label: "Tours done", target: targets?.toursDone ?? Math.max(6, (total.v.toursDone ?? 0) * 1.25) },
    { key: "quotes", label: "Quotations", target: targets?.quotes ?? Math.max(5, (total.v.quotes ?? 0) * 1.25) },
    { key: "bookings", label: "Bookings", target: targets?.bookings ?? Math.max(3, (total.v.bookings ?? 0) * 1.3) },
    { key: "checkins", label: "Check-ins", target: targets?.checkins ?? Math.max(2, (total.v.checkins ?? 0) * 1.3) },
  ];

  return defs.map((d) => {
    const actual = total.v[d.key] ?? 0;
    const projected = Math.round(actual / progress);
    const target = Math.max(1, Math.round(d.target));
    const pct = Math.round((projected / target) * 100);
    return { key: d.key, label: d.label, actual, projected, target, pct, band: BAND(pct), rows: rows(d.key) };
  });
}

export interface LeagueRow {
  zone: ZoneDesk;
  rank: number;
  bookings: number;
  prevBookings: number;
  move: number;
  risk: number;
}

/** Zone league with movement vs the comparison window and a risk count. */
export function buildLeague(zones: ZoneDesk[]): LeagueRow[] {
  return zones
    .map((z) => {
      const bookings = z.total.v.bookings ?? 0;
      const prevBookings = z.total.pv.bookings ?? 0;
      return {
        zone: z,
        rank: 0,
        bookings,
        prevBookings,
        move: bookings - prevBookings,
        risk: z.zeros.length + z.ghosts.length + (z.total.v.untouched ?? 0) + (z.total.v.momentsStuck ?? 0),
      };
    })
    .sort((a, b) => b.bookings - a.bookings || b.zone.score - a.zone.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/* ------------------------------ copy blocks ------------------------------ */

export function alertsWhatsApp(alerts: Alert[], rangeLabel: string) {
  const by = (l: AlertLevel) => alerts.filter((a) => a.level === l);
  const line = (a: Alert) => `• ${a.title} — ${a.because} → ${a.fix}`;
  return [
    `GHARPAYY WATCHTOWER — ${rangeLabel}`,
    `${alerts.length} live alerts · ${by("critical").length} critical`,
    "",
    "CRITICAL",
    ...(by("critical").length ? by("critical").map(line) : ["Nothing critical."]),
    "",
    "WARNING",
    ...(by("warning").length ? by("warning").map(line) : ["Clean."]),
    "",
    "WATCH",
    ...(by("watch").length ? by("watch").map(line) : ["Clean."]),
  ].join("\n");
}

export function paceWhatsApp(pace: PaceLine[], rangeLabel: string) {
  return [
    `GHARPAYY PACE — ${rangeLabel}`,
    "",
    ...pace.map((p) => `${p.label}: ${p.actual} now → ${p.projected} projected vs ${p.target} target (${p.pct}%)`),
    "",
    ...(pace.filter((p) => p.band === "critical" || p.band === "behind").length
      ? ["BEHIND", ...pace.filter((p) => p.band === "critical" || p.band === "behind").map((p) => `• ${p.label} — needs ${Math.max(0, p.target - p.projected)} more`)]
      : ["Every line on track."]),
  ].join("\n");
}

export function leagueWhatsApp(league: LeagueRow[], rangeLabel: string) {
  return [
    `GHARPAYY ZONE LEAGUE — ${rangeLabel}`,
    "",
    ...league.map((r) =>
      `${r.rank}. ${r.zone.name} — ${r.bookings} bookings (${r.move >= 0 ? "+" : ""}${r.move} vs prev) · risk ${r.risk} · score ${r.zone.score}`),
  ].join("\n");
}

/* --------------------------------- CSV ---------------------------------- */

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function rowsToCsv(rows: BrainRow[]): string {
  const head = ["Customer", "Detail", "Owner", "Zone", "Problem", "Overdue", "Impact", "Next action", "Phone"];
  const body = rows.map((r) =>
    [r.title, r.subtitle, r.owner, r.zone, r.problem, r.overdue, r.impact, r.nextAction, r.phone].map(esc).join(","),
  );
  return [head.map(esc).join(","), ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
