// Role-specific daily flows for every role in the Gharpayy Role + KRA System (v1.0).
// Each role runs the SAME operating rhythm — only the work and the metrics differ:
//
//   10:35 AM  Day Start · Goal    → declare the goal (one number) + the 10:36
//                                   commitment for 1:15 PM
//   1:15 PM   Phase 1 Actuals     → promised vs delivered vs gap → Break 1
//   1:15–2:00 Break 1
//   2:00 PM   Recovery Commit     → break ends, commit what lands by 5:00 PM
//   5:00 PM   Phase 2 Actuals     → final gap + the 8 PM commitment → Break 2
//   5:00–5:20 Break 2
//   8:00 PM   Final Impact · Day End → outcome created, goal hit y/n, tomorrow locked
//
// One rule above everything: nobody is rewarded for being busy. Every checkpoint
// answers promise → actual → gap → next → outcome before any KPI is accepted.

import type { Playbook, StageDef } from "@/founder/lib/execution/playbooks";

export interface RoleFlow {
  roleId: string;          // stable ID from the KRA system, e.g. DEM-FLOW
  playbookId: string;      // pb_role_<slug>
  roleName: string;
  department: string;
  result: string;          // final result owned, one line
  p1: string;              // Phase 1 work
  p2: string;              // Phase 2 work
  p3: string;              // Phase 3 work
  metrics: string[];       // field ids captured each phase
  match: string[];         // lowercase keywords used to resolve a role name
}

export const ROLE_FLOWS: RoleFlow[] = [
  {
    roleId: "DEM-INTAKE", playbookId: "pb_role_dem_intake", roleName: "Lead Intake & CRM Executive", department: "Demand Operations",
    result: "Every source enquiry becomes one clean, deduplicated, correctly zoned CRM lead.",
    p1: "Reconcile every active source, create or merge leads, and clear the unprocessed intake queue.",
    p2: "Correct source, zone, urgency and minimum fields, then route assignment-ready records to the Control Tower.",
    p3: "Close source vs CRM variance, document exceptions and prepare tomorrow's channel coverage.",
    metrics: ["enquiries_captured", "leads_deduped", "wrong_zone_fixed"],
    match: ["lead intake", "intake", "crm executive"],
  },
  {
    roleId: "DEM-CONTROL", playbookId: "pb_role_dem_control", roleName: "Lead Control Tower Executive", department: "Demand Operations",
    result: "Zero unassigned active leads and every priority lead acted on within SLA.",
    p1: "Count today, 7-day and 30-day leads, then allocate work by intent, capability and current load.",
    p2: "Monitor first action, connected work, tours and stuck queues, and rebalance before capacity is wasted.",
    p3: "Clear every unassigned or overdue exception and lock next-day carry-forward.",
    metrics: ["leads_assigned", "sla_interventions", "revival_pool"],
    match: ["control tower", "lead control"],
  },
  {
    roleId: "DEM-FLOW", playbookId: "pb_role_dem_flow", roleName: "Flow Ops Executive", department: "Demand Operations",
    result: "Qualified, committed, exact-property tours from every assigned lead.",
    p1: "Work priority leads first, qualify location, budget, date and inventory, and build the immediate and future pipelines.",
    p2: "Recommend the best two options, build the dossier, validate exact inventory and secure a committed tour time.",
    p3: "Recover pending conversations, complete handovers and leave no lead without an outcome.",
    metrics: ["connected_calls", "qualified_tours", "leads_progressed"],
    match: ["flow ops", "flowops"],
  },
  {
    roleId: "DEM-REVIVE", playbookId: "pb_role_dem_revive", roleName: "Lead Revival & Stuck Queue Specialist", department: "Demand Operations",
    result: "Inactive leads return to an active buying path with a valid next action.",
    p1: "Segment the queue by age, prior objection, property and move-in date, and prioritise inventory-matched leads.",
    p2: "Run personalised call and WhatsApp sequences, and route active intent to the right current owner.",
    p3: "Complete the queue, record terminal reasons and surface repeated objections.",
    metrics: ["revival_attempts", "revival_connects", "reactivated_leads"],
    match: ["revival", "stuck queue"],
  },
  {
    roleId: "VIS-TCM", playbookId: "pb_role_vis_tcm", roleName: "Tour Conversion Manager", department: "Visit & Conversion",
    result: "Every scheduled tour has a true live status and every completed tour enters a buying path.",
    p1: "Confirm today's tours, exact inventory, manager access, travel plan and backup property.",
    p2: "Control live movement, solve delays and make sure each visit sees the approved purchasable option.",
    p3: "Capture feedback, issue the buying path, recover no-shows and hand over to closure.",
    metrics: ["tours_confirmed", "tours_completed", "post_tour_reports"],
    match: ["tour conversion", "tcm"],
  },
  {
    roleId: "VIS-WARROOM", playbookId: "pb_role_vis_warroom", roleName: "Visit War Room Controller", department: "Visit & Conversion",
    result: "Every tour today stays visible, truthfully updated and intervention-ready until final outcome.",
    p1: "Audit today's calendar, confirmation status, assigned owners, supply and high-risk visits.",
    p2: "Track en route, arrival and completion, and trigger the right owner before the experience breaks.",
    p3: "Close every tour record, route hot cases and produce root-cause exceptions for tomorrow.",
    metrics: ["tours_tracked", "delay_interventions", "noshow_recovered"],
    match: ["war room", "warroom"],
  },
  {
    roleId: "VIS-FIELD", playbookId: "pb_role_vis_field", roleName: "Field Visit Executive", department: "Visit & Conversion",
    result: "Valid visits completed on the approved room or bed with immediate handover.",
    p1: "Review itinerary, route, property facts, rooms to show, commercials and contact people.",
    p2: "Meet on time, present only relevant inventory, disclose the sample room honestly and capture objections.",
    p3: "Complete evidence, hand over hot intent immediately and report property-side failures.",
    metrics: ["visits_completed", "ontime_arrivals", "handovers_done"],
    match: ["field visit", "field executive"],
  },
  {
    roleId: "VIS-CLOSE", playbookId: "pb_role_vis_close", roleName: "Closure & Negotiation Specialist", department: "Visit & Conversion",
    result: "Paid, exact-bed, owner-honoured bookings from eligible high-intent opportunities.",
    p1: "Rank hot, tour-done, ready-to-pay and decision-due customers, and identify the single true objection.",
    p2: "Secure approved terms, present one final offer, place the exact-bed hold and collect payment.",
    p3: "Recover pending decisions, release expired holds and hand over paid bookings.",
    metrics: ["quotations", "negotiations_resolved", "paid_bookings"],
    match: ["closure", "negotiation", "closer"],
  },
  {
    roleId: "SUP-ACQ", playbookId: "pb_role_sup_acq", roleName: "Supply Acquisition Executive", department: "Supply Operations",
    result: "Verified, commercially approved, sellable bed capacity added where demand is strongest.",
    p1: "Use zone demand, lost reasons and inventory gaps to target the right owners and properties.",
    p2: "Verify the property, commercials, operating authority and sellable room or bed potential.",
    p3: "Complete the onboarding pack, reject weak supply and transfer approved property with clear commitments.",
    metrics: ["owner_conversations", "property_verifications", "beds_added"],
    match: ["supply acquisition", "acquisition"],
  },
  {
    roleId: "SUP-OWNER", playbookId: "pb_role_sup_owner", roleName: "Supply Coordinator & Owner Success Executive", department: "Supply Operations",
    result: "Fresh, owner-confirmed, tour-ready and booking-honoured inventory across the portfolio.",
    p1: "Run the daily truth: owners, available, vacating and blocked beds, tours, holds, bookings and tomorrow's check-ins.",
    p2: "Support tour access and negotiation in real time and convert every verbal commitment into a system record.",
    p3: "Clear stale inventory, reconcile bookings and close owner commitments for the day.",
    metrics: ["properties_verified", "hold_responses", "readiness_assigned"],
    match: ["supply coordinator", "owner success"],
  },
  {
    roleId: "SUP-INVENTORY", playbookId: "pb_role_sup_inventory", roleName: "Inventory Controller", department: "Supply Operations",
    result: "Accurate, fresh, uniquely addressable bed-level inventory with zero double booking.",
    p1: "Review stale beds, current availability, holds, bookings, notice dates and mismatches.",
    p2: "Process status changes and reconcile owner, booking and physical evidence at exact-bed level.",
    p3: "Lock unresolved mismatches, publish safe sellable inventory and assign tomorrow's reconciliation.",
    metrics: ["bed_updates", "mismatches_resolved", "stale_beds_cleared"],
    match: ["inventory"],
  },
  {
    roleId: "SUP-READY", playbookId: "pb_role_sup_ready", roleName: "Property Verification & Readiness Executive", department: "Supply Operations",
    result: "Verified properties and ready check-ins with no preventable failure at arrival.",
    p1: "Review due verifications and tomorrow's check-ins, and assign property contact and evidence requirements.",
    p2: "Verify cleaning, bed, storage, work setup, connectivity, utilities, access, documents and exact allocation.",
    p3: "Resolve risk, approve alternatives where required and transfer a complete readiness pack.",
    metrics: ["checkins_verified", "readiness_packs", "evidence_uploads"],
    match: ["readiness", "verification"],
  },
  {
    roleId: "SUP-OWNEREXT", playbookId: "pb_role_sup_ownerext", roleName: "Property Owner / Operator", department: "Supply Operations",
    result: "Owner commitments stay accurate, timely and honoured from availability through check-in.",
    p1: "Verify every active room and bed, and report vacancy, occupancy, notice, blocked and maintenance status.",
    p2: "Provide tour access, respond to approved commercial requests and honour timed holds.",
    p3: "Acknowledge paid bookings, prepare rooms and close unresolved commitments.",
    metrics: ["rooms_updated", "hold_responses", "bookings_acknowledged"],
    match: ["property owner", "owner /"],
  },
  {
    roleId: "SUP-PM", playbookId: "pb_role_sup_pm", roleName: "Property Manager", department: "Supply Operations",
    result: "Customers tour and check in to the correct ready room without property-side failure.",
    p1: "Review today's tours, readiness work, check-ins and open property issues.",
    p2: "Provide access, show the approved room honestly, prepare rooms and resolve assigned physical tasks.",
    p3: "Confirm execution with evidence, update occupancy and escalate unresolved property risk.",
    metrics: ["access_provided", "readiness_tasks", "issues_resolved"],
    match: ["property manager"],
  },
  {
    roleId: "CX-BOOK", playbookId: "pb_role_cx_book", roleName: "Booking & Payment Controller", department: "Booking & Customer Experience",
    result: "Verified bookings with correct money, exact Bed ID, owner acknowledgement and no duplicate allocation.",
    p1: "Review pending payments, accepted offers, expiring holds and incomplete booking packs.",
    p2: "Verify money, exact bed, commercials, customer details, owner acknowledgement and inventory transition.",
    p3: "Clear booking exceptions, hand over check-ins and reconcile amounts pending.",
    metrics: ["payments_verified", "bookings_created", "receipts_issued"],
    match: ["booking & payment", "payment controller"],
  },
  {
    roleId: "CX-CHECKIN", playbookId: "pb_role_cx_checkin", roleName: "Check-in & Customer Delight Executive", department: "Booking & Customer Experience",
    result: "Customers receive the correct ready room and confirm possession.",
    p1: "Confirm customer ETA, booking, payment, exact room or bed, readiness and property contact.",
    p2: "Guide arrival, validate allocation, complete documentation and own immediate experience issues.",
    p3: "Confirm possession, move the bed to occupied and hand over an accurate tenant record.",
    metrics: ["checkins_done", "docs_completed", "issues_resolved"],
    match: ["check-in", "checkin", "customer delight"],
  },
  {
    roleId: "CX-GUILD", playbookId: "pb_role_cx_guild", roleName: "Tenant Guild / After-Sales Executive", department: "Booking & Customer Experience",
    result: "Tenant issues are acknowledged fast, resolved with evidence and closed with tenant confirmation.",
    p1: "Triage open tickets by priority, tenant impact, age, owner and dependency.",
    p2: "Coordinate property and owner execution, keep the tenant updated and verify evidence of resolution.",
    p3: "Close only with tenant confirmation, identify repeat root causes and surface renewal opportunities.",
    metrics: ["tickets", "p1_resolved", "tenant_closures"],
    match: ["tenant guild", "after-sales", "after sales"],
  },
  {
    roleId: "QPP-QA", playbookId: "pb_role_qpp_qa", roleName: "Quality Auditor", department: "Quality & People Performance",
    result: "Evidence-backed audit findings that separate isolated error from systemic failure.",
    p1: "Select risk-based and random samples across people, zones, channels and funnel stages.",
    p2: "Score against one rubric and attach evidence for every finding.",
    p3: "Publish findings, verify corrective action and feed recurring issues into training.",
    metrics: ["call_audits", "chat_audits", "findings_published"],
    match: ["quality auditor", "auditor", "quality"],
  },
  {
    roleId: "QPP-ENFORCE", playbookId: "pb_role_qpp_enforce", roleName: "Performance Enforcer", department: "Quality & People Performance",
    result: "Every critical performance gap is actioned the same day with a measurable correction.",
    p1: "Review the exception queue: idle time, missed updates, low output, overdue work and data failures.",
    p2: "Diagnose the first broken stage, assign a measurable correction and protect customers and revenue.",
    p3: "Verify recovery, close evidence and update coaching history.",
    metrics: ["exceptions_actioned", "corrections_assigned", "recoveries_verified"],
    match: ["enforcer", "performance enforcer"],
  },
  {
    roleId: "QPP-HRMS", playbookId: "pb_role_qpp_hrms", roleName: "HRMS & Workforce Control Executive", department: "Quality & People Performance",
    result: "Attendance, today queue and daily truth are complete, owned and locked.",
    p1: "Validate roster, attendance, late and absent cases, role and zone mapping, and today queue creation.",
    p2: "Monitor updates, breaks, idle exceptions and approval workflows, and route them to managers.",
    p3: "Close exceptions, lock daily truth and prepare payroll-ready records.",
    metrics: ["roster_checks", "updates_chased", "exceptions_closed"],
    match: ["hrms", "workforce"],
  },
  {
    roleId: "LDR-TEAM", playbookId: "pb_role_ldr_team", roleName: "Team Lead", department: "Leadership & Business Management",
    result: "Team target achieved with most members at or above minimum KRA.",
    p1: "Set the team goal, assign exact workload and three priorities per person, and confirm capacity.",
    p2: "Compare plan versus actual, coach the first broken stage and reassign work.",
    p3: "Close outcomes, verify evidence and assign recovery and carry-forward.",
    metrics: ["oneones_done", "plan_vs_actual_reviews", "interventions_done"],
    match: ["team lead", "floor lead", "coach"],
  },
  {
    roleId: "LDR-ZONE", playbookId: "pb_role_ldr_zone", roleName: "Zone Lead", department: "Leadership & Business Management",
    result: "The zone booking promise is delivered with focus inventory ready and SLAs held.",
    p1: "Count today, 7-day and 30-day demand, select focus inventory and allocate booking promises.",
    p2: "Run the 1:15 PM and 5 PM control on funnel, tours, exact beds, quotations, holds, owners and people.",
    p3: "Deliver or forecast the zone result, close risks and submit one evidence-based zone truth.",
    metrics: ["zone_bookings", "focus_properties_ready", "interventions_done"],
    match: ["zone lead", "zone"],
  },
  {
    roleId: "LDR-DEPT", playbookId: "pb_role_ldr_dept", roleName: "Department Lead / Operations Manager", department: "Leadership & Business Management",
    result: "Department result delivered with clean cross-team handoffs and same-day blocker clearance.",
    p1: "Set outcome architecture, capacity, role scorecards and the few priorities that decide the day.",
    p2: "Review exceptions across demand, visits, supply, booking, experience and people, then decide resources.",
    p3: "Reconcile the business result, customer and supply health, and structural actions for the next cycle.",
    metrics: ["decisions_made", "blockers_cleared", "handoff_reviews"],
    match: ["department lead", "operations manager", "ops manager", "leadership", "admin"],
  },
  {
    roleId: "TEC-BUILD", playbookId: "pb_role_tec_build", roleName: "Technology & Product Engineer", department: "Technology",
    result: "Shipped, stable, verified software where every break that costs a booking, a tour or a payment is fixed or owned with a named root cause the same day.",
    p1: "Read the overnight signal first — errors, failed jobs, payment and booking failures, slow queries, blocked users — then reproduce each reported break on real data before touching code. Rank by money and operations lost, not by who shouted loudest: revenue-blocking, then data-integrity, then experience, then cosmetic. Convert every accepted item into a scoped ticket with a reproduction step, an owner and an expected ship window; reject or park anything without a reproduction and say so explicitly.",
    p2: "Build the committed changes only — no silent scope creep. Each change gets a self-review, an automated or manual test against production-shaped data, and a peer review before merge. Ship behind a flag where the blast radius is unclear, deploy, then watch errors, latency and the specific funnel the change touches for at least one cycle. Unblock other teams in real time: data fixes, exports, access and one-off corrections are treated as first-class work with an evidence trail, never as untracked favours.",
    p3: "Verify every shipped change live against the original reproduction, close incidents with a written root cause and a prevention step, and reopen anything not actually fixed. Clear the data-integrity checks — duplicates, orphaned records, mismatched inventory and stale statuses — and hand unresolved risk to a named owner with a deadline. Finish by locking tomorrow's build queue in priority order so the next day starts with zero triage debt.",
    metrics: ["bugs_fixed", "releases_shipped", "uptime_incidents", "prs_reviewed", "data_checks", "tech_blockers_unblocked", "regressions_caught", "rootcauses_written"],
    match: ["tech", "engineer", "developer", "product engineer", "technology"],
  },
  {
    roleId: "HR-PEOPLE", playbookId: "pb_role_hr_people", roleName: "HR & People Operations Executive", department: "People & Culture",
    result: "Every person is accounted for, measured against a known number, coached or corrected the same day, and no team is left without coverage or communication.",
    p1: "Establish the people truth before anything else: logged in vs expected, late, absent, on leave, on break beyond window, and silent-but-marked-present. Map that against role, zone and shift so every gap has a name and a covering person. Identify the day's three people risks — an uncovered critical seat, a repeat late case, and a role with no reporting yesterday — and declare who owns each. Publish the active/inactive list so leads plan against real capacity, not the roster on paper.",
    p2: "Convert the truth into movement: chase every missing checkpoint update by name, escalate second misses to the lead, and hold short performance conversations with the lowest performers using yesterday's actual numbers, not impressions. Log each conversation with the gap discussed, the correction agreed and the date it will be checked. Run the day's structured communication — policy, schedule changes, recognition, and reminders — through one channel so nobody can claim they did not know. Keep attendance, leave and exception approvals moving inside the hour so operations never wait on HR.",
    p3: "Close HR cases only with evidence and the employee's confirmation, and record the reason for anything unresolved. Reconcile attendance and leave into a payroll-clean record and lock the day's people truth. Flag repeat performance risk — three consecutive misses, sustained low output, or a broken correction commitment — into a formal track with a written next step. Publish tomorrow's people plan: expected headcount, known absences, coverage decisions and the first person you will speak to.",
    metrics: ["active_verified", "inactive_flagged", "perf_reviews", "comms_sent", "hr_cases_closed", "attendance_exceptions", "coaching_logs", "coverage_gaps_filled"],
    match: ["hr", "people ops", "people operations", "human resource"],
  },
  {
    roleId: "REC-HIRE", playbookId: "pb_role_rec_hire", roleName: "Recruitment Executive", department: "Talent Acquisition",
    result: "Role-fit candidates move from sourced to joined on a predictable clock, with no open seat unattended and no candidate left without a next step.",
    p1: "Start from open seats, not from resumes: rank every vacancy by business urgency, days open and cost of staying empty, and set today's target per seat. Source fresh role-fit profiles against a written must-have list — location, language, experience, salary band and availability — across every live channel, and clear the unscreened backlog oldest-first so nobody rots in the pipeline. Kill weak sources honestly: if a channel produced no screen-worthy profile this week, say so and reallocate the effort.",
    p2: "Run screening calls that decide something — fit, salary reality, joining date and genuine intent — and reject clearly rather than parking candidates in maybe. Schedule interviews with confirmed hiring-manager slots, brief both sides, and protect the slot with reminders so no-shows do not eat capacity. Keep every live candidate warm with an explicit next step and a date; a candidate with no next step counts as a leak, not a pipeline. Feed real market feedback — salary expectations, role objections, competitor offers — back to the hiring manager the same day the pattern appears.",
    p3: "Close the day on outcomes: offers rolled with accepted terms, joinings confirmed with a date and documents in motion, and drop reasons logged at the stage they dropped so the funnel can be fixed. Recover pending decisions personally, release seats that will not close and escalate any vacancy at risk of missing its fill date. Lock tomorrow's sourcing targets per seat and per channel so the next day opens with a queue, not a search.",
    metrics: ["sourced_profiles", "screening_calls", "interviews_scheduled", "offers_rolled", "joinings_confirmed", "interviews_completed", "pipeline_next_steps", "dropoffs_logged"],
    match: ["recruit", "recruiter", "talent acquisition", "hiring"],
  },
];

// ---- WhatsApp phase templates (kept short; the phase composer writes the full update) ----
const WA_ROLE_START = `*GHARPAYY · ON THE FLOOR*
{{name}} · {{role}} · {{time}}
I am logged in and starting my day.`;

const WA_ROLE_GOAL = `*GHARPAYY · 10:35 DAY START · GOAL*
{{name}} · {{role}} · {{time}}

Today's goal (one number): {{goal}}
Priority #1: {{mission_1}}

10:36 commitment — by 1:15 PM I will deliver: {{ap_next}}
Where I could get stuck: {{biggest_risk}}`;

const WA_ROLE_P1 = `*GHARPAYY · 1:15 PM PHASE 1 ACTUALS*
{{name}} · {{role}} · {{time}}

Promised: {{ap_promise}}
Delivered: {{ap_actual}}
Gap: {{ap_gap}} — {{ap_gap_reason}}
Outcome created: {{ap_outcome}}

Going into Break 1 (1:15–2:00).`;

const WA_ROLE_RECOVER = `*GHARPAYY · 2:00 PM RECOVERY COMMIT*
{{name}} · {{role}} · {{time}}

Break is over. Gap I am carrying: {{ap_gap}} — {{ap_gap_reason}}
By 5:00 PM I will deliver: {{ap_next}}`;

const WA_ROLE_P2 = `*GHARPAYY · 5:00 PM PHASE 2 ACTUALS*
{{name}} · {{role}} · {{time}}

Promised: {{ap_promise}}
Delivered: {{ap_actual}}
Final gap: {{ap_gap}} — {{ap_gap_reason}}
Outcome created: {{ap_outcome}}

By 8:00 PM I will deliver: {{ap_next}}
Going into Break 2 (5:00–5:20).`;

const WA_ROLE_BREAK = `*GHARPAYY · BREAK*
{{name}} · {{role}} · {{time}}
On break. Back on the floor by {{expected_finish}}.`;

const WA_ROLE_EOD = `*GHARPAYY · 8:00 PM FINAL IMPACT · DAY END*
{{name}} · {{role}} · {{time}}

Promised: {{ap_promise}}
Delivered: {{ap_actual}}
Goal hit: {{ap_goal_hit}}
Business outcome created: {{ap_outcome}}

What I delivered: {{wins}}
What held me back: {{blockers}} ({{ap_gap_reason}})
What I learned: {{learning}}
Mistake I am fixing: {{mistake}}
Tomorrow's pipeline locked · first priority: {{tomorrow_priority}}`;

const GOAL_FIELDS = [
  "goal", "mission_1", "biggest_risk", "energy",
];

/** The accountability spine — asked at every checkpoint, ahead of role KPIs. */
const ACC = ["ap_promise", "ap_actual", "ap_gap", "ap_gap_reason", "ap_outcome", "ap_next"];

/** Build the daily flow (playbook) for one role. */
export function buildRolePlaybook(f: RoleFlow): Playbook {
  const outcome = (extra: string[] = []) => [...f.metrics, "wins", "blockers", "cycle_note", ...extra];
  // Five checkpoints, nothing else. Fewer stages = fewer clicks, and every
  // checkpoint carries the accountability spine before its own KPIs.
  const stages: StageDef[] = [
    {
      id: "login", label: "Check in · 10:35", time: "10:35",
      proofs: ["selfie", "geo"], fields: [], waTemplate: WA_ROLE_START, weight: 5,
    },
    {
      id: "mission", label: "Day Start · Goal", time: "10:35–10:50",
      proofs: [], fields: [...GOAL_FIELDS, "ap_next", ...f.metrics],
      requiredFields: ["goal", "ap_next"],
      waTemplate: WA_ROLE_GOAL, weight: 15,
    },
    {
      id: "c1_outcome", label: "Phase 1 Actuals · 1:15 PM", time: "13:15",
      proofs: ["crm_ss", "whatsapp"], fields: [...ACC, ...outcome()],
      requiredFields: ["ap_promise", "ap_actual", "ap_gap", ...f.metrics],
      waTemplate: WA_ROLE_P1, weight: 18,
    },
    {
      id: "break1", label: "Break 1", time: "13:15–14:00",
      proofs: [], fields: ["expected_finish"], waTemplate: WA_ROLE_BREAK, weight: 2,
    },
    {
      id: "recovery", label: "Recovery Commit · 2:00 PM", time: "14:00",
      proofs: ["selfie"], fields: ["ap_gap", "ap_gap_reason", "ap_next", ...f.metrics],
      requiredFields: ["ap_next"], waTemplate: WA_ROLE_RECOVER, weight: 10,
    },
    {
      id: "c2_outcome", label: "Phase 2 Actuals · 5:00 PM", time: "17:00",
      proofs: ["crm_ss", "whatsapp"], fields: [...ACC, ...outcome()],
      requiredFields: ["ap_promise", "ap_actual", "ap_gap", "ap_next", ...f.metrics],
      waTemplate: WA_ROLE_P2, weight: 18,
    },
    {
      id: "break2", label: "Break 2", time: "17:00–17:20",
      proofs: [], fields: ["expected_finish"], waTemplate: WA_ROLE_BREAK, weight: 2,
    },
    {
      id: "impact", label: "Final Impact · Day End · 8:00 PM", time: "20:00",
      proofs: ["selfie", "whatsapp"],
      fields: ["ap_promise", "ap_actual", "ap_goal_hit", "ap_outcome", "ap_gap_reason",
               ...f.metrics, "wins", "blockers", "learning", "mistake", "tomorrow_priority"],
      requiredFields: ["ap_goal_hit", "ap_outcome", "wins", "tomorrow_priority", ...f.metrics],
      waTemplate: WA_ROLE_EOD, weight: 30,
    },
  ];

  return {
    id: f.playbookId,
    name: `${f.roleName}`,
    roleHint: f.roleName,
    description: `${f.department} · ${f.result}`,
    version: 1,
    active: true,
    builtIn: true,
    createdAt: 0,
    stages,
  };
}

export const ROLE_PLAYBOOKS: Playbook[] = ROLE_FLOWS.map(buildRolePlaybook);

/** Resolve a free-text role name to one of the KRA role flows. */
export function roleFlowFor(role: string): RoleFlow | undefined {
  const r = (role || "").toLowerCase();
  return ROLE_FLOWS.find((f) => f.match.some((k) => r.includes(k)))
      || ROLE_FLOWS.find((f) => f.roleName.toLowerCase() === r);
}

/** Phase labels for the day, taken straight from the operating model. */
export function phaseWorkFor(f: RoleFlow): Array<{ id: string; window: string; work: string }> {
  return [
    { id: "goal", window: "10:35–10:50 AM", work: "Declare today's goal as one number, then commit what lands by 1:15 PM." },
    { id: "morning", window: "10:50 AM–1:15 PM", work: f.p1 },
    { id: "break1", window: "1:15–2:00 PM", work: "Phase 1 actuals filed — promised vs delivered vs gap. Break 1." },
    { id: "evening", window: "2:00–5:00 PM", work: `Recovery commit, then: ${f.p2}` },
    { id: "break2", window: "5:00–5:20 PM", work: "Phase 2 actuals filed — final gap named and the 8 PM commitment locked. Break 2." },
    { id: "final", window: "5:20–8:00 PM", work: f.p3 },
    { id: "eod", window: "8:00 PM", work: "Final impact: business outcome created, goal hit yes/no, tomorrow's pipeline locked." },
  ];
}
