/**
 * Company Pulse + People deep-dive.
 *
 * Answers two founder questions from the live CRM store only:
 *  1. What actually happened in the last 6h / today / 24h / 48h / 3d / 7d?
 *  2. Who is doing it — calls, leads touched, tours scheduled vs done,
 *     outcomes captured, quotations, bookings, and what they are ignoring.
 *
 * Every number carries its underlying rows so the UI can drill into "why".
 */
import type { ActivityLog, Booking, FollowUp, Lead, TCM, Tour } from "@/lib/types";
import { crmSnapshot, type CrmSnapshot } from "@/founder/lib/crm-link";
import type { BrainRow, Metric } from "./engine";

/* ------------------------------- windows ------------------------------- */

export type WindowKey = "6h" | "today" | "24h" | "48h" | "3d" | "7d";

export const WINDOW_OPTIONS: { id: WindowKey; label: string; hint: string }[] = [
  { id: "6h", label: "Last 6h", hint: "What just happened" },
  { id: "today", label: "Today", hint: "Since midnight" },
  { id: "24h", label: "24h", hint: "Rolling day" },
  { id: "48h", label: "48h", hint: "Two-day momentum" },
  { id: "3d", label: "3 days", hint: "Short trend" },
  { id: "7d", label: "7 days", hint: "Weekly shape" },
];

const H = 3_600_000;

export function windowRange(key: WindowKey, now = Date.now()): { from: number; to: number; label: string; hours: number } {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  switch (key) {
    case "6h": return { from: now - 6 * H, to: now, label: "Last 6 hours", hours: 6 };
    case "today": return { from: +midnight, to: now, label: "Today", hours: Math.max((now - +midnight) / H, 1) };
    case "24h": return { from: now - 24 * H, to: now, label: "Last 24 hours", hours: 24 };
    case "48h": return { from: now - 48 * H, to: now, label: "Last 48 hours", hours: 48 };
    case "3d": return { from: now - 72 * H, to: now, label: "Last 3 days", hours: 72 };
    case "7d": return { from: now - 168 * H, to: now, label: "Last 7 days", hours: 168 };
  }
}

/* -------------------------------- helpers ------------------------------- */

const ACTIVE = new Set<Lead["stage"]>(["new", "contacted", "tour-scheduled", "tour-done", "negotiation"]);
const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function nameOf(tcms: TCM[], id: string) {
  return tcms.find((t) => t.id === id)?.name ?? (id === "flow-ops" ? "Flow Ops" : id === "system" ? "System" : "Unassigned");
}
function zoneOf(tcms: TCM[], id: string) {
  return tcms.find((t) => t.id === id)?.zone ?? "Unzoned";
}

function leadRow(l: Lead, tcms: TCM[], problem?: string, nextAction = "Call now", impact?: string): BrainRow {
  return {
    id: l.id, kind: "lead", leadId: l.id, phone: l.phone,
    title: l.name,
    subtitle: `${l.stage} · ${l.intent} · ${money(l.budget)} · move-in ${l.moveInDate}`,
    owner: nameOf(tcms, l.assignedTcmId),
    zone: zoneOf(tcms, l.assignedTcmId),
    problem, impact, nextAction,
  };
}

function tourRow(t: Tour, leads: Lead[], tcms: TCM[], problem?: string, nextAction = "Confirm outcome"): BrainRow {
  const l = leads.find((x) => x.id === t.leadId);
  return {
    id: t.id, kind: "tour", leadId: t.leadId, phone: l?.phone,
    title: l?.name ?? t.leadId,
    subtitle: `${t.status} · ${when(t.scheduledAt)}${t.postTour?.filledAt ? " · outcome captured" : ""}`,
    owner: nameOf(tcms, t.tcmId),
    zone: zoneOf(tcms, t.tcmId),
    problem, nextAction,
  };
}

function activityRow(a: ActivityLog, leads: Lead[], tcms: TCM[]): BrainRow {
  const l = leads.find((x) => x.id === a.leadId);
  return {
    id: a.id, kind: "lead", leadId: a.leadId, phone: l?.phone,
    title: l?.name ?? a.kind.replace(/_/g, " "),
    subtitle: `${a.text} · ${when(a.ts)}`,
    owner: nameOf(tcms, a.actor),
    zone: zoneOf(tcms, a.actor),
    nextAction: "Open lead",
  };
}

const QUOTE_RE = /quot|token|booking amount|advance/i;
const isQuote = (a: ActivityLog) => QUOTE_RE.test(a.text);

/* ------------------------------ person model ---------------------------- */

export interface PersonPulse {
  id: string;
  name: string;
  zone: string;
  /* activity in window */
  calls: number;
  activities: number;
  leadsTouched: number;
  notes: number;
  messages: number;
  /* pipeline movement */
  toursScheduled: number;
  toursDone: number;
  toursNoOutcome: number;
  quotes: number;
  bookings: number;
  revenue: number;
  /* ownership hygiene */
  leadsOwned: number;
  activeLeads: number;
  untouched: number;       // active leads with zero activity in window
  stale3d: number;         // no activity for 3+ days
  noNextAction: number;
  overdue: number;
  /* scoring */
  effort: number;          // 0-100
  outcome: number;         // 0-100
  discipline: number;      // 0-100
  score: number;           // weighted
  grade: "A" | "B" | "C" | "D";
  flags: string[];
  drills: Record<string, BrainRow[]>;
}

export interface PulseModel {
  range: { from: number; to: number; label: string; hours: number };
  headline: Metric[];
  movement: Metric[];
  risk: Metric[];
  people: PersonPulse[];
  feed: BrainRow[];
  totals: {
    activities: number;
    calls: number;
    leadsTouched: number;
    bookings: number;
    revenue: number;
    perHour: number;
  };
}

/* -------------------------------- builder ------------------------------- */

export function buildPulse(
  key: WindowKey,
  snap: CrmSnapshot = crmSnapshot(),
  now = Date.now(),
  zoneFilter = "all",
): PulseModel {
  const range = windowRange(key, now);
  const inWin = (iso?: string | null) => !!iso && +new Date(iso) >= range.from && +new Date(iso) <= range.to;

  const tcms = snap.tcms.filter((t) => zoneFilter === "all" || t.zone === zoneFilter);
  const ids = new Set(tcms.map((t) => t.id));
  const owned = (id: string) => zoneFilter === "all" || ids.has(id);

  const leads = snap.leads.filter((l) => owned(l.assignedTcmId));
  const tours = snap.tours.filter((t) => owned(t.tcmId));
  const bookings = snap.bookings.filter((b) => owned(b.tcmId));
  const followUps = snap.followUps.filter((f) => owned(f.tcmId) && !f.done);
  const acts = snap.activities.filter((a) => inWin(a.ts) && (zoneFilter === "all" || ids.has(a.actor)));

  const winCalls = acts.filter((a) => a.kind === "call_logged");
  const winNotes = acts.filter((a) => a.kind === "note_added");
  const winMsgs = acts.filter((a) => a.kind === "message_sent");
  const winQuotes = acts.filter(isQuote);
  const touchedIds = new Set(acts.map((a) => a.leadId).filter(Boolean) as string[]);

  const newLeads = leads.filter((l) => inWin(l.createdAt));
  const winTours = tours.filter((t) => inWin(t.createdAt));
  const winDone = tours.filter((t) => t.status === "completed" && inWin(t.updatedAt));
  const winNoShow = tours.filter((t) => t.status === "no-show" && inWin(t.updatedAt));
  const winBookings = bookings.filter((b) => inWin(b.ts));
  const winPostTour = tours.filter((t) => inWin(t.postTour?.filledAt ?? null));

  const active = leads.filter((l) => ACTIVE.has(l.stage));
  const untouched = active.filter((l) => !touchedIds.has(l.id));
  const lastTouch = (leadId: string) => {
    const rows = snap.activities.filter((a) => a.leadId === leadId);
    return rows.length ? Math.max(...rows.map((a) => +new Date(a.ts))) : 0;
  };
  const stale = active.filter((l) => now - Math.max(lastTouch(l.id), +new Date(l.createdAt)) > 3 * 24 * H);
  const noNext = active.filter((l) => !l.nextFollowUpAt);
  const overdue = followUps.filter((f) => +new Date(f.dueAt) < now);
  const tourNoOutcome = tours.filter((t) => t.status === "completed" && !t.postTour?.filledAt);
  const towardsClosing = active.filter((l) => l.stage === "negotiation" || l.stage === "tour-done");

  const m = (k: string, label: string, value: number, rows: BrainRow[], tone: Metric["tone"] = "plain", suffix?: string): Metric =>
    ({ key: k, label, value, rows, tone, suffix });

  const headline: Metric[] = [
    m("activities", "Activities logged", acts.length, acts.map((a) => activityRow(a, leads, tcms)), acts.length ? "good" : "bad"),
    m("calls", "Calls made", winCalls.length, winCalls.map((a) => activityRow(a, leads, tcms)), winCalls.length ? "good" : "bad"),
    m("touched", "Leads talked to", touchedIds.size, [...touchedIds].map((id) => leads.find((l) => l.id === id)).filter(Boolean).map((l) => leadRow(l as Lead, tcms, undefined, "Open timeline")), "plain"),
    m("closing", "Towards closing", towardsClosing.length, towardsClosing.map((l) => leadRow(l, tcms, undefined, "Push to token")), towardsClosing.length ? "good" : "warn"),
    m("bookings", "Bookings", winBookings.length, winBookings.map((b) => {
      const l = leads.find((x) => x.id === b.leadId);
      return { id: b.id, kind: "booking" as const, leadId: b.leadId, phone: l?.phone, title: l?.name ?? b.leadId, subtitle: `${money(b.amount)} · ${when(b.ts)}`, owner: nameOf(tcms, b.tcmId), zone: zoneOf(tcms, b.tcmId), nextAction: "Confirm check-in date" };
    }), winBookings.length ? "good" : "warn"),
    m("revenue", "Booked value", winBookings.reduce((s, b) => s + b.amount, 0), [], "plain", "₹"),
  ];

  const movement: Metric[] = [
    m("new", "New leads in", newLeads.length, newLeads.map((l) => leadRow(l, tcms, undefined, "Qualify now")), "plain"),
    m("tours-booked", "Tours scheduled", winTours.length, winTours.map((t) => tourRow(t, leads, tcms, undefined, "Confirm with customer")), winTours.length ? "good" : "warn"),
    m("tours-done", "Tours completed", winDone.length, winDone.map((t) => tourRow(t, leads, tcms)), winDone.length ? "good" : "warn"),
    m("post-tour", "Post-tour outcomes", winPostTour.length, winPostTour.map((t) => tourRow(t, leads, tcms, undefined, "Review outcome")), winPostTour.length ? "good" : "warn"),
    m("quotes", "Quotation / token talk", winQuotes.length, winQuotes.map((a) => activityRow(a, leads, tcms)), winQuotes.length ? "good" : "warn"),
    m("no-show", "No-shows", winNoShow.length, winNoShow.map((t) => tourRow(t, leads, tcms, "Customer did not turn up", "Re-book tour")), winNoShow.length ? "bad" : "good"),
    m("notes", "Notes captured", winNotes.length, winNotes.map((a) => activityRow(a, leads, tcms)), "plain"),
    m("messages", "WhatsApp sent", winMsgs.length, winMsgs.map((a) => activityRow(a, leads, tcms)), "plain"),
  ];

  const risk: Metric[] = [
    m("untouched", "Active leads untouched", untouched.length, untouched.map((l) => leadRow(l, tcms, `No activity in ${range.label.toLowerCase()}`, "Call now", "Pipeline going cold")), untouched.length ? "bad" : "good"),
    m("stale", "Cold 3+ days", stale.length, stale.map((l) => leadRow(l, tcms, "No touch for 3+ days", "Revive today", "Lead dying")), stale.length ? "bad" : "good"),
    m("no-next", "No next action", noNext.length, noNext.map((l) => leadRow(l, tcms, "No follow-up set", "Set next step")), noNext.length ? "bad" : "good"),
    m("overdue", "Overdue follow-ups", overdue.length, overdue.map((f) => {
      const l = leads.find((x) => x.id === f.leadId);
      return { id: f.id, kind: "lead" as const, leadId: f.leadId, phone: l?.phone, title: l?.name ?? f.leadId, subtitle: `${f.reason} · due ${when(f.dueAt)}`, owner: nameOf(tcms, f.tcmId), zone: zoneOf(tcms, f.tcmId), problem: "Overdue", overdue: `${Math.round((now - +new Date(f.dueAt)) / 60000)}m late`, nextAction: "Call now" };
    }), overdue.length ? "bad" : "good"),
    m("tour-no-outcome", "Tours without outcome", tourNoOutcome.length, tourNoOutcome.map((t) => tourRow(t, leads, tcms, "Tour done, nothing captured", "Fill post-tour")), tourNoOutcome.length ? "bad" : "good"),
  ];

  /* ------------------------------- people ------------------------------- */

  const people: PersonPulse[] = tcms.map((t) => {
    const myActs = acts.filter((a) => a.actor === t.id);
    const myCalls = myActs.filter((a) => a.kind === "call_logged");
    const myNotes = myActs.filter((a) => a.kind === "note_added");
    const myMsgs = myActs.filter((a) => a.kind === "message_sent");
    const myQuotes = myActs.filter(isQuote);
    const myTouched = new Set(myActs.map((a) => a.leadId).filter(Boolean) as string[]);

    const mine = leads.filter((l) => l.assignedTcmId === t.id);
    const myActive = mine.filter((l) => ACTIVE.has(l.stage));
    const myUntouched = myActive.filter((l) => !myTouched.has(l.id));
    const myStale = stale.filter((l) => l.assignedTcmId === t.id);
    const myNoNext = myActive.filter((l) => !l.nextFollowUpAt);
    const myOverdue = overdue.filter((f) => f.tcmId === t.id);
    const mySched = winTours.filter((x) => x.tcmId === t.id);
    const myDone = winDone.filter((x) => x.tcmId === t.id);
    const myNoOutcome = tourNoOutcome.filter((x) => x.tcmId === t.id);
    const myBookings = winBookings.filter((b) => b.tcmId === t.id);

    const callTarget = Math.max(Math.round((range.hours / 9) * 25), 5);
    const effort = Math.min(Math.round((myCalls.length / callTarget) * 100), 100);
    const outcome = Math.min(
      Math.round(((myDone.length * 2 + myQuotes.length + myBookings.length * 4) / Math.max(callTarget / 4, 1)) * 100),
      100,
    );
    const disciplineBase =
      100
      - Math.min(myUntouched.length * 6, 40)
      - Math.min(myOverdue.length * 8, 30)
      - Math.min(myNoOutcome.length * 10, 30);
    const discipline = Math.max(disciplineBase, 0);
    const score = Math.round(effort * 0.35 + outcome * 0.35 + discipline * 0.3);
    const grade: PersonPulse["grade"] = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";

    const flags: string[] = [];
    if (myCalls.length === 0) flags.push("No calls in window");
    if (myNoOutcome.length) flags.push(`${myNoOutcome.length} tour${myNoOutcome.length > 1 ? "s" : ""} without outcome`);
    if (myOverdue.length) flags.push(`${myOverdue.length} overdue follow-up${myOverdue.length > 1 ? "s" : ""}`);
    if (myUntouched.length > myActive.length * 0.5 && myActive.length) flags.push("Half the pipeline untouched");
    if (mySched.length && myDone.length === 0) flags.push("Schedules tours, no completions");
    if (myDone.length && myQuotes.length === 0) flags.push("Tours done, no quotation talk");

    return {
      id: t.id, name: t.name, zone: t.zone,
      calls: myCalls.length,
      activities: myActs.length,
      leadsTouched: myTouched.size,
      notes: myNotes.length,
      messages: myMsgs.length,
      toursScheduled: mySched.length,
      toursDone: myDone.length,
      toursNoOutcome: myNoOutcome.length,
      quotes: myQuotes.length,
      bookings: myBookings.length,
      revenue: myBookings.reduce((s, b) => s + b.amount, 0),
      leadsOwned: mine.length,
      activeLeads: myActive.length,
      untouched: myUntouched.length,
      stale3d: myStale.length,
      noNextAction: myNoNext.length,
      overdue: myOverdue.length,
      effort, outcome, discipline, score, grade, flags,
      drills: {
        calls: myCalls.map((a) => activityRow(a, leads, tcms)),
        activities: myActs.map((a) => activityRow(a, leads, tcms)),
        touched: [...myTouched].map((id) => mine.find((l) => l.id === id)).filter(Boolean).map((l) => leadRow(l as Lead, tcms, undefined, "Open timeline")),
        owned: mine.map((l) => leadRow(l, tcms)),
        untouched: myUntouched.map((l) => leadRow(l, tcms, "Untouched in window", "Call now")),
        stale: myStale.map((l) => leadRow(l, tcms, "Cold 3+ days", "Revive")),
        noNext: myNoNext.map((l) => leadRow(l, tcms, "No next action", "Set follow-up")),
        overdue: myOverdue.map((f) => {
          const l = mine.find((x) => x.id === f.leadId);
          return { id: f.id, kind: "lead" as const, leadId: f.leadId, phone: l?.phone, title: l?.name ?? f.leadId, subtitle: `${f.reason} · due ${when(f.dueAt)}`, owner: t.name, zone: t.zone, problem: "Overdue", nextAction: "Call now" };
        }),
        scheduled: mySched.map((x) => tourRow(x, leads, tcms)),
        done: myDone.map((x) => tourRow(x, leads, tcms)),
        noOutcome: myNoOutcome.map((x) => tourRow(x, leads, tcms, "No post-tour update", "Fill outcome")),
        quotes: myQuotes.map((a) => activityRow(a, leads, tcms)),
        bookings: myBookings.map((b) => {
          const l = mine.find((x) => x.id === b.leadId);
          return { id: b.id, kind: "booking" as const, leadId: b.leadId, phone: l?.phone, title: l?.name ?? b.leadId, subtitle: `${money(b.amount)} · ${when(b.ts)}`, owner: t.name, zone: t.zone, nextAction: "Confirm check-in" };
        }),
      },
    };
  }).sort((a, b) => b.score - a.score);

  const feed = [...acts]
    .sort((a, b) => +new Date(b.ts) - +new Date(a.ts))
    .slice(0, 60)
    .map((a) => activityRow(a, leads, tcms));

  return {
    range,
    headline, movement, risk, people, feed,
    totals: {
      activities: acts.length,
      calls: winCalls.length,
      leadsTouched: touchedIds.size,
      bookings: winBookings.length,
      revenue: winBookings.reduce((s, b) => s + b.amount, 0),
      perHour: Math.round((acts.length / Math.max(range.hours, 1)) * 10) / 10,
    },
  };
}

export type { Booking, FollowUp };
