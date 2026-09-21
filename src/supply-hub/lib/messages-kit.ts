// Copy-paste message kit: verbatim sheet messages first, generated fallback second.
import type { PG } from "../data/types";
import { RAW_MESSAGES, type RawMessages } from "../data/messages-raw";

export type MsgKind = "location" | "pricing" | "amenities" | "food";

export interface KitMessage {
  kind: MsgKind;
  label: string;
  text: string;
  verbatim: boolean;
}

function key(pg: { name: string }) {
  return pg.name.trim().toUpperCase();
}

export function rawFor(pg: { name: string }): RawMessages {
  return RAW_MESSAGES[key(pg)] ?? {};
}

function fallbackLocation(pg: PG) {
  return [
    `📍GHARPAYY ${pg.name}`,
    "",
    "🚀 Attention: Pre-Booking Required! Enjoy a seamless experience upon arrival!",
    "",
    pg.mapsLink ? `🎯DESTINATION [ ${pg.mapsLink} ]` : "",
    pg.locality ? `Landmark: ${pg.locality}` : "",
    "",
    "Secure your spot before you regret it! See you soon in Bangalore!🏃‍♂️💨",
  ]
    .filter(Boolean)
    .join("\n");
}

function fallbackPricing(pg: PG) {
  const lines: string[] = [`⚡️ Welcome to Gharpayy ${pg.name} ⚡️`, ""];
  const rows: Array<[string, number]> = [
    ["💛Triple Sharing", pg.prices.triple],
    ["❤️Dual Sharing", pg.prices.double],
    ["💙Single Sharing", pg.prices.single],
  ];
  for (const [label, v] of rows) if (v > 0) lines.push(`${label} - *₹${v.toLocaleString("en-IN")}/month*`);
  if (pg.utilities) lines.push("", pg.utilities);
  if (pg.deposit) lines.push(`Deposit: ${pg.deposit}`);
  lines.push("", "💥 Lock your room now — rooms move fast!🔥");
  return lines.join("\n");
}

function fallbackAmenities(pg: PG) {
  const lines = [`🏠 ${pg.name} — what you get`, ""];
  if (pg.rooms) lines.push(`Rooms: ${pg.rooms}`);
  if (pg.furnishing) lines.push(`Furnishing: ${pg.furnishing}`);
  if (pg.amenities.length) lines.push("", "✨ Amenities:", ...pg.amenities.map((a) => `• ${a}`));
  if (pg.safety.length) lines.push("", "🛡 Safety:", ...pg.safety.map((a) => `• ${a}`));
  if (pg.rules) lines.push("", `House rules: ${pg.rules}`);
  return lines.join("\n");
}

function fallbackFood(pg: PG) {
  const lines = [`🍽 Food at ${pg.name}`, ""];
  if (pg.foodType) lines.push(`Type: ${pg.foodType}`);
  if (pg.mealsIncluded) lines.push(`Meals: ${pg.mealsIncluded}`);
  return lines.join("\n");
}

export function messageKit(pg: PG): KitMessage[] {
  const raw = rawFor(pg);
  const pick = (kind: MsgKind, label: string, fallback: string): KitMessage => {
    const v = (raw[kind] ?? "").trim() || (kind === "location" ? (pg.location_card ?? "").trim() : "");
    return { kind, label, text: v || fallback, verbatim: Boolean(v) };
  };
  return [
    pick("location", "Location message", fallbackLocation(pg)),
    pick("pricing", "Pricing message", fallbackPricing(pg)),
    pick("amenities", "Amenities message", fallbackAmenities(pg)),
    pick("food", "Food message", fallbackFood(pg)),
  ];
}
