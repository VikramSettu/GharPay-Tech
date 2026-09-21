import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";
import { TARGET_SEC } from "@/lib/productivity/store";

/** Compact 120-second countdown badge shown on every lead surface. */
export function SessionTimerBadge({
  elapsed, label, className,
}: { elapsed: number; label?: string; className?: string }) {
  const remaining = Math.max(0, TARGET_SEC - elapsed);
  const over = elapsed > TARGET_SEC;
  const pct = Math.min(100, (elapsed / TARGET_SEC) * 100);
  const mm = Math.floor((over ? elapsed - TARGET_SEC : remaining) / 60);
  const ss = ((over ? elapsed - TARGET_SEC : remaining) % 60).toString().padStart(2, "0");

  return (
    <span
      title={`${TARGET_SEC}s target per lead · elapsed ${elapsed}s`}
      className={cn(
        "relative inline-flex items-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold tabular-nums",
        over
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : remaining <= 30
            ? "border-accent/50 bg-accent/10 text-accent"
            : "border-border bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 -z-0 transition-all", over ? "bg-destructive/15" : "bg-primary/10")}
        style={{ width: `${pct}%` }}
      />
      <Timer className="relative h-3 w-3" />
      <span className="relative">
        {label ? `${label} ` : ""}{over ? "+" : ""}{mm}:{ss}
      </span>
    </span>
  );
}
