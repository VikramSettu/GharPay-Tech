/**
 * Workflow Guarantee OS — P1 intelligence layer.
 *
 * Pure derivation on top of the motion board. Answers the three executive
 * questions: why are we missing, what should we do now, who owns the gap.
 *
 *  1. Funnel snapshot + rolling conversion rates (§20, §23)
 *  2. Reverse funnel planner with operating floors (§21, §22)
 *  3. Bottleneck engine (§45)
 *  4. Root-cause engine (§27, §46)
 *  5. Cascade / downstream impact (§25)
 *  6. Tour risk engine (§18)
 *  7. Person 360 (§44)
 */

import { deriveStage, DAY, HOUR, type LeadMotion, type PersonFlow, type AttemptLike } from "./engine";

// ───────────────────────── funnel ─────────────────────────

export const FUNNEL_STEPS = [
  "attempts",
  "connections",
  "qualified",
  "toursScheduled",
  "toursDone",
  "opportunities",
  "bookings",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const STEP_LABEL: Record<FunnelStep, string> = {
  attempts: "Call attempts",
  connections: "Connections",
  qualified: "Qualified",
  toursScheduled: "Tours scheduled",
  toursDone: "Tours completed",
  opportunities: "Closing opportunities",
  bookings: "Bookings",
};

export type FunnelCounts = Record<FunnelStep, number>;

export function funnelSnapshot(board: LeadMotion[], attempts: AttemptLike[], sinceMs: number): FunnelCounts {
  const recent = attempts.filter((a) => +new Date(a.ts) >= sinceMs);
  const stageOf = (m: LeadMotion) => deriveStage(m.lead);
  const count = (test: (m: LeadMotion) => boolean) => board.filter(test).length;

  return {
    attempts: recent.length,
    connections: recent.filter((a) => a.connected).length,
    qualified: count((m) => !!m.lead.interestLevel || !!m.lead.replied),
    toursScheduled: count((m) => ["TOUR_SCHEDULED", "TOURED", "NEGOTIATING", "CLOSED"].includes(stageOf(m))),
    toursDone: count((m) => ["TOURED", "NEGOTIATING", "CLOSED"].includes(stageOf(m))),
    opportunities: count((m) => ["NEGOTIATING", "CLOSED"].includes(stageOf(m))),
    bookings: count((m) => stageOf(m) === "CLOSED"),
  };
}

/** Ordered conversion edges of the funnel. */
export const EDGES: { from: FunnelStep; to: FunnelStep; label: string; fallback: number }[] = [
  { from: "attempts", to: "connections", label: "Attempt → Connect", fallback: 0.58 },
  { from: "connections", to: "qualified", label: "Connect → Qualified", fallback: 0.45 },
  { from: "qualified", to: "toursScheduled", label: "Qualified → Tour scheduled", fallback: 0.34 },
  { from: "toursScheduled", to: "toursDone", label: "Scheduled → Completed", fallback: 0.62 },
  { from: "toursDone", to: "opportunities", label: "Tour → Closing opportunity", fallback: 0.48 },
  { from: "opportunities", to: "bookings", label: "Opportunity → Booking", fallback: 0.22 },
];

export type Rates = Record<string, number>;

/** Rolling rates with company fallback and sane clamping (§23). */
export function conversionRates(counts: FunnelCounts, sampleFloor = 8): Rates {
  const out: Rates = {};
  for (const e of EDGES) {
    const from = counts[e.from];
    const to = counts[e.to];
    const observed = from > 0 ? to / from : 0;
    const usable = from >= sampleFloor && observed > 0;
    out[e.label] = clamp(usable ? observed : e.fallback, 0.03, 0.95);
  }
  return out;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

// ───────────────────────── reverse funnel planner (§21) ─────────────────────────

export interface PlanRow {
  step: FunnelStep;
  label: string;
  calculated: number;
  floor: number;
  required: number;
  current: number;
  gap: number;
  /** conversion applied from this step to the next */
  rateLabel: string;
  ratePct: number;
}

export interface Plan {
  bookingTarget: number;
  rows: PlanRow[];
  /** bookings we can still expect if nothing changes */
  projectedBookings: number;
  headline: string;
}

const DEFAULT_FLOORS: Partial<Record<FunnelStep, number>> = {
  attempts: 120,
  connections: 70,
  toursScheduled: 10,
};

/** Work backwards from the booking target; never below the operating floor (§22). */
export function reverseFunnel(
  bookingTarget: number,
  rates: Rates,
  counts: FunnelCounts,
  floors: Partial<Record<FunnelStep, number>> = DEFAULT_FLOORS,
): Plan {
  const required: Partial<Record<FunnelStep, number>> = { bookings: bookingTarget };
  for (let i = EDGES.length - 1; i >= 0; i--) {
    const e = EDGES[i]!;
    const downstream = required[e.to] ?? 0;
    const rate = rates[e.label] ?? e.fallback;
    required[e.from] = Math.ceil(downstream / rate);
  }

  const rows: PlanRow[] = FUNNEL_STEPS.map((step) => {
    const edge = EDGES.find((e) => e.from === step);
    const calculated = required[step] ?? 0;
    const floor = floors[step] ?? 0;
    const finalReq = Math.max(calculated, floor);
    const current = counts[step] ?? 0;
    return {
      step,
      label: STEP_LABEL[step],
      calculated,
      floor,
      required: finalReq,
      current,
      gap: Math.max(0, finalReq - current),
      rateLabel: edge?.label ?? "—",
      ratePct: edge ? Math.round((rates[edge.label] ?? edge.fallback) * 1000) / 10 : 100,
    };
  });

  // forward projection from what actually exists today
  let carry = counts.attempts;
  for (const e of EDGES) {
    const rate = rates[e.label] ?? e.fallback;
    const observed = counts[e.to];
    carry = Math.max(observed, carry * rate);
  }
  const projectedBookings = Math.round(carry * 10) / 10;

  const worst = [...rows].filter((r) => r.gap > 0).sort((a, b) => b.gap / Math.max(1, b.required) - a.gap / Math.max(1, a.required))[0];
  const headline = worst
    ? `${worst.label} is the binding constraint — ${worst.gap} short of ${worst.required}.`
    : "Every funnel stage has enough volume for the booking target.";

  return { bookingTarget, rows, projectedBookings, headline };
}

// ───────────────────────── bottleneck engine (§45) ─────────────────────────

export interface Bottleneck {
  label: string;
  from: FunnelStep;
  to: FunnelStep;
  inflow: number;
  throughput: number;
  waiting: number;
  ratePct: number;
  expectedPct: number;
  severity: "healthy" | "watch" | "bottleneck" | "critical";
  bookingsAtRisk: number;
}

export function bottlenecks(counts: FunnelCounts, rates: Rates): Bottleneck[] {
  return EDGES.map((e) => {
    const inflow = counts[e.from];
    const throughput = counts[e.to];
    const waiting = Math.max(0, inflow - throughput);
    const rate = inflow > 0 ? throughput / inflow : 0;
    const expected = e.fallback;
    const ratio = expected > 0 ? rate / expected : 1;

    let severity: Bottleneck["severity"] = "healthy";
    if (inflow >= 5) {
      if (ratio < 0.45) severity = "critical";
      else if (ratio < 0.7) severity = "bottleneck";
      else if (ratio < 0.9) severity = "watch";
    }

    // how many bookings the stuck population is worth downstream
    let carry = waiting;
    let seen = false;
    for (const d of EDGES) {
      if (d.label === e.label) { seen = true; continue; }
      if (!seen) continue;
      carry *= rates[d.label] ?? d.fallback;
    }

    return {
      label: e.label,
      from: e.from,
      to: e.to,
      inflow,
      throughput,
      waiting,
      ratePct: Math.round(rate * 1000) / 10,
      expectedPct: Math.round(expected * 1000) / 10,
      severity,
      bookingsAtRisk: Math.round(carry * 10) / 10,
    };
  });
}

export function biggestBottleneck(list: Bottleneck[]): Bottleneck | null {
  const bad = list.filter((b) => b.severity === "critical" || b.severity === "bottleneck");
  if (!bad.length) return null;
  return bad.sort((a, b) => b.bookingsAtRisk - a.bookingsAtRisk)[0]!;
}

// ───────────────────────── root cause engine (§27, §46) ─────────────────────────

export type RootCause = "execution" | "upstream" | "conversion" | "dependency" | "sla" | "healthy";

export const ROOT_CAUSE_LABEL: Record<RootCause, string> = {
  execution: "Execution",
  upstream: "Upstream supply",
  conversion: "Conversion quality",
  dependency: "Dependency / blocked",
  sla: "SLA discipline",
  healthy: "Healthy",
};

export interface Diagnosis {
  cause: RootCause;
  line: string;
  recommendation: string;
}

export function diagnosePerson(p: PersonFlow, board: LeadMotion[]): Diagnosis {
  const mine = board.filter((m) => m.ownerId === p.userId);
  const blocked = mine.filter((m) => m.health === "blocked").length;
  const breaches = mine.filter((m) => m.violations.some((v) => v.severity === "P0")).length;
  const connectRate = p.completedActions > 0 ? p.connections / p.completedActions : 0;
  const tourRate = p.connections > 0 ? p.tours / p.connections : 0;
  const expectedTourRate = p.targetConnections > 0 ? p.targetTours / p.targetConnections : 0;

  if (p.queueGap > 0) {
    return {
      cause: "upstream",
      line: `Short ${p.queueGap} eligible actions — the queue cannot reach ${p.requiredActions}.`,
      recommendation: "Allocate unassigned zone leads or open the revival pool before judging output.",
    };
  }
  if (blocked >= 3) {
    return {
      cause: "dependency",
      line: `${blocked} customers blocked on supply or another role.`,
      recommendation: "Raise dependency tasks to PCM and re-queue on resolution.",
    };
  }
  if (breaches >= 3) {
    return {
      cause: "sla",
      line: `${breaches} owned leads are past their SLA.`,
      recommendation: "Clear the breach list first — those actions outrank fresh dials.",
    };
  }
  if (p.completedActions >= p.requiredActions * 0.7 && expectedTourRate > 0 && tourRate < expectedTourRate * 0.7) {
    return {
      cause: "conversion",
      line: `Volume is fine (${p.completedActions} actions, ${Math.round(connectRate * 100)}% connect) but connect → tour is weak.`,
      recommendation: "Switch the next actions to connected + feasible customers with no tour yet.",
    };
  }
  if (p.projectedEod < p.requiredActions * 0.9) {
    return {
      cause: "execution",
      line: `Pace ${p.pacePerHour}/hr projects ${p.projectedEod}/${p.requiredActions} by end of day.`,
      recommendation: "Run the serial queue in My Work — no manual lead picking.",
    };
  }
  return { cause: "healthy", line: "On pace with queue, conversion and SLA all healthy.", recommendation: "Keep the queue running." };
}

// ───────────────────────── cascade (§25) ─────────────────────────

export interface CascadeRow { label: string; value: number }

export function cascade(missingScheduledTours: number, rates: Rates): CascadeRow[] {
  const r = (l: string) => rates[l] ?? EDGES.find((e) => e.label === l)!.fallback;
  const done = missingScheduledTours * r("Scheduled → Completed");
  const opps = done * r("Tour → Closing opportunity");
  const bookings = opps * r("Opportunity → Booking");
  return [
    { label: "Scheduled tours missing", value: round1(missingScheduledTours) },
    { label: "Completed tours lost", value: round1(done) },
    { label: "Closing opportunities lost", value: round1(opps) },
    { label: "Bookings lost", value: round1(bookings) },
  ];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// ───────────────────────── tour risk engine (§18) ─────────────────────────

export interface TourRisk {
  motion: LeadMotion;
  score: number;
  signals: string[];
  suggestion: string;
  startsInMs: number;
}

export function tourRisks(board: LeadMotion[], now: number): TourRisk[] {
  const out: TourRisk[] = [];
  for (const m of board) {
    const stage = deriveStage(m.lead);
    if (stage !== "TOUR_SCHEDULED") continue;
    const when = m.lead.anchors?.tourDate ? +new Date(m.lead.anchors.tourDate) : null;
    if (when == null || !Number.isFinite(when)) continue;

    const startsInMs = when - now;
    const signals: string[] = [];
    let score = 0;

    if (!m.ownerId) { score += 30; signals.push("No TCM assigned"); }
    const lastContact = m.lead.lastContactAt ? +new Date(m.lead.lastContactAt) : null;
    const confirmed = lastContact != null && lastContact > now - 12 * HOUR;
    if (!confirmed) { score += 25; signals.push("Customer not confirmed in last 12h"); }
    if (startsInMs > 0 && startsInMs < HOUR) { score += 20; signals.push("Starts within the hour"); }
    else if (startsInMs > 0 && startsInMs < 4 * HOUR) { score += 10; signals.push("Starts within 4 hours"); }
    if (startsInMs < 0) { score += 25; signals.push("Slot passed with no outcome"); }
    if (m.health === "blocked") { score += 20; signals.push("Inventory blocked"); }
    if (m.lead.noShowFlag) { score += 15; signals.push("Previous no-show behaviour"); }
    if (!m.lead.replied) { score += 10; signals.push("Customer never replied"); }
    if (m.violations.some((v) => v.severity === "P0")) { score += 15; signals.push("Open P0 violation"); }

    score = Math.min(100, score);
    if (score < 25) continue;

    const suggestion = !m.ownerId
      ? "Assign a TCM now."
      : !confirmed
        ? "Call the customer to confirm attendance."
        : m.health === "blocked"
          ? "Revalidate the room with PCM or prepare an alternate property."
          : startsInMs < 0
            ? "Record the tour outcome — Closing is waiting."
            : "Confirm the property manager and keep the slot warm.";

    out.push({ motion: m, score, signals, suggestion, startsInMs });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ───────────────────────── person 360 (§44) ─────────────────────────

export interface Person360 {
  flow: PersonFlow;
  diagnosis: Diagnosis;
  owned: number;
  healthy: number;
  needsAction: number;
  blocked: number;
  breaches: number;
  noNextAction: number;
  idleOver48h: number;
  connectRatePct: number;
  gapCustomers: LeadMotion[];
}

export function person360(flow: PersonFlow, board: LeadMotion[]): Person360 {
  const mine = board.filter((m) => m.ownerId === flow.userId);
  const gapCustomers = mine
    .filter((m) => m.health === "action-required" || m.health === "blocked")
    .slice(0, 12);

  return {
    flow,
    diagnosis: diagnosePerson(flow, board),
    owned: mine.length,
    healthy: mine.filter((m) => m.health === "healthy").length,
    needsAction: mine.filter((m) => m.health === "action-required").length,
    blocked: mine.filter((m) => m.health === "blocked").length,
    breaches: mine.filter((m) => m.violations.some((v) => v.severity === "P0")).length,
    noNextAction: mine.filter((m) => !m.action).length,
    idleOver48h: mine.filter((m) => m.idleMs > 2 * DAY).length,
    connectRatePct: flow.completedActions > 0 ? Math.round((flow.connections / flow.completedActions) * 100) : 0,
    gapCustomers,
  };
}

// ───────────────────────── recovery proposals (§87) ─────────────────────────

export interface RecoveryProposal {
  title: string;
  detail: string;
  count: number;
  items: LeadMotion[];
}

export function recoveryProposals(board: LeadMotion[], now: number): RecoveryProposal[] {
  const stage = (m: LeadMotion) => deriveStage(m.lead);
  const proposals: Omit<RecoveryProposal, "count">[] = [
    {
      title: "Move high-intent connected customers into tour recovery",
      detail: "Connected, interested, still no tour scheduled.",
      items: board.filter((m) => (m.lead.replied || m.lead.interestLevel === "HOT") && ["CONTACTED", "NEW"].includes(stage(m))),
    },
    {
      title: "Assign an owner to unowned work",
      detail: "Nobody is accountable — these cannot move.",
      items: board.filter((m) => !m.ownerId),
    },
    {
      title: "Resolve supply-blocked customers",
      detail: "Demand exists, inventory does not. Needs PCM.",
      items: board.filter((m) => m.health === "blocked"),
    },
    {
      title: "Close post-tour outcomes and quotations",
      detail: "Tour happened, Closing never received the customer.",
      items: board.filter((m) => m.violations.some((v) => v.code === "TOUR_DONE_NO_QUOTE" || v.code === "TOUR_DONE_NO_OUTCOME")),
    },
    {
      title: "Revive customers idle over 5 days",
      detail: "Previously viable, now silent.",
      items: board.filter((m) => m.idleMs > 5 * DAY && m.health !== "blocked"),
    },
  ];
  return proposals
    .map((p) => ({ ...p, count: p.items.length, items: p.items.slice(0, 20) }))
    .filter((p) => p.count > 0);
}

export { DEFAULT_FLOORS };
