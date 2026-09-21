import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Camera, ClipboardList, IndianRupee, MapPin, Plus, Search, ShieldAlert, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { READINESS_LABEL, ROLE_LABEL, smartSearch, type P360Role, type Readiness } from "../model";
import { useAllProperties360 } from "../registry";
import { useDrafts } from "../onboarding/store";
import { draftCompletenessPct } from "../onboarding/build";

/**
 * Property 360 inside the property-manager section: the same readiness mix,
 * gap counters, natural-language search and passport links as the standalone
 * control tower, plus the onboarding pipeline for new properties.
 */
export function Property360Panel() {
  const all = useAllProperties360();
  const drafts = useDrafts();
  const [q, setQ] = useState("");
  const [zone, setZone] = useState("all");
  const [readiness, setReadiness] = useState("all");
  const [role, setRole] = useState<P360Role>("team");

  const zones = useMemo(() => Array.from(new Set(all.map((p) => p.zone))).sort(), [all]);

  const list = useMemo(() => {
    let out = all;
    if (zone !== "all") out = out.filter((p) => p.zone === zone);
    if (readiness !== "all") out = out.filter((p) => p.readiness === readiness);
    return smartSearch(q, out);
  }, [all, q, zone, readiness]);

  const counts = (r: Readiness) => all.filter((p) => p.readiness === r).length;
  const sectionPct = (p: (typeof all)[number], section: string) =>
    p.completeness.find((c) => c.section === section)?.pct ?? 0;

  const gaps = [
    { label: "Missing floor maps", icon: Building2, n: all.filter((p) => sectionPct(p, "Floor map") < 60).length },
    { label: "Missing room media", icon: Camera, n: all.filter((p) => sectionPct(p, "Media") < 60).length },
    { label: "Stale inventory (>24h)", icon: ShieldAlert, n: all.filter((p) => (p.freshness.find((f) => f.field === "Live inventory")?.verifiedAgoHours ?? 0) > 24).length },
    { label: "Stale pricing (>7d)", icon: IndianRupee, n: all.filter((p) => (p.freshness.find((f) => f.field === "Pricing")?.verifiedAgoHours ?? 0) > 168).length },
    { label: "Missing landmarks", icon: MapPin, n: all.filter((p) => p.landmarks.length < 5).length },
    { label: "Missing manager", icon: Users, n: all.filter((p) => sectionPct(p, "Manager") < 100).length },
  ];

  const openDrafts = drafts.filter((d) => d.status !== "published");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Property 360</h2>
          <p className="text-sm text-muted-foreground">
            Canonical passports for every property — readiness, gaps and live beds, masked by the role you pick.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/property360/onboard"><Plus className="h-4 w-4" /> Onboard property</Link>
          </Button>
          <Select value={role} onValueChange={(v) => setRole(v as P360Role)}>
            <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABEL) as P360Role[]).map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Total properties</p>
          <p className="text-xl font-bold tabular-nums">{all.length}</p>
        </div>
        {(["P4", "P3", "P2", "P1", "P0"] as Readiness[]).map((r) => (
          <div key={r} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{r} — {READINESS_LABEL[r]}</p>
            <p className="text-xl font-bold tabular-nums">{counts(r)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {gaps.map((g) => (
          <div key={g.label} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <span className="flex items-center gap-2 text-sm">
              <g.icon className="h-4 w-4 text-muted-foreground" /> {g.label}
            </span>
            <span className={cn("text-base font-bold tabular-nums", g.n ? "text-amber-600" : "text-emerald-600")}>{g.n}</span>
          </div>
        ))}
      </div>

      {openDrafts.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Onboarding in progress</h3>
            <Badge variant="secondary">{openDrafts.length}</Badge>
          </div>
          <div className="space-y-2">
            {openDrafts.map((d) => {
              const p = draftCompletenessPct(d);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2">
                  <div>
                    <p className="text-sm font-medium">{d.identity.displayName || "Untitled property"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.location.zone || "Zone pending"} · {d.mode === "owner" ? "Owner submission" : "Team onboarding"} · {d.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={p} className="h-1.5 w-20" />
                    <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{p}%</span>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/property360/onboard" search={{ draft: d.id, mode: d.mode }}>Continue</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Try: "Female 17k near Christ", "within 2 km Ecoworld", "private room HSR"'
              className="pl-8"
            />
          </div>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Zone" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={readiness} onValueChange={setReadiness}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Readiness" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All readiness</SelectItem>
              {(["P4", "P3", "P2", "P1", "P0"] as Readiness[]).map((r) => (
                <SelectItem key={r} value={r}>{r} · {READINESS_LABEL[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">{list.length} properties</p>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {list.slice(0, 30).map((p) => (
            <Link
              key={p.pid}
              to="/property360/$pid"
              params={{ pid: p.pid }}
              className="rounded-xl border border-border bg-background p-3 transition hover:border-primary/50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{p.displayName}</p>
                  <p className="text-[11px] text-muted-foreground">{p.pid} · {p.subArea}</p>
                </div>
                <Badge variant="outline">{p.readiness}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                <Badge variant="secondary">{p.gender}</Badge>
                <Badge variant="secondary">{p.floorsCount}F · {p.roomsCount}R · {p.bedsCount}B</Badge>
                <Badge variant="secondary" className={p.availableBeds ? "text-emerald-600" : "text-muted-foreground"}>
                  {p.availableBeds} beds free
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={p.completenessPct} className="h-1.5 flex-1" />
                <span className="text-[11px] tabular-nums text-muted-foreground">{p.completenessPct}%</span>
              </div>
            </Link>
          ))}
        </div>

        {!list.length && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No property matched. Try a landmark, a budget like “16k”, or a zone name.
            <div className="mt-3"><Button variant="outline" size="sm" onClick={() => setQ("")}>Clear search</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}
