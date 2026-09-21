import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Building2, ClipboardList, Trash2, UserCheck, Users } from "lucide-react";
import { OnboardingWizard } from "@/property360/onboarding/Wizard";
import { createDraft, deleteDraft, useDrafts } from "@/property360/onboarding/store";
import { draftCompletenessPct } from "@/property360/onboarding/build";
import type { OnboardingMode } from "@/property360/onboarding/types";

type Search = { draft?: string; mode?: OnboardingMode };

function OnboardPage() {
  const { draft: draftId, mode } = Route.useSearch();
  const navigate = useNavigate();
  const drafts = useDrafts();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const start = (m: OnboardingMode) => {
    const created = createDraft(m);
    navigate({ to: "/property360/onboard", search: { draft: created.id, mode: m } });
  };

  if (!mounted) {
    return <p className="py-20 text-center text-sm text-muted-foreground">Loading onboarding…</p>;
  }

  const active = draftId ? drafts.find((d) => d.id === draftId) : undefined;
  if (draftId && active) return <OnboardingWizard draft={active} />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Onboard a property</h1>
        <p className="text-sm text-muted-foreground">
          One collective flow that collects everything a Property 360 passport needs — identity, location,
          floors, rooms, beds, amenities, commercials, people, media and customer fit.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => start("owner")}
          className="rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:shadow-sm"
        >
          <UserCheck className="h-5 w-5 text-primary" />
          <p className="mt-2 font-semibold">Property owner fills it</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Owner-facing form: identity, location, floors, rooms and beds, amenities, food, rules,
            people, media and FAQ. Commercials and internal notes stay with our team.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Ends with “Send to Gharpayy team” for review.</p>
        </button>

        <button
          type="button"
          onClick={() => start("team")}
          className="rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:shadow-sm"
        >
          <Users className="h-5 w-5 text-primary" />
          <p className="mt-2 font-semibold">Our team onboards them</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Full internal flow — every owner section plus role-gated commercials, persona fit,
            internal notes and the publish gates.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Ends with “Publish passport” straight into Property 360.</p>
        </button>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Onboarding in progress</h2>
          <Badge variant="secondary">{drafts.length}</Badge>
        </div>

        {drafts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No onboarding started yet. Pick who is filling the information above.
          </p>
        ) : (
          <div className="space-y-2">
            {drafts.map((d) => {
              const p = draftCompletenessPct(d);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-[180px]">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {d.identity.displayName || "Untitled property"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.location.zone || "Zone pending"} · {d.mode === "owner" ? "Owner submission" : "Team onboarding"} ·
                      updated {new Date(d.updatedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={p} className="h-1.5 w-24" />
                    <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{p}%</span>
                    <Badge variant="outline" className="capitalize">{d.status}</Badge>
                    {d.publishedPid && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/property360/$pid" params={{ pid: d.publishedPid }}>Open passport</Link>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link to="/property360/onboard" search={{ draft: d.id, mode: d.mode }}>
                        {d.status === "published" ? "Edit" : "Continue"}
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete draft"
                      onClick={() => deleteDraft(d.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export const Route = createFileRoute("/property360/onboard")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    draft: typeof search.draft === "string" ? search.draft : undefined,
    mode: search.mode === "owner" || search.mode === "team" ? search.mode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Onboard a Property — Gharpayy Property 360" },
      { name: "description", content: "Collect every detail a property passport needs in one flow: identity, location, floors, rooms, beds, amenities, commercials, people, media and customer fit." },
      { property: "og:title", content: "Onboard a Property — Gharpayy Property 360" },
      { property: "og:description", content: "Owner-filled or team-onboarded — one collective flow that produces a complete, verified property passport." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell><OnboardPage /></AppShell>,
});
