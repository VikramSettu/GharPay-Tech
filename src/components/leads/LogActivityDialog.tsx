import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle2, ChevronRight, Quote } from "lucide-react";
import type { Lead, LeadStage } from "@/lib/types";
import type { CallNumber } from "@/lib/journey-gates";
import { gatesForCall } from "@/lib/journey-gates";
import { CallScriptCapture, useScriptProgress } from "./CallScriptCapture";
import { useCallMovement } from "./CallMovement";
import { useActivityModules } from "./ActivityModules";
import {
  ACTIVITY_CATEGORIES, type ActivityType, type NextStepOption, toneClasses,
} from "@/lib/lead-activity-catalog";


const STAGES: LeadStage[] = [
  "new", "contacted", "tour-scheduled", "tour-done", "negotiation", "booked", "dropped",
];

const CALLS: CallNumber[] = [1, 2, 3, 4, 5];
const CALL_TITLES: Record<CallNumber, string> = {
  1: "Basics — is this a real Bangalore lead?",
  2: "Schedule — shortlist and lock the tour",
  3: "Tour — reaction, blocker, quotation",
  4: "Close — objection cleared, token blocked",
  5: "Recall — why it stalled, when we reconnect",
};

/** Which call this lead is standing on, from stage alone. */
function callForStage(stage: LeadStage): CallNumber {
  switch (stage) {
    case "new": return 1;
    case "contacted": return 1;
    case "tour-scheduled": return 2;
    case "tour-done": return 3;
    case "negotiation": return 4;
    case "booked": return 4;
    default: return 5;
  }
}

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function LogActivityDialog({
  lead, open, onOpenChange, onLogged, call,
}: {
  lead: Lead;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onLogged?: () => void;
  /** Which call in the C1–C5 ladder this activity closes out. */
  call?: number;
}) {
  const { logCall, sendMessage, addNote, setLeadStage, setLeadFollowUp } = useApp();

  const [activeCall, setActiveCall] = useState<CallNumber>(1);
  const [categoryKey, setCategoryKey] = useState(ACTIVITY_CATEGORIES[0].key);
  const [type, setType] = useState<ActivityType | null>(null);
  const [nextStep, setNextStep] = useState<NextStepOption | null>(null);
  const [note, setNote] = useState("");
  const [scriptNote, setScriptNote] = useState("");
  const [captures, setCaptures] = useState<string[]>([]);
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [dueAt, setDueAt] = useState("");

  const category = useMemo(
    () => ACTIVITY_CATEGORIES.find((c) => c.key === categoryKey) ?? ACTIVITY_CATEGORIES[0],
    [categoryKey],
  );
  const { captured, total } = useScriptProgress(lead, activeCall);
  const gates = useMemo(() => gatesForCall(activeCall), [activeCall]);
  const movement = useCallMovement(lead, activeCall);
  const modules = useActivityModules(lead, activeCall);


  useEffect(() => {
    if (!open) return;
    setActiveCall((call as CallNumber) ?? callForStage(lead.stage));
    setCategoryKey(ACTIVITY_CATEGORIES[0].key);
    setType(null);
    setNextStep(null);
    setNote("");
    setScriptNote("");
    setCaptures([]);
    setStage(lead.stage);
    setDueAt("");
  }, [open, lead.id, lead.stage, call]);

  const pickType = (t: ActivityType) => {
    setType(t);
    setStage(t.stage ?? lead.stage);
    const first = t.nextSteps[0] ?? null;
    setNextStep(first);
    applyStepDate(first);
  };

  const applyStepDate = (step: NextStepOption | null) => {
    if (!step || step.inHours === 0) {
      setDueAt("");
      return;
    }
    setDueAt(toLocalInput(new Date(Date.now() + step.inHours * 3600_000)));
  };

  const pickStep = (step: NextStepOption) => {
    setNextStep(step);
    applyStepDate(step);
    if (step.stage) setStage(step.stage);
  };

  const save = () => {
    if (!type) {
      toast.error("Pick what happened first");
      return;
    }
    const tag = `[C${activeCall}] `;
    const summary = `${tag}${type.emoji} ${type.label}${note.trim() ? ` — ${note.trim()}` : ""}`;

    if (type.channel === "call") logCall(lead.id);
    if (type.channel === "message") sendMessage(lead.id, summary);
    addNote(lead.id, summary);

    // everything captured on the script this session, in one trail
    if (captures.length) addNote(lead.id, `${tag}Captured — ${captures.join(" · ")}`);
    if (scriptNote.trim()) addNote(lead.id, `${tag}${scriptNote.trim()}`);

    // the movement half — PDF, tour, quotation, token/booking/check-in, revival
    const moved = movement.apply();
    moved.forEach((m) => addNote(lead.id, `${tag}${m}`));

    // every other module — call intelligence, WhatsApp kit, objection 2, commitment, labels, gates
    const modLines = modules.apply();
    modLines.forEach((m) => addNote(lead.id, `${tag}${m}`));

    const bookedByMovement = moved.some((m) => m.toLowerCase().includes("token"));
    const finalStage: LeadStage = bookedByMovement ? "booked" : stage;
    if (!bookedByMovement && stage !== lead.stage) setLeadStage(lead.id, stage);

    if (dueAt) {
      setLeadFollowUp(
        lead.id,
        new Date(dueAt).toISOString(),
        nextStep?.priority ?? "medium",
        nextStep?.label ?? type.label,
      );
    }

    toast.success(`C${activeCall} closed: ${type.label}`, {
      description: [
        moved.length ? moved.join(" · ") : null,
        dueAt ? `Next: ${nextStep?.label ?? "follow-up"} · ${format(new Date(dueAt), "MMM d, p")}` : "No follow-up scheduled",
        `Stage: ${finalStage.replace("-", " ")}`,
      ].filter(Boolean).join(" — "),
    });
    onOpenChange(false);
    onLogged?.();
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            Run the call · {lead.name}
            <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">C{activeCall}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Read the script, capture what they say, pick the outcome — one save writes the notes, stage,
            dossier and the next follow-up.
          </DialogDescription>
        </DialogHeader>

        {/* 1 · which call */}
        <Step n={1} title="Which call is this?">
          <div className="flex flex-wrap gap-1.5">
            {CALLS.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCall(c)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  c === activeCall
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30",
                )}
              >
                C{c}
              </button>
            ))}
            <span className="ml-auto self-center text-[11px] text-muted-foreground">{CALL_TITLES[activeCall]}</span>
          </div>
          {gates.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {gates.map((g) => (
                <span key={g.id} className="rounded border border-border bg-muted/50 px-1.5 py-[2px] text-[9px] font-semibold uppercase text-muted-foreground">
                  {g.code}
                </span>
              ))}
            </div>
          )}
        </Step>

        {/* 2 · script */}
        <Step n={2} title={`Say it like this · ${captured}/${total} captured`}>
          <div className="rounded-lg border border-border bg-muted/20 p-2">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Quote className="h-3 w-3" /> read top to bottom
            </div>
            <CallScriptCapture
              lead={lead}
              call={activeCall}
              me="Gharpayy"
              onCapture={(label, value) =>
                setCaptures((prev) => [...prev.filter((p) => !p.startsWith(`${label}:`)), `${label}: ${value}`])
              }
            />
            <Textarea
              rows={2}
              value={scriptNote}
              onChange={(e) => setScriptNote(e.target.value)}
              placeholder="Extra notes they told you — roommate joining, parents deciding, wants gym nearby…"
              className="mt-2 resize-none text-xs"
            />
          </div>
        </Step>

        {/* 3 · movement */}
        <Step n={3} title={`Move it forward · ${movement.title}`}>
          <div className="rounded-lg border border-border bg-muted/20 p-2">{movement.node}</div>
        </Step>

        {/* 4 · every other module */}
        <Step n={4} title="All modules · gates, call, WhatsApp, objection, commitment, label">
          <div className="rounded-lg border border-border bg-muted/20 p-2">{modules.node}</div>
        </Step>

        {/* 5 · category */}
        <Step n={5} title="Where did it happen?">

          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => { setCategoryKey(c.key); setType(null); setNextStep(null); }}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  c.key === categoryKey
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Step>

        {/* 6 · outcome */}
        <Step n={6} title="What happened?">
          <div className="flex flex-wrap gap-1.5">
            {category.types.map((t) => (
              <button
                key={t.key}
                onClick={() => pickType(t)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  toneClasses(t.tone, type?.key === t.key),
                )}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </Step>

        {/* 7 · next step */}
        {type && (
          <>
            <Step n={7} title="What happens next?">
              <div className="space-y-1.5">
                {type.nextSteps.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => pickStep(s)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                      nextStep?.key === s.key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-foreground/30",
                    )}
                  >
                    {nextStep?.key === s.key
                      ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">{s.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{s.effect}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Step>

            <Step n={8} title="Details">
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={type.hint ?? "Exactly what was said, what was agreed, what blocked progress…"}
                className="resize-none text-sm"
              />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Stage after</Label>
                  <Select value={stage} onValueChange={(v) => setStage(v as LeadStage)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s} className="text-sm capitalize">{s.replace("-", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Follow-up at</Label>
                  <Input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </Step>
          </>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            {type
              ? `C${activeCall} · ${captured}/${total} captured · ${type.label} → ${stage.replace("-", " ")}${dueAt ? ` · follow-up ${format(new Date(dueAt), "MMM d, p")}` : " · no follow-up"}`
              : `C${activeCall} · ${captured}/${total} captured · pick an outcome to finish`}
          </span>
          <Button onClick={save} disabled={!type}>Save C{activeCall} &amp; set next step</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">{n}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}
