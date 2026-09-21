// The daily 100 — the review counter the floor is actually judged on.
//
// One mark per chat, one hundred chats a day. Everything here is deliberately
// cheap to record: the reviewer is reading WhatsApp, not filling a form. The
// deep review (manual or AI) is optional on top of the mark.

import { useSyncExternalStore } from "react";
import type { Disposition } from "./manual";

export const DAILY_REVIEW_TARGET = 100;

export interface DailyMark {
  id: string;
  at: string;
  /** Local date key, YYYY-MM-DD, so the counter resets cleanly at midnight. */
  day: string;
  reviewer: string;
  agent: string;
  zone: string;
  leadName: string;
  leadPhone: string;
  disposition: Disposition;
  /** Why this mark — the evidence line the reviewer read in WhatsApp. */
  evidence: string;
  /** Label applied to the lead alongside the mark, if any. */
  labelId?: string;
  /** Linked deep review, when the reviewer went further than a mark. */
  reviewId?: string;
}

const KEY = "gharpayy.l1.daily.v1";

let cache: DailyMark[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: DailyMark[] = [];

export function dayKey(d: Date | string = new Date()) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function read(): DailyMark[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as DailyMark[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: DailyMark[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota — in-memory only */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDailyMarks(): DailyMark[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addMark(m: Omit<DailyMark, "id" | "at" | "day">): DailyMark {
  const now = new Date();
  const rec: DailyMark = { ...m, id: `mk-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`, at: now.toISOString(), day: dayKey(now) };
  write([rec, ...read()]);
  return rec;
}

export function deleteMark(id: string) {
  write(read().filter((m) => m.id !== id));
}

export interface DailyProgress {
  day: string;
  total: number;
  target: number;
  remaining: number;
  pct: number;
  byDisposition: Record<Disposition, number>;
  byReviewer: { reviewer: string; count: number }[];
  byAgent: { agent: string; count: number; bad: number }[];
  /** Marks per hour needed to still finish the target inside the working day. */
  paceNeeded: number;
  onTrack: boolean;
}

export function progressFor(marks: DailyMark[], day = dayKey(), target = DAILY_REVIEW_TARGET, now = new Date()): DailyProgress {
  const todays = marks.filter((m) => m.day === day);
  const byDisposition: Record<Disposition, number> = { done: 0, "not-done": 0, "very-poor": 0, "not-helping": 0 };
  todays.forEach((m) => { byDisposition[m.disposition] = (byDisposition[m.disposition] ?? 0) + 1; });

  const group = (key: (m: DailyMark) => string) => {
    const map = new Map<string, DailyMark[]>();
    todays.forEach((m) => {
      const k = key(m) || "Unassigned";
      map.set(k, [...(map.get(k) ?? []), m]);
    });
    return map;
  };

  const byReviewer = [...group((m) => m.reviewer)].map(([reviewer, list]) => ({ reviewer, count: list.length }))
    .sort((a, b) => b.count - a.count);
  const byAgent = [...group((m) => m.agent)].map(([agent, list]) => ({
    agent,
    count: list.length,
    bad: list.filter((m) => m.disposition === "very-poor" || m.disposition === "not-helping").length,
  })).sort((a, b) => b.bad - a.bad || b.count - a.count);

  const remaining = Math.max(0, target - todays.length);
  // Working day assumed 10:00–20:00 local.
  const hoursLeft = Math.max(0.5, 20 - (now.getHours() + now.getMinutes() / 60));
  const paceNeeded = Math.ceil(remaining / hoursLeft);

  return {
    day,
    total: todays.length,
    target,
    remaining,
    pct: Math.min(100, Math.round((todays.length / target) * 100)),
    byDisposition,
    byReviewer,
    byAgent,
    paceNeeded,
    onTrack: remaining === 0 || paceNeeded <= 12,
  };
}

/** Rolling 7-day trend for the header sparkline / owner view. */
export function lastDays(marks: DailyMark[], days = 7, target = DAILY_REVIEW_TARGET) {
  const out: { day: string; total: number; pct: number; bad: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = dayKey(new Date(Date.now() - i * 86_400_000));
    const list = marks.filter((m) => m.day === d);
    out.push({
      day: d,
      total: list.length,
      pct: Math.min(100, Math.round((list.length / target) * 100)),
      bad: list.filter((m) => m.disposition === "very-poor" || m.disposition === "not-helping").length,
    });
  }
  return out;
}
