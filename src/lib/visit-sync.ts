/**
 * Visit & Room Sync messages.
 *
 * Every tour movement has three messages that must go out or the loop breaks:
 *  1. customer confirmation (what/where/when)
 *  2. PG owner group pre-visit readiness check
 *  3. PG owner group visit-done update
 * Plus the pre-booking room availability confirmation, which is the gate
 * before any token is collected.
 */

export interface VisitMsgInput {
  leadName: string;
  propertyName: string;
  area?: string;
  whenLabel: string;
  mode?: "virtual" | "physical";
  sharing?: string;
  rent?: string | number;
  moveInDate?: string;
  tcmName?: string;
}

const inr = (v?: string | number) =>
  v === undefined || v === "" ? "" : `₹${Number(v).toLocaleString("en-IN")}`;

export function customerVisitMessage(i: VisitMsgInput): string {
  const virtual = i.mode === "virtual";
  return [
    `Hi ${i.leadName || "there"}, your ${virtual ? "virtual tour" : "visit"} is confirmed 🎉`,
    ``,
    `🏠 ${i.propertyName}${i.area ? ` · ${i.area}` : ""}`,
    `🕑 ${i.whenLabel}`,
    i.sharing ? `🛏 ${i.sharing} sharing` : "",
    i.rent ? `💰 ${inr(i.rent)}/month` : "",
    ``,
    virtual
      ? `I'll call you on WhatsApp video at that time and walk you through the room, washroom, kitchen and common areas.`
      : `Please reach 5 mins early and ask for Gharpayy at the gate. I'll be on call if you need directions.`,
    `Reply "OK" to lock this slot — the room stays held for you till then.`,
    i.tcmName ? `\n— ${i.tcmName}, Gharpayy` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function ownerPreVisitMessage(i: VisitMsgInput): string {
  return [
    `*Visit scheduled — ${i.propertyName}*`,
    `👤 Guest: ${i.leadName || "Gharpayy guest"}`,
    `🕑 Visit time: ${i.whenLabel}`,
    i.sharing ? `🛏 Looking for: ${i.sharing} sharing` : "",
    i.moveInDate ? `📅 Planned move-in: ${i.moveInDate}` : "",
    ``,
    `Please confirm before the visit:`,
    `1) Is the room vacant and available at this time?`,
    `2) Is it cleaned, bedsheet changed, lights/fan working?`,
    `3) Will someone be present to open the room?`,
    ``,
    `Reply *READY* or tell us what's pending so we can reschedule instead of a bad visit.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function ownerVisitDoneMessage(
  i: VisitMsgInput & { outcome?: string; note?: string },
): string {
  return [
    `*Visit done — ${i.propertyName}*`,
    `👤 Guest: ${i.leadName || "Gharpayy guest"}`,
    `✅ Visit completed at ${i.whenLabel}`,
    i.outcome ? `📌 Guest feedback: ${i.outcome}` : "",
    i.note ? `🗒 ${i.note}` : "",
    ``,
    `Thanks for keeping the room ready. Please keep the room *unblocked for others till tomorrow* — we're following up on the decision and will confirm booking or release it.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function ownerRoomAvailabilityMessage(
  i: VisitMsgInput & { checkInDate?: string; token?: string | number },
): string {
  return [
    `*Pre-booking availability check — ${i.propertyName}*`,
    `👤 Guest: ${i.leadName || "Gharpayy guest"}`,
    i.sharing ? `🛏 Room: ${i.sharing} sharing` : "",
    i.checkInDate ? `📅 Check-in date: ${i.checkInDate}` : "",
    i.rent ? `💰 Agreed rent: ${inr(i.rent)}/month` : "",
    ``,
    `Please confirm this room is *available and blocked for this check-in date* so we can proceed with the pre-booking${
      i.token ? ` (token ${inr(i.token)})` : ""
    }.`,
    `Reply *AVAILABLE* to confirm, or share the earliest date the room frees up.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function customerPreBookingMessage(
  i: VisitMsgInput & { checkInDate?: string; token?: string | number },
): string {
  return [
    `Hi ${i.leadName || "there"}, good news — the room is confirmed available for you ✅`,
    ``,
    `🏠 ${i.propertyName}${i.area ? ` · ${i.area}` : ""}`,
    i.sharing ? `🛏 ${i.sharing} sharing` : "",
    i.rent ? `💰 ${inr(i.rent)}/month` : "",
    i.checkInDate ? `📅 Check-in: ${i.checkInDate}` : "",
    ``,
    i.token
      ? `To pre-book and hold this room in your name, the token is ${inr(i.token)}. Once it's paid, the room is off the market for you.`
      : `Share a yes and I'll send the token link to hold this room in your name.`,
  ]
    .filter(Boolean)
    .join("\n");
}
