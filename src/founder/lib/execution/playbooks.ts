// Default playbooks — one per role + Generic + Custom.
// A playbook = ordered list of Stages; each stage declares required proofs and fields.
// Admin can clone, edit, version, and assign these in /admin/playbooks.

import { ROLE_PLAYBOOKS, roleFlowFor } from "@/founder/lib/execution/role-flows";

export type ProofKind = "selfie" | "whatsapp" | "crm_ss" | "geo" | "file";

export interface StageDef {
  id: string;
  label: string;
  icon?: string;        // lucide name
  time?: string;        // display only
  proofs: ProofKind[];  // required proofs
  fields: string[];     // field ids from field-library
  requiredFields?: string[];
  waTemplate?: string;  // Handlebars-lite; empty = no WA block
  weight?: number;      // scoring weight
}

export interface Playbook {
  id: string;
  name: string;
  roleHint: string;       // free text: "Operator", "Sales Closer", ...
  description: string;
  version: number;
  active: boolean;
  stages: StageDef[];
  createdAt: number;
  builtIn?: boolean;
}

// ---- WA template presets ----
const WA_LOGIN = `*🌅 GHARPAYY · LOGIN*
👤 {{name}} · {{role}} · {{time}}
✅ Logged in on time`;

const WA_MISSION = `*🎯 GHARPAYY · MISSION*
👤 {{name}} · {{role}} · {{time}}

Priorities:
1. {{mission_1}}
2. {{mission_2}}
3. {{mission_3}}

Goal: {{goal}}
Risk: {{biggest_risk}}
Finish by: {{expected_finish}}`;

const WA_INITIAL = `*⏰ GHARPAYY · INITIAL UPDATE*
👤 {{name}} · {{role}} · {{time}}

Wins so far: {{wins}}
Blockers: {{blockers}}
Next block priority: {{tomorrow_priority}}
KPIs: Calls {{calls}} · Connected {{connected}} · Tours {{tours_sched}}`;

const WA_ONIT = `*🔥 GHARPAYY · ON-IT UPDATE*
👤 {{name}} · {{role}} · {{time}}

Progress: {{wins}}
Still open: {{blockers}}
Push for final block: {{tomorrow_priority}}
KPIs: Calls {{calls}} · Tours done {{tours_done}} · Prebooks {{prebook}}`;

const WA_IMPACT = `*🏁 GHARPAYY · IMPACT · EOD*
👤 {{name}} · {{role}} · {{time}}

Wins: {{wins}}
Learning: {{learning}}
Mistake to fix: {{mistake}}
Tomorrow's #1: {{tomorrow_priority}}

Final KPIs:
• Calls: {{calls}}
• Tours done: {{tours_done}}
• Prebooks: {{prebook}}
• Move-ins: {{movein}}`;

const WA_SALES_EOD = `*💰 GHARPAYY · SALES EOD*
👤 {{name}} · {{role}} · {{time}}

Deals closed: {{deals}} · Revenue: ₹{{revenue}}
Calls: {{calls}} · Connected: {{connected}}
Wins: {{wins}}
Tomorrow: {{tomorrow_priority}}`;

const WA_HR_EOD = `*🧑‍💼 GHARPAYY · HR EOD*
👤 {{name}} · {{role}} · {{time}}

Screens: {{screens}} · Interviews: {{interviews}}
Offers: {{offers}} · Joiners: {{joiners}}
Pipeline: {{candidates_pipeline}}
Tomorrow: {{tomorrow_priority}}`;

const WA_MGR_EOD = `*🧭 GHARPAYY · MANAGER EOD*
👤 {{name}} · {{role}} · {{time}}

Team goal: {{team_goal_pct}}%
1:1s: {{oneones_done}} · Nudges: {{nudges_sent}}
Escalations resolved: {{escalations}}
Tomorrow's focus: {{tomorrow_priority}}`;

const WA_GENERIC_EOD = `*📌 GHARPAYY · EOD UPDATE*
👤 {{name}} · {{role}} · {{time}}

Wins: {{wins}}
Blockers: {{blockers}}
Tomorrow: {{tomorrow_priority}}`;

// ---- Shared 12-step cycle templates ----
const WA_CYCLE_PLAN = `*🧠 GHARPAYY · CYCLE PLAN*
👤 {{name}} · {{role}} · {{time}}

Prep list drafted: {{checks_drafted}}
Doors planned: {{doors_sched}}
Target this cycle → BBD {{bbd_target}} · Quotes {{quotations_target}}`;

const WA_CYCLE_CALLS = `*📞 GHARPAYY · CALL BLOCK*
👤 {{name}} · {{role}} · {{time}}

Calls placed: {{cold_calls}} · Connected: {{connected_calls}}
Doors scheduled: {{doors_sched}} · Doors initiated: {{doors_initiated}}
Note: {{cycle_note}}`;

const WA_CYCLE_OUTCOME = `*🎯 GHARPAYY · CYCLE OUTCOME*
👤 {{name}} · {{role}} · {{time}}

BBD this cycle: {{bbd}} / 3
Quotations sent: {{quotations}} / 5
Doors initiated: {{doors_initiated}}
Wins: {{wins}}
Blockers: {{blockers}}`;

const WA_BREAK = `*☕ GHARPAYY · BREAK*
👤 {{name}} · {{role}} · {{time}}
On break, back on the floor at {{expected_finish}}`;

const WA_12_EOD = `*🏁 GHARPAYY · 12-STEP IMPACT · EOD*
👤 {{name}} · {{role}} · {{time}}

Final BBD: {{bbd}} (goal 3)
Final Quotes: {{quotations}} (goal 5)
Calls placed: {{cold_calls}} · Connected: {{connected_calls}}
Doors initiated: {{doors_initiated}}
Prep list: {{checks_drafted}}

Wins: {{wins}}
Learning: {{learning}}
Mistake to fix: {{mistake}}
Tomorrow's #1: {{tomorrow_priority}}`;

// ---- Playbook factory helpers ----
function pb(p: Omit<Playbook, "createdAt" | "version" | "active" | "builtIn">): Playbook {
  return { ...p, version: 1, active: true, createdAt: Date.now(), builtIn: true };
}

// Standard 12-step cycle-based playbook used by every role.
// Each cycle = draft 30 checks → cold+connected calls → BBD + quotes outcome.
// Role-specific "flavor" adds extra fields on Mission + EOD only (BBD/quotes/calls stay universal).
interface RoleFlavor {
  id: string;              // pb_<slug>
  name: string;
  roleHint: string;
  description: string;
  missionExtras?: string[];
  eodExtras?: string[];
  eodTemplate?: string;    // optional role-specific EOD block (else WA_12_EOD)
}

function standard12(f: RoleFlavor): Playbook {
  const cycleCallFields = ["cold_calls","connected_calls","doors_sched","doors_initiated","cycle_note"];
  const cycleOutcomeFields = ["bbd","quotations","wins","blockers","tomorrow_priority"];
  return pb({
    id: f.id,
    name: f.name,
    roleHint: f.roleHint,
    description: f.description + " · 12-step cycle flow (3 cycles × draft-30 → calls → BBD/quotes) + login, mission, breaks, impact.",
    stages: [
      // 1 — Login
      { id: "login", label: "1 · Login & Selfie", time: "Start", proofs: ["selfie","geo"], fields: [], waTemplate: WA_LOGIN, weight: 5 },
      // 2 — Mission plan (targets + BBD/Quotes baked in)
      { id: "mission", label: "2 · Today's Mission", proofs: [], fields: ["mission_1","mission_2","mission_3","goal","biggest_risk","expected_finish","target_calls","target_tours","target_prebooks","target_moveins","energy","bbd","quotations", ...(f.missionExtras || [])], requiredFields: ["mission_1","goal","biggest_risk","expected_finish"], waTemplate: WA_MISSION, weight: 10 },
      // 3 — Cycle 1 · Draft 30 checks & plan doors
      { id: "c1_draft", label: "3 · Cycle 1 · Prep list + Doors plan", proofs: ["crm_ss"], fields: ["checks_drafted","doors_sched"], requiredFields: ["checks_drafted","doors_sched"], waTemplate: WA_CYCLE_PLAN, weight: 8 },
      // 4 — Cycle 1 · Call block → doors
      { id: "c1_calls", label: "4 · Cycle 1 · Call block (placed + connected)", proofs: ["whatsapp"], fields: cycleCallFields, requiredFields: ["cold_calls","connected_calls"], waTemplate: WA_CYCLE_CALLS, weight: 8 },
      // 5 — Cycle 1 · Outcome (BBD + Quotes) + Initial WA
      { id: "c1_outcome", label: "5 · Cycle 1 · BBD + Quotes outcome", proofs: ["selfie"], fields: cycleOutcomeFields, requiredFields: ["bbd","quotations"], waTemplate: WA_CYCLE_OUTCOME, weight: 10 },
      // 6 — Break 1
      { id: "break1", label: "6 · Break 1 · Recharge", time: "13:15", proofs: ["selfie"], fields: ["expected_finish"], waTemplate: WA_BREAK, weight: 3 },
      // 7 — Cycle 2 · Draft 30 checks
      { id: "c2_draft", label: "7 · Cycle 2 · Prep list + Doors plan", proofs: ["crm_ss"], fields: ["checks_drafted","doors_sched"], requiredFields: ["checks_drafted","doors_sched"], waTemplate: WA_CYCLE_PLAN, weight: 8 },
      // 8 — Cycle 2 · Call block
      { id: "c2_calls", label: "8 · Cycle 2 · Call block (placed + connected)", proofs: ["whatsapp"], fields: cycleCallFields, requiredFields: ["cold_calls","connected_calls"], waTemplate: WA_CYCLE_CALLS, weight: 8 },
      // 9 — Cycle 2 · Outcome + On-it WA
      { id: "c2_outcome", label: "9 · Cycle 2 · BBD + Quotes outcome", proofs: ["selfie","whatsapp"], fields: cycleOutcomeFields, requiredFields: ["bbd","quotations"], waTemplate: WA_CYCLE_OUTCOME, weight: 10 },
      // 10 — Break 2
      { id: "break2", label: "10 · Break 2 · Recharge", time: "17:00", proofs: ["selfie"], fields: ["expected_finish"], waTemplate: WA_BREAK, weight: 3 },
      // 11 — Cycle 3 · Final push
      { id: "c3_final", label: "11 · Cycle 3 · Final push (prep + calls + BBD + Quotes)", proofs: ["crm_ss","whatsapp"], fields: ["checks_drafted", ...cycleCallFields, "bbd","quotations","wins","blockers"], requiredFields: ["checks_drafted","bbd","quotations"], waTemplate: WA_CYCLE_OUTCOME, weight: 12 },
      // 12 — Impact EOD
      { id: "impact", label: "12 · Impact · EOD", time: "20:00", proofs: ["selfie","whatsapp"], fields: ["wins","learning","mistake","tomorrow_priority","bbd","quotations","cold_calls","connected_calls","doors_initiated","checks_drafted", ...(f.eodExtras || [])], requiredFields: ["wins","learning","tomorrow_priority","bbd","quotations"], waTemplate: f.eodTemplate || WA_12_EOD, weight: 15 },
    ],
  });
}

export const BUILT_IN_PLAYBOOKS: Playbook[] = [
  // Role-specific daily flows from the Role + KRA system (one per role).
  ...ROLE_PLAYBOOKS,

  // Every role now runs the same 12-step BBD / cold+connected / quotes cycle,
  // with role-specific extras on Mission + EOD only.
  standard12({ id: "pb_generic",     name: "Generic Employee",         roleHint: "Any",           description: "Universal 12-step cycle: works for any function." }),
  standard12({ id: "pb_generic_10x", name: "Generic · 10x Mode",       roleHint: "Any",           description: "Same 12-step cycle, 10x targets — for A-players pushing personal bests.", missionExtras: ["calls","tours_sched","prebook","movein","super_lead"], eodExtras: ["calls","tours_done","prebook","movein","super_lead","revenue"] }),
  standard12({ id: "pb_operator",    name: "Operator · Full Execution", roleHint: "Operator",      description: "GHARPAYY operator execution.", missionExtras: ["calls","tours_sched","prebook","movein"], eodExtras: ["calls","tours_done","prebook","movein","super_lead"], eodTemplate: WA_IMPACT }),
  standard12({ id: "pb_tcm",         name: "TCM · Tour Consultant",     roleHint: "TCM",           description: "Tour consultant.",              missionExtras: ["tours_sched"],                                eodExtras: ["tours_done","prebook","movein"] }),
  standard12({ id: "pb_sales",       name: "Sales Closer",              roleHint: "Sales Closer",  description: "Sales closer pipeline → close.", missionExtras: ["deals"],                                     eodExtras: ["deals","revenue","calls"], eodTemplate: WA_SALES_EOD }),
  standard12({ id: "pb_hr",          name: "HR / Recruiter",            roleHint: "HR",            description: "HR / recruiter pipeline.",       missionExtras: ["candidates_pipeline","screens","interviews"], eodExtras: ["screens","interviews","offers","joiners"], eodTemplate: WA_HR_EOD }),
  standard12({ id: "pb_floor_lead",  name: "Floor Lead / Team Coach",   roleHint: "Floor Lead",    description: "Team coaching floor.",           missionExtras: ["team_goal_pct"],                              eodExtras: ["oneones_done","nudges_sent","escalations","team_goal_pct"], eodTemplate: WA_MGR_EOD }),
  standard12({ id: "pb_coach",       name: "Coach · Training Architect",roleHint: "Coach",         description: "Training and ramp coach.",       missionExtras: ["oneones_done"],                               eodExtras: ["oneones_done","nudges_sent","joiners"], eodTemplate: WA_MGR_EOD }),
  standard12({ id: "pb_flow_ops",    name: "Flow Ops · Air-traffic",    roleHint: "Flow Ops",      description: "Lead flow orchestration.",       missionExtras: ["leads_generated"],                            eodExtras: ["leads_generated","escalations","sla_flags"] }),
  standard12({ id: "pb_ops_mgr",     name: "Ops Manager",               roleHint: "Ops Manager",   description: "Ops manager, sites & SLA.",      missionExtras: ["site_checks"],                                eodExtras: ["site_checks","escalations","sla_flags"] }),
  standard12({ id: "pb_marketing",   name: "Marketing",                 roleHint: "Marketing",     description: "Marketing / growth.",            missionExtras: ["leads_generated","campaigns_shipped"],        eodExtras: ["leads_generated","campaigns_shipped","spend"] }),
  standard12({ id: "pb_finance",     name: "Finance",                   roleHint: "Finance",       description: "Finance / collections.",         missionExtras: ["collections"],                                eodExtras: ["collections","invoices","reconciled"] }),
  standard12({ id: "pb_support",     name: "Support",                   roleHint: "Support",       description: "Support / CSAT.",                missionExtras: ["tickets","frt_mins"],                         eodExtras: ["tickets","frt_mins","csat"] }),
  standard12({ id: "pb_leadership",  name: "Leadership · War Room",     roleHint: "Leadership",    description: "Leadership war room.",           missionExtras: ["hard_decision"],                              eodExtras: ["hard_decision"] }),
  standard12({ id: "pb_admin",       name: "Admin · System Owner",      roleHint: "Admin",         description: "Admin operating the system.",    missionExtras: ["hard_decision"],                              eodExtras: ["hard_decision","escalations"], eodTemplate: WA_MGR_EOD }),
  standard12({ id: "pb_owner",       name: "Property Owner",            roleHint: "Owner",         description: "Property partner playbook.",     missionExtras: ["site_checks"],                                eodExtras: ["site_checks","collections"] }),

  // -------- Sub-Intern (1:30 PM → 8:00 PM, one break 5:00–5:20) --------
  pb({
    id: "pb_sub_intern",
    name: "Sub-Intern · Half-day 12-step",
    roleHint: "Sub-Intern",
    description: "Half-day schedule: 13:30 start · single break 17:00–17:20 · 20:00 logout. Same 12-step BBD/calls/quotes discipline, compressed.",
    stages: [
      { id: "login",     label: "1 · Login & Selfie",                          time: "13:30",       proofs: ["selfie","geo"], fields: [], waTemplate: WA_LOGIN, weight: 5 },
      { id: "mission",   label: "2 · Today's Mission (BBD 3 · Quotes 5)",       time: "13:35",       proofs: [],               fields: ["mission_1","mission_2","goal","biggest_risk","expected_finish","target_calls","target_tours","target_prebooks","target_moveins","energy","bbd","quotations"], requiredFields: ["mission_1","goal","biggest_risk","expected_finish"], waTemplate: WA_MISSION, weight: 10 },
      { id: "c1_draft",  label: "3 · Cycle 1 · Prep list + Doors plan",   time: "13:45–14:15", proofs: ["crm_ss"],       fields: ["checks_drafted","doors_sched"], requiredFields: ["checks_drafted","doors_sched"], waTemplate: WA_CYCLE_PLAN, weight: 8 },
      { id: "c1_calls",  label: "4 · Cycle 1 · Call block (placed + connected)", time: "14:15–15:30", proofs: ["whatsapp"],     fields: ["cold_calls","connected_calls","doors_sched","doors_initiated","cycle_note"], requiredFields: ["cold_calls","connected_calls"], waTemplate: WA_CYCLE_CALLS, weight: 8 },
      { id: "c1_outcome",label: "5 · Cycle 1 · BBD + Quotes outcome",            time: "15:30–16:30", proofs: ["selfie"],       fields: ["bbd","quotations","wins","blockers","tomorrow_priority"], requiredFields: ["bbd","quotations"], waTemplate: WA_CYCLE_OUTCOME, weight: 10 },
      { id: "pre_break", label: "6 · Pre-break Initial Update",                  time: "16:30–17:00", proofs: ["selfie","whatsapp"], fields: ["wins","blockers","tomorrow_priority","cold_calls","connected_calls","bbd"], requiredFields: ["wins"], waTemplate: WA_INITIAL, weight: 8 },
      { id: "break1",    label: "7 · Break (only break)",                        time: "17:00–17:20", proofs: ["selfie"],       fields: ["expected_finish"], waTemplate: WA_BREAK, weight: 3 },
      { id: "resume",    label: "8 · Resume · Second half",                      time: "17:20",       proofs: ["selfie"],       fields: [], waTemplate: WA_LOGIN, weight: 3 },
      { id: "c2_draft",  label: "9 · Cycle 2 · Prep list + Doors plan",   time: "17:20–18:15", proofs: ["crm_ss"],       fields: ["checks_drafted","doors_sched"], requiredFields: ["checks_drafted","doors_sched"], waTemplate: WA_CYCLE_PLAN, weight: 8 },
      { id: "c2_calls",  label: "10 · Cycle 2 · Call block (placed + connected)", time: "18:15–19:15", proofs: ["whatsapp"],     fields: ["cold_calls","connected_calls","doors_sched","doors_initiated","cycle_note"], requiredFields: ["cold_calls","connected_calls"], waTemplate: WA_CYCLE_CALLS, weight: 8 },
      { id: "c2_outcome",label: "11 · Cycle 2 · BBD + Quotes + On-it WA",        time: "19:15–19:50", proofs: ["selfie","whatsapp"], fields: ["bbd","quotations","wins","blockers","tomorrow_priority"], requiredFields: ["bbd","quotations"], waTemplate: WA_CYCLE_OUTCOME, weight: 12 },
      { id: "impact",    label: "12 · Impact · Logout",                          time: "20:00",       proofs: ["selfie","whatsapp"], fields: ["wins","learning","mistake","tomorrow_priority","bbd","quotations","cold_calls","connected_calls","doors_initiated","checks_drafted"], requiredFields: ["wins","learning","tomorrow_priority","bbd","quotations"], waTemplate: WA_12_EOD, weight: 15 },
    ],
  }),
];

// ---- Playbook store (localStorage) ----
const KEY = "gp_playbooks_v1";
const ASSIGN_KEY = "gp_playbook_assignments_v1";
const OVERRIDE_KEY = "gp_playbook_overrides_v1";

interface PbState { extras: Playbook[]; disabledBuiltIn: string[] }
function readPb(): PbState {
  if (typeof window === "undefined") return { extras: [], disabledBuiltIn: [] };
  try { return JSON.parse(localStorage.getItem(KEY) || "null") || { extras: [], disabledBuiltIn: [] }; }
  catch { return { extras: [], disabledBuiltIn: [] }; }
}
function writePb(s: PbState) { localStorage.setItem(KEY, JSON.stringify(s)); notify(); }

const subs = new Set<() => void>();
let ver = 0;
function notify() { ver++; subs.forEach((f) => f()); }
export function subscribePlaybooks(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; }
export function playbooksVersion() { return ver; }

export function getAllPlaybooks(): Playbook[] {
  const s = readPb();
  const disabled = new Set(s.disabledBuiltIn);
  return [...BUILT_IN_PLAYBOOKS.filter((p) => !disabled.has(p.id)), ...s.extras];
}
export function getPlaybook(id: string): Playbook | undefined {
  return getAllPlaybooks().find((p) => p.id === id);
}
export function upsertPlaybook(p: Playbook) {
  const s = readPb();
  const i = s.extras.findIndex((x) => x.id === p.id);
  if (i >= 0) s.extras[i] = p; else s.extras.push(p);
  writePb(s);
}
export function deletePlaybook(id: string) {
  const s = readPb();
  if (BUILT_IN_PLAYBOOKS.some((p) => p.id === id)) {
    if (!s.disabledBuiltIn.includes(id)) s.disabledBuiltIn.push(id);
  } else {
    s.extras = s.extras.filter((p) => p.id !== id);
  }
  writePb(s);
}
export function clonePlaybook(id: string, newName: string): Playbook | undefined {
  const src = getPlaybook(id);
  if (!src) return;
  const clone: Playbook = {
    ...src,
    id: `pb_custom_${Date.now()}`,
    name: newName,
    version: 1,
    createdAt: Date.now(),
    builtIn: false,
    stages: src.stages.map((s) => ({ ...s })),
  };
  upsertPlaybook(clone);
  return clone;
}

// ---- Assignments (userId -> playbookId) ----
type Assignments = Record<string, string>;
function readAssign(): Assignments {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || "{}"); } catch { return {}; }
}
function writeAssign(a: Assignments) { localStorage.setItem(ASSIGN_KEY, JSON.stringify(a)); notify(); }

export function getAssignment(userId: string): string | undefined { return readAssign()[userId]; }
export function setAssignment(userId: string, playbookId: string) {
  const a = readAssign();
  a[userId] = playbookId;
  writeAssign(a);
}
export function clearAssignment(userId: string) {
  const a = readAssign();
  delete a[userId];
  writeAssign(a);
}
export function getAllAssignments(): Assignments { return readAssign(); }

// ---- Per-user overrides ----
// key: userId -> { hiddenStages: string[], hiddenFields: {stageId:string[]}, requiredExtras: {stageId:string[]}, extraFields: {stageId:string[]} }
export interface UserOverride {
  hiddenStages?: string[];
  hiddenFields?: Record<string, string[]>;
  extraFields?: Record<string, string[]>;
  extraRequired?: Record<string, string[]>;
  targets?: Record<string, number>; // fieldId -> target override
}
type Overrides = Record<string, UserOverride>;
function readOv(): Overrides {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "{}"); } catch { return {}; }
}
function writeOv(o: Overrides) { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o)); notify(); }
export function getOverride(userId: string): UserOverride { return readOv()[userId] || {}; }
export function setOverride(userId: string, ov: UserOverride) { const o = readOv(); o[userId] = ov; writeOv(o); }
export function clearOverride(userId: string) { const o = readOv(); delete o[userId]; writeOv(o); }

// ---- Resolver: playbook + overrides -> effective stages ----
export function resolvePlaybookFor(userId: string, fallbackByRole?: (u: string) => string | undefined): Playbook | undefined {
  const assigned = getAssignment(userId) || (fallbackByRole && fallbackByRole(userId));
  const pb = assigned ? getPlaybook(assigned) : undefined;
  if (!pb) return undefined;
  const ov = getOverride(userId);
  const hiddenStages = new Set(ov.hiddenStages || []);
  const stages: StageDef[] = [];
  for (const s of pb.stages) {
    if (hiddenStages.has(s.id)) continue;
    const hidden = new Set(ov.hiddenFields?.[s.id] || []);
    const extras = ov.extraFields?.[s.id] || [];
    const extraReq = ov.extraRequired?.[s.id] || [];
    const fields = [...s.fields.filter((f) => !hidden.has(f)), ...extras];
    const requiredFields = Array.from(new Set([...(s.requiredFields || []).filter((f) => !hidden.has(f)), ...extraReq]));
    stages.push({ ...s, fields, requiredFields });
  }
  return { ...pb, stages };
}

// Suggested role → playbook mapping used when no explicit assignment
export function defaultPlaybookForRole(role: string): string {
  const r = (role || "").toLowerCase();
  const flow = roleFlowFor(r);
  if (flow) return flow.playbookId;
  if (r.includes("sub-intern") || r.includes("sub intern")) return "pb_sub_intern";
  if (r.includes("intern")) return "pb_sub_intern";

  if (r.includes("flow ops") || r.includes("flowops")) return "pb_flow_ops";
  if (r.includes("floor") || r.includes("coach") && r.includes("lead")) return "pb_floor_lead";
  if (r.includes("coach")) return "pb_coach";
  if (r.includes("tcm") || r.includes("tour")) return "pb_tcm";
  if (r.includes("sales") || r.includes("closer")) return "pb_sales";
  if (r.includes("recruit")) return "pb_hr";
  if (r.includes("hr")) return "pb_hr";
  if (r.includes("ops manager")) return "pb_ops_mgr";
  if (r.includes("market")) return "pb_marketing";
  if (r.includes("finance")) return "pb_finance";
  if (r.includes("support")) return "pb_support";
  if (r.includes("owner")) return "pb_owner";
  if (r.includes("admin")) return "pb_admin";
  if (r.includes("leadership") || r.includes("lead")) return "pb_leadership";
  if (r.includes("operator")) return "pb_operator";
  return "pb_generic";
}