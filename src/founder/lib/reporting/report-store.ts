// Report Center store — templates, schedules, sent history, delivery status. Local-first.
import type { Format, SectionKey } from "@/founder/lib/reporting/founder-update";
import type { Period, Scope } from "@/founder/lib/command-center/metrics";

const KEY_SENT = "gp_reports_sent";
const KEY_TPL = "gp_reports_templates";
const KEY_SCHED = "gp_reports_schedules";

export type Recipient = "Founder" | "Manager" | "HR" | "HR Ops" | "Zone Manager" | "Finance" | "Custom";
export type Channel = "WhatsApp" | "Email" | "Secure Link" | "Download";
export type DeliveryStatus = "generated" | "approved" | "sent" | "delivered" | "read" | "failed";

export const DELIVERY_FLOW: DeliveryStatus[] = ["generated", "approved", "sent", "delivered", "read"];

export type SentReport = {
  id: string;
  ts: number;
  name: string;
  scopeLabel: string;
  period: Period;
  format: Format;
  recipient: Recipient;
  channel: Channel;
  status: DeliveryStatus;
  body: string;
  commentary: string;
  dataWarning: boolean;
  generatedBy: string;
};

export type Template = {
  id: string;
  name: string;
  scope: Scope;
  period: Period;
  format: Format;
  sections: SectionKey[];
  recipient: Recipient;
  channel: Channel;
  schedule?: string;
};

export type Schedule = {
  id: string;
  name: string;
  time: string;
  days: string;
  recipient: Recipient;
  channel: Channel;
  format: Format;
  enabled: boolean;
  mode: "automatic" | "approval";
};

const subs = new Set<() => void>();
export function subscribeReports(fn: () => void) {
  subs.add(fn);
  return () => subs.delete(fn);
}
function emit() {
  subs.forEach((f) => f());
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(val));
  emit();
}

export const DEFAULT_TEMPLATES: Template[] = [
  { id: "t-founder-5pm", name: "Founder 5 PM", scope: { kind: "company", zones: [] }, period: "cp_5pm", format: "standard", sections: [], recipient: "Founder", channel: "WhatsApp", schedule: "Mon–Sat · 5:05 PM" },
  { id: "t-founder-eod", name: "Founder EOD", scope: { kind: "company", zones: [] }, period: "eod", format: "deep", sections: [], recipient: "Founder", channel: "WhatsApp", schedule: "Daily · 8:10 PM" },
  { id: "t-weekly-leadership", name: "Weekly Leadership", scope: { kind: "company", zones: [] }, period: "week", format: "deep", sections: [], recipient: "Founder", channel: "Secure Link", schedule: "Sat · 7:00 PM" },
  { id: "t-hr-ops-daily", name: "HR Ops Daily", scope: { kind: "company", zones: [] }, period: "today", format: "standard", sections: [], recipient: "HR Ops", channel: "Email", schedule: "Daily · 8:30 PM" },
  { id: "t-control-exceptions", name: "Control Tower Exceptions", scope: { kind: "company", zones: [] }, period: "last60", format: "quick", sections: [], recipient: "Manager", channel: "WhatsApp" },
];

export const DEFAULT_SCHEDULES: Schedule[] = [
  { id: "s-gm", name: "Good Morning", time: "10:05 AM", days: "Mon–Sat", recipient: "Founder", channel: "WhatsApp", format: "quick", enabled: true, mode: "automatic" },
  { id: "s-1pm", name: "1 PM Operating Pulse", time: "1:05 PM", days: "Mon–Sat", recipient: "Founder", channel: "WhatsApp", format: "quick", enabled: true, mode: "approval" },
  { id: "s-4pm", name: "4 PM Control Update", time: "4:05 PM", days: "Mon–Sat", recipient: "Founder", channel: "WhatsApp", format: "quick", enabled: false, mode: "approval" },
  { id: "s-5pm", name: "5 PM Control Update", time: "5:05 PM", days: "Mon–Sat", recipient: "Founder", channel: "WhatsApp", format: "standard", enabled: true, mode: "approval" },
  { id: "s-8pm", name: "8 PM Final · EOD", time: "8:10 PM", days: "Daily", recipient: "Founder", channel: "WhatsApp", format: "deep", enabled: true, mode: "approval" },
  { id: "s-weekly", name: "Weekly Operating Review", time: "7:00 PM", days: "Saturday", recipient: "Founder", channel: "Secure Link", format: "deep", enabled: true, mode: "approval" },
  { id: "s-monthly", name: "Monthly Leadership Pack", time: "9:00 PM", days: "Month end", recipient: "Founder", channel: "Email", format: "deep", enabled: false, mode: "approval" },
];

export function getTemplates(): Template[] {
  return read<Template[]>(KEY_TPL, DEFAULT_TEMPLATES);
}
export function saveTemplate(t: Template) {
  const list = getTemplates().filter((x) => x.id !== t.id);
  write(KEY_TPL, [t, ...list]);
}

export function getSchedules(): Schedule[] {
  return read<Schedule[]>(KEY_SCHED, DEFAULT_SCHEDULES);
}
export function updateSchedule(id: string, patch: Partial<Schedule>) {
  write(KEY_SCHED, getSchedules().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

export function getSent(): SentReport[] {
  return read<SentReport[]>(KEY_SENT, []).sort((a, b) => b.ts - a.ts);
}

export function logSent(r: Omit<SentReport, "id" | "ts">): SentReport {
  const rec: SentReport = { ...r, id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now() };
  write(KEY_SENT, [rec, ...read<SentReport[]>(KEY_SENT, [])].slice(0, 200));
  return rec;
}

export function advanceStatus(id: string, status: DeliveryStatus) {
  write(KEY_SENT, read<SentReport[]>(KEY_SENT, []).map((r) => (r.id === id ? { ...r, status } : r)));
}
