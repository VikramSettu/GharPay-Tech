import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { L1Composer } from "@/components/l1/L1Composer";
import { L1ZoneBoard } from "@/components/l1/L1ZoneBoard";
import { L1ManualReview } from "@/components/l1/L1ManualReview";
import { L1DailyBoard } from "@/components/l1/L1DailyBoard";
import { ClientOnly } from "@/components/ClientOnly";
import { HowButton } from "@/components/common/HowButton";

export const Route = createFileRoute("/l1")({
  head: () => ({
    meta: [
      { title: "L1 Review — Chat & Call Audit by Zone | Gharpayy" },
      { name: "description", content: "Audit every chat and call step by step: speed, follow-ups, understanding, human vs AI, the extra 10%, wow and dull moments, and why the customer has not paid." },
      { property: "og:title", content: "L1 Review — Chat & Call Audit by Zone" },
      { property: "og:description", content: "Owner-grade L1 review for every Gharpayy conversation, zone by zone, with a payment forecast against 30 bookings per day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: L1Page,
});

function L1Page() {
  return (
    <AppShell>
      <div className="space-y-4">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">L1 Review</h1>
            <HowButton
              withText
              title="How to run L1 Review"
              why="L1 is where a conversation stops being an opinion and becomes a score. Without it nobody can say why 30 bookings a day did not happen."
              howToExecute={[
                "Review 100 interactions a day: pick the newest first, oldest never.",
                "Score against the step list only — speed, understanding, follow-up, the extra 10%.",
                "Every low score must end in a label on the lead and a close promise or a written reason there is none.",
                "Close the loop the same day: the person who was reviewed must see the mark before the next shift.",
              ]}
              whatNotToDo={[
                "Do not review only bad calls — the wow moments are what the team copies.",
                "Do not score without quoting the line that earned the mark.",
                "Do not let AI-only scores stand on a disputed conversation; re-do it manually.",
              ]}
              problemsThatCanOccur={[
                "Reviews pile up and the feedback arrives too late to change behaviour.",
                "Everyone scores an identical 7 — the scale stops discriminating.",
              ]}
              branches={[
                { condition: "The same failure appears in 3+ reviews for one person", then: "Stop reviewing them and coach the single behaviour instead." },
                { condition: "A zone scores well but does not book", then: "The gap is inventory or pricing, not conversation quality." },
                { condition: "AI and manual scores disagree by 3+", then: "Trust the manual score and note why the AI misread it." },
              ]}
              doneWhen="Today's 100 are marked, every low score has a label on the lead, and each reviewed person has seen their mark."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Every chat and every call, audited against the step list — zone by zone. Was it followed,
            was it fast, did we understand, did we add the extra 10%, and when does the money land?
          </p>
        </header>

        <Tabs defaultValue="daily">
          <TabsList className="flex-wrap">
            <TabsTrigger value="daily">Daily 100</TabsTrigger>
            <TabsTrigger value="manual">Manual review (no AI)</TabsTrigger>
            <TabsTrigger value="board">Zone board</TabsTrigger>
            <TabsTrigger value="chat">Auto review — chat</TabsTrigger>
            <TabsTrigger value="call">Auto review — call</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4 space-y-2">
            <TabHow
              title="Daily 100 — how to work it"
              why="Volume is the whole point: 100 marked interactions a day is what makes the zone numbers real instead of anecdotal."
              howToExecute={[
                "Work top to bottom; do not cherry-pick easy chats.",
                "Mark, quote the line, move on — 90 seconds per interaction is the target.",
                "Label the lead the moment you mark a failure, while the context is fresh.",
              ]}
              whatNotToDo={["Do not batch all labelling for the end — you will forget the detail.", "Do not skip good conversations; they become the training set."]}
              problemsThatCanOccur={["Reviewer fatigue flattens scores after ~40 items — take a break.", "Backlog older than 24h stops changing behaviour."]}
              branches={[{ condition: "You cannot finish 100", then: "Finish the newest 50 and hand the rest over rather than half-marking everything." }]}
              doneWhen="Today's list is empty and every failed mark has a label attached."
            />
            <ClientOnly fallback={<p className="py-10 text-center text-sm text-muted-foreground">Loading today's marks…</p>}>
              <L1DailyBoard />
            </ClientOnly>
          </TabsContent>
          <TabsContent value="manual" className="mt-4 space-y-2">
            <TabHow
              title="Manual review — how to score without AI"
              why="Manual review is the reference standard. When a score is disputed, the human mark decides."
              howToExecute={[
                "Read the whole thread before scoring any step — first-line impressions mislead.",
                "Score each step independently; a great opener does not excuse a missing follow-up.",
                "Write one sentence of evidence per low score, quoting the message.",
              ]}
              whatNotToDo={["Do not score on outcome — a lost lead can still be a well-run conversation.", "Do not soften scores for people you like."]}
              problemsThatCanOccur={["Two reviewers drift apart on the same scale — calibrate weekly on one shared thread."]}
              branches={[{ condition: "The thread is incomplete", then: "Mark it unreviewable rather than guessing what was said on call." }]}
              doneWhen="Each step has a score and every low score carries a quoted line."
            />
            <ClientOnly fallback={<p className="py-10 text-center text-sm text-muted-foreground">Loading manual review…</p>}>
              <L1ManualReview kind="chat" />
            </ClientOnly>
          </TabsContent>
          <TabsContent value="board" className="mt-4 space-y-2">
            <TabHow
              title="Zone board — how to read it"
              why="The board turns individual marks into a zone verdict, which is where staffing and inventory decisions get made."
              howToExecute={[
                "Compare zones on the same date range, never mixed windows.",
                "Read speed and follow-up columns first — they explain most lost bookings.",
                "Take the worst step in the worst zone into tomorrow's huddle as a single instruction.",
              ]}
              whatNotToDo={["Do not act on a zone with fewer than 20 reviews.", "Do not average away a single terrible performer inside a good zone."]}
              problemsThatCanOccur={["Uneven review coverage makes a zone look better than it is."]}
              branches={[{ condition: "A zone has high scores and low bookings", then: "Escalate to supply — the conversations are fine, the inventory is not." }]}
              doneWhen="Every zone has one named improvement owned by one named person."
            />
            <ClientOnly fallback={<p className="py-10 text-center text-sm text-muted-foreground">Loading reviews…</p>}>
              <L1ZoneBoard />
            </ClientOnly>
          </TabsContent>
          <TabsContent value="chat" className="mt-4 space-y-2">
            <TabHow
              title="Auto review — chat"
              why="Auto review gets you coverage fast; it is a first pass, not a verdict."
              howToExecute={["Paste the full chat export including timestamps.", "Sanity-check the speed findings against the actual timestamps.", "Escalate anything scored below 5 to manual review."]}
              whatNotToDo={["Do not share an auto score with the team as final.", "Do not paste partial threads — missing context invents failures."]}
              problemsThatCanOccur={["Hinglish and voice-note references get misread as silence."]}
              branches={[{ condition: "Auto score looks wrong", then: "Re-run it in manual review and keep the manual mark." }]}
              doneWhen="Auto score generated and either accepted or escalated to manual."
            />
            <L1Composer kind="chat" />
          </TabsContent>
          <TabsContent value="call" className="mt-4 space-y-2">
            <TabHow
              title="Auto review — call"
              why="Call transcripts expose whether we actually understood the customer, which chat rarely shows."
              howToExecute={["Paste the transcript with speaker labels.", "Check the understanding and extra-10% findings first.", "Attach the resulting instruction to the lead as a label."]}
              whatNotToDo={["Do not review a call without its transcript.", "Do not score tone from text alone — listen if the mark is harsh."]}
              problemsThatCanOccur={["Poor transcription of names and budgets creates false 'did not confirm' findings."]}
              branches={[{ condition: "Transcript quality is bad", then: "Listen to the recording and score manually." }]}
              doneWhen="The call has a score, a label if needed, and a close promise or a reason there is none."
            />
            <L1Composer kind="call" />
          </TabsContent>
        </Tabs>

      </div>
    </AppShell>
  );
}
/** A one-line "read this before you score" strip above each review surface. */
function TabHow(props: React.ComponentProps<typeof HowButton>) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5">
      <HowButton {...props} withText />
      <p className="text-[11px] text-muted-foreground">{props.title} — open the manual before you start.</p>
    </div>
  );
}
