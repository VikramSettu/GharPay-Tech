// Admin Evidence Board — per-lead × per-stage proof status matrix.
// Managers can spot gaps ("this booking has no payment screenshot") and
// request proof directly. TCMs get a red badge on the lead until they upload.
import { Fragment, useMemo, useState } from "react";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { usePipeline } from "@/lib/pipeline/store";
import { STAGE_ORDER, STAGE_CONFIG, type PipelineStage } from "@/lib/pipeline/stage-config";
import { computeUrgencyBucket, URGENCY_META, personaShortCode } from "@/lib/pipeline/dossier-presets";
import { EvidenceStrip } from "@/components/pipeline/EvidenceStrip";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ShieldAlert, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

// Stages worth demanding proof for.
const PROOF_STAGES: PipelineStage[] = [
  "MATCHED", "TOUR_SCHEDULED", "TOUR_IN_PROGRESS", "QUOTED", "BOOKED", "CHECKED_IN",
];

export function EvidenceBoard() {
  const leads = useIdentityStore((s) => s.leads);
  const states = usePipeline((s) => s.states);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(true);

  const rows = useMemo(() => {
    return leads
      .map((l) => {
        const st = states[l.ulid];
        if (!st) return null;
        const perStage: Record<string, { count: number; requested: boolean; verified: number }> = {};
        for (const g of st.history) {
          perStage[g.stage] = {
            count: g.evidence?.length ?? 0,
            requested: !!g.evidenceRequested,
            verified: (g.evidence ?? []).filter((e) => e.verifiedAt).length,
          };
        }
        const reachedIdx = STAGE_ORDER.indexOf(st.currentStage);
        const relevant = PROOF_STAGES.filter((s) => STAGE_ORDER.indexOf(s) <= reachedIdx);
        const gaps = relevant.filter((s) => !(perStage[s]?.count ?? 0)).length;
        return { lead: l, state: st, perStage, gaps, relevant };
      })
      .filter((r): r is NonNullable<typeof r> => !!r)
      .filter((r) => (onlyGaps ? r.gaps > 0 : true))
      .filter((r) =>
        !filter ||
        r.lead.name.toLowerCase().includes(filter.toLowerCase()) ||
        (r.lead.phoneRaw ?? r.lead.phoneE164 ?? "").includes(filter),
      )
      .sort((a, b) => b.gaps - a.gaps);
  }, [leads, states, filter, onlyGaps]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b">
        <div className="text-sm font-semibold">Evidence board</div>
        <div className="text-[11px] text-muted-foreground">
          Screenshots per stage · click a row to attach / verify / request proof.
        </div>
        <div className="flex-1" />
        <label className="text-[11px] inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} />
          Only show gaps
        </label>
        <Input
          className="h-7 w-48 text-xs"
          placeholder="Filter by name or phone…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Lead</th>
              <th className="text-left px-2 py-2">Urgency</th>
              <th className="text-left px-2 py-2">Persona</th>
              {PROOF_STAGES.map((s) => (
                <th key={s} className="px-1.5 py-2 text-center whitespace-nowrap">
                  {STAGE_CONFIG[s].label.split(" ")[0]}
                </th>
              ))}
              <th className="text-right px-3 py-2">Gaps</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={PROOF_STAGES.length + 4} className="py-8 text-center text-muted-foreground">
                  {onlyGaps ? "🎉 No gaps — every reached stage has proof." : "No leads yet."}
                </td>
              </tr>
            )}
            {rows.map(({ lead, state, perStage, gaps, relevant }) => {
              const isOpen = expanded === lead.ulid;
              const urgency = URGENCY_META[computeUrgencyBucket(state.dossier.moveDate)];
              return (
                <Fragment key={lead.ulid}>
                  <tr
                    key={lead.ulid}
                    className={cn(
                      "border-t border-border/50 cursor-pointer hover:bg-muted/30",
                      gaps > 0 && "bg-destructive/5",
                    )}
                    onClick={() => setExpanded(isOpen ? null : lead.ulid)}
                  >
                    <td className="px-3 py-2 font-medium flex items-center gap-1.5">
                      {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {lead.name}
                      <span className="text-[10px] text-muted-foreground font-normal">
                        · {STAGE_CONFIG[state.currentStage].label}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider", urgency.tone)}>
                        {urgency.label}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded">
                        {personaShortCode(state.dossier)}
                      </span>
                    </td>
                    {PROOF_STAGES.map((s) => {
                      const reached = relevant.includes(s);
                      const info = perStage[s];
                      if (!reached) {
                        return <td key={s} className="px-1.5 py-2 text-center text-muted-foreground/30">·</td>;
                      }
                      if ((info?.count ?? 0) > 0) {
                        return (
                          <td key={s} className="px-1.5 py-2 text-center">
                            <span className="inline-flex items-center gap-0.5 text-success">
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="text-[10px]">{info!.count}</span>
                            </span>
                          </td>
                        );
                      }
                      if (info?.requested) {
                        return (
                          <td key={s} className="px-1.5 py-2 text-center">
                            <ShieldAlert className="h-3 w-3 text-destructive inline" />
                          </td>
                        );
                      }
                      return (
                        <td key={s} className="px-1.5 py-2 text-center text-destructive/60">
                          <Circle className="h-3 w-3 inline" />
                        </td>
                      );
                    })}
                    <td className={cn(
                      "px-3 py-2 text-right font-semibold",
                      gaps === 0 ? "text-success" : "text-destructive",
                    )}>
                      {gaps}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-muted/20 border-t border-border/50">
                      <td colSpan={PROOF_STAGES.length + 4} className="px-4 py-3 space-y-2">
                        {relevant.map((s) => (
                          <div key={s}>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                              {STAGE_CONFIG[s].label}
                            </div>
                            <EvidenceStrip leadId={lead.ulid} stage={s} adminMode />
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
