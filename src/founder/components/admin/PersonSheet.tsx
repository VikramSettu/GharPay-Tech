// Full drill down for one person on one date.
// Opens from anywhere on the Admin Desk: a name, a late serial, a stat tile,
// a checkpoint dot, a sheet cell, a zone card. Six panes: timeline with real
// clock times, goals (today, week, month), last 14 days, checkpoint reports,
// the written record (1-on-1s and notes) and the admin action panel.

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/founder/components/Avatar";
import { toast } from "sonner";
import {
  CalendarPlus, CheckCircle2, Copy, Flag, MessageCircle, Minus, Plus, ThumbsUp, Trash2,
} from "lucide-react";
import { copyToClipboard, waDeepLink } from "@/founder/lib/execution/wa-format";
import { fmtDur, fmtMin, prettyDate, type DayAttendance } from "@/founder/lib/admin/admin-day";
import { CHECKPOINTS, personDay, type CheckpointId, type PersonDay } from "@/founder/lib/admin/admin-digest";
import { setMark, STATE_CLASS, STATE_LABEL, type MarkState } from "@/founder/lib/admin/admin-desk-store";
import {
  buildPersonDeepDigest, dayTimeline, personHistory, summarise, type EventTone,
} from "@/founder/lib/admin/admin-detail";
import { goalLadder, paceVerdict, weekStart, weeklyReportText, workingDays } from "@/founder/lib/admin/admin-goals";
import {
  addNote, NOTE_KIND_CLASS, NOTE_KIND_LABEL, NOTE_KINDS, removeNote, useAdminNotes, type NoteKind,
} from "@/founder/lib/admin/admin-notes";
import { createOneOnOne, sentimentColor, useOneOnOnesFor } from "@/founder/lib/oneonone-store";

const TONE_DOT: Record<EventTone, string> = {
  good: "bg-success",
  warn: "bg-warning",
  bad: "bg-destructive",
  neutral: "bg-muted-foreground",
};

export type PersonPane = "timeline" | "goals" | "history" | "reports" | "notes" | "action";

export function PersonSheet({
  open, onClose, row, att, date, pane, onPane, onJumpDate,
}: {
  open: boolean;
  onClose: () => void;
  row: PersonDay | null;
  att: DayAttendance | undefined;
  date: string;
  pane: PersonPane;
  onPane: (p: PersonPane) => void;
  onJumpDate?: (date: string) => void;
}) {
  const [noteKind, setNoteKind] = useState<NoteKind>("feedback");
  const [noteText, setNoteText] = useState("");
  const [noteFollowUp, setNoteFollowUp] = useState("");
  const emp = row?.emp;

  const timeline = useMemo(() => dayTimeline(att, row ?? undefined), [att, row]);
  const history = useMemo(() => (emp ? personHistory(emp, date, 14) : []), [emp, date]);
  const sum = useMemo(() => summarise(history), [history]);
  const digest = useMemo(
    () => (emp ? buildPersonDeepDigest(date, emp, att, row ?? undefined, history) : ""),
    [emp, date, att, row, history],
  );
  const ladder = useMemo(() => (emp ? goalLadder(emp, date) : null), [emp, date]);
  const historyByDate = useMemo(() => new Map(history.map((h) => [h.date, h])), [history]);
  const weekBreakdown = useMemo(() => {
    if (!emp) return [];
    return workingDays(weekStart(date), date).map((d) => ({ date: d, pd: personDay(emp, d) }));
  }, [emp, date]);

  const allNotes = useAdminNotes();
  const personNotes = useMemo(
    () => (emp ? allNotes.filter((n) => n.employeeId === emp.id) : []),
    [allNotes, emp],
  );
  const oneOnOnes = useOneOnOnesFor(emp?.id ?? "");

  if (!row || !emp || !ladder) return null;
  const first = emp.name.split(" ")[0];

  async function copy(text: string, what: string) {
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${what} copied`, { description: "Paste it straight into WhatsApp." });
    else toast.error("Copy blocked by the browser");
  }
  function mark(state: MarkState) {
    setMark(emp!.id, { state }, date);
    toast.success(`${emp!.name} marked ${STATE_LABEL[state].toLowerCase()}`);
  }
  function bump(delta: number) {
    const next = Math.max(-20, Math.min(20, row!.mark.markup + delta));
    setMark(emp!.id, { markup: next }, date);
    toast.success(`Mark up now ${next > 0 ? "+" : ""}${next}`);
  }
  function saveNote() {
    if (!noteText.trim()) {
      toast.error("Write the note first");
      return;
    }
    addNote({ employeeId: emp!.id, kind: noteKind, text: noteText.trim(), followUp: noteFollowUp || undefined });
    setNoteText("");
    setNoteFollowUp("");
    toast.success(`${NOTE_KIND_LABEL[noteKind]} saved for ${first}`, {
      description: "It stays on the record and shows in the sheet.",
    });
  }
  function scheduleOneOnOne() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    const suggestion = quickNotes(first, att, row!)[0];
    createOneOnOne({
      managerId: emp!.managerId ?? "e1",
      reportId: emp!.id,
      scheduledAt: d.getTime(),
      agenda: `1) ${suggestion}\n2) Goal check: week pace is ${ladder!.week.pct}% against expected ${ladder!.week.expected}\n3) One thing I can unblock`,
    });
    toast.success(`1:1 with ${first} set for tomorrow 11:00 AM`, {
      description: "It is on the 1:1 Notes page and in their inbox.",
    });
  }

  const PANES: [PersonPane, string][] = [
    ["timeline", "Timeline"],
    ["goals", "Goals"],
    ["history", "Last 14 days"],
    ["reports", "Reports"],
    ["notes", `1-on-1 & notes${personNotes.length ? ` (${personNotes.length})` : ""}`],
    ["action", "Admin action"],
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-left">
            <Avatar id={emp.id} name={emp.name} size={40} />
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold flex items-center gap-2 flex-wrap">
                {emp.name}
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${STATE_CLASS[row.mark.state]}`}>
                  {STATE_LABEL[row.mark.state]}
                </span>
                {att?.lateSerial && (
                  <button type="button" onClick={() => onPane("timeline")}
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded border bg-warning/10 text-warning border-warning/30 hover:bg-warning/20 transition-colors">
                    Late #{att.lateSerial} · {fmtMin(att.loginMin ?? 0)}
                  </button>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-normal">
                {emp.role} · {emp.zone ?? "HQ"} · {prettyDate(date)}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Mini label="Login" value={att?.present ? fmtMin(att.loginMin ?? 0) : att?.onLeave ? "Leave" : "Absent"}
            sub={att?.lateBy ? `late ${fmtDur(att.lateBy)}` : att?.present ? "on time" : ""} onClick={() => onPane("timeline")} />
          <Mini label="Break" value={att?.present ? fmtDur(att.breakMin) : "—"}
            sub={att?.overBreakMin ? `over ${fmtDur(att.overBreakMin)}` : "inside 45m"} onClick={() => onPane("timeline")} />
          <Mini label="Reports" value={`${row.submittedCount}/4`} sub={`promise ${row.promise} · actual ${row.actual}`} onClick={() => onPane("reports")} />
          <Mini label="Week pace" value={`${ladder.week.pct}%`} sub={`${ladder.week.actual}/${ladder.week.expected} expected`} onClick={() => onPane("goals")} />
          <Mini label="Score" value={`${row.finalScore}`} sub={row.mark.markup ? `${row.mark.markup > 0 ? "+" : ""}${row.mark.markup} admin` : "base"} onClick={() => onPane("action")} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PANES.map(([id, label]) => (
            <button key={id} onClick={() => onPane(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${pane === id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
              {label}
            </button>
          ))}
        </div>

        {pane === "timeline" && (
          <div className="space-y-0">
            {timeline.map((e, i) => (
              <div key={`${e.min}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${TONE_DOT[e.tone]}`} />
                  {i < timeline.length - 1 && <span className="w-px flex-1 bg-border" />}
                </div>
                <div className="pb-3 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-muted-foreground w-[86px]">{e.time}</span>
                    <span className="text-sm font-medium">{e.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {pane === "goals" && (
          <div className="space-y-3">
            <div className="grid md:grid-cols-3 gap-2">
              <GoalCard label="Today's goal" goal={ladder.today.goal} expected={ladder.today.goal} actual={ladder.today.actual} pct={ladder.today.pct}
                sub="Declared at 10:35, closed at 20:00" />
              <GoalCard label="This week" goal={ladder.week.goal} expected={ladder.week.expected} actual={ladder.week.actual} pct={ladder.week.pct}
                sub={`${prettyDate(ladder.week.from)} to ${prettyDate(ladder.week.to)} · ${ladder.week.daysLeft} day(s) left`} />
              <GoalCard label="This month" goal={ladder.month.goal} expected={ladder.month.expected} actual={ladder.month.actual} pct={ladder.month.pct}
                sub={`${prettyDate(ladder.month.from)} to ${prettyDate(ladder.month.to)} · ${ladder.month.daysLeft} day(s) left`} />
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 flex flex-wrap items-center gap-2 justify-between">
              <div className="text-sm">{paceVerdict(ladder.week.pct)}</div>
              <Button variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => copy(weeklyReportText(emp, date), "Weekly report")}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy weekly report
              </Button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-secondary/60 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="col-span-2">Day</span><span>Goal vs actual</span><span>Reports</span><span>Login</span><span className="text-right">Score</span>
              </div>
              <div className="divide-y divide-border">
                {[...weekBreakdown].reverse().map(({ date: d, pd }) => {
                  const h = historyByDate.get(d);
                  return (
                    <button key={d} type="button"
                      onClick={() => onJumpDate?.(d)}
                      title={onJumpDate ? "Jump the Admin Desk to this day" : undefined}
                      className={`w-full grid grid-cols-6 gap-2 px-3 py-2 text-xs items-center text-left transition-colors ${onJumpDate ? "hover:bg-secondary cursor-pointer" : ""} ${d === date ? "bg-primary/5" : ""}`}>
                      <span className="col-span-2 truncate">{prettyDate(d)}{d === date ? " · viewing" : ""}</span>
                      <span className={`font-mono ${pd.gapPct >= 90 ? "text-success" : pd.gapPct >= 75 ? "text-warning" : "text-destructive"}`}>
                        {pd.actual}/{pd.promise} · {pd.gapPct}%
                      </span>
                      <span className="font-mono text-muted-foreground">{pd.submittedCount}/4</span>
                      <span className={`font-mono ${h?.lateBy ? "text-warning" : "text-muted-foreground"}`}>
                        {h?.present ? fmtMin(h.loginMin ?? 0) : h?.onLeave ? "Leave" : "Absent"}
                      </span>
                      <span className={`text-right font-mono ${pd.finalScore >= 80 ? "text-success" : pd.finalScore >= 70 ? "text-warning" : "text-destructive"}`}>
                        {pd.finalScore}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {pane === "history" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
              <div className="text-sm font-medium">{sum.verdict}</div>
              <div className="text-xs text-muted-foreground mt-1">
                On time streak {sum.streak} day(s) · Late {sum.lateDays}/{sum.presentDays} · Break overrun {sum.overBreakDays} days · Avg score {sum.avgScore} · Avg reports {sum.avgReports}/4
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-secondary/60 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="col-span-2">Day</span><span>Login</span><span>Break</span><span>Reports</span><span className="text-right">Score</span>
              </div>
              <div className="divide-y divide-border">
                {[...history].reverse().map((h) => (
                  <button key={h.date} type="button"
                    onClick={() => onJumpDate?.(h.date)}
                    title={onJumpDate ? "Jump the Admin Desk to this day" : undefined}
                    className={`w-full grid grid-cols-6 gap-2 px-3 py-2 text-xs items-center text-left transition-colors ${onJumpDate ? "hover:bg-secondary cursor-pointer" : ""} ${h.date === date ? "bg-primary/5" : ""}`}>
                    <span className="col-span-2 truncate">{h.label}{h.date === date ? " · viewing" : ""}</span>
                    <span className={h.lateBy ? "text-warning font-mono" : "font-mono"}>
                      {h.present ? fmtMin(h.loginMin ?? 0) : h.onLeave ? "Leave" : "Absent"}
                      {h.lateBy ? ` +${h.lateBy}m` : ""}
                    </span>
                    <span className={h.overBreakMin ? "text-destructive font-mono" : "font-mono text-muted-foreground"}>
                      {h.present ? fmtDur(h.breakMin) : "—"}
                    </span>
                    <span className="font-mono text-muted-foreground">{h.present ? `${h.submittedCount}/4` : "—"}</span>
                    <span className={`text-right font-mono ${h.score >= 80 ? "text-success" : h.score >= 70 ? "text-warning" : "text-destructive"}`}>
                      {h.present ? h.score : "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {pane === "reports" && (
          <div className="space-y-2">
            {CHECKPOINTS.map((cp) => {
              const done = row.submitted[cp.id as CheckpointId];
              return (
                <div key={cp.id} className={`rounded-xl border px-3 py-2.5 ${done ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{cp.time} · {cp.label}</div>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${done ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}`}>
                      {done ? "Submitted" : "Missing"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {done
                      ? cp.id === "start"
                        ? `Promised ${row.promise} for the day.`
                        : cp.id === "impact"
                          ? `Closed at ${row.actual} against ${row.promise}, that is ${row.gapPct}%.`
                          : `Running at ${row.gapPct}% of the promise at this checkpoint.`
                      : "Nothing filed. Ask for the number and the reason."}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {pane === "notes" && (
          <div className="space-y-3">
            {/* Add to the record */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {NOTE_KINDS.map((k) => (
                  <button key={k} type="button" onClick={() => setNoteKind(k)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${noteKind === k ? NOTE_KIND_CLASS[k] : "border-border text-muted-foreground hover:bg-secondary"}`}>
                    {NOTE_KIND_LABEL[k]}
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[11px] text-muted-foreground">Follow up</span>
                  <Input type="date" value={noteFollowUp} onChange={(e) => setNoteFollowUp(e.target.value)}
                    className="h-7 w-[130px] text-xs" aria-label="Follow up date" />
                </div>
              </div>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder={`What was said, what ${first} committed to, what you expect next. Specific number, specific time.`}
                className="text-sm min-h-[70px]" />
              <div className="flex flex-wrap items-center gap-1.5">
                {quickNotes(first, att, row).map((n) => (
                  <button key={n} type="button" onClick={() => setNoteText(n)}
                    className="px-2.5 py-1 rounded-full border border-border text-[11px] text-muted-foreground hover:bg-secondary text-left">
                    {n.length > 72 ? `${n.slice(0, 72)}…` : n}
                  </button>
                ))}
                <Button size="sm" className="h-7 ml-auto" onClick={saveNote}>Save to record</Button>
              </div>
            </div>

            {/* 1:1 meetings */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 bg-secondary/60 flex items-center gap-2 justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">1:1 meetings ({oneOnOnes.length})</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={scheduleOneOnOne}>
                    <CalendarPlus className="w-3 h-3 mr-1" /> Schedule 1:1
                  </Button>
                  <Link to="/tower/feedback" className="text-[11px] text-primary hover:underline underline-offset-2">
                    Open 1:1 page
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-border">
                {oneOnOnes.length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground">No 1:1s on record. Schedule the first one to open the coaching loop.</div>
                )}
                {oneOnOnes.slice(0, 5).map((o) => (
                  <div key={o.id} className="px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {new Date(o.scheduledAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${o.status === "completed" ? "bg-success/10 text-success border-success/30" : o.status === "scheduled" ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}>
                        {o.status}
                      </span>
                      {o.sentiment && (
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${sentimentColor(o.sentiment)}`}>{o.sentiment}</span>
                      )}
                      <span className="ml-auto text-muted-foreground">{o.actionItems.length} action item(s)</span>
                    </div>
                    {o.notes && <p className="text-muted-foreground mt-1">{o.notes}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Written record */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 bg-secondary/60 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Written record ({personNotes.length})
              </div>
              <div className="divide-y divide-border">
                {personNotes.length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground">Nothing written yet. Feedback, warnings, praise and 1-on-1 takeaways land here.</div>
                )}
                {personNotes.map((n) => (
                  <div key={n.id} className="px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${NOTE_KIND_CLASS[n.kind]}`}>{NOTE_KIND_LABEL[n.kind]}</span>
                      <span className="text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {n.followUp && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border bg-warning/10 text-warning border-warning/30">
                          follow up {prettyDate(n.followUp)}
                        </span>
                      )}
                      <button type="button" onClick={() => { removeNote(n.id); toast.success("Note removed"); }}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete note">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="mt-1">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {pane === "action" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => mark("acknowledged")}>
                <ThumbsUp className="w-3.5 h-3.5 mr-1.5" /> Acknowledge
              </Button>
              <Button variant="outline" size="sm" onClick={() => mark("approved")}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
              </Button>
              <Button variant="outline" size="sm" onClick={() => mark("flagged")}>
                <Flag className="w-3.5 h-3.5 mr-1.5" /> Flag
              </Button>
              <div className="flex items-center gap-1.5 ml-auto">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => bump(-5)} aria-label="Mark down">
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <div className="text-center min-w-[64px]">
                  <div className="font-display text-lg leading-none font-semibold">{row.finalScore}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {row.mark.markup ? `${row.mark.markup > 0 ? "+" : ""}${row.mark.markup} admin` : "base"}
                  </div>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => bump(5)} aria-label="Mark up">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Written feedback, goes into the WhatsApp report</div>
              <Textarea
                value={row.mark.note}
                onChange={(e) => setMark(emp.id, { note: e.target.value }, date)}
                placeholder={`What should ${first} fix tomorrow? Be specific about the number and the time.`}
                className="text-sm min-h-[90px]"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickNotes(first, att, row).map((n) => (
                <button key={n} onClick={() => { setMark(emp.id, { note: n }, date); toast.success("Note added"); }}
                  className="px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground hover:bg-secondary text-left">
                  {n}
                </button>
              ))}
            </div>
            <pre className="rounded-xl border border-border bg-secondary/40 p-3 text-[11px] font-mono whitespace-pre-wrap max-h-52 overflow-y-auto">{digest}</pre>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => copy(digest, `${emp.name}'s day`)}>
            <Copy className="w-4 h-4 mr-1.5" /> Copy this person
          </Button>
          <a href={waDeepLink(digest)} target="_blank" rel="noreferrer">
            <Button size="sm"><MessageCircle className="w-4 h-4 mr-1.5" /> Send on WhatsApp</Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function quickNotes(first: string, att: DayAttendance | undefined, row: PersonDay): string[] {
  const out: string[] = [];
  if (att?.lateBy) out.push(`${first}, login was ${fmtMin(att.loginMin ?? 0)} against a 10:35 start. Be at the desk by 10:30 tomorrow.`);
  if (att?.overBreakMin) out.push(`Break ran ${fmtDur(att.breakMin)} today, over by ${fmtDur(att.overBreakMin)}. Keep it inside 45 minutes.`);
  if (row.submittedCount < 4) out.push(`${4 - row.submittedCount} report(s) missing today. File every checkpoint on the clock.`);
  if (row.gapPct < 75) out.push(`Promise was ${row.promise}, actual ${row.actual}. Bring a recovery number by 5:00 PM tomorrow.`);
  if (!out.length) out.push(`Clean day. On time, breaks inside allowance, all four reports in. Keep this rhythm.`);
  return out;
}

function Mini({ label, value, sub, onClick }: { label: string; value: string; sub?: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`rounded-xl border border-border bg-card px-3 py-2 text-left ${onClick ? "hover:border-primary/50 transition-colors cursor-pointer" : ""}`}
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-base font-semibold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
    </Tag>
  );
}

function GoalCard({ label, goal, expected, actual, pct, sub }: {
  label: string; goal: number; expected: number; actual: number; pct: number; sub: string;
}) {
  const toneCls = pct >= 95 ? "text-success" : pct >= 85 ? "text-warning" : "text-destructive";
  const barCls = pct >= 95 ? "bg-success" : pct >= 85 ? "bg-warning" : "bg-destructive";
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className={`font-display text-xl font-semibold ${toneCls}`}>{pct}%</span>
        <span className="text-xs text-muted-foreground">{actual}/{expected} so far</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
        <div className={`h-full ${barCls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-1.5">Full target {goal} · {sub}</div>
    </div>
  );
}
