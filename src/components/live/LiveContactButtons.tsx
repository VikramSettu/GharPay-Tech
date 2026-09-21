import { Button } from "@/components/ui/button";
import { Phone, MessageCircle } from "lucide-react";
import { beginLiveIfEnabled, useLiveActivity } from "@/lib/live-activity";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { toast } from "sonner";

/**
 * Drop-in row of "Call" + "WhatsApp" buttons that also auto-register a live
 * session in the LiveActivityDock (when auto-track is ON for that channel).
 */
export function LiveContactButtons({
  leadId, leadName, phone, waMessage,
}: {
  leadId: string; leadName: string; phone: string; waMessage?: string;
}) {
  const me = useIdentityStore((s) => s.currentUser);
  const autoTrack = useLiveActivity((s) => s.autoTrack);

  const clean = phone.replace(/[^\d+]/g, "");
  const digits = clean.startsWith("+") ? clean.slice(1) : clean;

  const startCall = () => {
    const s = beginLiveIfEnabled({
      leadId, leadName, channel: "call",
      actorId: me.id, actorName: me.name,
    });
    window.location.href = `tel:${clean}`;
    if (s) toast.success("Call started — showing live in dock");
    else toast.info("Call opened (auto-track OFF)");
  };

  const startChat = () => {
    const s = beginLiveIfEnabled({
      leadId, leadName, channel: "chat",
      actorId: me.id, actorName: me.name,
    });
    const url = `https://wa.me/${digits}${waMessage ? `?text=${encodeURIComponent(waMessage)}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
    if (s) toast.success("Chat started — showing live in dock");
    else toast.info("WhatsApp opened (auto-track OFF)");
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={startCall}>
        <Phone className="h-3 w-3" />
        Call {autoTrack.call && <LiveDot />}
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={startChat}>
        <MessageCircle className="h-3 w-3" />
        Chat {autoTrack.chat && <LiveDot />}
      </Button>
    </div>
  );
}

function LiveDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse ml-0.5" />;
}
