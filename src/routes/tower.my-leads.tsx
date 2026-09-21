import { RoleGate } from "@/components/tower/RoleGate";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTowerAuth } from "@/lib/tower/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/tower/scoring";
import { acceptAssignment } from "@/lib/tower/engine";
import { toast } from "sonner";

export const Route = createFileRoute("/tower/my-leads")({ component: () => <RoleGate module="my-leads"><MyLeads /></RoleGate> });

type Row = {
  id: string; lead_id: string; priority: "super_hot" | "hot" | "active" | "future" | "nurture";
  state: string; assigned_at: string; accepted_at: string | null; first_action_at: string | null;
  sla_deadline_accept: string; sla_deadline_first_action: string;
  leads: { id: string; wa_name: string | null; phone: string; location_text: string | null; score: number } | null;
};

function MyLeads() {
  const auth = useTowerAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [tick, setTick] = useState(0);

  const load = async () => {
    if (!auth.user) return;
    const { data } = await supabase.from("assignments")
      .select("id, lead_id, priority, state, assigned_at, accepted_at, first_action_at, sla_deadline_accept, sla_deadline_first_action, leads(id, wa_name, phone, location_text, score)")
      .eq("owner_id", auth.user.id).in("state", ["pending_accept", "accepted"])
      .order("assigned_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
  };

  useEffect(() => { load(); }, [auth.user?.id]);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const ch = supabase.channel("my-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-2">
      <div className="font-semibold">My Assigned Leads ({rows.length})</div>
      {rows.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No pending leads.</Card>}
      {rows.map((r) => {
        const dl = new Date(r.state === "pending_accept" ? r.sla_deadline_accept : r.sla_deadline_first_action);
        const secs = Math.floor((dl.getTime() - Date.now()) / 1000);
        const breach = secs < 0;
        void tick;
        return (
          <Card key={r.id} className="p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={PRIORITY_COLORS[r.priority]}>{PRIORITY_LABELS[r.priority]}</Badge>
                  <span className="font-semibold">{r.leads?.wa_name ?? "Unknown"} · {r.leads?.phone}</span>
                  <span className="text-xs text-muted-foreground">{r.leads?.location_text}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Score {r.leads?.score} · Assigned {timeAgo(r.assigned_at)}
                  {r.accepted_at && ` · Accepted ${timeAgo(r.accepted_at)}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-sm font-mono tabular-nums px-2 py-1 rounded ${breach ? "bg-red-500 text-white" : secs < 60 ? "bg-amber-500 text-black" : "bg-muted"}`}>
                  {r.state === "pending_accept" ? "Accept" : "First action"}: {fmt(secs)}
                </div>
                {r.state === "pending_accept" && (
                  <Button size="sm" onClick={async () => { await acceptAssignment(r.id); toast.success("Accepted"); load(); }}>
                    Accept & Work
                  </Button>
                )}
                <Link to="/tower/leads/$id" params={{ id: r.lead_id }}>
                  <Button size="sm" variant="outline">Open →</Button>
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function fmt(s: number) {
  const a = Math.abs(s);
  const m = Math.floor(a / 60), sec = a % 60;
  return `${s < 0 ? "-" : ""}${m}:${sec.toString().padStart(2, "0")}`;
}