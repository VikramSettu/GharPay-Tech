/**
 * Workflow Guarantee OS — state.
 *
 * Holds only what the CRM does not already store: attempt log (so fake
 * productivity is impossible to hide), quotations, supply blocks, waiting
 * windows, violation resolutions, handoff trail and per-role daily targets.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AttemptLike, ViolationCode, WorkRoleId } from "./engine";

export type WorkRole = WorkRoleId;

export interface DailyTargets {
  actions: number;
  connections: number;
  tours: number;
  bookings: number;
  waveSize: number;
}

export interface Handoff {
  id: string;
  ulid: string;
  fromRole: WorkRole | "system";
  fromUser: string;
  toRole: WorkRole;
  toUser: string | null;
  trigger: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface BreachResolution {
  id: string;
  ulid: string;
  code: ViolationCode;
  resolvedAt: string;
  resolvedBy: string;
  resolution: string;
}

interface WorkflowState {
  attempts: AttemptLike[];
  quotes: Record<string, { amount: number; ts: string }>;
  blocked: Record<string, { reason: string; ts: string }>;
  waiting: Record<string, string>;
  resolved: Record<string, string>;
  resolutions: BreachResolution[];
  handoffs: Handoff[];
  targets: Record<WorkRole, DailyTargets>;

  logAttempt: (ulid: string, by: string, connected: boolean) => void;
  createQuote: (ulid: string, amount: number) => void;
  setBlocked: (ulid: string, reason: string | null) => void;
  setWaiting: (ulid: string, untilIso: string | null) => void;
  resolveViolation: (ulid: string, code: ViolationCode, by: string, resolution: string) => void;
  handoff: (h: Omit<Handoff, "id" | "createdAt">) => Handoff;
  acceptHandoff: (id: string) => void;
  setTargets: (role: WorkRole, patch: Partial<DailyTargets>) => void;
  resetDay: () => void;
}

const DEFAULT_TARGETS: Record<WorkRole, DailyTargets> = {
  "flow-ops": { actions: 120, connections: 70, tours: 10, bookings: 0, waveSize: 30 },
  tour: { actions: 40, connections: 30, tours: 10, bookings: 0, waveSize: 10 },
  closing: { actions: 120, connections: 60, tours: 0, bookings: 4, waveSize: 30 },
  supply: { actions: 40, connections: 20, tours: 0, bookings: 0, waveSize: 20 },
  "check-in": { actions: 30, connections: 20, tours: 0, bookings: 6, waveSize: 15 },
};

/** Persisted state from older versions may not know newer roles. */
export function targetsFor(all: Partial<Record<WorkRole, DailyTargets>>, role: WorkRole): DailyTargets {
  return all[role] ?? DEFAULT_TARGETS[role];
}

const iso = () => new Date().toISOString();
const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

export const useWorkflow = create<WorkflowState>()(
  persist(
    (set, get) => ({
      attempts: [],
      quotes: {},
      blocked: {},
      waiting: {},
      resolved: {},
      resolutions: [],
      handoffs: [],
      targets: DEFAULT_TARGETS,

      logAttempt: (ulid, by, connected) =>
        set((s) => ({ attempts: [{ ulid, by, connected, ts: iso() }, ...s.attempts].slice(0, 5000) })),

      createQuote: (ulid, amount) =>
        set((s) => ({ quotes: { ...s.quotes, [ulid]: { amount, ts: iso() } } })),

      setBlocked: (ulid, reason) =>
        set((s) => {
          const next = { ...s.blocked };
          if (reason) next[ulid] = { reason, ts: iso() };
          else delete next[ulid];
          return { blocked: next };
        }),

      setWaiting: (ulid, untilIso) =>
        set((s) => {
          const next = { ...s.waiting };
          if (untilIso) next[ulid] = untilIso;
          else delete next[ulid];
          return { waiting: next };
        }),

      resolveViolation: (ulid, code, by, resolution) =>
        set((s) => ({
          resolved: { ...s.resolved, [`${ulid}:${code}`]: iso() },
          resolutions: [
            { id: rid("res"), ulid, code, resolvedAt: iso(), resolvedBy: by, resolution },
            ...s.resolutions,
          ].slice(0, 1000),
        })),

      handoff: (h) => {
        const rec: Handoff = { ...h, id: rid("ho"), createdAt: iso() };
        set((s) => ({ handoffs: [rec, ...s.handoffs].slice(0, 2000) }));
        return rec;
      },

      acceptHandoff: (id) =>
        set((s) => ({ handoffs: s.handoffs.map((h) => (h.id === id ? { ...h, acceptedAt: iso() } : h)) })),

      setTargets: (role, patch) =>
        set((s) => ({ targets: { ...s.targets, [role]: { ...s.targets[role], ...patch } } })),

      resetDay: () => set({ attempts: [] }),
    }),
    { name: "gharpayy-workflow-guarantee-v1" },
  ),
);

/** Convenience selector for the engine's MotionContext inputs. */
export function useMotionInputs() {
  return useWorkflow((s) => ({
    quotes: s.quotes,
    blocked: s.blocked,
    waiting: s.waiting,
    resolved: s.resolved,
  }));
}

export { DEFAULT_TARGETS };
