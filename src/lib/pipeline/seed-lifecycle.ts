// Deterministic multi-cycle seed for demo/testing.
// Populates useLifecycle with 15 cycles for a demo lead (l-11 Aakash B.),
// plus a few cycles + a live co-work claim on other leads so QA can see
// the returning-lead history + parallel-owner claim UI without clicks.
// Idempotent — runs once, marked by a version key.
import { useLifecycle, type LeadCycle, type CycleCloseReason, type RevivalReason, type CycleEvent } from "./lifecycle";
import { useLiveActivity } from "@/lib/live-activity";

const SEED_VERSION = "gharpayy-lifecycle-seed-v5";

const day = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

interface CycleSpec {
  daysAgo: number;             // opened this many days ago
  durationDays: number;        // stayed open this many days
  closeReason: CycleCloseReason;
  revivalReason?: RevivalReason;
  tcm: string;
  notes: string;
  reused?: string[];
}

// 15 cycles across ~24 months — a realistic returning-lead journey.
const AAKASH_15: CycleSpec[] = [
  { daysAgo: 730, durationDays: 12, closeReason: "lost-price", tcm: "tcm-3",
    notes: "Jan '24 — first enquiry, priced out at ₹15.5k Koramangala." },
  { daysAgo: 640, durationDays: 8, closeReason: "ghosted", revivalReason: "budget-ready", tcm: "tcm-3",
    notes: "Apr '24 — came back, went silent after 2 tours.", reused: ["food","idCollected"] },
  { daysAgo: 560, durationDays: 15, closeReason: "lost-own-arrangement", revivalReason: "family-approved", tcm: "tcm-2",
    notes: "Jul '24 — parents pushed him to a friend's flat.", reused: ["food","budget","idCollected"] },
  { daysAgo: 500, durationDays: 6, closeReason: "deferred", revivalReason: "season-change", tcm: "tcm-2",
    notes: "Sep '24 — deferred move-in by a quarter.", reused: ["food","budget","preferredArea"] },
  { daysAgo: 440, durationDays: 9, closeReason: "lost-competitor", revivalReason: "price-drop-seen", tcm: "tcm-1",
    notes: "Nov '24 — booked a Stanza, cancelled in 3 days.", reused: ["budget","idCollected"] },
  { daysAgo: 380, durationDays: 4, closeReason: "cancelled-after-book", revivalReason: "returning-customer", tcm: "tcm-1",
    notes: "Jan '25 — booked us, then dad had health scare.", reused: ["budget","idCollected","food"] },
  { daysAgo: 320, durationDays: 7, closeReason: "health-emergency", revivalReason: "family-approved", tcm: "tcm-1",
    notes: "Mar '25 — put on hold for father's surgery." },
  { daysAgo: 260, durationDays: 11, closeReason: "lost-location", revivalReason: "new-city", tcm: "tcm-4",
    notes: "May '25 — job moved to Whitefield temporarily.", reused: ["budget","food","idCollected"] },
  { daysAgo: 210, durationDays: 5, closeReason: "job-loss", revivalReason: "lost-job-earlier-now-ok", tcm: "tcm-4",
    notes: "Jun '25 — laid off, paused search." },
  { daysAgo: 170, durationDays: 8, closeReason: "ghosted", revivalReason: "referral-nudge", tcm: "tcm-2",
    notes: "Jul '25 — friend referred him back, ghosted on tour." },
  { daysAgo: 130, durationDays: 6, closeReason: "lost-food", revivalReason: "old-option-gone", tcm: "tcm-2",
    notes: "Sep '25 — Jain-food block missing, chose Colive." },
  { daysAgo: 95,  durationDays: 4, closeReason: "deferred", revivalReason: "family-approved", tcm: "tcm-1",
    notes: "Oct '25 — mother wanted flat, not PG." },
  { daysAgo: 65,  durationDays: 7, closeReason: "lost-bought-flat", revivalReason: "returning-customer", tcm: "tcm-1",
    notes: "Nov '25 — nearly bought a flat, deal fell through.", reused: ["budget","food"] },
  { daysAgo: 35,  durationDays: 5, closeReason: "cancelled-after-book", revivalReason: "price-drop-seen", tcm: "tcm-1",
    notes: "Dec '25 — booked BTM, refunded within 48h." },
  // Cycle 15 — currently OPEN (no closedAt) — the one owner is working NOW.
  { daysAgo: 6,   durationDays: 0, closeReason: "other", revivalReason: "returning-customer", tcm: "tcm-1",
    notes: "Now — back for 6-month stay, wants Koramangala 8B, family called twice.",
    reused: ["food","budget","idCollected","preferredArea"] },
];

function buildCycles(specs: CycleSpec[], originalTcm: string): LeadCycle[] {
  const uid = (i: number) => `cyc_seed_${i}`;
  return specs.map((s, i) => {
    const openedMs = Date.now() - s.daysAgo * day;
    const isOpen = i === specs.length - 1;
    const closedMs = isOpen ? undefined : openedMs + s.durationDays * day;
    const prevSpec = specs[i - 1];
    const gapDays = prevSpec
      ? Math.max(0, Math.round(
          (openedMs - (Date.now() - (prevSpec.daysAgo - prevSpec.durationDays) * day)) / day,
        ))
      : undefined;
    return {
      id: uid(i),
      cycleNumber: i + 1,
      openedAt: iso(openedMs),
      closedAt: closedMs ? iso(closedMs) : undefined,
      closeReason: isOpen ? undefined : s.closeReason,
      revivalReason: i === 0 ? undefined : s.revivalReason,
      gapDays: i === 0 ? undefined : gapDays,
      originalTcmId: originalTcm,
      currentTcmId: s.tcm,
      notes: s.notes,
      reusedFromCycle: i === 0 ? undefined : i,
      reusedFields: s.reused,
      snapshot: buildSnapshot(i, s),
      quote: buildQuote(i, s, openedMs),
      booking: buildBooking(i, s, openedMs, closedMs),
      events: buildEvents(i, s, openedMs, closedMs, isOpen),
    };
  });
}

// Deterministic per-cycle snapshot of the ask.
function buildSnapshot(i: number, s: CycleSpec) {
  const budgets = [15500, 16000, 14500, 17000, 15000, 16500, 18000, 14000, 15800, 16200, 14800, 17500, 15300, 16800, 15900];
  const areas = ["Koramangala", "HSR", "BTM", "Indiranagar", "Whitefield", "Marathahalli"];
  const foods = ["veg", "any", "jain", "non-veg", "veg"];
  const sharings = ["single", "double", "triple", "double"];
  return {
    budget: budgets[i % budgets.length],
    area: areas[i % areas.length],
    moveInDate: iso(Date.now() - (s.daysAgo - 4) * day).slice(0, 10),
    food: foods[i % foods.length],
    sharing: sharings[i % sharings.length],
    persona: i % 3 === 0 ? "working-pro" : i % 3 === 1 ? "student" : "couple",
    groupSize: 1 + (i % 3),
  };
}

function buildQuote(i: number, s: CycleSpec, openedMs: number) {
  if (s.closeReason === "unqualified" || s.closeReason === "ghosted") return undefined;
  const amount = 14500 + ((i * 350) % 4000);
  return {
    amount,
    discount: (i % 4) * 250,
    deposit: amount * 2,
    sentAt: iso(openedMs + Math.min(3, s.durationDays) * day),
  };
}

function buildBooking(i: number, s: CycleSpec, openedMs: number, closedMs?: number) {
  if (s.closeReason !== "booked" && s.closeReason !== "cancelled-after-book") return undefined;
  const at = openedMs + Math.max(1, s.durationDays - 1) * day;
  const amount = 15500 + ((i * 400) % 3500);
  return {
    amount,
    ref: `BK-${1000 + i}-${(i * 17) % 9999}`,
    at: iso(at),
    refundedAt: s.closeReason === "cancelled-after-book" && closedMs ? iso(closedMs) : undefined,
    refundReason: s.closeReason === "cancelled-after-book" ? "Cancelled within 48h — full refund" : undefined,
  };
}

// Realistic events for a cycle: opening, calls, WA, tour, objection, quote, commit, close/revive.
function buildEvents(i: number, s: CycleSpec, openedMs: number, closedMs: number | undefined, isOpen: boolean): CycleEvent[] {
  const evs: CycleEvent[] = [];
  const eid = (n: number) => `evt_${i}_${n}`;
  const shift = (frac: number) => iso(openedMs + Math.max(1, s.durationDays) * day * frac);

  // Opening
  if (i === 0) {
    evs.push({ id: eid(1), ts: iso(openedMs), type: "opened", actor: "system",
      summary: "New enquiry received via WhatsApp Business",
      detail: `First message: "Hi, looking for PG in ${["Koramangala","HSR","BTM"][i % 3]} — budget around 15k, veg food."`,
      meta: { source: "wa-koramangala", channel: "whatsapp" } });
  } else {
    evs.push({ id: eid(1), ts: iso(openedMs), type: "revived", actor: "system",
      summary: `Cycle #${i + 1} reopened — ${s.revivalReason ?? "returning"}`,
      detail: `Lead reappeared after ${Math.max(0, Math.round((openedMs - (Date.now() - (s.daysAgo) * day)) / day))}d. Reused: ${(s.reused ?? []).join(", ") || "nothing yet"}.`,
      meta: { revivalReason: s.revivalReason, reused: (s.reused ?? []).join(",") } });
  }

  // Call attempt 1
  evs.push({ id: eid(2), ts: shift(0.1), type: "call", actor: s.tcm,
    summary: `Call attempt 1 — ${["answered","not-answered","answered","busy"][i % 4]}`,
    detail: i % 4 === 0
      ? "Lead answered. Confirmed budget, veg food, move-in in ~2 weeks. Language: Hindi. Best time: after 7 PM."
      : "No answer — voicemail left, WA follow-up queued.",
    meta: { durationSec: i % 4 === 0 ? 262 : 0, language: "hindi" } });

  // WA message
  evs.push({ id: eid(3), ts: shift(0.2), type: "wa", actor: s.tcm,
    summary: "WhatsApp — 3 property options sent (PDF + location pins)",
    detail: `Sent: Koramangala 8B (₹15.5k), HSR Silverline (₹14.8k), BTM Skyline (₹15k). Read at ${new Date(openedMs + s.durationDays * day * 0.22).toLocaleTimeString()}. Reply: "Will check tonight."`,
    meta: { read: true, replied: true } });

  // Tour
  {
    const noShow = s.closeReason === "ghosted" && i % 2 === 0;
    evs.push({ id: eid(4), ts: shift(0.35), type: "tour-scheduled", actor: s.tcm,
      summary: `Tour scheduled — Koramangala 8B, 6:30 PM`,
      detail: `Coordinator: ${s.tcm}. Meeting point: near Sony Signal. Confirmed on WA.` });
    evs.push({ id: eid(5), ts: shift(0.5), type: noShow ? "tour-noshow" : "tour-visited", actor: s.tcm,
      summary: noShow ? "Tour NO-SHOW — did not respond to reminders" : `Tour completed — reaction: ${["loved","liked","mixed","disappointed"][i % 4]}`,
      detail: noShow
        ? "Called twice at meeting time, then again at +30 min. Phone off. Auto-scheduled retry for +24h."
        : `Walked 3 rooms. Comment: "Room-fit good, but ₹15.5k is 15% over what I planned." Photo evidence uploaded.`,
      meta: { propertyId: "p1", durationMin: noShow ? 0 : 42 } });
  }

  // Objection
  if (s.closeReason === "lost-price" || s.closeReason === "lost-food" || s.closeReason === "lost-location") {
    evs.push({ id: eid(6), ts: shift(0.6), type: "objection", actor: s.tcm,
      summary: `Objection logged — ${s.closeReason.replace("lost-","")}`,
      detail: s.closeReason === "lost-price"
        ? `Lead words: "I saw a ₹13k one on OLX, why pay 15?" Handling: showed inclusion breakdown (food, wifi, laundry) → still not convinced.`
        : s.closeReason === "lost-food"
        ? `Lead words: "You said Jain but the menu has onion." Handling: escalated to owner, no separate Jain kitchen. Lost.`
        : `Lead words: "My office moved to Whitefield last week." Handling: offered Whitefield alternatives, lead wanted Koramangala. Lost.` });
  }

  // Quote sent
  evs.push({ id: eid(7), ts: shift(0.65), type: "quote-sent", actor: s.tcm,
    summary: `Quote sent — ₹${14500 + (i * 350) % 4000} + ₹${(i % 4) * 250} discount, 6mo lock`,
    detail: `Deposit: ₹${(14500 + (i * 350) % 4000) * 2}. Included: veg meals, wifi, weekly cleaning. Expiry: ${new Date(openedMs + (s.durationDays + 3) * day).toLocaleDateString()}.` });

  // Commitment
  evs.push({ id: eid(8), ts: shift(0.75), type: "commitment", actor: s.tcm,
    summary: `Callback promised — "will decide by ${["Friday","weekend","Monday","tomorrow"][i % 4]}"`,
    detail: `Set commitment ledger entry. Auto-reminder queued 2h before deadline.` });

  // Close / booking
  if (!isOpen && closedMs) {
    if (s.closeReason === "booked") {
      evs.push({ id: eid(9), ts: iso(closedMs - day/2), type: "booking", actor: s.tcm,
        summary: `BOOKED — ₹${15500 + (i * 400) % 3500} paid, ref BK-${1000 + i}` });
    }
    if (s.closeReason === "cancelled-after-book") {
      evs.push({ id: eid(9), ts: iso(closedMs - day), type: "booking", actor: s.tcm,
        summary: `Booked — ₹${15500 + (i * 400) % 3500} paid` });
      evs.push({ id: eid(10), ts: iso(closedMs), type: "refund", actor: "system",
        summary: `REFUND — cancelled within 48h`,
        detail: `Reason (verbatim): "${s.notes}"` });
    }
    evs.push({ id: eid(11), ts: iso(closedMs), type: "closed", actor: s.tcm,
      summary: `Cycle closed — ${s.closeReason}`,
      detail: s.notes });
  }

  return evs.sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
}

// Short 3-cycle journey for another lead so the "returning" UI isn't only on one row.
const TANYA_3: CycleSpec[] = [
  { daysAgo: 200, durationDays: 10, closeReason: "lost-price", tcm: "tcm-2",
    notes: "First enquiry — priced out." },
  { daysAgo: 90,  durationDays: 6,  closeReason: "ghosted", revivalReason: "budget-ready", tcm: "tcm-2",
    notes: "Came back after salary hike, ghosted." },
  { daysAgo: 3,   durationDays: 0,  closeReason: "other", revivalReason: "returning-customer", tcm: "tcm-2",
    notes: "Back again, tour booked for tomorrow." },
];

const DEMO_CLOSE_REASONS: CycleCloseReason[] = [
  "lost-price", "ghosted", "lost-own-arrangement", "deferred", "lost-competitor",
  "cancelled-after-book", "health-emergency", "lost-location", "job-loss", "lost-food",
];
const DEMO_REVIVAL_REASONS: RevivalReason[] = [
  "budget-ready", "family-approved", "season-change", "price-drop-seen", "returning-customer",
  "new-city", "lost-job-earlier-now-ok", "referral-nudge", "old-option-gone",
];

function demoCycleSpecs(index: number): CycleSpec[] {
  const cycleCount = 2 + ((index - 1) % 14);
  return Array.from({ length: cycleCount }, (_, i) => {
    const isOpen = i === cycleCount - 1;
    return {
      daysAgo: (cycleCount - i) * 38 + (index % 9),
      durationDays: isOpen ? 0 : 3 + ((index + i) % 9),
      closeReason: DEMO_CLOSE_REASONS[(index + i) % DEMO_CLOSE_REASONS.length],
      revivalReason: i === 0 ? undefined : DEMO_REVIVAL_REASONS[(index + i) % DEMO_REVIVAL_REASONS.length],
      tcm: `tcm-${((index + i) % 4) + 1}`,
      notes: isOpen
        ? `Current return cycle ${cycleCount} — active again, verify location/date, claim owner, and set next action.`
        : `Past cycle ${i + 1} — realistic lost/deferred journey preserved for audit and reassignment context.`,
      reused: i === 0 ? undefined : ["budget", "preferredArea", "food", "idCollected"].slice(0, 1 + ((index + i) % 4)),
    };
  });
}

export function runLifecycleSeed() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(SEED_VERSION) === "done") return;
  } catch {
    return;
  }

  const lifecycle = useLifecycle.getState();
  const existing = lifecycle.cycles ?? {};

  const seeded: Record<string, LeadCycle[]> = {
    ...existing,
    "l-11": buildCycles(AAKASH_15, "tcm-3"),
    "l-12": buildCycles(TANYA_3, "tcm-2"),
  };

  for (let i = 1; i <= 100; i += 1) {
    seeded[`l-demo-${i}`] = buildCycles(demoCycleSpecs(i), `tcm-${((i - 1) % 4) + 1}`);
  }

  useLifecycle.setState({ cycles: seeded });

  // Live co-work claim: someone else is actively helping the current owner on l-11.
  const live = useLiveActivity.getState();
  const hasClaim = live.claims.some((c) => c.leadId === "l-11" && c.state === "active");
  if (!hasClaim) {
    live.claimCowork({
      leadId: "l-11",
      claimerId: "tcm-4",
      claimerName: "Neha Verma",
      primaryOwnerName: "Aarav Mehta",
      reason: "On live call with the guardian while Aarav confirms room availability.",
    });
  }
  // Add a warm parallel session on Tanya so 'multiple people working the same lead' is visible.
  const hasClaimTanya = live.claims.some((c) => c.leadId === "l-12" && c.state === "active");
  if (!hasClaimTanya) {
    live.claimCowork({
      leadId: "l-12",
      claimerId: "tcm-1",
      claimerName: "Aarav Mehta",
      primaryOwnerName: "Priya Shah",
      reason: "Priya is on WA — I'm dialing the parent in parallel.",
    });
  }

  for (let i = 1; i <= 12; i += 1) {
    const leadId = `l-demo-${i}`;
    const already = live.claims.some((c) => c.leadId === leadId && c.state === "active");
    if (!already) {
      live.claimCowork({
        leadId,
        claimerId: `tcm-${(i % 4) + 1}`,
        claimerName: ["Aarav Mehta", "Priya Shah", "Rohan Iyer", "Neha Verma"][i % 4],
        primaryOwnerName: ["Priya Shah", "Rohan Iyer", "Neha Verma", "Aarav Mehta"][i % 4],
        reason: "Demo co-work claim: parallel callback / guardian check while primary owner continues WhatsApp.",
      });
    }
  }

  try { window.localStorage.setItem(SEED_VERSION, "done"); } catch { /* ignore */ }
}