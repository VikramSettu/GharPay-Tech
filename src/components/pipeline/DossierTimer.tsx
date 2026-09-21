import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useAutomationTicker } from "@/hooks/useAutomationTicker";
import { usePipeline } from "@/lib/pipeline/store";
import { computeSlaState } from "@/lib/pipeline/stage-engine";
import { STAGE_CONFIG } from "@/lib/pipeline/stage-config";
import { cn } from "@/lib/utils";

interface Props { leadId: string; }

/**
 * The 60-second red pulsing banner shown while a lead is in DOSSIER stage.
 * Countdown ticks every second; on expiry turns into a red SLA-breach banner
 * that stays until the dossier hits 100 % or a manager overrides.
 */
export function DossierTimer({ leadId }: Props) {
  const now = useAutomationTicker(1000);
  const state = usePipeline((s) => s.states[leadId]);
  if (!state || state.currentStage !== "DOSSIER") return null;

  const gate = state.history[state.history.length - 1];
  const deadline = Date.parse(gate.slaDeadline);
  const remaining = Math.max(0, Math.round((deadline - now) / 1000));
  const totalSec = Math.round(STAGE_CONFIG.DOSSIER.slaMs / 1000);
  const pctElapsed = Math.min(100, ((totalSec - remaining) / totalSec) * 100);
  const sla = computeSlaState(state, now);
  const pct = state.dossier.completionPct;

  const breached = sla === "breached" || sla === "escalated";
  const done = pct >= 100;

  if (done) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <div className="text-sm">
          <div className="font-semibold text-success">Dossier complete</div>
          <div className="text-xs text-muted-foreground">Ready to match property.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 relative overflow-hidden",
        breached
          ? "border-destructive bg-destructive/10 animate-pulse"
          : "border-warning bg-warning/10",
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 opacity-20",
          breached ? "bg-destructive" : "bg-warning",
        )}
        style={{ width: `${pctElapsed}%` }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {breached ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <Clock className="h-5 w-5 text-warning" />
          )}
          <div>
            <div className="text-sm font-semibold">
              {breached
                ? "SLA BREACHED — 60s dossier window expired"
                : `Complete dossier in ${remaining}s`}
            </div>
            <div className="text-xs text-muted-foreground">
              {pct}% complete · {breached ? "Manager notified" : "Do not lose this lead"}
            </div>
          </div>
        </div>
        <div className="text-2xl font-mono font-bold tabular-nums">
          {breached ? "!!" : String(remaining).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}
