import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CheckCircle2, Eye, HandMetal, Save, ShieldQuestion } from "lucide-react";
import { CALL_STEPS, CHAT_STEPS, PHASE_LABEL } from "@/lib/l1/playbook";
import {
  analyzeManual, DISPOSITIONS, EXTRA_VALUE_OPTIONS, HESITATION_OPTIONS,
  emptyManualInput, type Disposition, type ManualInput,
} from "@/lib/l1/manual";
import { addMark } from "@/lib/l1/daily";
import { newL1Id, saveL1Review } from "@/lib/l1/store";
import type { L1Kind, PaymentBlocker } from "@/lib/l1/types";
import { L1Scorecard } from "./L1Scorecard";
import { ZONES } from "./L1Composer";

const STAGES = ["New lead", "Qualified", "Tour scheduled", "Toured", "Negotiating", "Payment pending", "Lost"];

const BLOCKERS: { value: PaymentBlocker; label: string }[] = [
  { value: "no-ask", label: "We never asked for the booking" },
  { value: "price-high", label: "Price feels high" },
  { value: "family-approval", label: "Needs family approval" },
  { value: "comparing", label: "Comparing other options" },
  { value: "timing", label: "Move-in date not fixed" },
  { value: "location", label: "Location does not work" },
  { value: "inventory", label: "We had no matching room" },
  { value: "trust", label: "Trust / proof missing" },
  { value: "unresponsive", label: "Customer has gone quiet" },
];

/**
 * Manual L1 review — no transcript, no AI. The reviewer reads the chat inside
 * WhatsApp and answers the same questions the engine would, so a human review
 * scores on exactly the same scale as an automatic one.
 */
export function L1ManualReview({ kind }: { kind: L1Kind }) {
  const [zone, setZone] = useState(ZONES[0]);
  const [stage, setStage] = useState(STAGES[0]);
  const [agent, setAgent] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [note, setNote] = useState("");
  const [input, setInput] = useState<ManualInput>(() => emptyManualInput(kind));

  const playbook = kind === "call" ? CALL_STEPS : CHAT_STEPS;
  const set = <K extends keyof ManualInput>(k: K, v: ManualInput[K]) => setInput((p) => ({ ...p, [k]: v }));
  const toggleIn = (k: "stepsDone" | "extraValue" | "hesitation", v: string) =>
    setInput((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  const analysis = useMemo(() => analyzeManual({ ...input, kind }), [input, kind]);
  const disp = DISPOSITIONS.find((d) => d.id === input.disposition)!;

  const save = () => {
    if (!agent.trim()) { toast.error("Who is being reviewed? Enter the agent name."); return; }
    if (!reviewer.trim()) { toast.error("Enter your name as reviewer — every mark needs an author."); return; }
    const id = newL1Id();
    saveL1Review({
      id, createdAt: new Date().toISOString(), kind, mode: "manual", zone, agent, reviewer,
      leadName, leadPhone, stage,
      transcript: "(No transcript — reviewed by reading the chat directly in WhatsApp.)",
      reviewerNote: note, wowOverride: input.wowQuote, dullOverride: input.dullQuote,
      committedNextStep: input.nextStepQuote, committedBy: agent, analysis,
    });
    addMark({
      reviewer, agent, zone, leadName, leadPhone,
      disposition: input.disposition,
      evidence: note || input.wowQuote || input.dullQuote,
      reviewId: id,
    });
    toast.success(`Manual review filed — ${disp.label}`, {
      description: `${agent} · score ${analysis.total}/100 · it also counts toward today's 100.`,
    });
    setInput(emptyManualInput(kind));
    setNote(""); setLeadName(""); setLeadPhone("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_1fr]">
      <Card className="space-y-4 p-4">
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Eye className="h-3.5 w-3.5" /> Manual mode — you are the engine
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Open the conversation in WhatsApp on your phone or WhatsApp Web, read it top to bottom, then
            answer below. Nothing is pasted, nothing is sent to AI, and the score comes out on the same
            scale as an automatic review so the two are directly comparable.
          </p>
        </div>

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
          <div><Label className="text-xs">Reviewer (you)</Label><Input className="mt-1" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Control Tower" /></div>
          <div><Label className="text-xs">Customer</Label><Input className="mt-1" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Ananya" /></div>
          <div><Label className="text-xs">Phone</Label><Input className="mt-1" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="+91…" /></div>
        </div>

        {/* 1 — the disposition */}
        <Block n={1} title="Mark the chat" hint="This is the one mark that counts toward the daily 100.">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {DISPOSITIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => set("disposition", d.id as Disposition)}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left text-[11px] transition",
                  input.disposition === d.id ? d.className : "border-border hover:bg-muted",
                )}
              >
                <span className="block font-semibold">{d.label}</span>
                <span className="opacity-75">{d.meaning}</span>
              </button>
            ))}
          </div>
          <DispositionManual id={input.disposition} />
        </Block>

        {/* 2 — steps */}
        <Block n={2} title="Which steps can you actually see in the chat?" hint="Tick only what you can point to. No evidence, no tick.">
          <div className="space-y-1">
            {playbook.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleIn("stepsDone", s.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] transition",
                  input.stepsDone.includes(s.id) ? "border-emerald-500/40 bg-emerald-500/10" : "border-border hover:bg-muted",
                )}
              >
                <CheckCircle2 className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", input.stepsDone.includes(s.id) ? "text-emerald-600" : "text-muted-foreground/40")} />
                <span>
                  <span className="font-medium">{s.label}</span>
                  <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[9px]">{PHASE_LABEL[s.phase] ?? s.phase}</Badge>
                  <span className="block text-muted-foreground">{s.why}</span>
                </span>
              </button>
            ))}
          </div>
        </Block>

        {/* 3 — speed and follow-up, read off WhatsApp timestamps */}
        <Block n={3} title="Read the timestamps" hint="WhatsApp shows the time on every bubble — use it, do not estimate.">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField label="Minutes to our first reply" value={input.firstResponseMin} onChange={(v) => set("firstResponseMin", v)} placeholder="e.g. 4" />
            <NumField label="Longest silence from us (min)" value={input.worstGapMin} onChange={(v) => set("worstGapMin", v)} placeholder="e.g. 180" />
            <NumField label="Follow-ups we started" value={input.agentFollowUps} onChange={(v) => set("agentFollowUps", v ?? 0)} placeholder="0" />
            <NumField label="Customer messages we never answered" value={input.unansweredCustomerMsgs} onChange={(v) => set("unansweredCustomerMsgs", v ?? 0)} placeholder="0" />
            <NumField label="Questions we asked" value={input.questionsAsked} onChange={(v) => set("questionsAsked", v ?? 0)} placeholder="0" />
            <NumField label="…of those, answered by the customer" value={input.questionsAnswered} onChange={(v) => set("questionsAnswered", v ?? 0)} placeholder="0" />
          </div>
          <p className="mt-2 rounded bg-muted p-2 text-[10px] text-muted-foreground">
            <span className="font-semibold">Why this matters: </span>
            speed is the only variable we fully control. If our first reply is under five minutes, everything
            downstream converts better. If it is over an hour, the customer has already messaged someone else.
          </p>
        </Block>

        {/* 4 — human or paste */}
        <Block n={4} title="Human or copy-paste?" hint="Judge the writing, not the person.">
          <div className="flex gap-1.5">
            {(["human", "assisted", "ai"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => set("authorship", a)}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-1.5 text-[11px] capitalize transition",
                  input.authorship === a ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                )}
              >
                {a === "human" ? "Written by a person" : a === "assisted" ? "Partly templated" : "Pure copy-paste"}
              </button>
            ))}
          </div>
        </Block>

        {/* 5 — extra 10% */}
        <Block n={5} title="The extra 10%" hint="What did we give that nobody asked for?">
          <ChipGroup options={EXTRA_VALUE_OPTIONS} selected={input.extraValue} onToggle={(v) => toggleIn("extraValue", v)} />
        </Block>

        {/* 6 — moments */}
        <Block n={6} title="Best and worst moment" hint="Type the actual sentence from the chat, not a summary.">
          <Textarea className="text-xs" placeholder="Best line we sent…" value={input.wowQuote} onChange={(e) => set("wowQuote", e.target.value)} />
          <Textarea className="mt-2 text-xs" placeholder="Weakest line we sent…" value={input.dullQuote} onChange={(e) => set("dullQuote", e.target.value)} />
        </Block>

        {/* 7 — money */}
        <Block n={7} title="Why has this customer not paid?" hint="Pick the true blocker, not the polite one.">
          <div className="flex items-center gap-2 rounded-lg border p-2">
            <Switch checked={input.paid} onCheckedChange={(v) => set("paid", v)} id="paid" />
            <Label htmlFor="paid" className="text-xs">They already paid</Label>
          </div>
          {!input.paid && (
            <>
              <Select value={input.blocker} onValueChange={(v) => set("blocker", v as PaymentBlocker)}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>{BLOCKERS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="mt-2 text-[11px] font-medium">Hesitation signals you saw</p>
              <ChipGroup options={HESITATION_OPTIONS} selected={input.hesitation} onToggle={(v) => toggleIn("hesitation", v)} />
            </>
          )}
          <div className="mt-3 flex items-center gap-2 rounded-lg border p-2">
            <Switch checked={input.nextStepLocked} onCheckedChange={(v) => set("nextStepLocked", v)} id="locked" />
            <Label htmlFor="locked" className="text-xs">A dated next step is locked with the customer</Label>
          </div>
          <Textarea className="mt-2 text-xs" placeholder="Quote the next step we committed to…" value={input.nextStepQuote} onChange={(e) => set("nextStepQuote", e.target.value)} />
        </Block>

        <div>
          <Label className="text-xs">Reviewer note — what the owner must read</Label>
          <Textarea className="mt-1 text-xs" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Be specific. 'Slow' helps nobody. 'First reply after 3h 20m on a same-week move-in' is actionable." />
        </div>

        <Button className="w-full" onClick={save}>
          <Save className="mr-1.5 h-4 w-4" /> File manual review &amp; count it toward today's 100
        </Button>
      </Card>

      <div className="space-y-3">
        <Card className="flex items-start gap-2 border-primary/30 p-3 text-[11px] text-muted-foreground">
          <HandMetal className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            This scorecard updates live as you tick. Nothing is saved until you file it, so you can read the
            chat and the score side by side and correct yourself before it becomes someone's record.
          </span>
        </Card>
        <L1Scorecard a={analysis} />
      </div>
    </div>
  );
}

function DispositionManual({ id }: { id: Disposition }) {
  const d = DISPOSITIONS.find((x) => x.id === id)!;
  return (
    <Accordion type="single" collapsible className="mt-2 rounded-lg border px-2">
      <AccordionItem value="m" className="border-b-0">
        <AccordionTrigger className="py-2 text-[11px] font-semibold hover:no-underline">
          <span className="flex items-center gap-1.5"><ShieldQuestion className="h-3 w-3" /> How to use "{d.label}" correctly</span>
        </AccordionTrigger>
        <AccordionContent className="space-y-2 pb-3 text-[11px] leading-relaxed text-muted-foreground">
          <p><span className="font-semibold text-foreground">Why it exists: </span>{d.why}</p>
          <div>
            <p className="font-semibold text-foreground">How to decide</p>
            <ol className="list-decimal pl-4">{d.howToDecide.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
          <div>
            <p className="font-semibold text-foreground">What not to do</p>
            <ul className="list-disc pl-4">{d.whatNotToDo.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">What can go wrong</p>
            <ul className="list-disc pl-4">{d.problems.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">If / else</p>
            <ul className="space-y-1">
              {d.branches.map((b) => (
                <li key={b.condition} className="rounded border p-1.5">
                  <span className="font-semibold">IF </span>{b.condition}<span className="font-semibold"> → THEN </span>{b.then}
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded bg-muted p-1.5"><span className="font-semibold text-foreground">Consequence: </span>{d.consequence}</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function Block({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-semibold">
        <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">{n}</span>
        {title}
      </p>
      <p className="mb-2 text-[10px] text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, placeholder }: {
  label: string; value: number | null; onChange: (v: number | null) => void; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-[11px]">{label}</Label>
      <Input
        type="number"
        min={0}
        className="mt-1 h-8 text-xs"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] transition",
            selected.includes(o) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
