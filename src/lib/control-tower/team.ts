// Control Tower Team — the alignment layer above zones.
//
// 10x expansion: adds SLA timers, escalations, shift handover, manager
// review queue, exception log, audit trail, leaderboard, filters, and
// automation-friendly hooks. Persisted locally (Zustand); Cloud wire-up
// happens in the persistence turn.

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─────────────────────────────────────────────────────────────
// Base types
// ─────────────────────────────────────────────────────────────

export type CTShift = "morning" | "afternoon" | "evening" | "night";
export type PerfTier = "A" | "B" | "C" | "D";

export interface CTMember {
  id: string;
  name: string;
  initials: string;
  shift: CTShift;
  minLeadsPerDay: number;
  minOldLeadTouches: number;
  present: boolean;
  zonesCovered: string[];
  tier: PerfTier;
  /** Rolling 7d performance 0-100 (used by rebalancer + lineup optimizer). */
  performance: number;
  /** Manager backup — who takes their leads if they go offline. */
  backupId?: string;
}

export const CT_TEAM_SEED: CTMember[] = [
  { id: "ct-1", name: "Aditi Rao",   initials: "AR", shift: "morning",   minLeadsPerDay: 25, minOldLeadTouches: 10, present: true,  zonesCovered: ["south", "east"],       tier: "A", performance: 92, backupId: "ct-2" },
  { id: "ct-2", name: "Kabir Shah",  initials: "KS", shift: "morning",   minLeadsPerDay: 25, minOldLeadTouches: 10, present: true,  zonesCovered: ["north", "west"],       tier: "A", performance: 88, backupId: "ct-1" },
  { id: "ct-3", name: "Meera Iyer",  initials: "MI", shift: "afternoon", minLeadsPerDay: 25, minOldLeadTouches: 10, present: true,  zonesCovered: ["central"],             tier: "B", performance: 78, backupId: "ct-4" },
  { id: "ct-4", name: "Rohan Verma", initials: "RV", shift: "afternoon", minLeadsPerDay: 25, minOldLeadTouches: 10, present: true,  zonesCovered: ["south", "central"],    tier: "B", performance: 74, backupId: "ct-3" },
  { id: "ct-5", name: "Priya Nair",  initials: "PN", shift: "evening",   minLeadsPerDay: 25, minOldLeadTouches: 10, present: true,  zonesCovered: ["east", "north"],       tier: "A", performance: 85, backupId: "ct-6" },
  { id: "ct-6", name: "Yash Khanna", initials: "YK", shift: "evening",   minLeadsPerDay: 20, minOldLeadTouches: 8,  present: false, zonesCovered: ["west"],                tier: "C", performance: 61, backupId: "ct-5" },
  { id: "ct-7", name: "Isha Bhatt",  initials: "IB", shift: "night",     minLeadsPerDay: 15, minOldLeadTouches: 5,  present: true,  zonesCovered: ["south", "east", "central"], tier: "B", performance: 72, backupId: "ct-1" },
];

// ─── Single-owner enforcement ────────────────────────────────

export type OwnershipMode = "hard-lock" | "shadow-allowed" | "cowork-legacy";

export type OwnershipAction =
  | { allowed: true }
  | { allowed: false; reason: string; requestReassign?: boolean };

export function canEditLead(actorId: string, ownerId: string, mode: OwnershipMode): OwnershipAction {
  if (actorId === ownerId) return { allowed: true };
  if (mode === "hard-lock") return { allowed: false, reason: "Single-owner lock — only the assigned owner can act. Request reassignment.", requestReassign: true };
  if (mode === "shadow-allowed") return { allowed: false, reason: "Shadow view — read only. Training/handover mode; edits are blocked.", requestReassign: true };
  return { allowed: true };
}

// ─── 4-gate flawless process ─────────────────────────────────

export type GateKey = "location" | "budget" | "date" | "inventory";

export interface GateState {
  key: GateKey;
  label: string;
  question: string;
  status: "green" | "amber" | "red" | "unknown";
  evidence?: string;
  answeredBy?: string;
  answeredAt?: string;
  autoDetected?: boolean;
}

export function newGates(): GateState[] {
  return [
    { key: "location",  label: "Location feasible",  question: "Is our inventory in the area they want?",           status: "unknown" },
    { key: "budget",    label: "Budget feasible",    question: "Does their budget match what we can offer?",        status: "unknown" },
    { key: "date",      label: "Date feasible",      question: "Can we deliver a bed by their move-in date?",       status: "unknown" },
    { key: "inventory", label: "Inventory feasible", question: "Is a specific bed/room actually available?",        status: "unknown" },
  ];
}
export const gatesGreen = (gs: GateState[]) => gs.every((g) => g.status === "green");
export const nextGateGap = (gs: GateState[]) => gs.find((g) => g.status !== "green") ?? null;

// ─── Chat review scorecard ───────────────────────────────────

export interface ChatReview {
  id: string;
  leadId: string;
  reviewerId: string;
  reviewedAt: string;
  responseSpeed: 1 | 2 | 3 | 4 | 5;
  acknowledgment: 1 | 2 | 3 | 4 | 5;
  realProblemFocus: 1 | 2 | 3 | 4 | 5;
  valueDrivenAnswer: 1 | 2 | 3 | 4 | 5;
  advancedNextStep: 1 | 2 | 3 | 4 | 5;
  tourBookedButUnbookedReason?: string;
  stillLooking: "yes" | "no" | "never-was" | "unknown";
  whatActuallyHappened: string;
  overall: 1 | 2 | 3 | 4 | 5;
  /** Heuristic AI score, computed at save time from `whatActuallyHappened`. */
  aiScore?: number;
  aiFlags?: string[];
}

export function chatScore(r: ChatReview): number {
  const s = r.responseSpeed + r.acknowledgment + r.realProblemFocus + r.valueDrivenAnswer + r.advancedNextStep;
  return Math.round((s / 25) * 100);
}

// ─── Daily conversation quality loop ─────────────────────────

export type ReviewTeam = "control-tower" | "flow-ops" | "pcm" | "specialist";
export type InteractionKind = "chat" | "call";
export type FeedbackStatus =
  | "review-due"
  | "reviewer-submitted"
  | "employee-acknowledged"
  | "correction-started"
  | "evidence-submitted"
  | "closed"
  | "escalated";

export interface DailyInteractionReview {
  id: string;
  leadId: string;
  employeeId: string;
  employeeName: string;
  team: ReviewTeam;
  kind: InteractionKind;
  assignedAt: string;
  dueAt: string;
  status: FeedbackStatus;
  reviewerId?: string;
  reviewedAt?: string;
  score?: number;
  criticalError: boolean;
  interactionSummary?: string;
  positiveBehaviour?: string;
  exactGap?: string;
  evidenceReference?: string;
  customerImpact?: string;
  revenueImpact?: "none" | "low" | "medium" | "high" | "booking-loss" | "recoverable";
  correctApproach?: string;
  correctiveAction?: string;
  employeeResponse?: string;
  rootCause?: string;
  preventionAction?: string;
  correctionEvidence?: string;
  reviewerVerification?: string;
  updatedAt: string;
}

export function reviewQualityBand(score?: number, criticalError = false) {
  if (criticalError || (score ?? 0) < 60) return "Critical intervention";
  if ((score ?? 0) < 70) return "Performance risk";
  if ((score ?? 0) < 80) return "Coaching required";
  if ((score ?? 0) < 90) return "Strong";
  return "Gharpayy Gold";
}

// ─── Inventory focus ─────────────────────────────────────────

export type InventoryHorizon = "today" | "this-week" | "this-month" | "later";

export interface InventoryFocus {
  id: string;
  propertyName: string;
  area: string;
  bedType: string;
  price: number;
  horizon: InventoryHorizon;
  whyChoose: string;
  bedsAvailable: number;
  ownerNote?: string;
  photosCount: number;
  active: boolean;
}

export const INVENTORY_FOCUS_SEED: InventoryFocus[] = [
  { id: "if-1", propertyName: "Cove Koramangala", area: "Koramangala 5th Blk", bedType: "Single AC", price: 16500, horizon: "today", whyChoose: "Walk to Forum Mall · dedicated study · fibre wifi · veg mess", bedsAvailable: 2, ownerNote: "Owner confirmed 2 beds unlocked till Fri", photosCount: 24, active: true },
  { id: "if-2", propertyName: "Nest HSR",         area: "HSR 7th Sector",     bedType: "Double AC", price: 12500, horizon: "today", whyChoose: "New building · rooftop · 24×7 security · Jain food available", bedsAvailable: 4, photosCount: 18, active: true },
  { id: "if-3", propertyName: "Casa Indiranagar", area: "Indiranagar 100ft",  bedType: "Single AC", price: 18500, horizon: "this-week", whyChoose: "Walkable to metro · gym · 1 min from bus stop", bedsAvailable: 3, photosCount: 22, active: true },
  { id: "if-4", propertyName: "Urban Whitefield", area: "Whitefield Main",    bedType: "Triple",    price: 8500,  horizon: "this-week", whyChoose: "Cheapest in area · 5 min from IT parks · basic but clean", bedsAvailable: 6, photosCount: 12, active: true },
  { id: "if-5", propertyName: "Sky BTM",          area: "BTM 2nd Stage",      bedType: "Single Non-AC", price: 10500, horizon: "this-month", whyChoose: "Mid-budget · quiet lane · homely food", bedsAvailable: 5, photosCount: 15, active: true },
  { id: "if-6", propertyName: "Terra JP Nagar",   area: "JP Nagar 6th Phase", bedType: "Double AC", price: 13500, horizon: "this-month", whyChoose: "Balcony rooms · terrace · family-run · North-Indian mess", bedsAvailable: 4, photosCount: 20, active: true },
  { id: "if-7", propertyName: "Loft Hebbal",      area: "Hebbal RMV",         bedType: "Single AC", price: 14500, horizon: "later", whyChoose: "Airport corridor · deep discount for 12-mo lock-in", bedsAvailable: 2, photosCount: 10, active: false },
];

// ─── BBD lineup ──────────────────────────────────────────────

export type LineupSlot = "opener" | "middle" | "finisher" | "bench";

export interface LineupPick {
  memberId: string;
  memberName: string;
  role: string;
  slot: LineupSlot;
  targetBookings: number;
  reason: string;
}

export const BBD_TARGET_PER_DAY = 30;

// ─── Assigned worklist ───────────────────────────────────────

export type WorklistBucket = "today" | "7d" | "30d";

export interface WorklistItem {
  id: string;
  ctMemberId: string;
  leadId: string;
  leadName: string;
  ageDays: number;
  bucket: WorklistBucket;
  reason: string;
  status: "pending" | "in-progress" | "done" | "skipped";
  priority: "high" | "medium" | "low";
  createdAt: string;
  completedAt?: string;
  outcomeNote?: string;
}

// ─── Volume snapshot ─────────────────────────────────────────

export interface VolumeSnapshot {
  leadsToday: number;
  leads7d: number;
  leads30d: number;
  targetToday: number;
  perZone: Record<string, number>;
}

// ─── NEW: SLA breach entries ─────────────────────────────────

export type SLAKind = "first-response" | "gate-completion" | "post-tour-quote" | "callback-window";

export interface SLABreach {
  id: string;
  leadId: string;
  ownerId: string;
  kind: SLAKind;
  targetMinutes: number;
  actualMinutes: number;
  breachedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  note?: string;
}

export const SLA_TARGETS: Record<SLAKind, number> = {
  "first-response": 5,        // minutes
  "gate-completion": 60,      // minutes after first-contact
  "post-tour-quote": 15,      // minutes after tour completion
  "callback-window": 30,      // minutes past promised slot
};

// ─── NEW: Escalations ────────────────────────────────────────

export type EscalationLevel = "L1" | "L2" | "L3";

export interface Escalation {
  id: string;
  leadId?: string;
  memberId?: string;
  level: EscalationLevel;
  reason: string;
  raisedBy: string;
  raisedAt: string;
  resolvedAt?: string;
  resolution?: string;
  status: "open" | "acknowledged" | "resolved";
}

// ─── NEW: Shift handover ─────────────────────────────────────

export interface HandoverNote {
  id: string;
  fromShift: CTShift;
  toShift: CTShift;
  fromMemberId: string;
  toMemberId?: string;
  createdAt: string;
  openLeads: number;
  hotFollowUps: string[];
  blockers: string;
  wins: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

// ─── NEW: Manager review queue ───────────────────────────────

export type ReviewQueueKind = "reassignment" | "escalation" | "gate-override" | "sla-forgiveness";

export interface ReviewQueueItem {
  id: string;
  kind: ReviewQueueKind;
  leadId?: string;
  memberId?: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
}

// ─── NEW: Exception log ──────────────────────────────────────

export type ExceptionKind = "duplicate-lead" | "wrong-zone" | "customer-abuse" | "system-error" | "process-skip" | "other";

export interface ExceptionEntry {
  id: string;
  kind: ExceptionKind;
  severity: "low" | "medium" | "high";
  leadId?: string;
  memberId?: string;
  note: string;
  raisedBy: string;
  raisedAt: string;
  status: "open" | "investigating" | "closed";
  closureNote?: string;
}

// ─── NEW: Audit trail ────────────────────────────────────────

export interface AuditEntry {
  id: string;
  actor: string;
  entity: "lead" | "gate" | "ownership" | "worklist" | "inventory" | "lineup" | "review" | "escalation" | "system";
  entityId?: string;
  action: string;
  before?: unknown;
  after?: unknown;
  at: string;
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

interface CTStore {
  // core state
  members: CTMember[];
  ownershipMode: OwnershipMode;
  gatesByLead: Record<string, GateState[]>;
  reviews: ChatReview[];
  dailyReviews: DailyInteractionReview[];
  inventory: InventoryFocus[];
  lineup: LineupPick[];
  worklist: WorklistItem[];
  volume: VolumeSnapshot;

  // expansion slices
  slaBreaches: SLABreach[];
  escalations: Escalation[];
  handovers: HandoverNote[];
  reviewQueue: ReviewQueueItem[];
  exceptions: ExceptionEntry[];
  audit: AuditEntry[];

  // ownership
  setOwnershipMode: (m: OwnershipMode) => void;

  // members
  toggleMemberPresence: (id: string) => void;
  updateMember: (id: string, patch: Partial<CTMember>) => void;

  // gates
  getGates: (leadId: string) => GateState[];
  setGate: (leadId: string, key: GateKey, patch: Partial<GateState>) => void;
  bulkSetGates: (leadId: string, gates: GateState[]) => void;

  // reviews
  addReview: (r: Omit<ChatReview, "id" | "reviewedAt">) => ChatReview;
  ensureDailyReviewCoverage: (items: Array<Omit<DailyInteractionReview, "id" | "status" | "updatedAt" | "criticalError">>) => void;
  submitDailyReview: (id: string, patch: Partial<DailyInteractionReview>, reviewerId: string) => void;
  advanceDailyReview: (id: string, patch: Partial<DailyInteractionReview> & { status: FeedbackStatus }) => void;

  // inventory
  toggleInventory: (id: string) => void;
  addInventory: (i: Omit<InventoryFocus, "id">) => void;
  removeInventory: (id: string) => void;

  // lineup
  setLineup: (picks: LineupPick[]) => void;
  updatePick: (memberId: string, patch: Partial<LineupPick>) => void;

  // worklist
  assignWorklist: (items: Omit<WorklistItem, "id" | "createdAt" | "status">[]) => void;
  markWorklist: (id: string, status: WorklistItem["status"], outcomeNote?: string) => void;
  bulkMarkWorklist: (ids: string[], status: WorklistItem["status"]) => void;
  clearCompletedWorklist: () => void;

  // volume
  setVolume: (v: Partial<VolumeSnapshot>) => void;

  // NEW: SLA
  logSLABreach: (b: Omit<SLABreach, "id" | "breachedAt" | "resolved">) => void;
  resolveSLABreach: (id: string, note?: string) => void;

  // NEW: escalations
  raiseEscalation: (e: Omit<Escalation, "id" | "raisedAt" | "status">) => void;
  ackEscalation: (id: string) => void;
  resolveEscalation: (id: string, resolution: string) => void;

  // NEW: handover
  addHandover: (h: Omit<HandoverNote, "id" | "createdAt">) => void;
  ackHandover: (id: string, byMemberId: string) => void;

  // NEW: review queue
  queueReview: (r: Omit<ReviewQueueItem, "id" | "requestedAt" | "status">) => void;
  decideReview: (id: string, status: "approved" | "rejected", by: string, note?: string) => void;

  // NEW: exceptions
  logException: (e: Omit<ExceptionEntry, "id" | "raisedAt" | "status">) => void;
  updateException: (id: string, patch: Partial<ExceptionEntry>) => void;

  // NEW: audit
  audit_push: (a: Omit<AuditEntry, "id" | "at">) => void;
  clearAudit: () => void;

  // NEW: bulk reset
  resetControlTower: () => void;
}

const uid = () => `ct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

export const useControlTower = create<CTStore>()(
  persist(
    (set, get) => ({
      members: CT_TEAM_SEED,
      ownershipMode: "shadow-allowed",
      gatesByLead: {},
      reviews: [],
      dailyReviews: [],
      inventory: INVENTORY_FOCUS_SEED,
      lineup: [],
      worklist: [],
      volume: {
        leadsToday: 42,
        leads7d: 287,
        leads30d: 1108,
        targetToday: 50,
        perZone: { south: 96, central: 58, east: 71, north: 40, west: 22 },
      },
      slaBreaches: [],
      escalations: [],
      handovers: [],
      reviewQueue: [],
      exceptions: [],
      audit: [],

      setOwnershipMode: (m) => {
        get().audit_push({ actor: "system", entity: "ownership", action: `mode → ${m}`, before: get().ownershipMode, after: m });
        set({ ownershipMode: m });
      },

      toggleMemberPresence: (id) =>
        set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, present: !m.present } : m)) })),
      updateMember: (id, patch) =>
        set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),

      getGates: (leadId) => get().gatesByLead[leadId] ?? newGates(),
      setGate: (leadId, key, patch) => {
        set((s) => {
          const current = s.gatesByLead[leadId] ?? newGates();
          return {
            gatesByLead: {
              ...s.gatesByLead,
              [leadId]: current.map((g) => (g.key === key ? { ...g, ...patch, answeredAt: now() } : g)),
            },
          };
        });
        get().audit_push({ actor: "ct", entity: "gate", entityId: leadId, action: `${key} → ${patch.status ?? "edit"}` });
      },
      bulkSetGates: (leadId, gates) =>
        set((s) => ({ gatesByLead: { ...s.gatesByLead, [leadId]: gates } })),

      addReview: (r) => {
        const rec: ChatReview = { ...r, id: uid(), reviewedAt: now() };
        set((s) => ({ reviews: [rec, ...s.reviews].slice(0, 500) }));
        get().audit_push({ actor: r.reviewerId, entity: "review", entityId: rec.id, action: `chat review saved · overall ${r.overall}/5` });
        return rec;
      },
      ensureDailyReviewCoverage: (items) =>
        set((s) => {
          const existing = new Set(s.dailyReviews.map((r) => `${r.leadId}:${r.kind}:${r.dueAt.slice(0, 10)}`));
          const additions: DailyInteractionReview[] = items
            .filter((r) => !existing.has(`${r.leadId}:${r.kind}:${r.dueAt.slice(0, 10)}`))
            .map((r) => ({ ...r, id: uid(), status: "review-due", criticalError: false, updatedAt: now() }));
          return additions.length ? { dailyReviews: [...additions, ...s.dailyReviews].slice(0, 5000) } : s;
        }),
      submitDailyReview: (id, patch, reviewerId) => {
        set((s) => ({
          dailyReviews: s.dailyReviews.map((r) => r.id === id ? {
            ...r, ...patch, reviewerId, reviewedAt: now(), updatedAt: now(), status: "reviewer-submitted",
          } : r),
        }));
        get().audit_push({ actor: reviewerId, entity: "review", entityId: id, action: `${patch.kind ?? "interaction"} review submitted · ${patch.score ?? 0}/100` });
      },
      advanceDailyReview: (id, patch) => {
        set((s) => ({ dailyReviews: s.dailyReviews.map((r) => r.id === id ? { ...r, ...patch, updatedAt: now() } : r) }));
        get().audit_push({ actor: "review-loop", entity: "review", entityId: id, action: `feedback → ${patch.status}` });
      },

      toggleInventory: (id) =>
        set((s) => ({ inventory: s.inventory.map((i) => (i.id === id ? { ...i, active: !i.active } : i)) })),
      addInventory: (i) => set((s) => ({ inventory: [{ ...i, id: uid() }, ...s.inventory] })),
      removeInventory: (id) => set((s) => ({ inventory: s.inventory.filter((i) => i.id !== id) })),

      setLineup: (picks) => {
        set({ lineup: picks });
        get().audit_push({ actor: "ct", entity: "lineup", action: `lineup set · ${picks.length} picks` });
      },
      updatePick: (memberId, patch) =>
        set((s) => ({ lineup: s.lineup.map((p) => (p.memberId === memberId ? { ...p, ...patch } : p)) })),

      assignWorklist: (items) => {
        const t = now();
        const rows: WorklistItem[] = items.map((i) => ({ ...i, id: uid(), createdAt: t, status: "pending" }));
        set((s) => ({ worklist: [...rows, ...s.worklist].slice(0, 4000) }));
        get().audit_push({ actor: "ct", entity: "worklist", action: `assigned ${rows.length} items` });
      },
      markWorklist: (id, status, outcomeNote) =>
        set((s) => ({
          worklist: s.worklist.map((w) =>
            w.id === id
              ? { ...w, status, outcomeNote, completedAt: status === "done" ? now() : w.completedAt }
              : w,
          ),
        })),
      bulkMarkWorklist: (ids, status) =>
        set((s) => ({
          worklist: s.worklist.map((w) =>
            ids.includes(w.id)
              ? { ...w, status, completedAt: status === "done" ? now() : w.completedAt }
              : w,
          ),
        })),
      clearCompletedWorklist: () =>
        set((s) => ({ worklist: s.worklist.filter((w) => w.status !== "done" && w.status !== "skipped") })),

      setVolume: (v) => set((s) => ({ volume: { ...s.volume, ...v } })),

      logSLABreach: (b) => {
        const rec: SLABreach = { ...b, id: uid(), breachedAt: now(), resolved: false };
        set((s) => ({ slaBreaches: [rec, ...s.slaBreaches].slice(0, 500) }));
      },
      resolveSLABreach: (id, note) =>
        set((s) => ({
          slaBreaches: s.slaBreaches.map((b) =>
            b.id === id ? { ...b, resolved: true, resolvedAt: now(), note } : b,
          ),
        })),

      raiseEscalation: (e) => {
        const rec: Escalation = { ...e, id: uid(), raisedAt: now(), status: "open" };
        set((s) => ({ escalations: [rec, ...s.escalations].slice(0, 500) }));
        get().audit_push({ actor: e.raisedBy, entity: "escalation", entityId: rec.id, action: `${e.level} raised — ${e.reason}` });
      },
      ackEscalation: (id) =>
        set((s) => ({ escalations: s.escalations.map((e) => (e.id === id ? { ...e, status: "acknowledged" } : e)) })),
      resolveEscalation: (id, resolution) =>
        set((s) => ({
          escalations: s.escalations.map((e) =>
            e.id === id ? { ...e, status: "resolved", resolvedAt: now(), resolution } : e,
          ),
        })),

      addHandover: (h) => {
        const rec: HandoverNote = { ...h, id: uid(), createdAt: now() };
        set((s) => ({ handovers: [rec, ...s.handovers].slice(0, 200) }));
      },
      ackHandover: (id, byMemberId) =>
        set((s) => ({
          handovers: s.handovers.map((h) =>
            h.id === id ? { ...h, acknowledgedAt: now(), acknowledgedBy: byMemberId } : h,
          ),
        })),

      queueReview: (r) => {
        const rec: ReviewQueueItem = { ...r, id: uid(), requestedAt: now(), status: "pending" };
        set((s) => ({ reviewQueue: [rec, ...s.reviewQueue].slice(0, 300) }));
      },
      decideReview: (id, status, by, note) =>
        set((s) => ({
          reviewQueue: s.reviewQueue.map((r) =>
            r.id === id ? { ...r, status, decidedBy: by, decidedAt: now(), decisionNote: note } : r,
          ),
        })),

      logException: (e) => {
        const rec: ExceptionEntry = { ...e, id: uid(), raisedAt: now(), status: "open" };
        set((s) => ({ exceptions: [rec, ...s.exceptions].slice(0, 500) }));
      },
      updateException: (id, patch) =>
        set((s) => ({ exceptions: s.exceptions.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

      audit_push: (a) => {
        const rec: AuditEntry = { ...a, id: uid(), at: now() };
        set((s) => ({ audit: [rec, ...s.audit].slice(0, 1000) }));
      },
      clearAudit: () => set({ audit: [] }),

      resetControlTower: () =>
        set({
          gatesByLead: {}, reviews: [], dailyReviews: [], worklist: [], lineup: [],
          slaBreaches: [], escalations: [], handovers: [], reviewQueue: [], exceptions: [], audit: [],
        }),
    }),
    { name: "control-tower-team-v2" },
  ),
);

// ─────────────────────────────────────────────────────────────
// Selectors / helpers
// ─────────────────────────────────────────────────────────────

export function inventoryByHorizon(all: InventoryFocus[]): Record<InventoryHorizon, InventoryFocus[]> {
  return {
    today: all.filter((i) => i.horizon === "today"),
    "this-week": all.filter((i) => i.horizon === "this-week"),
    "this-month": all.filter((i) => i.horizon === "this-month"),
    later: all.filter((i) => i.horizon === "later"),
  };
}

export function suggestLineup(
  members: { id: string; name: string; role?: string; performance?: number }[],
): LineupPick[] {
  const sorted = [...members].sort((a, b) => (b.performance ?? 50) - (a.performance ?? 50));
  return sorted.map((m, idx) => {
    let slot: LineupSlot;
    let target: number;
    let reason: string;
    if (idx < 3) { slot = "opener"; target = 4; reason = "Best hit-rate — takes the top-priority hot leads at day open."; }
    else if (idx < 9) { slot = "middle"; target = 2; reason = "Consistent middle order — steady 2 BBD from warm leads."; }
    else if (idx < 13) { slot = "finisher"; target = 1; reason = "Closer role — negotiates and finishes at day-end."; }
    else { slot = "bench"; target = 0; reason = "Bench / rotation cover."; }
    return { memberId: m.id, memberName: m.name, role: m.role ?? "TCM", slot, targetBookings: target, reason };
  });
}

export interface LeaderboardRow {
  member: CTMember;
  worklistDone: number;
  worklistAssigned: number;
  reviews: number;
  breaches: number;
  score: number;
}

export function computeLeaderboard(
  members: CTMember[],
  worklist: WorklistItem[],
  reviews: ChatReview[],
  breaches: SLABreach[],
): LeaderboardRow[] {
  return members
    .map((m) => {
      const own = worklist.filter((w) => w.ctMemberId === m.id);
      const done = own.filter((w) => w.status === "done").length;
      const revs = reviews.filter((r) => r.reviewerId === m.id).length;
      const br = breaches.filter((b) => b.ownerId === m.id && !b.resolved).length;
      const compRate = own.length === 0 ? 0 : done / own.length;
      const score = Math.round(m.performance * 0.5 + compRate * 40 + Math.min(revs, 10) * 1.5 - br * 3);
      return { member: m, worklistDone: done, worklistAssigned: own.length, reviews: revs, breaches: br, score };
    })
    .sort((a, b) => b.score - a.score);
}
