import { STAGE_CONFIG, STAGE_ORDER, type PipelineStage } from "@/lib/pipeline/stage-config";
import { usePipeline } from "@/lib/pipeline/store";
import { computeSlaState } from "@/lib/pipeline/stage-engine";
import { useAutomationTicker } from "@/hooks/useAutomationTicker";
import { cn } from "@/lib/utils";
import { Check, Lock, AlertTriangle, Circle } from "lucide-react";

interface Props {
  leadId: string;
  onSelect?: (s: PipelineStage) => void;
}

export function StageStepper({ leadId, onSelect }: Props) {
  const now = useAutomationTicker(2000);
  const state = usePipeline((s) => s.states[leadId]);
  const ensure = usePipeline((s) => s.ensure);
  if (!state) {
    ensure(leadId);
    return null;
  }
  const currentIdx = STAGE_ORDER.indexOf(state.currentStage);
  const sla = computeSlaState(state, now);

  return (
    <div className="flex items-stretch gap-1 overflow-x-auto scrollbar-thin pb-2">
      {STAGE_ORDER.map((s, idx) => {
        const cfg = STAGE_CONFIG[s];
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isLocked = idx > currentIdx;
        const isBreached = isCurrent && (sla === "breached" || sla === "escalated");
        const Icon = isBreached ? AlertTriangle : isDone ? Check : isLocked ? Lock : Circle;
        return (
          <button
            key={s}
            onClick={() => onSelect?.(s)}
            className={cn(
              "shrink-0 min-w-[110px] rounded-md border px-2.5 py-1.5 text-left transition-all",
              isCurrent && !isBreached && "border-accent bg-accent/10",
              isBreached && "border-destructive bg-destructive/10 animate-pulse",
              isDone && "border-success/40 bg-success/5 text-muted-foreground",
              isLocked && "border-border bg-muted/30 text-muted-foreground/60",
            )}
          >
            <div className="flex items-center gap-1.5">
              <Icon className={cn(
                "h-3 w-3",
                isBreached && "text-destructive",
                isDone && "text-success",
                isCurrent && !isBreached && "text-accent",
              )} />
              <span className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground">
                {idx + 1}
              </span>
            </div>
            <div className="text-[11px] font-semibold mt-0.5">{cfg.short}</div>
          </button>
        );
      })}
    </div>
  );
}
