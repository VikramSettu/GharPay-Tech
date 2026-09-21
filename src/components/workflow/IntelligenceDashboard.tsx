import { useMemo, useState } from "react";
import { KpiTile, HealthPill, MotionLine } from "./bits";
import { useWorkflowBoard } from "@/lib/workflow/use-board";
import { useWorkflow } from "@/lib/workflow/store";
import { fmtDur, startOfDay } from "@/lib/workflow/engine";
import {
  funnelSnapshot, conversionRates, reverseFunnel, bottlenecks, biggestBottleneck,
  cascade, tourRisks, person360, recoveryProposals, ROOT_CAUSE_LABEL,
} from "@/lib/workflow/intelligence";
import { cn } from "@/lib/utils";
import { Activity, Brain, HelpCircle, LifeBuoy, Route as RouteIcon, TriangleAlert, UserSearch } from "lucide-react";

/** P1 intelligence: why are we missing, what to do now, who owns the gap. */
export function IntelligenceDashboard() {
  const { board, people, now, mounted } = useWorkflowBoard();
  const attempts = useWorkflow((s) => s.attempts);
  const targets = useWorkflow((s) => s.targets);
  const bookingTarget = targets.closing.bookings || 4;
  const [selected, setSelected] = useState<string | null>(null);

  const counts = useMemo(
    () => funnelSnapshot(board, attempts, startOfDay(now || Date.now())),
    [board, attempts, now],
  );
  const rates = useMemo(() => conversionRates(counts), [counts]);
  const plan = useMemo(() => reverseFunnel(bookingTarget, rates, counts), [bookingTarget, rates, counts]);
  const necks = useMemo(() => bottlenecks(counts, rates), [counts, rates]);
  const worstNeck = useMemo(() => biggestBottleneck(necks), [necks]);
  const tourGap = plan.rows.find((r) => r.step === "toursScheduled")?.gap ?? 0;
  const cascadeRows = useMemo(() => cascade(tourGap, rates), [tourGap, rates]);
  const risks = useMemo(() => tourRisks(board, now || Date.now()).slice(0, 8), [board, now]);
  const proposals = useMemo(() => recoveryProposals(board, now || Date.now()), [board, now]);

  const focusPerson = people.find((p) => p.userId === selected) ?? people[0] ?? null;
  const p360 = useMemo(() => (focusPerson ? person360(focusPerson, board) : null), [focusPerson, board]);

  if (!mounted) return <div className="text-sm text-muted-foreground">Computing operating state…</div>;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Workflow Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Targets worked backwards from bookings, the stage that is actually costing us, and the exact customers who can recover today.
        </p>
      </header>

      {/* Why are we missing */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Why are we missing?</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile label="Booking target" value={bookingTarget} meaning="Configured in targets" big />
          <KpiTile
            label="Projected bookings"
            value={plan.projectedBookings}
            meaning="At today's volume and conversion"
            tone={plan.projectedBookings >= bookingTarget ? "good" : "bad"}
            big
          />
          <KpiTile
            label="Binding constraint"
            value={worstNeck ? worstNeck.label : "None"}
            meaning={worstNeck ? `${worstNeck.waiting} customers stuck · ${worstNeck.bookingsAtRisk} bookings at risk` : "Every stage converting to plan"}
          />
        </div>
        <p className="text-sm">{plan.headline}</p>
      </section>

      {/* Reverse funnel planner */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <RouteIcon className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Reverse funnel planner</h2>
          <span className="text-xs text-muted-foreground">Required volume is the higher of calculated need and the operating floor</span>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Stage", "Calculated", "Floor", "Required", "Today", "Gap", "Next conversion"].map((h) => (
                  <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {plan.rows.map((r) => (
                <tr key={r.step} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.label}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.calculated}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.floor || "—"}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold">{r.required}</td>
                  <td className="px-3 py-2 tabular-nums">{r.current}</td>
                  <td className={cn("px-3 py-2 tabular-nums", r.gap > 0 && "text-destructive font-semibold")}>{r.gap || "—"}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                    {r.rateLabel === "—" ? "—" : `${r.rateLabel} · ${r.ratePct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottleneck engine */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Bottleneck engine</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {necks.map((b) => (
            <div key={b.label} className={cn("rounded-xl border p-3",
              b.severity === "critical" ? "border-destructive/50 bg-destructive/5"
                : b.severity === "bottleneck" ? "border-amber-500/50 bg-amber-500/5"
                  : b.severity === "watch" ? "border-sky-500/40" : "")}>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{b.label}</div>
              <div className="text-lg font-semibold tabular-nums">
                {b.ratePct}%<span className="text-xs text-muted-foreground"> vs {b.expectedPct}% expected</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {b.throughput} of {b.inflow} moved · {b.waiting} waiting · {b.bookingsAtRisk} bookings at risk
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cascade impact */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Downstream impact of the tour gap</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          {cascadeRows.map((c) => (
            <div key={c.label} className="rounded-xl border p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="text-xl font-semibold tabular-nums">{c.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tour risk engine */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Tours at risk</h2>
          <span className="text-xs text-muted-foreground">{risks.length} scored above threshold</span>
        </div>
        <div className="grid gap-2">
          {risks.map((r) => (
            <div key={r.motion.lead.ulid} className="rounded-lg border p-3 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.motion.lead.name}</span>
                  <HealthPill health={r.motion.health} />
                </div>
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold",
                  r.score >= 70 ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-black")}>
                  Risk {r.score}/100
                </span>
              </div>
              <MotionLine m={r.motion} />
              <div className="text-[11px] text-muted-foreground">
                {r.startsInMs >= 0 ? `Starts in ${fmtDur(r.startsInMs)}` : `Slot passed ${fmtDur(r.startsInMs)} ago`} · {r.signals.join(" · ")}
              </div>
              <div className="text-xs font-medium">{r.suggestion}</div>
            </div>
          ))}
          {risks.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
              No scheduled tour is currently at risk.
            </div>
          )}
        </div>
      </section>

      {/* Who owns the gap — Person 360 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <UserSearch className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Who owns the gap</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <button
              key={p.userId}
              type="button"
              onClick={() => setSelected(p.userId)}
              className={cn("rounded-full border px-3 py-1 text-xs transition-colors",
                focusPerson?.userId === p.userId ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}
            >
              {p.name}
            </button>
          ))}
          {people.length === 0 && <span className="text-xs text-muted-foreground">No owners with active work yet.</span>}
        </div>

        {p360 && (
          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">{p360.flow.name} — Person 360</div>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">
                {ROOT_CAUSE_LABEL[p360.diagnosis.cause]}
              </span>
            </div>
            <p className="text-sm">{p360.diagnosis.line}</p>
            <p className="text-xs text-muted-foreground">Recommended: {p360.diagnosis.recommendation}</p>

            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <KpiTile label="Owned" value={p360.owned} />
              <KpiTile label="Healthy" value={p360.healthy} tone="good" />
              <KpiTile label="Needs action" value={p360.needsAction} tone={p360.needsAction ? "bad" : "default"} />
              <KpiTile label="P0 breaches" value={p360.breaches} tone={p360.breaches ? "bad" : "default"} />
              <KpiTile label="No next action" value={p360.noNextAction} tone={p360.noNextAction ? "warn" : "default"} />
              <KpiTile label="Connect rate" value={`${p360.connectRatePct}%`} meaning={`${p360.flow.connections}/${p360.flow.completedActions} today`} />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold">Exact customers causing the gap</div>
              {p360.gapCustomers.map((m) => (
                <div key={m.lead.ulid} className="rounded-lg border p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.lead.name}</span>
                    <HealthPill health={m.health} />
                    <span className="text-[11px] text-muted-foreground">{m.violations[0]?.label ?? "Blocked"}</span>
                  </div>
                  <MotionLine m={m} />
                </div>
              ))}
              {p360.gapCustomers.length === 0 && (
                <div className="text-xs text-muted-foreground">No broken customers under this owner.</div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* What should we do now */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4" />
          <h2 className="text-sm font-semibold">What should we do now</h2>
        </div>
        <div className="grid gap-2">
          {proposals.map((p) => (
            <div key={p.title} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{p.title}</div>
                <div className="text-[11px] text-muted-foreground">{p.detail}</div>
              </div>
              <div className="text-sm font-semibold tabular-nums">{p.count}</div>
            </div>
          ))}
          {proposals.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
              Nothing to recover — the pipeline is clean.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
