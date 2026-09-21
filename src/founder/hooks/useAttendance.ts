import { useEffect, useState, useSyncExternalStore } from "react";
import {
  AttEvent,
  ensureDemoSeed,
  getActor,
  getActorId,
  getEvents,
  setActorId,
  subscribe,
} from "@/founder/lib/attendance-store";
import { EMPLOYEES, Employee } from "@/founder/data/seed";

function snapshot() {
  return JSON.stringify({ a: getActorId(), n: getEvents().length, t: getEvents()[getEvents().length - 1]?.ts });
}

export function useAttendanceState() {
  // `mounted` ensures the very first client render matches the server-rendered
  // HTML (no localStorage data, default actor, no events). After hydration we
  // flip to the real localStorage-backed state. This avoids a hydration
  // mismatch on status badges ("Off" vs "Clocked In") in AppShell.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ensureDemoSeed();
    setMounted(true);
  }, []);

  const version = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => snapshot(),
    () => "ssr"
  );

  // tick every 30s so durations on screen stay live
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  void version;

  if (!mounted) {
    return {
      actor: EMPLOYEES[0] as Employee,
      actorId: EMPLOYEES[0].id,
      setActor: setActorId,
      events: [] as AttEvent[],
      employees: EMPLOYEES,
    };
  }

  return {
    actor: getActor() as Employee,
    actorId: getActorId(),
    setActor: setActorId,
    events: getEvents() as AttEvent[],
    employees: EMPLOYEES,
  };
}
