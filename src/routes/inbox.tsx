import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Inbox as InboxIcon, Bell, ListTodo, CalendarDays, Mail, CheckCircle2, Filter, Send, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/lib/store";
import { useNotifications, selectInboxFor, type NotifChannel } from "@/lib/notifications";
import { activePersona, PERSONA_BY_ID } from "@/lib/personas";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { HRBroadcastComposer } from "@/components/HRBroadcastComposer";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
});

type Tab = "all" | "todo" | "calendar" | "email" | "broadcasts";

function InboxPage() {
  const role = useApp((s) => s.role);
  const currentTcmId = useApp((s) => s.currentTcmId);
  const me = activePersona(role, role === "tcm" ? currentTcmId : undefined);

  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const toggleTodoDone = useNotifications((s) => s.toggleTodoDone);

  const inbox = useMemo(() => selectInboxFor(items, role, me.id), [items, role, me.id]);
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    if (tab === "all") return inbox;
    if (tab === "broadcasts") return inbox.filter((n) => n.kind === "broadcast");
    if (tab === "todo") return inbox.filter((n) => n.channels?.includes("todo"));
    if (tab === "calendar") return inbox.filter((n) => n.channels?.includes("calendar"));
    if (tab === "email") return inbox.filter((n) => n.emailQueued);
    return inbox;
  }, [inbox, tab]);

  const counts = {
    all: inbox.length,
    broadcasts: inbox.filter((n) => n.kind === "broadcast").length,
    todo: inbox.filter((n) => n.channels?.includes("todo") && !n.todoDone).length,
    calendar: inbox.filter((n) => n.channels?.includes("calendar")).length,
    email: inbox.filter((n) => n.emailQueued).length,
  };
  const unread = inbox.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <InboxIcon className="h-3.5 w-3.5" />
              <span>Inbox · {me.name}</span>
              <Badge variant="outline" className="text-[10px] font-mono">{labelForRole(role)}</Badge>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Everything you need to act on, in one place.
            </h1>
            <p className="text-sm text-muted-foreground">
              {inbox.length === 0
                ? "Nothing to do right now. Inbox zero."
                : `${unread} unread · ${counts.todo} open todos · ${counts.calendar} calendar items.`}
            </p>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={() => markAllRead(role, me.id)}
            disabled={unread === 0}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
        </header>

        {/* HR can compose broadcasts straight from inbox */}
        {role === "hr" && <HRBroadcastComposer />}

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Filter className="h-3 w-3 text-muted-foreground mr-1" />
          {([
            ["all", "All", InboxIcon, counts.all],
            ["broadcasts", "From HR", Send, counts.broadcasts],
            ["todo", "Todo", ListTodo, counts.todo],
            ["calendar", "Calendar", CalendarDays, counts.calendar],
            ["email", "Email", Mail, counts.email],
          ] as const).map(([k, label, Icon, n]) => (
            <button
              key={k}
              onClick={() => setTab(k as Tab)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5",
                tab === k
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
              <span className="font-mono text-[10px] opacity-70">({n})</span>
            </button>
          ))}
        </div>

        <ScrollArea className="h-[calc(100vh-360px)] min-h-[400px] pr-2">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nothing here yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((n) => {
                const sender = n.senderId ? PERSONA_BY_ID[n.senderId] : undefined;
                const overdue = n.dueAt ? n.dueAt < Date.now() : false;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "rounded-lg border p-3",
                      severityClass(n.severity),
                      !n.read && "ring-1 ring-accent/20",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <SeverityDot severity={n.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{n.title}</span>
                          {n.kind === "broadcast" && (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              From {sender?.name.split(" ")[0] ?? "HR"}
                            </Badge>
                          )}
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{n.body}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="font-mono">{formatDistanceToNow(n.ts, { addSuffix: true })}</span>
                          {n.dueAt && (
                            <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                              overdue ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>
                              {overdue ? <AlertCircle className="h-2.5 w-2.5" /> : <CalendarDays className="h-2.5 w-2.5" />}
                              due {formatDistanceToNow(n.dueAt, { addSuffix: true })}
                            </span>
                          )}
                          {(n.channels ?? []).map((c) => <ChannelChip key={c} c={c} />)}
                          {n.emailQueued && (
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-info/10 text-info">
                              <Mail className="h-2.5 w-2.5" /> email queued
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {n.channels?.includes("todo") && (
                          <Button
                            variant={n.todoDone ? "outline" : "default"}
                            size="sm" className="h-7 text-[11px]"
                            onClick={() => toggleTodoDone(n.id)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {n.todoDone ? "Reopen" : "Done"}
                          </Button>
                        )}
                        {n.href && (
                          <Link
                            to={n.href}
                            onClick={() => markRead(n.id)}
                            className="text-[11px] text-accent hover:underline"
                          >
                            Open
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>
    </AppShell>
  );
}

function ChannelChip({ c }: { c: NotifChannel }) {
  const map: Record<NotifChannel, { Icon: typeof Bell; label: string }> = {
    "in-app": { Icon: Bell, label: "in-app" },
    todo: { Icon: ListTodo, label: "todo" },
    calendar: { Icon: CalendarDays, label: "calendar" },
    email: { Icon: Mail, label: "email" },
  };
  const { Icon, label } = map[c];
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-muted/60">
      <Icon className="h-2.5 w-2.5" /> {label}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const cls =
    severity === "urgent" ? "bg-destructive" :
    severity === "warn" ? "bg-warning" :
    severity === "success" ? "bg-success" :
    "bg-info";
  return <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", cls)} />;
}

function severityClass(severity: string): string {
  if (severity === "urgent") return "border-destructive/30 bg-destructive/5";
  if (severity === "warn") return "border-warning/30 bg-warning/5";
  if (severity === "success") return "border-success/30 bg-success/5";
  return "border-border bg-card";
}

function labelForRole(r: string): string {
  return r === "tcm" ? "TCM" : r === "flow-ops" ? "Flow Ops" : r === "hr" ? "HR" : "Owner";
}
