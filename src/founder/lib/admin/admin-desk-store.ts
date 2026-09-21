// Admin Desk — one local-first store for every admin action taken on a day:
// acknowledgements, mark-ups (score adjustments), notes and flags.
// Shape mirrors what a `admin_marks` table would hold, so swapping the
// read/write helpers for Cloud calls later is a drop-in change.

export type MarkState = "pending" | "acknowledged" | "approved" | "flagged";

export interface PersonMark {
  employeeId: string;
  date: string;
  state: MarkState;
  markup: number; // -20..+20 points the admin adds or removes
  note: string;
  updatedAt: number;
  updatedBy: string;
}

const KEY = "gp_admin_desk_v1";
const listeners = new Set<() => void>();

export function todayStamp(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Bag = Record<string, PersonMark>;

function read(): Bag {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}") as Bag;
  } catch {
    return {};
  }
}

function write(bag: Bag) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(bag));
  listeners.forEach((fn) => fn());
}

export function subscribeAdminDesk(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function keyOf(employeeId: string, date: string) {
  return `${date}:${employeeId}`;
}

export function getMark(employeeId: string, date = todayStamp()): PersonMark {
  const bag = read();
  return (
    bag[keyOf(employeeId, date)] ?? {
      employeeId,
      date,
      state: "pending",
      markup: 0,
      note: "",
      updatedAt: 0,
      updatedBy: "admin",
    }
  );
}

export function getAllMarks(date = todayStamp()): PersonMark[] {
  const bag = read();
  return Object.values(bag).filter((m) => m.date === date);
}

export function setMark(employeeId: string, patch: Partial<PersonMark>, date = todayStamp()): PersonMark {
  const bag = read();
  const current = getMark(employeeId, date);
  const next: PersonMark = { ...current, ...patch, employeeId, date, updatedAt: Date.now() };
  bag[keyOf(employeeId, date)] = next;
  write(bag);
  return next;
}

export function bulkSetState(ids: string[], state: MarkState, date = todayStamp()) {
  const bag = read();
  ids.forEach((id) => {
    const current = getMark(id, date);
    bag[keyOf(id, date)] = { ...current, state, updatedAt: Date.now() };
  });
  write(bag);
}

export function resetDay(date = todayStamp()) {
  const bag = read();
  Object.keys(bag).forEach((k) => {
    if (k.startsWith(`${date}:`)) delete bag[k];
  });
  write(bag);
}

export const STATE_LABEL: Record<MarkState, string> = {
  pending: "Pending",
  acknowledged: "Acknowledged",
  approved: "Approved",
  flagged: "Flagged",
};

export const STATE_CLASS: Record<MarkState, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  acknowledged: "bg-primary/10 text-primary border-primary/30",
  approved: "bg-success/10 text-success border-success/30",
  flagged: "bg-destructive/10 text-destructive border-destructive/30",
};
