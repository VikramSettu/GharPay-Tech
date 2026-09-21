import { RoleGate } from "@/components/tower/RoleGate";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTowerAuth } from "@/lib/tower/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LeadQualityTimeline } from "@/components/tower/LeadQualityTimeline";
import {
  ACK_LABEL, APPROVED_LANGUAGE, CORRECTIVE_ACTIONS, CRITICAL_CONDITIONS, EXPLANATION_QUESTIONS,
  STATUS_CLASS, STATUS_LABEL, TAG_GROUPS, TEAM_LABEL, VERIFICATION_LABEL,
  bandFor, bandMeta, criteriaFor, deadlinePresets, fmtTime, totalOf,
  type AckChoice, type VerificationResult,
} from "@/lib/tower/review-os";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/tower/review/$id")({
  component: () => <RoleGate module="review"><ReviewDetail /></RoleGate>,
  head: () => ({
    meta: [
      { title: "Review Detail — Gharpayy Review OS" },
      { name: "description", content: "Score the interaction, record the six-part feedback, assign a correction and verify closure." },
      { property: "og:title", content: "Review Detail — Gharpayy Review OS" },
      { property: "og:description", content: "Scorecard, corrective action and feedback closure for one Gharpayy interaction." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Review = Database["public"]["Tables"]["reviews"]["Row"];

function ReviewDetail() {
  const { id } = useParams({ from: "/tower/review/$id" });
  const auth = useTowerAuth();
  const [r, setR] = useState<Review | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const [whatHappened, setWhatHappened] = useState("");
  const [whatMissed, setWhatMissed] = useState("");
  const [impact, setImpact] = useState("");
  const [correct, setCorrect] = useState("");
  const [action, setAction] = useState("");
  const [deadline, setDeadline] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [criticals, setCriticals] = useState<string[]>([]);

  const [explanation, setExplanation] = useState<Record<string, string>>({});
  const [correctionNote, setCorrectionNote] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reviewerComment, setReviewerComment] = useState("");

  const load = async () => {
    const { data } = await supabase.from("reviews").select("*").eq("id", id).maybeSingle();
    if (!data) return;
    const row = data as Review;
    setR(row);
    setScores((row.scores ?? {}) as Record<string, number>);
    setWhatHappened(row.what_happened ?? "");
    setWhatMissed(row.what_was_missed ?? "");
    setImpact(row.customer_impact ?? "");
    setCorrect(row.correct_approach ?? "");
    setAction(row.corrective_action ?? "");
    setDeadline(row.deadline ?? "");
    setTags(row.tags ?? []);
    setCriticals(row.critical_reasons ?? []);
    setExplanation((row.employee_explanation ?? {}) as Record<string, string>);
    setCorrectionNote(row.correction_note ?? "");
    setEvidence((row.evidence ?? []).join("\n"));
    setReviewerComment(row.reviewer_comment ?? "");
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      setNames(Object.fromEntries((data ?? []).map((p) => [p.user_id, p.full_name ?? "Member"])));
    })();
  }, []);

  if (!r) return <Card className="p-6 text-sm text-muted-foreground">Loading review…</Card>;

  const criteria = criteriaFor(r.kind);
  const total = totalOf(scores, criteria);
  const band = bandMeta(bandFor(total));
  const isReviewer = auth.user?.id === r.reviewer_id || auth.isManager;
  const isReviewee = auth.user?.id === r.reviewee_id;

  const patch = async (payload: Database["public"]["Tables"]["reviews"]["Update"], msg: string) => {
    setSaving(true);
    const { error } = await supabase.from("reviews").update(payload).eq("id", r.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(msg);
    load();
  };

  const saveReview = (send: boolean) => {
    if (send && !action.trim()) { toast.error("No feedback without a corrective action"); return; }
    if (send && !whatHappened.trim()) { toast.error("Record what happened first"); return; }
    patch({
      scores, total_score: total, band: bandFor(total),
      tags, critical_reasons: criticals, critical_error: criticals.length > 0,
      what_happened: whatHappened, what_was_missed: whatMissed, customer_impact: impact,
      correct_approach: correct, corrective_action: action,
      deadline: deadline || null,
      ...(send ? { status: "correction_pending" as const } : {}),
    }, send ? "Feedback sent to employee" : "Review saved");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Link to="/tower/review"><Button variant="outline" size="sm">← Queue</Button></Link>
        <Badge variant="outline">{TEAM_LABEL[r.team]}</Badge>
        <Badge variant="secondary" className="capitalize">{r.kind.replace("_", " ")}</Badge>
        <span className="font-semibold">{names[r.reviewee_id] ?? "Member"}</span>
        <span className="text-xs text-muted-foreground">reviewed by {r.reviewer_id ? names[r.reviewer_id] ?? "Reviewer" : "—"}</span>
        <Badge className={STATUS_CLASS[r.status]}>{STATUS_LABEL[r.status]}</Badge>
        {r.critical_error && <Badge className="bg-red-600 text-white">Critical error</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">{fmtTime(r.occurred_at)}</span>
      </div>

      {r.mandatory_reason && (
        <Card className="p-3 border-red-500/50 text-sm">
          <span className="font-semibold text-red-500">Mandatory 100% review case:</span> {r.mandatory_reason}
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Conversation viewer */}
        <Card className="p-4 space-y-2">
          <div className="font-semibold text-sm">{r.kind === "call" ? "Call Review Player" : "Conversation Viewer"}</div>
          {r.source_ref ? (
            <a href={r.source_ref} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">{r.source_ref}</a>
          ) : <div className="text-xs text-muted-foreground">No source link attached.</div>}
          <pre className="text-xs whitespace-pre-wrap bg-muted rounded p-3 max-h-[320px] overflow-y-auto">
            {r.transcript || "No transcript pasted."}
          </pre>
          <div className="text-[10px] text-muted-foreground">Recordings follow the company consent, privacy and access policy.</div>
        </Card>

        {/* Scorecard */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">Scorecard</div>
            <Badge className={band.className}>{total}/100 · {band.label}</Badge>
          </div>
          <div className="text-[11px] text-muted-foreground">{band.action}</div>
          <div className="space-y-2">
            {criteria.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{c.label}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number" min={0} max={c.max} className="h-7 w-16 text-right"
                      value={scores[c.id] ?? ""}
                      disabled={!isReviewer}
                      onChange={(e) => setScores({ ...scores, [c.id]: Math.max(0, Math.min(c.max, Number(e.target.value))) })}
                    />
                    <span className="text-xs text-muted-foreground">/{c.max}</span>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">{c.checks.join(" · ")}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Critical + tags */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <div className="font-semibold text-sm">Automatic failure conditions</div>
          <div className="text-[11px] text-muted-foreground">Ticking any one flags a Critical Error regardless of the total score.</div>
          <div className="grid sm:grid-cols-2 gap-1">
            {CRITICAL_CONDITIONS.map((c) => (
              <label key={c} className="flex items-start gap-2 text-xs">
                <Checkbox
                  checked={criticals.includes(c)} disabled={!isReviewer}
                  onCheckedChange={(v) => setCriticals(v ? [...criticals, c] : criticals.filter((x) => x !== c))}
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="font-semibold text-sm">Review tags</div>
          {TAG_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="text-[11px] font-medium text-muted-foreground mt-1">{g.group}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {g.tags.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button
                      key={t} type="button" disabled={!isReviewer}
                      onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}
                      className={`text-[10px] px-2 py-0.5 rounded border ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    >{t}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Six-part feedback */}
      <Card className="p-4 space-y-3">
        <div className="font-semibold text-sm">Standard review feedback (6 parts)</div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="1. What happened" value={whatHappened} onChange={setWhatHappened} disabled={!isReviewer} placeholder="State the exact action taken." />
          <Field label="2. What was missed" value={whatMissed} onChange={setWhatMissed} disabled={!isReviewer} placeholder="State the missed opportunity." />
          <Field label="3. Customer impact" value={impact} onChange={setImpact} disabled={!isReviewer} placeholder="How did this affect the customer?" />
          <Field label="4. Correct approach" value={correct} onChange={setCorrect} disabled={!isReviewer} placeholder="What should have happened?" />
        </div>
        <div>
          <Label className="text-xs">5. Corrected response / call action</Label>
          <div className="flex flex-wrap gap-1 my-1">
            {CORRECTIVE_ACTIONS.map((a) => (
              <button key={a} type="button" disabled={!isReviewer} onClick={() => setAction(action ? `${action}; ${a}` : a)}
                className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted">{a}</button>
            ))}
          </div>
          <Textarea rows={2} value={action} disabled={!isReviewer} onChange={(e) => setAction(e.target.value)} placeholder="Exact action to complete." />
        </div>
        <div>
          <Label className="text-xs">6. Completion deadline</Label>
          <div className="flex flex-wrap gap-1 my-1">
            {deadlinePresets().map((d) => (
              <button key={d.label} type="button" disabled={!isReviewer} onClick={() => setDeadline(d.iso)}
                className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted">{d.label}</button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Deadline: {fmtTime(deadline || null)}</div>
        </div>
        <div className="grid md:grid-cols-2 gap-2 text-[11px]">
          <div className="rounded border p-2">
            <div className="font-medium mb-1">Approved reviewer language</div>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">{APPROVED_LANGUAGE.use.map((u) => <li key={u}>{u}</li>)}</ul>
          </div>
          <div className="rounded border p-2 border-red-500/40">
            <div className="font-medium mb-1 text-red-500">Avoid</div>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">{APPROVED_LANGUAGE.avoid.map((u) => <li key={u}>{u}</li>)}</ul>
          </div>
        </div>
        {isReviewer && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={saving} onClick={() => saveReview(false)}>Save draft</Button>
            <Button disabled={saving} onClick={() => saveReview(true)}>Send feedback to employee</Button>
          </div>
        )}
      </Card>

      {/* Employee closure */}
      <Card className="p-4 space-y-3">
        <div className="font-semibold text-sm">Employee feedback closure</div>
        <div className="text-[11px] text-muted-foreground">Feedback cannot be closed by clicking “Seen”. Acknowledge → explain → correct → submit evidence → reviewer verifies.</div>

        <div className="space-y-2">
          <Label className="text-xs">Step 1 · Acknowledge</Label>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(ACK_LABEL) as AckChoice[]).map((a) => (
              <Button key={a} size="sm" variant={r.ack === a ? "default" : "outline"} disabled={!isReviewee || r.status === "closed"}
                onClick={() => patch({ ack: a, ack_at: new Date().toISOString(), status: "acknowledged" }, "Acknowledged")}>
                {ACK_LABEL[a]}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {EXPLANATION_QUESTIONS.map((q) => (
            <div key={q.id}>
              <Label className="text-xs">Step 2 · {q.label}</Label>
              <Textarea rows={2} disabled={!isReviewee || r.status === "closed"} value={explanation[q.id] ?? ""}
                onChange={(e) => setExplanation({ ...explanation, [q.id]: e.target.value })} />
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs">Step 3 · Correction completed</Label>
          <Textarea rows={2} disabled={!isReviewee || r.status === "closed"} value={correctionNote}
            onChange={(e) => setCorrectionNote(e.target.value)} placeholder="What corrective action did you complete, and what did the customer receive?" />
        </div>
        <div>
          <Label className="text-xs">Step 4 · Evidence (one link or note per line)</Label>
          <Textarea rows={3} disabled={!isReviewee || r.status === "closed"} value={evidence}
            onChange={(e) => setEvidence(e.target.value)} placeholder="Message screenshot, call recording, CRM update, quotation, tour confirmation, customer reply" />
        </div>
        {isReviewee && r.status !== "closed" && (
          <Button size="sm" disabled={saving} onClick={() => {
            const ev = evidence.split("\n").map((s) => s.trim()).filter(Boolean);
            if (!correctionNote.trim()) { toast.error("Describe the correction you completed"); return; }
            if (ev.length === 0) { toast.error("No review closure without evidence"); return; }
            patch({
              employee_explanation: explanation, correction_note: correctionNote, evidence: ev,
              submitted_at: new Date().toISOString(), status: "re_review_pending",
            }, "Correction submitted for verification");
          }}>Submit correction</Button>
        )}

        <Separator />
        <div>
          <Label className="text-xs">Step 5 · Reviewer verification</Label>
          <div className="flex flex-wrap gap-2 items-end mt-1">
            <div className="min-w-[220px]">
              <Select disabled={!isReviewer} value={r.verification ?? ""}
                onValueChange={(v) => patch({
                  verification: v as VerificationResult,
                  reviewer_comment: reviewerComment || null,
                  status: v === "closed_correctly" ? "closed" : v === "manager_intervention" ? "escalated" : "correction_pending",
                  closed_at: v === "closed_correctly" ? new Date().toISOString() : null,
                  closed_by: v === "closed_correctly" ? auth.user?.id ?? null : null,
                }, "Verification recorded")}>
                <SelectTrigger><SelectValue placeholder="Select verification result" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(VERIFICATION_LABEL) as VerificationResult[]).map((v) => (
                    <SelectItem key={v} value={v}>{VERIFICATION_LABEL[v]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <Input disabled={!isReviewer} value={reviewerComment} onChange={(e) => setReviewerComment(e.target.value)} placeholder="Manager comment" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Only the reviewer or a manager can mark feedback closed. {r.closed_at && `Closed ${fmtTime(r.closed_at)}.`}</div>
        </div>
      </Card>

      {r.lead_id && (
        <>
          <div className="flex items-center gap-2">
            <Link to="/tower/leads/$id" params={{ id: r.lead_id }}><Button size="sm" variant="outline">Open lead →</Button></Link>
          </div>
          <LeadQualityTimeline leadId={r.lead_id} />
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange, disabled, placeholder }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Textarea rows={3} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
