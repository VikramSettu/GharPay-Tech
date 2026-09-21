// Admin Desk day engine.
// Deterministic, date-seeded attendance detail for every employee: login time,
// how late they were, the late serial number for the day, break usage, over-break
// minutes, idle stretches and zone rollups. Same date always returns the same
// numbers so the admin can scroll back through history and trust it.

import { EMPLOYEES, type Employee } from "@/founder/data/seed";

export const SHIFT_START_MIN = 10 * 60 + 35; // 10:35
export const BREAK_ALLOWANCE_MIN = 45;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function pick(seed: string, min: number, max: number): number {
  return min + (hash(seed) % (max - min + 1));
}

export function fmtMin(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function fmtDur(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  return h ? `${h}h ${min % 60}m` : `${min}m`;
}

export interface BreakLog {
  start: number; // minutes from midnight
  end: number;
  label: string;
}

export interface DayAttendance {
  emp: Employee;
  present: boolean;
  onLeave: boolean;
  loginMin: number | null;
  logoutMin: number | null;
  lateBy: number; // minutes past 10:35
  lateSerial: number | null; // 1 = first late person of the day
  breaks: BreakLog[];
  breakMin: number;
  overBreakMin: number;
  lateBreakReturns: number; // breaks that ran past the allowed slot
  idleMin: number;
  activeMin: number;
  selfies: number; // out of 4 rhythm selfies
}

const LEAVE_RATE = 8; // ~8% of the roster off on a given date

function attendanceFor(emp: Employee, date: string): Omit<DayAttendance, "lateSerial"> {
  const s = `${emp.id}:${date}`;
  const onLeave = hash(s + "leave") % 100 < LEAVE_RATE;
  const absent = !onLeave && emp.status === "Offline" && hash(s + "abs") % 100 < 55;
  const present = !onLeave && !absent;

  if (!present) {
    return {
      emp,
      present: false,
      onLeave,
      loginMin: null,
      logoutMin: null,
      lateBy: 0,
      breaks: [],
      breakMin: 0,
      overBreakMin: 0,
      lateBreakReturns: 0,
      idleMin: 0,
      activeMin: 0,
      selfies: 0,
    };
  }

  // Most of the floor lands early; a quarter slips past 10:35, a few badly.
  const roll = hash(s + "loginroll") % 100;
  const drift =
    roll < 72 ? -pick(s + "early", 1, 18) : roll < 92 ? pick(s + "slip", 2, 17) : pick(s + "bad", 18, 55);
  const lateBy = Math.max(0, drift);
  const loginMin = SHIFT_START_MIN + drift;
  const logoutMin = 20 * 60 + pick(s + "out", -25, 45);

  const lunchStart = 13 * 60 + pick(s + "b1", 5, 35);
  const lunchLen = pick(s + "b1l", 20, 55);
  const teaLen = pick(s + "b2l", 5, 28);
  const teaStart = 17 * 60 + pick(s + "b2", 0, 30);
  const breaks: BreakLog[] = [
    { start: lunchStart, end: lunchStart + lunchLen, label: "Lunch" },
    { start: teaStart, end: teaStart + teaLen, label: "Tea" },
  ];
  const breakMin = lunchLen + teaLen;
  const overBreakMin = Math.max(0, breakMin - BREAK_ALLOWANCE_MIN);
  const lateBreakReturns = (lunchLen > 40 ? 1 : 0) + (teaLen > 20 ? 1 : 0);

  const idleMin = pick(s + "idle", 0, 95);
  const activeMin = Math.max(0, logoutMin - loginMin - breakMin - idleMin);
  const selfies = Math.min(4, 4 - (hash(s + "self") % 100 < 22 ? 1 : 0) - (hash(s + "self2") % 100 < 10 ? 1 : 0));

  return {
    emp,
    present: true,
    onLeave: false,
    loginMin,
    logoutMin,
    lateBy,
    breaks,
    breakMin,
    overBreakMin,
    lateBreakReturns,
    idleMin,
    activeMin,
    selfies,
  };
}

/** Every person's attendance for a date, with late serial numbers assigned in login order. */
export function dayAttendance(date: string): DayAttendance[] {
  const base = EMPLOYEES.map((e) => attendanceFor(e, date));
  const lateOrder = base
    .filter((a) => a.present && a.lateBy > 0)
    .sort((a, b) => (a.loginMin ?? 0) - (b.loginMin ?? 0));
  const serials = new Map<string, number>();
  lateOrder.forEach((a, i) => serials.set(a.emp.id, i + 1));
  return base.map((a) => ({ ...a, lateSerial: serials.get(a.emp.id) ?? null }));
}

export interface DayRollup {
  roster: number;
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  lateMinutes: number;
  avgLoginMin: number | null;
  overBreakPeople: number;
  overBreakMinutes: number;
  lateBreakReturns: number;
  idleMinutes: number;
  selfieCompliance: number;
  punctuality: number;
}

export function rollup(list: DayAttendance[]): DayRollup {
  const present = list.filter((a) => a.present);
  const late = present.filter((a) => a.lateBy > 0);
  const logins = present.map((a) => a.loginMin ?? 0);
  return {
    roster: list.length,
    present: present.length,
    absent: list.filter((a) => !a.present && !a.onLeave).length,
    onLeave: list.filter((a) => a.onLeave).length,
    late: late.length,
    lateMinutes: late.reduce((s, a) => s + a.lateBy, 0),
    avgLoginMin: logins.length ? Math.round(logins.reduce((s, v) => s + v, 0) / logins.length) : null,
    overBreakPeople: present.filter((a) => a.overBreakMin > 0).length,
    overBreakMinutes: present.reduce((s, a) => s + a.overBreakMin, 0),
    lateBreakReturns: present.reduce((s, a) => s + a.lateBreakReturns, 0),
    idleMinutes: present.reduce((s, a) => s + a.idleMin, 0),
    selfieCompliance: present.length
      ? Math.round((present.reduce((s, a) => s + a.selfies, 0) / (present.length * 4)) * 100)
      : 0,
    punctuality: present.length ? Math.round(((present.length - late.length) / present.length) * 100) : 0,
  };
}

/** Inclusive list of yyyy-mm-dd stamps between two dates (capped). */
export function dateRange(from: string, to: string, cap = 62): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [to];
  const cur = new Date(start);
  while (cur <= end && out.length < cap) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`,
    );
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function shiftDate(stamp: string, days: number): string {
  const d = new Date(`${stamp}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function prettyDate(stamp: string): string {
  const d = new Date(`${stamp}T00:00:00`);
  if (Number.isNaN(d.getTime())) return stamp;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export interface ZoneAttendance {
  zone: string;
  list: DayAttendance[];
  roll: DayRollup;
}

export function zoneAttendance(list: DayAttendance[]): ZoneAttendance[] {
  const map = new Map<string, DayAttendance[]>();
  list.forEach((a) => {
    const z = a.emp.zone && a.emp.zone !== "All" ? a.emp.zone : "HQ";
    map.set(z, [...(map.get(z) ?? []), a]);
  });
  return Array.from(map.entries())
    .map(([zone, l]) => ({ zone, list: l, roll: rollup(l) }))
    .sort((a, b) => a.zone.localeCompare(b.zone));
}

/** WhatsApp block for the discipline side of the day: late list with serials, breaks, absentees. */
export function buildDisciplineDigest(date: string, list: DayAttendance[]): string {
  const roll = rollup(list);
  const late = list
    .filter((a) => a.lateSerial)
    .sort((a, b) => (a.lateSerial ?? 0) - (b.lateSerial ?? 0));
  const overBreak = list.filter((a) => a.overBreakMin > 0).sort((a, b) => b.overBreakMin - a.overBreakMin);
  const absent = list.filter((a) => !a.present && !a.onLeave);
  const leave = list.filter((a) => a.onLeave);

  const lines: string[] = [];
  lines.push(`*DISCIPLINE REPORT · ${prettyDate(date)}*`);
  lines.push("");
  lines.push(`Present ${roll.present}/${roll.roster} · Punctuality ${roll.punctuality}% · Selfie check ${roll.selfieCompliance}%`);
  lines.push(`Shift start 10:35 · Average login ${roll.avgLoginMin ? fmtMin(roll.avgLoginMin) : "n/a"}`);
  lines.push("");
  lines.push(`*Late (${late.length})*`);
  if (!late.length) lines.push("Everyone logged in on time.");
  late.forEach((a) =>
    lines.push(`${a.lateSerial}. ${a.emp.name} (${a.emp.zone ?? "HQ"}) login ${fmtMin(a.loginMin ?? 0)}, late by ${fmtDur(a.lateBy)}`),
  );
  lines.push("");
  lines.push(`*Break overrun (${overBreak.length})*`);
  if (!overBreak.length) lines.push("All breaks inside the 45 minute allowance.");
  overBreak.forEach((a) => lines.push(`• ${a.emp.name} took ${fmtDur(a.breakMin)}, over by ${fmtDur(a.overBreakMin)}`));
  lines.push("");
  lines.push(`*Absent (${absent.length})*`);
  absent.forEach((a) => lines.push(`• ${a.emp.name} (${a.emp.role})`));
  if (!absent.length) lines.push("Nobody absent.");
  lines.push("");
  lines.push(`*On leave (${leave.length})*`);
  leave.forEach((a) => lines.push(`• ${a.emp.name}`));
  if (!leave.length) lines.push("No approved leave today.");
  lines.push("");
  lines.push("Sent from Gharpayy Admin Desk");
  return lines.join("\n");
}

export function buildZoneAttendanceDigest(date: string, zones: ZoneAttendance[]): string {
  const lines = [`*ZONE DISCIPLINE · ${prettyDate(date)}*`, ""];
  zones.forEach((z) => {
    const dot = z.roll.punctuality >= 90 ? "🟢" : z.roll.punctuality >= 75 ? "🟠" : "🔴";
    lines.push(
      `${dot} ${z.zone} — present ${z.roll.present}/${z.roll.roster}, late ${z.roll.late}, break overrun ${fmtDur(z.roll.overBreakMinutes)}, punctuality ${z.roll.punctuality}%`,
    );
  });
  return lines.join("\n");
}

/** Multi-day trend used by the date range filter. */
export interface TrendPoint {
  date: string;
  punctuality: number;
  present: number;
  roster: number;
  late: number;
  overBreakMinutes: number;
}

export function trend(dates: string[]): TrendPoint[] {
  return dates.map((d) => {
    const r = rollup(dayAttendance(d));
    return {
      date: d,
      punctuality: r.punctuality,
      present: r.present,
      roster: r.roster,
      late: r.late,
      overBreakMinutes: r.overBreakMinutes,
    };
  });
}
