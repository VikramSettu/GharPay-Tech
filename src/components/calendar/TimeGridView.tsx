import { format, isSameDay, isToday } from "date-fns";
import { useEffect, useRef } from "react";
import { KIND_META, type CalEvent } from "@/lib/calendar-store";
import { HOURS, durationMinutes, eventsForDay, minutesFromMidnight, weekDays } from "./CalendarUtils";
import { cn } from "@/lib/utils";

interface Props {
  focus: Date;
  events: CalEvent[];
  view: "week" | "day";
  onEventClick: (e: CalEvent) => void;
  onSlotClick: (start: Date) => void;
}

const SLOT_PX = 48;

export function TimeGridView({ focus, events, view, onEventClick, onSlotClick }: Props) {
  const days = view === "week" ? weekDays(focus) : [focus];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SLOT_PX * 7;
    }
  }, []);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex-1 min-h-0 border rounded-lg bg-card overflow-hidden flex flex-col">
      <div className="grid border-b" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map((d) => {
          const today = isToday(d);
          return (
            <div key={d.toISOString()} className="border-l px-2 py-2 text-center">
              <div className="text-xs text-muted-foreground uppercase">{format(d, "EEE")}</div>
              <div
                className={cn(
                  "mx-auto mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold",
                  today && "bg-primary text-primary-foreground",
                )}
              >
                {format(d, "d")}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="grid relative" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
          <div>
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-[10px] text-muted-foreground text-right pr-2 border-b"
                style={{ height: SLOT_PX }}
              >
                {h === 0 ? "" : format(new Date(2024, 0, 1, h), "h a")}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const dayEvents = eventsForDay(events, d).filter((e) => !e.allDay);
            const showNowLine = isSameDay(d, now);
            return (
              <div key={d.toISOString()} className="relative border-l">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="border-b cursor-pointer hover:bg-accent/30"
                    style={{ height: SLOT_PX }}
                    onClick={() => {
                      const slot = new Date(d);
                      slot.setHours(h, 0, 0, 0);
                      onSlotClick(slot);
                    }}
                  />
                ))}

                {showNowLine && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                    style={{ top: (currentMinutes / 60) * SLOT_PX }}
                  >
                    <span className="h-2 w-2 rounded-full bg-red-500 -ml-1" />
                    <div className="h-px flex-1 bg-red-500" />
                  </div>
                )}

                {dayEvents.map((e) => {
                  const top = (minutesFromMidnight(e.start) / 60) * SLOT_PX;
                  const height = Math.max(20, (durationMinutes(e) / 60) * SLOT_PX - 2);
                  const m = KIND_META[e.kind];
                  return (
                    <button
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onEventClick(e);
                      }}
                      className={cn(
                        "absolute left-1 right-1 rounded-md px-2 py-1 text-left text-xs overflow-hidden border",
                        m.bg,
                        m.text,
                      )}
                      style={{ top, height, borderColor: m.color }}
                    >
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="opacity-70 truncate">
                        {format(new Date(e.start), "h:mma").toLowerCase()} – {format(new Date(e.end), "h:mma").toLowerCase()}
                      </div>
                      {e.location && <div className="opacity-70 truncate">{e.location}</div>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
