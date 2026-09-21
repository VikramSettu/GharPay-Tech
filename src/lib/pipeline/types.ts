import type { PipelineStage } from "./stage-config";

export type SlaState = "ok" | "warning" | "breached" | "escalated";

export interface StageEvidence {
  id: string;
  url: string;          // data URL or hosted URL
  fileName?: string;
  mimeType?: string;
  note?: string;
  uploadedBy: string;
  uploadedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface StageGate {
  stage: PipelineStage;
  enteredAt: string;       // ISO
  slaDeadline: string;     // ISO
  breached: boolean;
  completedFields: string[];
  managerOverride?: { by: string; reason: string; at: string };
  evidence?: StageEvidence[];
  evidenceRequested?: { by: string; at: string; reason?: string };
}

export interface Dossier {
  // Feasibility
  moveDate?: string;
  budget?: number;
  area?: string;
  gender?: "male" | "female" | "coed";
  occupation?: string;
  foodPreference?: "veg" | "non-veg" | "any";
  sharing?: "private" | "double" | "triple" | "any";
  duration?: string;

  // Location feasibility
  officeLocation?: string;
  collegeLocation?: string;
  travelTimeMinutes?: number;
  preferredLocality?: string;
  alternativeLocality?: string;

  // Moving feasibility
  movingFeasibility?: "immediate" | "7d" | "15d" | "30d" | "researching";

  // Decision
  decisionMaker?: "self" | "parents" | "friends" | "company";

  // Competition
  competition?: "visiting" | "booked" | "comparing" | "none";

  // Objection
  objection?:
    | "price" | "distance" | "food" | "deposit"
    | "parents" | "friends" | "timing" | "exploring" | "other";
  objectionNotes?: string;

  // Properties sent
  p1?: string;
  p2?: string;
  p3?: string;
  p4?: string;
  pdfSent?: boolean;
  videoSent?: boolean;
  locationSent?: boolean;

  // Deal read (added)
  closingExpectation?: "very-high" | "hard" | "maybe" | "try-nearby";
  goal?: "pb" | "offline";

  // Signals — multi-select chips
  signals?: string[]; // e.g. "urgent", "ready-to-pay", "price-issue", "location-mismatch", "parents-involved", "budget-low"

  // Who is coming to see the PG
  leadPersona?: "self" | "couple" | "student" | "working-pro" | "family" | "group-interns" | "group-friends" | "other";
  groupSize?: number;

  // Fields the user explicitly deferred: fieldKey -> reason
  skipped?: Record<string, string>;

  // Meta
  completionPct: number;
  completedAt?: string;
}

export interface PipelineState {
  currentStage: PipelineStage;
  history: StageGate[];        // stack of past + current gates
  dossier: Dossier;
  // Stage-specific data
  tour?: {
    date: string;
    coordinator?: string;
    meetingPoint?: string;
    sequence?: string[];       // property ids in order
    confirmedAt?: string;
    startedAt?: string;
    completedAt?: string;
    remindersSent: string[];   // labels sent: "24h","6h","2h","30m"
  };
  postVisit?: {
    decision:
      | "liked" | "didnt-like" | "shortlisted"
      | "needs-parents" | "needs-discount" | "needs-time"
      | "needs-another-visit" | "needs-alternative";
    notes?: string;
  };
  quote?: {
    amount: number;
    depositAmount?: number;
    discount?: number;
    lockInMonths?: number;
    expiry: string;
    sentAt: string;
    followUpsFired: number[];  // ladder indexes fired
  };
  negotiation?: {
    calls: number;
    discountRequests: number;
    parentCalls: number;
    lastOffer?: number;
    bestOffer?: number;
    probabilityPct?: number;
  };
  booking?: {
    amount: number;
    paymentRef: string;
    roomNumber?: string;
    at: string;
  };
  checkIn?: {
    at: string;
    kycDone: boolean;
    agreementDone: boolean;
    npsScore?: number;
  };
}
