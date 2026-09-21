// The L1 engine. Given a transcript it answers the owner's questions:
// were the steps followed, was it fast, did we understand, was it human,
// did we add the extra 10%, what was the wow and the dull moment, why has
// the customer not paid, and when will they.

import { CALL_STEPS, CHAT_STEPS, EXTRA_VALUE_MARKERS, HESITATION_MARKERS } from "./playbook";
import type {
  AuthorshipMetrics, ChatMsg, ExtraValueHit, FollowUpMetrics, L1Analysis, L1Band, L1Kind,
  MomentPick, MoneyOutlook, PaymentBlocker, SpeedMetrics, StepResult, UnderstandingMetrics,
} from "./types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const trim = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n)}…` : s);

/* ---------------- Steps ---------------- */

function evaluateSteps(msgs: ChatMsg[], kind: L1Kind): StepResult[] {
  const agent = msgs.filter((m) => m.speaker === "agent");
  const customer = msgs.filter((m) => m.speaker === "customer");
  const steps = kind === "call" ? CALL_STEPS : CHAT_STEPS;
  return steps.map((step) => {
    const hit = agent.find((m) => step.detect.test(m.text));
    const confirmed = step.confirm
      ? customer.some((m) => (!hit || m.i > hit.i) && step.confirm!.test(m.text))
      : Boolean(hit);
    return {
      step,
      done: Boolean(hit),
      confirmed: Boolean(hit) && confirmed,
      atMinute: hit?.at ?? null,
      evidence: hit ? trim(hit.text) : "",
    };
  });
}

/* ---------------- Speed ---------------- */

function speedOf(msgs: ChatMsg[]): SpeedMetrics {
  const gaps: { min: number; after: string }[] = [];
  let firstResponse: number | null = null;

  for (let i = 1; i < msgs.length; i++) {
    const prev = msgs[i - 1];
    const cur = msgs[i];
    if (prev.speaker !== "customer" || cur.speaker !== "agent") continue;
    if (prev.at == null || cur.at == null) continue;
    const d = Math.max(0, cur.at - prev.at);
    gaps.push({ min: d, after: trim(prev.text, 80) });
    if (firstResponse == null) firstResponse = d;
  }

  const last = msgs[msgs.length - 1];
  const ghosted = last && last.speaker === "customer" ? 0 : null;
  const worst = gaps.reduce<{ min: number; after: string } | null>(
    (acc, g) => (!acc || g.min > acc.min ? g : acc), null,
  );
  const med = median(gaps.map((g) => g.min));

  let score = 70;
  if (firstResponse != null) score = firstResponse <= 5 ? 100 : firstResponse <= 15 ? 88 : firstResponse <= 60 ? 65 : firstResponse <= 240 ? 40 : 20;
  if (med != null && med > 60) score -= 12;
  if (worst && worst.min > 720) score -= 15;
  score = clamp(score);

  const verdict = firstResponse == null
    ? "No timestamps in the transcript — reviewer must confirm speed manually."
    : firstResponse <= 5 ? "Instant. This is the standard."
      : firstResponse <= 15 ? "Inside the 15-minute law."
        : firstResponse <= 60 ? `Late: first reply took ${firstResponse} min. Law is 15.`
          : `Breach: first reply took ${Math.round(firstResponse / 60)} h. The lead had already moved on.`;

  return {
    firstResponseMin: firstResponse,
    medianResponseMin: med,
    worstGapMin: worst?.min ?? null,
    worstGapAfter: worst?.after ?? "",
    ghostedMin: ghosted,
    score,
    verdict,
  };
}

/* ---------------- Follow-ups ---------------- */

function followUpOf(msgs: ChatMsg[]): FollowUpMetrics {
  let agentInitiated = 0;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.speaker !== "agent") continue;
    const prev = msgs[i - 1];
    if (!prev || prev.speaker === "agent") continue;
    if (prev.at != null && m.at != null && m.at - prev.at >= 240) agentInitiated++;
  }
  // Also count explicit follow-up language.
  const explicit = msgs.filter(
    (m) => m.speaker === "agent" && /\b(following up|checking in|any update|gentle reminder|did you get a chance)\b/i.test(m.text),
  ).length;
  agentInitiated = Math.max(agentInitiated, explicit);

  const spanDays = (() => {
    const withTs = msgs.filter((m) => m.at != null);
    if (withTs.length < 2) return 1;
    return Math.max(1, Math.round((withTs[withTs.length - 1].at! - withTs[0].at!) / 1440) + 1);
  })();
  const expected = Math.min(6, Math.max(2, spanDays));

  let unanswered = 0;
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].speaker !== "customer") continue;
    const next = msgs.slice(i + 1).find((m) => m.speaker === "agent");
    if (!next) unanswered++;
  }

  const last = msgs[msgs.length - 1] ?? null;
  const score = clamp(Math.round((agentInitiated / expected) * 100) - unanswered * 15);
  const verdict = agentInitiated >= expected
    ? `${agentInitiated} follow-ups across ${spanDays}d — persistence is there.`
    : agentInitiated === 0
      ? "Zero follow-ups. The conversation was abandoned, not lost."
      : `Only ${agentInitiated} of an expected ${expected} follow-ups over ${spanDays}d.`;

  return { agentInitiated, expected, unansweredCustomerMsgs: unanswered, lastMoveBy: last?.speaker ?? null, score, verdict };
}

/* ---------------- Human vs AI ---------------- */

function authorshipOf(msgs: ChatMsg[]): AuthorshipMetrics {
  const agent = msgs.filter((m) => m.speaker === "agent");
  const signals: string[] = [];
  if (!agent.length) return { aiLikelihood: 0, verdict: "human", signals: ["No agent messages found"] };

  const lens = agent.map((m) => m.text.length);
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  const variance = Math.sqrt(lens.reduce((a, b) => a + (b - avg) ** 2, 0) / lens.length);

  let ai = 20;
  if (avg > 220) { ai += 18; signals.push("Unusually long, essay-shaped replies"); }
  if (variance < 25 && agent.length > 3) { ai += 15; signals.push("Every message is nearly the same length"); }

  const formal = agent.filter((m) => /\b(certainly|i'?d be happy to|kindly note|as per your requirement|feel free to reach out|rest assured|please do not hesitate)\b/i.test(m.text)).length;
  if (formal) { ai += Math.min(25, formal * 9); signals.push(`${formal} boiler-plate assistant phrase(s)`); }

  const bullets = agent.filter((m) => /^\s*[-•*]\s|\n\s*\d\.\s/m.test(m.text)).length;
  if (bullets > 1) { ai += 10; signals.push("Bulleted, brochure-style formatting"); }

  const human = agent.filter((m) => /\b(ok|okie|hmm|haha|ji\b|bro|sir ji|👍|🙏|😊)|[a-z]{2,}\.{2,}/i.test(m.text)).length;
  if (human) { ai -= Math.min(30, human * 8); signals.push(`${human} natural/informal message(s) — human signal`); }

  const short = agent.filter((m) => m.text.length < 40).length / agent.length;
  if (short > 0.4) { ai -= 12; signals.push("Plenty of short, conversational lines"); }

  const uniq = new Set(agent.map((m) => m.text.slice(0, 40).toLowerCase())).size;
  if (uniq < agent.length * 0.7) { ai += 12; signals.push("Repeated template openings"); }

  const sub60 = msgs.filter((m, i) => i > 0 && m.speaker === "agent" && msgs[i - 1].speaker === "customer" && m.at != null && msgs[i - 1].at != null && m.at - msgs[i - 1].at! === 0).length;
  if (sub60 > 2) { ai += 10; signals.push("Consistently instant replies (same-minute)"); }

  const aiLikelihood = clamp(Math.round(ai));
  const verdict = aiLikelihood >= 65 ? "ai" : aiLikelihood >= 40 ? "assisted" : "human";
  return { aiLikelihood, verdict, signals };
}

/* ---------------- Understanding ---------------- */

const FACT_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "budget", re: /(₹|rs\.?|inr)\s?\d{3,}|\b\d{1,2}\s?k\b/i },
  { id: "area", re: /\b(hsr|btm|koramangala|whitefield|marathahalli|indiranagar|hebbal|electronic city|jayanagar|bellandur|sarjapur|banashankari|yelahanka)\b/i },
  { id: "date", re: /\b(today|tomorrow|next week|next month|\d{1,2}(st|nd|rd|th))\b/i },
  { id: "room", re: /\b(single|double|triple|sharing|ac\b|non[\s-]?ac)\b/i },
  { id: "work", re: /\b(office|college|company|university|wfh|work from home)\b/i },
];

function understandingOf(msgs: ChatMsg[]): UnderstandingMetrics {
  const customer = msgs.filter((m) => m.speaker === "customer");
  const questions = customer.filter((m) => /\?/.test(m.text) || /\b(can you|do you have|is there|how much|what about|when)\b/i.test(m.text));
  let answered = 0;
  const ignored: string[] = [];
  for (const q of questions) {
    const replies = msgs.filter((m) => m.speaker === "agent" && m.i > q.i).slice(0, 2);
    const words = q.text.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    const overlap = replies.some((r) => words.some((w) => r.text.toLowerCase().includes(w)));
    if (overlap) answered++; else ignored.push(trim(q.text, 90));
  }

  const custText = customer.map((m) => m.text).join(" ");
  const agentText = msgs.filter((m) => m.speaker === "agent").map((m) => m.text).join(" ");
  const mirrored: string[] = [];
  for (const f of FACT_PATTERNS) {
    const said = custText.match(f.re);
    if (said && f.re.test(agentText)) mirrored.push(`${f.id}: “${said[0]}”`);
  }

  const qScore = questions.length ? (answered / questions.length) * 60 : 45;
  const mScore = (mirrored.length / FACT_PATTERNS.length) * 40;
  return {
    questionsAsked: questions.length,
    questionsAnswered: answered,
    mirroredFacts: mirrored,
    ignored,
    score: clamp(Math.round(qScore + mScore)),
  };
}

/* ---------------- The extra 10% ---------------- */

function extraValueOf(msgs: ChatMsg[]): ExtraValueHit[] {
  const agent = msgs.filter((m) => m.speaker === "agent");
  const out: ExtraValueHit[] = [];
  for (const marker of EXTRA_VALUE_MARKERS) {
    const hit = agent.find((m) => marker.detect.test(m.text));
    if (hit) out.push({ id: marker.id, label: marker.label, quote: trim(hit.text, 120) });
  }
  return out;
}

/* ---------------- Wow & dull ---------------- */

function momentsOf(msgs: ChatMsg[], extra: ExtraValueHit[]): { wow: MomentPick | null; dull: MomentPick | null } {
  const agent = msgs.filter((m) => m.speaker === "agent");
  if (!agent.length) return { wow: null, dull: null };

  const scoreMsg = (t: string) => {
    let s = 0;
    if (/\d/.test(t)) s += 2;
    if (/because|since|so that/i.test(t)) s += 3;
    if (EXTRA_VALUE_MARKERS.some((m) => m.detect.test(t))) s += 5;
    if (/i will|i'?ll|shall i/i.test(t)) s += 3;
    if (t.length > 300) s -= 2;
    return s;
  };
  const best = [...agent].sort((a, b) => scoreMsg(b.text) - scoreMsg(a.text))[0];
  const worstScore = (m: ChatMsg, i: number) => {
    let s = 0;
    const hes = HESITATION_MARKERS.filter((h) => h.detect.test(m.text)).length;
    s += hes * 4;
    if (m.text.length < 25) s += 2;
    const prev = msgs[msgs.indexOf(m) - 1];
    if (prev && prev.speaker === "customer" && prev.at != null && m.at != null) s += Math.min(6, (m.at - prev.at) / 120);
    return s + i * 0;
  };
  const worst = [...agent].sort((a, b) => worstScore(b, 0) - worstScore(a, 0))[0];

  const wow: MomentPick | null = best && scoreMsg(best.text) >= 5
    ? {
      quote: trim(best.text, 200), atMinute: best.at,
      why: extra.length
        ? `Went past the brief — ${extra[0].label.toLowerCase()}.`
        : "Specific, reasoned and forward-moving — this is the line to clone.",
    }
    : null;

  const dull: MomentPick | null = worst && worstScore(worst, 0) >= 2
    ? {
      quote: trim(worst.text, 200), atMinute: worst.at,
      why: HESITATION_MARKERS.find((h) => h.detect.test(worst.text))?.label
        ?? "Low-energy reply that handed control back to the customer.",
    }
    : null;

  return { wow, dull };
}

/* ---------------- Money ---------------- */

const BLOCKERS: { id: PaymentBlocker; label: string; re: RegExp; days: number; unlock: string }[] = [
  { id: "price-high", label: "Price above their comfort", re: /\b(costly|expensive|too high|out of budget|slightly high|bit high|reduce|discount)\b/i, days: 3, unlock: "Get one owner-approved concession or a lower-floor room and re-quote the total, not the rent." },
  { id: "family-approval", label: "Waiting on family / decision maker", re: /\b(parents|family|father|mother|discuss with|ask my|husband|wife)\b/i, days: 2, unlock: "Offer a 10-minute call with the parents today and share the property video they can forward." },
  { id: "comparing", label: "Comparing other options", re: /\b(other pg|comparing|also looking|stanza|colive|zolo|another option|will check others)\b/i, days: 4, unlock: "Send a two-column comparison with the honest trade-offs, then hold the bed till tomorrow evening." },
  { id: "timing", label: "Move-in date is still far", re: /\b(next month|later|not now|after|month end|still time)\b/i, days: 10, unlock: "Pre-book with a refundable token to lock the price for the future date." },
  { id: "location", label: "Location or commute mismatch", re: /\b(far|distance|commute|traffic|not near|other side)\b/i, days: 4, unlock: "Re-match in the correct micro-market with real commute minutes, don't defend the current one." },
  { id: "inventory", label: "We could not show the right room", re: /\b(not available|sold out|no single|full|occupied)\b/i, days: 5, unlock: "Escalate inventory today and come back with two live alternatives plus availability dates." },
  { id: "trust", label: "Trust / proof gap", re: /\b(genuine|scam|advance safe|refund|agreement|broker)\b/i, days: 3, unlock: "Share the agreement, refund policy and a resident reference before asking again." },
];

const PAID_RE = /\b(paid|payment done|transferred|token paid|booked|booking confirmed|sent the money|upi done)\b/i;

function moneyOf(msgs: ChatMsg[], steps: StepResult[], quality: number): MoneyOutlook {
  const customer = msgs.filter((m) => m.speaker === "customer");
  const custText = customer.map((m) => m.text).join(" \n ");
  const askStep = steps.find((s) => s.step.id === "c-payment" || s.step.id === "c-tour");
  const paid = PAID_RE.test(custText);

  let blocker: PaymentBlocker = "no-ask";
  let label = "We never actually asked for the money";
  let evidence = "";
  let days = 5;
  let unlock = "Make one clean ask today: name the room, the token amount and the deadline.";

  if (paid) {
    blocker = "paid"; label = "Paid — protect the booking"; days = 0;
    unlock = "Confirm move-in logistics in writing within the hour and hand over to onboarding.";
  } else {
    const found = BLOCKERS.find((b) => b.re.test(custText));
    if (found) {
      blocker = found.id; label = found.label; days = found.days; unlock = found.unlock;
      evidence = trim(customer.find((m) => found.re.test(m.text))?.text ?? "", 140);
    } else if (!customer.length || (customer[customer.length - 1]?.at != null && msgs[msgs.length - 1]?.speaker === "agent")) {
      blocker = "unresponsive"; label = "Gone silent after our last message"; days = 6;
      unlock = "Break the silence with a value message (new option or price move), never another 'any update?'.";
    } else if (askStep?.done) {
      blocker = "comparing"; label = "Still weighing it up"; days = 4;
      unlock = "Give a deadline with a reason: hold the bed till a stated time and say what happens after.";
    }
  }

  const base = paid ? 100 : clamp(Math.round(quality * 0.6 + (askStep?.done ? 18 : 0) + (blocker === "unresponsive" ? -18 : 0) + (blocker === "family-approval" ? 8 : 0)));
  const payProbability = clamp(base);
  const d = new Date();
  d.setDate(d.getDate() + days);

  return {
    paid,
    blocker,
    blockerLabel: label,
    evidence,
    payProbability,
    expectedPayInDays: paid ? 0 : days,
    expectedPayDate: d.toISOString().slice(0, 10),
    bpdContribution: Number((payProbability / 100).toFixed(2)),
    unlock,
  };
}

/* ---------------- Band ---------------- */

export function bandOf(total: number): L1Band {
  if (total >= 90) return "gold";
  if (total >= 80) return "strong";
  if (total >= 70) return "coaching";
  if (total >= 60) return "risk";
  return "critical";
}

export const L1_BAND_META: Record<L1Band, { label: string; className: string; action: string }> = {
  gold: { label: "Gharpayy Gold", className: "bg-amber-500 text-black", action: "Clone this into the best-practice library today." },
  strong: { label: "Strong", className: "bg-emerald-600 text-white", action: "One sharpening note, no intervention." },
  coaching: { label: "Coaching required", className: "bg-blue-600 text-white", action: "Rewrite the two weakest messages with the agent." },
  risk: { label: "Performance risk", className: "bg-orange-600 text-white", action: "Same-day coaching and a re-review in 48 h." },
  critical: { label: "Critical correction", className: "bg-red-600 text-white", action: "Manager takes the lead over personally now." },
};

/* ---------------- Main ---------------- */

export function analyzeConversation(msgs: ChatMsg[], kind: L1Kind): L1Analysis {
  const steps = evaluateSteps(msgs, kind);
  const maxW = steps.reduce((a, s) => a + s.step.weight, 0) || 1;
  const gotW = steps.reduce((a, s) => a + (s.done ? s.step.weight * (s.confirmed ? 1 : 0.85) : 0), 0);
  const stepScore = clamp(Math.round((gotW / maxW) * 100));

  const speed = speedOf(msgs);
  const followUp = followUpOf(msgs);
  const authorship = authorshipOf(msgs);
  const understanding = understandingOf(msgs);
  const extraValue = extraValueOf(msgs);
  const extraValuePct = clamp(Math.round((extraValue.length / EXTRA_VALUE_MARKERS.length) * 100));
  const { wow, dull } = momentsOf(msgs, extraValue);

  const nextStepStep = steps.find((s) => s.step.id === "c-next");
  const nextStepLocked = Boolean(nextStepStep?.done);

  const hesitation = HESITATION_MARKERS
    .filter((h) => msgs.some((m) => m.speaker === "agent" && h.detect.test(m.text)))
    .map((h) => h.label);

  let total = Math.round(
    stepScore * 0.4 + speed.score * 0.15 + followUp.score * 0.12 +
    understanding.score * 0.15 + extraValuePct * 0.1 + (nextStepLocked ? 100 : 20) * 0.08,
  );
  if (kind === "call" && !nextStepLocked) total = Math.min(total, 59); // owner rule: a call without a next step fails.
  total = clamp(total);

  const money = moneyOf(msgs, steps, total);
  const missedSteps = steps.filter((s) => !s.done).sort((a, b) => b.step.weight - a.step.weight);

  const ownerActions: string[] = [];
  if (!nextStepLocked) ownerActions.push(`Close the loop now: send one message that states what we will do and at what time.`);
  for (const m of missedSteps.slice(0, 3)) ownerActions.push(`${m.step.label} — ${m.step.why}`);
  if (speed.score < 70) ownerActions.push(`Speed: ${speed.verdict}`);
  if (followUp.score < 70) ownerActions.push(`Follow-up: ${followUp.verdict}`);
  if (extraValuePct < 30) ownerActions.push("Add the 10%: give one thing they did not ask for — commute time, food menu, or roommate profile.");
  if (authorship.verdict === "ai") ownerActions.push("Reads machine-written. Add one personal, specific line per message.");
  ownerActions.push(money.unlock);

  return {
    kind,
    messages: msgs,
    agentMsgs: msgs.filter((m) => m.speaker === "agent").length,
    customerMsgs: msgs.filter((m) => m.speaker === "customer").length,
    durationMin: msgs.length && msgs[msgs.length - 1].at != null ? msgs[msgs.length - 1].at : null,
    steps,
    stepScore,
    missedSteps,
    speed,
    followUp,
    authorship,
    understanding,
    extraValue,
    extraValuePct,
    wow,
    dull,
    money,
    nextStepLocked,
    nextStepQuote: nextStepStep?.evidence ?? "",
    hesitation,
    total,
    band: bandOf(total),
    ownerActions,
  };
}

/* ---------------- Zone roll-up ---------------- */

export interface ZoneRollup {
  zone: string;
  reviews: number;
  avgScore: number;
  stepCompliance: number;
  avgFirstResponse: number | null;
  followUpGap: number;
  aiHeavy: number;
  extraValuePct: number;
  nextStepLockedPct: number;
  expectedBookings: number;
  topBlocker: string;
  weakestStep: string;
}

export function rollupByZone(
  rows: { zone: string; analysis: L1Analysis }[],
): ZoneRollup[] {
  const map = new Map<string, { zone: string; analysis: L1Analysis }[]>();
  for (const r of rows) {
    const z = r.zone || "Unzoned";
    map.set(z, [...(map.get(z) ?? []), r]);
  }
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

  return [...map.entries()].map(([zone, rs]) => {
    const a = rs.map((r) => r.analysis);
    const firsts = a.map((x) => x.speed.firstResponseMin).filter((x): x is number => x != null);
    const blockers = new Map<string, number>();
    const missed = new Map<string, number>();
    for (const x of a) {
      blockers.set(x.money.blockerLabel, (blockers.get(x.money.blockerLabel) ?? 0) + 1);
      for (const m of x.missedSteps) missed.set(m.step.label, (missed.get(m.step.label) ?? 0) + 1);
    }
    const top = (m: Map<string, number>) => [...m.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? "—";
    return {
      zone,
      reviews: rs.length,
      avgScore: avg(a.map((x) => x.total)),
      stepCompliance: avg(a.map((x) => x.stepScore)),
      avgFirstResponse: firsts.length ? Math.round(firsts.reduce((p, q) => p + q, 0) / firsts.length) : null,
      followUpGap: avg(a.map((x) => Math.max(0, x.followUp.expected - x.followUp.agentInitiated))),
      aiHeavy: a.filter((x) => x.authorship.verdict === "ai").length,
      extraValuePct: avg(a.map((x) => x.extraValuePct)),
      nextStepLockedPct: avg(a.map((x) => (x.nextStepLocked ? 100 : 0))),
      expectedBookings: Number(a.reduce((s, x) => s + x.money.bpdContribution, 0).toFixed(1)),
      topBlocker: top(blockers),
      weakestStep: top(missed),
    };
  }).sort((a, b) => b.reviews - a.reviews);
}

/** How this review volume tracks against the 30-bookings-per-day goal. */
export function bpdOutlook(rollups: ZoneRollup[], target = 30) {
  const expected = Number(rollups.reduce((s, r) => s + r.expectedBookings, 0).toFixed(1));
  const reviews = rollups.reduce((s, r) => s + r.reviews, 0);
  const rate = reviews ? expected / reviews : 0;
  const conversationsNeeded = rate > 0 ? Math.ceil(target / rate) : null;
  return { target, expected, reviews, rate: Number(rate.toFixed(2)), conversationsNeeded, gap: Number((target - expected).toFixed(1)) };
}