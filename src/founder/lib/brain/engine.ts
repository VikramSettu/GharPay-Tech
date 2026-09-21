/**
 * Admin Operating Brain — derivation engine.
 *
 * Everything here is counted from the live CRM store (leads, tours, bookings,
 * follow-ups, activities). No hashes, no demo numbers. Each metric carries the
 * exact underlying rows so every number on the page can be drilled into.
 */
import type { Booking, FollowUp, Lead, TCM, Tour } from "@/lib/types";
import { crmSnapshot, type CrmSnapshot } from "@/founder/lib/crm-link";
import { targetsFor, dayProgress, currentPhase, type BusinessId, type BrainRole } from "./targets";

/* ------------------------------- filters ------------------------------- */

export type DateKey =
  | "today" | "yesterday" | "this-week" | "last-week" | "this-month"
  | "last-month" | "last-7" | "last-14" | "last-30";

export type HealthKey =
  | "all" | "healthy" | "action-due" | "at-risk" | "breached" | "blocked"
  | "orphaned" | "handoff-pending" | "recovery";

export interface BrainFilters {
  date: DateKey;
  zone: string;         // "all" | zone name
  role: BrainRole | "all";
  employees: string[];  // tcm ids, empty = all
  source: string;       // "all" | source
  intent: "all" | "hot" | "warm" | "cold";
  health: HealthKey;
}

export const DEFAULT_FILTERS: BrainFilters = {
  date: "today", zone: "all", role: "all", employees: [], source: "all", intent: "all", health: "all",
};

export const DATE_OPTIONS: { id: DateKey; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this-week", label: "This week" },
  { id: "last-week", label: "Last week" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-7", label: "Last 7 days" },
  { id: "last-14", label: "Last 14 days" },
  { id: "last-30", label: "Last 30 days" },
];

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function dateRange(key: DateKey, now = new Date()): { from: number; to: number; label: string } {
  const today = startOfDay(now);
  switch (key) {
    case "today": return { from: today, to: today + DAY, label: "Today" };
    case "yesterday": return { from: today - DAY, to: today, label: "Yesterday" };
    case "this-week": {
      const dow = (now.getDay() + 6) % 7;
      return { from: today - dow * DAY, to: today + DAY, label: "This week" };
    }
    case "last-week": {
      const dow = (now.getDay() + 6) % 7;
      const start = today - (dow + 7) * DAY;
      return { from: start, to: start + 7 * DAY, label: "Last week" };
    }
    case "this-month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return { from: s, to: today + DAY, label: "This month" };
    }
    case "last-month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const e = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return { from: s, to: e, label: "Last month" };
    }
    case "last-7": return { from: today - 6 * DAY, to: today + DAY, label: "Last 7 days" };
    case "last-14": return { from: today - 13 * DAY, to: today + DAY, label: "Last 14 days" };
    case "last-30": return { from: today - 29 * DAY, to: today + DAY, label: "Last 30 days" };
  }
}

/* --------------------------------- rows -------------------------------- */

export type EntityKind = "lead" | "tour" | "booking" | "person";

export interface BrainRow {
  id: string;
  kind: EntityKind;
  title: string;
  subtitle: string;
  owner: string;
  zone: string;
  problem?: string;
  impact?: string;
  overdue?: string;
  nextAction: string;
  leadId?: string;
  phone?: string;
  severity?: number;
}

export interface Metric {
  key: string;
  label: string;
  value: number;
  suffix?: string;
  tone?: "good" | "warn" | "bad" | "plain";
  rows: BrainRow[];
}

export interface MetricGroup { key: string; label: string; metrics: Metric[] }

const ACTIVE: Lead["stage"][] = ["new", "contacted", "tour-scheduled", "tour-done", "negotiation"];
const isActive = (l: Lead) => ACTIVE.includes(l.stage);
const mins = (ms: number) => Math.round(ms / 60000);
const ago = (iso?: string | null) => (iso ? `${mins(Date.now() - +new Date(iso))}m ago` : "never");

/* ------------------------------ core model ----------------------------- */

export interface BrainModel {
  now: number;
  range: { from: number; to: number; label: string };
  leads: Lead[];
  tours: Tour[];
  bookings: Booking[];
  followUps: FollowUp[];
  people: PersonRow[];
  zones: ZoneRow[];
  groups: MetricGroup[];
  funnel: FunnelStage[];
  plan: ReversePlan;
  impact: BrainRow[];
  checkpoints: Checkpoint[];
  attention: Attention[];
  mustWin: string[];
  sources: string[];
  zoneNames: string[];
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  conversion: number;    // from previous stage
  ageingDays: number;
  breaches: number;
  rows: BrainRow[];
}

export interface ReversePlan {
  target: number;
  actual: number;
  gap: number;
  projection: number;
  requirements: { label: string; required: number; available: number }[];
  structuralGap: number;
}

export interface Checkpoint {
  id: number;
  label: string;
  state: "green" | "amber" | "red";
  failures: BrainRow[];
  detail: string;
}

export interface Attention {
  id: string;
  title: string;
  metricLine: string;
  reasons: string[];
  cta: string;
  rows: BrainRow[];
}

export interface PersonRow {
  id: string;
  name: string;
  role: BrainRole;
  zone: string;
  p1: { actual: number; target: number };
  p2: { actual: number; target: number };
  eod: { actual: number; target: number };
  week: { actual: number; target: number };
  month: { actual: number; target: number };
  executable: number;
  requiredWork: number;
  slaBreaches: number;
  classification: MissClass;
  rows: BrainRow[];
}

export type MissClass =
  | "on-target" | "execution" | "upstream" | "conversion" | "inventory"
  | "customer" | "dependency" | "system" | "manager" | "supply";

export interface ZoneRow {
  name: string;
  bbdActual: number;
  bbdTarget: number;
  forecast: number;
  tours: number;
  done: number;
  quotes: number;
  bookings: number;
  highIntent: number;
  noNextAction: number;
  sla: number;
  supplyBlocked: number;
  people: number;
  reasons: string[];
  actions: string[];
  rows: BrainRow[];
}

/* ------------------------------ builders ------------------------------- */

function leadRow(l: Lead, tcms: TCM[], problem?: string, impact?: string, nextAction = "Call now"): BrainRow {
  const owner = tcms.find((t) => t.id === l.assignedTcmId);
  return {
    id: l.id, kind: "lead", leadId: l.id, phone: l.phone,
    title: l.name,
    subtitle: `${l.stage} · ${l.intent} · ₹${l.budget.toLocaleString("en-IN")} · move-in ${l.moveInDate}`,
    owner: owner?.name ?? "Unassigned",
    zone: owner?.zone ?? l.preferredArea,
    problem, impact,
    overdue: l.nextFollowUpAt && +new Date(l.nextFollowUpAt) < Date.now()
      ? `${mins(Date.now() - +new Date(l.nextFollowUpAt))}m overdue` : undefined,
    nextAction,
  };
}

function tourRow(t: Tour, leads: Lead[], tcms: TCM[], problem?: string, nextAction = "Confirm tour"): BrainRow {
  const lead = leads.find((l) => l.id === t.leadId);
  const owner = tcms.find((x) => x.id === t.tcmId);
  return {
    id: t.id, kind: "tour", leadId: t.leadId, phone: lead?.phone,
    title: lead?.name ?? t.leadId,
    subtitle: `${t.status} · ${new Date(t.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
    owner: owner?.name ?? "Unassigned",
    zone: owner?.zone ?? lead?.preferredArea ?? "—",
    problem, nextAction,
  };
}

export function buildBrain(
  filters: BrainFilters,
  business: BusinessId,
  snap: CrmSnapshot = crmSnapshot(),
  now = Date.now(),
): BrainModel {
  const range = dateRange(filters.date, new Date(now));
  const inRange = (iso?: string | null) => !!iso && +new Date(iso) >= range.from && +new Date(iso) < range.to;
  const tcms = snap.tcms;
  const zoneOf = (id: string) => tcms.find((t) => t.id === id)?.zone ?? "Unzoned";

  const zoneOk = (z: string) => filters.zone === "all" || z === filters.zone;
  const empOk = (id: string) => filters.employees.length === 0 || filters.employees.includes(id);

  let leads = snap.leads.filter(
    (l) => zoneOk(zoneOf(l.assignedTcmId)) && empOk(l.assignedTcmId)
      && (filters.source === "all" || l.source === filters.source)
      && (filters.intent === "all" || l.intent === filters.intent),
  );
  const tours = snap.tours.filter((t) => zoneOk(zoneOf(t.tcmId)) && empOk(t.tcmId));
  const bookings = snap.bookings.filter((b) => zoneOk(zoneOf(b.tcmId)) && empOk(b.tcmId));
  const followUps = snap.followUps.filter((f) => zoneOk(zoneOf(f.tcmId)) && empOk(f.tcmId) && !f.done);

  const overdueFu = followUps.filter((f) => +new Date(f.dueAt) < now);
  const active = leads.filter(isActive);
  const orphaned = active.filter((l) => !l.assignedTcmId || !l.nextFollowUpAt);
  const neverCalled = leads.filter((l) => l.stage === "new");
  const hot = active.filter((l) => l.intent === "hot");

  const rangeTours = tours.filter((t) => inRange(t.scheduledAt));
  const doneTours = tours.filter((t) => t.status === "completed" && inRange(t.scheduledAt));
  const scheduled = rangeTours.filter((t) => t.status === "scheduled");
  const noShow = rangeTours.filter((t) => t.status === "no-show");
  const quoteMissing = doneTours.filter((t) => !t.postTour?.filledAt);
  const quotes = doneTours.filter((t) => !!t.postTour?.filledAt);
  const negotiating = active.filter((l) => l.stage === "negotiation");
  const paymentPromise = doneTours.filter((t) => t.decision === "booked" && !bookings.some((b) => b.tourId === t.id));
  const rangeBookings = bookings.filter((b) => inRange(b.ts));

  if (filters.health !== "all") {
    const set = new Set<string>();
    const push = (arr: Lead[]) => arr.forEach((l) => set.add(l.id));
    if (filters.health === "orphaned") push(orphaned);
    else if (filters.health === "breached") push(active.filter((l) => overdueFu.some((f) => f.leadId === l.id)));
    else if (filters.health === "action-due") push(active.filter((l) => l.nextFollowUpAt && +new Date(l.nextFollowUpAt) < now + 3600_000));
    else if (filters.health === "at-risk") push(hot.filter((l) => !l.nextFollowUpAt));
    else if (filters.health === "healthy") push(active.filter((l) => l.nextFollowUpAt && +new Date(l.nextFollowUpAt) > now));
    else if (filters.health === "recovery") push(active.filter((l) => l.stage === "tour-done" && l.confidence < 50));
    else if (filters.health === "handoff-pending") push(active.filter((l) => l.stage === "tour-scheduled" && !l.nextFollowUpAt));
    else if (filters.health === "blocked" || filters.health === "supply-blocked" as HealthKey) push(active.filter((l) => l.tags.includes("supply-blocked")));
    leads = leads.filter((l) => set.has(l.id));
  }

  /* ------------------------------ targets ------------------------------ */
  const phase = currentPhase(new Date(now));
  const isDaily = filters.date === "today" || filters.date === "yesterday";
  const scope: "eod" | "week" | "month" =
    filters.date === "this-month" || filters.date === "last-month" || filters.date === "last-30" ? "month"
      : filters.date === "this-week" || filters.date === "last-week" || filters.date === "last-7" || filters.date === "last-14" ? "week"
        : "eod";
  const ctTarget = targetsFor(business, "control-tower", scope).bbd ?? 30;
  const phaseTarget = targetsFor(business, "control-tower", isDaily ? phase : scope).bbd ?? ctTarget;
  const bbdActual = rangeBookings.length;
  const progress = isDaily ? Math.max(dayProgress(new Date(now)), 0.15) : 0.6;
  const projection = Math.round(bbdActual / progress);

  /* ------------------------------ groups ------------------------------- */
  const groups: MetricGroup[] = [
    {
      key: "outcome", label: "Outcome",
      metrics: [
        { key: "bbd-target", label: "BBD target", value: ctTarget, tone: "plain", rows: [] },
        { key: "bbd-actual", label: "BBD actual", value: bbdActual, tone: bbdActual >= phaseTarget ? "good" : "bad", rows: rangeBookings.map((b) => {
          const l = snap.leads.find((x) => x.id === b.leadId);
          return { id: b.id, kind: "booking" as const, leadId: b.leadId, title: l?.name ?? b.leadId, subtitle: `₹${b.amount.toLocaleString("en-IN")} · ${new Date(b.ts).toLocaleString("en-IN")}`, owner: tcms.find((t) => t.id === b.tcmId)?.name ?? "—", zone: zoneOf(b.tcmId), nextAction: "Verify payment evidence" };
        }) },
        { key: "gap", label: "Gap to target", value: Math.max(ctTarget - bbdActual, 0), tone: "bad", rows: [] },
        { key: "forecast", label: "Forecast", value: projection, tone: projection >= ctTarget ? "good" : "warn", rows: [] },
        { key: "value", label: "Booking value", value: rangeBookings.reduce((s, b) => s + b.amount, 0), suffix: "₹", tone: "plain", rows: [] },
      ],
    },
    {
      key: "leads", label: "Leads",
      metrics: [
        { key: "new", label: "New", value: leads.filter((l) => inRange(l.createdAt)).length, tone: "plain", rows: leads.filter((l) => inRange(l.createdAt)).map((l) => leadRow(l, tcms, undefined, undefined, "Qualify now")) },
        { key: "assigned", label: "Assigned", value: active.filter((l) => l.assignedTcmId).length, tone: "plain", rows: active.filter((l) => l.assignedTcmId).map((l) => leadRow(l, tcms)) },
        { key: "unassigned", label: "Unassigned", value: active.filter((l) => !l.assignedTcmId).length, tone: "bad", rows: active.filter((l) => !l.assignedTcmId).map((l) => leadRow(l, tcms, "No owner", "Lead cannot move", "Assign owner")) },
        { key: "never-called", label: "Never called", value: neverCalled.length, tone: "warn", rows: neverCalled.map((l) => leadRow(l, tcms, "No first action", "First-response SLA at risk", "Call now")) },
        { key: "qualified", label: "Qualified", value: active.filter((l) => l.stage !== "new" && l.stage !== "contacted").length, tone: "good", rows: active.filter((l) => l.stage !== "new" && l.stage !== "contacted").map((l) => leadRow(l, tcms)) },
        { key: "no-next", label: "No next action", value: orphaned.length, tone: "bad", rows: orphaned.map((l) => leadRow(l, tcms, "No next action / owner", "Broken workflow contract", "Set next action")) },
      ],
    },
    {
      key: "tours", label: "Tours",
      metrics: [
        { key: "scheduled", label: "Scheduled", value: scheduled.length, tone: "plain", rows: scheduled.map((t) => tourRow(t, snap.leads, tcms)) },
        { key: "done", label: "Done", value: doneTours.length, tone: "good", rows: doneTours.map((t) => tourRow(t, snap.leads, tcms, undefined, "Send quotation")) },
        { key: "noshow", label: "No-show", value: noShow.length, tone: "bad", rows: noShow.map((t) => tourRow(t, snap.leads, tcms, "Customer did not show", "Run no-show recovery")) },
        { key: "at-risk", label: "At risk", value: scheduled.filter((t) => +new Date(t.scheduledAt) - now < 30 * 60000).length, tone: "warn", rows: scheduled.filter((t) => +new Date(t.scheduledAt) - now < 30 * 60000).map((t) => tourRow(t, snap.leads, tcms, "Starts in <30m, not confirmed")) },
      ],
    },
    {
      key: "conversion", label: "Conversion",
      metrics: [
        { key: "quotes", label: "Quotations", value: quotes.length, tone: "plain", rows: quotes.map((t) => tourRow(t, snap.leads, tcms, undefined, "Push to negotiation")) },
        { key: "negotiations", label: "Negotiations", value: negotiating.length, tone: "plain", rows: negotiating.map((l) => leadRow(l, tcms, undefined, undefined, "Close now")) },
        { key: "promise", label: "Payment promises", value: paymentPromise.length, tone: "warn", rows: paymentPromise.map((t) => tourRow(t, snap.leads, tcms, "Promised payment, no booking", "Send payment link")) },
        { key: "bookings", label: "Bookings", value: rangeBookings.length, tone: "good", rows: [] },
      ],
    },
    {
      key: "workflow", label: "Workflow",
      metrics: [
        { key: "sla", label: "SLA breached", value: overdueFu.length, tone: "bad", rows: overdueFu.map((f) => {
          const l = snap.leads.find((x) => x.id === f.leadId);
          return l ? leadRow(l, tcms, `Follow-up overdue (${f.reason})`, "Conversion decays hourly", "Call now") : null;
        }).filter(Boolean) as BrainRow[] },
        { key: "orphaned", label: "Orphaned", value: orphaned.length, tone: "bad", rows: orphaned.map((l) => leadRow(l, tcms, "Owner or next action missing", "Lead is invisible to the system", "Fix workflow contract")) },
        { key: "quote-missing", label: "Quote missing", value: quoteMissing.length, tone: "warn", rows: quoteMissing.map((t) => tourRow(t, snap.leads, tcms, "Tour done, no outcome/quote", "Send quotation")) },
        { key: "recovery", label: "Recovery active", value: active.filter((l) => l.stage === "tour-done" && l.confidence < 50).length, tone: "warn", rows: active.filter((l) => l.stage === "tour-done" && l.confidence < 50).map((l) => leadRow(l, tcms, "Low confidence after tour", "Booking likely lost", "Run recovery playbook")) },
      ],
    },
  ];

  /* ------------------------------- funnel ------------------------------- */
  const stageRows = (pred: (l: Lead) => boolean) => leads.filter(pred).map((l) => leadRow(l, tcms));
  const raw: { key: string; label: string; rows: BrainRow[] }[] = [
    { key: "new", label: "New", rows: stageRows((l) => l.stage === "new") },
    { key: "connected", label: "Connected", rows: stageRows((l) => l.stage === "contacted") },
    { key: "qualified", label: "Qualified", rows: stageRows((l) => isActive(l) && l.stage !== "new" && l.stage !== "contacted") },
    { key: "scheduled", label: "Visit scheduled", rows: scheduled.map((t) => tourRow(t, snap.leads, tcms)) },
    { key: "done", label: "Visit done", rows: doneTours.map((t) => tourRow(t, snap.leads, tcms)) },
    { key: "quote", label: "Quotation", rows: quotes.map((t) => tourRow(t, snap.leads, tcms)) },
    { key: "negotiation", label: "Negotiating", rows: negotiating.map((l) => leadRow(l, tcms)) },
    { key: "booked", label: "Booked", rows: leads.filter((l) => l.stage === "booked").map((l) => leadRow(l, tcms, undefined, undefined, "Confirm check-in")) },
  ];
  const funnel: FunnelStage[] = raw.map((s, i) => {
    const prev = i === 0 ? s.rows.length : raw[i - 1].rows.length;
    return {
      key: s.key, label: s.label, count: s.rows.length,
      conversion: prev ? Math.round((s.rows.length / prev) * 100) : 0,
      ageingDays: 0,
      breaches: s.rows.filter((r) => r.overdue).length,
      rows: s.rows,
    };
  });

  /* --------------------------- reverse planner -------------------------- */
  const cvr = (a: number, b: number, fallback: number) => (b > 0 && a > 0 ? a / b : fallback);
  const quoteToBook = cvr(rangeBookings.length, quotes.length, 0.35);
  const doneToQuote = cvr(quotes.length, doneTours.length, 0.7);
  const schedToDone = cvr(doneTours.length, rangeTours.length, 0.65);
  const qualToSched = cvr(rangeTours.length, active.length, 0.4);
  const gap = Math.max(ctTarget - bbdActual, 0);
  const need = (n: number) => Math.ceil(n);
  const reqQuotes = need(gap / Math.max(quoteToBook, 0.05));
  const reqDone = need(reqQuotes / Math.max(doneToQuote, 0.05));
  const reqSched = need(reqDone / Math.max(schedToDone, 0.05));
  const reqQual = need(reqSched / Math.max(qualToSched, 0.05));
  const plan: ReversePlan = {
    target: ctTarget, actual: bbdActual, gap, projection,
    requirements: [
      { label: "Payment-ready customers", required: need(gap * 1.3), available: paymentPromise.length },
      { label: "Active negotiations", required: need(gap * 1.8), available: negotiating.length },
      { label: "Quotations", required: reqQuotes, available: quotes.length },
      { label: "Completed tours", required: reqDone, available: doneTours.length },
      { label: "Scheduled tours", required: reqSched, available: scheduled.length },
      { label: "Qualified leads", required: reqQual, available: active.filter((l) => l.stage !== "new").length },
      { label: "Workable leads", required: need(reqQual * 1.4), available: active.length },
    ],
    structuralGap: Math.max(gap - Math.round(paymentPromise.length * 0.8 + negotiating.length * 0.4 + quotes.length * quoteToBook), 0),
  };

  /* ----------------------------- impact queue --------------------------- */
  const impact: BrainRow[] = [
    ...paymentPromise.map((t) => ({ ...tourRow(t, snap.leads, tcms, "Payment promise overdue", "Send payment link"), impact: "1 BBD at risk today", severity: 100 })),
    ...quoteMissing.map((t) => ({ ...tourRow(t, snap.leads, tcms, "Tour done, quotation missing", "Send quotation"), impact: "Blocks quote→booking conversion", severity: 90 })),
    ...scheduled.filter((t) => +new Date(t.scheduledAt) - now < 30 * 60000 && +new Date(t.scheduledAt) > now)
      .map((t) => ({ ...tourRow(t, snap.leads, tcms, "Tour in <30m, not confirmed", "Confirm now"), impact: "No-show risk", severity: 85 })),
    ...hot.filter((l) => !l.nextFollowUpAt).map((l) => ({ ...leadRow(l, tcms, "High intent, no next action", "Booking will leak", "Assign closing owner"), severity: 80 })),
    ...overdueFu.slice(0, 40).map((f) => {
      const l = snap.leads.find((x) => x.id === f.leadId);
      return l ? { ...leadRow(l, tcms, `SLA breached · ${f.reason}`, "Conversion decays hourly", "Call now"), severity: 70 } : null;
    }).filter(Boolean) as BrainRow[],
    ...neverCalled.map((l) => ({ ...leadRow(l, tcms, "Untouched lead", "First-response SLA", "Call now"), severity: 60 })),
  ].sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
    .filter((r, i, arr) => arr.findIndex((x) => x.kind === r.kind && x.id === r.id) === i);

  /* ------------------------------- people ------------------------------- */
  const people: PersonRow[] = tcms
    .filter((t) => zoneOk(t.zone) && empOk(t.id))
    .map((t) => {
      const mine = snap.leads.filter((l) => l.assignedTcmId === t.id);
      const myTours = snap.tours.filter((x) => x.tcmId === t.id);
      const myDone = myTours.filter((x) => x.status === "completed" && inRange(x.scheduledAt));
      const myBook = snap.bookings.filter((b) => b.tcmId === t.id && inRange(b.ts));
      const myOverdue = snap.followUps.filter((f) => f.tcmId === t.id && !f.done && +new Date(f.dueAt) < now).length;
      const executable = mine.filter((l) => isActive(l) && l.stage !== "new" && !!l.nextFollowUpAt).length;
      const tp = (p: Parameters<typeof targetsFor>[2]) => targetsFor(business, "tcm", p).bookings ?? 0;
      const actual = myBook.length;
      const required = Math.max(tp("eod") - actual, 0) * 3;
      let classification: MissClass = "on-target";
      if (actual < tp("eod")) {
        if (executable < required) classification = "upstream";
        else if (myOverdue > 2) classification = "execution";
        else if (myDone.length >= 3 && actual === 0) classification = "conversion";
        else classification = "execution";
      }
      return {
        id: t.id, name: t.name, role: "tcm" as BrainRole, zone: t.zone,
        p1: { actual, target: tp("p1") },
        p2: { actual, target: tp("p2") },
        eod: { actual, target: tp("eod") },
        week: { actual: snap.bookings.filter((b) => b.tcmId === t.id && +new Date(b.ts) > now - 7 * DAY).length, target: tp("week") },
        month: { actual: snap.bookings.filter((b) => b.tcmId === t.id && +new Date(b.ts) > now - 30 * DAY).length, target: tp("month") },
        executable, requiredWork: required, slaBreaches: myOverdue, classification,
        rows: mine.filter(isActive).map((l) => leadRow(l, tcms)),
      };
    });

  /* -------------------------------- zones ------------------------------- */
  const zoneNames = Array.from(new Set(tcms.map((t) => t.zone))).sort();
  const zones: ZoneRow[] = zoneNames.filter((z) => zoneOk(z)).map((z) => {
    const zp = tcms.filter((t) => t.zone === z).map((t) => t.id);
    const zl = snap.leads.filter((l) => zp.includes(l.assignedTcmId));
    const zt = snap.tours.filter((t) => zp.includes(t.tcmId) && inRange(t.scheduledAt));
    const zd = zt.filter((t) => t.status === "completed");
    const zb = snap.bookings.filter((b) => zp.includes(b.tcmId) && inRange(b.ts));
    const zq = zd.filter((t) => !!t.postTour?.filledAt);
    const zHot = zl.filter((l) => isActive(l) && l.intent === "hot").length;
    const zNoNext = zl.filter((l) => isActive(l) && !l.nextFollowUpAt).length;
    const zSla = snap.followUps.filter((f) => zp.includes(f.tcmId) && !f.done && +new Date(f.dueAt) < now).length;
    const zTarget = Math.max(Math.round(ctTarget / Math.max(zoneNames.length, 1)), 1);
    const reasons: string[] = [];
    if (zd.length && zq.length < zd.length) reasons.push(`${zd.length - zq.length} completed tours have no quotation`);
    if (zNoNext) reasons.push(`${zNoNext} active leads have no next action`);
    if (zSla) reasons.push(`${zSla} SLA breaches open`);
    if (zHot && zb.length === 0) reasons.push(`${zHot} high-intent customers with no closure`);
    const actions: string[] = [];
    if (zd.length > zq.length) actions.push("Push done-tour quotations");
    if (zNoNext) actions.push("Set next action on orphaned leads");
    if (zSla) actions.push("Clear SLA breaches");
    if (!actions.length) actions.push("Hold pace, protect conversion");
    return {
      name: z, bbdActual: zb.length, bbdTarget: zTarget,
      forecast: Math.round(zb.length / progress),
      tours: zt.length, done: zd.length, quotes: zq.length, bookings: zb.length,
      highIntent: zHot, noNextAction: zNoNext, sla: zSla,
      supplyBlocked: zl.filter((l) => l.tags.includes("supply-blocked")).length,
      people: zp.length, reasons, actions,
      rows: zl.filter(isActive).map((l) => leadRow(l, tcms)),
    };
  });

  /* ----------------------------- checkpoints ---------------------------- */
  const cp = (id: number, label: string, failures: BrainRow[], amberAt = 1, redAt = 4, detail = ""): Checkpoint => ({
    id, label, failures,
    state: failures.length >= redAt ? "red" : failures.length >= amberAt ? "amber" : "green",
    detail: detail || `${failures.length} failing case${failures.length === 1 ? "" : "s"}`,
  });
  const checkpoints: Checkpoint[] = [
    cp(1, "Sufficient lead stock", active.length >= tcms.length * 8 ? [] : active.slice(0, 1).map((l) => leadRow(l, tcms, "Lead stock below team capacity", undefined, "Add lead supply")), 1, 1, active.length >= tcms.length * 8 ? "Stock healthy" : "Lead stock below team capacity"),
    cp(2, "Every lead captured", active.filter((l) => !l.phone).map((l) => leadRow(l, tcms, "No phone captured", undefined, "Complete record"))),
    cp(3, "Single owner", active.filter((l) => !l.assignedTcmId).map((l) => leadRow(l, tcms, "No owner", undefined, "Assign"))),
    cp(4, "First action within SLA", neverCalled.map((l) => leadRow(l, tcms, "Never called", undefined, "Call now"))),
    cp(5, "Feasibility gate completed", active.filter((l) => !l.moveInDate || !l.budget).map((l) => leadRow(l, tcms, "Budget / move-in missing", undefined, "Qualify"))),
    cp(6, "Correct property matching", active.filter((l) => l.stage === "contacted" && !l.preferredArea).map((l) => leadRow(l, tcms, "No area captured", undefined, "Capture area"))),
    cp(7, "Tour has valid inventory", scheduled.filter((t) => !t.propertyId).map((t) => tourRow(t, snap.leads, tcms, "No property attached"))),
    cp(8, "Tour → quotation completed", quoteMissing.map((t) => tourRow(t, snap.leads, tcms, "No quotation after tour", "Send quotation"))),
    cp(9, "Bed / room lock where required", paymentPromise.map((t) => tourRow(t, snap.leads, tcms, "Payment promised, room not locked", "Lock room"))),
    cp(10, "Post-tour follow-up completed", doneTours.filter((t) => !t.postTour?.nextFollowUpAt).map((t) => tourRow(t, snap.leads, tcms, "No post-tour follow-up", "Set follow-up"))),
    cp(11, "No verbal booking without evidence", paymentPromise.map((t) => tourRow(t, snap.leads, tcms, "Verbal yes without payment evidence", "Collect proof"))),
    cp(12, "BBD mapped to booking evidence", rangeBookings.filter((b) => !b.amount).map((b) => ({ id: b.id, kind: "booking" as const, title: b.leadId, subtitle: "No amount recorded", owner: "—", zone: "—", nextAction: "Attach payment proof" }))),
    cp(13, "Customer communication quality", overdueFu.slice(0, 10).map((f) => {
      const l = snap.leads.find((x) => x.id === f.leadId);
      return l ? leadRow(l, tcms, `Silent since ${ago(l.updatedAt)}`, undefined, "Re-engage") : null;
    }).filter(Boolean) as BrainRow[]),
    cp(14, "Every active customer has a next action", orphaned.map((l) => leadRow(l, tcms, "No next action", undefined, "Set next action"))),
  ];

  /* ------------------------------ attention ----------------------------- */
  const attention: Attention[] = [];
  if (gap > 0) {
    attention.push({
      id: "bbd-gap",
      title: `${ctTarget} BBD is currently at risk`,
      metricLine: `Target ${ctTarget} · Actual ${bbdActual} · Phase expectation ${phaseTarget} · Projection ${projection}`,
      reasons: [
        `${quoteMissing.length} completed tours have no quotation`,
        `${paymentPromise.length} payment promises are due`,
        `${hot.filter((l) => !l.nextFollowUpAt).length} high-intent customers have no closing action`,
        `${zones.filter((z) => z.bbdActual < z.bbdTarget).map((z) => z.name).slice(0, 3).join(", ") || "No zone"} behind zone target`,
        `${people.filter((p) => p.eod.actual < p.eod.target).length} people under target`,
      ],
      cta: `Fix the ${gap} BBD gap`,
      rows: impact.slice(0, 25),
    });
  }
  if (orphaned.length) {
    attention.push({
      id: "orphaned", title: `${orphaned.length} active leads have no next action`,
      metricLine: "Workflow contract broken — owner + next action + deadline required",
      reasons: ["Active lead without a deadline never resurfaces", "These leads are invisible to phase targets"],
      cta: "Fix workflow contracts", rows: orphaned.map((l) => leadRow(l, tcms, "Broken contract", undefined, "Set next action")),
    });
  }
  if (overdueFu.length) {
    attention.push({
      id: "sla", title: `${overdueFu.length} SLA breaches open`,
      metricLine: `Oldest breach ${overdueFu.length ? mins(now - Math.min(...overdueFu.map((f) => +new Date(f.dueAt)))) : 0} minutes overdue`,
      reasons: ["Every hour of delay reduces connect rate", "Breaches concentrate in the zones behind target"],
      cta: "Open breach queue", rows: groups[4].metrics[0].rows,
    });
  }
  const upstream = people.filter((p) => p.classification === "upstream");
  if (upstream.length) {
    attention.push({
      id: "upstream", title: `${upstream.length} people have no executable work`,
      metricLine: "Upstream failure — do not score as employee performance",
      reasons: upstream.slice(0, 5).map((p) => `${p.name} needs ${p.requiredWork} workable cases, queue has ${p.executable}`),
      cta: "Add executable work",
      rows: upstream.map((p) => ({ id: p.id, kind: "person" as const, title: p.name, subtitle: `${p.zone} · queue ${p.executable} / needs ${p.requiredWork}`, owner: p.name, zone: p.zone, problem: "Upstream failure", nextAction: "Add work" })),
    });
  }
  if (plan.structuralGap > 0) {
    attention.push({
      id: "structural", title: `Structural gap of ${plan.structuralGap} bookings`,
      metricLine: `Pipeline can realistically produce ${Math.max(ctTarget - plan.structuralGap, 0)} of ${ctTarget}`,
      reasons: plan.requirements.filter((r) => r.available < r.required).map((r) => `${r.label}: need ${r.required}, have ${r.available}`),
      cta: "Open reverse funnel planner", rows: [],
    });
  }

  /* ------------------------------ must win ------------------------------ */
  const mustWin = [
    gap > 0 ? `Recover ${gap} BBD from the payment and hot queue.` : "Protect the achieved target — verify booking evidence.",
    orphaned.length ? `Clear ${orphaned.length} active leads with no next action.` : "Keep every active lead under a deadline.",
    quoteMissing.length ? `Send ${quoteMissing.length} missing post-tour quotations.` : "Keep tour → quotation at 100%.",
    scheduled.length ? `Get ${scheduled.length} scheduled tours confirmed and controlled.` : "Fill tomorrow's tour slate.",
    upstream.length ? `Add executable work to ${upstream.length} under-supplied people.` : "Rebalance workload where queues are heavy.",
    overdueFu.length ? `Review ${overdueFu.length} SLA breaches with owners.` : "Run one coaching 1-on-1.",
  ];

  return {
    now, range, leads, tours, bookings, followUps,
    people, zones, groups, funnel, plan, impact, checkpoints, attention, mustWin,
    sources: Array.from(new Set(snap.leads.map((l) => l.source))).sort(),
    zoneNames,
  };
}

/* ---------------------------- universal search --------------------------- */

export function searchBrain(model: BrainModel, q: string): BrainRow[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const all: BrainRow[] = [
    ...model.groups.flatMap((g) => g.metrics.flatMap((m) => m.rows)),
    ...model.impact,
  ];
  const seen = new Set<string>();
  const dedup = all.filter((r) => (seen.has(r.kind + r.id) ? false : (seen.add(r.kind + r.id), true)));

  // Operational queries
  if (s.includes("never called")) return model.groups[1].metrics.find((m) => m.key === "never-called")!.rows;
  if (s.includes("no next action")) return model.groups[1].metrics.find((m) => m.key === "no-next")!.rows;
  if (s.includes("without quotation") || s.includes("quote missing")) return model.groups[4].metrics.find((m) => m.key === "quote-missing")!.rows;
  if (s.includes("payment")) return model.groups[3].metrics.find((m) => m.key === "promise")!.rows;
  if (s.includes("breach") || s.includes("sla")) return model.groups[4].metrics.find((m) => m.key === "sla")!.rows;

  return dedup.filter((r) =>
    [r.title, r.subtitle, r.owner, r.zone, r.problem, r.phone].filter(Boolean).join(" ").toLowerCase().includes(s),
  ).slice(0, 60);
}
