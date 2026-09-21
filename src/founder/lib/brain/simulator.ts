/**
 * SIMULATOR — the founder's what-if engine.
 *
 * Takes the live conversion rates of the current scope and lets the founder
 * move any lever (calls per person, connect %, tour show-up %, quotation %,
 * booking %, check-in %) to see the booking and revenue outcome, plus the
 * reverse answer: how many calls a booking target actually needs.
 */
import type { PersonNow } from "./people-now";

export interface Levers {
  people: number;
  callsPerPerson: number;
  connectPct: number;
  tourBookPct: number;
  tourShowPct: number;
  quotePct: number;
  bookingPct: number;
  checkinPct: number;
  avgTicket: number;
}

export interface SimStep {
  key: string;
  label: string;
  value: number;
  base: number;
  ratePct: number;
}

export interface SimResult {
  steps: SimStep[];
  bookings: number;
  checkins: number;
  revenue: number;
  baseBookings: number;
  liftPct: number;
}

const pct = (n: number, d: number) => (d <= 0 ? 0 : Math.round((n / d) * 100));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Read the live funnel of the scope and turn it into starting lever values. */
export function baselineLevers(total: PersonNow | null, peopleCount: number, avgTicket = 12000): Levers {
  const v = total?.v ?? {};
  const calls = v.calls ?? 0;
  const connected = v.connected ?? 0;
  const booked = v.toursScheduled ?? 0;
  const done = v.toursDone ?? 0;
  const quotes = v.quotes ?? 0;
  const bookings = v.bookings ?? 0;
  const checkins = v.checkins ?? 0;
  const n = Math.max(1, peopleCount);

  /** Only trust an observed rate with a real sample; otherwise use the company norm. */
  const rate = (num: number, den: number, fallback: number) =>
    den >= 3 && num > 0 ? clamp(pct(num, den), 2, 100) : fallback;

  return {
    people: n,
    callsPerPerson: Math.max(10, Math.round(calls / n)),
    connectPct: rate(connected, calls, 55),
    tourBookPct: rate(booked, connected, 30),
    tourShowPct: rate(done, booked, 65),
    quotePct: rate(quotes, done, 55),
    bookingPct: rate(bookings, quotes, 30),
    checkinPct: rate(checkins, bookings, 70),
    avgTicket,
  };
}

export function simulate(l: Levers, base?: Levers): SimResult {
  const run = (x: Levers) => {
    const calls = x.people * x.callsPerPerson;
    const connected = calls * (x.connectPct / 100);
    const booked = connected * (x.tourBookPct / 100);
    const done = booked * (x.tourShowPct / 100);
    const quotes = done * (x.quotePct / 100);
    const bookings = quotes * (x.bookingPct / 100);
    const checkins = bookings * (x.checkinPct / 100);
    return { calls, connected, booked, done, quotes, bookings, checkins };
  };

  const now = run(l);
  const ref = run(base ?? l);
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const steps: SimStep[] = [
    { key: "calls", label: "Calls", value: Math.round(now.calls), base: Math.round(ref.calls), ratePct: 100 },
    { key: "connected", label: "Connected", value: Math.round(now.connected), base: Math.round(ref.connected), ratePct: l.connectPct },
    { key: "booked", label: "Tours booked", value: Math.round(now.booked), base: Math.round(ref.booked), ratePct: l.tourBookPct },
    { key: "done", label: "Tours done", value: Math.round(now.done), base: Math.round(ref.done), ratePct: l.tourShowPct },
    { key: "quotes", label: "Quotations", value: Math.round(now.quotes), base: Math.round(ref.quotes), ratePct: l.quotePct },
    { key: "bookings", label: "Bookings", value: r1(now.bookings), base: r1(ref.bookings), ratePct: l.bookingPct },
    { key: "checkins", label: "Check-ins", value: r1(now.checkins), base: r1(ref.checkins), ratePct: l.checkinPct },
  ];

  return {
    steps,
    bookings: r1(now.bookings),
    checkins: r1(now.checkins),
    revenue: Math.round(now.checkins * l.avgTicket),
    baseBookings: r1(ref.bookings),
    liftPct: ref.bookings > 0 ? Math.round(((now.bookings - ref.bookings) / ref.bookings) * 100) : 0,
  };
}

/** Reverse: calls needed (and per person) for a booking target at these rates. */
export function callsNeeded(l: Levers, bookingTarget: number) {
  const chain =
    (l.connectPct / 100) * (l.tourBookPct / 100) * (l.tourShowPct / 100) * (l.quotePct / 100) * (l.bookingPct / 100);
  if (chain <= 0) return { calls: Infinity, perPerson: Infinity, chainPct: 0 };
  const calls = Math.ceil(bookingTarget / chain);
  return { calls, perPerson: Math.ceil(calls / Math.max(1, l.people)), chainPct: Math.round(chain * 10000) / 100 };
}

/** Which single lever buys the most bookings for a realistic +10pt move. */
export function bestLever(l: Levers): { key: keyof Levers; label: string; gain: number }[] {
  const keys: [keyof Levers, string][] = [
    ["connectPct", "Connect rate"],
    ["tourBookPct", "Connect → tour booked"],
    ["tourShowPct", "Tour show-up"],
    ["quotePct", "Tour → quotation"],
    ["bookingPct", "Quotation → booking"],
  ];
  const base = simulate(l).bookings;
  return keys
    .map(([key, label]) => {
      const next = { ...l, [key]: clamp((l[key] as number) + 10, 1, 100) } as Levers;
      return { key, label, gain: Math.round((simulate(next).bookings - base) * 10) / 10 };
    })
    .sort((a, b) => b.gain - a.gain);
}
