/**
 * BATTLEFIELD BAR — one control strip shared by every admin tab.
 *
 * Time window, comparison, zone and the focused person live here, so the scope
 * you pick on one tab is the scope every other tab uses. It also carries a
 * universal search (any lead, phone, person or zone) that opens the drill
 * drawer from anywhere, and quick jumps to every admin surface.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardCopy, MapPin, Search, Target, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminFocus } from "@/founder/lib/admin-focus";
import { COMPARE_OPTIONS, PERIOD_OPTIONS, rangeLabel, type CompareKey, type PeriodKey } from "@/founder/lib/brain/timeengine";
import { buildBrain, searchBrain, DEFAULT_FILTERS } from "@/founder/lib/brain/engine";
import { personWhatsApp, zoneWhatsApp, zoneLeagueWhatsApp } from "@/founder/lib/brain/people-now";
import { useDecisions } from "@/founder/lib/admin/decisions-store";

const JUMPS = [
  { to: "/admin", label: "Desk" },
  { to: "/admin/briefing", label: "Briefing" },
  { to: "/admin/watchtower", label: "Watchtower" },
  { to: "/admin/war-room", label: "War Room" },
  { to: "/admin/simulator", label: "Simulator" },
  { to: "/admin/sheet", label: "Sheet" },
  { to: "/admin/command-center", label: "Command" },
  { to: "/admin/ops", label: "Ops" },
  { to: "/admin/console", label: "Console" },
  { to: "/admin/flow", label: "Role Flow" },
  { to: "/admin/playbooks", label: "Playbooks" },
  { to: "/admin/report-center", label: "Reports" },
] as const;


export function BattlefieldBar() {
  const f = useAdminFocus();
  const [query, setQuery] = useState("");
  const decisions = useDecisions((s) => s.items);
  const openDecisions = decisions.filter((d) => d.status === "open");
  const pastDue = openDecisions.filter((d) => d.dueAt < Date.now()).length;


  const results = useMemo(() => {
    if (!query.trim() || !f.hydrated) return [];
    const model = buildBrain({ ...DEFAULT_FILTERS, zone: f.zoneName }, "combined", undefined, Date.now());
    return searchBrain(model, query).slice(0, 12);
  }, [query, f.zoneName, f.hydrated]);

  if (!f.hydrated) return null;

  return (
    <section className="sticky top-[64px] z-30 rounded-lg border bg-card/95 p-2.5 backdrop-blur">
      {/* time */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PERIOD_OPTIONS.filter((p) => p.id !== "custom").map((p) => (
          <button key={p.id} onClick={() => f.setPeriod(p.id as PeriodKey)}
            className={`rounded-full border px-2.5 py-1 text-xs ${f.period === p.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {p.label}
          </button>
        ))}
        <span className="ml-1 text-[11px] text-muted-foreground">{rangeLabel(f.range)}</span>
        <button onClick={() => f.setShowCmp(!f.showCmp)}
          className={`rounded-full border px-2 py-0.5 text-[10px] ${f.showCmp ? "border-primary/50 text-primary" : "text-muted-foreground"}`}>
          compare {f.showCmp ? "on" : "off"}
        </button>
        {f.showCmp && (
          <select value={f.cmpKey} onChange={(e) => f.setCmpKey(e.target.value as CompareKey)}
            className="rounded border bg-background px-2 py-0.5 text-[11px]">
            {COMPARE_OPTIONS.map((c) => <option key={c.id} value={c.id}>vs {c.label}</option>)}
          </select>
        )}
        <div className="relative ml-auto min-w-[220px] flex-1 md:max-w-[420px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-8 pr-12 text-xs"
            placeholder="Search anything — lead, phone, person, zone, “tours without quotation”" />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border px-1 text-[10px] text-muted-foreground">⌘K</span>

          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-9 z-40 max-h-72 overflow-y-auto rounded-md border bg-card shadow-xl">
              {results.map((r) => (
                <button key={r.kind + r.id}
                  onClick={() => { f.openDrill(r.title, [r], r.subtitle); setQuery(""); }}
                  className="w-full border-b px-3 py-2 text-left text-xs last:border-0 hover:bg-muted">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-muted-foreground"> · {r.subtitle} · {r.owner} · {r.zone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* zones */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        <button onClick={() => f.setZoneName("all")}
          className={`rounded-full border px-2.5 py-1 text-xs ${f.zoneName === "all" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
          All zones
        </button>
        {f.zones.map((z) => (
          <button key={z.name} onClick={() => f.setZoneName(f.zoneName === z.name ? "all" : z.name)}
            className={`rounded-full border px-2.5 py-1 text-xs ${f.zoneName === z.name ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {z.name}<span className="ml-1 opacity-70">{z.total.v.bookings ?? 0}b</span>
            {z.zeros.length > 0 && <span className="ml-1 text-destructive">●</span>}
          </button>
        ))}
        {f.total && (
          <button onClick={() => f.openPerson(f.total!)} className="rounded-full border px-2.5 py-1 text-xs text-primary hover:bg-muted">
            {f.zone ? `${f.zone.name} 360` : "Company 360"} →
          </button>
        )}
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs"
          onClick={() => {
            const text = f.zone ? zoneWhatsApp(f.zone, f.range.label) : zoneLeagueWhatsApp(f.zones, f.range.label);
            void navigator.clipboard?.writeText(text);
            toast.success("Copied for WhatsApp");
          }}>
          <ClipboardCopy className="mr-1 h-3 w-3" /> Copy scope
        </Button>
      </div>

      {/* focused person + jumps */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
        {f.focus ? (
          <>
            <Target className="h-3.5 w-3.5 text-primary" />
            <button onClick={() => f.openPerson(f.focus!)} className="text-xs font-semibold text-primary hover:underline">
              {f.focus.name}
            </button>
            <Badge variant="outline" className="text-[10px]">{f.focus.zone}</Badge>
            <Badge variant="outline" className="text-[10px]">grade {f.focus.grade}</Badge>
            <span className="text-[11px] text-muted-foreground">
              {f.focus.v.calls ?? 0} calls · {f.focus.v.toursDone ?? 0} tours done · {f.focus.v.bookings ?? 0} bookings · {f.focus.v.untouched ?? 0} untouched
            </span>
            <button className="text-[11px] text-primary"
              onClick={() => { void navigator.clipboard?.writeText(personWhatsApp(f.focus!, f.range.label)); toast.success(`${f.focus!.name} copied`); }}>
              copy
            </button>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => f.setPersonId(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">No person focused — click any name anywhere to lock them across every tab.</span>
          </>
        )}
        <Link to="/admin/war-room" className="ml-3 rounded-full border px-2 py-0.5 text-[10px] hover:bg-muted">
          {openDecisions.length
            ? `${openDecisions.length} open decision${openDecisions.length === 1 ? "" : "s"}${pastDue ? ` · ${pastDue} past due` : ""}`
            : "No open decisions"}
        </Link>
        <div className="ml-auto flex flex-wrap gap-1">
          {JUMPS.map((j) => (
            <Link key={j.to} to={j.to} className="rounded border px-2 py-0.5 text-[10px] hover:bg-muted">{j.label}</Link>
          ))}
        </div>
      </div>
    </section>
  );
}
