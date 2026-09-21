import type { Database } from "@/integrations/supabase/types";

export type ReviewKind = Database["public"]["Enums"]["review_kind"];
export type ReviewTeam = Database["public"]["Enums"]["review_team"];
export type ReviewBand = Database["public"]["Enums"]["review_band"];
export type FeedbackStatus = Database["public"]["Enums"]["feedback_status"];
export type AckChoice = Database["public"]["Enums"]["ack_choice"];
export type VerificationResult = Database["public"]["Enums"]["verification_result"];

export type Criterion = { id: string; label: string; max: number; checks: string[] };

/* ---------------- Teams ---------------- */

export const TEAMS: { id: ReviewTeam; label: string; owns: string[] }[] = [
  {
    id: "control_tower",
    label: "Control Tower",
    owns: ["Lead creation & editing", "Assignment", "Ownership validation", "Data completeness", "Priority", "SLA tracking", "Reassignment", "Review queue monitoring"],
  },
  {
    id: "flow_ops",
    label: "Flow Ops",
    owns: ["First contact", "Initial WhatsApp response", "Qualification", "Calling", "Dossier completion", "Property matching", "Tour scheduling", "Follow-up till tour confirmed"],
  },
  {
    id: "pcm",
    label: "PCM / Tour Conversion",
    owns: ["Pre-tour confirmation", "Tour coordination", "Arrival tracking", "Property readiness", "On-ground experience", "Post-tour feedback", "Alternative movement", "Quotation initiation"],
  },
  {
    id: "closing",
    label: "Closing Specialist",
    owns: ["Quotation", "Objection handling", "Negotiation", "Urgency", "Payment follow-up", "Pre-booking", "Booking confirmation", "Lost-lead recovery"],
  },
  {
    id: "cross_functional",
    label: "Cross-Functional Quality",
    owns: ["Full customer journey", "Broken handovers", "Conflicting information", "Delays between teams", "Lost despite all tasks done"],
  },
];

export const TEAM_LABEL: Record<ReviewTeam, string> = TEAMS.reduce(
  (acc, t) => ({ ...acc, [t.id]: t.label }),
  {} as Record<ReviewTeam, string>,
);

/* ---------------- Scorecards ---------------- */

export const CHAT_CRITERIA: Criterion[] = [
  { id: "speed", label: "A. Response Speed", max: 10, checks: ["First response within SLA", "Follow-up sent on time", "No unnecessary gaps in an active conversation"] },
  { id: "context", label: "B. Acknowledgement & Context", max: 10, checks: ["Customer message acknowledged", "Response matched the actual question", "No unrelated template sent"] },
  { id: "discovery", label: "C. Requirement Discovery", max: 15, checks: ["Location", "Move-in date", "Budget", "Room type", "Gender", "Office/college", "Duration of stay", "Food preference (if relevant)", "Tour or pre-booking intent"] },
  { id: "relevance", label: "D. Relevance & Problem Solving", max: 15, checks: ["Suggestions matched requirement", "Solved instead of rejecting", "Alternatives offered when exact option unavailable"] },
  { id: "value", label: "E. Value Communication", max: 10, checks: ["Gharpayy value explained", "Benefits tied to customer priorities", "Not price-only"] },
  { id: "accuracy", label: "F. Information Accuracy", max: 10, checks: ["Correct property", "Correct price range", "Correct room type", "Correct availability", "Correct deposit & terms", "No false commitment"] },
  { id: "nextstep", label: "G. Next-Step Control", max: 15, checks: ["Every message moved the customer forward", "Clear question or action given", "Tour / call / quotation / pre-booking / follow-up proposed"] },
  { id: "followup", label: "H. Follow-Up & Ownership", max: 10, checks: ["Follow-up date & time recorded", "Conversation not abandoned", "CRM next action matched the chat"] },
  { id: "tone", label: "I. Tone & Brand Standard", max: 5, checks: ["Helpful", "Confident", "Polite", "Human", "Professional", "No desperate or robotic language"] },
];

export const CALL_CRITERIA: Criterion[] = [
  { id: "opening", label: "A. Opening", max: 10, checks: ["Introduced self and Gharpayy", "Confirmed availability to speak", "Explained purpose of the call"] },
  { id: "discovery", label: "B. Requirement Discovery", max: 20, checks: ["Asked relevant questions", "Understood real priority", "Identified hidden concerns", "Confirmed decision timeline"] },
  { id: "listening", label: "C. Listening Quality", max: 10, checks: ["No unnecessary interruption", "Summarised the requirement", "Responded to what was actually said"] },
  { id: "matching", label: "D. Property Matching", max: 15, checks: ["Suggested suitable properties", "Explained why each matched", "Limited to strongest options"] },
  { id: "value", label: "E. Value Creation", max: 10, checks: ["Explained verified inventory", "Explained service / support / move-in assurance", "Built confidence before price"] },
  { id: "objection", label: "F. Objection Handling", max: 10, checks: ["Identified the real objection", "Did not argue", "Responded with evidence or alternatives", "Did not discount immediately"] },
  { id: "closure", label: "G. Next-Step Closure", max: 15, checks: ["Secured a specific action", "Confirmed tour date & time", "Confirmed follow-up", "Confirmed quotation or payment step"] },
  { id: "crm", label: "H. CRM Documentation", max: 5, checks: ["Correct outcome recorded", "Requirement updated", "Next action added", "Commitments documented"] },
  { id: "comms", label: "I. Communication Standard", max: 5, checks: ["Clear", "Confident", "Respectful", "Energetic", "Easy to understand"] },
];

export const JOURNEY_CRITERIA: Criterion[] = [
  { id: "entry", label: "A. Lead Entry Quality", max: 20, checks: ["Name, phone, source correct", "Location / office / landmark captured", "Move-in date, budget, gender, room preference", "Correct zone, priority, owner", "No duplicate, next action set"] },
  { id: "first", label: "B. First Contact & Qualification", max: 20, checks: ["First action within SLA", "Requirement captured", "Alternative offered where needed", "Outcome logged in CRM"] },
  { id: "tour", label: "C. Tour Stage", max: 20, checks: ["Feasibility validated", "Property manager informed", "Customer confirmed", "Post-tour feedback with like / dislike / objection"] },
  { id: "closing", label: "D. Closing Stage", max: 20, checks: ["Quotation accuracy", "Objection identified & handled", "Payment follow-up", "Valid booking or loss reason"] },
  { id: "handover", label: "E. Handover & Continuity", max: 20, checks: ["Full context passed", "Handover accepted", "No conflicting information", "Customer never repeated themselves"] },
];

export function criteriaFor(kind: ReviewKind): Criterion[] {
  if (kind === "call") return CALL_CRITERIA;
  if (kind === "lead_journey") return JOURNEY_CRITERIA;
  return CHAT_CRITERIA;
}

export function totalOf(scores: Record<string, number>, criteria: Criterion[]): number {
  return criteria.reduce((s, c) => s + Math.min(Number(scores[c.id] ?? 0), c.max), 0);
}

/* ---------------- Bands ---------------- */

export const BANDS: { id: ReviewBand; label: string; min: number; max: number; action: string; className: string }[] = [
  { id: "gold", label: "Gharpayy Gold", min: 90, max: 100, action: "Recognition + add to best-practice library", className: "bg-amber-500 text-black" },
  { id: "strong", label: "Strong", min: 80, max: 89, action: "Minor improvement, no intervention", className: "bg-emerald-600 text-white" },
  { id: "coaching", label: "Coaching Required", min: 70, max: 79, action: "Feedback + corrected response mandatory", className: "bg-blue-600 text-white" },
  { id: "risk", label: "Performance Risk", min: 60, max: 69, action: "Same-day coaching, re-review within 48h", className: "bg-orange-600 text-white" },
  { id: "critical", label: "Critical Correction", min: 0, max: 59, action: "Manager intervention + corrective action plan", className: "bg-red-600 text-white" },
];

export function bandFor(score: number): ReviewBand {
  return BANDS.find((b) => score >= b.min && score <= b.max)?.id ?? "critical";
}
export function bandMeta(band: ReviewBand) {
  return BANDS.find((b) => b.id === band) ?? BANDS[BANDS.length - 1];
}

/* ---------------- Critical / automatic failure ---------------- */

export const CRITICAL_CONDITIONS = [
  "Shared false information",
  "Promised unavailable inventory",
  "Used disrespectful language",
  "Ended with “not available” and no alternative",
  "Rejected customer only because budget was low",
  "Changed lead owner without reason",
  "Marked lead lost without follow-up attempt",
  "Scheduled tour without checking inventory",
  "Sent customer to the wrong property",
  "Hid or failed to record a customer complaint",
  "No CRM update after a connected conversation",
  "Created multiple active owners",
  "Shared unapproved payment instructions",
  "Committed something the property owner has not confirmed",
];

export const MANDATORY_REVIEW_CASES = [
  "Customer complaint",
  "Customer escalation",
  "Lead marked lost without detailed reason",
  "Customer said team gave incorrect information",
  "Wrong price shared",
  "Wrong inventory shared",
  "Tour missed due to internal failure",
  "Customer reached property but could not see the room",
  "Multiple owners on one lead",
  "No CRM update after a connected call",
  "Booking cancelled",
  "Refund or payment dispute",
  "High-value / high-intent lead lost",
  "Rude, negative or dismissive language",
  "“Sold out” said without alternatives",
  "Lead untouched beyond SLA",
  "Booking without attribution to earlier owner",
];

/* ---------------- Tags ---------------- */

export const TAG_GROUPS: { group: string; tags: string[] }[] = [
  { group: "Lead data", tags: ["Missing requirement", "Wrong zone", "Duplicate lead", "Incorrect owner", "No next action", "Wrong stage", "Missing source", "Incorrect priority"] },
  { group: "Chat", tags: ["Slow response", "Wrong question", "Generic response", "Robotic response", "No acknowledgement", "Price-first response", "No alternative", "No next step", "Weak follow-up", "Incorrect information", "Negative language"] },
  { group: "Call", tags: ["Weak opening", "Poor discovery", "Interrupting", "No listening", "Wrong property fit", "Weak value explanation", "Poor objection handling", "No call closure", "Missing CRM notes"] },
  { group: "Tour", tags: ["Tour not confirmed", "Wrong property", "Room unavailable", "Property manager uninformed", "Customer waiting", "No post-tour feedback", "No alternative offered", "Quotation delayed"] },
  { group: "Closing", tags: ["Quotation error", "Weak urgency", "Discounting too early", "Payment follow-up missed", "Objection not identified", "Wrong terms", "Lost reason unclear", "No recovery attempt"] },
];

/* ---------------- Feedback workflow ---------------- */

export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "New",
  viewed: "Viewed",
  acknowledged: "Acknowledged",
  correction_pending: "Correction pending",
  submitted: "Submitted",
  re_review_pending: "Re-review pending",
  closed: "Closed",
  escalated: "Escalated",
};

export const STATUS_CLASS: Record<FeedbackStatus, string> = {
  new: "bg-slate-500 text-white",
  viewed: "bg-slate-600 text-white",
  acknowledged: "bg-blue-600 text-white",
  correction_pending: "bg-orange-600 text-white",
  submitted: "bg-indigo-600 text-white",
  re_review_pending: "bg-purple-600 text-white",
  closed: "bg-emerald-600 text-white",
  escalated: "bg-red-600 text-white",
};

export const ACK_LABEL: Record<AckChoice, string> = {
  understood: "I understand the feedback",
  need_clarification: "I need clarification",
  disagree: "I disagree and have added evidence",
};

export const VERIFICATION_LABEL: Record<VerificationResult, string> = {
  closed_correctly: "Closed correctly",
  partially_corrected: "Partially corrected",
  correction_rejected: "Correction rejected",
  customer_unreachable: "Customer no longer reachable",
  manager_intervention: "Manager intervention required",
};

export const CORRECTIVE_ACTIONS = [
  "Send corrected message",
  "Call the customer",
  "Update CRM",
  "Correct property details",
  "Reschedule tour",
  "Send quotation",
  "Escalate inventory",
  "Change the next action",
];

export const EXPLANATION_QUESTIONS = [
  { id: "what", label: "What mistake occurred?" },
  { id: "why", label: "Why did it happen?" },
  { id: "should", label: "What should have been done?" },
  { id: "different", label: "What will be done differently?" },
];

/* ---------------- Coverage & cadence ---------------- */

export const DAILY_TARGET = { chat: 3, call: 2, lead_journey: 1 };
export const WEEKLY_TARGET = { chat: 10, call: 5, lead_journey: 2 };

export const CADENCE = [
  { time: "10:30", title: "Previous-Day Quality Review", items: ["Lost high-intent leads", "Customer complaints", "Missed tours", "Low review scores", "Pending corrections", "Leads without next action", "Repeat employee errors"] },
  { time: "13:00", title: "Phase 1 Review", items: ["First response SLA", "Calls completed", "Qualification quality", "Tours scheduled", "Leads incorrectly rejected", "Pending feedback"] },
  { time: "17:00", title: "Phase 2 Review", items: ["Tours happening", "Tour confirmations", "Customer arrival issues", "Quotations pending", "Follow-ups overdue", "Corrections still incomplete"] },
  { time: "20:00", title: "EOD Closure", items: ["Every active lead has an owner", "Every active lead has a next action", "Every completed tour has feedback", "Every interested customer has a next step", "Every review acknowledged", "Every critical feedback corrected", "Every lost lead has a valid reason"] },
];

export const NON_NEGOTIABLES = [
  "No active lead without one owner",
  "No active lead without a next action",
  "No connected interaction without a CRM update",
  "No tour without feasibility validation",
  "No completed tour without customer feedback",
  "No quotation without understanding the objection",
  "No lost lead without a detailed reason",
  "No review without evidence",
  "No feedback without a corrective action",
  "No corrective action closed without verification",
  "No handover without full customer context",
  "No repeated mistake without escalation",
];

export const APPROVED_LANGUAGE = {
  use: [
    "This response did not answer the customer's actual question.",
    "The budget concern was identified, but no alternative was offered.",
    "The call ended without a confirmed next action.",
    "Reconnect with the customer and complete the missing requirement.",
    "Update the CRM after completing the corrective call.",
  ],
  avoid: ["Bad chat.", "You always do this.", "Poor performance.", "Use common sense.", "This is useless.", "Do better."],
};

export const HANDOVER_FIELDS = [
  "Customer requirement",
  "Current stage",
  "Properties discussed",
  "Property visited",
  "Customer likes",
  "Customer dislikes",
  "Main objection",
  "Commitment already made",
  "Recommended next action",
  "Next action deadline",
  "New owner",
  "Reason for handover",
];

/* ---------------- Helpers ---------------- */

export function istDay(d: Date = new Date()): string {
  return new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function deadlinePresets(): { label: string; iso: string }[] {
  const now = Date.now();
  const eod = new Date();
  eod.setHours(20, 0, 0, 0);
  const onePm = new Date();
  onePm.setHours(13, 0, 0, 0);
  return [
    { label: "Within 30 minutes", iso: new Date(now + 30 * 60000).toISOString() },
    { label: "Within 2 hours", iso: new Date(now + 2 * 3600000).toISOString() },
    { label: "Before 1 PM", iso: onePm.toISOString() },
    { label: "Before end of day", iso: eod.toISOString() },
  ];
}

export function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
