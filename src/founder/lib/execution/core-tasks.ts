// The daily flow, expressed as tickable phases and steps for each core role.
// Every phase tells the person what they are supposed to do next, and nothing
// can be marked complete without ticking the work inside it.
//
// Operating rhythm (single source of truth for the WhatsApp PHASES thread):
//   10:35 AM  Day Start · Goal      (goal declared + 1:15 PM commitment by 10:36)
//   1:15 PM   Phase 1 Actuals       → Break 1 (1:15–2:00)
//   2:00 PM   Recovery Commit       (commit what lands by 5:00)
//   5:00 PM   Phase 2 Actuals       → Break 2 (5:00–5:20)
//   8:00 PM   Final Impact · Day End

import type { CoreRole } from "@/founder/lib/execution/core-roles";

export type PhaseId = "prep" | "p1" | "p2" | "p3" | "eod";

export interface FlowStep {
  id: string;
  label: string;
  detail?: string;
  evidence?: string;
}

export interface ReportField {
  id: string;
  label: string;
  kind: "number" | "text" | "long";
  placeholder?: string;
  required?: boolean;
}

export interface FlowPhase {
  id: PhaseId;
  name: string;
  codename: string;             // the short name people actually say out loud
  window: string;
  due: string;
  dueMins: number;              // minutes from midnight
  checkpoint?: "p1" | "p2" | "eod";
  brief: string;
  steps: FlowStep[];
  report: ReportField[];        // what must be submitted to close the phase
}

/** Breaks in the rhythm — rendered as marker bubbles in the thread. */
export interface BreakMarker {
  id: string;
  label: string;
  window: string;
  fromMins: number;
  toMins: number;
  after: PhaseId;   // the break follows this phase's checkpoint
  note: string;
}

export const BREAKS: BreakMarker[] = [
  {
    id: "break1", label: "Break 1", window: "1:15 – 2:00 PM",
    fromMins: 13 * 60 + 15, toMins: 14 * 60, after: "p1",
    note: "Phase 1 actuals are filed. Break now — at 2:00 PM you commit what lands by 5:00.",
  },
  {
    id: "break2", label: "Break 2", window: "5:00 – 5:20 PM",
    fromMins: 17 * 60, toMins: 17 * 60 + 20, after: "p2",
    note: "Phase 2 actuals are filed and the 8 PM commitment is locked. Short reset, then final impact.",
  },
];

export function activeBreak(d = new Date()): BreakMarker | undefined {
  const m = d.getHours() * 60 + d.getMinutes();
  return BREAKS.find((b) => m >= b.fromMins && m < b.toMins);
}

const step = (id: string, label: string, detail?: string, evidence?: string): FlowStep =>
  ({ id, label, detail, evidence });

const f = (id: string, label: string, kind: ReportField["kind"], placeholder?: string, required = true): ReportField =>
  ({ id, label, kind, placeholder, required });

export function phasesFor(role: CoreRole): FlowPhase[] {
  const t = role.targets;
  const nums = (k: "p1" | "p2" | "eod") => t.map((x) => `${k === "p1" ? x.p1 : k === "p2" ? x.p2 : x.eod} ${x.label.toLowerCase()}`).join(" + ");
  const actuals = (k: "p1" | "p2" | "eod") =>
    t.map((x) => f(`m_${k}_${x.id}`, `Actual ${x.label.toLowerCase()} (target ${k === "p1" ? x.p1 : k === "p2" ? x.p2 : x.eod})`, "number", "0"));

  return [
    {
      id: "prep",
      name: "10:35 AM · Day Start · Goal",
      codename: "Goal",
      window: "10:35 – 10:50 AM",
      due: "10:50 AM",
      dueMins: 10 * 60 + 50,
      brief: `Before you touch a single lead: lock today's number, know your starting point and read the non-negotiables. Target today is ${nums("eod")}.`,
      steps: [
        step("prep_1", "Clock in at 10:35 and confirm you are available for the full shift", "Any planned absence goes to your manager now, not at 6 PM."),
        step("prep_2", "Open yesterday's carry-forward and pull it into today's list", "Nothing aged should start the day unowned."),
        step("prep_3", `Lock today's committed number: ${nums("eod")}`, "This is the number your EOD is graded against.", "Goal locked in the tracker"),
        step("prep_4", "By 10:36, commit what you will deliver by 1:15 PM", "One number. This is what Phase 1 is graded against.", "Commitment posted"),
        step("prep_5", "Read the non-negotiables for this role out loud once", role.nonNegotiables[0]),
      ],
      report: [
        f("prep_commit_115", "By 1:15 PM I will deliver", "text", "One number — your 10:36 commitment"),
        f("prep_baseline", "Baseline: unread / open items you are starting with", "number", "0"),
        f("prep_carry", "Carry-forward pulled in from yesterday", "text", "e.g. 6 aged leads, 2 pending quotations", false),
        f("prep_risk", "The one thing most likely to stop you today", "text", "Name it now, not at 8 PM"),
      ],
    },
    {
      id: "p1",
      name: "1:15 PM · Phase 1 Actuals",
      codename: "Phase 1",
      window: "10:50 AM – 1:15 PM",
      due: "1:15 PM",
      dueMins: 13 * 60 + 15,
      checkpoint: "p1",
      brief: `By 1:15 PM you must be at ${nums("p1")}. Promised vs delivered vs gap — then Break 1 (1:15–2:00).`,
      steps: [
        ...role.p1Work.map((w, i) => step(`p1_w${i}`, w)),
        step("p1_log", "Log every unit as it happens — never in bulk at the end", "Counters below are the source of truth."),
        step("p1_cp", `Post the 1:15 PM actuals with delivered vs promised (${nums("p1")})`, "Promised, delivered, gap — then go on Break 1.", "Checkpoint update"),
      ],
      report: [
        f("p1_promised", "What I promised at 10:36", "text", "Your own 1:15 PM commitment"),
        ...actuals("p1"),
        f("p1_win", "Biggest win of the block", "text", "One line, with a number"),
        f("p1_block", "What slowed you down", "text", "Blocker + who can unblock it"),
        f("p1_fix", "The gap I am carrying into Break 1", "long", "Be specific and quantified"),
      ],
    },
    {
      id: "p2",
      name: "5:00 PM · Phase 2 Actuals",
      codename: "Phase 2",
      window: "2:00 PM – 5:00 PM",
      due: "5:00 PM",
      dueMins: 17 * 60,
      checkpoint: "p2",
      brief: `Break ended at 2:00 PM — commit what lands by 5:00 and hit ${nums("p2")}. Anything stuck at 1:15 PM must be resolved or escalated in this block.`,
      steps: [
        step("p2_commit", "At 2:00 PM, commit what will land by 5:00 PM", "Recovery commit — one number, posted before you resume."),
        ...role.p2Work.map((w, i) => step(`p2_w${i}`, w)),
        step("p2_esc", "Escalate anything blocked for more than 60 minutes", role.escalations[0]),
        step("p2_cp", `Post the 5:00 PM actuals vs ${nums("p2")} plus the 8 PM commitment`, "Final gap named here — then Break 2 (5:00–5:20).", "Checkpoint update"),
      ],
      report: [
        f("p2_commit_500", "What I committed at 2:00 PM for 5:00 PM", "text", "Your recovery commit"),
        ...actuals("p2"),
        f("p2_esc_count", "Escalations raised this block", "number", "0"),
        f("p2_stuck", "Anything still stuck after escalation", "text", "Name the item and the owner", false),
        f("p2_plan", "By 8:00 PM I will deliver", "long", "Numbers, not adjectives"),
      ],
    },
    {
      id: "p3",
      name: "Final Impact block",
      codename: "Final Impact",
      window: "5:20 PM – 8:00 PM",
      due: "8:00 PM",
      dueMins: 20 * 60,
      brief: `Break 2 ends at 5:20 PM. Close the gap to ${nums("eod")} and leave nothing open behind you.`,
      steps: [
        ...role.p3Work.map((w, i) => step(`p3_w${i}`, w)),
        step("p3_hand", `Hand over everything that continues tomorrow to ${role.handoverTo}`, "A handover without a named owner is not a handover."),
      ],
      report: [
        f("p3_closed", "Gap closed in this block", "text", "e.g. +7 BBD, +2 tours"),
        f("p3_open", "What is still open and who owns it tonight", "text", "Named owner, always"),
        f("p3_hand", `Handover note for ${role.handoverTo}`, "long", "What they must pick up first"),
      ],
    },
    {
      id: "eod",
      name: "8:00 PM · Final Impact · Day End",
      codename: "Day End",
      window: "8:00 PM",
      due: "8:00 PM",
      dueMins: 20 * 60,
      checkpoint: "eod",
      brief: "Business outcome created, goal hit yes/no, tomorrow's pipeline locked. The day cannot close without evidence or an approved recovery plan.",
      steps: [
        ...role.eodReport.map((w, i) => step(`eod_r${i}`, w, undefined, "Evidence attached")),
        step("eod_ev", "Attach evidence for every counted unit", "False evidence puts your incentive on hold immediately."),
        step("eod_next", "Lock tomorrow's pipeline and first priority", "Tomorrow starts from this line."),
      ],
      report: [
        ...actuals("eod"),
        f("eod_goal_hit", "Goal hit today? (Yes / No / Partial)", "text", "One word"),
        f("eod_outcome", "Business outcome created today", "text", "Revenue / beds / tours / collections — with the number"),
        f("eod_evidence", "Evidence reference (screenshot name / CRM filter / sheet link)", "text", "Required — EOD cannot close without it"),
        f("eod_win", "Biggest result delivered today", "text", "With the number"),
        f("eod_miss", "Biggest miss and the honest reason", "text", "No blame, just the cause"),
        f("eod_tomorrow", "Tomorrow's first priority", "long", "The first thing you touch at 10:35 AM"),
      ],
    },
  ];
}

/** Which phase the clock says you should be working right now. */
export function activePhaseId(d = new Date()): PhaseId {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < 10 * 60 + 50) return "prep";      // until 10:50 — goal window
  if (m < 13 * 60 + 15) return "p1";        // until 1:15 PM
  if (m < 17 * 60) return "p2";             // 2:00 → 5:00 PM (Break 1 sits inside)
  if (m < 20 * 60) return "p3";             // 5:20 → 8:00 PM (Break 2 sits inside)
  return "eod";
}
