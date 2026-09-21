import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import type { PersonNow } from "@/founder/lib/brain/people-now";
import type { Metric } from "@/founder/lib/brain/engine";
import { getMark, setMark, STATE_CLASS, STATE_LABEL, type MarkState } from "@/founder/lib/admin/admin-desk-store";
import { useAuditLog } from "@/lib/audit-log";

const toneClass: Record<string, string> = {
  good: "border-emerald-500/40 bg-emerald-500/5",
  warn: "border-amber-500/40 bg-amber-500/5",
  bad: "border-destructive/40 bg-destructive/5",
  plain: "",
};

export function PersonSheet({
  person,
  onClose,
  onMetric,
  rangeLabel,
}: {
  person: PersonNow | null;
  onClose: () => void;
  onMetric: (p: PersonNow, m: Metric) => void;
  rangeLabel: string;
}) {
  const [note, setNote] = useState("");
  const [, force] = useState(0);
  const log = useAuditLog((s) => s.log);
  if (!person) return null;
  const mark = getMark(person.id);

  const act = (patch: Parameters<typeof setMark>[1], label: string) => {
    setMark(person.id, patch);
    log({
      actorId: "founder-admin",
      actorName: "Founder Admin",
      entityType: "lead",
      entityId: person.id,
      action: label,
      after: patch,
      summary: `${label} — ${person.name}`,
    });
    force((n) => n + 1);
    toast.success(`${label} — ${person.name}`);
  };

  const goals = [
    { label: "Today", target: 6, done: person.v.toursDone + person.v.bookings * 2 },
    { label: "This week", target: 30, done: person.v.toursDone * 4 + person.v.bookings * 6 },
    { label: "This month", target: 120, done: person.v.toursDone * 12 + person.v.bookings * 20 },
  ];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="px-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            {person.name}
            <Badge variant="outline">{person.grade}</Badge>
            <Badge className={STATE_CLASS[mark.state]} variant="outline">{STATE_LABEL[mark.state]}</Badge>
          </SheetTitle>
          <SheetDescription>
            {person.role} · {person.zone} · last seen {person.lastSeen} · window {rangeLabel}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-10 space-y-4">
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium">{person.verdict}</div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
              {[
                ["Score", person.score],
                ["Effort", person.effort],
                ["Outcome", person.outcome],
                ["Discipline", person.discipline],
              ].map(([l, val]) => (
                <div key={l as string} className="rounded border p-2">
                  <div className="text-lg font-bold">{val as number}</div>
                  <div className="text-muted-foreground">{l as string}</div>
                </div>
              ))}
            </div>
            {person.flags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {person.flags.map((f) => (
                  <Badge key={f} variant="destructive" className="text-[10px]">{f}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* admin actions */}
          <div className="rounded-md border p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin actions</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["acknowledged", "approved", "flagged", "pending"] as MarkState[]).map((s) => (
                <Button key={s} size="sm" variant={mark.state === s ? "default" : "outline"} className="h-8 text-xs"
                  onClick={() => act({ state: s }, `Marked ${STATE_LABEL[s]}`)}>
                  {STATE_LABEL[s]}
                </Button>
              ))}
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => act({ markup: mark.markup + 5 }, "Mark-up +5")}>Mark-up +5</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => act({ markup: mark.markup - 5 }, "Mark-up −5")}>Mark-up −5</Button>
              <Badge variant="secondary" className="text-xs">Mark-up {mark.markup >= 0 ? "+" : ""}{mark.markup}</Badge>
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for this person…" className="h-8 text-xs" />
              <Button size="sm" className="h-8 text-xs" disabled={!note.trim()} onClick={() => { act({ note: `${mark.note ? mark.note + " | " : ""}${note.trim()}` }, "Note added"); setNote(""); }}>
                Save
              </Button>
            </div>
            {mark.note && <div className="mt-2 rounded bg-muted p-2 text-xs">{mark.note}</div>}
          </div>

          {/* goals */}
          <div className="rounded-md border p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Goal ladder</div>
            <div className="mt-2 space-y-2">
              {goals.map((g) => {
                const p = Math.min(100, Math.round((g.done / g.target) * 100));
                return (
                  <div key={g.label}>
                    <div className="flex justify-between text-xs">
                      <span>{g.label}</span>
                      <span className="text-muted-foreground">{g.done}/{g.target} — {p >= 100 ? "Done" : p >= 60 ? "On track" : p >= 30 ? "Falling behind" : "Missed"}</span>
                    </div>
                    <Progress value={p} className="h-1.5 mt-1" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* checkpoints */}
          <div className="rounded-md border p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Day rhythm</div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {person.checkpoints.map((c) => (
                <div key={c.id} className={`rounded border p-2 text-xs ${c.state === "done" ? "border-emerald-500/40" : c.state === "late" ? "border-amber-500/40" : c.state === "missed" ? "border-destructive/40" : ""}`}>
                  <div className="font-medium">{c.at} {c.label}</div>
                  <div className="text-[11px] capitalize text-muted-foreground">{c.state}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{c.proof}</div>
                </div>
              ))}
            </div>
          </div>

          {/* metrics — every one clickable */}
          {person.metrics.map((g) => (
            <div key={g.group}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {g.items.map((it) => (
                  <button key={it.key} onClick={() => onMetric(person, it)}
                    className={`rounded-md border p-2 text-left transition hover:bg-muted ${toneClass[it.tone ?? "plain"]}`}>
                    <div className="text-lg font-bold">
                      {it.key === "revenue" ? `₹${Math.round(it.value / 1000)}k` : it.value}{it.suffix ?? ""}
                    </div>
                    <div className="text-[11px] leading-tight text-muted-foreground">{it.label}</div>
                    <div className="mt-0.5 text-[10px] text-primary">{it.rows.length} to open →</div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* timeline */}
          <div className="rounded-md border p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity timeline ({person.timeline.length})</div>
            <div className="mt-2 space-y-1">
              {person.timeline.length === 0 && <div className="text-xs text-muted-foreground">No activity in this window — that itself is the finding.</div>}
              {person.timeline.map((t, i) => (
                <div key={i} className="flex gap-2 border-b py-1 text-xs last:border-0">
                  <span className="w-12 shrink-0 text-muted-foreground">{t.time}</span>
                  <span className="flex-1">{t.text}</span>
                  {t.leadId && (
                    <Link to="/leads" search={{ lead: t.leadId } as never} className="shrink-0 text-primary">open</Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
