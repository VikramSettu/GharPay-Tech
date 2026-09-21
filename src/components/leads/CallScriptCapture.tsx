import { useMemo, useState } from "react";
import { Check, Ear, MessageSquareQuote, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/types";
import type { CallNumber } from "@/lib/journey-gates";
import { useApp } from "@/lib/store";
import { useLeadDossier, type DossierKey } from "@/lib/lead-dossier-store";
import {
  callScript, fieldValue, renderLine, FIELD_LABELS, CORE_FIELDS,
  type FieldKey, type ScriptLine,
} from "@/lib/call-script";

const KIND_META = {
  say: { label: "Say", Icon: Mic, cls: "text-primary border-primary/40 bg-primary/10" },
  ask: { label: "Ask", Icon: MessageSquareQuote, cls: "text-warning border-warning/40 bg-warning/10" },
  listen: { label: "Listen", Icon: Ear, cls: "text-muted-foreground border-border bg-muted" },
} as const;

/**
 * The C1–C5 script, self-contained: every answer captured here writes straight
 * into the lead record (core fields) or the dossier, so any surface that renders
 * it — drawer or Log activity dialog — stays in sync.
 */
export function CallScriptCapture({
  lead, call, me, onCapture, compact,
}: {
  lead: Lead;
  call: CallNumber;
  me: string;
  onCapture?: (label: string, value: string, call: CallNumber) => void;
  compact?: boolean;
}) {
  const patchLead = useApp((s) => s.patchLead);
  const dossier = useLeadDossier((s) => s.byLead[lead.id]) ?? {};
  const setField = useLeadDossier((s) => s.setField);
  const script = useMemo(() => callScript(call), [call]);

  const save = (field: FieldKey, value: string) => {
    if ((CORE_FIELDS as string[]).includes(field)) {
      if (value) {
        if (field === "budget") patchLead(lead.id, { budget: Number(value) || 0 });
        else if (field === "moveInDate") patchLead(lead.id, { moveInDate: new Date(value).toISOString() });
        else patchLead(lead.id, { preferredArea: value });
      }
    } else {
      setField(lead.id, field as DossierKey, value);
    }
    if (value) onCapture?.(FIELD_LABELS[field], value, call);
  };

  return (
    <ol className={cn("space-y-1.5", compact && "space-y-1")}>
      {script.map((line, i) => (
        <Line
          key={`${call}-${i}`}
          n={i + 1}
          line={line}
          text={renderLine(line.text, lead, dossier, me)}
          value={line.field ? fieldValue(lead, dossier, line.field) : ""}
          onSave={save}
        />
      ))}
    </ol>
  );
}

/** How many ASK fields of a call are already filled. */
export function useScriptProgress(lead: Lead, call: CallNumber) {
  const dossier = useLeadDossier((s) => s.byLead[lead.id]) ?? {};
  const asks = useMemo(() => callScript(call).filter((l) => l.field), [call]);
  const captured = asks.filter((l) => fieldValue(lead, dossier, l.field as FieldKey)).length;
  return { captured, total: asks.length };
}

function Line({
  n, line, text, value, onSave,
}: {
  n: number;
  line: ScriptLine;
  text: string;
  value: string;
  onSave: (field: FieldKey, value: string) => void;
}) {
  const meta = KIND_META[line.kind];
  const [draft, setDraft] = useState(value);
  const done = Boolean(value);

  return (
    <li className={cn(
      "rounded-md border px-2.5 py-2",
      done ? "border-success/35 bg-success/[0.06]" : "border-border bg-muted/25",
    )}>
      <div className="flex items-start gap-2">
        <span className="mt-[3px] w-4 shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">{n}</span>
        <span className={cn("mt-[1px] shrink-0 rounded border px-1 py-[1px] text-[9px] font-bold uppercase leading-none", meta.cls)}>
          {meta.label}
        </span>
        <p className={cn("min-w-0 flex-1 text-[12px] leading-snug", line.kind === "listen" ? "italic text-muted-foreground" : "text-foreground")}>
          {text}
        </p>
        {done && <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 text-success" />}
      </div>

      {line.field && (
        <div className="mt-1.5 pl-6">
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            {line.label ?? FIELD_LABELS[line.field]}
          </div>

          {line.input === "choice" ? (
            <div className="flex flex-wrap gap-1">
              {(line.choices ?? []).map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-pressed={value === c}
                  onClick={() => onSave(line.field as FieldKey, value === c ? "" : c)}
                  className={cn(
                    "rounded-md border px-2 py-[3px] text-[10px] font-semibold transition-colors",
                    value === c
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                value={draft}
                type={line.input === "date" ? "date" : line.input === "number" ? "number" : "text"}
                placeholder={line.placeholder}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => draft !== value && onSave(line.field as FieldKey, draft.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSave(line.field as FieldKey, draft.trim());
                }}
                className="h-7 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px]"
                onClick={() => onSave(line.field as FieldKey, draft.trim())}
              >
                Save
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
