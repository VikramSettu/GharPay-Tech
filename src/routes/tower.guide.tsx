import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTowerAuth } from "@/lib/tower/auth";
import { ROLE_LABEL } from "@/lib/tower/access";
import { TEAM_LABEL, BANDS, type ReviewTeam } from "@/lib/tower/review-os";

export const Route = createFileRoute("/tower/guide")({
  component: Guide,
  head: () => ({
    meta: [
      { title: "How to use the Review OS — Gharpayy Control Tower" },
      { name: "description", content: "The daily chat and call review rhythm for Control Tower, Flow Ops, PCM and Closing — from lead edit to closed feedback loop." },
      { property: "og:title", content: "How to use the Gharpayy Review OS" },
      { property: "og:description", content: "Daily rhythm: 3 chats, 2 calls, 6-part feedback, correction within 24h." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STEPS: { time: string; title: string; who: string; body: string; to?: string; cta?: string }[] = [
  {
    time: "Any time",
    title: "Say who you are",
    who: "Everyone",
    body: "There is no password. Click your name in the top-right, pick yourself from the list (or add yourself), and the whole tower switches to your team's view. The choice is remembered on your device.",
  },
  {
    time: "9:30 AM",
    title: "Control Tower clears the board",
    who: "Control Tower",
    body: "Open the overview: unassigned leads, SLA risk and who is at capacity. Assign every waiting lead. Super-hot leads must be assigned before anything else.",
    to: "/tower",
    cta: "Control Tower",
  },
  {
    time: "All day",
    title: "Owners work their leads",
    who: "Flow Ops · PCM · Closing",
    body: "My Leads shows only what is yours. Open a lead to log the scenario, set the next action, and read its quality timeline — every stage change, owner change and review already lands there.",
    to: "/tower/my-leads",
    cta: "My Leads",
  },
  {
    time: "2:00 PM & 6:00 PM",
    title: "Run the daily reviews",
    who: "Control Tower · Managers",
    body: "Target per reviewer per day: 3 chats and 2 calls. Open Review OS → New Review, pick the person and the conversation, score the 100-point card. Any automatic failure condition drops the review to Critical regardless of score.",
    to: "/tower/review",
    cta: "Review OS",
  },
  {
    time: "Same day",
    title: "Write the 6-part feedback",
    who: "Reviewer",
    body: "What happened · what was missed · customer impact · the correct approach · the corrective action · the deadline. No review closes without all six — that is what makes feedback usable instead of a score.",
  },
  {
    time: "Within 24h",
    title: "The person acknowledges and corrects",
    who: "Reviewee",
    body: "My Feedback lists everything open against you. Acknowledge (understood / need clarification / disagree), add your explanation, do the correction on the real lead, attach the evidence, submit.",
    to: "/tower/feedback",
    cta: "My Feedback",
  },
  {
    time: "Within 24h of submission",
    title: "Reviewer verifies and closes",
    who: "Reviewer · Manager",
    body: "Verify the correction: closed correctly, partially corrected, rejected, customer unreachable or manager intervention. Rejected corrections spawn a re-review. Only then is the loop shut.",
  },
  {
    time: "7:00 PM",
    title: "Quality pulse + EOD",
    who: "Managers · Control Tower",
    body: "Quality shows coverage per reviewer, band mix and who is drifting. EOD closes the day with the checklist. Anything still open rolls into tomorrow's first review slot.",
    to: "/tower/quality",
    cta: "Quality",
  },
];

const TEAM_FOCUS: { team: ReviewTeam; focus: string }[] = [
  { team: "control_tower", focus: "Capture accuracy, assignment speed, SLA discipline, duplicate handling." },
  { team: "flow_ops", focus: "First response quality, qualification depth, scenario logging, next action always set." },
  { team: "pcm", focus: "Property matching relevance, tour conversion, objection handling." },
  { team: "closing", focus: "Negotiation, pre-booking hygiene, documentation and follow-through." },
  { team: "cross_functional", focus: "Whole lead journey — handoffs between teams and where the lead lost momentum." },
];

function Guide() {
  const auth = useTowerAuth();

  return (
    <div className="max-w-4xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">How to use the Chat &amp; Call Review OS</h1>
        <p className="text-sm text-muted-foreground">
          One daily loop: lead worked → conversation reviewed → 6-part feedback → correction on the real lead → verified and closed.
          Every team sees the same timeline, so nothing dies in a DM.
        </p>
        {auth.user && (
          <p className="text-sm">
            You are viewing as <span className="font-medium">{auth.user.name}</span>
            {auth.role && <> · {ROLE_LABEL[auth.role]}</>}
            {auth.team && <> · {TEAM_LABEL[auth.team]}</>}. Switch anyone from the top-right button.
          </p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="font-semibold">The daily rhythm</h2>
        <ol className="space-y-2">
          {STEPS.map((s) => (
            <li key={s.title}>
              <Card className="p-3">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground w-32 shrink-0">{s.time}</span>
                  <span className="font-medium text-sm">{s.title}</span>
                  <Badge variant="outline" className="text-[10px]">{s.who}</Badge>
                  {s.to && (
                    <Button asChild size="sm" variant="ghost" className="ml-auto h-7 text-xs">
                      <Link to={s.to}>{s.cta} →</Link>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 pl-0 md:pl-[8.75rem]">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">What each team is reviewed on</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {TEAM_FOCUS.map((t) => (
            <Card key={t.team} className="p-3">
              <div className="text-sm font-medium">{TEAM_LABEL[t.team]}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.focus}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Score bands</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {BANDS.map((b) => (
            <Card key={b.id} className="p-3">
              <div className="text-sm font-medium">{b.label}</div>
              <div className="text-xs text-muted-foreground">{b.min}–{b.max} pts</div>
              <div className="text-xs text-muted-foreground mt-1">{b.action}</div>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          An automatic failure condition (rudeness, false promise, no follow-up, ignoring the lead, wrong information, missing next action…) forces the Critical band no matter what the total score is.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">House rules</h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Review the conversation, never the person. Feedback names the behaviour and the fix.</li>
          <li>No score without the 6-part feedback. No closure without evidence.</li>
          <li>Corrections happen on the actual lead, not in a comment box.</li>
          <li>Reviews are visible to every team — that transparency is the point.</li>
          <li>Missed daily coverage (3 chats + 2 calls) is itself a quality miss, tracked on the Quality page.</li>
        </ul>
        <div className="flex gap-2 flex-wrap pt-1">
          <Button asChild size="sm"><Link to="/tower/review">Start reviewing</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/tower/access">Who sees what</Link></Button>
        </div>
      </section>
    </div>
  );
}
