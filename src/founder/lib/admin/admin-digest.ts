// Everything the Admin Desk needs to show a person's day in one row,
// plus the WhatsApp text builders used by every copy button on the page.

import { EMPLOYEES, type Employee } from "@/founder/data/seed";
import { companyBlock, zoneRows, type Block } from "@/founder/lib/command-center/metrics";
import { getMark, type PersonMark } from "@/founder/lib/admin/admin-desk-store";

export const CHECKPOINTS = [
  { id: "start", time: "10:35", label: "Day start" },
  { id: "p1", time: "13:15", label: "Phase 1 actuals" },
  { id: "p2", time: "17:00", label: "Phase 2 actuals" },
  { id: "impact", time: "20:00", label: "Final impact" },
] as const;

export type CheckpointId = (typeof CHECKPOINTS)[number]["id"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface PersonDay {
  emp: Employee;
  submitted: Record<CheckpointId, boolean>;
  submittedCount: number;
  promise: number;
  actual: number;
  gapPct: number;
  baseScore: number;
  finalScore: number;
  mark: PersonMark;
  line: string;
}

export function personDay(emp: Employee, date: string): PersonDay {
  const submitted = CHECKPOINTS.reduce((acc, cp) => {
    const roll = hash(`${emp.id}:${date}:${cp.id}`) % 100;
    acc[cp.id] = emp.status === "Offline" ? false : roll > (cp.id === "impact" ? 32 : 18);
    return acc;
  }, {} as Record<CheckpointId, boolean>);

  const submittedCount = CHECKPOINTS.filter((c) => submitted[c.id]).length;
  const promise = emp.callTarget || 20 + (hash(emp.id + "pr") % 25);
  // Delivery swings day to day around the person's baseline, so the week and
  // month ladders show real movement instead of a flat line.
  const variance = 72 + (hash(`${emp.id}:${date}:act`) % 52); // 72..123
  const actual = Math.max(0, Math.round(promise * (emp.performance / 100) * (variance / 100)));
  const gapPct = Math.round((actual / Math.max(promise, 1)) * 100);
  const baseScore = Math.round(emp.performance * 0.6 + (submittedCount / 4) * 100 * 0.4);
  const mark = getMark(emp.id, date);
  const finalScore = Math.max(0, Math.min(100, baseScore + mark.markup));

  const line = `${emp.name} (${emp.role}) — ${submittedCount}/4 reports, promise ${promise}, actual ${actual} (${gapPct}%), score ${finalScore}${
    mark.markup ? ` (${mark.markup > 0 ? "+" : ""}${mark.markup} admin)` : ""
  }${mark.note ? ` — "${mark.note}"` : ""}`;

  return { emp, submitted, submittedCount, promise, actual, gapPct, baseScore, finalScore, mark, line };
}

export function allPersonDays(date: string): PersonDay[] {
  return EMPLOYEES.map((e) => personDay(e, date)).sort((a, b) => b.finalScore - a.finalScore);
}

function fmtDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** The full admin digest, ready to paste into WhatsApp. */
export function buildFullDigest(date: string, rows: PersonDay[], block: Block = companyBlock()): string {
  const present = rows.filter((r) => r.emp.status !== "Offline");
  const compliance = Math.round(
    (rows.reduce((s, r) => s + r.submittedCount, 0) / Math.max(rows.length * 4, 1)) * 100,
  );
  const risk = rows.filter((r) => r.finalScore < 75 || r.mark.state === "flagged");
  const top = rows.slice(0, 3);

  const lines: string[] = [];
  lines.push(`*GHARPAYY DAY REPORT · ${fmtDate(date)}*`);
  lines.push("");
  lines.push(`Present ${present.length}/${rows.length} · Reporting compliance ${compliance}%`);
  lines.push(`Bookings ${block.closing.bookings}/${block.closing.bbdTarget} · Tours done ${block.tours.completed}/${block.tours.scheduled}`);
  lines.push(`Unassigned leads ${block.demand.unassigned} · Customers waiting on us ${block.chats.waitingUs}`);
  lines.push("");
  lines.push("*Top 3 today*");
  top.forEach((r, i) => lines.push(`${i + 1}. ${r.emp.name} — ${r.finalScore}/100, ${r.submittedCount}/4 reports`));
  lines.push("");
  lines.push(`*Needs attention (${risk.length})*`);
  if (risk.length === 0) lines.push("Nobody below the line. Clean day.");
  risk.forEach((r) => lines.push(`• ${r.emp.name} — ${r.finalScore}/100, ${r.submittedCount}/4${r.mark.note ? ` — ${r.mark.note}` : ""}`));
  lines.push("");
  lines.push("*Admin actions*");
  const acted = rows.filter((r) => r.mark.state !== "pending" || r.mark.markup !== 0);
  if (acted.length === 0) lines.push("No mark-ups recorded yet.");
  acted.forEach((r) =>
    lines.push(
      `• ${r.emp.name}: ${r.mark.state}${r.mark.markup ? ` ${r.mark.markup > 0 ? "+" : ""}${r.mark.markup}` : ""}${r.mark.note ? ` — ${r.mark.note}` : ""}`,
    ),
  );
  lines.push("");
  lines.push("Sent from Gharpayy Admin Desk");
  return lines.join("\n");
}

export function buildCheckpointDigest(date: string, rows: PersonDay[], cp: CheckpointId): string {
  const meta = CHECKPOINTS.find((c) => c.id === cp)!;
  const done = rows.filter((r) => r.submitted[cp]);
  const missing = rows.filter((r) => !r.submitted[cp] && r.emp.status !== "Offline");
  const lines = [
    `*${meta.time} · ${meta.label} · ${fmtDate(date)}*`,
    "",
    `Submitted ${done.length}/${rows.length}`,
    "",
    `*Missing (${missing.length})*`,
    ...(missing.length ? missing.map((r) => `• ${r.emp.name} (${r.emp.role})`) : ["Everyone reported."]),
  ];
  return lines.join("\n");
}

export function buildPersonDigest(date: string, row: PersonDay): string {
  return [
    `*${row.emp.name} · ${row.emp.role} · ${fmtDate(date)}*`,
    "",
    `Reports: ${row.submittedCount}/4`,
    `Promise ${row.promise} · Actual ${row.actual} · Delivered ${row.gapPct}%`,
    `Score ${row.finalScore}/100${row.mark.markup ? ` (admin ${row.mark.markup > 0 ? "+" : ""}${row.mark.markup})` : ""}`,
    `Status: ${row.mark.state}`,
    row.mark.note ? `Admin note: ${row.mark.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildZoneDigest(date: string): string {
  const lines = [`*Zone health · ${fmtDate(date)}*`, ""];
  zoneRows().forEach((z) => {
    const dot = z.health === "green" ? "🟢" : z.health === "amber" ? "🟠" : "🔴";
    lines.push(
      `${dot} ${z.zone} — present ${z.block.people.present}/${z.block.people.expected}, bookings ${z.block.closing.bookings}/${z.block.closing.bbdTarget}, waiting on us ${z.block.chats.waitingUs}`,
    );
  });
  return lines.join("\n");
}
