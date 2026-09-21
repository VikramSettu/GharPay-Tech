// Demand ↔ Supply bridge: joins the CRM demand signal (leads, tours, bookings)
// to the zone-mapped Supply Hub catalogue so leadership sees the gap in one view.
import type { Lead, Tour, Booking, Property } from "@/lib/types";
import type { SupplyItem } from "./store";
import { UNMAPPED, zoneMeta, zoneOfPG, type ZoneDef } from "./zones";

const DAY = 24 * 60 * 60 * 1000;

export interface ZoneGapRow {
  zone: string;
  label: string;
  short: string;
  accent: string;
  core: boolean;
  leadsWeek: number;
  leadsHot: number;
  toursWeek: number;
  bookingsWeek: number;
  live: number;
  disabled: number;
  total: number;
  avgBudget: number;
  ratio: number; // leads per live property
  verdict: "undersupplied" | "oversupplied" | "balanced" | "no-supply" | "no-demand";
  note: string;
}

export interface PropertyHeatRow {
  id: string;
  name: string;
  zone: string;
  area: string;
  enabled: boolean;
  inquiries: number;
  tours: number;
  bookings: number;
  heat: number;
}

export interface SupplyRecommendation {
  id: string;
  severity: "critical" | "warn" | "info";
  title: string;
  detail: string;
  zone: string;
}

const norm = (s: string) => (s || "").toLowerCase().trim();

/** Which zone does a free-text lead area belong to? Keyword match against the registry. */
export function zoneOfText(text: string, zones: ZoneDef[]): string {
  const t = norm(text);
  if (!t) return UNMAPPED;
  for (const z of zones) {
    if (z.keywords.some((k) => t.includes(k))) return z.id;
    if (norm(z.label).includes(t) || norm(z.id) === t) return z.id;
  }
  return UNMAPPED;
}

export interface DemandSupply {
  zones: ZoneGapRow[];
  heat: PropertyHeatRow[];
  cold: PropertyHeatRow[];
  recommendations: SupplyRecommendation[];
}

export function buildDemandSupply(args: {
  leads: Lead[];
  tours: Tour[];
  bookings: Booking[];
  properties: Property[];
  items: SupplyItem[];
  zones: ZoneDef[];
  windowDays?: number;
}): DemandSupply {
  const { leads, tours, bookings, properties, items, zones } = args;
  const since = Date.now() - (args.windowDays ?? 7) * DAY;

  const recentLeads = leads.filter((l) => new Date(l.createdAt).getTime() >= since);
  const recentTours = tours.filter((t) => new Date(t.createdAt).getTime() >= since);
  const recentBookings = bookings.filter((b) => new Date(b.ts).getTime() >= since);

  const leadZone = new Map<string, string>();
  recentLeads.forEach((l) => leadZone.set(l.id, zoneOfText(l.preferredArea, zones)));

  // CRM property → supply zone (by name, else by area text)
  const pgByName = new Map(items.map((i) => [norm(i.pg.name), i]));
  const crmProp = new Map<string, { zone: string; name: string; area: string }>();
  properties.forEach((p) => {
    const hit = pgByName.get(norm(p.name));
    crmProp.set(p.id, {
      zone: hit ? zoneOfPG(hit.pg) : zoneOfText(p.area, zones),
      name: p.name,
      area: p.area,
    });
  });

  const rows: ZoneGapRow[] = [...zones, zoneMeta(UNMAPPED)].map((z) => {
    const zoneLeads = recentLeads.filter((l) => leadZone.get(l.id) === z.id);
    const zoneTours = recentTours.filter((t) => crmProp.get(t.propertyId)?.zone === z.id);
    const zoneBookings = recentBookings.filter((b) => crmProp.get(b.propertyId)?.zone === z.id);
    const zoneItems = items.filter((i) => zoneOfPG(i.pg) === z.id);
    const live = zoneItems.filter((i) => i.enabled).length;
    const disabled = zoneItems.length - live;
    const avgBudget = zoneLeads.length
      ? Math.round(zoneLeads.reduce((s, l) => s + l.budget, 0) / zoneLeads.length)
      : 0;
    const ratio = live > 0 ? Number((zoneLeads.length / live).toFixed(2)) : zoneLeads.length;

    let verdict: ZoneGapRow["verdict"] = "balanced";
    let note = "Demand and live supply are in step.";
    if (zoneLeads.length === 0 && zoneItems.length > 0) {
      verdict = "no-demand";
      note = `${zoneItems.length} properties listed, zero leads this week — market this zone.`;
    } else if (zoneLeads.length > 0 && live === 0) {
      verdict = "no-supply";
      note = `${zoneLeads.length} leads want this zone and nothing is live${disabled ? ` (${disabled} disabled)` : ""}.`;
    } else if (ratio >= 3) {
      verdict = "undersupplied";
      note = `${zoneLeads.length} leads chasing ${live} live properties — add supply or re-enable stock.`;
    } else if (live >= 5 && ratio <= 0.4) {
      verdict = "oversupplied";
      note = `${live} live properties, only ${zoneLeads.length} leads — push ads and reels here.`;
    }

    return {
      zone: z.id,
      label: z.label,
      short: z.short,
      accent: z.accent,
      core: !!z.core,
      leadsWeek: zoneLeads.length,
      leadsHot: zoneLeads.filter((l) => l.intent === "hot").length,
      toursWeek: zoneTours.length,
      bookingsWeek: zoneBookings.length,
      live,
      disabled,
      total: zoneItems.length,
      avgBudget,
      ratio,
      verdict,
      note,
    };
  });

  // Property heatmap
  const heatMap = new Map<string, PropertyHeatRow>();
  items.forEach((i) => {
    heatMap.set(norm(i.pg.name), {
      id: i.pg.id || i.pg.name,
      name: i.pg.name,
      zone: zoneOfPG(i.pg),
      area: i.pg.area,
      enabled: i.enabled,
      inquiries: 0,
      tours: 0,
      bookings: 0,
      heat: 0,
    });
  });
  const bump = (propertyId: string, key: "inquiries" | "tours" | "bookings", n = 1) => {
    const cp = crmProp.get(propertyId);
    if (!cp) return;
    const row = heatMap.get(norm(cp.name));
    if (row) row[key] += n;
  };
  recentTours.forEach((t) => {
    bump(t.propertyId, "tours");
    bump(t.propertyId, "inquiries");
  });
  recentBookings.forEach((b) => bump(b.propertyId, "bookings"));

  const heatRows = [...heatMap.values()].map((r) => ({
    ...r,
    heat: r.inquiries * 2 + r.tours * 4 + r.bookings * 10,
  }));
  const heat = heatRows.filter((r) => r.heat > 0).sort((a, b) => b.heat - a.heat);
  const cold = heatRows
    .filter((r) => r.heat === 0)
    .sort((a, b) => a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name));

  // Recommendations
  const recs: SupplyRecommendation[] = [];
  rows.forEach((r) => {
    if (r.verdict === "no-supply") {
      recs.push({
        id: `nosupply-${r.zone}`,
        severity: "critical",
        title: `High demand / no live supply in ${r.short}`,
        detail: r.note,
        zone: r.zone,
      });
    } else if (r.verdict === "undersupplied") {
      recs.push({
        id: `under-${r.zone}`,
        severity: "critical",
        title: `High demand / low supply in ${r.short}`,
        detail: `${r.leadsWeek} leads (${r.leadsHot} hot) vs ${r.live} live — ratio ${r.ratio} leads per property.`,
        zone: r.zone,
      });
    } else if (r.verdict === "oversupplied") {
      recs.push({
        id: `over-${r.zone}`,
        severity: "warn",
        title: `Oversupply in ${r.short}`,
        detail: r.note,
        zone: r.zone,
      });
    } else if (r.verdict === "no-demand" && r.total >= 3) {
      recs.push({
        id: `nodemand-${r.zone}`,
        severity: "warn",
        title: `Zero demand in ${r.short}`,
        detail: r.note,
        zone: r.zone,
      });
    }
    if (r.disabled > 0 && r.leadsWeek >= 3) {
      recs.push({
        id: `disabled-${r.zone}`,
        severity: "warn",
        title: `${r.disabled} disabled properties in ${r.short} while ${r.leadsWeek} leads wait`,
        detail: "Re-enable anything that is back in stock before buying more leads.",
        zone: r.zone,
      });
    }
  });
  heat
    .filter((h) => !h.enabled)
    .slice(0, 8)
    .forEach((h) =>
      recs.push({
        id: `hotdisabled-${h.id}`,
        severity: "critical",
        title: `${h.tours} leads toured but ${h.name} is disabled`,
        detail: `${h.inquiries} inquiries · ${h.tours} tours · ${h.bookings} bookings this week on a disabled property.`,
        zone: h.zone,
      }),
    );
  const unmapped = items.filter((i) => zoneOfPG(i.pg) === UNMAPPED).length;
  if (unmapped > 0) {
    recs.push({
      id: "unmapped",
      severity: "info",
      title: `${unmapped} properties have no zone`,
      detail: "Set a zone override in Property Control so they show up in demand reporting.",
      zone: UNMAPPED,
    });
  }

  const order = { critical: 0, warn: 1, info: 2 };
  recs.sort((a, b) => order[a.severity] - order[b.severity]);

  return { zones: rows, heat, cold, recommendations: recs };
}

/** WhatsApp-ready summary of the gap board. */
export function demandSupplyText(ds: DemandSupply, windowLabel = "this week"): string {
  const lines = [`*Supply vs Demand — ${windowLabel}*`, ""];
  ds.zones
    .filter((z) => z.leadsWeek > 0 || z.total > 0)
    .forEach((z) => {
      lines.push(
        `${z.short}: ${z.leadsWeek} leads (${z.leadsHot} hot) · ${z.live} live / ${z.disabled} off · ${z.toursWeek} tours · ${z.bookingsWeek} booked → ${z.verdict}`,
      );
    });
  if (ds.recommendations.length) {
    lines.push("", "*Actions*");
    ds.recommendations.slice(0, 8).forEach((r) => lines.push(`• ${r.title} — ${r.detail}`));
  }
  if (ds.heat.length) {
    lines.push("", "*Hottest properties*");
    ds.heat.slice(0, 5).forEach((h, i) => lines.push(`${i + 1}. ${h.name} (${h.zone}) — ${h.tours} tours, ${h.bookings} booked`));
  }
  return lines.join("\n");
}
