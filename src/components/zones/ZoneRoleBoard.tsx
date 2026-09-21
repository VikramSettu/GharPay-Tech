import { useMemo, useState } from "react";
import { ZONES, ZONE_ROLES, BACKUP_MATRIX, seedZoneMembers, FUNCTION_ROLES, PODS, POD_COVERAGE_RULE, type ZoneId, type ZoneRoleKey, type ZoneMember } from "@/lib/zones/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ShieldCheck, Users, ArrowRight, Layers, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";

const ROLE_BY_KEY = Object.fromEntries(ZONE_ROLES.map((r) => [r.key, r]));

export function ZoneRoleBoard() {
  const [members, setMembers] = useState<ZoneMember[]>(() => seedZoneMembers());
  const [activeZone, setActiveZone] = useState<ZoneId>("south");

  const toggle = (id: string) =>
    setMembers((ms) => ms.map((m) => m.id === id ? { ...m, presentToday: !m.presentToday } : m));

  const byZone = useMemo(() => {
    const map: Record<ZoneId, ZoneMember[]> = { central: [], south: [], east: [], north: [], west: [] };
    members.forEach((m) => map[m.zoneId].push(m));
    return map;
  }, [members]);

  const zoneMembers = byZone[activeZone];
  const absent = zoneMembers.filter((m) => !m.presentToday);
  const totalLeads = zoneMembers.reduce((s, m) => s + m.activeLeads, 0);
  const totalBreaches = zoneMembers.reduce((s, m) => s + m.slaBreaches, 0);

  return (
    <Tabs defaultValue="zones" className="space-y-4">
      <TabsList>
        <TabsTrigger value="zones">Zone roles</TabsTrigger>
        <TabsTrigger value="functions">Function catalogue</TabsTrigger>
        <TabsTrigger value="pods">Pods & coverage</TabsTrigger>
      </TabsList>

      {/* ── Zone roles ─────────────────────────────────────── */}
      <TabsContent value="zones" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {ZONES.map((z) => (
            <Button
              key={z.id}
              size="sm"
              variant={activeZone === z.id ? "default" : "outline"}
              onClick={() => setActiveZone(z.id)}
            >
              {z.name}
              <Badge variant="secondary" className="ml-2">{byZone[z.id].length}</Badge>
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Zone</div>
            <div className="text-lg font-semibold">{ZONES.find((z) => z.id === activeZone)?.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{ZONES.find((z) => z.id === activeZone)?.neighborhoods.join(" · ")}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Active leads · SLA breaches</div>
            <div className="text-lg font-semibold">{totalLeads} · <span className={totalBreaches ? "text-warning" : ""}>{totalBreaches}</span></div>
            <div className="text-xs text-muted-foreground mt-1">Across {zoneMembers.length} people</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Coverage today</div>
            <div className="text-lg font-semibold flex items-center gap-2">
              {zoneMembers.length - absent.length}/{zoneMembers.length}
              {absent.length === 0 ? (
                <Badge className="bg-success text-success-foreground">Full coverage</Badge>
              ) : (
                <Badge variant="destructive">{absent.length} absent</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Backup matrix auto-applied</div>
          </Card>
        </div>

        {absent.length > 0 && (
          <Card className="p-3 border-warning/40 bg-warning/5">
            <div className="text-xs font-semibold flex items-center gap-1 text-warning mb-2">
              <AlertTriangle className="h-3 w-3" /> Backup routing active
            </div>
            <ul className="space-y-1 text-xs">
              {absent.map((m) => {
                const covers = BACKUP_MATRIX[m.roleKey];
                const covering = zoneMembers.find((x) => x.roleKey === covers && x.presentToday);
                return (
                  <li key={m.id} className="flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">({ROLE_BY_KEY[m.roleKey].title}) →</span>
                    {covering ? (
                      <span>covered by <b>{covering.name}</b> ({ROLE_BY_KEY[covering.roleKey].title})</span>
                    ) : (
                      <span className="text-destructive">no backup available — escalate to Zone Lead</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {zoneMembers.map((m) => {
            const role = ROLE_BY_KEY[m.roleKey];
            const backsUp = ROLE_BY_KEY[role.backupOf];
            return (
              <Card key={m.id} className={`p-3 space-y-2 ${!m.presentToday ? "opacity-60" : ""}`}>
                <header className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                    {m.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{m.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{role.title}</div>
                  </div>
                  <Badge variant={m.presentToday ? "outline" : "destructive"} className="ml-auto text-[10px]">
                    {m.presentToday ? "on-shift" : "absent"}
                  </Badge>
                </header>
                <div className="text-[11px] text-muted-foreground">{role.primary}</div>
                <div className="text-[11px] flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  Backs up: <b>{backsUp.title}</b>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] pt-1 border-t">
                  <div><div className="text-muted-foreground">Leads</div><div className="font-semibold">{m.activeLeads}</div></div>
                  <div><div className="text-muted-foreground">SLA hit</div><div className={`font-semibold ${m.slaBreaches ? "text-warning" : ""}`}>{m.slaBreaches}</div></div>
                  <div><div className="text-muted-foreground">Closed/wk</div><div className="font-semibold">{m.closedThisWeek}</div></div>
                </div>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1" onClick={() => toggle(m.id)}>
                    {m.presentToday ? "Mark absent" : "Mark present"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" asChild>
                    <Link to="/leads/add"><Users className="h-3 w-3 mr-1" /> Leads</Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-3 bg-muted/30">
          <div className="text-xs font-semibold mb-2 flex items-center gap-1"><Zap className="h-3 w-3" /> If leads are slow — go find them</div>
          <p className="text-xs text-muted-foreground mb-2">
            When your inbox is quiet, open the shared lead pool for your zone and close what's stuck. Every role here can also work the pool.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild><Link to="/leads">Zone lead pool <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/revival">Revival queue <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/follow-ups">Follow-ups <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/leads/add">Reassign console <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
          </div>
        </Card>
      </TabsContent>

      {/* ── Function catalogue ─────────────────────────────── */}
      <TabsContent value="functions" className="space-y-3">
        <p className="text-xs text-muted-foreground">Hire by function. Zones change; functions remain constant.</p>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-2">Role</th>
                <th className="text-left p-2">Responsibility</th>
                <th className="text-left p-2">Pod</th>
                <th className="text-right p-2">Ideal count</th>
              </tr>
            </thead>
            <tbody>
              {FUNCTION_ROLES.map((r) => (
                <tr key={r.key} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-medium">{r.title}</td>
                  <td className="p-2 text-muted-foreground">{r.responsibility}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{PODS.find((p) => p.key === r.pod)?.label}</Badge></td>
                  <td className="p-2 text-right font-semibold">{r.idealCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      {/* ── Pods & coverage ────────────────────────────────── */}
      <TabsContent value="pods" className="space-y-3">
        <Card className="p-3 bg-primary/5 border-primary/30">
          <div className="text-xs font-semibold flex items-center gap-1"><Layers className="h-3 w-3" /> Pod coverage rule</div>
          <div className="text-sm mt-1">{POD_COVERAGE_RULE}</div>
          <div className="text-xs text-muted-foreground mt-1">No operation stops when one employee is absent or leaves.</div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PODS.map((p) => {
            const roles = FUNCTION_ROLES.filter((r) => r.pod === p.key);
            return (
              <Card key={p.key} className="p-3 space-y-2">
                <header className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{p.label}</h4>
                  <Badge variant="outline" className="ml-auto text-[10px]">{roles.length} role{roles.length !== 1 && "s"}</Badge>
                </header>
                <ul className="space-y-1 text-xs">
                  {roles.map((r) => (
                    <li key={r.key} className="flex items-center gap-2">
                      <span className="font-medium">{r.title}</span>
                      <span className="text-muted-foreground ml-auto">×{r.idealCount}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-[11px] text-muted-foreground border-t pt-2">
                  Primary · Backup · Emergency Backup must be defined for this pod.
                </div>
              </Card>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
}
