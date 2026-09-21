import type { CallStage, Lead } from './types';
import { leadPath, type LeadPath } from './talk-track';

/** ---------------------------------------------------------------
 *  OBJECTION HANDLING 2 — the Gharpayy way.
 *
 *  Not a sales-training manual. Five seconds, in this order:
 *    give hope → know exactly → solve that one thing → validate → move.
 *
 *  Plus the no-answer kit: if they do not pick up, exactly what goes
 *  out on WhatsApp, exactly what they reply with, and the next move.
 *  --------------------------------------------------------------- */

export const FORMULA: { step: string; line: string; why: string }[] = [
  { step: 'Give hope', line: '“Yes, yes. We can help with that.”', why: 'Never panic, never argue, never discount first.' },
  { step: 'Know exactly', line: '“What exactly is the concern?”', why: 'One real blocker beats five imagined ones.' },
  { step: 'Solve that one thing', line: 'Answer only what they asked.', why: 'Stacked answers sound like desperation.' },
  { step: 'Validate', line: '“If this gets solved, does the property work for you?”', why: 'No = there is another blocker underneath.' },
  { step: 'Move', line: 'BLR → tour / revisit / quotation / booking. OUT → virtual tour / proof / prebooking.', why: 'No call without an outcome.' },
];

/** Solve in this order. Never close on money while the property is wrong. */
export const BLOCKER_ORDER = [
  { n: 1, label: 'Property', ask: 'Do they actually like it? If no — stop closing, change the property.' },
  { n: 2, label: 'Trust', ask: 'Especially outstation: do they believe what they are seeing?' },
  { n: 3, label: 'Decision maker', ask: 'Parent, friend or roommate — who else has to say yes?' },
  { n: 4, label: 'Money', ask: 'Price, deposit, payment — which one exactly?' },
  { n: 5, label: 'Time', ask: 'When will they realistically decide? Get a dated answer.' },
  { n: 6, label: 'Book', ask: 'Finish. BLR → booking. Outstation → prebooking.' },
];

export const MOST_IMPORTANT_QUESTION = '“If we solve this, would you take the property?”';

export const MULTI_OBJECTION_LINE =
  '“Got it. Out of these three, what is the biggest thing stopping you right now?” — solve one, then ask what is next.';

export interface ObjectionPlay {
  id: string;
  stage: CallStage;
  /** What the customer says, in their words. */
  cue: string;
  /** Step 1 — hope, immediately. */
  hope: string;
  /** Step 2 — the one question that finds the real blocker. */
  know: string;
  /** Step 3 — the branch(es) we actually solve. */
  solve: string[];
  /** Step 4 — validate. */
  validate?: string;
  /** Step 5 — the next outcome, per path. */
  move: { blr: string; out: string };
  /** Only relevant on this path. Absent = both. */
  path?: LeadPath;
}

export const STAGE_TARGET: Record<CallStage, { blr: string; out: string }> = {
  1: { blr: 'Get the physical tour scheduled.', out: 'Get the virtual tour scheduled.' },
  2: { blr: 'One property strong enough for a physical tour.', out: 'One property strong enough for a virtual tour.' },
  3: { blr: 'Know: likable or not — and why.', out: 'Know: likable or not — and why.' },
  4: { blr: 'Find the ONE real blocker before booking.', out: 'Find the ONE real blocker before prebooking.' },
  5: { blr: 'Booking.', out: 'Prebooking — or a legitimate dated decision.' },
};

export const OBJECTIONS_2: ObjectionPlay[] = [
  // ---------------- C1 ----------------
  {
    id: 'c1-send-options', stage: 1, cue: '“Just WhatsApp me some options.”',
    hope: '“Sure, I’ll send you the best ones.”',
    know: '“Where’s your office or college?” then “When are you planning to move?”',
    solve: [
      'BLR: “Perfect, you’re already in Bangalore, right? I’ll send the strongest option — if it works, let’s get the visit done today or tomorrow.”',
      'OUT: “I’ll send the best options, and instead of judging only through photos we’ll show you the property live as well.”',
    ],
    validate: '“If the option matches, are we good to see it?”',
    move: { blr: 'Tour slot today or tomorrow.', out: 'Virtual tour slot.' },
  },
  {
    id: 'c1-price', stage: 1, cue: '“What’s the rent?”',
    hope: '“Yes, I’ll tell you.” Price is not a banned word — answer what you genuinely know.',
    know: 'Property known: “This one is around ₹{rent}. Does that work for your budget?” Not yet: “We have multiple options depending on room type — what budget are you comfortable around?”',
    solve: ['Give the honest number or the honest range, then move to budget capture.'],
    move: { blr: 'Tour slot.', out: 'Virtual tour slot.' },
  },
  {
    id: 'c1-budget-15k', stage: 1, cue: '“My budget is only ₹15K.”',
    hope: '“Yes, we can work around that.”',
    know: '“What’s more important for you — exact area, or better property?”',
    solve: [
      'Exact area matters → adjust sharing / property quality.',
      'Better property matters → expand to nearby area.',
      '“Perfect. I’ll search using that.”',
    ],
    move: { blr: 'Tour slot on the rematched option.', out: 'Virtual tour on the rematched option.' },
  },
  {
    id: 'c1-single-only', stage: 1, cue: '“I need single only.”',
    hope: '“Yes, we’ll check single rooms first.”',
    know: 'If budget does not fit: “In this exact area a good single may go above this budget.”',
    solve: ['“Would you rather move slightly nearby and keep single, or stay here and look at double sharing?” — let them pick the trade-off.'],
    move: { blr: 'Tour slot.', out: 'Virtual tour slot.' },
  },
  {
    id: 'c1-just-checking', stage: 1, cue: '“I’m just checking.”',
    hope: '“No issue.”',
    know: '“When are you actually planning to move?”',
    solve: [
      'Within 7 days → “Then let’s at least identify one serious option now.”',
      'Later → “I’ll keep the requirement mapped and reconnect closer to your date.”',
    ],
    move: { blr: 'Tour slot, or a dated recall.', out: 'Virtual tour, or a dated recall.' },
  },
  {
    id: 'c1-call-later', stage: 1, cue: '“Call me later.”',
    hope: '“Sure.”',
    know: '“Today evening or tomorrow?” — get a real time.',
    solve: ['Never end with “okay, I’ll call later.” A time or nothing.'],
    move: { blr: 'Dated callback in the system.', out: 'Dated callback in the system.' },
  },
  {
    id: 'c1-no-form', stage: 1, cue: '“I don’t want to fill the form.”',
    hope: '“No problem. Tell me here itself.”',
    know: 'Ask only: location, office, date, budget, sharing.',
    solve: ['After interest: “Fill this quick once so I can map everything correctly and move faster.”'],
    move: { blr: 'Tour slot.', out: 'Virtual tour slot.' },
  },
  {
    id: 'c1-not-in-blr', stage: 1, cue: '“I’m not in Bangalore.”', path: 'outstation',
    hope: '“Perfect, no problem. We can still get this done.”',
    know: '“When are you coming?” · “Where’s your office?” · “What’s your budget?”',
    solve: ['“I’ll shortlist the best option and we’ll show you the property live on video.”'],
    move: { blr: '—', out: 'Virtual tour scheduled.' },
  },

  // ---------------- C2 ----------------
  {
    id: 'c2-dont-like', stage: 2, cue: '“I don’t like these options.”',
    hope: '“Yes, we’ll change them.”',
    know: '“What exactly didn’t work — room, price, location, property or sharing?”',
    solve: ['Take the one thing they name, make it the priority, confirm the rest still works, then rematch.'],
    validate: '“Apart from that, everything else works?”',
    move: { blr: 'Physical tour on the rematched property.', out: 'Virtual tour on the rematched property.' },
  },
  {
    id: 'c2-send-more', stage: 2, cue: '“Send more.”',
    hope: '“Yes, definitely.”',
    know: '“What should the next option do better than these?”',
    solve: ['Never send more blindly. One better-on-X option, not twenty.'],
    move: { blr: 'Physical tour.', out: 'Virtual tour.' },
  },
  {
    id: 'c2-expensive', stage: 2, cue: '“This looks expensive.”',
    hope: '“Yes, we have more affordable options too.”',
    know: '“What number do you want us to stay within?”',
    solve: ['“Are you flexible slightly on location or sharing?” then rematch inside that number.'],
    move: { blr: 'Physical tour.', out: 'Virtual tour.' },
  },
  {
    id: 'c2-room-small', stage: 2, cue: '“Room looks small.”',
    hope: 'BLR: “Could be difficult to judge from the video.” OUT: “Yes, let’s not judge it from that clip.”',
    know: 'Is it the room itself, or the clip?',
    solve: [
      'BLR: “Since you’re in Bangalore, see the actual room once — today or tomorrow?”',
      'OUT: “We’ll show you the actual room live. Evening works?”',
    ],
    move: { blr: 'Physical visit slot.', out: 'Live walkthrough slot.' },
  },
  {
    id: 'c2-location-far', stage: 2, cue: '“Location is far.”',
    hope: '“Got it.”',
    know: '“How much commute are you comfortable with daily?”',
    solve: ['If it is genuinely far, change the property. Do not force it.'],
    move: { blr: 'Physical tour on a feasible property.', out: 'Virtual tour on a feasible property.' },
  },
  {
    id: 'c2-no-time', stage: 2, cue: '“I don’t have time to visit.”',
    hope: '“No problem.”',
    know: '“After work, before work, or weekend — which is easier?”',
    solve: ['Still no time: “Let’s do a quick virtual walkthrough first so you physically visit only if it’s worth it.”'],
    move: { blr: 'Off-hours visit slot, else virtual first.', out: 'Virtual walkthrough slot.' },
  },
  {
    id: 'c2-visit-directly', stage: 2, cue: '“I’ll visit directly.”', path: 'blr',
    hope: '“Yes, absolutely.”',
    know: '“Let me confirm the actual room and property team first so your visit doesn’t get wasted.”',
    solve: ['Convert a walk-in into an official tour with a slot and a caretaker informed.'],
    move: { blr: 'Official tour logged.', out: '—' },
  },
  {
    id: 'c2-just-video', stage: 2, cue: '“Just send video.”',
    hope: '“Yes, sending.”',
    know: '“After you see it, tell me one thing — does this direction work, or should we change the property completely?”',
    solve: ['Every video needs an outcome attached before it is sent.'],
    move: { blr: 'Physical tour after the video verdict.', out: 'Virtual tour after the video verdict.' },
  },

  // ---------------- C3 ----------------
  {
    id: 'c3-okay', stage: 3, cue: '“It was okay.”',
    hope: 'Do not accept “okay”.',
    know: '“Out of 10?” → “What would make it a 9?”',
    solve: ['The gap between their number and 9 is the blocker. Solve only that.'],
    move: { blr: 'Quotation or revisit.', out: 'Proof or prebooking.' },
  },
  {
    id: 'c3-didnt-like', stage: 3, cue: '“I didn’t like it.”',
    hope: '“Yes, no issue. We’ll change it.”',
    know: '“What exactly didn’t work?”',
    solve: ['Never defend the wrong property. Rematch.'],
    move: { blr: 'Revisit on a better property.', out: 'Fresh virtual tour.' },
  },
  {
    id: 'c3-room-small', stage: 3, cue: '“Room is small.”',
    hope: '“Got it. Everything else worked?”',
    know: 'Yes → better room in the same property. No → “What else didn’t work?”',
    solve: ['Do not mistake one objection for the whole problem.'],
    move: { blr: 'Revisit / quotation on the better room.', out: 'Live view of the better room.' },
  },
  {
    id: 'c3-food', stage: 3, cue: '“Food isn’t good.”',
    hope: '“Got it.”',
    know: '“Is food a deal-breaker for you?”',
    solve: ['Yes → change property. No → “Apart from food, does the room and location work?”'],
    move: { blr: 'Quotation or revisit.', out: 'Proof or prebooking.' },
  },
  {
    id: 'c3-washroom', stage: 3, cue: '“Washroom isn’t good.”',
    hope: '“Got it.”',
    know: '“What exactly — size, cleanliness, condition or sharing?”',
    solve: ['Solve that exact issue only.'],
    move: { blr: 'Quotation or revisit.', out: 'Proof or prebooking.' },
  },
  {
    id: 'c3-location', stage: 3, cue: '“I don’t like the location.”',
    hope: '“Got it.”',
    know: '“Was it the commute, or the area itself?”',
    solve: ['Commute → adjust slot/route or nearby property. Area → change area entirely.'],
    move: { blr: 'Revisit in the right area.', out: 'Virtual tour in the right area.' },
  },
  {
    id: 'c3-see-more', stage: 3, cue: '“I want to see more properties.”',
    hope: '“Yes, we can show more.”',
    know: '“What does the next property need to do better than this one?” — mandatory.',
    solve: ['One better-on-X property, not a list.'],
    move: { blr: 'Second tour booked.', out: 'Second virtual tour booked.' },
  },
  {
    id: 'c3-unsure', stage: 3, cue: '“Virtual tour is fine but I’m still unsure.”', path: 'outstation',
    hope: '“Absolutely.”',
    know: '“What are you still unsure about — room, location, payment, or booking before coming?”',
    solve: ['Solve only that one. Fresh proof for room/location, process explanation for payment.'],
    move: { blr: '—', out: 'Prebooking conversation.' },
  },
  {
    id: 'c3-video-better', stage: 3, cue: '“The video looked better than reality.”',
    hope: '“Got it. That’s important.”',
    know: '“What exactly looked different?”',
    solve: ['Do not argue, do not defend bad content. Update the property content internally. Customer trust first.'],
    move: { blr: 'Honest rematch or revisit.', out: 'Honest rematch with real footage.' },
  },

  // ---------------- C4 ----------------
  {
    id: 'c4-price-high', stage: 4, cue: '“Price is high.”',
    hope: '“Got it.” Do not say discount first.',
    know: '“Is it outside your budget, or do you feel the property isn’t worth this price?”',
    solve: [
      'Outside budget → “How much difference is there?” then solve commercially or with an alternative.',
      'Value problem → “What would need to be better for this price to feel worth it?”',
    ],
    validate: '“If we get closer commercially, are you ready to take this room?”',
    move: { blr: 'Booking.', out: 'Prebooking.' },
  },
  {
    id: 'c4-discount', stage: 4, cue: '“Can you discount?”',
    hope: '“Yes, I’ll check what’s possible.”',
    know: '“If we solve the commercial, are you ready to take this room?”',
    solve: ['Yes → negotiate. No → “Then what else is stopping you?” No unnecessary discounts.'],
    move: { blr: 'Booking.', out: 'Prebooking.' },
  },
  {
    id: 'c4-parents', stage: 4, cue: '“I need to ask my parents.”',
    hope: '“Yes, absolutely.”',
    know: '“What will they mainly want to know — safety, food, price, location or payment?”',
    solve: ['“We can explain it to them directly as well if that helps.”'],
    move: { blr: 'Parent call scheduled.', out: 'Parent call scheduled.' },
  },
  {
    id: 'c4-parents-no', stage: 4, cue: '“My parents said no.”',
    hope: '“Got it.”',
    know: '“What exactly are they uncomfortable with?” — never accept “parents said no”.',
    solve: ['Solve the named worry, with the parent on the call if needed.'],
    move: { blr: 'Parent call, then booking.', out: 'Parent call, then prebooking.' },
  },
  {
    id: 'c4-friend', stage: 4, cue: '“My friend/roommate has to decide.”',
    hope: '“Yes, let’s get them comfortable too.”',
    know: '“What are they mainly checking?”',
    solve: ['“Let’s add them to the call or video once.”'],
    move: { blr: 'Joint call, then booking.', out: 'Joint video, then prebooking.' },
  },
  {
    id: 'c4-deposit', stage: 4, cue: '“Deposit is high.”',
    hope: '“Got it.”',
    know: '“Is the issue the total deposit, or paying that amount immediately?”',
    solve: ['Only offer verified terms. Never invent payment flexibility.'],
    move: { blr: 'Booking on verified terms.', out: 'Prebooking on verified terms.' },
  },
  {
    id: 'c4-cheaper', stage: 4, cue: '“I found something cheaper.”',
    hope: '“Yes, possible.”',
    know: '“What is that property better on apart from price?”',
    solve: ['“Nothing” → price is the real blocker. “Bigger + cheaper” → ours may genuinely be weaker; do not blindly sell.'],
    move: { blr: 'Honest comparison, then booking or rematch.', out: 'Honest comparison, then prebooking or rematch.' },
  },
  {
    id: 'c4-think', stage: 4, cue: '“I need to think.”',
    hope: '“Sure.”',
    know: '“What exactly are you still thinking about?” — mandatory. “Thinking” hides an objection.',
    solve: ['Solve the hidden one.'],
    move: { blr: 'Dated decision + booking push.', out: 'Dated decision + prebooking push.' },
  },
  {
    id: 'c4-let-you-know', stage: 4, cue: '“I’ll let you know.”',
    hope: '“Sure.”',
    know: '“When are you realistically deciding?” — today 8 PM / tomorrow morning / Monday after office.',
    solve: ['Never leave it open-ended.'],
    move: { blr: 'Dated follow-up logged.', out: 'Dated follow-up logged.' },
  },
  {
    id: 'c4-pay-before-coming', stage: 4, cue: '“I don’t want to pay before coming.”', path: 'outstation',
    hope: '“Yes, totally understandable.”',
    know: '“Is your concern mainly that the room may be different, or payment itself?”',
    solve: [
      'Room concern → show the exact room properly again, fresh walkthrough.',
      'Payment concern → explain verified payment and booking process, then “Does that solve the concern?”',
    ],
    move: { blr: '—', out: 'Prebooking.' },
  },
  {
    id: 'c4-what-if-dont-like', stage: 4, cue: '“What if I don’t like it after reaching?”', path: 'outstation',
    hope: '“Fair concern.”',
    know: '“Which part are you worried may be different — room, location or property?”',
    solve: ['Show actual proof, then state the real applicable cancellation/refund terms. No false promises.'],
    move: { blr: '—', out: 'Prebooking.' },
  },
  {
    id: 'c4-trust', stage: 4, cue: '“How do I know Gharpayy / the payment is real?”', path: 'outstation',
    hope: '“Yes, that’s important before paying remotely.”',
    know: '“What else would you need to verify before feeling comfortable?”',
    solve: ['Official booking details, quotation, verified payment method, receipt, booking confirmation, property details.'],
    move: { blr: '—', out: 'Prebooking.' },
  },
  {
    id: 'c4-token-refund', stage: 4, cue: '“Is the token refundable?”',
    hope: '“I’ll tell you the exact applicable policy for this booking.” Never guess.',
    know: 'Pull the verified terms for this property/booking.',
    solve: ['State them exactly. Transparency wins.'],
    move: { blr: 'Booking.', out: 'Prebooking.' },
  },
  {
    id: 'c4-book-after-coming', stage: 4, cue: '“I’ll book after I come to Bangalore.”', path: 'outstation',
    hope: '“Absolutely.”',
    know: '“What is stopping you from securing it before you come — trust, physical visit, payment, date, parents?”',
    solve: ['Solve that one. If they still want physical only, do not force — keep the property warm and reconnect around arrival.'],
    move: { blr: '—', out: 'Prebooking, or a dated arrival reconnect.' },
  },

  // ---------------- C5 ----------------
  {
    id: 'c5-not-today', stage: 5, cue: '“I’m ready, but not today.”',
    hope: '“Sure.”',
    know: '“What changes between today and tomorrow?”',
    solve: ['That answer is the blocker. Solve it now.'],
    move: { blr: 'Booking.', out: 'Prebooking.' },
  },
  {
    id: 'c5-pay-tonight', stage: 5, cue: '“I’ll pay tonight.”',
    hope: '“Perfect.”',
    know: '“What time should we expect it?”',
    solve: ['Capture the time. Do not call five times before it.'],
    move: { blr: 'Payment window logged.', out: 'Payment window logged.' },
  },
  {
    id: 'c5-pay-tomorrow', stage: 5, cue: '“I’ll pay tomorrow.”',
    hope: '“Sure.”',
    know: '“Is everything else confirmed and it’s only timing?”',
    solve: ['Yes → exact dated follow-up. No → find the remaining blocker.'],
    move: { blr: 'Booking.', out: 'Prebooking.' },
  },
  {
    id: 'c5-payment-link', stage: 5, cue: '“Send payment link.”',
    hope: '“Sure.” Do not celebrate yet.',
    know: '“Everything else confirmed from your side?”',
    solve: ['Yes → send. No → solve before payment.'],
    move: { blr: 'Booking.', out: 'Prebooking.' },
  },
  {
    id: 'c5-hold', stage: 5, cue: '“Can you hold it without payment?”',
    hope: 'Use the actual property policy.',
    know: 'Is a hold allowed here at all?',
    solve: [
      'Not allowed: “I don’t want to falsely promise a room lock without the booking step. I’ll keep checking availability for you.”',
      'Allowed: state the exact hold expiry.',
    ],
    move: { blr: 'Booking before expiry.', out: 'Prebooking before expiry.' },
  },
  {
    id: 'c5-fifty-fifty', stage: 5, cue: '“I’m still 50-50.”',
    hope: '“Got it.”',
    know: '“What would need to change to make this 80-20?”',
    solve: ['Solve exactly that one thing.'],
    move: { blr: 'Booking.', out: 'Prebooking.' },
  },
  {
    id: 'c5-two-properties', stage: 5, cue: '“I’m confused between two properties.”',
    hope: '“Perfect.”',
    know: '“Between these two, what are the three things you’re actually deciding on?”',
    solve: ['Compare only those: price, commute, room, food, deposit, overall property. Help them decide.'],
    move: { blr: 'Booking on the chosen one.', out: 'Prebooking on the chosen one.' },
  },
  {
    id: 'c5-postponed', stage: 5, cue: '“My plan got postponed.”',
    hope: '“No issue.”',
    know: '“What’s the new move-in date?”',
    solve: ['Known → dated recall. Unknown → move dormant until the plan becomes real.'],
    move: { blr: 'Dated recall window.', out: 'Dated recall window.' },
  },
  {
    id: 'c5-booked-elsewhere', stage: 5, cue: '“I booked somewhere else.”',
    hope: '“Got it.”',
    know: '“What finally made you choose that property?”',
    solve: ['Capture the real lost reason. Do not keep irritating the customer.'],
    move: { blr: 'Clean dead with a logged reason.', out: 'Clean dead with a logged reason.' },
  },
];

export function objectionsFor(stage: CallStage, path: LeadPath): ObjectionPlay[] {
  return OBJECTIONS_2.filter((o) => o.stage === stage && (!o.path || o.path === path || path === 'unknown'));
}

/** The move line for this play on this lead's path. */
export function moveFor(play: ObjectionPlay, path: LeadPath): string {
  return path === 'outstation' ? play.move.out : play.move.blr;
}

/** One-line summary written into the activity log / dossier note. */
export function objectionLogLine(play: ObjectionPlay, path: LeadPath): string {
  return `${play.cue} → hope: ${play.hope} · asked: ${play.know} · move: ${moveFor(play, path)}`;
}

/** ------------------------- NO ANSWER KIT ------------------------- */

export interface NoAnswerPlay {
  stage: CallStage;
  /** What goes out on WhatsApp when the call is not picked up. */
  message: (lead: Lead, path: LeadPath) => string;
  /** The reply menu — they answer with a number, not an essay. */
  replies: string[];
  /** What we do with each reply. */
  thenDo: string;
  /** When to try the call again. */
  retry: string;
}

const first = (lead: Lead) => (lead.name ?? '').split(' ')[0] || 'there';
const area = (lead: Lead) => lead.discovery?.areas || lead.area || 'your area';

export const NO_ANSWER_2: Record<CallStage, NoAnswerPlay> = {
  1: {
    stage: 1,
    message: (l, p) => p === 'outstation'
      ? `Hi ${first(l)}, Gharpayy here — tried calling. Yes, we can help even though you’re not in Bangalore yet 🙂 We’ll show you the actual room live on video. Reply with a number:\n1 — Send options\n2 — Video tour today evening\n3 — Call me at ___`
      : `Hi ${first(l)}, Gharpayy here — tried calling. Yes, we can help with your stay in ${area(l)} 🙂 Reply with a number:\n1 — Send options\n2 — Visit today/tomorrow\n3 — Call me at ___`,
    replies: ['1 — Send options', '2 — Tour / video slot', '3 — Call me at <time>'],
    thenDo: '1 → send 2 options, then call. 2 → book the slot immediately. 3 → log the exact callback time, no guessing.',
    retry: 'Retry in 3h at a different hour of the day, then one WhatsApp. Never silent.',
  },
  2: {
    stage: 2,
    message: (l, p) => p === 'outstation'
      ? `Hi ${first(l)}, sent you the shortlisted options. One quick thing — does this direction work, or should we change the property completely?\n1 — Direction works, do the video tour\n2 — Change the property\n3 — Call me at ___`
      : `Hi ${first(l)}, sent you the shortlisted options for ${area(l)}. Rather than judging from photos, let’s see one room once:\n1 — Today\n2 — Tomorrow\n3 — Change the options`,
    replies: ['1 — Slot today', '2 — Slot tomorrow', '3 — Change the options'],
    thenDo: '1/2 → lock the slot, share pin, inform caretaker. 3 → ask what the next option must do better, then rematch.',
    retry: 'Retry in 4h. Two options + two slots on WhatsApp, never a list of twenty.',
  },
  3: {
    stage: 3,
    message: (l) => `Hi ${first(l)}, how was the property? Just one number out of 10 is enough 🙂\nAnd if it’s not a 9 — tell me what would make it a 9, and we’ll fix exactly that.`,
    replies: ['A number out of 10', 'What would make it a 9', 'Or: show me one more property'],
    thenDo: '8+ → send the written quotation and ask for the token. Below 8 → the gap is the blocker; solve or rematch.',
    retry: 'Retry in 2h — this is a hot lead, the read goes cold fast.',
  },
  4: {
    stage: 4,
    message: (l, p) => p === 'outstation'
      ? `Hi ${first(l)}, quotation sent. One honest question — what’s the one thing still stopping you?\n1 — Room / how it actually looks\n2 — Payment or trust in booking remotely\n3 — Parents / someone else deciding\n4 — Price`
      : `Hi ${first(l)}, quotation sent. One honest question — what’s the one thing still stopping you?\n1 — Price\n2 — Parents / someone else deciding\n3 — Want to see one more property\n4 — Nothing, let’s book`,
    replies: ['1', '2', '3', '4 — nothing, book it'],
    thenDo: 'Whatever they pick, solve only that one, then ask: “If we solve this, would you take the property?”',
    retry: 'Retry within the hour — the room hold is ticking.',
  },
  5: {
    stage: 5,
    message: (l, p) => p === 'outstation'
      ? `Hi ${first(l)}, still holding your option. Just tell me the realistic date you’re deciding on and I’ll stop chasing until then 🙂 If your plan changed, that’s completely fine — just tell me the new move-in date.`
      : `Hi ${first(l)}, still holding your option in ${area(l)}. Tell me the realistic date you’re deciding and I’ll follow up only then 🙂 If you’ve booked elsewhere, tell me honestly — I’ll just note what made you choose it.`,
    replies: ['A dated decision', 'New move-in date', 'Booked elsewhere — reason'],
    thenDo: 'Dated decision → recall window. New date → dormant till then. Booked elsewhere → log the real lost reason and stop.',
    retry: 'One WhatsApp, then park it for the next cycle. No useless follow-up.',
  },
};

export function noAnswerKit(lead: Lead, stage: CallStage) {
  const path = leadPath(lead);
  const play = NO_ANSWER_2[stage];
  return { path, play, message: play.message(lead, path) };
}
