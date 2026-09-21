// The 11-stage Gharpayy Closing Engine — canonical config.
// Every lead lives in exactly one stage. Each stage has entry criteria,
// exit criteria, an SLA deadline, and a set of required fields.

export type PipelineStage =
  | "NEW"
  | "DOSSIER"
  | "MATCHED"
  | "TOUR_SCHEDULED"
  | "TOUR_CONFIRMED"
  | "TOUR_IN_PROGRESS"
  | "POST_VISIT"
  | "QUOTED"
  | "NEGOTIATION"
  | "BOOKED"
  | "CHECKED_IN"
  | "LOST";

export const STAGE_ORDER: PipelineStage[] = [
  "NEW", "DOSSIER", "MATCHED", "TOUR_SCHEDULED", "TOUR_CONFIRMED",
  "TOUR_IN_PROGRESS", "POST_VISIT", "QUOTED", "NEGOTIATION", "BOOKED", "CHECKED_IN",
];

export interface StageDef {
  key: PipelineStage;
  label: string;
  short: string;
  slaMs: number;               // time budget in this stage before breach
  requiredFields: string[];    // keys of Dossier / lead that must be set to exit
  description: string;
}

// SLA reference (in ms)
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const STAGE_CONFIG: Record<PipelineStage, StageDef> = {
  NEW: {
    key: "NEW", label: "Lead Added", short: "New",
    slaMs: 15 * SEC, requiredFields: ["name", "phoneE164"],
    description: "Auto-captured — advances immediately to Dossier.",
  },
  DOSSIER: {
    key: "DOSSIER", label: "60-Sec Dossier", short: "Dossier",
    slaMs: 60 * SEC,
    requiredFields: [
      "moveDate", "budget", "area", "gender", "sharing",
      "movingFeasibility", "decisionMaker", "competition", "objection",
    ],
    description: "Mandatory qualification within 60 seconds.",
  },
  MATCHED: {
    key: "MATCHED", label: "Property Match", short: "Match",
    slaMs: 30 * MIN, requiredFields: ["p1"],
    description: "Pin P1/P2/P3 the lead is leaning toward.",
  },
  TOUR_SCHEDULED: {
    key: "TOUR_SCHEDULED", label: "Tour Scheduled", short: "Scheduled",
    slaMs: 24 * HOUR, requiredFields: ["tourDate", "coordinator"],
    description: "Date, time, coordinator, meeting point locked.",
  },
  TOUR_CONFIRMED: {
    key: "TOUR_CONFIRMED", label: "Tour Confirmed", short: "Confirmed",
    slaMs: 6 * HOUR, requiredFields: ["confirmedAt"],
    description: "Cascade: 24h / 6h / 2h / 30m reminders sent.",
  },
  TOUR_IN_PROGRESS: {
    key: "TOUR_IN_PROGRESS", label: "On Tour", short: "Touring",
    slaMs: 4 * HOUR, requiredFields: ["startedAt"],
    description: "Live map: reached → inside P1 → P2 → P3 → completed.",
  },
  POST_VISIT: {
    key: "POST_VISIT", label: "Post Visit Decision", short: "Post-Visit",
    slaMs: 15 * MIN, requiredFields: ["decision"],
    description: "Liked / Didn't like / Needs parents / Needs discount.",
  },
  QUOTED: {
    key: "QUOTED", label: "Quotation Sent", short: "Quoted",
    slaMs: 15 * MIN, requiredFields: ["quoteAmount", "quoteExpiry"],
    description: "MANDATORY within 15 min of tour completion.",
  },
  NEGOTIATION: {
    key: "NEGOTIATION", label: "Negotiation", short: "Negotiate",
    slaMs: 48 * HOUR, requiredFields: ["lastOffer"],
    description: "Track calls, discount requests, parent calls, best offer.",
  },
  BOOKED: {
    key: "BOOKED", label: "Booked", short: "Booked",
    slaMs: 7 * DAY, requiredFields: ["bookingAmount", "paymentRef"],
    description: "Booking amount received, room locked, owner notified.",
  },
  CHECKED_IN: {
    key: "CHECKED_IN", label: "Checked In", short: "Live",
    slaMs: 30 * DAY, requiredFields: ["checkedInAt"],
    description: "KYC, agreement, keys, NPS captured.",
  },
  LOST: {
    key: "LOST", label: "Lost", short: "Lost",
    slaMs: 0, requiredFields: ["lostReason"],
    description: "Objection tag mandatory before marking lost.",
  },
};

// Follow-up ladder in ms after quote sent
export const QUOTE_FOLLOWUP_LADDER = [
  2 * HOUR, 24 * HOUR, 48 * HOUR, 72 * HOUR, 7 * DAY,
];

// Revival ladder in days after lead goes cold
export const REVIVAL_DAYS = [30, 60, 90];

// Tour confirmation reminder cascade (ms BEFORE tour)
export const TOUR_REMINDER_CASCADE = [
  { at: 24 * HOUR, label: "24h" },
  { at: 6 * HOUR,  label: "6h" },
  { at: 2 * HOUR,  label: "2h" },
  { at: 30 * MIN,  label: "30m" },
];

// Daily targets per teammate (End-of-Day Success Criteria)
export const DAILY_TARGETS = {
  leadsScheduled: 20,
  quotationsGenerated: 3,
  crmCompletionPct: 100,
};
