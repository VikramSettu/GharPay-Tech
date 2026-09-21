/**
 * Role Guarantee — the operating promise owned by each Gharpayy role.
 *
 * A role is not judged by the same generic checklist as every other role.
 * Each role owns a different transformation in the customer graph:
 * Flow Ops feeds Tours, TCM converts scheduled tours into completed structured
 * outcomes, Closing converts post-tour intent into paid bookings, Supply clears
 * inventory dependencies, Check-in protects the final handover, and Control
 * Tower guarantees the whole graph is owned, executable and recoverable.
 */

import type { UnifiedLead } from "@/lib/lead-identity/types";
import {
  DAY,
  deriveStage,
  roleOfFunction,
  startOfDay,
  type LeadMotion,
  type PersonFlow,
  type ViolationCode,
  type WorkRoleId,
  WORK_ROLES,
} from "./engine";
import type { DailyTargets, Handoff } from "./store";

export type RoleGuaranteeId = "control-tower" | WorkRoleId;

export interface RoleMeta {
  id: RoleGuaranteeId;
  label: string;
  /** The transformation this role exists to create. */
  mission: string;
  /** The sentence this role must be able to guarantee at any moment. */
  promise: string;
  input: string;
  output: string;
  downstream: string;
  owns: ViolationCode[];
  queueTo: string;
}

const ALL_CODES: ViolationCode[] = [
  "NO_OWNER",
  "NO_NEXT_ACTION",
  "FIRST_CALL_OVERDUE",
  "NO_CALL_24H",
  "FOLLOWUP_OVERDUE",
  "STAGE_IDLE",
  "CONNECTED_NO_OUTCOME",
  "TOUR_NO_OWNER",
  "TOUR_NOT_CONFIRMED",
  "TOUR_DONE_NO_OUTCOME",
  "TOUR_DONE_NO_QUOTE",
  "QUOTE_NO_FOLLOWUP",
  "PAYMENT_INTENT_IDLE",
  "BOOKING_NO_HANDOVER",
  "INVENTORY_BLOCKED",
];

export const ROLE_META: Record<RoleGuaranteeId, RoleMeta> = {
  "control-tower": {
    id: "control-tower",
    label: "Control Tower",
    mission: "Identify → unblock → redistribute → escalate → guarantee company flow.",
    promise: "No lead is unsafe, no person is underloaded without warning, and no downstream miss arrives as a surprise.",
    input: "Every active lead, SLA, queue, handoff and dependency",
    output: "Exact intervention before customer movement or target achievement fails",
    downstream: "Whole company",
    owns: ALL_CODES,
    queueTo: "/tower/interventions",
  },
  "flow-ops": {
    id: "flow-ops",
    label: "Flow Ops",
    mission: "Turn fresh demand into enough qualified, matchable tour demand.",
    promise: "Every viable lead moves fast from contact → qualification → property path → scheduled tour, with enough tour output to feed TCM.",
    input: "Eligible fresh, follow-up, hot-response and recovery leads",
    output: "10 scheduled tours per operator/day with healthy qualification and next actions",
    downstream: "Tour Conversion Manager",
    owns: ["NO_OWNER", "FIRST_CALL_OVERDUE", "NO_CALL_24H", "NO_NEXT_ACTION", "CONNECTED_NO_OUTCOME", "FOLLOWUP_OVERDUE"],
    queueTo: "/my-work",
  },
  tour: {
    id: "tour",
    label: "Tour Conversion Manager",
    mission: "Turn scheduled tours into controlled, confirmed, completed visits with a structured outcome.",
    promise: "Every tour is owned, confirmed, protected from avoidable risk, completed, and handed forward with a usable outcome.",
    input: "20 controlled tours per operator/day from Flow Ops",
    output: "10 completed tours/day and 100% structured post-tour outcomes",
    downstream: "Closing Specialist",
    owns: ["TOUR_NO_OWNER", "TOUR_NOT_CONFIRMED", "TOUR_DONE_NO_OUTCOME", "FOLLOWUP_OVERDUE", "NO_NEXT_ACTION"],
    queueTo: "/tours",
  },
  closing: {
    id: "closing",
    label: "Closing Specialist",
    mission: "Turn qualified post-tour intent into paid bookings.",
    promise: "Every high-intent toured customer gets a commercial path, dated follow-up and decisive payment movement until booked or validly resolved.",
    input: "Conversion-adjusted post-tour closing opportunities",
    output: "4 paid bookings per operator/day, protected by payment-intent priority",
    downstream: "Booking & Check-in",
    owns: ["TOUR_DONE_NO_QUOTE", "QUOTE_NO_FOLLOWUP", "PAYMENT_INTENT_IDLE", "STAGE_IDLE", "NO_NEXT_ACTION"],
    queueTo: "/closing",
  },
  supply: {
    id: "supply",
    label: "PCM / Supply",
    mission: "Make demand matchable and remove inventory dependencies before they kill conversion.",
    promise: "No customer stays blocked on inventory without an explicit supply owner, reason, resolution path and deadline.",
    input: "Customer-specific blockers + live demand gaps + inventory freshness work",
    output: "Matchable inventory and resolved dependencies returned to the original customer owner",
    downstream: "Flow Ops / TCM / Closing",
    owns: ["INVENTORY_BLOCKED"],
    queueTo: "/supply-hub",
  },
  "check-in": {
    id: "check-in",
    label: "Booking & Check-in",
    mission: "Turn a paid booking into a safe, owned check-in.",
    promise: "Every booking has the next downstream owner and check-in date before Closing can consider the customer complete.",
    input: "Verified payment + confirmed room/bed + commercial record",
    output: "Check-in-ready booking with named downstream accountability",
    downstream: "Customer move-in",
    owns: ["BOOKING_NO_HANDOVER"],
    queueTo: "/tower/interventions",
  },
};

export interface RolePart {
  label: string;
  pct: number;
  detail: string;
}

export interface RoleMetric {
  label: string;
  current: number;
  target: number;
  suffix?: string;
}

export interface RoleGuarantee {
  role: RoleGuaranteeId;
  meta: RoleMeta;
  total: number;
  breaches: number;
  p0: number;
  score: number;
  state: "sealed" | "strained" | "broken";
  parts: RolePart[];
  top: LeadMotion[];
  people: PersonFlow[];
  primary: RoleMetric;
  secondary: RoleMetric[];
  headline: string;
  rootCause: string;
  recovery: string;
}

export interface RoleGuaranteeContext {
  leads?: UnifiedLead[];
  handoffs?: Handoff[];
  targets?: Partial<Record<WorkRoleId, DailyTargets>>;
  quotes?: Record<string, { amount: number; ts: string } | undefined>;
  blocked?: Record<string, { reason: string; ts: string } | undefined>;
}

const pct = (ok: number, total: number) => (total === 0 ? 100 : Math.round((ok / total) * 1000) / 10);
const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));
const stateOf = (score: number, p0: number) => (p0 > 0 ? "broken" : score >= 95 ? "sealed" : score >= 80 ? "strained" : "broken") as RoleGuarantee["state"];

function roleTarget(ctx: RoleGuaranteeContext, role: WorkRoleId, key: keyof DailyTargets, fallback: number): number {
  const n = ctx.targets?.[role]?.[key];
  return typeof n === "number" ? n : fallback;
}

function expectedPacePct(current: number, target: number, now: number): number {
  if (target <= 0) return 100;
  const d = new Date(now);
  const hour = d.getHours() + d.getMinutes() / 60;
  const fraction = Math.max(0, Math.min(1, (hour - 9) / 12));
  const expected = Math.floor(target * fraction);
  if (expected <= 0) return 100;
  return clampPct((current / expected) * 100);
}

function isToday(value: string | undefined, now: number): boolean {
  if (!value) return false;
  const n = +new Date(value);
  if (!Number.isFinite(n)) return false;
  const start = startOfDay(now);
  return n >= start && n < start + DAY;
}

function has(m: LeadMotion, code: ViolationCode): boolean {
  return m.violations.some((v) => v.code === code);
}

/**
 * Work owned by a role includes both the current funnel function and work where
 * a violation explicitly makes that role responsible. This is essential for
 * PCM: a closing-stage customer can remain owned by Closing while a supply
 * dependency belongs to PCM.
 */
export function boardForRole(board: LeadMotion[], role: WorkRoleId): LeadMotion[] {
  const owns = ROLE_META[role].owns;
  return board.filter((m) => roleOfFunction(m.fn) === role || m.violations.some((v) => owns.includes(v.code)));
}

function genericIntegrity(mine: LeadMotion[], owns: ViolationCode[]): RolePart[] {
  const total = mine.length;
  const owned = mine.filter((m) => m.ownerId).length;
  const dated = mine.filter((m) => m.dueAt !== null || m.health === "blocked").length;
  const inSla = mine.filter((m) => !m.violations.some((v) => v.severity === "P0")).length;
  const intact = mine.filter((m) => !m.violations.some((v) => owns.includes(v.code) && v.severity !== "P2")).length;
  return [
    { label: "Owned", pct: pct(owned, total), detail: `${total - owned} without accountable ownership` },
    { label: "Dated next step", pct: pct(dated, total), detail: `${total - dated} without a due next step` },
    { label: "Inside SLA", pct: pct(inSla, total), detail: `${total - inSla} P0 SLA failures` },
    { label: "Role promise intact", pct: pct(intact, total), detail: `${total - intact} breaking this role's promise` },
  ];
}

function buildGuarantee(args: {
  role: RoleGuaranteeId;
  mine: LeadMotion[];
  people: PersonFlow[];
  parts: RolePart[];
  primary: RoleMetric;
  secondary?: RoleMetric[];
  headline: string;
  rootCause: string;
  recovery: string;
  p0?: number;
}): RoleGuarantee {
  const { role, mine, people, parts, primary, secondary = [], headline, rootCause, recovery } = args;
  const meta = ROLE_META[role];
  const p0 = args.p0 ?? mine.filter((m) => m.violations.some((v) => v.severity === "P0")).length;
  const breaches = mine.filter((m) => m.violations.some((v) => meta.owns.includes(v.code))).length;
  const score = parts.length ? Math.round((parts.reduce((s, p) => s + p.pct, 0) / parts.length) * 10) / 10 : 100;
  return {
    role,
    meta,
    total: mine.length,
    breaches,
    p0,
    score,
    state: stateOf(score, p0),
    parts,
    top: mine.filter((m) => m.violations.length).slice(0, 5),
    people,
    primary,
    secondary,
    headline,
    rootCause,
    recovery,
  };
}

function controlTowerGuarantee(board: LeadMotion[], people: PersonFlow[], now: number, ctx: RoleGuaranteeContext): RoleGuarantee {
  const openHandoffs = (ctx.handoffs ?? []).filter((h) => !h.acceptedAt && !h.completedAt);
  const owned = board.filter((m) => m.ownerId).length;
  const executable = board.filter((m) => m.action || m.health === "blocked").length;
  const inSla = board.filter((m) => !m.violations.some((v) => v.severity === "P0")).length;
  const loaded = people.filter((p) => p.queueGap === 0).length;
  const recoverable = people.filter((p) => p.risk !== "critical").length;
  const p0 = board.filter((m) => m.violations.some((v) => v.severity === "P0")).length;
  const unsafe = board.filter((m) => !m.ownerId || (!m.action && m.health !== "blocked") || m.violations.some((v) => v.severity === "P0")).length;
  const handoffTotal = (ctx.handoffs ?? []).length;
  const handoffAccepted = Math.max(0, handoffTotal - openHandoffs.length);
  const parts: RolePart[] = [
    { label: "Ownership coverage", pct: pct(owned, board.length), detail: `${board.length - owned} orphaned` },
    { label: "Next-action coverage", pct: pct(executable, board.length), detail: `${board.length - executable} stopped` },
    { label: "SLA protection", pct: pct(inSla, board.length), detail: `${p0} P0 breaches` },
    { label: "Handoff integrity", pct: pct(handoffAccepted, handoffTotal), detail: `${openHandoffs.length} unaccepted handoffs` },
    { label: "Queue sufficiency", pct: pct(loaded, people.length), detail: `${people.length - loaded} people underloaded` },
    { label: "EOD recoverability", pct: pct(recoverable, people.length), detail: `${people.length - recoverable} mathematically/operationally critical` },
  ];
  const weakest = [...parts].sort((a, b) => a.pct - b.pct)[0];
  return buildGuarantee({
    role: "control-tower",
    mine: board,
    people,
    parts,
    primary: { label: "Unsafe active leads", current: unsafe, target: 0 },
    secondary: [
      { label: "P0 interventions", current: p0, target: 0 },
      { label: "Queue shortages", current: people.length - loaded, target: 0 },
      { label: "Pending handoffs", current: openHandoffs.length, target: 0 },
    ],
    headline: unsafe === 0 ? "Company flow is sealed: every active lead is safe and executable." : `${unsafe} active leads need Control Tower intervention now.`,
    rootCause: weakest ? `Weakest guarantee: ${weakest.label.toLowerCase()} — ${weakest.detail}.` : "No active exception.",
    recovery: "Work NOW in this order: P0 customer risk → broken handoff → no next action → queue shortage → downstream target recovery.",
    p0,
  });
}

function flowOpsGuarantee(board: LeadMotion[], people: PersonFlow[], now: number, ctx: RoleGuaranteeContext): RoleGuarantee {
  const mine = boardForRole(board, "flow-ops");
  const rolePeople = people.filter((p) => p.role === "flow-ops");
  const targetTours = rolePeople.length
    ? rolePeople.reduce((s, p) => s + p.targetTours, 0)
    : roleTarget(ctx, "flow-ops", "tours", 10);
  const currentTours = rolePeople.reduce((s, p) => s + p.tours, 0);
  const targetConnections = rolePeople.length
    ? rolePeople.reduce((s, p) => s + p.targetConnections, 0)
    : roleTarget(ctx, "flow-ops", "connections", 70);
  const currentConnections = rolePeople.reduce((s, p) => s + p.connections, 0);
  const queueHealthy = rolePeople.filter((p) => p.queueGap === 0).length;
  const contactHealthy = mine.filter((m) => !has(m, "FIRST_CALL_OVERDUE") && !has(m, "NO_CALL_24H")).length;
  const outcomeHealthy = mine.filter((m) => !has(m, "CONNECTED_NO_OUTCOME")).length;
  const nextHealthy = mine.filter((m) => !!m.action || m.health === "blocked").length;
  const slaHealthy = mine.filter((m) => !m.violations.some((v) => v.severity === "P0")).length;
  const tourPace = expectedPacePct(currentTours, targetTours, now);
  const parts: RolePart[] = [
    { label: "Contact coverage", pct: pct(contactHealthy, mine.length), detail: `${mine.length - contactHealthy} first/24h contact breaches` },
    { label: "Outcome captured", pct: pct(outcomeHealthy, mine.length), detail: `${mine.length - outcomeHealthy} connected without outcome` },
    { label: "Next movement", pct: pct(nextHealthy, mine.length), detail: `${mine.length - nextHealthy} leads without executable next step` },
    { label: "Inside SLA", pct: pct(slaHealthy, mine.length), detail: `${mine.length - slaHealthy} P0 failures` },
    { label: "Queue sufficiency", pct: rolePeople.length ? pct(queueHealthy, rolePeople.length) : (mine.length ? 0 : 100), detail: `${rolePeople.length - queueHealthy} Flow Ops operators short of executable work` },
    { label: "Tour output pace", pct: tourPace, detail: `${currentTours}/${targetTours} tours against today's mission` },
  ];
  const queueGap = rolePeople.reduce((s, p) => s + p.queueGap, 0);
  const connectionPace = expectedPacePct(currentConnections, targetConnections, now);
  const rootCause = queueGap > 0
    ? `Upstream failure: Flow Ops is short ${queueGap} executable actions.`
    : tourPace < 80 && connectionPace >= 90
      ? "Conversion failure: connection volume is healthy, but connected → tour conversion is below requirement."
      : parts.some((p) => p.pct < 80)
        ? `Execution/quality failure: ${[...parts].sort((a, b) => a.pct - b.pct)[0].label.toLowerCase()} is the weakest link.`
        : "No material Flow Ops gap detected.";
  return buildGuarantee({
    role: "flow-ops",
    mine,
    people: rolePeople,
    parts,
    primary: { label: "Tours scheduled", current: currentTours, target: targetTours },
    secondary: [
      { label: "Connected conversations", current: currentConnections, target: targetConnections },
      { label: "Queue shortfall", current: queueGap, target: 0 },
    ],
    headline: tourPace >= 95 ? "Flow Ops is feeding enough qualified tour demand downstream." : `Tour output is at risk: ${currentTours}/${targetTours} against today's mission.`,
    rootCause,
    recovery: queueGap > 0
      ? "Apply the queue-shortage waterfall before judging execution: own due → own eligible → same-zone unassigned → recovery → revival → approved cross-zone."
      : "Prioritize connected + feasible + no-tour customers before adding more low-probability call volume.",
  });
}

function tcmGuarantee(board: LeadMotion[], people: PersonFlow[], now: number, ctx: RoleGuaranteeContext): RoleGuarantee {
  const mine = boardForRole(board, "tour");
  const rolePeople = people.filter((p) => p.role === "tour");
  const leads = ctx.leads ?? [];
  const scheduledToday = leads.filter((l) => isToday(l.anchors?.tourDate, now) && !["LOST", "COLD"].includes(deriveStage(l)));
  const completedToday = scheduledToday.filter((l) => ["TOURED", "NEGOTIATING", "CLOSED"].includes(deriveStage(l)));
  const outcomeDone = completedToday.filter((l) => !!l.interestLevel);
  const assigned = scheduledToday.filter((l) => !!(l.assigneeId ?? l.primaryOwnerId));
  const violatingConfirmation = new Set(mine.filter((m) => has(m, "TOUR_NOT_CONFIRMED")).map((m) => m.lead.ulid));
  const confirmed = scheduledToday.filter((l) => !violatingConfirmation.has(l.ulid));
  const highIntent = outcomeDone.filter((l) => l.interestLevel === "HOT" || l.interestLevel === "WARM");
  const handoffs = ctx.handoffs ?? [];
  const acceptedClosing = highIntent.filter((l) => handoffs.some((h) => h.ulid === l.ulid && h.fromRole === "tour" && h.toRole === "closing" && !!h.acceptedAt)).length;
  const targetDone = rolePeople.length
    ? rolePeople.reduce((s, p) => s + p.targetTours, 0)
    : roleTarget(ctx, "tour", "tours", 10);
  const controlledTarget = Math.max(20, rolePeople.length * 20);
  const parts: RolePart[] = [
    { label: "Tour ownership", pct: pct(assigned.length, scheduledToday.length), detail: `${scheduledToday.length - assigned.length} scheduled tours without accountable TCM` },
    { label: "Tour confirmation", pct: pct(confirmed.length, scheduledToday.length), detail: `${scheduledToday.length - confirmed.length} tours need confirmation/risk action` },
    { label: "Control input", pct: expectedPacePct(scheduledToday.length, controlledTarget, now), detail: `${scheduledToday.length}/${controlledTarget} tours available to control` },
    { label: "Completed-tour pace", pct: expectedPacePct(completedToday.length, targetDone, now), detail: `${completedToday.length}/${targetDone} completed` },
    { label: "Outcome completeness", pct: pct(outcomeDone.length, completedToday.length), detail: `${completedToday.length - outcomeDone.length} completed tours missing structured outcome` },
    { label: "Closing acceptance", pct: pct(acceptedClosing, highIntent.length), detail: `${highIntent.length - acceptedClosing} high-intent outcomes not yet accepted by Closing` },
  ];
  const inputPace = expectedPacePct(scheduledToday.length, controlledTarget, now);
  const donePace = expectedPacePct(completedToday.length, targetDone, now);
  const rootCause = inputPace < 80
    ? `Upstream failure: TCM does not have enough scheduled-tour input from Flow Ops (${scheduledToday.length}/${controlledTarget}).`
    : confirmed.length < scheduledToday.length
      ? `Execution/risk failure: ${scheduledToday.length - confirmed.length} tours need confirmation or protection.`
      : donePace < 80
        ? "Tour conversion failure: controlled input is sufficient, but completed-tour output is behind pace."
        : outcomeDone.length < completedToday.length
          ? "Quality failure: completed tours are missing structured post-tour outcomes."
          : "No material TCM gap detected.";
  return buildGuarantee({
    role: "tour",
    mine,
    people: rolePeople,
    parts,
    primary: { label: "Completed tours", current: completedToday.length, target: targetDone },
    secondary: [
      { label: "Tours controlled / available", current: scheduledToday.length, target: controlledTarget },
      { label: "Structured outcomes", current: outcomeDone.length, target: completedToday.length },
    ],
    headline: donePace >= 95 && outcomeDone.length === completedToday.length
      ? "TCM is converting scheduled tours into clean downstream outcomes."
      : `${Math.max(0, scheduledToday.length - confirmed.length)} tours at confirmation risk · ${completedToday.length}/${targetDone} completed.`,
    rootCause,
    recovery: inputPace < 80
      ? "Escalate upstream tour shortage to Control Tower; do not classify the missing output as TCM execution failure."
      : "Protect imminent tours first: assign → customer confirm → property/inventory confirm → alternate → complete outcome → Closing handoff.",
  });
}

function closingGuarantee(board: LeadMotion[], people: PersonFlow[], now: number, ctx: RoleGuaranteeContext): RoleGuarantee {
  const mine = boardForRole(board, "closing");
  const rolePeople = people.filter((p) => p.role === "closing");
  const leads = ctx.leads ?? [];
  const opportunities = leads.filter((l) => ["TOURED", "NEGOTIATING"].includes(deriveStage(l)));
  const quotes = ctx.quotes ?? {};
  const quoted = opportunities.filter((l) => !!quotes[l.ulid]);
  const quoteFollowupHealthy = mine.filter((m) => !has(m, "QUOTE_NO_FOLLOWUP")).length;
  const paymentHealthy = mine.filter((m) => !has(m, "PAYMENT_INTENT_IDLE")).length;
  const bookingsToday = leads.filter((l) => (deriveStage(l) === "CLOSED" || l.state === "converted") && isToday(l.updatedAt, now)).length;
  const targetBookings = Math.max(
    roleTarget(ctx, "closing", "bookings", 4),
    rolePeople.reduce((s, p) => s + p.targetBookings, 0),
  );
  const requiredOpportunities = Math.max(1, targetBookings * 10); // V1 company fallback: 10% close rate.
  const incoming = (ctx.handoffs ?? []).filter((h) => h.toRole === "closing" && h.fromRole === "tour");
  const acceptedIncoming = incoming.filter((h) => !!h.acceptedAt).length;
  const parts: RolePart[] = [
    { label: "Opportunity supply", pct: clampPct((opportunities.length / requiredOpportunities) * 100), detail: `${opportunities.length}/${requiredOpportunities} closeable post-tour opportunities (10% V1 fallback)` },
    { label: "Quotation coverage", pct: pct(quoted.length, opportunities.length), detail: `${opportunities.length - quoted.length} toured opportunities without quotation` },
    { label: "Dated follow-up", pct: pct(quoteFollowupHealthy, mine.length), detail: `${mine.length - quoteFollowupHealthy} closing items missing valid follow-up` },
    { label: "Payment intent protected", pct: pct(paymentHealthy, mine.length), detail: `${mine.length - paymentHealthy} payment-intent/SLA risks` },
    { label: "Incoming handoff accepted", pct: pct(acceptedIncoming, incoming.length), detail: `${incoming.length - acceptedIncoming} post-tour handoffs awaiting Closing acceptance` },
    { label: "Booking output pace", pct: expectedPacePct(bookingsToday, targetBookings, now), detail: `${bookingsToday}/${targetBookings} paid-booking outcome` },
  ];
  const bookingPace = expectedPacePct(bookingsToday, targetBookings, now);
  const rootCause = opportunities.length < requiredOpportunities
    ? `Upstream failure: Closing has ${opportunities.length}/${requiredOpportunities} required post-tour opportunities.`
    : quoted.length < opportunities.length
      ? `Execution failure: ${opportunities.length - quoted.length} toured opportunities still need a quotation/commercial path.`
      : paymentHealthy < mine.length
        ? "SLA failure: payment-ready/high-intent work is sitting idle."
        : bookingPace < 80
          ? "Conversion/quality failure: opportunity supply is sufficient but paid-booking output is behind pace."
          : "No material Closing gap detected.";
  return buildGuarantee({
    role: "closing",
    mine,
    people: rolePeople,
    parts,
    primary: { label: "Paid bookings", current: bookingsToday, target: targetBookings },
    secondary: [
      { label: "Closing opportunities", current: opportunities.length, target: requiredOpportunities },
      { label: "Quotes created", current: quoted.length, target: opportunities.length },
    ],
    headline: bookingPace >= 95 ? "Closing is on pace for the paid-booking outcome." : `Booking target at risk: ${bookingsToday}/${targetBookings} paid bookings so far.`,
    rootCause,
    recovery: opportunities.length < requiredOpportunities
      ? "Pull recovery upstream: unresolved post-tour outcomes → quote-ready tours → tour-ready connected customers → supply blockers."
      : "Prioritize in this order: payment intent → room hold expiry → quote viewed/high intent → decision-maker blocker → discount/approval → recovery.",
  });
}

function supplyGuarantee(board: LeadMotion[], people: PersonFlow[], now: number, ctx: RoleGuaranteeContext): RoleGuarantee {
  const mine = boardForRole(board, "supply");
  const rolePeople = people.filter((p) => p.role === "supply");
  const blocked = mine.filter((m) => has(m, "INVENTORY_BLOCKED"));
  const handoffs = ctx.handoffs ?? [];
  const assignedDependency = blocked.filter((m) => handoffs.some((h) => h.ulid === m.lead.ulid && h.toRole === "supply" && !!h.toUser)).length;
  const acceptedDependency = blocked.filter((m) => handoffs.some((h) => h.ulid === m.lead.ulid && h.toRole === "supply" && !!h.acceptedAt)).length;
  const dated = blocked.filter((m) => m.dueAt !== null).length;
  const fresh = blocked.filter((m) => m.idleMs < 2 * DAY).length;
  const reasoned = blocked.filter((m) => !!ctx.blocked?.[m.lead.ulid]?.reason).length;
  const parts: RolePart[] = [
    { label: "Blocker reason", pct: pct(reasoned, blocked.length), detail: `${blocked.length - reasoned} blockers without explicit reason` },
    { label: "Dependency owner", pct: pct(assignedDependency, blocked.length), detail: `${blocked.length - assignedDependency} blockers without named PCM owner` },
    { label: "Resolution deadline", pct: pct(dated, blocked.length), detail: `${blocked.length - dated} blockers without dated next step` },
    { label: "Dependency accepted", pct: pct(acceptedDependency, blocked.length), detail: `${blocked.length - acceptedDependency} supply handoffs not accepted` },
    { label: "Still moving", pct: pct(fresh, blocked.length), detail: `${blocked.length - fresh} blockers idle over 48h` },
  ];
  const weakest = [...parts].sort((a, b) => a.pct - b.pct)[0];
  return buildGuarantee({
    role: "supply",
    mine: blocked,
    people: rolePeople,
    parts,
    primary: { label: "Open customer blockers", current: blocked.length, target: 0 },
    secondary: [
      { label: "Owned dependencies", current: assignedDependency, target: blocked.length },
      { label: "Accepted dependencies", current: acceptedDependency, target: blocked.length },
    ],
    headline: blocked.length === 0 ? "No customer is currently blocked by inventory." : `${blocked.length} customers are supply-blocked and must have an owned resolution path.`,
    rootCause: blocked.length === 0 ? "No active supply dependency." : `${weakest.label} is the weakest supply guarantee — ${weakest.detail}.`,
    recovery: "Resolve customer-specific blockers first, then replenish matchable inventory from live demand gaps. Resolution must return the customer to the original operational owner.",
  });
}

function checkinGuarantee(board: LeadMotion[], people: PersonFlow[], now: number, ctx: RoleGuaranteeContext): RoleGuarantee {
  const rolePeople = people.filter((p) => p.role === "check-in");
  const leads = ctx.leads ?? [];
  const booked = leads.filter((l) => deriveStage(l) === "CLOSED" || l.state === "converted");
  const unsafe = booked.filter((l) => !l.anchors?.checkInDate);
  const handoffs = ctx.handoffs ?? [];
  const handed = booked.filter((l) => handoffs.some((h) => h.ulid === l.ulid && h.toRole === "check-in" && !!h.toUser)).length;
  const accepted = booked.filter((l) => handoffs.some((h) => h.ulid === l.ulid && h.toRole === "check-in" && !!h.acceptedAt)).length;
  const synthetic = board.filter((m) => has(m, "BOOKING_NO_HANDOVER"));
  const parts: RolePart[] = [
    { label: "Check-in date", pct: pct(booked.length - unsafe.length, booked.length), detail: `${unsafe.length} booked customers without check-in date` },
    { label: "Downstream owner", pct: pct(handed, booked.length), detail: `${booked.length - handed} bookings without named check-in owner` },
    { label: "Handoff accepted", pct: pct(accepted, booked.length), detail: `${booked.length - accepted} booking handoffs not accepted` },
  ];
  return buildGuarantee({
    role: "check-in",
    mine: synthetic,
    people: rolePeople,
    parts,
    primary: { label: "Unsafe bookings", current: unsafe.length, target: 0 },
    secondary: [
      { label: "Booking handoffs", current: handed, target: booked.length },
      { label: "Accepted handoffs", current: accepted, target: booked.length },
    ],
    headline: unsafe.length === 0 ? "Every booked customer has a downstream check-in path." : `${unsafe.length} bookings are not yet safe for check-in.`,
    rootCause: unsafe.length ? "Booking is being treated as terminal before downstream check-in accountability is complete." : "No downstream booking gap detected.",
    recovery: "Verify payment → exact room/bed → commercial record → check-in date → named owner → accepted downstream task.",
  });
}

export function allRoleGuarantees(
  board: LeadMotion[],
  people: PersonFlow[],
  now: number,
  ctx: RoleGuaranteeContext = {},
): RoleGuarantee[] {
  return [
    controlTowerGuarantee(board, people, now, ctx),
    flowOpsGuarantee(board, people, now, ctx),
    tcmGuarantee(board, people, now, ctx),
    closingGuarantee(board, people, now, ctx),
    supplyGuarantee(board, people, now, ctx),
    checkinGuarantee(board, people, now, ctx),
  ];
}

/** Org role score is the weakest ACTIVE guarantee; averages cannot hide a broken role. */
export function allRolesScore(roles: RoleGuarantee[]): number {
  const active = roles.filter((r) => r.total > 0 || r.primary.current !== r.primary.target);
  if (!active.length) return 100;
  return Math.round(Math.min(...active.map((r) => r.score)) * 10) / 10;
}
