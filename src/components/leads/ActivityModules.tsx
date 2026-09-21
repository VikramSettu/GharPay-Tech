import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { useCRM10x } from "@/lib/crm10x/store";
import { applyLabel } from "@/lib/labels/store";
import { CORE_LABELS } from "@/lib/labels/catalog";
import { promiseClose } from "@/lib/commitments/store";
import { CLOSE_WINDOWS, type CloseWindowId } from "@/lib/commitments/windows";
import { callGateStatus, type CallNumber, type GateId } from "@/lib/journey-gates";
import { applyOverride, useJourneyOverrides } from "@/myt/lib/journey-store";
import { objectionsFor, noAnswerKit, objectionLogLine, moveFor, type ObjectionPlay } from "@/myt/lib/objections2";
import { whatsappLink } from "@/myt/lib/messaging-utils";
import type { Lead } from "@/lib/types";
import type { CallOutcome, LangPref, ObjectionCode } from "@/lib/crm10x/types";
import type { CallStage, Lead as MytLead } from "@/myt/lib/types";
import {
  Flame, MessageCircle, PhoneCall, Tag, Target, Handshake, ExternalLink, Copy,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Every module of the OS, wired into one activity log:
 * S-gates · call intelligence · WhatsApp / no-answer kit · Objection Handling 2 ·
 * close commitment · Control Tower labels.
 *
 * The hook returns the UI plus one `apply()` that writes every module's record
 * and hands back human lines for the activity trail.
 */

/** Bridge the CRM lead into the myt shape the talk-track / objection engine reads. */
function toMyt(lead: Lead): MytLead {
  const t = lead.tags.map((x) => x.toLowerCase()).join(" ");
  const inBangalore = /out of bangalore|outstation|not in bangalore/.test(t)
    ? "Out of Bangalore"
    : /bangalore|blr|in city/.test(t)
      ? "In Bangalore"
      : "";
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    area: lead.preferredArea,
    discovery: {
      inBangalore,
      areas: lead.preferredArea,
      budget: lead.budget ? String(lead.budget) : "",
      moveDate: lead.moveInDate,
    },
  } as unknown as MytLead;
}

const OBJECTION_CODES: { value: ObjectionCode; label: string }[] = [
  { value: "price-too-high", label: "Price too high" },
  { value: "location-not-suitable", label: "Location not suitable" },
  { value: "room-too-small", label: "Room too small" },
  { value: "not-ready-yet", label: "Not ready yet" },
  { value: "comparing-other-pgs", label: "Comparing other PGs" },
  { value: "needs-family-approval", label: "Needs family approval" },
  { value: "food-not-available", label: "Food not available" },
  { value: "no-ac", label: "No AC" },
  { value: "safety-concern", label: "Safety concern" },
  { value: "no-response-to-offer", label: "No response to offer" },
  { value: "none", label: "No objection" },
];

function guessCode(cue: string): ObjectionCode {
  const c = cue.toLowerCase();
  if (/price|costly|expensive|budget/.test(c)) return "price-too-high";
  if (/far|location|commute|distance/.test(c)) return "location-not-suitable";
  if (/small|room size/.test(c)) return "room-too-small";
  if (/parent|family|hr|approval/.test(c)) return "needs-family-approval";
  if (/compar|other pg|elsewhere|booked/.test(c)) return "comparing-other-pgs";
  if (/food|mess|tiffin/.test(c)) return "food-not-available";
  if (/ac\b/.test(c)) return "no-ac";
  if (/safe|security/.test(c)) return "safety-concern";
  if (/later|not ready|next month|think/.test(c)) return "not-ready-yet";
  return "none";
}

export function useActivityModules(lead: Lead, call: CallNumber) {
  const activities = useApp((s) => s.activities);
  const tours = useApp((s) => s.tours);
  const sendMessage = useApp((s) => s.sendMessage);

  const logCallRec = useCRM10x((s) => s.logCall);
  const logObjection = useCRM10x((s) => s.logObjection);
  const logMessageSend = useCRM10x((s) => s.logMessageSend);
  const allCalls = useCRM10x((s) => s.calls);

  const stepOv = useJourneyOverrides((s) => s.steps[lead.id]);
  const toggleStep = useJourneyOverrides((s) => s.toggleStep);

  const mytLead = useMemo(() => toMyt(lead), [lead]);
  const stage = call as CallStage;

  const gateStatus = useMemo(
    () => callGateStatus(call, lead, activities, tours, (id: GateId, derived) => applyOverride(derived, stepOv?.[id])),
    [call, lead, activities, tours, stepOv],
  );

  const attempts = useMemo(() => allCalls.filter((c) => c.leadId === lead.id).length, [allCalls, lead.id]);

  // --- call intelligence
  const [outcome, setOutcome] = useState<CallOutcome>("answered");
  const [durationSec, setDurationSec] = useState(120);
  const [language, setLanguage] = useState<LangPref | "">("");
  const [bestCallTime, setBestCallTime] = useState("");

  // --- whatsapp
  const kit = useMemo(() => noAnswerKit(mytLead, stage), [mytLead, stage]);
  const [waText, setWaText] = useState<string>(kit.message);
  const [waSent, setWaSent] = useState(false);

  // --- objection handling 2
  const plays = useMemo(() => objectionsFor(stage, kit.path), [stage, kit.path]);
  const [playId, setPlayId] = useState<string>("");
  const play: ObjectionPlay | undefined = plays.find((p) => p.cue === playId);
  const [code, setCode] = useState<ObjectionCode>("none");
  const [leadWords, setLeadWords] = useState("");
  const [resolution, setResolution] = useState<"yes" | "partially" | "no">("partially");

  // --- close commitment
  const [windowId, setWindowId] = useState<CloseWindowId | "">("");
  const [confidence, setConfidence] = useState(80);

  // --- control tower label
  const [labelId, setLabelId] = useState("");

  const pickPlay = (p: ObjectionPlay) => {
    setPlayId(p.cue);
    setCode(guessCode(p.cue));
  };

  const apply = (): string[] => {
    const out: string[] = [];
    const by = lead.assignedTcmId || "me";

    // 1 · call intelligence
    logCallRec({
      leadId: lead.id,
      attemptNumber: attempts + 1,
      durationSec,
      outcome,
      language: language || undefined,
      bestCallTime: bestCallTime || undefined,
      notes: leadWords,
      loggedBy: by,
    });
    out.push(
      `Call #${attempts + 1} · ${outcome.replace("-", " ")} · ${Math.round(durationSec / 60)}m`
      + `${language ? ` · ${language}` : ""}${bestCallTime ? ` · best time ${bestCallTime}` : ""}`,
    );

    // 2 · whatsapp send
    if (waSent && waText.trim()) {
      logMessageSend({ leadId: lead.id, stage: `C${call}`, language: language || "english", loggedBy: by, notes: waText.trim() });
      sendMessage(lead.id, `[C${call}-WA] ${waText.trim().split("\n")[0]}`);
      out.push(`WhatsApp sent (C${call} kit)`);
    }

    // 3 · objection
    if (play || code !== "none") {
      logObjection({
        leadId: lead.id,
        loggedBy: by,
        context: outcome === "answered" ? "call" : "whatsapp",
        code,
        leadWords: leadWords.trim(),
        handling: play ? objectionLogLine(play, kit.path) : "",
        resolution,
      });
      out.push(`Objection: ${play?.cue ?? code} → ${resolution}${play ? ` · move: ${moveFor(play, kit.path)}` : ""}`);
    }

    // 4 · close commitment
    if (windowId) {
      const w = CLOSE_WINDOWS.find((x) => x.id === windowId);
      promiseClose({
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        windowId: windowId as CloseWindowId,
        blocker: play?.cue ?? "",
        confidence,
        note: `Promised on C${call}`,
        by,
      });
      out.push(`Close promise: ${w?.short ?? windowId} · ${confidence}% confidence`);
    }

    // 5 · control tower label
    if (labelId) {
      const def = CORE_LABELS.find((l) => l.id === labelId);
      applyLabel({ leadId: lead.id, leadName: lead.name, leadPhone: lead.phone, labelId, note: `From C${call} activity`, appliedBy: by });
      out.push(`Label: ${def?.short ?? labelId}`);
    }

    // 6 · gates cleared this session
    if (gateStatus.total > 0) {
      out.push(`Gates ${gateStatus.cleared}/${gateStatus.total} cleared${gateStatus.open.length ? ` · open: ${gateStatus.open.map((g) => g.code).join(", ")}` : ""}`);
    }

    return out;
  };

  const node = (
    <div className="space-y-3">
      {/* Gates */}
      {gateStatus.gates.length > 0 && (
        <Block icon={<Target className="h-3 w-3" />} title={`Journey gates · ${gateStatus.cleared}/${gateStatus.total}`}>
          <div className="flex flex-wrap gap-1">
            {gateStatus.gates.map((g) => {
              const done = gateStatus.isDone(g);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleStep(lead.id, g.id as never, gateStatus.derived[g.id])}
                  title={g.why}
                  className={cn(
                    "rounded border px-1.5 py-[3px] text-[10px] font-semibold uppercase transition-colors",
                    done
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  {done ? "✓ " : ""}{g.code}
                </button>
              );
            })}
          </div>
        </Block>
      )}

      {/* Call intelligence */}
      <Block icon={<PhoneCall className="h-3 w-3" />} title={`Call intelligence · attempt #${attempts + 1}`}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Outcome">
            <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["answered", "not-answered", "busy", "switched-off", "wrong-number", "callback-requested"].map((o) => (
                  <SelectItem key={o} value={o} className="text-xs capitalize">{o.replace("-", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Duration (sec)">
            <Input type="number" className="h-8 text-xs" value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} />
          </Field>
          <Field label="Language">
            <Select value={language} onValueChange={(v) => setLanguage(v as LangPref)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {["english", "hindi", "kannada", "other"].map((l) => (
                  <SelectItem key={l} value={l} className="text-xs capitalize">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Best time to call">
            <Input className="h-8 text-xs" placeholder="after 7 PM" value={bestCallTime} onChange={(e) => setBestCallTime(e.target.value)} />
          </Field>
        </div>
      </Block>

      {/* WhatsApp kit */}
      <Block icon={<MessageCircle className="h-3 w-3" />} title={`WhatsApp · C${call} ${outcome === "answered" ? "recap" : "no-answer"} kit`}>
        <Textarea rows={4} value={waText} onChange={(e) => setWaText(e.target.value)} className="resize-none text-xs" />
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Button
            type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
            onClick={() => { window.open(whatsappLink(lead.phone, waText), "_blank"); setWaSent(true); }}
          >
            <ExternalLink className="h-3 w-3" /> Open WhatsApp
          </Button>
          <Button
            type="button" size="sm" variant="ghost" className="h-7 gap-1 text-[11px]"
            onClick={() => { navigator.clipboard?.writeText(waText); toast.success("Message copied"); }}
          >
            <Copy className="h-3 w-3" /> Copy
          </Button>
          <button
            type="button"
            onClick={() => setWaSent((v) => !v)}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] font-semibold",
              waSent ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
            )}
          >
            {waSent ? "✓ logged as sent" : "log as sent"}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Reply menu: {kit.play.replies.join(" · ")} — {kit.play.thenDo} Retry: {kit.play.retry}
        </p>
      </Block>

      {/* Objection handling 2 */}
      <Block icon={<Flame className="h-3 w-3 text-warning" />} title={`Objection handling 2 · C${call}`}>
        <div className="flex flex-wrap gap-1">
          {plays.map((p) => (
            <button
              key={p.cue}
              type="button"
              onClick={() => pickPlay(p)}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] text-left transition-colors",
                playId === p.cue ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/30",
              )}
            >
              {p.cue}
            </button>
          ))}
        </div>
        {play && (
          <div className="mt-1.5 space-y-1 rounded-md border border-border bg-muted/30 p-2 text-[11px]">
            <div><span className="font-semibold">Hope:</span> {play.hope}</div>
            <div><span className="font-semibold">Know:</span> {play.know}</div>
            <div><span className="font-semibold">Solve:</span> {play.solve.join(" · ")}</div>
            <div><span className="font-semibold">Move:</span> {moveFor(play, kit.path)}</div>
          </div>
        )}
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <Field label="Objection code">
            <Select value={code} onValueChange={(v) => setCode(v as ObjectionCode)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OBJECTION_CODES.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Resolved?">
            <Select value={resolution} onValueChange={(v) => setResolution(v as "yes" | "partially" | "no")}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes" className="text-xs">Yes — cleared</SelectItem>
                <SelectItem value="partially" className="text-xs">Partially</SelectItem>
                <SelectItem value="no" className="text-xs">No — still blocking</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Textarea
          rows={2}
          value={leadWords}
          onChange={(e) => setLeadWords(e.target.value)}
          placeholder="Their exact words — “₹12k is too much for triple sharing”"
          className="mt-1.5 resize-none text-xs"
        />
      </Block>

      {/* Close commitment */}
      <Block icon={<Handshake className="h-3 w-3" />} title="Close commitment">
        <div className="grid grid-cols-2 gap-2">
          <Field label="I will close this in">
            <Select value={windowId} onValueChange={(v) => setWindowId(v as CloseWindowId)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No promise" /></SelectTrigger>
              <SelectContent>
                {CLOSE_WINDOWS.filter((w) => w.id !== "custom").map((w) => (
                  <SelectItem key={w.id} value={w.id} className="text-xs">{w.short}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={`Confidence · ${confidence}%`}>
            <Input type="range" min={10} max={100} step={5} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="h-8" />
          </Field>
        </div>
      </Block>

      {/* Control Tower label */}
      <Block icon={<Tag className="h-3 w-3" />} title="Control Tower label (optional)">
        <div className="flex flex-wrap gap-1">
          {CORE_LABELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLabelId(labelId === l.id ? "" : l.id)}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] transition-colors",
                labelId === l.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/30",
              )}
            >
              {l.short}
            </button>
          ))}
        </div>
      </Block>
    </div>
  );

  return { node, apply, gateStatus, attempts };
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
