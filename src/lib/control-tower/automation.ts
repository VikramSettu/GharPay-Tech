// Control Tower Team — automation & intelligence helpers.
//
// Pure functions. No I/O, no side effects. Consumed by the CT page and
// the CT store to power auto-assign, rebalancing, chat AI scoring,
// gate auto-detection from lead activity, and lineup optimization.

import type { Lead } from "@/lib/types";
import type {
  CTMember,
  ChatReview,
  GateState,
  InventoryFocus,
  LineupPick,
  WorklistItem,
} from "./team";
import { newGates, suggestLineup as baseSuggestLineup } from "./team";

// ─────────────────────────────────────────────────────────────
// Auto-assign — smart worklist builder
// ─────────────────────────────────────────────────────────────

export interface AutoAssignPlan {
  today: Lead[];
  seven: Lead[];
  thirty: Lead[];
  reasons: string[];
}

export function planAutoAssign(
  member: CTMember,
  allLeads: Lead[],
  existingWorklist: WorklistItem[],
): AutoAssignPlan {
  const nowMs = Date.now();
  const alreadyAssigned = new Set(
    existingWorklist.filter((w) => w.ctMemberId === member.id && w.status !== "done").map((w) => w.leadId),
  );

  const enriched = allLeads
    .filter((l) => !alreadyAssigned.has(l.id))
    .map((l) => ({
      lead: l,
      ageDays: Math.max(0, Math.round((nowMs - +new Date(l.createdAt)) / 86400000)),
      intentScore: l.intent === "hot" ? 3 : l.intent === "warm" ? 2 : 1,
    }));

  const zonesLower = member.zonesCovered.map((z) => z.toLowerCase());
  const inZone = (l: Lead) =>
    !zonesLower.length ||
    zonesLower.some((z) => (l.preferredArea ?? "").toLowerCase().includes(z));

  // Priority sort: zone match > intent > freshness
  enriched.sort((a, b) => {
    const az = inZone(a.lead) ? 1 : 0;
    const bz = inZone(b.lead) ? 1 : 0;
    if (az !== bz) return bz - az;
    if (a.intentScore !== b.intentScore) return b.intentScore - a.intentScore;
    return a.ageDays - b.ageDays;
  });

  const today = enriched.filter((c) => c.ageDays === 0).slice(0, 5).map((c) => c.lead);
  const seven = enriched.filter((c) => c.ageDays > 0 && c.ageDays <= 7).slice(0, member.minOldLeadTouches).map((c) => c.lead);
  const remaining = Math.max(0, member.minLeadsPerDay - today.length - seven.length);
  const thirty = enriched.filter((c) => c.ageDays > 7 && c.ageDays <= 30).slice(0, remaining).map((c) => c.lead);

  const reasons: string[] = [];
  if (today.length < 5) reasons.push(`Only ${today.length} fresh leads matched — CT should probe inbound channels.`);
  if (seven.length < member.minOldLeadTouches) reasons.push(`Below floor of ${member.minOldLeadTouches} 7d touches; pull from other zones.`);
  if (thirty.length + seven.length + today.length < member.minLeadsPerDay) reasons.push(`Total below daily minimum — flag as low-inbound day.`);
  if (reasons.length === 0) reasons.push(`Full plate: ${today.length + seven.length + thirty.length} leads mixing today / 7d / 30d.`);

  return { today, seven, thirty, reasons };
}

// ─────────────────────────────────────────────────────────────
// Rebalancer — redistribute when a member goes offline or a zone spikes
// ─────────────────────────────────────────────────────────────

export interface RebalanceMove {
  itemId: string;
  fromMemberId: string;
  toMemberId: string;
  reason: string;
}

export function planRebalance(
  members: CTMember[],
  worklist: WorklistItem[],
): RebalanceMove[] {
  const moves: RebalanceMove[] = [];
  const availableMembers = members.filter((m) => m.present);
  if (availableMembers.length === 0) return moves;

  // Pull work off offline members
  const offline = members.filter((m) => !m.present);
  for (const m of offline) {
    const items = worklist.filter((w) => w.ctMemberId === m.id && w.status === "pending");
    if (!items.length) continue;
    const backup = availableMembers.find((a) => a.id === m.backupId) ?? availableMembers[0];
    for (const it of items) {
      moves.push({
        itemId: it.id,
        fromMemberId: m.id,
        toMemberId: backup.id,
        reason: `${m.name} offline → ${backup.name} (backup)`,
      });
    }
  }

  // Level between available members if any is > 40% above the mean.
  const loads = availableMembers.map((m) => ({
    id: m.id,
    load: worklist.filter((w) => w.ctMemberId === m.id && w.status === "pending").length,
  }));
  const mean = loads.reduce((s, l) => s + l.load, 0) / Math.max(1, loads.length);
  const overloaded = loads.filter((l) => l.load > mean * 1.4);
  const underloaded = loads.filter((l) => l.load < mean * 0.7);
  for (const over of overloaded) {
    for (const under of underloaded) {
      const spare = worklist.find(
        (w) => w.ctMemberId === over.id && w.status === "pending" && !moves.some((mv) => mv.itemId === w.id),
      );
      if (!spare) break;
      moves.push({
        itemId: spare.id,
        fromMemberId: over.id,
        toMemberId: under.id,
        reason: `Load leveling (${over.load} → ${under.load})`,
      });
    }
  }

  return moves;
}

// ─────────────────────────────────────────────────────────────
// Chat AI heuristic scorer — flags obvious issues in the "what actually
// happened" narrative. Not a real LLM call; pattern-based so we can wire
// to the AI gateway next.
// ─────────────────────────────────────────────────────────────

const LAME_TOKENS = ["ok sir", "will get back", "let me check and revert", "please share your details", "will connect soon"];
const VALUE_TOKENS = ["specifically", "walking distance", "₹", "available from", "photos", "shortlisted", "compared", "difference"];
const SPEED_TOKENS_FAST = ["within minutes", "under 1 min", "immediately", "instantly"];
const SPEED_TOKENS_SLOW = ["hours later", "next day", "delayed", "missed"];

export function scoreChatNarrative(text: string): { score: number; flags: string[] } {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return { score: 0, flags: ["Empty narrative — cannot score."] };

  let score = 50;
  const flags: string[] = [];

  for (const w of LAME_TOKENS) if (t.includes(w)) { score -= 8; flags.push(`Lame filler: "${w}"`); }
  for (const w of VALUE_TOKENS) if (t.includes(w)) { score += 6; }
  for (const w of SPEED_TOKENS_FAST) if (t.includes(w)) { score += 8; flags.push("Fast response signal"); }
  for (const w of SPEED_TOKENS_SLOW) if (t.includes(w)) { score -= 10; flags.push("Slow response signal"); }

  if (t.includes("dropped") || t.includes("ghosted")) flags.push("Outcome: dropped/ghosted");
  if (t.includes("booked")) { score += 12; flags.push("Outcome: booked"); }
  if (t.includes("tour") && !t.includes("quote")) flags.push("Tour without quotation follow-up");
  if (t.length < 60) { score -= 6; flags.push("Very short narrative — needs detail"); }

  return { score: Math.max(0, Math.min(100, Math.round(score))), flags };
}

// ─────────────────────────────────────────────────────────────
// 4-gate auto-detection from lead activity + inventory pool.
// ─────────────────────────────────────────────────────────────

export function autoDetectGates(
  lead: Lead,
  inventory: InventoryFocus[],
  prior: GateState[] = newGates(),
): GateState[] {
  const clone = prior.map((g) => ({ ...g }));
  const area = (lead.preferredArea ?? "").toLowerCase();

  // Location
  const matches = inventory.filter(
    (i) => i.active && area && i.area.toLowerCase().includes(area.split(" ")[0]),
  );
  const locationGate = clone.find((g) => g.key === "location")!;
  if (matches.length > 0) {
    locationGate.status = "green";
    locationGate.evidence = `${matches.length} active listing(s) in ${lead.preferredArea}`;
    locationGate.autoDetected = true;
  } else if (area) {
    locationGate.status = "amber";
    locationGate.evidence = `No active listing in "${lead.preferredArea}" yet — verify manually.`;
    locationGate.autoDetected = true;
  }

  // Budget — if the lead has a budget & any listing fits
  const budget = (lead as unknown as { budget?: number }).budget;
  const budgetGate = clone.find((g) => g.key === "budget")!;
  if (typeof budget === "number" && matches.length) {
    const fit = matches.filter((m) => m.price <= budget);
    if (fit.length) {
      budgetGate.status = "green";
      budgetGate.evidence = `${fit.length} listing(s) ≤ ₹${budget.toLocaleString("en-IN")}`;
      budgetGate.autoDetected = true;
    } else {
      budgetGate.status = "red";
      budgetGate.evidence = `Cheapest match ₹${Math.min(...matches.map((m) => m.price)).toLocaleString("en-IN")} > budget ₹${budget.toLocaleString("en-IN")}`;
      budgetGate.autoDetected = true;
    }
  }

  // Inventory
  const invGate = clone.find((g) => g.key === "inventory")!;
  const beds = matches.reduce((s, m) => s + m.bedsAvailable, 0);
  if (beds > 0) {
    invGate.status = "green";
    invGate.evidence = `${beds} bed(s) currently available across matching listings.`;
    invGate.autoDetected = true;
  }

  // Date — heuristic: if we have inventory horizon "today" or "this-week" and lead intent is hot
  const dateGate = clone.find((g) => g.key === "date")!;
  const urgentSupply = matches.some((m) => m.horizon === "today" || m.horizon === "this-week");
  if (lead.intent === "hot" && urgentSupply) {
    dateGate.status = "green";
    dateGate.evidence = "Hot lead + today/this-week supply — deliverable.";
    dateGate.autoDetected = true;
  }

  return clone;
}

// ─────────────────────────────────────────────────────────────
// Lineup optimizer — takes rolling performance into account and
// respects presence + shift coverage.
// ─────────────────────────────────────────────────────────────

export function optimizeLineup(members: CTMember[]): LineupPick[] {
  const roster = members
    .filter((m) => m.present)
    .map((m) => ({ id: m.id, name: m.name, role: `CT · ${m.shift}`, performance: m.performance }));
  return baseSuggestLineup(roster);
}

// ─────────────────────────────────────────────────────────────
// Review sanity — flags stale gates / SLA hot-spots for the queue.
// ─────────────────────────────────────────────────────────────

export function detectReviewFlags(
  reviews: ChatReview[],
): { avgScore: number; poorRate: number; flags: string[] } {
  if (reviews.length === 0) return { avgScore: 0, poorRate: 0, flags: [] };
  const scores = reviews.map((r) => (r.aiScore ?? 0));
  const avg = Math.round(scores.reduce((s, v) => s + v, 0) / reviews.length);
  const poor = reviews.filter((r) => (r.aiScore ?? 100) < 40).length;
  const flags: string[] = [];
  if (avg < 50) flags.push("Overall chat quality below floor — retrain openers.");
  if (poor / reviews.length > 0.3) flags.push("More than 30% chats are poor quality — daily review needed.");
  return { avgScore: avg, poorRate: Math.round((poor / reviews.length) * 100), flags };
}
