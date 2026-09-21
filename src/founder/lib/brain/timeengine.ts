/**
 * Global Time Engine for the Founder OS.
 *
 * One control drives every number on /admin: a period preset plus a
 * comparison period. Partial-day periods compare on *equivalent elapsed
 * time* — "Today until 14:20" compares against "Yesterday until 14:20",
 * never against a full previous day.
 */

export type PeriodKey =
  | "now" | "1h" | "3h" | "6h" | "12h"
  | "today" | "yesterday" | "24h" | "48h" | "3d" | "7d" | "14d"
  | "this-week" | "prev-week" | "this-month" | "custom";

export type CompareKey = "prev" | "yesterday" | "last-week" | "prev-7d" | "none";

export interface Range { from: number; to: number; label: string; partialDay: boolean }

export const PERIOD_OPTIONS: { id: PeriodKey; label: string }[] = [
  { id: "now", label: "Right Now" },
  { id: "1h", label: "Last 1h" },
  { id: "3h", label: "Last 3h" },
  { id: "6h", label: "Last 6h" },
  { id: "12h", label: "Last 12h" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "24h", label: "Last 24h" },
  { id: "48h", label: "Last 48h" },
  { id: "3d", label: "3 days" },
  { id: "7d", label: "7 days" },
  { id: "14d", label: "14 days" },
  { id: "this-week", label: "This week" },
  { id: "prev-week", label: "Previous week" },
  { id: "this-month", label: "This month" },
  { id: "custom", label: "Custom" },
];

export const COMPARE_OPTIONS: { id: CompareKey; label: string }[] = [
  { id: "prev", label: "Previous equivalent period" },
  { id: "yesterday", label: "Yesterday, same time" },
  { id: "last-week", label: "Last week, same day + time" },
  { id: "prev-7d", label: "Previous 7 days" },
  { id: "none", label: "No comparison" },
];

const H = 3_600_000;
const D = 24 * H;

const midnight = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return +d; };
const weekStart = (t: number) => {
  const d = new Date(midnight(t));
  const dow = (d.getDay() + 6) % 7; // Monday-first
  return +d - dow * D;
};
const monthStart = (t: number) => { const d = new Date(t); d.setDate(1); d.setHours(0, 0, 0, 0); return +d; };

export function periodRange(
  key: PeriodKey,
  now = Date.now(),
  custom?: { from: number; to: number },
): Range {
  const back = (h: number, label: string): Range => ({ from: now - h * H, to: now, label, partialDay: true });
  switch (key) {
    case "now": return { from: now - 30 * 60_000, to: now, label: "Right now (30 min)", partialDay: true };
    case "1h": return back(1, "Last 1 hour");
    case "3h": return back(3, "Last 3 hours");
    case "6h": return back(6, "Last 6 hours");
    case "12h": return back(12, "Last 12 hours");
    case "24h": return back(24, "Last 24 hours");
    case "48h": return back(48, "Last 48 hours");
    case "3d": return back(72, "Last 3 days");
    case "7d": return back(168, "Last 7 days");
    case "14d": return back(336, "Last 14 days");
    case "today": return { from: midnight(now), to: now, label: "Today", partialDay: true };
    case "yesterday": return { from: midnight(now) - D, to: midnight(now), label: "Yesterday", partialDay: false };
    case "this-week": return { from: weekStart(now), to: now, label: "This week", partialDay: true };
    case "prev-week": return { from: weekStart(now) - 7 * D, to: weekStart(now), label: "Previous week", partialDay: false };
    case "this-month": return { from: monthStart(now), to: now, label: "This month", partialDay: true };
    case "custom":
      return {
        from: custom?.from ?? midnight(now),
        to: custom?.to ?? now,
        label: "Custom range",
        partialDay: false,
      };
  }
}

/**
 * The comparison window. For partial periods we shift by whole days so the
 * elapsed time inside the window is identical (14:20 vs 14:20).
 */
export function compareRange(base: Range, key: CompareKey): Range | null {
  const span = base.to - base.from;
  switch (key) {
    case "none": return null;
    case "prev": return { from: base.from - span, to: base.from, label: "Previous equivalent period", partialDay: base.partialDay };
    case "yesterday": return { from: base.from - D, to: base.to - D, label: "Yesterday, same time", partialDay: base.partialDay };
    case "last-week": return { from: base.from - 7 * D, to: base.to - 7 * D, label: "Last week, same time", partialDay: base.partialDay };
    case "prev-7d": return { from: base.from - 7 * D, to: base.from, label: "Previous 7 days", partialDay: false };
  }
}

export const inRange = (iso: string | null | undefined, r: Range) => {
  if (!iso) return false;
  const t = +new Date(iso);
  return t >= r.from && t <= r.to;
};

export function fmtClock(t: number) {
  return new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function rangeLabel(r: Range) {
  const sameDay = midnight(r.from) === midnight(r.to);
  return sameDay ? `${fmtClock(r.from)} – ${fmtClock(r.to)}` : `${new Date(r.from).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} → ${new Date(r.to).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
}

export function delta(current: number, previous: number | null) {
  if (previous == null) return { abs: 0, pct: 0, dir: "flat" as const, text: "no comparison" };
  const abs = current - previous;
  const pct = previous === 0 ? (current === 0 ? 0 : 100) : Math.round((abs / previous) * 100);
  const dir = abs > 0 ? ("up" as const) : abs < 0 ? ("down" as const) : ("flat" as const);
  return { abs, pct, dir, text: `${abs >= 0 ? "+" : ""}${abs} (${abs >= 0 ? "+" : ""}${pct}%)` };
}
