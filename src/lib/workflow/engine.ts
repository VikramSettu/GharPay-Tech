/**
 * Workflow Guarantee OS — engine.
 *
 * Pure, read-only derivation on top of the canonical lead store. Nothing here
 * mutates state. It answers one question: "is every lead moving, and if not,
 * who must do what by when?"
 *
 * Layers
 *  1. Motion    — per-lead health, violations, next action, due time.
 *  2. Priority  — ranked execution order (§27).
 *  3. Waves     — the day chopped into finishable blocks (§7).
 *  4. Capacity  — required vs available upstream, projected EOD (§12, §22).
 *  5. Guarantee — one org-level score (§29).
 */

import type { UnifiedLead } from "@/lib/lead-identity/types";
import { computeNextAction, deriveStage, derivePhase, type NextAction } from "@/lib/crm10x/execution-engine";

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

// ───────────────────────── violations ─────────────────────────

export type ViolationCode =
  | "NO_OWNER"
  | "NO_NEXT_ACTION"
  | "FIRST_CALL_OVERDUE"
  | "NO_CALL_24H"
  | "FOLLOWUP_OVERDUE"
  | "STAGE_IDLE"
  | "CONNECTED_NO_OUTCOME"
  | "TOUR_NO_OWNER"
  | "TOUR_NOT_CONFIRMED"
  | "TOUR_DONE_NO_OUTCOME"
  | "TOUR_DONE_NO_QUOTE"
  | "QUOTE_NO_FOLLOWUP"
  | "PAYMENT_INTENT_IDLE"
  | "BOOKING_NO_HANDOVER"
  | "INVENTORY_BLOCKED";

export type Severity = "P0" | "P1" | "P2";

export type DirectAction =
  | "call" | "assign" | "reassign" | "follow-up" | "schedule-tour"
  | "assign-tcm" | "create-quote" | "escalate" | "mark-blocked" | "open";

export interface Violation {
  code: ViolationCode;
  label: string;
  detail: string;
  severity: Severity;
  /** Which function owns fixing this. */
  fn: WorkflowFunction;
  actions: DirectAction[];
}

export type WorkflowFunction = "lead" | "flow-ops" | "tour" | "closing" | "supply" | "check-in";

export type Health = "healthy" | "due-soon" | "action-required" | "blocked";

/** Every role that carries a piece of the workflow guarantee. */
export type WorkRoleId = "flow-ops" | "tour" | "closing" | "supply" | "check-in";

export const WORK_ROLES: WorkRoleId[] = ["flow-ops", "tour", "closing", "supply", "check-in"];

/** Which role owns a given workflow function (§15). */
export function roleOfFunction(fn: WorkflowFunction): WorkRoleId {
  if (fn === "tour") return "tour";
  if (fn === "closing") return "closing";
  if (fn === "supply") return "supply";
  if (fn === "check-in") return "check-in";
  return "flow-ops";
}

export interface MotionContext {
  now: number;
  /** ulid → quotation amount */
  quotes: Record<string, { amount: number; ts: string } | undefined>;
  /** ulid → supply block */
  blocked: Record<string, { reason: string; ts: string } | undefined>;
  /** resolved / snoozed violations: `${ulid}:${code}` */
  resolved: Record<string, string | undefined>;
  /** ulid → "waiting until" ISO — a waiting state MUST expire (§19) */
  waiting: Record<string, string | undefined>;
}

export interface LeadMotion {
  lead: UnifiedLead;
  action: NextAction | null;
  dueAt: number | null;
  health: Health;
  violations: Violation[];
  worst: Severity | null;
  priorityScore: number;
  ageMs: number;
  idleMs: number;
  ownerId: string | null;
  ownerName: string;
  fn: WorkflowFunction;
  reason: string;
}

const ACTIVE_OUT: string[] = ["CLOSED", "LOST"];

function ts(v?: string | null): number | null {
  if (!v) return null;
  const n = +new Date(v);
  return Number.isFinite(n) ? n : null;
}

export function isActive(lead: UnifiedLead): boolean {
  const stage = deriveStage(lead);
  if (ACTIVE_OUT.includes(stage)) return false;
  return lead.state !== "converted" && lead.state !== "dropped";
}

export function ownerOf(lead: UnifiedLead): { id: string | null; name: string } {
  const id = lead.assigneeId ?? lead.primaryOwnerId ?? null;
  const name = lead.assigneeName ?? (id ? "Owner" : "Unassigned");
  return { id: id || null, name: id ? name : "Unassigned" };
}

/** Which function's queue this lead currently belongs to (§15 chain). */
export function functionOf(lead: UnifiedLead): WorkflowFunction {
  const stage = deriveStage(lead);
  if (stage === "TOUR_SCHEDULED") return "tour";
  if (stage === "TOURED" || stage === "NEGOTIATING") return "closing";
  if (stage === "CLOSED") return "check-in";
  if (stage === "NEW") return "lead";
  return "flow-ops";
}

function v(
  code: ViolationCode, label: string, detail: string, severity: Severity,
  fn: WorkflowFunction, actions: DirectAction[],
): Violation {
  return { code, label, detail, severity, fn, actions };
}

/** Detect every workflow violation for a single lead (§4). */
export function detectViolations(lead: UnifiedLead, action: NextAction | null, ctx: MotionContext): Violation[] {
  const out: Violation[] = [];
  if (!isActive(lead)) return out;

  const { now } = ctx;
  const stage = deriveStage(lead);
  const owner = ownerOf(lead);
  const created = ts(lead.createdAt) ?? now;
  const lastContact = ts(lead.lastContactAt);
  const updated = ts(lead.updatedAt) ?? created;
  const tour = ts(lead.anchors?.tourDate);
  const quote = ctx.quotes[lead.ulid];
  const block = ctx.blocked[lead.ulid];
  const waitUntil = ts(ctx.waiting[lead.ulid]);

  if (block) out.push(v("INVENTORY_BLOCKED", "Supply blocked", block.reason, "P1", "supply", ["mark-blocked", "open"]));

  if (!owner.id) out.push(v("NO_OWNER", "No owner", "Nobody is accountable for this lead", "P0", "lead", ["assign", "open"]));

  if (!action && !block) {
    out.push(v("NO_NEXT_ACTION", "No next action", "Lead exists but nothing is scheduled", "P1", functionOf(lead), ["follow-up", "call", "open"]));
  }

  if (!lastContact && now - created > 2 * HOUR) {
    out.push(v("FIRST_CALL_OVERDUE", "First call overdue", `New lead untouched for ${fmtDur(now - created)}`, "P0", "flow-ops", ["call", "reassign"]));
  }

  if (lastContact && now - lastContact > DAY) {
    out.push(v("NO_CALL_24H", "No call 24h", `Last contact ${fmtDur(now - lastContact)} ago`, "P0", "flow-ops", ["call", "reassign"]));
  }

  if (action) {
    const due = +new Date(action.dueAt);
    if (due < now - 30 * MIN) {
      out.push(v("FOLLOWUP_OVERDUE", "Follow-up overdue", `${action.label} overdue by ${fmtDur(now - due)}`, "P1", functionOf(lead), ["call", "follow-up"]));
    }
  }

  if (now - updated > 5 * DAY) {
    out.push(v("STAGE_IDLE", "Stage idle", `No movement for ${fmtDur(now - updated)} in ${stage}`, "P2", functionOf(lead), ["call", "escalate"]));
  }

  if (lead.replied && !lead.interestLevel && stage !== "NEW") {
    out.push(v("CONNECTED_NO_OUTCOME", "Connected, no outcome", "Conversation happened but result was never recorded", "P1", "flow-ops", ["open"]));
  }

  if (tour && stage === "TOUR_SCHEDULED") {
    if (!owner.id) out.push(v("TOUR_NO_OWNER", "Tour has no TCM", "Tour scheduled without a responsible manager", "P0", "tour", ["assign-tcm"]));
    const untilTour = tour - now;
    const confirmed = lastContact != null && lastContact > now - 12 * HOUR;
    if (untilTour > 0 && untilTour < DAY && !confirmed) {
      out.push(v("TOUR_NOT_CONFIRMED", "Tour not confirmed", `Tour in ${fmtDur(untilTour)} with no confirmation call`, "P0", "tour", ["call", "escalate"]));
    }
    if (untilTour < -2 * HOUR) {
      out.push(v("TOUR_DONE_NO_OUTCOME", "Tour done, no outcome", "Tour time passed but CRM was never updated", "P0", "tour", ["open", "call"]));
    }
  }

  if ((stage === "TOURED" || stage === "NEGOTIATING") && !quote) {
    out.push(v("TOUR_DONE_NO_QUOTE", "Tour done, no quote", "Customer toured but no quotation exists", "P0", "closing", ["create-quote", "assign"]));
  }

  if (quote && !action) {
    out.push(v("QUOTE_NO_FOLLOWUP", "Quote without follow-up", "Quotation shared with no closing action next", "P1", "closing", ["follow-up", "call"]));
  }

  if (quote && lead.interestLevel === "HOT" && lastContact && now - lastContact > 2 * DAY) {
    out.push(v("PAYMENT_INTENT_IDLE", "Payment intent idle", "Customer agreed but payment workflow stopped", "P0", "closing", ["call", "escalate"]));
  }

  if (stage === "CLOSED" && !lead.anchors?.checkInDate) {
    out.push(v("BOOKING_NO_HANDOVER", "Booking without handover", "Booking created but check-in owner is missing", "P1", "check-in", ["assign", "open"]));
  }

  if (waitUntil && waitUntil < now) {
    out.push(v("FOLLOWUP_OVERDUE", "Waiting window expired", "“Waiting for customer” window elapsed — back in the queue", "P1", functionOf(lead), ["call"]));
  }

  return out.filter((x) => !ctx.resolved[`${lead.ulid}:${x.code}`]);
}

function worstOf(list: Violation[]): Severity | null {
  if (list.some((x) => x.severity === "P0")) return "P0";
  if (list.some((x) => x.severity === "P1")) return "P1";
  if (list.length) return "P2";
  return null;
}

export function fmtDur(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < HOUR) return `${Math.max(1, Math.round(abs / MIN))}m`;
  if (abs < DAY) return `${Math.round(abs / HOUR)}h`;
  return `${Math.round(abs / DAY)}d`;
}

// ───────────────────────── priority (§27) ─────────────────────────

export function priorityScore(lead: UnifiedLead, action: NextAction | null, violations: Violation[], now: number): number {
  let s = 0;
  const stage = deriveStage(lead);
  const lastContact = ts(lead.lastContactAt);
  const created = ts(lead.createdAt) ?? now;
  const tour = ts(lead.anchors?.tourDate);

  // SLA risk
  if (violations.some((x) => x.severity === "P0")) s += 120;
  if (violations.some((x) => x.code === "FOLLOWUP_OVERDUE")) s += 60;
  // customer actively responded
  if (lead.replied) s += 50;
  // intent
  if (lead.interestLevel === "HOT") s += 45;
  if (lead.interestLevel === "WARM") s += 20;
  if (lead.priority === "super-hot") s += 60;
  else if (lead.priority === "hot") s += 30;
  // stage value
  s += ({ NEGOTIATING: 40, TOURED: 34, TOUR_SCHEDULED: 28, CONTACTED: 16, NEW: 22, COLD: 4, CLOSED: 0, LOST: 0 } as Record<string, number>)[stage] ?? 0;
  // tour proximity
  if (tour && tour > now && tour - now < DAY) s += 35;
  // never called
  if (!lastContact) s += 30;
  // recency of arrival
  if (now - created < 2 * HOUR) s += 25;
  else if (now - created < DAY) s += 10;
  // due now
  if (action) {
    const due = +new Date(action.dueAt);
    if (due <= now) s += 30;
    else if (due - now < 3 * HOUR) s += 15;
  }
  // penalty: attempts without response
  s -= Math.min(30, (lead.followUpCount ?? 0) * 4);
  if (lead.noShowFlag) s -= 10;
  return Math.round(s);
}

// ───────────────────────── motion ─────────────────────────

export function computeMotion(lead: UnifiedLead, ctx: MotionContext): LeadMotion {
  const nowDate = new Date(ctx.now);
  const action = computeNextAction(lead, nowDate);
  const violations = detectViolations(lead, action, ctx);
  const worst = worstOf(violations);
  const owner = ownerOf(lead);
  const dueAt = action ? +new Date(action.dueAt) : null;
  const blocked = !!ctx.blocked[lead.ulid];

  let health: Health = "healthy";
  if (blocked) health = "blocked";
  else if (violations.length) health = "action-required";
  else if (dueAt != null && dueAt - ctx.now < 30 * MIN) health = "due-soon";

  const created = ts(lead.createdAt) ?? ctx.now;
  const updated = ts(lead.updatedAt) ?? created;

  return {
    lead,
    action,
    dueAt,
    health,
    violations,
    worst,
    priorityScore: priorityScore(lead, action, violations, ctx.now),
    ageMs: ctx.now - created,
    idleMs: ctx.now - updated,
    ownerId: owner.id,
    ownerName: owner.name,
    fn: functionOf(lead),
    reason: violations[0]?.detail ?? action?.reason ?? "On schedule",
  };
}

export function computeBoard(leads: UnifiedLead[], ctx: MotionContext): LeadMotion[] {
  return leads
    .filter(isActive)
    .map((l) => computeMotion(l, ctx))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

// ───────────────────────── org KPIs (§2, §29) ─────────────────────────

export interface WorkflowKpis {
  active: number;
  moving: number;
  needsAction: number;
  noNextAction: number;
  slaBreached: number;
  noCall24h: number;
  brokenHandoffs: number;
  blocked: number;
  guaranteeScore: number;
  parts: { label: string; pct: number; detail: string }[];
}

export function computeKpis(board: LeadMotion[], shortages: number, eodRisks: number): WorkflowKpis {
  const active = board.length;
  const needsAction = board.filter((m) => m.health === "action-required").length;
  const has = (m: LeadMotion, c: ViolationCode) => m.violations.some((x) => x.code === c);
  const noNextAction = board.filter((m) => has(m, "NO_NEXT_ACTION")).length;
  const slaBreached = board.filter((m) => m.violations.some((x) => x.severity === "P0")).length;
  const noCall24h = board.filter((m) => has(m, "NO_CALL_24H") || has(m, "FIRST_CALL_OVERDUE")).length;
  const brokenHandoffs = board.filter((m) =>
    has(m, "TOUR_NO_OWNER") || has(m, "TOUR_DONE_NO_QUOTE") || has(m, "BOOKING_NO_HANDOVER") || has(m, "TOUR_DONE_NO_OUTCOME")).length;
  const blocked = board.filter((m) => m.health === "blocked").length;
  const withOwner = board.filter((m) => m.ownerId).length;
  const withAction = board.filter((m) => m.action).length;

  const pct = (n: number, d: number) => (d === 0 ? 100 : Math.round((n / d) * 1000) / 10);
  const parts = [
    { label: "Leads with an owner", pct: pct(withOwner, active), detail: `${active - withOwner} unassigned` },
    { label: "Leads with a next action", pct: pct(withAction, active), detail: `${active - withAction} stopped` },
    { label: "SLA compliant", pct: pct(active - slaBreached, active), detail: `${slaBreached} breached` },
    { label: "Intact handoffs", pct: pct(active - brokenHandoffs, active), detail: `${brokenHandoffs} broken` },
    { label: "Loaded team queues", pct: shortages === 0 ? 100 : Math.max(0, 100 - shortages * 12), detail: `${shortages} people short of work` },
  ];
  const guaranteeScore = Math.round((parts.reduce((s, p) => s + p.pct, 0) / parts.length) * 10) / 10;

  return {
    active,
    moving: active - needsAction - blocked,
    needsAction,
    noNextAction,
    slaBreached,
    noCall24h,
    brokenHandoffs,
    blocked,
    guaranteeScore,
    parts,
  };
}

// ───────────────────────── waves (§7) ─────────────────────────

export interface Wave {
  index: number;
  title: string;
  note: string;
  items: LeadMotion[];
}

export function buildWaves(queue: LeadMotion[], waveSize: number, required: number): Wave[] {
  const titles = [
    { title: "Wave 1 — Priority", note: "Hot, SLA risk, due follow-ups." },
    { title: "Wave 2 — Never called", note: "New and never-contacted customers." },
    { title: "Wave 3 — Callbacks", note: "Connected previously / due callbacks." },
    { title: "Wave 4 — Revival", note: "Revival + remaining high-probability customers." },
  ];
  const slice = queue.slice(0, required);
  const waves: Wave[] = [];
  for (let i = 0; i * waveSize < slice.length; i++) {
    const meta = titles[Math.min(i, titles.length - 1)];
    waves.push({ index: i + 1, title: meta.title, note: meta.note, items: slice.slice(i * waveSize, (i + 1) * waveSize) });
  }
  return waves;
}

// ───────────────────────── capacity (§12, §21, §22) ─────────────────────────

export interface AttemptLike { ulid: string; ts: string; connected: boolean; by: string }

export interface PersonFlow {
  userId: string;
  name: string;
  role: WorkRoleId;
  requiredActions: number;
  availableActions: number;
  completedActions: number;
  uniqueLeads: number;
  connections: number;
  targetConnections: number;
  tours: number;
  targetTours: number;
  bookings: number;
  targetBookings: number;
  queueGap: number;
  projectedEod: number;
  pacePerHour: number;
  pace: "on-track" | "behind" | "upstream-gap" | "done";
  risk: "healthy" | "attention" | "critical";
}

export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return +d;
}

/** Hours of the working day elapsed (09:00 → 21:00). */
export function workedHours(now: number): { elapsed: number; remaining: number } {
  const d = new Date(now);
  const h = d.getHours() + d.getMinutes() / 60;
  const elapsed = Math.max(0.25, Math.min(12, h - 9));
  return { elapsed, remaining: Math.max(0, 21 - Math.max(9, h)) };
}

export function personFlow(args: {
  userId: string;
  name: string;
  role: WorkRoleId;
  board: LeadMotion[];
  attempts: AttemptLike[];
  now: number;
  targets: { actions: number; connections: number; tours: number; bookings: number };
}): PersonFlow {
  const { userId, name, role, board, attempts, now, targets } = args;
  const mine = board.filter((m) => m.ownerId === userId);
  const available = mine.filter((m) => m.action || m.violations.length).length;
  const todayStart = startOfDay(now);
  const todays = attempts.filter((a) => a.by === userId && +new Date(a.ts) >= todayStart);
  const completedActions = todays.length;
  const uniqueLeads = new Set(todays.map((a) => a.ulid)).size;
  const connections = todays.filter((a) => a.connected).length;
  const tours = mine.filter((m) => deriveStage(m.lead) === "TOUR_SCHEDULED" || deriveStage(m.lead) === "TOURED").length;
  const bookings = board.filter((m) => m.ownerId === userId && deriveStage(m.lead) === "CLOSED").length;

  const { elapsed, remaining } = workedHours(now);
  const pacePerHour = Math.round((completedActions / elapsed) * 10) / 10;
  const projectedEod = Math.min(
    targets.actions,
    Math.round(completedActions + pacePerHour * remaining),
  );
  const queueGap = Math.max(0, targets.actions - completedActions - available);

  let pace: PersonFlow["pace"] = "on-track";
  if (completedActions >= targets.actions) pace = "done";
  else if (queueGap > 0) pace = "upstream-gap";
  else if (projectedEod < targets.actions * 0.95) pace = "behind";

  const risk: PersonFlow["risk"] =
    pace === "upstream-gap" && queueGap > targets.actions * 0.2 ? "critical"
      : pace === "behind" || pace === "upstream-gap" ? "attention"
        : "healthy";

  return {
    userId, name, role,
    requiredActions: targets.actions,
    availableActions: available,
    completedActions,
    uniqueLeads,
    connections,
    targetConnections: targets.connections,
    tours,
    targetTours: targets.tours,
    bookings,
    targetBookings: targets.bookings,
    queueGap,
    projectedEod,
    pacePerHour,
    pace,
    risk,
  };
}

/** Recovery queue composition (§23). */
export function recoveryQueue(board: LeadMotion[], ownerId: string | null, deficit: number): { bucket: string; items: LeadMotion[] }[] {
  const mine = board.filter((m) => (ownerId ? m.ownerId === ownerId : true));
  const buckets: { bucket: string; test: (m: LeadMotion) => boolean }[] = [
    { bucket: "Hot callbacks", test: (m) => m.lead.interestLevel === "HOT" || m.lead.priority === "super-hot" },
    { bucket: "Never called", test: (m) => !m.lead.lastContactAt },
    { bucket: "Replied on WhatsApp", test: (m) => !!m.lead.replied },
    { bucket: "Revival", test: (m) => m.idleMs > 5 * DAY },
  ];
  const used = new Set<string>();
  const out: { bucket: string; items: LeadMotion[] }[] = [];
  let left = deficit;
  for (const b of buckets) {
    if (left <= 0) break;
    const items = mine.filter((m) => !used.has(m.lead.ulid) && b.test(m)).slice(0, Math.ceil(deficit / 3));
    items.forEach((m) => used.add(m.lead.ulid));
    left -= items.length;
    if (items.length) out.push({ bucket: b.bucket, items });
  }
  return out;
}

/** Checkpoint verdict (§24). */
export type CheckpointStatus = "on-track" | "recoverable" | "at-risk" | "upstream-impossible";

export function checkpointVerdict(f: PersonFlow): { status: CheckpointStatus; line: string } {
  if (f.queueGap > 0 && f.completedActions + f.availableActions < f.requiredActions) {
    return {
      status: "upstream-impossible",
      line: `Impossible today: short ${f.queueGap} eligible leads. Upstream supply must fill the gap.`,
    };
  }
  if (f.completedActions >= f.requiredActions) return { status: "on-track", line: "Minimum execution queue complete." };
  if (f.projectedEod >= f.requiredActions) return { status: "on-track", line: `Projected ${f.projectedEod}/${f.requiredActions} at this pace.` };
  const miss = f.requiredActions - f.projectedEod;
  if (miss <= f.requiredActions * 0.25) return { status: "recoverable", line: `Behind but recoverable — likely miss ${miss} actions.` };
  return { status: "at-risk", line: `Target at risk — projected miss of ${miss} actions.` };
}

export { deriveStage, derivePhase };

// ───────────────────────── role inference (§15/§30) ─────────────────────────

/**
 * A person's role is not a label in a settings screen — it is whatever work
 * they actually hold. Their queue decides which guarantee applies to them.
 */
export function inferRole(board: LeadMotion[], userId: string, fallback: WorkRoleId = "flow-ops"): WorkRoleId {
  const mine = board.filter((m) => m.ownerId === userId);
  if (!mine.length) return fallback;
  const tally = new Map<WorkRoleId, number>();
  mine.forEach((m) => {
    const r = roleOfFunction(m.fn);
    tally.set(r, (tally.get(r) ?? 0) + 1);
  });
  let best: WorkRoleId = fallback;
  let bestN = -1;
  tally.forEach((n, r) => {
    if (n > bestN) { best = r; bestN = n; }
  });
  return best;
}
