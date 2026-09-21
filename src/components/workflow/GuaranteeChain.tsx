import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, CircleDashed, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChainLink, ChainResult } from "@/lib/workflow/guarantee-chain";
import { STEADY_STATE_LINE } from "@/lib/workflow/guarantee-chain";

const STATE_CLS: Record<ChainLink["state"], string> = {
  sealed: "border-emerald-500/40 bg-emerald-500/5",
  strained: "border-amber-500/40 bg-amber-500/5",
  broken: "border-destructive/40 bg-destructive/5",
};

const STATE_DOT: Record<ChainLink["state"], string> = {
  sealed: "bg-emerald-500",
  strained: "bg-amber-500",
  broken: "bg-destructive",
};

function LinkCard({ link }: { link: ChainLink }) {
  const body = (
    <div className={cn("h-full rounded-xl border p-3 transition-colors hover:bg-muted/40", STATE_CLS[link.state])}>
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[link.state])} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Step {link.step}
        </span>
        <span className="ml-auto text-xs font-semibold tabular-nums">{link.pct}%</span>
      </div>
      <div className="mt-1 text-sm font-medium leading-tight">{link.title}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{link.promise}</div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded bg-muted">
        <div className={cn("h-full", STATE_DOT[link.state])} style={{ width: `${link.pct}%` }} />
      </div>
      <div className="mt-2 text-[11px] tabular-nums text-muted-foreground">{link.detail}</div>
      <div className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground/80">
        <Zap className="mt-[2px] h-3 w-3 shrink-0" />
        <span>{link.autoResponse}</span>
      </div>
    </div>
  );
  if (link.to) return <Link to={link.to} className="block">{body}</Link>;
  return body;
}

/** The closed loop, measured end to end. */
export function GuaranteeChain({ chain, mounted }: { chain: ChainResult; mounted: boolean }) {
  return (
    <section className="space-y-3">
      <div
        className={cn(
          "rounded-xl border p-4",
          chain.steady ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5",
        )}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className={cn("h-6 w-6", chain.steady ? "text-emerald-600" : "text-amber-600")} />
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Loop integrity</div>
              <div className="text-3xl font-semibold tabular-nums">{mounted ? chain.integrity : 0}%</div>
            </div>
          </div>
          <div className="min-w-[260px] flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              {chain.steady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <CircleAlert className="h-4 w-4 text-amber-600" />
              )}
              {mounted ? chain.statement : "Measuring the loop…"}
            </div>
            <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
              <CircleDashed className="mt-[2px] h-3 w-3 shrink-0" />
              <span>
                <span className="font-medium text-foreground">One simple state:</span> {STEADY_STATE_LINE}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {chain.links.map((l) => (
          <LinkCard key={l.id} link={l} />
        ))}
      </div>
    </section>
  );
}
