// Header labels. Every sub-label lives under exactly one header so the picker
// stays readable even when the catalog grows past a hundred instructions.

export interface LabelGroupDef {
  id: string;
  /** Header shown in the picker and the console. */
  title: string;
  /** One line the reviewer reads to know if they are in the right drawer. */
  blurb: string;
  /** Emoji-free icon key mapped in the UI. */
  icon:
    | "speed" | "questions" | "followup" | "owner" | "tour"
    | "money" | "quality" | "data" | "risk" | "lifecycle" | "positive";
}

export const LABEL_GROUPS: LabelGroupDef[] = [
  { id: "speed", title: "Speed & response", blurb: "The clock is losing us the lead — first reply, dead air, night gaps, unanswered last message.", icon: "speed" },
  { id: "questions", title: "Qualification & questions", blurb: "We are talking without knowing: budget, date, area, occupancy, decision-maker.", icon: "questions" },
  { id: "followup", title: "Follow-up discipline", blurb: "Second and third touch problems — no next action, weak nudges, broken promises.", icon: "followup" },
  { id: "owner", title: "Owner & inventory side", blurb: "The supply side is blocking the deal — owner silent, unit stale, photos missing, price unconfirmed.", icon: "owner" },
  { id: "tour", title: "Tours & site visits", blurb: "Everything between 'interested' and 'stood in the room'.", icon: "tour" },
  { id: "money", title: "Pricing, payment & closing", blurb: "Token, negotiation, deposit, invoice — the part where revenue actually lands.", icon: "money" },
  { id: "quality", title: "Chat quality & conduct", blurb: "How we sound: tone, language, templates, rudeness, over-promising.", icon: "quality" },
  { id: "data", title: "CRM hygiene & data", blurb: "The record does not match reality — duplicates, wrong owner, empty fields, stale stage.", icon: "data" },
  { id: "risk", title: "Risk, escalation & compliance", blurb: "Things that can become a complaint, a refund, or a legal problem.", icon: "risk" },
  { id: "lifecycle", title: "Lifecycle & revival", blurb: "Cold, lost, ghosted, future move-in — leads that need a different clock.", icon: "lifecycle" },
  { id: "positive", title: "Recognition & examples", blurb: "What good looks like, marked on real chats so it can be copied.", icon: "positive" },
];

export const GROUP_BY_ID: Record<string, LabelGroupDef> = Object.fromEntries(
  LABEL_GROUPS.map((g) => [g.id, g]),
);
