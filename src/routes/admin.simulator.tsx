/**
 * SIMULATOR — move a lever, see the bookings.
 *
 * Starts from the live conversion rates of the current scope (zone or whole
 * company), lets the founder move any lever, and answers both directions:
 * what these rates produce, and how many calls a booking target really needs.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ClipboardCopy, FlaskConical, RotateCcw, Target } from "lucide-react";
import { toast } from "sonner";
import { useAdminFocus } from "@/founder/lib/admin-focus";
import { baselineLevers, bestLever, callsNeeded, simulate, type Levers } from "@/founder/lib/brain/simulator";

export const Route = createFileRoute("/admin/simulator")({
  head: () => ({
    meta: [
      { title: "Simulator — Founder Admin | Gharpayy" },
      { name: "description", content: "What-if planner on live conversion rates: move any lever and see bookings, check-ins and revenue change." },
      { property: "og:title", content: "Simulator — Founder Admin | Gharpayy" },
      { property: "og:description", content: "Live-rate what-if planner and reverse booking-target calculator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Simulator,
});

const LEVERS: { key: keyof Levers; label: string; max: number; suffix: string }[] = [
  { key: "callsPerPerson", label: "Calls per person", max: 150, suffix: "" },
  { key: "connectPct", label: "Connect rate", max: 100, suffix: "%" },
  { key: "tourBookPct", label: "Connect → tour booked", max: 100, suffix: "%" },
  { key: "tourShowPct", label: "Tour show-up", max: 100, suffix: "%" },
  { key: "quotePct", label: "Tour → quotation", max: 100, suffix: "%" },
  { key: "bookingPct", label: "Quotation → booking", max: 100, suffix: "%" },
  { key: "checkinPct", label: "Booking → check-in", max: 100, suffix: "%" },
];

function Simulator() {
  const f = useAdminFocus();
  const peopleCount = f.people.length;

  const base = useMemo(() => baselineLevers(f.total, peopleCount), [f.total, peopleCount]);
  const [levers, setLevers] = useState<Levers>(base);
  const [target, setTarget] = useState(10);

  useEffect(() => { setLevers(base); }, [base]);

  const result = useMemo(() => simulate(levers, base), [levers, base]);
  const need = useMemo(() => callsNeeded(levers, target), [levers, target]);
  const ranked = useMemo(() => bestLever(levers), [levers]);

  const set = (k: keyof Levers, v: number) => setLevers((s) => ({ ...s, [k]: v }));

  const copyText = [
    `GHARPAYY SIMULATION — ${f.zone ? f.zone.name : "all zones"} · ${f.range.label}`,
    `${levers.people} people × ${levers.callsPerPerson} calls`,
    ...result.steps.map((s) => `${s.label}: ${s.value} (live ${s.base})`),
    "",
    `Bookings ${result.bookings} vs live ${result.baseBookings} (${result.liftPct >= 0 ? "+" : ""}${result.liftPct}%)`,
    `Check-ins ${result.checkins} · revenue ₹${result.revenue.toLocaleString("en-IN")}`,
    "",
    `For ${target} bookings: ${need.calls} calls (${need.perPerson}/person) at ${need.chainPct}% end-to-end`,
    `Biggest lever: ${ranked[0]?.label} (+${ranked[0]?.gain} bookings for +10pt)`,
  ].join("\n");

  if (!f.hydrated) return <div className="p-6 text-sm text-muted-foreground">Reading the CRM…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">
          Simulator <span className="text-sm font-normal text-muted-foreground">· {f.zone ? f.zone.name : "all zones"} · {f.range.label}</span>
        </h1>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setLevers(base)}>
          <RotateCcw className="mr-1 h-3 w-3" /> Reset to live
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs"
          onClick={() => { void navigator.clipboard?.writeText(copyText); toast.success("Simulation copied for WhatsApp"); }}>
          <ClipboardCopy className="mr-1 h-3 w-3" /> Copy
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-3">
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <div className="font-semibold">Levers</div>
            <span className="text-xs text-muted-foreground">starting from live rates</span>
          </div>

          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className="w-40 text-muted-foreground">People on the desk</span>
            <Input type="number" min={1} value={levers.people} className="h-8 w-20"
              onChange={(e) => set("people", Math.max(1, Number(e.target.value) || 1))} />
            <span className="text-xs text-muted-foreground">live {peopleCount}</span>
          </div>

          <div className="space-y-3">
            {LEVERS.map((l) => {
              const value = levers[l.key] as number;
              const live = base[l.key] as number;
              return (
                <div key={String(l.key)}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{l.label}</span>
                    <span className="font-semibold">
                      {value}{l.suffix}
                      <span className="ml-2 text-[11px] font-normal text-muted-foreground">live {live}{l.suffix}</span>
                    </span>
                  </div>
                  <Slider className="mt-1.5" min={1} max={l.max} step={1} value={[value]}
                    onValueChange={(v) => set(l.key, v[0] ?? value)} />
                </div>
              );
            })}
            <div className="flex items-center gap-2 text-sm">
              <span className="w-40 text-muted-foreground">Avg monthly ticket ₹</span>
              <Input type="number" min={0} value={levers.avgTicket} className="h-8 w-28"
                onChange={(e) => set("avgTicket", Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-3">
            <div className="mb-2 font-semibold">Outcome</div>
            <div className="grid grid-cols-3 gap-2">
              <Box label="Bookings" value={String(result.bookings)} sub={`live ${result.baseBookings}`} tone={result.liftPct >= 0 ? "good" : "bad"} />
              <Box label="Check-ins" value={String(result.checkins)} sub={`${result.liftPct >= 0 ? "+" : ""}${result.liftPct}% vs live`} />
              <Box label="Revenue" value={`₹${(result.revenue / 1000).toFixed(0)}k`} sub="at avg ticket" />
            </div>
            <div className="mt-3 space-y-1">
              {result.steps.map((s) => (
                <div key={s.key} className="flex items-center gap-2 text-xs">
                  <span className="w-32 text-muted-foreground">{s.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                    <div className="h-full bg-primary"
                      style={{ width: `${Math.min(100, (s.value / Math.max(1, result.steps[0]?.value ?? 1)) * 100)}%` }} />
                  </div>
                  <span className="w-20 text-right font-medium">{s.value}</span>
                  <span className="w-16 text-right text-muted-foreground">live {s.base}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-3">
            <div className="mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <div className="font-semibold">Reverse plan</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Booking target</span>
              <Input type="number" min={1} value={target} className="h-8 w-20"
                onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))} />
              <Badge variant="secondary" className="text-[11px]">{need.chainPct}% end-to-end</Badge>
            </div>
            <div className="mt-2 text-sm">
              Needs <span className="font-bold">{Number.isFinite(need.calls) ? need.calls : "—"}</span> calls
              {" "}(<span className="font-semibold">{Number.isFinite(need.perPerson) ? need.perPerson : "—"}</span> per person across {levers.people}).
            </div>
            <div className="mt-3 space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Biggest lever (+10pt)</div>
              {ranked.map((r) => (
                <div key={String(r.key)} className="flex items-center gap-2 text-xs">
                  <span className="flex-1">{r.label}</span>
                  <Badge variant={r.gain > 0 ? "default" : "outline"} className="text-[10px]">+{r.gain} bookings</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Box({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-destructive" : ""}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
