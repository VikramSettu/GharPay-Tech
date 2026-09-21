import type { ActivityLog, Lead, Tour } from "@/lib/types";

/**
 * The Gharpayy lead journey, CRM side.
 * Main gates are S1..S8; the lowercase sub-gates (PDF, AMEN, LOCATION) are
 * micro-proofs that sit between them. NR / NU / NO are blockers, not steps.
 *
 * Each gate is owned by exactly one call (C1..C5) so "which call am I on" and
 * "which gate is open" can never drift apart.
 */
export type GateId =
  | "S1" | "PDF" | "S2" | "AMEN" | "S3" | "LOC" | "S4" | "S5" | "S6" | "S7" | "S8";

export interface Gate {
  id: GateId;
  code: string;
  label: string;
  sub?: boolean;
  why: string;
}

export const GATES: Gate[] = [
  { id: "S1", code: "S1 IN BLR", label: "IN BLR", why: "Is the person in / coming to Bangalore at all?" },
  { id: "PDF", code: "S PDF2", label: "PDF SENT", sub: true, why: "Property PDF / options shared on WhatsApp." },
  { id: "S2", code: "S2 WHERE", label: "WHERE", why: "Which area they want to stay in." },
  { id: "AMEN", code: "S AMEN", label: "AMENITIES", sub: true, why: "Food, sharing and must-have amenities agreed." },
  { id: "S3", code: "S3 EXACTDATE", label: "EXACT DATE", why: "A confirmed move-in date, not a guess." },
  { id: "LOC", code: "S LOCATION", label: "LOCATION", sub: true, why: "Office / college location captured." },
  { id: "S4", code: "S4 LOC FEASIBLE", label: "LOC FEASIBLE", why: "Commute from our PG actually works for them." },
  { id: "S5", code: "S5 VTOUR/PHYSICAL", label: "TOUR SET", why: "A tour is booked — virtual or physical." },
  { id: "S6", code: "S6 TOUR DONE", label: "TOUR DONE", why: "They have seen the property." },
  { id: "S7", code: "S7 QUOTATION", label: "QUOTATION", why: "Price, deposit and terms sent in writing." },
  { id: "S8", code: "S8 BOOKING DONE", label: "BOOKING DONE", why: "Token collected — lead is closed won." },
];

export type CallNumber = 1 | 2 | 3 | 4 | 5;

/** C1..C5  ↔  S1..S8. C5 owns no new gate — its job is clearing a blocker. */
export const CALL_GATES: Record<CallNumber, GateId[]> = {
  1: ["S1", "PDF", "S2", "AMEN", "S3"],
  2: ["LOC", "S4", "S5", "S6"],
  3: ["S7"],
  4: ["S8"],
  5: [],
};

export type GateBlockerId = "NR" | "NU" | "NO";
export const GATE_BLOCKERS: Record<GateBlockerId, { label: string; why: string }> = {
  NR: { label: "NO RESPOND", why: "Repeated calls / messages with no reply." },
  NU: { label: "NO UPDATE AFTER TOUR", why: "Tour happened but no decision since." },
  NO: { label: "OBJECTIONS", why: "An open objection is blocking the close." },
};

export function gatesForCall(call: CallNumber): Gate[] {
  return CALL_GATES[call].map((id) => GATES.find((g) => g.id === id)!).filter(Boolean);
}

/** Which call owns a gate — the reverse map. */
export function callForGate(id: GateId): CallNumber {
  const found = (Object.keys(CALL_GATES) as unknown as CallNumber[])
    .find((c) => CALL_GATES[c].includes(id));
  return found ?? 5;
}

const tagged = (lead: Lead, ...needles: string[]) =>
  lead.tags.some((t) => needles.some((n) => t.toLowerCase().includes(n)));

const STAGE_RANK: Record<string, number> = {
  new: 0, contacted: 1, "tour-scheduled": 2, "tour-done": 3, negotiation: 4, booked: 5, lost: 0,
};
const atLeast = (lead: Lead, stage: string) =>
  (STAGE_RANK[lead.stage] ?? 0) >= (STAGE_RANK[stage] ?? 0);

/** Which gates this lead has cleared, derived from CRM data. */
export function gatesDone(lead: Lead, activities: ActivityLog[], tours: Tour[]): Record<GateId, boolean> {
  const messages = activities.filter((a) => a.kind === "message_sent");
  const tourDone = tours.some((t) => t.status === "completed") || atLeast(lead, "tour-done");
  const booked = lead.stage === "booked";

  return {
    S1: Boolean(lead.preferredArea) || tagged(lead, "bangalore", "blr", "in city"),
    PDF: messages.length > 0 || tagged(lead, "pdf", "options sent"),
    S2: Boolean(lead.preferredArea),
    AMEN: tagged(lead, "sharing", "food", "amenit", "ac ", "single", "double", "triple"),
    S3: Boolean(lead.moveInDate),
    LOC: tagged(lead, "office", "college", "company", "commute", "work"),
    S4: tagged(lead, "feasible", "commute ok") || atLeast(lead, "tour-scheduled"),
    S5: tours.length > 0 || atLeast(lead, "tour-scheduled"),
    S6: tourDone,
    S7: tagged(lead, "quote", "quotation") || atLeast(lead, "negotiation")
      || tours.some((t) => t.postTour.filledAt !== null),
    S8: booked || tagged(lead, "token paid", "booked"),
  };
}

/** The gate they are standing on right now — first one not yet cleared. */
export function currentGate(lead: Lead, activities: ActivityLog[], tours: Tour[]): Gate {
  const done = gatesDone(lead, activities, tours);
  return GATES.find((g) => !done[g.id]) ?? GATES[GATES.length - 1];
}

export function gateBlockers(lead: Lead, activities: ActivityLog[], tours: Tour[]): GateBlockerId[] {
  const out: GateBlockerId[] = [];
  const done = gatesDone(lead, activities, tours);
  const calls = activities.filter((a) => a.kind === "call_logged");
  if (tagged(lead, "no answer", "not reachable", "nr") || (calls.length >= 2 && !done.S5)) out.push("NR");
  if (done.S6 && !done.S7 && !done.S8) out.push("NU");
  if (tagged(lead, "objection", "price issue") || tours.some((t) => Boolean(t.postTour.objection))) out.push("NO");
  return out;
}

/** Gate scoreboard for one call. */
export function callGateStatus(
  call: CallNumber, lead: Lead, activities: ActivityLog[], tours: Tour[],
  override?: (id: GateId, derived: boolean) => boolean,
) {
  const derived = gatesDone(lead, activities, tours);
  const gates = gatesForCall(call);
  const isDone = (g: Gate) => (override ? override(g.id, derived[g.id]) : derived[g.id]);
  const open = gates.filter((g) => !isDone(g));
  return {
    gates, derived, isDone, open,
    cleared: gates.length - open.length,
    total: gates.length,
    complete: gates.length > 0 && open.length === 0,
  };
}
