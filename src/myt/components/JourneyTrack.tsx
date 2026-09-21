import { JOURNEY, BLOCKERS, journeyDone, journeyBlockers } from '@/myt/lib/journey';
import type { BlockerId, JourneyId, JourneyStep } from '@/myt/lib/journey';
import { useJourneyOverrides, applyOverride } from '@/myt/lib/journey-store';
import type { Lead } from '@/myt/lib/types';
import { cn } from '@/lib/utils';

/**
 * Compact S1 → S8 journey rail of small clickable buttons.
 * Click a step to mark it done / not done, click NR·NU·NO to flag a blocker.
 */
export function JourneyTrack({ lead, className }: { lead: Lead; className?: string }) {
  const derived = journeyDone(lead);
  const derivedBlockers = journeyBlockers(lead);
  const stepOv = useJourneyOverrides((s) => s.steps[lead.id]);
  const blockOv = useJourneyOverrides((s) => s.blockers[lead.id]);
  const toggleStep = useJourneyOverrides((s) => s.toggleStep);
  const toggleBlocker = useJourneyOverrides((s) => s.toggleBlocker);

  const done = Object.fromEntries(
    JOURNEY.map((s) => [s.id, applyOverride(derived[s.id], stepOv?.[s.id])]),
  ) as Record<JourneyId, boolean>;
  const nowStep: JourneyStep = JOURNEY.find((s) => !done[s.id]) ?? JOURNEY[JOURNEY.length - 1];
  const gates = JOURNEY.filter((s) => !s.sub);
  const cleared = gates.filter((s) => done[s.id]).length;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex flex-wrap items-center gap-1">
        {JOURNEY.map((s) => {
          const isDone = done[s.id];
          const isNow = s.id === nowStep.id && !isDone;
          return (
            <button
              key={s.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleStep(lead.id, s.id, derived[s.id]); }}
              title={`${s.code} — ${s.why} (click to ${isDone ? 'unmark' : 'mark done'})`}
              aria-pressed={isDone}
              className={cn(
                'shrink-0 rounded-md border px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-tight transition-colors hover:opacity-90',
                s.sub && 'text-[9px]',
                isDone
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : isNow
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {s.code}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="font-semibold text-foreground">Now: {nowStep.code}</span>
        <span className="text-muted-foreground">{cleared}/{gates.length} gates</span>
        {(Object.keys(BLOCKERS) as BlockerId[]).map((b) => {
          const on = applyOverride(derivedBlockers.includes(b), blockOv?.[b]);
          return (
            <button
              key={b}
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleBlocker(lead.id, b, derivedBlockers.includes(b)); }}
              title={`${b} · ${BLOCKERS[b].label} — ${BLOCKERS[b].why}`}
              aria-pressed={on}
              className={cn(
                'rounded border px-1 py-[3px] font-bold uppercase leading-none transition-colors',
                on
                  ? 'border-destructive/50 bg-destructive/15 text-destructive'
                  : 'border-border bg-muted/30 text-muted-foreground',
              )}
            >
              {b}{on ? ` · ${BLOCKERS[b].label}` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
