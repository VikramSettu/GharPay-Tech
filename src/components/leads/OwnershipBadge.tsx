import { useIdentityStore } from "@/lib/lead-identity/store";
import type { UnifiedLead } from "@/lib/lead-identity/types";
import { Button } from "@/components/ui/button";
import { Shield, UserPlus, Lock, Eye, Handshake, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { useLiveActivity } from "@/lib/live-activity";

interface Props {
  lead: UnifiedLead;
  ownerName?: string;
  compact?: boolean;
}

export function OwnershipBadge({ lead, ownerName, compact }: Props) {
  const me = useIdentityStore((s) => s.currentUser);
  const requestAccess = useIdentityStore((s) => s.requestAccess);
  const claimCowork = useLiveActivity((s) => s.claimCowork);
  const releaseClaim = useLiveActivity((s) => s.releaseClaim);
  const claims = useLiveActivity((s) => s.claims);
  const isPrimary = lead.primaryOwnerId === me.id;
  const isSecondary = lead.secondaryOwnerId === me.id;
  const slotsFull = !!lead.secondaryOwnerId;
  const myActiveClaim = claims.find(
    (c) => c.leadId === lead.ulid && c.claimerId === me.id && c.state === "active",
  );

  const onRequest = () => {
    const r = requestAccess(lead.ulid);
    if (r) toast.success("Access request sent to owner");
    else toast.info("Already pending or you're the owner");
  };

  const onClaim = () => {
    claimCowork({
      leadId: lead.ulid,
      claimerId: me.id,
      claimerName: me.name,
      primaryOwnerName: ownerName ?? lead.primaryOwnerId,
      reason: "Work in parallel while owner is unavailable",
    });
    toast.success("Claimed — you can work this lead in parallel", {
      description: "Owner is notified. Your activity is tracked separately.",
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border ${
        isPrimary ? "bg-primary/10 border-primary/30 text-primary"
        : isSecondary ? "bg-accent/10 border-accent/30 text-accent-foreground"
        : "bg-muted border-border text-muted-foreground"
      }`}>
        <Shield className="h-3 w-3" />
        {isPrimary ? "You · Primary" : `Owner: ${ownerName ?? lead.primaryOwnerId}`}
      </span>
      {lead.secondaryOwnerId && !compact && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-muted border border-border text-muted-foreground">
          +1 secondary
        </span>
      )}
      {myActiveClaim && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-accent/10 border border-accent/30 text-accent">
          <CircleDot className="h-3 w-3 animate-pulse" /> Co-working
          <button
            onClick={() => { releaseClaim(myActiveClaim.id); toast.info("Released claim"); }}
            className="ml-1 underline underline-offset-2 text-[10px] hover:text-foreground"
          >
            release
          </button>
        </span>
      )}
      {!isPrimary && !isSecondary && !myActiveClaim && (
        <>
          {!slotsFull && (
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={onRequest}>
              <UserPlus className="h-3 w-3" /> Request access
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 border-accent/50 text-accent hover:bg-accent/10" onClick={onClaim}>
            <Handshake className="h-3 w-3" /> Claim & work
          </Button>
          {slotsFull && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-muted border border-border text-muted-foreground">
              <Lock className="h-3 w-3" /> Both slots taken
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Eye className="h-3 w-3" /> parallel-work tracked
          </span>
        </>
      )}
    </div>
  );
}
