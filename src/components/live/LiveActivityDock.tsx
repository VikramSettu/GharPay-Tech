import { useEffect, useState } from "react";
import { useLiveActivity, type Channel } from "@/lib/live-activity";
import { Phone, MessageCircle, Mic, MicOff, X, CircleDot, PhoneOff, CheckCheck, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Wispr Flow-style dock — global on/off toggle per channel + live indicator
 * of any call or WhatsApp chat currently in progress. Missed/ended sessions
 * stay visible as "recent" so nothing slips through.
 */
export function LiveActivityDock() {
  const autoTrack = useLiveActivity((s) => s.autoTrack);
  const toggleAutoTrack = useLiveActivity((s) => s.toggleAutoTrack);
  const sessions = useLiveActivity((s) => s.sessions);
  const endSession = useLiveActivity((s) => s.endSession);
  const markMissed = useLiveActivity((s) => s.markMissed);

  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Re-render every second so live timers stay accurate.
  useEffect(() => {
    const live = sessions.some((s) => s.state === "live");
    if (!live) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [sessions]);

  const active = sessions.filter((s) => s.state === "live");
  const recent = sessions.filter((s) => s.state !== "live").slice(0, 6);
  const anyActive = active.length > 0;

  return (
    <div className="flex items-center gap-1.5">
      <ChannelToggle
        channel="call"
        on={autoTrack.call}
        liveCount={active.filter((s) => s.channel === "call").length}
        onToggle={() => {
          toggleAutoTrack("call");
          toast.info(`Call auto-tracking ${!autoTrack.call ? "ON" : "OFF"}`);
        }}
      />
      <ChannelToggle
        channel="chat"
        on={autoTrack.chat}
        liveCount={active.filter((s) => s.channel === "chat").length}
        onToggle={() => {
          toggleAutoTrack("chat");
          toast.info(`Chat auto-tracking ${!autoTrack.chat ? "ON" : "OFF"}`);
        }}
      />
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors",
          anyActive
            ? "border-accent bg-accent/10 text-accent"
            : "border-border bg-card text-muted-foreground hover:bg-muted/60",
        )}
        title="Live activity feed"
        data-tick={tick}
      >
        <CircleDot className={cn("h-3 w-3", anyActive && "animate-pulse")} />
        <span className="font-mono">{active.length}</span>
        <span className="hidden md:inline">live</span>
      </button>

      {open && (
        <div className="fixed right-3 top-16 z-50 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-xs font-semibold flex items-center gap-1.5">
              <CircleDot className={cn("h-3 w-3", anyActive && "text-accent animate-pulse")} />
              Live activity
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2 space-y-2 scrollbar-thin">
            <SectionLabel icon={<CircleDot className="h-3 w-3 text-accent" />} label={`Live now (${active.length})`} />
            {active.length === 0 && (
              <EmptyLine text="No calls or chats in progress." />
            )}
            {active.map((s) => (
              <LiveRow
                key={s.id}
                session={s}
                onEnd={() => { endSession(s.id); toast.success("Session logged"); }}
                onMissed={() => { markMissed(s.id); toast.warning("Marked as missed"); }}
              />
            ))}

            <SectionLabel icon={<History className="h-3 w-3" />} label="Recent" />
            {recent.length === 0 && <EmptyLine text="Nothing logged yet." />}
            {recent.map((s) => (
              <RecentRow key={s.id} session={s} />
            ))}
          </div>

          <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            Toggle the mic-style buttons to auto-track new calls & chats.
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelToggle({
  channel, on, liveCount, onToggle,
}: {
  channel: Channel; on: boolean; liveCount: number; onToggle: () => void;
}) {
  const Icon = channel === "call" ? Phone : MessageCircle;
  const label = channel === "call" ? "Calls" : "Chats";
  return (
    <button
      onClick={onToggle}
      title={`${label} auto-track: ${on ? "ON" : "OFF"}`}
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
        on
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-card text-muted-foreground hover:bg-muted/60",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {on ? (
        <Mic className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-background p-[1px]" />
      ) : (
        <MicOff className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-background p-[1px] text-muted-foreground" />
      )}
      {liveCount > 0 && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent animate-ping" />
      )}
    </button>
  );
}

function LiveRow({
  session, onEnd, onMissed,
}: {
  session: ReturnType<typeof useLiveActivity.getState>["sessions"][number];
  onEnd: () => void; onMissed: () => void;
}) {
  const Icon = session.channel === "call" ? Phone : MessageCircle;
  const dur = Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
  const mm = String(Math.floor(dur / 60)).padStart(2, "0");
  const ss = String(dur % 60).padStart(2, "0");
  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 p-2 space-y-1.5">
      <div className="flex items-center gap-2 text-xs">
        <Icon className="h-3.5 w-3.5 text-accent" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{session.leadName}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {session.actorName} · {session.channel === "call" ? "on call" : "chatting now"}
          </div>
        </div>
        <span className="font-mono text-[11px] text-accent">{mm}:{ss}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onEnd}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-border bg-card px-2 py-1 text-[10px] hover:bg-muted/60"
        >
          <CheckCheck className="h-3 w-3" /> End & log
        </button>
        <button
          onClick={onMissed}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-border bg-card px-2 py-1 text-[10px] hover:bg-muted/60"
        >
          <PhoneOff className="h-3 w-3" /> Missed
        </button>
      </div>
    </div>
  );
}

function RecentRow({
  session,
}: {
  session: ReturnType<typeof useLiveActivity.getState>["sessions"][number];
}) {
  const Icon = session.channel === "call" ? Phone : MessageCircle;
  const missed = session.state === "missed";
  const dur = session.endedAt
    ? Math.max(1, Math.floor((session.endedAt - session.startedAt) / 1000))
    : 0;
  const label = dur >= 60 ? `${Math.floor(dur / 60)}m ${dur % 60}s` : `${dur}s`;
  const when = new Date(session.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={cn(
      "rounded-md border p-2 flex items-center gap-2 text-xs",
      missed ? "border-destructive/30 bg-destructive/5" : "border-border bg-card",
    )}>
      <Icon className={cn("h-3.5 w-3.5", missed ? "text-destructive" : "text-muted-foreground")} />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{session.leadName}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {when} · {missed ? "missed" : `${label} with ${session.actorName}`}
        </div>
      </div>
      {missed && (
        <span className="text-[9px] uppercase font-semibold text-destructive">missed</span>
      )}
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 pt-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
      {icon} {label}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="text-[10px] text-muted-foreground px-2 py-1.5">{text}</div>;
}
