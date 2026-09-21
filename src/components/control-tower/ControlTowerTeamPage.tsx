import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useControlTower,
  inventoryByHorizon,
  chatScore,
  computeLeaderboard,
  BBD_TARGET_PER_DAY,
  SLA_TARGETS,
  type OwnershipMode,
  type InventoryHorizon,
  type LineupSlot,
  type ChatReview,
  type WorklistItem,
  type SLAKind,
  type EscalationLevel,
  type ReviewQueueKind,
  type ExceptionKind,
  type CTShift,
  type DailyInteractionReview,
  type FeedbackStatus,
  type InteractionKind,
  type ReviewTeam,
  reviewQualityBand,
} from "@/lib/control-tower/team";
import {
  planAutoAssign,
  planRebalance,
  scoreChatNarrative,
  autoDetectGates,
  optimizeLineup,
  detectReviewFlags,
} from "@/lib/control-tower/automation";
import { WhyCaption } from "@/components/common/WhyCaption";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, ShieldCheck, Users, Boxes, Trophy,
  MessageSquare, ClipboardList, Activity, Plus, X, Timer, Flame,
  ArrowLeftRight, Inbox, Star, Bug, ScrollText, Sparkles, Search, PhoneCall,
} from "lucide-react";
import { CloseCommitButton } from "@/components/commitments/CloseCommitButton";

const HORIZONS: { key: InventoryHorizon; label: string; hint: string }[] = [
  { key: "today",      label: "Today",      hint: "Fill first — beds ready NOW" },
  { key: "this-week",  label: "This Week",  hint: "Bank of options for pending qualifieds" },
  { key: "this-month", label: "This Month", hint: "For future-move-in leads" },
  { key: "later",      label: "Later",      hint: "Long-tail / hidden inventory" },
];

const SHIFTS: CTShift[] = ["morning", "afternoon", "evening", "night"];

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────

export function ControlTowerTeamPage() {
  const ct = useControlTower();
  const [tab, setTab] = useState("volume");

  // Keyboard shortcuts (1-9, 0, q-y for the tail tabs).
  useEffect(() => {
    const map: Record<string, string> = {
      "1": "volume", "2": "team", "3": "worklist", "4": "ownership",
      "5": "gates", "6": "inventory", "7": "lineup", "8": "chat",
      "9": "sla", "0": "escalations",
      "q": "handover", "w": "review-queue", "e": "leaderboard",
      "r": "exceptions", "t": "audit",
    };
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      const v = map[e.key.toLowerCase()];
      if (v) { setTab(v); e.preventDefault(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const openBreaches = ct.slaBreaches.filter((b) => !b.resolved).length;
  const openEsc = ct.escalations.filter((e) => e.status !== "resolved").length;
  const pendingReview = ct.reviewQueue.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Control Tower Team</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            The alignment layer above zones. No CRM is solo-dependent. Every lead has exactly one owner.
            The 4-gate process is mandatory. Inventory focus, BBD lineup, chat-depth reviews, SLA timers, escalations, shift handover and full audit live here.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Shortcuts: <b>1</b>–<b>9</b>/<b>0</b> and <b>Q W E R T</b> switch tabs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">{ct.members.filter((m) => m.present).length}/{ct.members.length} on-shift</Badge>
          <Badge variant="outline" className="text-xs">Ownership: {ct.ownershipMode}</Badge>
          <Badge variant="outline" className="text-xs">Inv active: {ct.inventory.filter((i) => i.active).length}</Badge>
          {openBreaches > 0 && <Badge variant="destructive" className="text-xs">{openBreaches} SLA</Badge>}
          {openEsc > 0 && <Badge variant="destructive" className="text-xs">{openEsc} escalations</Badge>}
          {pendingReview > 0 && <Badge variant="secondary" className="text-xs">{pendingReview} review pending</Badge>}
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="volume"><Activity className="h-3.5 w-3.5 mr-1" />Volume</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-3.5 w-3.5 mr-1" />CT Team</TabsTrigger>
          <TabsTrigger value="worklist"><ClipboardList className="h-3.5 w-3.5 mr-1" />Worklist</TabsTrigger>
          <TabsTrigger value="ownership"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Single-Owner</TabsTrigger>
          <TabsTrigger value="gates"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />4-Gate</TabsTrigger>
          <TabsTrigger value="inventory"><Boxes className="h-3.5 w-3.5 mr-1" />Inventory</TabsTrigger>
          <TabsTrigger value="lineup"><Trophy className="h-3.5 w-3.5 mr-1" />BBD Lineup</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="h-3.5 w-3.5 mr-1" />Daily Reviews</TabsTrigger>
          <TabsTrigger value="sla"><Timer className="h-3.5 w-3.5 mr-1" />SLA</TabsTrigger>
          <TabsTrigger value="escalations"><Flame className="h-3.5 w-3.5 mr-1" />Escalations</TabsTrigger>
          <TabsTrigger value="handover"><ArrowLeftRight className="h-3.5 w-3.5 mr-1" />Handover</TabsTrigger>
          <TabsTrigger value="review-queue"><Inbox className="h-3.5 w-3.5 mr-1" />Review Q</TabsTrigger>
          <TabsTrigger value="leaderboard"><Star className="h-3.5 w-3.5 mr-1" />Leaderboard</TabsTrigger>
          <TabsTrigger value="exceptions"><Bug className="h-3.5 w-3.5 mr-1" />Exceptions</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="h-3.5 w-3.5 mr-1" />Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="volume"><VolumeTab /></TabsContent>
        <TabsContent value="team"><TeamTab /></TabsContent>
        <TabsContent value="worklist"><WorklistTab /></TabsContent>
        <TabsContent value="ownership"><OwnershipTab /></TabsContent>
        <TabsContent value="gates"><GatesTab /></TabsContent>
        <TabsContent value="inventory"><InventoryTab /></TabsContent>
        <TabsContent value="lineup"><LineupTab /></TabsContent>
        <TabsContent value="chat"><DailyReviewTab /></TabsContent>
        <TabsContent value="sla"><SLATab /></TabsContent>
        <TabsContent value="escalations"><EscalationsTab /></TabsContent>
        <TabsContent value="handover"><HandoverTab /></TabsContent>
        <TabsContent value="review-queue"><ReviewQueueTab /></TabsContent>
        <TabsContent value="leaderboard"><LeaderboardTab /></TabsContent>
        <TabsContent value="exceptions"><ExceptionsTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────────────────────── Volume ───────────────────────── */

function VolumeTab() {
  const { volume, setVolume } = useControlTower();
  const pct = Math.min(100, Math.round((volume.leadsToday / Math.max(1, volume.targetToday)) * 100));
  const status = pct >= 100 ? "on-target" : pct >= 60 ? "on-track" : "at-risk";
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Total Leads — the CT team calls this out FIRST every day</h3>
          <Badge variant={status === "at-risk" ? "destructive" : status === "on-target" ? "default" : "secondary"} className="text-[10px]">{status}</Badge>
        </div>
        <WhyCaption why="If we don't know volume, no number after that makes sense. CT must raise the flag before operators do." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" />
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Metric big={volume.leadsToday} label={`Today (target ${volume.targetToday})`} />
          <Metric big={volume.leads7d} label="Last 7 days" />
          <Metric big={volume.leads30d} label="Last 30 days" />
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-muted-foreground"><span>Today vs target</span><span>{pct}%</span></div>
          <Progress value={pct} className="h-2 mt-1" />
          {pct < 60 && (
            <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1 text-amber-500" />
              Low inbound today. CT team switches to <b>Old Leads (7d/30d)</b> — this is why the worklist exists.
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold mb-2">Per-Zone volume (last 7d)</div>
          <div className="space-y-1.5">
            {Object.entries(volume.perZone).map(([z, n]) => {
              const max = Math.max(...Object.values(volume.perZone));
              return (
                <div key={z} className="flex items-center gap-2 text-xs">
                  <span className="w-20 capitalize">{z}</span>
                  <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono">{n}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Best-performing zone gets fewer NEW leads (only good ones left) — CT must interpret this before flagging under-performance.
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Adjust today's counters</h3>
        <p className="text-[11px] text-muted-foreground mb-3">Wire to Cloud next turn. Local edit for now.</p>
        <div className="space-y-2">
          <NumField label="Leads today" value={volume.leadsToday} onChange={(v) => setVolume({ leadsToday: v })} />
          <NumField label="Target/day"  value={volume.targetToday} onChange={(v) => setVolume({ targetToday: v })} />
          <NumField label="Leads 7d"    value={volume.leads7d}    onChange={(v) => setVolume({ leads7d: v })} />
          <NumField label="Leads 30d"   value={volume.leads30d}   onChange={(v) => setVolume({ leads30d: v })} />
        </div>
      </Card>
    </div>
  );
}

/* ───────────────────────── Team ───────────────────────── */

function TeamTab() {
  const { members, toggleMemberPresence, updateMember } = useControlTower();
  const [shift, setShift] = useState<"all" | CTShift>("all");
  const [tier, setTier] = useState<"all" | "A" | "B" | "C" | "D">("all");
  const filtered = members.filter((m) => (shift === "all" || m.shift === shift) && (tier === "all" || m.tier === tier));

  return (
    <div className="space-y-3">
      <WhyCaption why="Multiple CT members rotate so the CRM never depends on one operator. Each guarantees a minimum daily worklist." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" client="Same experience every time" />

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Label className="text-xs">Shift</Label>
        <Select value={shift} onValueChange={(v) => setShift(v as "all" | CTShift)}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All shifts</SelectItem>
            {SHIFTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Label className="text-xs ml-2">Tier</Label>
        <Select value={tier} onValueChange={(v) => setTier(v as "all" | "A" | "B" | "C" | "D")}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="A">A</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="C">C</SelectItem>
            <SelectItem value="D">D</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} shown · {members.filter((m) => m.present).length} present</div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <Card key={m.id} className={cn("p-4", !m.present && "opacity-60")}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-sm">{m.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{m.name}</div>
                <div className="text-[11px] text-muted-foreground capitalize">{m.shift} · tier {m.tier} · covers {m.zonesCovered.join(", ")}</div>
              </div>
              <Switch checked={m.present} onCheckedChange={() => toggleMemberPresence(m.id)} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Metric big={m.minLeadsPerDay} label="Min/day" small />
              <Metric big={m.minOldLeadTouches} label="Old touch" small />
              <Metric big={`${m.performance}`} label="Perf 7d" small />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground">Backup</Label>
              <Select value={m.backupId ?? ""} onValueChange={(v) => updateMember(m.id, { backupId: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {members.filter((b) => b.id !== m.id).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Worklist ───────────────────────── */

function WorklistTab() {
  const { members, worklist, assignWorklist, markWorklist, bulkMarkWorklist, clearCompletedWorklist } = useControlTower();
  const app = useApp();
  const [selectedMember, setSelectedMember] = useState(members[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | WorklistItem["status"]>("all");
  const [bucketFilter, setBucketFilter] = useState<"all" | WorklistItem["bucket"]>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<ReturnType<typeof planAutoAssign> | null>(null);

  const member = members.find((m) => m.id === selectedMember);

  function computePreview() {
    if (!member) return;
    setPreview(planAutoAssign(member, app.leads, worklist));
  }
  function commitPreview() {
    if (!member || !preview) return;
    const items = [
      ...preview.today.map((l) => ({ ctMemberId: member.id, leadId: l.id, leadName: l.name, ageDays: 0, bucket: "today" as const, reason: "Fresh inbound — first response", priority: "high" as const })),
      ...preview.seven.map((l) => ({ ctMemberId: member.id, leadId: l.id, leadName: l.name, ageDays: Math.max(1, Math.round((Date.now() - +new Date(l.createdAt)) / 86400000)), bucket: "7d" as const, reason: "Nudge — reheat before it goes cold", priority: "medium" as const })),
      ...preview.thirty.map((l) => ({ ctMemberId: member.id, leadId: l.id, leadName: l.name, ageDays: Math.max(8, Math.round((Date.now() - +new Date(l.createdAt)) / 86400000)), bucket: "30d" as const, reason: "Revival — check if they're searching again", priority: "low" as const })),
    ];
    assignWorklist(items);
    setPreview(null);
  }

  const rows = useMemo(() => {
    return worklist.filter((w) => {
      if (selectedMember && w.ctMemberId !== selectedMember) return false;
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (bucketFilter !== "all" && w.bucket !== bucketFilter) return false;
      if (q && !w.leadName.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).slice(0, 120);
  }, [worklist, selectedMember, statusFilter, bucketFilter, q]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    setSelected((s) => {
      const next = new Set(s);
      if (allChecked) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <WhyCaption why="No more 'I was short of leads'. Every CT member gets a pre-assigned list mixing today + 7d + 30d leads. Completion is tracked." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" />
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs">CT member</Label>
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.shift}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={computePreview}><Sparkles className="h-3.5 w-3.5 mr-1" />Preview</Button>
          {preview && <Button size="sm" onClick={commitPreview}><Plus className="h-3.5 w-3.5 mr-1" />Commit ({preview.today.length + preview.seven.length + preview.thirty.length})</Button>}
          <Button size="sm" variant="ghost" onClick={clearCompletedWorklist}>Clear done/skipped</Button>
          <div className="text-xs text-muted-foreground ml-auto">
            Open: <b>{worklist.filter((w) => w.status === "pending").length}</b> · Done: <b>{worklist.filter((w) => w.status === "done").length}</b>
          </div>
        </div>

        {preview && (
          <div className="rounded-md border p-3 text-xs bg-muted/30 space-y-1">
            <div className="font-semibold">Auto-assign preview for {member?.name}</div>
            <div>Today: <b>{preview.today.length}</b> · 7d: <b>{preview.seven.length}</b> · 30d: <b>{preview.thirty.length}</b></div>
            {preview.reasons.map((r, i) => <div key={i} className="text-muted-foreground">• {r}</div>)}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lead" className="h-8 pl-6 text-xs w-48" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bucketFilter} onValueChange={(v) => setBucketFilter(v as typeof bucketFilter)}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buckets</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">7d</SelectItem>
              <SelectItem value="30d">30d</SelectItem>
            </SelectContent>
          </Select>
          {selected.size > 0 && (
            <>
              <Badge variant="secondary" className="text-[10px]">{selected.size} selected</Badge>
              <Button size="sm" variant="outline" onClick={() => { bulkMarkWorklist(Array.from(selected), "done"); setSelected(new Set()); }}>Mark done</Button>
              <Button size="sm" variant="ghost" onClick={() => { bulkMarkWorklist(Array.from(selected), "skipped"); setSelected(new Set()); }}>Mark skip</Button>
            </>
          )}
        </div>
      </Card>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 w-6"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></th>
              <th className="p-2 text-left">Lead</th>
              <th className="p-2 text-left">Bucket</th>
              <th className="p-2 text-left">Priority</th>
              <th className="p-2 text-left">Age</th>
              <th className="p-2 text-left">Reason</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No worklist rows match — try Preview to build one.</td></tr>
            )}
            {rows.map((w) => (
              <tr key={w.id} className="border-t">
                <td className="p-2">
                  <Checkbox
                    checked={selected.has(w.id)}
                    onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); if (v) n.add(w.id); else n.delete(w.id); return n; })}
                  />
                </td>
                <td className="p-2 font-medium">{w.leadName}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{w.bucket === "today" ? "Today" : w.bucket === "7d" ? "7d" : "30d"}</Badge></td>
                <td className="p-2"><Badge variant={w.priority === "high" ? "destructive" : w.priority === "medium" ? "default" : "secondary"} className="text-[10px] capitalize">{w.priority}</Badge></td>
                <td className="p-2 text-muted-foreground">{w.ageDays}d</td>
                <td className="p-2 text-muted-foreground">{w.reason}</td>
                <td className="p-2"><Badge variant={w.status === "done" ? "default" : w.status === "skipped" ? "destructive" : "secondary"} className="text-[10px] capitalize">{w.status}</Badge></td>
                <td className="p-2 flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => markWorklist(w.id, "in-progress")}>Start</Button>
                  <Button size="sm" variant="outline" onClick={() => markWorklist(w.id, "done", "Completed via CT")}>Done</Button>
                  <Button size="sm" variant="ghost" onClick={() => markWorklist(w.id, "skipped")}>Skip</Button>
                  <CloseCommitButton leadId={w.leadId} leadName={w.leadName} actorName="Control Tower" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RebalancePanel />
    </div>
  );
}

function RebalancePanel() {
  const { members, worklist, bulkMarkWorklist, audit_push } = useControlTower();
  const moves = useMemo(() => planRebalance(members, worklist), [members, worklist]);
  if (moves.length === 0) return (
    <Card className="p-3 text-xs text-muted-foreground">
      Rebalancer: no moves needed — load is even and everyone assigned is present.
    </Card>
  );
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold flex items-center gap-1"><ArrowLeftRight className="h-3.5 w-3.5" />Rebalancer suggests {moves.length} move(s)</div>
        <Button size="sm" onClick={() => {
          // In the local store we don't have a per-item reassign; log audit + skip old rows.
          bulkMarkWorklist(moves.map((m) => m.itemId), "skipped");
          audit_push({ actor: "ct-rebalancer", entity: "worklist", action: `rebalanced ${moves.length} items` });
        }}>Apply</Button>
      </div>
      <div className="max-h-40 overflow-auto text-xs space-y-1">
        {moves.slice(0, 20).map((m) => (
          <div key={m.itemId} className="flex justify-between border-b pb-1 last:border-0">
            <span className="font-mono text-[10px]">{m.itemId.slice(-6)}</span>
            <span className="text-muted-foreground">{m.reason}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ───────────────────────── Ownership ───────────────────────── */

function OwnershipTab() {
  const { ownershipMode, setOwnershipMode } = useControlTower();
  const opts: { key: OwnershipMode; label: string; desc: string }[] = [
    { key: "hard-lock", label: "Hard lock", desc: "Only the assigned owner can act. Anyone else must request reassignment." },
    { key: "shadow-allowed", label: "Hard lock + shadow view", desc: "Owner-only edits. Others can VIEW read-only for training/handover. Recommended default." },
    { key: "cowork-legacy", label: "Legacy co-work", desc: "Previous behaviour — multiple people could touch the same lead. Not recommended." },
  ];
  return (
    <div className="space-y-3">
      <WhyCaption why="Single owner means 100% accountability. No 'this guy told me… that guy told me…'." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" client="Same experience every time" />
      <div className="grid gap-3 md:grid-cols-3">
        {opts.map((o) => (
          <Card key={o.key} className={cn("p-4 cursor-pointer border-2", ownershipMode === o.key ? "border-primary" : "border-transparent hover:border-muted-foreground/30")} onClick={() => setOwnershipMode(o.key)}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm">{o.label}</div>
              {ownershipMode === o.key && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">{o.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── 4-Gate ───────────────────────── */

function GatesTab() {
  const app = useApp();
  const { getGates, setGate, bulkSetGates, inventory } = useControlTower();
  const [leadId, setLeadId] = useState(app.leads[0]?.id ?? "");
  const gates = getGates(leadId);
  const green = gates.every((g) => g.status === "green");
  const lead = app.leads.find((l) => l.id === leadId);

  function autoFill() {
    if (!lead) return;
    bulkSetGates(leadId, autoDetectGates(lead, inventory, gates));
  }

  return (
    <div className="space-y-3">
      <WhyCaption why="Tour + Quotation is a menu with no pay button unless all 4 gates are green." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" client="Same experience every time" />
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs">Lead</Label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger className="h-8 w-72 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {app.leads.slice(0, 60).map((l) => <SelectItem key={l.id} value={l.id}>{l.name} · {l.preferredArea}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={autoFill}><Sparkles className="h-3.5 w-3.5 mr-1" />Auto-detect from activity</Button>
          <Badge variant={green ? "default" : "destructive"} className="text-[10px] ml-auto">
            {green ? "ALL GATES GREEN — tour + quote allowed" : `${gates.filter(g => g.status === "green").length}/4 green — tour BLOCKED`}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {gates.map((g) => (
          <Card key={g.key} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm flex items-center gap-1">
                  {g.label}
                  {g.autoDetected && <Sparkles className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{g.question}</p>
              </div>
              <StatusPill status={g.status} />
            </div>
            <div className="mt-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Evidence</Label>
              <Textarea
                className="mt-1 text-xs min-h-[60px]"
                placeholder="What did you verify? Quote what the customer / owner said."
                value={g.evidence ?? ""}
                onChange={(e) => setGate(leadId, g.key, { evidence: e.target.value })}
              />
              <div className="mt-2 flex gap-1">
                {(["green", "amber", "red"] as const).map((s) => (
                  <Button key={s} size="sm" variant={g.status === s ? "default" : "outline"} onClick={() => setGate(leadId, g.key, { status: s, autoDetected: false })} className="capitalize">{s}</Button>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {green && (
        <Card className="p-4 border-2 border-emerald-500/40 bg-emerald-500/5">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            All 4 gates green — proceed to Tour + auto-Quote
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Post-tour: quotation must be sent within 15 minutes. Otherwise a breach is logged against the owner.
          </p>
        </Card>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: "green" | "amber" | "red" | "unknown" }) {
  const map = {
    green:   "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    amber:   "bg-amber-500/15 text-amber-600 border-amber-500/30",
    red:     "bg-destructive/15 text-destructive border-destructive/30",
    unknown: "bg-muted text-muted-foreground border-muted-foreground/20",
  } as const;
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full border capitalize", map[status])}>{status}</span>;
}

/* ───────────────────────── Inventory ───────────────────────── */

function InventoryTab() {
  const { inventory, toggleInventory, addInventory, removeInventory } = useControlTower();
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => inventory.filter((i) => !q || i.propertyName.toLowerCase().includes(q.toLowerCase()) || i.area.toLowerCase().includes(q.toLowerCase())),
    [inventory, q],
  );
  const grouped = useMemo(() => inventoryByHorizon(filtered), [filtered]);
  const [draft, setDraft] = useState({ propertyName: "", area: "", bedType: "Single AC", price: 12000, horizon: "today" as InventoryHorizon, whyChoose: "", bedsAvailable: 1, photosCount: 0, active: true });

  return (
    <div className="space-y-4">
      <WhyCaption why="Without inventory knowledge no BBD is possible. CT owns the daily 'what to sell today / this week / this month' board." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" client="Same experience every time" />

      <Card className="p-3 flex items-center gap-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by property or area" className="h-8 text-xs max-w-sm" />
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length}/{inventory.length} listings</div>
      </Card>

      {HORIZONS.map((h) => (
        <Card key={h.key} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-sm capitalize">{h.label}</h3>
              <p className="text-[11px] text-muted-foreground">{h.hint}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{grouped[h.key].length} listings</Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {grouped[h.key].map((i) => (
              <div key={i.id} className={cn("p-3 rounded-md border text-xs space-y-1", i.active ? "bg-card" : "bg-muted/40 opacity-70")}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{i.propertyName}</div>
                  <Switch checked={i.active} onCheckedChange={() => toggleInventory(i.id)} />
                </div>
                <div className="text-muted-foreground">{i.area} · {i.bedType} · ₹{i.price.toLocaleString("en-IN")}</div>
                <div className="text-[11px]"><b>Why choose:</b> {i.whyChoose}</div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{i.bedsAvailable} beds · {i.photosCount} photos</span>
                  <button className="hover:text-destructive" onClick={() => removeInventory(i.id)}><X className="h-3 w-3" /></button>
                </div>
                {i.ownerNote && <div className="text-[10px] text-emerald-600">Owner: {i.ownerNote}</div>}
              </div>
            ))}
            {grouped[h.key].length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-6 text-xs">No listings match.</div>
            )}
          </div>
        </Card>
      ))}

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Add inventory focus</h3>
        <div className="grid gap-2 md:grid-cols-4">
          <Input placeholder="Property name" value={draft.propertyName} onChange={(e) => setDraft({ ...draft, propertyName: e.target.value })} />
          <Input placeholder="Area" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} />
          <Input placeholder="Bed type" value={draft.bedType} onChange={(e) => setDraft({ ...draft, bedType: e.target.value })} />
          <Input type="number" placeholder="Price" value={draft.price} onChange={(e) => setDraft({ ...draft, price: +e.target.value })} />
          <Select value={draft.horizon} onValueChange={(v) => setDraft({ ...draft, horizon: v as InventoryHorizon })}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HORIZONS.map((h) => <SelectItem key={h.key} value={h.key}>{h.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Beds available" value={draft.bedsAvailable} onChange={(e) => setDraft({ ...draft, bedsAvailable: +e.target.value })} />
          <Input type="number" placeholder="Photos count" value={draft.photosCount} onChange={(e) => setDraft({ ...draft, photosCount: +e.target.value })} />
          <Input placeholder="Why choose (1 line)" value={draft.whyChoose} onChange={(e) => setDraft({ ...draft, whyChoose: e.target.value })} />
        </div>
        <Button size="sm" className="mt-3" onClick={() => { if (draft.propertyName) { addInventory(draft); setDraft({ ...draft, propertyName: "", whyChoose: "" }); } }}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add
        </Button>
      </Card>
    </div>
  );
}

/* ───────────────────────── Lineup ───────────────────────── */

function LineupTab() {
  const { lineup, setLineup, updatePick, members } = useControlTower();

  function autoLineup() { setLineup(optimizeLineup(members)); }

  const total = lineup.reduce((a, b) => a + b.targetBookings, 0);
  const bySlot: Record<LineupSlot, typeof lineup> = { opener: [], middle: [], finisher: [], bench: [] };
  lineup.forEach((p) => bySlot[p.slot].push(p));

  return (
    <div className="space-y-3">
      <WhyCaption why="Like cricket: openers face the new hot leads at day-open; finishers close negotiation at day-end. No random allocation." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" />
      <Card className="p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Today's BBD lineup</div>
          <div className="text-[11px] text-muted-foreground">Target: <b>{BBD_TARGET_PER_DAY} BBD/day</b> · Committed: <b>{total}</b></div>
        </div>
        <Button size="sm" onClick={autoLineup}><Sparkles className="h-3.5 w-3.5 mr-1" />Optimize from present CT team</Button>
      </Card>

      {(["opener", "middle", "finisher", "bench"] as LineupSlot[]).map((slot) => (
        <Card key={slot} className="p-4">
          <div className="text-sm font-semibold capitalize mb-2">
            {slot === "opener" && "Openers — face the new hot leads"}
            {slot === "middle" && "Middle order — steady conversion"}
            {slot === "finisher" && "Finishers — close negotiation"}
            {slot === "bench" && "Bench — rotation cover"}
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {bySlot[slot].map((p) => (
              <div key={p.memberId} className="p-3 rounded border text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.memberName}</div>
                  <Badge variant="outline" className="text-[10px]">{p.role}</Badge>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground">Target</Label>
                  <Input type="number" className="h-7 w-16 text-xs" value={p.targetBookings} onChange={(e) => updatePick(p.memberId, { targetBookings: +e.target.value })} />
                  <Select value={p.slot} onValueChange={(v) => updatePick(p.memberId, { slot: v as LineupSlot })}>
                    <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opener">Opener</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="finisher">Finisher</SelectItem>
                      <SelectItem value="bench">Bench</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">{p.reason}</div>
              </div>
            ))}
            {bySlot[slot].length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-4 text-xs">No one in this slot yet.</div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ───────────────────────── Chat Review ───────────────────────── */

function ChatReviewTab() {
  const app = useApp();
  const { reviews, addReview } = useControlTower();
  const [draft, setDraft] = useState<Omit<ChatReview, "id" | "reviewedAt">>({
    leadId: app.leads[0]?.id ?? "",
    reviewerId: "ct-1",
    responseSpeed: 3, acknowledgment: 3, realProblemFocus: 3,
    valueDrivenAnswer: 3, advancedNextStep: 3,
    stillLooking: "unknown", whatActuallyHappened: "", overall: 3,
  });
  const score = chatScore({ ...draft, id: "", reviewedAt: "" } as ChatReview);
  const ai = useMemo(() => scoreChatNarrative(draft.whatActuallyHappened), [draft.whatActuallyHappened]);
  const flags = useMemo(() => detectReviewFlags(reviews), [reviews]);

  function save() {
    addReview({ ...draft, aiScore: ai.score, aiFlags: ai.flags });
  }

  return (
    <div className="space-y-3">
      <WhyCaption why="Every chat should feel like the same Domino's burger — same process, no random 'extra cheese' from a new operator." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" client="Same experience every time" />

      {flags.flags.length > 0 && (
        <Card className="p-3 border-amber-500/40 bg-amber-500/10 text-xs">
          <div className="font-semibold mb-1">Trend flags — {flags.avgScore} avg score · {flags.poorRate}% poor</div>
          {flags.flags.map((f, i) => <div key={i}>• {f}</div>)}
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs">Lead being reviewed</Label>
          <Select value={draft.leadId} onValueChange={(v) => setDraft({ ...draft, leadId: v })}>
            <SelectTrigger className="h-8 w-72 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {app.leads.slice(0, 60).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge className="ml-auto text-[10px]">Manual {score}/100 · AI {ai.score}/100</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ScoreSlider label="Response speed" hint="5 = under 1 min · 1 = >1 hr"      value={draft.responseSpeed}    onChange={(v) => setDraft({ ...draft, responseSpeed: v })} />
          <ScoreSlider label="Acknowledgment" hint="Did we recognise their pain?"     value={draft.acknowledgment}   onChange={(v) => setDraft({ ...draft, acknowledgment: v })} />
          <ScoreSlider label="Real problem focus" hint="Real issue, not surface fluff" value={draft.realProblemFocus} onChange={(v) => setDraft({ ...draft, realProblemFocus: v })} />
          <ScoreSlider label="Value-driven answer" hint="Concrete, not vague"          value={draft.valueDrivenAnswer} onChange={(v) => setDraft({ ...draft, valueDrivenAnswer: v })} />
          <ScoreSlider label="Advanced next step" hint="Did the chat move forward?"   value={draft.advancedNextStep} onChange={(v) => setDraft({ ...draft, advancedNextStep: v })} />
          <div>
            <Label className="text-xs">Are they still looking?</Label>
            <Select value={draft.stillLooking} onValueChange={(v) => setDraft({ ...draft, stillLooking: v as ChatReview["stillLooking"] })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes — still active</SelectItem>
                <SelectItem value="no">No — booked elsewhere / dropped</SelectItem>
                <SelectItem value="never-was">Never was serious</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">If tour was scheduled but not booked — why?</Label>
          <Textarea value={draft.tourBookedButUnbookedReason ?? ""} onChange={(e) => setDraft({ ...draft, tourBookedButUnbookedReason: e.target.value })} className="text-xs mt-1" placeholder="Real reason, not the polite one they gave" />
        </div>
        <div>
          <Label className="text-xs">What actually happened (verbatim, no assumptions)</Label>
          <Textarea value={draft.whatActuallyHappened} onChange={(e) => setDraft({ ...draft, whatActuallyHappened: e.target.value })} className="text-xs mt-1 min-h-[70px]" />
          {ai.flags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {ai.flags.map((f, i) => <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>)}
            </div>
          )}
        </div>
        <Button size="sm" onClick={save}>Save review</Button>
      </Card>

      <div>
        <div className="text-xs font-semibold mb-2">Recent reviews ({reviews.length})</div>
        <div className="space-y-2">
          {reviews.slice(0, 10).map((r) => (
            <Card key={r.id} className="p-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-medium">{app.leads.find((l) => l.id === r.leadId)?.name ?? r.leadId}</div>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px]">Manual {chatScore(r)}</Badge>
                  {typeof r.aiScore === "number" && <Badge variant="outline" className="text-[10px]">AI {r.aiScore}</Badge>}
                  <Badge variant="secondary" className="text-[10px]">still {r.stillLooking}</Badge>
                </div>
              </div>
              <div className="text-muted-foreground mt-1">{r.whatActuallyHappened}</div>
              {r.tourBookedButUnbookedReason && <div className="text-[10px] mt-1"><b>Why not booked:</b> {r.tourBookedButUnbookedReason}</div>}
            </Card>
          ))}
          {reviews.length === 0 && <div className="text-center text-muted-foreground text-xs py-6">No reviews yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Daily review loop ───────────────────────── */

const REVIEW_TEAMS: ReviewTeam[] = ["control-tower", "flow-ops", "pcm", "specialist"];
const REVIEW_STATUSES: FeedbackStatus[] = [
  "review-due", "reviewer-submitted", "employee-acknowledged", "correction-started",
  "evidence-submitted", "closed", "escalated",
];

function DailyReviewTab() {
  const app = useApp();
  const { dailyReviews, ensureDailyReviewCoverage, submitDailyReview, advanceDailyReview } = useControlTower();
  const [teamFilter, setTeamFilter] = useState<"all" | ReviewTeam>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");
  const [kindFilter, setKindFilter] = useState<"all" | InteractionKind>("all");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState({
    score: 75, criticalError: false, interactionSummary: "", positiveBehaviour: "", exactGap: "",
    evidenceReference: "", customerImpact: "", revenueImpact: "medium" as DailyInteractionReview["revenueImpact"],
    correctApproach: "", correctiveAction: "",
  });

  useEffect(() => {
    const assignedAt = new Date().toISOString();
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    ensureDailyReviewCoverage(app.leads.flatMap((lead, index) => {
      const owner = app.tcms.find((t) => t.id === lead.assignedTcmId);
      const team: ReviewTeam = index % 4 === 0 ? "control-tower" : index % 4 === 1 ? "flow-ops" : index % 4 === 2 ? "pcm" : "specialist";
      const common = { leadId: lead.id, employeeId: lead.assignedTcmId, employeeName: owner?.name ?? "Unassigned", team, assignedAt, dueAt };
      return [{ ...common, kind: "chat" as const }, { ...common, kind: "call" as const }];
    }));
  }, [app.leads, app.tcms, ensureDailyReviewCoverage]);

  const rows = dailyReviews.filter((r) =>
    (teamFilter === "all" || r.team === teamFilter) &&
    (statusFilter === "all" || r.status === statusFilter) &&
    (kindFilter === "all" || r.kind === kindFilter));
  const selected = dailyReviews.find((r) => r.id === selectedId);
  const due = dailyReviews.filter((r) => r.status === "review-due").length;
  const overdue = dailyReviews.filter((r) => r.status !== "closed" && Date.parse(r.dueAt) < Date.now()).length;
  const closed = dailyReviews.filter((r) => r.status === "closed").length;
  const coverage = dailyReviews.length ? Math.round(((dailyReviews.length - due) / dailyReviews.length) * 100) : 0;

  const submit = () => {
    if (!selected) return;
    submitDailyReview(selected.id, { ...draft, kind: selected.kind }, "ct-quality");
  };

  return (
    <div className="space-y-3">
      <WhyCaption why="Every assigned lead gets chat and call review coverage within 24 hours. Feedback closes only after correction evidence is verified." admin="Complete cross-team visibility" tcm="One correction loop per lead" client="Fewer repeated mistakes" />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3"><Metric big={`${coverage}%`} label="24h coverage" /></Card>
        <Card className="p-3"><Metric big={due} label="Reviews due" /></Card>
        <Card className="p-3"><Metric big={overdue} label="Overdue" /></Card>
        <Card className="p-3"><Metric big={closed} label="Loop closed" /></Card>
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v as "all" | ReviewTeam)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All teams</SelectItem>{REVIEW_TEAMS.map((t) => <SelectItem key={t} value={t}>{t.replace("-", " ")}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as "all" | InteractionKind)}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Chat + call</SelectItem><SelectItem value="chat">Chat</SelectItem><SelectItem value="call">Call</SelectItem></SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | FeedbackStatus)}>
          <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{REVIEW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/-/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} interactions · visible to CT, Flow Ops, PCM and Specialists</span>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-0 overflow-hidden">
          <div className="max-h-[620px] overflow-auto divide-y">
            {rows.map((r) => {
              const lead = app.leads.find((l) => l.id === r.leadId);
              return (
                <button key={r.id} type="button" onClick={() => setSelectedId(r.id)} className={cn("w-full p-3 text-left hover:bg-muted/50", selectedId === r.id && "bg-muted")}>
                  <div className="flex items-center gap-2">
                    {r.kind === "chat" ? <MessageSquare className="h-3.5 w-3.5" /> : <PhoneCall className="h-3.5 w-3.5" />}
                    <span className="font-medium text-sm">{lead?.name ?? r.leadId}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{r.team.replace("-", " ")}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{r.employeeName}</span><span>·</span><span className="capitalize">{r.status.replace(/-/g, " ")}</span>
                    {typeof r.score === "number" && <span>· {r.score}/100</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          {!selected ? <div className="py-20 text-center text-sm text-muted-foreground">Select a chat or call to review the full lead-to-feedback loop.</div> : (
            <>
              <div className="flex items-center justify-between">
                <div><div className="font-semibold">{selected.kind === "chat" ? "Chat" : "Call"} review</div><div className="text-xs text-muted-foreground">{selected.employeeName} · due within 24 hours</div></div>
                <Badge variant={selected.criticalError ? "destructive" : "secondary"}>{reviewQualityBand(selected.score ?? draft.score, selected.criticalError || draft.criticalError)}</Badge>
              </div>
              {selected.status === "review-due" ? (
                <>
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end"><NumField label="Score / 100" value={draft.score} onChange={(score) => setDraft({ ...draft, score: Math.min(100, Math.max(0, score)) })} /><label className="flex items-center gap-2 text-xs pb-2"><Checkbox checked={draft.criticalError} onCheckedChange={(v) => setDraft({ ...draft, criticalError: v === true })} />Critical error override</label></div>
                  <ReviewText label="Interaction summary" value={draft.interactionSummary} onChange={(v) => setDraft({ ...draft, interactionSummary: v })} />
                  <ReviewText label="Positive behaviour" value={draft.positiveBehaviour} onChange={(v) => setDraft({ ...draft, positiveBehaviour: v })} />
                  <ReviewText label="Exact gap" value={draft.exactGap} onChange={(v) => setDraft({ ...draft, exactGap: v })} />
                  <ReviewText label="Evidence — message, timestamp or CRM field" value={draft.evidenceReference} onChange={(v) => setDraft({ ...draft, evidenceReference: v })} />
                  <ReviewText label="Customer impact" value={draft.customerImpact} onChange={(v) => setDraft({ ...draft, customerImpact: v })} />
                  <ReviewText label="Correct approach" value={draft.correctApproach} onChange={(v) => setDraft({ ...draft, correctApproach: v })} />
                  <ReviewText label="Required corrective action" value={draft.correctiveAction} onChange={(v) => setDraft({ ...draft, correctiveAction: v })} />
                  <Button size="sm" onClick={submit}>Submit review & notify employee</Button>
                </>
              ) : <FeedbackClosure review={selected} advance={advanceDailyReview} />}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function ReviewText({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label className="text-xs">{label}</Label><Textarea className="mt-1 text-xs min-h-14" value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function FeedbackClosure({ review, advance }: { review: DailyInteractionReview; advance: (id: string, patch: Partial<DailyInteractionReview> & { status: FeedbackStatus }) => void }) {
  const [response, setResponse] = useState(review.employeeResponse ?? "");
  const [rootCause, setRootCause] = useState(review.rootCause ?? "");
  const [prevention, setPrevention] = useState(review.preventionAction ?? "");
  const [evidence, setEvidence] = useState(review.correctionEvidence ?? "");
  const [verification, setVerification] = useState(review.reviewerVerification ?? "");
  const needsEvidence = review.status !== "closed" && review.status !== "evidence-submitted";
  return (
    <div className="space-y-3">
      <div className="rounded border p-3 text-xs space-y-1"><div><b>Gap:</b> {review.exactGap || "—"}</div><div><b>Correction:</b> {review.correctiveAction || "—"}</div><div><b>Evidence cited:</b> {review.evidenceReference || "—"}</div></div>
      {needsEvidence && <>
        <ReviewText label="Employee response — what happened and what was missed?" value={response} onChange={setResponse} />
        <ReviewText label="Root cause" value={rootCause} onChange={setRootCause} />
        <ReviewText label="What will be done differently?" value={prevention} onChange={setPrevention} />
        <ReviewText label="Correction evidence — CRM update / customer follow-up" value={evidence} onChange={setEvidence} />
        <Button size="sm" onClick={() => advance(review.id, { status: "evidence-submitted", employeeResponse: response, rootCause, preventionAction: prevention, correctionEvidence: evidence })}>Submit correction evidence</Button>
      </>}
      {review.status === "evidence-submitted" && <>
        <ReviewText label="Reviewer verification" value={verification} onChange={setVerification} />
        <div className="flex gap-2"><Button size="sm" onClick={() => advance(review.id, { status: "closed", reviewerVerification: verification })}>Verify & close loop</Button><Button size="sm" variant="outline" onClick={() => advance(review.id, { status: "correction-started", reviewerVerification: verification })}>Return for correction</Button></div>
      </>}
      {review.status === "closed" && <div className="rounded border border-success/40 bg-success/10 p-3 text-xs"><CheckCircle2 className="inline h-4 w-4 mr-1 text-success" />Correction verified. Lead edit → interaction → feedback loop closed.</div>}
    </div>
  );
}

function ScoreSlider({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: 1 | 2 | 3 | 4 | 5) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button key={n} size="sm" variant={value === n ? "default" : "outline"} className="h-7 w-7 p-0" onClick={() => onChange(n as 1 | 2 | 3 | 4 | 5)}>{n}</Button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── SLA ───────────────────────── */

function SLATab() {
  const { slaBreaches, logSLABreach, resolveSLABreach, members } = useControlTower();
  const app = useApp();
  const [draft, setDraft] = useState<{ leadId: string; ownerId: string; kind: SLAKind; actualMinutes: number }>({
    leadId: app.leads[0]?.id ?? "", ownerId: members[0]?.id ?? "", kind: "first-response", actualMinutes: 10,
  });
  const open = slaBreaches.filter((b) => !b.resolved);
  return (
    <div className="space-y-3">
      <WhyCaption why="SLAs are the shared clock. If we don't log breaches, we can't fix the pattern." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" />
      <div className="grid gap-3 md:grid-cols-4">
        {(Object.keys(SLA_TARGETS) as SLAKind[]).map((k) => {
          const count = slaBreaches.filter((b) => b.kind === k && !b.resolved).length;
          return (
            <Card key={k} className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.replace(/-/g, " ")}</div>
              <div className="text-2xl font-display font-semibold">{count}</div>
              <div className="text-[10px] text-muted-foreground">target ≤ {SLA_TARGETS[k]} min</div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Log a breach</h3>
        <div className="grid gap-2 md:grid-cols-4">
          <Select value={draft.leadId} onValueChange={(v) => setDraft({ ...draft, leadId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{app.leads.slice(0, 60).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.ownerId} onValueChange={(v) => setDraft({ ...draft, ownerId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as SLAKind })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(SLA_TARGETS) as SLAKind[]).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" className="h-8 text-xs" value={draft.actualMinutes} onChange={(e) => setDraft({ ...draft, actualMinutes: +e.target.value })} placeholder="Actual minutes" />
        </div>
        <Button size="sm" className="mt-3" onClick={() => logSLABreach({ ...draft, targetMinutes: SLA_TARGETS[draft.kind] })}>Log breach</Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">Lead</th><th className="p-2 text-left">Owner</th><th className="p-2 text-left">Kind</th>
              <th className="p-2 text-left">Target</th><th className="p-2 text-left">Actual</th><th className="p-2 text-left">Status</th><th />
            </tr>
          </thead>
          <tbody>
            {open.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No open SLA breaches.</td></tr>}
            {open.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-2 font-medium">{app.leads.find((l) => l.id === b.leadId)?.name ?? b.leadId}</td>
                <td className="p-2">{members.find((m) => m.id === b.ownerId)?.name ?? b.ownerId}</td>
                <td className="p-2 capitalize">{b.kind.replace(/-/g, " ")}</td>
                <td className="p-2 text-muted-foreground">{b.targetMinutes}m</td>
                <td className="p-2 text-destructive">{b.actualMinutes}m</td>
                <td className="p-2"><Badge variant="destructive" className="text-[10px]">open</Badge></td>
                <td className="p-2"><Button size="sm" variant="outline" onClick={() => resolveSLABreach(b.id, "Resolved via CT")}>Resolve</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ───────────────────────── Escalations ───────────────────────── */

function EscalationsTab() {
  const { escalations, raiseEscalation, ackEscalation, resolveEscalation, members } = useControlTower();
  const app = useApp();
  const [draft, setDraft] = useState({ level: "L1" as EscalationLevel, reason: "", leadId: "", memberId: "" });
  return (
    <div className="space-y-3">
      <WhyCaption why="Escalations exist so nothing rots. If you can't unblock in 30 min, escalate." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" />
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Raise an escalation</h3>
        <div className="grid gap-2 md:grid-cols-4">
          <Select value={draft.level} onValueChange={(v) => setDraft({ ...draft, level: v as EscalationLevel })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="L1">L1 — Team lead</SelectItem>
              <SelectItem value="L2">L2 — Manager</SelectItem>
              <SelectItem value="L3">L3 — Founder</SelectItem>
            </SelectContent>
          </Select>
          <Select value={draft.leadId} onValueChange={(v) => setDraft({ ...draft, leadId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Related lead" /></SelectTrigger>
            <SelectContent>{app.leads.slice(0, 40).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.memberId} onValueChange={(v) => setDraft({ ...draft, memberId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Related member" /></SelectTrigger>
            <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="h-8 text-xs" placeholder="Reason" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
        </div>
        <Button size="sm" className="mt-3" onClick={() => { if (draft.reason) { raiseEscalation({ level: draft.level, reason: draft.reason, leadId: draft.leadId || undefined, memberId: draft.memberId || undefined, raisedBy: "ct" }); setDraft({ ...draft, reason: "" }); } }}>
          <Flame className="h-3.5 w-3.5 mr-1" />Raise
        </Button>
      </Card>

      <div className="space-y-2">
        {escalations.map((e) => (
          <Card key={e.id} className="p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={e.level === "L3" ? "destructive" : e.level === "L2" ? "default" : "secondary"} className="text-[10px]">{e.level}</Badge>
                <span className="font-medium">{e.reason}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{e.status}</Badge>
            </div>
            <div className="text-muted-foreground mt-1">
              {e.leadId && <>Lead: {app.leads.find((l) => l.id === e.leadId)?.name ?? e.leadId} · </>}
              {e.memberId && <>Member: {members.find((m) => m.id === e.memberId)?.name ?? e.memberId} · </>}
              raised {new Date(e.raisedAt).toLocaleString()}
            </div>
            {e.resolution && <div className="text-emerald-600 mt-1">Resolution: {e.resolution}</div>}
            {e.status !== "resolved" && (
              <div className="mt-2 flex gap-1">
                {e.status === "open" && <Button size="sm" variant="outline" onClick={() => ackEscalation(e.id)}>Acknowledge</Button>}
                <Button size="sm" onClick={() => resolveEscalation(e.id, "Resolved via CT")}>Resolve</Button>
              </div>
            )}
          </Card>
        ))}
        {escalations.length === 0 && <div className="text-center text-muted-foreground text-xs py-6">No escalations.</div>}
      </div>
    </div>
  );
}

/* ───────────────────────── Handover ───────────────────────── */

function HandoverTab() {
  const { handovers, addHandover, ackHandover, members } = useControlTower();
  const [draft, setDraft] = useState({ fromShift: "morning" as CTShift, toShift: "afternoon" as CTShift, fromMemberId: members[0]?.id ?? "", openLeads: 0, hotFollowUps: "", blockers: "", wins: "" });

  return (
    <div className="space-y-3">
      <WhyCaption why="Shift handover is how work doesn't fall between the seats. Every shift ends with a note; the next shift can't start blind." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" client="Same experience every time" />
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Log a handover</h3>
        <div className="grid gap-2 md:grid-cols-4">
          <Select value={draft.fromShift} onValueChange={(v) => setDraft({ ...draft, fromShift: v as CTShift })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SHIFTS.map((s) => <SelectItem key={s} value={s} className="capitalize">from {s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.toShift} onValueChange={(v) => setDraft({ ...draft, toShift: v as CTShift })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SHIFTS.map((s) => <SelectItem key={s} value={s} className="capitalize">to {s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.fromMemberId} onValueChange={(v) => setDraft({ ...draft, fromMemberId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" className="h-8 text-xs" placeholder="Open leads" value={draft.openLeads} onChange={(e) => setDraft({ ...draft, openLeads: +e.target.value })} />
        </div>
        <div className="grid gap-2 md:grid-cols-3 mt-2">
          <Input className="h-8 text-xs" placeholder="Hot follow-ups (comma-sep lead names)" value={draft.hotFollowUps} onChange={(e) => setDraft({ ...draft, hotFollowUps: e.target.value })} />
          <Input className="h-8 text-xs" placeholder="Blockers" value={draft.blockers} onChange={(e) => setDraft({ ...draft, blockers: e.target.value })} />
          <Input className="h-8 text-xs" placeholder="Wins" value={draft.wins} onChange={(e) => setDraft({ ...draft, wins: e.target.value })} />
        </div>
        <Button size="sm" className="mt-3" onClick={() => {
          addHandover({ fromShift: draft.fromShift, toShift: draft.toShift, fromMemberId: draft.fromMemberId, openLeads: draft.openLeads, hotFollowUps: draft.hotFollowUps.split(",").map((s) => s.trim()).filter(Boolean), blockers: draft.blockers, wins: draft.wins });
          setDraft({ ...draft, hotFollowUps: "", blockers: "", wins: "", openLeads: 0 });
        }}>Log handover</Button>
      </Card>

      <div className="space-y-2">
        {handovers.map((h) => (
          <Card key={h.id} className="p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-medium capitalize">{h.fromShift} → {h.toShift}</div>
              <Badge variant={h.acknowledgedAt ? "default" : "secondary"} className="text-[10px]">{h.acknowledgedAt ? "acknowledged" : "pending"}</Badge>
            </div>
            <div className="text-muted-foreground">{members.find((m) => m.id === h.fromMemberId)?.name} · {h.openLeads} open · {new Date(h.createdAt).toLocaleString()}</div>
            {h.hotFollowUps.length > 0 && <div className="mt-1"><b>Hot:</b> {h.hotFollowUps.join(", ")}</div>}
            {h.blockers && <div className="text-destructive"><b>Blockers:</b> {h.blockers}</div>}
            {h.wins && <div className="text-emerald-600"><b>Wins:</b> {h.wins}</div>}
            {!h.acknowledgedAt && (
              <div className="mt-2 flex items-center gap-2">
                <Select onValueChange={(v) => ackHandover(h.id, v)}>
                  <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Acknowledge as…" /></SelectTrigger>
                  <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </Card>
        ))}
        {handovers.length === 0 && <div className="text-center text-muted-foreground text-xs py-6">No handovers logged.</div>}
      </div>
    </div>
  );
}

/* ───────────────────────── Review Queue ───────────────────────── */

function ReviewQueueTab() {
  const { reviewQueue, queueReview, decideReview, members } = useControlTower();
  const app = useApp();
  const [draft, setDraft] = useState({ kind: "reassignment" as ReviewQueueKind, reason: "", leadId: "", memberId: "" });
  return (
    <div className="space-y-3">
      <WhyCaption why="The manager review queue is the only place reassignments, gate overrides, and SLA forgiveness get approved. No shadow overrides." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" />
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Request a manager review</h3>
        <div className="grid gap-2 md:grid-cols-4">
          <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as ReviewQueueKind })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reassignment">Reassignment</SelectItem>
              <SelectItem value="escalation">Escalation</SelectItem>
              <SelectItem value="gate-override">Gate override</SelectItem>
              <SelectItem value="sla-forgiveness">SLA forgiveness</SelectItem>
            </SelectContent>
          </Select>
          <Select value={draft.leadId} onValueChange={(v) => setDraft({ ...draft, leadId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Related lead" /></SelectTrigger>
            <SelectContent>{app.leads.slice(0, 40).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.memberId} onValueChange={(v) => setDraft({ ...draft, memberId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Related member" /></SelectTrigger>
            <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="h-8 text-xs" placeholder="Reason" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
        </div>
        <Button size="sm" className="mt-3" onClick={() => { if (draft.reason) { queueReview({ kind: draft.kind, reason: draft.reason, leadId: draft.leadId || undefined, memberId: draft.memberId || undefined, requestedBy: "ct" }); setDraft({ ...draft, reason: "" }); } }}>
          <Inbox className="h-3.5 w-3.5 mr-1" />Queue for review
        </Button>
      </Card>

      <div className="space-y-2">
        {reviewQueue.map((r) => (
          <Card key={r.id} className="p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-medium capitalize">{r.kind.replace(/-/g, " ")} · {r.reason}</div>
              <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">{r.status}</Badge>
            </div>
            <div className="text-muted-foreground mt-1">
              {r.leadId && <>Lead: {app.leads.find((l) => l.id === r.leadId)?.name ?? r.leadId} · </>}
              {r.memberId && <>Member: {members.find((m) => m.id === r.memberId)?.name ?? r.memberId} · </>}
              requested {new Date(r.requestedAt).toLocaleString()}
            </div>
            {r.decisionNote && <div className="mt-1"><b>Decision:</b> {r.decisionNote}</div>}
            {r.status === "pending" && (
              <div className="mt-2 flex gap-1">
                <Button size="sm" onClick={() => decideReview(r.id, "approved", "manager", "Approved")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => decideReview(r.id, "rejected", "manager", "Rejected")}>Reject</Button>
              </div>
            )}
          </Card>
        ))}
        {reviewQueue.length === 0 && <div className="text-center text-muted-foreground text-xs py-6">Nothing queued.</div>}
      </div>
    </div>
  );
}

/* ───────────────────────── Leaderboard ───────────────────────── */

function LeaderboardTab() {
  const { members, worklist, reviews, slaBreaches } = useControlTower();
  const rows = useMemo(() => computeLeaderboard(members, worklist, reviews, slaBreaches), [members, worklist, reviews, slaBreaches]);
  const max = Math.max(1, ...rows.map((r) => r.score));
  return (
    <div className="space-y-3">
      <WhyCaption why="Weekly leaderboard closes the loop — CT members see their rank and where they lost points." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left w-8">#</th><th className="p-2 text-left">Member</th>
              <th className="p-2 text-left">Tier</th><th className="p-2 text-left">Worklist done</th>
              <th className="p-2 text-left">Reviews</th><th className="p-2 text-left">Open breaches</th>
              <th className="p-2 text-left">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.member.id} className="border-t">
                <td className="p-2 font-mono">{i + 1}</td>
                <td className="p-2 font-medium">{r.member.name}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.member.tier}</Badge></td>
                <td className="p-2">{r.worklistDone}/{r.worklistAssigned}</td>
                <td className="p-2">{r.reviews}</td>
                <td className="p-2 text-destructive">{r.breaches}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded bg-muted overflow-hidden max-w-[120px]">
                      <div className="h-full bg-primary" style={{ width: `${(r.score / max) * 100}%` }} />
                    </div>
                    <span className="font-mono">{r.score}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ───────────────────────── Exceptions ───────────────────────── */

function ExceptionsTab() {
  const { exceptions, logException, updateException, members } = useControlTower();
  const app = useApp();
  const [draft, setDraft] = useState({ kind: "duplicate-lead" as ExceptionKind, severity: "medium" as "low" | "medium" | "high", leadId: "", memberId: "", note: "" });
  return (
    <div className="space-y-3">
      <WhyCaption why="Exceptions catch what the process didn't. Every entry becomes tomorrow's process improvement." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" />
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Log an exception</h3>
        <div className="grid gap-2 md:grid-cols-5">
          <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as ExceptionKind })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="duplicate-lead">Duplicate lead</SelectItem>
              <SelectItem value="wrong-zone">Wrong zone</SelectItem>
              <SelectItem value="customer-abuse">Customer abuse</SelectItem>
              <SelectItem value="system-error">System error</SelectItem>
              <SelectItem value="process-skip">Process skipped</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={draft.severity} onValueChange={(v) => setDraft({ ...draft, severity: v as "low" | "medium" | "high" })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="low">low</SelectItem><SelectItem value="medium">medium</SelectItem><SelectItem value="high">high</SelectItem></SelectContent>
          </Select>
          <Select value={draft.leadId} onValueChange={(v) => setDraft({ ...draft, leadId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Related lead" /></SelectTrigger>
            <SelectContent>{app.leads.slice(0, 40).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.memberId} onValueChange={(v) => setDraft({ ...draft, memberId: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Related member" /></SelectTrigger>
            <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="h-8 text-xs" placeholder="Note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </div>
        <Button size="sm" className="mt-3" onClick={() => { if (draft.note) { logException({ kind: draft.kind, severity: draft.severity, leadId: draft.leadId || undefined, memberId: draft.memberId || undefined, note: draft.note, raisedBy: "ct" }); setDraft({ ...draft, note: "" }); } }}>
          <Bug className="h-3.5 w-3.5 mr-1" />Log
        </Button>
      </Card>

      <div className="space-y-2">
        {exceptions.map((e) => (
          <Card key={e.id} className="p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] capitalize">{e.kind.replace(/-/g, " ")}</Badge>
                <Badge variant={e.severity === "high" ? "destructive" : e.severity === "medium" ? "default" : "secondary"} className="text-[10px]">{e.severity}</Badge>
                <span className="font-medium">{e.note}</span>
              </div>
              <Select value={e.status} onValueChange={(v) => updateException(e.id, { status: v as ExceptionEntry_status })}>
                <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="open">open</SelectItem><SelectItem value="investigating">investigating</SelectItem><SelectItem value="closed">closed</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="text-muted-foreground mt-1">
              {e.leadId && <>Lead: {app.leads.find((l) => l.id === e.leadId)?.name ?? e.leadId} · </>}
              {e.memberId && <>Member: {members.find((m) => m.id === e.memberId)?.name ?? e.memberId} · </>}
              {new Date(e.raisedAt).toLocaleString()}
            </div>
          </Card>
        ))}
        {exceptions.length === 0 && <div className="text-center text-muted-foreground text-xs py-6">No exceptions logged.</div>}
      </div>
    </div>
  );
}
type ExceptionEntry_status = "open" | "investigating" | "closed";

/* ───────────────────────── Audit ───────────────────────── */

function AuditTab() {
  const { audit, clearAudit } = useControlTower();
  const [q, setQ] = useState("");
  const filtered = audit.filter((a) => !q || (a.action + a.actor + a.entity).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <WhyCaption why="Every meaningful action is logged. If it isn't in the audit, it didn't happen." admin="Visibility + accountability" tcm="Clear next step, no ambiguity" />
      <Card className="p-3 flex items-center gap-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" className="h-8 text-xs max-w-sm" />
        <div className="ml-auto flex items-center gap-2">
          <div className="text-xs text-muted-foreground">{filtered.length}/{audit.length}</div>
          <Button size="sm" variant="ghost" onClick={clearAudit}>Clear</Button>
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">When</th><th className="p-2 text-left">Actor</th>
              <th className="p-2 text-left">Entity</th><th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2 text-muted-foreground font-mono">{new Date(a.at).toLocaleTimeString()}</td>
                <td className="p-2">{a.actor}</td>
                <td className="p-2 capitalize">{a.entity}{a.entityId ? ` · ${a.entityId.slice(-6)}` : ""}</td>
                <td className="p-2">{a.action}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No audit entries.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ───────────────────────── Small ───────────────────────── */

function Metric({ big, label, small = false }: { big: number | string; label: string; small?: boolean }) {
  return (
    <div>
      <div className={cn("font-display font-semibold", small ? "text-lg" : "text-2xl")}>{big}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(+e.target.value)} className="h-8 w-28 text-xs" />
    </div>
  );
}
