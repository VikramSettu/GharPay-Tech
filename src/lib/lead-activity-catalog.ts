import type { LeadStage, FollowUpPriority } from "./types";

export type ActivityTone = "positive" | "neutral" | "negative";

/** A concrete next step offered after a specific activity outcome. */
export interface NextStepOption {
  key: string;
  label: string;
  /** Hours from now for the auto-scheduled follow-up. 0 = no follow-up. */
  inHours: number;
  priority: FollowUpPriority;
  /** Optional stage override applied together with the next step. */
  stage?: LeadStage;
  /** Short explanation of what the system will do. */
  effect: string;
}

export interface ActivityType {
  key: string;
  label: string;
  emoji: string;
  tone: ActivityTone;
  /** Stage the lead moves to when this activity is logged (suggested). */
  stage: LeadStage | null;
  /** Which store action records the raw event. */
  channel: "call" | "message" | "note";
  /** Placeholder guidance for the note field. */
  hint?: string;
  /** Outcome-specific "what happens next" choices. */
  nextSteps: NextStepOption[];
}

export interface ActivityCategory {
  key: string;
  label: string;
  types: ActivityType[];
}

const RETRY = (label: string, inHours: number, priority: FollowUpPriority, effect: string, stage?: LeadStage): NextStepOption => ({
  key: `${label}-${inHours}`.toLowerCase().replace(/\s+/g, "-"),
  label,
  inHours,
  priority,
  stage,
  effect,
});

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  {
    key: "contact",
    label: "📞 Call",
    types: [
      {
        key: "call_answered",
        label: "Answered",
        emoji: "📞",
        tone: "positive",
        stage: "contacted",
        channel: "call",
        hint: "e.g. Budget ₹9k confirmed, wants AC 2-sharing, open to visit Saturday 11 AM.",
        nextSteps: [
          RETRY("Qualify further today", 4, "high", "Follow-up in 4h · stays in Contacted"),
          RETRY("Push for a visit", 24, "high", "Follow-up tomorrow · move to Tour scheduled after booking", "contacted"),
          RETRY("Send options on WhatsApp, call back tomorrow", 24, "medium", "Follow-up in 24h"),
        ],
      },
      {
        key: "call_no_answer",
        label: "No answer",
        emoji: "📵",
        tone: "negative",
        stage: null,
        channel: "call",
        hint: "Attempt number, time of day tried.",
        nextSteps: [
          RETRY("Retry in 2 hours", 2, "high", "Follow-up in 2h · attempt ladder continues"),
          RETRY("Retry tomorrow morning", 18, "medium", "Follow-up tomorrow"),
          RETRY("Send WhatsApp, retry in 3 days", 72, "low", "Follow-up in 3 days"),
        ],
      },
      {
        key: "call_busy",
        label: "Busy / cut call",
        emoji: "🚫",
        tone: "negative",
        stage: null,
        channel: "call",
        nextSteps: [
          RETRY("Retry in 1 hour", 1, "high", "Follow-up in 1h"),
          RETRY("Retry this evening", 6, "medium", "Follow-up in 6h"),
        ],
      },
      {
        key: "call_switched_off",
        label: "Switched off / unreachable",
        emoji: "📴",
        tone: "negative",
        stage: null,
        channel: "call",
        nextSteps: [
          RETRY("Retry tomorrow", 24, "medium", "Follow-up in 24h"),
          RETRY("Park for 3 days, then final attempt", 72, "low", "Follow-up in 3 days"),
          RETRY("5+ attempts done — drop", 0, "low", "Lead marked dropped, no follow-up", "dropped"),
        ],
      },
      {
        key: "call_callback",
        label: "Asked to call back",
        emoji: "🔄",
        tone: "neutral",
        stage: "contacted",
        channel: "call",
        hint: "Exact time the lead asked for.",
        nextSteps: [
          RETRY("Call back in 2 hours", 2, "high", "Follow-up in 2h"),
          RETRY("Call back tomorrow", 24, "high", "Follow-up in 24h"),
          RETRY("Call back in 3 days", 72, "medium", "Follow-up in 3 days"),
        ],
      },
      {
        key: "call_wrong_number",
        label: "Wrong number",
        emoji: "❌",
        tone: "negative",
        stage: "dropped",
        channel: "call",
        nextSteps: [RETRY("Close as invalid", 0, "low", "Lead dropped, no follow-up", "dropped")],
      },
    ],
  },
  {
    key: "whatsapp",
    label: "💬 WhatsApp",
    types: [
      {
        key: "wa_sent",
        label: "Message sent",
        emoji: "💬",
        tone: "neutral",
        stage: null,
        channel: "message",
        hint: "What was sent — options, pricing, location pin?",
        nextSteps: [
          RETRY("Check reply in 3 hours", 3, "medium", "Follow-up in 3h"),
          RETRY("Call if no reply tomorrow", 24, "high", "Follow-up in 24h"),
        ],
      },
      {
        key: "wa_replied",
        label: "Lead replied",
        emoji: "✅",
        tone: "positive",
        stage: "contacted",
        channel: "message",
        nextSteps: [
          RETRY("Call now while warm", 1, "high", "Follow-up in 1h · stage → Contacted", "contacted"),
          RETRY("Share shortlist, call tomorrow", 24, "medium", "Follow-up in 24h"),
        ],
      },
      {
        key: "wa_seen_no_reply",
        label: "Seen, no reply",
        emoji: "👁",
        tone: "negative",
        stage: null,
        channel: "message",
        nextSteps: [
          RETRY("Nudge in 4 hours", 4, "medium", "Follow-up in 4h"),
          RETRY("Call tomorrow instead", 24, "high", "Follow-up in 24h"),
        ],
      },
    ],
  },
  {
    key: "qualify",
    label: "🎯 Qualification",
    types: [
      {
        key: "budget_confirmed",
        label: "Budget confirmed",
        emoji: "💰",
        tone: "positive",
        stage: "contacted",
        channel: "note",
        nextSteps: [
          RETRY("Shortlist properties today", 4, "high", "Follow-up in 4h"),
          RETRY("Book a visit", 24, "high", "Follow-up in 24h"),
        ],
      },
      {
        key: "requirements_noted",
        label: "Requirements captured",
        emoji: "📋",
        tone: "positive",
        stage: "contacted",
        channel: "note",
        nextSteps: [
          RETRY("Send matched options in 1 hour", 1, "high", "Follow-up in 1h"),
          RETRY("Book a visit tomorrow", 24, "high", "Follow-up in 24h"),
        ],
      },
      {
        key: "move_date_pushed",
        label: "Move-in date pushed",
        emoji: "🗓",
        tone: "neutral",
        stage: null,
        channel: "note",
        hint: "New expected move-in date and the reason.",
        nextSteps: [
          RETRY("Nurture weekly", 168, "low", "Follow-up in 7 days"),
          RETRY("Re-check in 30 days", 720, "low", "Follow-up in 30 days"),
        ],
      },
      {
        key: "disqualified",
        label: "Disqualified",
        emoji: "⛔",
        tone: "negative",
        stage: "dropped",
        channel: "note",
        hint: "Reason — budget, location, not moving to Bangalore…",
        nextSteps: [RETRY("Close the lead", 0, "low", "Lead dropped, no follow-up", "dropped")],
      },
    ],
  },
  {
    key: "visit",
    label: "🏠 Visit",
    types: [
      {
        key: "visit_scheduled",
        label: "Visit scheduled",
        emoji: "📅",
        tone: "positive",
        stage: "tour-scheduled",
        channel: "note",
        hint: "Property, date and time agreed.",
        nextSteps: [
          RETRY("Confirmation call 1 day before", 24, "high", "Follow-up in 24h · stage → Tour scheduled", "tour-scheduled"),
          RETRY("Reminder 2 hours before", 2, "high", "Follow-up in 2h", "tour-scheduled"),
        ],
      },
      {
        key: "visit_no_show",
        label: "No-show",
        emoji: "👻",
        tone: "negative",
        stage: "contacted",
        channel: "call",
        nextSteps: [
          RETRY("Call now to reschedule", 1, "high", "Follow-up in 1h · stage → Contacted", "contacted"),
          RETRY("Retry tomorrow", 24, "medium", "Follow-up in 24h"),
        ],
      },
      {
        key: "visit_done_interested",
        label: "Visited — interested",
        emoji: "✅",
        tone: "positive",
        stage: "negotiation",
        channel: "note",
        hint: "Room seen, what they liked, remaining concern.",
        nextSteps: [
          RETRY("Close call tomorrow", 24, "high", "Follow-up in 24h · stage → Negotiation", "negotiation"),
          RETRY("Send agreement today", 4, "high", "Follow-up in 4h", "negotiation"),
        ],
      },
      {
        key: "visit_done_thinking",
        label: "Visited — needs time",
        emoji: "🤔",
        tone: "neutral",
        stage: "tour-done",
        channel: "note",
        nextSteps: [
          RETRY("Check in after 48 hours", 48, "high", "Follow-up in 2 days"),
          RETRY("Share comparison, call in 3 days", 72, "medium", "Follow-up in 3 days"),
        ],
      },
      {
        key: "visit_done_no",
        label: "Visited — not interested",
        emoji: "👎",
        tone: "negative",
        stage: "tour-done",
        channel: "note",
        hint: "What exactly did not work?",
        nextSteps: [
          RETRY("Offer an alternative property", 24, "medium", "Follow-up in 24h"),
          RETRY("Move to nurture", 336, "low", "Follow-up in 14 days"),
          RETRY("Drop the lead", 0, "low", "Lead dropped", "dropped"),
        ],
      },
    ],
  },
  {
    key: "close",
    label: "🤝 Negotiation & close",
    types: [
      {
        key: "price_discussed",
        label: "Price discussed",
        emoji: "💬",
        tone: "neutral",
        stage: "negotiation",
        channel: "call",
        nextSteps: [
          RETRY("Decision call tomorrow", 24, "high", "Follow-up in 24h", "negotiation"),
          RETRY("Manager approval, revert in 4h", 4, "high", "Follow-up in 4h", "negotiation"),
        ],
      },
      {
        key: "offer_accepted",
        label: "Offer accepted",
        emoji: "🤝",
        tone: "positive",
        stage: "negotiation",
        channel: "note",
        nextSteps: [
          RETRY("Send agreement now, chase in 4h", 4, "high", "Follow-up in 4h", "negotiation"),
          RETRY("Collect token tomorrow", 24, "high", "Follow-up in 24h", "negotiation"),
        ],
      },
      {
        key: "agreement_sent",
        label: "Agreement sent",
        emoji: "📄",
        tone: "positive",
        stage: "negotiation",
        channel: "message",
        nextSteps: [
          RETRY("Chase signature in 24h", 24, "high", "Follow-up in 24h"),
          RETRY("Chase signature in 48h", 48, "medium", "Follow-up in 2 days"),
        ],
      },
      {
        key: "advance_received",
        label: "Advance / token received",
        emoji: "💳",
        tone: "positive",
        stage: "booked",
        channel: "note",
        nextSteps: [
          RETRY("Plan check-in", 48, "high", "Follow-up in 2 days · stage → Booked", "booked"),
          RETRY("Booked — no follow-up needed", 0, "low", "Stage → Booked", "booked"),
        ],
      },
      {
        key: "lost",
        label: "Lost",
        emoji: "💀",
        tone: "negative",
        stage: "dropped",
        channel: "note",
        hint: "Honest reason — competitor, budget, plans changed…",
        nextSteps: [
          RETRY("Close as lost", 0, "low", "Stage → Dropped", "dropped"),
          RETRY("Revival attempt in 30 days", 720, "low", "Follow-up in 30 days", "dropped"),
        ],
      },
    ],
  },
  {
    key: "admin",
    label: "🗂 Other",
    types: [
      {
        key: "note_logged",
        label: "Note / internal update",
        emoji: "📝",
        tone: "neutral",
        stage: null,
        channel: "note",
        nextSteps: [
          RETRY("No follow-up needed", 0, "low", "Only the note is recorded"),
          RETRY("Review tomorrow", 24, "medium", "Follow-up in 24h"),
        ],
      },
      {
        key: "on_hold",
        label: "Put on hold",
        emoji: "⏸",
        tone: "neutral",
        stage: null,
        channel: "note",
        hint: "Why is the lead paused and until when?",
        nextSteps: [
          RETRY("Re-check in 7 days", 168, "low", "Follow-up in 7 days"),
          RETRY("Re-check in 14 days", 336, "low", "Follow-up in 14 days"),
        ],
      },
      {
        key: "reactivated",
        label: "Lead reactivated",
        emoji: "♻️",
        tone: "positive",
        stage: "contacted",
        channel: "call",
        nextSteps: [
          RETRY("Call within 1 hour", 1, "high", "Follow-up in 1h · stage → Contacted", "contacted"),
        ],
      },
    ],
  },
];

export const ALL_ACTIVITY_TYPES = ACTIVITY_CATEGORIES.flatMap((c) =>
  c.types.map((t) => ({ ...t, category: c.key })),
);

export const ACTIVITY_TYPE_MAP = Object.fromEntries(
  ALL_ACTIVITY_TYPES.map((t) => [t.key, t]),
) as Record<string, (typeof ALL_ACTIVITY_TYPES)[number]>;

export function toneClasses(tone: ActivityTone, active: boolean) {
  if (!active) return "border-border text-muted-foreground hover:border-foreground/30";
  if (tone === "positive") return "border-success bg-success/10 text-success";
  if (tone === "negative") return "border-destructive bg-destructive/10 text-destructive";
  return "border-primary bg-primary/10 text-primary";
}
