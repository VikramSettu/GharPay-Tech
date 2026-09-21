import { useMemo, useState } from "react";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { HR_PEOPLE, FLOWOPS_PEOPLE, TCM_STATS } from "@/lib/people";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Inbox, Check, X, Search, UserPlus, ArrowRightLeft, Zap, Filter } from "lucide-react";
import { ReassignAdminOps } from "@/components/admin/ReassignAdminOps";

type Tab = "incoming" | "outgoing" | "duplicates" | "all";

const ALL_MEMBERS = [
  ...HR_PEOPLE.map((p) => ({ id: p.id, name: p.name, focus: p.focus })),
  ...FLOWOPS_PEOPLE.map((p) => ({ id: p.id, name: p.name, focus: p.focus })),
  ...Object.entries(TCM_STATS).map(([id, s]) => ({ id, name: s.name, focus: s.focus })),
];

export function ReassignConsole() {
  const me = useIdentityStore((s) => s.currentUser);
  const requests = useIdentityStore((s) => s.requests);
  const leads = useIdentityStore((s) => s.leads);
  const decideRequest = useIdentityStore((s) => s.decideRequest);
  const reassignPrimary = useIdentityStore((s) => s.reassignPrimary);

  const [tab, setTab] = useState<Tab>("incoming");
  const [q, setQ] = useState("");
  const [state, setState] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reassignOpen, setReassignOpen] = useState<{ ulid: string; name: string } | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("");
  const [reassignReason, setReassignReason] = useState("");

  const filtered = useMemo(() => {
    const bySide = requests.filter((r) => {
      if (tab === "incoming") return r.toOwnerId === me.id;
      if (tab === "outgoing") return r.requesterId === me.id;
      return true;
    });
    const byState = state === "all" ? bySide : bySide.filter((r) => r.state === state);
    if (!q.trim()) return byState;
    const ql = q.toLowerCase();
    return byState.filter((r) => {
      const lead = leads.find((l) => l.ulid === r.ulid);
      return (
        r.requesterName.toLowerCase().includes(ql) ||
        (lead?.name ?? "").toLowerCase().includes(ql) ||
        (lead?.phoneE164 ?? "").includes(ql)
      );
    });
  }, [requests, tab, state, q, leads, me.id]);

  const duplicates = useMemo(() => {
    // Group leads by phone or emailNorm; return groups with >1 entry.
    const byKey = new Map<string, typeof leads>();
    leads.forEach((l) => {
      const k = l.phoneE164 || l.emailNorm;
      if (!k) return;
      const arr = byKey.get(k) ?? [];
      arr.push(l);
      byKey.set(k, arr);
    });
    return [...byKey.entries()]
      .filter(([, arr]) => arr.length > 1)
      .map(([key, arr]) => ({ key, leads: arr }));
  }, [leads]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const clearSel = () => setSelected(new Set());

  const bulk = (decision: "approved" | "rejected") => {
    if (selected.size === 0) return;
    selected.forEach((id) => decideRequest(id, decision));
    toast.success(`${selected.size} request${selected.size > 1 ? "s" : ""} ${decision}`);
    clearSel();
  };

  const doReassign = () => {
    if (!reassignOpen || !reassignTo) return;
    const to = ALL_MEMBERS.find((m) => m.id === reassignTo);
    if (!to) return;
    reassignPrimary(reassignOpen.ulid, to.id, to.name, reassignReason || "duplicate-cleanup");
    toast.success(`Reassigned to ${to.name}`);
    setReassignOpen(null);
    setReassignTo("");
    setReassignReason("");
  };

  const incomingPending = requests.filter((r) => r.toOwnerId === me.id && r.state === "pending").length;
  const outgoingPending = requests.filter((r) => r.requesterId === me.id && r.state === "pending").length;

  return (
    <Card className="p-4 space-y-3">
      <header className="flex items-center gap-2 flex-wrap">
        <Inbox className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Reassign & Duplicate Console</h3>
        <p className="text-[11px] text-muted-foreground w-full">
          Bulk-approve, redirect, or reassign in a couple of clicks. Duplicate leads surface their siblings so you can merge ownership fast.
        </p>
      </header>

      <ReassignAdminOps />



      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1">
          {(["incoming", "outgoing", "duplicates", "all"] as Tab[]).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? "default" : "outline"}
              className="h-7 text-[11px] capitalize"
              onClick={() => { setTab(t); clearSel(); }}
            >
              {t}
              {t === "incoming" && incomingPending > 0 && <Badge className="ml-1 h-4 text-[10px]">{incomingPending}</Badge>}
              {t === "outgoing" && outgoingPending > 0 && <Badge className="ml-1 h-4 text-[10px]" variant="secondary">{outgoingPending}</Badge>}
              {t === "duplicates" && duplicates.length > 0 && <Badge className="ml-1 h-4 text-[10px]" variant="destructive">{duplicates.length}</Badge>}
            </Button>
          ))}
        </div>
        {tab !== "duplicates" && (
          <>
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search lead, phone, requester" value={q} onChange={(e) => setQ(e.target.value)} className="h-7 pl-7 text-xs w-56" />
            </div>
            <Select value={state} onValueChange={(v) => setState(v as typeof state)}>
              <SelectTrigger className="h-7 w-32 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All states</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-2 text-xs">
          <b>{selected.size}</b> selected
          <Button size="sm" variant="outline" className="h-7 text-[11px] ml-auto gap-1" onClick={() => bulk("approved")}>
            <Check className="h-3 w-3" /> Approve all
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => bulk("rejected")}>
            <X className="h-3 w-3" /> Reject all
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={clearSel}>Clear</Button>
        </div>
      )}

      {/* Duplicate view */}
      {tab === "duplicates" ? (
        duplicates.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No duplicates detected. Nice — your lead identity graph is clean.
          </div>
        ) : (
          <ul className="space-y-2">
            {duplicates.map((g) => {
              const canonical = [...g.leads].sort((a, b) => (b.lastActivityAt > a.lastActivityAt ? 1 : -1))[0];
              return (
                <li key={g.key} className="rounded-md border p-2 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-warning" />
                    <b>{g.leads.length}× same identity</b>
                    <span className="text-muted-foreground">key {g.key.slice(0, 14)}…</span>
                    <Badge variant="outline" className="ml-auto">canonical → {canonical.name}</Badge>
                  </div>
                  <div className="pl-4 space-y-1">
                    {g.leads.map((l) => (
                      <div key={l.ulid} className="flex items-center gap-2">
                        <span className="font-medium">{l.name}</span>
                        <span className="text-muted-foreground">{l.area || "no area"} · {l.state}</span>
                        <span className="text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(l.lastActivityAt), { addSuffix: true })}
                        </span>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1"
                          onClick={() => setReassignOpen({ ulid: l.ulid, name: l.name })}>
                          <ArrowRightLeft className="h-3 w-3" /> Reassign
                        </Button>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
          No requests match your filter.
        </div>
      ) : (
        <ul className="space-y-1">
          {filtered.map((r) => {
            const lead = leads.find((l) => l.ulid === r.ulid);
            const isPending = r.state === "pending";
            return (
              <li key={r.id} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                {isPending && (
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <b>{r.requesterName}</b>
                    <span className="text-muted-foreground">→ {lead?.name ?? "lead"}</span>
                    <Badge
                      variant={r.state === "pending" ? "secondary" : r.state === "approved" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {r.state}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {lead?.phoneE164 || "no phone"} · {lead?.area || "no area"} · {formatDistanceToNow(new Date(r.ts), { addSuffix: true })}
                    {r.message ? ` · "${r.message}"` : ""}
                  </div>
                </div>
                {isPending && tab === "incoming" && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
                      onClick={() => { decideRequest(r.id, "approved"); toast.success("Granted"); }}>
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1"
                      onClick={() => { decideRequest(r.id, "rejected"); toast.info("Rejected"); }}>
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </>
                )}
                {lead && (
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
                    onClick={() => setReassignOpen({ ulid: lead.ulid, name: lead.name })}>
                    <ArrowRightLeft className="h-3 w-3" /> Reassign
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Reassign dialog */}
      <Dialog open={!!reassignOpen} onOpenChange={(o) => !o && setReassignOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Reassign {reassignOpen?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">New primary owner</span>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger><SelectValue placeholder="Pick teammate" /></SelectTrigger>
                <SelectContent>
                  {ALL_MEMBERS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} · <span className="text-muted-foreground">{m.focus}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Reason</span>
              <Input placeholder="e.g. duplicate merge · zone rebalance" value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(null)}>Cancel</Button>
            <Button onClick={doReassign} disabled={!reassignTo}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
