import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Gauge, Trash2, Zap } from "lucide-react";
import { DISPOSITIONS, type Disposition } from "@/lib/l1/manual";
import { DAILY_REVIEW_TARGET, addMark, dayKey, deleteMark, lastDays, progressFor, useDailyMarks } from "@/lib/l1/daily";
import { ZONES } from "./L1Composer";

/**
 * The daily 100 — a two-second marking lane. The reviewer keeps WhatsApp open
 * on one screen and this on the other, and marks a hundred chats without ever
 * opening a form.
 */
export function L1DailyBoard() {
  const marks = useDailyMarks();
  const [reviewer, setReviewer] = useState("");
  const [agent, setAgent] = useState("");
  const [zone, setZone] = useState(ZONES[0]);
  const [leadName, setLeadName] = useState("");
  const [evidence, setEvidence] = useState("");

  const progress = useMemo(() => progressFor(marks), [marks]);
  const week = useMemo(() => lastDays(marks), [marks]);
  const today = marks.filter((m) => m.day === dayKey());

  const mark = (d: Disposition) => {
    if (!reviewer.trim()) { toast.error("Enter your name once — every mark needs an author."); return; }
    if (!leadName.trim() && !agent.trim()) { toast.error("Name the chat: at least the customer or the agent."); return; }
    addMark({ reviewer, agent, zone, leadName, leadPhone: "", disposition: d, evidence });
    toast.success(DISPOSITIONS.find((x) => x.id === d)!.label, {
      description: `${progress.total + 1} of ${DAILY_REVIEW_TARGET} marked today.`,
    });
    setLeadName(""); setEvidence("");
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary/30 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Gauge className="h-4 w-4" /> Today's review goal — {DAILY_REVIEW_TARGET} chats
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {progress.total}
              <span className="text-base font-medium text-muted-foreground"> / {DAILY_REVIEW_TARGET} marked</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {progress.remaining === 0
                ? "Target hit. Every extra review is upside — go deep on the worst ones."
                : `${progress.remaining} left · you need about ${progress.paceNeeded} per hour to finish inside the working day.`}
            </p>
          </div>
          <div className="flex gap-3">
            {DISPOSITIONS.map((d) => (
              <div key={d.id} className="text-center">
                <div className={cn("rounded-lg border px-3 py-1.5 text-lg font-bold tabular-nums", d.className)}>
                  {progress.byDisposition[d.id] ?? 0}
                </div>
                <p className="mt-0.5 max-w-[92px] text-[10px] text-muted-foreground">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
        <Progress value={progress.pct} className="mt-3 h-2" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {week.map((w) => (
            <div key={w.day} className="rounded border px-2 py-1 text-[10px]">
              <span className="text-muted-foreground">{w.day.slice(5)}</span>{" "}
              <span className="font-semibold tabular-nums">{w.total}</span>
              {w.bad > 0 && <span className="ml-1 text-destructive">· {w.bad} bad</span>}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold">Marking lane</p>
          <p className="text-[11px] text-muted-foreground">
            Keep WhatsApp open beside this. Read the last few messages of a chat, name it, hit one of the four
            buttons, move on. A mark takes seconds; the deep review is a separate, optional step.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><Label className="text-xs">Reviewer</Label><Input className="mt-1 h-8 text-xs" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Your name" /></div>
          <div><Label className="text-xs">Agent</Label><Input className="mt-1 h-8 text-xs" value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="Whose chat is it?" /></div>
          <div>
            <Label className="text-xs">Zone</Label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Customer</Label><Input className="mt-1 h-8 text-xs" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Chat name in WhatsApp" /></div>
        </div>
        <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} className="h-8 text-xs"
          placeholder="One evidence line — the thing you actually saw. 'Last customer msg 2 days ago, never answered.'" />
        <div className="grid gap-2 sm:grid-cols-4">
          {DISPOSITIONS.map((d) => (
            <button key={d.id} type="button" onClick={() => mark(d.id)}
              className={cn("rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition hover:opacity-85", d.className)}>
              {d.label}
              <span className="mt-0.5 block text-[10px] font-normal opacity-80">{d.consequence}</span>
            </button>
          ))}
        </div>
        <p className="rounded-lg bg-muted p-2 text-[10px] text-muted-foreground">
          <span className="font-semibold">What not to do: </span>
          do not batch-mark at the end of the day from memory, do not mark a chat you did not open, and never
          use "done" to make the counter move. A false 100 is worse than an honest 60 — it hides live revenue.
        </p>
      </Card>

      {progress.byAgent.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold">Who needs a conversation today</p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Sorted by "very poor" + "not helping" marks. This is a coaching list, not a punishment list.
          </p>
          <div className="space-y-1">
            {progress.byAgent.map((a) => (
              <div key={a.agent} className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
                <span className="font-medium">{a.agent}</span>
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {a.count} reviewed
                  {a.bad > 0 && <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">{a.bad} flagged</Badge>}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <p className="text-sm font-semibold">Marks filed today ({today.length})</p>
        {today.length === 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Zap className="h-3.5 w-3.5" /> Nothing marked yet. The first mark of the day sets the pace for the rest of it.
          </p>
        ) : (
          <div className="mt-2 max-h-[380px] space-y-1 overflow-y-auto">
            {today.map((m) => {
              const d = DISPOSITIONS.find((x) => x.id === m.disposition)!;
              return (
                <div key={m.id} className="flex items-start gap-2 rounded border px-2 py-1.5 text-[11px]">
                  <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold", d.className)}>{d.label}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{m.leadName || "Unnamed chat"}</span>
                    <span className="text-muted-foreground"> · {m.agent || "unassigned"} · {m.zone}</span>
                    {m.evidence && <span className="block text-muted-foreground">{m.evidence}</span>}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <Button variant="ghost" size="sm" className="h-5 w-5 shrink-0 p-0" onClick={() => deleteMark(m.id)} aria-label="Delete mark">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
