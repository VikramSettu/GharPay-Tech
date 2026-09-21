/**
 * COMPANY NOW — the founder operating model.
 *
 * Everything here is derived from the live CRM snapshot (leads, tours,
 * bookings, follow-ups, activity log, people). No demo rows, no mock KPIs.
 *
 * Each funnel stage carries: current count, comparison count, movement,
 * conversion from the previous stage, median transition time, overdue
 * count, EOD projection — and the actual customers behind the number so
 * every figure drills down.
 */
import type { ActivityLog, Booking, FollowUp, Lead, TCM, Tour } from "@/lib/types";
import { crmSnapshot, type CrmSnapshot } from "@/founder/lib/crm-link";
import type { BrainRow } from "./engine";
import { inRange, type Range } from "./timeengine";

const H = 3_600_000;
const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const minsAgo = (iso?: string | null) => (iso ? Math.round((Date.now() - +new Date(iso)) / 60000) : Infinity);
const agoText = (iso?: string | null) => {
  const m = minsAgo(iso);
  if (!isFinite(m)) return "never";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function ownerName(tcms: TCM[], id?: string | null) {
  if (!id) return "Unassigned";
  return tcms.find((t) => t.id === id)?.name ?? (id === "flow-ops" ? "Flow Ops" : id === "system" ? "System" : "Unassigned");
}

export const zoneOf = (l?: Lead) => l?.preferredArea || "Unzoned";

function leadRow(l: Lead, snap: CrmSnapshot, opts: { problem?: string; impact?: string; next?: string } = {}): BrainRow {
  const overdueMins = l.nextFollowUpAt ? Math.round((Date.now() - +new Date(l.nextFollowUpAt)) / 60000) : 0;
  return {
    id: l.id,
    kind: "lead",
    title: l.name,
    subtitle: `${l.stage} · ${l.intent} · ${money(l.budget)} · ${l.source} · last touch ${agoText(l.updatedAt)}`,
    owner: ownerName(snap.tcms, l.assignedTcmId),
    zone: zoneOf(l),
    problem: opts.problem,
    impact: opts.impact ?? `${l.confidence}% booking probability`,
    overdue: overdueMins > 0 ? `${overdueMins}m overdue` : undefined,
    nextAction: opts.next ?? (l.nextFollowUpAt ? "Follow up now" : "Set next action"),
    leadId: l.id,
    phone: l.phone,
    severity: l.confidence + (l.intent === "hot" ? 40 : l.intent === "warm" ? 15 : 0) + Math.max(0, Math.min(overdueMins, 240)) / 4,
  };
}

/* ------------------------------- funnel -------------------------------- */

export interface StageStat {
  key: string;
  label: string;
  count: number;
  prev: number | null;
  conversion: number;      // % from previous stage
  medianMins: number;      // median time from previous stage
  overdue: number;
  projection: number;      // projected EOD if pace holds
  target?: number;
  rows: BrainRow[];
  notes: string[];         // clickable sub-facts, e.g. "12 missing post-tour"
}

interface StageDef {
  key: string;
  label: string;
  pick: (s: CrmSnapshot, r: Range) => Lead[];
}

const leadById = (snap: CrmSnapshot) => {
  const m = new Map<string, Lead>();
  snap.leads.forEach((l) => m.set(l.id, l));
  return m;
};

const called = (snap: CrmSnapshot, r: Range) =>
  snap.activities.filter((a) => a.kind === "call_logged" && inRange(a.ts, r));

const connectedCall = (a: ActivityLog) => !/no answer|not reachable|unreachable|busy|switched off|missed/i.test(a.text);

const STAGE_DEFS: StageDef[] = [
  { key: "new", label: "New Leads", pick: (s, r) => s.leads.filter((l) => inRange(l.createdAt, r)) },
  { key: "assigned", label: "Assigned", pick: (s, r) => s.leads.filter((l) => inRange(l.createdAt, r) && !!l.assignedTcmId) },
  {
    key: "worked", label: "Worked", pick: (s, r) => {
      const ids = new Set(s.activities.filter((a) => inRange(a.ts, r) && a.leadId).map((a) => a.leadId!));
      return s.leads.filter((l) => ids.has(l.id));
    },
  },
  {
    key: "called", label: "Called", pick: (s, r) => {
      const ids = new Set(called(s, r).map((a) => a.leadId).filter(Boolean) as string[]);
      return s.leads.filter((l) => ids.has(l.id));
    },
  },
  {
    key: "connected", label: "Connected", pick: (s, r) => {
      const ids = new Set(called(s, r).filter(connectedCall).map((a) => a.leadId).filter(Boolean) as string[]);
      return s.leads.filter((l) => ids.has(l.id));
    },
  },
  {
    key: "qualified", label: "Qualified", pick: (s, r) => s.leads.filter(
      (l) => inRange(l.updatedAt, r) && l.confidence >= 50 && l.stage !== "new",
    ),
  },
  {
    key: "shared", label: "Properties Shared", pick: (s, r) => {
      const ids = new Set(s.activities.filter((a) => inRange(a.ts, r) && (a.kind === "message_sent" || !!a.propertyId)).map((a) => a.leadId).filter(Boolean) as string[]);
      return s.leads.filter((l) => ids.has(l.id));
    },
  },
  {
    key: "tour-sched", label: "Tours Scheduled", pick: (s, r) => {
      const m = leadById(s);
      return s.tours.filter((t) => inRange(t.createdAt, r)).map((t) => m.get(t.leadId)).filter(Boolean) as Lead[];
    },
  },
  {
    key: "tour-conf", label: "Tours Confirmed", pick: (s, r) => {
      const m = leadById(s);
      return s.tours.filter((t) => inRange(t.createdAt, r) && t.status !== "cancelled").map((t) => m.get(t.leadId)).filter(Boolean) as Lead[];
    },
  },
  {
    key: "tour-done", label: "Tours Done", pick: (s, r) => {
      const m = leadById(s);
      return s.tours.filter((t) => t.status === "completed" && inRange(t.updatedAt, r)).map((t) => m.get(t.leadId)).filter(Boolean) as Lead[];
    },
  },
  {
    key: "post-tour", label: "Post-Tour Completed", pick: (s, r) => {
      const m = leadById(s);
      return s.tours.filter((t) => inRange(t.postTour?.filledAt ?? null, r)).map((t) => m.get(t.leadId)).filter(Boolean) as Lead[];
    },
  },
  {
    key: "quote", label: "Quotations Sent", pick: (s, r) => {
      const ids = new Set(s.activities.filter((a) => inRange(a.ts, r) && /quot|pricing|price sent|offer/i.test(a.text)).map((a) => a.leadId).filter(Boolean) as string[]);
      return s.leads.filter((l) => ids.has(l.id));
    },
  },
  { key: "negotiation", label: "Negotiations Active", pick: (s, r) => s.leads.filter((l) => l.stage === "negotiation" && inRange(l.updatedAt, r)) },
  {
    key: "locked", label: "Rooms Locked", pick: (s, r) => {
      const ids = new Set(s.activities.filter((a) => inRange(a.ts, r) && /lock|hold|token/i.test(a.text)).map((a) => a.leadId).filter(Boolean) as string[]);
      return s.leads.filter((l) => ids.has(l.id));
    },
  },
  {
    key: "payment-pending", label: "Payments Pending", pick: (s) => s.leads.filter(
      (l) => l.stage === "negotiation" && l.confidence >= 60,
    ),
  },
  {
    key: "payment", label: "Payments Received", pick: (s, r) => {
      const m = leadById(s);
      return s.bookings.filter((b) => inRange(b.ts, r)).map((b) => m.get(b.leadId)).filter(Boolean) as Lead[];
    },
  },
  {
    key: "booking", label: "Bookings", pick: (s, r) => {
      const m = leadById(s);
      return s.bookings.filter((b) => inRange(b.ts, r)).map((b) => m.get(b.leadId)).filter(Boolean) as Lead[];
    },
  },
  {
    key: "checkin", label: "Check-Ins", pick: (s, r) => {
      const ids = new Set(s.activities.filter((a) => inRange(a.ts, r) && /check[- ]?in|moved in|move-in done/i.test(a.text)).map((a) => a.leadId).filter(Boolean) as string[]);
      return s.leads.filter((l) => ids.has(l.id));
    },
  },
];

function stageNotes(key: string, leads: Lead[], snap: CrmSnapshot): string[] {
  const notes: string[] = [];
  if (key === "tour-done") {
    const ids = new Set(leads.map((l) => l.id));
    const tours = snap.tours.filter((t) => ids.has(t.leadId) && t.status === "completed");
    const noPost = tours.filter((t) => !t.postTour?.filledAt).length;
    const quoted = new Set(snap.activities.filter((a) => /quot/i.test(a.text)).map((a) => a.leadId));
    const noQuote = tours.filter((t) => !quoted.has(t.leadId)).length;
    if (noPost) notes.push(`${noPost} missing post-tour update`);
    if (noQuote) notes.push(`${noQuote} without quotation`);
  }
  if (key === "quote") {
    const noBooking = leads.filter((l) => l.stage !== "booked").length;
    if (noBooking) notes.push(`${noBooking} not booked yet`);
  }
  if (key === "called") {
    const cold = leads.filter((l) => l.intent === "cold").length;
    if (cold) notes.push(`${cold} cold-intent calls`);
  }
  const orphan = leads.filter((l) => !l.nextFollowUpAt && l.stage !== "booked" && l.stage !== "dropped").length;
  if (orphan) notes.push(`${orphan} with no next action`);
  return notes;
}

function projectEod(count: number, range: Range, now = Date.now()) {
  const mid = new Date(now); mid.setHours(0, 0, 0, 0);
  const elapsedH = Math.max((now - +mid) / H, 0.5);
  const spanH = Math.max((range.to - range.from) / H, 0.5);
  const rate = count / spanH;
  return Math.round(count + rate * Math.max(0, 24 - elapsedH) * 0.55);
}

export function buildFunnel(snap: CrmSnapshot, range: Range, cmp: Range | null): StageStat[] {
  const out: StageStat[] = [];
  let prevCount = 0;
  STAGE_DEFS.forEach((def, i) => {
    const leads = dedupe(def.pick(snap, range));
    const prevLeads = cmp ? dedupe(def.pick(snap, cmp)) : null;
    const transition = leads
      .map((l) => Math.round((+new Date(l.updatedAt) - +new Date(l.createdAt)) / 60000))
      .filter((m) => m > 0);
    out.push({
      key: def.key,
      label: def.label,
      count: leads.length,
      prev: prevLeads ? prevLeads.length : null,
      conversion: i === 0 || prevCount === 0 ? 100 : Math.round((leads.length / prevCount) * 100),
      medianMins: median(transition),
      overdue: leads.filter((l) => l.nextFollowUpAt && +new Date(l.nextFollowUpAt) < Date.now()).length,
      projection: projectEod(leads.length, range),
      rows: leads.map((l) => leadRow(l, snap)).sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0)),
      notes: stageNotes(def.key, leads, snap),
    });
    prevCount = leads.length;
  });
  return out;
}

const dedupe = (ls: Lead[]) => Array.from(new Map(ls.map((l) => [l.id, l])).values());

/* ------------------------------ why engine ------------------------------ */

export interface WhyAnalysis {
  title: string;
  headline: string;
  zones: { name: string; current: number; prev: number; delta: number }[];
  chain: { label: string; current: number; prev: number; deltaPct: number }[];
  conclusion: string;
  people: { name: string; line: string; rows: BrainRow[] }[];
  rows: BrainRow[];
}

export function explain(stageKey: string, snap: CrmSnapshot, range: Range, cmp: Range | null): WhyAnalysis {
  const def = STAGE_DEFS.find((d) => d.key === stageKey)!;
  const cur = dedupe(def.pick(snap, range));
  const prev = cmp ? dedupe(def.pick(snap, cmp)) : [];

  const zoneMap = new Map<string, { current: number; prev: number }>();
  cur.forEach((l) => {
    const z = zoneOf(l);
    zoneMap.set(z, { current: (zoneMap.get(z)?.current ?? 0) + 1, prev: zoneMap.get(z)?.prev ?? 0 });
  });
  prev.forEach((l) => {
    const z = zoneOf(l);
    zoneMap.set(z, { current: zoneMap.get(z)?.current ?? 0, prev: (zoneMap.get(z)?.prev ?? 0) + 1 });
  });
  const zones = Array.from(zoneMap.entries())
    .map(([name, v]) => ({ name, current: v.current, prev: v.prev, delta: v.current - v.prev }))
    .sort((a, b) => a.delta - b.delta);

  const chain = STAGE_DEFS.map((d) => {
    const c = dedupe(d.pick(snap, range)).length;
    const p = cmp ? dedupe(d.pick(snap, cmp)).length : 0;
    const deltaPct = p === 0 ? (c === 0 ? 0 : 100) : Math.round(((c - p) / p) * 100);
    return { label: d.label, current: c, prev: p, deltaPct };
  });

  const worst = [...chain].sort((a, b) => a.deltaPct - b.deltaPct)[0];
  const conclusion = cmp
    ? `Biggest leakage is at ${worst.label} (${worst.deltaPct >= 0 ? "+" : ""}${worst.deltaPct}% vs ${cmp.label}). Fix that step and this number recovers.`
    : "Turn a comparison period on to see where the movement came from.";

  const byOwner = new Map<string, Lead[]>();
  cur.forEach((l) => {
    const k = ownerName(snap.tcms, l.assignedTcmId);
    byOwner.set(k, [...(byOwner.get(k) ?? []), l]);
  });
  const people = Array.from(byOwner.entries())
    .map(([name, ls]) => {
      const quoted = new Set(snap.activities.filter((a) => /quot/i.test(a.text)).map((a) => a.leadId));
      const q = ls.filter((l) => quoted.has(l.id)).length;
      return {
        name,
        line: `${ls.length} in this stage · ${q} quoted · ${ls.filter((l) => !l.nextFollowUpAt).length} with no next action`,
        rows: ls.map((l) => leadRow(l, snap, { problem: "Owned here", next: "Push to next stage" })),
      };
    })
    .sort((a, b) => b.rows.length - a.rows.length);

  return {
    title: `Why · ${def.label}`,
    headline: `${cur.length} in ${range.label}${cmp ? ` vs ${prev.length} in ${cmp.label}` : ""}`,
    zones,
    chain,
    conclusion,
    people,
    rows: cur.map((l) => leadRow(l, snap)),
  };
}

/* ------------------------------ live feed ------------------------------- */

export type FeedKind = "lead" | "call" | "tour" | "quote" | "booking" | "payment" | "checkin" | "sla" | "crm" | "admin";

export interface FeedEvent {
  id: string;
  ts: number;
  time: string;
  kind: FeedKind;
  text: string;
  zone: string;
  owner: string;
  leadId?: string;
  row?: BrainRow;
}

function classify(a: ActivityLog): FeedKind {
  if (a.kind === "lead_created") return "lead";
  if (a.kind === "call_logged") return "call";
  if (a.kind.startsWith("tour")) return "tour";
  if (a.kind === "escalation" || a.kind === "stale_alert") return "sla";
  if (/quot|pricing/i.test(a.text)) return "quote";
  if (/payment|token|₹/i.test(a.text)) return "payment";
  if (/check[- ]?in/i.test(a.text)) return "checkin";
  if (a.kind === "decision_logged") return "booking";
  return "crm";
}

export function buildFeed(snap: CrmSnapshot, range: Range, limit = 120): FeedEvent[] {
  const m = leadById(snap);
  const events: FeedEvent[] = snap.activities
    .filter((a) => inRange(a.ts, range))
    .map((a) => {
      const lead = a.leadId ? m.get(a.leadId) : undefined;
      return {
        id: a.id,
        ts: +new Date(a.ts),
        time: new Date(a.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        kind: classify(a),
        text: a.text,
        zone: zoneOf(lead),
        owner: ownerName(snap.tcms, a.actor),
        leadId: a.leadId,
        row: lead ? leadRow(lead, snap) : undefined,
      };
    });
  snap.bookings.filter((b) => inRange(b.ts, range)).forEach((b) => {
    const lead = m.get(b.leadId);
    events.push({
      id: `bk-${b.id}`,
      ts: +new Date(b.ts),
      time: new Date(b.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      kind: "booking",
      text: `Booking completed — ${money(b.amount)} — ${lead?.name ?? "customer"}`,
      zone: zoneOf(lead),
      owner: ownerName(snap.tcms, b.tcmId),
      leadId: b.leadId,
      row: lead ? leadRow(lead, snap) : undefined,
    });
  });
  return events.sort((a, b) => b.ts - a.ts).slice(0, limit);
}

/* --------------------------- recovery war room -------------------------- */

export interface RecoveryBucket {
  id: string;
  title: string;
  count: number;
  bookings: number;      // recoverable bookings
  revenue: number;       // recoverable monthly revenue
  deadline: string;
  rows: BrainRow[];
}

export function buildRecovery(snap: CrmSnapshot): RecoveryBucket[] {
  const m = leadById(snap);
  const quoted = new Set(snap.activities.filter((a) => /quot/i.test(a.text)).map((a) => a.leadId));

  const toursNoQuote = snap.tours
    .filter((t) => t.status === "completed" && !quoted.has(t.leadId))
    .map((t) => m.get(t.leadId))
    .filter(Boolean) as Lead[];

  const paymentReady = snap.leads.filter(
    (l) => (l.stage === "negotiation" || l.stage === "tour-done") && l.confidence >= 60 && minsAgo(l.updatedAt) > 120,
  );

  const hotBreached = snap.leads.filter(
    (l) => l.intent === "hot" && l.nextFollowUpAt && +new Date(l.nextFollowUpAt) < Date.now() - 60 * 60_000,
  );

  const cancelled = snap.tours
    .filter((t) => t.status === "cancelled" || t.status === "no-show")
    .map((t) => m.get(t.leadId))
    .filter(Boolean) as Lead[];

  const untouched = snap.leads.filter(
    (l) => !["booked", "dropped"].includes(l.stage) && minsAgo(l.updatedAt) > 24 * 60,
  );

  const mk = (id: string, title: string, leads: Lead[], convert: number, deadline: string, problem: string, next: string): RecoveryBucket => {
    const ls = dedupe(leads);
    return {
      id, title,
      count: ls.length,
      bookings: Math.round(ls.length * convert),
      revenue: Math.round(ls.reduce((s, l) => s + l.budget, 0) * convert),
      deadline,
      rows: ls.map((l) => leadRow(l, snap, { problem, next })).sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0)),
    };
  };

  return [
    mk("quote", "Tours done without quotation", toursNoQuote, 0.26, "Today 6:00 PM", "No quotation", "Send quotation now"),
    mk("payment", "Payment-ready customers untouched", paymentReady, 0.6, "Today 8:00 PM", "Payment-ready, cold", "Call and collect token"),
    mk("sla", "Hot leads past SLA", hotBreached, 0.22, "Next 2 hours", "SLA breached", "Call immediately"),
    mk("tour", "Cancelled / no-show tours unrecovered", cancelled, 0.25, "Today 7:00 PM", "Tour lost", "Rebook the tour"),
    mk("stale", "Active leads untouched 24h+", untouched, 0.08, "Tomorrow 1:15 PM", "Rotting", "Revive or close out"),
  ].filter((b) => b.count > 0);
}

/* ------------------------------- EOD bubble ----------------------------- */

export function buildEod(funnel: StageStat[], recovery: RecoveryBucket[], snap: CrmSnapshot, range: Range) {
  const g = (k: string) => funnel.find((f) => f.key === k)?.count ?? 0;
  const zoneScore = new Map<string, number>();
  snap.bookings.filter((b) => inRange(b.ts, range)).forEach((b) => {
    const l = snap.leads.find((x) => x.id === b.leadId);
    const z = zoneOf(l);
    zoneScore.set(z, (zoneScore.get(z) ?? 0) + 1);
  });
  const topZone = Array.from(zoneScore.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const ownerScore = new Map<string, number>();
  snap.bookings.filter((b) => inRange(b.ts, range)).forEach((b) => {
    const n = ownerName(snap.tcms, b.tcmId);
    ownerScore.set(n, (ownerScore.get(n) ?? 0) + 1);
  });
  const topOperator = Array.from(ownerScore.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const worstStep = [...funnel].filter((f) => f.count > 0).sort((a, b) => a.conversion - b.conversion)[0];

  const text = [
    "GHARPAYY EOD",
    "",
    `Window: ${range.label}`,
    `Leads worked: ${g("worked")}`,
    `Connections: ${g("connected")}`,
    `Tours scheduled: ${g("tour-sched")}`,
    `Tours done: ${g("tour-done")}`,
    `Post-tour completed: ${g("post-tour")}`,
    `Quotations: ${g("quote")}`,
    `Bookings: ${g("booking")}`,
    `Payments: ${g("payment")}`,
    `Check-ins: ${g("checkin")}`,
    "",
    "Pending:",
    ...recovery.map((r) => `${r.count} ${r.title.toLowerCase()} (${r.bookings} recoverable)`),
    "",
    `Top zone: ${topZone}`,
    `Top operator: ${topOperator}`,
    `Largest leakage: ${worstStep ? worstStep.label : "—"}`,
  ].join("\n");

  return { text, topZone, topOperator, worstStep };
}

/* -------------------------- one-call composite -------------------------- */

export interface CompanyNow {
  snap: CrmSnapshot;
  funnel: StageStat[];
  feed: FeedEvent[];
  recovery: RecoveryBucket[];
  eod: ReturnType<typeof buildEod>;
  recoverableBookings: number;
  recoverableRevenue: number;
}

export function buildCompanyNow(range: Range, cmp: Range | null): CompanyNow {
  const snap = crmSnapshot();
  const funnel = buildFunnel(snap, range, cmp);
  const feed = buildFeed(snap, range);
  const recovery = buildRecovery(snap);
  const eod = buildEod(funnel, recovery, snap, range);
  return {
    snap,
    funnel,
    feed,
    recovery,
    eod,
    recoverableBookings: recovery.reduce((s, r) => s + r.bookings, 0),
    recoverableRevenue: recovery.reduce((s, r) => s + r.revenue, 0),
  };
}

export type { Booking, FollowUp, Tour };
