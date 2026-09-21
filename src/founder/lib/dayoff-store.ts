// Planned next-day off — the 12-hour rule.
// A person may only declare tomorrow's week-off / leave inside a fixed window:
// it opens 24 hours before tomorrow's shift start and closes 12 hours before it.
// Filed earlier than that and the plan is stale; later and the team cannot
// re-plan the day. Exactly one day ahead, never before, never after.

import { EMPLOYEES } from "@/founder/data/seed";
import { dateKey } from "@/founder/lib/attendance-store";

export type DayOffKind = "week_off" | "planned_leave" | "half_day" | "wfh";

export const DAYOFF_LABEL: Record<DayOffKind, string> = {
  week_off: "Week off",
  planned_leave: "Planned leave",
  half_day: "Half day",
  wfh: "Work from home",
};

export interface DayOffPlan {
  id: string;
  employeeId: string;
  date: string;        // the day they are off (always tomorrow at filing time)
  kind: DayOffKind;
  reason: string;
  coverOwner: string;  // who picks up the work
  filedAt: number;
}

/** Shift start used for the 12-hour maths. */
export const SHIFT_START_HOUR = 10;

const KEY = "gp_dayoff_plans_v1";
const listeners = new Set<() => void>();
let ver = 0;
const notify = () => { ver++; listeners.forEach((l) => l()); };
export function subscribeDayOff(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function dayOffVersion() { return ver; }

function readAll(): DayOffPlan[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as DayOffPlan[]; } catch { return []; }
}
function writeAll(all: DayOffPlan[]) { localStorage.setItem(KEY, JSON.stringify(all)); notify(); }

export function tomorrowKey(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return dateKey(d.getTime());
}

function tomorrowShiftStart(now = new Date()): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(SHIFT_START_HOUR, 0, 0, 0);
  return d.getTime();
}

export interface DayOffWindow {
  open: boolean;
  opensAt: number;   // 24h before tomorrow's shift start
  closesAt: number;  // 12h before tomorrow's shift start
  msToClose: number;
  reason: string;
}

export function dayOffWindow(now = Date.now()): DayOffWindow {
  const start = tomorrowShiftStart(new Date(now));
  const opensAt = start - 24 * 3_600_000;
  const closesAt = start - 12 * 3_600_000;
  const open = now >= opensAt && now <= closesAt;
  const fmt = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return {
    open,
    opensAt,
    closesAt,
    msToClose: closesAt - now,
    reason: open
      ? `Window closes at ${fmt(closesAt)} — 12 hours before tomorrow's shift.`
      : now < opensAt
        ? `Too early. The window opens at ${fmt(opensAt)}, exactly one day before the shift.`
        : `Too late. The window closed at ${fmt(closesAt)}. Call your manager — this is now an unplanned absence.`,
  };
}

export function planFor(employeeId: string, date: string): DayOffPlan | undefined {
  return readAll().find((p) => p.employeeId === employeeId && p.date === date);
}

export function plansOn(date: string): DayOffPlan[] {
  return readAll().filter((p) => p.date === date);
}

export function allPlans(): DayOffPlan[] {
  return [...readAll()].sort((a, b) => b.filedAt - a.filedAt);
}

export function filePlan(input: Omit<DayOffPlan, "id" | "filedAt" | "date">): { ok: boolean; message: string } {
  const w = dayOffWindow();
  if (!w.open) return { ok: false, message: w.reason };
  const date = tomorrowKey();
  if (planFor(input.employeeId, date)) return { ok: false, message: "You already filed a plan for tomorrow." };
  if (!input.reason.trim()) return { ok: false, message: "Add a reason so the day can be re-planned." };
  if (!input.coverOwner.trim()) return { ok: false, message: "Name who covers your targets tomorrow." };
  writeAll([...readAll(), { ...input, date, id: `off_${Date.now()}`, filedAt: Date.now() }]);
  return { ok: true, message: `Filed. Tomorrow (${date}) is planned and your manager can re-balance the team.` };
}

export function cancelPlan(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function nameOf(employeeId: string) {
  return EMPLOYEES.find((e) => e.id === employeeId)?.name || employeeId;
}