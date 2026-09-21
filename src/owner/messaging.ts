// Real tour confirmation messaging — replaces the no-op stub.
// Generates WhatsApp deep links with templated bodies and logs events.

import { whatsappLink, fmtWhen, mapsLink } from '@/myt/lib/messaging-utils';
import { glueBus } from './event-bus';

export type TourMessageKind =
  | 'confirmation'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'tcm_on_the_way'
  | 'running_late'
  | 'no_show_followup'
  | 'post_visit_thanks'
  | 'reschedule'
  | 'cancellation';

export interface TourMessageContext {
  tourId: string;
  leadName: string;
  phone: string;
  propertyName: string;
  area: string;
  tourDate: string; // YYYY-MM-DD
  tourTime: string; // HH:MM
  tcmName?: string;
  reasonOrNote?: string;
}

const SITE = 'Gharpayy';

export function buildTourMessage(kind: TourMessageKind, ctx: TourMessageContext): string {
  const when = fmtWhen(ctx.tourDate, ctx.tourTime);
  const map = mapsLink(ctx.area, ctx.propertyName);
  switch (kind) {
    case 'confirmation':
      return `Hi ${ctx.leadName} 👋\n\nYour tour at *${ctx.propertyName}* (${ctx.area}) is confirmed for *${when}*.\n\n📍 ${map}\n${ctx.tcmName ? `Your host: ${ctx.tcmName}\n` : ''}\nReply YES to confirm or NEW TIME to reschedule.\n\n— ${SITE}`;
    case 'reminder_24h':
      return `Reminder 🗓️\n\n${ctx.leadName}, your visit at *${ctx.propertyName}* is *tomorrow ${when}*.\n📍 ${map}\n\nSee you there! — ${SITE}`;
    case 'reminder_2h':
      return `In 2 hours ⏰\n\n${ctx.leadName}, your tour at *${ctx.propertyName}* is at *${ctx.tourTime}*.\n📍 ${map}\n\nReply if running late.`;
    case 'tcm_on_the_way':
      return `${ctx.tcmName ?? 'Your host'} is on the way to *${ctx.propertyName}* and will be there in ~10 min. See you soon, ${ctx.leadName}!`;
    case 'running_late':
      return `Hi ${ctx.leadName}, just a heads-up — ${ctx.tcmName ?? 'your host'} is running ${ctx.reasonOrNote ?? '10–15 min'} late. Thanks for your patience.`;
    case 'no_show_followup':
      return `Hi ${ctx.leadName}, we missed you at *${ctx.propertyName}* today. Want to reschedule? Reply with a new time and we'll set it up.`;
    case 'post_visit_thanks':
      return `Thanks for visiting *${ctx.propertyName}*, ${ctx.leadName}! 🙏\n\nHow did it feel? Reply 1 (Loved it) · 2 (Need to think) · 3 (Not a fit). Your feedback helps us match better.`;
    case 'reschedule':
      return `Hi ${ctx.leadName}, your tour at *${ctx.propertyName}* has been rescheduled to *${when}*.\n📍 ${map}\n\nSee you then! — ${SITE}`;
    case 'cancellation':
      return `Hi ${ctx.leadName}, your tour at *${ctx.propertyName}* on ${when} has been cancelled${ctx.reasonOrNote ? ` (${ctx.reasonOrNote})` : ''}. Reply if you'd like a new slot.`;
  }
}

export function tourMessageLink(kind: TourMessageKind, ctx: TourMessageContext): string {
  return whatsappLink(ctx.phone, buildTourMessage(kind, ctx));
}

export interface SendOptions {
  channel?: 'whatsapp' | 'sms' | 'inapp';
  openInNewTab?: boolean;
}

export function sendTourMessage(kind: TourMessageKind, ctx: TourMessageContext, opts: SendOptions = {}): { link: string; body: string } {
  const body = buildTourMessage(kind, ctx);
  const link = tourMessageLink(kind, ctx);
  const channel = opts.channel ?? 'whatsapp';

  if (typeof window !== 'undefined' && opts.openInNewTab !== false) {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
  glueBus.publish({ type: 'tour.confirmation.sent', tourId: ctx.tourId, channel });
  return { link, body };
}

export const MESSAGE_TEMPLATES: Array<{ kind: TourMessageKind; label: string; helper: string }> = [
  { kind: 'confirmation', label: 'Send confirmation', helper: 'After scheduling — sets expectation' },
  { kind: 'reminder_24h', label: '24h reminder', helper: 'Day-before nudge' },
  { kind: 'reminder_2h', label: '2h reminder', helper: 'Same-day, same-morning' },
  { kind: 'tcm_on_the_way', label: 'On the way', helper: 'TCM arriving in 10 min' },
  { kind: 'running_late', label: 'Running late', helper: 'Manage expectation' },
  { kind: 'no_show_followup', label: 'No-show follow-up', helper: 'Recover the lead' },
  { kind: 'post_visit_thanks', label: 'Post-visit thanks', helper: 'Triggers feedback loop' },
  { kind: 'reschedule', label: 'Reschedule notice', helper: 'After rescheduling' },
  { kind: 'cancellation', label: 'Cancellation', helper: 'Polite close' },
];
