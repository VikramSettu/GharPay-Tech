import { Lead, CallStage, DiscoveryKey, LeadDiscovery, WaStatus, CallOutcome } from './types';

/** ---------------------------------------------------------------
 *  WhatsApp state — the missing link between "claim" and "call".
 *  --------------------------------------------------------------- */

export const WA_STATUSES: { value: WaStatus; label: string; hint: string; tone: 'good' | 'warn' | 'bad' }[] = [
  { value: 'chat-replied', label: 'Chat exists · they replied', hint: 'Read the thread first — pull every detail before calling.', tone: 'good' },
  { value: 'chat-no-reply', label: 'Chat exists · no reply yet', hint: 'They saw us. Call is the unlock, not another message.', tone: 'warn' },
  { value: 'chat-stale', label: 'Old chat · gone cold', hint: 'Reopen with context from the last thread, then call.', tone: 'warn' },
  { value: 'no-chat', label: 'No chat at all', hint: 'Nothing known. Call 1 must collect every basic field.', tone: 'bad' },
  { value: 'not-on-wa', label: 'Number not on WhatsApp', hint: 'Call only. Confirm an alternate number on the call.', tone: 'bad' },
];

export function waStatusMeta(v?: WaStatus | null) {
  return WA_STATUSES.find((s) => s.value === v);
}

/** Labels applied inside WhatsApp so chat + CRM stay in sync. */
export const WA_LABELS: { value: string; label: string }[] = [
  { value: 'MYT-New', label: 'MYT · New' },
  { value: 'MYT-Call1', label: 'MYT · Call 1 basics' },
  { value: 'MYT-Call2', label: 'MYT · Call 2 tour' },
  { value: 'MYT-Call3', label: 'MYT · Call 3 close' },
  { value: 'MYT-Call4', label: 'MYT · Call 4 payment' },
  { value: 'MYT-Tour', label: 'MYT · Tour set' },
  { value: 'MYT-Nurture', label: 'MYT · Nurture' },
  { value: 'MYT-Dead', label: 'MYT · Dead' },
];

export function suggestedWaLabel(stage: CallStage): string {
  return stage === 1 ? 'MYT-Call1'
    : stage === 2 ? 'MYT-Call2'
    : stage === 3 ? 'MYT-Call3'
    : stage === 4 ? 'MYT-Call4'
    : 'MYT-Nurture';
}

/** ---------------------------------------------------------------
 *  Discovery — one canonical dossier. Every field is owned by a call
 *  so nobody asks Call-3 questions on Call 1, and nothing is skipped.
 *  --------------------------------------------------------------- */

export type FieldGroup = 'Deal read' | 'Feasibility' | 'Location & commute' | 'Lifestyle' | 'Closing' | 'Money' | 'Revival';

export interface DiscoveryField {
  key: DiscoveryKey;
  label: string;
  stage: CallStage;
  group: FieldGroup;
  kind: 'text' | 'choice' | 'date' | 'number';
  options?: string[];
  why: string;
  required: boolean;
  /** Ask this one before dialling — it frames the call itself. */
  preCall?: boolean;
}

export const DISCOVERY_FIELDS: DiscoveryField[] = [
  // ---- Call 1 — set the frame, then the basics
  { key: 'dealRead', label: 'Deal read', stage: 1, group: 'Deal read', kind: 'choice', options: ['Very high', 'Hard close', 'Maybe', 'Try nearby'], why: 'Frames the whole conversation before the first call. "Try nearby" → reassign.', required: true, preCall: true },
  { key: 'goal', label: 'Goal of this call', stage: 1, group: 'Deal read', kind: 'choice', options: ['Personal booking (PB)', 'Offline visit', 'Virtual tour'], why: 'Distinguishes the PB path from an offline-visit path.', required: true, preCall: true },
  { key: 'whoIsComing', label: 'Who is coming', stage: 1, group: 'Deal read', kind: 'choice', options: ['Self', 'Couple', 'Student', 'Working pro', 'Family', 'Group · interns', 'Group · friends'], why: 'Group size + persona changes room math, price and pitch on line one.', required: true, preCall: true },

  { key: 'inBangalore', label: 'In Bangalore?', stage: 1, group: 'Feasibility', kind: 'choice', options: ['In Bangalore', 'Out of Bangalore', 'Unknown'], why: 'Out-of-city leads need a virtual tour path, not a physical one.', required: true },
  { key: 'areas', label: 'Preferred areas', stage: 1, group: 'Feasibility', kind: 'text', why: 'Localises property matches to their zone.', required: true },
  { key: 'budget', label: 'Budget', stage: 1, group: 'Feasibility', kind: 'text', why: 'Filters inventory to what they can afford.', required: true },
  { key: 'moveIn', label: 'Move date', stage: 1, group: 'Feasibility', kind: 'date', why: 'Every priority bucket is derived from the move date.', required: true },
  { key: 'personaType', label: 'Occupation type', stage: 1, group: 'Feasibility', kind: 'choice', options: ['Student', 'Working', 'Intern', 'Family', 'Other'], why: 'Company / college is a trust signal and a payment-cycle hint.', required: true },
  { key: 'roomType', label: 'Room', stage: 1, group: 'Feasibility', kind: 'choice', options: ['Private', 'Shared', 'Both', 'Studio'], why: 'Private / shared / studio changes the pricing tier.', required: true },
  { key: 'genderNeed', label: 'Gender need', stage: 1, group: 'Feasibility', kind: 'choice', options: ['Boys', 'Girls', 'Coed'], why: 'Some properties are single-gender only.', required: true },

  // ---- Call 2 — schedule the visit
  { key: 'officeLocation', label: 'Office / college location', stage: 2, group: 'Location & commute', kind: 'text', why: 'Commute is the #1 predictor of stay length — capture it early.', required: true },
  { key: 'company', label: 'Company / college name', stage: 2, group: 'Location & commute', kind: 'text', why: 'A strong B2B anchor for bulk deals and trust.', required: false },
  { key: 'sharing', label: 'Sharing', stage: 2, group: 'Feasibility', kind: 'choice', options: ['Single', 'Double', 'Triple', 'Any'], why: 'Private / double / triple changes the pricing tier.', required: true },
  { key: 'movingFeasibility', label: 'Moving feasibility', stage: 2, group: 'Feasibility', kind: 'choice', options: ['Immediate', 'Within 15d', 'Within 30d', 'Just researching'], why: '"Immediate" vs "30d" vs "researching" changes the cadence.', required: true },
  { key: 'decisionMaker', label: 'Decision maker', stage: 2, group: 'Feasibility', kind: 'choice', options: ['Self', 'Parents', 'Company / HR', 'Group'], why: 'If parents or the company decide, loop them in early.', required: true },
  { key: 'food', label: 'Food preference', stage: 2, group: 'Lifestyle', kind: 'choice', options: ['Veg', 'Non-veg', 'Both', 'Cooks own'], why: 'Kitchen / meal-plan match; a deal-breaker for many.', required: false },
  { key: 'stayDuration', label: 'Stay duration', stage: 2, group: 'Lifestyle', kind: 'choice', options: ['< 3 months', '3-6 months', '6-12 months', '12 months+'], why: 'Short vs long stay changes discount and deposit.', required: false },
  { key: 'tourSlot', label: 'Tour slot agreed', stage: 2, group: 'Closing', kind: 'text', why: 'Call 2 exists to put a visit on the calendar.', required: true },

  // ---- Call 3 — close
  { key: 'competition', label: 'Competition', stage: 3, group: 'Closing', kind: 'choice', options: ['Only us', 'Comparing 2-3', 'Booked elsewhere'], why: 'Booked-elsewhere / comparing changes urgency.', required: true },
  { key: 'objection', label: 'Main objection', stage: 3, group: 'Closing', kind: 'text', why: 'Name it out loud or it kills the close silently.', required: true },
  { key: 'tokenReadiness', label: 'Token readiness', stage: 3, group: 'Closing', kind: 'choice', options: ['Ready now', 'After visit', 'Needs approval', 'Not ready'], why: 'Sets close probability so downstream stages know the SLA.', required: true },
  { key: 'moveInConfirmed', label: 'Move-in confirmed', stage: 3, group: 'Closing', kind: 'choice', options: ['Confirmed', 'Tentative', 'Changed'], why: 'A confirmed date is what turns a tour into a booking.', required: true },

  // ---- Call 4 — money & handover
  { key: 'tokenAmount', label: 'Token amount agreed', stage: 4, group: 'Money', kind: 'text', why: 'No number agreed = no booking, only a promise.', required: true },
  { key: 'paymentMode', label: 'Payment mode', stage: 4, group: 'Money', kind: 'choice', options: ['UPI now', 'Bank transfer', 'Card / EMI', 'At property'], why: 'Mode decides how fast money actually lands.', required: true },
  { key: 'agreementReady', label: 'Agreement / KYC ready', stage: 4, group: 'Money', kind: 'choice', options: ['Ready', 'Docs pending', 'Not started'], why: 'Handover stalls on paperwork more often than on price.', required: true },

  // ---- Call 5 — recall / revive
  { key: 'revivalReason', label: 'Why it stalled', stage: 5, group: 'Revival', kind: 'text', why: 'Call 5 only works if you name the exact reason it went cold.', required: true },
  { key: 'recallWindow', label: 'Recall window', stage: 5, group: 'Revival', kind: 'choice', options: ['This week', 'Next month', 'Next quarter', 'Dead'], why: 'Sets when the lead re-enters the queue.', required: true },
];

export const CALL_STAGES: { stage: CallStage; title: string; short: string; goal: string }[] = [
  { stage: 1, title: 'Call 1 · Qualify', short: 'Qualify', goal: 'Find out if this lead is even real — city, area, budget, move date.' },
  { stage: 2, title: 'Call 2 · Shortlist & visit', short: 'Visit', goal: 'Match 2-3 properties to their commute, then put a visit on the calendar.' },
  { stage: 3, title: 'Call 3 · Close', short: 'Close', goal: 'Name the objection, kill it, and ask for the token.' },
  { stage: 4, title: 'Call 4 · Money & handover', short: 'Money', goal: 'Get the token in, then clear KYC and the agreement.' },
  { stage: 5, title: 'Call 5 · Revive', short: 'Revive', goal: 'Name why it died, give one reason to restart, set the recall window.' },
];

export const STAGE_ORDER: CallStage[] = [1, 2, 3, 4, 5];

/** One-tap presets — merge with what you've already filled. */
export const DEAL_PRESETS: { label: string; tone: 'good' | 'warn' | 'bad'; hint: string; patch: LeadDiscovery }[] = [
  { label: 'Very high · PB', tone: 'good', hint: 'Ready to book — push a personal booking today.', patch: { dealRead: 'Very high', goal: 'Personal booking (PB)', tokenReadiness: 'Ready now' } },
  { label: 'Hard close', tone: 'warn', hint: 'Wants it, needs pressure and proof.', patch: { dealRead: 'Hard close', goal: 'Offline visit' } },
  { label: 'Maybe · visit first', tone: 'warn', hint: 'Get them on a tour before talking money.', patch: { dealRead: 'Maybe', goal: 'Offline visit' } },
  { label: 'Try nearby → reassign', tone: 'bad', hint: 'Out of our zone or budget — hand it over instead of burning a call.', patch: { dealRead: 'Try nearby' } },
];

export function stageFields(stage: CallStage) {
  return DISCOVERY_FIELDS.filter((f) => f.stage === stage);
}

export function filled(d: LeadDiscovery | undefined, key: DiscoveryKey) {
  const v = d?.[key];
  return typeof v === 'string' ? v.trim().length > 0 : Boolean(v);
}

export function missingForStage(d: LeadDiscovery | undefined, stage: CallStage) {
  return stageFields(stage).filter((f) => f.required && !filled(d, f.key));
}

export function stageComplete(d: LeadDiscovery | undefined, stage: CallStage) {
  return missingForStage(d, stage).length === 0;
}

/** Where this lead actually is in the ladder — the system decides, not the rep. */
export function currentStage(l: Pick<Lead, 'discovery' | 'callStage'>): CallStage {
  const d = l.discovery;
  if (!stageComplete(d, 1)) return 1;
  if (!stageComplete(d, 2)) return 2;
  if (!stageComplete(d, 3)) return 3;
  if (!stageComplete(d, 4)) return 4;
  return 5;
}

/**
 * Everything required up to and including the current call — the answers the
 * rep must have in hand *before* dialling. Earlier-stage gaps get pulled
 * forward so a Call-3 lead never carries a blank Call-1 field.
 */
export function preCallBacklog(d: LeadDiscovery | undefined, stage: CallStage) {
  return DISCOVERY_FIELDS.filter((f) => f.required && f.stage < stage && !filled(d, f.key));
}

export function discoveryProgress(d: LeadDiscovery | undefined) {
  const all = DISCOVERY_FIELDS.filter((f) => f.required);
  const done = all.filter((f) => filled(d, f.key)).length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
}

/** Everything still unknown, for the "what we don't know yet" strip. */
export function missingAll(d: LeadDiscovery | undefined) {
  return DISCOVERY_FIELDS.filter((f) => f.required && !filled(d, f.key));
}

/** ---------------------------------------------------------------
 *  Effort / closing readiness — "can I actually close this?"
 *  Anything under 99% is not closeable: something is still unknown.
 *  --------------------------------------------------------------- */

export interface Readiness {
  pct: number;
  closeable: boolean;
  blockers: string[];
  done: number;
  total: number;
}

/** Fields that must exist before a close is even possible (Calls 1-3). */
const CLOSE_SET = DISCOVERY_FIELDS.filter((f) => f.required && f.stage <= 3);

export function closingReadiness(l: Pick<Lead, 'discovery' | 'waStatus' | 'touches' | 'nextCall'>): Readiness {
  const d = l.discovery;
  const blockers: string[] = [];

  const fieldDone = CLOSE_SET.filter((f) => filled(d, f.key)).length;
  CLOSE_SET.filter((f) => !filled(d, f.key)).forEach((f) => blockers.push(f.label));

  const extras: { ok: boolean; label: string }[] = [
    { ok: Boolean(l.waStatus), label: 'WhatsApp not checked' },
    { ok: (l.touches?.length ?? 0) > 0, label: 'No call logged yet' },
    { ok: Boolean(l.nextCall), label: 'No next call planned' },
  ];
  extras.filter((e) => !e.ok).forEach((e) => blockers.push(e.label));

  const done = fieldDone + extras.filter((e) => e.ok).length;
  const total = CLOSE_SET.length + extras.length;
  const pct = Math.round((done / total) * 100);
  return { pct, closeable: blockers.length === 0, blockers, done, total };
}

export function readinessTone(pct: number): 'good' | 'warn' | 'bad' {
  if (pct >= 99) return 'good';
  if (pct >= 60) return 'warn';
  return 'bad';
}

export function readinessVerdict(r: Readiness) {
  if (r.closeable) return 'Closeable — go for the close, give it 100%.';
  if (r.pct >= 80) return `${100 - r.pct}% short of closeable — ${r.blockers.length} gap${r.blockers.length === 1 ? '' : 's'} left.`;
  return 'Not closeable yet — fill the dossier before you pitch price.';
}

/** After this call, when should the next one happen? */
export function nextCallDefaultHours(stage: CallStage, connected: boolean) {
  if (!connected) return 3;
  return stage === 1 ? 24 : stage === 2 ? 12 : stage === 3 ? 6 : stage === 4 ? 4 : 72;
}

export function nextStage(_stage: CallStage, d: LeadDiscovery | undefined): CallStage {
  return currentStage({ discovery: d });
}

/** Opening message for WhatsApp, tuned to the stage + what we already know. */
export function waOpener(lead: Lead, stage: CallStage) {
  const name = lead.name.split(' ')[0];
  if (stage === 1) return `Hi ${name}, Gharpayy here about your stay in ${lead.area}. Quick 2 mins — can I check your budget, move-in date and preferred area?`;
  if (stage === 2) return `Hi ${name}, shortlisted a few options near you. When can you visit — today evening or tomorrow morning?`;
  if (stage === 3) return `Hi ${name}, holding the room for you. Shall we block it with the token today?`;
  if (stage === 4) return `Hi ${name}, sharing the payment link and the agreement checklist — shall I keep the room blocked for today?`;
  return `Hi ${name}, checking in on your stay plan — is it still on for this month?`;
}

/** Stage-specific talk track the rep reads while dialling. */
export function callScript(stage: CallStage): string[] {
  if (stage === 1) return [
    'Confirm you are speaking to the right person and that they are in Bangalore.',
    'Area → budget → move-in date, in that order. Never price first.',
    'Ask who is coming: self, couple, family, group. It changes the room.',
  ];
  if (stage === 2) return [
    'Anchor on commute: "where do you work / study from?"',
    'Offer two tour slots, not an open question.',
    'Confirm who else needs to be on the visit.',
  ];
  if (stage === 3) return [
    'Ask the objection out loud: "what is stopping you today?"',
    'Reconfirm move-in date and sharing.',
    'Ask for the token — silence after asking.',
  ];
  if (stage === 4) return [
    'Send the link on the call, stay on until the payment lands.',
    'Confirm KYC docs and agreement date.',
  ];
  return [
    'Name why it stalled last time before pitching anything new.',
    'Give one reason to restart now, then set the recall window.',
  ];
}

/** ---------------------------------------------------------------
 *  THE PLAYBOOK — each call is a different job with a different
 *  script, a different set of 3-4 questions and its own outcomes.
 *  Nothing outside the current call is ever rendered.
 *  --------------------------------------------------------------- */

export interface CallOutcomeOption {
  value: CallOutcome;
  label: string;
  tone: 'good' | 'warn' | 'bad';
}

export interface CallPlay {
  stage: CallStage;
  code: string;
  name: string;
  mission: string;
  /** When this call is allowed to happen at all. */
  entry: string;
  /** What makes this call a win. Anything else is a retry. */
  win: string;
  colour: 'primary' | 'good' | 'warn' | 'bad';
  /** First line out of your mouth, before any question. */
  open: (lead: Lead) => string;
  /** Max 4 — the only questions shown on this call. */
  ask: DiscoveryKey[];
  /** Shown only behind "ask if it comes up". Always skippable. */
  optional: DiscoveryKey[];
  /** Two or three moves, stage specific. */
  moves: string[];
  /** Outcomes that make sense for THIS call only. */
  outcomes: CallOutcomeOption[];
  /** No-pickup ladder: what to do, how long to wait, where it lands. */
  noAnswer: { retryHours: number; move: string; afterAttempts: number; fallback: CallStage };
}

const O = {
  good: (value: CallOutcome, label: string): CallOutcomeOption => ({ value, label, tone: 'good' }),
  warn: (value: CallOutcome, label: string): CallOutcomeOption => ({ value, label, tone: 'warn' }),
  bad: (value: CallOutcome, label: string): CallOutcomeOption => ({ value, label, tone: 'bad' }),
};

export const CALL_PLAYS: Record<CallStage, CallPlay> = {
  1: {
    stage: 1, code: 'C1', name: 'Qualify', colour: 'primary',
    mission: 'Find out if this lead is even real — city, area, budget, move date.',
    entry: 'Fresh lead, nothing known yet.',
    win: 'You can name their area, budget and move date without guessing.',
    open: (l) => `Hi ${l.name.split(' ')[0]}, Gharpayy here about your stay in ${l.area} — 2 minutes, is now okay?`,
    ask: ['inBangalore', 'areas', 'budget', 'moveIn'],
    optional: ['personaType', 'roomType', 'genderNeed'],
    moves: [
      'Confirm the name, then ask "are you already in Bangalore?" — that one answer decides everything after.',
      'Area → budget → move date. Never quote a price first.',
      'Close with: "I will send 3 options on WhatsApp today."',
    ],
    outcomes: [
      O.good('connected-interested', 'Qualified · real requirement'),
      O.warn('connected-not-now', 'Talked · move date far'),
      O.warn('busy-callback', 'Busy · asked callback'),
      O.bad('not-interested', 'Already sorted / not looking'),
      O.bad('wrong-number', 'Wrong number'),
    ],
    noAnswer: { retryHours: 3, move: 'Retry in 3h at a different hour, then a one-line WhatsApp.', afterAttempts: 3, fallback: 5 },
  },
  2: {
    stage: 2, code: 'C2', name: 'Shortlist & visit',
    colour: 'primary',
    mission: 'Match 2-3 properties to their commute, then put a visit on the calendar.',
    entry: 'Call 1 answered — basics are on record.',
    win: 'A date and time for a visit, agreed out loud.',
    open: (l) => `Hi ${l.name.split(' ')[0]}, shortlisted 3 places in ${l.area} in your budget — when can you see them?`,
    ask: ['officeLocation', 'sharing', 'decisionMaker', 'tourSlot'],
    optional: ['company', 'food', 'stayDuration', 'movingFeasibility'],
    moves: [
      'Anchor on commute: "where do you head out to every morning?"',
      'Offer exactly two slots — today evening or tomorrow morning. Never "when are you free?"',
      'Ask who else is coming, and confirm they are free at the same slot.',
    ],
    outcomes: [
      O.good('connected-interested', 'Visit slot agreed'),
      O.warn('connected-not-now', 'Interested · slot not fixed'),
      O.warn('busy-callback', 'Asked to call later'),
      O.bad('not-interested', 'Dropped out'),
    ],
    noAnswer: { retryHours: 4, move: 'Send the 3 options on WhatsApp with two slots, retry in 4h.', afterAttempts: 3, fallback: 5 },
  },
  3: {
    stage: 3, code: 'C3', name: 'Close', colour: 'good',
    mission: 'Name the objection, kill it, and ask for the token.',
    entry: 'Visit done or virtual tour done.',
    win: 'They say yes to blocking the room.',
    open: (l) => `Hi ${l.name.split(' ')[0]}, how did the place feel? Shall I block the room for you?`,
    ask: ['objection', 'competition', 'moveInConfirmed', 'tokenReadiness'],
    optional: [],
    moves: [
      'Ask it straight: "what is stopping you from confirming today?"',
      'Handle exactly one objection — price, location or timing. Do not stack answers.',
      'Ask for the token, then stay silent until they speak.',
    ],
    outcomes: [
      O.good('connected-interested', 'Said yes · will pay token'),
      O.warn('connected-not-now', 'Wants time / comparing'),
      O.warn('busy-callback', 'Decision maker not available'),
      O.bad('not-interested', 'Booked elsewhere'),
    ],
    noAnswer: { retryHours: 2, move: 'Hot lead — retry in 2h, then WhatsApp a hold-expiry nudge.', afterAttempts: 4, fallback: 5 },
  },
  4: {
    stage: 4, code: 'C4', name: 'Money & handover', colour: 'good',
    mission: 'Get the token in, then clear KYC and the agreement.',
    entry: 'They already said yes on Call 3.',
    win: 'Payment landed and the move-in date is locked.',
    open: (l) => `Hi ${l.name.split(' ')[0]}, sending the payment link now — I will stay on the line while you pay.`,
    ask: ['tokenAmount', 'paymentMode', 'agreementReady'],
    optional: [],
    moves: [
      'Send the link while on the call. Do not hang up before it lands.',
      'Read out the KYC list once: ID, photo, one emergency contact.',
      'Confirm the move-in date and who hands over the keys.',
    ],
    outcomes: [
      O.good('connected-interested', 'Token paid / link sent live'),
      O.warn('connected-not-now', 'Will pay later today'),
      O.warn('busy-callback', 'Payment blocked · needs approval'),
      O.bad('not-interested', 'Backed out'),
    ],
    noAnswer: { retryHours: 1, move: 'Money call — retry within the hour, the room hold is ticking.', afterAttempts: 4, fallback: 5 },
  },
  5: {
    stage: 5, code: 'C5', name: 'Revive', colour: 'warn',
    mission: 'Name why it died, give one reason to restart, set the recall window.',
    entry: 'Went cold, or no pickup after the retry ladder.',
    win: 'Either a fresh date on the calendar, or an honest "dead".',
    open: (l) => `Hi ${l.name.split(' ')[0]}, checking in — is the ${l.area} plan still on, or has it changed?`,
    ask: ['revivalReason', 'recallWindow'],
    optional: [],
    moves: [
      'Say why you are calling back before pitching anything.',
      'One new reason to restart — a new property, a price drop, a slot.',
      'If it is dead, mark it dead. A clean dead beats a fake maybe.',
    ],
    outcomes: [
      O.good('connected-interested', 'Revived · back in play'),
      O.warn('connected-not-now', 'Later · park it'),
      O.bad('not-interested', 'Dead · close it out'),
    ],
    noAnswer: { retryHours: 72, move: 'One WhatsApp, then park it for the next cycle.', afterAttempts: 2, fallback: 5 },
  },
};

export function play(stage: CallStage) {
  return CALL_PLAYS[stage];
}

export function fieldByKey(k: DiscoveryKey) {
  return DISCOVERY_FIELDS.find((f) => f.key === k)!;
}

export function askFields(stage: CallStage): DiscoveryField[] {
  return CALL_PLAYS[stage].ask.map(fieldByKey).filter(Boolean);
}

export function optionalFields(stage: CallStage): DiscoveryField[] {
  return CALL_PLAYS[stage].optional.map(fieldByKey).filter(Boolean);
}

/** Attempts already made at this stage — drives the no-pickup ladder. */
export function attemptsAtStage(l: Pick<Lead, 'touches'>, stage: CallStage) {
  return (l.touches ?? []).filter((t) => t.stage === stage).length;
}

/** What happens when they don't pick up. Call 2 never runs if Call 1 never connected. */
export function noAnswerPlan(stage: CallStage, attempts: number) {
  const p = CALL_PLAYS[stage].noAnswer;
  const nextAttempt = attempts + 1;
  const exhausted = nextAttempt >= p.afterAttempts;
  return {
    attempt: nextAttempt,
    max: p.afterAttempts,
    exhausted,
    retryHours: exhausted ? 24 : p.retryHours,
    stage: exhausted ? p.fallback : stage,
    move: exhausted
      ? `Attempt ${nextAttempt} of ${p.afterAttempts} — stop dialling ${CALL_PLAYS[stage].code}. It drops to Call 5 · Revive.`
      : p.move,
  };
}

/** Only the questions this call owns that are still blank. */
export function openAsks(d: LeadDiscovery | undefined, stage: CallStage) {
  return askFields(stage).filter((f) => !filled(d, f.key));
}
