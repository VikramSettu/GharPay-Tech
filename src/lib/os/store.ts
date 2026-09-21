// Additive Zustand store for Closing OS. Persisted locally.
// Does NOT mutate the legacy `useApp` store.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  OsGroup, OsPerson, RevivalCycle, Touch, TouchStatus,
  Commitment, RevivalReason,
} from "./types";
import { generateCadence } from "./cadence";

const uid = () => Math.random().toString(36).slice(2, 10);

interface OsState {
  automationMode: "aggressive" | "assisted" | "hybrid";
  groups: Record<string, OsGroup>;              // leadId -> group
  cycles: RevivalCycle[];
  touches: Touch[];
  commitments: Commitment[];

  setAutomationMode: (m: OsState["automationMode"]) => void;

  // People / group
  ensureGroup: (leadId: string) => OsGroup;
  setGroupMeta: (leadId: string, patch: Partial<Omit<OsGroup, "leadId" | "people">>) => void;
  addPerson: (leadId: string, person: Omit<OsPerson, "id">) => OsPerson;
  updatePerson: (leadId: string, personId: string, patch: Partial<OsPerson>) => void;
  removePerson: (leadId: string, personId: string) => void;

  // Revival cycles
  openCycle: (leadId: string, reason: RevivalReason, notes?: string) => RevivalCycle;
  closeCycle: (cycleId: string, outcome: "won" | "lost" | "ghost", lostReason?: string) => void;
  cyclesForLead: (leadId: string) => RevivalCycle[];

  // Follow-up engine
  seedCadence: (leadId: string, startAt?: number) => void;
  markTouch: (touchId: string, status: TouchStatus) => void;
  skipTouch: (touchId: string) => void;
  runAutoDripsNow: (now: number) => number;   // returns count auto-sent

  // Commitments
  addCommitment: (leadId: string, promise: string, dueAt: number, personId?: string) => Commitment;
  resolveCommitment: (id: string, status: "kept" | "broken" | "renegotiated") => void;
}

export const useOs = create<OsState>()(
  persist(
    (set, get) => ({
      automationMode: "hybrid",
      groups: {},
      cycles: [],
      touches: [],
      commitments: [],

      setAutomationMode: (m) => set({ automationMode: m }),

      ensureGroup: (leadId) => {
        const existing = get().groups[leadId];
        if (existing) return existing;
        const g: OsGroup = { leadId, headcount: 1, people: [], updatedAt: Date.now() };
        set((s) => ({ groups: { ...s.groups, [leadId]: g } }));
        return g;
      },
      setGroupMeta: (leadId, patch) =>
        set((s) => {
          const g = s.groups[leadId] ?? { leadId, headcount: 1, people: [], updatedAt: Date.now() };
          return { groups: { ...s.groups, [leadId]: { ...g, ...patch, updatedAt: Date.now() } } };
        }),
      addPerson: (leadId, person) => {
        const p: OsPerson = { id: uid(), ...person };
        set((s) => {
          const g = s.groups[leadId] ?? { leadId, headcount: 0, people: [], updatedAt: Date.now() };
          const nextPeople = [...g.people, p];
          return {
            groups: {
              ...s.groups,
              [leadId]: { ...g, people: nextPeople, headcount: Math.max(g.headcount, nextPeople.length), updatedAt: Date.now() },
            },
          };
        });
        return p;
      },
      updatePerson: (leadId, personId, patch) =>
        set((s) => {
          const g = s.groups[leadId];
          if (!g) return s;
          const people = g.people.map((p) => (p.id === personId ? { ...p, ...patch } : p));
          return { groups: { ...s.groups, [leadId]: { ...g, people, updatedAt: Date.now() } } };
        }),
      removePerson: (leadId, personId) =>
        set((s) => {
          const g = s.groups[leadId];
          if (!g) return s;
          return { groups: { ...s.groups, [leadId]: { ...g, people: g.people.filter((p) => p.id !== personId), updatedAt: Date.now() } } };
        }),

      openCycle: (leadId, reason, notes) => {
        const prior = get().cycles.filter((c) => c.leadId === leadId);
        const cycle: RevivalCycle = {
          id: uid(),
          leadId,
          cycleNumber: prior.length + 1,
          openedAt: Date.now(),
          outcome: "active",
          reopenReason: reason,
          notes,
        };
        set((s) => ({ cycles: [...s.cycles, cycle] }));
        return cycle;
      },
      closeCycle: (cycleId, outcome, lostReason) =>
        set((s) => ({
          cycles: s.cycles.map((c) => (c.id === cycleId ? { ...c, outcome, lostReason, closedAt: Date.now() } : c)),
        })),
      cyclesForLead: (leadId) => get().cycles.filter((c) => c.leadId === leadId).sort((a, b) => a.cycleNumber - b.cycleNumber),

      seedCadence: (leadId, startAt = Date.now()) => {
        set((s) => {
          if (s.touches.some((t) => t.leadId === leadId)) return s;
          return { touches: [...s.touches, ...generateCadence(leadId, startAt)] };
        });
      },
      markTouch: (touchId, status) =>
        set((s) => ({
          touches: s.touches.map((t) => (t.id === touchId ? { ...t, status, updatedAt: Date.now() } : t)),
        })),
      skipTouch: (touchId) =>
        set((s) => ({
          touches: s.touches.map((t) => (t.id === touchId ? { ...t, status: "skipped", updatedAt: Date.now() } : t)),
        })),
      runAutoDripsNow: (now) => {
        const mode = get().automationMode;
        let count = 0;
        set((s) => ({
          touches: s.touches.map((t) => {
            if (t.status !== "queued" || t.scheduledAt > now) return t;
            const isAuto = t.mode === "auto";
            const canFire = mode === "aggressive"
              ? true
              : mode === "hybrid"
              ? isAuto
              : false;
            if (!canFire) return t;
            count += 1;
            return { ...t, status: "sent", actor: "system", updatedAt: now };
          }),
        }));
        return count;
      },

      addCommitment: (leadId, promise, dueAt, personId) => {
        const c: Commitment = {
          id: uid(), leadId, personId, promise, dueAt, createdAt: Date.now(), status: "pending",
        };
        set((s) => ({ commitments: [...s.commitments, c] }));
        return c;
      },
      resolveCommitment: (id, status) =>
        set((s) => ({ commitments: s.commitments.map((c) => (c.id === id ? { ...c, status } : c)) })),
    }),
    { name: "gharpayy-closing-os", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

// ---- pure helpers ----

export function decisionConflict(g: OsGroup | undefined): {
  hasConflict: boolean;
  budgetSpread: number;
  moveDateSpreadDays: number;
  reasons: string[];
} {
  if (!g || g.people.length < 2) return { hasConflict: false, budgetSpread: 0, moveDateSpreadDays: 0, reasons: [] };
  const budgets = g.people.map((p) => p.budgetMax ?? p.budgetMin ?? 0).filter((n) => n > 0);
  const budgetSpread = budgets.length ? Math.max(...budgets) - Math.min(...budgets) : 0;
  const dates = g.people.map((p) => (p.moveDate ? +new Date(p.moveDate) : 0)).filter((n) => n > 0);
  const moveDateSpreadDays = dates.length ? Math.round((Math.max(...dates) - Math.min(...dates)) / 86400_000) : 0;
  const roomTypes = new Set(g.people.map((p) => p.roomType).filter(Boolean));
  const foods = new Set(g.people.map((p) => p.foodPref).filter(Boolean));
  const reasons: string[] = [];
  if (budgetSpread > 3000) reasons.push(`Budget spread ₹${budgetSpread.toLocaleString()}`);
  if (moveDateSpreadDays > 7) reasons.push(`Move dates ${moveDateSpreadDays}d apart`);
  if (roomTypes.size > 1) reasons.push(`Mixed room types: ${[...roomTypes].join(", ")}`);
  if (foods.size > 1) reasons.push(`Mixed food prefs: ${[...foods].join(", ")}`);
  return { hasConflict: reasons.length > 0, budgetSpread, moveDateSpreadDays, reasons };
}

export function decisionMap(g: OsGroup | undefined): {
  finalDeciders: OsPerson[];
  payers: OsPerson[];
  influencers: OsPerson[];
} {
  const people = g?.people ?? [];
  return {
    finalDeciders: people.filter((p) => p.decisionPower === "final" || p.decisionPower === "strong"),
    payers: people.filter((p) => p.payResponsibility === "parent" || p.payResponsibility === "company" || p.payResponsibility === "self"),
    influencers: people.filter((p) => p.decisionPower === "influencer"),
  };
}

// Predict return: simple heuristic on reason + prior cycle count.
export function predictReturn(reason: RevivalReason, priorCycles: number): {
  days: number; confidence: number;
} {
  const base: Record<RevivalReason, number> = {
    "budget": 30, "office-change": 21, "college": 45, "family": 14, "parent-approval": 10,
    "roommate": 7, "transfer": 30, "job-switch": 21, "salary": 30, "festival": 25,
    "bonus": 30, "lease-ending": 45, "internship": 60, "marriage": 45, "emergency": 2, "other": 21,
  };
  const days = Math.max(1, base[reason] - Math.min(priorCycles * 2, 10));
  const confidence = Math.min(95, 60 + priorCycles * 6);
  return { days, confidence };
}
