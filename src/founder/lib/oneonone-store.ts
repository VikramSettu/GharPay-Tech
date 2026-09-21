import { useMemo, useSyncExternalStore } from "react";
import { makeStore } from "./store";
import { SEED_ONE_ON_ONES, type OneOnOne, type OneOnOneActionItem, type OneOnOneSentiment } from "@/founder/data/seed";
import { pushNotification, nameOf } from "./notification-store";

const store = makeStore<OneOnOne[]>("gp_oneonones_v1", SEED_ONE_ON_ONES);

export function ensureOneOnOneSeed() {
  store.ensureSeed();
}

export function useOneOnOnes(): OneOnOne[] {
  const all = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.read(),
    store.getServerSnapshot,
  );
  return useMemo(() => [...all].sort((a, b) => b.scheduledAt - a.scheduledAt), [all]);
}

export function useOneOnOnesFor(personId: string): OneOnOne[] {
  const all = useOneOnOnes();
  return useMemo(
    () => all.filter((o) => o.managerId === personId || o.reportId === personId),
    [all, personId],
  );
}

export function getOneOnOne(id: string): OneOnOne | undefined {
  return store.read().find((o) => o.id === id);
}

export function createOneOnOne(input: {
  managerId: string;
  reportId: string;
  scheduledAt: number;
  durationMin?: number;
  agenda?: string;
}): OneOnOne {
  const now = Date.now();
  const next: OneOnOne = {
    id: crypto.randomUUID(),
    managerId: input.managerId,
    reportId: input.reportId,
    scheduledAt: input.scheduledAt,
    durationMin: input.durationMin ?? 30,
    status: "scheduled",
    agenda: input.agenda ?? "",
    notes: "",
    actionItems: [],
    createdAt: now,
    updatedAt: now,
  };
  store.write([next, ...store.read()]);
  pushNotification({
    kind: "calendar",
    toId: input.reportId,
    fromId: input.managerId,
    title: `${nameOf(input.managerId)} scheduled a 1:1 with you`,
    body: new Date(input.scheduledAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }),
    actionLabel: "Open",
    actionTo: "/one-on-ones",
  });
  return next;
}

export function updateOneOnOne(id: string, patch: Partial<OneOnOne>) {
  store.write(
    store.read().map((o) =>
      o.id === id ? { ...o, ...patch, updatedAt: Date.now() } : o,
    ),
  );
}

export function completeOneOnOne(id: string, sentiment: OneOnOneSentiment, notes: string, privateNotes: string) {
  updateOneOnOne(id, { status: "completed", sentiment, notes, privateNotes });
}

export function addActionItem(id: string, item: Omit<OneOnOneActionItem, "id">) {
  const o = getOneOnOne(id);
  if (!o) return;
  const next: OneOnOneActionItem = { ...item, id: crypto.randomUUID() };
  updateOneOnOne(id, { actionItems: [...o.actionItems, next] });
}

export function toggleActionItem(oneOnOneId: string, itemId: string) {
  const o = getOneOnOne(oneOnOneId);
  if (!o) return;
  updateOneOnOne(oneOnOneId, {
    actionItems: o.actionItems.map((a) => (a.id === itemId ? { ...a, done: !a.done } : a)),
  });
}

export function sentimentColor(s?: OneOnOneSentiment): string {
  switch (s) {
    case "green": return "bg-success/15 text-success border-success/30";
    case "amber": return "bg-warning/15 text-warning border-warning/30";
    case "red": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}
