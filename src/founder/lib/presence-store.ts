// Presence engine — Active / Away / Break / Offline with automatic idle
// detection. Local-first (localStorage) so the whole Arena can read the same
// signal: who is working, who is idle, who stepped away, and for how long.

import { EMPLOYEES } from "@/founder/data/seed";

export type PresenceState = "active" | "away" | "break" | "offline";
export type EffectiveState = PresenceState | "idle";

export interface PresenceRec {
  employeeId: string;
  state: PresenceState;
  since: number;
  lastSeen: number;
  note?: string;
}

/** No interaction for this long while "active" reads as idle. */
export const IDLE_MS = 10 * 60_000;

export const PRESENCE_META: Record<EffectiveState, { label: string; dot: string; tone: string }> = {
  active:  { label: "Active",  dot: "bg-success",             tone: "border-success/40 text-success" },
  idle:    { label: "Idle",    dot: "bg-warning",             tone: "border-warning/40 text-warning" },
  away:    { label: "Away",    dot: "bg-destructive",         tone: "border-destructive/40 text-destructive" },
  break:   { label: "Break",   dot: "bg-primary",             tone: "border-primary/40 text-primary" },
  offline: { label: "Offline", dot: "bg-muted-foreground/40", tone: "border-border text-muted-foreground" },
};

const KEY = "gp_presence_v1";
const listeners = new Set<() => void>();
let ver = 0;
const notify = () => { ver++; listeners.forEach((l) => l()); };
export function subscribePresence(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function presenceVersion() { return ver; }

function readAll(): PresenceRec[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as PresenceRec[]; } catch { return []; }
}
function writeAll(all: PresenceRec[]) { localStorage.setItem(KEY, JSON.stringify(all)); notify(); }

export function presenceFor(employeeId: string): PresenceRec {
  const now = Date.now();
  return (
    readAll().find((p) => p.employeeId === employeeId) ||
    { employeeId, state: "offline", since: now, lastSeen: now }
  );
}

export function allPresence(): PresenceRec[] {
  return EMPLOYEES.map((e) => presenceFor(e.id));
}

function upsert(rec: PresenceRec) {
  const all = readAll();
  const i = all.findIndex((p) => p.employeeId === rec.employeeId);
  if (i >= 0) all[i] = rec; else all.push(rec);
  writeAll(all);
}

export function setPresence(employeeId: string, state: PresenceState, note?: string) {
  const prev = presenceFor(employeeId);
  const now = Date.now();
  upsert({
    employeeId,
    state,
    since: prev.state === state ? prev.since : now,
    lastSeen: now,
    note: note ?? (prev.state === state ? prev.note : undefined),
  });
}

/** Called on real user interaction — keeps "active" from decaying into idle. */
export function heartbeat(employeeId: string) {
  const prev = presenceFor(employeeId);
  if (prev.state !== "active") return;
  if (Date.now() - prev.lastSeen < 30_000) return; // throttle writes
  upsert({ ...prev, lastSeen: Date.now() });
}

export function effectiveState(rec: PresenceRec, now = Date.now()): EffectiveState {
  if (rec.state === "active" && now - rec.lastSeen > IDLE_MS) return "idle";
  return rec.state;
}

export function fmtSince(ts: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - ts) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** Deterministic demo presence for everyone except the actor, so admin views are alive. */
export function seedPresence() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("gp_presence_seed_v1")) return;
  const now = Date.now();
  const states: PresenceState[] = ["active", "active", "active", "break", "away", "active", "offline"];
  const all: PresenceRec[] = EMPLOYEES.map((e, i) => {
    const state = states[i % states.length];
    const idleDrift = i % 5 === 3 ? 22 * 60_000 : (i % 7) * 60_000; // some read as idle
    return {
      employeeId: e.id,
      state,
      since: now - (20 + (i % 6) * 25) * 60_000,
      lastSeen: now - idleDrift,
    };
  });
  writeAll(all);
  localStorage.setItem("gp_presence_seed_v1", "1");
}