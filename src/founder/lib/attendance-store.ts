// Demo attendance store — localStorage backed, no auth.
// Each event has a selfie (data URL) + geo coords + reverse-geocoded address.

import { EMPLOYEES } from "@/founder/data/seed";

export type EventKind =
  | "clock_in"
  | "clock_out"
  | "break_start"
  | "break_end"
  | "field_start"
  | "field_end";

export interface AttEvent {
  id: string;
  employeeId: string;
  kind: EventKind;
  ts: number; // epoch ms
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string | null;
  selfie: string | null; // data URL
}

export type LiveStatus =
  | "Off"
  | "Clocked In"
  | "On Break"
  | "In Field";

const KEY = "gp_attendance_events_v1";
const ACTOR_KEY = "gp_actor_id_v1";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function read(): AttEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(events: AttEvent[]) {
  localStorage.setItem(KEY, JSON.stringify(events));
  emit();
}

export function getEvents(): AttEvent[] {
  return read();
}

export function getEventsFor(employeeId: string, dayKey?: string): AttEvent[] {
  const all = read().filter((e) => e.employeeId === employeeId);
  if (!dayKey) return all;
  return all.filter((e) => dateKey(e.ts) === dayKey);
}

export function todayKey(ts = Date.now()): string {
  return dateKey(ts);
}

export function dateKey(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function logEvent(ev: Omit<AttEvent, "id" | "ts"> & { ts?: number }) {
  const all = read();
  const next: AttEvent = {
    ...ev,
    id: crypto.randomUUID(),
    ts: ev.ts ?? Date.now(),
  };
  all.push(next);
  write(all);
  return next;
}

export function liveStatusFor(employeeId: string): LiveStatus {
  const evs = getEventsFor(employeeId, todayKey()).sort((a, b) => a.ts - b.ts);
  let status: LiveStatus = "Off";
  for (const e of evs) {
    switch (e.kind) {
      case "clock_in": status = "Clocked In"; break;
      case "clock_out": status = "Off"; break;
      case "break_start": status = "On Break"; break;
      case "break_end": status = "Clocked In"; break;
      case "field_start": status = "In Field"; break;
      case "field_end": status = "Clocked In"; break;
    }
  }
  return status;
}

export function todaySummary(employeeId: string) {
  const evs = getEventsFor(employeeId, todayKey()).sort((a, b) => a.ts - b.ts);
  let workMs = 0;
  let breakMs = 0;
  let fieldMs = 0;
  let workStart: number | null = null;
  let breakStart: number | null = null;
  let fieldStart: number | null = null;
  let firstClockIn: number | null = null;
  let lastClockOut: number | null = null;

  for (const e of evs) {
    if (e.kind === "clock_in") {
      workStart = e.ts;
      if (!firstClockIn) firstClockIn = e.ts;
    } else if (e.kind === "clock_out") {
      if (workStart) {
        workMs += e.ts - workStart;
        workStart = null;
      }
      lastClockOut = e.ts;
    } else if (e.kind === "break_start") {
      if (workStart) {
        workMs += e.ts - workStart;
        workStart = null;
      }
      breakStart = e.ts;
    } else if (e.kind === "break_end") {
      if (breakStart) {
        breakMs += e.ts - breakStart;
        breakStart = null;
      }
      workStart = e.ts;
    } else if (e.kind === "field_start") {
      if (workStart) {
        workMs += e.ts - workStart;
        workStart = null;
      }
      fieldStart = e.ts;
    } else if (e.kind === "field_end") {
      if (fieldStart) {
        fieldMs += e.ts - fieldStart;
        fieldStart = null;
      }
      workStart = e.ts;
    }
  }
  // open intervals: include time up to now
  const now = Date.now();
  if (workStart) workMs += now - workStart;
  if (breakStart) breakMs += now - breakStart;
  if (fieldStart) fieldMs += now - fieldStart;

  return {
    events: evs,
    workMs,
    breakMs,
    fieldMs,
    firstClockIn,
    lastClockOut,
    status: liveStatusFor(employeeId),
  };
}

export function fmtDuration(ms: number) {
  if (ms <= 0) return "0m";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Actor (acting-as user) ----------------------------------------------------

export function getActorId(): string {
  if (typeof window === "undefined") return EMPLOYEES[0].id;
  return localStorage.getItem(ACTOR_KEY) || EMPLOYEES[0].id;
}

export function setActorId(id: string) {
  localStorage.setItem(ACTOR_KEY, id);
  emit();
}

export function getActor() {
  const id = getActorId();
  return EMPLOYEES.find((e) => e.id === id) || EMPLOYEES[0];
}

// Geo + reverse-geocode (free, OSM) ----------------------------------------

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number;
}

export function getGeo(): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.display_name ?? null;
  } catch {
    return null;
  }
}

// Demo seed: prefill today's clock-ins for a few employees so dashboards aren't empty
export function ensureDemoSeed() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("gp_seed_v1")) return;
  const today = new Date();
  today.setHours(9, 32, 0, 0);
  const t1 = today.getTime();
  const seedEvents: AttEvent[] = [
    { id: crypto.randomUUID(), employeeId: "e1", kind: "clock_in", ts: t1, lat: 19.0596, lng: 72.8295, accuracy: 12, address: "Bandra West, Mumbai", selfie: null },
    { id: crypto.randomUUID(), employeeId: "e2", kind: "clock_in", ts: t1 + 6 * 60_000, lat: 19.0596, lng: 72.8295, accuracy: 14, address: "Bandra West, Mumbai", selfie: null },
    { id: crypto.randomUUID(), employeeId: "e2", kind: "break_start", ts: t1 + 130 * 60_000, lat: 19.0596, lng: 72.8295, accuracy: 14, address: "Bandra West, Mumbai", selfie: null },
    { id: crypto.randomUUID(), employeeId: "e2", kind: "break_end", ts: t1 + 160 * 60_000, lat: 19.0596, lng: 72.8295, accuracy: 14, address: "Bandra West, Mumbai", selfie: null },
    { id: crypto.randomUUID(), employeeId: "e4", kind: "clock_in", ts: t1 - 5 * 60_000, lat: 19.0760, lng: 72.8777, accuracy: 9, address: "HQ, Lower Parel, Mumbai", selfie: null },
    { id: crypto.randomUUID(), employeeId: "e7", kind: "clock_in", ts: t1 + 22 * 60_000, lat: 19.1197, lng: 72.8468, accuracy: 22, address: "Andheri West, Mumbai", selfie: null },
    { id: crypto.randomUUID(), employeeId: "e7", kind: "field_start", ts: t1 + 95 * 60_000, lat: 19.1280, lng: 72.8315, accuracy: 18, address: "Versova, Andheri West", selfie: null },
  ];
  localStorage.setItem(KEY, JSON.stringify(seedEvents));
  localStorage.setItem("gp_seed_v1", "1");
  emit();
}
