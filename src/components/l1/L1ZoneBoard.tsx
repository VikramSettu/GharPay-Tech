import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { L1_BAND_META, bpdOutlook, rollupByZone } from "@/lib/l1/engine";
import { deleteL1Review, useL1Reviews } from "@/lib/l1/store";
import { L1Scorecard } from "./L1Scorecard";
import { ChevronDown, ChevronRight, IndianRupee, Trash2 } from "lucide-react";

export function L1ZoneBoard() {
  const reviews = useL1Reviews();
  const [openZone, setOpenZone] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const rollups = useMemo(
    () => rollupByZone(reviews.map((r) => ({ zone: r.zone, analysis: r.analysis }))),
    [reviews],
  );
  const bpd = useMemo(() => bpdOutlook(rollups), [rollups]);

  if (!reviews.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No L1 reviews filed yet. Review one chat and one call per agent per day — that is how the
        step discipline becomes real.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary/30 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <IndianRupee className="size-4 text-primary" /> Path to 30 bookings per day
        </div>
        <div className="mt-2 grid gap-3 sm:grid-cols-4">
          <div><div className="text-[11px] text-muted-foreground">Reviewed conversations</div><div className="text-lg font-bold tabular-nums">{bpd.reviews}</div></div>
          <div><div className="text-[11px] text-muted-foreground">Expected bookings</div><div className="text-lg font-bold tabular-nums">{bpd.expected}</div></div>
          <div><div className="text-[11px] text-muted-foreground">Booking rate</div><div className="text-lg font-bold tabular-nums">{Math.round(bpd.rate * 100)}%</div></div>
          <div><div className="text-[11px] text-muted-foreground">Conversations needed / day</div><div className="text-lg font-bold tabular-nums">{bpd.conversationsNeeded ?? "—"}</div></div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          At this quality level we need {bpd.conversationsNeeded ?? "—"} conversations a day to hit 30 bookings.
          Every 10 points of L1 score removes conversations from that number.
        </p>
      </Card>

      {rollups.map((z) => {
        const zoneReviews = reviews.filter((r) => (r.zone || "Unzoned") === z.zone);
        const open = openZone === z.zone;
        return (
          <Card key={z.zone} className="overflow-hidden">
            <button type="button" onClick={() => setOpenZone(open ? null : z.zone)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40">
              <div className="flex items-center gap-2">
                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <div>
                  <div className="text-sm font-semibold">{z.zone}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {z.reviews} reviews · weakest step: {z.weakestStep} · top blocker: {z.topBlocker}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div className="hidden sm:block">
                  <div className="text-[10px] text-muted-foreground">Step compliance</div>
                  <Progress value={z.stepCompliance} className="mt-1 h-1.5 w-24" />
                </div>
                <div className="hidden md:block">
                  <div className="text-[10px] text-muted-foreground">Next step locked</div>
                  <div className="text-sm font-semibold tabular-nums">{z.nextStepLockedPct}%</div>
                </div>
                <div className="hidden md:block">
                  <div className="text-[10px] text-muted-foreground">Avg 1st reply</div>
                  <div className="text-sm font-semibold tabular-nums">{z.avgFirstResponse == null ? "—" : `${z.avgFirstResponse}m`}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Score</div>
                  <div className="text-lg font-bold tabular-nums">{z.avgScore}</div>
                </div>
                <Badge variant="outline" className="tabular-nums">{z.expectedBookings} BPD</Badge>
              </div>
            </button>

            {open && (
              <div className="border-t border-border p-3">
                <div className="mb-2 grid gap-2 sm:grid-cols-3 text-[11px] text-muted-foreground">
                  <span>Extra-10% index: <b className="text-foreground">{z.extraValuePct}%</b></span>
                  <span>Avg follow-up shortfall: <b className="text-foreground">{z.followUpGap}</b></span>
                  <span>Machine-written chats: <b className="text-foreground">{z.aiHeavy}</b></span>
                </div>
                <ul className="space-y-2">
                  {zoneReviews.map((r) => {
                    const band = L1_BAND_META[r.analysis.band];
                    const expanded = openId === r.id;
                    return (
                      <li key={r.id} className="rounded-lg border border-border">
                        <div className="flex items-center justify-between gap-2 p-2">
                          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(expanded ? null : r.id)}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">{r.kind}</Badge>
                              <span className="truncate text-sm font-medium">{r.agent || "Unnamed"} → {r.leadName || "lead"}</span>
                              <Badge className={band.className}>{r.analysis.total}</Badge>
                              {!r.analysis.nextStepLocked && <Badge variant="destructive">No next step</Badge>}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {r.stage} · {r.analysis.money.blockerLabel} · pays in ~{r.analysis.money.expectedPayInDays}d
                              {r.committedNextStep ? ` · committed: ${r.committedNextStep}` : ""}
                            </div>
                          </button>
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => deleteL1Review(r.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        {expanded && (
                          <div className="border-t border-border p-3">
                            {r.reviewerNote && (
                              <p className="mb-3 rounded-md bg-muted/50 p-2 text-xs"><b>Coaching note: </b>{r.reviewerNote}</p>
                            )}
                            <L1Scorecard a={r.analysis} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}