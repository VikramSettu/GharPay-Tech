// Lead Admin Strip — 10x admin control surface, mounted at the top of the
// lead drawer just below the LeadLiveStrip. Collapsible; expands to a dense
// grid of admin-grade tools: force reassign, freeze, priority overrides,
// evidence gap review, audit trail, live co-work log, screenshot review,
// notify manager, merge duplicates, export snapshot.
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { useAuditLog } from "@/lib/audit-log";
import { useLiveActivity } from "@/lib/live-activity";
import { usePipeline } from "@/lib/pipeline/store";
import { useIdentityStore } from "@/lib/lead-identity/store";
import type { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shield, ChevronDown, ChevronUp, ArrowRightLeft, Snowflake, Flame,
  Camera, FileWarning, History, Bell, Copy, Download, ShieldAlert,
  Handshake, CheckCheck, Star, EyeOff, GitMerge, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function LeadAdminStrip({ lead }: { lead: Lead }) {
  const { tcms, autoAssignLead, addNote, addLeadTag, removeLeadTag } = useApp();
  const entries = useAuditLog((s) => s.entries);
  const claims = useLiveActivity((s) => s.claims);
  const sessions = useLiveActivity((s) => s.sessions);
  const releaseClaim = useLiveActivity((s) => s.releaseClaim);
  const pipeline = usePipeline((s) => s.states[lead.id]);
  const requestEvidence = usePipeline((s) => s.requestEvidence);
  const identityLeads = useIdentityStore((s) => s.leads);
  const reassignPrimary = useIdentityStore((s) => s.reassignPrimary);

  const [open, setOpen] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [reason, setReason] = useState("");

  const audit = useMemo(
    () => entries.filter((e) => e.entityType === "lead" && e.entityId === lead.id).slice(0, 8),
    [entries, lead.id],
  );
  const leadClaims = claims.filter((c) => c.leadId === lead.id);
  const activeClaims = leadClaims.filter((c) => c.state === "active");
  const leadSessions = sessions.filter((s) => s.leadId === lead.id);
  const missed = leadSessions.filter((s) => s.state === "missed").length;
  const gates = pipeline?.history ?? [];
  const evidenceCount = gates.reduce((n, g) => n + (g.evidence?.length ?? 0), 0);
  const evidenceGaps = gates.filter((g) => !g.evidence || g.evidence.length === 0).length;

  // Duplicate siblings — by phone or email
  const duplicates = useMemo(() => {
    const phone = (lead.phone ?? "").replace(/\D/g, "");
    if (!phone) return [];
    return identityLeads.filter(
      (l) => l.phoneE164?.replace(/\D/g, "").endsWith(phone.slice(-10)) && l.ulid !== lead.id,
    );
  }, [identityLeads, lead]);

  const freezeToggle = () => {
    const frozen = lead.tags.includes("frozen");
    if (frozen) { removeLeadTag(lead.id, "frozen"); toast.info("Unfrozen"); }
    else { addLeadTag(lead.id, "frozen"); toast.warning("Lead frozen · outbound paused"); }
  };
  const priorityFlip = () => {
    const hot = lead.tags.includes("priority-hot");
    if (hot) { removeLeadTag(lead.id, "priority-hot"); toast.info("Priority cleared"); }
    else { addLeadTag(lead.id, "priority-hot"); toast.success("🔥 Priority-hot flagged"); }
  };
  const vipToggle = () => {
    const v = lead.tags.includes("vip");
    if (v) { removeLeadTag(lead.id, "vip"); toast.info("VIP cleared"); }
    else { addLeadTag(lead.id, "vip"); toast.success("⭐ VIP tagged — SLA halved"); }
  };
  const doAutoRoute = () => {
    const r = autoAssignLead(lead.id);
    const t = tcms.find((tc) => tc.id === r.tcmId);
    toast.success(`Auto-routed to ${t?.name ?? "TCM"}`, { description: r.reasons.join(" · ") });
  };
  const forceReassign = () => {
    if (!reassignTo) return toast.error("Pick a teammate");
    const t = tcms.find((tc) => tc.id === reassignTo);
    if (!t) return;
    reassignPrimary(lead.id, t.id, t.name, reason || "admin force-reassign");
    addNote(lead.id, `Admin reassign → ${t.name} (${reason || "no reason"})`);
    setReassignTo(""); setReason("");
    toast.success(`Force-reassigned to ${t.name}`);
  };
  const notifyManager = () => {
    addNote(lead.id, "🔔 Manager pinged from admin strip");
    toast.success("Manager notified");
  };
  const requestAllEvidence = () => {
    gates.forEach((g) => {
      if (!g.evidence || g.evidence.length === 0) {
        requestEvidence(lead.id, g.stage, "admin", "bulk admin request");
      }
    });
    toast.warning(`Evidence requested on ${evidenceGaps} stage${evidenceGaps === 1 ? "" : "s"}`);
  };
  const copySnapshot = () => {
    const snap = {
      lead: { id: lead.id, name: lead.name, phone: lead.phone, stage: lead.stage, owner: lead.assignedTcmId, tags: lead.tags },
      sessions: leadSessions.length, missed, evidenceCount, evidenceGaps,
      claims: activeClaims.map((c) => ({ by: c.claimerName, reason: c.reason })),
      audit: audit.map((a) => ({ ts: a.ts, actor: a.actorName, action: a.action, summary: a.summary })),
    };
    navigator.clipboard?.writeText(JSON.stringify(snap, null, 2)).then(
      () => toast.success("Snapshot copied to clipboard"),
      () => toast.error("Copy failed"),
    );
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ lead, audit, sessions: leadSessions, claims: leadClaims }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `lead-${lead.id}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };
  const requestScreenshots = () => {
    addNote(lead.id, "📸 Owner requested screenshot proof from TCM");
    toast.warning("Screenshot proof requested");
  };
  const mergeIntoCanonical = () => {
    if (duplicates.length === 0) return;
    addNote(lead.id, `🧬 Merge candidate flagged (${duplicates.length} siblings)`);
    toast.info("Merge flagged for review");
  };
  const hideFromFeeds = () => {
    const on = lead.tags.includes("hidden");
    if (on) { removeLeadTag(lead.id, "hidden"); toast.info("Restored to feeds"); }
    else { addLeadTag(lead.id, "hidden"); toast.info("Hidden from public feeds"); }
  };

  const frozen = lead.tags.includes("frozen");
  const vip = lead.tags.includes("vip");
  const hot = lead.tags.includes("priority-hot");
  const hidden = lead.tags.includes("hidden");

  return (
    <div className="mx-5 mt-3 rounded-xl border border-primary/20 bg-primary/[0.03] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-primary/5"
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <Shield className="h-3.5 w-3.5 text-primary" />
          Admin controls
          <span className="text-muted-foreground font-normal">
            · {audit.length} events · {activeClaims.length} claims · {evidenceGaps} gaps
            {missed > 0 && <span className="text-destructive"> · {missed} missed</span>}
            {duplicates.length > 0 && <span className="text-warning"> · {duplicates.length} dup</span>}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {frozen && <Badge variant="outline" className="h-4 text-[9px] gap-0.5 border-info/40 text-info"><Snowflake className="h-2.5 w-2.5" /> frozen</Badge>}
          {vip && <Badge className="h-4 text-[9px] bg-warning text-warning-foreground gap-0.5"><Star className="h-2.5 w-2.5" /> vip</Badge>}
          {hot && <Badge variant="destructive" className="h-4 text-[9px] gap-0.5"><Flame className="h-2.5 w-2.5" /> hot</Badge>}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-primary/20 p-2 space-y-2">
          {/* Quick actions grid */}
          <div className="grid grid-cols-5 gap-1">
            <A icon={ArrowRightLeft} label="Auto-route" onClick={doAutoRoute} />
            <A icon={Flame} label={hot ? "Un-hot" : "Hot"} onClick={priorityFlip} tone={hot ? "warning" : undefined} />
            <A icon={Star} label={vip ? "Un-VIP" : "VIP"} onClick={vipToggle} tone={vip ? "warning" : undefined} />
            <A icon={Snowflake} label={frozen ? "Unfreeze" : "Freeze"} onClick={freezeToggle} tone={frozen ? "info" : undefined} />
            <A icon={EyeOff} label={hidden ? "Show" : "Hide"} onClick={hideFromFeeds} />
            <A icon={Bell} label="Notify mgr" onClick={notifyManager} />
            <A icon={Camera} label="Ask SS" onClick={requestScreenshots} />
            <A icon={FileWarning} label={`Req ev · ${evidenceGaps}`} onClick={requestAllEvidence} disabled={evidenceGaps === 0} />
            <A icon={GitMerge} label={`Merge · ${duplicates.length}`} onClick={mergeIntoCanonical} disabled={duplicates.length === 0} />
            <A icon={ShieldAlert} label="Escalate" onClick={() => { addNote(lead.id, "🚨 Escalated to admin queue"); toast.warning("Escalated"); }} tone="warning" />
            <A icon={Copy} label="Copy JSON" onClick={copySnapshot} />
            <A icon={Download} label="Export" onClick={exportJson} />
            <A icon={Zap} label="Force stage +1" onClick={() => { addNote(lead.id, "Admin nudged stage"); toast.info("Stage nudged (admin override queued)"); }} />
            <A icon={CheckCheck} label="Mark verified" onClick={() => { addLeadTag(lead.id, "verified"); toast.success("Verified"); }} />
            <A icon={Handshake} label="Release claims" onClick={() => { activeClaims.forEach((c) => releaseClaim(c.id)); toast.info(`${activeClaims.length} claim(s) released`); }} disabled={activeClaims.length === 0} />
          </div>

          {/* Force reassign */}
          <div className="rounded-md border border-border bg-card/60 p-2 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <ArrowRightLeft className="h-3 w-3" /> Force reassign
            </div>
            <div className="flex items-center gap-1">
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Pick teammate" /></SelectTrigger>
                <SelectContent>
                  {tcms.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name} <span className="text-muted-foreground">· {t.zone}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="h-7 text-[11px] w-40" />
              <Button size="sm" className="h-7 text-[10px]" onClick={forceReassign} disabled={!reassignTo}>Reassign</Button>
            </div>
          </div>

          {/* Live claims log */}
          {leadClaims.length > 0 && (
            <div className="rounded-md border border-border bg-card/60 p-2 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <Handshake className="h-3 w-3" /> Claim log · {leadClaims.length}
              </div>
              {leadClaims.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-[11px]">
                  <span className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    c.state === "active" ? "bg-accent animate-pulse" : "bg-muted-foreground",
                  )} />
                  <b className="truncate">{c.claimerName}</b>
                  <span className="text-muted-foreground truncate">· {c.reason}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.ts), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Audit trail */}
          <div className="rounded-md border border-border bg-card/60 p-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <History className="h-3 w-3" /> Audit · last {audit.length}
            </div>
            {audit.length === 0 ? (
              <div className="text-[11px] text-muted-foreground italic">No tracked changes yet.</div>
            ) : audit.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-[11px] leading-tight">
                <span className="font-mono text-[9px] text-muted-foreground shrink-0">
                  {new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <b className="truncate">{a.actorName}</b>
                <span className="text-muted-foreground truncate">{a.summary || a.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function A({
  icon: Icon, label, onClick, tone, disabled,
}: {
  icon: typeof Shield; label: string; onClick: () => void;
  tone?: "warning" | "info"; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-md border border-border bg-card hover:bg-muted/60 py-1.5 text-[10px] transition-colors",
        tone === "warning" && "border-warning/40 text-warning hover:bg-warning/10",
        tone === "info" && "border-info/40 text-info hover:bg-info/10",
        disabled && "opacity-40 cursor-not-allowed hover:bg-card",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate max-w-full px-1">{label}</span>
    </button>
  );
}
