// Lead labelling catalog — the shared vocabulary the Control Tower uses to
// steer the floor without writing a paragraph every time.
//
// Every label carries its own operating manual: why it exists, exactly how to
// execute it, what NOT to do, what can go wrong, and the if/else branches the
// owner must follow. One word is never enough — a label is an instruction.

import { SUB_LABELS } from "./sub-labels";
export { LABEL_GROUPS, GROUP_BY_ID, type LabelGroupDef } from "./groups";

export type LabelSeverity = "critical" | "action" | "coaching" | "positive";

export interface LabelBranch {
  /** The condition the person on the floor is looking at. */
  condition: string;
  /** What they do when that condition is true. */
  then: string;
}

export interface LeadLabelDef {
  id: string;
  /** Header group this sub-label lives under. See labels/groups.ts. */
  group: string;
  /** The exact sentence the Control Tower wants the owner to read. */
  label: string;
  short: string;
  severity: LabelSeverity;
  /** One-tap note starters so the reviewer never leaves the note empty. */
  quickNotes?: string[];

  /** Hours within which the labelled lead must be actioned. */
  slaHours: number;
  /** Why this label exists at all — the business reason, not the feature reason. */
  why: string;
  /** Step-by-step execution. Numbered, no ambiguity. */
  howToExecute: string[];
  /** Hard don'ts. Every one of these has burned a real booking before. */
  whatNotToDo: string[];
  /** Failure modes to expect and pre-empt. */
  problemsThatCanOccur: string[];
  /** The if/else the owner walks through instead of guessing. */
  branches: LabelBranch[];
  /** How the Control Tower knows the label was actually honoured. */
  doneWhen: string;
}

export const CORE_LABELS: LeadLabelDef[] = [
  {
    id: "priority", group: "speed",
    label: "Please see this lead on priority",
    short: "Priority",
    severity: "critical",
    slaHours: 1,
    why:
      "Some leads carry a move-in date, a budget or an intent signal that decays in hours, not days. " +
      "If this lead sits in the normal queue it will be worked at position 40 and by then the customer " +
      "has already paid a token somewhere else. This label pulls one lead to the front of one person's " +
      "day without reshuffling the whole board.",
    howToExecute: [
      "Open the lead and read the last three customer messages before you type anything — the priority reason is almost always sitting in them.",
      "Call first, do not chat first. A priority label means the fastest channel, and voice is the fastest channel.",
      "If the call connects, get one commitment on the call itself: a tour slot, a budget confirmation, or a payment date. Do not end with 'I will send details'.",
      "If the call does not connect, send a WhatsApp within 2 minutes referencing something specific from their earlier message, then retry the call after 20 minutes.",
      "Log the outcome on the lead the same hour. An unlogged priority action is treated as no action.",
    ],
    whatNotToDo: [
      "Do not mass-apply this label. If more than ~10% of open leads are priority, the label means nothing and the floor starts ignoring it.",
      "Do not label and walk away — a label is not a handoff. If nobody owns the lead, claim it or assign it in the same minute.",
      "Do not send a generic template as the first priority touch. The customer instantly recognises it and the urgency is wasted.",
      "Do not stack this with three other labels at once; the owner will not know which instruction wins.",
    ],
    problemsThatCanOccur: [
      "Priority inflation — everything becomes urgent and the real urgent lead is lost. Guard by capping the number of live priority labels per person.",
      "The owner is on a tour or a call block and physically cannot pick it up within the hour. Reassign instead of waiting.",
      "The lead is a duplicate of one already being worked, and the customer gets called twice by two people. Search by phone before labelling.",
      "The label stays on forever, so the lead permanently shows red and the signal decays. Clear it once the priority action is done.",
    ],
    branches: [
      { condition: "The lead has a move-in date within 7 days", then: "Call now, and do not close the call without a tour slot or a reason the tour cannot happen." },
      { condition: "The lead is moving in more than 30 days out", then: "This is probably not a priority. Downgrade the label and set a dated follow-up instead." },
      { condition: "The lead is already claimed by someone at capacity", then: "Reassign to an available owner in the same zone rather than adding to a blocked queue." },
      { condition: "No answer after two calls and one message", then: "Keep the label for one more cycle, switch to a different hour of day, then downgrade to a normal follow-up." },
    ],
    doneWhen: "A logged touch exists on the lead, dated after the label was applied, with an outcome and a next action.",
  },
  {
    id: "no-question", group: "questions",
    label: "No question is sent to this lead",
    short: "No question sent",
    severity: "action",
    slaHours: 4,
    why:
      "A conversation where we only broadcast is not a conversation. If we never asked anything, we do " +
      "not know the budget, the move-in date, the occupancy preference or who actually decides. Every " +
      "later step — matching, pricing, closing — is then a guess. This label flags a chat that is " +
      "technically active but informationally empty.",
    howToExecute: [
      "Open the actual chat (in the app or in WhatsApp) and scroll the full thread — confirm with your own eyes that no question mark from our side exists.",
      "Identify the single biggest missing fact: budget, move-in date, area, occupancy, or decision-maker.",
      "Ask exactly one question about that fact. One question gets answered; four questions get ignored.",
      "Phrase it as a choice, not an essay: 'Are you looking to move in this week or next month?' beats 'When are you planning to move?'.",
      "Once the customer replies, write the answer onto the lead record — not just into the chat.",
    ],
    whatNotToDo: [
      "Do not fire a questionnaire. A five-question block reads like a form and kills the reply rate.",
      "Do not ask something the customer already answered earlier in the thread — that is the fastest way to lose trust.",
      "Do not count a rhetorical question ('Shall I send options?') as a real qualifying question.",
      "Do not remove this label until an answer actually arrives; asking is not the same as knowing.",
    ],
    problemsThatCanOccur: [
      "The customer answers with one word and we still learn nothing — follow with a single clarifier, not silence.",
      "The question arrives at a bad hour and gets buried; check the timestamp pattern of their earlier replies and match it.",
      "Two people ask the same question on the same thread. Claim ownership before asking.",
      "The answer lands in chat but never reaches the lead record, so the next person asks again.",
    ],
    branches: [
      { condition: "The thread has customer messages but zero questions from us", then: "Ask the one highest-value qualifying question immediately." },
      { condition: "We asked, but the customer never answered", then: "Switch the label to 'Please take follow-up like this' and use a different channel or a different hour." },
      { condition: "The customer volunteered everything without being asked", then: "Clear the label, confirm the facts back to them in one line, and move to matching." },
      { condition: "The chat is older than 7 days with no reply", then: "Do not open with a question — open with a value message, then ask." },
    ],
    doneWhen: "At least one qualifying question was sent AND the answer is recorded on the lead.",
  },
  {
    id: "ask-question", group: "questions",
    label: "Please send them some question",
    short: "Send a question",
    severity: "action",
    slaHours: 6,
    why:
      "This is the coaching twin of the label above. The chat may already have questions, but not the " +
      "right ones — we know the area but not the budget, or the budget but not who signs. Progress stalls " +
      "because the next question was never asked. This label names the specific gap so the owner does not " +
      "have to guess what the Control Tower saw.",
    howToExecute: [
      "Read the note attached to the label — the Control Tower should have named the exact gap there.",
      "Pick the question that unlocks the next step, not the question that is easiest to ask.",
      "Send it in the channel the customer is already replying on. Do not open a new channel just to ask.",
      "Give a reason with the question: 'So I only send you places you'll actually like — is your budget closer to 12k or 18k?'.",
      "Set a 24-hour follow-up on the lead at the same time you send it.",
    ],
    whatNotToDo: [
      "Do not ask without context. A bare question after two days of silence feels like an interrogation.",
      "Do not ask a question whose answer you can look up in the record yourself.",
      "Do not ask and then go quiet for three days — the follow-up is part of the instruction.",
      "Do not paste the label text itself into the customer chat.",
    ],
    problemsThatCanOccur: [
      "The gap named in the label is wrong because the Control Tower read an older version of the thread — verify before sending.",
      "The customer feels re-qualified and drops off. Anchor every question to a benefit for them.",
      "The question is sent but the answer is never actioned, so the same gap reappears next week.",
      "Language mismatch — the customer writes in Hindi/Kannada and we ask in formal English. Match their language.",
    ],
    branches: [
      { condition: "Budget is unknown", then: "Ask a two-option range question, never an open 'what is your budget'." },
      { condition: "Move-in date is unknown", then: "Ask 'this week, this month, or later' — buckets convert better than dates." },
      { condition: "Decision-maker is unknown", then: "Ask who else needs to see the place before they book, and offer to include them in the tour." },
      { condition: "Everything is known and they are still not moving", then: "This is not a question problem. Switch to an objection label and escalate to a call." },
    ],
    doneWhen: "The named gap is filled on the lead record and a follow-up is scheduled.",
  },
  {
    id: "follow-up-like-this", group: "followup",
    label: "Please take follow-up like this",
    short: "Follow up like this",
    severity: "coaching",
    slaHours: 12,
    why:
      "Most leads are lost to a weak second touch, not a weak first touch. 'Any update?' is not a " +
      "follow-up — it hands the work back to the customer. This label lets the Control Tower attach the " +
      "exact shape of the follow-up they want to see, so coaching happens on a real lead instead of in a " +
      "meeting three days later.",
    howToExecute: [
      "Read the model follow-up written in the label note — that is the pattern to copy, not the words to paste verbatim.",
      "Rewrite it in your own voice with the customer's specifics: their area, their date, their budget, the property they saw.",
      "Lead with new information (a new unit, a price hold, a slot opening), then make one clear ask.",
      "Send it, then set the next follow-up before you close the lead — never leave a lead without a next dated action.",
      "Mark the label complete so the reviewer can compare your version to the model.",
    ],
    whatNotToDo: [
      "Do not copy-paste the model message across ten leads. Reviewers can see it and customers can feel it.",
      "Do not follow up with no new information — that is a nudge, not a follow-up.",
      "Do not follow up more than once a day on the same thread unless the customer is actively replying.",
      "Do not use 'Any update?', 'Hello?', or a lone question mark. Ever.",
    ],
    problemsThatCanOccur: [
      "The model follow-up does not fit the situation because the lead moved on since it was written — adapt, do not force it.",
      "Over-following on a cold lead pushes them into blocking us. Respect the cadence ladder.",
      "The owner copies the tone but drops the ask, so the message is warm and useless.",
      "Follow-up is sent from a different number than the original thread, so context is lost.",
    ],
    branches: [
      { condition: "The customer replied before but has gone quiet", then: "Follow up with new inventory or a price/slot change, plus a single yes/no ask." },
      { condition: "The customer never replied at all", then: "Change the channel and the hour before you change the words." },
      { condition: "The customer said 'later'", then: "Book the follow-up for the date they named, confirm that date back to them, and stop touching until then." },
      { condition: "Three follow-ups with zero reply", then: "Send one polite close-the-loop message, then move the lead to nurture. Do not keep burning the thread." },
    ],
    doneWhen: "A follow-up matching the model pattern is logged, and the next dated action exists on the lead.",
  },
  {
    id: "wrong-info", group: "risk",
    label: "Wrong or unverified information was shared",
    short: "Wrong info",
    severity: "critical",
    slaHours: 2,
    why:
      "A wrong price, a wrong availability or a wrong amenity does not just lose one booking — it produces " +
      "a cancellation, a refund conversation and an owner complaint. Catching it inside the chat is ten " +
      "times cheaper than catching it after a token payment.",
    howToExecute: [
      "Quote the exact message that contains the wrong information in the label note.",
      "Correct it in the same thread within the hour, plainly: 'Correction on what I shared earlier — the rent is X, not Y.'",
      "Verify the correct value against the property record before sending the correction.",
      "Tell the reviewer what caused the error: stale record, guess, or misread.",
    ],
    whatNotToDo: [
      "Do not delete the original message and pretend it did not happen — customers screenshot.",
      "Do not correct it verbally on a call and leave the wrong number sitting in writing.",
      "Do not blame the system in front of the customer.",
    ],
    problemsThatCanOccur: [
      "The customer already made a decision on the wrong number and now feels misled.",
      "The property record itself is wrong, so the 'correct' value is also wrong — fix the record too.",
      "The correction reads as a bait-and-switch. Lead with an apology and an alternative in the same message.",
    ],
    branches: [
      { condition: "The customer has not yet acted on the wrong info", then: "Correct immediately and continue normally." },
      { condition: "The customer already scheduled or paid based on it", then: "Escalate to the Control Tower before messaging — this needs a decision, not a correction." },
      { condition: "The source record is wrong", then: "Fix the property record first, then correct the customer, then flag the record owner." },
    ],
    doneWhen: "The correction is visible in the thread and the source record is verified or fixed.",
  },
  {
    id: "great-work", group: "positive",
    label: "Great work — use this chat as a floor example",
    short: "Floor example",
    severity: "positive",
    slaHours: 24,
    why:
      "Quality systems that only punish produce defensive teams. Marking what good looks like, on a real " +
      "chat with a real customer, teaches faster than any deck and makes the negative labels land better.",
    howToExecute: [
      "Name in the note the specific move that was good — the question, the timing, the objection handle — not 'good job'.",
      "Share it in the daily huddle with the customer's identity removed.",
      "Add the pattern to the follow-up model library so it can be attached to other leads.",
    ],
    whatNotToDo: [
      "Do not praise outcomes that were luck. Praise the behaviour that was repeatable.",
      "Do not share customer phone numbers or personal details when circulating the example.",
    ],
    problemsThatCanOccur: [
      "The team copies the wording, not the thinking, and it becomes a new template.",
      "Praise concentrates on one or two people and demotivates the rest — spread the sampling.",
    ],
    branches: [
      { condition: "The good move is repeatable by anyone", then: "Promote it into the playbook." },
      { condition: "The good move depended on that person's relationship or luck", then: "Praise privately, do not systematise it." },
    ],
    doneWhen: "The pattern is written down somewhere reusable, not just complimented.",
  },
];

/** The six original instructions, pinned to the top of every picker. */
export const CORE_LABEL_IDS = CORE_LABELS.map((l) => l.id);

/** Core instructions plus the long tail of grouped sub-labels. */
export const LEAD_LABELS: LeadLabelDef[] = [...CORE_LABELS, ...SUB_LABELS];

export function labelsInGroup(groupId: string): LeadLabelDef[] {
  return LEAD_LABELS.filter((l) => l.group === groupId);
}

export const LABEL_BY_ID: Record<string, LeadLabelDef> = Object.fromEntries(
  LEAD_LABELS.map((l) => [l.id, l]),
);

export const SEVERITY_STYLE: Record<LabelSeverity, string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  action: "border-primary/40 bg-primary/10 text-primary",
  coaching: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  positive: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export const SEVERITY_LABEL: Record<LabelSeverity, string> = {
  critical: "Drop everything",
  action: "Do it today",
  coaching: "Coaching",
  positive: "Recognition",
};
