import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '@/myt/lib/app-context';
import { budgetPowerScore, conversionProbability, leadIntent, urgencyExpiry, zoneMedianBudget } from '@/myt/lib/scoring';
import { zones, teamMembers } from '@/myt/lib/mock-data';
import {
  Zap, Target, Inbox, ArrowRight, TrendingUp, Clock, AlertTriangle, Trophy, Flame, Wallet,
  Rows3, LayoutGrid, ListOrdered, Layers, Hand, MapPin, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from '@/shims/react-router-dom';
import { ClaimCallSheet } from '@/myt/components/ClaimCallSheet';
import { BulkAddLeads } from '@/myt/components/BulkAddLeads';
import { LeadCard, EnrichedLead } from '@/myt/components/LeadCard';
import { todayScoreboard, DAILY_CONNECT_TARGET, marketLane, marketPulse, ownerStats, moveInLabel, type MarketLane } from '@/myt/lib/ownership';
import { useLeadActions } from '@/myt/lib/use-lead-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LeadMarketplace() {
  const { globalZoneFilter } = useAppState();
  const {
    leads, setLeads, owners, actorId, actorName, setCurrentMemberId,
    active, sheetMode, sheetChannel, sheetStage, setActive, claimLead, completeTouch, addNote, abandon,
  } = useLeadActions();

  /** Marketplace = only what is still buyable. Claimed leads leave the board. */
  const open: EnrichedLead[] = useMemo(() => {
    return leads
      .filter(l => !l.claimedBy && l.status !== 'dead' && l.status !== 'tour-scheduled')
      .filter(l => !globalZoneFilter || zones.find(z => z.id === globalZoneFilter)?.area === l.area)
      .map(l => {
        const median = zoneMedianBudget(leads, l.area);
        const intent = leadIntent(l);
        const bp = l.budgetPowerScore ?? budgetPowerScore(l.budget, median);
        const cp = l.conversionProbability ?? conversionProbability(bp, intent, undefined);
        const exp = l.urgencyExpiresAt ?? urgencyExpiry(intent, l.createdAt);
        return { lead: l, intent, budgetPower: bp, conversionProb: cp, expiresAt: exp };
      })
      .sort((a, b) => b.conversionProb - a.conversionProb);
  }, [leads, globalZoneFilter]);

  const [view, setView] = useState<ViewMode>('lanes');
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('myt.market.view') : null;
    if (saved && VIEWS.some((v) => v.key === saved)) setView(saved as ViewMode);
  }, []);
  const pickView = (v: ViewMode) => { setView(v); try { window.localStorage.setItem('myt.market.view', v); } catch { /* ignore */ } };

  const board = todayScoreboard(leads);
  const pulse = marketPulse(leads);
  const stats = ownerStats(leads, teamMembers).filter(s => s.owned > 0 || s.touchesToday > 0);
  const best = stats.slice(0, 3);
  const worst = stats.slice(-3).reverse().filter(s => !best.includes(s));
  const myOwned = leads.filter(l => l.claimedBy === actorId).length;
  const lanes: { key: MarketLane; title: string; hint: string; tone: string }[] = [
    { key: 'now', title: 'Call now · seconds matter', hint: 'Ready to book, moving in ≤3 days, or 80%+ probability.', tone: 'border-danger/50 bg-danger/5' },
    { key: 'today', title: 'Do today', hint: 'Fresh, moving soon, or strong conversion potential.', tone: 'border-role-hr/40 bg-role-hr/5' },
    { key: 'next', title: 'Work next', hint: 'Good pipeline for the next focused calling block.', tone: 'border-primary/30 bg-primary/5' },
    { key: 'nurture', title: 'Future move-in', hint: 'Keep warm by month and bring forward when intent changes.', tone: 'border-border bg-surface-2/30' },
  ];
  const grouped = lanes.map((lane) => ({ ...lane, items: open.filter((item) => marketLane(item.lead, item.conversionProb) === lane.key) }));
  const laneRank: Record<MarketLane, number> = { now: 0, today: 1, next: 2, nurture: 3 };
  const queue = [...open].sort((a, b) =>
    laneRank[marketLane(a.lead, a.conversionProb)] - laneRank[marketLane(b.lead, b.conversionProb)]
    || b.conversionProb - a.conversionProb);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Daily goal — 80 connected calls */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 md:p-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Target className="h-4 w-4" /> Today's goal — {DAILY_CONNECT_TARGET} connected calls
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {board.connected}
              <span className="text-base font-medium text-muted-foreground"> / {board.target} done</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {board.remaining > 0
                ? `${board.remaining} more connected calls to hit the number.`
                : 'Target hit — every extra connect is upside.'}
            </p>
          </div>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <Mini label="Calls" value={board.calls} />
            <Mini label="Chats" value={board.chats} />
            <Mini label="Touches" value={board.touches} />
            <Mini label="Tours set" value={board.tours} />
          </div>
        </div>
        <div className="h-2 rounded-full bg-surface-3 mt-3 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${board.pct}%` }} />
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-role-hr" />
            Lead Marketplace
          </h1>
          <p className="text-xs text-muted-foreground">
            One action here: <strong className="text-foreground">Claim</strong>. The moment you claim, the lead leaves the
            board and lands in <Link to="/myt/my-leads" className="text-primary underline">My Leads</Link> — that's where calls, chats and next actions happen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Working as</span>
            <Select value={actorId} onValueChange={setCurrentMemberId}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {owners.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link to="/myt/my-leads">My Leads ({myOwned}) <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
          <BulkAddLeads
            onAdd={(newLeads) => {
              setLeads(prev => [...newLeads, ...prev]);
              toast.success(`${newLeads.length} leads added to the marketplace`);
            }}
            addedBy={actorId}
            addedByName={actorName}
          />
        </div>
      </div>

      {/* What's happening / what's coming */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Pulse label="Open to claim" value={pulse.open} hint="Marketplace target is zero" icon={<Inbox className="h-3 w-3" />} accent={pulse.open === 0 ? 'green' : 'amber'} />
        <Pulse label="Claimed today" value={pulse.claimedToday} hint={`${pulse.owned} owned in total`} icon={<Flame className="h-3 w-3" />} accent="primary" />
        <Pulse label="Due in 2h" value={pulse.dueNext2h} hint={`${pulse.overdue} already overdue`} icon={<Clock className="h-3 w-3" />} accent={pulse.overdue ? 'red' : 'green'} />
        <Pulse label="Hot & unclaimed" value={pulse.hotOpen} hint="70%+ conversion prob" icon={<TrendingUp className="h-3 w-3" />} accent="amber" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Pulse label="Tours queued" value={pulse.toursQueued} hint="Next action = schedule tour" icon={<Target className="h-3 w-3" />} accent="primary" />
        <Pulse label="Tokens queued" value={pulse.tokensQueued} hint="Money in reach" icon={<Wallet className="h-3 w-3" />} accent="green" />
        <Pulse label="Expected bookings" value={pulse.expectedBookings} hint={`₹${Math.round(pulse.pipelineValue / 1000)}k weighted pipeline`} icon={<TrendingUp className="h-3 w-3" />} accent="green" />
        <Pulse label="Ownership expiring" value={pulse.expiringOwnership} hint="Under 3 days left" icon={<AlertTriangle className="h-3 w-3" />} accent={pulse.expiringOwnership ? 'red' : 'green'} />
      </div>

      {/* Who's doing best / worst */}
      {stats.length > 0 && (
        <div className="grid md:grid-cols-2 gap-2">
          <Leaderboard title="Performing best today" tone="good" rows={best} icon={<Trophy className="h-3.5 w-3.5" />} />
          <Leaderboard title="Needs help right now" tone="bad" rows={worst} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-muted-foreground">
          {open.length} open lead{open.length === 1 ? '' : 's'} · pick the layout that reads best for you.
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {VIEWS.map((v) => (
            <button key={v.key} type="button" onClick={() => pickView(v.key)} title={v.hint}
              className={cn('flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all',
                view === v.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {v.icon}{v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {open.length === 0 && (
          <div className="glass-card p-8 text-center space-y-2">
            <Inbox className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="text-sm font-medium text-foreground">Marketplace is at zero</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Every lead is owned. That's the target state — work them from{' '}
              <Link to="/myt/my-leads" className="text-primary underline">My Leads</Link>, or paste today's fresh leads with Bulk add.
            </p>
          </div>
        )}
        {view === 'queue' ? (
          <section className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-1.5">
            <header className="flex items-center justify-between gap-3 px-0.5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Priority queue</h2>
                <p className="text-[10px] text-muted-foreground">Work strictly top to bottom — number 1 is the next call.</p>
              </div>
              <span className="text-lg font-bold tabular-nums">{queue.length}</span>
            </header>
            {queue.map((e, i) => (
              <LeadRow key={e.lead.id} e={e} rank={i + 1} lane={marketLane(e.lead, e.conversionProb)} onClaim={claimLead} />
            ))}
          </section>
        ) : (
          grouped.filter((lane) => lane.items.length > 0).map((lane) => (
            <section key={lane.key} className={cn('rounded-lg border p-2.5 space-y-2', lane.tone)}>
              <header className="flex items-center justify-between gap-3 px-0.5">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{lane.title}</h2>
                  <p className="text-[10px] text-muted-foreground">{lane.hint}</p>
                </div>
                <span className="text-lg font-bold tabular-nums">{lane.items.length}</span>
              </header>
              {view === 'rows' ? (
                <div className="space-y-1.5">
                  {lane.items.map((e) => (
                    <LeadRow key={e.lead.id} e={e} lane={lane.key} onClaim={claimLead} />
                  ))}
                </div>
              ) : (
                <div className={cn(view === 'grid' && 'grid gap-2 md:grid-cols-2 xl:grid-cols-3', view === 'lanes' && 'space-y-2')}>
                  {lane.items.map((e) => (
                    <LeadCard key={e.lead.id} e={e} actorId={actorId} variant="market" onClaim={claimLead} onAddNote={addNote} />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>

      <ClaimCallSheet
        lead={active}
        open={Boolean(active)}
        mode={sheetMode}
        channel={sheetChannel}
        initialStage={sheetStage}
        onOpenChange={(v) => { if (!v) setActive(null); }}
        onComplete={(p) => { if (active) completeTouch(active.id, p); setActive(null); }}
        onAbandon={abandon}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-base font-bold tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
    </div>
  );
}

function Pulse({ label, value, hint, icon, accent }: {
  label: string; value: number; hint: string; icon: React.ReactNode;
  accent?: 'green' | 'amber' | 'primary' | 'red';
}) {
  return (
    <div className="glass-card p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className={cn(
        'text-xl font-bold tabular-nums mt-0.5',
        accent === 'green' && 'text-role-tcm',
        accent === 'amber' && 'text-role-hr',
        accent === 'primary' && 'text-primary',
        accent === 'red' && 'text-danger',
        !accent && 'text-foreground'
      )}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function Leaderboard({ title, rows, tone, icon }: {
  title: string;
  rows: { id: string; name: string; connectedToday: number; touchesToday: number; toursSet: number; overdue: number; incomplete: number; score: number }[];
  tone: 'good' | 'bad';
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-card p-3 space-y-2">
      <div className={cn('flex items-center gap-1.5 text-xs font-semibold', tone === 'good' ? 'text-role-tcm' : 'text-danger')}>
        {icon}{title}
      </div>
      {rows.length === 0 && <p className="text-[11px] text-muted-foreground">No activity logged yet today.</p>}
      {rows.map((r, i) => (
        <div key={r.id} className="flex items-center gap-2 text-[11px]">
          <span className="w-4 text-muted-foreground tabular-nums">{i + 1}</span>
          <span className="font-medium text-foreground flex-1 truncate">{r.name}</span>
          <span className="text-muted-foreground">{r.connectedToday} conn · {r.toursSet} tours</span>
          {(r.overdue > 0 || r.incomplete > 0) && (
            <span className="text-danger">{r.overdue + r.incomplete} slipping</span>
          )}
          <span className="tabular-nums font-mono text-foreground w-8 text-right">{r.score}</span>
        </div>
      ))}
    </div>
  );
}


type ViewMode = 'lanes' | 'rows' | 'grid' | 'queue';

const VIEWS: { key: ViewMode; label: string; hint: string; icon: React.ReactNode }[] = [
  { key: 'lanes', label: 'Stack', hint: 'Full cards stacked inside each urgency lane', icon: <Layers className="h-3 w-3" /> },
  { key: 'rows', label: 'Rows', hint: 'Dense one-line rows — most leads on screen', icon: <Rows3 className="h-3 w-3" /> },
  { key: 'grid', label: 'Board', hint: 'Cards in a multi-column board', icon: <LayoutGrid className="h-3 w-3" /> },
  { key: 'queue', label: 'Queue', hint: 'One ranked list, call strictly top-down', icon: <ListOrdered className="h-3 w-3" /> },
];

const LANE_DOT: Record<MarketLane, string> = {
  now: 'bg-danger',
  today: 'bg-role-hr',
  next: 'bg-primary',
  nurture: 'bg-muted-foreground/50',
};

function LeadRow({ e, rank, lane, onClaim }: {
  e: EnrichedLead; rank?: number; lane: MarketLane;
  onClaim: (l: EnrichedLead['lead']) => void;
}) {
  const l = e.lead;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 hover:border-primary/50 transition-colors">
      {rank !== undefined && <span className="w-5 shrink-0 text-[11px] font-bold tabular-nums text-muted-foreground">{rank}</span>}
      <span className={cn('h-2 w-2 shrink-0 rounded-full', LANE_DOT[lane])} />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{l.name}</span>
      <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0"><Wallet className="h-3 w-3" />₹{(l.budget / 1000).toFixed(0)}k</span>
      <span className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 truncate max-w-28"><MapPin className="h-3 w-3" />{l.area}</span>
      <span className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0"><Calendar className="h-3 w-3" />{moveInLabel(l)}</span>
      <span className="shrink-0 text-[11px] font-bold tabular-nums text-primary">{Math.round(e.conversionProb)}%</span>
      <Button size="sm" className="h-7 shrink-0 text-[11px]" onClick={() => onClaim(l)}>
        <Hand className="mr-1 h-3 w-3" /> Claim
      </Button>
    </div>
  );
}
