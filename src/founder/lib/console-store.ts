// Operator Console store — per-actor, per-day counters, sprint/window completion, EOD drafts.
import { useSyncExternalStore } from "react";
import { makeStore } from "./store";
import { nowMin, playbookFor, type PlaybookKey } from "@/founder/data/playbooks";

export interface DayState {
  date: string; // YYYY-MM-DD
  actorId: string;
  // KPI id → numeric value
  kpis: Record<string, number>;
  // sprint id → completed?
  sprints: Record<string, boolean>;
  // window id → sent timestamp (ms)
  windowsSent: Record<string, number>;
  // EOD field id → text
  eod: Record<string, string>;
  // Hard decisions made today
  decisions: { id: string; ts: number; text: string }[];
}

export interface ConsoleState {
  days: DayState[];
}

const SEED: ConsoleState = { days: [] };

const store = makeStore<ConsoleState>("gp_console_v1", SEED);

export function ensureConsoleSeed() {
  store.ensureSeed();
}

export function todayKey(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function findDay(state: ConsoleState, date: string, actorId: string) {
  return state.days.find((d) => d.date === date && d.actorId === actorId);
}

function ensureDay(actorId: string): DayState {
  const date = todayKey();
  const state = store.read();
  let day = findDay(state, date, actorId);
  if (!day) {
    day = {
      date, actorId,
      kpis: {}, sprints: {}, windowsSent: {}, eod: {}, decisions: [],
    };
    store.write({ days: [day, ...state.days] });
  }
  return day;
}

function patchDay(actorId: string, fn: (d: DayState) => DayState) {
  const date = todayKey();
  const state = store.read();
  const day = findDay(state, date, actorId) ?? {
    date, actorId, kpis: {}, sprints: {}, windowsSent: {}, eod: {}, decisions: [],
  };
  const next = fn(day);
  const others = state.days.filter((d) => !(d.date === date && d.actorId === actorId));
  store.write({ days: [next, ...others] });
}

export function useConsoleDay(actorId: string): DayState {
  const state = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.read(),
    store.getServerSnapshot,
  );
  const date = todayKey();
  return findDay(state, date, actorId) ?? {
    date, actorId, kpis: {}, sprints: {}, windowsSent: {}, eod: {}, decisions: [],
  };
}

// Subscribe to the full state (all days, all actors). Used by admin panel.
export function useAllConsoleState(): ConsoleState {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.read(),
    store.getServerSnapshot,
  );
}

export function deleteConsoleDay(actorId: string, date: string) {
  const state = store.read();
  store.write({ days: state.days.filter((d) => !(d.actorId === actorId && d.date === date)) });
}

// ---- Mutations ----
export function bumpKpi(actorId: string, kpiId: string, delta: number) {
  ensureDay(actorId);
  patchDay(actorId, (d) => ({
    ...d,
    kpis: { ...d.kpis, [kpiId]: Math.max(0, (d.kpis[kpiId] ?? 0) + delta) },
  }));
}

export function setKpi(actorId: string, kpiId: string, value: number) {
  ensureDay(actorId);
  patchDay(actorId, (d) => ({
    ...d, kpis: { ...d.kpis, [kpiId]: Math.max(0, value) },
  }));
}

export function toggleSprint(actorId: string, sprintId: string) {
  ensureDay(actorId);
  patchDay(actorId, (d) => ({
    ...d, sprints: { ...d.sprints, [sprintId]: !d.sprints[sprintId] },
  }));
}

export function markWindowSent(actorId: string, windowId: string) {
  ensureDay(actorId);
  patchDay(actorId, (d) => ({
    ...d, windowsSent: { ...d.windowsSent, [windowId]: Date.now() },
  }));
}

export function setEod(actorId: string, fieldId: string, value: string) {
  ensureDay(actorId);
  patchDay(actorId, (d) => ({ ...d, eod: { ...d.eod, [fieldId]: value } }));
}

export function logDecision(actorId: string, text: string) {
  if (!text.trim()) return;
  ensureDay(actorId);
  patchDay(actorId, (d) => ({
    ...d,
    decisions: [{ id: crypto.randomUUID(), ts: Date.now(), text: text.trim() }, ...d.decisions],
  }));
}

// ---- Derived ----
export type ShieldState = { active: boolean; label: string; until?: number };

export function shieldNow(actorId: string): ShieldState {
  const pb = playbookFor(actorId);
  if (!pb) return { active: false, label: "" };
  const m = nowMin();
  const block = pb.shieldBlocks.find((b) => m >= b.startMin && m < b.endMin);
  return block
    ? { active: true, label: block.label, until: block.endMin }
    : { active: false, label: "" };
}

export function currentSprint(actorId: string) {
  const pb = playbookFor(actorId);
  if (!pb) return undefined;
  const m = nowMin();
  return pb.sprints.find((s) => m >= s.startMin && m < s.endMin);
}

export function nextSprint(actorId: string) {
  const pb = playbookFor(actorId);
  if (!pb) return undefined;
  const m = nowMin();
  return pb.sprints.find((s) => s.startMin > m);
}

export function nextWindow(actorId: string) {
  const pb = playbookFor(actorId);
  if (!pb) return undefined;
  const m = nowMin();
  return pb.commWindows.find((w) => w.atMin > m - 5);
}

export function dayHealth(actorId: string): { score: number; label: string } {
  const pb = playbookFor(actorId);
  if (!pb) return { score: 0, label: "—" };
  const day = store.read().days.find((d) => d.date === todayKey() && d.actorId === actorId);
  if (!day) return { score: 0, label: "Not started" };
  let hit = 0;
  pb.kpis.forEach((k) => {
    const v = day.kpis[k.id] ?? 0;
    if (k.kind === "boolean") { if (v >= 1) hit++; }
    else if (k.kind === "percent") { if (v >= k.target) hit++; }
    else { if (v >= k.target) hit++; }
  });
  const score = Math.round((hit / pb.kpis.length) * 100);
  const label = score >= 90 ? "On fire" : score >= 70 ? "On track" : score >= 40 ? "Behind" : "Red zone";
  return { score, label };
}

export function exportEodText(actorId: string, key: PlaybookKey): string {
  const pb = playbookFor(actorId);
  if (!pb) return "";
  const day = store.read().days.find((d) => d.date === todayKey() && d.actorId === actorId);
  const lines = [`${pb.title.toUpperCase()} EOD — ${todayKey()}`, ""];
  pb.eodFields.forEach((f) => {
    const v = day?.eod[f.id] ?? "";
    lines.push(`${f.label}: ${v || "—"}`);
  });
  if (day?.decisions.length) {
    lines.push("", "Hard decisions today:");
    day.decisions.forEach((d) => lines.push(`• ${d.text}`));
  }
  // Reference key in output so unused-key warnings don't fire
  return `${lines.join("\n")}\n\n[playbook:${key}]`;
}
