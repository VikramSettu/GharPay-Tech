import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Layers, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccessLevel } from "../model";
import { AreaField, Field, ListEditor, NumField, SelectField, StepShell, TextField, ToggleField } from "./Fields";
import { emptyBed, emptyFloor, emptyRoom, draftCompleteness, draftCompletenessPct, draftGates, draftBlockers, readinessFor, draftRooms } from "./build";
import { LANDMARK_CATEGORIES, type DraftFloor, type DraftRoom, type OnboardingDraft } from "./types";

export type Patch = (partial: Partial<OnboardingDraft>) => void;

const ACCESS_LEVELS: AccessLevel[] = [
  "public", "customer_safe", "internal_team", "role_restricted", "zone_owner", "admin", "confidential",
];
const ACCESS_LABEL: Record<AccessLevel, string> = {
  public: "Public",
  customer_safe: "Customer safe",
  internal_team: "Internal team",
  role_restricted: "Role restricted",
  zone_owner: "Zone owner only",
  admin: "Admin only",
  confidential: "Confidential",
};
const accessOptions = ACCESS_LEVELS.map((a) => ({ value: a, label: ACCESS_LABEL[a] }));

/* ---------------------------------------------------------------- */
/* 1. Identity                                                       */
/* ---------------------------------------------------------------- */

export function IdentityStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  const set = (k: keyof OnboardingDraft["identity"], v: string) =>
    patch({ identity: { ...d.identity, [k]: v } });
  return (
    <StepShell title="Identity" hint="What the property is called, who runs it, and how we rank it internally.">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Property display name *" value={d.identity.displayName} onChange={(v) => set("displayName", v)} placeholder="e.g. Gharpayy Nest Koramangala" />
        <TextField label="Actual / legal name" value={d.identity.actualName} onChange={(v) => set("actualName", v)} placeholder="Name on the agreement" hint="Hidden from customer view." />
        <TextField label="Owner group / brand" value={d.identity.group} onChange={(v) => set("group", v)} />
        <SelectField label="Gender" value={d.identity.gender} onChange={(v) => set("gender", v)}
          options={["Boys only", "Girls only", "Co-living (Boys & Girls)"]} />
        <SelectField label="Tier" value={d.identity.tier} onChange={(v) => set("tier", v)} options={["Budget", "Mid", "Premium", "Luxury"]} />
        <SelectField label="Property type" value={d.identity.propertyType} onChange={(v) => set("propertyType", v)}
          options={["Co-living / PG", "Hostel", "Serviced apartment", "Independent building"]} />
        <SelectField label="Listing status" value={d.identity.status} onChange={(v) => set("status", v)}
          options={["Active", "Paused", "Upcoming", "Sold Out"]} />
        <SelectField label="Internal priority" value={d.identity.priority} onChange={(v) => set("priority", v)}
          options={["Hero", "Core", "Backup", "Long-tail"]} />
        <TextField label="Onboarded on" type="date" value={d.identity.onboardedOn} onChange={(v) => set("onboardedOn", v)} />
        <TextField label="Information given by" value={d.filledBy} onChange={(v) => patch({ filledBy: v })} placeholder="Owner or team member name" />
      </div>
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 2. Location & landmarks                                           */
/* ---------------------------------------------------------------- */

export function LocationStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  const set = (k: keyof OnboardingDraft["location"], v: string) =>
    patch({ location: { ...d.location, [k]: v } });
  const landmarks = d.location.landmarks;
  const setLandmarks = (next: typeof landmarks) => patch({ location: { ...d.location, landmarks: next } });

  return (
    <StepShell title="Location & landmarks" hint="The exact pin plus everything nearby that makes a customer say yes.">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Zone *" value={d.location.zone} onChange={(v) => set("zone", v)} placeholder="e.g. Koramangala" />
        <TextField label="Sub-area *" value={d.location.subArea} onChange={(v) => set("subArea", v)} placeholder="e.g. 5th Block" />
        <TextField label="Micro location" value={d.location.microLocation} onChange={(v) => set("microLocation", v)} placeholder="e.g. Near Sony Signal" />
        <TextField label="Google Maps link" value={d.location.mapsLink} onChange={(v) => set("mapsLink", v)} placeholder="https://maps.app.goo.gl/…" />
        <TextField label="Latitude" value={d.location.lat} onChange={(v) => set("lat", v)} placeholder="12.9352" />
        <TextField label="Longitude" value={d.location.lng} onChange={(v) => set("lng", v)} placeholder="77.6245" />
      </div>
      <AreaField label="Full address *" value={d.location.address} onChange={(v) => set("address", v)} placeholder="Building, street, locality, city, pincode" />

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Nearby landmarks</p>
            <p className="text-[11px] text-muted-foreground">Add at least 5 — colleges and offices drive persona fit and radius intel.</p>
          </div>
          <Button type="button" size="sm" variant="outline" className="gap-1"
            onClick={() => setLandmarks([...landmarks, { name: "", category: LANDMARK_CATEGORIES[0], km: 1, walkMin: 12 }])}>
            <Plus className="h-3.5 w-3.5" /> Add landmark
          </Button>
        </div>
        {landmarks.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No landmarks yet. Colleges, IT parks and metro stations matter most.
          </p>
        )}
        {landmarks.map((l, i) => {
          const upd = (partial: Partial<typeof l>) =>
            setLandmarks(landmarks.map((x, j) => (j === i ? { ...x, ...partial } : x)));
          return (
            <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border p-2">
              <TextField className="col-span-12 sm:col-span-4" label="Name" value={l.name} onChange={(v) => upd({ name: v })} placeholder="e.g. Christ University" />
              <SelectField className="col-span-6 sm:col-span-3" label="Category" value={l.category} onChange={(v) => upd({ category: v })} options={LANDMARK_CATEGORIES} />
              <NumField className="col-span-3 sm:col-span-2" label="Km" step="0.1" value={l.km} onChange={(v) => upd({ km: v })} />
              <NumField className="col-span-3 sm:col-span-2" label="Walk min" value={l.walkMin} onChange={(v) => upd({ walkMin: v })} />
              <div className="col-span-12 sm:col-span-1">
                <Button type="button" size="sm" variant="ghost" className="h-9 w-full text-muted-foreground hover:text-destructive"
                  onClick={() => setLandmarks(landmarks.filter((_, j) => j !== i))} aria-label="Remove landmark">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 3. Building & floors                                              */
/* ---------------------------------------------------------------- */

export function BuildingStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  const floors = d.floors;
  const setFloors = (next: DraftFloor[]) => patch({ floors: next });
  const upd = (i: number, partial: Partial<DraftFloor>) =>
    setFloors(floors.map((f, j) => (j === i ? { ...f, ...partial } : f)));

  return (
    <StepShell title="Building & floors" hint="One entry per floor. Floor character is what advisors sell on tours.">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{floors.length} floors · {draftRooms(d).length} rooms total</p>
        <Button type="button" size="sm" variant="outline" className="gap-1"
          onClick={() => setFloors([...floors, emptyFloor(floors.length)])}>
          <Plus className="h-3.5 w-3.5" /> Add floor
        </Button>
      </div>

      {floors.map((f, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 text-muted-foreground" /> {f.name || `Floor ${f.no}`}
              <Badge variant="secondary">{f.rooms.length} rooms</Badge>
            </span>
            <Button type="button" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"
              disabled={floors.length === 1}
              onClick={() => setFloors(floors.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <NumField label="Floor number" value={f.no} onChange={(v) => upd(i, { no: v })} />
            <TextField label="Floor name" value={f.name} onChange={(v) => upd(i, { name: v })} className="sm:col-span-2" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ListEditor label="Floor USP" items={f.usp} onChange={(v) => upd(i, { usp: v })} placeholder="e.g. Terrace access" />
            <ListEditor label="Floor weakness (internal)" items={f.weakness} onChange={(v) => upd(i, { weakness: v })} placeholder="e.g. Lift dependency" />
          </div>
          <ToggleField label="Floor map / layout available" value={f.hasMap} onChange={(v) => upd(i, { hasMap: v })}
            hint="Turn on once the floor layout is drawn and verified — it drives map coverage." />
        </div>
      ))}
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 4. Rooms & beds                                                   */
/* ---------------------------------------------------------------- */

export function RoomsStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  const floors = d.floors;
  const setFloors = (next: DraftFloor[]) => patch({ floors: next });
  const updRoom = (fi: number, ri: number, partial: Partial<DraftRoom>) =>
    setFloors(floors.map((f, j) => (j === fi ? { ...f, rooms: f.rooms.map((r, k) => (k === ri ? { ...r, ...partial } : r)) } : f)));

  return (
    <StepShell title="Rooms & beds" hint="Every sellable room, every bed, and the honest reason to pick or skip it.">
      {floors.map((f, fi) => (
        <div key={fi} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{f.name || `Floor ${f.no}`}</p>
            <Button type="button" size="sm" variant="outline" className="gap-1"
              onClick={() => setFloors(floors.map((x, j) => (j === fi ? { ...x, rooms: [...x.rooms, emptyRoom(x.no, x.rooms.length)] } : x)))}>
              <Plus className="h-3.5 w-3.5" /> Add room
            </Button>
          </div>

          {f.rooms.map((r, ri) => (
            <div key={ri} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" /> Room {r.number || "—"}
                  <Badge variant="secondary">{r.beds.length} beds</Badge>
                </span>
                <Button type="button" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"
                  disabled={f.rooms.length === 1}
                  onClick={() => setFloors(floors.map((x, j) => (j === fi ? { ...x, rooms: x.rooms.filter((_, k) => k !== ri) } : x)))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <TextField label="Room number" value={r.number} onChange={(v) => updRoom(fi, ri, { number: v })} />
                <SelectField label="Type" value={r.type} onChange={(v) => updRoom(fi, ri, { type: v })}
                  options={["Single", "Double", "Triple", "Quad", "Studio"] as const} />
                <SelectField label="Bathroom" value={r.bathroom} onChange={(v) => updRoom(fi, ri, { bathroom: v })} options={["Attached", "Shared"] as const} />
                <SelectField label="Window facing" value={r.windowDirection} onChange={(v) => updRoom(fi, ri, { windowDirection: v })}
                  options={["East", "West", "North", "South"] as const} />
                <NumField label="Size (sq ft)" value={r.sizeSqft} onChange={(v) => updRoom(fi, ri, { sizeSqft: v })} />
                <NumField label="Standard rent ₹" value={r.standardRent} onChange={(v) => updRoom(fi, ri, { standardRent: v })} />
                <NumField label="Current rent ₹" value={r.currentRent} onChange={(v) => updRoom(fi, ri, { currentRent: v })} />
                <NumField label="Lowest approved ₹" value={r.floorRent} onChange={(v) => updRoom(fi, ri, { floorRent: v })} />
                <TextField label="Deposit" value={r.deposit} onChange={(v) => updRoom(fi, ri, { deposit: v })} />
                <NumField label="Photos uploaded" value={r.mediaCount} onChange={(v) => updRoom(fi, ri, { mediaCount: v })} />
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <ToggleField label="AC" value={r.ac} onChange={(v) => updRoom(fi, ri, { ac: v })} />
                <ToggleField label="Balcony" value={r.balcony} onChange={(v) => updRoom(fi, ri, { balcony: v })} />
                <ToggleField label="Room video" value={r.hasVideo} onChange={(v) => updRoom(fi, ri, { hasVideo: v })} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ListEditor label="Why this room" items={r.why} onChange={(v) => updRoom(fi, ri, { why: v })} placeholder="e.g. Largest window on the floor" />
                <ListEditor label="Why not (internal)" items={r.whyNot} onChange={(v) => updRoom(fi, ri, { whyNot: v })} placeholder="e.g. Next to the lift" />
              </div>
              <TextField label="Best customer for this room" value={r.bestFor} onChange={(v) => updRoom(fi, ri, { bestFor: v })}
                placeholder="e.g. Student who needs a quiet study corner" />

              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Beds in this room</p>
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs"
                    onClick={() => updRoom(fi, ri, { beds: [...r.beds, emptyBed(r.beds.length, r.currentRent)] })}>
                    <Plus className="h-3 w-3" /> Add bed
                  </Button>
                </div>
                {r.beds.map((b, bi) => {
                  const updBed = (partial: Partial<typeof b>) =>
                    updRoom(fi, ri, { beds: r.beds.map((x, k) => (k === bi ? { ...x, ...partial } : x)) });
                  return (
                    <div key={bi} className="grid grid-cols-12 items-end gap-2">
                      <TextField className="col-span-3 sm:col-span-2" label="Bed" value={b.label} onChange={(v) => updBed({ label: v })} />
                      <SelectField className="col-span-9 sm:col-span-3" label="Position" value={b.position} onChange={(v) => updBed({ position: v })}
                        options={["Window side", "Cupboard side", "Balcony side", "Door side"]} />
                      <NumField className="col-span-6 sm:col-span-2" label="Price ₹" value={b.price} onChange={(v) => updBed({ price: v })} />
                      <SelectField className="col-span-6 sm:col-span-2" label="Status" value={b.status} onChange={(v) => updBed({ status: v })}
                        options={["available", "occupied", "vacating", "held", "booked", "maintenance"] as const} />
                      <TextField className="col-span-9 sm:col-span-2" label="Free from" type="date" value={b.availableFrom ?? ""} onChange={(v) => updBed({ availableFrom: v })} />
                      <div className="col-span-3 sm:col-span-1">
                        <Button type="button" size="sm" variant="ghost" className="h-9 w-full text-muted-foreground hover:text-destructive"
                          disabled={r.beds.length === 1}
                          onClick={() => updRoom(fi, ri, { beds: r.beds.filter((_, k) => k !== bi) })} aria-label="Remove bed">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 5. Amenities & food                                               */
/* ---------------------------------------------------------------- */

export function AmenitiesStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  return (
    <StepShell title="Amenities & food" hint="Comma-separated lists. Be exact — customers hold us to this on tour day.">
      <div className="grid gap-3">
        {d.amenities.map((a, i) => (
          <AreaField key={a.group} label={`${a.group} amenities`} value={a.items}
            placeholder={
              a.group === "Room" ? "Bed, Mattress, Cupboard, Desk, Chair, Fan, AC"
              : a.group === "Property" ? "Wi-Fi, Lift, Power backup, RO water, Hot water"
              : a.group === "Safety" ? "CCTV, Biometric entry, Security guard, Fire extinguisher"
              : a.group === "Services" ? "Housekeeping, Laundry, Maintenance, Pest control"
              : "Gym, Games room, Lounge, Terrace, Common kitchen"
            }
            onChange={(v) => patch({ amenities: d.amenities.map((x, j) => (j === i ? { ...x, items: v } : x)) })} />
        ))}
      </div>
      <Separator />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Food type" value={d.food.type} onChange={(v) => patch({ food: { ...d.food, type: v } })}
          options={["", "Veg only", "Veg & Non-veg", "No food provided"]} />
        <TextField label="Meals included" value={d.food.meals} onChange={(v) => patch({ food: { ...d.food, meals: v } })}
          placeholder="e.g. Breakfast, lunch, dinner (3 meals)" />
      </div>
      <AreaField label="Food notes" value={d.food.notes} onChange={(v) => patch({ food: { ...d.food, notes: v } })}
        placeholder="Kitchen timings, menu rotation, guest meal charges…" />
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 6. Rules                                                          */
/* ---------------------------------------------------------------- */

export function RulesStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  return (
    <StepShell title="Rules & stay terms" hint="Every line here prevents a check-in dispute later.">
      <div className="grid gap-3 sm:grid-cols-2">
        {d.rules.map((r, i) => (
          <TextField key={r.label} label={r.label} value={r.value}
            placeholder={
              r.label === "Entry timing" ? "e.g. No curfew, gate closes 11pm"
              : r.label === "Minimum stay" ? "e.g. 3 months"
              : r.label === "Deposit" ? "e.g. One month rent, refundable"
              : r.label === "Utilities" ? "e.g. Electricity on actuals"
              : r.label === "Housekeeping" ? "e.g. Daily common, weekly rooms"
              : r.label === "Noise level" ? "Low / Medium / High"
              : r.label === "Visitors" ? "e.g. Common areas only"
              : "e.g. No cooking or pets in rooms"
            }
            onChange={(v) => patch({ rules: d.rules.map((x, j) => (j === i ? { ...x, value: v } : x)) })} />
        ))}
      </div>
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 7. Commercials                                                    */
/* ---------------------------------------------------------------- */

export function CommercialsStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  return (
    <StepShell title="Commercials" hint="Each line carries its own visibility. Customers only ever see 'Customer safe' rows.">
      <div className="space-y-2">
        {d.commercials.map((c, i) => {
          const upd = (partial: Partial<typeof c>) =>
            patch({ commercials: d.commercials.map((x, j) => (j === i ? { ...x, ...partial } : x)) });
          return (
            <div key={c.label} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border p-2">
              <div className="col-span-12 sm:col-span-4">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-[11px] text-muted-foreground">{ACCESS_LABEL[c.access]}</p>
              </div>
              <TextField className="col-span-12 sm:col-span-4" label="Value" value={c.value} onChange={(v) => upd({ value: v })}
                placeholder={c.label.includes("rent") || c.label.includes("amount") ? "₹12,000" : "Describe"} />
              <SelectField className="col-span-12 sm:col-span-4" label="Who can see this" value={c.access} onChange={(v) => upd({ access: v })} options={accessOptions} />
            </div>
          );
        })}
      </div>
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 8. People                                                         */
/* ---------------------------------------------------------------- */

export function PeopleStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  const setPeople = (next: typeof d.people) => patch({ people: next });
  return (
    <StepShell title="People" hint="Who to call, for what, and at what hours. At least one contact with a phone number is mandatory.">
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" className="gap-1"
          onClick={() => setPeople([...d.people, { role: "", name: "", phone: "", hours: "9am – 9pm", access: "internal_team" }])}>
          <Plus className="h-3.5 w-3.5" /> Add contact
        </Button>
      </div>
      {d.people.map((p, i) => {
        const upd = (partial: Partial<typeof p>) => setPeople(d.people.map((x, j) => (j === i ? { ...x, ...partial } : x)));
        return (
          <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border p-2">
            <TextField className="col-span-12 sm:col-span-3" label="Role" value={p.role} onChange={(v) => upd({ role: v })} placeholder="Property Manager" />
            <TextField className="col-span-6 sm:col-span-3" label="Name" value={p.name} onChange={(v) => upd({ name: v })} />
            <TextField className="col-span-6 sm:col-span-2" label="Phone" value={p.phone} onChange={(v) => upd({ phone: v })} placeholder="+91…" />
            <TextField className="col-span-6 sm:col-span-2" label="Hours" value={p.hours} onChange={(v) => upd({ hours: v })} />
            <SelectField className="col-span-6 sm:col-span-2" label="Visibility" value={p.access} onChange={(v) => upd({ access: v })} options={accessOptions} />
          </div>
        );
      })}
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 9. Media & documents                                              */
/* ---------------------------------------------------------------- */

export function MediaStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  return (
    <StepShell title="Media & documents" hint="Count what actually exists in the vault today, not what is planned.">
      <div className="space-y-2">
        {d.media.map((m, i) => {
          const upd = (partial: Partial<typeof m>) => patch({ media: d.media.map((x, j) => (j === i ? { ...x, ...partial } : x)) });
          return (
            <div key={m.group} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border p-2">
              <p className="col-span-12 text-sm font-medium sm:col-span-6">{m.group}</p>
              <NumField className="col-span-6 sm:col-span-3" label="Photos" value={m.count} onChange={(v) => upd({ count: v })} />
              <div className="col-span-6 sm:col-span-3">
                <ToggleField label="Video" value={m.hasVideo} onChange={(v) => upd({ hasVideo: v })} />
              </div>
            </div>
          );
        })}
      </div>
      <Separator />
      <p className="text-sm font-semibold">Documents collected</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {d.documents.map((doc, i) => (
          <ToggleField key={doc.name} label={doc.name} hint={`${doc.kind} · ${ACCESS_LABEL[doc.access]}`}
            value={doc.provided}
            onChange={(v) => patch({ documents: d.documents.map((x, j) => (j === i ? { ...x, provided: v } : x)) })} />
        ))}
      </div>
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 10. Customer fit                                                  */
/* ---------------------------------------------------------------- */

export function FitStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  return (
    <StepShell title="Customer fit" hint="Who this property is perfect for — and who should never be sent here.">
      <div className="space-y-2">
        {d.personas.map((p, i) => {
          const upd = (partial: Partial<typeof p>) => patch({ personas: d.personas.map((x, j) => (j === i ? { ...x, ...partial } : x)) });
          return (
            <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border p-2">
              <TextField className="col-span-12 sm:col-span-4" label="Persona" value={p.persona} onChange={(v) => upd({ persona: v })} />
              <SelectField className="col-span-4 sm:col-span-2" label="Fit / 5" value={String(p.score)} onChange={(v) => upd({ score: Number(v) })}
                options={["0", "1", "2", "3", "4", "5"]} />
              <TextField className="col-span-8 sm:col-span-6" label="Why this score" value={p.why} onChange={(v) => upd({ why: v })}
                placeholder="e.g. 0.8 km from Christ University, meals included" />
            </div>
          );
        })}
      </div>
      <Separator />
      <div className="grid gap-3 sm:grid-cols-3">
        <ListEditor label="Why this property" items={d.why} onChange={(v) => patch({ why: v })} placeholder="e.g. 3 min walk to metro" />
        <ListEditor label="Why not (internal)" items={d.whyNot} onChange={(v) => patch({ whyNot: v })} placeholder="e.g. No single rooms" />
        <ListEditor label="Not for" items={d.notFor} onChange={(v) => patch({ notFor: v })} placeholder="e.g. Budgets below ₹12,000" />
      </div>
      <Separator />
      <p className="text-sm font-semibold">Experience scores (0–5)</p>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {d.experience.map((e, i) => (
          <NumField key={e.metric} label={e.metric} step="0.1" value={e.score}
            onChange={(v) => patch({ experience: d.experience.map((x, j) => (j === i ? { ...x, score: v } : x)) })} />
        ))}
      </div>
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 11. FAQ & notes                                                   */
/* ---------------------------------------------------------------- */

export function FaqStep({ d, patch }: { d: OnboardingDraft; patch: Patch }) {
  return (
    <StepShell title="FAQ & internal notes" hint="Answer once here and no advisor has to guess on a call again.">
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" className="gap-1"
          onClick={() => patch({ faq: [...d.faq, { q: "", a: "" }] })}>
          <Plus className="h-3.5 w-3.5" /> Add question
        </Button>
      </div>
      {d.faq.map((f, i) => {
        const upd = (partial: Partial<typeof f>) => patch({ faq: d.faq.map((x, j) => (j === i ? { ...x, ...partial } : x)) });
        return (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <TextField label="Question" value={f.q} onChange={(v) => upd({ q: v })} />
            <AreaField label="Answer" value={f.a} onChange={(v) => upd({ a: v })} />
          </div>
        );
      })}
      <Separator />
      <ListEditor label="Internal notes (never shown to customers)" items={d.internalNotes} onChange={(v) => patch({ internalNotes: v })}
        placeholder="e.g. Owner flexible on deposit, firm on rent" />
    </StepShell>
  );
}

/* ---------------------------------------------------------------- */
/* 12. Review                                                        */
/* ---------------------------------------------------------------- */

export function ReviewStep({ d }: { d: OnboardingDraft }) {
  const rows = draftCompleteness(d);
  const total = draftCompletenessPct(d);
  const gates = draftGates(d);
  const blockers = draftBlockers(d);
  const readiness = readinessFor(total);
  const rooms = draftRooms(d);
  const beds = rooms.flatMap((r) => r.beds);

  return (
    <StepShell title="Review & publish" hint="Publishing creates the canonical passport and adds it to the Property 360 tower.">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Completeness", `${total}%`],
          ["Readiness", readiness],
          ["Rooms", String(rooms.length)],
          ["Beds", String(beds.length)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="text-2xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      {blockers.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">Cannot publish yet</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {blockers.map((b) => <li key={b}>• {b}</li>)}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Section completeness</p>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {rows.map((c) => (
            <div key={c.section} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0 text-muted-foreground">{c.section}</span>
              <Progress value={c.pct} className="h-1.5 flex-1" />
              <span className="w-9 text-right tabular-nums">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Onboarding gates</p>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {gates.map((g) => (
            <div key={g.label} className={cn("flex items-center gap-2 text-xs", g.done ? "text-emerald-600" : "text-muted-foreground")}>
              <span>{g.done ? "✓" : "○"}</span> {g.label}
            </div>
          ))}
        </div>
      </div>
    </StepShell>
  );
}

export { ACCESS_LABEL };
