// L1 Review OS — the owner-grade audit layer for every chat and every call.
// Local-first: everything runs in the browser off a pasted transcript, so a
// Control Tower reviewer can audit a conversation in under two minutes.

export type Speaker = "agent" | "customer" | "system";

export interface ChatMsg {
  i: number;
  /** ISO timestamp when parseable. */
  ts: string | null;
  /** Minutes since the first message. */
  at: number | null;
  speaker: Speaker;
  author: string;
  text: string;
}

export type StepPhase = "open" | "discover" | "match" | "convince" | "close";

export interface PlaybookStep {
  id: string;
  label: string;
  phase: StepPhase;
  weight: number;
  why: string;
  /** Detected on agent messages. */
  detect: RegExp;
  /** Optional customer-side confirmation that the step actually landed. */
  confirm?: RegExp;
}

export interface StepResult {
  step: PlaybookStep;
  done: boolean;
  confirmed: boolean;
  atMinute: number | null;
  evidence: string;
}

export type L1Kind = "chat" | "call";

export interface SpeedMetrics {
  firstResponseMin: number | null;
  medianResponseMin: number | null;
  worstGapMin: number | null;
  worstGapAfter: string;
  ghostedMin: number | null;
  score: number; // 0-100
  verdict: string;
}

export interface FollowUpMetrics {
  agentInitiated: number;
  expected: number;
  unansweredCustomerMsgs: number;
  lastMoveBy: Speaker | null;
  score: number;
  verdict: string;
}

export interface AuthorshipMetrics {
  aiLikelihood: number; // 0-100
  verdict: "human" | "assisted" | "ai";
  signals: string[];
}

export interface UnderstandingMetrics {
  questionsAsked: number;
  questionsAnswered: number;
  mirroredFacts: string[];
  ignored: string[];
  score: number;
}

export interface ExtraValueHit {
  id: string;
  label: string;
  quote: string;
}

export interface MomentPick {
  quote: string;
  atMinute: number | null;
  why: string;
}

export type PaymentBlocker =
  | "paid"
  | "price-high"
  | "family-approval"
  | "comparing"
  | "timing"
  | "location"
  | "inventory"
  | "trust"
  | "unresponsive"
  | "no-ask";

export interface MoneyOutlook {
  paid: boolean;
  blocker: PaymentBlocker;
  blockerLabel: string;
  evidence: string;
  payProbability: number; // 0-100
  expectedPayInDays: number | null;
  expectedPayDate: string | null;
  bpdContribution: number; // expected bookings from this conversation
  unlock: string; // the single move that converts this chat
}

export interface L1Analysis {
  kind: L1Kind;
  messages: ChatMsg[];
  agentMsgs: number;
  customerMsgs: number;
  durationMin: number | null;
  steps: StepResult[];
  stepScore: number;
  missedSteps: StepResult[];
  speed: SpeedMetrics;
  followUp: FollowUpMetrics;
  authorship: AuthorshipMetrics;
  understanding: UnderstandingMetrics;
  extraValue: ExtraValueHit[];
  extraValuePct: number;
  wow: MomentPick | null;
  dull: MomentPick | null;
  money: MoneyOutlook;
  nextStepLocked: boolean;
  nextStepQuote: string;
  hesitation: string[];
  total: number;
  band: L1Band;
  ownerActions: string[];
}

export type L1Band = "gold" | "strong" | "coaching" | "risk" | "critical";

export interface L1Review {
  id: string;
  createdAt: string;
  kind: L1Kind;
  /** "auto" = engine read a pasted transcript. "manual" = a human read WhatsApp directly. */
  mode?: "auto" | "manual";
  zone: string;
  agent: string;
  reviewer: string;
  leadName: string;
  leadPhone: string;
  stage: string;
  transcript: string;
  /** Reviewer overrides / additions on top of the engine read. */
  reviewerNote: string;
  wowOverride: string;
  dullOverride: string;
  committedNextStep: string;
  committedBy: string;
  analysis: L1Analysis;
}