import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { allMergedProperties360 } from "../registry";
import {
  draftBlockers, draftCompletenessPct, draftStepProgress, pidForDraft, readinessFor,
} from "./build";
import { publishDraft, saveDraft, submitDraft } from "./store";
import { STEPS, type OnboardingDraft, type StepId } from "./types";
import {
  AmenitiesStep, BuildingStep, CommercialsStep, FaqStep, FitStep, IdentityStep,
  LocationStep, MediaStep, PeopleStep, ReviewStep, RoomsStep, RulesStep, type Patch,
} from "./Steps";

export function OnboardingWizard({ draft }: { draft: OnboardingDraft }) {
  const navigate = useNavigate();
  const [d, setD] = useState<OnboardingDraft>(draft);
  const [stepId, setStepId] = useState<StepId>("identity");

  const steps = useMemo(
    () => STEPS.filter((s) => (d.mode === "owner" ? s.owner || s.id === "review" : true)),
    [d.mode],
  );
  const index = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[index];
  const completeness = draftCompletenessPct(d);
  const blockers = draftBlockers(d);
  const progress = useMemo(() => draftStepProgress(d), [d]);
  const stepProg = progress[step?.id ?? "identity"];
  const nextGap = steps
    .map((s) => ({ s, p: progress[s.id] }))
    .find(({ s, p }) => p && p.pct < 100 && s.id !== "review");

  const patch: Patch = (partial) => {
    setD((prev) => {
      const next = { ...prev, ...partial };
      saveDraft(next);
      return next;
    });
  };

  const goto = (id: StepId) => setStepId(id);

  const publish = () => {
    if (blockers.length) {
      toast.error(blockers[0]);
      setStepId("review");
      return;
    }
    const base = pidForDraft(d, 1).slice(0, 8);
    const taken = allMergedProperties360().filter((p) => p.pid.startsWith(base)).length;
    const pid = pidForDraft(d, taken + 1);
    saveDraft({ ...d, status: "published", publishedPid: pid });
    publishDraft(d.id, pid);
    toast.success(`Published as ${pid}`);
    navigate({ to: "/property360/$pid", params: { pid } });
  };

  const submitForReview = () => {
    submitDraft(d.id);
    setD((prev) => ({ ...prev, status: "submitted" }));
    toast.success("Sent to the Gharpayy team for review");
  };

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {d.identity.displayName || "New property onboarding"}
              </h1>
              <Badge variant="outline">{d.mode === "owner" ? "Owner submission" : "Team onboarding"}</Badge>
              <Badge variant="secondary" className="capitalize">{d.status}</Badge>
              <Badge>{readinessFor(completeness)}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything the passport needs, collected once. Progress saves automatically as you type.
            </p>
          </div>
          <div className="min-w-[200px]">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Information collected</span>
              <span className="tabular-nums">{completeness}%</span>
            </div>
            <Progress value={completeness} className="mt-1 h-2" />
          </div>
        </div>
        {nextGap && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs">
            <span className="font-semibold">Fastest way to 100%:</span>
            <span className="text-muted-foreground">
              {nextGap.s.label} — {nextGap.p.missing.slice(0, 3).join(", ")}
              {nextGap.p.missing.length > 3 ? ` +${nextGap.p.missing.length - 3} more` : ""}
            </span>
            <Button type="button" size="sm" variant="secondary" className="h-6 px-2 text-[11px]"
              onClick={() => setStepId(nextGap.s.id)}>
              Jump there
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <nav className="space-y-1 lg:sticky lg:top-4 lg:self-start">
          {steps.map((s, i) => {
            const p = progress[s.id];
            return (
            <button
              key={s.id}
              type="button"
              onClick={() => goto(s.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                s.id === stepId ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <span className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums",
                p && p.pct === 100 ? "border-emerald-500 text-emerald-600" : "border-current",
              )}>
                {p && p.pct === 100 ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="truncate">{s.label}</span>
              {p && s.id !== "review" && (
                <span className={cn(
                  "ml-auto shrink-0 text-[10px] tabular-nums",
                  s.id === stepId ? "text-primary-foreground/80"
                    : p.blocking ? "text-rose-500" : p.pct === 100 ? "text-emerald-600" : "text-muted-foreground",
                )}>
                  {p.blocking ? "required" : `${p.pct}%`}
                </span>
              )}
            </button>
            );
          })}
          <div className="rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground">
            {d.mode === "owner"
              ? "You are filling the owner form. Commercial and internal-only sections are handled by the Gharpayy team."
              : "Team mode shows every section, including role-gated commercials and internal notes."}
          </div>
        </nav>

        <section className="rounded-xl border border-border bg-background p-4 sm:p-5">
          {step && (
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold">{step.label}</h2>
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              </div>
              {stepProg && step.id !== "review" && (
                <div className="min-w-[160px]">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>This section</span><span className="tabular-nums">{stepProg.pct}%</span>
                  </div>
                  <Progress value={stepProg.pct} className="mt-1 h-1.5" />
                  {stepProg.missing.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Still needed: {stepProg.missing.slice(0, 4).join(", ")}
                      {stepProg.missing.length > 4 ? ` +${stepProg.missing.length - 4}` : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {step.id === "identity" && <IdentityStep d={d} patch={patch} />}
          {step.id === "location" && <LocationStep d={d} patch={patch} />}
          {step.id === "building" && <BuildingStep d={d} patch={patch} />}
          {step.id === "rooms" && <RoomsStep d={d} patch={patch} />}
          {step.id === "amenities" && <AmenitiesStep d={d} patch={patch} />}
          {step.id === "rules" && <RulesStep d={d} patch={patch} />}
          {step.id === "commercials" && <CommercialsStep d={d} patch={patch} />}
          {step.id === "people" && <PeopleStep d={d} patch={patch} />}
          {step.id === "media" && <MediaStep d={d} patch={patch} />}
          {step.id === "fit" && <FitStep d={d} patch={patch} />}
          {step.id === "faq" && <FaqStep d={d} patch={patch} />}
          {step.id === "review" && <ReviewStep d={d} />}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={index === 0}
              onClick={() => goto(steps[Math.max(0, index - 1)].id)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/property360">Save & exit</Link>
              </Button>
              {d.mode === "owner" && step.id === "review" && (
                <Button type="button" size="sm" variant="outline" onClick={submitForReview}>
                  <Send className="mr-1 h-4 w-4" /> Send to Gharpayy team
                </Button>
              )}
              {step.id === "review" ? (
                <Button type="button" size="sm" onClick={publish} disabled={blockers.length > 0}>
                  <Sparkles className="mr-1 h-4 w-4" /> Publish passport
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={() => goto(steps[Math.min(steps.length - 1, index + 1)].id)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
