// Insight helpers for the admin dashboard.
// Derives time-per-stage, total day duration, median fill times and save-time hints
// from DynDayRecord submissions. Pure functions — no side effects.

import type { DynDayRecord } from "./dyn-store";

export interface StageTiming {
  stageId: string;
  ts: number;
  durationMs: number; // time from previous submit (or day start) to this submit
}

export function stageTimings(rec: DynDayRecord, stageOrder: string[]): StageTiming[] {
  const start = rec.startedAt || 0;
  let prev = start;
  const out: StageTiming[] = [];
  for (const sid of stageOrder) {
    const s = rec.submissions[sid];
    if (!s) continue;
    out.push({ stageId: sid, ts: s.ts, durationMs: Math.max(0, s.ts - prev) });
    prev = s.ts;
  }
  return out;
}

export function totalActiveMs(rec: DynDayRecord): number {
  const subs = Object.values(rec.submissions);
  if (subs.length === 0 || !rec.startedAt) return 0;
  const last = Math.max(...subs.map((s) => s.ts));
  return Math.max(0, last - rec.startedAt);
}

export function fmtDuration(ms: number): string {
  if (!ms) return "—";
  const m = Math.round(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export interface StageMedian {
  stageId: string;
  medianMs: number;
  samples: number;
  slowest: number;
}

export function stageMedians(records: DynDayRecord[], stageOrder: string[]): StageMedian[] {
  const buckets = new Map<string, number[]>();
  for (const rec of records) {
    for (const t of stageTimings(rec, stageOrder)) {
      const arr = buckets.get(t.stageId) || [];
      arr.push(t.durationMs);
      buckets.set(t.stageId, arr);
    }
  }
  const out: StageMedian[] = [];
  for (const [sid, arr] of buckets) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    out.push({ stageId: sid, medianMs: median, samples: sorted.length, slowest: sorted[sorted.length - 1] });
  }
  return out;
}

export interface SaveTimeHint {
  kind: "slow_stage" | "long_gap" | "missing_proof" | "consistency";
  label: string;
  detail: string;
}

export function saveTimeHints(medians: StageMedian[], stageLabels: Record<string, string>): SaveTimeHint[] {
  const hints: SaveTimeHint[] = [];
  const slow = [...medians].sort((a, b) => b.medianMs - a.medianMs).slice(0, 2);
  for (const s of slow) {
    if (s.medianMs > 45 * 60_000) {
      hints.push({
        kind: "slow_stage",
        label: `"${stageLabels[s.stageId] || s.stageId}" is the slowest step`,
        detail: `Median ${fmtDuration(s.medianMs)} across ${s.samples} runs. Consider pre-filling defaults or reducing required fields.`,
      });
    }
  }
  return hints;
}
