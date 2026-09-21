// Admin-editable configuration for the daily flow UI.
// - KPI keys shown on the "Today so far" strip
// - Per-phase title and helper text
// Everything persists to localStorage; admins edit from /admin/ops → Config.

export interface PhaseCopy {
  id: string;
  title: string;
  hint: string;
}

export const DEFAULT_KPI_KEYS: string[] = [
  "bbd",
  "quotations",
  "cold_calls",
  "connected_calls",
  "checks_drafted",
  "doors_initiated",
];

export const DEFAULT_PHASES: PhaseCopy[] = [
  { id: "morning", title: "10:35 · Day Start · Goal", hint: "Check in, declare the goal as one number, and commit what lands by 1:15 PM." },
  { id: "midday",  title: "1:15 · Phase 1 Actuals",   hint: "Promised vs delivered vs gap, then Break 1 (1:15–2:00) and the 2:00 recovery commit." },
  { id: "evening", title: "5:00 · Phase 2 Actuals",   hint: "Final gap named and the 8 PM commitment locked, then Break 2 (5:00–5:20)." },
  { id: "eod",     title: "8:00 · Final Impact · Day End", hint: "Business outcome created, goal hit yes/no, tomorrow's pipeline locked." },
  { id: "more",    title: "Additional tasks", hint: "Anything outside the standard rhythm." },
];

const KEY = "gp_daily_config_v1";

interface Cfg {
  kpiKeys: string[];
  phases: Record<string, PhaseCopy>;
}

const listeners = new Set<() => void>();
let ver = 0;
function notify() { ver++; listeners.forEach((l) => l()); }
export function subscribeDailyCfg(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function dailyCfgVersion() { return ver; }

function read(): Cfg {
  if (typeof window === "undefined") return { kpiKeys: DEFAULT_KPI_KEYS, phases: Object.fromEntries(DEFAULT_PHASES.map((p) => [p.id, p])) };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { kpiKeys: DEFAULT_KPI_KEYS, phases: Object.fromEntries(DEFAULT_PHASES.map((p) => [p.id, p])) };
    const parsed = JSON.parse(raw) as Partial<Cfg>;
    return {
      kpiKeys: parsed.kpiKeys?.length ? parsed.kpiKeys : DEFAULT_KPI_KEYS,
      phases: { ...Object.fromEntries(DEFAULT_PHASES.map((p) => [p.id, p])), ...(parsed.phases || {}) },
    };
  } catch {
    return { kpiKeys: DEFAULT_KPI_KEYS, phases: Object.fromEntries(DEFAULT_PHASES.map((p) => [p.id, p])) };
  }
}
function write(c: Cfg) { localStorage.setItem(KEY, JSON.stringify(c)); notify(); }

export function getKpiKeys(): string[] { return read().kpiKeys; }
export function setKpiKeys(keys: string[]) { const c = read(); c.kpiKeys = keys.filter(Boolean); write(c); }

export function getPhaseCopy(id: string): PhaseCopy {
  const c = read();
  return c.phases[id] || DEFAULT_PHASES.find((p) => p.id === id) || { id, title: id, hint: "" };
}
export function getAllPhaseCopy(): PhaseCopy[] {
  const c = read();
  return DEFAULT_PHASES.map((p) => c.phases[p.id] || p);
}
export function setPhaseCopy(id: string, patch: Partial<PhaseCopy>) {
  const c = read();
  c.phases[id] = { ...(c.phases[id] || DEFAULT_PHASES.find((p) => p.id === id) || { id, title: id, hint: "" }), ...patch, id };
  write(c);
}
export function resetDailyCfg() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  notify();
}
