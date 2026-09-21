// Reassign Console Admin Ops — dense stat + bulk-op strip. Mounts inside
// the ReassignConsole header to give admins a bird's-eye view of pending
// reassign traffic, live claims across the org, and cross-zone coverage.
import { useMemo } from "react";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { useLiveActivity } from "@/lib/live-activity";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert, Users, Handshake, ArrowRightLeft, Copy, Zap, Bell, Flame,
} from "lucide-react";
import { toast } from "sonner";

export function ReassignAdminOps() {
  const requests = useIdentityStore((s) => s.requests);
  const identityLeads = useIdentityStore((s) => s.leads);
  const claims = useLiveActivity((s) => s.claims);
  const sessions = useLiveActivity((s) => s.sessions);
  const { tcms, leads } = useApp();

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.state === "pending").length;
    const activeClaims = claims.filter((c) => c.state === "active");
    const liveNow = sessions.filter((s) => s.state === "live").length;
    // Duplicate phone map
    const byPhone = new Map<string, number>();
    for (const l of identityLeads) {
      const key = l.phoneE164?.replace(/\D/g, "").slice(-10);
      if (!key) continue;
      byPhone.set(key, (byPhone.get(key) ?? 0) + 1);
    }
    const dupGroups = [...byPhone.values()].filter((n) => n > 1).length;
    // Coverage: TCMs with 0 leads assigned today
    const owners = new Set(leads.map((l) => l.assignedTcmId));
    const idleTcms = tcms.filter((t) => !owners.has(t.id)).length;
    return { pending, activeClaims: activeClaims.length, liveNow, dupGroups, idleTcms };
  }, [requests, claims, sessions, identityLeads, leads, tcms]);

  const copySummary = () => {
    navigator.clipboard?.writeText(JSON.stringify(stats, null, 2)).then(
      () => toast.success("Ops summary copied"),
      () => toast.error("Copy failed"),
    );
  };

  return (
    <div className="rounded-md border border-primary/20 bg-primary/[0.03] p-2 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <ShieldAlert className="h-3 w-3 text-primary" /> Admin ops · org-wide
      </div>
      <div className="grid grid-cols-5 gap-2 text-center">
        <Stat icon={ArrowRightLeft} label="Pending" value={stats.pending} tone={stats.pending > 0 ? "warning" : undefined} />
        <Stat icon={Handshake} label="Co-work" value={stats.activeClaims} tone={stats.activeClaims > 0 ? "accent" : undefined} />
        <Stat icon={Flame} label="Live now" value={stats.liveNow} tone={stats.liveNow > 0 ? "accent" : undefined} />
        <Stat icon={Users} label="Dup groups" value={stats.dupGroups} tone={stats.dupGroups > 0 ? "warning" : undefined} />
        <Stat icon={Zap} label="Idle TCMs" value={stats.idleTcms} tone={stats.idleTcms > 0 ? "destructive" : undefined} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => toast.success("🔔 Zone leads notified of coverage gaps")}>
          <Bell className="h-3 w-3" /> Notify zone leads
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={copySummary}>
          <Copy className="h-3 w-3" /> Copy summary
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => toast.info("Coverage rebalance queued")}>
          <ArrowRightLeft className="h-3 w-3" /> Auto-rebalance
        </Button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, tone,
}: {
  icon: typeof Users; label: string; value: number;
  tone?: "accent" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "accent" ? "border-accent/40 bg-accent/5 text-accent"
    : tone === "warning" ? "border-warning/40 bg-warning/5 text-warning"
    : tone === "destructive" ? "border-destructive/40 bg-destructive/5 text-destructive"
    : "border-border bg-card";
  return (
    <div className={`rounded-md border px-2 py-1.5 ${toneClass}`}>
      <div className="flex items-center justify-center gap-1">
        <Icon className="h-3 w-3" />
        <span className="text-base font-display font-semibold">{value}</span>
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
