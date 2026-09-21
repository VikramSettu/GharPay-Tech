import { useMemo, useState } from 'react';
import { useAppState } from '@/myt/lib/app-context';
import { budgetPowerScore, conversionProbability, leadIntent, urgencyExpiry, zoneMedianBudget } from '@/myt/lib/scoring';
import { zones, teamMembers } from '@/myt/lib/mock-data';
import { AlertTriangle, Clock, Inbox, Target, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link, useNavigate } from '@/shims/react-router-dom';
import { ClaimCallSheet } from '@/myt/components/ClaimCallSheet';
import { LeadCard, EnrichedLead } from '@/myt/components/LeadCard';
import { useLeadActions } from '@/myt/lib/use-lead-actions';
import { isIncomplete, OWNERSHIP_DAYS, todayScoreboard } from '@/myt/lib/ownership';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Bucket = 'due' | 'all' | 'team';

/** Execution queue for leads already claimed — the loop lives here, not in the marketplace. */
export default function MyLeads() {
  const { globalZoneFilter } = useAppState();
  const navigate = useNavigate();
  const [bucket, setBucket] = useState<Bucket>('due');
  const {
    leads, owners, actorId, setCurrentMemberId,
    active, sheetMode, sheetChannel, sheetStage, setActive,
    openSheet, releaseLead, completeTouch, addNote, abandon,
  } = useLeadActions();

  const enrich = (l: (typeof leads)[number]): EnrichedLead => {
    const median = zoneMedianBudget(leads, l.area);
    const intent = leadIntent(l);
    const bp = l.budgetPowerScore ?? budgetPowerScore(l.budget, median);
    const cp = l.conversionProbability ?? conversionProbability(bp, intent, undefined);
    return { lead: l, intent, budgetPower: bp, conversionProb: cp, expiresAt: l.urgencyExpiresAt ?? urgencyExpiry(intent, l.createdAt) };
  };

  const mine = useMemo(() => leads.filter(l => l.claimedBy === actorId), [leads, actorId]);
  const team = useMemo(() => leads.filter(l => l.claimedBy && l.claimedBy !== actorId), [leads, actorId]);

  const now = Date.now();
  const dueNow = mine.filter(l => isIncomplete(l) || (l.nextAction && new Date(l.nextAction.dueAt).getTime() - now < 2 * 3600_000));
  const incomplete = mine.filter(isIncomplete);
  const board = todayScoreboard(leads);

  const source = bucket === 'due' ? dueNow : bucket === 'all' ? mine : team;
  const list = source
    .filter(l => !globalZoneFilter || zones.find(z => z.id === globalZoneFilter)?.area === l.area)
    .map(enrich)
    .sort((a, b) => {
      const ad = a.lead.nextAction ? new Date(a.lead.nextAction.dueAt).getTime() : Infinity;
      const bd = b.lead.nextAction ? new Date(b.lead.nextAction.dueAt).getTime() : Infinity;
      return ad - bd;
    });

  const scheduleFromLead = (l: (typeof leads)[number]) => {
    navigate('/myt/schedule');
    toast.info(`Pre-fill: ${l.name} · ₹${l.budget} · ${l.area}`);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-role-tcm" />
            My Leads — execution queue
          </h1>
          <p className="text-xs text-muted-foreground">
            Everything you claimed lives here for {OWNERSHIP_DAYS} days. Call / chat again → log outcome → set the next action.
            Need more? <Link to="/myt/marketplace" className="text-primary underline">Claim from the marketplace</Link>.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Owned by you" value={mine.length} icon={<Target className="h-3 w-3" />} />
        <Stat label="Due now / 2h" value={dueNow.length} icon={<Clock className="h-3 w-3" />} accent={dueNow.length ? 'amber' : 'green'} />
        <Stat label="Incomplete" value={incomplete.length} icon={<AlertTriangle className="h-3 w-3" />} accent={incomplete.length ? 'red' : 'green'} />
        <Stat label="Your connects today" value={board.connected} icon={<Zap className="h-3 w-3" />} accent="primary" />
      </div>

      {incomplete.length > 0 && (
        <div className="rounded-xl border border-danger/40 bg-danger/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" />
            {incomplete.length} claimed lead{incomplete.length === 1 ? '' : 's'} without a logged call or next action
          </div>
          <div className="flex flex-wrap gap-1.5">
            {incomplete.map(l => (
              <Button key={l.id} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openSheet(l, 'claim', 'call')}>
                Finish {l.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        {([['due', `Due now (${dueNow.length})`], ['all', `All mine (${mine.length})`], ['team', `Team owned (${team.length})`]] as [Bucket, string][]).map(([v, label]) => (
          <Button key={v} size="sm" variant={bucket === v ? 'default' : 'outline'} className="h-7 text-[11px]" onClick={() => setBucket(v)}>
            {v === 'team' && <Users className="h-3 w-3 mr-1" />}{label}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {list.length === 0 && (
          <div className="glass-card p-8 text-center space-y-2">
            <Inbox className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="text-sm font-medium text-foreground">
              {bucket === 'team' ? 'Nobody else owns leads right now' : 'Nothing waiting on you'}
            </div>
            <p className="text-xs text-muted-foreground">
              <Link to="/myt/marketplace" className="text-primary underline">Go claim the next lead</Link> and keep the marketplace at zero.
            </p>
          </div>
        )}
        {list.map(e => (
          <LeadCard
            key={e.lead.id}
            e={e}
            actorId={actorId}
            variant="owned"
            onTouch={(l, ch, stage) => openSheet(l, 'touch', ch, stage)}
            onFinish={(l) => openSheet(l, 'claim', 'call')}
            onRelease={releaseLead}
            onSchedule={scheduleFromLead}
            onAddNote={addNote}
          />
        ))}
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

function Stat({ label, value, icon, accent }: {
  label: string; value: number; icon: React.ReactNode;
  accent?: 'green' | 'amber' | 'primary' | 'red';
}) {
  return (
    <div className="glass-card p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className={cn(
        'text-xl font-bold tabular-nums mt-0.5',
        accent === 'green' && 'text-role-tcm',
        accent === 'amber' && 'text-role-hr',
        accent === 'primary' && 'text-primary',
        accent === 'red' && 'text-danger',
        !accent && 'text-foreground'
      )}>{value}</div>
    </div>
  );
}
