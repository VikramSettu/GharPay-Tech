// Zone Command Center metrics.
// Deterministic, seed-derived numbers so Company → Zone → Role → Person all agree.
import { EMPLOYEES, type Employee } from "@/founder/data/seed";
import { crmBlockFor } from "@/founder/lib/crm-link";

export type Health = "green" | "amber" | "red";

export type Scope = {
  kind: "company" | "zones" | "role" | "manager" | "person";
  zones: string[];
  role?: string;
  managerId?: string;
  personId?: string;
};

export type Period =
  | "live"
  | "last60"
  | "today"
  | "cp_1pm"
  | "cp_4pm"
  | "cp_5pm"
  | "eod"
  | "week"
  | "month";

export const PERIOD_LABEL: Record<Period, string> = {
  live: "Live",
  last60: "Last 60 minutes",
  today: "Today",
  cp_1pm: "1 PM checkpoint",
  cp_4pm: "4 PM checkpoint",
  cp_5pm: "5 PM checkpoint",
  eod: "8 PM / EOD",
  week: "This week",
  month: "This month",
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick(seed: string, min: number, max: number): number {
  return min + (hash(seed) % (max - min + 1));
}

export function dayStamp(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Zones that actually run operations (HQ / All are company-level). */
export function allZones(): string[] {
  const set = new Set<string>();
  EMPLOYEES.forEach((e) => {
    if (e.zone && e.zone !== "All" && e.zone !== "HQ") set.add(e.zone);
  });
  return Array.from(set).sort();
}

export function peopleInScope(scope: Scope): Employee[] {
  let list = EMPLOYEES.slice();
  if (scope.kind === "person" && scope.personId) return list.filter((e) => e.id === scope.personId);
  if (scope.kind === "manager" && scope.managerId)
    return list.filter((e) => e.managerId === scope.managerId || e.id === scope.managerId);
  if (scope.zones.length) list = list.filter((e) => e.zone && scope.zones.includes(e.zone));
  if (scope.kind === "role" && scope.role) list = list.filter((e) => e.role === scope.role);
  return list;
}

export type Block = {
  people: {
    expected: number;
    present: number;
    absent: number;
    leave: number;
    active: number;
    onBreak: number;
    idle: number;
    blocked: number;
    atRisk: number;
    productive: number;
  };
  reporting: { gm: number; cp1: number; cp4: number; cp5: number; eod: number; compliance: number };
  demand: { newLeads: number; activeLeads: number; assigned: number; unassigned: number };
  chats: { active: number; waitingCustomer: number; waitingUs: number; slaBreached: number; noNextAction: number };
  tours: { scheduled: number; confirmed: number; enRoute: number; completed: number; noShow: number; unconfirmed: number };
  closing: { highIntent: number; quotesOpen: number; paymentPending: number; paymentReceived: number; bookings: number; bbdTarget: number };
  management: { supportPending: number; supportBreached: number; managerActions: number; reconciliationIssues: number };
};

function blockFor(list: Employee[], key: string): Block {
  const expected = Math.max(list.length, 1);
  const present = list.filter((e) => e.status !== "Offline").length;
  const late = list.filter((e) => e.status === "Late").length;
  const idle = list.filter((e) => e.status === "Idle").length;
  const active = Math.max(present - idle, 0);
  const atRisk = list.filter((e) => e.performance < 75 || e.flags.length > 0).length;
  // Real CRM numbers for exactly these people.
  const crm = crmBlockFor(key === "company" ? null : list.map((e) => e.id));
  // Reporting compliance = people who actually moved work today (logged a call
  // or hold no call target) out of everyone present.
  const reported = list.filter((e) => e.callsToday > 0 || e.callTarget === 0).length;
  const compliance = present ? Math.round((Math.min(reported, present) / present) * 100) : 100;


  return {
    people: {
      expected,
      present,
      absent: Math.max(expected - present, 0),
      leave: 0,
      active,
      onBreak: 0,
      idle,
      blocked: list.filter((e) => e.flags.some((f) => /overdue|blocked/i.test(f))).length,
      atRisk,
      productive: list.filter((e) => e.status === "Active" && e.callsToday > 0).length,
    },
    reporting: {
      gm: present,
      cp1: Math.max(present - late, 0),
      cp4: Math.max(present - late, 0),
      cp5: Math.max(present - late, 0),
      eod: Math.max(present - late, 0),
      compliance,
    },
    demand: crm.demand,
    chats: crm.chats,
    tours: crm.tours,
    closing: crm.closing,
    management: crm.management,
  };
}


export function companyBlock(): Block {
  return blockFor(EMPLOYEES, "company");
}

export function scopeBlock(scope: Scope): Block {
  const list = peopleInScope(scope);
  const key = `${scope.kind}:${scope.zones.join("+")}:${scope.role ?? ""}:${scope.personId ?? ""}:${scope.managerId ?? ""}` || "company";
  return blockFor(list, key);
}

export type ZoneRow = { zone: string; block: Block; health: Health; components: { label: string; pct: number }[] };

export function zoneRows(): ZoneRow[] {
  return allZones().map((zone) => {
    const list = EMPLOYEES.filter((e) => e.zone === zone);
    const block = blockFor(list, `zone:${zone}`);
    const components = [
      { label: "Workforce", pct: Math.round((block.people.active / Math.max(block.people.expected, 1)) * 100) },
      { label: "Lead ownership", pct: Math.round((block.demand.assigned / Math.max(block.demand.activeLeads, 1)) * 100) },
      { label: "Chat health", pct: Math.max(100 - block.chats.waitingUs * 4 - block.chats.slaBreached * 3, 40) },
      { label: "Tour movement", pct: Math.round((block.tours.completed / Math.max(block.tours.scheduled, 1)) * 100) + 30 },
      { label: "Closing", pct: Math.round((block.closing.bookings / Math.max(block.closing.bbdTarget, 1)) * 100) },
      { label: "Reporting", pct: block.reporting.compliance },
      { label: "SLA", pct: Math.max(100 - block.chats.slaBreached * 5, 60) },
      { label: "Reconciliation", pct: block.management.reconciliationIssues ? 88 : 100 },
    ].map((c) => ({ ...c, pct: Math.min(c.pct, 100) }));
    const avg = components.reduce((s, c) => s + c.pct, 0) / components.length;
    const health: Health = avg >= 92 ? "green" : avg >= 84 ? "amber" : "red";
    return { zone, block, health, components };
  });
}

export function healthDot(h: Health): string {
  return h === "green" ? "🟢" : h === "amber" ? "🟠" : "🔴";
}

export function healthClass(h: Health): string {
  return h === "green"
    ? "bg-success/10 text-success border-success/30"
    : h === "amber"
      ? "bg-warning/10 text-warning border-warning/30"
      : "bg-destructive/10 text-destructive border-destructive/30";
}

/** The single biggest risk right now, auto-generated. */
export function biggestRisk(block: Block): { risk: string; action: string } {
  if (block.tours.unconfirmed >= 4)
    return {
      risk: `${block.tours.unconfirmed} tours are not confirmed.`,
      action: "TCM + Control Tower are working those tours before the next checkpoint.",
    };
  if (block.chats.waitingUs >= 3)
    return {
      risk: `${block.chats.waitingUs} customers are waiting on us.`,
      action: "Control Tower is reassigning and clearing the waiting queue now.",
    };
  if (block.demand.unassigned > 0)
    return {
      risk: `${block.demand.unassigned} leads are unassigned.`,
      action: "Control Tower assigning to available Flow Ops in the next 15 minutes.",
    };
  if (block.closing.bbdTarget - block.closing.bookings > 2)
    return {
      risk: `${block.closing.bbdTarget - block.closing.bookings} bookings short of target.`,
      action: "Closing is escalating payment-pending cases and owner approvals.",
    };
  return { risk: "No structural risk open — execution is on rhythm.", action: "Managers holding cadence, no intervention required." };
}

export function dataQualityIssues(block: Block): string[] {
  const out: string[] = [];
  if (block.management.reconciliationIssues > 0)
    out.push(`${block.management.reconciliationIssues} unresolved reconciliation issue(s) — TCM → Closing handoffs awaiting match.`);
  if (block.chats.noNextAction > 2) out.push(`${block.chats.noNextAction} chats have no next action set.`);
  return out;
}
