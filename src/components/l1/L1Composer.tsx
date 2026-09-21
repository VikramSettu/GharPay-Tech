import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { analyzeConversation } from "@/lib/l1/engine";
import { SAMPLE_CHAT, parseTranscript } from "@/lib/l1/parse";
import { newL1Id, saveL1Review } from "@/lib/l1/store";
import type { L1Kind } from "@/lib/l1/types";
import { L1Scorecard } from "./L1Scorecard";
import { Save, Wand2 } from "lucide-react";

export const ZONES = [
  "HSR / Sarjapur", "Koramangala / BTM", "Whitefield / Marathahalli",
  "North (Hebbal / Yelahanka)", "Electronic City", "Central (Indiranagar / MG Road)", "West (Rajajinagar)",
];

const STAGES = ["New lead", "Qualified", "Tour scheduled", "Toured", "Negotiating", "Payment pending", "Lost"];

export function L1Composer({ kind }: { kind: L1Kind }) {
  const [zone, setZone] = useState(ZONES[0]);
  const [agent, setAgent] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [stage, setStage] = useState(STAGES[0]);
  const [aliases, setAliases] = useState("Gharpayy");
  const [transcript, setTranscript] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [wowOverride, setWowOverride] = useState("");
  const [dullOverride, setDullOverride] = useState("");
  const [committedNextStep, setCommittedNextStep] = useState("");
  const [committedBy, setCommittedBy] = useState("");

  const analysis = useMemo(() => {
    if (!transcript.trim()) return null;
    return analyzeConversation(parseTranscript(transcript, { agentAliases: `${aliases},agent` }), kind);
  }, [transcript, aliases, kind]);

  const save = () => {
    if (!analysis) { toast.error("Paste the conversation first"); return; }
    if (!agent.trim()) { toast.error("Who is being reviewed?"); return; }
    if (kind === "call" && !committedNextStep.trim()) {
      toast.error("A call review cannot be filed without the next step we committed to");
      return;
    }
    saveL1Review({
      id: newL1Id(), createdAt: new Date().toISOString(), kind, zone, agent, reviewer,
      leadName, leadPhone, stage, transcript, reviewerNote, wowOverride, dullOverride,
      committedNextStep, committedBy, analysis,
    });
    toast.success(`L1 ${kind} review filed for ${agent}`);
    setTranscript(""); setReviewerNote(""); setWowOverride(""); setDullOverride("");
    setCommittedNextStep(""); setLeadName(""); setLeadPhone("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Zone</Label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Agent reviewed</Label><Input className="mt-1" value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="Rahul" /></div>
          <div><Label className="text-xs">Reviewer</Label><Input className="mt-1" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Control Tower" /></div>
          <div><Label className="text-xs">Customer</Label><Input className="mt-1" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Ananya" /></div>
          <div><Label className="text-xs">Phone</Label><Input className="mt-1" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="+91…" /></div>
        </div>

        <div>
          <Label className="text-xs">Our names in the transcript (comma separated)</Label>
          <Input className="mt-1" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Rahul, Gharpayy" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">{kind === "call" ? "Call transcript / notes" : "Chat transcript"}</Label>
            <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
              onClick={() => setTranscript(SAMPLE_CHAT)}>
              <Wand2 className="mr-1 size-3" /> Load sample
            </Button>
          </div>
          <Textarea className="mt-1 min-h-[220px] font-mono text-[11px]" value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={"[10:02, 12/08/2026] Ananya: Hi, looking for a PG near HSR\n[10:31, 12/08/2026] Rahul (Gharpayy): Hi Ananya, this is Rahul from Gharpayy…"} />
          <p className="mt-1 text-[11px] text-muted-foreground">
            WhatsApp exports parse automatically. Timestamps unlock speed and follow-up scoring.
          </p>
        </div>

        <div>
          <Label className="text-xs">
            Next step we committed to {kind === "call" && <span className="text-rose-600">· mandatory</span>}
          </Label>
          <Input className="mt-1" value={committedNextStep} onChange={(e) => setCommittedNextStep(e.target.value)}
            placeholder="I will call at 6 pm with the owner's final number" />
          <Input className="mt-2" value={committedBy} onChange={(e) => setCommittedBy(e.target.value)}
            placeholder="By when — e.g. today 6:00 pm" />
        </div>

        <div className="grid gap-2">
          <Textarea value={wowOverride} onChange={(e) => setWowOverride(e.target.value)} placeholder="Reviewer's wow moment (optional)" className="min-h-[54px] text-xs" />
          <Textarea value={dullOverride} onChange={(e) => setDullOverride(e.target.value)} placeholder="Reviewer's dull moment (optional)" className="min-h-[54px] text-xs" />
          <Textarea value={reviewerNote} onChange={(e) => setReviewerNote(e.target.value)} placeholder="Coaching note to the agent" className="min-h-[70px] text-xs" />
        </div>

        <Button onClick={save} className="w-full"><Save className="mr-1 size-4" /> File L1 review</Button>
      </Card>

      <div>
        {analysis
          ? <L1Scorecard a={analysis} />
          : (
            <Card className="flex h-full min-h-[280px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Paste a conversation on the left. The scorecard, step audit, wow/dull moments and payment
              forecast appear here instantly.
            </Card>
          )}
      </div>
    </div>
  );
}