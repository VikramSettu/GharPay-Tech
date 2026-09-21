import { Lead } from '@/myt/lib/types';
import { capturedDossier, dossierSummary } from '@/myt/lib/talk-track';
import { cn } from '@/lib/utils';

/**
 * Everything we have learned about this lead, pinned to the top of the drawer.
 * The moment a field is filled anywhere in C1..C5 it shows up here, so the
 * header is always the current read-back of the requirement.
 */
export function DossierStrip({ lead, className }: { lead: Lead; className?: string }) {
  const captured = capturedDossier(lead);

  return (
    <div className={cn('rounded-lg border border-border bg-card/60 p-2 space-y-1.5', className)}>
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0">Known</span>
        <span className="text-[11px] font-medium leading-snug">{dossierSummary(lead)}</span>
        <span className="ml-auto text-[9px] tabular-nums text-muted-foreground shrink-0">{captured.length} fields</span>
      </div>

      {captured.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {captured.map((c) => (
            <span key={c.key}
              className="inline-flex items-center gap-1 rounded-md border border-role-tcm/40 bg-role-tcm/10 px-1.5 py-0.5 text-[10px] leading-tight text-role-tcm">
              <span className="opacity-70">C{c.stage} {c.label}</span>
              <span className="font-semibold text-foreground">{c.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
