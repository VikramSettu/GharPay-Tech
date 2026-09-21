import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { useMemo, useState } from "react";
import { useSupplyStore } from "@/supply-hub/lib/store";
import { useZones } from "@/supply-hub/lib/zones";
import { buildDemandSupply, demandSupplyText, zoneOfText } from "@/supply-hub/lib/demand";
import { bestMatchesForLead } from "@/lib/lead-supply";
import { ArrowLeft, Copy, Check, Flame, Snowflake, AlertTriangle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/supply-hub/demand")({
  head: () => ({
    meta: [
      { title: "Supply vs Demand — Gharpayy Supply Hub" },
      { name: "description", content: "Zone-level demand vs live supply, property heatmap, supply recommendations and best-fit PGs for every hot lead." },
      { property: "og:title", content: "Supply vs Demand — Gharpayy Supply Hub" },
      { property: "og:description", content: "Where demand is outrunning supply, which properties are hot, and what to fix now." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemandPage,
});

const WINDOWS = [
  { days: 1, label: "24h" },
  { days: 3, label: "3d" },
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
];

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}

function DemandPage() {
  const { leads, tours, bookings, properties } = useApp();
  const { items } = useSupplyStore();
  const { zones } = useZones();
  const [days, setDays] = useState(7);
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);

  const ds = useMemo(
    () => buildDemandSupply({ leads, tours, bookings, properties, items, zones, windowDays: days }),
    [leads, tours, bookings, properties, items, zones, days],
  );

  const windowLabel = WINDOWS.find((w) => w.days === days)?.label ?? `${days}d`;
  const rows = ds.zones.filter((z) => z.leadsWeek > 0 || z.total > 0).sort((a, b) => b.ratio - a.ratio);
  const shown = zoneFilter ? rows.filter((r) => r.zone === zoneFilter) : rows;

  const enabledNames = useMemo(
    () => new Set(items.filter((i) => i.enabled).map((i) => i.pg.name.toLowerCase())),
    [items],
  );

  const hotLeads = useMemo(() => {
    const since = Date.now() - days * 86400000;
    return leads
      .filter((l) => new Date(l.createdAt).getTime() >= since && l.stage !== "dropped" && l.stage !== "booked")
      .filter((l) => !zoneFilter || zoneOfText(l.preferredArea, zones) === zoneFilter)
      .sort((a, b) => (b.intent === "hot" ? 1 : 0) - (a.intent === "hot" ? 1 : 0) || b.confidence - a.confidence)
      .slice(0, 8)
      .map((l) => ({
        lead: l,
        matches: bestMatchesForLead(l, 6).filter((m) => enabledNames.has(m.propertyName.toLowerCase())).slice(0, 3),
      }));
  }, [leads, days, zoneFilter, zones, enabledNames]);

  const verdictTone: Record<string, string> = {
    undersupplied: "border-destructive/40 bg-destructive/5 text-destructive",
    "no-supply": "border-destructive/50 bg-destructive/10 text-destructive",
    oversupplied: "border-warning/40 bg-warning/10 text-warning-foreground",
    "no-demand": "border-warning/30 bg-warning/5 text-warning-foreground",
    balanced: "border-border bg-card text-muted-foreground",
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <Link to="/supply-hub" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
          <ArrowLeft className="h-4 w-4" /> Supply Hub
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">Demand ↔ Supply bridge</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Supply vs demand by zone</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live CRM demand joined to the zone-mapped catalogue — where to add stock, what to re-enable, who to match now.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              {WINDOWS.map((w) => (
                <button
                  key={w.days}
                  onClick={() => setDays(w.days)}
                  className={cn("px-3 py-1.5 text-xs font-medium", days === w.days ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <CopyBtn text={demandSupplyText(ds, `last ${windowLabel}`)} label="Copy board" />
          </div>
        </header>

        {/* Recommendations */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold inline-flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Supply recommendations
            <span className="text-xs text-muted-foreground font-normal">({ds.recommendations.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ds.recommendations.map((r) => (
              <button
                key={r.id}
                onClick={() => setZoneFilter(r.zone === zoneFilter ? null : r.zone)}
                className={cn(
                  "text-left rounded-lg border p-3",
                  r.severity === "critical" ? "border-destructive/40 bg-destructive/5" : r.severity === "warn" ? "border-warning/40 bg-warning/5" : "border-border bg-card",
                )}
              >
                <div className="text-sm font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.detail}</div>
              </button>
            ))}
            {ds.recommendations.length === 0 && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                No supply gaps flagged in this window.
              </div>
            )}
          </div>
        </section>

        {/* Zone gap grid */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold inline-flex items-center gap-1.5"><Activity className="h-4 w-4 text-accent" /> Zone gap board</h2>
            {zoneFilter && (
              <button onClick={() => setZoneFilter(null)} className="text-xs text-accent hover:underline">Clear {zoneFilter} filter</button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {shown.map((z) => (
              <button
                key={z.zone}
                onClick={() => setZoneFilter(z.zone === zoneFilter ? null : z.zone)}
                className={cn("text-left rounded-xl border p-4 space-y-3", verdictTone[z.verdict] ?? "border-border bg-card")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display font-semibold text-foreground">{z.label}</div>
                    <div className="text-[11px] uppercase tracking-wider">{z.verdict.replace("-", " ")}</div>
                  </div>
                  <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold", z.accent)}>{z.short}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <Cell label="Leads" value={z.leadsWeek} extra={z.leadsHot ? `${z.leadsHot}🔥` : undefined} />
                  <Cell label="Live" value={z.live} />
                  <Cell label="Disabled" value={z.disabled} />
                  <Cell label="Tours" value={z.toursWeek} />
                  <Cell label="Booked" value={z.bookingsWeek} />
                  <Cell label="Avg ₹" value={z.avgBudget ? `${Math.round(z.avgBudget / 1000)}k` : "—"} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{z.note}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Heatmap */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold inline-flex items-center gap-1.5 mb-2"><Flame className="h-4 w-4 text-destructive" /> Hottest properties</h2>
            <div className="space-y-1.5">
              {ds.heat.filter((h) => !zoneFilter || h.zone === zoneFilter).slice(0, 12).map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2.5 py-2 text-xs">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{h.name} {!h.enabled && <span className="text-destructive">· disabled</span>}</div>
                    <div className="text-[10px] text-muted-foreground">{h.zone} · {h.area}</div>
                  </div>
                  <div className="font-mono text-[11px] whitespace-nowrap">{h.inquiries}q · {h.tours}t · {h.bookings}b</div>
                </div>
              ))}
              {ds.heat.length === 0 && <p className="text-xs text-muted-foreground">No property demand recorded in this window.</p>}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold inline-flex items-center gap-1.5 mb-2"><Snowflake className="h-4 w-4 text-accent" /> Zero-demand properties</h2>
            <p className="text-[11px] text-muted-foreground mb-2">{ds.cold.length} live/listed properties got no inquiry, tour or booking in this window.</p>
            <div className="max-h-64 overflow-auto space-y-1">
              {ds.cold.filter((c) => !zoneFilter || c.zone === zoneFilter).slice(0, 60).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded bg-background/60">
                  <span className="truncate">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">{c.zone}</span>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <CopyBtn text={ds.cold.map((c) => `${c.name} (${c.zone})`).join("\n")} label="Copy list" />
            </div>
          </div>
        </section>

        {/* Lead → best-fit supply */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Best matching supply for live leads</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hotLeads.map(({ lead, matches }) => (
              <div key={lead.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{lead.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {lead.preferredArea} · ₹{lead.budget.toLocaleString("en-IN")} · {lead.intent} · move-in {new Date(lead.moveInDate).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <CopyBtn
                    label="WA"
                    text={`Hi ${lead.name}, based on ${lead.preferredArea} and your ₹${lead.budget} budget, here are the best fits:\n\n${matches
                      .map((m, i) => `${i + 1}. ${m.propertyName} — ${m.area} (${m.label})`)
                      .join("\n")}`}
                  />
                </div>
                <div className="space-y-1">
                  {matches.map((m) => (
                    <Link
                      key={m.propertyId}
                      to="/supply-hub/$id"
                      params={{ id: m.propertyId }}
                      className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1.5 text-xs hover:bg-muted"
                    >
                      <span className="truncate">{m.propertyName} <span className="text-muted-foreground">· {m.area}</span></span>
                      <span className="font-mono text-[11px] text-accent">{m.score}</span>
                    </Link>
                  ))}
                  {matches.length === 0 && <p className="text-[11px] text-muted-foreground">No live property fits — supply gap for this lead.</p>}
                </div>
              </div>
            ))}
            {hotLeads.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No live leads in this window.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Cell({ label, value, extra }: { label: string; value: string | number; extra?: string }) {
  return (
    <div className="rounded-md bg-background/60 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium font-mono text-foreground">
        {value}
        {extra && <span className="ml-1 text-destructive text-[10px]">{extra}</span>}
      </div>
    </div>
  );
}
