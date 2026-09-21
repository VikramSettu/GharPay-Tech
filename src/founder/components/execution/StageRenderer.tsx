import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Check, Lock, Upload, MessageSquare, MapPin, Sunrise, Target, Coffee, PhoneCall, ClipboardList, Flag, Trophy, Sparkles, Clock, Save, Info, X } from "lucide-react";
import { toast } from "sonner";
import type { StageDef, ProofKind } from "@/founder/lib/execution/playbooks";
import { getField, subscribeFields, fieldsVersion } from "@/founder/lib/execution/field-library";
import { FieldRenderer } from "./FieldRenderer";

import { renderTemplate } from "@/founder/lib/execution/wa-format";
import { SelfieCapture } from "@/founder/components/SelfieCapture";
import { useSyncExternalStore } from "react";
import { getOverride } from "@/founder/lib/execution/playbooks";
import { fmtDuration } from "@/founder/lib/execution/insights";
import { getPrevDayRecord } from "@/founder/lib/execution/dyn-store";

interface Props {
  stage: StageDef;
  /** Optional sub-step label like "Task 2 of 3" — replaces global step numbering */
  subLabel?: string;
  isActive: boolean;
  isDone: boolean;
  isLocked: boolean;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  previousValues: Record<string, unknown>;
  startedAt?: number;
  prevSubmitTs?: number;
  submission?: {
    ts?: number;
    values: Record<string, unknown>;
    proofs: Record<string, string | undefined>;
    waMessage?: string;
  };
  draft?: { values: Record<string, unknown>; proofs: Record<string, string | undefined>; updatedAt: number };
  onSubmit: (payload: { values: Record<string, unknown>; proofs: Record<string, string | undefined>; waMessage: string }) => void;
  onDraft?: (payload: { values: Record<string, unknown>; proofs: Record<string, string | undefined> }) => void;
}

const PROOF_LABEL: Record<ProofKind, string> = {
  selfie: "Selfie",
  whatsapp: "WhatsApp",
  crm_ss: "CRM shot",
  geo: "Location",
  file: "Attachment",
};

// Target time to fill any single card (seconds).
const CARD_TARGET_SECS = 60;
const CARD_WARN_SECS = 30;

// Strip leading "N · " numbering from playbook labels
export function prettyStageLabel(label: string): string {
  return label.replace(/^\s*\d+\s*[·.\-]\s*/, "");
}

function stageIcon(stageId: string, label: string) {
  const s = (stageId + " " + label).toLowerCase();
  if (s.includes("login") || s.includes("resume")) return Sunrise;
  if (s.includes("mission")) return Target;
  if (s.includes("break")) return Coffee;
  if (s.includes("call")) return PhoneCall;
  if (s.includes("draft") || s.includes("check")) return ClipboardList;
  if (s.includes("outcome") || s.includes("cycle")) return Flag;
  if (s.includes("impact") || s.includes("eod") || s.includes("logout")) return Trophy;
  return Sparkles;
}

export function StageRenderer(props: Props) {
  const { stage, subLabel, isActive, isDone, isLocked, employeeId, employeeName, employeeRole, previousValues, startedAt, prevSubmitTs, submission, draft, onSubmit, onDraft } = props;
  useSyncExternalStore(subscribeFields, fieldsVersion, () => 0);
  const override = getOverride(employeeId);
  const initialValues = submission?.values ?? draft?.values ?? {};
  const initialProofs = submission?.proofs ?? draft?.proofs ?? {};
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [proofs, setProofs] = useState<Record<string, string | undefined>>(initialProofs);
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  const fields = useMemo(() => stage.fields.map((id) => getField(id)).filter(Boolean) as ReturnType<typeof getField>[], [stage.fields]);
  const label = prettyStageLabel(stage.label);
  const Icon = stageIcon(stage.id, label);

  const requiredSet = new Set(stage.requiredFields || []);
  const wantsWhatsApp = stage.proofs.includes("whatsapp");
  const wantsCrm = stage.proofs.includes("crm_ss");
  const wantsFile = stage.proofs.includes("file");
  const wantsSelfie = stage.proofs.includes("selfie");

  // Two-screenshot rule: for any proof kind (whatsapp / crm_ss) both shots are required.
  const canSubmit =
    fields.every((f) => !requiredSet.has(f!.id) || (values[f!.id] !== undefined && values[f!.id] !== ""))
    && (!wantsSelfie || !!proofs.selfie)
    && (!wantsWhatsApp || (!!proofs.whatsapp && !!proofs.whatsapp2))
    && (!wantsCrm || (!!proofs.crm_ss && !!proofs.crm_ss2))
    && (!wantsFile || !!proofs.file);

  const openStart = isActive ? (prevSubmitTs || startedAt) : undefined;
  const [openedAt] = useState(() => Date.now());
  const elapsedFill = isDone && submission?.ts && prevSubmitTs ? submission.ts - prevSubmitTs : 0;

  // Live per-card timer (60s soft target). Ticks while active + not done.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!isActive || isDone) return;
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [isActive, isDone]);
  const elapsedSecs = isActive && !isDone ? Math.max(0, Math.floor((nowTick - openedAt) / 1000)) : 0;
  const timerTone =
    elapsedSecs >= CARD_TARGET_SECS ? "text-rose-600" :
    elapsedSecs >= CARD_WARN_SECS ? "text-amber-600" :
    "text-muted-foreground";

  // Yesterday's values for this stage, shown via the (i) info popover.
  const [infoOpen, setInfoOpen] = useState(false);
  const yesterdayValues = useMemo(() => {
    if (!isActive || isDone) return null;
    const y = getPrevDayRecord(employeeId);
    const sub = y?.submissions[stage.id];
    return sub ? { values: sub.values as Record<string, unknown>, ts: sub.ts } : null;
  }, [employeeId, stage.id, isActive, isDone]);

  // Debounced draft autosave — hold work if user leaves mid-fill
  const draftTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!isActive || isDone || !onDraft) return;
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      onDraft({ values, proofs });
      setSavedTick((t) => t + 1);
    }, 600);
    return () => { if (draftTimer.current) window.clearTimeout(draftTimer.current); };
  }, [values, proofs, isActive, isDone, onDraft]);

  const doSubmit = () => {
    if (!canSubmit) { toast.error("Complete required fields and both screenshots"); return; }
    const mergedForTemplate: Record<string, unknown> = {
      ...previousValues, ...values,
      name: employeeName, role: employeeRole,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
    const waMessage = stage.waTemplate ? renderTemplate(stage.waTemplate, mergedForTemplate) : "";
    onSubmit({ values, proofs, waMessage });
    toast.success(`${label} · done`, { description: `Took ${fmtDuration(Date.now() - (openStart || openedAt))}` });
  };

  const pickFile = (slot: "whatsapp" | "whatsapp2" | "crm_ss" | "crm_ss2" | "file") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProofs((p) => ({ ...p, [slot]: ev.target?.result as string }));
    reader.readAsDataURL(f);
  };

  const hasDraft = !isDone && !!draft && (Object.keys(draft.values).length + Object.keys(draft.proofs).length > 0);

  const mmss = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className={`relative rounded-xl border transition-all overflow-hidden ${
      isActive ? "bg-card border-primary/30 shadow-sm" :
      isDone ? "bg-emerald-500/[0.03] border-emerald-500/25" :
      "bg-muted/20 border-border/60"
    } ${isLocked ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3 p-4">
        <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 transition-all ${
          isDone ? "bg-emerald-500 text-white"
          : isActive ? "bg-primary text-primary-foreground"
          : isLocked ? "bg-muted text-muted-foreground/50"
          : "bg-muted text-muted-foreground"
        }`}>
          {isDone ? <Check className="h-4 w-4" /> : isLocked ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {subLabel && <span>{subLabel}</span>}
            {stage.time && <span>· {stage.time}</span>}
            {isActive && !isDone && (
              <span className={`inline-flex items-center gap-1 ${timerTone}`}>
                <Clock className="h-3 w-3" /> {mmss(elapsedSecs)} / 1:00
              </span>
            )}
            {isDone && elapsedFill > 0 && (
              <span className="text-emerald-600 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDuration(elapsedFill)}</span>
            )}
            {hasDraft && !isActive && (
              <span className="text-amber-600 inline-flex items-center gap-1"><Save className="h-3 w-3" /> Draft saved</span>
            )}
          </div>
          <h4 className="font-display font-medium text-base leading-tight mt-0.5">{label}</h4>
          {stage.proofs.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {stage.proofs.map((p) => (
                <Badge key={p} variant="outline" className="text-[10px] py-0 font-normal border-border/60">
                  {p === "whatsapp" || p === "crm_ss" ? `${PROOF_LABEL[p]} × 2` : PROOF_LABEL[p]}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {isActive && !isDone && (yesterdayValues || stage.time) && (
          <button
            type="button"
            onClick={() => setInfoOpen((s) => !s)}
            className="h-8 w-8 rounded-md border grid place-items-center hover:bg-secondary shrink-0"
            aria-label="Show hint from yesterday"
            title="Show yesterday's entry"
          >
            <Info className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {isActive && infoOpen && (
        <div className="mx-4 mb-3 p-3 rounded-md border bg-muted/40 relative">
          <button
            type="button"
            onClick={() => setInfoOpen(false)}
            className="absolute right-2 top-2 h-6 w-6 rounded grid place-items-center hover:bg-background"
            aria-label="Close hint"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Yesterday, for reference</div>
          {yesterdayValues && Object.keys(yesterdayValues.values).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(yesterdayValues.values).map(([k, v]) => {
                const f = getField(k);
                return (
                  <div key={k} className="p-1.5 rounded bg-background/60 border border-border/40">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground truncate">{f?.label || k}</div>
                    <div className="truncate">{String(v)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nothing logged yesterday for this step. Aim to finish under 60 seconds.</p>
          )}
        </div>
      )}

      {isActive && (
        <div className="px-4 pb-4 space-y-3">
          {stage.proofs.includes("selfie") && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-background/50">
              {proofs.selfie ? (
                <>
                  <img src={proofs.selfie} className="h-12 w-12 rounded-md object-cover ring-1 ring-border" />
                  <div className="flex-1 text-xs">Selfie captured ✓</div>
                  <Button size="sm" variant="ghost" onClick={() => setSelfieOpen(true)}>Retake</Button>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-md bg-muted grid place-items-center"><Camera className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex-1 text-xs">Quick selfie to confirm you're here</div>
                  <Button size="sm" onClick={() => setSelfieOpen(true)}><Camera className="h-3 w-3 mr-1" /> Capture</Button>
                </>
              )}
            </div>
          )}

          {/* WhatsApp: two screenshots required */}
          {wantsWhatsApp && (
            <div className="p-3 border rounded-lg space-y-2 bg-background/50">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp · upload 2 screenshots
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["whatsapp","whatsapp2"] as const).map((slot, i) => (
                  <div key={slot} className="border rounded-md p-2 bg-background flex flex-col items-center gap-2">
                    {proofs[slot] ? (
                      <img src={proofs[slot]!} className="max-h-32 rounded object-contain" />
                    ) : (
                      <div className="h-16 w-full rounded bg-muted grid place-items-center text-[10px] font-mono text-muted-foreground">Shot {i + 1}</div>
                    )}
                    <label className="w-full">
                      <input type="file" accept="image/*" className="hidden" onChange={pickFile(slot)} />
                      <span className="w-full inline-flex items-center justify-center gap-1 h-8 px-3 rounded-md bg-secondary hover:bg-secondary/80 text-xs cursor-pointer border">
                        <Upload className="h-3 w-3" /> {proofs[slot] ? `Replace ${i + 1}` : `Upload ${i + 1}`}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CRM: two screenshots required */}
          {wantsCrm && (
            <div className="p-3 border rounded-lg space-y-2 bg-background/50">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                <Upload className="h-3.5 w-3.5" />
                CRM · upload 2 screenshots
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["crm_ss","crm_ss2"] as const).map((slot, i) => (
                  <div key={slot} className="border rounded-md p-2 bg-background flex flex-col items-center gap-2">
                    {proofs[slot] ? (
                      <img src={proofs[slot]!} className="max-h-32 rounded object-contain" />
                    ) : (
                      <div className="h-16 w-full rounded bg-muted grid place-items-center text-[10px] font-mono text-muted-foreground">Shot {i + 1}</div>
                    )}
                    <label className="w-full">
                      <input type="file" accept="image/*" className="hidden" onChange={pickFile(slot)} />
                      <span className="w-full inline-flex items-center justify-center gap-1 h-8 px-3 rounded-md bg-secondary hover:bg-secondary/80 text-xs cursor-pointer border">
                        <Upload className="h-3 w-3" /> {proofs[slot] ? `Replace ${i + 1}` : `Upload ${i + 1}`}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wantsFile && (
            <div className="p-3 border rounded-lg space-y-2 bg-background/50">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                <Upload className="h-3.5 w-3.5" /> Attachment
              </div>
              {proofs.file ? <img src={proofs.file} className="max-h-40 rounded object-contain" /> : null}
              <label className="block">
                <input type="file" accept="image/*" className="hidden" onChange={pickFile("file")} />
                <span className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-secondary hover:bg-secondary/80 text-xs cursor-pointer border">
                  <Upload className="h-3 w-3" /> {proofs.file ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          )}

          {stage.proofs.includes("geo") && (
            <div className="flex items-center gap-2 text-xs p-2 border rounded bg-background/50">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Location auto-captured on submit
            </div>
          )}

          {fields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((f) => (
                <FieldRenderer
                  key={f!.id}
                  field={f!}
                  value={values[f!.id]}
                  target={override.targets?.[f!.id] ?? f!.defaultTarget}
                  required={requiredSet.has(f!.id)}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f!.id]: v }))}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[10px] font-mono text-muted-foreground">
              {elapsedSecs >= CARD_TARGET_SECS
                ? <span className="text-rose-600">Over 60s — submit now and keep moving.</span>
                : elapsedSecs >= CARD_WARN_SECS
                  ? <span className="text-amber-600">30s in — wrap this up.</span>
                  : savedTick > 0
                    ? <span className="inline-flex items-center gap-1"><Save className="h-3 w-3" /> Auto-saved</span>
                    : "Aim to finish in 60 seconds."}
            </div>
            <Button size="sm" className="h-9 px-4 text-xs font-medium" disabled={!canSubmit} onClick={doSubmit}>
              Submit & continue →
            </Button>
          </div>
        </div>
      )}

      {isDone && submission && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {(["selfie","whatsapp","whatsapp2","crm_ss","crm_ss2","file"] as const).map((k) => (
              submission.proofs[k] ? <img key={k} src={submission.proofs[k]!} className="h-10 w-10 rounded-md object-cover ring-1 ring-border" /> : null
            ))}
          </div>
        </div>
      )}


      <SelfieCapture
        open={selfieOpen}
        title={label}
        onClose={() => setSelfieOpen(false)}
        onCapture={(data) => {
          setProofs((p) => ({ ...p, selfie: data }));
          setSelfieOpen(false);
        }}
      />
    </div>
  );
}
