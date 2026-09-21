// Derived intelligence over the promise store. Pure read-only helpers — no
// state, no side effects — so both the promise dialog and the Closing Board can
// tell the closer what their promise is actually worth before they commit.

import { WINDOW_BY_ID, type CloseWindowId } from "./windows";
import { hoursLeft, isExpired, type CloseCommitment } from "./store";

/* ------------------------------------------------------------------ *
 * Promise strength — instant feedback while the dialog is open.
 * ------------------------------------------------------------------ */

export interface StrengthPart {
  label: string;
  ok: boolean;
  hint: string;
}

export interface PromiseStrength {
  score: number; // 0–100
  grade: "weak" | "fair" | "strong";
  parts: StrengthPart[];
  verdict: string;
}

/**
 * A promise is strong when it has an hour, a realistic window, and two or three
 * concrete moves. Everything here is checkable by a manager the next morning.
 */
export function promiseStrength(input: {
  windowId: CloseWindowId;
  timeOfDay: string;
  customDate: string;
  steps: string[];
  changeCount: number;
}): PromiseStrength {
  const def = WINDOW_BY_ID[input.windowId];
  const isCustom = input.windowId === "custom";
  const hasTime = /^\d{1,2}:\d{2}$/.test(input.timeOfDay);
  const stepCount = input.steps.length;

  const parts: StrengthPart[] = [
    {
      label: "An exact hour",
      ok: hasTime || (isCustom && !!input.customDate),
      hint: hasTime ? "You named the hour the money moves." : "Pick the hour — a date without an hour is not a plan.",
    },
    {
      label: "A checkable deadline",
      ok: !isCustom || !!input.customDate,
      hint: isCustom && !input.customDate ? "Pick the exact date for your custom promise." : `Due inside ${def?.short ?? "the window"}.`,
    },
    {
      label: "Two or three real moves",
      ok: stepCount >= 2 && stepCount <= 4,
      hint:
        stepCount === 0
          ? "Tick the moves you will actually make."
          : stepCount === 1
            ? "One move rarely closes anything — add the follow-through."
            : stepCount > 4
              ? "More than four ticks is a wish list, not a plan."
              : `${stepCount} moves — that reads like a real plan.`,
    },
    {
      label: "Not a repeatedly moved date",
      ok: input.changeCount < 2,
      hint:
        input.changeCount >= 2
          ? `This promise already moved ${input.changeCount}× — bring a manager onto the call.`
          : "First-hand promise, no history of slipping.",
    },
  ];

  const score = Math.round((parts.filter((p) => p.ok).length / parts.length) * 100);
  const grade = score >= 100 ? "strong" : score >= 50 ? "fair" : "weak";
  const verdict =
    grade === "strong"
      ? "Strong promise — the review will be able to check every part of it."
      : grade === "fair"
        ? "Usable, but a manager will have questions on the missing part."
        : "Weak promise. Fix the red items before you commit.";

  return { score, grade, parts, verdict };
}

/* ------------------------------------------------------------------ *
 * Board grouping — the money timeline.
 * ------------------------------------------------------------------ */

export type UrgencyKey = "overdue" | "next3h" | "today" | "tomorrow" | "week" | "later";

export const URGENCY_ORDER: UrgencyKey[] = ["overdue", "next3h", "today", "tomorrow", "week", "later"];

export const URGENCY_META: Record<UrgencyKey, { title: string; blurb: string; tone: "danger" | "hot" | "warm" | "cool" }> = {
  overdue: { title: "Overdue — settle these first", blurb: "Every row here is a broken promise until someone says otherwise.", tone: "danger" },
  next3h: { title: "Landing in the next 3 hours", blurb: "Stay on the phone. These are the rows that become today's revenue.", tone: "hot" },
  today: { title: "Rest of today", blurb: "Work them in due order, not in the order you like them.", tone: "warm" },
  tomorrow: { title: "Tomorrow", blurb: "Line up tomorrow's first move before you leave today.", tone: "cool" },
  week: { title: "This week", blurb: "Pipeline promises — upgrade them the moment reality allows.", tone: "cool" },
  later: { title: "Beyond this week", blurb: "Real but distant. These need a cadence, not a memory.", tone: "cool" },
};

export function urgencyOf(c: CloseCommitment, now = Date.now()): UrgencyKey {
  if (isExpired(c, now)) return "overdue";
  const h = hoursLeft(c, now);
  const due = new Date(c.dueAt);
  const nowD = new Date(now);
  const sameDay = due.toDateString() === nowD.toDateString();
  const tomorrow = new Date(now + 86_400_000).toDateString() === due.toDateString();
  if (h <= 3) return "next3h";
  if (sameDay) return "today";
  if (tomorrow) return "tomorrow";
  if (h <= 168) return "week";
  return "later";
}

export function groupByUrgency(rows: CloseCommitment[], now = Date.now()) {
  const map = new Map<UrgencyKey, CloseCommitment[]>();
  for (const c of rows) {
    const k = urgencyOf(c, now);
    const arr = map.get(k) ?? [];
    arr.push(c);
    map.set(k, arr);
  }
  return URGENCY_ORDER.filter((k) => (map.get(k)?.length ?? 0) > 0).map((k) => ({
    key: k,
    meta: URGENCY_META[k],
    rows: (map.get(k) ?? []).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)),
  }));
}

/* ------------------------------------------------------------------ *
 * Risk flags — why a live promise is about to break.
 * ------------------------------------------------------------------ */

export function riskFlags(c: CloseCommitment, now = Date.now()): string[] {
  if (c.status !== "open") return [];
  const h = hoursLeft(c, now);
  const flags: string[] = [];
  if (h < 0) flags.push("Deadline passed — unsettled");
  else if (h <= 2 && !c.steps?.length) flags.push("Hours left, no plan written");
  else if (h <= 2) flags.push("Final hours");
  if (c.changeCount >= 3) flags.push(`Moved ${c.changeCount}× — customer likely lost`);
  else if (c.changeCount === 2) flags.push("Moved twice");
  if (!c.steps?.length && h > 2) flags.push("No steps ticked");
  const ageDays = (now - +new Date(c.promisedAt)) / 86_400_000;
  if (ageDays > 7 && c.history.length <= 1) flags.push("Promised a week ago, never touched since");
  return flags;
}

/** Rows that need a human decision right now, worst first. */
export function atRisk(all: CloseCommitment[], now = Date.now()) {
  return all
    .filter((c) => c.status === "open" && riskFlags(c, now).length > 0)
    .map((c) => ({ c, flags: riskFlags(c, now) }))
    .sort((a, b) => b.flags.length - a.flags.length || +new Date(a.c.dueAt) - +new Date(b.c.dueAt));
}

/* ------------------------------------------------------------------ *
 * Shareable digest — the list a manager pastes into the team chat.
 * ------------------------------------------------------------------ */

export function boardDigest(rows: CloseCommitment[], now = Date.now()): string {
  const open = rows.filter((c) => c.status === "open");
  const groups = groupByUrgency(open, now).filter((g) => ["overdue", "next3h", "today"].includes(g.key));
  if (!groups.length) return "No promises due today. Nothing is landing unless someone makes a promise.";
  const lines = [`CLOSING TODAY — ${new Date(now).toLocaleDateString()}`];
  for (const g of groups) {
    lines.push("", g.meta.title.toUpperCase());
    for (const c of g.rows) {
      const t = new Date(c.dueAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      lines.push(`• ${c.leadName} — ${t} — ${c.promisedBy}${c.steps?.length ? ` — ${c.steps[0]}` : ""}`);
    }
  }
  return lines.join("\n");
}

/** Owner list for the board filter. */
export function ownersOf(rows: CloseCommitment[]) {
  return [...new Set(rows.map((c) => c.promisedBy))].sort();
}
