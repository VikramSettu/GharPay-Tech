// Turns an onboarding draft into a canonical Property360 passport, and scores
// how complete the collected information is while it is still being filled.

import {
  subAreaCode, zoneCodeFor,
  type AccessLevel, type Bed, type CompletenessRow, type Floor, type FloorCell,
  type FreshnessItem, type LandmarkX, type Property360, type Readiness, type Room, type RoomStatus,
} from "../model";
import {
  AMENITY_GROUPS, EXPERIENCE_METRICS, MEDIA_GROUPS, PERSONA_SEEDS,
  type DraftFloor, type DraftRoom, type OnboardingDraft, type OnboardingMode,
} from "./types";

/* ------------------------------------------------------------------ */
/* Factories                                                           */
/* ------------------------------------------------------------------ */

export function emptyRoom(floorNo: number, index: number): DraftRoom {
  return {
    number: `${floorNo}${String(index + 1).padStart(2, "0")}`,
    type: "Double",
    ac: false,
    bathroom: "Attached",
    balcony: false,
    windowDirection: "East",
    sizeSqft: 120,
    standardRent: 12000,
    currentRent: 12000,
    floorRent: 11000,
    deposit: "One month rent",
    beds: [emptyBed(0, 12000), emptyBed(1, 12000)],
    why: [],
    whyNot: [],
    bestFor: "",
    mediaCount: 0,
    hasVideo: false,
  };
}

export function emptyBed(index: number, price: number) {
  const positions = ["Window side", "Cupboard side", "Balcony side", "Door side"];
  return {
    label: String.fromCharCode(65 + index),
    position: positions[index % positions.length],
    price,
    status: "available" as const,
  };
}

export function emptyFloor(no: number): DraftFloor {
  return {
    no,
    name: no === 0 ? "Ground Floor" : `Floor ${no}`,
    usp: [],
    weakness: [],
    rooms: [emptyRoom(no, 0)],
    hasMap: false,
  };
}

export function newDraft(mode: OnboardingMode, filledBy = ""): OnboardingDraft {
  const now = new Date().toISOString();
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
    mode,
    status: "draft",
    filledBy,
    identity: {
      displayName: "",
      actualName: "",
      group: "Gharpayy",
      gender: "Co-living (Boys & Girls)",
      tier: "Mid",
      propertyType: "Co-living / PG",
      status: "Active",
      priority: "Core",
      onboardedOn: now.slice(0, 10),
    },
    location: {
      zone: "",
      subArea: "",
      microLocation: "",
      address: "",
      mapsLink: "",
      lat: "",
      lng: "",
      landmarks: [],
    },
    floors: [emptyFloor(0)],
    amenities: AMENITY_GROUPS.map((group) => ({ group, items: "" })),
    food: { type: "", meals: "", notes: "" },
    rules: [
      { label: "Entry timing", value: "" },
      { label: "Minimum stay", value: "" },
      { label: "Deposit", value: "" },
      { label: "Utilities", value: "" },
      { label: "Housekeeping", value: "" },
      { label: "Noise level", value: "" },
      { label: "Visitors", value: "" },
      { label: "Cooking / pets", value: "" },
    ],
    commercials: [
      { label: "Listed rent (entry)", value: "", access: "customer_safe" },
      { label: "Recommended quote", value: "", access: "internal_team" },
      { label: "Lowest approved rent", value: "", access: "role_restricted" },
      { label: "Negotiation room", value: "", access: "role_restricted" },
      { label: "Token / booking amount", value: "", access: "internal_team" },
      { label: "Lock-in / notice", value: "", access: "internal_team" },
      { label: "Owner flexibility", value: "", access: "zone_owner" },
      { label: "Commission / payout", value: "", access: "confidential" },
    ],
    people: [
      { role: "Property Manager", name: "", phone: "", hours: "9am – 9pm", access: "internal_team" },
      { role: "Backup Manager", name: "", phone: "", hours: "9am – 9pm", access: "internal_team" },
      { role: "Owner", name: "", phone: "", hours: "By escalation only", access: "zone_owner" },
      { role: "Food POC", name: "", phone: "", hours: "7am – 10pm", access: "internal_team" },
      { role: "Maintenance POC", name: "", phone: "", hours: "10am – 7pm", access: "internal_team" },
    ],
    media: MEDIA_GROUPS.map((group) => ({ group, count: 0, hasVideo: false })),
    documents: [
      { name: "Property onboarding form", kind: "Operational", access: "internal_team", provided: false },
      { name: "Price sheet", kind: "Operational", access: "internal_team", provided: false },
      { name: "Food menu", kind: "Operational", access: "customer_safe", provided: false },
      { name: "Property rules", kind: "Operational", access: "customer_safe", provided: false },
      { name: "Check-in SOP", kind: "Operational", access: "internal_team", provided: false },
      { name: "Owner agreement", kind: "Commercial", access: "confidential", provided: false },
      { name: "Approved commercials", kind: "Commercial", access: "zone_owner", provided: false },
      { name: "Fire & compliance papers", kind: "Compliance", access: "admin", provided: false },
    ],
    personas: PERSONA_SEEDS.map((persona) => ({ persona, score: 3, why: "" })),
    why: [],
    whyNot: [],
    notFor: [],
    faq: [
      { q: "Is food included?", a: "" },
      { q: "Is electricity included?", a: "" },
      { q: "What is the deposit?", a: "" },
      { q: "What is the minimum stay?", a: "" },
      { q: "Is laundry available?", a: "" },
      { q: "Are private rooms available?", a: "" },
    ],
    internalNotes: [],
    experience: EXPERIENCE_METRICS.map((metric) => ({ metric, score: 4 })),
  };
}

/* ------------------------------------------------------------------ */
/* Completeness                                                        */
/* ------------------------------------------------------------------ */

const pct = (done: number, total: number) => (total <= 0 ? 0 : Math.round((done / total) * 100));
const filled = (s: string | undefined) => !!s && s.trim().length > 0;

export function draftRooms(d: OnboardingDraft): DraftRoom[] {
  return d.floors.flatMap((f) => f.rooms);
}

export function draftCompleteness(d: OnboardingDraft): CompletenessRow[] {
  const rooms = draftRooms(d);
  const beds = rooms.flatMap((r) => r.beds);
  const id = d.identity;
  const loc = d.location;

  const identityFields = [id.displayName, id.actualName, id.group, id.gender, id.tier, id.propertyType];
  const locationFields = [loc.zone, loc.subArea, loc.microLocation, loc.address, loc.mapsLink, loc.lat, loc.lng];

  return [
    { section: "Identity", pct: pct(identityFields.filter(filled).length, identityFields.length) },
    { section: "Location", pct: pct(locationFields.filter(filled).length, locationFields.length) },
    { section: "Landmarks", pct: Math.min(100, loc.landmarks.length * 20) },
    { section: "Offices mapped", pct: Math.min(100, loc.landmarks.filter((l) => /office|it park/i.test(l.category)).length * 34) },
    { section: "Commercials", pct: pct(d.commercials.filter((c) => filled(c.value)).length, d.commercials.length) },
    { section: "Amenities", pct: pct(d.amenities.filter((a) => filled(a.items)).length, d.amenities.length) },
    { section: "Floor map", pct: pct(d.floors.filter((f) => f.hasMap).length, d.floors.length) },
    { section: "Room profiles", pct: pct(rooms.filter((r) => r.why.length >= 1 && filled(r.bestFor)).length, rooms.length) },
    { section: "Media", pct: Math.min(100, pct(d.media.reduce((a, m) => a + m.count, 0), Math.max(1, rooms.length * 3))) },
    { section: "Personas", pct: pct(d.personas.filter((p) => filled(p.why)).length, d.personas.length) },
    { section: "Manager", pct: pct(d.people.filter((p) => filled(p.name) && filled(p.phone)).length, d.people.length) },
    { section: "Live inventory", pct: beds.length ? 100 : 0 },
    { section: "Rules & terms", pct: pct(d.rules.filter((r) => filled(r.value)).length, d.rules.length) },
    { section: "FAQ", pct: pct(d.faq.filter((f) => filled(f.a)).length, d.faq.length) },
    { section: "Documents", pct: pct(d.documents.filter((x) => x.provided).length, d.documents.length) },
  ];
}

export function draftCompletenessPct(d: OnboardingDraft): number {
  const rows = draftCompleteness(d);
  return Math.round(rows.reduce((a, c) => a + c.pct, 0) / rows.length);
}

/* ------------------------------------------------------------------ */
/* Per-step progress — powers the wizard sidebar                       */
/* ------------------------------------------------------------------ */

export interface StepProgress {
  pct: number;
  missing: string[];
  /** Blocks publishing until resolved. */
  blocking: boolean;
}

function score(checks: { ok: boolean; label: string; required?: boolean }[]): StepProgress {
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  return {
    pct: pct(checks.filter((c) => c.ok).length, checks.length),
    missing,
    blocking: checks.some((c) => !c.ok && c.required),
  };
}

export function draftStepProgress(d: OnboardingDraft): Record<string, StepProgress> {
  const rooms = draftRooms(d);
  const id = d.identity;
  const loc = d.location;

  return {
    identity: score([
      { ok: filled(id.displayName), label: "Display name", required: true },
      { ok: filled(id.actualName), label: "Actual / legal name" },
      { ok: filled(id.group), label: "Group" },
      { ok: filled(id.gender), label: "Gender policy" },
      { ok: filled(id.tier), label: "Tier" },
      { ok: filled(id.propertyType), label: "Property type" },
    ]),
    location: score([
      { ok: filled(loc.zone), label: "Zone", required: true },
      { ok: filled(loc.subArea), label: "Sub-area", required: true },
      { ok: filled(loc.address), label: "Full address", required: true },
      { ok: filled(loc.microLocation), label: "Micro-location" },
      { ok: filled(loc.mapsLink), label: "Maps link" },
      { ok: filled(loc.lat) && filled(loc.lng), label: "Lat / long pin" },
      { ok: loc.landmarks.length >= 3, label: "At least 3 landmarks" },
      { ok: loc.landmarks.some((l) => /office|it park/i.test(l.category)), label: "One office / IT park mapped" },
      { ok: loc.landmarks.some((l) => /college|university/i.test(l.category)), label: "One college mapped" },
    ]),
    building: score([
      { ok: d.floors.length > 0, label: "At least one floor", required: true },
      { ok: d.floors.every((f) => filled(f.name)), label: "Every floor named" },
      { ok: d.floors.some((f) => f.usp.length > 0), label: "Floor USPs" },
      { ok: d.floors.some((f) => f.hasMap), label: "A floor map" },
    ]),
    rooms: score([
      { ok: rooms.length > 0, label: "At least one room", required: true },
      { ok: rooms.every((r) => r.beds.length > 0), label: "Every room has beds", required: true },
      { ok: rooms.every((r) => r.currentRent > 0), label: "Every room priced" },
      { ok: rooms.every((r) => filled(r.bestFor)), label: "Best-for line per room" },
      { ok: rooms.some((r) => r.why.length > 0), label: "Room USPs" },
      { ok: rooms.some((r) => r.whyNot.length > 0), label: "Honest room trade-offs" },
    ]),
    amenities: score([
      { ok: d.amenities.filter((a) => filled(a.items)).length >= 3, label: "At least 3 amenity groups" },
      { ok: filled(d.food.type), label: "Food type" },
      { ok: filled(d.food.meals), label: "Meal timings" },
    ]),
    rules: score(d.rules.map((r) => ({ ok: filled(r.value), label: r.label }))),
    commercials: score(d.commercials.map((c) => ({ ok: filled(c.value), label: c.label }))),
    people: score([
      { ok: d.people.some((p) => filled(p.name) && filled(p.phone)), label: "One reachable contact", required: true },
      { ok: d.people.filter((p) => filled(p.phone)).length >= 2, label: "A backup contact" },
      { ok: d.people.some((p) => /owner/i.test(p.role) && filled(p.phone)), label: "Owner escalation number" },
    ]),
    media: score([
      { ok: d.media.reduce((a, m) => a + m.count, 0) >= Math.max(6, rooms.length * 3), label: "3 photos per room" },
      { ok: d.media.some((m) => m.hasVideo), label: "At least one video" },
      { ok: d.documents.filter((x) => x.provided).length >= 3, label: "3 documents attached" },
    ]),
    fit: score([
      { ok: d.personas.filter((p) => filled(p.why)).length >= 3, label: "3 personas explained" },
      { ok: d.why.length > 0, label: "Why this property" },
      { ok: d.whyNot.length > 0, label: "Why not (honesty)" },
      { ok: d.notFor.length > 0, label: "Who it is not for" },
    ]),
    faq: score([
      { ok: d.faq.filter((f) => filled(f.a)).length >= 4, label: "4 FAQs answered" },
      { ok: d.internalNotes.length > 0, label: "Internal note for the team" },
    ]),
    review: score([{ ok: draftBlockers(d).length === 0, label: "All publish blockers cleared", required: true }]),
  };
}

export function readinessFor(completenessPct: number): Readiness {
  if (completenessPct >= 92) return "P4";
  if (completenessPct >= 82) return "P3";
  if (completenessPct >= 70) return "P2";
  if (completenessPct >= 55) return "P1";
  return "P0";
}

export function draftGates(d: OnboardingDraft) {
  const rooms = draftRooms(d);
  const beds = rooms.flatMap((r) => r.beds);
  const c = draftCompleteness(d);
  const at = (s: string) => c.find((x) => x.section === s)?.pct ?? 0;
  return [
    { label: "Identity complete", done: at("Identity") === 100 },
    { label: "Location verified", done: filled(d.location.lat) && filled(d.location.lng) },
    { label: "Amenities verified", done: at("Amenities") >= 80 },
    { label: "Commercials verified", done: at("Commercials") >= 75 },
    { label: "Building / floors created", done: d.floors.length > 0 },
    { label: "Every sellable room created", done: rooms.length > 0 },
    { label: "Room USPs added", done: at("Room profiles") >= 60 },
    { label: "Photos uploaded", done: at("Media") >= 50 },
    { label: "Videos uploaded", done: d.media.some((m) => m.hasVideo) },
    { label: "Manager / owner configured", done: at("Manager") >= 60 },
    { label: "Landmarks & offices mapped", done: d.location.landmarks.length >= 5 },
    { label: "Personas mapped", done: at("Personas") >= 60 },
    { label: "Rules & stay terms captured", done: at("Rules & terms") >= 75 },
    { label: "Live inventory entered", done: beds.length > 0 },
    { label: "FAQ answered", done: at("FAQ") >= 60 },
  ];
}

/** Blocking issues that stop a draft from being published. */
export function draftBlockers(d: OnboardingDraft): string[] {
  const out: string[] = [];
  if (!filled(d.identity.displayName)) out.push("Property name is required");
  if (!filled(d.location.zone)) out.push("Zone is required");
  if (!filled(d.location.subArea)) out.push("Sub-area is required");
  if (!filled(d.location.address)) out.push("Address is required");
  if (!d.floors.length) out.push("Add at least one floor");
  const rooms = draftRooms(d);
  if (!rooms.length) out.push("Add at least one room");
  if (rooms.some((r) => !r.beds.length)) out.push("Every room needs at least one bed");
  if (!d.people.some((p) => filled(p.name) && filled(p.phone))) out.push("At least one contact person with a phone number is required");
  return out;
}

/* ------------------------------------------------------------------ */
/* Draft → Property360                                                 */
/* ------------------------------------------------------------------ */

function toRoom(dr: DraftRoom, floorNo: number, fid: string): Room {
  const beds: Bed[] = dr.beds.map((b, i) => ({
    id: `${fid}-R${dr.number}-${b.label || String.fromCharCode(65 + i)}`,
    label: b.label || String.fromCharCode(65 + i),
    position: b.position,
    price: b.price || dr.currentRent,
    status: b.status,
    availableFrom: b.status === "vacating" ? b.availableFrom : undefined,
  }));
  const anyAvail = beds.some((b) => b.status === "available");
  const status: RoomStatus = beds.some((b) => b.status === "maintenance")
    ? "maintenance"
    : anyAvail
      ? "available"
      : beds.some((b) => b.status === "vacating")
        ? "vacating"
        : beds.some((b) => b.status === "held")
          ? "held"
          : "occupied";
  return {
    id: `${fid}-R${dr.number}`,
    number: dr.number,
    floorNo,
    type: dr.type,
    ac: dr.ac,
    bathroom: dr.bathroom,
    balcony: dr.balcony,
    windowDirection: dr.windowDirection,
    sizeSqft: dr.sizeSqft,
    standardRent: dr.standardRent,
    currentRent: dr.currentRent || dr.standardRent,
    floorRent: dr.floorRent || Math.round(dr.standardRent * 0.9),
    deposit: dr.deposit,
    beds,
    why: dr.why,
    whyNot: dr.whyNot,
    bestFor: dr.bestFor || "Not captured yet",
    status,
    mediaCount: dr.mediaCount,
    hasVideo: dr.hasVideo,
  };
}

function toFloor(df: DraftFloor, pid: string): Floor {
  const fid = `${pid}-F${String(df.no).padStart(2, "0")}`;
  const rooms = df.rooms.map((r) => toRoom(r, df.no, fid));
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
    no: df.no,
    name: df.name || (df.no === 0 ? "Ground Floor" : `Floor ${df.no}`),
    usp: df.usp,
    weakness: df.weakness,
    rooms,
    grid,
    mapCoverage: df.hasMap ? 1 : 0.3,
  };
}

export function pidForDraft(d: OnboardingDraft, seq: number): string {
  const zc = zoneCodeFor(d.location.zone);
  const sc = subAreaCode(d.location.subArea || d.location.zone);
  return `${zc}-${sc}-O${String(seq).padStart(2, "0")}`;
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

export function draftToProperty360(d: OnboardingDraft, seq = 1): Property360 {
  const pid = d.publishedPid || pidForDraft(d, seq);
  const floors = d.floors.map((f) => toFloor(f, pid));
  const rooms = floors.flatMap((f) => f.rooms);
  const beds = rooms.flatMap((r) => r.beds);
  const availableBeds = beds.filter((b) => b.status === "available").length;

  const landmarks: LandmarkX[] = d.location.landmarks.map((l) => ({
    name: l.name,
    category: l.category,
    km: l.km,
    walkMin: l.walkMin,
    driveMin: Math.max(3, Math.round(l.km * 4 + 3)),
    matters:
      /college|university/i.test(l.category) ? "Primary student demand generator"
      : /it park|office/i.test(l.category) ? "Working-professional demand"
      : /metro|transport/i.test(l.category) ? "Commute anchor"
      : /mall|market/i.test(l.category) ? "Lifestyle convenience"
      : /hospital/i.test(l.category) ? "Safety / parent comfort"
      : "Orientation landmark",
  }));

  const completeness = draftCompleteness(d);
  const completenessPct = draftCompletenessPct(d);
  const hoursSince = Math.max(0, Math.round((Date.now() - new Date(d.updatedAt).getTime()) / 3600000));
  const verifier = d.filledBy || (d.mode === "owner" ? "Property owner" : "Gharpayy team");

  const freshness: FreshnessItem[] = [
    { field: "Live inventory", verifiedBy: verifier, verifiedAgoHours: hoursSince, recheckHours: 24 },
    { field: "Pricing", verifiedBy: verifier, verifiedAgoHours: hoursSince, recheckHours: 168 },
    { field: "Food", verifiedBy: verifier, verifiedAgoHours: hoursSince, recheckHours: 720 },
    { field: "Amenities", verifiedBy: verifier, verifiedAgoHours: hoursSince, recheckHours: 720 },
    { field: "Manager details", verifiedBy: verifier, verifiedAgoHours: hoursSince, recheckHours: 2160 },
    { field: "Room media", verifiedBy: verifier, verifiedAgoHours: hoursSince, recheckHours: 2160 },
    { field: "Location", verifiedBy: verifier, verifiedAgoHours: hoursSince, recheckHours: 8760 },
  ];

  const entryRent = Math.min(...rooms.map((r) => r.currentRent).concat([Infinity]));

  return {
    pid,
    legacyId: d.id,
    displayName: d.identity.displayName || "Unnamed property",
    actualName: d.identity.actualName || d.identity.displayName || "Unnamed property",
    group: d.identity.group || "Gharpayy",
    zone: d.location.zone || "Bengaluru",
    zoneCode: zoneCodeFor(d.location.zone),
    subArea: d.location.subArea || d.location.zone,
    microLocation: d.location.microLocation || d.location.subArea,
    address: d.location.address,
    mapsLink: d.location.mapsLink,
    lat: d.location.lat ? Number(d.location.lat) : null,
    lng: d.location.lng ? Number(d.location.lng) : null,
    gender: d.identity.gender,
    tier: d.identity.tier,
    propertyType: d.identity.propertyType,
    status: availableBeds === 0 ? "Sold Out" : d.identity.status,
    priority: d.identity.priority,
    onboardedOn: d.identity.onboardedOn,
    lastVerifiedDays: Math.floor(hoursSince / 24),

    floorsCount: floors.length,
    roomsCount: rooms.length,
    bedsCount: beds.length,
    availableBeds,

    floors,
    landmarks,
    offices: landmarks.filter((l) => /it park|office/i.test(l.category)),
    colleges: landmarks.filter((l) => /college|university/i.test(l.category)),
    radius: radiusBuckets(landmarks),

    personas: d.personas.map((p) => ({ persona: p.persona, score: p.score, why: p.why || "Not captured yet" })),
    notFor: d.notFor,
    why: d.why.length ? d.why : [entryRent < Infinity ? `Entry price ₹${entryRent.toLocaleString("en-IN")}` : "Pricing pending"],
    whyNot: d.whyNot,
    alternatives: [],

    amenities: d.amenities
      .map((a) => ({ group: a.group, items: a.items.split(",").map((x) => x.trim()).filter(Boolean) }))
      .filter((a) => a.items.length),
    food: { type: d.food.type || "Not captured", meals: d.food.meals || "Not captured", notes: d.food.notes },
    rules: d.rules.map((r) => ({ label: r.label, value: r.value || "Not confirmed" })),
    commercials: d.commercials.map((c) => ({ label: c.label, value: c.value || "—", access: c.access as AccessLevel })),
    people: d.people
      .filter((p) => filled(p.name) || filled(p.phone))
      .map((p) => ({ role: p.role, name: p.name || "Pending", phone: p.phone || "—", hours: p.hours, access: p.access })),
    documents: d.documents.map((x) => ({ name: x.name, kind: x.kind, access: x.access })),
    media: d.media,
    faq: d.faq.filter((f) => filled(f.a)),
    experience: d.experience,
    internalNotes: d.internalNotes,

    freshness,
    completeness,
    completenessPct,
    readiness: readinessFor(completenessPct),
    gates: draftGates(d),
    ownersOf: [
      { role: "Property Information Owner", who: d.mode === "owner" ? "Property owner (self-onboarded)" : verifier || "Inventory Captain" },
      { role: "Inventory Owner", who: d.people.find((p) => /manager/i.test(p.role))?.name || "Property Manager" },
      { role: "Media Owner", who: "Capture Operator" },
      { role: "Zone Owner", who: `${d.location.zone || "Zone"} Zone Owner` },
    ],
  };
}
