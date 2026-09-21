import { useWorkflowBoard } from "@/lib/workflow/use-board";
import type { RoleGuaranteeId } from "@/lib/workflow/roles";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowUpRight, ShieldAlert, ShieldCheck, ShieldX, Target, RotateCcw } from "lucide-react";

const STYLE = {
  sealed: "border-emerald-500/40 bg-emerald-500/5",
  strained: "border-amber-500/50 bg-amber-500/5",
  broken: "border-destructive/50 bg-destructive/5",
} as const;

const ICON = { sealed: ShieldCheck, strained: ShieldAlert, broken: ShieldX } as const;

/**
 * A compact role contract embedded inside the role's existing operating page.
 * It tells the team the final outcome it owns, whether it has enough input,
 * which promise is breaking, why, and the exact recovery direction.
 */
export function RoleGuaranteePanel({ role }: { role: RoleGuaranteeId }) {
  const { roles, mounted } = useWorkflowBoard();
  const guarantee = roles.find((r) => r.role === role);

  if (!mounted || !guarantee) return null;

  const Icon = ICON[guarantee.state];

  return (
    <section className={cn("rounded-xl border-2 p-4 space-y-4", STYLE[guarantee.state])}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Role Workflow Guarantee</span>
          </div>
          <h2 className="text-base font-semibold">{guarantee.meta.label}: {guarantee.meta.mission}</h2>
          <p className="text-xs text-muted-foreground">{guarantee.meta.promise}</p>
        </div>
        <div className="flex items-end gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Guarantee</div>
            <div className="text-3xl font-semibold tabular-nums">{guarantee.score}%</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Target className="h-3 w-3" /> Final result
            </div>
            <div className="text-xl font-semibold tabular-nums">
              {guarantee.primary.current}<span className="text-xs text-muted-foreground"> / {guarantee.primary.target}{guarantee.primary.suffix ?? ""}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{guarantee.primary.label}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border bg-background/55 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Required input</div>
          <div className="text-xs mt-1">{guarantee.meta.input}</div>
        </div>
        <div className="rounded-lg border bg-background/55 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Final output owned</div>
          <div className="text-xs mt-1">{guarantee.meta.output}</div>
        </div>
        <div className="rounded-lg border bg-background/55 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Handoff must reach</div>
          <div className="text-xs mt-1 inline-flex items-center gap-1">{guarantee.meta.downstream} <ArrowRight className="h-3 w-3" /></div>
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
        {guarantee.parts.map((p) => (
          <div key={p.label} title={p.detail}>
            <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
              <span>{p.label}</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(p.pct)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", p.pct >= 95 ? "bg-emerald-500" : p.pct >= 80 ? "bg-amber-500" : "bg-destructive")}
                style={{ width: `${p.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-stretch">
        <div className="rounded-lg border bg-background/55 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Why are we missing?</div>
          <p className="text-xs mt-1">{guarantee.rootCause}</p>
        </div>
        <div className="rounded-lg border bg-background/55 p-2.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><RotateCcw className="h-3 w-3" /> Recover now</div>
          <p className="text-xs mt-1">{guarantee.recovery}</p>
        </div>
        <a
          href={guarantee.meta.queueTo}
          className="rounded-lg border bg-background/70 px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-muted/60 min-w-[120px]"
        >
          Open work <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
}
