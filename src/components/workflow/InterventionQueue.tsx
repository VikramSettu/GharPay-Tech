import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthPill, SeverityChip, MotionLine, EmptyQueue, CountBadge } from "./bits";
import { OutcomeDialog } from "./OutcomeDialog";
import { useWorkflowActions } from "./use-actions";
import { useWorkflowBoard } from "@/lib/workflow/use-board";
import { roleOfFunction, type LeadMotion, type Severity, type WorkRoleId } from "@/lib/workflow/engine";

type Filter = "all" | Severity;
interface InterventionTarget { motion: LeadMotion; role: WorkRoleId }

/** One place to fix broken movement, with the action form owned by the role responsible for the violation. */
export function InterventionQueue() {
  const { board, mounted } = useWorkflowBoard();
  const a = useWorkflowActions();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<InterventionTarget | null>(null);

  const rows = useMemo(() => {
    let list = board.filter((m) => m.violations.length > 0);
    if (filter !== "all") list = list.filter((m) => m.violations.some((v) => v.severity === filter));
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((m) =>
        m.lead.name.toLowerCase().includes(needle) ||
        (m.lead.area || "").toLowerCase().includes(needle) ||
        m.ownerName.toLowerCase().includes(needle));
    }
    return list;
  }, [board, filter, q]);

  const counts = useMemo(() => ({
    all: board.filter((m) => m.violations.length > 0).length,
    P0: board.filter((m) => m.violations.some((v) => v.severity === "P0")).length,
    P1: board.filter((m) => m.violations.some((v) => v.severity === "P1")).length,
    P2: board.filter((m) => m.violations.some((v) => v.severity === "P2")).length,
  }), [board]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Intervention queue</h1>
        <p className="text-sm text-muted-foreground">
          Every broken guarantee, ranked. Work it in the role that actually owns the failure — not necessarily the lead's current stage.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All <CountBadge n={counts.all} /></TabsTrigger>
            <TabsTrigger value="P0">P0 <CountBadge n={counts.P0} /></TabsTrigger>
            <TabsTrigger value="P1">P1 <CountBadge n={counts.P1} /></TabsTrigger>
            <TabsTrigger value="P2">P2 <CountBadge n={counts.P2} /></TabsTrigger>
          </TabsList>
        </Tabs>
        <Input className="max-w-xs" placeholder="Search lead, area or owner…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {mounted && rows.length === 0 && (
        <EmptyQueue title="Nothing is broken right now">
          Every active lead has an owner, a next action and a due time. Control Tower stays quiet until that changes.
        </EmptyQueue>
      )}

      <div className="space-y-2">
        {rows.map((m) => {
          const v = m.violations[0];
          const ownerRole = roleOfFunction(v.fn);
          return (
            <div key={m.lead.ulid} className="rounded-xl border p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SeverityChip severity={v.severity} />
                    <span className="font-medium">{m.lead.name}</span>
                    <HealthPill health={m.health} />
                    <span className="text-[11px] font-mono text-muted-foreground">score {m.priorityScore}</span>
                  </div>
                  <div className="text-sm">{v.label} <span className="text-muted-foreground">— {v.detail}</span></div>
                  <MotionLine m={m} />
                  {m.violations.length > 1 && (
                    <div className="text-[11px] text-muted-foreground">
                      +{m.violations.length - 1} more: {m.violations.slice(1).map((x) => x.label).join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {!m.ownerId && (
                    <Button size="sm" onClick={() => a.assignToMe(m.lead.ulid)}>Assign to me</Button>
                  )}
                  <Button size="sm" onClick={() => setTarget({ motion: m, role: ownerRole })}>Work it now</Button>
                  <Button size="sm" variant="outline" onClick={() => a.scheduleFollowUp(m.lead.ulid, 2)}>+2h</Button>
                  <Button size="sm" variant="outline" onClick={() => a.markBlocked(m.lead.ulid, "Supply dependency flagged from Control Tower")}>Blocked</Button>
                  <Button size="sm" variant="ghost" onClick={() => a.escalate(m.lead.ulid, v.code)}>Escalate</Button>
                  <Button size="sm" variant="ghost" onClick={() => a.resolve(m.lead.ulid, v.code, "Reviewed in Control Tower")}>Resolve</Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <OutcomeDialog
        motion={target?.motion ?? null}
        role={target?.role}
        open={!!target}
        onOpenChange={(v) => !v && setTarget(null)}
      />
    </div>
  );
}
