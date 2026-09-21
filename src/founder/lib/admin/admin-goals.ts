// Goal engine for the Admin Desk.
// Every person has three connected targets: today's number, the week goal and
// the month goal. Daily promises roll up into the week, weeks roll up into the
// month, so a miss at 13:15 is visible against the month on the same screen.

import { EMPLOYEES, type Employee } from "@/founder/data/seed";
import { personDay } from "@/founder/lib/admin/admin-digest";
import {
  dateRange, dayAttendance, fmtDur, fmtMin, prettyDate, shiftDate,
} from "@/founder/lib/admin/admin-day";

/** Gharpayy works Monday to Saturday. */
export function isWorkingDay(stamp: string): boolean {
  return new Date(`${stamp}T00:00:00`).getDay() !== 0;
}

export function weekStart(stamp: string): string {
  const d = new Date(`${stamp}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  return shiftDate(stamp, -dow);
}

export function monthStart(stamp: string): string {
  return `${stamp.slice(0, 7)}-01`;
}

export function monthEnd(stamp: string): string {
  const [y, m] = stamp.split("-").map(Number);
  const last = new Date(y, m, 0); // last day of month m
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

export function workingDays(from: string, to: string): string[] {
  return dateRange(from, to, 40).filter(isWorkingDay);
}

export interface GoalWindow {
  from: string;
  to: string;
  goal: number;     // target for the whole window
  expected: number; // pro-rated target up to and including the viewed date
  actual: number;   // delivered up to and including the viewed date
  pct: number;      // actual vs expected
  days: number;
  daysDone: number;
  daysLeft: number;
}

function windowGoal(emp: Employee, from: string, to: string, upto: string): GoalWindow {
  const days = workingDays(from, to);
  let goal = 0;
  let expected = 0;
  let actual = 0;
  let daysDone = 0;
  for (const d of days) {
    const pd = personDay(emp, d);
    goal += pd.promise;
    if (d <= upto) {
      expected += pd.promise;
      actual += pd.actual;
      daysDone++;
    }
  }
  const pct = expected ? Math.round((actual / expected) * 100) : 100;
  return { from, to, goal, expected, actual, pct, days: days.length, daysDone, daysLeft: days.length - daysDone };
}

export interface GoalLadder {
  today: { goal: number; actual: number; pct: number };
  week: GoalWindow;
  month: GoalWindow;
}

export function goalLadder(emp: Employee, date: string): GoalLadder {
  const pd = personDay(emp, date);
  const ws = weekStart(date);
  return {
    today: { goal: pd.promise, actual: pd.actual, pct: pd.gapPct },
    week: windowGoal(emp, ws, shiftDate(ws, 5), date),
    month: windowGoal(emp, monthStart(date), monthEnd(date), date),
  };
}

export interface CompanyLadder {
  emp: Employee;
  ladder: GoalLadder;
}

/** Goal ladders for the whole roster on a date. Memoize the caller side. */
export function companyLadders(date: string): CompanyLadder[] {
  return EMPLOYEES.map((emp) => ({ emp, ladder: goalLadder(emp, date) }));
}

export function paceVerdict(pct: number): string {
  if (pct >= 100) return "Ahead of pace. Protect the streak.";
  if (pct >= 85) return "On pace. Close the window clean.";
  if (pct >= 70) return "Slightly behind. A focused block today fixes it.";
  return "Well behind pace. Needs a recovery plan today, not later.";
}

/** WhatsApp-ready weekly report for one person: goal ladder plus day by day. */
export function weeklyReportText(emp: Employee, date: string): string {
  const ws = weekStart(date);
  const lad = goalLadder(emp, date);
  const days = workingDays(ws, date);

  const lines: string[] = [];
  lines.push(`*WEEKLY REPORT · ${emp.name}*`);
  lines.push(`${emp.role} · ${emp.zone ?? "HQ"} · ${prettyDate(ws)} to ${prettyDate(date)}`);
  lines.push("");
  lines.push(`Week goal ${lad.week.goal} · expected by today ${lad.week.expected} · delivered ${lad.week.actual} (${lad.week.pct}%)`);
  lines.push(`Month goal ${lad.month.goal} · expected ${lad.month.expected} · delivered ${lad.month.actual} (${lad.month.pct}%)`);
  lines.push(paceVerdict(lad.week.pct));
  lines.push("");
  lines.push("*Day by day*");
  days.forEach((d) => {
    const pd = personDay(emp, d);
    const a = dayAttendance(d).find((x) => x.emp.id === emp.id);
    const status = !a?.present
      ? a?.onLeave ? "leave" : "absent"
      : a.lateBy
        ? `late ${fmtDur(a.lateBy)} (in ${fmtMin(a.loginMin ?? 0)})`
        : "on time";
    lines.push(`• ${prettyDate(d)}: ${pd.actual}/${pd.promise} (${pd.gapPct}%), reports ${pd.submittedCount}/4, ${status}`);
  });
  lines.push("");
  lines.push("Sent from Gharpayy Admin Desk");
  return lines.join("\n");
}
