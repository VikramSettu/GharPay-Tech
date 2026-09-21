/**
 * CRM ↔ Founder Admin bridge.
 *
 * The admin console was ported from another product and shipped with its own
 * demo roster and hash-derived numbers. This module replaces both with the
 * real CRM: the people who actually work leads (TCMs, Flow Ops, HR) and the
 * live lead / tour / booking / follow-up data from the CRM store.
 *
 * It mutates the ported `EMPLOYEES` array in place so every ported screen,
 * store and metric picks up real people without touching 40 files.
 */
import { useApp } from "@/lib/store";
import { HR_PEOPLE, FLOWOPS_PEOPLE } from "@/lib/people";
import { EMPLOYEES, type Employee, type Role as FounderRole } from "@/founder/data/seed";
import type { Lead, Tour, Booking, FollowUp, ActivityLog, TCM } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Live CRM snapshot                                                    */
/* ------------------------------------------------------------------ */

export type CrmSnapshot = {
  leads: Lead[];
  tours: Tour[];
  bookings: Booking[];
  followUps: FollowUp[];
  activities: ActivityLog[];
  tcms: TCM[];
};

export function crmSnapshot(): CrmSnapshot {
  const s = useApp.getState();
  return {
    leads: s.leads,
    tours: s.tours,
    bookings: s.bookings,
    followUps: s.followUps,
    activities: s.activities,
    tcms: s.tcms,
  };
}

const isToday = (iso?: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

const ACTIVE_STAGES = new Set(["new", "contacted", "tour-scheduled", "tour-done", "negotiation"]);

/* ------------------------------------------------------------------ */
/* Real people → Employee shape the ported console understands          */
/* ------------------------------------------------------------------ */

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

function statusFor(callsToday: number, overdue: number): Employee["status"] {
  if (callsToday === 0) return overdue > 0 ? "Late" : "Offline";
  if (overdue > 2) return "Idle";
  return "Active";
}

function tcmEmployee(t: TCM, snap: CrmSnapshot, idx: number): Employee {
  const mine = snap.leads.filter((l) => l.assignedTcmId === t.id);
  const active = mine.filter((l) => ACTIVE_STAGES.has(l.stage));
  const booked = mine.filter((l) => l.stage === "booked");
  const dropped = mine.filter((l) => l.stage === "dropped");
  const myTours = snap.tours.filter((x) => x.tcmId === t.id);
  const doneTours = myTours.filter((x) => x.status === "completed");
  const myFollowUps = snap.followUps.filter((f) => f.tcmId === t.id && !f.done);
  const overdue = myFollowUps.filter((f) => +new Date(f.dueAt) < Date.now()).length;
  const callsToday = snap.activities.filter(
    (a) => a.actor === t.id && a.kind === "call_logged" && isToday(a.ts),
  ).length;
  const revenue = snap.bookings.filter((b) => b.tcmId === t.id).reduce((s, b) => s + b.amount, 0);
  const postTourFilled = doneTours.filter((x) => x.postTour?.filledAt).length;

  const conversion = Math.round(t.conversionRate * 100);
  const taskCompletion = pct(myFollowUps.length - overdue, Math.max(myFollowUps.length, 1));
  const performance = Math.round(
    conversion * 0.4 + pct(postTourFilled, Math.max(doneTours.length, 1)) * 0.3 + taskCompletion * 0.3,
  );

  const flags: string[] = [];
  if (overdue > 0) flags.push(`${overdue} overdue follow-up${overdue > 1 ? "s" : ""}`);
  if (t.avgResponseMins > 10) flags.push("Slow first response");
  if (doneTours.length && postTourFilled < doneTours.length) flags.push("Tour outcomes not filled");
  if (active.length > 20) flags.push("Overloaded pipeline");

  return {
    id: t.id,
    name: t.name,
    role: "Tour Conversion Manager" as FounderRole,
    appRole: idx === 0 ? "manager" : "employee",
    experience: conversion >= 32 ? "Core" : conversion >= 25 ? "Mid" : "New",
    attendance: callsToday > 0 ? 100 : 0,
    performance,
    consistency: Math.max(100 - t.avgResponseMins * 4, 20),
    revenueImpact: revenue,
    taskCompletion,
    conversion,
    callsToday,
    callTarget: 40,
    leadsActive: active.length,
    closedDeals: booked.length,
    lostDeals: dropped.length,
    flags,
    status: statusFor(callsToday, overdue),
    streakDays: booked.length,
    team: `${t.zone} Desk`,
    shift: "10:00 - 19:00",
    avatarSeed: t.initials,
    zone: t.zone,
    managerId: idx === 0 ? null : "tcm-1",
    bio: `${t.zone} · ${conversion}% conversion · ${t.avgResponseMins}m first response`,
  };
}

function supportEmployee(
  p: { id: string; name: string; initials: string; focus: string; stats: { missionPct: number; streak: number; closes: number; avgResponseMins: number } },
  role: FounderRole,
  snap: CrmSnapshot,
): Employee {
  const callsToday = snap.activities.filter((a) => a.actor === p.id && isToday(a.ts)).length;
  return {
    id: p.id,
    name: p.name,
    role,
    appRole: role === "HR" ? "manager" : "employee",
    experience: p.stats.missionPct >= 85 ? "Core" : p.stats.missionPct >= 65 ? "Mid" : "New",
    attendance: p.stats.missionPct,
    performance: p.stats.missionPct,
    consistency: Math.max(100 - p.stats.avgResponseMins * 4, 20),
    revenueImpact: 0,
    taskCompletion: p.stats.missionPct,
    conversion: 0,
    callsToday,
    callTarget: role === "HR" ? 0 : 30,
    leadsActive: 0,
    closedDeals: p.stats.closes,
    lostDeals: 0,
    flags: p.stats.missionPct < 60 ? ["Mission behind plan"] : [],
    status: p.stats.missionPct < 50 ? "Idle" : "Active",
    streakDays: p.stats.streak,
    team: role === "HR" ? "People Ops" : "Control Tower",
    shift: "09:30 - 18:30",
    avatarSeed: p.initials,
    zone: "All",
    managerId: null,
    bio: p.focus,
  };
}

/** Build the founder-console roster out of real CRM people. */
export function crmRoster(snap: CrmSnapshot = crmSnapshot()): Employee[] {
  const tcms = snap.tcms.map((t, i) => tcmEmployee(t, snap, i));
  const flow = FLOWOPS_PEOPLE.map((p) => supportEmployee(p, "Flow Ops Executive" as FounderRole, snap));
  const hr = HR_PEOPLE.map((p) => supportEmployee(p, "HR" as FounderRole, snap));
  return [...tcms, ...flow, ...hr];
}

/* ------------------------------------------------------------------ */
/* Roster injection                                                     */
/* ------------------------------------------------------------------ */

let synced = false;

/** Replace the ported demo roster with the live CRM roster, in place. */
export function syncCrmRoster() {
  const roster = crmRoster();
  if (!roster.length) return;
  EMPLOYEES.length = 0;
  EMPLOYEES.push(...roster);
  synced = true;
}

export function isCrmLinked() {
  return synced;
}

/** Keep the roster in sync with every CRM mutation. */
export function watchCrm(onChange: () => void) {
  syncCrmRoster();
  onChange();
  return useApp.subscribe(() => {
    syncCrmRoster();
    onChange();
  });
}

/* ------------------------------------------------------------------ */
/* Real operating numbers for the Command Centre blocks                 */
/* ------------------------------------------------------------------ */

export type CrmBlockData = {
  demand: { newLeads: number; activeLeads: number; assigned: number; unassigned: number };
  chats: { active: number; waitingCustomer: number; waitingUs: number; slaBreached: number; noNextAction: number };
  tours: { scheduled: number; confirmed: number; enRoute: number; completed: number; noShow: number; unconfirmed: number };
  closing: { highIntent: number; quotesOpen: number; paymentPending: number; paymentReceived: number; bookings: number; bbdTarget: number };
  management: { supportPending: number; supportBreached: number; managerActions: number; reconciliationIssues: number };
};

/**
 * Real CRM numbers for a set of people (empty = whole company).
 * Everything here is counted from actual leads / tours / bookings.
 */
export function crmBlockFor(personIds: string[] | null, snap: CrmSnapshot = crmSnapshot()): CrmBlockData {
  const owns = (id: string) => !personIds || personIds.includes(id);
  const leads = snap.leads.filter((l) => owns(l.assignedTcmId) || !l.assignedTcmId);
  const tours = snap.tours.filter((t) => owns(t.tcmId));
  const bookings = snap.bookings.filter((b) => owns(b.tcmId));
  const followUps = snap.followUps.filter((f) => owns(f.tcmId) && !f.done);

  const active = leads.filter((l) => ACTIVE_STAGES.has(l.stage));
  const unassigned = leads.filter((l) => !l.assignedTcmId).length;
  const newLeads = leads.filter((l) => isToday(l.createdAt)).length;
  const noNextAction = active.filter((l) => !l.nextFollowUpAt).length;
  const overdue = followUps.filter((f) => +new Date(f.dueAt) < Date.now());
  const slaBreached = overdue.filter((f) => f.priority === "high").length;

  const scheduled = tours.filter((t) => t.status === "scheduled").length;
  const completed = tours.filter((t) => t.status === "completed").length;
  const noShow = tours.filter((t) => t.status === "no-show").length;
  const todayTours = tours.filter((t) => isToday(t.scheduledAt));
  const enRoute = todayTours.filter((t) => t.status === "scheduled" && +new Date(t.scheduledAt) < Date.now()).length;
  const confirmed = Math.max(scheduled - enRoute, 0);

  const doneTours = tours.filter((t) => t.status === "completed");
  const quotesOpen = doneTours.filter((t) => t.decision === "thinking").length;
  const paymentPending = doneTours.filter((t) => t.decision === "booked" && !bookings.some((b) => b.tourId === t.id)).length;
  const reconciliation = doneTours.filter((t) => !t.postTour?.filledAt).length;

  return {
    demand: {
      newLeads,
      activeLeads: active.length,
      assigned: active.length - unassigned,
      unassigned,
    },
    chats: {
      active: active.filter((l) => l.stage !== "new").length,
      waitingCustomer: active.filter((l) => l.intent === "warm" || l.intent === "cold").length,
      waitingUs: overdue.length,
      slaBreached,
      noNextAction,
    },
    tours: {
      scheduled,
      confirmed,
      enRoute,
      completed,
      noShow,
      unconfirmed: Math.max(scheduled - confirmed, 0),
    },
    closing: {
      highIntent: active.filter((l) => l.intent === "hot").length,
      quotesOpen,
      paymentPending,
      paymentReceived: bookings.length,
      bookings: leads.filter((l) => l.stage === "booked").length,
      bbdTarget: Math.max(leads.filter((l) => l.stage === "booked").length, 0) + Math.max(quotesOpen, 1),
    },
    management: {
      supportPending: noNextAction,
      supportBreached: slaBreached,
      managerActions: overdue.length + reconciliation,
      reconciliationIssues: reconciliation,
    },
  };
}

// Link the roster as soon as this module loads, so every ported screen and
// store (attendance, presence, goals, digests) reads real CRM people on the
// very first render — server and client alike.
syncCrmRoster();
