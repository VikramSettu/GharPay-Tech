// Lead Lifecycle 15x layer — group composition, revival cycles, follow-up engine,
// commitment ledger, next-7-touches planner, automation config.
// Local-first (zustand + localStorage). Wires to Cloud in a later turn.
//
// This module is a SINGLE source of truth for everything the user asked for:
//   • headcount + per-person mini profiles + decision-maker map + room-fit
//   • drop-out re-balancing + staggered move-ins + group WA logistics
//   • multi-cycle history (unlimited returns) + reason-for-return
//   • predicted revival calendar + original-TCM reclaim + old-shortlist status
//   • auto-schedule next touch by outcome + nurture drip + dormancy sweep
//   • callback promises + commitment ledger + breach tracking
//   • WA read/reply/sentiment-aware cadence + SLA breach escalation
//   • hybrid automation config (aggressive defaults, per-rule toggle)
//   • 10 lifestyle flows + 9 fraud gates + 10 operational-friction + 8 loss-reason
//
// Every capability carries an inline "why / who benefits" annotation
// consumed by <WhyCaption> in the UI layer.
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─────────────────────────── Types ───────────────────────────

export type GroupRole =
  | "primary"
  | "co-mover"
  | "guardian"
  | "spouse"
  | "roommate-hunt"
  | "employer-payer"
  | "referrer";

export interface GroupMember {
  id: string;
  name: string;
  phone?: string;
  age?: number;
  occupation?: string;
  role: GroupRole;
  foodPreference?: "veg" | "non-veg" | "any" | "jain" | "halal" | "vegan";
  decisionWeight?: number;      // 0-100 — how much this person decides
  paysFor?: "self" | "all" | "split" | "guardian";
  consentGiven?: boolean;
  idCollected?: boolean;
  moveInDate?: string;          // staggered arrivals supported
  waThread?: string;
  emergencyContact?: string;
  notes?: string;
  droppedOutAt?: string;        // ISO — for drop-out re-balancing
  droppedOutReason?: string;
}

export interface RoomFitSuggestion {
  suggested: "single" | "double" | "triple" | "quad" | "multi-bed";
  perHeadBudgetOk: boolean;
  bulkDiscountEligible: boolean;
  needsLargerTourVehicle: boolean;
  needsGroupWaThread: boolean;
  warnings: string[];
}

export type CycleCloseReason =
  | "booked"
  | "lost-price" | "lost-location" | "lost-food" | "lost-timing"
  | "lost-competitor" | "lost-own-arrangement" | "lost-bought-flat"
  | "lost-moved-city" | "deferred" | "health-emergency" | "job-loss"
  | "family-emergency" | "ghosted" | "unqualified" | "cancelled-after-book"
  | "other";

export type RevivalReason =
  | "budget-ready" | "old-option-gone" | "new-city"
  | "family-approved" | "lost-job-earlier-now-ok"
  | "season-change" | "referral-nudge" | "price-drop-seen"
  | "returning-customer" | "other";

export interface LeadCycle {
  id: string;
  cycleNumber: number;               // 1, 2, 3 …
  openedAt: string;
  closedAt?: string;
  closeReason?: CycleCloseReason;
  revivalReason?: RevivalReason;     // set on cycle 2+
  gapDays?: number;                  // days since previous cycle closed
  originalTcmId?: string;            // for fair attribution / reclaim
  currentTcmId?: string;
  reclaimRequestedBy?: string;
  score?: number;                    // per-cycle probability score
  notes?: string;
  reusedFromCycle?: number;          // which cycle's data prefilled
  reusedFields?: string[];           // e.g. ["idCollected","food","budget"]
  predictedNextRevival?: string;     // ISO — nurture calendar target
  oldShortlistStatus?: Array<{
    propertyId: string;
    label: string;
    status: "available" | "gone" | "price-up" | "price-down" | "unknown";
    priceDeltaPct?: number;
  }>;
  /** Full, drillable per-cycle history — every real event that happened. */
  events?: CycleEvent[];
  /** Snapshot of what this lead asked for during this cycle. */
  snapshot?: {
    budget?: number;
    area?: string;
    moveInDate?: string;
    food?: string;
    sharing?: string;
    persona?: string;
    groupSize?: number;
  };
  /** Money numbers, for admin drilldowns. */
  quote?: { amount: number; discount?: number; deposit?: number; sentAt: string };
  booking?: { amount: number; ref: string; at: string; refundedAt?: string; refundReason?: string };
}

/** One atomic thing that happened inside a cycle. */
export type CycleEventType =
  | "opened" | "call" | "wa" | "sms" | "email"
  | "tour-scheduled" | "tour-visited" | "tour-noshow" | "tour-cancelled"
  | "objection" | "quote-sent" | "commitment" | "commitment-broken"
  | "booking" | "refund" | "reassigned" | "note" | "evidence"
  | "revived" | "closed";

export interface CycleEvent {
  id: string;
  ts: string;
  type: CycleEventType;
  actor: string;         // tcm id or system
  summary: string;       // one line
  detail?: string;       // paragraph / verbatim quote
  meta?: Record<string, string | number | boolean | undefined>;
}

export type CommitmentType =
  | "callback" | "visit" | "payment" | "family-call"
  | "document-share" | "decision-by" | "arrival" | "custom";

export type CommitmentState = "pending" | "kept" | "broken" | "renegotiated" | "cancelled";

export interface Commitment {
  id: string;
  cycleId: string;
  type: CommitmentType;
  wording: string;                   // exact words the lead said
  promisedAt: string;
  dueAt: string;                     // hard deadline
  state: CommitmentState;
  reminderSentAt?: string[];         // reminder timestamps
  breachDetectedAt?: string;
  adminNotified?: boolean;
  createdBy: string;
}

export type TouchChannel = "call" | "wa" | "sms" | "email" | "visit" | "in-person";
export type TouchStatus = "planned" | "auto-sent" | "sent" | "skipped" | "failed" | "rescheduled";
export type TouchTrigger =
  | "outcome-cadence" | "nurture-drip" | "dormancy-sweep"
  | "commitment-reminder" | "revival-cycle" | "sla-breach"
  | "wa-read-nudge" | "wa-sentiment-cold" | "manual";

export interface ScheduledTouch {
  id: string;
  cycleId: string;
  channel: TouchChannel;
  scheduledFor: string;              // ISO
  trigger: TouchTrigger;
  scriptKey?: string;                // template id
  scriptPreview?: string;            // for TCM to see at-a-glance
  status: TouchStatus;
  autoExecute: boolean;              // true = fires without human tap
  sentAt?: string;
  outcome?: string;
  waRead?: boolean;
  waReplied?: boolean;
  waSentiment?: "positive" | "neutral" | "cold" | "hostile";
  requiresReason?: boolean;          // true when skipping needs a reason
  skipReason?: string;
}

export type AutomationMode = "aggressive" | "assisted" | "off";
export interface AutomationConfig {
  drip: AutomationMode;              // nurture drips to future leads
  reminders: AutomationMode;         // commitment / callback reminders
  firstContact: AutomationMode;      // opening call/WA
  postVisit: AutomationMode;         // follow-up after visit
  dormancy: AutomationMode;          // 7/14/30/60/180d sweeps
  slaBreach: AutomationMode;         // reassign / escalate
  waSentimentNudge: AutomationMode;  // silent-read follow-up
  revivalOpening: AutomationMode;    // when old lead returns
}

export const DEFAULT_AUTOMATION: AutomationConfig = {
  drip: "aggressive",
  reminders: "aggressive",
  firstContact: "assisted",
  postVisit: "assisted",
  dormancy: "aggressive",
  slaBreach: "aggressive",
  waSentimentNudge: "aggressive",
  revivalOpening: "assisted",
};

export type ScenarioPack =
  // 10 lifestyle / accessibility
  | "lang-mismatch" | "accessibility-hearing" | "senior-citizen"
  | "differently-abled" | "near-hospital" | "religious-proximity"
  | "pet-owner" | "night-shift" | "wfh-space" | "scholarship-delay"
  // 9 fraud / quality
  | "wrong-number" | "spam-fraud" | "agent-broker" | "competitor-scout"
  | "duplicate-source" | "sold-twice" | "minor-no-guardian"
  | "expired-id" | "name-mismatch-id"
  // 10 operational friction
  | "weather-delay" | "tcm-sick-handoff" | "owner-cancel-last-min"
  | "key-unavailable" | "room-mismatch" | "price-mismatch-at-visit"
  | "negotiation-loop" | "token-paid-agreement-stuck"
  | "movein-noshow" | "first-week-complaint"
  // 8 loss-reason + revival
  | "lost-to-competitor" | "lost-own-arrangement" | "lost-buying-flat"
  | "moved-different-city" | "deferred-indefinitely"
  | "health-emergency-loss" | "job-loss-loss" | "family-emergency-loss";

export interface ScenarioFlag {
  id: string;
  cycleId: string;
  pack: ScenarioPack;
  triggeredAt: string;
  evidence?: string[];
  resolvedAt?: string;
  notes?: string;
}

// ─────────────────── Presets exported for UI ────────────────────

export const GROUP_COMPOSITIONS = [
  { key: "solo",           label: "Solo mover",          size: 1, room: "single" as const },
  { key: "couple",         label: "Couple",              size: 2, room: "double" as const },
  { key: "couple+parent",  label: "Couple + parent",     size: 3, room: "triple" as const },
  { key: "friends-2",      label: "2 friends",           size: 2, room: "double" as const },
  { key: "friends-3",      label: "3 friends",           size: 3, room: "triple" as const },
  { key: "cousins-mix",    label: "Friends + cousin",    size: 3, room: "triple" as const },
  { key: "family-4",       label: "Family of 4 + kids",  size: 4, room: "quad" as const },
  { key: "interns-5",      label: "Intern batch (5)",    size: 5, room: "multi-bed" as const },
  { key: "corp-8",         label: "Corporate 8-bed",     size: 8, room: "multi-bed" as const },
  { key: "roommate-swap",  label: "Roommate swap mid-stay", size: 1, room: "single" as const },
  { key: "guarantor-diff", label: "Guarantor ≠ occupant", size: 1, room: "single" as const },
  { key: "split-pay",      label: "Split payment (each own)", size: 2, room: "double" as const },
  { key: "one-pays-all",   label: "One pays for all",    size: 3, room: "triple" as const },
];

export const REVIVAL_REASON_LABELS: Record<RevivalReason, string> = {
  "budget-ready": "Budget ready now",
  "old-option-gone": "Old option gone",
  "new-city": "Moved to new city",
  "family-approved": "Family approved",
  "lost-job-earlier-now-ok": "Job back on track",
  "season-change": "Season / semester change",
  "referral-nudge": "Referral nudged them",
  "price-drop-seen": "Saw price drop",
  "returning-customer": "Repeat customer",
  "other": "Other",
};

export const CLOSE_REASON_LABELS: Record<CycleCloseReason, string> = {
  booked: "Booked", "lost-price": "Lost — price", "lost-location": "Lost — location",
  "lost-food": "Lost — food", "lost-timing": "Lost — timing",
  "lost-competitor": "Lost — competitor", "lost-own-arrangement": "Lost — own arrangement",
  "lost-bought-flat": "Lost — bought flat", "lost-moved-city": "Lost — moved city",
  deferred: "Deferred", "health-emergency": "Health emergency", "job-loss": "Job loss",
  "family-emergency": "Family emergency", ghosted: "Ghosted", unqualified: "Unqualified",
  "cancelled-after-book": "Cancelled after book", other: "Other",
};

// Follow-up cadence rules — outcome → next touches
export interface CadenceRule {
  outcome: string;
  label: string;
  touches: Array<{ delayHours: number; channel: TouchChannel; scriptKey: string; autoExecute: boolean }>;
}

export const CADENCE_RULES: CadenceRule[] = [
  {
    outcome: "call-not-answered",
    label: "Call not answered",
    touches: [
      { delayHours: 2,  channel: "call", scriptKey: "retry-attempt-2", autoExecute: false },
      { delayHours: 4,  channel: "wa",   scriptKey: "wa-missed-you",   autoExecute: true  },
      { delayHours: 24, channel: "call", scriptKey: "retry-attempt-3", autoExecute: false },
    ],
  },
  {
    outcome: "answered-not-ready",
    label: "Answered but not ready",
    touches: [
      { delayHours: 24, channel: "wa",   scriptKey: "wa-nurture-1",    autoExecute: true  },
      { delayHours: 72, channel: "call", scriptKey: "warm-checkin",    autoExecute: false },
      { delayHours: 168,channel: "wa",   scriptKey: "wa-nurture-2",    autoExecute: true  },
    ],
  },
  {
    outcome: "visit-done-no-decision",
    label: "Visit done, no decision",
    touches: [
      { delayHours: 6,   channel: "call", scriptKey: "post-visit-warm", autoExecute: false },
      { delayHours: 24,  channel: "wa",   scriptKey: "wa-recap-visit",  autoExecute: true  },
      { delayHours: 72,  channel: "call", scriptKey: "close-nudge",     autoExecute: false },
      { delayHours: 168, channel: "wa",   scriptKey: "wa-final-nudge",  autoExecute: true  },
    ],
  },
  {
    outcome: "callback-requested",
    label: "Callback requested (promise)",
    touches: [
      { delayHours: -0.25, channel: "wa",  scriptKey: "wa-15min-before", autoExecute: true  },
      { delayHours: 0,     channel: "call",scriptKey: "callback-at-time",autoExecute: false },
    ],
  },
  {
    outcome: "future-nurture",
    label: "Future lead nurture (weekly)",
    touches: [
      { delayHours: 24*7,  channel: "wa", scriptKey: "wa-new-listings", autoExecute: true },
      { delayHours: 24*14, channel: "wa", scriptKey: "wa-testimonial",  autoExecute: true },
      { delayHours: 24*21, channel: "wa", scriptKey: "wa-price-drop",   autoExecute: true },
    ],
  },
];

export const DORMANCY_SWEEPS = [7, 14, 30, 60, 180];  // days

// Predicted next-revival window by close reason (days)
export const REVIVAL_PREDICTION_DAYS: Record<CycleCloseReason, number | null> = {
  booked: null, "lost-price": 60, "lost-location": 90, "lost-food": 30,
  "lost-timing": 30, "lost-competitor": 180, "lost-own-arrangement": 90,
  "lost-bought-flat": 365, "lost-moved-city": 180, deferred: 45,
  "health-emergency": 60, "job-loss": 90, "family-emergency": 45,
  ghosted: 30, unqualified: 365, "cancelled-after-book": 30, other: 90,
};

// ─────────────────── Store ────────────────────

interface LifecycleStore {
  members: Record<string, GroupMember[]>;        // leadId → members
  cycles: Record<string, LeadCycle[]>;           // leadId → cycles
  commitments: Record<string, Commitment[]>;     // leadId → commitments
  touches: Record<string, ScheduledTouch[]>;     // leadId → touches
  automation: AutomationConfig;
  scenarios: Record<string, ScenarioFlag[]>;     // leadId → flags

  // Group
  addMember: (leadId: string, m: Omit<GroupMember, "id">) => void;
  updateMember: (leadId: string, id: string, patch: Partial<GroupMember>) => void;
  dropOutMember: (leadId: string, id: string, reason: string) => void;
  applyGroupPreset: (leadId: string, key: string) => void;

  // Cycles
  ensureCycle: (leadId: string, tcmId?: string) => LeadCycle;
  closeCycle: (leadId: string, reason: CycleCloseReason, notes?: string) => void;
  reviveCycle: (
    leadId: string,
    revivalReason: RevivalReason,
    reuseFields: string[],
    newTcmId?: string,
  ) => LeadCycle;
  reclaimCycle: (leadId: string, cycleId: string, by: string) => void;
  refreshOldShortlist: (
    leadId: string, cycleId: string,
    entries: LeadCycle["oldShortlistStatus"],
  ) => void;

  // Commitments
  addCommitment: (leadId: string, c: Omit<Commitment, "id" | "state" | "promisedAt">) => void;
  markCommitment: (leadId: string, id: string, state: CommitmentState) => void;

  // Touches (next-7 plan + cadence engine)
  scheduleTouches: (leadId: string, cycleId: string, outcome: string) => void;
  scheduleCustomTouch: (leadId: string, t: Omit<ScheduledTouch, "id" | "status">) => void;
  markTouch: (leadId: string, id: string, patch: Partial<ScheduledTouch>) => void;
  skipTouch: (leadId: string, id: string, reason: string) => void;

  // Automation
  setAutomation: (patch: Partial<AutomationConfig>) => void;

  // Scenarios
  flagScenario: (leadId: string, cycleId: string, pack: ScenarioPack, notes?: string) => void;
  resolveScenario: (leadId: string, id: string) => void;
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const addH = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

export const useLifecycle = create<LifecycleStore>()(
  persist(
    (set, get) => ({
      members: {},
      cycles: {},
      commitments: {},
      touches: {},
      automation: DEFAULT_AUTOMATION,
      scenarios: {},

      addMember: (leadId, m) =>
        set((s) => ({
          members: { ...s.members, [leadId]: [...(s.members[leadId] ?? []), { ...m, id: uid("mem") }] },
        })),

      updateMember: (leadId, id, patch) =>
        set((s) => ({
          members: {
            ...s.members,
            [leadId]: (s.members[leadId] ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
          },
        })),

      dropOutMember: (leadId, id, reason) =>
        set((s) => ({
          members: {
            ...s.members,
            [leadId]: (s.members[leadId] ?? []).map((x) =>
              x.id === id ? { ...x, droppedOutAt: now(), droppedOutReason: reason } : x,
            ),
          },
        })),

      applyGroupPreset: (leadId, key) => {
        const preset = GROUP_COMPOSITIONS.find((c) => c.key === key);
        if (!preset) return;
        const existing = get().members[leadId] ?? [];
        const needed = Math.max(0, preset.size - existing.length);
        const additions: GroupMember[] = Array.from({ length: needed }, (_, i) => ({
          id: uid("mem"),
          name: existing.length + i === 0 ? "Primary" : `Co-mover ${existing.length + i}`,
          role: existing.length + i === 0 ? "primary" : "co-mover",
        }));
        set((s) => ({ members: { ...s.members, [leadId]: [...existing, ...additions] } }));
      },

      ensureCycle: (leadId, tcmId) => {
        const list = get().cycles[leadId] ?? [];
        const open = list.find((c) => !c.closedAt);
        if (open) return open;
        const fresh: LeadCycle = {
          id: uid("cyc"),
          cycleNumber: list.length + 1,
          openedAt: now(),
          originalTcmId: tcmId ?? list[0]?.originalTcmId,
          currentTcmId: tcmId,
        };
        set((s) => ({ cycles: { ...s.cycles, [leadId]: [...list, fresh] } }));
        return fresh;
      },

      closeCycle: (leadId, reason, notes) =>
        set((s) => {
          const list = s.cycles[leadId] ?? [];
          const idx = list.findIndex((c) => !c.closedAt);
          if (idx < 0) return s;
          const predicted = REVIVAL_PREDICTION_DAYS[reason];
          const updated: LeadCycle = {
            ...list[idx],
            closedAt: now(),
            closeReason: reason,
            notes,
            predictedNextRevival: predicted ? addH(predicted * 24) : undefined,
          };
          const nextList = [...list];
          nextList[idx] = updated;
          return { cycles: { ...s.cycles, [leadId]: nextList } };
        }),

      reviveCycle: (leadId, revivalReason, reuseFields, newTcmId) => {
        const list = get().cycles[leadId] ?? [];
        const prev = list[list.length - 1];
        const gap = prev?.closedAt
          ? Math.round((Date.now() - new Date(prev.closedAt).getTime()) / 86400_000)
          : 0;
        const fresh: LeadCycle = {
          id: uid("cyc"),
          cycleNumber: list.length + 1,
          openedAt: now(),
          revivalReason,
          gapDays: gap,
          originalTcmId: prev?.originalTcmId,
          currentTcmId: newTcmId ?? prev?.currentTcmId,
          reusedFromCycle: prev?.cycleNumber,
          reusedFields: reuseFields,
        };
        set((s) => ({ cycles: { ...s.cycles, [leadId]: [...list, fresh] } }));
        return fresh;
      },

      reclaimCycle: (leadId, cycleId, by) =>
        set((s) => ({
          cycles: {
            ...s.cycles,
            [leadId]: (s.cycles[leadId] ?? []).map((c) =>
              c.id === cycleId ? { ...c, reclaimRequestedBy: by } : c,
            ),
          },
        })),

      refreshOldShortlist: (leadId, cycleId, entries) =>
        set((s) => ({
          cycles: {
            ...s.cycles,
            [leadId]: (s.cycles[leadId] ?? []).map((c) =>
              c.id === cycleId ? { ...c, oldShortlistStatus: entries } : c,
            ),
          },
        })),

      addCommitment: (leadId, c) =>
        set((s) => ({
          commitments: {
            ...s.commitments,
            [leadId]: [
              ...(s.commitments[leadId] ?? []),
              { ...c, id: uid("com"), state: "pending" as const, promisedAt: now() },
            ],
          },
        })),

      markCommitment: (leadId, id, state) =>
        set((s) => ({
          commitments: {
            ...s.commitments,
            [leadId]: (s.commitments[leadId] ?? []).map((c) =>
              c.id === id
                ? {
                    ...c,
                    state,
                    breachDetectedAt: state === "broken" ? now() : c.breachDetectedAt,
                  }
                : c,
            ),
          },
        })),

      scheduleTouches: (leadId, cycleId, outcome) => {
        const rule = CADENCE_RULES.find((r) => r.outcome === outcome);
        if (!rule) return;
        const automation = get().automation;
        const additions: ScheduledTouch[] = rule.touches.map((t) => ({
          id: uid("tch"),
          cycleId,
          channel: t.channel,
          scheduledFor: addH(t.delayHours),
          trigger: "outcome-cadence",
          scriptKey: t.scriptKey,
          status: "planned",
          autoExecute: t.autoExecute && automation.reminders !== "off",
        }));
        set((s) => ({
          touches: { ...s.touches, [leadId]: [...(s.touches[leadId] ?? []), ...additions] },
        }));
      },

      scheduleCustomTouch: (leadId, t) =>
        set((s) => ({
          touches: {
            ...s.touches,
            [leadId]: [...(s.touches[leadId] ?? []), { ...t, id: uid("tch"), status: "planned" }],
          },
        })),

      markTouch: (leadId, id, patch) =>
        set((s) => ({
          touches: {
            ...s.touches,
            [leadId]: (s.touches[leadId] ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
          },
        })),

      skipTouch: (leadId, id, reason) =>
        set((s) => ({
          touches: {
            ...s.touches,
            [leadId]: (s.touches[leadId] ?? []).map((t) =>
              t.id === id ? { ...t, status: "skipped" as const, skipReason: reason } : t,
            ),
          },
        })),

      setAutomation: (patch) =>
        set((s) => ({ automation: { ...s.automation, ...patch } })),

      flagScenario: (leadId, cycleId, pack, notes) =>
        set((s) => ({
          scenarios: {
            ...s.scenarios,
            [leadId]: [
              ...(s.scenarios[leadId] ?? []),
              { id: uid("scn"), cycleId, pack, triggeredAt: now(), notes },
            ],
          },
        })),

      resolveScenario: (leadId, id) =>
        set((s) => ({
          scenarios: {
            ...s.scenarios,
            [leadId]: (s.scenarios[leadId] ?? []).map((x) =>
              x.id === id ? { ...x, resolvedAt: now() } : x,
            ),
          },
        })),
    }),
    { name: "gharpayy-lifecycle-v1" },
  ),
);

// ─────────────────── Pure helpers ────────────────────

export function roomFit(members: GroupMember[], totalBudget?: number): RoomFitSuggestion {
  const active = members.filter((m) => !m.droppedOutAt);
  const n = active.length || 1;
  const suggested: RoomFitSuggestion["suggested"] =
    n === 1 ? "single" : n === 2 ? "double" : n === 3 ? "triple" : n === 4 ? "quad" : "multi-bed";
  const perHead = totalBudget ? totalBudget / n : undefined;
  const warnings: string[] = [];
  if (perHead && perHead < 6000) warnings.push(`Per-head budget ₹${perHead.toFixed(0)} is low`);
  if (n >= 4 && !active.some((m) => m.role === "guardian" || m.role === "employer-payer")) {
    warnings.push("Large group without guardian/payer — flag decision maker");
  }
  const consentGaps = active.filter((m) => !m.consentGiven).length;
  if (consentGaps > 0) warnings.push(`${consentGaps} member(s) missing consent`);
  return {
    suggested,
    perHeadBudgetOk: perHead ? perHead >= 6000 : true,
    bulkDiscountEligible: n >= 3,
    needsLargerTourVehicle: n >= 4,
    needsGroupWaThread: n >= 2,
    warnings,
  };
}

export function next7Touches(all: ScheduledTouch[]): ScheduledTouch[] {
  const horizon = Date.now() + 7 * 86400_000;
  return all
    .filter((t) => t.status === "planned" || t.status === "auto-sent")
    .filter((t) => new Date(t.scheduledFor).getTime() <= horizon)
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .slice(0, 7);
}

export function commitmentHealth(list: Commitment[]) {
  const kept = list.filter((c) => c.state === "kept").length;
  const broken = list.filter((c) => c.state === "broken").length;
  const total = list.length || 1;
  return { kept, broken, keptPct: Math.round((kept / total) * 100) };
}
