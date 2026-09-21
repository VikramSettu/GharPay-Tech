import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HealthPill, SeverityChip, MotionLine, ProgressRow, EmptyQueue } from "./bits";
import { OutcomeDialog } from "./OutcomeDialog";
import { RoleGuaranteePanel } from "./RoleGuaranteePanel";
import { useWorkflowActions } from "./use-actions";
import { useWorkflowBoard } from "@/lib/workflow/use-board";
import { buildWaves, recoveryQueue, fmtDur, workedHours, type LeadMotion, type WorkRoleId } from "@/lib/workflow/engine";
import { boardForRole, ROLE_META } from "@/lib/workflow/roles";
import { targetsFor, useWorkflow } from "@/lib/workflow/store";

const ROLE_WAVES: Record<WorkRoleId, { title: string; note: string }[]> = {
  "flow-ops": [
    { title: "Wave 1 — Must Win", note: "SLA breaches, active replies, urgent callbacks and same-day demand." },
    { title: "Wave 2 — Fresh Demand", note: "New and never-called eligible customers." },
    { title: "Wave 3 — Conversion", note: "Connected, qualified and tour-ready customers." },
    { title: "Wave 4 — Recovery", note: "Missed follow-ups, revival and remaining high-probability demand." },
  ],
  tour: [
    { title: "Wave 1 — Tour Risk", note: "Imminent tours, missing TCM/confirmation and inventory risk." },
    { title: "Wave 2 — Confirm", note: "Customer, property and room confirmation work." },
    { title: "Wave 3 — Complete", note: "Arrival, show-up and tour completion work." },
    { title: "Wave 4 — Outcome", note: "Post-tour outcome and Closing handoff recovery." },
  ],
  closing: [
    { title: "Wave 1 — Payment Intent", note: "Payment-ready, room-hold and immediate close signals." },
    { title: "Wave 2 — High Intent", note: "Strong post-tour opportunities and quote follow-ups." },
    { title: "Wave 3 — Decision Blockers", note: "Parent, discount, room and objection resolution." },
    { title: "Wave 4 — Recovery", note: "Overdue and recoverable closing opportunities." },
  ],
  supply: [
    { title: "Wave 1 — Customer Blockers", note: "Inventory dependencies actively stopping a customer." },
    { title: "Wave 2 — Revalidate", note: "Room/bed, manager, rent and vacating-date confirmation." },
    { title: "Wave 3 — Alternatives", note: "Find matchable fallback supply for blocked demand." },
    { title: "Wave 4 — Supply Recovery", note: "Remaining freshness and demand-gap work." },
  ],
  "check-in": [
    { title: "Wave 1 — Today", note: "Immediate booking and check-in safety work." },
    { title: "Wave 2 — Upcoming", note: "Near-term check-in preparation." },
    { title: "Wave 3 — Missing Handover", note: "Bookings missing downstream ownership or date." },
    { title: "Wave 4 — Recovery", note: "Remaining unsafe bookings." },
  ],
};

/**
 * The operator screen. The mission automatically follows the role represented
 * by the user's live queue, so a TCM is never judged on Flow Ops targets and a
 * Closing Specialist is never given a generic raw-lead workload.
 */
export function MissionQueue() {
  const { board, myFlow, verdict, currentUser, mounted, myRole } = useWorkflowBoard();
  const allTargets = useWorkflow((s) => s.targets);
  const targets = targetsFor(allTargets, myRole);
  const a = useWorkflowActions();
  const [active, setActive] = useState<LeadMotion | null>(null);
  const [waveIdx, setWaveIdx] = useState(0);

  const roleBoard = useMemo(() => boardForRole(board, myRole), [board, myRole]);
  const queue = useMemo(
    () => roleBoard.filter((m) => m.ownerId === currentUser.id || (myRole === "flow-ops" && !m.ownerId)),
    [roleBoard, currentUser.id, myRole],
  );

  const waves = useMemo(
    () => buildWaves(queue, targets.waveSize, myFlow?.requiredActions ?? queue.length),
    [queue, targets.waveSize, myFlow?.requiredActions],
  );

  const recovery = useMemo(
    () => recoveryQueue(roleBoard, currentUser.id, Math.max(0, (myFlow?.requiredActions ?? 0) - (myFlow?.completedActions ?? 0))),
    [roleBoard, currentUser.id, myFlow?.requiredActions, myFlow?.completedActions],
  );

  const hoursLeft = workedHours(Date.now()).remaining;
  const wave = waves[Math.min(waveIdx, Math.max(0, waves.length - 1))];
  const current = wave?.items[0] ?? queue[0] ?? null;
  const waveMeta = ROLE_WAVES[myRole];

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{ROLE_META[myRole].label}</div>
        <h1 className="text-2xl font-semibold tracking-tight">My work</h1>
        <p className="text-sm text-muted-foreground">
          Not a list to browse — your role guarantee converted into the next executable move.
        </p>
      </header>

      <RoleGuaranteePanel role={myRole} />

      {myFlow && (
        <section className="grid gap-3 md:grid-cols-2">
          <Card className="p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Today's execution contract</span>
              <span className="text-xs text-muted-foreground">{Math.round(hoursLeft * 10) / 10}h left</span>
            </div>
            <ProgressRow label="Actions completed" value={myFlow.completedActions} target={myFlow.requiredActions} />
            <ProgressRow label="Unique customers actioned" value={myFlow.uniqueLeads} target={myFlow.requiredActions} />
            {myRole === "flow-ops" && <ProgressRow label="Connected conversations" value={myFlow.connections} target={myFlow.targetConnections} />}
            {myRole === "tour" && <ProgressRow label="Tour output" value={myFlow.tours} target={myFlow.targetTours} />}
            {myRole === "closing" && <ProgressRow label="Paid-booking output" value={myFlow.bookings} target={myFlow.targetBookings} />}
            {myRole === "supply" && <ProgressRow label="Executable dependency work" value={myFlow.completedActions} target={myFlow.requiredActions} />}
            {myRole === "check-in" && <ProgressRow label="Booking/check-in work" value={myFlow.completedActions} target={myFlow.requiredActions} />}
          </Card>
          <Card className={cn("p-4 space-y-2",
            verdict?.status === "at-risk" && "border-destructive/40 bg-destructive/5",
            verdict?.status === "upstream-impossible" && "border-sky-500/40 bg-sky-500/5")}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Projected end of day execution</div>
            <div className="text-3xl font-semibold tabular-nums">
              {mounted ? myFlow.projectedEod : 0}
              <span className="text-sm text-muted-foreground"> / {myFlow.requiredActions}</span>
            </div>
            <p className="text-sm">{verdict?.line}</p>
            {myFlow.queueGap > 0 && (
              <p className="text-xs text-sky-600">
                Queue shortage: {myFlow.queueGap} executable actions short. This is an upstream-input failure until the shortage is filled.
              </p>
            )}
          </Card>
        </section>
      )}

      {waves.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Execution waves</h2>
          <div className="flex flex-wrap gap-2">
            {waves.map((w, i) => {
              const meta = waveMeta[Math.min(i, waveMeta.length - 1)];
              return (
                <button key={w.index} type="button" onClick={() => setWaveIdx(i)}
                  className={cn("rounded-lg border px-3 py-2 text-left text-xs transition-colors min-w-[150px]",
                    i === waveIdx ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                  <div className="font-medium">{meta.title}</div>
                  <div className="text-muted-foreground">{w.items.length} items · {meta.note}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Next best action</h2>
        {!current && mounted && (
          <EmptyQueue title="Current queue complete">
            No eligible {ROLE_META[myRole].label} work is executable right now. Control Tower should treat this as an input/capacity signal, not silent idleness.
          </EmptyQueue>
        )}
        {current && (
          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{current.lead.name}</span>
                  <HealthPill health={current.health} />
                  {current.worst && <SeverityChip severity={current.worst} />}
                </div>
                <div className="text-sm">{current.action?.label ?? "Resolve the workflow exception"}</div>
                <MotionLine m={current} />
                <div className="text-xs text-muted-foreground">Why now: {current.reason}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {!current.ownerId && myRole === "flow-ops" && <Button size="sm" variant="outline" onClick={() => a.assignToMe(current.lead.ulid)}>Claim</Button>}
                <Button size="sm" onClick={() => setActive(current)}>Save outcome & next</Button>
              </div>
            </div>
          </Card>
        )}
      </section>

      {wave && wave.items.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Next in this wave</h2>
          <div className="space-y-1.5">
            {wave.items.slice(1).map((m) => (
              <div key={m.lead.ulid} className="rounded-lg border p-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{m.lead.name}</div>
                  <div className="text-[11px] text-muted-foreground">{m.action?.label ?? "Resolve"} · {m.reason}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActive(m)}>Outcome & next</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {recovery.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Recovery pool</h2>
          <p className="text-xs text-muted-foreground">Highest-priority eligible work available to restore today's role outcome.</p>
          <div className="grid gap-2 md:grid-cols-3">
            {recovery.map((b) => (
              <Card key={b.bucket} className="p-3 space-y-1.5">
                <div className="text-xs font-semibold">{b.bucket}</div>
                {b.items.slice(0, 4).map((m) => (
                  <button key={m.lead.ulid} type="button" onClick={() => setActive(m)}
                    className="block w-full text-left text-[11px] text-muted-foreground hover:text-foreground">
                    {m.lead.name} · {m.action?.label ?? "Resolve"}
                  </button>
                ))}
              </Card>
            ))}
          </div>
        </section>
      )}

      <OutcomeDialog motion={active} open={!!active} onOpenChange={(v) => !v && setActive(null)} />
    </div>
  );
}
