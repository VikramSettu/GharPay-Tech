import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { useMemo, useState } from "react";
import { useSupplyStore } from "@/supply-hub/lib/store";
import { useZones } from "@/supply-hub/lib/zones";
import { buildSupplyAnalytics, analyticsText, dayColLabel, type Matrix } from "@/supply-hub/lib/analytics";
import { ArrowLeft, Copy, Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line, ScatterChart, Scatter, ZAxis, Cell,
} from "recharts";

export const Route = createFileRoute("/supply-hub/heatmap")({
  head: () => ({
    meta: [
      { title: "Supply Heat Maps & Graphs — Gharpayy Supply Hub" },
      { name: "description", content: "Zone heat maps for tier, gender, price band and daily demand, plus supply-vs-demand graphs, budget gap and hottest properties." },
      { property: "og:title", content: "Supply Heat Maps & Graphs — Gharpayy" },
      { property: "og:description", content: "See where demand is burning and where supply is dead — zone by zone, day by day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HeatmapPage,
});

const WINDOWS = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

function CopyBtn({ text, label = "Copy for WhatsApp" }: { text: string; label?: string }) {
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

function heatStyle(v: number, max: number) {
  if (!v) return { background: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" };
  const t = Math.min(1, Math.sqrt(v / Math.max(1, max)));
  return {
    background: `hsl(var(--accent) / ${(0.12 + t * 0.85).toFixed(2)})`,
    color: t > 0.55 ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
  };
}

function HeatGrid({
  title, sub, matrix, colLabel, onCell, copyText,
}: {
  title: string;
  sub?: string;
  matrix: Matrix;
  colLabel?: (c: string) => string;
  onCell?: (row: string, col: string) => void;
  copyText?: string;
}) {
  return (
    <section className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
        </div>
        {copyText ? <CopyBtn text={copyText} label="Copy" /> : null}
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[420px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="w-16 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Zone</th>
              {matrix.cols.map((c) => (
                <th key={c} className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center">
                  {colLabel ? colLabel(c) : c}
                </th>
              ))}
              <th className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center">Σ</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((r) => {
              const sum = matrix.cols.reduce((s, c) => s + (matrix.cells[r.id]?.[c] || 0), 0);
              return (
                <tr key={r.id}>
                  <td className="text-[11px] font-semibold whitespace-nowrap pr-1">{r.label}</td>
                  {matrix.cols.map((c) => {
                    const v = matrix.cells[r.id]?.[c] || 0;
                    return (
                      <td key={c} className="p-0">
                        <button
                          disabled={!onCell || !v}
                          onClick={() => onCell?.(r.id, c)}
                          style={heatStyle(v, matrix.max)}
                          className="w-full h-7 rounded text-[11px] font-semibold tabular-nums transition-transform enabled:hover:scale-[1.06]"
                          title={`${r.label} · ${colLabel ? colLabel(c) : c}: ${v}`}
                        >
                          {v || ""}
                        </button>
                      </td>
                    );
                  })}
                  <td className="text-center text-[11px] font-semibold tabular-nums text-muted-foreground">{sum}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>0</span>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t} className="h-3 w-6 rounded" style={{ background: `hsl(var(--accent) / ${(0.12 + t * 0.85).toFixed(2)})` }} />
        ))}
        <span>{matrix.max}</span>
        <span className="ml-auto">Total {matrix.total}</span>
      </div>
    </section>
  );
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

function HeatmapPage() {
  const { leads, tours, bookings, properties } = useApp();
  const { items } = useSupplyStore();
  const { zones } = useZones();
  const [days, setDays] = useState(14);
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);

  const a = useMemo(
    () => buildSupplyAnalytics({ items, leads, tours, bookings, properties, zones, windowDays: days }),
    [items, leads, tours, bookings, properties, zones, days],
  );
  const windowLabel = WINDOWS.find((w) => w.days === days)?.label ?? `${days} days`;
  const bars = zoneFilter ? a.zoneBars.filter((z) => z.zone === zoneFilter) : a.zoneBars;
  const props = zoneFilter ? a.topProperties.filter((p) => p.zone === zoneFilter) : a.topProperties;

  return (
    <AppShell>
      <div className="space-y-5 pb-16">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link to="/supply-hub" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Supply Hub
            </Link>
            <h1 className="font-display text-2xl font-semibold tracking-tight mt-1">Heat Maps &amp; Graphs</h1>
            <p className="text-sm text-muted-foreground">Where supply sits, where demand burns — zone by zone, day by day, price band by price band.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              {WINDOWS.map((w) => (
                <button
                  key={w.days}
                  onClick={() => setDays(w.days)}
                  className={cn("px-2.5 py-1.5 text-xs font-medium", days === w.days ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <CopyBtn text={analyticsText(a, windowLabel)} />
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
          {[
            { label: "Live supply", value: a.totals.live },
            { label: "Disabled", value: a.totals.off },
            { label: `Leads · ${windowLabel}`, value: a.totals.leads },
            { label: "Tours", value: a.totals.tours },
            { label: "Bookings", value: a.totals.bookings },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-card p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="font-display text-xl font-semibold mt-0.5 tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setZoneFilter(null)}
            className={cn("rounded-md border px-2 py-1 text-[11px]", !zoneFilter ? "border-accent text-accent" : "border-border text-muted-foreground hover:bg-muted")}
          >
            All zones
          </button>
          {a.zoneRows.map((z) => (
            <button
              key={z.id}
              onClick={() => setZoneFilter(zoneFilter === z.id ? null : z.id)}
              className={cn("rounded-md border px-2 py-1 text-[11px] font-semibold", zoneFilter === z.id ? "border-accent text-accent" : "border-border text-muted-foreground hover:bg-muted")}
            >
              {z.short}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <HeatGrid
            title="Demand heat — leads per zone per day"
            sub={`New leads in the last ${windowLabel}`}
            matrix={a.demandMatrix}
            colLabel={dayColLabel}
            onCell={(row) => setZoneFilter(row)}
          />
          <HeatGrid
            title="Activity heat — tours per zone per day"
            sub="Tours created against zone-mapped properties"
            matrix={a.activityMatrix}
            colLabel={dayColLabel}
            onCell={(row) => setZoneFilter(row)}
          />
          <HeatGrid title="Live supply by tier" sub="Enabled properties only" matrix={a.tierMatrix} onCell={(row) => setZoneFilter(row)} />
          <HeatGrid title="Live supply by gender" matrix={a.genderMatrix} onCell={(row) => setZoneFilter(row)} />
          <HeatGrid title="Live supply by entry price band" sub="Cheapest sharing option per property" matrix={a.priceMatrix} onCell={(row) => setZoneFilter(row)} />

          <section className="rounded-lg border bg-card p-3 sm:p-4 space-y-2">
            <h2 className="text-sm font-semibold">Demand vs live supply by zone</h2>
            <p className="text-xs text-muted-foreground">Tall orange with short bars beside it = undersupplied.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="short" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="leads" name="Leads" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="live" name="Live supply" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="disabled" name="Disabled" fill="hsl(var(--muted-foreground) / 0.5)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-3 sm:p-4 space-y-2">
            <h2 className="text-sm font-semibold">Daily momentum</h2>
            <p className="text-xs text-muted-foreground">Leads, tours and bookings across {windowLabel}.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={a.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tours" name="Tours" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bookings" name="Bookings" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-3 sm:p-4 space-y-2">
            <h2 className="text-sm font-semibold">Price band: supply vs lead budgets</h2>
            <p className="text-xs text-muted-foreground">Bands where leads outnumber live stock are the money gaps.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.priceHistogram} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="band" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="live" name="Live properties" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="leads" name="Leads at this budget" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-3 sm:p-4 space-y-2">
            <h2 className="text-sm font-semibold">Budget vs price positioning</h2>
            <p className="text-xs text-muted-foreground">Each dot is a zone: X = avg lead budget, Y = avg entry price. Above the diagonal means we are priced over the market.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="avgBudget" name="Avg budget" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="number" dataKey="avgPrice" name="Avg price" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <ZAxis type="category" dataKey="short" name="Zone" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={a.budgetGap} fill="hsl(var(--accent))">
                    {a.budgetGap.map((z) => (
                      <Cell key={z.zone} fill={z.gap >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5"><Flame className="h-4 w-4 text-accent" /> Hottest properties {zoneFilter ? `· ${zoneFilter}` : ""}</h2>
            <CopyBtn
              label="Copy list"
              text={props.map((p, i) => `${i + 1}. ${p.name} (${p.zone}) — ${p.tours} tours, ${p.bookings} booked${p.enabled ? "" : " ⚠ disabled"}`).join("\n")}
            />
          </div>
          {props.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tour or booking activity in this window.</p>
          ) : (
            <div className="space-y-1.5">
              {props.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-40 sm:w-56 truncate text-xs font-medium">{p.name}</div>
                  <div className="flex-1 h-5 rounded bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded bg-accent/80"
                      style={{ width: `${Math.max(6, (p.heat / (props[0]?.heat || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="w-28 text-right text-[11px] tabular-nums text-muted-foreground">
                    {p.tours}t · {p.bookings}b {p.enabled ? "" : "⚠"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-card p-3 sm:p-4 space-y-2">
          <h2 className="text-sm font-semibold">Zone pressure board</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-1.5">Zone</th>
                  <th className="text-right">Leads</th>
                  <th className="text-right">Live</th>
                  <th className="text-right">Off</th>
                  <th className="text-right">Tours</th>
                  <th className="text-right">Booked</th>
                  <th className="text-right">Avg budget</th>
                  <th className="text-right">Avg price</th>
                  <th className="text-right">Pressure</th>
                </tr>
              </thead>
              <tbody>
                {bars.map((z) => (
                  <tr key={z.zone} className="border-t border-border/60 cursor-pointer hover:bg-muted/40" onClick={() => setZoneFilter(zoneFilter === z.zone ? null : z.zone)}>
                    <td className="py-1.5 font-semibold">{z.short}</td>
                    <td className="text-right tabular-nums">{z.leads}</td>
                    <td className="text-right tabular-nums">{z.live}</td>
                    <td className="text-right tabular-nums text-muted-foreground">{z.disabled}</td>
                    <td className="text-right tabular-nums">{z.tours}</td>
                    <td className="text-right tabular-nums">{z.bookings}</td>
                    <td className="text-right tabular-nums">{z.avgBudget ? `₹${z.avgBudget.toLocaleString("en-IN")}` : "—"}</td>
                    <td className="text-right tabular-nums">{z.avgPrice ? `₹${z.avgPrice.toLocaleString("en-IN")}` : "—"}</td>
                    <td className={cn("text-right tabular-nums font-semibold", z.pressure >= 3 && "text-destructive", z.pressure > 0 && z.pressure < 0.5 && "text-muted-foreground")}>{z.pressure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
