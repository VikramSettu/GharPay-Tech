import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { KpiTile, ProgressRow } from "./bits";
import { GuaranteeChain } from "./GuaranteeChain";
import { RoleGuaranteeGrid } from "./RoleGuaranteeGrid";
import { RoleGuaranteePanel } from "./RoleGuaranteePanel";
import { useWorkflowBoard } from "@/lib/workflow/use-board";
import { guaranteeChain } from "@/lib/workflow/guarantee-chain";
import { fmtDur, type WorkflowFunction } from "@/lib/workflow/engine";
import { ROLE_META } from "@/lib/workflow/roles";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUpRight, Gauge, Users } from "lucide-react";

const FN_LABEL: Record<WorkflowFunction, string> = {
  lead: "New leads",
  "flow-ops": "Flow Ops",
  tour: "Tours",
  closing: "Closing",
  supply: "Supply",
  "check-in": "Check-in",
};

/** Control Tower operating brain: company guarantee → role → person → customer. */
export function WorkflowGuaranteeDashboard() {
  const { board, kpis, people, shortages, eodRisks, mounted, roles, allRolesGuarantee } = useWorkflowBoard();

  const chain = useMemo(() => guaranteeChain(board, kpis, people), [board, kpis, people]);

  const byFn = useMemo(() => {
    const map = new Map<WorkflowFunction, { total: number; broken: number }>();
    board.forEach((m) => {
      const row = map.get(m.fn) ?? { total: 0, broken: 0 };
      row.total += 1;
      if (m.health === "action-required") row.broken += 1;
      map.set(m.fn, row);
    });
    return [...map.entries()].sort((a, b) => b[1].broken - a[1].broken);
  }, [board]);

  const worstOffenders = board.filter((m) => m.health === "action-required").slice(0, 6);
  const p0Count = board.filter((m) => m.violations.some((v) => v.severity === "P0")).length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Workflow Guarantee</h1>
        <p className="text-sm text-muted-foreground">
          What must happen next → who owns it → by when → what fails downstream → exact recovery before the target is missed.
        </p>
      </header>

      <RoleGuaranteePanel role="control-tower" />
      <GuaranteeChain chain={chain} mounted={mounted} />

      {/* Company guarantee: weakest active role, never a comforting average. */}
      <section className={cn("rounded-xl border p-4 flex flex-wrap items-center gap-6", p0Count > 0 && "border-destructive/50 bg-destructive/5")}>
        <div className="flex items-center gap-3">
          <Gauge className="h-6 w-6 text-primary" />
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">All-role guarantee</div>
            <div className="text-4xl font-semibold tabular-nums">{mounted ? allRolesGuarantee : 0}%</div>
            <div className="text-[10px] text-muted-foreground">Weakest active role determines the score</div>
          </div>
        </div>
        <div className="grid gap-2 flex-1 min-w-[260px]">
          {kpis.parts.map((p) => (
            <ProgressRow key={p.label} label={`${p.label} — ${p.detail}`} value={Math.round(p.pct)} target={100} />
          ))}
        </div>
        {p0Count > 0 && (
          <div className="rounded-lg bg-destructive text-destructive-foreground px-3 py-2 text-xs font-bold uppercase tracking-wide">
            P0 intervention required · {p0Count}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Active leads" value={kpis.active} meaning="Currently in the customer-movement graph" />
        <KpiTile label="Moving correctly" value={kpis.moving} meaning="Owner + next action + SLA healthy" tone="good" />
        <KpiTile label="Needs action" value={kpis.needsAction} meaning="Something is broken now" tone="bad" to="/tower/interventions" />
        <KpiTile label="No next action" value={kpis.noNextAction} meaning="Customer movement stopped" tone="warn" to="/tower/interventions" />
        <KpiTile label="SLA breached" value={kpis.slaBreached} meaning="Required movement overdue" tone="bad" to="/tower/interventions" />
        <KpiTile label="No call 24h" value={kpis.noCall24h} meaning="Flow Ops contact guarantee failed" tone="warn" to="/tower/interventions" />
        <KpiTile label="Broken handoffs" value={kpis.brokenHandoffs} meaning="Next role did not receive clean work" tone="bad" to="/tower/interventions" />
        <KpiTile label="Supply blocked" value={kpis.blocked} meaning="Dependency failure, not automatic operator failure" />
      </section>

      <Link to="/tower/interventions"
        className="flex items-center justify-between gap-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 hover:bg-destructive/10 transition-colors">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <div className="text-xl font-semibold">{kpis.needsAction} leads need intervention</div>
            <div className="text-xs text-muted-foreground">Fix the exact customer/owner/dependency without turning Control Tower into another operator</div>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4" />
      </Link>

      <RoleGuaranteeGrid roles={roles} weakest={allRolesGuarantee} mounted={mounted} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Where customer movement is breaking</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {byFn.map(([fn, row]) => (
            <div key={fn} className="rounded-xl border p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{FN_LABEL[fn]}</div>
              <div className="text-lg font-semibold tabular-nums">{row.broken}<span className="text-muted-foreground text-xs"> / {row.total}</span></div>
              <div className="text-[11px] text-muted-foreground">broken / in stage</div>
            </div>
          ))}
          {byFn.length === 0 && <div className="text-xs text-muted-foreground">No active leads yet.</div>}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Person flow grid</h2>
          <span className="text-xs text-muted-foreground">{shortages} queue shortage · {eodRisks} EOD risk</span>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Person", "Role", "Required", "Available", "Done", "Unique", "Connected", "Projected EOD", "Pace", "Risk"].map((h) => (
                  <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {people.map((p) => (
                <tr key={p.userId} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{ROLE_META[p.role].label}</td>
                  <td className="px-3 py-2 tabular-nums">{p.requiredActions}</td>
                  <td className={cn("px-3 py-2 tabular-nums", p.queueGap > 0 && "text-destructive font-semibold")}>{p.availableActions}</td>
                  <td className="px-3 py-2 tabular-nums">{p.completedActions}</td>
                  <td className="px-3 py-2 tabular-nums">{p.uniqueLeads}</td>
                  <td className="px-3 py-2 tabular-nums">{p.connections} / {p.targetConnections}</td>
                  <td className="px-3 py-2 tabular-nums">{p.projectedEod}</td>
                  <td className="px-3 py-2">
                    <span className={cn("text-xs font-medium",
                      p.pace === "upstream-gap" ? "text-sky-600" : p.pace === "behind" ? "text-amber-600" : "text-emerald-600")}>
                      {p.pace === "upstream-gap" ? `Upstream gap ${p.queueGap}` : p.pace === "behind" ? "Behind" : p.pace === "done" ? "Complete" : "On track"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold",
                      p.risk === "critical" ? "bg-destructive text-destructive-foreground"
                        : p.risk === "attention" ? "bg-amber-500 text-black" : "bg-emerald-500/20 text-emerald-600")}>
                      {p.risk === "critical" ? "Critical" : p.risk === "attention" ? "Attention" : "Healthy"}
                    </span>
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-xs text-muted-foreground">No owners with active work yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Exact customers causing the gap</h2>
        <div className="grid gap-2">
          {worstOffenders.map((m) => (
            <div key={m.lead.ulid} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">{m.lead.name}</div>
                <div className="text-[11px] text-muted-foreground">{m.violations[0]?.label} · {m.violations[0]?.detail}</div>
              </div>
              <div className="text-[11px] text-muted-foreground">{m.ownerName} · age {fmtDur(m.ageMs)}</div>
            </div>
          ))}
          {worstOffenders.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
              Every active lead has an owner, a next action and a due time.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
