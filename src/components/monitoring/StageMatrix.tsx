import { usePipeline } from "@/lib/pipeline/store";
import { STAGE_ORDER, STAGE_CONFIG } from "@/lib/pipeline/stage-config";
import { computeSlaState } from "@/lib/pipeline/stage-engine";
import { useAutomationTicker } from "@/hooks/useAutomationTicker";
import { cn } from "@/lib/utils";

export function StageMatrix() {
  const now = useAutomationTicker(30_000);
  const states = usePipeline((s) => s.states);
  const bucket: Record<string, { count: number; breached: number }> = {};
  STAGE_ORDER.forEach((s) => bucket[s] = { count: 0, breached: 0 });

  for (const st of Object.values(states)) {
    bucket[st.currentStage].count++;
    if (computeSlaState(st, now) === "breached" || computeSlaState(st, now) === "escalated") {
      bucket[st.currentStage].breached++;
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-2 border-b text-sm font-semibold">Pipeline Health · Stage matrix</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
        {STAGE_ORDER.map((s) => {
          const b = bucket[s];
          return (
            <div key={s} className={cn(
              "rounded-md border p-3",
              b.breached > 0 && "border-destructive/50 bg-destructive/5",
            )}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{STAGE_CONFIG[s].short}</div>
              <div className="flex items-baseline justify-between">
                <div className="text-xl font-display font-semibold">{b.count}</div>
                {b.breached > 0 && <div className="text-xs text-destructive font-mono">{b.breached} breached</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
