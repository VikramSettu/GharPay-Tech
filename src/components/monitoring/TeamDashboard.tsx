import { useMonitoring } from "@/lib/monitoring/activity-store";
import { useAutomationTicker } from "@/hooks/useAutomationTicker";
import { DAILY_TARGETS } from "@/lib/pipeline/stage-config";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * 30-min per-teammate dashboard. Detects inactive teammates and stuck stages.
 */
export function TeamDashboard({ onSelect }: { onSelect?: (tcmId: string) => void } = {}) {
  useAutomationTicker(30_000);
  const activities = useMonitoring((s) => s.activities);

  const perUser = new Map<string, { name: string; leadsAdded: number; clicks: number; scheduled: number; quotes: number; lastAt: number; features: Record<string, number> }>();
  const now = Date.now();
  const todayCutoff = new Date(); todayCutoff.setHours(0, 0, 0, 0);
  const todayMs = todayCutoff.getTime();

  for (const a of activities) {
    const ts = Date.parse(a.ts);
    if (ts < todayMs) continue;
    const cur = perUser.get(a.userId) ?? { name: a.userName, leadsAdded: 0, clicks: 0, scheduled: 0, quotes: 0, lastAt: 0, features: {} };
    cur.clicks++;
    if (a.action === "lead-added") cur.leadsAdded++;
    if (a.action === "stage-changed" && a.stageTo === "TOUR_SCHEDULED") cur.scheduled++;
    if (a.action === "stage-changed" && a.stageTo === "QUOTED") cur.quotes++;
    cur.lastAt = Math.max(cur.lastAt, ts);
    cur.features[a.feature] = (cur.features[a.feature] ?? 0) + 1;
    perUser.set(a.userId, cur);
  }

  const rows = Array.from(perUser.entries()).map(([id, u]) => {
    const idleMin = Math.round((now - u.lastAt) / 60000);
    const mostUsed = Object.entries(u.features).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const inactive = idleMin > 30;
    const scheduledOk = u.scheduled >= DAILY_TARGETS.leadsScheduled;
    const quotesOk = u.quotes >= DAILY_TARGETS.quotationsGenerated;
    return { id, ...u, idleMin, mostUsed, inactive, scheduledOk, quotesOk };
  });

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-2 border-b text-sm font-semibold">
        30-Min Team Dashboard · Targets: {DAILY_TARGETS.leadsScheduled} scheduled / {DAILY_TARGETS.quotationsGenerated} quotes
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-3 py-2">Teammate</th>
              <th className="px-3 py-2">Leads Added</th>
              <th className="px-3 py-2">Clicks</th>
              <th className="px-3 py-2">Scheduled</th>
              <th className="px-3 py-2">Quotes</th>
              <th className="px-3 py-2">Most Used</th>
              <th className="px-3 py-2">Idle (min)</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onSelect?.(r.id)}
                className={cn("border-t cursor-pointer hover:bg-primary/5", r.inactive && "bg-destructive/5")}
              >
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.leadsAdded}</td>
                <td className="px-3 py-2">{r.clicks}</td>
                <td className={cn("px-3 py-2", r.scheduledOk ? "text-success" : "text-muted-foreground")}>
                  {r.scheduled}/{DAILY_TARGETS.leadsScheduled}
                </td>
                <td className={cn("px-3 py-2", r.quotesOk ? "text-success" : "text-muted-foreground")}>
                  {r.quotes}/{DAILY_TARGETS.quotationsGenerated}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.mostUsed}</td>
                <td className="px-3 py-2 font-mono">{r.idleMin}</td>
                <td className="px-3 py-2">
                  {r.inactive
                    ? <Badge variant="destructive">Inactive</Badge>
                    : r.scheduledOk && r.quotesOk
                      ? <Badge className="bg-success text-success-foreground">On Track</Badge>
                      : <Badge variant="secondary">Working</Badge>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No activity today.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
