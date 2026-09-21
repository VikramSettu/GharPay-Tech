import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Inbox, AlertTriangle, Sparkles, Circle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useUnreadCount,
  startNotificationsBridge,
  type AppNotification,
  type NotifSeverity,
} from "@/lib/notifications";
import type { Role } from "@/lib/types";
import { useApp } from "@/lib/store";

const sevDot: Record<NotifSeverity, string> = {
  info: "bg-info",
  success: "bg-success",
  warn: "bg-warning",
  urgent: "bg-destructive",
};

function timeAgo(ts: number, now: number): string {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationCenter({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => { startNotificationsBridge(); }, []);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const currentTcmId = useApp((s) => s.currentTcmId);
  const unread = useUnreadCount(role, role === "tcm" ? currentTcmId : undefined);
  const items = useNotifications((s) => s.items);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const markRead = useNotifications((s) => s.markRead);

  const myId = role === "tcm" ? currentTcmId : undefined;
  const visible: AppNotification[] = items.filter(
    (n) =>
      (n.audience.length === 0 || n.audience.includes(role)) &&
      (n.recipientId ? n.recipientId === myId : true),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-mono font-semibold flex items-center justify-center ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl z-50"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Inbox
              {unread > 0 && (
                <span className="text-[10px] font-mono rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5">
                  {unread} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => markAllRead(role, role === "tcm" ? currentTcmId : undefined)}
              disabled={unread === 0}
              className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 inline-flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                <Inbox className="h-6 w-6 mx-auto mb-2 opacity-50" />
                You're all caught up.
              </div>
            ) : (
              visible.slice(0, 40).map((n) => {
                const Body = (
                  <div className="flex gap-2.5 px-3 py-2.5 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-b-0">
                    <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", sevDot[n.severity])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-xs font-semibold truncate", n.read ? "text-muted-foreground" : "text-foreground")}>{n.title}</span>
                        {!n.read && <Circle className="h-1.5 w-1.5 fill-accent text-accent shrink-0" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</div>
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">{timeAgo(n.ts, now)} ago</div>
                    </div>
                    {n.severity === "urgent" && <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-1" />}
                  </div>
                );
                const onClick = () => { markRead(n.id); setOpen(false); };
                return n.href ? (
                  <Link key={n.id} to={n.href} onClick={onClick} className="block">
                    {Body}
                  </Link>
                ) : (
                  <button key={n.id} type="button" onClick={onClick} className="block w-full text-left">
                    {Body}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
