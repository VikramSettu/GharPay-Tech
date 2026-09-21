// Per-lead Live Activity strip — a "Wispr-flow" dock scoped to one lead.
// Mounts inside the lead drawer (LeadControlPanel) so every operator sees:
//   • live calls & chats happening on THIS lead right now (with running timers)
//   • one-tap contact buttons that auto-register a live session
//   • claim-&-work-in-parallel controls (co-work claim tracker)
//   • recent per-lead activity (missed / ended sessions)
//   • more activity buttons: SMS, Email, Note, Voice memo, Escalate, Handoff
//
// Anyone can Claim & work in parallel — even on already-owned leads. Claims
// are logged (claimer, owner, reason, timestamp) so admins get full visibility.
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { useLiveActivity } from "@/lib/live-activity";
import type { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Phone, MessageCircle, Mail, Send, CheckCheck, PhoneOff, CircleDot,
  Handshake, Mic, Sparkles, Video, StickyNote, AlertTriangle, History,
  UserPlus2, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function LeadLiveStrip({ lead }: { lead: Lead }) {
  const { currentTcmId, tcms, logCall, sendMessage, addNote } = useApp();
  const me = tcms.find((t) => t.id === currentTcmId);
  const meName = me?.name ?? "You";
  const owner = tcms.find((t) => t.id === lead.assignedTcmId);
  const isOwner = lead.assignedTcmId === currentTcmId;

  const autoTrack = useLiveActivity((s) => s.autoTrack);
  const toggleAutoTrack = useLiveActivity((s) => s.toggleAutoTrack);
  const sessions = useLiveActivity((s) => s.sessions);
  const claims = useLiveActivity((s) => s.claims);
  const startSession = useLiveActivity((s) => s.startSession);
  const endSession = useLiveActivity((s) => s.endSession);
  const markMissed = useLiveActivity((s) => s.markMissed);
  const claimCowork = useLiveActivity((s) => s.claimCowork);
  const releaseClaim = useLiveActivity((s) => s.releaseClaim);

  const [tick, setTick] = useState(0);
  const [note, setNote] = useState("");
  const [showClaim, setShowClaim] = useState(false);
  const [claimReason, setClaimReason] = useState("Owner unreachable · working in parallel");

  const mine = sessions.filter((s) => s.leadId === lead.id);
  const live = mine.filter((s) => s.state === "live");
  const recent = mine.filter((s) => s.state !== "live").slice(0, 4);
  const activeClaims = claims.filter((c) => c.leadId === lead.id && c.state === "active");
  const myClaim = activeClaims.find((c) => c.claimerId === currentTcmId);

  useEffect(() => {
    if (live.length === 0) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [live.length]);

  const clean = lead.phone.replace(/[^\d+]/g, "");
  const digits = clean.startsWith("+") ? clean.slice(1) : clean;

  const beginCall = () => {
    startSession({ leadId: lead.id, leadName: lead.name, channel: "call", actorId: currentTcmId, actorName: meName });
    logCall(lead.id);
    window.location.href = `tel:${clean}`;
    toast.success(`📞 Live call started · ${lead.name}`);
  };
  const beginChat = (preset?: string) => {
    startSession({ leadId: lead.id, leadName: lead.name, channel: "chat", actorId: currentTcmId, actorName: meName, note: preset });
    sendMessage(lead.id, preset ?? "WhatsApp opened");
    window.open(`https://wa.me/${digits}${preset ? `?text=${encodeURIComponent(preset)}` : ""}`, "_blank", "noopener,noreferrer");
    toast.success(`💬 Live chat started · ${lead.name}`);
  };
  const beginSms = () => {
    startSession({ leadId: lead.id, leadName: lead.name, channel: "chat", actorId: currentTcmId, actorName: meName, note: "SMS" });
    sendMessage(lead.id, "SMS opened");
    window.location.href = `sms:${clean}`;
    toast.success(`SMS opened · logged live`);
  };
  const beginEmail = () => {
    sendMessage(lead.id, "Email drafted");
    window.location.href = `mailto:?subject=Gharpayy%20-%20${encodeURIComponent(lead.name)}`;
    toast.success("Email draft opened");
  };
  const beginMeet = () => {
    startSession({ leadId: lead.id, leadName: lead.name, channel: "call", actorId: currentTcmId, actorName: meName, note: "Video" });
    window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
    toast.success("Video room opened · logged live");
  };
  const voiceMemo = () => {
    addNote(lead.id, "🎙 Voice memo captured (stub)");
    toast.success("Voice memo saved to notes");
  };
  const escalate = () => {
    addNote(lead.id, `⚠️ Escalated by ${meName} — needs manager attention`);
    toast.warning("Escalated to manager");
  };
  const raiseHand = () => {
    addNote(lead.id, `✋ ${meName} requested backup on this lead`);
    toast.info("Backup requested — pod backup notified");
  };
  const doClaim = () => {
    claimCowork({
      leadId: lead.id, claimerId: currentTcmId, claimerName: meName,
      primaryOwnerName: owner?.name ?? "—", reason: claimReason,
    });
    setShowClaim(false);
    toast.success(`Claimed · you can work ${lead.name} in parallel`, {
      description: "Owner is notified — your activity is tracked separately.",
    });
  };

  return (
    <div className="mx-5 mt-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <CircleDot className={cn("h-3 w-3", live.length > 0 ? "text-accent animate-pulse" : "text-muted-foreground")} />
          Live on this lead
          <span className="font-mono text-muted-foreground">{live.length}</span>
          {activeClaims.length > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent uppercase tracking-wider">
              <Handshake className="h-2.5 w-2.5" />
              {activeClaims.length} co-work{activeClaims.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-muted-foreground uppercase tracking-wider font-semibold mr-0.5">auto-track</span>
          <button
            onClick={() => { toggleAutoTrack("call"); toast.success(`Auto-track calls ${!autoTrack.call ? "ON" : "OFF"}`); }}
            aria-pressed={autoTrack.call}
            title={`Auto-track calls · ${autoTrack.call ? "ON" : "OFF"}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 transition-colors",
              autoTrack.call
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-border bg-muted/40 text-muted-foreground opacity-60 hover:opacity-100",
            )}
          >
            <Phone className="h-3 w-3" />
            <span className="font-semibold">Call</span>
            {autoTrack.call && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
          </button>
          <button
            onClick={() => { toggleAutoTrack("chat"); toast.success(`Auto-track chats ${!autoTrack.chat ? "ON" : "OFF"}`); }}
            aria-pressed={autoTrack.chat}
            title={`Auto-track WhatsApp · ${autoTrack.chat ? "ON" : "OFF"}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 transition-colors",
              autoTrack.chat
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-border bg-muted/40 text-muted-foreground opacity-60 hover:opacity-100",
            )}
          >
            <MessageCircle className="h-3 w-3" />
            <span className="font-semibold">WA</span>
            {autoTrack.chat && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Live-now rows */}
      {live.length > 0 && (
        <div className="p-2 space-y-1.5 border-b border-border" data-tick={tick}>
          {live.map((s) => {
            const dur = Math.max(0, Math.floor((Date.now() - s.startedAt) / 1000));
            const mm = String(Math.floor(dur / 60)).padStart(2, "0");
            const ss = String(dur % 60).padStart(2, "0");
            const Icon = s.channel === "call" ? Phone : MessageCircle;
            return (
              <div key={s.id} className="rounded-md border border-accent/30 bg-accent/5 px-2 py-1.5 flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-accent shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-medium truncate">{s.actorName} · {s.channel === "call" ? "on call" : "chatting"}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{s.note ?? "auto-tracked"}</div>
                </div>
                <span className="font-mono text-[11px] text-accent">{mm}:{ss}</span>
                <button
                  onClick={() => { endSession(s.id); toast.success("Session logged"); }}
                  className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] hover:bg-muted/60"
                >
                  <CheckCheck className="h-3 w-3" /> End
                </button>
                <button
                  onClick={() => { markMissed(s.id); toast.warning("Marked missed"); }}
                  className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] hover:bg-muted/60"
                >
                  <PhoneOff className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons — 10 activity CTAs */}
      <div className="grid grid-cols-5 gap-1 p-2 border-b border-border">
        <Act icon={Phone} label="Call" onClick={beginCall} live={autoTrack.call} />
        <Act icon={MessageCircle} label="WA" onClick={() => beginChat()} live={autoTrack.chat} />
        <Act icon={Send} label="SMS" onClick={beginSms} />
        <Act icon={Mail} label="Email" onClick={beginEmail} />
        <Act icon={Video} label="Video" onClick={beginMeet} live={autoTrack.call} />
        <Act icon={StickyNote} label="Note" onClick={() => document.getElementById(`live-note-${lead.id}`)?.focus()} />
        <Act icon={Mic} label="Memo" onClick={voiceMemo} />
        <Act icon={Bell} label="Nudge" onClick={() => { sendMessage(lead.id, "Just checking in — any questions?"); toast.success("Nudge sent"); }} />
        <Act icon={AlertTriangle} label="Escalate" onClick={escalate} tone="warning" />
        <Act icon={UserPlus2} label="Backup" onClick={raiseHand} />
      </div>

      {/* Inline note */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-border">
        <Input
          id={`live-note-${lead.id}`}
          value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Quick note or observation for this lead…"
          className="h-8 text-xs"
        />
        <Button
          size="sm" className="h-8 text-[11px]" disabled={!note.trim()}
          onClick={() => { addNote(lead.id, note); setNote(""); toast.success("Note added"); }}
        >
          Save
        </Button>
      </div>

      {/* Claim & work */}
      <div className="px-2 py-2 border-b border-border flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          <Sparkles className="h-3 w-3" /> Ownership
        </span>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
          isOwner ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground",
        )}>
          {isOwner ? "You · Primary" : `Owner · ${owner?.name ?? "—"}`}
        </span>
        {myClaim ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
            <CircleDot className="h-2.5 w-2.5 animate-pulse" /> You are co-working
            <button
              onClick={() => { releaseClaim(myClaim.id); toast.info("Claim released"); }}
              className="ml-1 underline underline-offset-2 hover:text-foreground"
            >
              release
            </button>
          </span>
        ) : !isOwner && (
          <>
            {!showClaim ? (
              <Button
                size="sm" variant="outline"
                className="h-6 text-[10px] gap-1 border-accent/50 text-accent hover:bg-accent/10"
                onClick={() => setShowClaim(true)}
              >
                <Handshake className="h-3 w-3" /> Claim & work in parallel
              </Button>
            ) : (
              <div className="flex items-center gap-1 w-full mt-1">
                <Input
                  value={claimReason} onChange={(e) => setClaimReason(e.target.value)}
                  className="h-7 text-[11px]" placeholder="Reason for parallel work"
                />
                <Button size="sm" className="h-7 text-[10px]" onClick={doClaim}>Claim</Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setShowClaim(false)}>Cancel</Button>
              </div>
            )}
          </>
        )}
        {activeClaims.filter((c) => c.claimerId !== currentTcmId).map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground" title={c.reason}>
            <CircleDot className="h-2.5 w-2.5 animate-pulse text-accent" /> {c.claimerName} co-working
          </span>
        ))}
      </div>

      {/* Recent per-lead */}
      {recent.length > 0 && (
        <div className="px-2 py-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            <History className="h-3 w-3" /> Recent on this lead
          </div>
          <div className="space-y-1">
            {recent.map((s) => {
              const Icon = s.channel === "call" ? Phone : MessageCircle;
              const missed = s.state === "missed";
              const dur = s.endedAt ? Math.max(1, Math.floor((s.endedAt - s.startedAt) / 1000)) : 0;
              const label = dur >= 60 ? `${Math.floor(dur / 60)}m ${dur % 60}s` : `${dur}s`;
              const when = new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={s.id} className={cn(
                  "rounded-md border px-2 py-1 flex items-center gap-2 text-[11px]",
                  missed ? "border-destructive/30 bg-destructive/5" : "border-border bg-card",
                )}>
                  <Icon className={cn("h-3 w-3", missed ? "text-destructive" : "text-muted-foreground")} />
                  <span className="flex-1 truncate">
                    {when} · {missed ? "missed" : `${label} with ${s.actorName}`}
                  </span>
                  {missed && <span className="text-[9px] uppercase font-semibold text-destructive">missed</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Act({
  icon: Icon, label, onClick, live, tone,
}: {
  icon: typeof Phone; label: string; onClick: () => void; live?: boolean; tone?: "warning";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 rounded-md border border-border bg-card hover:bg-muted/60 py-1.5 text-[10px] transition-colors",
        tone === "warning" && "border-warning/40 text-warning hover:bg-warning/10",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      {live && <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
    </button>
  );
}
