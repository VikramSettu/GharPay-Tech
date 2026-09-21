import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { BellRing, CalendarClock, CheckCircle2, Clock, Phone } from "lucide-react";
import type { Lead, FollowUpPriority } from "@/lib/types";
import { useMountedNow } from "@/hooks/use-now";

const PRESETS: { label: string; hours: number; priority: FollowUpPriority }[] = [
  { label: "In 1 hour", hours: 1, priority: "high" },
  { label: "In 4 hours", hours: 4, priority: "high" },
  { label: "Tomorrow", hours: 24, priority: "high" },
  { label: "In 3 days", hours: 72, priority: "medium" },
  { label: "In 7 days", hours: 168, priority: "low" },
  { label: "In 30 days", hours: 720, priority: "low" },
];

export function LeadFollowUpsPanel({ lead, onLogActivity }: { lead: Lead; onLogActivity: () => void }) {
  const { followUps, setLeadFollowUp, completeFollowUp } = useApp();
  const [, mounted] = useMountedNow();

  const mine = useMemo(
    () => followUps.filter((f) => f.leadId === lead.id).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)),
    [followUps, lead.id],
  );
  const open = mine.filter((f) => !f.done);
  const done = mine.filter((f) => f.done).reverse();

  const schedule = (hours: number, priority: FollowUpPriority, reason: string) => {
    setLeadFollowUp(lead.id, new Date(Date.now() + hours * 3600_000).toISOString(), priority, reason);
    toast.success(`Follow-up set · ${reason}`);
  };

  return (
    <div className="space-y-4">
      {/* Next up */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <CalendarClock className="h-3.5 w-3.5 text-primary" />
          Next follow-up
        </div>
        {lead.nextFollowUpAt ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium">{format(new Date(lead.nextFollowUpAt), "EEE, MMM d · p")}</span>
            <Badge variant={isPast(new Date(lead.nextFollowUpAt)) ? "destructive" : "secondary"} className="text-[10px]">
              {mounted ? formatDistanceToNow(new Date(lead.nextFollowUpAt), { addSuffix: true }) : "scheduled"}
            </Badge>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Nothing planned. Every open lead must have a dated next step.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => schedule(p.hours, p.priority, `Follow-up ${p.label.toLowerCase()}`)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Open follow-ups */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Open · {open.length}
        </h4>
        {open.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No open follow-ups. Log an activity to create the next step automatically.
          </div>
        )}
        {open.map((f) => {
          const overdue = isPast(new Date(f.dueAt));
          return (
            <div key={f.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{f.reason}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Due {format(new Date(f.dueAt), "MMM d, p")}
                    {mounted && ` · ${formatDistanceToNow(new Date(f.dueAt), { addSuffix: true })}`}
                  </div>
                </div>
                <Badge variant={overdue ? "destructive" : "outline"} className="shrink-0 text-[10px] capitalize">
                  {overdue ? "overdue" : f.priority}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm" className="h-7 text-[11px]"
                  onClick={() => { completeFollowUp(f.id); toast.success("Follow-up completed"); }}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Done
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onLogActivity}>
                  <Phone className="mr-1 h-3 w-3" /> Done + log outcome
                </Button>
                <Button
                  size="sm" variant="outline" className="h-7 text-[11px]"
                  onClick={() => { completeFollowUp(f.id); schedule(4, f.priority, `Snoozed · ${f.reason}`); }}
                >
                  <Clock className="mr-1 h-3 w-3" /> Snooze 4h
                </Button>
                <Button
                  size="sm" variant="outline" className="h-7 text-[11px]"
                  onClick={() => { completeFollowUp(f.id); schedule(24, f.priority, `Rescheduled · ${f.reason}`); }}
                >
                  <BellRing className="mr-1 h-3 w-3" /> Push 1 day
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* History */}
      {done.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Completed · {done.length}
          </h4>
          {done.slice(0, 10).map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
              <span className="truncate">{f.reason}</span>
              <span className="ml-auto shrink-0">{format(new Date(f.dueAt), "MMM d")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
