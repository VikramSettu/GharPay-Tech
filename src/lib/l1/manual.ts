// Manual L1 review — the human path.
//
// The AI path needs a pasted transcript. This path needs nothing but the
// reviewer's eyes on the actual WhatsApp window. The reviewer reads the chat
// in WhatsApp, answers the same questions the engine would have answered, and
// we synthesise the identical L1Analysis so a manual review and an automatic
// review sit side by side on the same zone board with the same scoring.

import { bandOf } from "./engine";
import { CALL_STEPS, CHAT_STEPS } from "./playbook";
import type { L1Analysis, L1Kind, PaymentBlocker, StepResult } from "./types";

/** The four dispositions the floor marks on every chat, every day. */
export type Disposition = "done" | "not-done" | "very-poor" | "not-helping";

export interface DispositionDef {
  id: Disposition;
  label: string;
  meaning: string;
  why: string;
  howToDecide: string[];
  whatNotToDo: string[];
  problems: string[];
  branches: { condition: string; then: string }[];
  consequence: string;
  score: number;
  className: string;
}

export const DISPOSITIONS: DispositionDef[] = [
  {
    id: "done",
    label: "This chat is done",
    meaning: "The conversation reached a real, verifiable end state — booked, tour set, or properly closed.",
    why:
      "'Done' is the only mark that lets a lead leave the working queue. If it is used loosely, dead leads " +
      "disappear from the board while the customer is still deciding, and we lose bookings silently. " +
      "Done must mean a state you could defend to the owner with a screenshot.",
    howToDecide: [
      "Scroll to the last message in the WhatsApp thread and read the final three exchanges.",
      "Confirm one of: payment made, tour scheduled with a date and time, or the customer explicitly said no.",
      "Confirm the last message in the thread is ours OR the customer's reply needs no answer.",
      "Confirm a next action exists on the lead if the outcome was anything other than paid or a hard no.",
    ],
    whatNotToDo: [
      "Do not mark done because the customer stopped replying — silence is 'not done'.",
      "Do not mark done on a promise ('I will pay tomorrow') with no dated follow-up on the lead.",
      "Do not mark done to hit the 100-chat target faster. The count is worthless if the marks are false.",
    ],
    problems: [
      "Premature 'done' hides an active lead from the queue and it goes cold unnoticed.",
      "Two reviewers mark the same chat — always check the reviewed list before starting.",
      "A 'done' chat reopens when the customer comes back; it must be re-queued, not left closed.",
    ],
    branches: [
      { condition: "Payment received", then: "Mark done, and confirm the booking record exists. No follow-up needed." },
      { condition: "Tour scheduled with a date/time", then: "Mark done for the chat, but keep the lead active until the tour outcome is logged." },
      { condition: "Customer said a hard no", then: "Mark done, record the reason, and move the lead to nurture — not to dead, unless the reason is permanent." },
      { condition: "Anything else", then: "It is not done. Use one of the other three marks." },
    ],
    consequence: "Chat leaves the review queue and counts as a clean close.",
    score: 88,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "not-done",
    label: "This chat is not done",
    meaning: "The conversation is alive but unfinished — the next move is ours and it has not been made.",
    why:
      "This is the single most common and most expensive state on the floor. A chat that is 'not done' is " +
      "revenue sitting in a queue with nobody's name on it. Marking it explicitly forces an owner and a " +
      "deadline onto it instead of letting it drift.",
    howToDecide: [
      "Read the last message in the WhatsApp thread and ask one question: whose turn is it?",
      "If the last message is the customer's and it needed a reply, it is not done.",
      "If the last message is ours but contained no ask, it is also not done — a broadcast is not a move.",
      "Attach the lead label that names the missing move so the owner does not have to interpret your mark.",
    ],
    whatNotToDo: [
      "Do not mark 'not done' and leave the note empty — the owner then repeats the same weak move.",
      "Do not use it as a soft version of 'very poor'. If the quality was bad, say the quality was bad.",
      "Do not mark and forget: 'not done' without a re-check tomorrow is just paperwork.",
    ],
    problems: [
      "The queue fills with 'not done' and nobody works it down — cap the open count per owner.",
      "The owner disagrees with the mark; keep the evidence quote so the discussion is about facts.",
      "The customer replies right after you mark it, making the mark stale within minutes.",
    ],
    branches: [
      { condition: "Customer asked something and we never answered", then: "Escalate: apply 'Please see this lead on priority' and set a 1-hour deadline." },
      { condition: "We answered but never asked anything back", then: "Apply 'No question is sent to this lead'." },
      { condition: "We asked but the customer went quiet", then: "Apply 'Please take follow-up like this' with a model message." },
      { condition: "The lead is unclaimed", then: "Assign an owner before you mark it, otherwise the mark has no address." },
    ],
    consequence: "Chat stays in the queue with an owner, a label and a deadline.",
    score: 52,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    id: "very-poor",
    label: "Very poor",
    meaning: "The work itself was bad — wrong information, rude or careless tone, hours of silence, no structure.",
    why:
      "Speed and completeness can be fixed with a nudge. Quality cannot. This mark separates 'behind' from " +
      "'damaging', so coaching goes to the person who is hurting the brand rather than the person who is " +
      "simply busy. Without it, the floor average hides the worst conversations.",
    howToDecide: [
      "Quote the exact message that made it poor — no quote, no 'very poor' mark.",
      "Check the timestamps: a first response gap over an hour during working hours is poor on its own.",
      "Check for wrong or invented information about price, availability or amenities.",
      "Check tone: one-word replies, no greeting, no name, dismissive answers to a real concern.",
    ],
    whatNotToDo: [
      "Do not mark very poor for a bad outcome. Judge the behaviour, not the customer's decision.",
      "Do not deliver this mark publicly by name in a group — coach privately, report anonymously.",
      "Do not stack five very-poor marks on one person in one day without a conversation first.",
    ],
    problems: [
      "The reviewer's standard drifts over time — recalibrate weekly against a shared sample.",
      "The agent was covering for someone else's thread and is being judged for it; check who wrote what.",
      "Repeated very-poor marks with no coaching cause silent attrition rather than improvement.",
    ],
    branches: [
      { condition: "Wrong information was shared", then: "Apply the 'Wrong or unverified information' label and get a correction sent within the hour." },
      { condition: "Response was slow but content was fine", then: "This is a speed issue, not a quality issue — mark 'not done' with a speed note instead." },
      { condition: "Tone was rude to the customer", then: "Escalate to the manager the same day. Do not wait for the daily rollup." },
      { condition: "Same agent, third very-poor this week", then: "Trigger a formal coaching session and pause new lead assignment to them." },
    ],
    consequence: "Feeds the agent's coaching band and shows in the daily quality pulse.",
    score: 24,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  {
    id: "not-helping",
    label: "This guy is not helping",
    meaning: "The agent is present but adding nothing — copy-paste replies, no thinking, no ownership of the outcome.",
    why:
      "This is different from 'very poor'. Nothing rude happened, no rule was broken — and that is exactly " +
      "the problem. The customer is being processed, not helped. These chats look fine in a metric and lose " +
      "every time in the market. Naming this pattern is how a 100x floor separates activity from effort.",
    howToDecide: [
      "Look for the same sentence appearing in multiple different chats from the same agent.",
      "Ask: did the agent add a single fact, option or idea the customer did not already have?",
      "Check whether the customer's actual constraint (budget, date, distance) was ever acknowledged.",
      "Check whether the agent took the next step or handed the work back to the customer ('let me know').",
    ],
    whatNotToDo: [
      "Do not use this as a personal judgement or write it in language you would not say to their face.",
      "Do not apply it to a new joiner in their first two weeks — that is a training gap, mark it as such.",
      "Do not mark it without an example of what helping would have looked like on this exact chat.",
    ],
    problems: [
      "Reads as an attack rather than feedback, and the person disengages further.",
      "The agent is following a bad script they were given — fix the script, not just the person.",
      "The pattern is caused by lead overload; check their open-lead count before concluding it is effort.",
    ],
    branches: [
      { condition: "Same templated reply across many chats", then: "Retrain on personalisation and remove the template from their quick replies." },
      { condition: "Agent is carrying far more leads than capacity", then: "This is a load problem. Rebalance before coaching." },
      { condition: "Agent is new (under 2 weeks)", then: "Mark as training gap and pair them with a floor example chat instead." },
      { condition: "Pattern repeats after coaching", then: "Escalate to the manager with the three example chats attached." },
    ],
    consequence: "Flags an effort pattern, not a one-off — reviewed at the weekly people review.",
    score: 12,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
];

export const DISPOSITION_BY_ID: Record<Disposition, DispositionDef> = Object.fromEntries(
  DISPOSITIONS.map((d) => [d.id, d]),
) as Record<Disposition, DispositionDef>;

/** The manual checklist — what the reviewer answers while looking at WhatsApp. */
export interface ManualInput {
  kind: L1Kind;
  disposition: Disposition;
  /** Playbook step ids the reviewer could see evidence for in the thread. */
  stepsDone: string[];
  /** Minutes to our first reply, as read off the WhatsApp timestamps. */
  firstResponseMin: number | null;
  /** Worst silence gap in minutes. */
  worstGapMin: number | null;
  /** Follow-ups we initiated. */
  agentFollowUps: number;
  /** Customer messages we never answered. */
  unansweredCustomerMsgs: number;
  /** Did we ask questions and were they answered? */
  questionsAsked: number;
  questionsAnswered: number;
  /** Did the agent write like a human, or paste? */
  authorship: "human" | "assisted" | "ai";
  /** Extra-mile moves the reviewer saw. */
  extraValue: string[];
  wowQuote: string;
  dullQuote: string;
  blocker: PaymentBlocker;
  paid: boolean;
  nextStepLocked: boolean;
  nextStepQuote: string;
  hesitation: string[];
}

export function emptyManualInput(kind: L1Kind): ManualInput {
  return {
    kind, disposition: "not-done", stepsDone: [],
    firstResponseMin: null, worstGapMin: null,
    agentFollowUps: 0, unansweredCustomerMsgs: 0,
    questionsAsked: 0, questionsAnswered: 0,
    authorship: "human", extraValue: [],
    wowQuote: "", dullQuote: "",
    blocker: "no-ask", paid: false,
    nextStepLocked: false, nextStepQuote: "", hesitation: [],
  };
}

const BLOCKER_LABEL: Record<PaymentBlocker, string> = {
  paid: "Already paid",
  "price-high": "Price feels high",
  "family-approval": "Needs family / partner approval",
  comparing: "Comparing with other options",
  timing: "Move-in date is not fixed",
  location: "Location does not work",
  inventory: "We did not have the right room",
  trust: "Trust / proof missing",
  unresponsive: "Customer has gone quiet",
  "no-ask": "We never actually asked for the booking",
};

const BLOCKER_UNLOCK: Record<PaymentBlocker, string> = {
  paid: "Confirm the booking record and hand over to onboarding today.",
  "price-high": "Send two options below their number plus one at their number, and name what the extra buys.",
  "family-approval": "Offer a joint call or a video walkthrough with the decision-maker on it.",
  comparing: "Send a one-line honest comparison and a slot that expires — remove the reason to wait.",
  timing: "Anchor on a bucket, not a date: this week, this month, or later. Then book to the bucket.",
  location: "Re-match in the adjacent zone with commute time stated in minutes, not kilometres.",
  inventory: "Escalate to supply for a matching unit today, and tell the customer exactly when you'll revert.",
  trust: "Send verified photos, the exact address, and one existing-resident reference.",
  unresponsive: "Change the channel and the hour before you change the message.",
  "no-ask": "Ask for the booking in one clear sentence. This is the cheapest fix on the board.",
};

const PAY_PROB: Record<PaymentBlocker, number> = {
  paid: 100, "price-high": 45, "family-approval": 55, comparing: 40, timing: 35,
  location: 25, inventory: 30, trust: 40, unresponsive: 15, "no-ask": 50,
};

const PAY_DAYS: Record<PaymentBlocker, number | null> = {
  paid: 0, "price-high": 3, "family-approval": 4, comparing: 5, timing: 9,
  location: 7, inventory: 5, trust: 4, unresponsive: 12, "no-ask": 2,
};

function pct(part: number, whole: number) {
  return whole <= 0 ? 0 : Math.round((part / whole) * 100);
}

/**
 * Turns the human checklist into the same L1Analysis shape the AI path emits,
 * so both kinds of review roll up into one zone board and one payment forecast.
 */
export function analyzeManual(input: ManualInput): L1Analysis {
  const playbook = input.kind === "call" ? CALL_STEPS : CHAT_STEPS;
  const steps: StepResult[] = playbook.map((step) => ({
    step,
    done: input.stepsDone.includes(step.id),
    confirmed: input.stepsDone.includes(step.id),
    atMinute: null,
    evidence: input.stepsDone.includes(step.id) ? "Confirmed by reviewer in WhatsApp" : "",
  }));
  const weightTotal = playbook.reduce((a, s) => a + s.weight, 0) || 1;
  const weightDone = steps.filter((s) => s.done).reduce((a, s) => a + s.step.weight, 0);
  const stepScore = Math.round((weightDone / weightTotal) * 100);

  const frm = input.firstResponseMin;
  const speedScore =
    frm === null ? 50 : frm <= 2 ? 100 : frm <= 5 ? 90 : frm <= 15 ? 75 : frm <= 60 ? 50 : frm <= 240 ? 25 : 8;
  const followScore = Math.max(
    0,
    Math.min(100, 40 + input.agentFollowUps * 20 - input.unansweredCustomerMsgs * 25),
  );
  const understandingScore = input.questionsAsked === 0
    ? 10
    : Math.round(40 + 60 * (input.questionsAnswered / Math.max(1, input.questionsAsked)));
  const extraValuePct = Math.min(100, input.extraValue.length * 25);
  const dispScore = DISPOSITION_BY_ID[input.disposition].score;

  const total = Math.round(
    stepScore * 0.26 +
    speedScore * 0.18 +
    followScore * 0.14 +
    understandingScore * 0.16 +
    extraValuePct * 0.08 +
    dispScore * 0.18,
  );

  const aiLikelihood = input.authorship === "ai" ? 88 : input.authorship === "assisted" ? 52 : 12;

  return {
    kind: input.kind,
    messages: [],
    agentMsgs: 0,
    customerMsgs: 0,
    durationMin: null,
    steps,
    stepScore,
    missedSteps: steps.filter((s) => !s.done),
    speed: {
      firstResponseMin: frm,
      medianResponseMin: null,
      worstGapMin: input.worstGapMin,
      worstGapAfter: "",
      ghostedMin: null,
      score: speedScore,
      verdict:
        frm === null ? "Reviewer did not record a first-response time"
          : frm <= 5 ? `First reply in ${frm} min — this is the standard`
          : frm <= 60 ? `First reply in ${frm} min — acceptable, not winning`
          : `First reply took ${frm} min — the lead was cold before we spoke`,
    },
    followUp: {
      agentInitiated: input.agentFollowUps,
      expected: Math.max(1, input.agentFollowUps + (input.unansweredCustomerMsgs > 0 ? 1 : 0)),
      unansweredCustomerMsgs: input.unansweredCustomerMsgs,
      lastMoveBy: input.unansweredCustomerMsgs > 0 ? "customer" : "agent",
      score: followScore,
      verdict:
        input.unansweredCustomerMsgs > 0
          ? `${input.unansweredCustomerMsgs} customer message(s) left unanswered — the ball is still with us`
          : input.agentFollowUps === 0
            ? "No follow-up was initiated by us at all"
            : `${input.agentFollowUps} follow-up(s) initiated by us`,
    },
    authorship: {
      aiLikelihood,
      verdict: input.authorship,
      signals: [
        input.authorship === "ai"
          ? "Reviewer judged the replies as templated / machine-written"
          : input.authorship === "assisted"
            ? "Reviewer judged the replies as partly templated"
            : "Reviewer judged the replies as genuinely written by a person",
      ],
    },
    understanding: {
      questionsAsked: input.questionsAsked,
      questionsAnswered: input.questionsAnswered,
      mirroredFacts: [],
      ignored: [],
      score: understandingScore,
    },
    extraValue: input.extraValue.map((label, i) => ({ id: `x${i}`, label, quote: "" })),
    extraValuePct,
    wow: input.wowQuote ? { quote: input.wowQuote, atMinute: null, why: "Reviewer picked this as the strongest moment" } : null,
    dull: input.dullQuote ? { quote: input.dullQuote, atMinute: null, why: "Reviewer picked this as the weakest moment" } : null,
    money: {
      paid: input.paid,
      blocker: input.paid ? "paid" : input.blocker,
      blockerLabel: BLOCKER_LABEL[input.paid ? "paid" : input.blocker],
      evidence: "Reviewer read the thread directly in WhatsApp",
      payProbability: input.paid ? 100 : Math.max(5, Math.min(95, PAY_PROB[input.blocker] + (input.nextStepLocked ? 15 : -10))),
      expectedPayInDays: input.paid ? 0 : PAY_DAYS[input.blocker],
      expectedPayDate:
        input.paid
          ? new Date().toISOString()
          : PAY_DAYS[input.blocker] === null
            ? null
            : new Date(Date.now() + (PAY_DAYS[input.blocker] ?? 0) * 86_400_000).toISOString(),
      bpdContribution: input.paid ? 1 : (PAY_PROB[input.blocker] / 100) * 0.6,
      unlock: BLOCKER_UNLOCK[input.paid ? "paid" : input.blocker],
    },
    nextStepLocked: input.nextStepLocked,
    nextStepQuote: input.nextStepQuote,
    hesitation: input.hesitation,
    total,
    band: bandOf(total),
    ownerActions: buildOwnerActions(input, { stepScore, speedScore, followScore, understandingScore }),
  };
}

function buildOwnerActions(
  input: ManualInput,
  s: { stepScore: number; speedScore: number; followScore: number; understandingScore: number },
) {
  const out: string[] = [];
  if (s.speedScore < 60) out.push("Fix response speed first — everything else is downstream of the first five minutes.");
  if (input.questionsAsked === 0) out.push("Zero questions asked. Label the lead 'No question is sent to this lead' right now.");
  if (input.unansweredCustomerMsgs > 0) out.push(`${input.unansweredCustomerMsgs} customer message(s) still unanswered — reply before the next shift ends.`);
  if (!input.nextStepLocked) out.push("No next step was locked. A conversation without a next step is a lost conversation.");
  if (input.authorship === "ai") out.push("Replies look templated. Coach on personalisation and remove the canned reply.");
  if (s.stepScore < 50) out.push("Less than half the playbook was followed — walk this chat step by step with the agent.");
  if (input.disposition === "not-helping") out.push("Effort pattern flagged. Check their open-lead load before coaching.");
  if (!out.length) out.push("Clean conversation — use it as a floor example in tomorrow's huddle.");
  return out;
}

/** Reviewer-visible extra-mile options for the manual checklist. */
export const EXTRA_VALUE_OPTIONS = [
  "Sent real photos or a video of the actual room",
  "Gave commute time in minutes to their workplace",
  "Offered an alternative when the first option did not fit",
  "Held a slot or price for them explicitly",
  "Answered a question they had not asked yet",
  "Followed up at the exact time they were promised",
];

export const HESITATION_OPTIONS = [
  "Asked about price more than once",
  "Went quiet after seeing the rent",
  "Said they need to check with family",
  "Mentioned another property or brand",
  "Asked about deposit or lock-in repeatedly",
  "Kept changing the move-in date",
];
