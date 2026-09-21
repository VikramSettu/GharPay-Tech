// 100x Analytics — the interconnection layer.
// Joins lead flow (leads/assignments/SLA) with quality (reviews/timeline)
// and the executive declarations (Flow Ops, PCM, Closing, Control Tower).
import type { Database } from "@/integrations/supabase/types";
import type { ReviewTeam } from "@/lib/tower/review-os";

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Timeline = Database["public"]["Tables"]["lead_timeline"]["Row"];
export type Breach = Database["public"]["Tables"]["sla_breaches"]["Row"];
export type Profile = {
  user_id: string;
  full_name: string | null;
  team: ReviewTeam | null;
  performer_category: Database["public"]["Enums"]["perf_category"];
};

/* ---------------- Declared daily targets (from the executive declarations) --------------- */

export type TeamTarget = {
  team: ReviewTeam;
  label: string;
  phase1: string;
  phase2: string;
  eod: string;
  finalResult: string;
  monthly: string;
};

export const TEAM_TARGETS: TeamTarget[] = [
  {
    team: "flow_ops",
    label: "Flow Ops — Lead Engine",
    phase1: "4 valid tours + 2 complete quotations",
    phase2: "8 valid tours + 5 complete quotations",
    eod: "10 valid tours + 6 complete quotations",
    finalResult: "10 valid tours and 6 complete quotations per day, inventory-backed",
    monthly: "260 valid tours + 156 quotations",
  },
  {
    team: "closing",
    label: "Closing — Revenue Closure",
    phase1: "1 verified paid booking",
    phase2: "3 verified paid bookings",
    eod: "4 verified paid bookings",
    finalResult: "4 verified paid bookings per day with payment evidence + owner ack",
    monthly: "104 verified paid bookings",
  },
  {
    team: "pcm",
    label: "PCM — Property & Conversion",
    phase1: "Exact bed + selling angle ready for every scheduled tour",
    phase2: "Every completed tour has a quotation and a bed hold with expiry",
    eod: "Zero tour without outcome, zero hold without expiry",
    finalResult: "Inventory truth: exact property, bed, price, facilities, angle",
    monthly: "Inventory focus published weekly and monthly",
  },
  {
    team: "control_tower",
    label: "Control Tower — Command",
    phase1: "1 PM first intervention: activity corrected during the day",
    phase2: "5 PM closing push list built",
    eod: "8 PM OPD truth: zone RAG, person outcome, root cause, owner, deadline",
    finalResult: "14 checkpoints green + top 15 BBD plan mapped person by person",
    monthly: "30 BBD mapped, never by hope",
  },
];

/* ---------------- Control Tower 14 checkpoints ---------------- */

export type CheckpointId =
  | "CP01" | "CP02" | "CP03" | "CP04" | "CP05" | "CP06" | "CP07"
  | "CP08" | "CP09" | "CP10" | "CP11" | "CP12" | "CP13" | "CP14";

export type Checkpoint = {
  id: CheckpointId;
  title: string;
  pass: string;
  redTrigger: string;
};

export const CHECKPOINTS: Checkpoint[] = [
  { id: "CP01", title: "Lead stock known", pass: "Fresh, 7-day and 30-day lead stock visible by zone.", redTrigger: "Lead count missing." },
  { id: "CP02", title: "Minimum work assigned", pass: "Every active person has enough assigned work.", redTrigger: "Active person under-assigned." },
  { id: "CP03", title: "Past leads worked", pass: "Old leads revived when fresh leads are low.", redTrigger: "Old leads untouched." },
  { id: "CP04", title: "Single lead owner", pass: "One lead, one accountable owner.", redTrigger: "Multiple or zero owners." },
  { id: "CP05", title: "4 feasibility gate", pass: "Location, budget, date and inventory pass before tour.", redTrigger: "Tour without gate pass." },
  { id: "CP06", title: "Inventory focus known", pass: "Today / next week / next month inventory known.", redTrigger: "Exact bed focus missing." },
  { id: "CP07", title: "Tour to quotation", pass: "Every completed tour creates a quotation.", redTrigger: "Tour done, no quotation." },
  { id: "CP08", title: "Bed lock discipline", pass: "Every hold has an exact bed and an expiry.", redTrigger: "Verbal or permanent hold." },
  { id: "CP09", title: "SLA respected", pass: "Accept and first action inside SLA.", redTrigger: "Any open SLA breach." },
  { id: "CP10", title: "Chat QA depth", pass: "Speed, acknowledgement, real problem, value, next step reviewed.", redTrigger: "Shallow or missing chat review." },
  { id: "CP11", title: "Call QA depth", pass: "Daily call reviews meet the per-person quota.", redTrigger: "Call quota missed." },
  { id: "CP12", title: "Feedback closed in 24h", pass: "Every review closed within 24 hours.", redTrigger: "Any review open past deadline." },
  { id: "CP13", title: "No verbal claims", pass: "Calls, chats, tours, quotations visible in CRM.", redTrigger: "Activity with no timeline entry." },
  { id: "CP14", title: "30 BBD mapped", pass: "Top performers mapped person by person.", redTrigger: "No named owner per target." },
];

export type CheckpointState = Checkpoint & {
  status: "green" | "amber" | "red";
  actual: string;
  detail: string;
};

/* ---------------- Helpers ---------------- */

export const DAY = 86400000;

export function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

export function statusFor(value: number, target: number): "green" | "amber" | "red" {
  if (target <= 0) return value > 0 ? "red" : "green";
  const p = value / target;
  if (p >= 1) return "green";
  if (p >= 0.6) return "amber";
  return "red";
}

/** Inverse: fewer is better (breaches, open loops). */
export function inverseStatus(value: number, amberAt = 1, redAt = 3): "green" | "amber" | "red" {
  if (value >= redAt) return "red";
  if (value >= amberAt) return "amber";
  return "green";
}

export const STATUS_DOT: Record<"green" | "amber" | "red", string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export const STATUS_TEXT: Record<"green" | "amber" | "red", string> = {
  green: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-500",
};

/* ---------------- The interconnected snapshot ---------------- */

export type Inputs = {
  leads: Lead[];
  assignments: Assignment[];
  reviews: Review[];
  timeline: Timeline[];
  breaches: Breach[];
  profiles: Profile[];
  now: number;
};

export type PersonRow = {
  profile: Profile;
  team: ReviewTeam | null;
  /* ops */
  assigned24: number;
  accepted24: number;
  firstAction24: number;
  openLeads: number;
  breaches: number;
  acceptRate: number;
  actionRate: number;
  /* quality */
  reviewsToday: number;
  chatsToday: number;
  callsToday: number;
  avgScore: number;
  critical: number;
  openLoops: number;
  overdueLoops: number;
  closedIn24: number;
  /* joined */
  coverage: number;      // % of their 24h leads that carry a review
  healthScore: number;   // 0-100 interconnected score
  status: "green" | "amber" | "red";
};

export type Snapshot = {
  leads24: Lead[];
  assigned24: Assignment[];
  reviews24: Review[];
  reviewedLeadIds: Set<string>;
  coverage: number;
  people: PersonRow[];
  teams: {
    team: ReviewTeam;
    label: string;
    people: number;
    assigned24: number;
    reviews24: number;
    coverage: number;
    avgScore: number;
    openLoops: number;
    breaches: number;
    status: "green" | "amber" | "red";
  }[];
  checkpoints: CheckpointState[];
  funnel: { label: string; value: number; of: number }[];
  loopHealth: { closed: number; open: number; overdue: number; medianHours: number };
};

const TEAM_LABEL_LOCAL: Record<ReviewTeam, string> = {
  control_tower: "Control Tower",
  flow_ops: "Flow Ops",
  pcm: "PCM",
  closing: "Closing",
  cross_functional: "Cross-functional",
};

export function buildSnapshot(i: Inputs): Snapshot {
  const { leads, assignments, reviews, timeline, breaches, profiles, now } = i;
  const cut = now - DAY;
  const within = (iso?: string | null) => !!iso && Date.parse(iso) >= cut;

  const assigned24 = assignments.filter((a) => within(a.assigned_at));
  const leadIds24 = new Set(assigned24.map((a) => a.lead_id));
  const leads24 = leads.filter((l) => leadIds24.has(l.id) || within(l.created_at));
  const reviews24 = reviews.filter((r) => within(r.created_at));
  const reviewedLeadIds = new Set(reviews.filter((r) => r.lead_id && within(r.created_at)).map((r) => r.lead_id!));

  const coverage = pct([...leadIds24].filter((id) => reviewedLeadIds.has(id)).length, leadIds24.size);

  const openBreaches = breaches.filter((b) => !b.resolved_at);

  const people: PersonRow[] = profiles.map((p) => {
    const mineAssign = assigned24.filter((a) => a.owner_id === p.user_id);
    const myLeadIds = new Set(mineAssign.map((a) => a.lead_id));
    const myBreachIds = new Set(
      assignments.filter((a) => a.owner_id === p.user_id).map((a) => a.id),
    );
    const mineReviews = reviews.filter((r) => r.reviewee_id === p.user_id);
    const today = mineReviews.filter((r) => within(r.created_at));
    const scored = mineReviews.filter((r) => r.total_score > 0);
    const open = mineReviews.filter((r) => r.status !== "closed");
    const overdue = open.filter((r) => r.deadline && Date.parse(r.deadline) < now);

    const accepted = mineAssign.filter((a) => a.accepted_at).length;
    const acted = mineAssign.filter((a) => a.first_action_at).length;
    const cov = pct([...myLeadIds].filter((id) => reviewedLeadIds.has(id)).length, myLeadIds.size);
    const avgScore = scored.length
      ? Math.round(scored.reduce((s, r) => s + r.total_score, 0) / scored.length)
      : 0;
    const brs = openBreaches.filter((b) => myBreachIds.has(b.assignment_id)).length;

    // Interconnected health: ops execution + quality score + loop closure.
    const opsPart = mineAssign.length ? (accepted / mineAssign.length) * 20 + (acted / mineAssign.length) * 20 : 30;
    const qualityPart = (avgScore / 100) * 35;
    const loopPart = Math.max(0, 25 - overdue.length * 8 - brs * 5);
    const healthScore = Math.max(0, Math.min(100, Math.round(opsPart + qualityPart + loopPart)));

    return {
      profile: p,
      team: p.team,
      assigned24: mineAssign.length,
      accepted24: accepted,
      firstAction24: acted,
      openLeads: leads.filter((l) => l.current_owner === p.user_id && l.status === "open").length,
      breaches: brs,
      acceptRate: pct(accepted, mineAssign.length),
      actionRate: pct(acted, mineAssign.length),
      reviewsToday: today.length,
      chatsToday: today.filter((r) => r.kind === "chat").length,
      callsToday: today.filter((r) => r.kind === "call").length,
      avgScore,
      critical: mineReviews.filter((r) => r.critical_error).length,
      openLoops: open.length,
      overdueLoops: overdue.length,
      closedIn24: mineReviews.filter((r) => r.status === "closed" && within(r.closed_at)).length,
      coverage: cov,
      healthScore,
      status: healthScore >= 75 ? "green" : healthScore >= 50 ? "amber" : "red",
    };
  });

  const teamIds: ReviewTeam[] = ["control_tower", "flow_ops", "pcm", "closing", "cross_functional"];
  const teams = teamIds.map((t) => {
    const mem = people.filter((p) => p.team === t);
    const memIds = new Set(mem.map((m) => m.profile.user_id));
    const a24 = assigned24.filter((a) => memIds.has(a.owner_id)).length;
    const r24 = reviews24.filter((r) => r.team === t || memIds.has(r.reviewee_id)).length;
    const scored = reviews.filter((r) => memIds.has(r.reviewee_id) && r.total_score > 0);
    const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.total_score, 0) / scored.length) : 0;
    const cov = mem.length ? Math.round(mem.reduce((s, m) => s + m.coverage, 0) / mem.length) : 0;
    const openLoops = mem.reduce((s, m) => s + m.openLoops, 0);
    const brs = mem.reduce((s, m) => s + m.breaches, 0);
    return {
      team: t,
      label: TEAM_LABEL_LOCAL[t],
      people: mem.length,
      assigned24: a24,
      reviews24: r24,
      coverage: cov,
      avgScore,
      openLoops,
      breaches: brs,
      status: (cov >= 80 && avgScore >= 70 && brs === 0 ? "green" : cov >= 50 || avgScore >= 60 ? "amber" : "red") as "green" | "amber" | "red",
    };
  });

  /* Loop health: created → closed */
  const closedReviews = reviews.filter((r) => r.status === "closed" && r.closed_at);
  const hours = closedReviews
    .map((r) => (Date.parse(r.closed_at!) - Date.parse(r.created_at)) / 3600000)
    .sort((a, b) => a - b);
  const medianHours = hours.length ? Math.round(hours[Math.floor(hours.length / 2)]!) : 0;
  const openReviews = reviews.filter((r) => r.status !== "closed");
  const loopHealth = {
    closed: closedReviews.length,
    open: openReviews.length,
    overdue: openReviews.filter((r) => r.deadline && Date.parse(r.deadline) < now).length,
    medianHours,
  };

  /* Funnel — lead → owned → accepted → actioned → reviewed → closed loop */
  const totalLeads = leads.length;
  const owned = leads.filter((l) => l.current_owner).length;
  const acceptedAll = assignments.filter((a) => a.accepted_at).length;
  const actionedAll = assignments.filter((a) => a.first_action_at).length;
  const reviewedLeads = new Set(reviews.filter((r) => r.lead_id).map((r) => r.lead_id!)).size;
  const closedLoopLeads = new Set(
    reviews.filter((r) => r.lead_id && r.status === "closed").map((r) => r.lead_id!),
  ).size;
  const funnel = [
    { label: "Leads in system", value: totalLeads, of: totalLeads },
    { label: "Single owner locked", value: owned, of: totalLeads },
    { label: "Assignment accepted", value: acceptedAll, of: assignments.length || totalLeads },
    { label: "First action done", value: actionedAll, of: assignments.length || totalLeads },
    { label: "Quality reviewed", value: reviewedLeads, of: totalLeads },
    { label: "Feedback loop closed", value: closedLoopLeads, of: totalLeads },
  ];

  /* Checkpoints computed from live data */
  const activePeople = people.filter((p) => p.profile.team);
  const underAssigned = activePeople.filter((p) => p.assigned24 === 0).length;
  const unowned = leads.filter((l) => !l.current_owner && l.status === "open").length;
  const staleLeads = leads.filter(
    (l) => l.status === "open" && Date.parse(l.updated_at) < now - 7 * DAY,
  ).length;
  const noTimeline = leads.filter((l) => !timeline.some((t) => t.lead_id === l.id)).length;
  const chatShort = people.filter((p) => p.profile.team && p.chatsToday < 3).length;
  const callShort = people.filter((p) => p.profile.team && p.callsToday < 2).length;
  const holdsNoExpiry = assignments.filter((a) => a.state === "pending_accept" && Date.parse(a.sla_deadline_accept) < now).length;

  const cp = (id: CheckpointId, status: CheckpointState["status"], actual: string, detail: string): CheckpointState => {
    const base = CHECKPOINTS.find((c) => c.id === id)!;
    return { ...base, status, actual, detail };
  };

  const checkpoints: CheckpointState[] = [
    cp("CP01", totalLeads > 0 ? "green" : "red", `${totalLeads} leads`, `${leads24.length} in last 24h`),
    cp("CP02", inverseStatus(underAssigned), `${underAssigned} idle`, `${activePeople.length} people on the floor`),
    cp("CP03", inverseStatus(staleLeads, 1, 5), `${staleLeads} stale >7d`, "Revive when fresh leads are low"),
    cp("CP04", inverseStatus(unowned), `${unowned} unowned`, "One lead, one owner"),
    cp("CP05", inverseStatus(leads.filter((l) => !l.zone_id && l.status === "open").length, 1, 4), `${leads.filter((l) => !l.zone_id && l.status === "open").length} no zone`, "Location gate incomplete"),
    cp("CP06", inverseStatus(leads.filter((l) => l.status === "open" && !l.movein_bucket).length, 1, 4), `${leads.filter((l) => l.status === "open" && !l.movein_bucket).length} no move-in`, "Inventory focus needs the date gate"),
    cp("CP07", statusFor(actionedAll, Math.max(1, acceptedAll)), `${actionedAll}/${acceptedAll || 0}`, "Accepted leads that got a first action"),
    cp("CP08", inverseStatus(holdsNoExpiry), `${holdsNoExpiry} expired holds`, "Every hold needs an exact bed and expiry"),
    cp("CP09", inverseStatus(openBreaches.length), `${openBreaches.length} open`, "Accept + first-action SLA"),
    cp("CP10", inverseStatus(chatShort, 1, 3), `${chatShort} below 3 chats`, "Daily chat QA quota"),
    cp("CP11", inverseStatus(callShort, 1, 3), `${callShort} below 2 calls`, "Daily call QA quota"),
    cp("CP12", inverseStatus(loopHealth.overdue), `${loopHealth.overdue} overdue`, `Median closure ${medianHours}h`),
    cp("CP13", inverseStatus(noTimeline, 1, 4), `${noTimeline} silent leads`, "No timeline entry = no proof"),
    cp("CP14", statusFor(people.filter((p) => p.healthScore >= 75).length, Math.max(1, Math.ceil(activePeople.length * 0.5))), `${people.filter((p) => p.healthScore >= 75).length} green performers`, "BBD mapped person by person"),
  ];

  return { leads24, assigned24, reviews24, reviewedLeadIds, coverage, people, teams, checkpoints, funnel, loopHealth };
}
