import { useEffect, useState } from "react";
import { usePipeline } from "@/lib/pipeline/store";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { STAGE_CONFIG } from "@/lib/pipeline/stage-config";
import { computeSlaState } from "@/lib/pipeline/stage-engine";
import { useAutomationTicker } from "@/hooks/useAutomationTicker";
import { StageStepper } from "./StageStepper";
import { StagePanel } from "./StagePanel";
import { DossierHeaderStrip } from "./DossierHeaderStrip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { FLOWOPS_PEOPLE, TCM_STATS } from "@/lib/people";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { leadId: string; }

export function ClosingEngineCard({ leadId }: Props) {
  const now = useAutomationTicker(1000);
  const state = usePipeline((s) => s.states[leadId]);
  const ensure = usePipeline((s) => s.ensure);
  useEffect(() => {
    if (!state) ensure(leadId);
  }, [state, ensure, leadId]);

  if (!state) {
    return null;
  }
  const sla = computeSlaState(state, now);
  const cfg = STAGE_CONFIG[state.currentStage];

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Closing Engine</div>
          <div className="text-sm font-display font-semibold">{cfg.label}</div>
          <div className="text-xs text-muted-foreground">{cfg.description}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ReassignPopover leadId={leadId} />
          <Badge
            variant={sla === "ok" ? "outline" : sla === "warning" ? "secondary" : "destructive"}
            className={cn("uppercase text-[10px]")}
          >
            SLA · {sla}
          </Badge>
        </div>
      </div>

      {/* Live impact-cue chip strip — everything filled in the dossier surfaces here */}
      <DossierHeaderStrip leadId={leadId} />

      <StageStepper leadId={leadId} />
      <StagePanel leadId={leadId} />
    </div>
  );
}

function ReassignPopover({ leadId }: { leadId: string }) {
  const lead = useIdentityStore((s) => s.leads.find((l) => l.ulid === leadId));
  const assignLead = useIdentityStore((s) => s.assignLead);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const teammates = [
    ...FLOWOPS_PEOPLE.map((p) => ({ id: p.id, name: p.name, focus: p.focus })),
    ...Object.entries(TCM_STATS).map(([id, s]) => ({ id, name: s.name, focus: s.focus })),
  ].filter((p) => p.id !== lead?.assigneeId);

  const doAssign = (id: string, name: string) => {
    if (!lead) return;
    assignLead(lead.ulid, id, name, reason || "not confident to close");
    toast.success(`Handed off to ${name}`);
    setOpen(false); setReason("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[11px]">
          <UserPlus className="h-3 w-3" />
          Reassign
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-2">
        <div>
          <div className="text-xs font-semibold">Hand off this lead</div>
          <div className="text-[10px] text-muted-foreground">
            Not confident to close? Route to a teammate with fresher context.
          </div>
        </div>
        <Input
          className="h-8 text-xs"
          placeholder="Reason (e.g. parents in Delhi, need Hindi)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="max-h-56 overflow-y-auto space-y-1">
          {teammates.map((t) => (
            <button key={t.id} type="button"
              onClick={() => doAssign(t.id, t.name)}
              className="w-full text-left px-2 py-1.5 rounded-md border border-border hover:bg-muted transition">
              <div className="text-xs font-medium">{t.name}</div>
              <div className="text-[10px] text-muted-foreground">{t.focus}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
