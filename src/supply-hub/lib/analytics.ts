// Supply Hub analytics: matrices for heat maps + series for graphs.
import type { Lead, Tour, Booking, Property } from "@/lib/types";
import type { PG } from "../data/types";
import type { SupplyItem } from "./store";
import { UNMAPPED, zoneMeta, zoneOfPG, type ZoneDef } from "./zones";
import { zoneOfText } from "./demand";

const DAY = 24 * 60 * 60 * 1000;
const norm = (s: string) => (s || "").toLowerCase().trim();

export const PRICE_BANDS = [
  { key: "<8k", min: 0, max: 7999 },
  { key: "8–12k", min: 8000, max: 11999 },
  { key: "12–16k", min: 12000, max: 15999 },
  { key: "16–22k", min: 16000, max: 21999 },
  { key: "22k+", min: 22000, max: Infinity },
] as const;

export function entryPrice(pg: PG): number {
  const cands = [pg.prices?.triple, pg.prices?.double, pg.prices?.single, pg.prices?.min].filter(
    (n): n is number => typeof n === "number" && n > 0,
  );
  return cands.length ? Math.min(...cands) : 0;
}

export function bandOf(price: number): string | null {
  if (!price) return null;
  return PRICE_BANDS.find((b) => price >= b.min && price <= b.max)?.key ?? null;
}

export interface Matrix {
  rows: { id: string; label: string }[];
  cols: string[];
  cells: Record<string, Record<string, number>>;
  max: number;
  total: number;
}

function emptyMatrix(rows: { id: string; label: string }[], cols: string[]): Matrix {
  const cells: Record<string, Record<string, number>> = {};
  rows.forEach((r) => {
    cells[r.id] = {};
    cols.forEach((c) => (cells[r.id][c] = 0));
  });
  return { rows, cols, cells, max: 0, total: 0 };
}

function finalize(m: Matrix): Matrix {
  let max = 0;
  let total = 0;
  m.rows.forEach((r) => m.cols.forEach((c) => {
    const v = m.cells[r.id][c] || 0;
    if (v > max) max = v;
    total += v;
  }));
  return { ...m, max, total };
}

export interface SupplyAnalytics {
  zoneRows: { id: string; label: string; short: string; accent: string }[];
  tierMatrix: Matrix;
  genderMatrix: Matrix;
  priceMatrix: Matrix;
  demandMatrix: Matrix; // zone x day (leads)
  activityMatrix: Matrix; // zone x day (tours)
  trend: { day: string; leads: number; tours: number; bookings: number }[];
  zoneBars: {
    zone: string; short: string; leads: number; live: number; disabled: number;
    tours: number; bookings: number; avgPrice: number; avgBudget: number; pressure: number;
  }[];
  budgetGap: { zone: string; short: string; avgPrice: number; avgBudget: number; gap: number }[];
  topProperties: { name: string; zone: string; heat: number; tours: number; bookings: number; enabled: boolean }[];
  priceHistogram: { band: string; live: number; off: number; leads: number }[];
  totals: { live: number; off: number; leads: number; tours: number; bookings: number };
}

export function buildSupplyAnalytics(args: {
  items: SupplyItem[];
  leads: Lead[];
  tours: Tour[];
  bookings: Booking[];
  properties: Property[];
  zones: ZoneDef[];
  windowDays?: number;
}): SupplyAnalytics {
  const { items, leads, tours, bookings, properties, zones } = args;
  const days = args.windowDays ?? 14;
  const since = Date.now() - days * DAY;

  const zoneDefs = [...zones, zoneMeta(UNMAPPED)];
  const present = new Set<string>();
  items.forEach((i) => present.add(zoneOfPG(i.pg)));
  leads.forEach((l) => present.add(zoneOfText(l.preferredArea, zones)));
  const zoneRows = zoneDefs
    .filter((z) => present.has(z.id))
    .map((z) => ({ id: z.id, label: z.label, short: z.short, accent: z.accent }));
  const rowsMeta = zoneRows.map((z) => ({ id: z.id, label: z.short }));

  // ---- supply matrices
  const tierCols = ["Premium", "Mid", "Budget"];
  const genderCols = ["Boys", "Girls", "Co-live"];
  const bandCols = PRICE_BANDS.map((b) => b.key);
  const tierM = emptyMatrix(rowsMeta, tierCols);
  const genderM = emptyMatrix(rowsMeta, genderCols);
  const priceM = emptyMatrix(rowsMeta, bandCols);

  const live = items.filter((i) => i.enabled);
  live.forEach((i) => {
    const z = zoneOfPG(i.pg);
    if (!tierM.cells[z]) return;
    if (tierCols.includes(i.pg.tier)) tierM.cells[z][i.pg.tier] += 1;
    if (genderCols.includes(i.pg.gender)) genderM.cells[z][i.pg.gender] += 1;
    const b = bandOf(entryPrice(i.pg));
    if (b) priceM.cells[z][b] += 1;
  });

  // ---- demand matrices (zone x day)
  const dayKeys: string[] = [];
  const dayLabels = new Map<string, string>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    const k = d.toISOString().slice(0, 10);
    dayKeys.push(k);
    dayLabels.set(k, d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }));
  }
  const demandM = emptyMatrix(rowsMeta, dayKeys);
  const activityM = emptyMatrix(rowsMeta, dayKeys);

  const recentLeads = leads.filter((l) => new Date(l.createdAt).getTime() >= since);
  const recentTours = tours.filter((t) => new Date(t.createdAt).getTime() >= since);
  const recentBookings = bookings.filter((b) => new Date(b.ts).getTime() >= since);

  const pgByName = new Map(items.map((i) => [norm(i.pg.name), i]));
  const crmProp = new Map<string, { zone: string; name: string }>();
  properties.forEach((p) => {
    const hit = pgByName.get(norm(p.name));
    crmProp.set(p.id, { zone: hit ? zoneOfPG(hit.pg) : zoneOfText(p.area, zones), name: p.name });
  });

  const dkey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
  recentLeads.forEach((l) => {
    const z = zoneOfText(l.preferredArea, zones);
    const k = dkey(l.createdAt);
    if (demandM.cells[z] && k in demandM.cells[z]) demandM.cells[z][k] += 1;
  });
  recentTours.forEach((t) => {
    const z = crmProp.get(t.propertyId)?.zone ?? UNMAPPED;
    const k = dkey(t.createdAt);
    if (activityM.cells[z] && k in activityM.cells[z]) activityM.cells[z][k] += 1;
  });

  // ---- trend
  const trend = dayKeys.map((k) => ({
    day: dayLabels.get(k) || k,
    leads: recentLeads.filter((l) => dkey(l.createdAt) === k).length,
    tours: recentTours.filter((t) => dkey(t.createdAt) === k).length,
    bookings: recentBookings.filter((b) => dkey(b.ts) === k).length,
  }));

  // ---- zone bars + budget gap
  const zoneBars = zoneRows.map((z) => {
    const zi = items.filter((i) => zoneOfPG(i.pg) === z.id);
    const liveN = zi.filter((i) => i.enabled).length;
    const zl = recentLeads.filter((l) => zoneOfText(l.preferredArea, zones) === z.id);
    const prices = zi.filter((i) => i.enabled).map((i) => entryPrice(i.pg)).filter((n) => n > 0);
    const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const avgBudget = zl.length ? Math.round(zl.reduce((a, l) => a + l.budget, 0) / zl.length) : 0;
    return {
      zone: z.id,
      short: z.short,
      leads: zl.length,
      live: liveN,
      disabled: zi.length - liveN,
      tours: recentTours.filter((t) => crmProp.get(t.propertyId)?.zone === z.id).length,
      bookings: recentBookings.filter((b) => crmProp.get(b.propertyId)?.zone === z.id).length,
      avgPrice,
      avgBudget,
      pressure: liveN > 0 ? Number((zl.length / liveN).toFixed(2)) : zl.length,
    };
  }).sort((a, b) => b.leads - a.leads || b.live - a.live);

  const budgetGap = zoneBars
    .filter((z) => z.avgPrice > 0 && z.avgBudget > 0)
    .map((z) => ({ zone: z.zone, short: z.short, avgPrice: z.avgPrice, avgBudget: z.avgBudget, gap: z.avgBudget - z.avgPrice }));

  // ---- property heat
  const heat = new Map<string, { name: string; zone: string; tours: number; bookings: number; enabled: boolean }>();
  items.forEach((i) => heat.set(norm(i.pg.name), { name: i.pg.name, zone: zoneOfPG(i.pg), tours: 0, bookings: 0, enabled: i.enabled }));
  recentTours.forEach((t) => {
    const cp = crmProp.get(t.propertyId);
    const row = cp && heat.get(norm(cp.name));
    if (row) row.tours += 1;
  });
  recentBookings.forEach((b) => {
    const cp = crmProp.get(b.propertyId);
    const row = cp && heat.get(norm(cp.name));
    if (row) row.bookings += 1;
  });
  const topProperties = [...heat.values()]
    .map((r) => ({ ...r, heat: r.tours * 4 + r.bookings * 10 }))
    .filter((r) => r.heat > 0)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 12);

  // ---- price histogram vs lead budgets
  const priceHistogram = PRICE_BANDS.map((b) => ({
    band: b.key,
    live: live.filter((i) => bandOf(entryPrice(i.pg)) === b.key).length,
    off: items.filter((i) => !i.enabled && bandOf(entryPrice(i.pg)) === b.key).length,
    leads: recentLeads.filter((l) => bandOf(l.budget) === b.key).length,
  }));

  return {
    zoneRows,
    tierMatrix: finalize(tierM),
    genderMatrix: finalize(genderM),
    priceMatrix: finalize(priceM),
    demandMatrix: finalize({ ...demandM, cols: dayKeys }),
    activityMatrix: finalize({ ...activityM, cols: dayKeys }),
    trend,
    zoneBars,
    budgetGap,
    topProperties,
    priceHistogram,
    totals: {
      live: live.length,
      off: items.length - live.length,
      leads: recentLeads.length,
      tours: recentTours.length,
      bookings: recentBookings.length,
    },
  };
}

export function dayColLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit" });
}

/** WhatsApp-ready heatmap digest. */
export function analyticsText(a: SupplyAnalytics, windowLabel: string): string {
  const l = [`*Supply Heatmap — ${windowLabel}*`, ""];
  l.push(`Live ${a.totals.live} · Off ${a.totals.off} · Leads ${a.totals.leads} · Tours ${a.totals.tours} · Booked ${a.totals.bookings}`, "");
  l.push("*Zone pressure (leads per live property)*");
  a.zoneBars.slice(0, 10).forEach((z) =>
    l.push(`${z.short}: ${z.leads} leads / ${z.live} live = ${z.pressure} · ${z.tours} tours · ${z.bookings} booked`),
  );
  if (a.budgetGap.length) {
    l.push("", "*Budget vs price*");
    a.budgetGap.slice(0, 8).forEach((z) =>
      l.push(`${z.short}: budget ₹${z.avgBudget.toLocaleString("en-IN")} vs price ₹${z.avgPrice.toLocaleString("en-IN")} (${z.gap >= 0 ? "+" : ""}₹${z.gap.toLocaleString("en-IN")})`),
    );
  }
  if (a.topProperties.length) {
    l.push("", "*Hottest properties*");
    a.topProperties.slice(0, 6).forEach((p, i) => l.push(`${i + 1}. ${p.name} (${p.zone}) — ${p.tours} tours, ${p.bookings} booked${p.enabled ? "" : " ⚠ disabled"}`));
  }
  l.push("", "*Price band supply vs demand*");
  a.priceHistogram.forEach((b) => l.push(`${b.band}: ${b.live} live vs ${b.leads} leads`));
  return l.join("\n");
}
