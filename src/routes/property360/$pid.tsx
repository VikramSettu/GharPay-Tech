import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin, Building2, Users, ShieldCheck, Phone, MessageSquare, ArrowUpRight, Share2, Camera, FileText, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  READINESS_LABEL, ROLE_LABEL, canSee, type P360Role,
} from "@/property360/model";
import { useAllProperties360 } from "@/property360/registry";
import {
  AccessTag, CompletenessPanel, FloorMap, Gated, RoomSheet, ScoreBar, useRoomSheet,
} from "@/property360/components/Bits";

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function freshTone(ago: number, recheck: number) {
  if (ago <= recheck * 0.6) return "text-emerald-600";
  if (ago <= recheck) return "text-amber-600";
  return "text-destructive";
}

function PropertyPage() {
  const { pid } = useParams({ from: "/property360/$pid" });
  const all = useAllProperties360();
  const p = useMemo(() => all.find((x) => x.pid === pid || x.legacyId === pid), [all, pid]);
  const [role, setRole] = useState<P360Role>("team");
  const [floorNo, setFloorNo] = useState(0);
  const { room, setRoom } = useRoomSheet();

  if (!p) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">Property not found.</p>
        <Link to="/property360" className="text-sm underline">Back to Property Control Tower</Link>
      </div>
    );
  }

  const floor = p.floors.find((f) => f.no === floorNo) ?? p.floors[0];
  const bestRoom = p.floors.flatMap((f) => f.rooms).find((r) => r.status === "available") ?? p.floors[0].rooms[0];
  const altLink = (legacyId: string) => all.find((x) => x.legacyId === legacyId)?.pid;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{p.displayName}</h1>
              <Badge variant="outline">{p.pid}</Badge>
              <Badge>{p.readiness} · {READINESS_LABEL[p.readiness]}</Badge>
              <Badge variant="secondary">{p.priority}</Badge>
              <Badge variant="secondary">{p.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <Gated role={role} level="internal_team" label="Legal name hidden">
                <span>Actual name: {p.actualName} · </span>
              </Gated>
              {p.zone} → {p.subArea} → {p.microLocation}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.gender} · {p.tier} · {p.floorsCount} floors · {p.roomsCount} rooms · {p.bedsCount} beds ·{" "}
              <span className={p.availableBeds ? "text-emerald-600" : ""}>{p.availableBeds} available now</span> · last verified {p.lastVerifiedDays}d ago
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as P360Role)}>
              <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABEL) as P360Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" asChild>
              <a href={p.mapsLink || "#"} target="_blank" rel="noreferrer"><MapPin className="mr-1.5 h-3.5 w-3.5" /> Map</a>
            </Button>
            <Button size="sm"><Share2 className="mr-1.5 h-3.5 w-3.5" /> Share pack</Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Progress value={p.completenessPct} className="h-1.5 max-w-sm flex-1" />
          <span className="text-xs tabular-nums text-muted-foreground">{p.completenessPct}% complete</span>
        </div>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap justify-start">
          {["overview", "location", "building", "rooms", "fit", "commercials", "people", "media", "faq", "health"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Why this property">
              <ul className="space-y-1 text-sm">{p.why.map((w) => <li key={w}>✓ {w}</li>)}</ul>
            </Section>
            <Section title="Why not / limitations" right={<AccessTag level="internal_team" />}>
              <Gated role={role} level="internal_team">
                <ul className="space-y-1 text-sm text-muted-foreground">{p.whyNot.map((w) => <li key={w}>• {w}</li>)}</ul>
              </Gated>
            </Section>
          </div>

          <Section title="Who should NOT take this" right={<AccessTag level="internal_team" />}>
            <Gated role={role} level="internal_team">
              <div className="flex flex-wrap gap-2">
                {p.notFor.map((n) => <Badge key={n} variant="outline" className="border-destructive/40 text-destructive">{n}</Badge>)}
                {!p.notFor.length && <span className="text-sm text-muted-foreground">No hard exclusions recorded.</span>}
              </div>
            </Gated>
          </Section>

          <Section title="Owner summary — if you know this, you know the property">
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Best customer", p.personas[0] ? `${p.personas[0].persona} (${p.personas[0].score}/5)` : "—"],
                ["Best room", bestRoom ? `Room ${bestRoom.number} — ${bestRoom.type}` : "—"],
                ["Best landmark", p.landmarks[0] ? `${p.landmarks[0].name} (${p.landmarks[0].km} km)` : "—"],
                ["Best USP", p.why[0] ?? "—"],
                ["Biggest limitation", p.whyNot[0] ?? "—"],
                ["Cheaper alternative", p.alternatives.find((a) => a.kind.includes("Cheaper"))?.name ?? "—"],
                ["Premium alternative", p.alternatives.find((a) => a.kind.includes("Premium"))?.name ?? "—"],
                ["Closest alternative", p.alternatives.find((a) => a.kind.includes("Closest"))?.name ?? "—"],
                ["Today's inventory", `${p.availableBeds} beds free of ${p.bedsCount}`],
                ["Who to call", p.people[0]?.name ?? "—"],
                ["Last verified", `${p.lastVerifiedDays} days ago`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-medium">{v}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Alternatives — learn relationships, not isolated properties">
            <div className="grid gap-2 sm:grid-cols-2">
              {p.alternatives.map((a) => {
                const target = altLink(a.pid);
                return (
                  <div key={a.kind} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{a.kind}</p>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.note}</p>
                    </div>
                    {target && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/property360/$pid" params={{ pid: target }}><ArrowUpRight className="h-4 w-4" /></Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Internal operator intelligence" right={<AccessTag level="zone_owner" />}>
            <Gated role={role} level="zone_owner" label="Zone Owner and above">
              <ul className="space-y-1 text-sm text-muted-foreground">{p.internalNotes.map((n) => <li key={n}>• {n}</li>)}</ul>
            </Gated>
          </Section>
        </TabsContent>

        {/* LOCATION */}
        <TabsContent value="location" className="mt-4 space-y-4">
          <Section title="Location intelligence">
            <div className="grid gap-3 sm:grid-cols-4">
              {[["Zone", p.zone], ["Sub-area", p.subArea], ["Micro-location", p.microLocation], ["Coordinates", p.lat ? `${p.lat.toFixed(4)}, ${p.lng?.toFixed(4)}` : "Pending"]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-sm font-medium">{v}</p></div>
              ))}
            </div>
          </Section>

          <Section title="Nearby office & work-hub intelligence">
            {p.offices.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Office / Hub</th><th>Distance</th><th>Commute</th><th>Fit</th></tr></thead>
                  <tbody>
                    {p.offices.map((o) => (
                      <tr key={o.name} className="border-t border-border">
                        <td className="py-1.5">{o.name}</td>
                        <td>{o.km} km</td>
                        <td>{o.driveMin}–{o.driveMin + 8} min</td>
                        <td className={o.km < 2 ? "text-emerald-600" : o.km < 4 ? "text-amber-600" : "text-muted-foreground"}>
                          {o.km < 2 ? "Excellent" : o.km < 4 ? "Good" : "Possible"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-muted-foreground">No offices mapped yet — capture gate open.</p>}
          </Section>

          <Section title="Radius view">
            <div className="space-y-2">
              {p.radius.map((b) => (
                <div key={b.label} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{b.label} · {b.items.length}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {b.items.map((l) => (
                      <Badge key={l.name} variant="secondary" className="text-[11px]">
                        {l.name} · {l.km} km · {l.matters}
                      </Badge>
                    ))}
                    {!b.items.length && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* BUILDING */}
        <TabsContent value="building" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {p.floors.map((f) => (
              <Button key={f.id} size="sm" variant={f.no === floor.no ? "default" : "outline"} onClick={() => setFloorNo(f.no)}>
                <Building2 className="mr-1.5 h-3.5 w-3.5" /> {f.name}
              </Button>
            ))}
          </div>
          <FloorMap floor={floor} onOpenRoom={setRoom} />
        </TabsContent>

        {/* ROOMS */}
        <TabsContent value="rooms" className="mt-4 space-y-4">
          <Section title={`Room-level property brain — ${p.roomsCount} rooms, ${p.bedsCount} beds`}>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {p.floors.flatMap((f) => f.rooms).map((r) => {
                const free = r.beds.filter((b) => b.status === "available").length;
                return (
                  <button key={r.id} onClick={() => setRoom(r)} className="rounded-lg border border-border p-3 text-left transition hover:border-primary/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Room {r.number}</span>
                      <Badge variant="outline" className="capitalize">{r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.type} · {r.ac ? "AC" : "Non-AC"} · {r.bathroom} bath{r.balcony ? " · Balcony" : ""}
                    </p>
                    <p className="mt-1 text-xs">₹{r.currentRent.toLocaleString("en-IN")} · {free}/{r.beds.length} beds free</p>
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">Why: {r.why[0]}</p>
                  </button>
                );
              })}
            </div>
          </Section>
        </TabsContent>

        {/* FIT */}
        <TabsContent value="fit" className="mt-4 space-y-4">
          <Section title="Customer persona intelligence">
            <div className="space-y-2">
              {p.personas.map((ps) => (
                <div key={ps.persona} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{ps.persona}</p>
                    <p className="text-xs text-muted-foreground">{ps.why}</p>
                  </div>
                  <ScoreBar value={ps.score} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Experience scores (internal)" right={<AccessTag level="internal_team" />}>
            <Gated role={role} level="internal_team">
              <div className="grid gap-2 sm:grid-cols-2">
                {p.experience.map((e) => (
                  <div key={e.metric} className="flex items-center gap-2 text-xs">
                    <span className="w-36 text-muted-foreground">{e.metric}</span>
                    <Progress value={(e.score / 5) * 100} className="h-1.5 flex-1" />
                    <span className="w-8 text-right tabular-nums">{e.score}</span>
                  </div>
                ))}
              </div>
            </Gated>
          </Section>

          <Section title="Amenities intelligence">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {p.amenities.map((g) => (
                <div key={g.group} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{g.group}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {g.items.map((i) => <Badge key={i} variant="secondary" className="text-[11px]">{i}</Badge>)}
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground">Food</p>
                <p className="mt-1 text-sm">{p.food.type} · {p.food.meals}</p>
              </div>
            </div>
          </Section>

          <Section title="Rules & restrictions">
            <div className="grid gap-2 sm:grid-cols-2">
              {p.rules.map((r) => (
                <div key={r.label} className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <p>{r.value}</p>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* COMMERCIALS */}
        <TabsContent value="commercials" className="mt-4 space-y-4">
          <Section title="Commercial intelligence — field-level access control">
            <div className="space-y-2">
              {p.commercials.map((c) => (
                <div key={c.label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{c.label}</span>
                    <AccessTag level={c.access} />
                  </div>
                  <Gated role={role} level={c.access}>
                    <span className="font-medium">{c.value}</span>
                  </Gated>
                </div>
              ))}
            </div>
            {!canSee(role, "role_restricted") && (
              <p className="mt-3 text-xs text-muted-foreground">
                Negotiation bands are hidden for {ROLE_LABEL[role]}. Switch role above to see the layer you are cleared for.
              </p>
            )}
          </Section>

          <Section title="Documents">
            <div className="grid gap-2 sm:grid-cols-2">
              {p.documents.map((d) => (
                <div key={d.name} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> {d.name}</span>
                  <Gated role={role} level={d.access}><Button size="sm" variant="ghost">Open</Button></Gated>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* PEOPLE */}
        <TabsContent value="people" className="mt-4 space-y-4">
          <Section title="People directory — contact through actions, not raw numbers">
            <div className="grid gap-2 sm:grid-cols-2">
              {p.people.map((per) => (
                <div key={per.role} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{per.name}</p>
                      <p className="text-xs text-muted-foreground">{per.role} · {per.hours}</p>
                    </div>
                    <AccessTag level={per.access} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Gated role={role} level={per.access} label="No contact access">
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs"><Phone className="mr-1 h-3 w-3" /> Call</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs"><MessageSquare className="mr-1 h-3 w-3" /> WhatsApp</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">Request inventory confirmation</Button>
                      </>
                    </Gated>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Ownership — never 'everybody is responsible'">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {p.ownersOf.map((o) => (
                <div key={o.role} className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{o.role}</p>
                  <p className="font-medium">{o.who}</p>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* MEDIA */}
        <TabsContent value="media" className="mt-4 space-y-4">
          <Section title="Property media vault">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {p.media.map((m) => (
                <div key={m.group} className="rounded-lg border border-border p-3">
                  <p className="flex items-center gap-2 text-sm font-medium"><Camera className="h-4 w-4 text-muted-foreground" /> {m.group}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.count} assets · {m.hasVideo ? "video ✓" : "video missing"}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Naming convention: <code>{p.pid}_EXTERIOR_FRONT.jpg</code>, <code>{p.pid}_F03_R304_BATHROOM.jpg</code>, <code>{p.pid}_PROPERTY_WALKTHROUGH.mp4</code>
            </p>
          </Section>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq" className="mt-4 space-y-4">
          <Section title="Property FAQ — team reference & training source">
            <div className="grid gap-2 sm:grid-cols-2">
              {p.faq.map((f) => (
                <div key={f.q} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{f.q}</p>
                  <p className="text-xs text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* HEALTH */}
        <TabsContent value="health" className="mt-4 space-y-4">
          <CompletenessPanel p={p} />

          <Section title="Freshness — verified by / verified on / recheck">
            <div className="space-y-1.5">
              {p.freshness.map((f) => (
                <div key={f.field} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> {f.field}</span>
                  <span className="text-xs text-muted-foreground">by {f.verifiedBy}</span>
                  <span className={cn("text-xs font-medium", freshTone(f.verifiedAgoHours, f.recheckHours))}>
                    {f.verifiedAgoHours}h ago · recheck every {f.recheckHours}h
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Onboarding gates" right={<Badge variant="outline">{p.gates.filter((g) => g.done).length}/{p.gates.length}</Badge>}>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {p.gates.map((g, i) => (
                <div key={g.label} className={cn("flex items-center gap-2 rounded-md border p-2 text-xs", g.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                  <ShieldCheck className={cn("h-3.5 w-3.5", g.done ? "text-emerald-600" : "text-amber-600")} />
                  Gate {i + 1}: {g.label}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Improvement queue">
            <ul className="space-y-1 text-sm">
              {p.completeness.filter((c) => c.pct < 90).map((c) => (
                <li key={c.section} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                  <span><Users className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />Complete {c.section} — currently {c.pct}%</span>
                  <Button size="sm" variant="ghost" className="h-6 text-xs">Assign</Button>
                </li>
              ))}
              {p.completeness.every((c) => c.pct >= 90) && <li className="text-xs text-muted-foreground">Nothing pending — Owner Grade maintained.</li>}
            </ul>
          </Section>
        </TabsContent>
      </Tabs>

      <RoomSheet room={room} property={p} role={role} onOpenChange={(o) => !o && setRoom(null)} />
    </div>
  );
}

export const Route = createFileRoute("/property360/$pid")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.pid} Property Passport — Gharpayy` },
      { name: "description", content: "Complete property passport: identity, floor map, room and bed intelligence, personas, commercials, people, media and verification freshness." },
      { property: "og:title", content: `${params.pid} Property Passport — Gharpayy` },
      { property: "og:description", content: "Floor maps, room USPs, live bed availability, persona fit and role-gated commercial intelligence." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AppShell><PropertyPage /></AppShell>,
});
