import { useMemo } from "react";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { morningReviewBuckets } from "@/lib/crm10x/execution-engine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import {
  AlertTriangle, CheckCircle2, Clock, UserX, MessageSquareWarning, Calendar, Snowflake,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Section {
  key: string;
  title: string;
  icon: typeof AlertTriangle;
  tone: "danger" | "warn" | "info";
  leads: ReturnType<typeof useIdentityStore.getState>["leads"];
  hint: string;
}

export function ManagerMorningReview() {
  const leads = useIdentityStore((s) => s.leads);
  const now = useNow(60_000);
  const nowDate = now ? new Date(now) : new Date();

  const buckets = useMemo(() => morningReviewBuckets(leads, nowDate), [leads, nowDate]);

  const sections: Section[] = [
    { key: "fc", title: "15-min law misses (NEW yesterday)", icon: Clock, tone: "danger", leads: buckets.firstContactMissed, hint: "First contact NOT logged within 15 min of lead creation." },
    { key: "t1", title: "T-1 reminder not sent", icon: Calendar, tone: "warn", leads: buckets.noT1Sent, hint: "Tour is tomorrow but TCM hasn't pinged the lead." },
    { key: "ns", title: "Yesterday no-shows", icon: UserX, tone: "danger", leads: buckets.noShowYesterday, hint: "Followed up within 1h? Manager review required." },
    { key: "pv", title: "Post-visit message missed", icon: MessageSquareWarning, tone: "warn", leads: buckets.postVisitMissed, hint: "Must go out within 2h of tour ending." },
    { key: "t3", title: "Stuck at T+3", icon: AlertTriangle, tone: "warn", leads: buckets.stuckAtT3, hint: "Manager takes over per escalation matrix." },
    { key: "ci7", title: "CI-7 with no activity in 10d", icon: Snowflake, tone: "warn", leads: buckets.ci7NoActivity, hint: "Reassign or close personally." },
    { key: "lost", title: "LOST without objection tag", icon: AlertTriangle, tone: "danger", leads: buckets.lostWithoutTag, hint: "Reject and return to TCM — tag required." },
  ];

  const total = sections.reduce((s, x) => s + x.leads.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Manager Morning Review</h2>
          <p className="text-xs text-muted-foreground">
            8:30 AM checklist · {total === 0 ? "Clean slate" : `${total} items flagged`}
          </p>
        </div>
        {total === 0 && (
          <Badge className="bg-emerald-500 gap-1"><CheckCircle2 className="size-3" /> All clear</Badge>
        )}
      </div>

      <div className="grid gap-3">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const empty = sec.leads.length === 0;
          const toneCls = sec.tone === "danger"
            ? "border-rose-500/40 bg-rose-500/5"
            : sec.tone === "warn"
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-border";
          return (
            <Card key={sec.key} className={empty ? "p-3" : `p-3 border-2 ${toneCls}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Icon className={`size-4 mt-0.5 ${sec.tone === "danger" ? "text-rose-500" : sec.tone === "warn" ? "text-amber-500" : ""}`} />
                  <div>
                    <div className="text-sm font-semibold">{sec.title}</div>
                    <div className="text-[11px] text-muted-foreground">{sec.hint}</div>
                  </div>
                </div>
                <Badge variant={empty ? "outline" : "destructive"}>{sec.leads.length}</Badge>
              </div>
              {!empty && (
                <ul className="mt-2 space-y-1 text-xs">
                  {sec.leads.slice(0, 6).map((l) => (
                    <li key={l.ulid} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="font-medium">{l.name}</span>
                        <span className="text-muted-foreground"> · {l.area || "—"} · {l.assigneeName ?? "Unassigned"}</span>
                      </span>
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                        <Link to="/execution">Take over</Link>
                      </Button>
                    </li>
                  ))}
                  {sec.leads.length > 6 && (
                    <li className="text-[11px] text-muted-foreground">+{sec.leads.length - 6} more</li>
                  )}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
