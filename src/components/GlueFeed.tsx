import { useGlueEvents } from '@/owner/use-event-bus';
import { Activity } from 'lucide-react';

const EVENT_LABEL: Record<string, string> = {
  'owner.room.updated': '🏠 Owner updated a room',
  'owner.room.locked': '🔒 Room auto-locked (unverified)',
  'owner.media.uploaded': '📸 Media uploaded',
  'owner.media.expired': '⏰ Media expired',
  'owner.block.approved': '✅ Owner approved block',
  'owner.block.rejected': '❌ Owner rejected block',
  'owner.compliance.scored': '📊 Compliance recalculated',
  'team.lead.pitched': '🎯 Team pitched a lead',
  'team.visit.scheduled': '📅 Visit scheduled',
  'team.visit.started': '🚶 Visit started',
  'team.visit.ended': '🏁 Visit ended',
  'team.block.requested': '🔔 Team requested a block',
  'team.task.created': '✨ New task created',
  'team.activation.required': '⚡ Activation required',
  'tcm.report.required': '📝 TCM report required',
  'tcm.report.filed': '✍️ TCM report filed',
  'system.daily.truth.warning': '⚠️ Daily-truth warning',
  'system.daily.truth.locked': '🔒 Daily-truth locked',
  'tour.confirmation.sent': '💬 Tour confirmation sent',
  'tour.reminder.sent': '🔔 Tour reminder sent',
};

export function GlueFeed({ limit = 30, title = 'Closed-loop activity' }: { limit?: number; title?: string }) {
  const events = useGlueEvents(undefined, limit);
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">{events.length} events · live</span>
      </header>
      {events.length === 0 ? (
        <div className="px-4 py-6 text-xs text-muted-foreground text-center">No events yet — perform an action to see the loop fire.</div>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((e, i) => (
            <li key={i} className="px-4 py-2 text-xs flex items-center gap-2">
              <span className="flex-1">{EVENT_LABEL[e.type] ?? e.type}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{e.type}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
