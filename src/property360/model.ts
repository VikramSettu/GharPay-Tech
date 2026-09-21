// Property 360 / Property Passport — canonical property brain.
// Derives a complete Property→Building→Floor→Room→Bed model from the
// existing Supply Hub master (src/supply-hub/data/pgs.ts), assigns canonical
// IDs, and layers room/floor/persona intelligence on top.
//
// Deterministic: everything is seeded off the property id, so the same
// property always renders the same building, rooms and beds (SSR-safe).

import { PGS } from "@/supply-hub/data/pgs";
import type { PG } from "@/supply-hub/data/types";

/* ------------------------------------------------------------------ */
/* Access levels — field-level, not page-level                         */
/* ------------------------------------------------------------------ */

export type AccessLevel =
  | "public"
  | "customer_safe"
  | "internal_team"
  | "role_restricted"
  | "zone_owner"
  | "admin"
  | "confidential";

export type P360Role =
  | "customer"
  | "team"
  | "flow_ops"
  | "tcm"
  | "closing"
  | "inventory_captain"
  | "zone_owner"
  | "control_tower"
  | "admin";

export const ROLE_LABEL: Record<P360Role, string> = {
  customer: "Customer view",
  team: "Team member / Advisor",
  flow_ops: "Flow Ops",
  tcm: "Tour Conversion Manager",
  closing: "Closing Specialist",
  inventory_captain: "Inventory Captain",
  zone_owner: "Zone Owner",
  control_tower: "Control Tower",
  admin: "Admin",
};

const LEVEL_RANK: Record<AccessLevel, number> = {
  public: 0,
  customer_safe: 1,
  internal_team: 2,
  role_restricted: 3,
  zone_owner: 4,
  admin: 5,
  confidential: 5,
};

const ROLE_CLEARANCE: Record<P360Role, number> = {
  customer: 1,
  team: 2,
  flow_ops: 2,
  tcm: 3,
  closing: 3,
  inventory_captain: 3,
  zone_owner: 4,
  control_tower: 4,
  admin: 5,
};

export function canSee(role: P360Role, level: AccessLevel): boolean {
  return ROLE_CLEARANCE[role] >= LEVEL_RANK[level];
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type BedStatus = "available" | "occupied" | "vacating" | "held" | "booked" | "maintenance";
export type RoomStatus = BedStatus | "not_sellable";
export type Readiness = "P0" | "P1" | "P2" | "P3" | "P4";

export interface Bed {
  id: string;
  label: string; // A / B / C
  position: string; // window side, balcony side...
  price: number;
  status: BedStatus;
  availableFrom?: string;
  occupiedUntil?: string;
}

export interface Room {
  id: string;
  number: string;
  floorNo: number;
  type: "Single" | "Double" | "Triple" | "Quad" | "Studio";
  ac: boolean;
  bathroom: "Attached" | "Shared";
  balcony: boolean;
  windowDirection: "East" | "West" | "North" | "South";
  sizeSqft: number;
  standardRent: number;
  currentRent: number;
  floorRent: number; // lowest approved — confidential
  deposit: string;
  beds: Bed[];
  why: string[];
  whyNot: string[];
  bestFor: string;
  status: RoomStatus;
  mediaCount: number;
  hasVideo: boolean;
}

export interface FloorCell {
  kind: "room" | "lift" | "stairs" | "pantry" | "lounge" | "corridor" | "washroom" | "balcony";
  label: string;
  roomId?: string;
}

export interface Floor {
  id: string;
  no: number;
  name: string;
  usp: string[];
  weakness: string[];
  rooms: Room[];
  grid: FloorCell[][];
  mapCoverage: number; // 0-1
}

export interface PersonaScore {
  persona: string;
  score: number; // 0-5
  why: string;
}

export interface LandmarkX {
  name: string;
  category: string;
  km: number;
  walkMin: number;
  driveMin: number;
  matters: string;
}

export interface PersonRef {
  role: string;
  name: string;
  phone: string;
  hours: string;
  access: AccessLevel;
}

export interface FreshnessItem {
  field: string;
  verifiedBy: string;
  verifiedAgoHours: number;
  recheckHours: number;
}

export interface CompletenessRow {
  section: string;
  pct: number;
}

export interface Property360 {
  pid: string; // canonical KOR-SGP-001
  legacyId: string;
  displayName: string;
  actualName: string;
  group: string;
  zone: string;
  zoneCode: string;
  subArea: string;
  microLocation: string;
  address: string;
  mapsLink: string;
  lat: number | null;
  lng: number | null;
  gender: string;
  tier: string;
  propertyType: string;
  status: "Active" | "Paused" | "Upcoming" | "Sold Out";
  priority: "Hero" | "Core" | "Backup" | "Long-tail";
  onboardedOn: string;
  lastVerifiedDays: number;

  floorsCount: number;
  roomsCount: number;
  bedsCount: number;
  availableBeds: number;

  floors: Floor[];
  landmarks: LandmarkX[];
  offices: LandmarkX[];
  colleges: LandmarkX[];
  radius: { label: string; items: LandmarkX[] }[];

  personas: PersonaScore[];
  notFor: string[];
  why: string[];
  whyNot: string[];
  alternatives: { kind: string; pid: string; name: string; note: string }[];

  amenities: { group: string; items: string[] }[];
  food: { type: string; meals: string; notes: string };
  rules: { label: string; value: string }[];
  commercials: { label: string; value: string; access: AccessLevel }[];
  people: PersonRef[];
  documents: { name: string; kind: string; access: AccessLevel }[];
  media: { group: string; count: number; hasVideo: boolean }[];
  faq: { q: string; a: string }[];
  experience: { metric: string; score: number }[];
  internalNotes: string[];

  freshness: FreshnessItem[];
  completeness: CompletenessRow[];
  completenessPct: number;
  readiness: Readiness;
  gates: { label: string; done: boolean }[];
  ownersOf: { role: string; who: string }[];
}

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length) % arr.length];
const pickN = <T,>(r: () => number, arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < Math.min(n, copy.length)) out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
  return out;
};

export const ZONE_CODES: Record<string, string> = {
  Koramangala: "KOR", Bellandur: "BLR", Mahadevapura: "MHD", Marathahalli: "MRT",
  Whitefield: "WTF", "HSR Layout": "HSR", "Nagawara Manyata": "MTP", "BTM Layout": "BTM",
  "Electronic City": "ECY", BROOKFIELD: "BRK", "JP NAGAR": "JPN", "Sg Palya": "KOR",
  "Christ Yeshwanthpur Campus": "YPR", "Vasanth Nagar": "VSN", "MG Road": "MGR",
  Jayanagar: "JYN", Indranagar: "IND", SJR: "BLR",
};

export function subAreaCode(sub: string): string {
  const words = sub.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "GEN";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase().padEnd(3, "X");
}

export function zoneCodeFor(zone: string): string {
  return ZONE_CODES[zone] ?? (zone || "GEN").slice(0, 3).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Intelligence pools                                                  */
/* ------------------------------------------------------------------ */

const ROOM_WHY = [
  "Corner room — only one shared wall", "Largest window on the floor", "Away from corridor noise",
  "Private balcony access", "Gets morning sunlight", "Washroom right outside the door",
  "Extra cupboard column per bed", "Dedicated workstation with power backup point",
  "Best cross-ventilation on this floor", "Larger layout than the rest of the floor",
];
const ROOM_WHY_NOT = [
  "Directly next to the lift", "Smaller cupboard than standard", "Limited sunlight after 2pm",
  "Road-facing — traffic noise in the morning", "Close to the pantry, smell in the evenings",
  "Compact bathroom", "Shares wall with the common lounge",
];
const FLOOR_USP: Record<string, string[]> = {
  low: ["Easiest access, no lift dependency", "Closest to dining", "Best for late-night entries"],
  mid: ["Quieter — less movement", "Better ventilation", "Balanced light through the day"],
  high: ["Terrace access", "Best natural light and views", "Least corridor traffic"],
};
const FLOOR_WEAK: Record<string, string[]> = {
  low: ["Common-area traffic", "Kitchen noise and smell", "Least privacy"],
  mid: ["Lift wait at peak hours", "Mid-floor rooms get less sun"],
  high: ["Lift dependency", "Warmer in summer", "Long walk with luggage on power cuts"],
};
const BED_POS = ["Window side", "Cupboard side", "Balcony side", "Door side"];

const EXPERIENCE_METRICS = ["Room Quality", "Food", "Cleanliness", "Location", "Value", "Management", "Amenities", "Safety", "Social Environment", "Quietness"];

const INTERNAL_POOL = [
  "Manager responds fast on WhatsApp, slow on calls after 8pm",
  "Room photos on Drive are 4 months old — reshoot before sharing premium rooms",
  "Owner flexible on deposit, not on rent, for 11-month commitments",
  "Do not claim 'walking distance to metro' — it is a 15 min walk",
  "Two rooms on the top floor have recurring water pressure complaints",
  "Inventory numbers from the manager are optimistic — always reconfirm on tour day",
];

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

function buildFloor(pg: PG, no: number, floors: number, r: () => number, pid: string, priceBase: number, roomTypes: Room["type"][]): Floor {
  const roomCount = 3 + Math.floor(r() * 4); // 3-6
  const fid = `${pid}-F${String(no).padStart(2, "0")}`;
  const band = no <= 1 ? "low" : no >= floors - 1 ? "high" : "mid";
  const rooms: Room[] = [];
  for (let i = 0; i < roomCount; i++) {
    const number = `${no}${String(i + 1).padStart(2, "0")}`;
    const type = pick(r, roomTypes);
    const beds = type === "Single" ? 1 : type === "Double" ? 2 : type === "Triple" ? 3 : 4;
    const rent = Math.round((priceBase * (type === "Single" ? 1.5 : type === "Double" ? 1.15 : 1)) / 500) * 500;
    const bedList: Bed[] = Array.from({ length: beds }).map((_, b) => {
      const roll = r();
      const status: BedStatus =
        roll > 0.72 ? "available" : roll > 0.62 ? "vacating" : roll > 0.56 ? "held" : "occupied";
      return {
        id: `${fid}-R${number}-${String.fromCharCode(65 + b)}`,
        label: String.fromCharCode(65 + b),
        position: BED_POS[b % BED_POS.length],
        price: rent,
        status,
        availableFrom: status === "vacating" ? dayFromNow(5 + Math.floor(r() * 25)) : undefined,
        occupiedUntil: status === "occupied" ? dayFromNow(20 + Math.floor(r() * 90)) : undefined,
      };
    });
    const anyAvail = bedList.some((b) => b.status === "available");
    const maint = r() > 0.94;
    rooms.push({
      id: `${fid}-R${number}`,
      number,
      floorNo: no,
      type,
      ac: r() > 0.45,
      bathroom: r() > 0.3 ? "Attached" : "Shared",
      balcony: r() > 0.55,
      windowDirection: pick(r, ["East", "West", "North", "South"] as const),
      sizeSqft: 90 + Math.floor(r() * 140),
      standardRent: rent,
      currentRent: rent,
      floorRent: Math.round((rent * 0.88) / 100) * 100,
      deposit: pg.deposit || "One month rent",
      beds: bedList,
      why: pickN(r, ROOM_WHY, 3),
      whyNot: pickN(r, ROOM_WHY_NOT, 2),
      bestFor: pick(r, [
        "Premium professional who values natural light",
        "Student who needs a quiet study corner",
        "Budget-first customer wanting the cheapest sellable bed",
        "Working professional on early shifts",
        "Customer moving in immediately",
      ]),
      status: maint ? "maintenance" : anyAvail ? "available" : bedList.some((b) => b.status === "vacating") ? "vacating" : "occupied",
      mediaCount: Math.floor(r() * 9),
      hasVideo: r() > 0.6,
    });
  }

  // Simple block grid: rooms row, corridor, rooms row, utilities row.
  const half = Math.ceil(rooms.length / 2);
  const grid: FloorCell[][] = [
    rooms.slice(0, half).map((rm) => ({ kind: "room" as const, label: rm.number, roomId: rm.id })),
    [{ kind: "corridor" as const, label: "Corridor" }],
    [
      ...rooms.slice(half).map((rm) => ({ kind: "room" as const, label: rm.number, roomId: rm.id })),
      { kind: "lounge" as const, label: "Lounge" },
    ],
    [
      { kind: "lift" as const, label: "Lift" },
      { kind: "stairs" as const, label: "Stairs" },
      { kind: "pantry" as const, label: "Pantry" },
      { kind: "washroom" as const, label: "Common WC" },
    ],
  ];

  return {
    id: fid,
    no,
    name: no === 0 ? "Ground Floor" : `Floor ${no}`,
    usp: pickN(r, FLOOR_USP[band], 2),
    weakness: pickN(r, FLOOR_WEAK[band], 1),
    rooms,
    grid,
    mapCoverage: 0.4 + r() * 0.6,
  };
}

function dayFromNow(d: number): string {
  const base = new Date(2026, 7, 10); // fixed reference — SSR-stable
  base.setDate(base.getDate() + d);
  return base.toISOString().slice(0, 10);
}

function radiusBuckets(items: LandmarkX[]) {
  const defs: [string, number][] = [["Within 500 m", 0.5], ["Within 1 km", 1], ["Within 2 km", 2], ["Within 3 km", 3], ["Within 5 km", 5]];
  let prev = 0;
  return defs.map(([label, max]) => {
    const bucket = items.filter((l) => l.km > prev && l.km <= max);
    prev = max;
    return { label, items: bucket };
  });
}

function scorePersonas(pg: PG, colleges: LandmarkX[], offices: LandmarkX[]): PersonaScore[] {
  const nearCollege = colleges[0];
  const nearOffice = offices[0];
  const min = pg.prices.min || 0;
  const hasFood = /veg|meal/i.test(`${pg.foodType} ${pg.mealsIncluded}`) && !!pg.mealsIncluded;
  const out: PersonaScore[] = [];
  out.push({
    persona: nearCollege ? `${nearCollege.name.split(" ").slice(0, 2).join(" ")} student` : "Student",
    score: nearCollege ? (nearCollege.km < 1 ? 5 : nearCollege.km < 2.5 ? 4 : 2) : 2,
    why: nearCollege ? `${nearCollege.km} km from ${nearCollege.name}${hasFood ? " · meals included" : ""}` : "No college mapped nearby",
  });
  out.push({
    persona: nearOffice ? `${nearOffice.name.split(" ").slice(0, 2).join(" ")} professional` : "IT professional",
    score: nearOffice ? (nearOffice.km < 2 ? 5 : nearOffice.km < 4 ? 3 : 2) : 2,
    why: nearOffice ? `${nearOffice.km} km · ~${nearOffice.driveMin} min commute` : "Commute to major hubs is long",
  });
  out.push({
    persona: "Premium professional",
    score: pg.tier === "Premium" ? 5 : pg.tier === "Mid" ? 3 : 2,
    why: pg.tier === "Premium" ? "Strong interiors, private rooms available" : `${pg.tier} tier interiors`,
  });
  out.push({
    persona: "Budget customer",
    score: min && min <= 12000 ? 5 : min <= 16000 ? 3 : 2,
    why: min ? `Entry price ₹${min.toLocaleString("en-IN")}` : "Pricing not confirmed",
  });
  out.push({
    persona: "Food-first customer",
    score: hasFood ? (/4 meals/i.test(pg.mealsIncluded) ? 5 : 4) : 2,
    why: hasFood ? `${pg.foodType} · ${pg.mealsIncluded}` : "Food not included / unverified",
  });
  out.push({
    persona: "Immediate move-in",
    score: 4,
    why: "Live bed availability confirmed on the inventory tab",
  });
  return out;
}

function buildOne(pg: PG, seq: number, all: PG[]): Property360 {
  const r = rng(pg.id);
  const zone = pg.area || "Bengaluru";
  const zoneCode = ZONE_CODES[zone] ?? zone.slice(0, 3).toUpperCase();
  const subArea = (pg.locality || zone).split(",")[0].trim();
  const pid = `${zoneCode}-${subAreaCode(subArea)}-${String(seq).padStart(3, "0")}`;

  const lm: LandmarkX[] = (pg.nearbyLandmarks ?? []).map((l) => ({
    name: l.n,
    category: l.t,
    km: Math.round(l.d * 100) / 100,
    walkMin: l.w,
    driveMin: Math.max(3, Math.round(l.d * 4 + 3)),
    matters:
      /college|university/i.test(l.t) ? "Primary student demand generator"
      : /it park|office|corporate|tech/i.test(l.t) ? "Working-professional demand"
      : /metro|bus|junction/i.test(l.t) ? "Commute anchor"
      : /mall|market/i.test(l.t) ? "Lifestyle convenience"
      : /hospital/i.test(l.t) ? "Safety / parent comfort"
      : "Orientation landmark",
  }));
  const colleges = lm.filter((l) => /college|university/i.test(l.category)).slice(0, 5);
  const offices = lm.filter((l) => /it park|office|corporate|tech/i.test(l.category)).slice(0, 6);

  const floorsCount = 3 + Math.floor(r() * 3); // 3-5
  const priceBase = pg.prices.triple || pg.prices.double || pg.prices.min || 12000;
  const roomTypes: Room["type"][] = [];
  if (/single/i.test(pg.rooms) || pg.prices.single) roomTypes.push("Single");
  if (/double|dual/i.test(pg.rooms) || pg.prices.double) roomTypes.push("Double");
  if (/triple/i.test(pg.rooms) || pg.prices.triple) roomTypes.push("Triple");
  if (!roomTypes.length) roomTypes.push("Double", "Triple");

  const floors: Floor[] = [];
  for (let f = 0; f < floorsCount; f++) floors.push(buildFloor(pg, f, floorsCount, r, pid, priceBase, roomTypes));

  const rooms = floors.flatMap((f) => f.rooms);
  const beds = rooms.flatMap((rm) => rm.beds);
  const availableBeds = beds.filter((b) => b.status === "available").length;

  const priority: Property360["priority"] =
    pg.iq >= 85 ? "Hero" : pg.iq >= 70 ? "Core" : pg.iq >= 50 ? "Backup" : "Long-tail";

  // Alternatives — same zone, nearest by price.
  const sameZone = all.filter((p) => p.id !== pg.id && p.area === pg.area);
  const byPrice = [...sameZone].sort((a, b) => (a.prices.min || 0) - (b.prices.min || 0));
  const cheaper = byPrice.find((p) => (p.prices.min || 0) < (pg.prices.min || 0));
  const premium = [...byPrice].reverse().find((p) => (p.prices.min || 0) > (pg.prices.min || 0));
  const closest = sameZone[0];
  const foodAlt = sameZone.find((p) => /non/i.test(p.foodType)) ?? sameZone[1];
  const alternatives = [
    cheaper && { kind: "Cheaper alternative", pid: cheaper.id, name: cheaper.name, note: `₹${(cheaper.prices.min || 0).toLocaleString("en-IN")} entry` },
    premium && { kind: "Premium alternative", pid: premium.id, name: premium.name, note: `${premium.tier} tier` },
    closest && { kind: "Closest alternative", pid: closest.id, name: closest.name, note: `Same sub-market` },
    foodAlt && { kind: "Food alternative", pid: foodAlt.id, name: foodAlt.name, note: foodAlt.foodType || "Different menu" },
  ].filter(Boolean) as Property360["alternatives"];

  const amenities = [
    { group: "Room", items: ["Bed", "Mattress", "Cupboard", "Desk", "Chair", ...(rooms.some((x) => x.ac) ? ["AC"] : []), "Fan"] },
    { group: "Property", items: pg.amenities.filter((a) => /wifi|lift|elevator|power|water|purifier|hot/i.test(a)).concat(pg.amenities.length ? [] : ["Wi-Fi"]) },
    { group: "Safety", items: pg.safety.length ? pg.safety : ["CCTV"] },
    { group: "Services", items: pg.amenities.filter((a) => /house|laundry|clean|maint|pest/i.test(a)).concat(pg.cleaning ? [`Cleaning: ${pg.cleaning}`] : []) },
    { group: "Lifestyle", items: pg.amenities.filter((a) => /gym|game|theatre|lounge|terrace|kitchen|cowork/i.test(a)) },
  ].filter((g) => g.items.length);

  const rules = [
    { label: "Entry timing", value: pg.rules || "No curfew" },
    { label: "Minimum stay", value: pg.minStay || "Not confirmed" },
    { label: "Deposit", value: pg.deposit || "Not confirmed" },
    { label: "Utilities", value: pg.utilities || "Not confirmed" },
    { label: "Housekeeping", value: pg.cleaning || "Not confirmed" },
    { label: "Noise level", value: pg.noise || "Not captured" },
    { label: "Visitors", value: "Allowed in common areas; opposite gender not allowed in rooms" },
    { label: "Cooking / pets", value: "Not allowed in rooms" },
  ];

  const commercials: Property360["commercials"] = [
    { label: "Listed rent (entry)", value: pg.prices.min ? `₹${pg.prices.min.toLocaleString("en-IN")}` : "—", access: "customer_safe" },
    { label: "Recommended quote", value: pg.prices.double ? `₹${pg.prices.double.toLocaleString("en-IN")}` : "—", access: "internal_team" },
    { label: "Lowest approved rent", value: pg.lows || "Ask Zone Owner", access: "role_restricted" },
    { label: "Negotiation room", value: "Up to 8% on 11-month commitment", access: "role_restricted" },
    { label: "Token / booking amount", value: "₹2,000 (adjustable)", access: "internal_team" },
    { label: "Lock-in / notice", value: `${pg.minStay || "3 months"} lock-in · 30 days notice`, access: "internal_team" },
    { label: "Owner flexibility", value: "Flexible on deposit, firm on rent", access: "zone_owner" },
    { label: "Commission / payout", value: "As per signed agreement", access: "confidential" },
  ];

  const people: PersonRef[] = [
    { role: "Property Manager", name: pg.manager.name || "Manager (name pending)", phone: pg.manager.phone || "—", hours: "9am – 9pm", access: "internal_team" },
    { role: "Backup Manager", name: "Assign in onboarding", phone: "—", hours: "9am – 9pm", access: "internal_team" },
    { role: "Owner", name: pg.owner.name || "Owner", phone: pg.owner.phone || "—", hours: "By escalation only", access: "zone_owner" },
    { role: "Food POC", name: "Kitchen in-charge", phone: "—", hours: "7am – 10pm", access: "internal_team" },
    { role: "Maintenance POC", name: "Site maintenance", phone: "—", hours: "10am – 7pm", access: "internal_team" },
    { role: "Gharpayy Zone Owner", name: `${zone} Zone Owner`, phone: "—", hours: "All day", access: "internal_team" },
  ];

  const mediaBase = pg.mapsLink ? 1 : 0;
  const media = [
    { group: "Exterior & arrival", count: mediaBase + Math.floor(r() * 6), hasVideo: r() > 0.5 },
    { group: "Common areas", count: Math.floor(r() * 8), hasVideo: r() > 0.6 },
    { group: "Floor walkthroughs", count: floors.length * Math.floor(r() * 3), hasVideo: r() > 0.7 },
    { group: "Room media", count: rooms.reduce((a, x) => a + x.mediaCount, 0), hasVideo: rooms.some((x) => x.hasVideo) },
    { group: "Approach / route video", count: r() > 0.5 ? 1 : 0, hasVideo: r() > 0.5 },
  ];

  const documents = [
    { name: "Property onboarding form", kind: "Operational", access: "internal_team" as AccessLevel },
    { name: "Price sheet", kind: "Operational", access: "internal_team" as AccessLevel },
    { name: "Food menu", kind: "Operational", access: "customer_safe" as AccessLevel },
    { name: "Property rules", kind: "Operational", access: "customer_safe" as AccessLevel },
    { name: "Check-in SOP", kind: "Operational", access: "internal_team" as AccessLevel },
    { name: "Owner agreement", kind: "Commercial", access: "confidential" as AccessLevel },
    { name: "Approved commercials", kind: "Commercial", access: "zone_owner" as AccessLevel },
    { name: "Fire & compliance papers", kind: "Compliance", access: "admin" as AccessLevel },
  ];

  const nearest = lm[0];
  const faq = [
    { q: "Is food included?", a: pg.mealsIncluded ? `${pg.mealsIncluded} · ${pg.foodType}` : "Not confirmed — verify with manager" },
    { q: "Is electricity included?", a: pg.utilities || "Not confirmed" },
    { q: "What is the deposit?", a: pg.deposit || "Not confirmed" },
    { q: "Can I stay one month?", a: `Minimum stay is ${pg.minStay || "3 months"}` },
    { q: "Is laundry available?", a: pg.amenities.some((a) => /laundry/i.test(a)) ? "Yes, on-site" : "Nearby service, not on-site" },
    { q: "How far is the nearest landmark?", a: nearest ? `${nearest.name} — ${nearest.km} km (${nearest.walkMin} min walk)` : "Landmarks pending" },
    { q: "Are private rooms available?", a: pg.prices.single ? `Yes, from ₹${pg.prices.single.toLocaleString("en-IN")}` : "No single rooms offered" },
    { q: "How safe is it?", a: (pg.safety.length ? pg.safety.join(", ") : "Basic security") + " · verified on last audit" },
  ];

  const experience = EXPERIENCE_METRICS.map((m) => ({ metric: m, score: Math.round((2.8 + r() * 2.2) * 10) / 10 }));

  const freshness: FreshnessItem[] = [
    { field: "Live inventory", verifiedBy: pg.manager.name || "Manager", verifiedAgoHours: Math.floor(r() * 40), recheckHours: 24 },
    { field: "Pricing", verifiedBy: "Inventory Captain", verifiedAgoHours: Math.floor(r() * 300), recheckHours: 168 },
    { field: "Food", verifiedBy: "Zone team", verifiedAgoHours: Math.floor(r() * 900), recheckHours: 720 },
    { field: "Amenities", verifiedBy: "Capture operator", verifiedAgoHours: Math.floor(r() * 1200), recheckHours: 720 },
    { field: "Manager details", verifiedBy: "Zone Owner", verifiedAgoHours: Math.floor(r() * 1500), recheckHours: 2160 },
    { field: "Room media", verifiedBy: "Media owner", verifiedAgoHours: Math.floor(r() * 3000), recheckHours: 2160 },
    { field: "Location", verifiedBy: "System", verifiedAgoHours: Math.floor(r() * 200), recheckHours: 8760 },
  ];

  const roomProfilePct = rooms.length ? Math.round((rooms.filter((x) => x.why.length >= 3).length / rooms.length) * 100) : 0;
  const mediaPct = Math.min(100, Math.round((media.reduce((a, m) => a + m.count, 0) / (rooms.length * 4 || 1)) * 100));
  const floorMapPct = Math.round((floors.reduce((a, f) => a + f.mapCoverage, 0) / floors.length) * 100);
  const completeness: CompletenessRow[] = [
    { section: "Identity", pct: pg.actualName ? 100 : 80 },
    { section: "Location", pct: pg.lat && pg.lng ? 100 : 70 },
    { section: "Landmarks", pct: Math.min(100, lm.length * 8) },
    { section: "Offices mapped", pct: Math.min(100, offices.length * 20) },
    { section: "Commercials", pct: pg.deposit && pg.minStay ? 100 : 65 },
    { section: "Amenities", pct: Math.min(100, pg.amenities.length * 12) },
    { section: "Floor map", pct: floorMapPct },
    { section: "Room profiles", pct: roomProfilePct },
    { section: "Media", pct: mediaPct },
    { section: "Personas", pct: 90 },
    { section: "Manager", pct: pg.manager.phone ? 100 : 40 },
    { section: "Live inventory", pct: 95 },
  ];
  const completenessPct = Math.round(completeness.reduce((a, c) => a + c.pct, 0) / completeness.length);

  const gates = [
    { label: "Identity complete", done: !!pg.actualName },
    { label: "Location verified", done: !!(pg.lat && pg.lng) },
    { label: "Amenities verified", done: pg.amenities.length >= 5 },
    { label: "Commercials verified", done: !!(pg.deposit && pg.minStay) },
    { label: "Building / floors created", done: floors.length > 0 },
    { label: "Every sellable room created", done: rooms.length > 0 },
    { label: "Room USPs added", done: roomProfilePct >= 60 },
    { label: "Photos uploaded", done: mediaPct >= 50 },
    { label: "Videos uploaded", done: media.some((m) => m.hasVideo) },
    { label: "Manager / owner configured", done: !!pg.manager.phone },
    { label: "Landmarks & offices mapped", done: lm.length >= 5 && offices.length >= 1 },
    { label: "Personas mapped", done: true },
    { label: "Alternatives mapped", done: alternatives.length >= 2 },
    { label: "Live inventory entered", done: beds.length > 0 },
    { label: "Zone Owner approved", done: completenessPct >= 85 },
  ];

  const readiness: Readiness =
    completenessPct >= 92 ? "P4"
    : completenessPct >= 82 ? "P3"
    : completenessPct >= 70 ? "P2"
    : completenessPct >= 55 ? "P1"
    : "P0";

  const why = [
    colleges[0] && colleges[0].km < 1.5 ? `Strongest ${colleges[0].name} proximity (${colleges[0].km} km)` : null,
    pg.mealsIncluded ? `Food: ${pg.mealsIncluded} (${pg.foodType})` : null,
    pg.usp || null,
    availableBeds > 3 ? `${availableBeds} sellable beds available now` : null,
    pg.prices.min ? `Entry price ₹${pg.prices.min.toLocaleString("en-IN")}` : null,
  ].filter(Boolean).slice(0, 5) as string[];

  const whyNot = [
    !pg.prices.single ? "No private/single rooms" : null,
    /^veg$/i.test(pg.foodType) ? "Veg-only kitchen — not for non-veg-first customers" : null,
    (pg.prices.min || 0) > 16000 ? "Premium pricing — not for sub-₹16k budgets" : null,
    offices[0] && offices[0].km > 4 ? `Office commute is long (${offices[0].km} km to ${offices[0].name})` : null,
    pg.noise === "High" ? "Noisy micro-location" : null,
  ].filter(Boolean).slice(0, 4) as string[];

  const notFor = [
    (pg.prices.min || 0) > 12000 ? `Customers below ₹${(pg.prices.min || 0).toLocaleString("en-IN")}` : null,
    /^veg$/i.test(pg.foodType) ? "Customers who need non-veg meals in-house" : null,
    !pg.prices.single ? "Customers who require a private room" : null,
    /3|6|11/.test(pg.minStay) ? `Customers wanting a stay shorter than ${pg.minStay}` : null,
  ].filter(Boolean) as string[];

  return {
    pid,
    legacyId: pg.id,
    displayName: pg.name,
    actualName: pg.actualName || pg.name,
    group: pg.groupName && pg.groupName !== "NA" ? pg.groupName : "Gharpayy",
    zone,
    zoneCode,
    subArea,
    microLocation: pg.landmarksInline?.[0] ? `Near ${pg.landmarksInline[0]}` : subArea,
    address: [pg.locality, pg.area].filter(Boolean).join(", "),
    mapsLink: pg.mapsLink,
    lat: pg.lat ?? null,
    lng: pg.lng ?? null,
    gender: pg.gender,
    tier: pg.tier,
    propertyType: "Co-living / PG",
    status: availableBeds === 0 ? "Sold Out" : "Active",
    priority,
    onboardedOn: dayFromNow(-(60 + Math.floor(r() * 400))),
    lastVerifiedDays: Math.floor(r() * 20),
    floorsCount: floors.length,
    roomsCount: rooms.length,
    bedsCount: beds.length,
    availableBeds,
    floors,
    landmarks: lm,
    offices,
    colleges,
    radius: radiusBuckets(lm),
    personas: scorePersonas(pg, colleges, offices),
    notFor,
    why,
    whyNot,
    alternatives,
    amenities,
    food: { type: pg.foodType || "Not captured", meals: pg.mealsIncluded || "Not captured", notes: pg.vibe || "" },
    rules,
    commercials,
    people,
    documents,
    media,
    faq,
    experience,
    internalNotes: pickN(r, INTERNAL_POOL, 3).concat(pg.lows ? [`Internal price floor note: ${pg.lows}`] : []),
    freshness,
    completeness,
    completenessPct,
    readiness,
    gates,
    ownersOf: [
      { role: "Property Information Owner", who: "Inventory Captain" },
      { role: "Inventory Owner", who: pg.manager.name || "Property Manager" },
      { role: "Media Owner", who: "Capture Operator" },
      { role: "Zone Owner", who: `${zone} Zone Owner` },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

let _cache: Property360[] | null = null;

export function allProperties360(): Property360[] {
  if (_cache) return _cache;
  const counters: Record<string, number> = {};
  _cache = PGS.map((pg) => {
    const zoneCode = ZONE_CODES[pg.area] ?? (pg.area || "GEN").slice(0, 3).toUpperCase();
    const sub = subAreaCode((pg.locality || pg.area || "").split(",")[0].trim());
    const key = `${zoneCode}-${sub}`;
    counters[key] = (counters[key] ?? 0) + 1;
    return buildOne(pg, counters[key], PGS);
  });
  return _cache;
}

export function getProperty360(idOrPid: string): Property360 | undefined {
  return allProperties360().find((p) => p.pid === idOrPid || p.legacyId === idOrPid);
}

export const READINESS_LABEL: Record<Readiness, string> = {
  P0: "Created",
  P1: "Sellable",
  P2: "Customer Ready",
  P3: "Intelligence Ready",
  P4: "Owner Grade",
};

/* Human-thought search: "Female 17k near Christ", "within 2 km Ecoworld" */
export function smartSearch(q: string, list: Property360[]): Property360[] {
  const query = q.trim().toLowerCase();
  if (!query) return list;

  const budget = (() => {
    const m = query.match(/(\d{1,3})\s*k\b/) || query.match(/(?:under|below|upto|up to)\s*₹?\s*(\d{4,6})/);
    if (!m) return null;
    const n = Number(m[1]);
    return n < 1000 ? n * 1000 : n;
  })();
  const radiusKm = (() => {
    const m = query.match(/within\s*(\d+(?:\.\d+)?)\s*km/);
    return m ? Number(m[1]) : null;
  })();
  const wantsGirls = /\b(female|girl|girls|women|ladies)\b/.test(query);
  const wantsBoys = /\b(male|boy|boys|men|gents)\b/.test(query);
  const wantsFood = /\bfood|meal|mess\b/.test(query);
  const wantsPrivate = /\bprivate|single\b/.test(query);
  const wantsBalcony = /\bbalcony\b/.test(query);
  const wantsImmediate = /\bimmediate|today|now|urgent\b/.test(query);

  const stop = new Set(["near", "within", "km", "under", "below", "upto", "with", "room", "food", "private", "single", "balcony", "immediate", "vacancy", "boys", "girls", "female", "male", "in", "for", "the", "a"]);
  const tokens = query.replace(/[₹,]/g, " ").split(/\s+/).filter((t) => t.length > 2 && !stop.has(t) && !/^\d+k?$/.test(t));

  const scored = list.map((p) => {
    let score = 0;
    if (wantsGirls) score += /girl/i.test(p.gender) ? 4 : -6;
    if (wantsBoys) score += /boy/i.test(p.gender) ? 4 : -6;
    const entry = Math.min(...p.floors.flatMap((f) => f.rooms.map((rm) => rm.currentRent)).concat([Infinity]));
    if (budget) score += entry <= budget ? 4 : entry <= budget * 1.1 ? 1 : -5;
    if (wantsFood) score += /meal|veg/i.test(`${p.food.meals}${p.food.type}`) ? 3 : -2;
    if (wantsPrivate) score += p.floors.some((f) => f.rooms.some((rm) => rm.type === "Single")) ? 3 : -4;
    if (wantsBalcony) score += p.floors.some((f) => f.rooms.some((rm) => rm.balcony)) ? 2 : -2;
    if (wantsImmediate) score += p.availableBeds > 0 ? 3 : -5;

    let matchedPlace = false;
    for (const t of tokens) {
      const hay = `${p.displayName} ${p.actualName} ${p.zone} ${p.subArea} ${p.microLocation}`.toLowerCase();
      if (hay.includes(t)) { score += 3; matchedPlace = true; }
      const near = p.landmarks.find((l) => l.name.toLowerCase().includes(t));
      if (near) {
        matchedPlace = true;
        score += radiusKm ? (near.km <= radiusKm ? 6 : -4) : near.km < 1 ? 6 : near.km < 2.5 ? 4 : near.km < 5 ? 2 : 0;
      }
    }
    if (tokens.length && !matchedPlace) score -= 2;
    return { p, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.p);
}
