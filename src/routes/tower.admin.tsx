import { RoleGate } from "@/components/tower/RoleGate";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTowerAuth } from "@/lib/tower/auth";
import { ALL_ROLES, ROLE_LABEL, ROLE_SUMMARY } from "@/lib/tower/access";
import { TEAMS, TEAM_LABEL } from "@/lib/tower/review-os";
import { toast } from "sonner";

export const Route = createFileRoute("/tower/admin")({ component: () => <RoleGate module="admin"><Admin /></RoleGate> });

const CATS = ["A","B","C","D"] as const;
const ROLES = ALL_ROLES;


function Admin() {
  const auth = useTowerAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string[]>>({});

  const load = async () => {
    const [p, z, r] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("zones").select("*").order("name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles(p.data ?? []); setZones(z.data ?? []);
    const rm: Record<string, string[]> = {};
    (r.data ?? []).forEach((x) => { rm[x.user_id] ??= []; rm[x.user_id].push(x.role); });
    setRolesMap(rm);
  };
  useEffect(() => { load(); }, []);

  if (!auth.isAdmin) return <div>Admin only.</div>;

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="font-semibold mb-2">Users, roles, zones, categories</div>
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.user_id} className="border rounded p-2 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
              <div>
                <div className="font-medium">{p.full_name ?? p.user_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground flex gap-1 flex-wrap mt-0.5">
                  {(rolesMap[p.user_id] ?? []).map((r) => <Badge key={r} variant="outline">{ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r}</Badge>)}
                  {p.team && <Badge>{TEAM_LABEL[p.team as keyof typeof TEAM_LABEL]}</Badge>}
                </div>
              </div>
              <Select value={p.primary_zone_id ?? ""} onValueChange={async (v) => { await supabase.from("profiles").update({ primary_zone_id: v }).eq("user_id", p.user_id); toast.success("Zone updated"); load(); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="zone" /></SelectTrigger>
                <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={p.performer_category} onValueChange={async (v) => { await supabase.from("profiles").update({ performer_category: v as "A"|"B"|"C"|"D" }).eq("user_id", p.user_id); toast.success("Category updated"); load(); }}>
                <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={p.team ?? ""} onValueChange={async (v) => { await supabase.from("profiles").update({ team: v as any }).eq("user_id", p.user_id); toast.success("Team updated"); load(); }}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="team" /></SelectTrigger>
                <SelectContent>{TEAMS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex gap-1 flex-wrap">
                {ROLES.map((r) => {
                  const has = (rolesMap[p.user_id] ?? []).includes(r);
                  return (
                    <Button key={r} size="sm" variant={has ? "default" : "outline"} onClick={async () => {
                      if (has) await supabase.from("user_roles").delete().eq("user_id", p.user_id).eq("role", r);
                      else await supabase.from("user_roles").insert({ user_id: p.user_id, role: r });
                      load();
                    }} title={ROLE_SUMMARY[r]}>{ROLE_LABEL[r]}</Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <div className="font-semibold mb-2">Zones ({zones.length})</div>
        {zones.map((z) => (
          <div key={z.id} className="text-sm border-b py-1">
            <span className="font-medium">{z.name}</span> <span className="text-xs text-muted-foreground">{z.code}</span>
            {" · "}<Badge variant={z.is_active ? "default" : "outline"}>{z.is_active ? "active" : "paused"}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}