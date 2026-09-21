import { useMemo, useState } from "react";
import { useOs, predictReturn } from "@/lib/os/store";
import { WhyCaption } from "@/components/common/WhyCaption";
import { WHY } from "@/lib/os/why-registry";
import { REVIVAL_PLAYBOOKS, playbookFor } from "@/lib/os/revival-playbooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Sparkles } from "lucide-react";
import type { RevivalReason } from "@/lib/os/types";

export function RevivalPanel({ leadId }: { leadId: string }) {
  const cyclesForLead = useOs((s) => s.cyclesForLead);
  const openCycle = useOs((s) => s.openCycle);
  const closeCycle = useOs((s) => s.closeCycle);

  const cycles = cyclesForLead(leadId);
  const [reason, setReason] = useState<RevivalReason>("budget");
  const [notes, setNotes] = useState("");

  const prediction = useMemo(() => predictReturn(reason, cycles.length), [reason, cycles.length]);
  const pb = playbookFor(reason);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Unlimited Revival Cycles</h3>
        <Badge variant="outline" className="ml-auto">{cycles.length} cycle{cycles.length !== 1 && "s"}</Badge>
      </header>
      <WhyCaption {...WHY["os.revival.cycle"]} />

      {/* timeline */}
      <ol className="relative border-l border-border pl-4 space-y-3">
        {cycles.length === 0 && <li className="text-xs text-muted-foreground">No prior cycles — first contact.</li>}
        {cycles.map((c) => (
          <li key={c.id} className="text-xs">
            <div className="absolute -left-[6px] mt-1 h-3 w-3 rounded-full bg-primary" />
            <div className="flex items-center gap-2">
              <span className="font-semibold">Cycle {c.cycleNumber}</span>
              <Badge variant={c.outcome === "won" ? "default" : c.outcome === "active" ? "secondary" : "outline"}>
                {c.outcome ?? "active"}
              </Badge>
              {c.reopenReason && <span className="text-muted-foreground">reason: {c.reopenReason}</span>}
            </div>
            <div className="text-muted-foreground">
              opened {new Date(c.openedAt).toLocaleDateString()}
              {c.closedAt && ` · closed ${new Date(c.closedAt).toLocaleDateString()}`}
              {c.lostReason && ` · lost: ${c.lostReason}`}
            </div>
            {c.outcome === "active" && (
              <div className="flex gap-1 mt-1">
                <Button size="sm" variant="outline" onClick={() => closeCycle(c.id, "won")}>Won</Button>
                <Button size="sm" variant="outline" onClick={() => closeCycle(c.id, "lost", "user-closed")}>Lost</Button>
                <Button size="sm" variant="ghost" onClick={() => closeCycle(c.id, "ghost")}>Ghost</Button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {/* prediction */}
      <div className="rounded-md border p-2 text-xs space-y-1">
        <div className="font-semibold flex items-center gap-1"><Sparkles className="h-3 w-3" /> Return prediction</div>
        <div>Expected return in <b>{prediction.days} days</b> · confidence {prediction.confidence}%</div>
        <WhyCaption {...WHY["os.revival.predict"]} compact />
      </div>

      {/* new cycle */}
      <div className="rounded-md border border-dashed p-2 space-y-2">
        <div className="text-xs font-semibold">Open new revival cycle</div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={reason} onValueChange={(v) => setReason(v as RevivalReason)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REVIVAL_PLAYBOOKS.map((p) => <SelectItem key={p.reason} value={p.reason}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { openCycle(leadId, reason, notes); setNotes(""); }}>
            Open cycle {cycles.length + 1}
          </Button>
        </div>
        <Textarea rows={2} placeholder="Notes about why they're back…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {pb && (
          <div className="text-[11px] text-muted-foreground border-t pt-2">
            <div><b>Playbook:</b> {pb.label} · via {pb.channel} · SLA {pb.sla}</div>
            <div className="italic mt-1">"{pb.script}"</div>
            {pb.offer && <div>Offer: <span className="font-semibold">{pb.offer}</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}
