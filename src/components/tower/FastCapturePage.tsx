import { RoleGate } from "@/components/tower/RoleGate";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MOVE_IN_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, type MoveInBucket } from "@/lib/tower/scoring";
import { checkDuplicate, createAndAssign, simulateIncoming } from "@/lib/tower/engine";


type Conv = {
  id: string; wa_name: string | null; phone: string; first_message: string | null;
  received_at: string; captured_at: string | null; source_id: string | null; lead_id: string | null;
};
type Src = { id: string; wa_number: string; label: string };
type Zone = { id: string; code: string; name: string; inventory_strength: number };

export function FastCapturePage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [sources, setSources] = useState<Src[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState<Conv | null>(null);
  const [zoneId, setZoneId] = useState<string>("");
  const [movein, setMovein] = useState<MoveInBucket>("within_7d");
  const [dupInfo, setDupInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [counters, setCounters] = useState({ received: 0, captured: 0, pending: 0, assigned: 0, super_hot_pending: 0 });

  const load = async () => {
    const [c, s, z] = await Promise.all([
      supabase.from("inbound_conversations").select("*").order("received_at", { ascending: false }).limit(200),
      supabase.from("whatsapp_sources").select("id, wa_number, label").order("label"),
      supabase.from("zones").select("id, code, name, inventory_strength").order("name"),
    ]);
    setConvs((c.data ?? []) as Conv[]);
    setSources((s.data ?? []) as Src[]);
    setZones((z.data ?? []) as Zone[]);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const [rec, cap, asg, sh] = await Promise.all([
      supabase.from("inbound_conversations").select("id", { count: "exact", head: true }).gte("received_at", todayISO),
      supabase.from("inbound_conversations").select("id", { count: "exact", head: true }).gte("received_at", todayISO).not("captured_at", "is", null),
      supabase.from("assignments").select("id", { count: "exact", head: true }).gte("assigned_at", todayISO),
      supabase.from("assignments").select("id", { count: "exact", head: true }).eq("state", "pending_accept").eq("priority", "super_hot"),
    ]);
    const received = rec.count ?? 0; const captured = cap.count ?? 0;
    setCounters({ received, captured, pending: received - captured, assigned: asg.count ?? 0, super_hot_pending: sh.count ?? 0 });
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("tower-conv")
      .on("postgres_changes", { event: "*", schema: "public", table: "inbound_conversations" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!selected) { setDupInfo(null); return; }
    checkDuplicate(selected.phone).then((r) => {
      if (r.kind === "existing") setDupInfo(`⚠️ Returning lead — ${r.cycles} previous cycle(s). New enquiry will attach.`);
      else setDupInfo(null);
    });
  }, [selected]);

  const pending = useMemo(() => convs.filter((c) => !c.captured_at), [convs]);
  const captured = useMemo(() => convs.filter((c) => c.captured_at), [convs]);

  async function handleCreate() {
    if (!selected || !zoneId) { toast.error("Pick a conversation and a zone"); return; }
    setBusy(true);
    const res = await createAndAssign({
      conversationId: selected.id, phone: selected.phone, waName: selected.wa_name,
      zoneId, locationText: zones.find((z) => z.id === zoneId)?.name ?? "", moveinBucket: movein,
    });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    if (!res.ownerId) toast.warning(`Created ${PRIORITY_LABELS[res.priority]} lead — ${res.reason ?? "queued"}`);
    else toast.success(`Assigned ${PRIORITY_LABELS[res.priority]} lead (score ${res.score})`);
    setSelected(null); setZoneId(""); setMovein("within_7d");
    load();
  }

  async function simulate() {
    if (sources.length === 0) return;
    const src = sources[Math.floor(Math.random() * sources.length)];
    const phones = ["+919820011122", "+919845566778", "+919900112233", "+917988664422", "+919611223344"];
    const names = ["Rahul Sharma", "Priya Iyer", "Aman Gupta", "Sneha Rao", "Kunal Mehta", "Aisha Khan"];
    const msgs = ["Hi, looking for PG near Koramangala", "Any rooms in HSR under 15k?", "Move in this weekend, sharing available?", "Need single room in Indiranagar", "Corporate housing for team of 4"];
    await simulateIncoming(src.id,
      names[Math.floor(Math.random() * names.length)],
      phones[Math.floor(Math.random() * phones.length)],
      msgs[Math.floor(Math.random() * msgs.length)]);
    toast.info("Simulated new WhatsApp lead");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
      <div className="space-y-4">
        {/* Counters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <KPI label="Received today" value={counters.received} />
          <KPI label="Captured" value={counters.captured} tone="ok" />
          <KPI label="Pending capture" value={counters.pending} tone={counters.pending > 0 ? "warn" : "ok"} />
          <KPI label="Assigned" value={counters.assigned} />
          <KPI label="Super Hot pending accept" value={counters.super_hot_pending} tone={counters.super_hot_pending > 0 ? "warn" : "ok"} />
        </div>

        {/* Incoming queue */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Incoming WhatsApp queue ({pending.length})</div>
            <Button size="sm" variant="outline" onClick={simulate}>+ Simulate incoming</Button>
          </div>
          <div className="space-y-1 max-h-[420px] overflow-auto">
            {pending.length === 0 && <div className="text-xs text-muted-foreground p-3">Zero incoming. Everything captured.</div>}
            {pending.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full text-left rounded border p-2 hover:bg-muted ${selected?.id === c.id ? "border-primary bg-primary/5" : ""}`}>
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">{c.wa_name ?? "Unknown"} · {c.phone}</div>
                  <div className="text-xs text-muted-foreground">{waitLabel(c.received_at)}</div>
                </div>
                <div className="text-xs text-muted-foreground truncate">{sources.find((s) => s.id === c.source_id)?.label ?? "—"} · "{c.first_message}"</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Captured today */}
        <Card className="p-3">
          <div className="font-semibold mb-2">Captured today ({captured.length})</div>
          <div className="space-y-1 max-h-[240px] overflow-auto text-xs">
            {captured.map((c) => (
              <div key={c.id} className="flex items-center justify-between border rounded p-1.5">
                <div>{c.wa_name} · {c.phone}</div>
                {c.lead_id && <Link to="/tower/leads/$id" params={{ id: c.lead_id }} className="text-primary underline">Open lead →</Link>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Fast entry */}
      <Card className="p-4 h-fit sticky top-20">
        <div className="font-semibold mb-3">Fast Entry — Create & Assign</div>
        {!selected ? (
          <div className="text-sm text-muted-foreground">Select a conversation from the queue.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded border p-2 bg-muted/40 text-sm">
              <div className="font-medium">{selected.wa_name ?? "Unknown"} · {selected.phone}</div>
              <div className="text-xs text-muted-foreground">{sources.find((s) => s.id === selected.source_id)?.label}</div>
              <div className="text-xs mt-1 italic">"{selected.first_message}"</div>
            </div>
            {dupInfo && <div className="rounded bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs p-2">{dupInfo}</div>}
            <div>
              <Label>Location (zone)</Label>
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger><SelectValue placeholder="Pick zone…" /></SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name} · inventory {z.inventory_strength}/5</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Move-in date</Label>
              <Select value={movein} onValueChange={(v) => setMovein(v as MoveInBucket)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MOVE_IN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" size="lg" disabled={busy || !zoneId} onClick={handleCreate}>
              {busy ? "Assigning…" : "Create and Assign"}
            </Button>
            <div className="text-[11px] text-muted-foreground">Everything else — score, priority, zone match, best available owner, SLA timer, notify — is automatic.</div>
          </div>
        )}
      </Card>
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  const c = tone === "warn" ? "bg-amber-500/10 border-amber-500/40" : tone === "ok" ? "bg-emerald-500/10 border-emerald-500/40" : "";
  return (
    <div className={`rounded border p-2 ${c}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function waitLabel(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}