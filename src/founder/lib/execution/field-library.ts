// Field library — the palette admins pick from when building playbooks.
// 40+ prebuilt fields grouped by function; admins can add custom fields at runtime.
import { ROLE_METRIC_FIELDS } from "@/founder/lib/execution/role-metrics";


export type FieldType =
  | "text" | "longtext" | "number" | "currency" | "percent"
  | "select" | "multiselect" | "energy" | "sentiment" | "risk"
  | "checkbox" | "kpiChip" | "time" | "date";

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  group: string;
  unit?: string;
  options?: string[];
  placeholder?: string;
  defaultTarget?: number;
  description?: string;
  archived?: boolean;
  custom?: boolean;
}

export const DEFAULT_FIELDS: FieldDef[] = [
  // Mission / reflection
  { id: "mission_1", label: "Priority #1", type: "text", group: "Mission", placeholder: "Most important thing today" },
  { id: "mission_2", label: "Priority #2", type: "text", group: "Mission" },
  { id: "mission_3", label: "Priority #3", type: "text", group: "Mission" },
  { id: "goal", label: "Measurable goal", type: "longtext", group: "Mission", placeholder: "70 calls, 10 tours, 3 prebooks" },
  { id: "biggest_risk", label: "Biggest risk", type: "text", group: "Mission" },
  { id: "expected_finish", label: "Expected finish time", type: "time", group: "Mission" },
  { id: "tomorrow_priority", label: "Tomorrow's first priority", type: "text", group: "Reflection" },
  { id: "wins", label: "Wins", type: "longtext", group: "Reflection" },
  { id: "learning", label: "Learning", type: "longtext", group: "Reflection" },
  { id: "mistake", label: "Mistake / what to fix", type: "longtext", group: "Reflection" },
  { id: "blockers", label: "Blockers", type: "longtext", group: "Reflection" },
  { id: "reflection", label: "Reflection", type: "longtext", group: "Reflection" },
  { id: "hard_decision", label: "Hard decision made", type: "longtext", group: "Reflection" },

  // Energy / state
  { id: "energy", label: "Energy level", type: "energy", group: "State" },
  { id: "energy_reason", label: "Energy reason", type: "text", group: "State" },
  { id: "sentiment", label: "Sentiment", type: "sentiment", group: "State" },
  { id: "risk_flag", label: "Risk flag", type: "risk", group: "State" },

  // Sales / operator KPIs
  { id: "calls", label: "Calls made", type: "kpiChip", group: "Sales", unit: "calls", defaultTarget: 70 },
  { id: "connected", label: "Calls connected", type: "kpiChip", group: "Sales", defaultTarget: 40 },
  { id: "tours_sched", label: "Tours scheduled", type: "kpiChip", group: "Sales", defaultTarget: 10 },
  { id: "tours_done", label: "Tours done", type: "kpiChip", group: "Sales", defaultTarget: 6 },
  { id: "prebook", label: "Prebooks", type: "kpiChip", group: "Sales", defaultTarget: 3 },
  { id: "movein", label: "Move-ins", type: "kpiChip", group: "Sales", defaultTarget: 1 },
  { id: "super_lead", label: "Super leads", type: "kpiChip", group: "Sales", defaultTarget: 2 },
  { id: "reinstate", label: "Reinstates", type: "kpiChip", group: "Sales", defaultTarget: 1 },
  { id: "deals", label: "Deals closed", type: "kpiChip", group: "Sales", defaultTarget: 2 },
  { id: "revenue", label: "Revenue", type: "currency", group: "Sales", unit: "₹" },

  // Comms
  { id: "chats", label: "Chats handled", type: "kpiChip", group: "Comms", defaultTarget: 30 },
  { id: "wa_unread", label: "WA unread count", type: "number", group: "Comms" },
  { id: "sla_flags", label: "SLA flags raised", type: "number", group: "Comms" },

  // Core cycle KPIs (shared across all 12-step playbooks)
  { id: "bbd", label: "Beds Booked (BBD)", type: "kpiChip", group: "Sales", unit: "beds", defaultTarget: 3, description: "Beds booked today — 3 is the daily goal" },
  { id: "cold_calls", label: "Calls placed", type: "kpiChip", group: "Sales", defaultTarget: 30, description: "Outbound calls placed this cycle" },
  { id: "connected_calls", label: "Calls connected", type: "kpiChip", group: "Sales", defaultTarget: 15, description: "Calls that actually connected" },
  // Mission-stage goals (planned numbers set at the start of the day)
  { id: "target_calls", label: "Goal · Calls", type: "number", group: "Mission", defaultTarget: 70, description: "Calls planned for today" },
  { id: "target_tours", label: "Goal · Tours", type: "number", group: "Mission", defaultTarget: 10, description: "Tours planned for today" },
  { id: "target_prebooks", label: "Goal · Prebooks", type: "number", group: "Mission", defaultTarget: 3, description: "Prebooks planned for today" },
  { id: "target_moveins", label: "Goal · Move-ins", type: "number", group: "Mission", defaultTarget: 1, description: "Move-ins planned for today" },
  { id: "doors_sched", label: "Doors scheduled", type: "kpiChip", group: "Sales", defaultTarget: 5, description: "Door visits / tours scheduled from calls" },
  { id: "doors_initiated", label: "Doors initiated", type: "kpiChip", group: "Sales", defaultTarget: 3, description: "Doors actually initiated / knocked" },
  { id: "quotations", label: "Quotations sent", type: "kpiChip", group: "Sales", defaultTarget: 5, description: "Quotes shared with prospects, 5 per day goal" },
  { id: "checks_drafted", label: "Prep list drafted", type: "kpiChip", group: "Sales", defaultTarget: 30, description: "Prep list items drafted this cycle before doors planning" },
  { id: "cycle_note", label: "Cycle note", type: "longtext", group: "Reflection", placeholder: "Short recap of what this cycle produced" },

  // HR / Recruiting
  { id: "screens", label: "Screens", type: "kpiChip", group: "HR", defaultTarget: 6 },
  { id: "interviews", label: "Interviews", type: "kpiChip", group: "HR", defaultTarget: 3 },
  { id: "offers", label: "Offers sent", type: "kpiChip", group: "HR", defaultTarget: 1 },
  { id: "joiners", label: "Joiners", type: "kpiChip", group: "HR", defaultTarget: 1 },
  { id: "candidates_pipeline", label: "Candidates in pipeline", type: "number", group: "HR" },

  // Manager / leader
  { id: "oneones_done", label: "1:1s completed", type: "kpiChip", group: "Manager", defaultTarget: 3 },
  { id: "nudges_sent", label: "Nudges sent", type: "kpiChip", group: "Manager", defaultTarget: 5 },
  { id: "team_goal_pct", label: "Team goal %", type: "percent", group: "Manager" },
  { id: "escalations", label: "Escalations resolved", type: "kpiChip", group: "Manager" },

  // Marketing / finance / support
  { id: "leads_generated", label: "Leads generated", type: "kpiChip", group: "Marketing", defaultTarget: 20 },
  { id: "campaigns_shipped", label: "Campaigns shipped", type: "kpiChip", group: "Marketing" },
  { id: "spend", label: "Ad spend", type: "currency", group: "Marketing", unit: "₹" },
  { id: "collections", label: "Collections", type: "currency", group: "Finance", unit: "₹" },
  { id: "invoices", label: "Invoices raised", type: "kpiChip", group: "Finance" },
  { id: "reconciled", label: "Reconciled entries", type: "kpiChip", group: "Finance" },
  { id: "tickets", label: "Tickets resolved", type: "kpiChip", group: "Support", defaultTarget: 15 },
  { id: "frt_mins", label: "First response time (min)", type: "number", group: "Support" },
  { id: "csat", label: "CSAT %", type: "percent", group: "Support" },

  // Field ops
  { id: "site_checks", label: "Site checks done", type: "kpiChip", group: "Ops" },
  { id: "tags", label: "Tags", type: "multiselect", group: "Meta", options: ["Urgent", "Client", "Internal", "Follow-up"] },

  // ---- Accountability spine: promise → actual → gap → next → outcome ----
  // Present at EVERY checkpoint, ahead of role KPIs, so no checkpoint can be
  // filed as pure activity. Keyword options keep it to taps, not typing.
  { id: "ap_promise", label: "What I promised for this checkpoint", type: "text", group: "Accountability", placeholder: "One number — e.g. 40 calls, 3 tours" },
  { id: "ap_actual", label: "What I actually delivered", type: "text", group: "Accountability", placeholder: "One number — the real one" },
  { id: "ap_gap", label: "Gap", type: "select", group: "Accountability", options: ["Ahead", "On target", "Slight gap", "Big gap", "Missed"] },
  { id: "ap_gap_reason", label: "Why the gap", type: "select", group: "Accountability", options: ["No gap", "Low connects", "Lead quality", "No inventory", "Customer delay", "Owner delay", "Waiting on approval", "System / CRM", "Travel time", "Started late", "My execution"] },
  { id: "ap_next", label: "Next commitment (by the next checkpoint)", type: "text", group: "Accountability", placeholder: "One number I will land next" },
  { id: "ap_outcome", label: "Business outcome created", type: "select", group: "Accountability", options: ["Revenue booked", "Bed booked", "Tour secured", "Payment collected", "Supply added", "Pipeline built", "Risk removed", "Nothing yet"] },
  { id: "ap_goal_hit", label: "Goal hit?", type: "select", group: "Accountability", options: ["Yes", "No", "Partial"] },
];

// ---- Runtime field library store (localStorage; admin can add / archive) ----
const KEY = "gp_field_library_v1";
type FieldStore = { fields: FieldDef[]; deletedDefaults: string[] };

function read(): FieldStore {
  if (typeof window === "undefined") return { fields: [], deletedDefaults: [] };
  try { return JSON.parse(localStorage.getItem(KEY) || "null") || { fields: [], deletedDefaults: [] }; }
  catch { return { fields: [], deletedDefaults: [] }; }
}
function write(s: FieldStore) { localStorage.setItem(KEY, JSON.stringify(s)); notify(); }
const subs = new Set<() => void>();
let ver = 0;
function notify() { ver++; subs.forEach((f) => f()); }
export function subscribeFields(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; }
export function fieldsVersion() { return ver; }

export function getAllFields(): FieldDef[] {
  const s = read();
  const deleted = new Set(s.deletedDefaults);
  const known = new Set(DEFAULT_FIELDS.map((f) => f.id));
  const roleFields = (ROLE_METRIC_FIELDS as FieldDef[]).filter((f) => !known.has(f.id) && !deleted.has(f.id));
  const defaults = DEFAULT_FIELDS.filter((f) => !deleted.has(f.id));
  return [...defaults, ...roleFields, ...s.fields];
}

export function getField(id: string): FieldDef | undefined {
  return getAllFields().find((f) => f.id === id);
}
export function addCustomField(f: Omit<FieldDef, "custom">) {
  const s = read();
  if (getAllFields().some((x) => x.id === f.id)) throw new Error("Field id exists");
  s.fields.push({ ...f, custom: true });
  write(s);
}
export function updateField(id: string, patch: Partial<FieldDef>) {
  const s = read();
  const i = s.fields.findIndex((f) => f.id === id);
  if (i >= 0) { s.fields[i] = { ...s.fields[i], ...patch }; write(s); }
}
export function archiveField(id: string) {
  const s = read();
  if (DEFAULT_FIELDS.some((d) => d.id === id)) {
    if (!s.deletedDefaults.includes(id)) s.deletedDefaults.push(id);
  } else {
    s.fields = s.fields.filter((f) => f.id !== id);
  }
  write(s);
}
export function restoreDefault(id: string) {
  const s = read();
  s.deletedDefaults = s.deletedDefaults.filter((x) => x !== id);
  write(s);
}

export const FIELD_GROUPS = [
  "Mission", "Reflection", "State", "Sales", "Comms",
  "HR", "Manager", "Marketing", "Finance", "Support", "Ops", "Meta", "Custom",
];