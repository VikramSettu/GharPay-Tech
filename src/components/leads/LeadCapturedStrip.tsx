import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/types";
import { useLeadDossier } from "@/lib/lead-dossier-store";
import { ALL_ASK_FIELDS, FIELD_LABELS, fieldValue, type FieldKey } from "@/lib/call-script";

const pretty = (field: FieldKey, raw: string) => {
  if (field === "budget") return `₹${(Number(raw) / 1000).toFixed(0)}k`;
  if (field === "moveInDate" || field === "decisionBy") {
    const d = new Date(raw);
    return Number.isNaN(+d) ? raw : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return raw;
};

/** Everything captured so far, pinned at the top of the drawer as it gets filled. */
export function LeadCapturedStrip({ lead, className }: { lead: Lead; className?: string }) {
  const dossier = useLeadDossier((s) => s.byLead[lead.id]) ?? {};
  const filled = ALL_ASK_FIELDS.map((f) => ({ field: f, value: fieldValue(lead, dossier, f) }))
    .filter((x) => x.value);

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        Captured {filled.length}/{ALL_ASK_FIELDS.length}
      </span>
      {filled.length === 0 ? (
        <span className="text-[10px] text-muted-foreground">Nothing captured yet — fill it as you talk.</span>
      ) : (
        filled.map(({ field, value }) => (
          <span
            key={field}
            title={`${FIELD_LABELS[field]}: ${value}`}
            className="max-w-[180px] truncate rounded-md border border-success/35 bg-success/10 px-1.5 py-[2px] text-[10px] font-medium text-success"
          >
            <span className="opacity-70">{FIELD_LABELS[field]}:</span> {pretty(field, value)}
          </span>
        ))
      )}
    </div>
  );
}
