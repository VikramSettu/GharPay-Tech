import { useMemo } from 'react';
import { useOwner } from '@/owner/owner-context';
import { Link } from '@tanstack/react-router';
import {
  Building2, ShieldCheck, AlertTriangle, Lock, Camera, Inbox, BarChart3, Clock,
  Trophy, CheckCircle2, Sparkles, Activity, TrendingUp, Wallet, Calendar, XCircle,
} from 'lucide-react';
import { useMountedNow } from '@/hooks/use-now';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/owner/components/Countdown';
import { ownerTier, roomHeroClass } from '@/owner/components/room-hero';
import { OBJECTION_LABELS } from '@/owner/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CoachInline } from '@/components/CoachInline';

export function OwnerHome() {
  const {
    currentOwnerId, setCurrentOwnerId,
    owners, complianceFor, roomStatuses, blocks, insights, truth,
    properties, rooms, objections, violations, decideBlock,
  } = useOwner();
  const owner = owners.find((o) => o.id === currentOwnerId) ?? owners[0];
  const compliance = complianceFor(owner.id);
  const myStatuses = roomStatuses.filter((r) => r.ownerId === owner.id);
  const myProps = properties.filter((p) => owner.propertyIds.includes(p.id));
  const myRooms = rooms.filter((r) => myProps.some((p) => p.id === r.propertyId));
  const verified = myStatuses.filter((r) => r.verifiedToday).length;
  const locked = myStatuses.filter((r) => r.lockedUnsellable).length;
  const dedicated = myStatuses.filter((r) => r.isDedicated).length;
  const sellable = myStatuses.filter((r) => r.verifiedToday && !r.lockedUnsellable && (r.kind === 'vacant' || r.kind === 'vacating')).length;
  const pendingBlocks = blocks.filter((b) => b.ownerId === owner.id && b.state === 'pending');
  const insight = insights.find((i) => i.ownerId === owner.id);
  const myObjections = objections.filter((o) => o.ownerId === owner.id);
  const [, mounted] = useMountedNow(60_000);
  const tier = ownerTier(compliance.score);

  // Revenue lens
  const revenue = useMemo(() => {
    const occupiedRooms = myStatuses.filter((s) => s.kind === 'occupied');
    const filledBeds = occupiedRooms.reduce((acc, s) => {
      const r = myRooms.find((x) => x.id === s.roomId);
      return acc + (r?.bedsOccupied ?? 0);
    }, 0);
    const totalBeds = myRooms.reduce((acc, r) => acc + r.bedsTotal, 0);
    const validRents = myStatuses.map((s) => s.rentConfirmed).filter((x): x is number => !!x);
    const avgRent = validRents.length ? Math.round(validRents.reduce((a, b) => a + b, 0) / validRents.length) : 0;
    const monthly = occupiedRooms.reduce((acc, s) => acc + (s.rentConfirmed ?? 0), 0);
    const vacant = myStatuses.filter((s) => s.kind === 'vacant').length;
    return { filledBeds, totalBeds, avgRent, monthly, vacant };
  }, [myStatuses, myRooms]);

  // Demand bars
  const demandBars = useMemo(() => {
    const c: Record<string, number> = {};
    myObjections.forEach((o) => { c[o.reason] = (c[o.reason] ?? 0) + 1; });
    return c;
  }, [myObjections]);

  // Vacancy forecast
  const forecast = useMemo(() => {
    const map: Record<string, typeof myStatuses> = {};
    myStatuses.forEach((s) => {
      if (s.vacatingDate) {
        map[s.vacatingDate] = map[s.vacatingDate] || [];
        map[s.vacatingDate].push(s);
      }
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [myStatuses]);

  const phaseColor = truth.phase === 'locked' ? 'bg-destructive/10 text-destructive border-destructive/30'
    : truth.phase === 'warning' ? 'bg-warning/15 text-warning-foreground border-warning/30'
    : truth.phase === 'open' ? 'bg-info/10 text-info border-info/30'
    : 'bg-muted text-muted-foreground border-border';

  return (
    <div className="space-y-6 pb-12">
      {/* OWNER SWITCHER — for demoing comparison across our 4 owners */}
      <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        {owners.map((o) => {
          const active = o.id === owner.id;
          return (
            <button
              key={o.id}
              onClick={() => setCurrentOwnerId(o.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap transition-colors",
                active
                  ? "border-warning/50 bg-warning/10 text-warning-foreground"
                  : "border-border bg-card hover:bg-muted text-muted-foreground",
              )}
            >
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                o.tier === "priority" ? "bg-success" : o.tier === "throttled" ? "bg-destructive" : "bg-info",
              )} />
              {o.name}
            </button>
          );
        })}
      </div>

      <CoachInline page="owner" />

      {/* HERO */}
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Welcome back, {owner.name.split(' ')[0]}</div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
            Your inventory, your control.
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill your beds without losing control.
            {pendingBlocks.length > 0 && (
              <span className="text-warning-foreground font-medium"> · {pendingBlocks.length} request{pendingBlocks.length > 1 ? 's' : ''} need your call.</span>
            )}
          </p>
        </div>
        <div className={`text-[11px] font-mono inline-flex items-center gap-2 rounded-md border px-2 py-1 ${phaseColor}`}>
          <Clock className="h-3 w-3" />
          {truth.phase === 'idle' && 'Update window opens 9:30 AM'}
          {truth.phase === 'open' && 'OPEN — update all rooms'}
          {truth.phase === 'warning' && 'WARNING — auto-lock at 11 AM'}
          {truth.phase === 'locked' && 'LOCKED — unverified rooms removed from supply'}
          {mounted && truth.msToNextTransition > 0 && truth.phase !== 'locked' && (
            <span>· {formatDistanceToNowStrict(new Date(Date.now() + truth.msToNextTransition))}</span>
          )}
        </div>
      </header>

      {/* TRUST TIER + COMPLIANCE — premium band */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className={cn(
          'h-2 w-full',
          tier.tone === 'success' && 'bg-gradient-to-r from-emerald-400 to-teal-500',
          tier.tone === 'warning' && 'bg-gradient-to-r from-amber-400 to-orange-500',
          tier.tone === 'muted' && 'bg-muted',
        )} />
        <div className="p-5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              'h-14 w-14 rounded-2xl grid place-items-center text-white shadow-sm',
              tier.tone === 'success' && 'bg-gradient-to-br from-emerald-400 to-teal-500',
              tier.tone === 'warning' && 'bg-gradient-to-br from-amber-400 to-orange-500',
              tier.tone === 'muted' && 'bg-muted text-muted-foreground',
            )}>
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Priority tier</div>
              <div className="text-2xl font-display font-semibold">{tier.tier}</div>
              <div className="text-[11px] text-muted-foreground">Higher tier = more leads routed to you</div>
            </div>
          </div>
          <div className="hidden sm:block h-12 w-px bg-border" />
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Trust score · today</div>
              <div className="text-lg font-bold tabular-nums">{compliance.score}/100</div>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full transition-all',
                  compliance.score >= 80 ? 'bg-success' : compliance.score >= 50 ? 'bg-warning' : 'bg-destructive')}
                style={{ width: `${compliance.score}%` }}
              />
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
              {dedicated} dedicated · {compliance.totalRooms} total rooms · {compliance.mediaFreshRooms} fresh media
            </div>
          </div>
          {violations > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <div className="text-xs font-mono font-semibold">{violations} violation{violations > 1 ? 's' : ''}</div>
            </div>
          )}
        </div>
      </section>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Sellable" value={sellable} sub="Live to team" tone="success" />
        <StatCard icon={Sparkles} label="Dedicated" value={dedicated} sub="Auto-bookable" tone="info" />
        <StatCard icon={Lock} label="Locked" value={locked} sub="Need confirm" tone="danger" />
        <StatCard icon={Clock} label="Pending" value={pendingBlocks.length} sub="Block requests" tone="warning" />
      </div>

      {/* PENDING BLOCKS — top priority, inline */}
      {pendingBlocks.length > 0 && (
        <section className="space-y-3">
          <SectionHeader icon={Inbox} title="Pending block requests" subtitle="Approve or reject — auto-released after 15 min" tone="warning" />
          <div className="space-y-2">
            {pendingBlocks.map((req) => {
              const room = myRooms.find((r) => r.id === req.roomId);
              const prop = properties.find((p) => p.id === req.propertyId);
              const heroId = room?.id ?? req.roomId;
              return (
                <div key={req.id} className="rounded-xl border border-warning/30 bg-card p-3 flex flex-wrap items-center gap-3">
                  <div className={cn('h-12 w-12 rounded-xl grid place-items-center text-white font-mono font-bold text-xs shadow-sm', roomHeroClass(heroId))}>
                    {(prop?.name ?? 'R').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="text-sm font-semibold">{req.leadName} <span className="text-muted-foreground font-normal">· intent {req.intent}</span></div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {prop?.name ?? 'Room'} · {room?.type ?? 'room'} ({room?.bedsTotal ?? '—'} beds)
                    </div>
                    <div className="text-[11px] mt-1 inline-flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-warning-foreground" />
                      Auto-expires in <Countdown to={req.expiresAt} />
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-initial" onClick={() => {
                      decideBlock(req.id, 'rejected');
                      toast.error('Block rejected', { description: `${req.leadName} released.` });
                    }}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button size="sm" className="flex-1 sm:flex-initial" onClick={() => {
                      decideBlock(req.id, 'approved');
                      toast.success('Block approved', { description: `Locked for ${req.leadName}.` });
                    }}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TODAY CHECKLIST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChecklistTile to="/owner/rooms" icon={Building2} label="Update rooms"
          subtitle={truth.phase === 'locked' ? `${locked} locked — fix now` : `${myStatuses.length - verified} pending`}
          accent={truth.phase === 'locked' ? 'destructive' : verified === myStatuses.length ? 'success' : 'warning'}
        />
        <ChecklistTile to="/owner/blocks" icon={Inbox} label="Block requests"
          subtitle={pendingBlocks.length ? `${pendingBlocks.length} need response` : 'Inbox zero'}
          accent={pendingBlocks.length ? 'warning' : 'success'}
        />
        <ChecklistTile to="/owner/visits" icon={Camera} label="Visits today"
          subtitle="Live tour activity"
          accent="default"
        />
      </div>

      {/* REVENUE LENS */}
      <section className="space-y-3">
        <SectionHeader icon={Wallet} title="Revenue lens" subtitle="Cash flow at a glance" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <RevTile label="Filled beds" value={`${revenue.filledBeds}/${revenue.totalBeds}`} />
          <RevTile label="Avg rent" value={`₹${revenue.avgRent.toLocaleString()}`} />
          <RevTile label="Vacant rooms" value={revenue.vacant} tone="warning" />
          <RevTile label="Monthly revenue" value={`₹${revenue.monthly.toLocaleString()}`} tone="success" />
        </div>
      </section>

      {/* INSIGHT SUMMARY */}
      {insight && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-sm font-semibold">Demand summary · {format(new Date(), 'EEE, MMM d')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Mini label="Leads pitched" value={insight.leadsPitched} />
            <Mini label="Visits done" value={insight.visitsDone} />
            <Mini label="High intent" value={insight.highIntent} />
            <Mini label="Top objection" value={insight.topObjection ?? '—'} small />
          </div>
          {insight.priceMismatchSignal && (
            <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning-foreground" />
              <span className="font-medium">Price signal:</span> {insight.priceMismatchSignal}
            </div>
          )}
          <Link to="/owner/insights" className="text-xs text-accent inline-flex items-center gap-1">View deep insights →</Link>
        </section>
      )}

      {/* DEMAND SIGNALS — objection bars */}
      {Object.keys(demandBars).length > 0 && (
        <section className="space-y-3">
          <SectionHeader icon={TrendingUp} title="Demand signals" subtitle="Why deals don't close" />
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {Object.entries(demandBars).sort(([, a], [, b]) => b - a).map(([reason, count]) => (
              <div key={reason} className="flex items-center gap-3">
                <div className="text-sm w-32 font-medium">{OBJECTION_LABELS[reason as keyof typeof OBJECTION_LABELS]}</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full', reason === 'price' ? 'bg-destructive' : 'bg-warning')}
                    style={{ width: `${(count / myObjections.length) * 100}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-muted-foreground w-14 text-right">{count}×</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* VACANCY FORECAST */}
      {forecast.length > 0 && (
        <section className="space-y-3">
          <SectionHeader icon={Calendar} title="Vacancy forecast" subtitle="Plan ahead" />
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {forecast.map(([date, items]) => (
              <div key={date} className="flex items-center gap-4 p-3">
                <div className="font-mono text-sm font-semibold w-24">{date}</div>
                <div className="text-xs text-muted-foreground flex-1 truncate">
                  {items.map((s) => {
                    const r = myRooms.find((x) => x.id === s.roomId);
                    const p = properties.find((x) => x.id === s.propertyId);
                    return `${p?.name ?? '—'} ${r?.type ?? ''}`;
                  }).join(' · ')}
                </div>
                <div className="text-[10px] font-mono text-warning-foreground bg-warning/10 border border-warning/30 px-2 py-0.5 rounded-full">
                  {items.length} room{items.length > 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LOCKED BANNER */}
      {locked > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-destructive text-sm">{locked} room{locked > 1 ? 's' : ''} auto-locked</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Not verified before 11 AM. Removed from sellable inventory. Update them now to bring them back online.
            </div>
            <Link to="/owner/rooms" className="inline-block mt-2 text-xs text-destructive font-medium">Open rooms →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ───── primitives ─────
function SectionHeader({ icon: Icon, title, subtitle, tone }: { icon: any; title: string; subtitle?: string; tone?: 'warning' }) {
  return (
    <div className="flex items-end justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', tone === 'warning' ? 'text-warning-foreground' : 'text-muted-foreground')} />
        <h2 className="font-display text-sm font-semibold">{title}</h2>
      </div>
      {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: number | string; sub: string; tone: 'success' | 'info' | 'warning' | 'danger' }) {
  const t = {
    success: 'border-success/30 text-success',
    info: 'border-info/30 text-info',
    warning: 'border-warning/30 text-warning-foreground',
    danger: 'border-destructive/30 text-destructive',
  }[tone];
  return (
    <div className={cn('rounded-xl border bg-card p-3', t.split(' ')[0])}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', t.split(' ')[1])} />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</span>
      </div>
      <div className="text-2xl font-display font-semibold tabular-nums mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function RevTile({ label, value, tone }: { label: string; value: string | number; tone?: 'success' | 'warning' }) {
  const c = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning-foreground' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
      <div className={cn('text-xl font-display font-semibold tabular-nums mt-1', c)}>{value}</div>
    </div>
  );
}

function Mini({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={small ? 'text-xs font-medium' : 'text-lg font-semibold'}>{value}</div>
    </div>
  );
}

function ChecklistTile({ to, icon: Icon, label, subtitle, accent }: {
  to: string; icon: any; label: string; subtitle: string; accent: 'default' | 'warning' | 'destructive' | 'success';
}) {
  const border = {
    default: 'border-border',
    warning: 'border-warning/40',
    destructive: 'border-destructive/40',
    success: 'border-success/40',
  }[accent];
  return (
    <Link to={to} className={cn('block rounded-xl border bg-card p-3 hover:border-accent/50 transition-colors', border)}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
    </Link>
  );
}
