import { useMemo, useState } from 'react';
import { ChevronDown, Flame, HeartHandshake, PhoneOff, Search, Target, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/myt/components/CopyButton';
import type { CallStage, DiscoveryKey, Lead } from '@/myt/lib/types';
import { CALL_PLAYS } from '@/myt/lib/call-plan';
import { leadPath, PATH_META } from '@/myt/lib/talk-track';
import {
  BLOCKER_ORDER, FORMULA, MOST_IMPORTANT_QUESTION, MULTI_OBJECTION_LINE, STAGE_TARGET,
  moveFor, noAnswerKit, objectionLogLine, objectionsFor, type ObjectionPlay,
} from '@/myt/lib/objections2';

/**
 * Objection Handling 2 — the Gharpayy way, inside the call.
 * High energy, hope first, one real blocker, solve fast, move.
 * Everything here can be logged into activity as [C#-OBJ] / [C#-NA].
 */
export function ObjectionKit({
  lead, stage, onSaveField, onSaveNote, compact,
}: {
  lead: Lead;
  stage: CallStage;
  onSaveField?: (key: DiscoveryKey, value: string) => void;
  onSaveNote?: (text: string, stage: CallStage) => void;
  compact?: boolean;
}) {
  const path = leadPath(lead);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const plays = useMemo(() => objectionsFor(stage, path), [stage, path]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return plays;
    return plays.filter((p) => (p.cue + p.know + p.solve.join(' ')).toLowerCase().includes(t));
  }, [plays, q]);
  const code = CALL_PLAYS[stage].code;
  const target = path === 'outstation' ? STAGE_TARGET[stage].out : STAGE_TARGET[stage].blr;

  const logPlay = (p: ObjectionPlay) => {
    onSaveField?.('objection', p.cue);
    onSaveNote?.(`[${code}-OBJ] ${objectionLogLine(p, path)}`, stage);
  };

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-card p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
          <Flame className="h-3 w-3 text-warning" /> Objection handling 2 · {code}
          <span className="ml-auto normal-case tracking-normal">{PATH_META[path].short}</span>
        </div>
        <div className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Target className="mt-[2px] h-3 w-3 shrink-0 text-primary" /> <span>Target of this call: <span className="text-foreground">{target}</span></span>
        </div>

        {!compact && (
          <div className="grid grid-cols-5 gap-1">
            {FORMULA.map((f, i) => (
              <div key={f.step} className="rounded-md border border-border/70 bg-muted/30 px-1.5 py-1">
                <div className="text-[9px] font-semibold text-primary">{i + 1}. {f.step}</div>
                <div className="text-[9px] leading-tight text-muted-foreground">{f.line}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Search className="h-3 w-3 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What did they say?" className="h-7 text-xs" />
        </div>

        <div className="space-y-1">
          {list.map((p) => {
            const open = openId === p.id;
            return (
              <div key={p.id} className={cn('rounded-md border transition-colors', open ? 'border-primary/50 bg-primary/[0.04]' : 'border-border bg-muted/20')}>
                <button type="button" onClick={() => setOpenId(open ? null : p.id)}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left">
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{p.cue}</span>
                  <ChevronDown className={cn('h-3 w-3 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                </button>

                {open && (
                  <div className="space-y-1.5 border-t border-border/60 px-2 py-2">
                    <Step n={1} label="Give hope" text={p.hope} tone="good" />
                    <Step n={2} label="Know exactly" text={p.know} tone="warn" />
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">3 · Solve that one thing</div>
                      <ul className="mt-0.5 space-y-0.5">
                        {p.solve.map((s, i) => (
                          <li key={i} className="text-[11px] leading-snug border-l-2 border-primary/40 pl-1.5">{s}</li>
                        ))}
                      </ul>
                    </div>
                    <Step n={4} label="Validate" text={p.validate ?? MOST_IMPORTANT_QUESTION} tone="muted" />
                    <Step n={5} label="Move" text={moveFor(p, path)} tone="good" />

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <CopyButton size="sm" variant="outline" label="Copy script"
                        text={`${p.hope}\n${p.know}\n${p.solve.join('\n')}\n${p.validate ?? MOST_IMPORTANT_QUESTION}\n→ ${moveFor(p, path)}`} />
                      {(onSaveField || onSaveNote) && (
                        <Button type="button" size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => logPlay(p)}>
                          Log to activity
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {list.length === 0 && <div className="text-[11px] text-muted-foreground">No match — ask “what exactly is the concern?” and log it.</div>}
        </div>

        <div className="rounded-md border border-dashed border-border px-2 py-1.5 text-[10px] text-muted-foreground">
          Many objections at once → {MULTI_OBJECTION_LINE}
        </div>

        {!compact && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              <ListOrdered className="h-3 w-3" /> Solve in this order
            </div>
            <div className="flex flex-wrap gap-1">
              {BLOCKER_ORDER.map((b) => (
                <span key={b.n} title={b.ask} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium">
                  {b.n}. {b.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <NoAnswerCard lead={lead} stage={stage} onSaveNote={onSaveNote} />
    </div>
  );
}

function Step({ n, label, text, tone }: { n: number; label: string; text: string; tone: 'good' | 'warn' | 'muted' }) {
  return (
    <div>
      <div className={cn('text-[9px] font-semibold uppercase tracking-wide',
        tone === 'good' ? 'text-success' : tone === 'warn' ? 'text-warning' : 'text-muted-foreground')}>
        {n} · {label}
      </div>
      <div className="text-[11px] leading-snug">{text}</div>
    </div>
  );
}

/** If they don't pick up: exact WhatsApp message, the reply menu, and the next move. */
export function NoAnswerCard({
  lead, stage, onSaveNote,
}: {
  lead: Lead;
  stage: CallStage;
  onSaveNote?: (text: string, stage: CallStage) => void;
}) {
  const { play, message } = noAnswerKit(lead, stage);
  const code = CALL_PLAYS[stage].code;
  const phone = (lead.phone ?? '').replace(/\D/g, '');
  const waHref = `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/[0.05] p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium text-warning">
        <PhoneOff className="h-3 w-3" /> Didn’t pick up · send this on {code}
      </div>

      <pre className="whitespace-pre-wrap rounded-md border border-border bg-background/70 px-2 py-1.5 text-[11px] leading-snug font-sans">{message}</pre>

      <div>
        <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">They reply with</div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {play.replies.map((r) => (
            <span key={r} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium">{r}</span>
          ))}
        </div>
      </div>

      <div className="text-[11px] leading-snug flex items-start gap-1.5">
        <HeartHandshake className="mt-[2px] h-3 w-3 shrink-0 text-success" /> <span>{play.thenDo}</span>
      </div>
      <div className="text-[10px] text-muted-foreground">Retry: {play.retry}</div>

      <div className="flex flex-wrap items-center gap-1.5">
        <CopyButton size="sm" variant="outline" label="Copy message" text={message} />
        {phone && (
          <Button asChild size="sm" variant="secondary" className="h-7 text-[10px]">
            <a href={waHref} target="_blank" rel="noreferrer" onClick={() => onSaveNote?.(`[${code}-NA] No answer → WhatsApp sent with reply menu.`, stage)}>
              Send on WhatsApp
            </a>
          </Button>
        )}
        {onSaveNote && (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]"
            onClick={() => onSaveNote(`[${code}-NA] No answer → WhatsApp sent. Next: ${play.retry}`, stage)}>
            Log no-answer
          </Button>
        )}
      </div>
    </div>
  );
}
