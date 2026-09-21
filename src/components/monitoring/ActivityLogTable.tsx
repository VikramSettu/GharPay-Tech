import { useMonitoring } from "@/lib/monitoring/activity-store";
import { useAutomationTicker } from "@/hooks/useAutomationTicker";
import { Button } from "@/components/ui/button";

export function ActivityLogTable() {
  useAutomationTicker(30_000);
  const activities = useMonitoring((s) => s.activities).slice(0, 200);
  const clear = useMonitoring((s) => s.clear);

  const exportCsv = () => {
    const headers = ["ts", "user", "team", "leadId", "leadName", "action", "feature", "stageFrom", "stageTo", "remarks"];
    const rows = activities.map((a) => [
      a.ts, a.userName, a.team ?? "", a.leadId ?? "", a.leadName ?? "",
      a.action, a.feature, a.stageFrom ?? "", a.stageTo ?? "", a.remarks ?? "",
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `activity_${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="text-sm font-semibold">Raw Activity ({activities.length})</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
          <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/60">
            <tr className="text-left">
              <th className="px-3 py-1.5">Time</th>
              <th className="px-3 py-1.5">User</th>
              <th className="px-3 py-1.5">Lead</th>
              <th className="px-3 py-1.5">Action</th>
              <th className="px-3 py-1.5">Feature</th>
              <th className="px-3 py-1.5">Stage Δ</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-1 text-muted-foreground font-mono">{new Date(a.ts).toLocaleTimeString()}</td>
                <td className="px-3 py-1">{a.userName}</td>
                <td className="px-3 py-1 text-muted-foreground">{a.leadName ?? a.leadId ?? "—"}</td>
                <td className="px-3 py-1">{a.action}</td>
                <td className="px-3 py-1 text-muted-foreground">{a.feature}</td>
                <td className="px-3 py-1 text-muted-foreground">{a.stageFrom ? `${a.stageFrom} → ${a.stageTo}` : "—"}</td>
              </tr>
            ))}
            {activities.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No activity yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
