/**
 * DECISIONS — the accountability ledger of the founder console.
 *
 * Every alert, gap or moment the founder acts on becomes a decision with an
 * owner, a due checkpoint and a status. It survives reloads, so the next
 * session opens with "what did we promise and did it happen".
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DecisionStatus = "open" | "done" | "dropped";

export interface Decision {
  id: string;
  title: string;
  why: string;
  fix: string;
  owner: string;
  ownerId?: string;
  zone: string;
  count: number;
  money: number;
  level: "critical" | "warning" | "watch";
  createdAt: number;
  dueAt: number;
  status: DecisionStatus;
  closedAt?: number;
  note?: string;
  sourceId?: string;
}

interface DecisionState {
  items: Decision[];
  add: (d: Omit<Decision, "id" | "createdAt" | "status">) => void;
  setStatus: (id: string, status: DecisionStatus, note?: string) => void;
  remove: (id: string) => void;
  clearClosed: () => void;
}

/** Next operating checkpoint from now: 10:35 / 13:15 / 17:00 / 20:00. */
export function nextCheckpoint(now = Date.now()): { at: number; label: string } {
  const gates: [number, number, string][] = [
    [10, 35, "Goal Set"],
    [13, 15, "Reality Check"],
    [17, 0, "Recovery Check"],
    [20, 0, "Impact Check"],
  ];
  for (const [h, m, label] of gates) {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    if (+d > now) return { at: +d, label };
  }
  const d = new Date(now + 86_400_000);
  d.setHours(10, 35, 0, 0);
  return { at: +d, label: "Goal Set (tomorrow)" };
}

export const useDecisions = create<DecisionState>()(
  persist(
    (set) => ({
      items: [],
      add: (d) =>
        set((s) => {
          if (d.sourceId && s.items.some((x) => x.sourceId === d.sourceId && x.status === "open")) return s;
          return {
            items: [
              { ...d, id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now(), status: "open" as const },
              ...s.items,
            ].slice(0, 400),
          };
        }),
      setStatus: (id, status, note) =>
        set((s) => ({
          items: s.items.map((x) =>
            x.id === id ? { ...x, status, note: note ?? x.note, closedAt: status === "open" ? undefined : Date.now() } : x,
          ),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      clearClosed: () => set((s) => ({ items: s.items.filter((x) => x.status === "open") })),
    }),
    { name: "gharpayy.admin.decisions.v1" },
  ),
);

export function decisionsWhatsApp(items: Decision[], rangeLabel: string) {
  const open = items.filter((d) => d.status === "open");
  const closed = items.filter((d) => d.status === "done");
  const t = (ts: number) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return [
    `GHARPAYY WAR ROOM — ${rangeLabel}`,
    `${open.length} open decisions · ${closed.length} closed`,
    "",
    ...(open.length ? ["OPEN"] : []),
    ...open.map((d) => `• ${d.title} — ${d.owner} by ${t(d.dueAt)} (${d.zone})`),
    ...(closed.length ? ["", "CLOSED TODAY", ...closed.slice(0, 12).map((d) => `✓ ${d.title} — ${d.owner}`)] : []),
  ].join("\n");
}
