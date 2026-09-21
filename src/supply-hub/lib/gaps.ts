// Data-completeness audit for the Supply Hub catalogue.
import type { PG } from "../data/types";
import { rawFor } from "./messages-kit";
import { zoneOfPG } from "./zones";

export interface GapField {
  key: string;
  label: string;
  weight: number;
  ok: (pg: PG) => boolean;
}

export const GAP_FIELDS: GapField[] = [
  { key: "actualName", label: "Actual PG name", weight: 4, ok: (p) => !!p.actualName },
  { key: "area", label: "Area", weight: 6, ok: (p) => !!p.area },
  { key: "locality", label: "Locality", weight: 5, ok: (p) => !!p.locality },
  { key: "mapsLink", label: "Google Maps link", weight: 6, ok: (p) => !!p.mapsLink },
  { key: "prices", label: "Per-bed pricing", weight: 10, ok: (p) => p.prices.single + p.prices.double + p.prices.triple > 0 },
  { key: "rooms", label: "Room types", weight: 5, ok: (p) => !!p.rooms },
  { key: "furnishing", label: "Furnishing", weight: 3, ok: (p) => !!p.furnishing },
  { key: "amenities", label: "Amenities list", weight: 7, ok: (p) => p.amenities.length > 0 },
  { key: "safety", label: "Safety features", weight: 6, ok: (p) => p.safety.length > 0 },
  { key: "foodType", label: "Food type", weight: 5, ok: (p) => !!p.foodType },
  { key: "mealsIncluded", label: "Meals included", weight: 4, ok: (p) => !!p.mealsIncluded },
  { key: "utilities", label: "Utilities / bills", weight: 4, ok: (p) => !!p.utilities },
  { key: "cleaning", label: "Cleaning frequency", weight: 2, ok: (p) => !!p.cleaning },
  { key: "deposit", label: "Deposit terms", weight: 6, ok: (p) => !!p.deposit },
  { key: "minStay", label: "Minimum stay", weight: 4, ok: (p) => !!p.minStay },
  { key: "rules", label: "House rules", weight: 3, ok: (p) => !!p.rules },
  { key: "usp", label: "USP", weight: 4, ok: (p) => !!p.usp },
  { key: "manager", label: "Manager contact", weight: 6, ok: (p) => !!p.manager?.phone },
  { key: "owner", label: "Owner contact", weight: 4, ok: (p) => !!p.owner?.phone || !!p.owner?.name },
  { key: "groupName", label: "Owner group name", weight: 3, ok: (p) => !!p.groupName },
  { key: "geo", label: "Lat / Lng", weight: 5, ok: (p) => typeof p.lat === "number" && typeof p.lng === "number" },
  { key: "msgLocation", label: "Location copy-paste message", weight: 8, ok: (p) => !!(rawFor(p).location || p.location_card) },
  { key: "zone", label: "Zone mapping", weight: 6, ok: (p) => zoneOfPG(p) !== "UNMAPPED" },
  { key: "msgPricing", label: "Pricing copy-paste message", weight: 8, ok: (p) => !!rawFor(p).pricing },
];

const TOTAL = GAP_FIELDS.reduce((s, f) => s + f.weight, 0);

export interface GapReport {
  id: string;
  name: string;
  area: string;
  zone: string;
  missing: string[];
  score: number;
}

export function gapReport(pg: PG): GapReport {
  const missing = GAP_FIELDS.filter((f) => !f.ok(pg));
  const lost = missing.reduce((s, f) => s + f.weight, 0);
  return {
    id: pg.id,
    name: pg.name,
    area: pg.area,
    zone: zoneOfPG(pg),
    missing: missing.map((f) => f.label),
    score: Math.round(((TOTAL - lost) / TOTAL) * 100),
  };
}

export function gapReports(pgs: PG[]): GapReport[] {
  return pgs.map(gapReport).sort((a, b) => a.score - b.score);
}

export function gapsCsv(reports: GapReport[]): string {
  const head = ["Property", "Zone", "Area", "Completeness %", "Missing fields"];
  const rows = reports.map((r) => [r.name, r.zone, r.area, String(r.score), r.missing.join(" | ")]);
  return [head, ...rows]
    .map((cols) => cols.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
