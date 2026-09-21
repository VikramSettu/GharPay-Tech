import { useState } from 'react';
import { CallStage, Lead, TouchChannel } from '@/myt/lib/types';
import { UrgencyTimer } from '@/myt/components/UrgencyTimer';
import { teamMembers } from '@/myt/lib/mock-data';
import {
  Phone, Wallet, MapPin, Calendar, TrendingUp, Hand, Sparkles,
  CheckCircle2, Clock, MessageCircle, StickyNote, Send, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { intentBg } from '@/myt/lib/confidence';
import { currentStage, discoveryProgress, missingAll, waStatusMeta, CALL_STAGES, closingReadiness, readinessTone } from '@/myt/lib/call-plan';
import { LeadControlPanel } from '@/myt/components/LeadControlPanel';
import { CloseCommitButton } from '@/components/commitments/CloseCommitButton';
import {
  actionDueLabel, callOutcomes, isIncomplete, moveInLabel, nextActions, OWNERSHIP_DAYS, ownershipDay,
  tagLabel, tagTone,
} from '@/myt/lib/ownership';

export interface EnrichedLead {
  lead: Lead;
  intent: 'hard' | 'medium' | 'soft';
  budgetPower: number;
  conversionProb: number;
  expiresAt: string;
}

interface Props {
  e: EnrichedLead;
  actorId: string;
  /** 'market' = unclaimed board (single Claim action). 'owned' = execution queue. */
  variant: 'market' | 'owned';
  onClaim?: (l: Lead, channel?: TouchChannel, stage?: CallStage) => void;
  onTouch?: (l: Lead, ch: TouchChannel, stage?: CallStage) => void;
  onFinish?: (l: Lead) => void;
  onRelease?: (id: string) => void;
  onSchedule?: (l: Lead) => void;
  onAddNote: (id: string, text: string) => void;
}

export function LeadCard({ e, actorId, variant, onClaim, onTouch, onFinish, onRelease, onSchedule, onAddNote }: Props) {
  const [note, setNote] = useState('');
  const l = e.lead;
  const notes = (l.marketNotes ?? []).slice(-3).reverse();
  const mine = l.claimedBy === actorId;
  const incomplete = isIncomplete(l);

  const submitNote = () => {
    if (!note.trim()) return;
    onAddNote(l.id, note.trim());
    setNote('');
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-3 space-y-2 transition-all',
        e.intent === 'hard' && 'border-role-tcm/30 bg-role-tcm/5',
        e.intent === 'medium' && 'border-role-hr/20 bg-role-hr/5',
        e.intent === 'soft' && 'border-border bg-surface-2/40',
        incomplete && 'border-danger/50 bg-danger/5'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{l.name}</span>
            <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase', intentBg[e.intent])}>
              {e.intent}
            </span>
            {l.claimedBy && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {mine ? 'You' : teamMembers.find(m => m.id === l.claimedBy)?.name ?? 'Claimed'} · Day {ownershipDay(l)}/{OWNERSHIP_DAYS}
              </span>
            )}
            {(l.touches?.length ?? 0) > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-3 text-muted-foreground">
                {l.touches!.length} touch{l.touches!.length === 1 ? '' : 'es'}
              </span>
            )}
            {incomplete && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/30">
                Call + next action pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
            <a href={`tel:${l.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" />{l.phone}</a>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.area}</span>
            <span className="flex items-center gap-1"><Wallet className="h-3 w-3" />₹{(l.budget/1000).toFixed(0)}k</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{moveInLabel(l)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <UrgencyTimer expiresAt={e.expiresAt} />
          <CloseCommitButton
            leadId={l.id}
            leadName={l.name}
            leadPhone={l.phone}
            actorName={teamMembers.find(m => m.id === actorId)?.name ?? 'You'}
          />
        </div>
      </div>

      {(l.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {l.tags!.map(t => (
            <span
              key={t}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border',
                tagTone(t) === 'good' && 'bg-role-tcm/10 border-role-tcm/40 text-role-tcm',
                tagTone(t) === 'warn' && 'bg-role-hr/10 border-role-hr/40 text-role-hr',
                tagTone(t) === 'bad' && 'bg-danger/10 border-danger/40 text-danger'
              )}
            >
              {tagLabel(t)}
            </span>
          ))}
        </div>
      )}

      {/* Closing readiness — can I actually close this? Under 99% = no. */}
      {(() => {
        const r = closingReadiness(l);
        const t = readinessTone(r.pct);
        return (
          <div className={cn(
            'rounded-lg border px-2 py-1.5 space-y-1',
            t === 'good' ? 'border-role-tcm/40 bg-role-tcm/5'
              : t === 'warn' ? 'border-role-hr/30 bg-role-hr/5'
              : 'border-danger/30 bg-danger/5',
          )}>
            <div className="flex items-center gap-2 text-[10px]">
              <span className={cn('font-semibold tabular-nums',
                t === 'good' ? 'text-role-tcm' : t === 'warn' ? 'text-role-hr' : 'text-danger')}>
                {r.pct}% effort
              </span>
              <span className="text-muted-foreground">{r.closeable ? 'Closeable — give it 100%' : 'Not closeable yet'}</span>
              <span className="ml-auto text-muted-foreground">{r.done}/{r.total}</span>
            </div>
            <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
              <div className={cn('h-full transition-all',
                t === 'good' ? 'bg-role-tcm' : t === 'warn' ? 'bg-role-hr' : 'bg-danger')}
                style={{ width: `${r.pct}%` }} />
            </div>
            {r.blockers.length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                Blocking: {r.blockers.slice(0, 4).join(', ')}{r.blockers.length > 4 && ` +${r.blockers.length - 4}`}
              </div>
            )}
          </div>
        );
      })()}

      {/* WhatsApp state + call ladder + what we still don't know */}
      <div className="rounded-lg border bg-surface-2/50 px-2 py-1.5 space-y-1">
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className={cn(
            'px-1.5 py-0.5 rounded border',
            !l.waStatus ? 'border-border text-muted-foreground'
              : waStatusMeta(l.waStatus)?.tone === 'good' ? 'bg-role-tcm/10 border-role-tcm/40 text-role-tcm'
              : waStatusMeta(l.waStatus)?.tone === 'bad' ? 'bg-danger/10 border-danger/40 text-danger'
              : 'bg-role-hr/10 border-role-hr/40 text-role-hr'
          )}>
            WA: {waStatusMeta(l.waStatus)?.label ?? 'not checked'}
          </span>
          {l.waLabel && <span className="px-1.5 py-0.5 rounded border border-border text-muted-foreground">Label {l.waLabel}</span>}
          <span className="px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
            {CALL_STAGES.find(c => c.stage === currentStage(l))?.title}
          </span>
          <span className="ml-auto text-muted-foreground tabular-nums">
            Info {discoveryProgress(l.discovery).done}/{discoveryProgress(l.discovery).total}
          </span>
        </div>
        {missingAll(l.discovery).length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            Still needed: {missingAll(l.discovery).slice(0, 5).map(f => f.label).join(', ')}
            {missingAll(l.discovery).length > 5 && ` +${missingAll(l.discovery).length - 5}`}
          </div>
        )}
        {l.nextCall && (
          <div className="text-[10px] text-primary">
            Next planned call — Call {l.nextCall.stage} on {new Date(l.nextCall.dueAt).toLocaleString()} · {l.nextCall.purpose}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ScoreInline label="Budget power" value={e.budgetPower} icon={<Wallet className="h-3 w-3" />} />
        <ScoreInline label="Conversion prob" value={e.conversionProb} icon={<TrendingUp className="h-3 w-3" />} />
      </div>

      {l.nextAction && (
        <div className="flex items-center gap-2 text-[11px] rounded-lg border bg-surface-2/60 px-2 py-1.5 flex-wrap">
          <CheckCircle2 className="h-3 w-3 text-role-tcm" />
          <span className="text-foreground font-medium">
            {nextActions.find(a => a.value === l.nextAction!.type)?.label}
          </span>
          {l.nextAction.note && <span className="text-muted-foreground">· {l.nextAction.note}</span>}
          <span className={cn(
            'flex items-center gap-1 ml-auto',
            actionDueLabel(l.nextAction.dueAt).overdue ? 'text-danger' : 'text-muted-foreground'
          )}>
            <Clock className="h-3 w-3" />{actionDueLabel(l.nextAction.dueAt).text}
          </span>
          {l.callOutcome && (
            <span className="text-muted-foreground w-full">
              Last {l.lastChannel === 'whatsapp' ? 'chat' : 'call'}: {callOutcomes.find(c => c.value === l.callOutcome)?.label}
            </span>
          )}
        </div>
      )}

      {/* Shared notes — anyone can add value */}
      <div className="space-y-1.5">
        {notes.length > 0 && (
          <div className="space-y-1">
            {notes.map(n => (
              <div key={n.id} className="flex gap-1.5 text-[11px] text-muted-foreground">
                <StickyNote className="h-3 w-3 mt-0.5 shrink-0 text-role-hr" />
                <span><span className="text-foreground font-medium">{n.byName}:</span> {n.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <Input
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === 'Enter') submitNote(); }}
            placeholder="Add a note anyone can use…"
            className="h-8 text-xs"
          />
          <Button size="sm" variant="outline" className="h-8 px-2" disabled={!note.trim()} onClick={submitNote}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <LeadControlPanel
          subject={{ kind: 'lead', lead: l }}
          onStartTouch={(lead, channel, stage) => variant === 'market' ? onClaim?.(lead, channel, stage) : onTouch?.(lead, channel, stage)}
          trigger={
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Sparkles className="h-3 w-3" /> Open
            </Button>
          }
        />
        {variant === 'market' && !l.claimedBy && (
          <Button size="sm" onClick={() => onClaim?.(l)} className="h-8 text-xs flex-1 min-w-[8rem]">
            <Hand className="h-3 w-3 mr-1" /> Claim
          </Button>
        )}
        {variant === 'owned' && (
          <>
            {incomplete && mine && (
              <Button size="sm" variant="destructive" onClick={() => onFinish?.(l)} className="h-8 text-xs flex-1">
                Finish call log
              </Button>
            )}
            {mine && !incomplete && (
              <>
                <Button size="sm" onClick={() => onTouch?.(l, 'call')} className="h-8 text-xs">
                  <Phone className="h-3 w-3 mr-1" /> Call again
                </Button>
                <Button size="sm" variant="outline" onClick={() => onTouch?.(l, 'whatsapp')} className="h-8 text-xs">
                  <MessageCircle className="h-3 w-3 mr-1" /> Chat again
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onRelease?.(l.id)} className="h-8 text-xs text-muted-foreground">
                  <RotateCcw className="h-3 w-3 mr-1" /> Release
                </Button>
              </>
            )}
            {mine && (
              <Button size="sm" variant="outline" onClick={() => onSchedule?.(l)} className="h-8 text-xs">
                Schedule tour →
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ScoreInline({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const color = value >= 70 ? 'bg-role-tcm' : value >= 45 ? 'bg-role-hr' : 'bg-danger';
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">{icon}{label}</span>
        <span className="font-mono tabular-nums text-foreground">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-surface-3 mt-0.5 overflow-hidden">
        <div className={cn('h-full', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
