import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { roleOfFunction, type LeadMotion, type WorkRoleId } from "@/lib/workflow/engine";
import { ROLE_META } from "@/lib/workflow/roles";
import { useWorkflowActions } from "./use-actions";

type NextKind =
  | "schedule-tour" | "callback" | "quote" | "waiting" | "not-feasible"
  | "tour-confirm" | "tour-hot" | "tour-warm" | "tour-cold"
  | "booked" | "supply-resolved" | "checkin-date";

interface Option { id: NextKind; label: string; hint: string }

const OPTIONS: Record<WorkRoleId, Option[]> = {
  "flow-ops": [
    { id: "schedule-tour", label: "Schedule tour", hint: "Creates the TCM handoff immediately" },
    { id: "callback", label: "Callback", hint: "Dated callback — returns to your queue when due" },
    { id: "quote", label: "Create quotation", hint: "Use only when this customer is genuinely quote-ready" },
    { id: "waiting", label: "Waiting for customer", hint: "Must expire — waiting is never a graveyard" },
    { id: "not-feasible", label: "Supply dependency", hint: "Creates a PCM dependency without reassigning the customer" },
  ],
  tour: [
    { id: "tour-confirm", label: "Tour confirmed", hint: "Customer confirmation completed; continue tour control" },
    { id: "tour-hot", label: "Tour completed · 8–10 / high", hint: "Creates a high-intent Closing handoff" },
    { id: "tour-warm", label: "Tour completed · 5–7 / needs work", hint: "Creates a Closing handoff with warm intent" },
    { id: "tour-cold", label: "Tour completed · poor fit", hint: "Records the outcome so the customer can be rematched/recovered" },
    { id: "callback", label: "Rescue / callback", hint: "Create a dated tour-control follow-up" },
    { id: "not-feasible", label: "Inventory / property blocker", hint: "Creates a PCM dependency while TCM/customer ownership remains visible" },
  ],
  closing: [
    { id: "quote", label: "Create / refresh quotation", hint: "Creates a dated closing follow-up" },
    { id: "callback", label: "Closing follow-up", hint: "Decision-maker, objection, discount or payment follow-up with a deadline" },
    { id: "booked", label: "Payment received · booking confirmed", hint: "Closes the commercial outcome and creates the Check-in handoff" },
    { id: "waiting", label: "Waiting for decision", hint: "Allowed only with an expiry" },
    { id: "not-feasible", label: "Supply dependency", hint: "Room/bed clarification goes to PCM without transferring the lead" },
  ],
  supply: [
    { id: "supply-resolved", label: "Dependency resolved", hint: "Clears the blocker and returns the customer to the original workflow" },
    { id: "callback", label: "Need more confirmation time", hint: "Creates a dated PCM follow-up" },
    { id: "not-feasible", label: "Update blocker reason", hint: "Keep blocked with an explicit reason while resolution continues" },
  ],
  "check-in": [
    { id: "checkin-date", label: "Check-in dated / prepared", hint: "Records the downstream check-in date" },
    { id: "callback", label: "Check-in follow-up", hint: "Creates a dated preparation action" },
    { id: "not-feasible", label: "Check-in dependency", hint: "Records the blocker instead of silently stopping after booking" },
  ],
};

/**
 * Mandatory role-aware outcome. An item cannot disappear: the chosen outcome
 * must create the next movement, a dated wait, a downstream handoff or an
 * explicit dependency.
 */
export function OutcomeDialog({
  motion, open, onOpenChange, onDone, role,
}: {
  motion: LeadMotion | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
  role?: WorkRoleId;
}) {
  const a = useWorkflowActions();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [next, setNext] = useState<NextKind | null>(null);
  const [when, setWhen] = useState("");
  const [hours, setHours] = useState(2);
  const [amount, setAmount] = useState(18500);
  const [reason, setReason] = useState("");

  if (!motion) return null;
  const ulid = motion.lead.ulid;
  const activeRole = role ?? roleOfFunction(motion.fn);
  const options = OPTIONS[activeRole];

  const reset = () => {
    setConnected(null);
    setNext(null);
    setWhen("");
    setHours(2);
    setReason("");
  };

  const flowValid = activeRole !== "flow-ops" || connected !== null;
  const needsWhen = next === "schedule-tour" || next === "booked" || next === "checkin-date";
  const needsReason = next === "not-feasible";
  const canSave = flowValid && next !== null && (!needsWhen || !!when) && (!needsReason || reason.trim().length > 2);

  const save = () => {
    if (!next) return;

    if (activeRole === "flow-ops") {
      a.call(ulid, connected === true);
      if (next === "schedule-tour") a.scheduleTour(ulid, new Date(when).toISOString(), motion.lead.propertyName);
      if (next === "callback" || next === "waiting") a.scheduleFollowUp(ulid, hours);
      if (next === "quote") a.createQuote(ulid, amount);
      if (next === "not-feasible") a.markBlocked(ulid, reason);
    }

    if (activeRole === "tour") {
      if (next === "tour-confirm") a.confirmTour(ulid);
      if (next === "tour-hot") a.completeTour(ulid, "HOT");
      if (next === "tour-warm") a.completeTour(ulid, "WARM");
      if (next === "tour-cold") a.completeTour(ulid, "COLD");
      if (next === "callback") a.scheduleFollowUp(ulid, hours);
      if (next === "not-feasible") a.markBlocked(ulid, reason);
    }

    if (activeRole === "closing") {
      if (next === "quote") a.createQuote(ulid, amount);
      if (next === "callback" || next === "waiting") a.scheduleFollowUp(ulid, hours);
      if (next === "booked") a.markBooked(ulid, new Date(when).toISOString());
      if (next === "not-feasible") a.markBlocked(ulid, reason);
    }

    if (activeRole === "supply") {
      if (next === "supply-resolved") a.markBlocked(ulid, null);
      if (next === "callback") a.scheduleFollowUp(ulid, hours);
      if (next === "not-feasible") a.markBlocked(ulid, reason);
    }

    if (activeRole === "check-in") {
      if (next === "checkin-date") a.setCheckIn(ulid, new Date(when).toISOString());
      if (next === "callback") a.scheduleFollowUp(ulid, hours);
      if (next === "not-feasible") a.markBlocked(ulid, reason);
    }

    reset();
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{motion.lead.name} — {ROLE_META[activeRole].label} outcome</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {activeRole === "flow-ops" && (
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">1 · Contact outcome</Label>
              <div className="flex gap-2">
                {[{ v: true, l: "Connected" }, { v: false, l: "Not connected" }].map((o) => (
                  <Button key={o.l} type="button" size="sm"
                    variant={connected === o.v ? "default" : "outline"}
                    onClick={() => setConnected(o.v)}>{o.l}</Button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {activeRole === "flow-ops" ? "2 · What happens next (required)" : "Required outcome / next movement"}
            </Label>
            <div className="grid gap-1.5">
              {options.map((o) => (
                <button key={o.id} type="button" onClick={() => setNext(o.id)}
                  className={cn("text-left rounded-lg border p-2 text-sm transition-colors",
                    next === o.id ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                  <div className="font-medium">{o.label}</div>
                  <div className="text-[11px] text-muted-foreground">{o.hint}</div>
                </button>
              ))}
            </div>
          </section>

          {next === "schedule-tour" && (
            <section className="space-y-1.5">
              <Label className="text-xs">Tour date & time</Label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </section>
          )}

          {(next === "booked" || next === "checkin-date") && (
            <section className="space-y-1.5">
              <Label className="text-xs">Check-in date & time</Label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              {next === "booked" && <p className="text-[11px] text-muted-foreground">Booking confirmation will create a Check-in handoff. The handoff remains pending until the downstream owner accepts it.</p>}
            </section>
          )}

          {(next === "callback" || next === "waiting") && (
            <section className="space-y-1.5">
              <Label className="text-xs">{next === "waiting" ? "Waiting until" : "Follow-up in"}</Label>
              <div className="flex flex-wrap gap-2">
                {[2, 6, 24, 48].map((h) => (
                  <Button key={h} type="button" size="sm" variant={hours === h ? "default" : "outline"} onClick={() => setHours(h)}>
                    {h === 24 ? "Tomorrow" : h === 48 ? "2 days" : `${h}h`}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {next === "quote" && (
            <section className="space-y-1.5">
              <Label className="text-xs">Quotation amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </section>
          )}

          {next === "not-feasible" && (
            <section className="space-y-1.5">
              <Label className="text-xs">Dependency / blocker reason</Label>
              <Input placeholder="e.g. Whitefield female single sharing — room confirmation pending" value={reason} onChange={(e) => setReason(e.target.value)} />
            </section>
          )}
        </div>

        <DialogFooter>
          <Button disabled={!canSave} onClick={save}>Save outcome &amp; next</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
