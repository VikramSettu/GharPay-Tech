/**
 * Locked operating targets for the Admin Operating Brain.
 *
 * Two businesses (Stays / Homes) with per-role phase targets. Admin can
 * override any number; overrides are persisted and versioned by timestamp.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BusinessId = "stays" | "homes" | "combined";
export type BrainRole = "control-tower" | "flow-ops" | "tcm" | "closing";
export type PhaseId = "p1" | "p2" | "eod" | "week" | "month";

export const BUSINESSES: { id: BusinessId; label: string }[] = [
  { id: "stays", label: "Gharpayy Stays" },
  { id: "homes", label: "Gharpayy Homes" },
  { id: "combined", label: "Combined" },
];

export const ROLE_LABEL: Record<BrainRole, string> = {
  "control-tower": "Control Tower",
  "flow-ops": "Flow Ops",
  tcm: "Tour Conversion Manager",
  closing: "Closing Specialist",
};

/** Every metric a role is measured on, per phase. */
export type TargetSet = Partial<{
  bbd: number;
  toursScheduled: number;
  toursControlled: number;
  toursDone: number;
  quotations: number;
  bookings: number;
}>;

export type RoleTargets = Record<PhaseId, TargetSet>;
export type BusinessTargets = Record<BrainRole, RoleTargets>;

const STAYS: BusinessTargets = {
  "control-tower": {
    p1: { bbd: 9 }, p2: { bbd: 21 }, eod: { bbd: 30 }, week: { bbd: 180 }, month: { bbd: 780 },
  },
  "flow-ops": {
    p1: { toursScheduled: 4, quotations: 2 },
    p2: { toursScheduled: 8, quotations: 5 },
    eod: { toursScheduled: 10, quotations: 6 },
    week: { toursScheduled: 60, quotations: 36 },
    month: { toursScheduled: 260, quotations: 156 },
  },
  tcm: {
    p1: { toursControlled: 15, toursDone: 3, bookings: 1 },
    p2: { toursControlled: 15, toursDone: 8, bookings: 3 },
    eod: { toursControlled: 15, toursDone: 10, bookings: 5 },
    week: { toursControlled: 90, toursDone: 60, bookings: 30 },
    month: { toursControlled: 390, toursDone: 260, bookings: 130 },
  },
  closing: {
    p1: { bookings: 1 }, p2: { bookings: 3 }, eod: { bookings: 4 },
    week: { bookings: 24 }, month: { bookings: 104 },
  },
};

const HOMES: BusinessTargets = {
  "control-tower": {
    p1: { bbd: 1 }, p2: { bbd: 2 }, eod: { bbd: 3 }, week: { bbd: 18 }, month: { bbd: 78 },
  },
  "flow-ops": {
    p1: { toursScheduled: 3, toursDone: 1 },
    p2: { toursScheduled: 5, toursDone: 2 },
    eod: { toursScheduled: 7, toursDone: 3 },
    week: { toursScheduled: 42, toursDone: 18 },
    month: { toursScheduled: 182, toursDone: 78 },
  },
  tcm: {
    p1: { toursControlled: 7, toursDone: 1, bookings: 0 },
    p2: { toursControlled: 7, toursDone: 2, bookings: 1 },
    eod: { toursControlled: 7, toursDone: 3, bookings: 1 },
    week: { toursControlled: 42, toursDone: 18, bookings: 6 },
    month: { toursControlled: 182, toursDone: 78, bookings: 26 },
  },
  closing: {
    p1: { bookings: 0 }, p2: { bookings: 1 }, eod: { bookings: 1 },
    week: { bookings: 6 }, month: { bookings: 26 },
  },
};

const BASE: Record<Exclude<BusinessId, "combined">, BusinessTargets> = { stays: STAYS, homes: HOMES };

function sumSets(a: TargetSet, b: TargetSet): TargetSet {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof TargetSet>;
  const out: TargetSet = {};
  keys.forEach((k) => { out[k] = (a[k] ?? 0) + (b[k] ?? 0); });
  return out;
}

interface TargetState {
  business: BusinessId;
  /** business → role → phase → metric override */
  overrides: Record<string, number>;
  /** Homes final conversion role label is admin-configurable. */
  homesCloserLabel: string;
  setBusiness: (b: BusinessId) => void;
  setOverride: (b: BusinessId, r: BrainRole, p: PhaseId, m: keyof TargetSet, v: number | null) => void;
  setHomesCloserLabel: (v: string) => void;
}

export const useBrainTargets = create<TargetState>()(
  persist(
    (set) => ({
      business: "stays",
      overrides: {},
      homesCloserLabel: "Home Conversion Manager",
      setBusiness: (business) => set({ business }),
      setOverride: (b, r, p, m, v) =>
        set((s) => {
          const next = { ...s.overrides };
          const key = `${b}.${r}.${p}.${m}`;
          if (v === null || Number.isNaN(v)) delete next[key];
          else next[key] = v;
          return { overrides: next };
        }),
      setHomesCloserLabel: (homesCloserLabel) => set({ homesCloserLabel }),
    }),
    { name: "gharpayy.brain.targets.v1" },
  ),
);

/** Resolve targets for a business + role + phase, applying admin overrides. */
export function targetsFor(business: BusinessId, role: BrainRole, phase: PhaseId, overrides: Record<string, number> = useBrainTargets.getState().overrides): TargetSet {
  const raw =
    business === "combined"
      ? sumSets(BASE.stays[role][phase], BASE.homes[role][phase])
      : BASE[business][role][phase];
  const out: TargetSet = { ...raw };
  (Object.keys(out) as (keyof TargetSet)[]).forEach((m) => {
    const o = overrides[`${business}.${role}.${phase}.${m}`];
    if (typeof o === "number") out[m] = o;
  });
  return out;
}

/* ------------------------------ phases ------------------------------ */

export const PHASE_WINDOWS: { id: Exclude<PhaseId, "week" | "month">; label: string; endHour: number; endMin: number }[] = [
  { id: "p1", label: "Phase 1 · to 1 PM", endHour: 13, endMin: 0 },
  { id: "p2", label: "Phase 2 · to 5 PM", endHour: 17, endMin: 0 },
  { id: "eod", label: "Phase 3 · to 8 PM EOD", endHour: 20, endMin: 0 },
];

export function currentPhase(now = new Date()): "p1" | "p2" | "eod" {
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < 13 * 60) return "p1";
  if (mins < 17 * 60) return "p2";
  return "eod";
}

/** Fraction of the working day elapsed (10:35 → 20:00), 0..1. */
export function dayProgress(now = new Date()): number {
  const start = 10 * 60 + 35;
  const end = 20 * 60;
  const mins = now.getHours() * 60 + now.getMinutes();
  return Math.min(Math.max((mins - start) / (end - start), 0), 1);
}

export type Band = "achieved" | "on-track" | "at-risk" | "missed";

export function band(actual: number, target: number): Band {
  if (target <= 0) return "achieved";
  const p = (actual / target) * 100;
  if (p >= 100) return "achieved";
  if (p >= 90) return "on-track";
  if (p >= 75) return "at-risk";
  return "missed";
}

export const BAND_CLASS: Record<Band, string> = {
  achieved: "text-emerald-600 dark:text-emerald-400",
  "on-track": "text-sky-600 dark:text-sky-400",
  "at-risk": "text-amber-600 dark:text-amber-400",
  missed: "text-destructive",
};

export const BAND_LABEL: Record<Band, string> = {
  achieved: "Achieved",
  "on-track": "On track",
  "at-risk": "At risk",
  missed: "Missed",
};
