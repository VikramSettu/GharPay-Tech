import { useMemo } from 'react';
import { useOwner } from '@/owner/owner-context';
import { useGlueEvents } from '@/owner/use-event-bus';
import { TrendingUp, MessageSquare, AlertTriangle, Activity, Eye, IndianRupee, Sparkles } from 'lucide-react';
import { OBJECTION_LABELS } from '@/owner/types';
import { cn } from '@/lib/utils';

export function OwnerInsights() {
  const { currentOwnerId, insights, objections, roomStatuses, rooms, properties } = useOwner();
  const insight = insights.find((i) => i.ownerId === currentOwnerId);
  const reports = useGlueEvents((e) => e.type === 'tcm.report.filed', 10);
  const myObjections = objections.filter((o) => o.ownerId === currentOwnerId);
  const mySt = roomStatuses.filter((r) => r.ownerId === currentOwnerId);

  // Top viewed rooms (demand heatmap)
  const topViewed = useMemo(() => {
    return [...mySt].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 5);
  }, [mySt]);

  // Objection counts
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    myObjections.forEach((o) => { c[o.reason] = (c[o.reason] ?? 0) + 1; });
    return c;
  }, [myObjections]);

  return (
    <div className="space-y-5 pb-12">
      <header>
        <h1 className="font-display text-xl md:text-2xl font-semibold tracking-tight">Demand insights</h1>
        <p className="text-sm text-muted-foreground">What the market is telling you about your supply.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Leads pitched" value={insight?.leadsPitched ?? 0} icon={TrendingUp} />
        <Tile label="Visits done" value={insight?.visitsDone ?? 0} icon={Activity} />
        <Tile label="High intent" value={insight?.highIntent ?? 0} icon={Sparkles} />
        <Tile label="Top objection" value={insight?.topObjection ?? '—'} icon={MessageSquare} small />
      </div>

      {insight?.priceMismatchSignal && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Price signal</div>
            <div className="text-xs text-muted-foreground mt-0.5">{insight.priceMismatchSignal}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Recommended: drop ₹500–₹1000 on next vacating bed to test conversion.
            </div>
          </div>
        </div>
      )}

      {/* Objection bars */}
      {Object.keys(counts).length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-sm font-semibold">Why deals don't close</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(counts).sort(([, a], [, b]) => b - a).map(([reason, count]) => (
              <div key={reason} className="flex items-center gap-3">
                <div className="text-sm w-32 font-medium">{OBJECTION_LABELS[reason as keyof typeof OBJECTION_LABELS]}</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full', reason === 'price' ? 'bg-destructive' : 'bg-warning')}
                    style={{ width: `${(count / myObjections.length) * 100}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-muted-foreground w-10 text-right">{count}×</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top viewed rooms */}
      {topViewed.length > 0 && topViewed[0].views ? (
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-sm font-semibold">Most-viewed rooms</h2>
          </div>
          <div className="divide-y divide-border">
            {topViewed.map((s) => {
              const r = rooms.find((x) => x.id === s.roomId);
              const p = properties.find((x) => x.id === s.propertyId);
              return (
                <div key={s.roomId} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p?.name ?? '—'} · {r?.type ?? 'room'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono inline-flex items-center gap-1">
                      <IndianRupee className="h-2.5 w-2.5" />{(s.rentConfirmed ?? r?.currentPrice ?? 0).toLocaleString()}/mo
                    </div>
                  </div>
                  <div className="font-mono text-sm font-semibold tabular-nums inline-flex items-center gap-1">
                    <Eye className="h-3 w-3 text-muted-foreground" /> {s.views}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-sm font-semibold mb-3">Recent post-visit reports</h2>
        {reports.length === 0 ? (
          <div className="text-xs text-muted-foreground">No reports filed yet.</div>
        ) : (
          <div className="space-y-1 text-xs">
            {reports.map((r, i) => (
              <div key={i} className="border-b border-border last:border-0 py-1.5">
                Tour <span className="font-mono">{(r as any).tourId}</span> ·
                {' '}objection: <span className="font-medium">{(r as any).objection ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, icon: Icon, small }: { label: string; value: string | number; icon: any; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={small ? 'text-xs font-medium mt-1' : 'text-2xl font-display font-semibold mt-1 tabular-nums'}>{value}</div>
    </div>
  );
}
