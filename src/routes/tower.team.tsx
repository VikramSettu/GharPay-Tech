import { RoleGate } from "@/components/tower/RoleGate";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTowerAuth } from "@/lib/tower/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/tower/team")({ component: () => <RoleGate module="team"><Team /></RoleGate> });

function Team() {
  const auth = useTowerAuth();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, is_clocked_in, is_available, is_restricted, performer_category, primary_zone_id, zones:primary_zone_id(name)");
    const { data: wl } = await supabase.from("workload_points").select("*");
    const wlMap = new Map((wl ?? []).map((w) => [w.user_id, w]));
    setRows((profiles ?? []).map((p) => ({ ...p, wl: wlMap.get(p.user_id) })));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-2">
      <div className="font-semibold">Team workload</div>
      <div className="grid gap-2">
        {rows.map((r) => {
          const isMe = r.user_id === auth.user?.id;
          const points = r.wl?.points ?? 0; const max = r.wl?.max_points ?? 25;
          const pct = Math.min(100, (points / max) * 100);
          const state = r.wl?.state ?? "available";
          const stateColor = state === "blocked" ? "bg-red-500" : state === "near_capacity" ? "bg-amber-500" : state === "unavailable" ? "bg-slate-500" : "bg-emerald-500";
          return (
            <Card key={r.user_id} className="p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {r.full_name ?? r.user_id.slice(0, 8)}
                    {isMe && <Badge variant="outline">you</Badge>}
                    <Badge>{r.performer_category}</Badge>
                    <Badge variant="outline">{r.zones?.name ?? "no zone"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Clocked {r.is_clocked_in ? "in" : "out"} · {r.is_available ? "available" : "unavailable"} {r.is_restricted && "· restricted"}
                  </div>
                </div>
                <div className="min-w-[240px]">
                  <div className="flex justify-between text-xs mb-1"><span>Workload {points}/{max}</span><span className={`px-1.5 rounded text-white text-[10px] ${stateColor}`}>{state}</span></div>
                  <div className="h-2 bg-muted rounded"><div className={`h-2 rounded ${stateColor}`} style={{ width: `${pct}%` }} /></div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Uncontacted {r.wl?.uncontacted ?? 0} · Overdue {r.wl?.overdue_followups ?? 0} · SLA open {r.wl?.sla_breaches_open ?? 0}
                  </div>
                </div>
                {isMe && (
                  <div className="flex gap-2">
                    <Button size="sm" variant={r.is_clocked_in ? "secondary" : "default"} onClick={async () => {
                      await supabase.from("profiles").update({ is_clocked_in: !r.is_clocked_in }).eq("user_id", r.user_id);
                      toast.success(!r.is_clocked_in ? "Clocked in" : "Clocked out"); load();
                    }}>{r.is_clocked_in ? "Clock out" : "Clock in"}</Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}