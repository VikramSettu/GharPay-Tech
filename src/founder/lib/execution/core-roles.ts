// 100X Operating System — the playbook consolidated into FOUR core roles.
// Every similar role from the earlier operating document now maps into one of
// these four. Targets are locked (P1 1PM / P2 5PM / EOD / weekly / monthly),
// each role carries five weighted KRAs, checkpoints, non-negotiables,
// escalations, recovery questions and three incentive models.

export type CoreRoleId = "control_tower" | "flow_ops" | "tcm" | "closing";

export interface TargetLine {
  id: string;          // metric key
  label: string;       // "BBD"
  p1: number;          // by 1:15 PM
  p2: number;          // by 5:00 PM
  eod: number;
  weekly: number;      // 6 working days
  monthly: number;     // 26 working days
  gate?: boolean;      // failing this metric fails the EOD gate
}

export interface Kra {
  name: string;
  weight: number;      // %
  measure: string;
}

export interface IncentiveModel {
  id: "slab" | "points" | "hybrid";
  name: string;
  summary: string;
  rows: Array<{ band: string; payout: string }>;
}

export interface CoreRole {
  id: CoreRoleId;
  name: string;
  department: string;
  purpose: string;
  finalResult: string;
  startsWhen: string;
  endsWhen: string;
  handoverTo: string;
  absorbs: string[];           // legacy roles merged into this one
  match: string[];             // lowercase keywords to resolve a free-text role
  targets: TargetLine[];
  kras: Kra[];
  p1Work: string[];
  p2Work: string[];
  p3Work: string[];
  eodReport: string[];
  checkpoints: string[];
  nonNegotiables: string[];
  escalations: string[];
  reviewQuestions: string[];
  incentives: IncentiveModel[];
}

export const WORKING_DAYS_WEEK = 6;
export const WORKING_DAYS_MONTH = 26;

const RECOVERY_QUESTIONS = [
  "What exactly is the gap in numbers right now?",
  "What is the single reason it happened?",
  "How will you fix it in the next 60 minutes — with a number?",
  "Who do you need, and by when?",
];

const slab = (rows: Array<{ band: string; payout: string }>): IncentiveModel => ({
  id: "slab", name: "Outcome slab", summary: "Paid on delivered results only. No result, no payout.", rows,
});
const points = (rows: Array<{ band: string; payout: string }>): IncentiveModel => ({
  id: "points", name: "Points model", summary: "Every verified unit earns points; points convert monthly.", rows,
});
const hybrid = (rows: Array<{ band: string; payout: string }>): IncentiveModel => ({
  id: "hybrid", name: "Hybrid result model", summary: "Base slab on the primary result + points on supporting quality.", rows,
});

export const CORE_ROLES: CoreRole[] = [
  {
    id: "control_tower",
    name: "Control Tower",
    department: "Demand Operations",
    purpose: "Own every lead from the moment it enters the system until it is in the hands of a capable owner and moving.",
    finalResult: "30 BBD (business-building conversations that produce a committed next step) delivered every day with zero unassigned active leads.",
    startsWhen: "Shift start — the intake and unassigned queues are counted.",
    endsWhen: "EOD — every active lead has an owner, an outcome and a next action.",
    handoverTo: "Flow Ops",
    absorbs: ["Lead Intake & CRM Executive", "Lead Control Tower Executive", "Lead Revival & Stuck Queue Specialist", "HRMS & Workforce Control Executive"],
    match: ["control tower", "lead control", "intake", "crm executive", "revival", "stuck queue", "hrms", "workforce", "admin"],
    targets: [
      { id: "bbd", label: "BBD", p1: 9, p2: 21, eod: 30, weekly: 180, monthly: 780, gate: true },
    ],
    kras: [
      { name: "BBD volume delivered", weight: 35, measure: "Verified BBD count vs 30/day" },
      { name: "Lead assignment SLA", weight: 20, measure: "Zero active leads unassigned beyond 30 minutes" },
      { name: "Data truth & dedupe", weight: 15, measure: "Source vs CRM variance = 0, duplicates merged same day" },
      { name: "Revival of stuck queue", weight: 15, measure: "Aged leads re-activated with a valid next action" },
      { name: "Evidence & update discipline", weight: 15, measure: "1:15 PM / 5 PM / EOD submitted on time with proof" },
    ],
    p1Work: [
      "Reconcile every active source and turn enquiries into clean, deduplicated, correctly zoned leads.",
      "Allocate work by intent, capability and current load — nothing sits unowned.",
      "Run the first BBD block and reach 9 BBD by 1:15 PM.",
    ],
    p2Work: [
      "Monitor first action, connects, tours and stuck queues; rebalance before capacity is wasted.",
      "Work the revival pool with personalised call + WhatsApp sequences.",
      "Reach 21 BBD by 5:00 PM.",
    ],
    p3Work: [
      "Clear every unassigned or overdue exception.",
      "Close the last 9 BBD and lock carry-forward for tomorrow.",
    ],
    eodReport: [
      "BBD delivered vs 30 with evidence",
      "Unassigned active leads at close (must be zero)",
      "Revival attempts, connects and reactivations",
      "Named blockers, owner and tomorrow's first priority",
    ],
    checkpoints: ["10:35 goal locked", "1:15 PM — 9 BBD", "5:00 PM — 21 BBD", "8:00 PM — 30 BBD + EOD evidence"],
    nonNegotiables: [
      "No active lead ends the day without an owner.",
      "BBD is only counted with a logged conversation and a committed next step.",
      "No EOD close without evidence or an approved recovery plan.",
    ],
    escalations: [
      "Below 90% of checkpoint pace → At Risk alert to Team Lead.",
      "Below 75% → Missed alert + 15-minute recovery plan.",
      "Unassigned lead older than 2 hours → Zone Lead.",
    ],
    reviewQuestions: RECOVERY_QUESTIONS,
    incentives: [
      slab([
        { band: "24–29 BBD/day avg", payout: "₹40 per BBD" },
        { band: "30–35 BBD/day avg", payout: "₹60 per BBD" },
        { band: "36+ BBD/day avg (stretch)", payout: "₹85 per BBD" },
      ]),
      points([
        { band: "1 verified BBD", payout: "10 pts" },
        { band: "Reactivated aged lead", payout: "25 pts" },
        { band: "Zero unassigned at EOD", payout: "50 pts/day" },
      ]),
      hybrid([
        { band: "Slab on BBD", payout: "70% of payout" },
        { band: "Points on data truth + revival", payout: "30% of payout" },
        { band: "Gate", payout: "Any evidence failure holds the month's incentive" },
      ]),
    ],
  },
  {
    id: "flow_ops",
    name: "Flow Ops",
    department: "Demand Operations",
    purpose: "Convert assigned demand into qualified, committed, exact-property tours and priced quotations.",
    finalResult: "10 committed tours and 6 quotations every day.",
    startsWhen: "Shift start — priority leads are ranked.",
    endsWhen: "EOD — every assigned lead has an outcome; tours are confirmed for tomorrow.",
    handoverTo: "Tour Conversion Manager",
    absorbs: ["Flow Ops Executive", "Supply Coordinator & Owner Success", "Inventory Controller", "Supply Acquisition Executive"],
    match: ["flow ops", "flowops", "supply coordinator", "owner success", "inventory", "acquisition", "operator"],
    targets: [
      { id: "tours", label: "Tours", p1: 4, p2: 8, eod: 10, weekly: 60, monthly: 260, gate: true },
      { id: "quotations", label: "Quotations", p1: 2, p2: 5, eod: 6, weekly: 36, monthly: 156 },
    ],
    p1Work: [
      "Work priority leads first: qualify location, budget, date and inventory.",
      "Validate exact sellable beds before promising anything.",
      "Lock 4 tours and 2 quotations by 1:15 PM.",
    ],
    p2Work: [
      "Recommend the best two options, build the dossier and secure a committed tour time.",
      "Issue priced quotations with exact bed IDs and approved commercials.",
      "Reach 8 tours and 5 quotations by 5:00 PM.",
    ],
    p3Work: [
      "Recover pending conversations, complete handovers, leave no lead without an outcome.",
      "Close at 10 tours and 6 quotations, confirm tomorrow's slate.",
    ],
    eodReport: [
      "Tours committed vs 10 and quotations vs 6, with lead IDs",
      "Exact-bed validation completed for each tour",
      "Handovers made to Tour Conversion Manager",
      "Pending cases with named next owner",
    ],
    kras: [
      { name: "Committed tours delivered", weight: 35, measure: "Tours confirmed vs 10/day" },
      { name: "Quotations issued", weight: 25, measure: "Priced, exact-bed quotations vs 6/day" },
      { name: "Qualification quality", weight: 15, measure: "Location, budget, date, inventory captured on every lead" },
      { name: "Inventory truth", weight: 15, measure: "Zero tours booked on unavailable beds" },
      { name: "Handover discipline", weight: 10, measure: "Every tour handed over with a complete dossier" },
    ],
    checkpoints: ["10:35 goal locked", "1:15 PM — 4 tours + 2 quotations", "5:00 PM — 8 tours + 5 quotations", "8:00 PM — 10 tours + 6 quotations"],
    nonNegotiables: [
      "No tour scheduled without a verified, available exact bed.",
      "No quotation without approved commercials.",
      "No lead left without an outcome at EOD.",
    ],
    escalations: [
      "Below 90% of checkpoint pace → At Risk alert.",
      "Below 75% → Missed alert + 15-minute recovery plan.",
      "Inventory mismatch → Control Tower + Zone Lead immediately.",
    ],
    reviewQuestions: RECOVERY_QUESTIONS,
    incentives: [
      slab([
        { band: "8–9 tours/day avg", payout: "₹120 per tour" },
        { band: "10–11 tours/day avg", payout: "₹180 per tour" },
        { band: "12+ tours/day avg (stretch)", payout: "₹250 per tour" },
      ]),
      points([
        { band: "Committed tour", payout: "20 pts" },
        { band: "Quotation issued", payout: "15 pts" },
        { band: "Tour that converts to booking", payout: "60 pts" },
      ]),
      hybrid([
        { band: "Slab on tours", payout: "60% of payout" },
        { band: "Points on quotations + conversion", payout: "40% of payout" },
        { band: "Gate", payout: "Any false tour evidence holds incentive" },
      ]),
    ],
  },
  {
    id: "tcm",
    name: "Tour Conversion Manager",
    department: "Visit & Conversion",
    purpose: "Control every scheduled tour end to end so each visit is real, on time, and enters a buying path.",
    finalResult: "15 tours controlled, 10 completed and 5 bookings every day.",
    startsWhen: "Shift start — today's tour calendar is audited.",
    endsWhen: "EOD — every tour has a true final status and a buying path or a recovery.",
    handoverTo: "Closing Specialist",
    absorbs: ["Tour Conversion Manager", "Visit War Room Controller", "Field Visit Executive", "Property Manager", "Property Verification & Readiness"],
    match: ["tour conversion", "tcm", "war room", "warroom", "field visit", "property manager", "readiness", "verification"],
    targets: [
      { id: "tours_controlled", label: "Tours controlled", p1: 15, p2: 15, eod: 15, weekly: 90, monthly: 390, gate: true },
      { id: "tours_done", label: "Tours done", p1: 3, p2: 8, eod: 10, weekly: 60, monthly: 260, gate: true },
      { id: "bookings", label: "Bookings", p1: 1, p2: 3, eod: 5, weekly: 30, monthly: 130 },
    ],
    p1Work: [
      "Confirm all 15 tours: exact inventory, property access, travel plan, backup property.",
      "Run live control on movement — en route, arrival, completion.",
      "By 1:15 PM: 15 controlled, 3 done, 1 booking.",
    ],
    p2Work: [
      "Solve delays before the experience breaks; make sure each visit sees the approved purchasable option.",
      "Capture feedback and issue the buying path immediately after each tour.",
      "By 5:00 PM: 15 controlled, 8 done, 3 bookings.",
    ],
    p3Work: [
      "Recover no-shows into a re-scheduled slot the same evening.",
      "Close at 10 tours done and 5 bookings; hand hot cases to Closing.",
    ],
    eodReport: [
      "Tours controlled / done / no-show with reasons",
      "Bookings delivered vs 5",
      "Post-tour report filed for every completed tour",
      "Recovery slots booked for every no-show",
    ],
    kras: [
      { name: "Bookings from tours", weight: 30, measure: "Bookings vs 5/day" },
      { name: "Tours completed", weight: 25, measure: "Completed vs 10/day" },
      { name: "Tour control coverage", weight: 20, measure: "All 15 tours with a true live status" },
      { name: "Post-tour buying path", weight: 15, measure: "Report + next step within 30 minutes of each tour" },
      { name: "No-show recovery", weight: 10, measure: "Every no-show rescheduled or closed with reason" },
    ],
    checkpoints: ["10:35 goal locked", "1:15 PM — 15 / 3 / 1", "5:00 PM — 15 / 8 / 3", "8:00 PM — 15 / 10 / 5"],
    nonNegotiables: [
      "No tour marked done without evidence.",
      "No customer shown a bed that is not actually sellable.",
      "Post-tour outcome recorded within 30 minutes.",
    ],
    escalations: [
      "Tour unconfirmed 2 hours before slot → Flow Ops + Zone Lead.",
      "Below 90% checkpoint pace → At Risk alert. Below 75% → Missed + recovery plan.",
      "Property access failure → Zone Lead immediately.",
    ],
    reviewQuestions: RECOVERY_QUESTIONS,
    incentives: [
      slab([
        { band: "3–4 bookings/day avg", payout: "₹700 per booking" },
        { band: "5–6 bookings/day avg", payout: "₹1,000 per booking" },
        { band: "7+ bookings/day avg (stretch)", payout: "₹1,400 per booking" },
      ]),
      points([
        { band: "Tour completed", payout: "25 pts" },
        { band: "Booking", payout: "120 pts" },
        { band: "No-show recovered same day", payout: "40 pts" },
      ]),
      hybrid([
        { band: "Slab on bookings", payout: "65% of payout" },
        { band: "Points on completion + recovery", payout: "35% of payout" },
        { band: "Gate", payout: "Tours-done gate must clear to unlock the slab" },
      ]),
    ],
  },
  {
    id: "closing",
    name: "Closing Specialist",
    department: "Booking & Customer Experience",
    purpose: "Turn high-intent, tour-done customers into paid, exact-bed, owner-honoured bookings.",
    finalResult: "4 paid bookings every day.",
    startsWhen: "Shift start — hot and decision-due customers are ranked.",
    endsWhen: "EOD — money verified, beds locked, check-ins handed over.",
    handoverTo: "Check-in & Customer Experience",
    absorbs: ["Closure & Negotiation Specialist", "Booking & Payment Controller", "Check-in & Customer Delight", "Tenant Guild / After-Sales", "Quality Auditor", "Performance Enforcer"],
    match: ["closure", "negotiation", "closer", "closing", "booking & payment", "payment controller", "check-in", "checkin", "customer delight", "tenant guild", "after sales", "quality", "auditor", "enforcer"],
    targets: [
      { id: "paid_bookings", label: "Paid bookings", p1: 1, p2: 3, eod: 4, weekly: 24, monthly: 104, gate: true },
    ],
    p1Work: [
      "Rank hot, tour-done, ready-to-pay and decision-due customers; identify the single true objection each.",
      "Secure approved terms and place exact-bed holds.",
      "1 paid booking by 1:15 PM.",
    ],
    p2Work: [
      "Present one final offer per case and collect payment.",
      "Verify money, exact Bed ID, commercials and owner acknowledgement.",
      "3 paid bookings by 5:00 PM.",
    ],
    p3Work: [
      "Recover pending decisions, release expired holds, close the fourth booking.",
      "Hand over paid bookings with a complete pack for check-in.",
    ],
    eodReport: [
      "Paid bookings vs 4 with receipt and Bed ID",
      "Holds placed, honoured and released",
      "Open objections with named recovery plan",
      "Handover pack completeness",
    ],
    kras: [
      { name: "Paid bookings", weight: 40, measure: "Verified paid bookings vs 4/day" },
      { name: "Payment & evidence integrity", weight: 20, measure: "Money, receipt, Bed ID and owner ack on every booking" },
      { name: "Objection resolution", weight: 15, measure: "Single true objection identified and resolved per case" },
      { name: "Hold hygiene", weight: 15, measure: "No expired or duplicate holds at EOD" },
      { name: "Handover to check-in", weight: 10, measure: "Complete pack transferred same day" },
    ],
    checkpoints: ["10:35 goal locked", "1:15 PM — 1 booking", "5:00 PM — 3 bookings", "8:00 PM — 4 paid bookings"],
    nonNegotiables: [
      "A booking counts only when money is verified against an exact Bed ID.",
      "No double allocation, ever.",
      "False evidence puts incentive on hold immediately.",
    ],
    escalations: [
      "Zero bookings by 1:15 PM → Team Lead intervention.",
      "Below 75% pace → Missed alert + 15-minute recovery plan.",
      "Owner refuses an honoured hold → Zone Lead immediately.",
    ],
    reviewQuestions: RECOVERY_QUESTIONS,
    incentives: [
      slab([
        { band: "2–3 bookings/day avg", payout: "₹900 per booking" },
        { band: "4–5 bookings/day avg", payout: "₹1,300 per booking" },
        { band: "6+ bookings/day avg (stretch)", payout: "₹1,800 per booking" },
      ]),
      points([
        { band: "Paid booking", payout: "150 pts" },
        { band: "Clean evidence pack", payout: "30 pts" },
        { band: "Same-day objection resolved", payout: "40 pts" },
      ]),
      hybrid([
        { band: "Slab on paid bookings", payout: "75% of payout" },
        { band: "Points on evidence + hygiene", payout: "25% of payout" },
        { band: "Gate", payout: "Any false evidence = incentive hold" },
      ]),
    ],
  },
];

export function coreRole(id: string): CoreRole | undefined {
  return CORE_ROLES.find((r) => r.id === id);
}

export function coreRoleForName(role: string): CoreRole {
  const r = (role || "").toLowerCase();
  return CORE_ROLES.find((c) => c.match.some((k) => r.includes(k))) || CORE_ROLES[0];
}

// ---- achievement enforcement ----
export type Band = "gate_failed" | "missed" | "at_risk" | "on_track" | "achieved" | "stretch";

export const BAND_META: Record<Band, { label: string; tone: string }> = {
  gate_failed: { label: "Gate failed", tone: "bg-destructive/15 text-destructive border-destructive/40" },
  missed:      { label: "Missed",      tone: "bg-destructive/15 text-destructive border-destructive/40" },
  at_risk:     { label: "At Risk",     tone: "bg-warning/15 text-warning border-warning/40" },
  on_track:    { label: "On Track",    tone: "bg-primary/15 text-primary border-primary/40" },
  achieved:    { label: "Achieved",    tone: "bg-success/15 text-success border-success/40" },
  stretch:     { label: "Stretch",     tone: "bg-success/25 text-success border-success/60" },
};

export function bandFor(pct: number, dayClosed = false, gateFail = false): Band {
  if (gateFail) return "gate_failed";
  if (pct >= 120) return "stretch";
  if (pct >= 100) return "achieved";
  if (pct >= 90) return "on_track";
  if (pct >= 75) return "at_risk";
  return dayClosed ? "missed" : "missed";
}

/** Which checkpoint applies right now: p1 before 1 PM, p2 before 5 PM, else eod. */
export function currentCheckpoint(d = new Date()): "p1" | "p2" | "eod" {
  const mins = d.getHours() * 60 + d.getMinutes();
  if (mins < 13 * 60) return "p1";
  if (mins < 17 * 60) return "p2";
  return "eod";
}

export const CHECKPOINT_LABEL: Record<"p1" | "p2" | "eod", string> = {
  p1: "Phase 1 · by 1:15 PM",
  p2: "Phase 2 · by 5:00 PM",
  eod: "EOD · by 8:00 PM",
};

export function targetAt(t: TargetLine, cp: "p1" | "p2" | "eod") {
  return cp === "p1" ? t.p1 : cp === "p2" ? t.p2 : t.eod;
}
