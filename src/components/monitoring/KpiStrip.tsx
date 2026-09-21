import { useMonitoring } from "@/lib/monitoring/activity-store";
import { usePipeline } from "@/lib/pipeline/store";
import { computeSlaState } from "@/lib/pipeline/stage-engine";
import { DAILY_TARGETS } from "@/lib/pipeline/stage-config";
import { useAutomationTicker } from "@/hooks/useAutomationTicker";
import { cn } from "@/lib/utils";

export function KpiStrip() {
  const now = useAutomationTicker(30_000);
  const activities = useMonitoring((s) => s.activities);
  const states = usePipeline((s) => s.states);

  const stateList = Object.values(states);
  const todayCutoff = new Date(); todayCutoff.setHours(0, 0, 0, 0);
  const todayMs = todayCutoff.getTime();

  const leadsAddedToday = activities.filter((a) => a.action === "lead-added" && Date.parse(a.ts) >= todayMs).length;
  const dossierComplete = stateList.filter((s) => s.dossier.completionPct === 100).length;
  const dossierPct = stateList.length ? Math.round((dossierComplete / stateList.length) * 100) : 0;
  const timerViolations = stateList.filter((s) => s.currentStage === "DOSSIER" && computeSlaState(s, now) === "breached").length;
  const toursScheduled = stateList.filter((s) => !!s.tour?.date).length;
  const toursCompleted = stateList.filter((s) => !!s.tour?.completedAt).length;
  const quotesSent = stateList.filter((s) => !!s.quote?.sentAt).length;
  const bookings = stateList.filter((s) => !!s.booking?.paymentRef).length;
  const stuck = stateList.filter((s) => computeSlaState(s, now) === "breached").length;
  const escalated = stateList.filter((s) => computeSlaState(s, now) === "escalated").length;
  const activeFollowUps = stateList.filter((s) => s.currentStage === "NEGOTIATION").length;

  const kpis = [
    { label: "Leads Added", v: leadsAddedToday, target: 0 },
    { label: "Dossier %", v: `${dossierPct}%`, warn: dossierPct < 80 },
    { label: "Timer Violations", v: timerViolations, warn: timerViolations > 0 },
    { label: "Tours Scheduled", v: `${toursScheduled}/${DAILY_TARGETS.leadsScheduled}` },
    { label: "Tours Completed", v: toursCompleted },
    { label: "Quotes Sent", v: `${quotesSent}/${DAILY_TARGETS.quotationsGenerated}`, warn: quotesSent < DAILY_TARGETS.quotationsGenerated },
    { label: "Bookings", v: bookings },
    { label: "Active Follow-ups", v: activeFollowUps },
    { label: "Stuck", v: stuck, warn: stuck > 0 },
    { label: "Escalated", v: escalated, warn: escalated > 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {kpis.map((k) => (
        <div key={k.label} className={cn(
          "rounded-md border bg-card px-3 py-2",
          k.warn && "border-destructive/40 bg-destructive/5",
        )}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
          <div className={cn("text-lg font-display font-semibold", k.warn && "text-destructive")}>{k.v}</div>
        </div>
      ))}
    </div>
  );
}
