import { CallStage, Lead } from './types';
import { CALL_PLAYS, DISCOVERY_FIELDS, askFields, filled, waStatusMeta } from './call-plan';
import { leadPath, PATH_META, type LeadPath } from './talk-track';

/** ---------------------------------------------------------------
 *  Call OS — what an operator must know BEFORE the phone rings, and
 *  what counts as a real win when it is put down.
 *
 *  Rule: a call is "complete" when its fields are filled; it is "won"
 *  only when the next movement exists. Complete ≠ won.
 *  --------------------------------------------------------------- */

export interface BriefFact { label: string; value: string }

export interface PreCallBrief {
  path: LeadPath;
  pathLabel: string;
  pathWin: string;
  /** One line: why this call is happening now. */
  why: string;
  /** Everything already known — never ask these again. */
  know: BriefFact[];
  /** Explicit do-not-ask list, generated from what is already captured. */
  dontAsk: string[];
  /** What must be true when the call ends. */
  win: string;
  /** Red flags to say out loud if they show up. */
  redFlags: string[];
}

const WHY: Record<CallStage, string> = {
  1: 'Brand-new lead. Decide in two minutes whether this is real, and which funnel it belongs to.',
  2: 'They have seen options. This call exists to put a tour on the calendar — nothing else.',
  3: 'Tour is done. Name the objection, send the written quotation, ask for the token.',
  4: 'They said yes. This call exists to move money and clear KYC today.',
  5: 'It went cold. Name the real reason, give one new reason to restart, set the recall window.',
};

/** Path-specific win condition per call — the hard fork applied to outcomes. */
export function callWinCondition(stage: CallStage, path: LeadPath): string {
  if (stage === 1) {
    return path === 'outstation'
      ? 'Dossier captured AND a virtual-tour slot agreed. No slot = not won.'
      : path === 'blr'
        ? 'Dossier captured AND a physical-visit slot agreed. No slot = not won.'
        : 'City fork answered first — everything else is guesswork until then.';
  }
  if (stage === 2) {
    return path === 'outstation'
      ? 'Virtual tour actually happened on video — not "videos sent".'
      : 'Physical visit locked with pin sent and caretaker informed.';
  }
  if (stage === 3) return 'Objection named, written quotation sent, token asked for out loud.';
  if (stage === 4) return 'Token received and KYC / agreement status recorded.';
  return 'Either a dated recall window, or a clean dead — never a fake maybe.';
}

export function preCallBrief(lead: Lead, stage: CallStage): PreCallBrief {
  const path = leadPath(lead);
  const meta = PATH_META[path];
  const d = lead.discovery ?? {};

  const know: BriefFact[] = DISCOVERY_FIELDS
    .filter((f) => f.stage <= stage && filled(d, f.key))
    .map((f) => ({ label: f.label, value: d[f.key]! }));

  const wa = waStatusMeta(lead.waStatus);
  if (wa) know.unshift({ label: 'WhatsApp', value: wa.label });

  const dontAsk = DISCOVERY_FIELDS
    .filter((f) => f.stage < stage && filled(d, f.key))
    .map((f) => f.label);

  return {
    path,
    pathLabel: meta.label,
    pathWin: meta.win,
    why: WHY[stage],
    know,
    dontAsk,
    win: callWinCondition(stage, path),
    redFlags: redFlags(lead, stage, path),
  };
}

function redFlags(lead: Lead, stage: CallStage, path: LeadPath): string[] {
  const d = lead.discovery ?? {};
  const flags: string[] = [];

  if (path === 'unknown') flags.push('City not confirmed — do not quote, do not book a physical visit.');
  if (path === 'outstation') flags.push('Out of Bangalore — never promise a physical visit or same-day keys.');
  if (stage >= 3 && !d.objection) flags.push('No objection recorded — you are closing blind.');
  if (stage >= 2 && !d.officeLocation) flags.push('Commute unknown — the shortlist is a guess.');
  if (stage >= 3 && !filled(d, 'budget')) flags.push('No budget on record — quoting now will blow the deal.');
  if (stage === 1 && (d.budget || d.tokenAmount)) flags.push('Price talk started too early — quotation belongs to C3.');
  if (d.dealRead === 'Try nearby') flags.push('Deal read is "try nearby" — reassign instead of burning the call.');
  if (d.competition === 'Booked elsewhere') flags.push('Booked elsewhere — go to C5 revive, not to a close.');
  return flags;
}

/** Complete = fields filled. Won = the next movement exists. */
export function callVerdict(lead: Lead, stage: CallStage) {
  const path = leadPath(lead);
  const d = lead.discovery ?? {};
  const required = askFields(stage).filter((f) => f.required);
  const open = required.filter((f) => !filled(d, f.key));
  const complete = open.length === 0;

  const won =
    stage === 1 ? complete && filled(d, 'inBangalore') && !!lead.nextCall
      : stage === 2 ? filled(d, 'tourSlot')
      : stage === 3 ? filled(d, 'objection') && filled(d, 'tokenReadiness')
      : stage === 4 ? filled(d, 'tokenAmount') && filled(d, 'paymentMode')
      : filled(d, 'recallWindow');

  return {
    complete,
    won,
    open,
    path,
    condition: callWinCondition(stage, path),
    verdict: won
      ? `${CALL_PLAYS[stage].code} won — next movement exists.`
      : complete
        ? `${CALL_PLAYS[stage].code} complete but NOT won — ${callWinCondition(stage, path)}`
        : `${open.length} required field${open.length === 1 ? '' : 's'} still open on ${CALL_PLAYS[stage].code}.`,
  };
}

export { leadPath, PATH_META };
export type { LeadPath };
