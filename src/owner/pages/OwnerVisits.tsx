import { useMemo } from 'react';
import { useGlueEvents } from '@/owner/use-event-bus';
import { useOwner } from '@/owner/owner-context';
import { useApp } from '@/lib/store';
import { format } from 'date-fns';
import { useMountedNow } from '@/hooks/use-now';
import { Calendar, Activity, Phone, Eye, MessagesSquare, CheckCircle2 } from 'lucide-react';
import { roomHeroClass } from '@/owner/components/room-hero';
import { cn } from '@/lib/utils';

const EVENT_LABEL: Record<string, { label: string; icon: any; tone: string }> = {
  'team.visit.scheduled': { label: 'Visit scheduled', icon: Calendar, tone: 'text-info' },
  'team.visit.started':   { label: 'Visit started',   icon: Activity, tone: 'text-warning-foreground' },
  'team.visit.ended':     { label: 'Visit ended',     icon: CheckCircle2, tone: 'text-success' },
  'tour.confirmation.sent': { label: 'Confirmation sent', icon: MessagesSquare, tone: 'text-muted-foreground' },
  'team.lead.pitched':    { label: 'Lead pitched',    icon: Phone, tone: 'text-info' },
};

export function OwnerVisits() {
  const { currentOwnerId, properties: ownerProps } = useOwner();
  const { tours, leads, properties } = useApp();
  const [, mounted] = useMountedNow(60_000);

  const events = useGlueEvents((e) =>
    (e.type === 'team.visit.scheduled' || e.type === 'team.visit.started' || e.type === 'team.visit.ended' || e.type === 'tour.confirmation.sent' || e.type === 'team.lead.pitched')
    && (!('ownerId' in e) || !e.ownerId || e.ownerId === currentOwnerId), 30
  );

  const todays = useMemo(() => tours.filter((t) => {
    const d = new Date(t.scheduledAt);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }), [tours]);

  // Effort tally
  const effort = useMemo(() => {
    const c = { pitch: 0, scheduled: 0, started: 0, ended: 0, confirmation: 0 };
    events.forEach((e) => {
      if (e.type === 'team.lead.pitched') c.pitch++;
      if (e.type === 'team.visit.scheduled') c.scheduled++;
      if (e.type === 'team.visit.started') c.started++;
      if (e.type === 'team.visit.ended') c.ended++;
      if (e.type === 'tour.confirmation.sent') c.confirmation++;
    });
    return c;
  }, [events]);

  return (
    <div className="space-y-5 pb-12">
      <header>
        <h1 className="font-display text-xl md:text-2xl font-semibold tracking-tight">Visits at your property</h1>
        <p className="text-sm text-muted-foreground">Live feed from Flow Ops + TCM team — no separate app needed.</p>
      </header>

      {/* Effort tally */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        <Tally n={effort.pitch} label="Pitched" icon={Phone} />
        <Tally n={effort.scheduled} label="Scheduled" icon={Calendar} />
        <Tally n={effort.started} label="Started" icon={Activity} />
        <Tally n={effort.ended} label="Completed" icon={CheckCircle2} />
        <Tally n={effort.confirmation} label="Confirms sent" icon={MessagesSquare} />
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold">Today's tours</h2>
        </div>
        {!mounted ? <div className="text-xs text-muted-foreground">Loading…</div> : todays.length === 0 ? (
          <div className="text-xs text-muted-foreground">No tours scheduled today.</div>
        ) : (
          <div className="space-y-2">
            {todays.map((t) => {
              const lead = leads.find((l) => l.id === t.leadId);
              const prop = properties.find((p) => p.id === t.propertyId);
              return (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/20">
                  <div className={cn('h-10 w-10 rounded-xl grid place-items-center text-white font-mono font-bold text-[10px] shadow-sm', roomHeroClass(t.id))}>
                    {(prop?.name ?? 'R').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{lead?.name ?? '—'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">{prop?.name ?? '—'}</div>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">{format(new Date(t.scheduledAt), 'p')} · {t.status}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold">Live activity</h2>
        </div>
        {events.length === 0 ? (
          <div className="text-xs text-muted-foreground">No recent activity.</div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((e, i) => {
              const meta = EVENT_LABEL[e.type] ?? { label: e.type, icon: Activity, tone: 'text-muted-foreground' };
              const Icon = meta.icon;
              return (
                <div key={i} className="flex items-center gap-3 py-2 text-xs">
                  <Icon className={cn('h-3.5 w-3.5', meta.tone)} />
                  <span className="flex-1 font-medium">{meta.label}</span>
                  <span className="font-mono text-muted-foreground text-[10px] truncate">
                    {('tourId' in e && (e as any).tourId) || ('leadId' in e && (e as any).leadId) || ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Tally({ n, label, icon: Icon }: { n: number; label: string; icon: any }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-lg font-display font-semibold tabular-nums mt-0.5">{n}</div>
    </div>
  );
}
