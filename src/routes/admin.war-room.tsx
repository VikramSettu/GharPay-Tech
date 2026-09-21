/**
 * WAR ROOM — every live risk turned into an owned decision.
 *
 * Left: the ranked alerts of the current scope with one-click "Own it".
 * Right: the accountability ledger — who promised what, by which checkpoint,
 * and whether it closed. Everything clicks into the shared drill/person views.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ClipboardCopy, Gavel, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAdminFocus } from "@/founder/lib/admin-focus";
import { buildAlerts, type Alert } from "@/founder/lib/brain/watchtower";
import { decisionsWhatsApp, nextCheckpoint, useDecisions } from "@/founder/lib/admin/decisions-store";

export const Route = createFileRoute("/admin/war-room")({
  head: () => ({
    meta: [
      { title: "War Room — Founder Admin | Gharpayy" },
      { name: "description", content: "Turn every live risk into an owned decision with a due checkpoint, then track what actually closed." },
      { property: "og:title", content: "War Room — Founder Admin | Gharpayy" },
      { property: "og:description", content: "Ranked risks, one-click ownership and an accountability ledger for the whole company." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WarRoom,
});

const clock = (ts: number) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

function WarRoom() {
  const f = useAdminFocus();
  const dec = useDecisions();
  const [tab, setTab] = useState<"open" | "closed">("open");

  const alerts = useMemo(
    () => buildAlerts(f.company, f.zone ? [f.zone] : f.zones, f.people),
    [f.company, f.zone, f.zones, f.people],
  );

  const own = (a: Alert) => {
    const gate = nextCheckpoint();
    dec.add({
      title: a.title,
      why: a.because,
      fix: a.fix,
      owner: a.person?.name ?? (f.zone ? `${f.zone.name} manager` : "Founder"),
      ownerId: a.person?.id,
      zone: a.zone,
      count: a.count,
      money: a.money,
      level: a.level,
      dueAt: gate.at,
      sourceId: a.id,
    });
    toast.success(`Owned — due by ${gate.label} (${clock(gate.at)})`);
  };

  const open = dec.items.filter((d) => d.status === "open");
  const closed = dec.items.filter((d) => d.status !== "open");
  const list = tab === "open" ? open : closed;
  const ownedSources = new Set(open.map((d) => d.sourceId));
  const overdue = open.filter((d) => d.dueAt < Date.now());

  if (!f.hydrated) return <div className="p-6 text-sm text-muted-foreground">Reading the CRM…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">
          War Room <span className="text-sm font-normal text-muted-foreground">· {f.zone ? f.zone.name : "all zones"} · {f.range.label}</span>
        </h1>
        <Badge variant={overdue.length ? "destructive" : "outline"} className="text-[10px]">
          {open.length} open · {overdue.length} past due
        </Badge>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs"
          onClick={() => { void navigator.clipboard?.writeText(decisionsWhatsApp(dec.items, f.range.label)); toast.success("War Room copied for WhatsApp"); }}>
          <ClipboardCopy className="mr-1 h-3 w-3" /> Copy war room
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            <div className="font-semibold">Decide now ({alerts.length})</div>
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
            {alerts.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nothing to decide — this scope is clean.
              </div>
            )}
            {alerts.map((a) => (
              <div key={a.id} className={`rounded-md border p-2.5 ${a.level === "critical" ? "border-destructive/50 bg-destructive/5" : a.level === "warning" ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={a.level === "critical" ? "destructive" : a.level === "warning" ? "secondary" : "outline"} className="text-[10px] uppercase">{a.level}</Badge>
                  <div className="text-sm font-semibold">{a.title}</div>
                  <Badge variant="outline" className="text-[10px]">{a.zone}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{a.because} · {a.fix}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Button size="sm" className="h-7 text-xs" disabled={ownedSources.has(a.id)} onClick={() => own(a)}>
                    {ownedSources.has(a.id) ? "Owned" : "Own it"}
                  </Button>
                  {a.rows.length > 0 && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => f.openDrill(a.title, a.rows, a.because)}>
                      {a.rows.length} customers
                    </Button>
                  )}
                  {a.person && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => f.openPerson(a.person!)}>
                      {a.person.name} 360
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="font-semibold">Accountability ledger</div>
            {(["open", "closed"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] capitalize ${tab === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {t} {t === "open" ? open.length : closed.length}
              </button>
            ))}
            {closed.length > 0 && (
              <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => dec.clearClosed()}>
                <Trash2 className="mr-1 h-3 w-3" /> Clear closed
              </Button>
            )}
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
            {list.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                {tab === "open" ? "No open decisions. Own an alert on the left." : "Nothing closed yet."}
              </div>
            )}
            {list.map((d) => {
              const late = d.status === "open" && d.dueAt < Date.now();
              return (
                <div key={d.id} className={`rounded-md border p-2.5 ${late ? "border-destructive/60 bg-destructive/5" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {d.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    {d.status === "dropped" && <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                    <div className={`text-sm font-semibold ${d.status !== "open" ? "text-muted-foreground line-through" : ""}`}>{d.title}</div>
                    <Badge variant="outline" className="text-[10px]">{d.zone}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {d.owner} · due {clock(d.dueAt)}{late ? " · PAST DUE" : ""} · {d.fix}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {d.status === "open" ? (
                      <>
                        <Button size="sm" className="h-7 text-xs" onClick={() => { dec.setStatus(d.id, "done"); toast.success("Closed"); }}>Mark done</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => dec.setStatus(d.id, "dropped")}>Drop</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => dec.setStatus(d.id, "open")}>Reopen</Button>
                    )}
                    {d.ownerId && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => { const p = f.allPeople.find((x) => x.id === d.ownerId); if (p) f.openPerson(p); }}>
                        Open person
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
