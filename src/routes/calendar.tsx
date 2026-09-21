import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store";
import {
  useCalendar,
  KIND_META,
  type CalEvent,
  type CalEventKind,
} from "@/lib/calendar-store";
import { MonthView } from "@/components/calendar/MonthView";
import { TimeGridView } from "@/components/calendar/TimeGridView";
import { AgendaView } from "@/components/calendar/AgendaView";
import { EventDialog } from "@/components/calendar/EventDialog";
import { SyncPanel } from "@/components/calendar/SyncPanel";
import { headerLabel, navigate, type CalendarView } from "@/components/calendar/CalendarUtils";
import { format } from "date-fns";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { tours, followUps, leads } = useApp();
  const { events, addEvent } = useCalendar();
  const [view, setView] = useState<CalendarView>("week");
  const [focus, setFocus] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [editing, setEditing] = useState<{ open: boolean; eventId?: string; defaultStart?: Date }>({ open: false });
  const [syncOpen, setSyncOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CalEventKind | "all">("all");

  // Materialise CRM tours + follow-ups as calendar events (transient, not persisted).
  const crmEvents = useMemo<CalEvent[]>(() => {
    const out: CalEvent[] = [];
    const leadMap = new Map(leads.map((l) => [l.id, l]));

    for (const t of tours) {
      const lead = leadMap.get(t.leadId);
      const start = new Date(t.scheduledAt);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      out.push({
        id: `crm-tour-${t.id}`,
        title: lead ? `Tour · ${lead.name}` : "Tour",
        kind: "tour",
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: false,
        leadId: t.leadId,
        tourId: t.id,
        externalSource: "local",
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      });
    }

    for (const f of followUps.filter((x) => !x.done)) {
      const lead = leadMap.get(f.leadId);
      const start = new Date(f.dueAt);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      out.push({
        id: `crm-fu-${f.id}`,
        title: lead ? `Follow-up · ${lead.name}` : "Follow-up",
        kind: "follow-up",
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: false,
        leadId: f.leadId,
        followUpId: f.id,
        description: f.reason,
        externalSource: "local",
        createdAt: start.toISOString(),
        updatedAt: start.toISOString(),
      });
    }
    return out;
  }, [tours, followUps, leads]);

  const allEvents = useMemo(() => {
    const merged = [...crmEvents, ...events];
    const q = search.trim().toLowerCase();
    return merged.filter((e) => {
      if (filter !== "all" && e.kind !== filter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [crmEvents, events, search, filter]);

  // Reminders: simple in-memory scheduler (notifies once per session)
  useEffect(() => {
    const fired = new Set<string>();
    const tick = () => {
      const now = Date.now();
      for (const e of events) {
        if (!e.reminder) continue;
        const trigger = +new Date(e.start) - e.reminder * 60000;
        if (now >= trigger && now < trigger + 60000 && !fired.has(e.id)) {
          fired.add(e.id);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(e.title, {
              body: `In ${e.reminder} min · ${format(new Date(e.start), "p")}`,
            });
          }
        }
      }
    };
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [events]);

  const openEvent = (e: CalEvent) => {
    if (e.id.startsWith("crm-")) return;
    setEditing({ open: true, eventId: e.id });
  };

  const openSlot = (start: Date) => {
    setEditing({ open: true, defaultStart: start });
  };

  const openDay = (d: Date) => {
    setSelectedDay(d);
    if (view === "month") {
      // Open new event for that day at 9am
      const slot = new Date(d);
      slot.setHours(9, 0, 0, 0);
      // Don't auto-open — just select. Double-click via button below opens.
    }
  };

  const goToday = () => setFocus(new Date());

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-3rem)] p-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Calendar</h1>
            <Badge variant="secondary" className="ml-1">{allEvents.length} events</Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events"
                className="pl-8 h-9 w-56"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as CalEventKind | "all")}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(KIND_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                      {m.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSyncOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1.5" /> Sync
            </Button>
            <Button onClick={() => setEditing({ open: true, defaultStart: selectedDay ?? new Date() })}>
              <Plus className="h-4 w-4 mr-1.5" /> New event
            </Button>
          </div>
        </div>

        {/* Sub-toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={goToday}>Today</Button>
            <Button size="icon" variant="ghost" onClick={() => setFocus(navigate(view, focus, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setFocus(navigate(view, focus, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 font-display text-lg">{headerLabel(view, focus)}</span>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex gap-3">
          <aside className="hidden lg:flex flex-col w-56 border rounded-lg bg-card p-3 gap-3">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">My calendars</div>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(KIND_META).map(([k, m]) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                    <span>{m.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Connected</div>
              <ConnectionsList onOpen={() => setSyncOpen(true)} />
            </div>
            <div className="mt-auto text-xs text-muted-foreground">
              <p>Tours and follow-ups from your CRM appear here automatically.</p>
            </div>
          </aside>

          {view === "month" && (
            <MonthView
              focus={focus}
              events={allEvents}
              onEventClick={openEvent}
              onDayClick={openDay}
              selectedDay={selectedDay}
            />
          )}
          {(view === "week" || view === "day") && (
            <TimeGridView
              focus={focus}
              events={allEvents}
              view={view}
              onEventClick={openEvent}
              onSlotClick={openSlot}
            />
          )}
          {view === "agenda" && (
            <AgendaView events={allEvents} onEventClick={openEvent} />
          )}
        </div>
      </div>

      <EventDialog
        open={editing.open}
        onOpenChange={(v) => setEditing((s) => ({ ...s, open: v }))}
        eventId={editing.eventId}
        defaultStart={editing.defaultStart}
      />
      <SyncPanel open={syncOpen} onOpenChange={setSyncOpen} />
    </AppShell>
  );
}

function ConnectionsList({ onOpen }: { onOpen: () => void }) {
  const { connections } = useCalendar();
  if (connections.length === 0) {
    return (
      <button onClick={onOpen} className="text-xs text-primary hover:underline">
        Connect Google, Outlook, or ICS →
      </button>
    );
  }
  return (
    <ul className="space-y-1.5 text-xs">
      {connections.map((c) => (
        <li key={c.provider} className="flex items-center justify-between">
          <span className="capitalize">{c.provider}</span>
          <span className="text-muted-foreground truncate ml-2">{c.account}</span>
        </li>
      ))}
    </ul>
  );
}
