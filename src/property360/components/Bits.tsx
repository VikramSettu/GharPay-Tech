import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Lock, Bed as BedIcon, DoorOpen, Info } from "lucide-react";
import type { AccessLevel, Floor, P360Role, Property360, Room, RoomStatus } from "../model";
import { canSee } from "../model";

export const STATUS_TONE: Record<RoomStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  occupied: "bg-muted text-muted-foreground border-border",
  vacating: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  held: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  booked: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  maintenance: "bg-destructive/15 text-destructive border-destructive/30",
  not_sellable: "bg-destructive/10 text-destructive border-destructive/30",
};

export function Gated({
  role, level, children, label,
}: { role: P360Role; level: AccessLevel; children: React.ReactNode; label?: string }) {
  if (canSee(role, level)) return <>{children}</>;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" /> {label ?? "Restricted"}
    </span>
  );
}

export function AccessTag({ level }: { level: AccessLevel }) {
  const map: Record<AccessLevel, string> = {
    public: "Public", customer_safe: "Customer safe", internal_team: "Internal team",
    role_restricted: "Role restricted", zone_owner: "Zone owner only", admin: "Admin only",
    confidential: "Confidential",
  };
  return <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{map[level]}</span>;
}

export function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={cn("h-1.5 w-5 rounded-full", i < Math.round(value) ? "bg-primary" : "bg-muted")} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{value}/{max}</span>
    </div>
  );
}

export function CompletenessPanel({ p }: { p: Property360 }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Property intelligence completeness</h3>
        <span className="text-2xl font-bold tabular-nums">{p.completenessPct}%</span>
      </div>
      <Progress value={p.completenessPct} className="mt-2 h-2" />
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {p.completeness.map((c) => (
          <div key={c.section} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 text-muted-foreground">{c.section}</span>
            <Progress value={c.pct} className="h-1.5 flex-1" />
            <span className="w-9 text-right tabular-nums">{c.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FloorMap({
  floor, onOpenRoom,
}: { floor: Floor; onOpenRoom: (r: Room) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">{floor.name} — interactive map</h4>
          <p className="text-xs text-muted-foreground">{floor.rooms.length} rooms · map coverage {Math.round(floor.mapCoverage * 100)}%</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["available", "vacating", "held", "occupied", "maintenance"] as RoomStatus[]).map((s) => (
            <span key={s} className={cn("rounded border px-1.5 py-0.5 text-[10px] capitalize", STATUS_TONE[s])}>{s}</span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {floor.grid.map((row, ri) => (
          <div key={ri} className="flex flex-wrap gap-2">
            {row.map((cell, ci) => {
              if (cell.kind === "corridor") {
                return (
                  <div key={ci} className="flex-1 rounded-md border border-dashed border-border py-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                    {cell.label}
                  </div>
                );
              }
              if (cell.kind !== "room") {
                return (
                  <div key={ci} className="min-w-[84px] flex-1 rounded-md bg-muted/60 px-2 py-3 text-center text-[11px] text-muted-foreground">
                    {cell.label}
                  </div>
                );
              }
              const room = floor.rooms.find((r) => r.id === cell.roomId)!;
              const avail = room.beds.filter((b) => b.status === "available").length;
              return (
                <button
                  key={ci}
                  onClick={() => onOpenRoom(room)}
                  className={cn(
                    "min-w-[96px] flex-1 rounded-md border px-2 py-3 text-left transition hover:ring-2 hover:ring-primary/40",
                    STATUS_TONE[room.status],
                  )}
                >
                  <div className="text-sm font-semibold">{room.number}</div>
                  <div className="text-[10px] opacity-80">{room.type} · {avail}/{room.beds.length} free</div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Floor USP</p>
          <ul className="mt-1 space-y-0.5 text-xs">{floor.usp.map((u) => <li key={u}>✓ {u}</li>)}</ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Floor weakness (internal)</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{floor.weakness.map((u) => <li key={u}>• {u}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

export function RoomSheet({
  room, property, role, onOpenChange,
}: { room: Room | null; property: Property360; role: P360Role; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={!!room} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {room && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4" /> Room {room.number}
                <Badge variant="outline" className={cn("capitalize", STATUS_TONE[room.status])}>{room.status}</Badge>
              </SheetTitle>
              <p className="text-xs text-muted-foreground">{room.id}</p>
            </SheetHeader>

            <div className="mt-4 space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-xs sm:grid-cols-3">
                {[
                  ["Type", room.type], ["Floor", String(room.floorNo)], ["AC", room.ac ? "Yes" : "No"],
                  ["Bathroom", room.bathroom], ["Balcony", room.balcony ? "Yes" : "No"],
                  ["Facing", room.windowDirection], ["Size", `${room.sizeSqft} sq ft`],
                  ["Beds", String(room.beds.length)], ["Deposit", room.deposit],
                ].map(([k, v]) => (
                  <div key={k}><p className="text-muted-foreground">{k}</p><p className="font-medium">{v}</p></div>
                ))}
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live bed inventory</h4>
                <div className="space-y-1.5">
                  {room.beds.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <BedIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold">Bed {b.label}</span>
                        <span className="text-muted-foreground">{b.position}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">₹{b.price.toLocaleString("en-IN")}</span>
                        <Badge variant="outline" className={cn("capitalize", STATUS_TONE[b.status])}>
                          {b.status}
                          {b.availableFrom ? ` ${b.availableFrom}` : ""}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="text-xs font-semibold text-emerald-600">Why room {room.number}?</p>
                  <ul className="mt-1 space-y-0.5 text-xs">{room.why.map((w) => <li key={w}>✓ {w}</li>)}</ul>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-xs font-semibold text-amber-600">Why not? (internal)</p>
                  <Gated role={role} level="internal_team" label="Internal team only">
                    <ul className="mt-1 space-y-0.5 text-xs">{room.whyNot.map((w) => <li key={w}>• {w}</li>)}</ul>
                  </Gated>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground">Best customer for this room</p>
                <p className="mt-1 text-sm">{room.bestFor}</p>
              </div>

              <div className="rounded-lg border border-border p-3 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">Pricing</span>
                  <AccessTag level="role_restricted" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><p className="text-muted-foreground">Standard</p><p className="font-medium">₹{room.standardRent.toLocaleString("en-IN")}</p></div>
                  <div><p className="text-muted-foreground">Current</p><p className="font-medium">₹{room.currentRent.toLocaleString("en-IN")}</p></div>
                  <div>
                    <p className="text-muted-foreground">Lowest approved</p>
                    <Gated role={role} level="role_restricted">
                      <p className="font-medium">₹{room.floorRent.toLocaleString("en-IN")}</p>
                    </Gated>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground"><Info className="h-3.5 w-3.5" /> Media: {room.mediaCount} photos {room.hasVideo ? "· video ✓" : "· video missing"}</span>
                <Button size="sm" variant="outline" className="h-7 text-xs">Request media</Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Naming: {property.pid}_F{String(room.floorNo).padStart(2, "0")}_R{room.number}_FULLROOM.jpg
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function useRoomSheet() {
  const [room, setRoom] = useState<Room | null>(null);
  return { room, setRoom };
}
