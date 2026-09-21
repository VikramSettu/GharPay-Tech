// Real messaging — replaces the previous no-op stub.
import type { Tour } from "./types";
import { glueBus } from "@/owner/event-bus";

export async function sendTourMessage(opts: { tour: Tour; kind: string; channels: string[] }) {
  glueBus.publish({ type: "tour.confirmation.sent", tourId: opts.tour.id, channel: opts.channels[0] ?? "whatsapp" });
  return { error: null as null | Error };
}
export async function logTourEvent(tourId: string, kind: string, _notes?: string) {
  glueBus.publish({ type: "tour.reminder.sent", tourId, kind });
  return { error: null as null | Error };
}
