/**
 * PEOPLE NOW — per-person operating truth for the Founder OS.
 *
 * Every number here is derived from the live CRM snapshot inside the active
 * time window, and every number carries the rows behind it so the founder can
 * click any figure and see exactly which customers created it.
 */
import type { ActivityLog, Lead, TCM } from "@/lib/types";
import type { CrmSnapshot } from "@/founder/lib/crm-link";
import type { BrainRow, Metric } from "./engine";
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
const pct = (n: number, d: number) => (d <= 0 ? 0 : Math.round((n / d) * 100));

export const connectedCall = (a: ActivityLog) =>
  !/no answer|not reachable|unreachable|busy|switched off|missed/i.test(a.text);

export const isQuote = (a: ActivityLog) => /quot|pricing|price sent|offer/i.test(a.text);
export const isCheckin = (a: ActivityLog) => /check[- ]?in|moved in|move-in/i.test(a.text);

function row(l: Lead, tcms: TCM[], problem?: string, next?: string): BrainRow {
  const overdue = l.nextFollowUpAt ? Math.round((Date.now() - +new Date(l.nextFollowUpAt)) / 60000) : 0;
  return {
    id: l.id,
    kind: "lead",
    title: l.name,
    subtitle: `${l.stage} · ${l.intent} · ${money(l.budget)} · ${l.preferredArea || "Unzoned"} · last touch ${agoText(l.updatedAt)}`,
    owner: tcms.find((t) => t.id === l.assignedTcmId)?.name ?? "Unassigned",
    zone: l.preferredArea || "Unzoned",
    problem,
    impact: `${l.confidence}% booking probability`,
    overdue: overdue > 0 ? `${overdue}m overdue` : undefined,
    nextAction: next ?? (l.nextFollowUpAt ? "Follow up now" : "Set next action"),
    leadId: l.id,
    phone: l.phone,
    severity: l.confidence + (l.intent === "hot" ? 40 : l.intent === "warm" ? 15 : 0) + Math.max(0, Math.min(overdue, 240)) / 4,
  };
}

const m = (
  key: string,
  label: string,
  value: number,
  rows: BrainRow[],
  tone: Metric["tone"] = "plain",
  suffix?: string,
): Metric => ({ key, label, value, rows, tone, suffix });

export interface MomentSet {
  key: string;
  label: string;
  from: number;
  to: number;
  rate: number;
  rows: BrainRow[];
  stuck: number;
  stuckRows: BrainRow[];
}

export interface PersonNow {
  id: string;
  name: string;
  initials: string;
  role: string;
  zone: string;
  /* headline scores */
  effort: number;
  outcome: number;
  discipline: number;
  score: number;
  grade: "A" | "B" | "C" | "D";
  verdict: string;
  flags: string[];
  lastSeen: string;
  /* attention states */
  loggedInToday: boolean;
  zeroDay: boolean;
  star: boolean;
  /* raw values used for the sheet view */
  v: Record<string, number>;
  /* same keys for the comparison window (empty when comparison is off) */
  pv: Record<string, number>;
  moments: MomentSet[];
  metrics: { group: string; items: Metric[] }[];
  timeline: { ts: number; time: string; text: string; kind: string; leadId?: string }[];
  checkpoints: { id: string; label: string; at: string; state: "done" | "late" | "missed" | "upcoming"; proof: string }[];
}


const CHECKPOINTS = [
  { id: "goal", label: "Goal Set", hour: 10, minute: 35 },
  { id: "reality", label: "Reality Check", hour: 13, minute: 15 },
  { id: "recovery", label: "Recovery Check", hour: 17, minute: 0 },
  { id: "impact", label: "Impact Check", hour: 20, minute: 0 },
];

export function checkpointTimes(now = Date.now()) {
  return CHECKPOINTS.map((c) => {
    const d = new Date(now);
    d.setHours(c.hour, c.minute, 0, 0);
    return { ...c, ts: +d, at: `${String(c.hour).padStart(2, "0")}:${String(c.minute).padStart(2, "0")}` };
  });
}

function personCheckpoints(acts: ActivityLog[], now = Date.now()) {
  const times = checkpointTimes(now);
  return times.map((c, i) => {
    const windowStart = i === 0 ? c.ts - 4 * H : times[i - 1].ts;
    const before = acts.filter((a) => +new Date(a.ts) >= windowStart && +new Date(a.ts) <= c.ts);
    const after = acts.filter((a) => +new Date(a.ts) > c.ts && +new Date(a.ts) <= c.ts + 90 * 60_000);
    if (now < c.ts) {
      return { id: c.id, label: c.label, at: c.at, state: "upcoming" as const, proof: "Window still open" };
    }
    if (before.length) {
      return { id: c.id, label: c.label, at: c.at, state: "done" as const, proof: `${before.length} actions logged before ${c.at}` };
    }
    if (after.length) {
      return { id: c.id, label: c.label, at: c.at, state: "late" as const, proof: `First action ${new Date(after[after.length - 1].ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} — after the gate` };
    }
    return { id: c.id, label: c.label, at: c.at, state: "missed" as const, proof: `No work logged around ${c.at}` };
  });
}

export function buildPeople(snap: CrmSnapshot, range: Range, cmp: Range | null): PersonNow[] {
  const leadOf = new Map(snap.leads.map((l) => [l.id, l] as const));
  const quotedLeadIds = new Set(snap.activities.filter(isQuote).map((a) => a.leadId).filter(Boolean) as string[]);

  return snap.tcms.map((t) => {
    const acts = snap.activities.filter((a) => a.actor === t.id);
    const inWin = acts.filter((a) => inRange(a.ts, range));
    const prevWin = cmp ? acts.filter((a) => inRange(a.ts, cmp)) : [];

    const mine = snap.leads.filter((l) => l.assignedTcmId === t.id);
    const active = mine.filter((l) => !["booked", "dropped"].includes(l.stage));
    const touchedIds = new Set(inWin.map((a) => a.leadId).filter(Boolean) as string[]);
    const touched = mine.filter((l) => touchedIds.has(l.id));
    const untouched = active.filter((l) => !touchedIds.has(l.id));
    const untouched48 = active.filter((l) => minsAgo(l.updatedAt) > 48 * 60);
    const noNext = active.filter((l) => !l.nextFollowUpAt);
    const hotIdle = active.filter((l) => l.intent === "hot" && !touchedIds.has(l.id));

    const calls = inWin.filter((a) => a.kind === "call_logged");
    const conn = calls.filter(connectedCall);
    const msgs = inWin.filter((a) => a.kind === "message_sent");
    const notes = inWin.filter((a) => a.kind === "note_added");

    const myTours = snap.tours.filter((x) => x.tcmId === t.id);
    const sched = myTours.filter((x) => inRange(x.createdAt, range));
    const done = myTours.filter((x) => x.status === "completed" && inRange(x.updatedAt, range));
    const noShow = myTours.filter((x) => (x.status === "cancelled" || x.status === "no-show") && inRange(x.updatedAt, range));
    const postDone = done.filter((x) => x.postTour?.filledAt);
    const postMissing = myTours.filter((x) => x.status === "completed" && !x.postTour?.filledAt);
    const scheduledNoOutcome = myTours.filter((x) => x.status === "scheduled" && +new Date(x.scheduledAt) < Date.now());

    const quotes = inWin.filter(isQuote);
    const checkins = inWin.filter(isCheckin);
    const bookings = snap.bookings.filter((b) => b.tcmId === t.id && inRange(b.ts, range));
    const revenue = bookings.reduce((s, b) => s + b.amount, 0);

    const fus = snap.followUps.filter((f) => f.tcmId === t.id && !f.done);
    const overdue = fus.filter((f) => +new Date(f.dueAt) < Date.now());
    const fusDone = snap.followUps.filter((f) => f.tcmId === t.id && f.done);

    const toRows = (as: ActivityLog[], problem?: string, next?: string) =>
      Array.from(new Set(as.map((a) => a.leadId).filter(Boolean) as string[]))
        .map((id) => leadOf.get(id))
        .filter(Boolean)
        .map((l) => row(l as Lead, snap.tcms, problem, next));

    const leadRows = (ls: Lead[], problem?: string, next?: string) =>
      ls.map((l) => row(l, snap.tcms, problem, next)).sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));

    const tourRows = (ts: typeof myTours, problem: string, next: string) =>
      ts.map((x) => leadOf.get(x.leadId)).filter(Boolean).map((l) => row(l as Lead, snap.tcms, problem, next));

    /* -------------------------- momentum in window --------------------- */
    const newLeads = mine.filter((l) => inRange(l.createdAt, range));
    const oldContacted = mine.filter((l) => touchedIds.has(l.id) && !inRange(l.createdAt, range));
    const movedLeads = mine.filter((l) =>
      inWin.some((a) => a.leadId === l.id && /stage|moved|tour|quot|booked|token|check[- ]?in/i.test(a.text)),
    );
    const loggedInToday = acts.some((a) => {
      const d = new Date(a.ts);
      const n = new Date();
      return d.toDateString() === n.toDateString();
    });

    /* ------------------------------ moments ---------------------------- */
    const quotedMine = new Set(quotes.map((a) => a.leadId).filter(Boolean) as string[]);
    const mTourDone: MomentSet = {
      key: "tour-to-done",
      label: "Tour → Done",
      from: sched.length,
      to: done.length,
      rate: pct(done.length, sched.length),
      rows: tourRows(done, "Tour completed", "Send quotation now"),
      stuck: scheduledNoOutcome.length,
      stuckRows: tourRows(scheduledNoOutcome, "Tour time passed, no outcome", "Mark outcome now"),
    };
    const quoteBookings = bookings.filter((b) => quotedLeadIds.has(b.leadId));
    const mQuoteBooking: MomentSet = {
      key: "quote-to-booking",
      label: "Quotation → Booking",
      from: quotes.length,
      to: bookings.length,
      rate: pct(bookings.length, quotes.length || quoteBookings.length),
      rows: bookings.map((b) => leadOf.get(b.leadId)).filter(Boolean).map((l) => row(l as Lead, snap.tcms, undefined, "Move to check-in")),
      stuck: done.filter((x) => !quotedMine.has(x.leadId) && !quotedLeadIds.has(x.leadId)).length,
      stuckRows: tourRows(done.filter((x) => !quotedMine.has(x.leadId) && !quotedLeadIds.has(x.leadId)), "Toured, no quotation", "Send quotation"),
    };
    const bookedNoCheckin = snap.bookings.filter(
      (b) => b.tcmId === t.id && !snap.activities.some((a) => a.leadId === b.leadId && isCheckin(a)),
    );
    const mCheckin: MomentSet = {
      key: "booking-to-checkin",
      label: "Booking → Check-in",
      from: bookings.length,
      to: checkins.length,
      rate: pct(checkins.length, bookings.length),
      rows: toRows(checkins, undefined, "Confirm move-in experience"),
      stuck: bookedNoCheckin.length,
      stuckRows: bookedNoCheckin.map((b) => leadOf.get(b.leadId)).filter(Boolean).map((l) => row(l as Lead, snap.tcms, "Booked, no check-in yet", "Lock the check-in date")),
    };
    const moments = [mTourDone, mQuoteBooking, mCheckin];



    /* ------------------------------ scores ----------------------------- */
    const effortRaw = calls.length * 3 + conn.length * 4 + msgs.length * 1.5 + notes.length;
    const effort = Math.min(100, Math.round(effortRaw * 2));
    const outcome = Math.min(
      100,
      Math.round(sched.length * 8 + done.length * 14 + quotes.length * 10 + bookings.length * 25 + checkins.length * 15),
    );
    const discipline = Math.max(
      0,
      100 -
        overdue.length * 8 -
        untouched.length * 3 -
        noNext.length * 4 -
        postMissing.length * 6 -
        scheduledNoOutcome.length * 5,
    );
    const score = Math.round(effort * 0.3 + outcome * 0.45 + discipline * 0.25);
    const grade: PersonNow["grade"] = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";

    const flags: string[] = [];
    if (calls.length === 0) flags.push("No calls in this window");
    if (postMissing.length) flags.push(`${postMissing.length} tours without post-tour update`);
    if (scheduledNoOutcome.length) flags.push(`${scheduledNoOutcome.length} tours past time, no outcome`);
    if (done.length && quotes.length === 0) flags.push("Tours done, zero quotations");
    if (overdue.length > 2) flags.push(`${overdue.length} overdue follow-ups`);
    if (hotIdle.length) flags.push(`${hotIdle.length} hot leads untouched`);
    if (untouched48.length > 4) flags.push(`${untouched48.length} leads rotting 48h+`);

    const prevCalls = prevWin.filter((a) => a.kind === "call_logged").length;
    const trend = calls.length - prevCalls;
    const verdict =
      grade === "A"
        ? `Top performer this window — ${bookings.length} bookings, ${done.length} tours done.`
        : grade === "B"
          ? `Working, but leaking: ${flags[0] ?? "tighten follow-through"}.`
          : grade === "C"
            ? `Falling behind — effort ${effort}, outcome ${outcome}. ${flags[0] ?? ""}`
            : `Not operating. ${flags[0] ?? "No meaningful activity in this window."}`;

    const timeline = inWin
      .slice()
      .sort((a, b) => +new Date(b.ts) - +new Date(a.ts))
      .slice(0, 60)
      .map((a) => ({
        ts: +new Date(a.ts),
        time: new Date(a.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        text: a.text,
        kind: a.kind,
        leadId: a.leadId,
      }));

    const v = {
      leads: mine.length,
      active: active.length,
      touched: touched.length,
      untouched: untouched.length,
      untouched48: untouched48.length,
      noNext: noNext.length,
      hotIdle: hotIdle.length,
      calls: calls.length,
      connected: conn.length,
      connectRate: pct(conn.length, calls.length),
      messages: msgs.length,
      notes: notes.length,
      toursScheduled: sched.length,
      toursDone: done.length,
      tourShowRate: pct(done.length, sched.length),
      noShow: noShow.length,
      postTour: postDone.length,
      postMissing: postMissing.length,
      staleTours: scheduledNoOutcome.length,
      quotes: quotes.length,
      bookings: bookings.length,
      checkins: checkins.length,
      revenue,
      overdue: overdue.length,
      followUpsDone: fusDone.length,
      activity: inWin.length,
      newLeads: newLeads.length,
      oldContacted: oldContacted.length,
      moved: movedLeads.length,
      tourDoneRate: mTourDone.rate,
      quoteBookRate: mQuoteBooking.rate,
      checkinRate: mCheckin.rate,
      momentsStuck: moments.reduce((s, x) => s + x.stuck, 0),
      trend,
      effort,
      outcome,
      discipline,
      score,
    };

    /* --------------------- comparison window values -------------------- */
    const pv: Record<string, number> = {};
    if (cmp) {
      const pCalls = prevWin.filter((a) => a.kind === "call_logged");
      const pQuotes = prevWin.filter(isQuote);
      const pCheckins = prevWin.filter(isCheckin);
      const pSched = myTours.filter((x) => inRange(x.createdAt, cmp));
      const pDone = myTours.filter((x) => x.status === "completed" && inRange(x.updatedAt, cmp));
      const pBookings = snap.bookings.filter((b) => b.tcmId === t.id && inRange(b.ts, cmp));
      Object.assign(pv, {
        calls: pCalls.length,
        connected: pCalls.filter(connectedCall).length,
        connectRate: pct(pCalls.filter(connectedCall).length, pCalls.length),
        messages: prevWin.filter((a) => a.kind === "message_sent").length,
        notes: prevWin.filter((a) => a.kind === "note_added").length,
        toursScheduled: pSched.length,
        toursDone: pDone.length,
        quotes: pQuotes.length,
        bookings: pBookings.length,
        checkins: pCheckins.length,
        revenue: pBookings.reduce((s, b) => s + b.amount, 0),
        activity: prevWin.length,
        newLeads: mine.filter((l) => inRange(l.createdAt, cmp)).length,
        oldContacted: prevWin.filter((a) => a.leadId && !inRange(leadOf.get(a.leadId)?.createdAt, cmp)).length,
        tourDoneRate: pct(pDone.length, pSched.length),
        quoteBookRate: pct(pBookings.length, pQuotes.length),
        checkinRate: pct(pCheckins.length, pBookings.length),
      });
    }

    const zeroDay = calls.length === 0 && sched.length === 0 && quotes.length === 0 && bookings.length === 0;
    const star =
      bookings.length > 0 ||
      (done.length >= 2 && quotes.length >= 2) ||
      (calls.length >= 12 && conn.length >= 6 && sched.length >= 2);



    const metrics: PersonNow["metrics"] = [
      {
        group: "Pipeline",
        items: [
          m("leads", "Total leads", mine.length, leadRows(mine)),
          m("active", "Active leads", active.length, leadRows(active)),
          m("touched", "Worked in window", touched.length, leadRows(touched), touched.length ? "good" : "bad"),
          m("untouched", "Untouched in window", untouched.length, leadRows(untouched, "Not touched in this window", "Call today"), untouched.length ? "bad" : "good"),
          m("untouched48", "Rotting 48h+", untouched48.length, leadRows(untouched48, "No touch in 48h", "Revive or close out"), untouched48.length ? "bad" : "good"),
          m("noNext", "No next action", noNext.length, leadRows(noNext, "No next action set", "Set next action"), noNext.length ? "warn" : "good"),
          m("hotIdle", "Hot leads untouched", hotIdle.length, leadRows(hotIdle, "Hot and ignored", "Call immediately"), hotIdle.length ? "bad" : "good"),
        ],
      },
      {
        group: "Conversation",
        items: [
          m("calls", "Calls logged", calls.length, toRows(calls), calls.length ? "good" : "bad"),
          m("connected", "Connected calls", conn.length, toRows(conn), conn.length ? "good" : "warn"),
          m("connectRate", "Connect rate", pct(conn.length, calls.length), toRows(conn), "plain", "%"),
          m("messages", "WhatsApp sent", msgs.length, toRows(msgs)),
          m("notes", "Notes written", notes.length, toRows(notes)),
        ],
      },
      {
        group: "Tours",
        items: [
          m("toursScheduled", "Tours scheduled", sched.length, tourRows(sched, "Tour scheduled", "Confirm the tour")),
          m("toursDone", "Tours done", done.length, tourRows(done, "Tour completed", "Send quotation"), done.length ? "good" : "warn"),
          m("tourShowRate", "Show rate", pct(done.length, sched.length), tourRows(done, "Completed", "Push to quote"), "plain", "%"),
          m("noShow", "Cancelled / no-show", noShow.length, tourRows(noShow, "Tour lost", "Rebook the tour"), noShow.length ? "bad" : "good"),
          m("postMissing", "Post-tour missing", postMissing.length, tourRows(postMissing, "No post-tour update", "Fill outcome now"), postMissing.length ? "bad" : "good"),
          m("staleTours", "Tour time passed, no outcome", scheduledNoOutcome.length, tourRows(scheduledNoOutcome, "Scheduled and forgotten", "Mark outcome"), scheduledNoOutcome.length ? "bad" : "good"),
        ],
      },
      {
        group: "Closing",
        items: [
          m("quotes", "Quotations sent", quotes.length, toRows(quotes, undefined, "Chase decision"), quotes.length ? "good" : "warn"),
          m(
            "quoteGap",
            "Tours done without quote",
            done.filter((x) => !quotedLeadIds.has(x.leadId)).length,
            tourRows(done.filter((x) => !quotedLeadIds.has(x.leadId)), "No quotation after tour", "Send quotation now"),
            "bad",
          ),
          m("bookings", "Bookings", bookings.length, bookings.map((b) => leadOf.get(b.leadId)).filter(Boolean).map((l) => row(l as Lead, snap.tcms, undefined, "Move to check-in")), bookings.length ? "good" : "warn"),
          m("checkins", "Check-ins", checkins.length, toRows(checkins)),
          m("revenue", "Revenue booked", revenue, bookings.map((b) => leadOf.get(b.leadId)).filter(Boolean).map((l) => row(l as Lead, snap.tcms)), "good"),
        ],
      },
      {
        group: "Momentum",
        items: [
          m("newLeads", "New leads added", newLeads.length, leadRows(newLeads, undefined, "First call now"), newLeads.length ? "good" : "warn"),
          m("oldContacted", "Old leads contacted", oldContacted.length, leadRows(oldContacted, undefined, "Push to next stage"), oldContacted.length ? "good" : "bad"),
          m("moved", "Leads that actually moved", movedLeads.length, leadRows(movedLeads), movedLeads.length ? "good" : "bad"),
          m("momentsStuck", "Stuck in a moment", moments.reduce((s, x) => s + x.stuck, 0), moments.flatMap((x) => x.stuckRows), "bad"),
        ],
      },
      {
        group: "Moments",
        items: moments.flatMap((x) => [
          m(`${x.key}-rate`, `${x.label} rate`, x.rate, x.rows, x.rate >= 50 ? "good" : x.rate > 0 ? "warn" : "bad", "%"),
          m(`${x.key}-stuck`, `${x.label} stuck`, x.stuck, x.stuckRows, x.stuck ? "bad" : "good"),
        ]),
      },
      {
        group: "Discipline",
        items: [
          m("overdue", "Overdue follow-ups", overdue.length, overdue.map((f) => leadOf.get(f.leadId)).filter(Boolean).map((l) => row(l as Lead, snap.tcms, "Follow-up overdue", "Do it now")), overdue.length ? "bad" : "good"),
          m("followUpsDone", "Follow-ups completed", fusDone.length, fusDone.map((f) => leadOf.get(f.leadId)).filter(Boolean).map((l) => row(l as Lead, snap.tcms)), "good"),
          m("activity", "Total actions", inWin.length, toRows(inWin), inWin.length ? "good" : "bad"),
        ],
      },
    ];

    return {
      id: t.id,
      name: t.name,
      initials: t.initials,
      role: "Tour Conversion Manager",
      zone: t.zone,
      effort,
      outcome,
      discipline,
      score,
      grade,
      verdict,
      flags,
      lastSeen: agoText(acts[0]?.ts ?? null),
      loggedInToday,
      zeroDay,
      star,
      v,
      pv,
      moments,
      metrics,
      timeline,
      checkpoints: personCheckpoints(acts),
    };

  }).sort((a, b) => b.score - a.score);
}

/* ------------------------------- rollups -------------------------------- */

export interface ZoneNow {
  name: string;
  people: string[];
  leads: number;
  calls: number;
  toursDone: number;
  bookings: number;
  untouched: number;
  score: number;
  rows: BrainRow[];
}

export function buildZones(people: PersonNow[], snap: CrmSnapshot): ZoneNow[] {
  const map = new Map<string, PersonNow[]>();
  people.forEach((p) => map.set(p.zone, [...(map.get(p.zone) ?? []), p]));
  return Array.from(map.entries())
    .map(([name, ps]) => {
      const sum = (k: string) => ps.reduce((s, p) => s + (p.v[k] ?? 0), 0);
      const rows = ps.flatMap((p) => p.metrics[0].items.find((i) => i.key === "untouched")?.rows ?? []);
      return {
        name,
        people: ps.map((p) => p.name),
        leads: sum("leads"),
        calls: sum("calls"),
        toursDone: sum("toursDone"),
        bookings: sum("bookings"),
        untouched: sum("untouched"),
        score: Math.round(ps.reduce((s, p) => s + p.score, 0) / Math.max(ps.length, 1)),
        rows,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export interface CheckpointRollup {
  id: string;
  label: string;
  at: string;
  done: PersonNow[];
  late: PersonNow[];
  missed: PersonNow[];
  upcoming: boolean;
}

export function buildCheckpoints(people: PersonNow[]): CheckpointRollup[] {
  return checkpointTimes().map((c, i) => {
    const state = (p: PersonNow) => p.checkpoints[i]?.state;
    return {
      id: c.id,
      label: c.label,
      at: c.at,
      done: people.filter((p) => state(p) === "done"),
      late: people.filter((p) => state(p) === "late"),
      missed: people.filter((p) => state(p) === "missed"),
      upcoming: people.every((p) => state(p) === "upcoming"),
    };
  });
}

export function peopleWhatsApp(people: PersonNow[], rangeLabel: string) {
  const line = (p: PersonNow) =>
    `${p.name} (${p.grade}) — ${p.v.calls} calls, ${p.v.toursDone} tours done, ${p.v.quotes} quotes, ${p.v.bookings} bookings, ${p.v.untouched} untouched`;
  const top = people.slice(0, 3).map(line);
  const bottom = people.slice(-3).reverse().map(line);
  return [
    `GHARPAYY PEOPLE DESK — ${rangeLabel}`,
    "",
    "Top:",
    ...top,
    "",
    "Needs attention:",
    ...bottom,
    "",
    `Untouched leads across team: ${people.reduce((s, p) => s + p.v.untouched, 0)}`,
    `Post-tour updates missing: ${people.reduce((s, p) => s + p.v.postMissing, 0)}`,
  ].join("\n");
}

/* --------------------------- TOTAL (whole team) -------------------------- */

const RATE_KEYS: Record<string, [string, string]> = {
  connectRate: ["connected", "calls"],
  tourShowRate: ["toursDone", "toursScheduled"],
  tourDoneRate: ["toursDone", "toursScheduled"],
  quoteBookRate: ["bookings", "quotes"],
  checkinRate: ["checkins", "bookings"],
};

/**
 * Sums every person into one synthetic "TOTAL" PersonNow so the total row is
 * as clickable as any individual: each metric keeps every underlying customer.
 */
export function buildTotal(people: PersonNow[], label = "TOTAL — whole team"): PersonNow {
  const sum = (k: string, from: "v" | "pv" = "v") => people.reduce((s, p) => s + (p[from][k] ?? 0), 0);
  const keys = Array.from(new Set(people.flatMap((p) => Object.keys(p.v))));
  const pkeys = Array.from(new Set(people.flatMap((p) => Object.keys(p.pv))));

  const build = (ks: string[], from: "v" | "pv") => {
    const out: Record<string, number> = {};
    ks.forEach((k) => { out[k] = sum(k, from); });
    Object.entries(RATE_KEYS).forEach(([k, [n, d]]) => {
      if (ks.includes(k)) out[k] = pct(sum(n, from), sum(d, from));
    });
    ["effort", "outcome", "discipline", "score"].forEach((k) => {
      if (ks.includes(k)) out[k] = Math.round(sum(k, from) / Math.max(people.length, 1));
    });
    return out;
  };

  const v = build(keys, "v");
  const pv = people.some((p) => Object.keys(p.pv).length) ? build(pkeys, "pv") : {};

  const groups = people[0]?.metrics.map((g) => g.group) ?? [];
  const metrics = groups.map((group) => {
    const itemKeys: string[] = [];
    people.forEach((p) => p.metrics.find((g) => g.group === group)?.items.forEach((i) => {
      if (!itemKeys.includes(i.key)) itemKeys.push(i.key);
    }));
    return {
      group,
      items: itemKeys.map((key) => {
        const all = people.flatMap((p) => p.metrics.find((g) => g.group === group)?.items.filter((i) => i.key === key) ?? []);
        const first = all[0];
        const isRate = key.endsWith("Rate") || key.endsWith("-rate") || first?.suffix === "%";
        const value = isRate
          ? Math.round(all.reduce((s, i) => s + i.value, 0) / Math.max(all.length, 1))
          : all.reduce((s, i) => s + i.value, 0);
        return {
          key,
          label: first?.label ?? key,
          value,
          rows: all.flatMap((i) => i.rows),
          tone: first?.tone ?? ("plain" as const),
          suffix: first?.suffix,
        } as Metric;
      }),
    };
  });

  const moments = (people[0]?.moments ?? []).map((mo, idx) => {
    const all = people.map((p) => p.moments[idx]).filter(Boolean);
    const from = all.reduce((s, x) => s + x.from, 0);
    const to = all.reduce((s, x) => s + x.to, 0);
    return {
      key: mo.key,
      label: mo.label,
      from,
      to,
      rate: pct(to, from),
      rows: all.flatMap((x) => x.rows),
      stuck: all.reduce((s, x) => s + x.stuck, 0),
      stuckRows: all.flatMap((x) => x.stuckRows),
    };
  });

  const score = v.score ?? 0;
  return {
    id: "__total__",
    name: label,
    initials: "TT",
    role: `${people.length} people`,
    zone: "All zones",
    effort: v.effort ?? 0,
    outcome: v.outcome ?? 0,
    discipline: v.discipline ?? 0,
    score,
    grade: score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D",
    verdict: `${v.calls ?? 0} calls · ${v.toursDone ?? 0} tours done · ${v.quotes ?? 0} quotations · ${v.bookings ?? 0} bookings · ${v.untouched ?? 0} untouched across ${people.length} people.`,
    flags: [
      v.momentsStuck ? `${v.momentsStuck} customers stuck between moments` : "",
      people.filter((p) => p.zeroDay && p.loggedInToday).length ? `${people.filter((p) => p.zeroDay && p.loggedInToday).length} people logged in with zero output` : "",
    ].filter(Boolean),
    lastSeen: "live",
    loggedInToday: people.some((p) => p.loggedInToday),
    zeroDay: (v.calls ?? 0) === 0 && (v.bookings ?? 0) === 0,
    star: (v.bookings ?? 0) > 0,
    v,
    pv,
    moments,
    metrics,
    timeline: people
      .flatMap((p) => p.timeline.map((t) => ({ ...t, text: `${p.name}: ${t.text}` })))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 120),
    checkpoints: people[0]?.checkpoints.map((c, i) => ({
      ...c,
      proof: `${people.filter((p) => p.checkpoints[i]?.state === "done").length}/${people.length} people cleared this gate`,
      state: people.every((p) => p.checkpoints[i]?.state === "upcoming")
        ? ("upcoming" as const)
        : people.filter((p) => p.checkpoints[i]?.state === "done").length >= Math.ceil(people.length / 2)
          ? ("done" as const)
          : ("missed" as const),
    })) ?? [],
  };
}

/* ------------------------------ copy blocks ----------------------------- */

/** One person, WhatsApp ready. Works for the TOTAL row too. */
export function personWhatsApp(p: PersonNow, rangeLabel: string) {
  const mo = p.moments.map((x) => `${x.label}: ${x.to}/${x.from} (${x.rate}%) · ${x.stuck} stuck`);
  return [
    `GHARPAYY · ${p.name} — ${rangeLabel}`,
    `Grade ${p.grade} · score ${p.score} (effort ${p.effort} / outcome ${p.outcome} / discipline ${p.discipline})`,
    "",
    `Leads: ${p.v.leads ?? 0} total · ${p.v.active ?? 0} active`,
    `New leads added: ${p.v.newLeads ?? 0}`,
    `Old leads contacted: ${p.v.oldContacted ?? 0}`,
    `Leads that moved: ${p.v.moved ?? 0}`,
    `Calls: ${p.v.calls ?? 0} (${p.v.connected ?? 0} connected · ${p.v.connectRate ?? 0}%)`,
    `Tours: ${p.v.toursScheduled ?? 0} booked · ${p.v.toursDone ?? 0} done`,
    `Quotations: ${p.v.quotes ?? 0} · Bookings: ${p.v.bookings ?? 0} · Check-ins: ${p.v.checkins ?? 0}`,
    `Untouched: ${p.v.untouched ?? 0} · Overdue follow-ups: ${p.v.overdue ?? 0}`,
    "",
    "MOMENTS",
    ...mo,
    ...(p.flags.length ? ["", "FIX NOW", ...p.flags.map((f) => `• ${f}`)] : []),
  ].join("\n");
}

export function momentsWhatsApp(people: PersonNow[], total: PersonNow, rangeLabel: string) {
  const lines = people.map((p) =>
    `${p.name}: ${p.moments.map((x) => `${x.label.split(" ")[0]} ${x.to}/${x.from}`).join(" · ")} · ${p.v.momentsStuck ?? 0} stuck`,
  );
  return [
    `GHARPAYY MOMENTS — ${rangeLabel}`,
    "",
    ...total.moments.map((x) => `${x.label}: ${x.to}/${x.from} (${x.rate}%) · ${x.stuck} stuck`),
    "",
    "PER PERSON",
    ...lines,
  ].join("\n");
}

export function zeroAndStars(people: PersonNow[]) {
  return {
    zeros: people.filter((p) => p.zeroDay && p.loggedInToday),
    ghosts: people.filter((p) => p.zeroDay && !p.loggedInToday),
    stars: people.filter((p) => p.star),
  };
}

/* --------------------------- ZONE-CENTRIC ROLLUP ------------------------- */

export interface ZoneDesk {
  name: string;
  people: PersonNow[];
  /** the zone summed into one clickable synthetic person */
  total: PersonNow;
  zeros: PersonNow[];
  ghosts: PersonNow[];
  stars: PersonNow[];
  top: PersonNow | null;
  worst: PersonNow | null;
  score: number;
  moments: MomentSet[];
  flags: string[];
}

/** Every zone as its own operating desk: summed numbers, people, moments, risk. */
export function buildZoneDesks(people: PersonNow[]): ZoneDesk[] {
  const map = new Map<string, PersonNow[]>();
  people.forEach((p) => map.set(p.zone, [...(map.get(p.zone) ?? []), p]));
  return Array.from(map.entries())
    .map(([name, ps]) => {
      const total = buildTotal(ps, `${name} — zone total`);
      const s = zeroAndStars(ps);
      const sorted = [...ps].sort((a, b) => b.score - a.score);
      const flags: string[] = [];
      if (s.zeros.length) flags.push(`${s.zeros.length} logged in with zero output`);
      if (s.ghosts.length) flags.push(`${s.ghosts.length} never logged in`);
      if ((total.v.untouched ?? 0) > 0) flags.push(`${total.v.untouched} untouched leads`);
      if ((total.v.momentsStuck ?? 0) > 0) flags.push(`${total.v.momentsStuck} customers stuck mid-journey`);
      if ((total.v.overdue ?? 0) > 0) flags.push(`${total.v.overdue} overdue follow-ups`);
      return {
        name,
        people: sorted,
        total,
        zeros: s.zeros,
        ghosts: s.ghosts,
        stars: s.stars,
        top: sorted[0] ?? null,
        worst: sorted.length > 1 ? sorted[sorted.length - 1] : null,
        score: total.score,
        moments: total.moments,
        flags,
      };
    })
    .sort((a, b) => (b.total.v.bookings ?? 0) - (a.total.v.bookings ?? 0) || b.score - a.score);
}

/** WhatsApp block for one zone: numbers, moments, who is carrying and who is dead. */
export function zoneWhatsApp(z: ZoneDesk, rangeLabel: string) {
  const t = z.total.v;
  return [
    `GHARPAYY · ${z.name.toUpperCase()} — ${rangeLabel}`,
    `Zone score ${z.score} · ${z.people.length} people`,
    "",
    `New leads: ${t.newLeads ?? 0} · Old leads contacted: ${t.oldContacted ?? 0} · Moved: ${t.moved ?? 0}`,
    `Calls: ${t.calls ?? 0} (${t.connectRate ?? 0}% connected)`,
    `Tours: ${t.toursScheduled ?? 0} booked · ${t.toursDone ?? 0} done`,
    `Quotations: ${t.quotes ?? 0} · Bookings: ${t.bookings ?? 0} · Check-ins: ${t.checkins ?? 0}`,
    `Untouched: ${t.untouched ?? 0} · Overdue: ${t.overdue ?? 0}`,
    "",
    "MOMENTS",
    ...z.moments.map((m) => `${m.label}: ${m.to}/${m.from} (${m.rate}%) · ${m.stuck} stuck`),
    "",
    "PEOPLE",
    ...z.people.map((p) => `${p.name} (${p.grade}) — ${p.v.calls ?? 0} calls · ${p.v.toursDone ?? 0} tours · ${p.v.bookings ?? 0} bookings${p.zeroDay && p.loggedInToday ? " ⚠️ ZERO OUTPUT" : ""}${p.star ? " ⭐" : ""}`),
    ...(z.flags.length ? ["", "FIX NOW", ...z.flags.map((f) => `• ${f}`)] : []),
  ].join("\n");
}

/** Zone-vs-zone league table copy block. */
export function zoneLeagueWhatsApp(zones: ZoneDesk[], rangeLabel: string) {
  return [
    `GHARPAYY ZONE LEAGUE — ${rangeLabel}`,
    "",
    ...zones.map((z, i) =>
      `${i + 1}. ${z.name} — ${z.total.v.bookings ?? 0} bookings · ${z.total.v.toursDone ?? 0} tours done · ${z.total.v.calls ?? 0} calls · ${z.total.v.untouched ?? 0} untouched · score ${z.score}`),
    "",
    ...zones.filter((z) => z.flags.length).map((z) => `${z.name}: ${z.flags.join(", ")}`),
  ].join("\n");
}
