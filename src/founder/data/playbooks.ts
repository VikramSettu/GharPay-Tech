// Role playbooks — operationalized from the 4 leadership SOPs.
// Each playbook drives the /console screen: sprints, KPIs, comm windows, EOD.

export type PlaybookKey =
  | "communication_shield"
  | "performance_enforcer"
  | "training_architect"
  | "talent_engine"
  | "pod_command"
  | "tour_conductor"
  | "lead_router"
  | "people_pulse"
  | "operator_day";

export interface KpiTarget {
  id: string;
  label: string;
  target: number;
  unit?: string;
  // "count" = increment counter; "boolean" = done/not; "percent" = 0-100
  kind: "count" | "boolean" | "percent";
  why: string; // 1-line "why this matters"
}

export interface SprintBlock {
  id: string;
  index: number;
  name: string;
  startMin: number; // minutes from midnight
  endMin: number;
  objective: string;
  actions: { time: string; do: string; output: string }[];
  metric: string;
  shielded?: boolean; // shield mode applies during this block
}

export interface CommWindow {
  id: string;
  label: string;
  atMin: number; // minutes from midnight
  channel: "WhatsApp Group" | "WhatsApp 1:1" | "Floor" | "Internal";
  template: string; // mustache-ish, with {{placeholders}}
}

export interface EodField {
  id: string;
  label: string;
  kind: "number" | "text" | "yesno" | "list";
  placeholder?: string;
}

export interface RolePlaybook {
  key: PlaybookKey;
  title: string;
  subtitle: string;
  oneLiner: string;
  interdependence: string;
  collapseRule: string;
  kpis: KpiTarget[];
  sprints: SprintBlock[];
  commWindows: CommWindow[];
  eodFields: EodField[];
  shieldBlocks: { startMin: number; endMin: number; label: string }[];
  // Mapped to seed Employee.id — who owns this playbook by default
  ownerId: string;
  accent: string; // tailwind hue tag
}

const t = (h: number, m = 0) => h * 60 + m;

// =================== NITHYA — COMMUNICATION SHIELD ===================
const NITHYA: RolePlaybook = {
  key: "communication_shield",
  title: "Communication Shield",
  subtitle: "In-Office Command · Precision Communication",
  oneLiner:
    "You run the in-office engine and control Gharpayy's entire communication rhythm. Every hour counts, every message lands.",
  interdependence:
    "If Nithya fails → office discipline collapses → Sneha has no floor data → Jiya's trainees enter chaos.",
  collapseRule:
    "If in-office call volume < 50% of daily target by 1:15 PM, OR any employee unreachable for 2+ hours → alert Sneha at the 1:15 PM window.",
  ownerId: "e12",
  accent: "primary",
  kpis: [
    { id: "ontime", label: "On-time at desk by 10:30", target: 100, unit: "%", kind: "percent", why: "A late start is a lost morning sprint." },
    { id: "conn", label: "Avg connections / person", target: 70, kind: "count", why: "Below 70, the funnel collapses by EOD." },
    { id: "ghost", label: "Ghost leads cleared", target: 1, kind: "boolean", why: "Zero leads without a next-step task." },
    { id: "stuck", label: "Stuck WhatsApp chats >24h", target: 0, kind: "count", why: "Silence kills trust. Move every chat." },
    { id: "revived", label: "Revived leads (7-day sweep)", target: 20, kind: "count", why: "Yesterday's silence is today's revenue." },
    { id: "audited", label: "Lead journeys audited", target: 30, kind: "count", why: "Movement, not chatting. Tour-bound or out." },
    { id: "corrections", label: "Real-time corrections", target: 5, kind: "count", why: "Fix the pitch on the call, not at debrief." },
    { id: "windows", label: "Comm windows sent on time", target: 4, kind: "count", why: "4 windows. Not 5. Not 3. Exactly 4." },
    { id: "scored", label: "Every employee scored A/B/C", target: 1, kind: "boolean", why: "Public scoreboard or no scoreboard." },
    { id: "c_player_1on1", label: "C-player 1:1s done by 7 PM", target: 1, kind: "boolean", why: "C-players don't go home without a plan." },
  ],
  shieldBlocks: [
    { startMin: t(10, 40), endMin: t(13, 0), label: "Sprint Block · No group msgs" },
    { startMin: t(14, 0), endMin: t(17, 0), label: "Sprint Block · No group msgs" },
  ],
  sprints: [
    {
      id: "n_s1", index: 1, name: "Floor Ignition + CRM Audit",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "Start sharp. Every target spoken. CRM clean before Sprint 2.",
      actions: [
        { time: "10:25", do: "Setup attendance, perf tracker, CRM open", output: "Systems ready" },
        { time: "10:30", do: "Stand-up — every person states their target out loud", output: "Targets spoken" },
        { time: "10:40", do: "Lock attendance. Shield Mode begins", output: "Group msg sent at 10:40" },
        { time: "10:45–11:30", do: "CRM Audit Round 1 — assign next-step task to every ghost lead", output: "Zero ghost leads" },
        { time: "11:30–12:00", do: "Floor monitoring — catch 3 early blockers", output: "3 blockers resolved" },
      ],
      metric: "100% CRM task alignment. 70+ acknowledged. Ghost leads cleared.",
    },
    {
      id: "n_s2", index: 2, name: "WhatsApp + 7-Day Lead Sweep",
      startMin: t(12, 0), endMin: t(13, 0),
      objective: "No chat stuck >7 days. 20 leads revived.",
      actions: [
        { time: "12:00–12:30", do: "Sweep WhatsApp — every chat older than 24h gets a move", output: "Backlog cleared" },
        { time: "12:30–1:00", do: "7-day sweep — revive 20 leads with new pitch", output: "20 revived" },
      ],
      metric: "Zero chats stuck >7 days. 20 leads revived.",
    },
    {
      id: "n_s3", index: 3, name: "Lead Journey Audit + Real-Time Corrections",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Leads must be moving toward a tour, not in circles.",
      actions: [
        { time: "2:30–3:30", do: "Audit 30 lead journeys — flag the ones going in circles", output: "30 journeys verified" },
        { time: "3:30–4:00", do: "5 real-time corrections — intervene on the live call", output: "5 corrections done" },
      ],
      metric: "30 journeys verified. 5 real-time corrections.",
      shielded: true,
    },
    {
      id: "n_s4", index: 4, name: "70-Connection Enforcement",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "No one ends below 70. Lagging employees get a protected sprint.",
      actions: [
        { time: "4:00–4:30", do: "Audit who's below 50 — give them a 30-min uninterrupted block", output: "Lagging in protected sprint" },
        { time: "4:30–5:00", do: "Push the floor — public count visible", output: "Count visible to all" },
      ],
      metric: "Every person on track for 70+ by 7 PM.",
    },
    {
      id: "n_s5", index: 5, name: "Final Push + Scorecards",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Public scoreboard. C-player 1:1 before 7 PM.",
      actions: [
        { time: "5:20–6:30", do: "Post scoreboard. C-player 1:1 mandatory", output: "Scoreboard posted, 1:1 done" },
        { time: "6:30–7:30", do: "Action plans signed. EOD prep", output: "Plans signed" },
      ],
      metric: "All scored. All C-players have a written plan for tomorrow.",
    },
  ],
  commWindows: [
    {
      id: "n_w1", label: "Morning Ignition", atMin: t(10, 30), channel: "WhatsApp Group",
      template: `🌅 Good morning, Gharpayy!
Today's targets:
📞 Connections per person: 70+
🏠 Tours to support: 10 (Flow Ops)
💬 WhatsApp chats actioned: All of them
⏰ Everyone at desk. Targets spoken. Let's start.
Next update: 1:15 PM. 💪`,
    },
    {
      id: "n_w2", label: "Mid-Day Pulse", atMin: t(13, 0), channel: "WhatsApp Group",
      template: `📊 1 PM — Numbers before break:
Connections avg: {{avg}}
Tours booked: {{tours}}
Chats stuck >24h: {{stuck}} — must be zero by 5 PM
On track: {{on_track}}
Needs push: {{needs_push}}
Break: 1:15–2:00. Back at 2:00 sharp. 🍽️`,
    },
    {
      id: "n_w3", label: "Pre-Snack Push", atMin: t(17, 0), channel: "WhatsApp Group",
      template: `🔥 5 PM check-in:
Connections avg: {{avg}} (need 70+)
Tours today: {{tours}}/10
Revived leads: {{revived}}/20
Strong finish: {{strong}}
Final sprint needed: {{final}}
Snack: 5:00–5:20. 5:20 — final push. No drift. 💪`,
    },
    {
      id: "n_w4", label: "EOD Report", atMin: t(19, 30), channel: "WhatsApp Group",
      template: `🌙 EOD — {{date}}
Connections avg: {{avg}}/70
Tours done: {{tours}}/10
Stuck chats: {{stuck}}
Revived: {{revived}}/20
A: {{a}} | B: {{b}} | C: {{c}}
Hard decision today: {{hard}}`,
    },
  ],
  eodFields: [
    { id: "avg_conn", label: "Avg connections / person", kind: "number" },
    { id: "tours", label: "Tours from floor", kind: "number" },
    { id: "stuck", label: "Stuck chats remaining", kind: "number" },
    { id: "revived", label: "Leads revived", kind: "number" },
    { id: "a", label: "A players (names)", kind: "list" },
    { id: "b", label: "B players (names)", kind: "list" },
    { id: "c", label: "C players (names)", kind: "list" },
    { id: "ghost_clean", label: "CRM clean — zero ghost leads?", kind: "yesno" },
    { id: "windows_on_time", label: "All 4 windows sent on time?", kind: "yesno" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Formal warning to X for second late entry." },
    { id: "flag", label: "Flag for Divyanshu", kind: "text" },
  ],
};

// =================== SNEHA — PERFORMANCE ENFORCER ===================
const SNEHA_PE: RolePlaybook = {
  key: "performance_enforcer",
  title: "Performance Enforcer",
  subtitle: "Tours + Closings Command · The 10:16:60 Standard",
  oneLiner:
    "Ensure the revenue engine never stops. 10 tours/day. 60% show-up. 2 closings/TCM after 6 tours.",
  interdependence:
    "If Sneha fails → tours don't happen → closings don't happen → Gharpayy makes no money.",
  collapseRule:
    "If tours < 10 by 5:00 PM, OR show-up % < 60 weekly → alert Nithya & Divyanshu at the 5:00 PM window.",
  ownerId: "e13",
  accent: "destructive",
  kpis: [
    { id: "booked", label: "Tours booked", target: 16, kind: "count", why: "16 to guarantee 10 done at 60% show-up." },
    { id: "done", label: "Tours completed", target: 10, kind: "count", why: "10 is the floor. Below 10 = no revenue day." },
    { id: "showup", label: "Show-up % this week", target: 60, unit: "%", kind: "percent", why: "Below 60% = pitch or confirmation broken." },
    { id: "closings", label: "TCM closings (after 6 tours)", target: 2, kind: "count", why: "6 tours and no close = the ask was missed." },
    { id: "noshows", label: "No-shows analyzed", target: 100, unit: "%", kind: "percent", why: "Every no-show has a named reason. No exceptions." },
    { id: "pitch_fix", label: "Pitch corrections sent", target: 5, kind: "count", why: "Specific quote → specific fix → next call." },
    { id: "tomorrow", label: "Tomorrow's morning tours confirmed", target: 100, unit: "%", kind: "percent", why: "Confirmed today, or it's already broken." },
    { id: "ooo", label: "OOO team connected", target: 100, unit: "%", kind: "percent", why: "Silence in the morning = drift all day." },
    { id: "calls_listened", label: "Live calls listened-in", target: 8, kind: "count", why: "Coach in the moment, not at debrief." },
    { id: "red_zone_named", label: "Red-zone names published", target: 1, kind: "boolean", why: "If the floor doesn't see it, it isn't real." },
    { id: "tcm_six_rule", label: "TCMs hitting 6-tour rule", target: 100, unit: "%", kind: "percent", why: "Below 6 = the ask was never made." },
    { id: "evening_ranking", label: "Evening ranking posted", target: 1, kind: "boolean", why: "Public leaderboard at 6 PM. No exceptions." },
  ],
  shieldBlocks: [],
  sprints: [
    {
      id: "s_s1", index: 1, name: "Show-Up Drill + OOO Connect",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "Start the day knowing where yesterday broke and whether today can deliver 10 tours.",
      actions: [
        { time: "10:25", do: "Open Callyzer, Superfone, OOO group", output: "Systems live" },
        { time: "10:30–10:45", do: "OOO connect — 2-min check per person", output: "Everyone confirmed" },
        { time: "10:45–11:30", do: "Audit yesterday's show-up data — name root cause", output: "No-show analysis done" },
        { time: "11:30–12:00", do: "Correction calls to Flow Ops below 60%", output: "Specific fixes given" },
      ],
      metric: "60%+ show-up enforced. Zero un-analyzed no-shows. 100% OOO connected.",
    },
    {
      id: "s_s2", index: 2, name: "TCM Closing Audit",
      startMin: t(12, 0), endMin: t(13, 15),
      objective: "Did 6-tour-to-2-closing rule hit? If not, find the exact missed ask.",
      actions: [
        { time: "12:00–12:30", do: "Pull call logs — verify 6 tours per TCM + ask made", output: "Logs reviewed" },
        { time: "12:30–1:15", do: "Listen to recordings of misses — name the moment", output: "Gap documented w/ timestamp" },
      ],
      metric: "2 closings tracked per TCM. Every miss has a named reason.",
    },
    {
      id: "s_s3", index: 3, name: "Performance Correction + Nithya Sync",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Intervene before the day runs out.",
      actions: [
        { time: "2:30–3:00", do: "Sync with Nithya — leads enough? comms blocking?", output: "Joint action agreed" },
        { time: "3:00–4:00", do: "Live correction — listen + intervene on 5 Flow Ops", output: "5 interventions done" },
      ],
      metric: "5 interventions. Nithya synced.",
    },
    {
      id: "s_s4", index: 4, name: "Tomorrow's Tour Guarantee",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "Every morning tour reconfirmed today.",
      actions: [
        { time: "4:00–4:45", do: "Call/WhatsApp every 10am-1pm tomorrow lead", output: "100% confirmed" },
        { time: "4:45–5:00", do: "Verify 16 bookings/Flow Op for tomorrow", output: "Gaps filled now" },
      ],
      metric: "Tomorrow's morning tours: 100% confirmed.",
    },
    {
      id: "s_s5", index: 5, name: "Evening OOO + Final Numbers",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Public ranking. Final count visible to all.",
      actions: [
        { time: "5:20–6:00", do: "Pulse check — red zone updated", output: "Red zone shared" },
        { time: "6:00–7:00", do: "Evening OOO meeting — public ranking", output: "Numbers visible" },
        { time: "7:00–7:30", do: "Performance gap report → EOD", output: "Numbers ready" },
      ],
      metric: "Final ranking shared. Gap report ready.",
    },
  ],
  commWindows: [
    {
      id: "s_w1", label: "Morning OOO Connect (1:1)", atMin: t(10, 30), channel: "WhatsApp 1:1",
      template: `Hey {{name}} 👋 Quick 2-min check.
What's your tour target today? Leads assigned? Any blockers? Reply now.`,
    },
    {
      id: "s_w2", label: "Morning Group Start", atMin: t(10, 45), channel: "WhatsApp Group",
      template: `✅ Morning team! Everyone connected.
🏠 Tours to book: 16 (to guarantee 10 done)
📍 Show-ups yesterday: {{yest_showup}}
💰 Closings expected: 2 per TCM (after 6 tours)
The number that matters: 10. Let's go. 🔑`,
    },
    {
      id: "s_w3", label: "Specific Feedback (1:1)", atMin: t(15, 0), channel: "WhatsApp 1:1",
      template: `Hey {{name}}, reviewed your {{time}} call.
When the customer said "{{quote}}", you responded with "{{response}}" — that's where they went cold.
Next time say: "{{better}}".
Try this in your next 3 calls. Tell me how it goes.`,
    },
    {
      id: "s_w4", label: "Evening Group Update", atMin: t(18, 0), channel: "WhatsApp Group",
      template: `🌇 Evening update:
Tours completed: {{done}}/10
Show-up this week: {{showup}}%
🏆 Top performer: {{top}}
⚠️ Red zone: {{red}}
Tomorrow's morning tours: {{tomorrow}} confirmed
One fix for tomorrow: {{fix}}`,
    },
  ],
  eodFields: [
    { id: "ooo_connected", label: "OOO connected (X/total)", kind: "text" },
    { id: "booked", label: "Tours booked today", kind: "number" },
    { id: "done", label: "Tours completed", kind: "number" },
    { id: "showup", label: "Show-up % this week", kind: "number" },
    { id: "closings", label: "TCM closings today", kind: "number" },
    { id: "six_rule", label: "6-tour rule met?", kind: "yesno" },
    { id: "no_shows_root", label: "No-show root causes", kind: "list" },
    { id: "fixes_sent", label: "Pitch corrections sent", kind: "number" },
    { id: "tomorrow_confirmed", label: "Tomorrow morning tours confirmed (X/X)", kind: "text" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Final warning — 40% show-up 3 days." },
    { id: "flag", label: "Flag for Divyanshu", kind: "text" },
  ],
};

// =================== JIYA — TRAINING ARCHITECT ===================
const JIYA: RolePlaybook = {
  key: "training_architect",
  title: "Training Architect",
  subtitle: "From Raw Hire to Arena-Ready in 48 Hours",
  oneLiner:
    "Build operators who can generate tours, close leads, and represent Gharpayy with precision — within 48 hours.",
  interdependence:
    "If Jiya fails → Sneha's tours don't convert → Nithya's floor lacks discipline → Thanvi's hiring has zero ROI.",
  collapseRule:
    "If any trainee remains 'No-Go' past Day 3 → escalate to Divyanshu at the 5:00 PM window.",
  ownerId: "e14",
  accent: "warning",
  kpis: [
    { id: "day0", label: "Day 0 calls completed", target: 100, unit: "%", kind: "percent", why: "Day 1 starts the night before." },
    { id: "cleared", label: "Trainees cleared by Day 2", target: 70, unit: "%", kind: "percent", why: "≥70% or the batch is broken." },
    { id: "improvement", label: "Daily skill score improvement", target: 10, unit: "%", kind: "percent", why: "10% better every day. Measurable." },
    { id: "sims", label: "Simulations / trainee", target: 5, kind: "count", why: "5 sims per sprint. No passive watching." },
    { id: "support_speak", label: "Support Speak instances", target: 0, kind: "count", why: "Zero. Operators, not help desk." },
    { id: "go_no_go", label: "Go/No-Go report submitted", target: 1, kind: "boolean", why: "By 7:30 PM. No exceptions." },
    { id: "sop_updated", label: "SOPs updated (this week's errors)", target: 1, kind: "boolean", why: "Same week they're trained." },
    { id: "mock_calls", label: "Mock calls per trainee", target: 3, kind: "count", why: "3 mocks min — pen-and-paper score each." },
    { id: "agenda_check", label: "1:1 agenda checks done", target: 100, unit: "%", kind: "percent", why: "Every trainee, eye-to-eye, no skipping." },
    { id: "scripts_redist", label: "Corrected scripts redistributed", target: 1, kind: "boolean", why: "Mistake-of-day → fix → in everyone's hand." },
    { id: "module_forms", label: "Module forms collected", target: 100, unit: "%", kind: "percent", why: "No paperwork = no proof of training." },
    { id: "intent_score", label: "Avg intent score", target: 8, kind: "count", why: "Below 8/10 means we're training the wrong people." },
  ],
  shieldBlocks: [],
  sprints: [
    {
      id: "j_s1", index: 1, name: "Day 0 Alignment + The Why Agenda",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "Every trainee knows why they're here, what's expected, what today achieves.",
      actions: [
        { time: "10:25", do: "Training dashboard open. Day plan shared", output: "Trainees see plan" },
        { time: "10:30–10:50", do: "Mission in 3 sentences. Each trainee speaks their why. Win-Win agenda", output: "Intent spoken aloud" },
        { time: "10:50–12:00", do: "Module 1: First call structure + property pitch. Every trainee 1 mock call", output: "Every trainee attempted" },
      ],
      metric: "100% Day 0 clarity. Every trainee attempted a call.",
    },
    {
      id: "j_s2", index: 2, name: "The 10% Improvement Drill",
      startMin: t(12, 0), endMin: t(13, 15),
      objective: "One mistake. Fix it 10% better. Not 5 things.",
      actions: [
        { time: "12:00–12:15", do: "Identify Mistake of the Day. Announce publicly", output: "Mistake named" },
        { time: "12:15–1:15", do: "90-min intensive drill on that one skill. Score before/after", output: "Score deltas documented" },
      ],
      metric: "10% increase on that specific skill, start to end of drill.",
    },
    {
      id: "j_s3", index: 3, name: "Simulation Lab — Kill Support Speak",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Operators, not help desk. Zero tolerance for customer-care language.",
      actions: [
        { time: "2:30–4:00", do: "5 simulations per trainee — scored. Forbidden words flagged live", output: "5 sims/trainee, zero support speak" },
      ],
      metric: "5 simulations per trainee. Zero support speak past this block.",
    },
    {
      id: "j_s4", index: 4, name: "Readiness Audit + Go/No-Go",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "Name-by-name readiness list by 5 PM.",
      actions: [
        { time: "4:00–4:45", do: "1:1 Agenda Check per trainee — can they take a live call now?", output: "Go/No-Go decision per person" },
        { time: "4:45–5:00", do: "Final report drafted. Escalation list prepared", output: "Report ready" },
      ],
      metric: "Go/No-Go per trainee. No 'maybe'.",
    },
    {
      id: "j_s5", index: 5, name: "Re-train + SOP Update",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Fix the No-Go gap, update SOPs with this week's real errors.",
      actions: [
        { time: "5:20–6:30", do: "Re-train No-Go on targeted gap only", output: "Corrected scripts redistributed" },
        { time: "6:30–7:30", do: "Update SOP. Collect module forms. Score final assessment", output: "SOPs updated" },
      ],
      metric: "SOPs reflect this week's reality.",
    },
  ],
  commWindows: [
    {
      id: "j_w1", label: "Day-Before Welcome", atMin: t(18, 0), channel: "WhatsApp 1:1",
      template: `Hi {{name}} 👋 This is Jiya from Gharpayy.
We're excited to have you join us tomorrow! Please be at the office by 10:25 AM.
Carry a pen and notepad — Day 1 is intensive and valuable. See you! 🏠`,
    },
    {
      id: "j_w2", label: "Day 1 Morning Plan", atMin: t(10, 50), channel: "WhatsApp 1:1",
      template: `Good morning {{name}}!
Here's your Day 1 plan: {{agenda}}.
Your goal today: complete 2 modules + attempt your first mock call. Let's make it count 💪`,
    },
    {
      id: "j_w3", label: "Post-Assessment (Pass)", atMin: t(17, 0), channel: "WhatsApp 1:1",
      template: `{{name}}, you've cleared the Day {{day}} assessment ✅
Score: {{score}}%. You're on track. Tomorrow we go deeper. Stay sharp!`,
    },
    {
      id: "j_w4", label: "Go/No-Go Cleared", atMin: t(18, 30), channel: "WhatsApp 1:1",
      template: `{{name}}, you've been cleared 🎯 for live leads starting {{date}}.
Trust the training, follow the script, and remember: you're making a conversation, not a customer-care call. You've got this! 🚀`,
    },
  ],
  eodFields: [
    { id: "trainees", label: "Trainees in session", kind: "number" },
    { id: "go", label: "Go (names)", kind: "list" },
    { id: "nogo", label: "No-Go (names + reason)", kind: "list" },
    { id: "day0_calls", label: "Day 0 calls completed (X/X)", kind: "text" },
    { id: "score_delta", label: "Sprint 2: before % → after %", kind: "text" },
    { id: "top_mistakes", label: "Top 3 mistakes today", kind: "list" },
    { id: "sims_done", label: "Avg simulations / trainee", kind: "number" },
    { id: "sop", label: "SOPs updated?", kind: "yesno" },
    { id: "support_speak", label: "Support speak instances", kind: "number" },
    { id: "escalated", label: "Escalated to Divyanshu", kind: "text" },
  ],
};

// =================== THANVI — TALENT ENGINE ===================
const THANVI: RolePlaybook = {
  key: "talent_engine",
  title: "Talent Engine",
  subtitle: "Hiring System · Long-Term Operators Only",
  oneLiner:
    "Source long-term, high-intent operators. One wrong hire wastes Jiya's training, Sneha's tours, the whole chain.",
  interdependence:
    "If Thanvi fails → Jiya has no one to train → Sneha has no floor team → Nithya has no one to manage.",
  collapseRule:
    "If interviews drop below 15 by 1:15 PM → alert Nithya at the 1:15 PM window.",
  ownerId: "e15",
  accent: "info",
  kpis: [
    { id: "interviews", label: "Interviews completed", target: 20, kind: "count", why: "20+ or the pipeline starves." },
    { id: "slots_locked", label: "Slots locked (today)", target: 30, kind: "count", why: "30 confirmed before 10:30." },
    { id: "junior_hr", label: "Junior HR contribution", target: 5, kind: "count", why: "Each junior HR = 5 minimum." },
    { id: "wa_response", label: "WhatsApp response rate", target: 100, unit: "%", kind: "percent", why: "Silence kills referrals. Zero unread." },
    { id: "reminders", label: "Internshala reminders sent", target: 30, kind: "count", why: "No slot unreminded." },
    { id: "referrals", label: "Referral leads contacted", target: 15, kind: "count", why: "Referrals come pre-vetted. Gold." },
    { id: "profiles", label: "New profiles sourced", target: 50, kind: "count", why: "Pipeline must be heavier at 4 PM than 10:30." },
    { id: "tomorrow_locked", label: "Tomorrow's pipeline locked", target: 30, kind: "count", why: "By 5:30 PM. No day starts unloaded." },
    { id: "intent_q_asked", label: "Intent questions asked / interview", target: 3, kind: "count", why: "3 minimum. Otherwise we hire need, not want." },
    { id: "ten_min_close", label: "Decisions sent within 10 min", target: 100, unit: "%", kind: "percent", why: "Yes/No/On-Hold while the call is warm." },
    { id: "ghost_rate", label: "Candidate ghost rate", target: 10, unit: "%", kind: "percent", why: "Above 10% = our reminders are weak." },
    { id: "junior_audit", label: "Junior HR logs audited", target: 100, unit: "%", kind: "percent", why: "Counts, quality, post-WhatsApps verified daily." },
    { id: "jiya_briefed", label: "Jiya briefed for tomorrow", target: 1, kind: "boolean", why: "She can't train someone she doesn't know is coming." },
  ],
  shieldBlocks: [],
  sprints: [
    {
      id: "th_s1", index: 1, name: "Pipeline Sweep + Reminders",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "No candidate shows up surprised. No one ghosts because they forgot.",
      actions: [
        { time: "10:25", do: "Login. Open Internshala, Calendly, Tracker, WhatsApp", output: "Systems live" },
        { time: "10:30–10:45", do: "Confirm 30 slots. Brief junior HRs — assign batches", output: "30 confirmed" },
        { time: "10:45–11:15", do: "Send reminders to all today's applicants. Clear WhatsApp", output: "30 reminders, zero backlog" },
        { time: "11:15–12:00", do: "Conduct 4 interviews. Decision in real time. WhatsApp within 10 min", output: "4 done, 4 messages sent" },
      ],
      metric: "100% WhatsApp response. 30 reminders. Pipeline confirmed.",
    },
    {
      id: "th_s2", index: 2, name: "Intent-First Interviews",
      startMin: t(12, 0), endMin: t(13, 15),
      objective: "Filter for people who want to be here, not who need a job.",
      actions: [
        { time: "12:00–1:15", do: "8 interviews. Ask 3 intent questions. Score in tracker within 5 min", output: "12 done by lunch, 8 logged" },
      ],
      metric: "Zero 'maybe'. Selected, Rejected, or On-Hold with reason.",
    },
    {
      id: "th_s3", index: 3, name: "Referral + Quality Sourcing",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Pipeline heavier at 4 PM than at 10:30 AM.",
      actions: [
        { time: "2:30–3:15", do: "Reach 15 referrals. Personal, specific, not copy-paste", output: "15 contacted" },
        { time: "3:15–4:00", do: "Source 50 new profiles on Internshala/LinkedIn", output: "50 added" },
      ],
      metric: "50 sourced. 15 referrals personally contacted.",
    },
    {
      id: "th_s4", index: 4, name: "Tomorrow's 30-Slot Lock",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "If 30 aren't confirmed by 5 PM, tomorrow is already broken.",
      actions: [
        { time: "4:00–4:45", do: "Send Calendly + WhatsApp confirmation to 30 candidates — personal", output: "30 confirmations sent" },
        { time: "4:45–5:00", do: "Audit junior HR logs — count, quality, post-interview WhatsApps", output: "Audit done" },
      ],
      metric: "30 locked. Zero data errors in junior HR logs.",
    },
    {
      id: "th_s5", index: 5, name: "Final Block + Pipeline Hygiene",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Hit 20+ total. Brief Jiya for tomorrow.",
      actions: [
        { time: "5:20–6:30", do: "5 buffer interviews. Send all pending WhatsApps", output: "20+ confirmed" },
        { time: "6:30–7:00", do: "Final WhatsApp sweep. Brief Jiya — joiners + intent notes", output: "Jiya briefed" },
      ],
      metric: "Zero unread. Jiya has tomorrow's joiners list.",
    },
  ],
  commWindows: [
    {
      id: "th_w1", label: "Interview Confirmation", atMin: t(10, 45), channel: "WhatsApp 1:1",
      template: `Hi {{name}} 👋 This is Thanvi from Gharpayy.
Your interview is confirmed for {{date}} at {{time}}. The slot is fixed — please be ready 5 minutes early.
Link: {{calendly}}. Reply "Confirmed" ✅`,
    },
    {
      id: "th_w2", label: "Day-Of Reminder (1h before)", atMin: t(11, 0), channel: "WhatsApp 1:1",
      template: `Hi {{name}} — your interview starts in 1 hour at {{time}}.
Link: {{link}}. Please don't be late. ☎️`,
    },
    {
      id: "th_w3", label: "Rejection (within 10 min)", atMin: t(13, 0), channel: "WhatsApp 1:1",
      template: `Hi {{name}}, thank you for interviewing with Gharpayy today.
We won't be moving forward at this stage. We wish you the very best. 🙏`,
    },
    {
      id: "th_w4", label: "Selection — Move to Jiya", atMin: t(13, 30), channel: "WhatsApp 1:1",
      template: `Hi {{name}} 🎉 Great speaking with you!
You've cleared Round 1. Our Training Lead Jiya will connect with you shortly for next steps.
Stay reachable on this number!`,
    },
    {
      id: "th_w5", label: "Referral Outreach", atMin: t(14, 30), channel: "WhatsApp 1:1",
      template: `Hi {{name}}, {{referrer}} mentioned you might be a great fit for Gharpayy.
We're building a serious, long-term team of closing operators.
Would you be open to a quick 15-min conversation this week? Here's our link: {{calendly}}`,
    },
  ],
  eodFields: [
    { id: "interviews", label: "Interviews done (X/20)", kind: "text" },
    { id: "junior_hr", label: "Junior HR counts", kind: "list", placeholder: "Name: X | Name: X" },
    { id: "no_shows", label: "No-shows", kind: "number" },
    { id: "rescheduled", label: "Rescheduled", kind: "number" },
    { id: "referrals", label: "Referrals contacted", kind: "number" },
    { id: "profiles", label: "Profiles sourced", kind: "number" },
    { id: "tomorrow", label: "Tomorrow's pipeline locked (X/30)", kind: "text" },
    { id: "wa_clean", label: "WhatsApp backlog zero?", kind: "yesno" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Rejected a referral — not long-term." },
    { id: "flag", label: "Flag for Divyanshu", kind: "text" },
  ],
};

// =================== PRIYA — POD COMMAND (Floor Lead, Bandra/Andheri) ===================
const PRIYA_POD: RolePlaybook = {
  key: "pod_command",
  title: "Pod Command",
  subtitle: "Floor Lead · Hub-Level Revenue Owner",
  oneLiner:
    "Own the hub. Every Operator on your pod hits 70 connections, books their tours, and ends the day with a clean CRM.",
  interdependence:
    "If Pod Command fails → Sneha's tours dry up → Jiya's trainees join a broken floor → Nithya's discipline can't save the day.",
  collapseRule:
    "If pod connections < 50% of target by 1:15 PM, OR any Operator below 30 calls by 3 PM → escalate to Nithya at the 1:15 PM window.",
  ownerId: "e2",
  accent: "primary",
  kpis: [
    { id: "pod_conn", label: "Pod avg connections / person", target: 70, kind: "count", why: "Hub baseline. Below 70 = pipeline starves." },
    { id: "tours_booked", label: "Tours booked from pod", target: 16, kind: "count", why: "16 booked → 10 done at 60% show-up." },
    { id: "morning_huddle", label: "Morning huddle on time", target: 1, kind: "boolean", why: "10:35 sharp. Targets spoken aloud, by name." },
    { id: "live_listen", label: "Live calls listened-in", target: 6, kind: "count", why: "Listen, intervene, score. Not from your desk only." },
    { id: "ride_alongs", label: "Field ride-alongs", target: 2, kind: "count", why: "2 site visits with Operators today." },
    { id: "crm_clean", label: "Pod CRM ghost-lead = 0", target: 1, kind: "boolean", why: "Every lead has a next-step task by 5 PM." },
    { id: "one_on_ones", label: "1:1s with C-players", target: 100, unit: "%", kind: "percent", why: "Every C-player gets a written plan today." },
    { id: "kudos", label: "Kudos given (public)", target: 3, kind: "count", why: "3 named callouts. Energy is a job." },
    { id: "blockers_closed", label: "Blockers closed today", target: 5, kind: "count", why: "If Operators escalate it, you close it." },
    { id: "eod_signed", label: "Pod EOD report signed", target: 1, kind: "boolean", why: "Numbers + 1 hard call + 1 fix for tomorrow." },
    { id: "owner_calls", label: "Property-owner check-ins", target: 3, kind: "count", why: "Inventory health = booking health." },
  ],
  shieldBlocks: [
    { startMin: t(10, 40), endMin: t(13, 0), label: "Pod Sprint · No outbound noise" },
  ],
  sprints: [
    {
      id: "p_s1", index: 1, name: "Huddle + CRM Clean",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "Targets spoken. CRM clean. Pod aligned before first cold call.",
      actions: [
        { time: "10:30", do: "Stand-up — every Operator states call + tour target", output: "Targets spoken" },
        { time: "10:45–11:30", do: "CRM audit — assign next-step to ghost leads on the pod", output: "Zero ghosts" },
        { time: "11:30–12:00", do: "Listen-in on 2 cold calls. Coach in real time", output: "2 corrections" },
      ],
      metric: "100% target alignment. CRM ghost-free. 2 live coaching moments.",
    },
    {
      id: "p_s2", index: 2, name: "Field + Owner Pulse",
      startMin: t(12, 0), endMin: t(13, 15),
      objective: "Be where the deals happen. Inventory and trust check.",
      actions: [
        { time: "12:00–12:45", do: "1 ride-along with a Mid Operator", output: "Field coaching done" },
        { time: "12:45–1:15", do: "3 owner check-ins — vacancies, complaints, payments", output: "Owner pulse logged" },
      ],
      metric: "1 ride-along + 3 owner calls.",
    },
    {
      id: "p_s3", index: 3, name: "Live Coaching Block",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Floor coaching at scale. Catch the gap before EOD.",
      actions: [
        { time: "2:30–3:30", do: "Listen-in on 4 live calls. Score: ask, objection, close", output: "4 scored" },
        { time: "3:30–4:00", do: "Resolve 5 blockers escalated by Operators", output: "5 closed" },
      ],
      metric: "4 calls scored. 5 blockers closed.",
      shielded: true,
    },
    {
      id: "p_s4", index: 4, name: "Push to 70",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "Pull every Operator above 50 connections by 5 PM.",
      actions: [
        { time: "4:00–4:30", do: "Public count on the board. Name top 3, name bottom 3", output: "Board updated" },
        { time: "4:30–5:00", do: "Protected sprint for laggards — no comms, calls only", output: "Laggards in sprint" },
      ],
      metric: "All Operators on track for 70+.",
    },
    {
      id: "p_s5", index: 5, name: "1:1s + EOD",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Close the day with action plans, not vibes.",
      actions: [
        { time: "5:20–6:30", do: "1:1 with every C-player — written plan for tomorrow", output: "Plans signed" },
        { time: "6:30–7:30", do: "Pod EOD report → Nithya & Sneha", output: "Report sent" },
      ],
      metric: "Every C-player has a written plan. EOD signed.",
    },
  ],
  commWindows: [
    {
      id: "p_w1", label: "Pod Morning Brief", atMin: t(10, 35), channel: "WhatsApp Group",
      template: `🏠 Pod {{pod}} — Morning brief
Targets today:
📞 70 connections / person
🏠 16 tours booked (pod total)
💬 CRM clean by 5 PM
On-floor by 10:30. Targets stated. Let's go. 💪`,
    },
    {
      id: "p_w2", label: "Mid-Day Pod Pulse", atMin: t(13, 0), channel: "WhatsApp Group",
      template: `📊 1 PM pod pulse
Conn avg: {{avg}}/70
Tours booked: {{booked}}/16
Top: {{top}} · Push: {{push}}
Break 1:15–2:00. Back sharp. 🍽️`,
    },
    {
      id: "p_w3", label: "Specific Coaching (1:1)", atMin: t(15, 30), channel: "WhatsApp 1:1",
      template: `Hey {{name}}, listened to your {{time}} call.
When the lead said "{{quote}}" you went silent. Try: "{{better}}".
Use it in your next 3 calls. Tell me what shifts.`,
    },
    {
      id: "p_w4", label: "Pod EOD", atMin: t(19, 30), channel: "WhatsApp Group",
      template: `🌙 Pod {{pod}} EOD
Conn avg: {{avg}}/70 · Tours: {{tours}}/10
🏆 {{top}} · ⚠️ Red zone: {{red}}
1 fix tomorrow: {{fix}}`,
    },
  ],
  eodFields: [
    { id: "pod", label: "Pod / Hub name", kind: "text" },
    { id: "avg_conn", label: "Pod avg connections", kind: "number" },
    { id: "tours_done", label: "Tours done from pod", kind: "number" },
    { id: "blockers", label: "Blockers closed", kind: "number" },
    { id: "ride_alongs", label: "Ride-alongs done", kind: "number" },
    { id: "owner_calls", label: "Owner check-ins", kind: "number" },
    { id: "a", label: "A players", kind: "list" },
    { id: "c", label: "C players (with plan)", kind: "list" },
    { id: "kudos", label: "Public kudos given", kind: "list" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Moved Vikram off cold calls — pairing him with Karan." },
    { id: "flag", label: "Flag for Nithya / Sneha", kind: "text" },
  ],
};

// =================== ANANYA — TOUR CONDUCTOR (TCM) ===================
const ANANYA_TCM: RolePlaybook = {
  key: "tour_conductor",
  title: "Tour Conductor",
  subtitle: "TCM · The 6-Tour-to-2-Closing Standard",
  oneLiner:
    "Conduct visits people remember. After 6 tours, 2 must close. The ask is your job — every single time.",
  interdependence:
    "If Tour Conductor fails → Sneha's revenue engine grinds → Pod Command's bookings turn into wasted tours → owners lose trust.",
  collapseRule:
    "If 4 tours done with zero closings by 5 PM → flag Sneha at the 5 PM window with the 'missed-ask' moment.",
  ownerId: "e6",
  accent: "destructive",
  kpis: [
    { id: "tours_done", label: "Tours conducted", target: 6, kind: "count", why: "Six is the floor. Below six, no claim on output." },
    { id: "closings", label: "Closings made (after 6)", target: 2, kind: "count", why: "2 minimum. Six tours and zero = the ask was missed." },
    { id: "ask_made", label: "Explicit ask made / tour", target: 100, unit: "%", kind: "percent", why: "Every tour ends with a closing question. No exceptions." },
    { id: "showup", label: "Tour show-up rate today", target: 60, unit: "%", kind: "percent", why: "Below 60% = your confirmation calls were soft." },
    { id: "confirm_calls", label: "Confirmation calls made", target: 10, kind: "count", why: "Confirm 90 min before — every booking, every time." },
    { id: "objections_logged", label: "Objections logged with quote", target: 6, kind: "count", why: "Real words, real timestamp. Coaching gold." },
    { id: "tomorrow_locked", label: "Tomorrow's morning tours locked", target: 4, kind: "count", why: "Re-confirmed today, before you leave." },
    { id: "site_clean", label: "Site presentation OK", target: 100, unit: "%", kind: "percent", why: "If the room isn't show-ready, you don't tour it." },
    { id: "owner_intro", label: "Owner intros done", target: 2, kind: "count", why: "Trust built where the deal happens." },
    { id: "deposit_collected", label: "Deposits/holds collected", target: 1, kind: "count", why: "Money on the table or it isn't a close." },
    { id: "no_show_root", label: "No-show root causes named", target: 100, unit: "%", kind: "percent", why: "Every no-show has a reason. Logged, not guessed." },
  ],
  shieldBlocks: [],
  sprints: [
    {
      id: "a_s1", index: 1, name: "Confirmation Sweep + Site Check",
      startMin: t(11, 0), endMin: t(12, 30),
      objective: "Every tour confirmed. Every site show-ready.",
      actions: [
        { time: "11:00–11:30", do: "Confirm every tour 90 min ahead — call + WhatsApp", output: "All confirmed" },
        { time: "11:30–12:30", do: "Site walk — cleanliness, AC, water, owner ready", output: "Sites green" },
      ],
      metric: "100% confirmed. 100% sites show-ready.",
    },
    {
      id: "a_s2", index: 2, name: "Tour Block 1 — The Ask",
      startMin: t(12, 30), endMin: t(15, 30),
      objective: "Conduct 3 tours. Make the ask on every single one.",
      actions: [
        { time: "12:30–3:30", do: "3 tours back-to-back. Closing question every time", output: "3 done · 3 asks" },
      ],
      metric: "3 tours · 3 asks · objections logged with quote.",
    },
    {
      id: "a_s3", index: 3, name: "Tour Block 2 + Deposit Push",
      startMin: t(15, 30), endMin: t(18, 0),
      objective: "Conduct 3 more. Close 2. Collect deposit.",
      actions: [
        { time: "3:30–6:00", do: "3 tours. After tour #4, push for deposit on yes signals", output: "3 done · 1 deposit" },
      ],
      metric: "Total 6 tours. ≥2 closings. ≥1 deposit collected.",
    },
    {
      id: "a_s4", index: 4, name: "Tomorrow's Lock",
      startMin: t(18, 0), endMin: t(19, 0),
      objective: "Re-confirm tomorrow's morning tours before leaving.",
      actions: [
        { time: "6:00–6:45", do: "Call every 10am-1pm tour for tomorrow", output: "Confirmed" },
        { time: "6:45–7:00", do: "Brief Sneha on the missed ask + the deposit story", output: "Sneha looped" },
      ],
      metric: "100% tomorrow confirmed. Sneha briefed.",
    },
  ],
  commWindows: [
    {
      id: "a_w1", label: "Tour Confirmation (1:1)", atMin: t(11, 0), channel: "WhatsApp 1:1",
      template: `Hi {{name}} 👋 Confirming your visit at {{property}} today at {{time}}.
I'll meet you at the gate — please share your live location 15 min before.
Reply "Confirmed" ✅`,
    },
    {
      id: "a_w2", label: "Post-Tour Follow-Up", atMin: t(15, 0), channel: "WhatsApp 1:1",
      template: `Thanks for visiting today, {{name}}!
You mentioned "{{concern}}" — here's the answer: {{answer}}.
Locking the room only takes a 1-day deposit. Shall we move ahead? 🏠`,
    },
    {
      id: "a_w3", label: "Tomorrow Re-Confirm", atMin: t(18, 30), channel: "WhatsApp 1:1",
      template: `Hi {{name}} — looking forward to tomorrow at {{time}}.
The room I'm showing you is held for you only till 24h after your visit. See you sharp! 🔑`,
    },
  ],
  eodFields: [
    { id: "tours_done", label: "Tours conducted", kind: "number" },
    { id: "showup", label: "Show-up rate today (%)", kind: "number" },
    { id: "closings", label: "Closings", kind: "number" },
    { id: "deposits", label: "Deposits collected", kind: "number" },
    { id: "missed_ask", label: "The missed-ask moment (quote)", kind: "text" },
    { id: "objections", label: "Top objections today", kind: "list" },
    { id: "owners_seen", label: "Owners introduced", kind: "list" },
    { id: "tomorrow", label: "Tomorrow's morning tours locked (X/X)", kind: "text" },
    { id: "no_shows", label: "No-show reasons", kind: "list" },
    { id: "flag", label: "Flag for Sneha", kind: "text" },
  ],
};

// =================== SNEHA K — LEAD ROUTER (Flow Ops) ===================
const SNEHAK_FLOWOPS: RolePlaybook = {
  key: "lead_router",
  title: "Lead Router",
  subtitle: "Flow Ops · Air Traffic Control for Every Lead",
  oneLiner:
    "No lead waits. No Operator sits idle. You route, you load-balance, you keep the floor full.",
  interdependence:
    "If Lead Router fails → Operators run dry → Pod Command can't book tours → revenue stalls in your queue.",
  collapseRule:
    "If unassigned-lead queue > 25, OR avg first-touch > 5 min → page Pod Leads at the 1:15 PM window.",
  ownerId: "e4",
  accent: "info",
  kpis: [
    { id: "first_touch", label: "Avg first-touch time (min)", target: 3, kind: "count", why: "3 min or it goes cold." },
    { id: "unassigned", label: "Unassigned queue size", target: 0, kind: "count", why: "Every lead has an owner inside 5 min." },
    { id: "load_balance", label: "Operator load delta", target: 5, kind: "count", why: "No Operator >5 leads ahead of another." },
    { id: "dup_merged", label: "Duplicates merged", target: 10, kind: "count", why: "Duplicate leads = duplicate calls = lost trust." },
    { id: "stale_recycled", label: "Stale leads recycled (>72h)", target: 15, kind: "count", why: "Yesterday's silence is today's pipeline." },
    { id: "source_health", label: "Source health checks", target: 6, kind: "count", why: "Every channel pulse-checked twice/day." },
    { id: "spam_blocked", label: "Spam/junk leads blocked", target: 100, unit: "%", kind: "percent", why: "Don't pollute the floor's funnel." },
    { id: "tour_handoff", label: "Tour handoffs to TCM", target: 10, kind: "count", why: "Clean handoff w/ note + intent score." },
    { id: "intent_tag", label: "Intent-tagged leads", target: 100, unit: "%", kind: "percent", why: "Hot/Warm/Cold tagged before assignment." },
    { id: "wa_response", label: "WhatsApp first-reply <2 min", target: 100, unit: "%", kind: "percent", why: "Speed kills competitors." },
    { id: "queue_zero", label: "Queue zero by 7 PM", target: 1, kind: "boolean", why: "End the day with a clean board." },
  ],
  shieldBlocks: [],
  sprints: [
    {
      id: "f_s1", index: 1, name: "Inbox Zero + Source Pulse",
      startMin: t(9, 30), endMin: t(11, 30),
      objective: "Clear overnight queue. Verify every source is firing.",
      actions: [
        { time: "9:30–10:15", do: "Drain overnight queue. Tag intent. Route", output: "Queue clean" },
        { time: "10:15–11:30", do: "Pulse-check 6 sources (Housing, NoBroker, MagicBricks, Insta, Referrals, Walk-ins)", output: "All sources green" },
      ],
      metric: "Queue 0. Sources verified.",
    },
    {
      id: "f_s2", index: 2, name: "Live Routing + Load Balance",
      startMin: t(11, 30), endMin: t(14, 0),
      objective: "Route as they land. No Operator more than 5 ahead.",
      actions: [
        { time: "11:30–2:00", do: "Live routing. Merge dups. Block spam", output: "Real-time flow" },
      ],
      metric: "First-touch <3 min. Load delta ≤5.",
    },
    {
      id: "f_s3", index: 3, name: "Stale Sweep + Tour Handoffs",
      startMin: t(14, 30), endMin: t(16, 30),
      objective: "Recycle stale leads. Hand off tour-bound leads with notes.",
      actions: [
        { time: "2:30–3:30", do: "Sweep leads >72h. Recycle to fresh Operator", output: "15 recycled" },
        { time: "3:30–4:30", do: "Handoff to TCM with intent score + last quote", output: "10 handoffs" },
      ],
      metric: "15 recycled. 10 clean handoffs.",
    },
    {
      id: "f_s4", index: 4, name: "Queue-Zero Push",
      startMin: t(16, 30), endMin: t(18, 30),
      objective: "End day with empty board.",
      actions: [
        { time: "4:30–6:30", do: "Drain remaining queue. Pre-load tomorrow's morning", output: "Board clean" },
      ],
      metric: "Queue 0 by 7 PM. Tomorrow pre-loaded.",
    },
  ],
  commWindows: [
    {
      id: "f_w1", label: "Lead Assigned (1:1)", atMin: t(11, 0), channel: "WhatsApp 1:1",
      template: `🟢 New lead assigned: {{name}} · {{intent}} · Source: {{source}}
Last quote: "{{quote}}"
First touch in <3 min. Tag once contacted.`,
    },
    {
      id: "f_w2", label: "Source Health Alert", atMin: t(13, 0), channel: "Internal",
      template: `⚠️ Source pulse — {{source}}
Volume vs avg: {{delta}}
Spam %: {{spam}}
Action: {{action}}`,
    },
    {
      id: "f_w3", label: "Stale Recycle", atMin: t(15, 0), channel: "WhatsApp 1:1",
      template: `♻️ Recycled lead — {{name}} (silent 72h+).
Last note: "{{note}}". Try a fresh angle: {{angle}}.`,
    },
    {
      id: "f_w4", label: "EOD Queue Report", atMin: t(19, 0), channel: "Internal",
      template: `📦 Queue EOD
Routed: {{routed}} · Recycled: {{recycled}} · Handoffs: {{handoffs}}
First-touch avg: {{ft}} min
Tomorrow pre-load: {{preload}}`,
    },
  ],
  eodFields: [
    { id: "routed", label: "Leads routed today", kind: "number" },
    { id: "first_touch", label: "Avg first-touch (min)", kind: "number" },
    { id: "recycled", label: "Stale leads recycled", kind: "number" },
    { id: "handoffs", label: "Tour handoffs to TCM", kind: "number" },
    { id: "merged", label: "Duplicates merged", kind: "number" },
    { id: "spam", label: "Spam blocked", kind: "number" },
    { id: "weakest_source", label: "Weakest source today", kind: "text" },
    { id: "queue_zero", label: "Queue zero by 7 PM?", kind: "yesno" },
    { id: "preload", label: "Tomorrow pre-load count", kind: "number" },
    { id: "flag", label: "Flag for Pod Leads", kind: "text" },
  ],
};

// =================== MEGHA — PEOPLE PULSE (HR) ===================
const MEGHA_HR: RolePlaybook = {
  key: "people_pulse",
  title: "People Pulse",
  subtitle: "HR · Attendance, Pay, Wellbeing, Policy",
  oneLiner:
    "Own the human signal. Attendance lock by 10:35. Payroll without surprise. Pulse before it becomes a fire.",
  interdependence:
    "If People Pulse fails → attendance is fiction → payroll breaks trust → coaching loses its weapon → the floor drifts.",
  collapseRule:
    "If unverified absences > 2, OR any payroll exception unresolved by 6 PM → escalate to Divyanshu at the 6 PM window.",
  ownerId: "e8",
  accent: "warning",
  kpis: [
    { id: "att_locked", label: "Attendance locked by 10:35", target: 1, kind: "boolean", why: "After 10:35 it's a story, not a fact." },
    { id: "late_called", label: "Late arrivals called", target: 100, unit: "%", kind: "percent", why: "Every late mark gets a human call within 15 min." },
    { id: "leave_decided", label: "Leave requests decided", target: 100, unit: "%", kind: "percent", why: "No 'pending' carries past 6 PM." },
    { id: "pulse_1on1", label: "Pulse 1:1s done", target: 4, kind: "count", why: "4 quiet conversations a day. Catch fires early." },
    { id: "birthdays", label: "Birthdays/anniversaries acknowledged", target: 100, unit: "%", kind: "percent", why: "If we miss it, we're not a team." },
    { id: "payroll_exc", label: "Payroll exceptions cleared", target: 100, unit: "%", kind: "percent", why: "Trust pays compounding interest." },
    { id: "policy_q", label: "Policy questions answered", target: 100, unit: "%", kind: "percent", why: "<24h SLA. Always." },
    { id: "exit_done", label: "Exit interviews on time", target: 100, unit: "%", kind: "percent", why: "Honest exit = better hires next month." },
    { id: "onboarding_kit", label: "Onboarding kits ready (D-1)", target: 100, unit: "%", kind: "percent", why: "Day-1 chaos = month-1 attrition." },
    { id: "wellness_check", label: "C-player wellness checks", target: 2, kind: "count", why: "C is a signal. Sometimes it's burnout, not skill." },
    { id: "compliance", label: "Compliance audit clean", target: 1, kind: "boolean", why: "PF, ESI, statutory — no skipped weeks." },
  ],
  shieldBlocks: [],
  sprints: [
    {
      id: "h_s1", index: 1, name: "Attendance Lock + Late Calls",
      startMin: t(10, 0), endMin: t(11, 30),
      objective: "Attendance is a fact by 10:35. Lates have a human reason.",
      actions: [
        { time: "10:00–10:30", do: "Open biometric + manual board. Reconcile", output: "Boards live" },
        { time: "10:30–10:35", do: "LOCK attendance. Mark Present/Late/Absent", output: "Locked" },
        { time: "10:35–11:30", do: "Call every Late + Absent. Log reason", output: "All called" },
      ],
      metric: "Attendance locked. 100% lates called within 15 min.",
    },
    {
      id: "h_s2", index: 2, name: "Leaves + Payroll Exceptions",
      startMin: t(11, 30), endMin: t(13, 30),
      objective: "Decisions today, not tomorrow.",
      actions: [
        { time: "11:30–12:30", do: "Process every pending leave. Approve/reject with reason", output: "Zero pending" },
        { time: "12:30–1:30", do: "Reconcile payroll exceptions (overtime, deductions, bonuses)", output: "Exceptions cleared" },
      ],
      metric: "Leave queue 0. Payroll exceptions 0.",
    },
    {
      id: "h_s3", index: 3, name: "Pulse 1:1s + Wellness",
      startMin: t(14, 30), endMin: t(16, 30),
      objective: "Quiet conversations before quiet quitting.",
      actions: [
        { time: "2:30–4:00", do: "4 pulse 1:1s — quiet, off-floor, listen", output: "4 done" },
        { time: "4:00–4:30", do: "2 wellness checks on Pod Leads' C-list", output: "Notes logged" },
      ],
      metric: "4 pulse 1:1s. 2 wellness checks. Notes private to HR.",
    },
    {
      id: "h_s4", index: 4, name: "Onboarding + Compliance",
      startMin: t(16, 30), endMin: t(18, 30),
      objective: "Tomorrow's joiners ready. Compliance never slipping.",
      actions: [
        { time: "4:30–5:30", do: "Pack onboarding kits. Coordinate with Jiya", output: "Kits ready" },
        { time: "5:30–6:30", do: "Compliance check (PF, ESI, statutory)", output: "Clean" },
      ],
      metric: "Kits 100% ready. Compliance week clean.",
    },
  ],
  commWindows: [
    {
      id: "h_w1", label: "Late Call Script (1:1)", atMin: t(10, 45), channel: "WhatsApp 1:1",
      template: `Hi {{name}}, marking you Late today.
What happened? Reply with reason — I'll log it.
If something's off, tell me. I'd rather know.`,
    },
    {
      id: "h_w2", label: "Leave Decision (1:1)", atMin: t(13, 0), channel: "WhatsApp 1:1",
      template: `Hi {{name}}, your leave for {{date}} is {{decision}}.
{{reason}}
Logged in HRMS. Anything else, ping me.`,
    },
    {
      id: "h_w3", label: "Birthday Note", atMin: t(11, 0), channel: "WhatsApp Group",
      template: `🎂 Today we celebrate {{name}} — {{years}} years with us.
A round for {{name}}. Tonight's snack on Gharpayy. 🎉`,
    },
    {
      id: "h_w4", label: "Payroll Exception Sync", atMin: t(13, 30), channel: "Internal",
      template: `💰 Payroll exception — {{name}}
Type: {{type}} · Amount: {{amt}}
Status: {{status}} · Resolved by: {{by}}`,
    },
  ],
  eodFields: [
    { id: "att_lock_time", label: "Attendance lock time", kind: "text" },
    { id: "late", label: "Lates today", kind: "number" },
    { id: "absent", label: "Absent (unverified)", kind: "number" },
    { id: "leaves_pending", label: "Leaves still pending", kind: "number" },
    { id: "pulse_done", label: "Pulse 1:1s done", kind: "number" },
    { id: "wellness_flags", label: "Wellness flags raised", kind: "list" },
    { id: "payroll_open", label: "Payroll exceptions open", kind: "number" },
    { id: "joiners_tomorrow", label: "Joiners tomorrow (names)", kind: "list" },
    { id: "compliance", label: "Compliance status", kind: "text" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Final warning issued — 3rd unexplained late." },
    { id: "flag", label: "Flag for Divyanshu", kind: "text" },
  ],
};

// =================== OPERATOR — DAILY DAY (Operators / general teammates) ===================
const OPERATOR_DAY: RolePlaybook = {
  key: "operator_day",
  title: "Operator Day",
  subtitle: "Teammate · Calls, Tours, Closures",
  oneLiner:
    "Own your day. 70 connections, 4 tours booked, 1 closure. The pod wins because you do.",
  interdependence:
    "If your day is sloppy → Pod Lead can't deliver → TCM has no tours → the floor pretends.",
  collapseRule:
    "If <30 connections by 3 PM, OR no tour booked by 4 PM → flag your Pod Lead immediately.",
  ownerId: "e3",
  accent: "primary",
  kpis: [
    { id: "calls", label: "Calls dialed", target: 100, kind: "count", why: "Dial volume = surface area. No volume, no luck." },
    { id: "conn", label: "Connections (>30s)", target: 70, kind: "count", why: "Pod baseline. Below 70 = below standard." },
    { id: "tours_booked", label: "Tours booked today", target: 4, kind: "count", why: "Personal floor. 4 booked → 2-3 done." },
    { id: "closures", label: "Closures", target: 1, kind: "count", why: "1 a day adds up to a great month." },
    { id: "wa_replied", label: "WhatsApp chats actioned", target: 100, unit: "%", kind: "percent", why: "Zero chats older than 24h." },
    { id: "next_step", label: "Every lead has a next-step task", target: 100, unit: "%", kind: "percent", why: "No ghost leads on your CRM." },
    { id: "objections_logged", label: "Objections logged with quote", target: 5, kind: "count", why: "Real words. Coach uses them tomorrow." },
    { id: "ride_along", label: "1 site visit / week (today?)", target: 1, kind: "boolean", why: "Field knowledge beats deck knowledge." },
    { id: "kudos_given", label: "Kudos given to a teammate", target: 1, kind: "count", why: "Energy is contagious. So is silence." },
    { id: "training_module", label: "Skill module reviewed", target: 1, kind: "count", why: "10 min/day. 60 hrs/year." },
    { id: "eod_submitted", label: "EOD submitted by 7:30 PM", target: 1, kind: "boolean", why: "Numbers + 1 win + 1 ask. Every day." },
  ],
  shieldBlocks: [
    { startMin: t(10, 40), endMin: t(13, 0), label: "Sprint Block · Heads-down dialing" },
    { startMin: t(14, 0), endMin: t(17, 0), label: "Sprint Block · Heads-down dialing" },
  ],
  sprints: [
    {
      id: "o_s1", index: 1, name: "Morning Dial Block",
      startMin: t(10, 30), endMin: t(13, 0),
      objective: "Front-load the day. Dial hard before lunch.",
      actions: [
        { time: "10:30", do: "Stand-up — state target out loud", output: "Target spoken" },
        { time: "10:40–1:00", do: "Heads-down dialing. Goal: 50 calls / 35 connections by lunch", output: "50/35 by 1 PM" },
      ],
      metric: "50 calls + 35 connections by lunch.",
      shielded: true,
    },
    {
      id: "o_s2", index: 2, name: "WhatsApp + Tour Confirms",
      startMin: t(14, 0), endMin: t(15, 30),
      objective: "Action every chat. Confirm tomorrow's tours.",
      actions: [
        { time: "2:00–2:45", do: "Action every WhatsApp. Move chats older than 24h", output: "Inbox clean" },
        { time: "2:45–3:30", do: "Confirm every booked tour. Push for time-fix", output: "Tours confirmed" },
      ],
      metric: "Zero chats >24h. All tours confirmed.",
    },
    {
      id: "o_s3", index: 3, name: "Closing Block",
      startMin: t(15, 30), endMin: t(17, 0),
      objective: "Hit 70 connections. Push the closer leads.",
      actions: [
        { time: "3:30–5:00", do: "Heads-down dialing on warm + closer leads", output: "Total ≥70 connections" },
      ],
      metric: "70+ connections by 5 PM.",
      shielded: true,
    },
    {
      id: "o_s4", index: 4, name: "CRM Clean + EOD",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Clean board. EOD submitted. 1 win named.",
      actions: [
        { time: "5:20–6:30", do: "Every lead has a next-step task. Log objections", output: "CRM ghost-free" },
        { time: "6:30–7:30", do: "Submit EOD. Read 1 skill module", output: "EOD in" },
      ],
      metric: "CRM clean. EOD by 7:30. 1 module read.",
    },
  ],
  commWindows: [
    {
      id: "o_w1", label: "Morning Self-Brief", atMin: t(10, 30), channel: "Internal",
      template: `🎯 Today
Calls: __/100  ·  Conn: __/70
Tours booked: __/4  ·  Close: __/1
1 thing I will fix: ____________`,
    },
    {
      id: "o_w2", label: "Lunch Pulse", atMin: t(13, 0), channel: "Internal",
      template: `📊 Lunch check
Calls: {{c}} · Conn: {{cn}}
Behind on: {{behind}}
Plan for 2-5 PM: {{plan}}`,
    },
    {
      id: "o_w3", label: "EOD Submission (1:1)", atMin: t(19, 0), channel: "WhatsApp 1:1",
      template: `🌙 EOD — {{name}}
Calls: {{c}}/100 · Conn: {{cn}}/70
Tours booked: {{tb}}/4 · Closures: {{cl}}/1
1 win today: {{win}}
1 ask for tomorrow: {{ask}}`,
    },
  ],
  eodFields: [
    { id: "calls", label: "Calls dialed", kind: "number" },
    { id: "conn", label: "Connections", kind: "number" },
    { id: "tours_booked", label: "Tours booked", kind: "number" },
    { id: "closures", label: "Closures", kind: "number" },
    { id: "wa_clean", label: "Inbox <24h?", kind: "yesno" },
    { id: "ghost_zero", label: "CRM ghost-free?", kind: "yesno" },
    { id: "objections", label: "Top objection today (quote)", kind: "text" },
    { id: "win", label: "1 win today", kind: "text" },
    { id: "ask", label: "1 ask for Pod Lead", kind: "text" },
    { id: "module", label: "Skill module reviewed", kind: "text" },
  ],
};

export const PLAYBOOKS: Record<PlaybookKey, RolePlaybook> = {
  communication_shield: NITHYA,
  performance_enforcer: SNEHA_PE,
  training_architect: JIYA,
  talent_engine: THANVI,
  pod_command: PRIYA_POD,
  tour_conductor: ANANYA_TCM,
  lead_router: SNEHAK_FLOWOPS,
  people_pulse: MEGHA_HR,
  operator_day: OPERATOR_DAY,
};

// Map Employee.id → PlaybookKey
export const PLAYBOOK_BY_OWNER: Record<string, PlaybookKey> = {
  e12: "communication_shield",
  e13: "performance_enforcer",
  e14: "training_architect",
  e15: "talent_engine",
  e2:  "pod_command",
  e6:  "tour_conductor",
  e4:  "lead_router",
  e8:  "people_pulse",
  // Operators share the operator day playbook
  e3:  "operator_day",
  e5:  "operator_day",
  e7:  "operator_day",
  e9:  "operator_day",
  e11: "talent_engine", // Tanya runs the Talent Engine playbook too
};

export function playbookFor(employeeId: string): RolePlaybook | undefined {
  const key = PLAYBOOK_BY_OWNER[employeeId];
  return key ? PLAYBOOKS[key] : undefined;
}

export function nowMin(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const am = h < 12;
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${mm.toString().padStart(2, "0")} ${am ? "AM" : "PM"}`;
}
