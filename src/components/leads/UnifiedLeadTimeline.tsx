// Unified Lead Timeline — single source-of-truth view that merges every
// activity surface that touches a lead. Reads from 7 stores at once and
// renders one chronological list with filter chips.
import { useMemo, useState } from "react";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { useCRM10x } from "@/lib/crm10x/store";
import { useApp } from "@/lib/store";
import { useAuditLog } from "@/lib/audit-log";
import { formatDistanceToNow } from "date-fns";
import {
  Phone, MessageSquare, AlertCircle, MapPin, History,
  CheckCircle2, FileText, User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** ULID of the lead in the identity store. */
  ulid: string;
  /** Optional legacy lead id (from useApp.leads) — surfaces tours/bookings. */
  legacyLeadId?: string;
  className?: string;
  /** Max entries to render after filtering (default 60). */
  limit?: number;
}

type Kind = "all" | "calls" | "whatsapp" | "visits" | "status" | "tags";

interface Row {
  id: string;
  ts: string;
  kind: Kind;
  icon: React.ComponentType<{ className?: string }>;
  actor: string;
  text: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}

const FILTERS: { key: Kind; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "calls",    label: "Calls" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "visits",   label: "Visits" },
  { key: "status",   label: "Status" },
  { key: "tags",     label: "Tags" },
];

export function UnifiedLeadTimeline({ ulid, legacyLeadId, className, limit = 60 }: Props) {
  const [filter, setFilter] = useState<Kind>("all");

  const activities = useIdentityStore((s) => s.activities);
  const calls      = useCRM10x((s) => s.calls);
  const objections = useCRM10x((s) => s.objections);
  const visits     = useCRM10x((s) => s.visits);
  const messages   = useCRM10x((s) => s.messageOutcomes);
  const commitments = useCRM10x((s) => s.commitments);
  const audit      = useAuditLog((s) => s.entries);
  const tours      = useApp((s) => s.tours);
  const bookings   = useApp((s) => s.bookings);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];

    // 1. lead-identity activity feed
    activities.filter((a) => a.ulid === ulid).forEach((a) => {
      const isTag = a.kind === "tag-added" || a.kind === "tag-removed";
      const isStatus = a.kind === "state-changed" || a.kind === "priority-changed" || a.kind === "assignee-changed";
      out.push({
        id: a.id, ts: a.ts,
        kind: isTag ? "tags" : isStatus ? "status" : "all",
        icon: isTag ? FileText : isStatus ? History : UserIcon,
        actor: a.actorName, text: a.text,
      });
    });

    // 2. crm10x calls (keyed by leadId — fall back to legacy if no match)
    const leadKey = legacyLeadId ?? ulid;
    calls.filter((c) => c.leadId === leadKey).forEach((c) => {
      out.push({
        id: c.id, ts: c.ts, kind: "calls", icon: Phone,
        actor: c.loggedBy,
        text: `Call · ${c.outcome}${c.durationSec ? ` (${c.durationSec}s)` : ""}${c.notes ? ` — ${c.notes}` : ""}`,
        tone: c.outcome === "answered" ? "good" : c.outcome === "wrong-number" ? "bad" : "neutral",
      });
    });

    // 3. objections
    objections.filter((o) => o.leadId === leadKey).forEach((o) => {
      out.push({
        id: o.id, ts: o.ts, kind: "calls", icon: AlertCircle,
        actor: o.loggedBy,
        text: `Objection · ${o.code.replace(/-/g, " ")}${o.leadWords ? ` — "${o.leadWords}"` : ""}`,
        tone: "warn",
      });
    });

    // 4. WhatsApp / message outcomes
    messages.filter((m) => m.leadId === leadKey).forEach((m) => {
      out.push({
        id: m.id, ts: m.ts, kind: "whatsapp", icon: MessageSquare,
        actor: m.loggedBy ?? "—",
        text: `WhatsApp sent${m.replied ? " · replied" : ""}${m.bookedAfter ? " · booking attributed" : ""}`,
        tone: m.bookedAfter ? "good" : m.replied ? "good" : "neutral",
      });
    });

    // 5. visits
    Object.values(visits).filter((v) => v.leadId === leadKey).forEach((v) => {
      out.push({
        id: v.tourId, ts: v.updatedAt ?? new Date().toISOString(),
        kind: "visits", icon: MapPin,
        actor: "—",
        text: `Visit · ${v.propertyShownName ?? "property"}${v.reaction ? ` · ${v.reaction}` : ""}`,
        tone: v.reaction === "loved" ? "good" : v.reaction === "disappointed" ? "bad" : "neutral",
      });
    });

    // 6. commitments
    commitments.filter((c) => c.leadId === leadKey).forEach((c) => {
      out.push({
        id: c.id, ts: c.ts, kind: "status", icon: CheckCircle2,
        actor: "—",
        text: `Commitment · "${c.exactWords}" by ${c.decisionBy} (${c.status})`,
        tone: c.status === "kept" ? "good" : c.status === "missed" ? "bad" : "neutral",
      });
    });

    // 7. legacy tours + bookings
    if (legacyLeadId) {
      tours.filter((t) => t.leadId === legacyLeadId).forEach((t) => {
        out.push({
          id: t.id, ts: t.scheduledAt, kind: "visits", icon: MapPin,
          actor: t.tcmId, text: `Tour ${t.status}`,
          tone: t.status === "completed" ? "good" : t.status === "no-show" ? "bad" : "neutral",
        });
      });
      bookings.filter((b) => b.leadId === legacyLeadId).forEach((b) => {
        out.push({
          id: b.id, ts: b.ts, kind: "status", icon: CheckCircle2,
          actor: b.tcmId, text: `Booked · ₹${b.amount.toLocaleString()}`,
          tone: "good",
        });
      });
    }

    // 8. audit log entries (catches priority/tag/checkin changes)
    audit
      .filter((a) => a.entityType === "lead" && a.entityId === ulid)
      .forEach((a) => {
        // skip duplicates already added via activities feed
        if (out.some((r) => r.text === a.summary && Math.abs(+new Date(r.ts) - +new Date(a.ts)) < 1500)) return;
        out.push({
          id: a.id, ts: a.ts, kind: "status", icon: History,
          actor: a.actorName, text: a.summary,
        });
      });

    return out.sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  }, [activities, calls, objections, visits, messages, commitments, audit, tours, bookings, ulid, legacyLeadId]);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.kind === filter);
  const display = filtered.slice(0, limit);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-2 py-1 text-[11px] rounded-md border transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            {f.key === "all" && <span className="ml-1 opacity-60">{rows.length}</span>}
          </button>
        ))}
      </div>

      {display.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No activity yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {display.map((r) => {
            const Icon = r.icon;
            const toneCls =
              r.tone === "good" ? "text-emerald-500"
              : r.tone === "warn" ? "text-amber-500"
              : r.tone === "bad" ? "text-destructive"
              : "text-muted-foreground";
            return (
              <li key={r.id} className="flex items-start gap-2 text-xs rounded-md border border-border bg-card px-3 py-2">
                <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", toneCls)} />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground">{r.text}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {r.actor} · {formatDistanceToNow(new Date(r.ts), { addSuffix: true })}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
