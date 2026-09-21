import { useMemo, useSyncExternalStore } from "react";
import { makeStore } from "./store";
import { SEED_NOTIFS, type AppNotif, type NotifKind, EMPLOYEES } from "@/founder/data/seed";

const store = makeStore<AppNotif[]>("gp_notifs_v1", SEED_NOTIFS);

export function ensureNotifSeed() {
  store.ensureSeed();
}

export function useNotifications(toId?: string): AppNotif[] {
  const all = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.read(),
    store.getServerSnapshot,
  );
  return useMemo(() => {
    const list = toId ? all.filter((n) => n.toId === toId) : all;
    return [...list].sort((a, b) => b.ts - a.ts);
  }, [all, toId]);
}

export function unreadCount(toId: string): number {
  return store.read().filter((n) => n.toId === toId && !n.read).length;
}

export function markRead(id: string) {
  store.write(store.read().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllRead(toId: string) {
  store.write(store.read().map((n) => (n.toId === toId ? { ...n, read: true } : n)));
}

export function pushNotification(n: Omit<AppNotif, "id" | "ts" | "read"> & { ts?: number; read?: boolean }) {
  const next: AppNotif = {
    ...n,
    id: crypto.randomUUID(),
    ts: n.ts ?? Date.now(),
    read: n.read ?? false,
  };
  store.write([next, ...store.read()]);
  return next;
}

export function nameOf(id?: string) {
  if (!id) return "";
  return EMPLOYEES.find((e) => e.id === id)?.name ?? "";
}

export function kindBadge(kind: NotifKind): { label: string; className: string } {
  switch (kind) {
    case "approval": return { label: "Approval", className: "bg-warning/15 text-warning border-warning/30" };
    case "task": return { label: "Task", className: "bg-info/15 text-info border-info/30" };
    case "kudos": return { label: "Kudos", className: "bg-success/15 text-success border-success/30" };
    case "attendance": return { label: "Attendance", className: "bg-destructive/10 text-destructive border-destructive/20" };
    case "mention": return { label: "Mention", className: "bg-primary/15 text-primary border-primary/30" };
    case "coach": return { label: "Coach", className: "bg-accent text-accent-foreground border-border" };
    case "calendar": return { label: "Calendar", className: "bg-info/10 text-info border-info/20" };
    case "system": return { label: "System", className: "bg-muted text-muted-foreground border-border" };
  }
}
