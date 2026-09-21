import { RoleGate } from "@/components/tower/RoleGate";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/tower/eod")({ component: () => <RoleGate module="eod"><EOD /></RoleGate> });

function EOD() {
  const [orphan, setOrphan] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [noAction, setNoAction] = useState<any[]>([]);
  const [noScenario, setNoScenario] = useState<any[]>([]);
  const [breaches, setBreaches] = useState<any[]>([]);

  useEffect(() => {
    const t = new Date(); t.setHours(0,0,0,0); const iso = t.toISOString();
    (async () => {
      const [a, b, c, d, e] = await Promise.all([
        supabase.from("inbound_conversations").select("*").is("captured_at", null).gte("received_at", iso),
        supabase.from("assignments").select("*, leads(wa_name, phone)").eq("state","pending_accept"),
        supabase.from("assignments").select("*, leads(wa_name, phone)").eq("state","accepted").is("first_action_at", null),
        supabase.from("leads").select("id, wa_name, phone").is("current_scenario", null).eq("status","open"),
        supabase.from("sla_breaches").select("*, assignments(lead_id, leads(wa_name, phone))").gte("breached_at", iso),
      ]);
      setOrphan(a.data ?? []); setPending(b.data ?? []); setNoAction(c.data ?? []); setNoScenario(d.data ?? []); setBreaches(e.data ?? []);
    })();
  }, []);

  const zeroLeft = orphan.length === 0 && pending.length === 0 && noAction.length === 0 && noScenario.length === 0;

  return (
    <div className="space-y-3">
      <Card className={`p-4 ${zeroLeft ? "bg-emerald-50" : "bg-amber-50"}`}>
        <div className="text-lg font-bold">{zeroLeft ? "✅ Zero Lead Left Behind" : "⚠️ Not clean yet — resolve below"}</div>
        <div className="text-xs text-muted-foreground">EOD checklist for today</div>
      </Card>
      <Section title="Uncaptured inbound" items={orphan.map((o) => ({ id: o.id, label: `${o.wa_name ?? "Unknown"} · ${o.phone}` }))} />
      <Section title="Assignments awaiting accept" items={pending.map((a) => ({ id: a.lead_id, label: `${a.leads?.wa_name ?? "?"} · ${a.leads?.phone}`, badge: a.priority }))} link />
      <Section title="Accepted but no first action" items={noAction.map((a) => ({ id: a.lead_id, label: `${a.leads?.wa_name ?? "?"} · ${a.leads?.phone}` }))} link />
      <Section title="No scenario set" items={noScenario.map((l) => ({ id: l.id, label: `${l.wa_name ?? "?"} · ${l.phone}` }))} link />
      <Section title="SLA breaches today" items={breaches.map((b) => ({ id: b.assignments?.lead_id, label: `${b.assignments?.leads?.wa_name ?? "?"} · ${b.assignments?.leads?.phone ?? ""}`, badge: b.kind }))} link />
    </div>
  );
}

function Section({ title, items, link }: { title: string; items: { id: string; label: string; badge?: string }[]; link?: boolean }) {
  return (
    <Card className="p-3">
      <div className="font-semibold mb-2 flex items-center gap-2">{title} <Badge variant="outline">{items.length}</Badge></div>
      {items.length === 0 ? <div className="text-xs text-muted-foreground">Clean</div> : (
        <div className="space-y-1">
          {items.map((it) => (
            <div key={it.id} className="text-sm flex items-center justify-between border-b pb-1">
              {link ? <Link to="/tower/leads/$id" params={{ id: it.id }} className="underline">{it.label}</Link> : <span>{it.label}</span>}
              {it.badge && <Badge>{it.badge}</Badge>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}