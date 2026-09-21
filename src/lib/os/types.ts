// Closing OS — types for the Multi-Person / Revival / Follow-up / Scenario layer.
// Additive layer on top of the existing store. Nothing here mutates legacy state.

export type PersonRelation =
  | "self" | "friend" | "partner" | "spouse" | "sibling" | "parent"
  | "guardian" | "roommate" | "colleague" | "manager" | "hr-poc" | "other";

export type DecisionPower = "final" | "strong" | "influencer" | "user";
export type PayResponsibility = "self" | "shared" | "parent" | "company" | "other";

export interface OsPerson {
  id: string;
  name: string;
  phone?: string;
  relation: PersonRelation;
  age?: number;
  gender?: "m" | "f" | "nb" | "u";
  occupation?: string;
  workOrCollege?: string;
  budgetMin?: number;
  budgetMax?: number;
  foodPref?: "veg" | "non-veg" | "jain" | "vegan" | "halal" | "any";
  roomType?: "single" | "double" | "triple" | "any";
  moveDate?: string;              // ISO
  docs?: string[];                // aadhaar / pan / passport / visa
  tourAttended?: boolean;
  decisionPower: DecisionPower;
  payResponsibility: PayResponsibility;
  objections?: string[];
  waStatus?: "unknown" | "opted-in" | "opted-out";
  sentiment?: "positive" | "neutral" | "negative";
  confidence?: number;            // 0-100
  notes?: string;
}

export interface OsGroup {
  leadId: string;                 // links to existing Lead.id
  headcount: number;              // may exceed people.length (unknown members)
  people: OsPerson[];
  groupType?: "friends" | "couple" | "married" | "family" | "office" | "students" | "startup" | "mixed" | "solo";
  waGroupLink?: string;
  bulkPricingRequested?: boolean;
  staggeredMoveIn?: boolean;
  updatedAt: number;
}

// -------- Revival cycles --------
export type RevivalReason =
  | "budget" | "office-change" | "college" | "family" | "parent-approval"
  | "roommate" | "transfer" | "job-switch" | "salary" | "festival" | "bonus"
  | "lease-ending" | "internship" | "marriage" | "emergency" | "other";

export interface RevivalCycle {
  id: string;
  leadId: string;
  cycleNumber: number;            // 1,2,3...
  openedAt: number;
  closedAt?: number;
  outcome?: "won" | "lost" | "ghost" | "active";
  lostReason?: string;
  reopenReason?: RevivalReason;
  predictedReturnDays?: number;
  predictedReturnConfidence?: number; // 0-100
  notes?: string;
}

// -------- Follow-up engine --------
export type TouchChannel = "call" | "wa" | "email" | "video" | "visit" | "auto-drip";
export type TouchStatus = "queued" | "sent" | "seen" | "replied" | "ignored" | "positive" | "negative" | "skipped";

export interface Touch {
  id: string;
  leadId: string;
  personId?: string;              // which group member this targets
  dayOffset: number;              // day within cadence
  scheduledAt: number;
  channel: TouchChannel;
  title: string;
  script?: string;
  status: TouchStatus;
  actor?: "system" | "tcm";
  mode: "auto" | "assisted" | "manual";
  updatedAt: number;
}

export interface Commitment {
  id: string;
  leadId: string;
  personId?: string;
  promise: string;                // "I'll decide by Sunday"
  dueAt: number;
  createdAt: number;
  status: "pending" | "kept" | "broken" | "renegotiated";
}

// -------- Scenario engine --------
export type ScenarioCategory =
  | "group" | "budget" | "lifestyle" | "accessibility" | "documentation"
  | "risk" | "operations" | "loss-reason" | "revival";

export interface ScenarioPack {
  id: string;
  category: ScenarioCategory;
  title: string;
  when: string;                   // trigger condition, natural language
  evidence: string[];             // evidence prompts
  script: string;                 // WA / call opener
  sla: string;                    // "reply within 15m"
  revival?: string;               // revival hook, if lost
  why: { admin: string; tcm: string; client: string };
}

// -------- Why registry --------
export interface WhyEntry {
  key: string;
  what: string;
  why: string;
  admin: string;
  tcm: string;
  client: string;
  when?: string;
  impact?: string;
  shortcut?: string;
  mistakes?: string[];
}
