// Admin Drilldown Drawer — right-side Sheet that opens when the admin clicks
// a teammate row on the monitoring dashboard. Aggregates everything an admin
// needs to intervene: today's actions, live sessions, active claims, owned
// leads with SLA/evidence health, one-tap bulk ops.
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { useAuditLog } from "@/lib/audit-log";
import { useLiveActivity } from "@/lib/live-activity";
import { useMonitoring } from "@/lib/monitoring/activity-store";
import { usePipeline } from "@/lib/pipeline/store";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User, Phone, MessageCircle, Handshake, AlertTriangle, Camera, Bell,
  History, ShieldAlert, Flame, ArrowRightLeft, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  tcmId: string | null;
  onClose: () => void;
}

export function AdminDrilldownDrawer({ tcmId, onClose }: Props) {
  const { tcms, leads, addNote, addLeadTag, autoAssignLead } = useApp();
  const tcm = tcms.find((t) => t.id === tcmId);
  const activities = useMonitoring((s) => s.activities);
  const audit = useAuditLog((s) => s.entries);
  const sessions = useLiveActivity((s) => s.sessions);
  const claims = useLiveActivity((s) => s.claims);
  const pipelineStates = usePipeline((s) => s.states);

  const info = useMemo(() => {
    if (!tcm) return null;
    const todayMs = new Date(); todayMs.setHours(0, 0, 0, 0);
    const today = todayMs.getTime();
    const myActivities = activities.filter(
      (a) => a.userId === tcm.id && Date.parse(a.ts) >= today,
    );
    const myAudit = audit.filter((e) => e.actorId === tcm.id).slice(0, 12);
    const myLive = sessions.filter((s) => s.actorId === tcm.id && s.state === "live");
    const myMissed = sessions.filter((s) => s.actorId === tcm.id && s.state === "missed").length;
    const myClaims = claims.filter((c) => c.claimerId === tcm.id && c.state === "active");
    const myLeads = leads.filter((l) => l.assignedTcmId === tcm.id);
    let evidenceGaps = 0;
    for (const l of myLeads) {
      const p = pipelineStates[l.id];
      if (!p) continue;
      evidenceGaps += p.history.filter((g) => !g.evidence || g.evidence.length === 0).length;
    }
    return { myActivities, myAudit, myLive, myMissed, myClaims, myLeads, evidenceGaps };
  }, [tcm, activities, audit, sessions, claims, leads, pipelineStates]);

  const notifyTcm = () => {
    if (!tcm) return;
    toast.success(`🔔 ${tcm.name} pinged`);
  };
  const pingAllLeads = () => {
    if (!tcm) return;
    info?.myLeads.forEach((l) => addNote(l.id, `📢 Admin batch check-in on ${tcm.name}'s leads`));
    toast.success(`Nudged ${info?.myLeads.length ?? 0} leads`);
  };
  const rebalance = () => {
    if (!tcm) return;
    let n = 0;
    info?.myLeads.slice(0, 5).forEach((l) => {
      addLeadTag(l.id, "rebalance-candidate");
      n++;
    });
    toast.info(`Flagged ${n} leads for rebalance review`);
  };
  const autoRouteAll = () => {
    if (!info) return;
    info.myLeads.slice(0, 10).forEach((l) => autoAssignLead(l.id));
    toast.success(`Re-routed ${Math.min(10, info.myLeads.length)} leads`);
  };
  const copyReport = () => {
    if (!tcm || !info) return;
    const rpt = {
      teammate: tcm.name, zone: tcm.zone,
      today: {
        clicks: info.myActivities.length,
        liveNow: info.myLive.length,
        missed: info.myMissed,
        activeClaims: info.myClaims.length,
        leadsOwned: info.myLeads.length,
        evidenceGaps: info.evidenceGaps,
      },
      recentAudit: info.myAudit.slice(0, 6).map((a) => ({ ts: a.ts, action: a.action, summary: a.summary })),
    };
    navigator.clipboard?.writeText(JSON.stringify(rpt, null, 2)).then(
      () => toast.success("Report copied"), () => toast.error("Copy failed"),
    );
  };

  return (
    <Sheet open={!!tcmId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col">
        {tcm && info && (
          <>
            <SheetHeader className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-lg">{tcm.name}</SheetTitle>
                  <SheetDescription className="text-xs">
                    {tcm.zone} · {info.myLeads.length} leads owned
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* KPI grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <Kpi label="Actions today" value={info.myActivities.length} />
                <Kpi label="Live now" value={info.myLive.length} tone={info.myLive.length > 0 ? "accent" : undefined} />
                <Kpi label="Missed" value={info.myMissed} tone={info.myMissed > 0 ? "destructive" : undefined} />
                <Kpi label="Co-work" value={info.myClaims.length} />
                <Kpi label="Leads" value={info.myLeads.length} />
                <Kpi label="Ev. gaps" value={info.evidenceGaps} tone={info.evidenceGaps > 0 ? "warning" : undefined} />
              </div>

              {/* Admin actions */}
              <div className="rounded-md border border-primary/20 bg-primary/5 p-2 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Admin actions
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={notifyTcm}>
                    <Bell className="h-3 w-3" /> Ping
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={pingAllLeads}>
                    <MessageCircle className="h-3 w-3" /> Nudge leads
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={rebalance}>
                    <Flame className="h-3 w-3" /> Flag rebalance
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={autoRouteAll}>
                    <ArrowRightLeft className="h-3 w-3" /> Re-route 10
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => { info.myLeads.slice(0, 5).forEach((l) => addNote(l.id, "📸 Screenshot proof requested by admin")); toast.warning("Asked for proof"); }}>
                    <Camera className="h-3 w-3" /> Ask proof
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={copyReport}>
                    <Copy className="h-3 w-3" /> Copy report
                  </Button>
                </div>
              </div>

              {/* Live sessions */}
              {info.myLive.length > 0 && (
                <Section title="Live now" icon={Phone}>
                  {info.myLive.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs py-1">
                      {s.channel === "call" ? <Phone className="h-3 w-3 text-accent" /> : <MessageCircle className="h-3 w-3 text-accent" />}
                      <span className="truncate flex-1">{s.leadName}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(s.startedAt), { addSuffix: false })}
                      </span>
                    </div>
                  ))}
                </Section>
              )}

              {/* Active claims */}
              {info.myClaims.length > 0 && (
                <Section title="Active co-work claims" icon={Handshake}>
                  {info.myClaims.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs py-1">
                      <Handshake className="h-3 w-3 text-accent" />
                      <span className="truncate flex-1">{c.reason}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.ts), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </Section>
              )}

              {/* Owned leads */}
              <Section title={`Owned leads · ${info.myLeads.length}`} icon={User}>
                {info.myLeads.slice(0, 10).map((l) => {
                  const p = pipelineStates[l.id];
                  const gaps = p ? p.history.filter((g) => !g.evidence || g.evidence.length === 0).length : 0;
                  return (
                    <div key={l.id} className="flex items-center gap-2 text-xs py-1">
                      <span className="truncate flex-1">{l.name}</span>
                      <Badge variant="outline" className="h-4 text-[9px]">{l.stage}</Badge>
                      {gaps > 0 && <span className="text-[10px] text-warning">·{gaps} gaps</span>}
                    </div>
                  );
                })}
                {info.myLeads.length > 10 && (
                  <div className="text-[10px] text-muted-foreground italic pt-1">
                    +{info.myLeads.length - 10} more
                  </div>
                )}
              </Section>

              {/* Audit */}
              <Section title="Recent audit trail" icon={History}>
                {info.myAudit.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground italic">No entries</div>
                ) : info.myAudit.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-[11px] py-0.5">
                    <span className="font-mono text-[9px] text-muted-foreground shrink-0">
                      {new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="truncate">{a.summary || a.action}</span>
                  </div>
                ))}
              </Section>

              {info.myActivities.length === 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  No activity today — investigate immediately.
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "accent" | "warning" | "destructive" }) {
  return (
    <div className={cn(
      "rounded-md border border-border bg-card px-2 py-1.5",
      tone === "accent" && "border-accent/40 bg-accent/5",
      tone === "warning" && "border-warning/40 bg-warning/5",
      tone === "destructive" && "border-destructive/40 bg-destructive/5",
    )}>
      <div className="text-lg font-display font-semibold">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({
  title, icon: Icon, children,
}: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card/60 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1 mb-1">
        <Icon className="h-3 w-3" /> {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
