import { cn } from "@/lib/utils";
import { fmtDur } from "@/lib/workflow/engine";
import type { RoleGuarantee } from "@/lib/workflow/roles";
import { ShieldCheck, ShieldAlert, ShieldX, ArrowUpRight, Target, ArrowRight, RotateCcw } from "lucide-react";

const STATE_STYLE = {
  sealed: "border-emerald-500/40 bg-emerald-500/5",
  strained: "border-amber-500/50 bg-amber-500/5",
  broken: "border-destructive/50 bg-destructive/5",
} as const;

const STATE_ICON = { sealed: ShieldCheck, strained: ShieldAlert, broken: ShieldX } as const;

/**
 * Role-by-role operating contracts. The company score is the weakest active
 * role, never an average that lets one team hide behind another team's health.
 */
export function RoleGuaranteeGrid({ roles, weakest, mounted }: { roles: RoleGuarantee[]; weakest: number; mounted: boolean }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Guarantee by role</h2>
          <p className="text-xs text-muted-foreground">
            Different roles own different transformations. Input, execution, output and handoff are diagnosed separately.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Weakest active role</div>
          <div className="text-2xl font-semibold tabular-nums">{mounted ? weakest : 0}%</div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {roles.map((r) => {
          const Icon = STATE_ICON[r.state];
          return (
            <div key={r.role} className={cn("rounded-xl border-2 p-4 space-y-4", STATE_STYLE[r.state])}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="font-semibold text-sm">{r.meta.label}</span>
                  </div>
                  <p className="text-xs font-medium">{r.meta.mission}</p>
                  <p className="text-[11px] text-muted-foreground">{r.meta.promise}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-semibold tabular-nums">{mounted ? r.score : 0}%</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">guarantee</div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border bg-background/50 p-2.5 sm:col-span-1">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Target className="h-3 w-3" /> Final result owned
                  </div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">
                    {r.primary.current}<span className="text-xs text-muted-foreground"> / {r.primary.target}{r.primary.suffix ?? ""}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{r.primary.label}</div>
                </div>
                <div className="rounded-lg border bg-background/50 p-2.5 sm:col-span-2 space-y-1.5">
                  <div className="flex gap-2 text-[11px]"><span className="w-20 shrink-0 text-muted-foreground">Input</span><span>{r.meta.input}</span></div>
                  <div className="flex gap-2 text-[11px]"><span className="w-20 shrink-0 text-muted-foreground">Output</span><span>{r.meta.output}</span></div>
                  <div className="flex gap-2 text-[11px]"><span className="w-20 shrink-0 text-muted-foreground">Handoff</span><span className="inline-flex items-center gap-1">{r.meta.downstream} <ArrowRight className="h-3 w-3" /></span></div>
                </div>
              </div>

              {r.secondary.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.secondary.map((m) => (
                    <div key={m.label} className="rounded-md bg-background/60 px-2.5 py-1.5 text-[11px]">
                      <span className="text-muted-foreground">{m.label}: </span>
                      <span className="font-semibold tabular-nums">{m.current}/{m.target}{m.suffix ?? ""}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                {r.parts.map((p) => (
                  <div key={p.label} className="grid grid-cols-[130px_1fr_42px] items-center gap-2">
                    <span className="text-[11px] text-muted-foreground truncate" title={p.detail}>{p.label}</span>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", p.pct >= 95 ? "bg-emerald-500" : p.pct >= 80 ? "bg-amber-500" : "bg-destructive")}
                        style={{ width: `${mounted ? p.pct : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-right">{mounted ? Math.round(p.pct) : 0}%</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border bg-background/50 p-3 space-y-2">
                <div className="text-xs font-medium">{r.headline}</div>
                <div className="text-[11px]"><span className="font-semibold">Why:</span> <span className="text-muted-foreground">{r.rootCause}</span></div>
                <div className="flex items-start gap-1.5 text-[11px]">
                  <RotateCcw className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span><span className="font-semibold">Recover:</span> <span className="text-muted-foreground">{r.recovery}</span></span>
                </div>
              </div>

              {r.top.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Exact customers breaking the guarantee</div>
                  {r.top.slice(0, 3).map((m) => (
                    <div key={m.lead.ulid} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate font-medium">{m.lead.name}</span>
                      <span className="truncate text-muted-foreground">{m.violations[0]?.label} · {fmtDur(m.ageMs)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1 border-t">
                <span className="text-[11px] text-muted-foreground">
                  {r.people.length} person{r.people.length === 1 ? "" : "s"} · {r.p0} P0 · {r.breaches} role breach{r.breaches === 1 ? "" : "es"}
                </span>
                <a href={r.meta.queueTo} className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline">
                  Open role work <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
