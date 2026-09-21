// "Definitely Close" — the promise layer of the CRM.
//
// A lead is worthless as data if nobody will say WHEN it closes. This module
// defines the deadline windows a closer can commit to, and each window carries
// its own operating manual: why the window exists, how to execute inside it,
// what not to do, what usually goes wrong, and the if/else the closer follows
// when reality moves.

export type CloseWindowId =
  | "3h"
  | "24h"
  | "48h"
  | "3d"
  | "7d"
  | "15d"
  | "30d"
  | "custom";

export interface CloseWindowDef {
  id: CloseWindowId;
  label: string;
  short: string;
  /** Hours from the moment of the promise. `null` for custom (date picked by hand). */
  hours: number | null;
  /** Tone used in the UI. */
  tone: "now" | "soon" | "week" | "long";
  /** The business reason this window exists at all. */
  why: string;
  /** Numbered execution inside this window — no ambiguity. */
  howToExecute: string[];
  /** Hard don'ts. Each one has killed a real booking. */
  whatNotToDo: string[];
  /** Failure modes to expect before they happen. */
  problemsThatCanOccur: string[];
  /** If/else the closer walks through instead of guessing. */
  branches: { condition: string; then: string }[];
  /** How the Control Tower verifies the promise was honoured. */
  doneWhen: string;
}

export const CLOSE_WINDOWS: CloseWindowDef[] = [
  {
    id: "3h",
    label: "I will close this within 3 hours",
    short: "3 hours",
    hours: 3,
    tone: "now",
    why:
      "A 3-hour promise means the customer is already decided and only the paperwork and payment link stand " +
      "in the way. This is the only window that should show up on the Control Tower's 'money landing today' " +
      "line. If you pick it without a decided customer you are inflating today's forecast, and the whole board " +
      "stops being believable.",
    howToExecute: [
      "Before promising, confirm three facts out loud on the call: the exact room/property, the exact move-in date, and the exact amount payable today.",
      "Send the payment link or booking form inside 10 minutes of the promise — not at the end of the window.",
      "Put a hard callback at the 60-minute mark. Do not wait for the customer to come back to you.",
      "Keep the chat window open on WhatsApp; reply inside 2 minutes for the whole 3 hours.",
      "The moment payment lands, mark the commitment 'kept' and attach the booking id.",
    ],
    whatNotToDo: [
      "Do not pick 3h because your manager is watching the board. A false 3h is worse than an honest 7d.",
      "Do not send the link and go silent — 3h promises die in silence, not in objections.",
      "Do not start a fresh property comparison inside a 3h window; that resets the customer's decision.",
    ],
    problemsThatCanOccur: [
      "Payment gateway or UPI limit failure at the last step — have a second payment route ready before you promise.",
      "The decision maker (parent/spouse) was never on the call and blocks it at the end.",
      "Room gets blocked by another closer mid-window because it was never held.",
    ],
    branches: [
      { condition: "Customer stops replying for 45 minutes", then: "Call once, then send a voice note with the exact next step and a deadline. Do not send five texts." },
      { condition: "Payment fails technically", then: "Switch route immediately (UPI → link → bank transfer) and extend by 3h with the reason logged. Do not mark it broken." },
      { condition: "A new objection appears (price, family, another option)", then: "Re-promise into 48h with the objection recorded — do not silently let the 3h expire." },
      { condition: "Room is no longer available", then: "Mark 'blocked', log the inventory reason, and re-promise only after an alternative is confirmed held." },
    ],
    doneWhen: "Money received and the booking id is attached to the commitment.",
  },
  {
    id: "24h",
    label: "I will close this within 24 hours",
    short: "24 hours",
    hours: 24,
    tone: "now",
    why:
      "24h is the window for a customer who has seen the room (physically or on video), likes it, and needs one " +
      "night — usually to talk to family or check salary credit. It is the highest-yield window in the system " +
      "because intent is hot and the objection is known.",
    howToExecute: [
      "Write the single blocker in the note field. '24h' with no blocker is a guess, not a commitment.",
      "Agree an exact callback time with the customer before you hang up, and repeat it back on WhatsApp.",
      "Hold or soft-block the room for the night and tell the customer you did — scarcity is honest here.",
      "Call at the agreed time, not before and not three hours later.",
    ],
    whatNotToDo: [
      "Do not leave the blocker as 'thinking'. Thinking is not a blocker; money, family, date or location is.",
      "Do not send the same follow-up message twice in one night.",
      "Do not promise a discount to buy the 24h — you will pay for it at closing.",
    ],
    problemsThatCanOccur: [
      "Family says no overnight and the customer avoids the call the next morning.",
      "A competitor visit happens in the evening you did not know about.",
      "Salary credit gets delayed and the money simply is not there.",
    ],
    branches: [
      { condition: "Blocker is family approval", then: "Get the family member on a 3-minute call yourself today. Do not delegate it to the customer." },
      { condition: "Blocker is salary/date of funds", then: "Re-promise to the exact credit date and take a small token today if allowed." },
      { condition: "No answer at the agreed callback", then: "One call + one voice note. Then re-promise to 48h with 'unreachable' logged." },
    ],
    doneWhen: "Payment received, or the commitment is honestly re-promised with a recorded reason before it expires.",
  },
  {
    id: "48h",
    label: "I will close this within 48 hours",
    short: "48 hours",
    hours: 48,
    tone: "soon",
    why:
      "48h covers the customer who still has one real step left — a second visit, a family video call, or a " +
      "document. It is the window where most bookings actually live, so the quality of your 48h list is the " +
      "quality of your week.",
    howToExecute: [
      "Name the one remaining step in the note: 'second visit Saturday 11am' beats 'following up'.",
      "Book that step into the calendar now, with a time, not 'sometime tomorrow'.",
      "Touch the lead at least twice inside the window — once with value (photos, area info, offer), once with the ask.",
      "At the 36-hour mark, decide honestly: close, or re-promise with a reason.",
    ],
    whatNotToDo: [
      "Do not use 48h as a parking slot for leads you have not spoken to. That is what the follow-up queue is for.",
      "Do not let both days pass with only WhatsApp — at least one voice contact is mandatory.",
    ],
    problemsThatCanOccur: [
      "The second visit gets cancelled and nothing replaces it.",
      "Customer goes quiet after the value message because there was no ask attached.",
      "Two closers touch the same lead with different offers.",
    ],
    branches: [
      { condition: "The planned step happens and goes well", then: "Upgrade the commitment to 3h or 24h and drive payment the same day." },
      { condition: "The planned step slips", then: "Re-promise once with the new date. A second slip means the window must go to 7d and the objection re-opened." },
      { condition: "Customer stops replying entirely", then: "Log 'unresponsive', hand it to the revival cadence, and do not keep a dead 48h on the board." },
    ],
    doneWhen: "Booked, or re-promised with the new step and date on record.",
  },
  {
    id: "3d",
    label: "I will close this within 3 days",
    short: "3 days",
    hours: 72,
    tone: "soon",
    why:
      "3 days is for a customer whose move-in is near but who has a fixed external dependency — a notice period, " +
      "a parent arriving, or a competing option they must see. You are not waiting; you are working a known " +
      "dependency to a date.",
    howToExecute: [
      "Write the dependency and its owner in the note: who has to do what, by when.",
      "Plan three touches across the three days, each with a different reason to contact.",
      "Keep the inventory question live — confirm daily that the room is still available and tell the customer.",
    ],
    whatNotToDo: [
      "Do not go silent on day two. Day two silence is where 3-day promises die.",
      "Do not re-open the property search unless the customer explicitly rejects the current option.",
    ],
    problemsThatCanOccur: [
      "The room is gone by day three and trust collapses.",
      "The competing option closes them first because they got a same-day follow-up and you did not.",
    ],
    branches: [
      { condition: "The dependency clears early", then: "Pull the commitment forward to 24h and ask for payment the same day." },
      { condition: "The room gets taken", then: "Call before the customer finds out from anyone else, present two alternatives, and re-promise." },
      { condition: "Customer starts comparing again on day two", then: "Re-open discovery, log the objection, and reset the window honestly to 7d." },
    ],
    doneWhen: "Booked, or the dependency date has moved and is re-promised with the new date.",
  },
  {
    id: "7d",
    label: "I will close this within 7 days",
    short: "7 days",
    hours: 168,
    tone: "week",
    why:
      "7 days is a pipeline promise, not a today promise. It says: this is real, the move-in is inside the month, " +
      "and I have a plan for the week. The Control Tower reads this list to forecast next week, not today.",
    howToExecute: [
      "Write the weekly plan in the note: which day you visit, which day you ask, which day you close.",
      "Schedule the tour or the second conversation inside the first 48 hours of the week — never in the last two days.",
      "Review the commitment mid-week and either upgrade it to 48h or record why it is slipping.",
    ],
    whatNotToDo: [
      "Do not use 7d as the default for every lead you do not want to work today.",
      "Do not touch the lead only on day one and day seven.",
    ],
    problemsThatCanOccur: [
      "The whole week passes with zero contact and the promise auto-breaks.",
      "The customer's move-in date shifts and nobody updates the commitment.",
    ],
    branches: [
      { condition: "Tour done and feedback positive", then: "Upgrade to 48h immediately — do not keep the lead in a 7-day box out of habit." },
      { condition: "Move-in date moves further out", then: "Change the date on the commitment with the reason. The history keeps both dates." },
      { condition: "No contact by mid-week", then: "It is not a 7-day close; downgrade to 30d or hand it to nurture and say so." },
    ],
    doneWhen: "Booked inside the week, or explicitly re-promised or downgraded with a written reason.",
  },
  {
    id: "15d",
    label: "I will close this within 15 days",
    short: "15 days",
    hours: 360,
    tone: "long",
    why:
      "15 days handles a genuine future move-in that is still worth owning — a joining date, a semester start, " +
      "a lease ending. The risk is neglect: these leads are real but invisible, so they need a cadence, not a memory.",
    howToExecute: [
      "Set the exact move-in date on the lead, not just the window.",
      "Agree a fixed weekly check-in slot with the customer and keep it.",
      "Send one piece of area or inventory value per week so you stay the default option.",
    ],
    whatNotToDo: [
      "Do not chase for payment weekly; you will burn the relationship before the date arrives.",
      "Do not let the lead leave your list — a 15-day promise you forget is a lost booking with your name on it.",
    ],
    problemsThatCanOccur: [
      "The joining/semester date changes and nobody hears about it.",
      "Inventory shown today is gone by the actual move-in date.",
    ],
    branches: [
      { condition: "Move-in date confirms and comes within a week", then: "Upgrade to 7d or 48h and start the closing sequence." },
      { condition: "Date pushes past a month", then: "Move the commitment to 30d or nurture, with the new date recorded." },
      { condition: "Customer asks to hold a room now", then: "Take a token if policy allows and mark the commitment as protected." },
    ],
    doneWhen: "Converted to a nearer window on schedule, or booked.",
  },
  {
    id: "30d",
    label: "I will close this within a month",
    short: "1 month",
    hours: 720,
    tone: "long",
    why:
      "A month-out promise keeps a real future customer inside the system instead of losing them to a spreadsheet. " +
      "It exists so the Control Tower can separate 'not now' from 'not real'.",
    howToExecute: [
      "Record the move-in month and the reason it cannot happen sooner.",
      "Set a fortnightly cadence and stick to it — two touches, both with value.",
      "Re-confirm budget and area once mid-month; both drift over 30 days.",
    ],
    whatNotToDo: [
      "Do not count a 30-day promise in today's or this week's closing forecast.",
      "Do not stop qualifying — a month is long enough for the requirement to change completely.",
    ],
    problemsThatCanOccur: [
      "The lead is actually dead and the 30d window is being used to hide it.",
      "Requirement changes and you keep pitching the old option.",
    ],
    branches: [
      { condition: "Customer becomes ready early", then: "Upgrade the window the same day and treat it as a hot lead." },
      { condition: "Two cadence touches go unanswered", then: "Downgrade to nurture and record 'unresponsive' — do not keep a fake month promise alive." },
    ],
    doneWhen: "Upgraded to a nearer window with a real date, or honestly closed out as nurture.",
  },
  {
    id: "custom",
    label: "I will close this on a specific date",
    short: "Custom date",
    hours: null,
    tone: "week",
    why:
      "Sometimes the close is tied to a real calendar event — a salary date, a flight, a lease end, a parent's " +
      "visit. A precise date beats a generic window every single time, because it is checkable.",
    howToExecute: [
      "Pick the exact date and time the money can realistically move, not the date you hope to talk to them.",
      "Write the calendar event driving that date in the note.",
      "Set your own reminder 24 hours before, and plan the ask for the morning of that date.",
    ],
    whatNotToDo: [
      "Do not pick a far-off date just to get the lead off today's board.",
      "Do not change the date silently — every change is stored and reviewed.",
    ],
    problemsThatCanOccur: [
      "The external event moves and the date becomes meaningless.",
      "The date lands on a holiday or weekend when payments or paperwork stall.",
    ],
    branches: [
      { condition: "The driving event moves", then: "Change the date with the reason. History keeps every version so the review is fair." },
      { condition: "The date arrives with no contact", then: "The commitment breaks. Own it in the daily review and re-promise honestly." },
    ],
    doneWhen: "Money lands on or before the promised date, or the date is changed with a written reason before it passes.",
  },
];

export const WINDOW_BY_ID: Record<string, CloseWindowDef> = Object.fromEntries(
  CLOSE_WINDOWS.map((w) => [w.id, w]),
);

export const TONE_STYLE: Record<CloseWindowDef["tone"], string> = {
  now: "bg-destructive/10 text-destructive border-destructive/30",
  soon: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
  week: "bg-primary/10 text-primary border-primary/30",
  long: "bg-muted text-muted-foreground border-border",
};

/** Common honest reasons a promise moves — kept short so they get used. */
export const CHANGE_REASONS = [
  "Customer asked for more time",
  "Family / decision maker not available",
  "Funds not credited yet",
  "Room no longer available",
  "Second visit scheduled",
  "Customer unreachable",
  "Comparing another property",
  "Move-in date changed",
  "Document / paperwork pending",
  "My mistake — promise was too optimistic",
];

/** Blockers a closer names when promising. Empty blocker = weak promise. */
export const CLOSE_BLOCKERS = [
  "Nothing — only payment left",
  "Family approval",
  "Funds / salary date",
  "Second visit pending",
  "Price negotiation",
  "Comparing other options",
  "Move-in date not fixed",
  "Inventory to confirm",
];

/**
 * "It did not close — what problem came up?"
 * One tap, honest, and short enough that people actually answer it.
 */
export const CLOSE_PROBLEMS = [
  "Customer went silent",
  "Customer chose another property",
  "Budget / price too high",
  "Funds not arranged yet",
  "Family said no",
  "Room no longer available",
  "Move-in date pushed",
  "Visit did not happen",
  "Paperwork / documents stuck",
  "I could not get to it in time",
] as const;

/** Generic next steps offered on every promise, on top of the window's own manual. */
export const CLOSE_STEPS = [
  "Call the customer now",
  "Send the payment link",
  "Share the room photos / video",
  "Confirm the room hold with supply",
  "Get the decision maker on the call",
  "Schedule the visit",
  "Send the agreement / documents",
  "Follow up the morning of the deadline",
] as const;
