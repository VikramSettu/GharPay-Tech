// Spreadsheet view of the Admin Desk.
// Day mode: one row per person, every cell opens the matching drill down.
// Week and month modes: goal vs delivery per person. The whole grid copies as
// TSV (paste straight into Excel or Google Sheets) and downloads as CSV.

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/founder/components/Avatar";
import { copyToClipboard } from "@/founder/lib/execution/wa-format";
import { fmtDur, fmtMin, prettyDate, type DayAttendance } from "@/founder/lib/admin/admin-day";
import { CHECKPOINTS, type CheckpointId, type PersonDay } from "@/founder/lib/admin/admin-digest";
import { setMark, STATE_CLASS, STATE_LABEL } from "@/founder/lib/admin/admin-desk-store";
import { monthStart, weekStart, type GoalLadder } from "@/founder/lib/admin/admin-goals";
import type { PersonPane } from "@/founder/components/admin/PersonSheet";

type Mode = "day" | "week" | "month";

export function DataSheet({
  date,
  rows,
  attById,
  laddersById,
  noteCounts,
  onPerson,
}: {
  date: string;
  rows: PersonDay[];
  attById: Map<string, DayAttendance>;
  laddersById: Map<string, GoalLadder>;
  noteCounts: Map<string, number>;
  onPerson: (id: string, pane: PersonPane) => void;
}) {
  const [mode, setMode] = useState<Mode>("day");

  function bump(row: PersonDay, delta: number) {
    const next = Math.max(-20, Math.min(20, row.mark.markup + delta));
    setMark(row.emp.id, { markup: next }, date);
  }

  function sheetLines(): string[][] {
    if (mode === "day") {
      const head = ["Person", "Role", "Zone", "Login", "Late", "Break", "Idle", "10:35", "13:15", "17:00", "20:00", "Promise", "Actual", "Gap %", "Score", "Mark", "State", "Notes"];
      const body = rows.map((r) => {
        const a = attById.get(r.emp.id);
        return [
          r.emp.name,
          r.emp.role,
          r.emp.zone ?? "HQ",
          a?.present ? fmtMin(a.loginMin ?? 0) : a?.onLeave ? "Leave" : "Absent",
          a?.lateBy ? `+${fmtDur(a.lateBy)}` : "",
          a?.present ? fmtDur(a.breakMin) : "",
          a?.present ? fmtDur(a.idleMin) : "",
          ...CHECKPOINTS.map((c) => (r.submitted[c.id as CheckpointId] ? "yes" : "no")),
          String(r.promise),
          String(r.actual),
          `${r.gapPct}%`,
          String(r.finalScore),
          r.mark.markup ? `${r.mark.markup > 0 ? "+" : ""}${r.mark.markup}` : "0",
          STATE_LABEL[r.mark.state],
          r.mark.note || "",
        ];
      });
      return [head, ...body];
    }
    const win = mode === "week" ? "week" : "month";
    const head = ["Person", "Role", "Zone", `${mode === "week" ? "Week" : "Month"} goal`, "Expected by today", "Delivered", "Pace %", "Days done", "Days left", "Today %"];
    const body = rows.map((r) => {
      const l = laddersById.get(r.emp.id);
      const w = l?.[win];
      return [
        r.emp.name,
        r.emp.role,
        r.emp.zone ?? "HQ",
        String(w?.goal ?? ""),
        String(w?.expected ?? ""),
        String(w?.actual ?? ""),
        w ? `${w.pct}%` : "",
        String(w?.daysDone ?? ""),
        String(w?.daysLeft ?? ""),
        l ? `${l.today.pct}%` : "",
      ];
    });
    return [head, ...body];
  }

  async function copySheet() {
    const tsv = sheetLines().map((l) => l.join("\t")).join("\n");
    const ok = await copyToClipboard(tsv);
    if (ok) toast.success("Sheet copied", { description: "Paste it straight into Excel or Google Sheets." });
    else toast.error("Copy blocked by the browser");
  }

  function downloadCsv() {
    const csv = sheetLines()
      .map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gharpayy-${mode}-sheet-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  const thCls = "px-2.5 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap bg-secondary/70 sticky top-0 z-10";
  const tdCls = "px-2.5 py-1.5 whitespace-nowrap border-t border-border";
  const cellBtn = "hover:text-primary hover:underline underline-offset-2 decoration-dotted transition-colors";

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">The sheet</h2>
          <p className="text-xs text-muted-foreground">
            {mode === "day"
              ? `${prettyDate(date)} · every cell opens the detail behind it`
              : mode === "week"
                ? `Week of ${prettyDate(weekStart(date))} · goal vs delivered`
                : `Month starting ${prettyDate(monthStart(date))} · goal vs delivered`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["day", "week", "month"] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
              {m === "day" ? "Day sheet" : m === "week" ? "Weekly goals" : "Monthly goals"}
            </button>
          ))}
          <Button variant="outline" size="sm" className="h-8" onClick={copySheet}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy sheet
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={downloadCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        {mode === "day" ? (
          <table className="w-full text-sm border-collapse min-w-[1250px]">
            <thead>
              <tr>
                <th className={`${thCls} left-0 z-20`}>Person</th>
                <th className={thCls}>Login</th>
                <th className={thCls}>Late</th>
                <th className={thCls}>Break</th>
                <th className={thCls}>Idle</th>
                {CHECKPOINTS.map((c) => <th key={c.id} className={`${thCls} text-center`}>{c.time}</th>)}
                <th className={`${thCls} text-right`}>Promise</th>
                <th className={`${thCls} text-right`}>Actual</th>
                <th className={`${thCls} text-right`}>Gap</th>
                <th className={`${thCls} text-right`}>Score</th>
                <th className={`${thCls} text-center`}>Mark</th>
                <th className={thCls}>State</th>
                <th className={thCls}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const a = attById.get(r.emp.id);
                const nCount = noteCounts.get(r.emp.id) ?? 0;
                return (
                  <tr key={r.emp.id} className="hover:bg-secondary/40 transition-colors">
                    <td className={`${tdCls} sticky left-0 bg-card z-[5]`}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "timeline")} className="flex items-center gap-2 group">
                        <Avatar id={r.emp.id} name={r.emp.name} size={26} />
                        <span className="text-left">
                          <span className={`block text-sm font-medium ${cellBtn}`}>{r.emp.name}</span>
                          <span className="block text-[11px] text-muted-foreground">{r.emp.role} · {r.emp.zone ?? "HQ"}</span>
                        </span>
                      </button>
                    </td>
                    <td className={tdCls}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "timeline")}
                        className={`font-mono text-xs ${cellBtn} ${a?.lateBy ? "text-warning" : a?.present ? "" : "text-muted-foreground"}`}>
                        {a?.present ? fmtMin(a.loginMin ?? 0) : a?.onLeave ? "Leave" : "Absent"}
                      </button>
                    </td>
                    <td className={tdCls}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "history")}
                        className={`font-mono text-xs ${cellBtn} ${a?.lateBy ? "text-warning" : "text-muted-foreground"}`}>
                        {a?.lateBy ? `+${fmtDur(a.lateBy)}` : "—"}
                      </button>
                    </td>
                    <td className={tdCls}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "timeline")}
                        className={`font-mono text-xs ${cellBtn} ${a?.overBreakMin ? "text-destructive" : "text-muted-foreground"}`}>
                        {a?.present ? `${fmtDur(a.breakMin)}${a.overBreakMin ? ` (+${fmtDur(a.overBreakMin)})` : ""}` : "—"}
                      </button>
                    </td>
                    <td className={tdCls}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "timeline")}
                        className={`font-mono text-xs ${cellBtn} ${(a?.idleMin ?? 0) > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                        {a?.present ? fmtDur(a.idleMin) : "—"}
                      </button>
                    </td>
                    {CHECKPOINTS.map((c) => (
                      <td key={c.id} className={`${tdCls} text-center`}>
                        <button type="button" onClick={() => onPerson(r.emp.id, "reports")} title={`${c.time} ${c.label}`}
                          className={`w-6 h-6 rounded-md inline-grid place-items-center text-[10px] font-mono border transition-transform hover:scale-110 ${r.submitted[c.id as CheckpointId] ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}>
                          {r.submitted[c.id as CheckpointId] ? "✓" : "–"}
                        </button>
                      </td>
                    ))}
                    <td className={`${tdCls} text-right`}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "goals")} className={`font-mono text-xs ${cellBtn}`}>{r.promise}</button>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "goals")} className={`font-mono text-xs ${cellBtn}`}>{r.actual}</button>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "goals")}
                        className={`font-mono text-xs ${cellBtn} ${r.gapPct >= 90 ? "text-success" : r.gapPct >= 75 ? "text-warning" : "text-destructive"}`}>
                        {r.gapPct}%
                      </button>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "action")}
                        className={`font-mono text-xs font-semibold ${cellBtn} ${r.finalScore >= 80 ? "text-success" : r.finalScore >= 70 ? "text-warning" : "text-destructive"}`}>
                        {r.finalScore}
                      </button>
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <span className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => bump(r, -5)} aria-label={`Mark down ${r.emp.name}`}
                          className="w-5 h-5 rounded border border-border grid place-items-center hover:bg-secondary"><Minus className="w-3 h-3" /></button>
                        <button type="button" onClick={() => onPerson(r.emp.id, "action")}
                          className={`font-mono text-xs min-w-[30px] ${cellBtn} ${r.mark.markup ? "text-primary" : "text-muted-foreground"}`}>
                          {r.mark.markup ? `${r.mark.markup > 0 ? "+" : ""}${r.mark.markup}` : "0"}
                        </button>
                        <button type="button" onClick={() => bump(r, 5)} aria-label={`Mark up ${r.emp.name}`}
                          className="w-5 h-5 rounded border border-border grid place-items-center hover:bg-secondary"><Plus className="w-3 h-3" /></button>
                      </span>
                    </td>
                    <td className={tdCls}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "action")}
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${STATE_CLASS[r.mark.state]}`}>
                        {STATE_LABEL[r.mark.state]}
                      </button>
                    </td>
                    <td className={tdCls}>
                      <button type="button" onClick={() => onPerson(r.emp.id, "notes")}
                        className={`text-xs max-w-[180px] truncate block ${cellBtn} ${nCount || r.mark.note ? "" : "text-muted-foreground"}`}>
                        {r.mark.note ? r.mark.note : nCount ? `${nCount} note(s)` : "Add note"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className={`${thCls} left-0 z-20`}>Person</th>
                <th className={`${thCls} text-right`}>{mode === "week" ? "Week" : "Month"} goal</th>
                <th className={`${thCls} text-right`}>Expected by today</th>
                <th className={`${thCls} text-right`}>Delivered</th>
                <th className={thCls}>Pace</th>
                <th className={`${thCls} text-right`}>Days done</th>
                <th className={`${thCls} text-right`}>Days left</th>
                <th className={`${thCls} text-right`}>Today</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => (laddersById.get(a.emp.id)?.[mode === "week" ? "week" : "month"].pct ?? 0) - (laddersById.get(b.emp.id)?.[mode === "week" ? "week" : "month"].pct ?? 0))
                .map((r) => {
                  const l = laddersById.get(r.emp.id);
                  const w = l?.[mode === "week" ? "week" : "month"];
                  if (!w) return null;
                  const toneCls = w.pct >= 95 ? "text-success" : w.pct >= 85 ? "text-warning" : "text-destructive";
                  return (
                    <tr key={r.emp.id} onClick={() => onPerson(r.emp.id, "goals")}
                      className="hover:bg-secondary/40 transition-colors cursor-pointer">
                      <td className={`${tdCls} sticky left-0 bg-card z-[5]`}>
                        <span className="flex items-center gap-2">
                          <Avatar id={r.emp.id} name={r.emp.name} size={26} />
                          <span className="text-left">
                            <span className="block text-sm font-medium">{r.emp.name}</span>
                            <span className="block text-[11px] text-muted-foreground">{r.emp.role} · {r.emp.zone ?? "HQ"}</span>
                          </span>
                        </span>
                      </td>
                      <td className={`${tdCls} text-right font-mono text-xs`}>{w.goal}</td>
                      <td className={`${tdCls} text-right font-mono text-xs`}>{w.expected}</td>
                      <td className={`${tdCls} text-right font-mono text-xs font-medium`}>{w.actual}</td>
                      <td className={tdCls}>
                        <span className="flex items-center gap-2 min-w-[140px]">
                          <span className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                            <span className={`block h-full ${w.pct >= 95 ? "bg-success" : w.pct >= 85 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${Math.min(w.pct, 100)}%` }} />
                          </span>
                          <span className={`font-mono text-xs w-10 text-right ${toneCls}`}>{w.pct}%</span>
                        </span>
                      </td>
                      <td className={`${tdCls} text-right font-mono text-xs text-muted-foreground`}>{w.daysDone}/{w.days}</td>
                      <td className={`${tdCls} text-right font-mono text-xs text-muted-foreground`}>{w.daysLeft}</td>
                      <td className={`${tdCls} text-right font-mono text-xs ${l && l.today.pct >= 90 ? "text-success" : l && l.today.pct >= 75 ? "text-warning" : "text-destructive"}`}>{l?.today.pct}%</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>
      <p className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
        {mode === "day"
          ? "Click any cell: times open the timeline, ticks open the reports, numbers open the goals, the score opens the admin action."
          : "Click any row to open the full goal ladder and the weekly report for that person."}
      </p>
    </section>
  );
}
