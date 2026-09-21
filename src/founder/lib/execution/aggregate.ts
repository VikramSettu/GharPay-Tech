// Time-range aggregation for the admin dashboard.
// Powers charts, tables, and CSV export. Pure function — no side effects.

import type { DynDayRecord } from "./dyn-store";

export type Granularity = "day" | "week" | "month" | "quarter";
export type GroupBy = "day" | "week" | "month" | "quarter" | "user" | "role" | "team" | "playbook";

export interface RangePreset {
  id: string; label: string;
  from: () => string; to: () => string;
}

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfQuarter(d: Date) { return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export const RANGE_PRESETS: RangePreset[] = [
  { id: "today", label: "Today", from: () => iso(new Date()), to: () => iso(new Date()) },
  { id: "week", label: "This Week", from: () => iso(startOfWeek(new Date())), to: () => iso(new Date()) },
  { id: "month", label: "This Month", from: () => iso(startOfMonth(new Date())), to: () => iso(new Date()) },
  { id: "quarter", label: "This Quarter", from: () => iso(startOfQuarter(new Date())), to: () => iso(new Date()) },
  { id: "ytd", label: "YTD", from: () => iso(startOfYear(new Date())), to: () => iso(new Date()) },
  { id: "last7", label: "Last 7 days", from: () => iso(addDays(new Date(), -6)), to: () => iso(new Date()) },
  { id: "last30", label: "Last 30 days", from: () => iso(addDays(new Date(), -29)), to: () => iso(new Date()) },
];

export interface RecordCtx {
  rec: DynDayRecord;
  employeeName: string;
  role: string;
  team: string;
  playbookName: string;
}

function bucketKey(rec: DynDayRecord, groupBy: GroupBy, ctx: RecordCtx): string {
  const d = new Date(rec.date + "T00:00:00");
  switch (groupBy) {
    case "day": return rec.date;
    case "week": return iso(startOfWeek(d));
    case "month": return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    case "quarter": return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    case "user": return ctx.employeeName;
    case "role": return ctx.role;
    case "team": return ctx.team;
    case "playbook": return ctx.playbookName;
  }
}

export function sumField(rec: DynDayRecord, fieldId: string): number {
  let total = 0;
  for (const sub of Object.values(rec.submissions)) {
    const v = sub.values[fieldId];
    if (typeof v === "number") total = Math.max(total, v); // treat as running total
  }
  return total;
}

export interface AggRow {
  bucket: string;
  count: number;
  totals: Record<string, number>;
  stagesCompleted: number;
  daysActive: number;
}

export function aggregate(ctxs: RecordCtx[], groupBy: GroupBy, fields: string[]): AggRow[] {
  const map = new Map<string, AggRow>();
  for (const ctx of ctxs) {
    const key = bucketKey(ctx.rec, groupBy, ctx);
    let row = map.get(key);
    if (!row) { row = { bucket: key, count: 0, totals: {}, stagesCompleted: 0, daysActive: 0 }; map.set(key, row); }
    row.count += 1;
    row.daysActive += 1;
    row.stagesCompleted += Object.keys(ctx.rec.submissions).length;
    for (const f of fields) {
      row.totals[f] = (row.totals[f] || 0) + sumField(ctx.rec, f);
    }
  }
  return [...map.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export function toCSV(rows: AggRow[], fields: string[]): string {
  const head = ["bucket", "days", "stages_completed", ...fields].join(",");
  const lines = rows.map((r) =>
    [r.bucket, r.daysActive, r.stagesCompleted, ...fields.map((f) => r.totals[f] || 0)].join(","),
  );
  return [head, ...lines].join("\n");
}

export function downloadCSV(name: string, csv: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}