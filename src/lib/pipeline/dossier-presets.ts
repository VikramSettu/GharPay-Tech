// Shared presets for the enriched Dossier UI.
// 10x pass: expanded signals, presets, and added WHY_MAP so every option
// documents (a) why it exists and (b) who benefits — admin / TCM / client.
import type { Dossier } from "./types";

export const SIGNAL_PRESETS: { key: string; label: string; tone: "hot" | "cold" | "warn" }[] = [
  { key: "urgent",             label: "Urgent",            tone: "hot"  },
  { key: "ready-to-pay",       label: "Ready to pay",      tone: "hot"  },
  { key: "walk-in-ready",      label: "Walk-in ready",     tone: "hot"  },
  { key: "hot-lead",           label: "Hot lead",          tone: "hot"  },
  { key: "price-issue",        label: "Price issue",       tone: "warn" },
  { key: "location-mismatch",  label: "Location mismatch", tone: "warn" },
  { key: "parents-involved",   label: "Parents involved",  tone: "warn" },
  { key: "comparing",          label: "Comparing others",  tone: "warn" },
  { key: "needs-parking",      label: "Needs parking",     tone: "warn" },
  { key: "needs-attached-bath",label: "Attached bath",     tone: "warn" },
  { key: "needs-ac",           label: "Needs AC",          tone: "warn" },
  { key: "pet-owner",          label: "Pet owner",         tone: "warn" },
  { key: "veg-only",           label: "Veg only",          tone: "warn" },
  { key: "night-shift",        label: "Night shift",       tone: "warn" },
  { key: "credit-payment",     label: "Credit / EMI",      tone: "warn" },
  { key: "weekend-tour",       label: "Weekend tour only", tone: "warn" },
  { key: "budget-low",         label: "Budget low",        tone: "cold" },
  { key: "unresponsive",       label: "Unresponsive",      tone: "cold" },
  { key: "researching",        label: "Just researching",  tone: "cold" },
  { key: "duplicate-suspect",  label: "Possible duplicate",tone: "cold" },
];

export const CLOSING_EXPECTATIONS: { key: NonNullable<Dossier["closingExpectation"]>; label: string; tone: string }[] = [
  { key: "very-high",   label: "Very high",     tone: "bg-success/15 text-success border-success/40" },
  { key: "hard",        label: "Hard close",    tone: "bg-warning/15 text-warning border-warning/40" },
  { key: "maybe",       label: "Maybe",         tone: "bg-muted text-muted-foreground border-border" },
  { key: "try-nearby",  label: "Try nearby",    tone: "bg-accent/15 text-accent border-accent/40" },
];

export const GOAL_OPTIONS: { key: NonNullable<Dossier["goal"]>; label: string }[] = [
  { key: "pb",      label: "Personal booking (PB)" },
  { key: "offline", label: "Offline visit" },
];

// Short codes make lead cards scannable — SF/SM/C/ST/WP/FAM/GI/GF.
export const LEAD_PERSONAS: {
  key: NonNullable<Dossier["leadPersona"]>;
  label: string;
  code: string;
  emoji: string;
}[] = [
  { key: "self",          label: "Self",            code: "S",   emoji: "🙋" },
  { key: "couple",        label: "Couple",          code: "C",   emoji: "💑" },
  { key: "student",       label: "Student",         code: "ST",  emoji: "🎓" },
  { key: "working-pro",   label: "Working pro",     code: "WP",  emoji: "💼" },
  { key: "family",        label: "Family",          code: "FAM", emoji: "👨‍👩‍👧" },
  { key: "group-interns", label: "Group · interns", code: "GI",  emoji: "🧑‍💻" },
  { key: "group-friends", label: "Group · friends", code: "GF",  emoji: "👯" },
  { key: "other",         label: "Other",           code: "•",   emoji: "•" },
];

/**
 * "SF" / "SM" gender-tagged short codes for the lead-card badge.
 * We derive them from persona + gender in one place so the UI stays in sync.
 */
export function personaShortCode(d: Dossier | undefined): string {
  if (!d?.leadPersona) return "—";
  const base = LEAD_PERSONAS.find((p) => p.key === d.leadPersona)?.code ?? "•";
  if (d.leadPersona === "self") {
    if (d.gender === "female") return "SF";
    if (d.gender === "male") return "SM";
  }
  if (d.groupSize && (d.leadPersona === "group-interns" || d.leadPersona === "group-friends" || d.leadPersona === "family")) {
    return `${base}×${d.groupSize}`;
  }
  return base;
}

export const DOSSIER_FIELD_LABELS: Record<string, string> = {
  moveDate: "Move date",
  budget: "Budget",
  area: "Preferred area",
  gender: "Gender",
  sharing: "Sharing",
  movingFeasibility: "Moving feasibility",
  decisionMaker: "Decision maker",
  competition: "Competition",
  objection: "Objection",
  closingExpectation: "Closing expectation",
  goal: "Goal",
  leadPersona: "Who is coming",
  occupation: "Occupation",
  foodPreference: "Food preference",
  duration: "Stay duration",
  officeLocation: "Office location",
  collegeLocation: "College location",
  travelTimeMinutes: "Travel budget (min)",
  preferredLocality: "Preferred locality",
  alternativeLocality: "Alternative locality",
  p1: "Property 1", p2: "Property 2", p3: "Property 3", p4: "Property 4",
  pdfSent: "PDF sent",
  videoSent: "Video sent",
  locationSent: "Location sent",
};

/**
 * WHY_MAP — for every dossier field, three answers:
 *   why  — why this option exists on the form
 *   admin— what the admin/manager gains when it's filled
 *   tcm  — what the filler (TCM) gains when it's filled
 *   client — what the end-lead gains when it's filled
 * Wired into <WhyCaption/> at the field level.
 */
export const WHY_MAP: Record<string, { why: string; admin: string; tcm: string; client: string }> = {
  closingExpectation: {
    why: "Sets close probability so downstream stages know the SLA.",
    admin: "Feeds forecast + reassignment triggers when 'try-nearby'.",
    tcm: "Tells you how hard to push in the first call.",
    client: "They aren't over-pressured when the fit is weak.",
  },
  goal: {
    why: "Distinguishes personal-booking (PB) from an offline visit path.",
    admin: "Splits pipeline metrics: PB vs walk-in conversion.",
    tcm: "Chooses the right script + closing sequence.",
    client: "Right nudges (payment link vs tour confirmation).",
  },
  leadPersona: {
    why: "Group size + persona changes room math and pitch.",
    admin: "Rolls up team's persona mix + inventory demand.",
    tcm: "Auto-picks matching properties + pricing tier.",
    client: "Fewer wrong options shown, faster to yes.",
  },
  moveDate: {
    why: "Every priority bucket is derived from move-date.",
    admin: "Move-date buckets drive the queue heat-map.",
    tcm: "You see 'TODAY' vs 'FUTURE' on the lead card.",
    client: "Reminders align with their real timeline.",
  },
  budget: {
    why: "Filters inventory to what they can afford.",
    admin: "Sees average deal size + budget-loss gap.",
    tcm: "No wasted tours to over-budget properties.",
    client: "No sticker-shock at the property visit.",
  },
  area: {
    why: "Localises property matches to their zone.",
    admin: "Zone-brain reallocates high-demand localities.",
    tcm: "Auto-detects zone bucket + assignment routing.",
    client: "Shorter commute, higher chance of stay.",
  },
  gender: {
    why: "Some properties are single-gender only.",
    admin: "Prevents mis-assignment to wrong-gender inventory.",
    tcm: "Filters SF vs SM automatically on the card.",
    client: "No embarrassment / rejection at door.",
  },
  sharing: {
    why: "Private / double / triple changes pricing tier.",
    admin: "Occupancy forecast per sharing tier.",
    tcm: "Correct P1/P2/P3 shortlist first time.",
    client: "Right roommates + price.",
  },
  movingFeasibility: {
    why: "'Immediate' vs '30d' vs 'researching' changes cadence.",
    admin: "SLA breaches counted only for actionable leads.",
    tcm: "Nurture cadence set correctly (daily vs weekly).",
    client: "Not spammed while just researching.",
  },
  decisionMaker: {
    why: "If parents/company decide, loop them in early.",
    admin: "Flags 'parents-pending' as its own stage.",
    tcm: "Adds a parent-call step to the sequence.",
    client: "Family aligned before deposit — fewer cancellations.",
  },
  competition: {
    why: "Booked-elsewhere / comparing changes urgency.",
    admin: "Win-loss reason tracking.",
    tcm: "Deploys the counter-offer template.",
    client: "Gets a fair comparison, not a bait-and-switch.",
  },
  objection: {
    why: "Every lost lead had one — track it now to close it.",
    admin: "Ranks top objections by TCM + zone.",
    tcm: "Right rebuttal template ready to send.",
    client: "Actual concern addressed, not ignored.",
  },
  occupation: {
    why: "Company / college is trust signal + payment cycle hint.",
    admin: "Employer-based reporting + credit approvals.",
    tcm: "Warmer opener + salary-cycle-aware invoicing.",
    client: "Payment terms fit their pay date.",
  },
  foodPreference: {
    why: "Kitchen / meal-plan match; deal-breaker for many.",
    admin: "Segments veg-only inventory demand.",
    tcm: "Skips non-matching properties.",
    client: "No 'no veg' surprise on move-in day.",
  },
  duration: {
    why: "Short-stay vs long-stay changes discount + deposit.",
    admin: "LTV forecast + reservation-length mix.",
    tcm: "Correct lock-in offer.",
    client: "No overpayment for a short stay.",
  },
  officeLocation: {
    why: "Commute drives churn — track it before booking.",
    admin: "Zone-brain uses commute to reroute stock.",
    tcm: "Shows travel-time chip on every property.",
    client: "They aren't stuck with a 90-min commute.",
  },
  collegeLocation: {
    why: "Same as office, for student leads.",
    admin: "College-catchment demand map.",
    tcm: "Filters to walking-distance properties first.",
    client: "Saves rent + hours per week.",
  },
  travelTimeMinutes: {
    why: "Hard cap that filters shortlisted properties.",
    admin: "Rejection-reason analytics ('too far').",
    tcm: "Auto-drops properties over the cap.",
    client: "Only options they'd actually accept.",
  },
  preferredLocality: {
    why: "Their #1 wanted locality — pin the shortlist there.",
    admin: "Demand heat-map for supply team.",
    tcm: "First property shown is where they want to live.",
    client: "Feels heard on the first call.",
  },
  alternativeLocality: {
    why: "Fallback locality if #1 has no stock.",
    admin: "Cross-locality demand flow.",
    tcm: "Second-best pitch ready before the first no.",
    client: "Doesn't dead-end when #1 is full.",
  },
  p1: {
    why: "First property to pitch. Locks the shortlist.",
    admin: "P1 conversion rate per property.",
    tcm: "Anchors the tour + all follow-ups.",
    client: "Clear top pick, not a firehose of PDFs.",
  },
  p2: {
    why: "Second option — creates real choice.",
    admin: "P1-vs-P2 win rate by TCM.",
    tcm: "Fallback when P1 hits objection.",
    client: "Alternative in the same visit.",
  },
  p3: {
    why: "Third option — closes the shortlist.",
    admin: "Shortlist quality (how often they pick P3).",
    tcm: "Handles the 'anything else?' moment.",
    client: "Doesn't feel funnelled into one option.",
  },
  p4: {
    why: "Optional 4th if they insist on more choices.",
    admin: "Signals over-shortlisting risk.",
    tcm: "Handles the very indecisive lead.",
    client: "Gets breathing room.",
  },
  pdfSent: {
    why: "Proof the property PDF actually went out.",
    admin: "Audit trail for 'we didn't get anything'.",
    tcm: "Skip the redundant send next time.",
    client: "Doesn't get spammed the same PDF twice.",
  },
  videoSent: {
    why: "Video tour is the strongest remote-close asset.",
    admin: "Video-to-tour conversion.",
    tcm: "Signal to move to virtual-tour stage.",
    client: "Sees the space before travelling.",
  },
  locationSent: {
    why: "Live location shared reduces no-shows.",
    admin: "No-show rate broken by location-sent-or-not.",
    tcm: "Chase drops by ~40% when location is shared.",
    client: "Doesn't get lost, arrives on time.",
  },
};

/* ─── Urgency buckets: derived from move-date, drive queue priority ─── */

export type UrgencyBucket = "today" | "tomorrow" | "this-week" | "this-month" | "next-month" | "future" | "unknown";

export const URGENCY_META: Record<UrgencyBucket, { label: string; tone: string; rank: number }> = {
  "today":      { label: "TODAY",      tone: "bg-destructive text-destructive-foreground border-destructive", rank: 0 },
  "tomorrow":   { label: "TOMORROW",   tone: "bg-destructive/20 text-destructive border-destructive/40",       rank: 1 },
  "this-week":  { label: "THIS WEEK",  tone: "bg-warning/20 text-warning border-warning/40",                    rank: 2 },
  "this-month": { label: "THIS MONTH", tone: "bg-accent/20 text-accent border-accent/40",                       rank: 3 },
  "next-month": { label: "NEXT MONTH", tone: "bg-primary/15 text-primary border-primary/30",                    rank: 4 },
  "future":     { label: "FUTURE",     tone: "bg-muted text-muted-foreground border-border",                    rank: 5 },
  "unknown":    { label: "NO DATE",    tone: "bg-muted text-muted-foreground border-border",                    rank: 6 },
};

export function computeUrgencyBucket(moveDate: string | undefined, now = new Date()): UrgencyBucket {
  if (!moveDate) return "unknown";
  const t = Date.parse(moveDate);
  if (Number.isNaN(t)) return "unknown";
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  const ms = t - midnight.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "this-week";
  const sameMonth = new Date(t).getMonth() === now.getMonth() && new Date(t).getFullYear() === now.getFullYear();
  if (sameMonth) return "this-month";
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd  = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
  if (t >= nextMonth.getTime() && t <= monthEnd.getTime()) return "next-month";
  return "future";
}

/* ─── Quick-fill presets: one tap to stamp common combos ─── */

export interface QuickPreset {
  id: string;
  label: string;
  emoji: string;
  patch: Partial<Dossier>;
  /** short one-liner surfaced on hover / caption */
  hint?: string;
}

const daysFromNow = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: "sf-hot-today", label: "SF · Hot · Today", emoji: "🔥",
    hint: "Solo female, closing today.",
    patch: {
      leadPersona: "self", gender: "female",
      closingExpectation: "very-high", goal: "offline",
      moveDate: daysFromNow(0), signals: ["urgent", "ready-to-pay"],
    },
  },
  {
    id: "sm-hot-tomorrow", label: "SM · Hot · Tomorrow", emoji: "🔥",
    hint: "Solo male, tour tomorrow.",
    patch: {
      leadPersona: "self", gender: "male",
      closingExpectation: "very-high", goal: "offline",
      moveDate: daysFromNow(1), signals: ["urgent"],
    },
  },
  {
    id: "sf-hot-week", label: "SF · This week", emoji: "🌸",
    hint: "Solo female, moving in a few days.",
    patch: {
      leadPersona: "self", gender: "female",
      closingExpectation: "hard", goal: "offline",
      moveDate: daysFromNow(5), signals: ["urgent"],
    },
  },
  {
    id: "sm-hot-week", label: "SM · This week", emoji: "🚶",
    hint: "Solo male, moving in a few days.",
    patch: {
      leadPersona: "self", gender: "male",
      closingExpectation: "hard", goal: "offline",
      moveDate: daysFromNow(5),
    },
  },
  {
    id: "wp-week", label: "Working pro · This week", emoji: "💼",
    hint: "Working pro closing this week.",
    patch: {
      leadPersona: "working-pro",
      closingExpectation: "hard", goal: "offline",
      moveDate: daysFromNow(5), decisionMaker: "self",
    },
  },
  {
    id: "wp-remote", label: "WP · Remote / video first", emoji: "🎥",
    hint: "Working pro, wants video before travel.",
    patch: {
      leadPersona: "working-pro",
      closingExpectation: "hard", goal: "pb",
      videoSent: true, signals: ["comparing"],
    },
  },
  {
    id: "student-parents", label: "Student · Parents involved", emoji: "🎓",
    hint: "Student, parents in the loop.",
    patch: {
      leadPersona: "student",
      closingExpectation: "hard", goal: "offline",
      decisionMaker: "parents", signals: ["parents-involved"],
    },
  },
  {
    id: "student-college", label: "Student · Walk to college", emoji: "📚",
    hint: "Student prioritising commute.",
    patch: {
      leadPersona: "student",
      closingExpectation: "very-high", goal: "offline",
      travelTimeMinutes: 15, signals: ["urgent"],
    },
  },
  {
    id: "couple-move", label: "Couple · Private", emoji: "💑",
    hint: "Couple, private room, offline visit.",
    patch: {
      leadPersona: "couple", sharing: "private",
      closingExpectation: "hard", goal: "offline",
      decisionMaker: "self",
    },
  },
  {
    id: "family-next-month", label: "Family · Next month", emoji: "👨‍👩‍👧",
    hint: "Family, next-month move-in.",
    patch: {
      leadPersona: "family",
      closingExpectation: "maybe", goal: "offline",
      moveDate: daysFromNow(35), decisionMaker: "self",
    },
  },
  {
    id: "family-relocation", label: "Family · Relocation", emoji: "🚚",
    hint: "Family, out-of-city relocation.",
    patch: {
      leadPersona: "family", closingExpectation: "hard",
      goal: "pb", signals: ["parents-involved"],
      duration: "12m",
    },
  },
  {
    id: "interns-group", label: "Interns × group", emoji: "🧑‍💻",
    hint: "Group of interns, double sharing.",
    patch: {
      leadPersona: "group-interns", groupSize: 4,
      closingExpectation: "hard", goal: "pb",
      sharing: "double",
    },
  },
  {
    id: "friends-group", label: "Friends × group", emoji: "👯",
    hint: "Group of friends, wants same floor.",
    patch: {
      leadPersona: "group-friends", groupSize: 3,
      closingExpectation: "maybe", goal: "offline",
      sharing: "triple",
    },
  },
  {
    id: "night-shift", label: "Night shift · WP", emoji: "🌙",
    hint: "Working pro, night shift, quiet needed.",
    patch: {
      leadPersona: "working-pro", closingExpectation: "hard",
      goal: "offline", signals: ["night-shift", "needs-attached-bath"],
    },
  },
  {
    id: "veg-only", label: "Veg only", emoji: "🥗",
    hint: "Strict veg, food is the deal-breaker.",
    patch: {
      foodPreference: "veg",
      closingExpectation: "hard", signals: ["veg-only"],
    },
  },
  {
    id: "pet-owner", label: "Pet owner", emoji: "🐕",
    hint: "Brings a pet — needs pet-friendly stock.",
    patch: {
      closingExpectation: "maybe", signals: ["pet-owner"],
    },
  },
  {
    id: "future-nurture", label: "Future lead (nurture)", emoji: "⏳",
    hint: "Not moving soon — nurture only.",
    patch: {
      closingExpectation: "try-nearby",
      signals: ["comparing", "researching"],
    },
  },
  {
    id: "budget-low", label: "Budget low · Try nearby", emoji: "💸",
    hint: "Cannot afford our stock — reassign.",
    patch: {
      closingExpectation: "try-nearby",
      signals: ["budget-low", "price-issue"],
    },
  },
  {
    id: "unresponsive", label: "Unresponsive · Cold", emoji: "🥶",
    hint: "Not picking up — drop to revival.",
    patch: {
      closingExpectation: "try-nearby",
      signals: ["unresponsive"],
    },
  },
  {
    id: "duplicate-suspect", label: "Possible duplicate", emoji: "♊",
    hint: "Looks like an existing lead — verify before acting.",
    patch: {
      closingExpectation: "maybe",
      signals: ["duplicate-suspect"],
    },
  },
];
