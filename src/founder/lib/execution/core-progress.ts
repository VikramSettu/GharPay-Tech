// Per-employee, per-day counters for the four core-role targets, the tickable
// daily-flow state, and the recovery plans required by the achievement
// enforcement engine.

import { todayKey } from "@/founder/lib/attendance-store";
import type { CoreRoleId } from "@/founder/lib/execution/core-roles";
import type { PhaseId } from "@/founder/lib/execution/core-tasks";

export interface RecoveryPlan { ts: number; checkpoint: string; metric: string; gap: number; answers: string[] }

export interface PhaseSubmission { ts: number; values: Record<string, string> }

/** A selfie proof captured at a fixed moment of the day. */
export interface SelfieProof { ts: number; img: string }

export interface CoreDay {
  employeeId: string;
  roleId: CoreRoleId;
  date: string;
  counts: Record<string, number>;
  checks: Record<string, number>;              // stepId -> completed timestamp
  phases: Partial<Record<PhaseId, { startedAt?: number; doneAt?: number }>>;
  submissions: Partial<Record<PhaseId, PhaseSubmission>>;
  selfies: Record<string, SelfieProof>;        // selfie moment id -> proof
  recoveries: RecoveryPlan[];
}

const KEY = "gp_core_progress_v1";
const listeners = new Set<() => void>();
let ver = 0;
const notify = () => { ver++; listeners.forEach((l) => l()); };
export function subscribeCore(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function coreVersion() { return ver; }

function blank(employeeId: string, roleId: CoreRoleId, date: string): CoreDay {
  return { employeeId, roleId, date, counts: {}, checks: {}, phases: {}, submissions: {}, selfies: {}, recoveries: [] };
}


function readAll(): CoreDay[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as CoreDay[];
    return raw.map((r) => ({ ...blank(r.employeeId, r.roleId, r.date), ...r }));
  } catch { return []; }
}
function writeAll(all: CoreDay[]) { localStorage.setItem(KEY, JSON.stringify(all)); notify(); }

function key(r: CoreDay, employeeId: string, roleId: string, date: string) {
  return r.employeeId === employeeId && r.roleId === roleId && r.date === date;
}

export function getCoreDay(employeeId: string, roleId: CoreRoleId, date = todayKey()): CoreDay {
  return readAll().find((r) => key(r, employeeId, roleId, date)) || blank(employeeId, roleId, date);
}

function upsert(rec: CoreDay) {
  const all = readAll();
  const i = all.findIndex((r) => key(r, rec.employeeId, rec.roleId, rec.date));
  if (i >= 0) all[i] = rec; else all.push(rec);
  writeAll(all);
}

export function bump(employeeId: string, roleId: CoreRoleId, metric: string, delta: number, date = todayKey()) {
  const rec = getCoreDay(employeeId, roleId, date);
  rec.counts[metric] = Math.max(0, (rec.counts[metric] || 0) + delta);
  upsert(rec);
}

/** Set a counter to an absolute value (used when a phase report reconciles actuals). */
export function setCount(employeeId: string, roleId: CoreRoleId, metric: string, value: number, date = todayKey()) {
  const rec = getCoreDay(employeeId, roleId, date);
  rec.counts[metric] = Math.max(0, Math.round(value));
  upsert(rec);
}

export function toggleStep(employeeId: string, roleId: CoreRoleId, stepId: string, date = todayKey()) {
  const rec = getCoreDay(employeeId, roleId, date);
  if (rec.checks[stepId]) delete rec.checks[stepId];
  else rec.checks[stepId] = Date.now();
  upsert(rec);
}

export function startPhase(employeeId: string, roleId: CoreRoleId, phase: PhaseId, date = todayKey()) {
  const rec = getCoreDay(employeeId, roleId, date);
  rec.phases[phase] = { ...(rec.phases[phase] || {}), startedAt: rec.phases[phase]?.startedAt || Date.now() };
  upsert(rec);
}

export function completePhase(employeeId: string, roleId: CoreRoleId, phase: PhaseId, date = todayKey()) {
  const rec = getCoreDay(employeeId, roleId, date);
  rec.phases[phase] = { startedAt: rec.phases[phase]?.startedAt || Date.now(), doneAt: Date.now() };
  upsert(rec);
}

/** Save the data a person submits at the end of a phase. */
export function submitPhase(
  employeeId: string,
  roleId: CoreRoleId,
  phase: PhaseId,
  values: Record<string, string>,
  date = todayKey(),
) {
  const rec = getCoreDay(employeeId, roleId, date);
  rec.submissions = { ...(rec.submissions || {}), [phase]: { ts: Date.now(), values } };
  upsert(rec);
}


/** Store the selfie proof for one fixed moment of the day (morning, break, EOD). */
export function saveSelfie(
  employeeId: string,
  roleId: CoreRoleId,
  momentId: string,
  img: string,
  date = todayKey(),
) {
  const rec = getCoreDay(employeeId, roleId, date);
  rec.selfies = { ...(rec.selfies || {}), [momentId]: { ts: Date.now(), img } };
  upsert(rec);
}

export function addRecovery(employeeId: string, roleId: CoreRoleId, plan: RecoveryPlan, date = todayKey()) {

  const rec = getCoreDay(employeeId, roleId, date);
  rec.recoveries = [...(rec.recoveries || []), plan];
  upsert(rec);
}

/** Last N days of history for one employee+role (oldest first). */
export function history(employeeId: string, roleId: CoreRoleId, days = 14): CoreDay[] {
  const all = readAll().filter((r) => r.employeeId === employeeId && r.roleId === roleId);
  const out: CoreDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    out.push(all.find((r) => r.date === ds) || blank(employeeId, roleId, ds));
  }
  return out;
}

/** Everyone working a role today — used by the analytics tab. */
export function allToday(roleId: CoreRoleId, date = todayKey()): CoreDay[] {
  return readAll().filter((r) => r.roleId === roleId && r.date === date);
}

/** Every record across every role — used by admin analytics. */
export function allRecords(): CoreDay[] { return readAll(); }

export function bulkSeed(records: CoreDay[]) {
  const all = readAll();
  for (const rec of records) {
    const i = all.findIndex((r) => key(r, rec.employeeId, rec.roleId, rec.date));
    if (i < 0) all.push(rec);
  }
  writeAll(all);
}
