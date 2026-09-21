/**
 * COMMAND PALETTE — ⌘K / Ctrl+K from any admin tab.
 *
 * One keystroke to change the time window, jump to a zone, lock a person,
 * open a surface, or pull a WhatsApp copy block. No hunting through tabs.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { toast } from "sonner";
import { useAdminFocus } from "@/founder/lib/admin-focus";
import { PERIOD_OPTIONS, type PeriodKey } from "@/founder/lib/brain/timeengine";
import { personWhatsApp, zoneLeagueWhatsApp, zoneWhatsApp, momentsWhatsApp } from "@/founder/lib/brain/people-now";

const SURFACES = [
  { to: "/admin", label: "Founder Desk" },
  { to: "/admin/watchtower", label: "Watchtower" },
  { to: "/admin/sheet", label: "Sheet" },
  { to: "/admin/command-center", label: "Command Centre" },
  { to: "/admin/ops", label: "Ops" },
  { to: "/admin/console", label: "Console" },
  { to: "/admin/flow", label: "Role Flow" },
  { to: "/admin/playbooks", label: "Playbooks" },
  { to: "/admin/report-center", label: "Report Centre" },
] as const;

export function CommandPalette() {
  const f = useAdminFocus();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => { fn(); setOpen(false); };
  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text);
    toast.success(`${what} copied for WhatsApp`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Command the company — zone, person, window, screen, report…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>

        <CommandGroup heading="Go to">
          {SURFACES.map((s) => (
            <CommandItem key={s.to} value={`go ${s.label}`} onSelect={() => run(() => navigate({ to: s.to }))}>
              {s.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Time window">
          {PERIOD_OPTIONS.filter((p) => p.id !== "custom").map((p) => (
            <CommandItem key={p.id} value={`window ${p.label}`} onSelect={() => run(() => f.setPeriod(p.id as PeriodKey))}>
              {p.label}{f.period === p.id ? " · current" : ""}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Zones">
          <CommandItem value="zone all zones" onSelect={() => run(() => f.setZoneName("all"))}>All zones</CommandItem>
          {f.zones.map((z) => (
            <CommandItem key={z.name} value={`zone ${z.name}`} onSelect={() => run(() => f.setZoneName(z.name))}>
              {z.name} · {z.total.v.bookings ?? 0} bookings · score {z.score}
              {z.zeros.length ? ` · ${z.zeros.length} zero-output` : ""}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="People">
          {f.total && (
            <CommandItem value="person total team" onSelect={() => run(() => f.openPerson(f.total!))}>
              {f.total.name}
            </CommandItem>
          )}
          {f.allPeople.map((p) => (
            <CommandItem key={p.id} value={`person ${p.name} ${p.zone} ${p.role}`} onSelect={() => run(() => f.openPerson(p))}>
              {p.name} · {p.zone} · grade {p.grade} · {p.v.bookings ?? 0} bookings
              {p.zeroDay && p.loggedInToday ? " · ZERO OUTPUT" : ""}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Copy for WhatsApp">
          <CommandItem value="copy zone league" onSelect={() => run(() => copy(zoneLeagueWhatsApp(f.zones, f.range.label), "Zone league"))}>
            Zone league
          </CommandItem>
          {f.zone && (
            <CommandItem value="copy this zone" onSelect={() => run(() => copy(zoneWhatsApp(f.zone!, f.range.label), f.zone!.name))}>
              {f.zone.name} full block
            </CommandItem>
          )}
          {f.total && (
            <CommandItem value="copy moments" onSelect={() => run(() => copy(momentsWhatsApp(f.people, f.total!, f.range.label), "Moments"))}>
              Moments (tour → quote → booking → check-in)
            </CommandItem>
          )}
          {f.focus && (
            <CommandItem value="copy focused person" onSelect={() => run(() => copy(personWhatsApp(f.focus!, f.range.label), f.focus!.name))}>
              {f.focus.name} day block
            </CommandItem>
          )}
        </CommandGroup>

        {f.focus && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Focus">
              <CommandItem value="clear focused person" onSelect={() => run(() => f.setPersonId(null))}>
                Clear focus on {f.focus.name}
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
