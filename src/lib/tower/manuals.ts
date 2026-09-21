import type { Role } from "@/lib/tower/access";

export type RoleManual = {
  mission: string;
  day: { time: string; do: string }[];
  rules: string[];
  measured: string[];
};

export const ROLE_MANUAL: Record<Role, RoleManual> = {
  founder_admin: {
    mission:
      "Hold the whole company in one view: demand line, supply line and the Control Tower between them. You look for the one number that is drifting and put an owner on it before the day ends.",
    day: [
      { time: "Start of day", do: "Founder Admin → company block: people present, chats waiting, tours unconfirmed. Fix the biggest gap first." },
      { time: "Mid-day", do: "Zone rows → find the zone that is behind and ask its Zone Manager for the blocker, not the excuse." },
      { time: "5 PM", do: "Report Centre → every checkpoint report in, every missing one named." },
      { time: "End of day", do: "EOD → close the day only when every open loop has a named owner and a deadline." },
    ],
    rules: [
      "Never fix a person's task yourself — fix the owner, the standard or the system.",
      "One drifting number per day gets your full attention; the rest get a note.",
      "Everything you decide is written where the team can read it.",
    ],
    measured: ["Company checkpoint completion", "Zones on target", "Open loops carried into tomorrow"],
  },
  zone_manager: {
    mission:
      "Own one zone end to end: its leads, its people, its SLA and its conversion. If a lead in your zone goes cold, that is yours.",
    day: [
      { time: "Start of day", do: "Control Tower → unassigned and SLA-risk leads inside your zone. Assign before the first hour ends." },
      { time: "Mid-day", do: "Team → who is at capacity, who is idle. Rebalance rather than escalate." },
      { time: "Afternoon", do: "Quality → review coverage for your zone's people; open a correction where the score slipped." },
      { time: "End of day", do: "Founder Admin → your zone row must be explainable in one sentence." },
    ],
    rules: [
      "No lead in your zone sits unassigned past the accept SLA.",
      "Reassign with a written reason, always.",
      "Coach on the specific call, not on the average.",
    ],
    measured: ["Zone SLA rate", "Zone conversion", "Review coverage in-zone", "Open corrections closed on time"],
  },
  admin: {
    mission:
      "Keep the system itself correct: who exists, what role they hold, which team and zone they sit in, and that every module stays reachable by the right people.",
    day: [
      { time: "Start of day", do: "Admin → check new joiners have a role, a team and a zone. No one works without all three." },
      { time: "Mid-day", do: "Access Map → confirm nobody is locked out of a screen they need, and nobody sees more than they should." },
      { time: "Weekly", do: "Refresh performer categories and zone assignments from the Quality and Dashboard numbers." },
      { time: "On escalation", do: "Step in on disputed reviews and reassign ownership when a manager is unavailable." },
    ],
    rules: [
      "Never hand out Admin to solve a one-off access problem — fix the role or the module instead.",
      "Every change you make is visible in the lead and review timelines; write the reason.",
      "Role changes take effect immediately for that person — tell them before you switch it.",
    ],
    measured: ["Zero people without a role/team/zone", "No access escalations pending > 24h"],
  },
  manager: {
    mission:
      "Own the quality outcome of your teams. You do not chase leads; you make sure every review closes, every correction lands, and drifting people are caught early.",
    day: [
      { time: "9:45 AM", do: "Dashboard → yesterday's conversion, SLA and tour numbers. Pick the one metric you will move today." },
      { time: "2:00 PM", do: "Run your own reviews — 3 chats, 2 calls minimum. Managers are not exempt from coverage." },
      { time: "5:00 PM", do: "Verify submitted corrections. Closed correctly, partial, or rejected — rejected spawns a re-review." },
      { time: "7:00 PM", do: "Quality → coverage per reviewer and band mix. EOD → close the day; anything open rolls to tomorrow." },
    ],
    rules: [
      "No score without the 6-part feedback, no closure without evidence.",
      "Two Critical reviews on the same person in a week means a conversation, not a third review.",
      "Escalate a systemic pattern (same miss across people) as a process fix, not as individual feedback.",
    ],
    measured: ["Review coverage of your team", "Feedback closure within 24h", "Team conversion and SLA rate"],
  },
  control_tower: {
    mission:
      "Zero lead left behind. Every incoming conversation gets captured, scored, assigned to a live owner, and acted on inside SLA.",
    day: [
      { time: "9:30 AM", do: "Control Tower → clear the unassigned queue. Super-hot leads first, always." },
      { time: "Every hour", do: "Scan SLA risk and the exceptions queue. Reassign anything past accept or first-action deadline with a written reason." },
      { time: "Continuous", do: "Capture from all WhatsApp numbers: location + move-in date only. The system scores, zones and routes." },
      { time: "Continuous", do: "Resolve duplicates before creating a lead — attach to the existing lead and open a new cycle instead." },
      { time: "7:00 PM", do: "Quality + EOD → confirm nothing is unassigned, unaccepted or without a next action." },
    ],
    rules: [
      "Never assign to someone who is not clocked in, is at cap, or is restricted.",
      "No super-hot lead sits unassigned. Ever.",
      "Every reassignment carries a reason — the owner history is permanent.",
      "Capture speed beats capture detail. Location and move-in date, then move on.",
    ],
    measured: ["Unassigned count at every hour mark", "SLA breach rate", "Duplicate handling accuracy", "Review coverage"],
  },
  operator: {
    mission:
      "Run the floor day-to-day: work your leads, keep the board clean, and feed the review queue with real conversations.",
    day: [
      { time: "Shift start", do: "Clock in on Team so the router can reach you. Not clocked in = no leads." },
      { time: "On assignment", do: "Accept within SLA. If you cannot take it, decline with a reason immediately — do not sit on it." },
      { time: "After every contact", do: "Log the scenario and set the next action. A lead with no next action is a lost lead." },
      { time: "Daily", do: "Review OS → contribute your chat/call reviews. My Feedback → clear anything open against you." },
      { time: "Shift end", do: "Every active lead has a next action with a date. Then clock out." },
    ],
    rules: [
      "Accept or decline — never leave an assignment pending.",
      "Corrections happen on the real lead, not in a comment box.",
      "Log the scenario even when the outcome is bad; the bad ones are what the tower learns from.",
    ],
    measured: ["Accept and first-action SLA", "Next-action discipline", "Uncontacted and overdue counts", "Feedback closure"],
  },
  sales: {
    mission:
      "Convert the leads you own. You are the last mile — the tower's whole job is to hand you a live, scored, timed lead.",
    day: [
      { time: "Shift start", do: "Clock in. My Leads → pending accepts first, then overdue follow-ups, then everything else." },
      { time: "On accept", do: "First action inside SLA. Call first, WhatsApp second." },
      { time: "Every touch", do: "Pick the scenario, write what actually happened, set the next action and its deadline." },
      { time: "After a tour", do: "Record the outcome the same day: booked, token, draft, follow-up or lost with the reason." },
      { time: "Daily", do: "My Feedback → acknowledge within 24h, do the correction on the lead, attach evidence, submit." },
    ],
    rules: [
      "Never promise what inventory cannot deliver — a false promise is an automatic Critical.",
      "No lead closes silently. Every dead lead has a reason logged.",
      "If you cannot reach a lead 3 times, hand it back to the tower rather than letting it age.",
    ],
    measured: ["Conversion rate", "Tour conversion", "SLA rate", "Follow-up completion", "CRM discipline"],
  },
};
