import type { Lead } from "@/lib/types";
import type { DossierKey, LeadDossier } from "@/lib/lead-dossier-store";
import type { CallNumber } from "@/lib/journey-gates";

/**
 * The Gharpayy call script — C1..C5 read top to bottom like a real conversation.
 * Every line is either something you SAY, something you ASK (and capture), or
 * something you LISTEN for. Captured answers write straight into the dossier.
 */
export type LineKind = "say" | "ask" | "listen";

export type CoreField = "budget" | "moveInDate" | "preferredArea";
export type FieldKey = CoreField | DossierKey;

export type InputKind = "text" | "number" | "date" | "choice";

export interface ScriptLine {
  kind: LineKind;
  /** Spoken line. Tokens: {name} {area} {budget} {date} {property} */
  text: string;
  field?: FieldKey;
  label?: string;
  input?: InputKind;
  choices?: string[];
  placeholder?: string;
}

export const CORE_FIELDS: CoreField[] = ["budget", "moveInDate", "preferredArea"];

export const FIELD_LABELS: Record<FieldKey, string> = {
  budget: "Budget",
  moveInDate: "Move date",
  preferredArea: "Preferred area",
  inBlr: "In Bangalore",
  amenities: "Must-have amenities",
  workLocation: "Office / college",
  commuteOk: "Commute works",
  sharing: "Sharing",
  shortlist: "Shortlisted",
  property: "Property",
  tourMode: "Tour type",
  reaction: "Their reaction",
  quotation: "Quotation sent",
  objection: "Open objection",
  decisionBy: "Decision by",
};

const SCRIPTS: Record<CallNumber, ScriptLine[]> = {
  1: [
    { kind: "say", text: "Hi, am I speaking with {name}? This is {me} from Gharpayy — you enquired about a managed stay in Bangalore." },
    { kind: "say", text: "Give me 2 minutes and I'll shortlist places that actually fit you, instead of sending you 20 links." },
    {
      kind: "ask", text: "First — are you already in Bangalore, or moving in from another city?",
      field: "inBlr", input: "choice", choices: ["In Bangalore", "Moving in", "Not Bangalore"],
    },
    {
      kind: "ask", text: "Which area are you looking at — close to office, college, or metro?",
      field: "preferredArea", input: "text", placeholder: "Koramangala, HSR…",
    },
    {
      kind: "ask", text: "And where do you head out to every day? I'll check the commute before I suggest anything.",
      field: "workLocation", input: "text", placeholder: "Office / college / area",
    },
    {
      kind: "ask", text: "What monthly rent are you comfortable with — all-in, including food and utilities?",
      field: "budget", input: "number", placeholder: "18000",
    },
    {
      kind: "ask", text: "Sharing-wise, are you looking at single, double or triple?",
      field: "sharing", input: "choice", choices: ["Single", "Double", "Triple", "Any"],
    },
    {
      kind: "ask", text: "By when do you need to move in? I'll block availability from that date.",
      field: "moveInDate", input: "date",
    },
    {
      kind: "ask", text: "Anything you can't live without — food, gym, AC, attached washroom, parking?",
      field: "amenities", input: "text", placeholder: "Food, AC, gym…",
    },
    { kind: "say", text: "Perfect. {area} at around ₹{budget} for {date} — I'm sending 2–3 matching options on WhatsApp right now." },
    { kind: "listen", text: "Listen for: who decides (parents?), urgency, and whether they're comparing other PGs." },
  ],
  2: [
    { kind: "say", text: "Hi {name}, did you get a chance to look at the options I sent for {area}?" },
    {
      kind: "ask", text: "Which one felt closest to what you want? Let's lock that as your first visit.",
      field: "property", input: "text", placeholder: "Property name",
    },
    {
      kind: "ask", text: "How many did you shortlist? I'll plan the visit route around them.",
      field: "shortlist", input: "number", placeholder: "2",
    },
    { kind: "say", text: "From {property} to {work}, the commute is workable — I'll confirm the exact time on the visit." },
    {
      kind: "ask", text: "Is that commute comfortable for you daily?",
      field: "commuteOk", input: "choice", choices: ["Yes, works", "Tight but ok", "Too far"],
    },
    {
      kind: "ask", text: "Do you want to visit in person, or should I do a video walkthrough with you?",
      field: "tourMode", input: "choice", choices: ["Physical visit", "Video tour"],
    },
    { kind: "say", text: "I'll book it and share the location pin plus my number — ask for me at the gate." },
    { kind: "listen", text: "Listen for: hesitation on date, someone else joining the visit, budget shifting." },
  ],
  3: [
    { kind: "say", text: "Hi {name}, I saw you visited {property} — how was it, honestly?" },
    {
      kind: "ask", text: "What did you like, and what put you off?",
      field: "reaction", input: "text", placeholder: "Liked room, worried about food",
    },
    {
      kind: "ask", text: "If we sort that one thing, is this the place you'd take?",
      field: "objection", input: "choice", choices: ["Price", "Location", "Room/amenities", "Food", "Parents", "Comparing", "None"],
    },
    { kind: "say", text: "Let me put the full number in writing — rent, deposit, notice, what's included. No surprises later." },
    {
      kind: "ask", text: "Shall I send the quotation now on WhatsApp?",
      field: "quotation", input: "choice", choices: ["Sent", "Sending now", "Not yet"],
    },
    {
      kind: "ask", text: "And by when will you take the call? I'll hold the bed till then.",
      field: "decisionBy", input: "date",
    },
    { kind: "listen", text: "Listen for: real blocker vs polite excuse. Name it now or it becomes a no-update." },
  ],
  4: [
    { kind: "say", text: "Hi {name}, you had asked about {objection} — here's exactly how we handle it." },
    { kind: "say", text: "Your all-in for {property} is ₹{budget} a month, move-in {date}. Deposit and notice are as per the quotation I sent." },
    {
      kind: "ask", text: "Are we good to block the bed today with the token?",
      field: "quotation", input: "choice", choices: ["Sent", "Token paid", "Not yet"],
    },
    {
      kind: "ask", text: "If not today, what's the exact date you'll confirm?",
      field: "decisionBy", input: "date",
    },
    { kind: "say", text: "Once the token is in, I'll share the agreement, onboarding steps and your check-in slot." },
    { kind: "listen", text: "Listen for: parents / roommate approval, competing offer, deposit affordability." },
  ],
  5: [
    { kind: "say", text: "Hi {name}, this is Gharpayy — you were looking at {area} earlier. Not chasing, just checking where you landed." },
    {
      kind: "ask", text: "Did you finalise something else, or is the plan still open?",
      field: "objection", input: "choice", choices: ["Took another place", "Plan postponed", "Still deciding", "Budget issue", "None"],
    },
    {
      kind: "ask", text: "If the plan just shifted, what's the new move-in date?",
      field: "moveInDate", input: "date",
    },
    {
      kind: "ask", text: "Has the budget or area changed since we spoke?",
      field: "budget", input: "number", placeholder: "18000",
    },
    { kind: "say", text: "I'll keep you on a light follow-up and ping you when something in {area} opens under your budget." },
    { kind: "listen", text: "Listen for: a dated reason to reconnect. No date = this lead stays dead." },
  ],
};

export function callScript(call: CallNumber): ScriptLine[] {
  return SCRIPTS[call] ?? SCRIPTS[1];
}

export function coreValue(lead: Lead, field: CoreField): string {
  if (field === "budget") return lead.budget > 0 ? String(lead.budget) : "";
  if (field === "moveInDate") return lead.moveInDate ? lead.moveInDate.slice(0, 10) : "";
  return lead.preferredArea ?? "";
}

export function fieldValue(lead: Lead, dossier: LeadDossier, field: FieldKey): string {
  if (field === "budget" || field === "moveInDate" || field === "preferredArea") {
    return coreValue(lead, field);
  }
  return dossier[field] ?? "";
}

/** Fill the spoken line with what we already know so it reads naturally. */
export function renderLine(text: string, lead: Lead, dossier: LeadDossier, me: string): string {
  const budget = lead.budget > 0 ? `${(lead.budget / 1000).toFixed(0)}k` : "your budget";
  const date = lead.moveInDate ? new Date(lead.moveInDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "your move-in date";
  return text
    .replace(/\{name\}/g, lead.name || "there")
    .replace(/\{me\}/g, me || "Gharpayy")
    .replace(/\{area\}/g, lead.preferredArea || "your area")
    .replace(/₹\{budget\}/g, lead.budget > 0 ? `₹${budget}` : budget)
    .replace(/\{budget\}/g, budget)
    .replace(/\{date\}/g, date)
    .replace(/\{work\}/g, dossier.workLocation || "your office")
    .replace(/\{property\}/g, dossier.property || "the property")
    .replace(/\{objection\}/g, dossier.objection || "your concern");
}

/** Everything the script asks for, across all five calls — used by the header strip. */
export const ALL_ASK_FIELDS: FieldKey[] = Array.from(
  new Set(
    ([1, 2, 3, 4, 5] as CallNumber[]).flatMap((c) =>
      callScript(c).filter((l) => l.field).map((l) => l.field as FieldKey),
    ),
  ),
);
