import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Phone, MessageCircle, CheckCircle2, AlertTriangle, ArrowRight, StickyNote,
  Copy, CalendarClock, PhoneOff, SkipForward, Target, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionTimer } from '@/lib/productivity/use-session-timer';
import { JourneyTrack } from '@/myt/components/JourneyTrack';
import { SessionTimerBadge } from '@/components/productivity/SessionTimerBadge';
import { useAppState } from '@/myt/lib/app-context';
import { teamMembers } from '@/myt/lib/mock-data';
import { Lead, CallOutcome, NextActionType, TouchChannel, WaStatus, CallStage, LeadDiscovery, DiscoveryKey, PlannedCall } from '@/myt/lib/types';
import {
  nextActions, suggestedAction, isoIn, waLink,
  marketplaceTags, tagLabel, isConnected, OWNERSHIP_DAYS,
} from '@/myt/lib/ownership';
import {
  WA_STATUSES, WA_LABELS, suggestedWaLabel, CALL_STAGES,
  currentStage, filled, preCallBacklog, stageFields,
  nextCallDefaultHours, nextStage, closingReadiness, readinessTone,
  DiscoveryField, play, askFields, optionalFields, attemptsAtStage, noAnswerPlan,
} from '@/myt/lib/call-plan';
import { toast } from 'sonner';

export interface TouchPayload {
  channel: TouchChannel;
  outcome: CallOutcome;
  notes: string;
  action: NextActionType;
  dueAt: string;
  actionNote: string;
  tags: string[];
  waStatus?: WaStatus;
  waLabel?: string;
  stage: CallStage;
  discovery: LeadDiscovery;
  captured: DiscoveryKey[];
  nextCall: PlannedCall;
}

interface Props {
  lead: Lead | null;
  open: boolean;
  mode?: 'claim' | 'touch';
  channel?: TouchChannel;
  initialStage?: CallStage;
  onOpenChange: (v: boolean) => void;
  onComplete: (payload: TouchPayload) => void;
  onAbandon: () => void;
}

type Step = 'wa' | 'brief' | 'dial' | 'pickup' | 'ask' | 'wrap';

/**
 * One screen at a time. The system decides which call this is (1-5) and only
 * that call's questions ever appear. No pickup → the ladder handles it and the
 * call's questions are never shown, because they are not relevant yet.
 */
export function ClaimCallSheet({ lead, open, mode = 'claim', channel = 'call', initialStage, onOpenChange, onComplete, onAbandon }: Props) {
  const [step, setStep] = useState<Step>('wa');
  const [ch, setCh] = useState<TouchChannel>(channel);
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null);
  const [waLabel, setWaLabel] = useState<string>('');
  const [discovery, setDiscovery] = useState<LeadDiscovery>({});
  const [skipped, setSkipped] = useState<DiscoveryKey[]>([]);
  const [showOptional, setShowOptional] = useState(false);
  const [showSignals, setShowSignals] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [chatNotes, setChatNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [action, setAction] = useState<NextActionType | null>(null);
  const [dueAt, setDueAt] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [nextSt, setNextSt] = useState<CallStage>(1);

  const stage: CallStage = initialStage ?? (lead ? currentStage(lead) : 1);
  const p = play(stage);

  // 120s target: the whole claim → call → next-action loop is timed.
  const { currentMemberId } = useAppState();
  const actorId = currentMemberId ?? teamMembers[0]?.id ?? 'm1';
  const actorName = teamMembers.find((m) => m.id === actorId)?.name ?? 'Team';
  const timer = useSessionTimer({
    active: open && Boolean(lead),
    kind: mode === 'claim' ? 'claim' : 'call',
    leadId: lead?.id ?? '',
    leadName: lead?.name ?? '',
    actorId,
    actorName,
    outcome: outcome ?? undefined,
  });



  useEffect(() => {
    if (open && lead) {
      const st = currentStage(lead);
      setStep('wa'); setCh(channel); setOutcome(null); setNotes(''); setChatNotes('');
      setTags(lead.tags ?? []); setAction(null); setDueAt('');
      setSkipped([]); setShowOptional(false); setShowSignals(false);
      setWaStatus(lead.waStatus ?? null);
      setWaLabel(lead.waLabel ?? suggestedWaLabel(st));
      setDiscovery({ ...(lead.discovery ?? {}) });
      setNextSt(st); setNextAt('');
    }
  }, [open, channel, lead?.id]);

  const before = lead?.discovery ?? {};
  const captured = useMemo(
    () => (Object.keys(discovery) as DiscoveryKey[]).filter((k) => (discovery[k] ?? '').trim() && discovery[k] !== before[k]),
    [discovery, before],
  );

  const backlog = preCallBacklog(discovery, stage);
  const preCall = stageFields(stage).filter((f) => f.preCall && f.required && !filled(discovery, f.key));
  const brief = [...backlog, ...preCall].slice(0, 5);
  const asks = askFields(stage).filter((f) => !skipped.includes(f.key));
  const askLeft = asks.filter((f) => f.required && !filled(discovery, f.key));
  const briefLeft = brief.filter((f) => f.required && !filled(discovery, f.key));
  const readiness = closingReadiness({ ...(lead ?? {} as Lead), discovery });
  const tone = readinessTone(readiness.pct);
  const attempts = lead ? attemptsAtStage(lead, stage) : 0;
  const noAns = noAnswerPlan(stage, attempts);

  if (!lead) return null;

  const close = (release: boolean) => {
    if (release) onAbandon();
    onOpenChange(false);
  };

  const setField = (k: DiscoveryKey, v: string) => setDiscovery((prev) => ({ ...prev, [k]: v }));

  /** Didn't pick up / wrong number — skip every question, straight to the ladder. */
  const missedPath = (o: CallOutcome) => {
    setOutcome(o);
    setAction(o === 'wrong-number' ? 'nurture' : 'call-back');
    setDueAt(toLocalInput(isoIn(o === 'wrong-number' ? 72 : noAns.retryHours)));
    setNextSt(o === 'wrong-number' ? 5 : (noAns.stage as CallStage));
    setNextAt(toLocalInput(isoIn(o === 'wrong-number' ? 72 : noAns.retryHours)));
    setCh('call');
    setStep('wrap');
  };

  const pickOutcome = (o: CallOutcome) => {
    setOutcome(o);
    const suggested = suggestedAction[o];
    setAction(suggested);
    setDueAt(toLocalInput(isoIn(nextActions.find((a) => a.value === suggested)!.defaultInHours)));
    const ns = nextStage(stage, discovery);
    setNextSt(ns);
    setNextAt(toLocalInput(isoIn(nextCallDefaultHours(stage, isConnected(o)))));
  };

  const finish = () => {
    if (!outcome || !action || !dueAt || !nextAt) return;
    onComplete({
      channel: ch, outcome,
      notes: [chatNotes.trim(), notes.trim()].filter(Boolean).join(' · '),
      action, dueAt: new Date(dueAt).toISOString(), actionNote: '', tags,
      waStatus: waStatus ?? undefined,
      waLabel: waLabel || undefined,
      stage, discovery, captured,
      nextCall: {
        stage: nextSt,
        dueAt: new Date(nextAt).toISOString(),
        purpose: play(nextSt).mission,
      },
    });
    onOpenChange(false);
  };

  const missed = outcome === 'no-answer' || outcome === 'wrong-number';
  const stageLabel = `Call ${stage} · ${p.name}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(mode === 'claim'); }}>
       <DialogContent className="flex h-[calc(100dvh-0.5rem)] max-h-[42rem] w-[calc(100vw-0.5rem)] max-w-xl flex-col gap-0 overflow-hidden border-primary/25 bg-card p-0 shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
        {/* --------- header: who, which call, how ready --------- */}
         <div className="shrink-0 space-y-1.5 border-b border-primary/20 bg-secondary/70 px-4 py-2">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md border',
                p.colour === 'good' ? 'bg-role-tcm/10 border-role-tcm/40 text-role-tcm'
                  : p.colour === 'warn' ? 'bg-role-hr/10 border-role-hr/40 text-role-hr'
                  : 'bg-primary/10 border-primary/40 text-primary')}>{p.code}</span>
              <DialogTitle className="min-w-0 flex-1 truncate text-sm leading-tight">
                {lead.name} · ₹{(lead.budget / 1000).toFixed(0)}k · {lead.area}
              </DialogTitle>
              <SessionTimerBadge elapsed={timer.elapsed} />
            </div>
            <DialogDescription className="text-[11px]">
              <span className="font-medium text-foreground">{stageLabel}</span> — {p.mission}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-surface-2 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all',
                tone === 'good' ? 'bg-role-tcm' : tone === 'warn' ? 'bg-role-hr' : 'bg-danger')}
                style={{ width: `${readiness.pct}%` }} />
            </div>
            <span className={cn('text-[10px] font-semibold',
              tone === 'good' ? 'text-role-tcm' : tone === 'warn' ? 'text-role-hr' : 'text-danger')}>
              {readiness.pct}% {readiness.closeable ? 'closeable' : 'effort'}
            </span>
          </div>
          <JourneyTrack lead={{ ...lead, discovery: { ...(lead.discovery ?? {}), ...discovery } }} />
          <Trail step={step} missed={missed} />

        </div>

         <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2.5">
          {/* ---------------- WA ---------------- */}
          {step === 'wa' && (
             <div className="flex min-h-full flex-col gap-2">
              <div>
                <Head>Is there a WhatsApp chat already?</Head>
                <Why>This prevents duplicate messages and tells you how warm the conversation already is.</Why>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {WA_STATUSES.map((s) => (
                  <button key={s.value} type="button" title={s.hint} onClick={() => { setWaStatus(s.value); setWaLabel(suggestedWaLabel(stage)); }}
                    className={cn('min-h-12 rounded-md border px-1.5 py-1.5 text-center transition-all',
                      waStatus === s.value ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-card hover:border-primary/60 hover:bg-secondary')}>
                    <div className="text-[10px] font-semibold leading-tight">{s.label}</div>
                  </button>
                ))}
              </div>

              {waStatus && (
                <div className="rounded-md border border-primary/25 bg-primary/5 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-[11px]">Chat label</Label>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => { navigator.clipboard?.writeText(waLabel); toast.success(`&quot;${waLabel}&quot; copied`); }}><Copy className="mr-1 h-3 w-3" /> Copy</Button>
                      <Button asChild size="sm" className="h-7 text-[10px]"><a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1 h-3 w-3" /> Open chat</a></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {WA_LABELS.map((l) => (
                      <Chip key={l.value} active={waLabel === l.value} onClick={() => setWaLabel(l.value)}>{l.label}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {waStatus && waStatus !== 'no-chat' && waStatus !== 'not-on-wa' && (
                <Textarea rows={2} className="text-xs"
                  placeholder="What does the chat already tell us? (optional)"
                  value={chatNotes} onChange={(e) => setChatNotes(e.target.value)} />
              )}

              <div className="mt-auto sticky bottom-0 -mx-4 mt-auto border-t border-border bg-card px-4 py-2"><Nav
                back={<Button variant="ghost" size="sm" className="text-xs" onClick={() => close(mode === 'claim')}>
                  {mode === 'claim' ? 'Release lead' : 'Cancel'}
                </Button>}
                next={<Button size="sm" disabled={!waStatus || !waLabel}
                  onClick={() => setStep(brief.length ? 'brief' : 'dial')}>
                  {brief.length ? `Fill ${brief.length} before dialling` : `Go to ${p.code}`}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>}
              /></div>
            </div>
          )}

          {/* ---------------- BRIEF (only when something is genuinely missing) ---------------- */}
          {step === 'brief' && (
             <div className="flex min-h-full flex-col gap-2">
              <div><Head>Known before you dial</Head>
              <Why>These facts keep the opening relevant and stop a valuable call from becoming a generic pitch.</Why>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {backlog.length
                  ? `${backlog.length} answer${backlog.length === 1 ? '' : 's'} from an earlier call is still blank. Fill or skip — then ${p.code} can start.`
                  : 'Two taps to frame the call. Skip anything you genuinely do not know.'}
              </p></div>
              <Fields fields={brief} discovery={discovery} setField={setField}
                onSkip={(k) => setSkipped((s) => [...s, k])} />
              {discovery.dealRead === 'Try nearby' && (
                <div className="rounded-xl border border-danger/40 bg-danger/5 p-2.5 text-[11px] text-danger flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  "Try nearby" — don't burn a call. Release it so it reroutes to the right zone.
                </div>
              )}
              <div className="mt-auto sticky bottom-0 -mx-4 mt-auto border-t border-border bg-card px-4 py-2"><Nav
                back={<Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep('wa')}>Back</Button>}
                 next={<Button size="sm" disabled={briefLeft.length > 0} onClick={() => setStep('dial')}>
                   {briefLeft.length ? `Complete ${briefLeft.length} required` : `Start ${p.code}`} <ArrowRight className="h-3 w-3 ml-1" />
                 </Button>}
              /></div>
            </div>
          )}

          {/* ---------------- DIAL ---------------- */}
          {step === 'dial' && (
             <div className="flex min-h-full flex-col gap-2">
              <Why>Using the same proven opener makes every call clear, confident, and measurable.</Why>
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
                <div className="text-[10px] uppercase tracking-wide text-primary font-semibold">Open with this</div>
                <p className="text-xs mt-1 leading-relaxed">"{p.open(lead)}"</p>
              </div>
              <div className="rounded-xl border bg-surface-2/60 p-3 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {p.code} wins when: <span className="text-foreground normal-case">{p.win}</span>
                </div>
                {p.moves.map((m, i) => (
                  <div key={m} className="text-[11px] text-muted-foreground flex gap-2">
                    <span className="text-primary font-mono">{i + 1}.</span>{m}
                  </div>
                ))}
              </div>
              {attempts > 0 && (
                <div className="text-[11px] text-muted-foreground rounded-lg border px-3 py-2">
                  Attempt {attempts + 1} on {p.code}. {noAns.move}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button asChild className="h-12">
                  <a href={`tel:${lead.phone.replace(/\s/g, '')}`} onClick={() => { setCh('call'); setStep('pickup'); }}>
                    <Phone className="h-4 w-4 mr-1" /> Call now
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-12">
                  <a href={waLink(lead.phone, p.open(lead))} target="_blank" rel="noopener noreferrer"
                    onClick={() => { setCh('whatsapp'); setStep('pickup'); }}>
                    <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                  </a>
                </Button>
              </div>
              <div className="mt-auto sticky bottom-0 -mx-4 mt-auto border-t border-border bg-card px-4 py-2"><Nav
                back={<Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep(brief.length ? 'brief' : 'wa')}>Back</Button>}
                next={<Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep('pickup')}>
                  Already reached out <ArrowRight className="h-3 w-3 ml-1" />
                </Button>}
              /></div>
            </div>
          )}

          {/* ---------------- PICKUP GATE ---------------- */}
          {step === 'pickup' && (
             <div className="flex min-h-full flex-col gap-2">
              <div><Head>Did they pick up?</Head>
              <Why>One tap sends you down the correct path; unanswered calls never create fake discovery data.</Why>
              <p className="mt-1 text-[10px] text-muted-foreground">
                If they didn't, we don't ask you anything else — {p.code} simply retries.
              </p></div>
              <div className="grid grid-cols-2 gap-2">
                <Button className="h-11 justify-start" onClick={() => setStep(asks.length ? 'ask' : 'wrap')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Yes — we spoke
                </Button>
                <Button variant="outline" className="h-11 justify-start border-role-hr/40" onClick={() => missedPath('no-answer')}>
                  <PhoneOff className="h-4 w-4 mr-2" /> No answer — retry in {noAns.retryHours}h
                </Button>
                <Button variant="outline" className="h-11 justify-start border-role-hr/40" onClick={() => { setOutcome('busy-callback'); setAction('call-back'); setDueAt(toLocalInput(isoIn(2))); setNextSt(stage); setNextAt(toLocalInput(isoIn(2))); setStep('wrap'); }}>
                  <CalendarClock className="h-4 w-4 mr-2" /> Busy — asked to call back
                </Button>
                <Button variant="outline" className="h-11 justify-start border-danger/40 text-danger" onClick={() => missedPath('wrong-number')}>
                  <AlertTriangle className="h-4 w-4 mr-2" /> Wrong number
                </Button>
              </div>
              <div className="mt-auto sticky bottom-0 -mx-4 mt-auto border-t border-border bg-card px-4 py-2"><Nav back={<Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep('dial')}>Back</Button>} next={null} /></div>
            </div>
          )}

          {/* ---------------- ASK — only this call's questions ---------------- */}
          {step === 'ask' && (
             <div className="flex min-h-full flex-col gap-2">
              <div><Head>{p.code} questions · {asks.length} only</Head>
              <Why>Each answer removes uncertainty from the next call and moves this lead closer to a booking.</Why></div>
              <Fields fields={asks} discovery={discovery} setField={setField}
                onSkip={(k) => setSkipped((s) => [...s, k])} />

              {optionalFields(stage).length > 0 && (
                showOptional ? (
                  <Fields fields={optionalFields(stage)} discovery={discovery} setField={setField}
                    onSkip={(k) => setSkipped((s) => [...s, k])} />
                ) : (
                  <Button variant="ghost" size="sm" className="text-[11px] w-full" onClick={() => setShowOptional(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Ask more (only if it came up)
                  </Button>
                )
              )}

              <div className="mt-auto sticky bottom-0 -mx-4 mt-auto border-t border-border bg-card px-4 py-2"><Nav
                back={<Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep('pickup')}>Back</Button>}
                 next={<Button size="sm" disabled={askLeft.length > 0} onClick={() => setStep('wrap')}>
                   {askLeft.length ? `Complete ${askLeft.length} required` : 'All captured — wrap up'}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>}
              /></div>
            </div>
          )}

          {/* ---------------- WRAP ---------------- */}
          {step === 'wrap' && (
             <div className="flex min-h-full flex-col gap-2">
              <Why>A dated next action keeps ownership useful: no lead leaves this flow without a clear next moment.</Why>
              {missed || outcome === 'busy-callback' ? (
                <div className="rounded-xl border border-role-hr/40 bg-role-hr/5 p-3 text-[11px] space-y-1">
                  <div className="font-semibold text-role-hr flex items-center gap-1">
                    <PhoneOff className="h-3.5 w-3.5" />
                    {outcome === 'wrong-number' ? 'Wrong number' : `No pickup · attempt ${noAns.attempt} of ${noAns.max}`}
                  </div>
                  <div className="text-muted-foreground">
                    {outcome === 'wrong-number'
                      ? 'Nothing else to ask. Ask for the correct number over WhatsApp, else park it.'
                      : noAns.move}
                  </div>
                  <div className="text-muted-foreground">
                    {p.code} questions stay hidden until someone actually answers.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Head>How did {p.code} end?</Head>
                   <div className="grid grid-cols-2 gap-1.5">
                    {p.outcomes.map((o) => (
                      <button key={o.value} type="button" onClick={() => pickOutcome(o.value)}
                        className={cn('text-left rounded-lg border px-3 py-2 text-xs transition-all',
                          outcome === o.value ? 'border-primary bg-primary/10 font-medium'
                            : o.tone === 'good' ? 'border-role-tcm/40 hover:bg-role-tcm/5'
                            : o.tone === 'bad' ? 'border-danger/40 hover:bg-danger/5'
                            : 'border-border hover:bg-surface-2')}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {outcome && (
                <>
                  <div>
                    <Label className="text-[11px] flex items-center gap-1"><StickyNote className="h-3 w-3" /> One line for the next person</Label>
                     <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1}
                      placeholder={missed ? 'Rang out, tried twice…' : 'What they said, in their words…'} className="text-xs mt-1" />
                  </div>

                  <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5 space-y-2">
                    <div className="text-[11px] font-medium text-primary flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      Next: Call {nextSt} · {play(nextSt).name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{play(nextSt).mission}</div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">When</Label>
                        <Input type="datetime-local" value={nextAt} onChange={(e) => { setNextAt(e.target.value); setDueAt(e.target.value); }} className="text-xs h-8" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Override call</Label>
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {CALL_STAGES.map((c) => (
                            <Chip key={c.stage} active={nextSt === c.stage} onClick={() => setNextSt(c.stage)}>{c.stage}</Chip>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {([['30 min', 0.5], ['2 hours', 2], ['Tomorrow', 24], ['3 days', 72]] as const).map(([label, hours]) => (
                        <Button key={label} type="button" size="sm" variant="outline" className="h-7 text-[10px]"
                          onClick={() => { const value = toLocalInput(isoIn(hours)); setNextAt(value); setDueAt(value); }}>
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {!missed && (
                    showSignals ? (
                      <div className="flex flex-wrap gap-1.5">
                        {marketplaceTags.map((t) => (
                          <Chip key={t.value} active={tags.includes(t.value)}
                            onClick={() => setTags((prev) => prev.includes(t.value) ? prev.filter((x) => x !== t.value) : [...prev, t.value])}>
                            {tagLabel(t.value)}
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-[11px] w-full" onClick={() => setShowSignals(true)}>
                        <Plus className="h-3 w-3 mr-1" /> Add a signal tag
                      </Button>
                    )
                  )}

                  <div className="text-[10px] text-muted-foreground">
                    {isConnected(outcome) ? "Counts toward today's 80 connects." : 'Logged, but not a connect.'}
                    {' '}You own this lead for {OWNERSHIP_DAYS} days · readiness {readiness.pct}%
                    {captured.length ? ` · ${captured.length} new answer${captured.length === 1 ? '' : 's'}` : ''}.
                  </div>

                  <Button className="sticky bottom-0 w-full h-10" disabled={!outcome || !action || !dueAt || !nextAt} onClick={finish}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {mode === 'claim' ? 'Lock ownership & next call' : 'Save call & next call'}
                  </Button>
                </>
              )}

              <Button variant="ghost" size="sm" className="text-xs w-full"
                onClick={() => setStep(missed ? 'pickup' : asks.length ? 'ask' : 'pickup')}>Back</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ pieces ------------------------------ */

function Fields({ fields, discovery, setField, onSkip }: {
  fields: DiscoveryField[];
  discovery: LeadDiscovery;
  setField: (k: DiscoveryKey, v: string) => void;
  onSkip: (k: DiscoveryKey) => void;
}) {
  if (fields.length === 0) {
    return <div className="rounded-xl border bg-surface-2/60 p-3 text-[11px] text-muted-foreground">Nothing left to ask here.</div>;
  }
  const pending = fields.filter((f) => !filled(discovery, f.key));
  const visible = pending[0] ?? fields[fields.length - 1];
  if (!visible) return null;
  const completed = fields.length - pending.length;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span>{completed} of {fields.length} captured</span><div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${(completed / fields.length) * 100}%` }} /></div></div>
      {[visible].map((f) => (
        <div key={f.key} className="rounded-md border border-primary/25 bg-card p-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-mono text-primary pt-0.5">Q{fields.indexOf(f) + 1}</span>
            <div className="min-w-0 flex-1">
              <Label className="text-xs flex items-center gap-1">
                {f.label}
                {filled(discovery, f.key) && <CheckCircle2 className="h-3 w-3 text-role-tcm" />}
              </Label>
              <div className="text-[10px] text-muted-foreground">{f.why}</div>
            </div>
            {!f.required && (
              <button type="button" onClick={() => onSkip(f.key)}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0">
                <SkipForward className="h-3 w-3" /> Skip
              </button>
            )}
          </div>
          {f.kind === 'choice' ? (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {f.options!.map((o) => (
                <Chip key={o} active={discovery[f.key] === o} onClick={() => setField(f.key, discovery[f.key] === o ? '' : o)}>{o}</Chip>
              ))}
            </div>
          ) : (
            <Input type={f.kind === 'date' ? 'date' : 'text'} value={discovery[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)} className="text-xs h-8" placeholder={f.label} />
          )}
        </div>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('min-w-0 rounded-md border px-2 py-1 text-[10px] leading-tight transition-all',
        active ? 'bg-primary border-primary text-primary-foreground font-medium' : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50')}>
      {children}
    </button>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return <div className="font-display text-sm font-bold text-foreground">{children}</div>;
}

function Why({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 border-l-2 border-accent pl-2 text-[10px] leading-relaxed text-muted-foreground"><span className="font-semibold text-primary">Why this matters:</span> {children}</div>;
}

function Nav({ back, next }: { back: React.ReactNode; next: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 pt-1">{back}{next}</div>;
}

const TRAIL: { key: Step; label: string }[] = [
  { key: 'wa', label: 'Chat' },
  { key: 'brief', label: 'Brief' },
  { key: 'dial', label: 'Dial' },
  { key: 'pickup', label: 'Picked up?' },
  { key: 'ask', label: 'Ask' },
  { key: 'wrap', label: 'Wrap' },
];

function Trail({ step, missed }: { step: Step; missed: boolean }) {
  const items = missed ? TRAIL.filter((t) => t.key !== 'ask') : TRAIL;
  const idx = items.findIndex((t) => t.key === step);
  return (
    <div className="flex items-center gap-1">
      {items.map((t, i) => (
        <div key={t.key} className="flex items-center gap-1 min-w-0">
          <span className={cn('text-[10px] transition-colors',
            i === idx ? 'text-primary font-semibold' : i < idx ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
            {t.label}
          </span>
          {i < items.length - 1 && <span className="text-muted-foreground/30 text-[9px]">›</span>}
        </div>
      ))}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
