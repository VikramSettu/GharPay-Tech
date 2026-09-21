// Drill-down helpers for the Admin Desk.
// Everything the admin can click needs an answer behind it: what time, what
// happened before that, and how the same person behaved on earlier days.

import type { Employee } from "@/founder/data/seed";
import {
  dayAttendance, dateRange, fmtDur, fmtMin, prettyDate, shiftDate,
  type DayAttendance,
} from "@/founder/lib/admin/admin-day";
import { CHECKPOINTS, personDay, type CheckpointId, type PersonDay } from "@/founder/lib/admin/admin-digest";

export type EventTone = "good" | "warn" | "bad" | "neutral";

export interface DayEvent {
  min: number;          // minutes from midnight, used for ordering
  time: string;         // "10:41 AM"
  title: string;
  detail: string;
  tone: EventTone;
}

/** Minute by minute story of one person's day: login, checkpoints, breaks, idle, logout. */
export function dayTimeline(a: DayAttendance | undefined, pd: PersonDay | undefined): DayEvent[] {
  if (!a) return [];
  if (!a.present) {
    return [
      {
        min: 10 * 60 + 35,
        time: "10:35 AM",
        title: a.onLeave ? "Approved leave" : "No show",
        detail: a.onLeave
          ? "Leave was cleared in advance, so no late mark applies."
          : "No login recorded against the 10:35 shift start. Counts as absent until a reason is filed.",
        tone: a.onLeave ? "neutral" : "bad",
      },
    ];
  }

  const events: DayEvent[] = [];
  const login = a.loginMin ?? 0;
  events.push({
    min: login,
    time: fmtMin(login),
    title: a.lateBy > 0 ? `Logged in late by ${fmtDur(a.lateBy)}` : "Logged in on time",
    detail:
      a.lateBy > 0
        ? `Shift starts 10:35. Login landed at ${fmtMin(login)}, which made this person late serial #${a.lateSerial} for the day.`
        : `Login at ${fmtMin(login)}, ${fmtDur(10 * 60 + 35 - login)} before the 10:35 start.`,
    tone: a.lateBy > 0 ? (a.lateBy > 30 ? "bad" : "warn") : "good",
  });

  CHECKPOINTS.forEach((cp) => {
    const [h, m] = cp.time.split(":").map(Number);
    const min = h * 60 + m;
    const done = pd?.submitted[cp.id as CheckpointId];
    events.push({
      min,
      time: fmtMin(min),
      title: done ? `${cp.label} submitted` : `${cp.label} missing`,
      detail: done
        ? cp.id === "start"
          ? `Goal for the day was set at ${cp.time} with a promise of ${pd?.promise ?? 0}.`
          : cp.id === "impact"
            ? `Closed the day with actual ${pd?.actual ?? 0} against promise ${pd?.promise ?? 0} (${pd?.gapPct ?? 0}%).`
            : `Actuals filed at ${cp.time}, running at ${pd?.gapPct ?? 0}% of the promise.`
        : `Nothing came in at ${cp.time}. This is the gap to ask about.`,
      tone: done ? "good" : "warn",
    });
  });

  a.breaks.forEach((b) => {
    const len = b.end - b.start;
    const long = (b.label === "Lunch" && len > 40) || (b.label === "Tea" && len > 20);
    events.push({
      min: b.start,
      time: fmtMin(b.start),
      title: `${b.label} break, ${fmtDur(len)}`,
      detail: `Left at ${fmtMin(b.start)}, back at ${fmtMin(b.end)}.${long ? " Returned later than the slot allows." : " Returned inside the slot."}`,
      tone: long ? "warn" : "good",
    });
  });

  if (a.idleMin > 0) {
    events.push({
      min: 16 * 60,
      time: "Across the day",
      title: `Idle ${fmtDur(a.idleMin)}`,
      detail: `No activity recorded for ${fmtDur(a.idleMin)} outside breaks. Active time was ${fmtDur(a.activeMin)}.`,
      tone: a.idleMin > 60 ? "bad" : a.idleMin > 30 ? "warn" : "good",
    });
  }

  events.push({
    min: 20 * 60 - 1,
    time: "Across the day",
    title: `Selfie check ${a.selfies}/4`,
    detail:
      a.selfies === 4
        ? "All four rhythm selfies were taken: morning, before break, after break and EOD."
        : `${4 - a.selfies} selfie(s) missing from the morning, break and EOD points.`,
    tone: a.selfies === 4 ? "good" : a.selfies >= 3 ? "warn" : "bad",
  });

  if (a.logoutMin) {
    events.push({
      min: a.logoutMin,
      time: fmtMin(a.logoutMin),
      title: "Logged out",
      detail: `Day closed at ${fmtMin(a.logoutMin)} after ${fmtDur(a.activeMin)} of active time.`,
      tone: a.logoutMin >= 20 * 60 ? "good" : "warn",
    });
  }

  return events.sort((x, y) => x.min - y.min);
}

export interface HistoryDay {
  date: string;
  label: string;
  present: boolean;
  onLeave: boolean;
  loginMin: number | null;
  lateBy: number;
  lateSerial: number | null;
  breakMin: number;
  overBreakMin: number;
  idleMin: number;
  selfies: number;
  submittedCount: number;
  score: number;
}

/** Last N days for one person so the admin can see the pattern, not one bad day. */
export function personHistory(emp: Employee, endDate: string, days = 14): HistoryDay[] {
  const stamps = dateRange(shiftDate(endDate, -(days - 1)), endDate, days);
  return stamps.map((d) => {
    const a = dayAttendance(d).find((x) => x.emp.id === emp.id)!;
    const pd = personDay(emp, d);
    return {
      date: d,
      label: prettyDate(d),
      present: a.present,
      onLeave: a.onLeave,
      loginMin: a.loginMin,
      lateBy: a.lateBy,
      lateSerial: a.lateSerial,
      breakMin: a.breakMin,
      overBreakMin: a.overBreakMin,
      idleMin: a.idleMin,
      selfies: a.selfies,
      submittedCount: pd.submittedCount,
      score: pd.finalScore,
    };
  });
}

export interface HistorySummary {
  days: number;
  presentDays: number;
  lateDays: number;
  avgLateMin: number;
  worstLate: HistoryDay | null;
  overBreakDays: number;
  avgScore: number;
  avgReports: number;
  streak: number; // consecutive on time days ending on the selected date
  verdict: string;
}

export function summarise(history: HistoryDay[]): HistorySummary {
  const present = history.filter((h) => h.present);
  const late = present.filter((h) => h.lateBy > 0);
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (!h.present) continue;
    if (h.lateBy > 0) break;
    streak++;
  }
  const avgLate = late.length ? Math.round(late.reduce((s, h) => s + h.lateBy, 0) / late.length) : 0;
  const worstLate = late.length ? late.reduce((w, h) => (h.lateBy > w.lateBy ? h : w)) : null;
  const avgScore = present.length ? Math.round(present.reduce((s, h) => s + h.score, 0) / present.length) : 0;

  let verdict: string;
  if (!present.length) verdict = "No attendance recorded in this window.";
  else if (late.length === 0) verdict = `Clean record. On time every one of the last ${present.length} working days.`;
  else if (late.length <= 2) verdict = `Mostly reliable. Late ${late.length} of ${present.length} days, average ${fmtDur(avgLate)} past 10:35.`;
  else if (late.length / present.length > 0.5) verdict = `Repeat pattern. Late on ${late.length} of ${present.length} days. This is a habit, not a one off.`;
  else verdict = `Slipping. Late ${late.length} of ${present.length} days, worst was ${worstLate ? `${fmtDur(worstLate.lateBy)} on ${worstLate.label}` : "n/a"}.`;

  return {
    days: history.length,
    presentDays: present.length,
    lateDays: late.length,
    avgLateMin: avgLate,
    worstLate,
    overBreakDays: present.filter((h) => h.overBreakMin > 0).length,
    avgScore,
    avgReports: present.length
      ? Math.round((present.reduce((s, h) => s + h.submittedCount, 0) / present.length) * 10) / 10
      : 0,
    streak,
    verdict,
  };
}

/** WhatsApp text for one person's full drill down, including the pattern line. */
export function buildPersonDeepDigest(
  date: string,
  emp: Employee,
  a: DayAttendance | undefined,
  pd: PersonDay | undefined,
  history: HistoryDay[],
): string {
  const sum = summarise(history);
  const lines: string[] = [];
  lines.push(`*${emp.name} · ${prettyDate(date)}*`);
  lines.push(`${emp.role} · ${emp.zone ?? "HQ"}`);
  lines.push("");
  if (a?.present) {
    lines.push(`Login ${fmtMin(a.loginMin ?? 0)}${a.lateBy ? ` (late by ${fmtDur(a.lateBy)}, serial #${a.lateSerial})` : " (on time)"}`);
    lines.push(`Break ${fmtDur(a.breakMin)}${a.overBreakMin ? ` (over by ${fmtDur(a.overBreakMin)})` : " (inside allowance)"}`);
    lines.push(`Idle ${fmtDur(a.idleMin)} · Active ${fmtDur(a.activeMin)} · Selfies ${a.selfies}/4`);
    lines.push(`Logout ${fmtMin(a.logoutMin ?? 0)}`);
  } else {
    lines.push(a?.onLeave ? "On approved leave." : "Absent, no login recorded.");
  }
  lines.push("");
  if (pd) {
    lines.push(`Reports ${pd.submittedCount}/4 · Promise ${pd.promise} · Actual ${pd.actual} (${pd.gapPct}%)`);
    lines.push(`Score ${pd.finalScore}/100${pd.mark.markup ? ` (${pd.mark.markup > 0 ? "+" : ""}${pd.mark.markup} admin)` : ""}`);
    CHECKPOINTS.forEach((cp) => {
      lines.push(`${pd.submitted[cp.id as CheckpointId] ? "✅" : "⭕"} ${cp.time} ${cp.label}`);
    });
    if (pd.mark.note) lines.push(`Note: "${pd.mark.note}"`);
  }
  lines.push("");
  lines.push(`*Last ${sum.days} days*`);
  lines.push(sum.verdict);
  lines.push(`Late ${sum.lateDays} days · Break overrun ${sum.overBreakDays} days · Avg score ${sum.avgScore} · Avg reports ${sum.avgReports}/4`);
  lines.push("");
  lines.push("Sent from Gharpayy Admin Desk");
  return lines.join("\n");
}
