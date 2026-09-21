import { CalendarClock, Check, Circle, LockKeyhole, MessageCircle, Phone, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityLog, Lead, Tour } from "@/lib/types";
import {
  CALL_GATES, GATE_BLOCKERS, callGateStatus, gateBlockers, gatesDone,
  type CallNumber, type GateBlockerId, type GateId,
} from "@/lib/journey-gates";
import { applyOverride, useJourneyOverrides } from "@/myt/lib/journey-store";

const CALLS = [
  { number: 1, name: "Basics", win: "Budget, move date, area and Bangalore fit are clear." },
  { number: 2, name: "Schedule", win: "The right property is shortlisted and a visit is committed." },
  { number: 3, name: "Tour", win: "The visit happened and the lead's real reaction is recorded." },
  { number: 4, name: "Close", win: "Objections are resolved and the booking or token is secured." },
  { number: 5, name: "Recall", win: "A stalled lead has a specific reason and a dated reconnect plan." },
] as const;


function callNumberFor(lead: Lead) {
  if (lead.stage === "new" || lead.stage === "contacted") return 1;
  if (lead.stage === "tour-scheduled") return 2;
  if (lead.stage === "tour-done") return 3;
  if (lead.stage === "negotiation") return 4;
  return 5;
}

export function LeadCallLadder({
  lead,
  activities,
  tours,
  selectedCall,
  onSelectCall,
  onContinue,
}: {
  lead: Lead;
  activities: ActivityLog[];
  tours: Tour[];
  selectedCall?: number;
  onSelectCall?: (call: number) => void;
  onContinue: (call: number) => void;
}) {
  const current = callNumberFor(lead);
  const activeCall = selectedCall ?? current;
  const play = CALLS[activeCall - 1] ?? CALLS[0];
  const calls = activities.filter((activity) => activity.kind === "call_logged");
  const messages = activities.filter((activity) => activity.kind === "message_sent");
  const latestTour = tours[0];
  const checks = [
    { label: "Phone available", done: Boolean(lead.phone) },
    { label: "Budget captured", done: lead.budget > 0 },
    { label: "Preferred area captured", done: Boolean(lead.preferredArea) },
    { label: "Move date captured", done: Boolean(lead.moveInDate) },
    { label: "WhatsApp checked", done: messages.length > 0 },
    { label: "Notes / signals captured", done: lead.tags.length > 0 },
    { label: "Next reconnect planned", done: Boolean(lead.nextFollowUpAt) },
    { label: "Current call attempted", done: calls.length > 0 },
  ];
  const completed = checks.filter((item) => item.done).length;
  const effort = Math.round((completed / checks.length) * 100);
  const open = checks.filter((item) => !item.done);

  // S1..S8 journey gates, wired to C1..C5
  const stepOv = useJourneyOverrides((s) => s.steps[lead.id]);
  const blockOv = useJourneyOverrides((s) => s.blockers[lead.id]);
  const toggleStep = useJourneyOverrides((s) => s.toggleStep);
  const toggleBlocker = useJourneyOverrides((s) => s.toggleBlocker);
  const derivedGates = gatesDone(lead, activities, tours);
  const derivedBlockers = gateBlockers(lead, activities, tours);
  const gateOverride = (id: GateId, derived: boolean) => applyOverride(derived, stepOv?.[id]);
  const gateStatus = callGateStatus(activeCall as CallNumber, lead, activities, tours, gateOverride);


  return (
    <section className="space-y-3 px-5 py-3" aria-label="Call ladder">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 shrink-0 text-primary" />
            <h2 className="truncate text-sm font-semibold">Call {activeCall} · {play.name}</h2>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Win: {play.win}</p>
        </div>
        <div className={cn(
          "min-w-14 rounded-md border px-2 py-1 text-center",
          effort >= 99 ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning",
        )}>
          <div className="text-lg font-bold tabular-nums leading-none">{effort}%</div>
          <div className="mt-0.5 text-[9px] uppercase">effort</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {CALLS.map((call) => {
          const done = call.number < current || lead.stage === "booked";
          const active = call.number === activeCall && lead.stage !== "booked";
          const Icon = done ? Check : active ? Circle : LockKeyhole;
          const cg = callGateStatus(call.number as CallNumber, lead, activities, tours, gateOverride);
          return (
            <Button
              type="button"
              key={call.number}
              variant="outline"
              title={`${call.name}: ${call.win} — clears ${CALL_GATES[call.number as CallNumber].join(", ") || "NR / NU / NO"}`}
              aria-pressed={active}
              onClick={() => onSelectCall?.(call.number)}
              className={cn(
                "h-auto min-w-0 rounded-md px-1 py-1.5 text-center",
                done && "border-success/40 bg-success/10 text-success",
                active && "border-primary bg-primary/10 text-primary",
                !done && !active && "border-border text-muted-foreground/55",
              )}
            >
              <span className="block min-w-0">
                <Icon className="mx-auto h-3 w-3" />
                <span className="mt-1 block text-[10px] font-semibold">C{call.number}</span>
                <span className="block truncate text-[9px] font-normal">{call.name}</span>
                <span className="mt-0.5 block text-[9px] font-semibold tabular-nums opacity-80">
                  {cg.total ? `${cg.cleared}/${cg.total}` : "NR·NU·NO"}
                </span>
              </span>
            </Button>
          );
        })}
      </div>

      {/* S1 → S8 gates owned by this call — click to mark cleared */}
      <div className="space-y-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Gates on C{activeCall}
          {gateStatus.total > 0 && (
            <span className={cn("tabular-nums", gateStatus.complete ? "text-success" : "text-foreground")}>
              {gateStatus.cleared}/{gateStatus.total} cleared
            </span>
          )}
        </div>

        {gateStatus.gates.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {gateStatus.gates.map((gate) => {
              const on = gateStatus.isDone(gate);
              return (
                <button
                  type="button"
                  key={gate.id}
                  onClick={() => toggleStep(lead.id, gate.id as never, derivedGates[gate.id])}
                  title={`${gate.code} — ${gate.why}`}
                  aria-pressed={on}
                  className={cn(
                    "rounded-md border px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-tight transition-colors",
                    gate.sub && "text-[9px]",
                    on
                      ? "border-success/40 bg-success/15 text-success"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {gate.code}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Recall call — no new gate. The job is to clear a blocker and push the lead back to its open gate.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1">
          {(Object.keys(GATE_BLOCKERS) as GateBlockerId[]).map((b) => {
            const on = applyOverride(derivedBlockers.includes(b), blockOv?.[b]);
            return (
              <button
                type="button"
                key={b}
                onClick={() => toggleBlocker(lead.id, b, derivedBlockers.includes(b))}
                title={`${b} · ${GATE_BLOCKERS[b].label} — ${GATE_BLOCKERS[b].why}`}
                aria-pressed={on}
                className={cn(
                  "rounded border px-1 py-[3px] text-[9px] font-bold uppercase leading-none transition-colors",
                  on
                    ? "border-destructive/50 bg-destructive/15 text-destructive"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {b}{on ? ` · ${GATE_BLOCKERS[b].label}` : ""}
              </button>
            );
          })}
        </div>
      </div>


      <div className="grid gap-2 text-[11px] sm:grid-cols-2">
        <div className="min-w-0 rounded-md bg-muted/50 px-2.5 py-2">
          <div className="mb-1 font-semibold text-foreground">Still open · {open.length}</div>
          <div className="truncate text-muted-foreground">
            {open.length ? open.map((item) => item.label).join(" · ") : "All required information is ready."}
          </div>
        </div>
        <div className="min-w-0 rounded-md bg-muted/50 px-2.5 py-2 text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 shrink-0" /> {calls.length} call attempt{calls.length === 1 ? "" : "s"}</div>
          <div className="mt-1 flex items-center gap-1.5 truncate"><MessageCircle className="h-3 w-3 shrink-0" /> WhatsApp: {messages.length ? `${messages.length} chat event${messages.length === 1 ? "" : "s"}` : "not checked"}</div>
          <div className="mt-1 flex items-center gap-1.5 truncate"><CalendarClock className="h-3 w-3 shrink-0" /> Next: {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString() : latestTour ? new Date(latestTour.scheduledAt).toLocaleString() : "not planned"}</div>
        </div>
      </div>

      <Button size="sm" className="h-8 w-full" onClick={() => onContinue(activeCall)}>
        <Phone className="mr-1.5 h-3.5 w-3.5" /> Continue Call {activeCall} · {play.name}
      </Button>
    </section>
  );
}