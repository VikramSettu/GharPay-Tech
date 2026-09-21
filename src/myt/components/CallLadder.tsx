import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Gauge, PhoneOff, Target, MessageSquarePlus, Quote, MapPin, Info, AlertTriangle, Trophy, EyeOff, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CallStage, Lead, DiscoveryKey } from '@/myt/lib/types';
import {
  CALL_PLAYS, STAGE_ORDER, currentStage, closingReadiness, readinessTone,
  readinessVerdict, play, askFields, filled, attemptsAtStage, waStatusMeta, fieldByKey,
  type DiscoveryField,
} from '@/myt/lib/call-plan';
import {
  talkTrack, trackProgress, LINE_META, leadPath, PATH_META, SCRIPT_LANGS,
  type TalkLine, type ScriptLang,
} from '@/myt/lib/talk-track';
import { preCallBrief, callVerdict } from '@/myt/lib/call-os';
import { DossierStrip } from '@/myt/components/DossierStrip';
import {
  BLOCKERS, STAGE_GATES, journeyBlockers, journeyDone, stageGateStatus, stageGates,
  type BlockerId, type CallCode, type JourneyId,
} from '@/myt/lib/journey';
import { applyOverride, useJourneyOverrides } from '@/myt/lib/journey-store';
import { ObjectionKit } from '@/myt/components/ObjectionKit';






/**
 * The same ladder the call sheet runs on, in read-only form:
 * which call this lead is on, what that call needs, and how close to closeable.
 * When `onSaveField` is passed, C1..C5 becomes a readable talk track — every
 * line you say, in order, with the dossier field filled right under the line.
 */
export function CallLadder({ lead, compact = false, selectedStage, onSelectStage, onSaveField, onSaveNote }: {
  lead: Lead;
  compact?: boolean;
  selectedStage?: CallStage;
  onSelectStage?: (stage: CallStage) => void;
  onSaveField?: (key: DiscoveryKey, value: string) => void;
  onSaveNote?: (text: string, stage: CallStage) => void;
}) {
  const stage = currentStage(lead);
  const activeStage = selectedStage ?? stage;
  const p = play(activeStage);
  const r = closingReadiness(lead);
  const tone = readinessTone(r.pct);
  const attempts = attemptsAtStage(lead, activeStage);
  const allAsks = askFields(activeStage);
  const open = allAsks.filter((f) => !filled(lead.discovery, f.key));
  const [lang, setLang] = useState<ScriptLang>('en');
  const path = leadPath(lead);
  const pathMeta = PATH_META[path];
  const brief = preCallBrief(lead, activeStage);
  const verdict = callVerdict(lead, activeStage);
  const script = talkTrack(lead, activeStage, { lang, path });
  const prog = trackProgress(lead, activeStage);
  const wa = waStatusMeta(lead.waStatus);




  return (
    <div className="rounded-xl border bg-surface-2/40 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md border',
          p.colour === 'good' ? 'bg-role-tcm/10 border-role-tcm/40 text-role-tcm'
            : p.colour === 'warn' ? 'bg-role-hr/10 border-role-hr/40 text-role-hr'
            : 'bg-primary/10 border-primary/40 text-primary')}>{p.code}</span>
        <div className="text-xs font-semibold">Call {activeStage} · {p.name}</div>
        <span className={cn('flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none',
          pathMeta.tone === 'good' ? 'border-role-tcm/40 bg-role-tcm/10 text-role-tcm'
            : pathMeta.tone === 'warn' ? 'border-role-hr/40 bg-role-hr/10 text-role-hr'
            : 'border-border bg-surface-2 text-muted-foreground')}
          title={pathMeta.win}>
          <MapPin className="h-2.5 w-2.5" /> {pathMeta.short}
        </span>

        <span className={cn('ml-auto text-[10px] font-semibold',
          tone === 'good' ? 'text-role-tcm' : tone === 'warn' ? 'text-role-hr' : 'text-danger')}>
          {r.pct}%
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all',
          tone === 'good' ? 'bg-role-tcm' : tone === 'warn' ? 'bg-role-hr' : 'bg-danger')}
          style={{ width: `${r.pct}%` }} />
      </div>

      <div className="text-[11px] text-muted-foreground flex items-start gap-1.5">
        <Gauge className="h-3 w-3 mt-0.5 shrink-0" /> {readinessVerdict(r)}
      </div>

      {/* the 5 rungs — done / current / locked, each showing its S-gate score */}
      <div className="flex items-center gap-1">
        {STAGE_ORDER.map((s) => {
          const done = s < stage;
          const now = s === activeStage;
          const g = stageGateStatus(lead, s as CallCode);
          return (
            <button type="button" key={s} title={`${CALL_PLAYS[s].code} · ${CALL_PLAYS[s].name} — clears ${STAGE_GATES[s as CallCode].join(', ') || 'recovery only'}`}
              onClick={() => onSelectStage?.(s)} disabled={!onSelectStage}
              className={cn('flex-1 rounded-lg border px-1.5 py-1 text-center transition-colors',
                onSelectStage && 'cursor-pointer hover:border-primary hover:bg-primary/10 disabled:cursor-default',
                done && !now ? 'border-role-tcm/40 bg-role-tcm/10 text-role-tcm'
                  : now ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border text-muted-foreground/50')}>
              <div className="text-[10px] font-bold leading-none">C{s}</div>
              <div className="text-[9px] leading-tight truncate">{CALL_PLAYS[s].name}</div>
              <div className="text-[9px] leading-none mt-0.5 tabular-nums opacity-80">
                {g.total ? `${g.cleared}/${g.total}` : 'NR·NU·NO'}
              </div>
            </button>
          );
        })}
      </div>

      {!compact && (
        <>
          <PreCallBriefCard brief={brief} verdict={verdict} />

          <StageGates lead={lead} stage={activeStage as CallCode} />


          {onSaveField ? (
            <div className="space-y-2">
              <DossierStrip lead={lead} />

              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                <Quote className="h-3 w-3" /> Say it like this · {p.code}
                <span className="normal-case tracking-normal text-muted-foreground/70">read top to bottom</span>
                <span className="ml-auto tabular-nums">{prog.done}/{prog.total} captured</span>
              </div>

              <div className="flex items-center gap-1">
                <Languages className="h-3 w-3 text-muted-foreground" />
                {SCRIPT_LANGS.map((l) => (
                  <button type="button" key={l.value} onClick={() => setLang(l.value)}
                    className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                      lang === l.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {l.label}
                  </button>
                ))}
              </div>


              <ol className="space-y-1.5">
                {script.map((line, i) => (
                  <ScriptLine key={i} n={i + 1} line={line} lead={lead} onSave={onSaveField} />
                ))}
              </ol>

              {onSaveNote && <ExtraNotes stage={activeStage} onSave={onSaveNote} existing={lead.notes} />}

              <ObjectionKit lead={lead} stage={activeStage} onSaveField={onSaveField} onSaveNote={onSaveNote} />


              {open.length === 0 && (
                <div className="text-[11px] text-role-tcm flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> {p.code} dossier complete — move to Call {Math.min(activeStage + 1, 5)}.
                </div>
              )}
            </div>
          ) : (

            <>
              {open.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    Ask on {p.code} · {open.length} left
                  </div>
                  {open.map((f) => (
                    <div key={f.key} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Circle className="h-2.5 w-2.5" /> {f.label}
                    </div>
                  ))}
                </div>
              )}
              {open.length === 0 && (
                <div className="text-[11px] text-role-tcm flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> {p.code} data complete — move to Call {Math.min(activeStage + 1, 5)}.
                </div>
              )}
            </>
          )}


          {attempts > 0 && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <PhoneOff className="h-3 w-3" /> {attempts} attempt{attempts === 1 ? '' : 's'} logged on {p.code} — {p.noAnswer.move}
            </div>
          )}

          {wa && (
            <div className="text-[11px] text-muted-foreground">WhatsApp: {wa.label}{lead.waLabel ? ` · ${lead.waLabel}` : ''}</div>
          )}

          {lead.nextCall && (
            <div className="text-[11px] text-primary flex items-center gap-1.5">
              <Target className="h-3 w-3" />
              Next: Call {lead.nextCall.stage} · {play(lead.nextCall.stage).name} — {new Date(lead.nextCall.dueAt).toLocaleString()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * One line of the conversation. Reads like speech; if the line captures a
 * dossier field, the input sits directly under it so it is filled while said.
 */
function ScriptLine({ n, line, lead, onSave }: {
  n: number;
  line: TalkLine;
  lead: Lead;
  onSave: (key: DiscoveryKey, value: string) => void;
}) {
  const meta = LINE_META[line.kind];
  const field = line.field ? fieldByKey(line.field) : undefined;
  const value = line.field ? (lead.discovery?.[line.field] ?? '') : '';
  const done = value.trim().length > 0;

  return (
    <li className={cn('rounded-lg border p-2 space-y-1.5',
      done ? 'border-role-tcm/40 bg-role-tcm/5' : 'border-border bg-card')}>
      <div className="flex items-start gap-2">
        <span className="mt-[1px] text-[9px] font-bold tabular-nums text-muted-foreground/70 w-3 shrink-0">{n}</span>
        <span className={cn('shrink-0 rounded border px-1 py-0.5 text-[9px] font-bold uppercase leading-none',
          meta.tone === 'primary' ? 'border-primary/40 bg-primary/10 text-primary'
            : meta.tone === 'good' ? 'border-role-tcm/40 bg-role-tcm/10 text-role-tcm'
            : meta.tone === 'warn' ? 'border-role-hr/40 bg-role-hr/10 text-role-hr'
            : 'border-border bg-surface-2 text-muted-foreground')}>
          {meta.label}
        </span>
        <p className={cn('text-[11.5px] leading-snug',
          line.kind === 'listen' || line.kind === 'handle'
            ? 'italic text-muted-foreground' : 'text-foreground')}>
          {line.kind === 'listen' || line.kind === 'handle' ? line.text : `“${line.text}”`}
        </p>
        {done && <CheckCircle2 className="ml-auto h-3 w-3 shrink-0 text-role-tcm" />}
      </div>

      {field && (
        <div className="pl-5">
          <FieldInput field={field} value={value} onSave={onSave} />
        </div>
      )}

      {line.note && <p className="pl-5 text-[9px] text-muted-foreground">{line.note}</p>}
    </li>
  );
}

/** The bare control for a dossier field — chips for choices, typed input otherwise. */
function FieldInput({ field, value, onSave }: {
  field: DiscoveryField;
  value: string;
  onSave: (key: DiscoveryKey, value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  if (field.kind === 'choice') {
    return (
      <div className="flex flex-wrap gap-1">
        {field.options!.map((o) => (
          <button type="button" key={o}
            onClick={() => onSave(field.key, value === o ? '' : o)}
            className={cn('rounded-md border px-1.5 py-0.5 text-[10px] leading-tight transition-colors',
              value === o
                ? 'bg-primary border-primary text-primary-foreground font-medium'
                : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:border-primary/50')}>
            {o}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Input
      type={field.kind === 'date' ? 'date' : field.kind === 'number' ? 'number' : 'text'}
      value={draft}
      placeholder={`Type what they said — ${field.label.toLowerCase()}`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onSave(field.key, draft); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className="h-7 text-[11px]"
    />
  );
}

/** Anything they said that no field covers — captured in their own words. */
function ExtraNotes({ stage, onSave, existing }: {
  stage: CallStage;
  onSave: (text: string, stage: CallStage) => void;
  existing?: string;
}) {
  const [text, setText] = useState('');
  const lines = (existing ?? '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6);

  return (
    <div className="rounded-lg border border-border bg-card p-2 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
        <MessageSquarePlus className="h-3 w-3" /> Extra notes · C{stage}
        <span className="normal-case tracking-normal text-muted-foreground/70">anything else they told you</span>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="e.g. wants a gym nearby, sister may join in Dec, cannot pay before salary on the 5th…"
        className="min-h-[52px] text-[11px]"
      />
      <Button size="sm" className="h-7 w-full text-[11px]" disabled={!text.trim()}
        onClick={() => { onSave(text.trim(), stage); setText(''); }}>
        Save note to dossier
      </Button>
      {lines.length > 0 && (
        <ul className="space-y-0.5 pt-0.5">
          {lines.map((l, i) => (
            <li key={i} className="text-[10px] leading-snug text-muted-foreground">• {l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One fillable dossier question — chips for choices, typed input otherwise. */

function AskField({ field, value, onSave }: {
  field: DiscoveryField;
  value: string;
  onSave: (key: DiscoveryKey, value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const done = value.trim().length > 0;

  useEffect(() => { setDraft(value); }, [value]);

  return (
    <div className={cn('rounded-lg border p-2 space-y-1.5',
      done ? 'border-role-tcm/40 bg-role-tcm/5' : 'border-border bg-card')}>
      <div className="flex items-center gap-1.5">
        {done
          ? <CheckCircle2 className="h-3 w-3 text-role-tcm shrink-0" />
          : <Circle className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
        <span className="text-[11px] font-medium text-foreground">{field.label}</span>
        {field.required && !done && <span className="text-[9px] text-danger">required</span>}
      </div>

      {field.kind === 'choice' ? (
        <div className="flex flex-wrap gap-1">
          {field.options!.map((o) => (
            <button type="button" key={o}
              onClick={() => onSave(field.key, value === o ? '' : o)}
              className={cn('rounded-md border px-1.5 py-0.5 text-[10px] leading-tight transition-colors',
                value === o
                  ? 'bg-primary border-primary text-primary-foreground font-medium'
                  : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:border-primary/50')}>
              {o}
            </button>
          ))}
        </div>
      ) : (
        <Input
          type={field.kind === 'date' ? 'date' : field.kind === 'number' ? 'number' : 'text'}
          value={draft}
          placeholder={field.label}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft !== value) onSave(field.key, draft); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className="h-7 text-[11px]"
        />
      )}

      <p className="text-[9px] text-muted-foreground">{field.why}</p>
    </div>
  );
}


/**
 * The S-gates this call is accountable for (C1 → S1..S3, C2 → LOC..S6,
 * C3 → S7, C4 → S8, C5 → clear NR/NU/NO). Click a gate to mark it cleared.
 */
function StageGates({ lead, stage }: { lead: Lead; stage: CallCode }) {
  const derived = journeyDone(lead);
  const derivedBlockers = journeyBlockers(lead);
  const stepOv = useJourneyOverrides((s) => s.steps[lead.id]);
  const blockOv = useJourneyOverrides((s) => s.blockers[lead.id]);
  const toggleStep = useJourneyOverrides((s) => s.toggleStep);
  const toggleBlocker = useJourneyOverrides((s) => s.toggleBlocker);
  const gates = stageGates(stage);

  const isDone = (id: JourneyId) => applyOverride(derived[id], stepOv?.[id]);
  const cleared = gates.filter((g) => isDone(g.id)).length;

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        Gates on C{stage}
        {gates.length > 0 && (
          <span className={cn('tabular-nums font-semibold',
            cleared === gates.length ? 'text-role-tcm' : 'text-foreground')}>
            {cleared}/{gates.length} cleared
          </span>
        )}
      </div>

      {gates.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {gates.map((g) => {
            const on = isDone(g.id);
            return (
              <button type="button" key={g.id}
                onClick={() => toggleStep(lead.id, g.id, derived[g.id])}
                title={`${g.code} — ${g.why}`}
                aria-pressed={on}
                className={cn('rounded-md border px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-tight transition-colors',
                  g.sub && 'text-[9px]',
                  on
                    ? 'border-role-tcm/40 bg-role-tcm/15 text-role-tcm'
                    : 'border-border bg-surface-2 text-muted-foreground hover:border-primary/50 hover:text-foreground')}>
                {g.code}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Revival call — no new gate. Job is to clear a blocker and push the lead back to its open gate.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {(Object.keys(BLOCKERS) as BlockerId[]).map((b) => {
          const on = applyOverride(derivedBlockers.includes(b), blockOv?.[b]);
          return (
            <button type="button" key={b}
              onClick={() => toggleBlocker(lead.id, b, derivedBlockers.includes(b))}
              title={`${b} · ${BLOCKERS[b].label} — ${BLOCKERS[b].why}`}
              aria-pressed={on}
              className={cn('rounded border px-1 py-[3px] text-[9px] font-bold uppercase leading-none transition-colors',
                on ? 'border-danger/50 bg-danger/15 text-danger'
                  : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground')}>
              {b}{on ? ` · ${BLOCKERS[b].label}` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Before anyone presses call: why we are calling, what we already know
 * (and therefore must not ask again), what wins this call, and the red
 * flags that change the script mid-sentence.
 */
function PreCallBriefCard({ brief, verdict }: {
  brief: ReturnType<typeof preCallBrief>;
  verdict: ReturnType<typeof callVerdict>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-2 space-y-2">
      <div className="flex items-start gap-1.5 text-[11px]">
        <Info className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
        <span><span className="text-muted-foreground">Why this call: </span>{brief.why}</span>
      </div>

      <div className="flex items-start gap-1.5 text-[11px]">
        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-role-hr" />
        <span><span className="text-muted-foreground">{brief.pathLabel}: </span>{brief.pathWin}</span>
      </div>

      <div className="flex items-start gap-1.5 text-[11px]">
        <Trophy className="h-3 w-3 mt-0.5 shrink-0 text-role-tcm" />
        <span><span className="text-muted-foreground">Wins when: </span>{brief.win}</span>
      </div>

      {brief.know.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">Already known</div>
          <div className="flex flex-wrap gap-1">
            {brief.know.map((k) => (
              <span key={k.label} className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px]">
                <span className="text-muted-foreground">{k.label}: </span>{k.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {brief.dontAsk.length > 0 && (
        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
          <EyeOff className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Do not ask again: {brief.dontAsk.join(' · ')}</span>
        </div>
      )}

      {brief.redFlags.length > 0 && (
        <ul className="space-y-0.5">
          {brief.redFlags.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-[10px] text-danger">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {f}
            </li>
          ))}
        </ul>
      )}

      <div className={cn('rounded-md border px-1.5 py-1 text-[10px] font-medium',
        verdict.won ? 'border-role-tcm/40 bg-role-tcm/10 text-role-tcm'
          : verdict.complete ? 'border-role-hr/40 bg-role-hr/10 text-role-hr'
          : 'border-border bg-surface-2 text-muted-foreground')}>
        {verdict.verdict}
      </div>
    </div>
  );
}
