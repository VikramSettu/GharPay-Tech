// 90-day cadence template — used to generate the next-7-touches per lead.

import type { Touch, TouchChannel } from "./types";

interface CadenceStep {
  day: number;
  channel: TouchChannel;
  title: string;
  script: string;
  mode: "auto" | "assisted" | "manual";
}

// Ordered timeline; system picks the next N whose scheduledAt is future.
export const CADENCE_90D: CadenceStep[] = [
  { day: 0,  channel: "call",  title: "First contact call",          script: "Hi {{name}}, I'm {{tcm}} from Gharpayy. When are you planning to move?", mode: "manual" },
  { day: 0,  channel: "wa",    title: "Intro + shortlist",           script: "Sharing 3 options that match your ask — {{link1}} · {{link2}} · {{link3}}.", mode: "assisted" },
  { day: 1,  channel: "wa",    title: "Property walk-through video", script: "Full walk-through video of top pick — {{video}}.", mode: "auto" },
  { day: 2,  channel: "wa",    title: "Food + mess video",           script: "This week's mess menu + kitchen video: {{video}}.", mode: "auto" },
  { day: 3,  channel: "call",  title: "Tour scheduling call",        script: "Free tomorrow 5pm or Sat 11am for a quick tour?", mode: "manual" },
  { day: 4,  channel: "wa",    title: "Customer story",              script: "{{tenant}} moved in last month — hear their story: {{video}}.", mode: "auto" },
  { day: 6,  channel: "wa",    title: "Availability alert",          script: "Only {{n}} beds left in your top pick.", mode: "auto" },
  { day: 9,  channel: "wa",    title: "Price / offer reminder",      script: "Current offer ends {{date}} — deposit split EMI available.", mode: "auto" },
  { day: 13, channel: "call",  title: "Objection deep-call",         script: "Curious — what's holding you back? Happy to solve.", mode: "manual" },
  { day: 17, channel: "wa",    title: "Nearby office alert",         script: "Your office ({{office}}) is 2.4km — 12 min bike ride.", mode: "auto" },
  { day: 22, channel: "video", title: "Video-tour offer",            script: "Can't visit? Live video-tour at your slot — book here.", mode: "assisted" },
  { day: 30, channel: "wa",    title: "Revival ping",                script: "Circling back — anything changed? Options refreshed for you.", mode: "auto" },
  { day: 45, channel: "wa",    title: "Cold nurture 1",              script: "Rents softened this month — sharing 3 fresh matches.", mode: "auto" },
  { day: 60, channel: "wa",    title: "Cold nurture 2",              script: "New building near your area just launched — early-mover discount.", mode: "auto" },
  { day: 75, channel: "wa",    title: "Cold nurture 3",              script: "Festival season deposit split — worth a look?", mode: "auto" },
  { day: 90, channel: "call",  title: "Long-cycle revival call",     script: "Been a while — any plans for the next 30 days?", mode: "manual" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

export function generateCadence(leadId: string, startAt: number): Touch[] {
  const now = Date.now();
  return CADENCE_90D.map((s) => ({
    id: uid(),
    leadId,
    dayOffset: s.day,
    scheduledAt: startAt + s.day * 86400_000,
    channel: s.channel,
    title: s.title,
    script: s.script,
    status: startAt + s.day * 86400_000 <= now ? "sent" : "queued",
    mode: s.mode,
    actor: s.mode === "auto" ? "system" : "tcm",
    updatedAt: now,
  }) satisfies Touch);
}

export function next7Touches(all: Touch[], leadId: string, from: number): Touch[] {
  return all
    .filter((t) => t.leadId === leadId && t.status === "queued" && t.scheduledAt >= from)
    .sort((a, b) => a.scheduledAt - b.scheduledAt)
    .slice(0, 7);
}
