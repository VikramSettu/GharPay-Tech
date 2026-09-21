import type { Database } from "@/integrations/supabase/types";

export type MoveInBucket = Database["public"]["Enums"]["move_in_bucket"];
export type LeadPriority = Database["public"]["Enums"]["lead_priority"];
export type ScenarioCode = Database["public"]["Enums"]["scenario_code"];

export const MOVE_IN_LABELS: Record<MoveInBucket, string> = {
  today: "Today",
  within_3d: "Within 3 days",
  within_7d: "Within 7 days",
  within_15d: "Within 15 days",
  within_30d: "Within 30 days",
  more_30d: "More than 30 days",
  not_confirmed: "Not confirmed",
};

export const MOVE_IN_SCORE: Record<MoveInBucket, number> = {
  today: 60,
  within_3d: 55,
  within_7d: 45,
  within_15d: 35,
  within_30d: 20,
  more_30d: 10,
  not_confirmed: 5,
};

// Location scoring uses inventory_strength (1..5) mapped to buckets
// 5 => strong (40), 4 => limited (35), 3 => nearby (25), 2 => weak (15), 1/0 => unsupported (5)
export function locationScoreFor(inventoryStrength: number | null | undefined, isServiceable: boolean): number {
  if (!isServiceable) return 5;
  const s = inventoryStrength ?? 0;
  if (s >= 5) return 40;
  if (s === 4) return 35;
  if (s === 3) return 25;
  if (s === 2) return 15;
  return 5;
}

export function priorityFor(score: number): LeadPriority {
  if (score >= 85) return "super_hot";
  if (score >= 70) return "hot";
  if (score >= 50) return "active";
  if (score >= 30) return "future";
  return "nurture";
}

export const PRIORITY_LABELS: Record<LeadPriority, string> = {
  super_hot: "Super Hot",
  hot: "Hot",
  active: "Active",
  future: "Future",
  nurture: "Nurture",
};

export const PRIORITY_COLORS: Record<LeadPriority, string> = {
  super_hot: "bg-red-500 text-white",
  hot: "bg-orange-500 text-white",
  active: "bg-amber-500 text-black",
  future: "bg-sky-500 text-white",
  nurture: "bg-slate-500 text-white",
};

export const SLA_CONFIG: Record<LeadPriority, { accept: number; firstAction: number; reassign: number }> = {
  super_hot: { accept: 120, firstAction: 300, reassign: 420 },
  hot: { accept: 180, firstAction: 600, reassign: 900 },
  active: { accept: 300, firstAction: 900, reassign: 1200 },
  future: { accept: 900, firstAction: 28800, reassign: 32400 },
  nurture: { accept: 900, firstAction: 28800, reassign: 32400 },
};

export const CATEGORY_CAPS: Record<"A" | "B" | "C" | "D", number> = { A: 30, B: 25, C: 18, D: 0 };

export const SCENARIOS: { code: ScenarioCode; label: string; nextAction: { kind: string; dueInMin: number } }[] = [
  { code: "connected_qualified", label: "Connected & Qualified", nextAction: { kind: "Schedule tour", dueInMin: 60 } },
  { code: "connected_incomplete", label: "Connected — Info Incomplete", nextAction: { kind: "Follow-up call to complete profile", dueInMin: 120 } },
  { code: "callback_requested", label: "Callback Requested", nextAction: { kind: "Callback at requested time", dueInMin: 60 } },
  { code: "no_answer", label: "No Answer", nextAction: { kind: "WhatsApp + second call", dueInMin: 30 } },
  { code: "whatsapp_sent", label: "WhatsApp Sent", nextAction: { kind: "Reply follow-up", dueInMin: 60 } },
  { code: "wrong_number", label: "Wrong Number", nextAction: { kind: "Close & audit", dueInMin: 5 } },
  { code: "duplicate", label: "Duplicate Lead", nextAction: { kind: "Merge with existing lead", dueInMin: 5 } },
  { code: "location_changed", label: "Location Changed", nextAction: { kind: "Recalculate zone & reassign if needed", dueInMin: 15 } },
  { code: "date_changed", label: "Move-in Date Changed", nextAction: { kind: "Recalculate priority", dueInMin: 15 } },
  { code: "future_movein", label: "Future Move-In", nextAction: { kind: "Nurture reminder", dueInMin: 60 * 24 * 14 } },
  { code: "tour_ready", label: "Tour Ready", nextAction: { kind: "Assign TCM & schedule tour", dueInMin: 30 } },
  { code: "virtual_tour", label: "Virtual Tour Required", nextAction: { kind: "Send video/photos", dueInMin: 60 } },
  { code: "pre_booking", label: "Pre-Booking Opportunity", nextAction: { kind: "Send quotation", dueInMin: 30 } },
  { code: "not_serviceable", label: "Not Serviceable", nextAction: { kind: "Log reason & close", dueInMin: 5 } },
  { code: "not_interested", label: "Not Interested", nextAction: { kind: "Log reason & close", dueInMin: 5 } },
  { code: "invalid_spam", label: "Invalid / Spam", nextAction: { kind: "Mark spam & close", dueInMin: 5 } },
];