// "What Changed" strip — shows the last few audit entries for one entity.
// Collapsed by default ("3 changes today · last by Aarav 12m ago"); expands
// to a vertical timeline with diff badges.
import { useState, useMemo } from "react";
import { useAuditLog, type AuditEntityType } from "@/lib/audit-log";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  entityType: AuditEntityType;
  entityId: string;
  className?: string;
  /** How many entries to show when expanded (default 8). */
  limit?: number;
}

export function WhatChangedStrip({ entityType, entityId, className, limit = 8 }: Props) {
  const recentFor = useAuditLog((s) => s.recentFor);
  const entries = useMemo(
    () => recentFor(entityType, entityId, limit),
    [recentFor, entityType, entityId, limit],
  );
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  const last = entries[0];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = entries.filter((e) => e.ts.startsWith(todayKey)).length;

  return (
    <div className={cn("rounded-lg border border-border bg-muted/30", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <History className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-foreground font-medium">
            {todayCount > 0 ? `${todayCount} change${todayCount === 1 ? "" : "s"} today` : `${entries.length} recent change${entries.length === 1 ? "" : "s"}`}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            · last by {last.actorName} {formatDistanceToNow(new Date(last.ts), { addSuffix: true })}
          </span>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="px-3 pb-3 pt-1 space-y-1.5 border-t border-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-xs">
              <User className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-foreground">{e.summary}</div>
                <div className="text-[10px] text-muted-foreground">
                  {e.actorName} · {formatDistanceToNow(new Date(e.ts), { addSuffix: true })}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
