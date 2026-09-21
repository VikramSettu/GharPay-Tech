// Lifecycle 15x panel — mounts inside DossierForm.
// Composes: Group Composition · Revival Cycles · Next-7-Touches Plan ·
// Commitment Ledger · Automation Config · Scenario Packs.
// Every control carries always-visible <WhyCaption> (why/admin/tcm/client).
import { useMemo, useState } from "react";

// Stable reference to avoid infinite renders in useSyncExternalStore selectors
// that would otherwise return a fresh `[]` each read.
const EMPTY_ARR: readonly never[] = [];
import {
  useLifecycle, roomFit, next7Touches, commitmentHealth,
  GROUP_COMPOSITIONS, REVIVAL_REASON_LABELS, CLOSE_REASON_LABELS,
  CADENCE_RULES, DEFAULT_AUTOMATION,
  type GroupMember, type GroupRole, type CycleCloseReason,
  type RevivalReason, type CommitmentType, type AutomationMode,
  type ScenarioPack, type TouchChannel,
} from "@/lib/pipeline/lifecycle";
import { usePipeline } from "@/lib/pipeline/store";
import { WhyCaption, WhySectionBanner } from "@/components/common/WhyCaption";
import type { LeadCycle, CycleEvent } from "@/lib/pipeline/lifecycle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, RefreshCw, Bell, HandshakeIcon, Zap, ShieldAlert,
  Trash2, UserPlus, ArrowUpRight, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import {
  ChevronDown, ChevronRight, Phone, MessageSquare, MapPin,
  IndianRupee, FileText, CheckCircle, XOctagon, RotateCcw, PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { leadId: string; totalBudget?: number; }

export function LifecyclePanel({ leadId, totalBudget }: Props) {
  const dossier = usePipeline((s) => s.states[leadId]?.dossier);

  return (
    <div className="space-y-4 border-t border-border pt-4 mt-4">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Lifecycle 15x — group, revival, follow-ups, commitments</h3>
      </div>
      <p className="text-[10px] text-muted-foreground -mt-1">
        Every lead can return, bring more people, and change plans. This layer keeps ALL of it evident.
      </p>

      <CyclesSection leadId={leadId} />
      <GroupSection leadId={leadId} totalBudget={totalBudget ?? dossier?.budget} />
      <Next7Section leadId={leadId} />
      <CommitmentSection leadId={leadId} />
      <AutomationSection />
      <ScenarioSection leadId={leadId} />
    </div>
  );
}

// ─────────────────── Group Composition ────────────────────

const ROLES: GroupRole[] = ["primary", "co-mover", "guardian", "spouse", "roommate-hunt", "employer-payer", "referrer"];

function GroupSection({ leadId, totalBudget }: { leadId: string; totalBudget?: number }) {
  const members = useLifecycle((s) => s.members[leadId]) ?? EMPTY_ARR;
  const addMember = useLifecycle((s) => s.addMember);
  const updateMember = useLifecycle((s) => s.updateMember);
  const dropOut = useLifecycle((s) => s.dropOutMember);
  const applyPreset = useLifecycle((s) => s.applyGroupPreset);
  const fit = useMemo(() => roomFit(members, totalBudget), [members, totalBudget]);
  const active = members.filter((m) => !m.droppedOutAt);

  return (
    <section className="rounded-lg border border-border bg-card p-3 space-y-3">
      <WhySectionBanner
        title="Group composition"
        why="Leads rarely come alone — capture EVERY person who moves, decides, or pays."
        admin="See true deal size, per-head economics, decision-map, drop-out risk"
        tcm="Know exactly who to call, whose consent is needed, whose parent to loop in"
        client="Nobody feels ignored; each person's food/ID/move-in gets tracked"
      />

      <div>
        <Label className="text-[10px] uppercase tracking-wider">Quick group preset</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {GROUP_COMPOSITIONS.map((g) => (
            <button key={g.key} type="button" onClick={() => applyPreset(leadId, g.key)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">
              {g.label} · {g.size}p
            </button>
          ))}
        </div>
        <WhyCaption
          why="One-tap adds the right number of member slots + suggests room type."
          admin="Standard compositions surface as filters"
          tcm="Skip typing — pick and adjust"
        />
      </div>

      <div className="rounded-md bg-muted/40 border border-dashed border-border p-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Room-fit suggestion</span>
          <span className="text-primary font-mono">{fit.suggested}</span>
        </div>
        <div className="flex flex-wrap gap-1 text-[10px]">
          {fit.bulkDiscountEligible && <Tag tone="success">Bulk-discount eligible</Tag>}
          {fit.needsLargerTourVehicle && <Tag tone="warn">Larger tour vehicle</Tag>}
          {fit.needsGroupWaThread && <Tag tone="info">Group WA thread</Tag>}
          {!fit.perHeadBudgetOk && <Tag tone="danger">Per-head budget low</Tag>}
        </div>
        {fit.warnings.map((w, i) => (
          <div key={i} className="text-[10px] text-warning flex items-center gap-1">
            <ShieldAlert className="h-2.5 w-2.5" /> {w}
          </div>
        ))}
        <WhyCaption
          why="Auto-computed as members / budget change — TCM never miscounts."
          admin="Prevents room mismatch complaints at check-in"
          tcm="Instant answer to 'what room fits us?'"
          client="Right-sized room = no upselling / downgrade drama"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider">Members ({active.length} active)</Label>
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1"
            onClick={() => addMember(leadId, { name: `Member ${members.length + 1}`, role: members.length ? "co-mover" : "primary" })}>
            <UserPlus className="h-3 w-3" /> Add person
          </Button>
        </div>
        {members.length === 0 && (
          <div className="text-[10px] text-muted-foreground italic">No members yet — pick a preset above or Add person.</div>
        )}
        {members.map((m) => (
          <MemberRow key={m.id} m={m}
            onChange={(p) => updateMember(leadId, m.id, p)}
            onDrop={(reason) => dropOut(leadId, m.id, reason)} />
        ))}
      </div>
    </section>
  );
}

function MemberRow({ m, onChange, onDrop }: {
  m: GroupMember;
  onChange: (patch: Partial<GroupMember>) => void;
  onDrop: (reason: string) => void;
}) {
  const dropped = !!m.droppedOutAt;
  return (
    <div className={cn("rounded border border-border p-2 space-y-1.5", dropped && "opacity-50")}>
      <div className="grid grid-cols-4 gap-1.5">
        <Input className="h-7 text-xs col-span-2" placeholder="Name" value={m.name}
          onChange={(e) => onChange({ name: e.target.value })} />
        <Input className="h-7 text-xs" placeholder="Phone" value={m.phone ?? ""}
          onChange={(e) => onChange({ phone: e.target.value })} />
        <Input type="number" className="h-7 text-xs" placeholder="Age" value={m.age ?? ""}
          onChange={(e) => onChange({ age: Number(e.target.value) || undefined })} />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <Select value={m.role} onValueChange={(v) => onChange({ role: v as GroupRole })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={m.foodPreference ?? ""} onValueChange={(v) => onChange({ foodPreference: v as GroupMember["foodPreference"] })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Food" /></SelectTrigger>
          <SelectContent>
            {["veg","non-veg","any","jain","halal","vegan"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="h-7 text-xs" type="date" value={m.moveInDate ?? ""}
          onChange={(e) => onChange({ moveInDate: e.target.value })} title="Move-in date (can be staggered)" />
        <Select value={m.paysFor ?? ""} onValueChange={(v) => onChange({ paysFor: v as GroupMember["paysFor"] })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Pays" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="self">Self</SelectItem>
            <SelectItem value="all">Pays for all</SelectItem>
            <SelectItem value="split">Split</SelectItem>
            <SelectItem value="guardian">Guardian pays</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={!!m.consentGiven} onChange={(e) => onChange({ consentGiven: e.target.checked })} />
          Consent
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={!!m.idCollected} onChange={(e) => onChange({ idCollected: e.target.checked })} />
          ID
        </label>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Decision weight</span>
          <Input type="number" className="h-6 w-14 text-xs" min={0} max={100} value={m.decisionWeight ?? 0}
            onChange={(e) => onChange({ decisionWeight: Number(e.target.value) })} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          {!dropped && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-destructive"
              onClick={() => onDrop(prompt("Drop-out reason?") ?? "not-interested")}>
              <Trash2 className="h-3 w-3" /> Drop
            </Button>
          )}
          {dropped && (
            <span className="text-[10px] text-destructive">Dropped: {m.droppedOutReason}</span>
          )}
        </div>
      </div>
      <WhyCaption
        why="Per-person profile → per-person consent, ID, food, move-in, payment role."
        admin="Fair attribution, group-closure metrics, drop-out reasons in one place"
        tcm="Never has to ask 'wait, who was paying?' again"
        client="Each mover treated as an individual, not lumped as +1"
        compact
      />
    </div>
  );
}

// ─────────────────── Revival Cycles ────────────────────

const REUSE_OPTIONS = [
  "id-collected","food","budget","area","consent","tour-history","objections","shortlist",
];

function CyclesSection({ leadId }: { leadId: string }) {
  const cycles = useLifecycle((s) => s.cycles[leadId]) ?? EMPTY_ARR;
  const ensureCycle = useLifecycle((s) => s.ensureCycle);
  const closeCycle = useLifecycle((s) => s.closeCycle);
  const reviveCycle = useLifecycle((s) => s.reviveCycle);
  const reclaim = useLifecycle((s) => s.reclaimCycle);
  const refresh = useLifecycle((s) => s.refreshOldShortlist);
  const [revivalReason, setRevivalReason] = useState<RevivalReason>("budget-ready");
  const [reuseKeys, setReuseKeys] = useState<string[]>(["id-collected","food","budget"]);
  const [closeReason, setCloseReason] = useState<CycleCloseReason>("deferred");

  const open = cycles.find((c) => !c.closedAt);

  return (
    <section className="rounded-lg border border-border bg-card p-3 space-y-3">
      <WhySectionBanner
        title="Revival cycles"
        why="Leads reappear. Jan → June → Nov. Each return is a new cycle with full old history."
        admin="Repeat-customer intelligence, correct attribution, revival probability"
        tcm="No 'cold' opener when the lead already knows us — use welcome-back script"
        client="No re-asking name/food/budget every time — feels remembered"
      />

      {cycles.length === 0 && (
        <Button size="sm" onClick={() => ensureCycle(leadId)} className="h-8 text-xs">
          <RefreshCw className="h-3 w-3 mr-1" /> Open cycle #1
        </Button>
      )}

      <div className="space-y-2">
        {cycles.map((c) => (
          <CycleCard key={c.id} cycle={c} isOnlyOpen={!c.closedAt} totalCycles={cycles.length}
            onCloseCycle={(r) => closeCycle(leadId, r)}
            onReclaim={() => reclaim(leadId, c.id, "current-user")}
            onRefresh={() => refresh(leadId, c.id, [
              { propertyId: "p1", label: "Old option A", status: "available" },
              { propertyId: "p2", label: "Old option B", status: "price-up", priceDeltaPct: 8 },
              { propertyId: "p3", label: "Old option C", status: "gone" },
            ])}
            closeReasonState={closeReason} setCloseReasonState={setCloseReason} />
        ))}
      </div>

      {open?.closedAt || (!open && cycles.length > 0) || (open && cycles.length > 1) ? null : null}
      {cycles.length > 0 && !open && (
        <div className="rounded-md border border-dashed p-2 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revive as new cycle</div>
          <div className="flex items-center gap-1 flex-wrap">
            <Select value={revivalReason} onValueChange={(v) => setRevivalReason(v as RevivalReason)}>
              <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(REVIVAL_REASON_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs"
              onClick={() => reviveCycle(leadId, revivalReason, reuseKeys)}>
              <RefreshCw className="h-3 w-3 mr-1" /> Open cycle #{cycles.length + 1}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {REUSE_OPTIONS.map((k) => (
              <button key={k} type="button"
                onClick={() => setReuseKeys((cur) => cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k])}
                className={cn("text-[10px] px-1.5 py-0.5 rounded-full border",
                  reuseKeys.includes(k) ? "bg-primary/10 border-primary/40 text-primary" : "border-border")}>
                skip: {k}
              </button>
            ))}
          </div>
          <WhyCaption
            why="Auto-skip already-done steps in the new cycle so TCM only re-does what changed."
            admin="Fair credit + speed metric"
            tcm="Saves 10+ mins per revived lead"
            client="Doesn't feel interrogated all over again"
            compact
          />
        </div>
      )}
    </section>
  );
}

// ─────────────────── Next-7 Touches ────────────────────

// ─────────── Cycle card — full drillable per-cycle history ───────────

const EVENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  opened: PlayCircle, revived: RotateCcw, call: Phone, wa: MessageSquare,
  sms: MessageSquare, email: MessageSquare,
  "tour-scheduled": MapPin, "tour-visited": MapPin, "tour-noshow": XOctagon, "tour-cancelled": XOctagon,
  objection: ShieldAlert, "quote-sent": IndianRupee, commitment: HandshakeIcon,
  "commitment-broken": XOctagon, booking: CheckCircle, refund: IndianRupee,
  reassigned: ArrowUpRight, note: FileText, evidence: FileText, closed: XCircle,
};

const EVENT_TONE: Record<string, string> = {
  opened: "text-primary", revived: "text-primary",
  call: "text-foreground", wa: "text-emerald-500",
  "tour-visited": "text-emerald-500", "tour-scheduled": "text-foreground",
  "tour-noshow": "text-destructive", "tour-cancelled": "text-destructive",
  objection: "text-amber-500", "quote-sent": "text-foreground",
  commitment: "text-emerald-500", "commitment-broken": "text-destructive",
  booking: "text-emerald-600", refund: "text-destructive",
  closed: "text-muted-foreground",
};

function CycleCard({
  cycle: c, isOnlyOpen, totalCycles, onCloseCycle, onReclaim, onRefresh,
  closeReasonState, setCloseReasonState,
}: {
  cycle: LeadCycle;
  isOnlyOpen: boolean;
  totalCycles: number;
  onCloseCycle: (reason: CycleCloseReason) => void;
  onReclaim: () => void;
  onRefresh: () => void;
  closeReasonState: CycleCloseReason;
  setCloseReasonState: (v: CycleCloseReason) => void;
}) {
  const [expanded, setExpanded] = useState(!c.closedAt); // open cycle expanded by default
  const events = c.events ?? [];
  const durationDays = c.closedAt
    ? Math.max(1, Math.round((+new Date(c.closedAt) - +new Date(c.openedAt)) / 86_400_000))
    : Math.max(1, Math.round((Date.now() - +new Date(c.openedAt)) / 86_400_000));

  return (
    <div className={cn("rounded border overflow-hidden",
      c.closedAt ? "border-border bg-muted/30" : "border-primary/40 bg-primary/5")}>
      {/* Header — always visible, click to expand */}
      <button type="button" onClick={() => setExpanded((v) => !v)}
        className="w-full px-2.5 py-2 flex items-center gap-2 text-left hover:bg-muted/40 transition-colors">
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="text-xs font-semibold shrink-0">Cycle #{c.cycleNumber}</span>
        {!c.closedAt && <Tag tone="success">OPEN</Tag>}
        <span className="text-[10px] text-muted-foreground truncate flex-1">
          {new Date(c.openedAt).toLocaleDateString()}
          {c.closedAt ? ` → ${new Date(c.closedAt).toLocaleDateString()}` : " → now"}
          {` · ${durationDays}d · ${events.length} events`}
        </span>
        {c.closeReason && <Tag tone={c.closeReason === "booked" ? "success" : "danger"}>{CLOSE_REASON_LABELS[c.closeReason]}</Tag>}
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/50">
          {/* Meta chips */}
          <div className="flex flex-wrap gap-1 text-[10px] pt-2">
            {c.revivalReason && <Tag tone="success">Revived: {REVIVAL_REASON_LABELS[c.revivalReason]}</Tag>}
            {c.gapDays !== undefined && c.gapDays > 0 && <Tag tone="info">Gap: {c.gapDays}d since last cycle</Tag>}
            {c.reusedFromCycle && <Tag tone="info">Reused from #{c.reusedFromCycle}: {c.reusedFields?.join(", ")}</Tag>}
            {c.predictedNextRevival && <Tag tone="warn">Next revival ~{new Date(c.predictedNextRevival).toLocaleDateString()}</Tag>}
            {c.originalTcmId && c.currentTcmId && c.originalTcmId !== c.currentTcmId && (
              <Tag tone="warn">Original TCM: {c.originalTcmId} → Current: {c.currentTcmId}</Tag>
            )}
            {c.originalTcmId === c.currentTcmId && c.currentTcmId && (
              <Tag tone="info">TCM: {c.currentTcmId}</Tag>
            )}
            {c.reclaimRequestedBy && <Tag tone="danger">Reclaim requested by {c.reclaimRequestedBy}</Tag>}
          </div>

          {/* Snapshot */}
          {c.snapshot && (
            <div className="rounded bg-background/60 border border-border/50 p-2 text-[10px] grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5">
              <SnapshotRow k="Budget" v={c.snapshot.budget ? `₹${c.snapshot.budget.toLocaleString()}` : "—"} />
              <SnapshotRow k="Area" v={c.snapshot.area ?? "—"} />
              <SnapshotRow k="Move-in" v={c.snapshot.moveInDate ?? "—"} />
              <SnapshotRow k="Food" v={c.snapshot.food ?? "—"} />
              <SnapshotRow k="Sharing" v={c.snapshot.sharing ?? "—"} />
              <SnapshotRow k="Persona" v={`${c.snapshot.persona ?? "—"}${c.snapshot.groupSize ? ` · ${c.snapshot.groupSize}p` : ""}`} />
            </div>
          )}

          {/* Quote / Booking summary */}
          {(c.quote || c.booking) && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              {c.quote && (
                <span className="rounded bg-background/60 border border-border/50 px-1.5 py-0.5">
                  Quote: ₹{c.quote.amount.toLocaleString()}
                  {c.quote.discount ? ` (-₹${c.quote.discount})` : ""}
                  {` · dep ₹${c.quote.deposit?.toLocaleString() ?? "—"}`}
                </span>
              )}
              {c.booking && (
                <span className={cn("rounded border px-1.5 py-0.5",
                  c.booking.refundedAt ? "border-destructive/40 bg-destructive/5 text-destructive"
                    : "border-success/40 bg-success/5 text-success")}>
                  {c.booking.refundedAt ? "REFUNDED" : "BOOKED"}: ₹{c.booking.amount.toLocaleString()} · {c.booking.ref}
                </span>
              )}
            </div>
          )}

          {/* Old shortlist status */}
          {c.oldShortlistStatus && c.oldShortlistStatus.length > 0 && (
            <div className="text-[10px] space-y-0.5 rounded bg-background/60 border border-border/50 p-2">
              <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Old shortlist status</div>
              {c.oldShortlistStatus.map((s, i) => (
                <div key={i} className="pl-1">• {s.label}:{" "}
                  <span className={cn(
                    s.status === "available" && "text-success",
                    s.status === "gone" && "text-destructive",
                    s.status === "price-up" && "text-warning",
                    s.status === "price-down" && "text-primary",
                  )}>{s.status}{s.priceDeltaPct ? ` (${s.priceDeltaPct > 0 ? "+" : ""}${s.priceDeltaPct}%)` : ""}</span>
                </div>
              ))}
            </div>
          )}

          {/* EVENT TIMELINE — the "100% info" */}
          {events.length > 0 && (
            <div className="space-y-1">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Full journey ({events.length})
              </div>
              <ol className="space-y-1">
                {events.map((e) => <EventRow key={e.id} e={e} />)}
              </ol>
            </div>
          )}

          {/* Free-text notes fallback */}
          {c.notes && (
            <div className="text-[10px] italic text-muted-foreground border-l-2 border-border pl-2">
              {c.notes}
            </div>
          )}

          {/* Cycle actions */}
          {isOnlyOpen && totalCycles > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-border/50">
              <Select value={closeReasonState} onValueChange={(v) => setCloseReasonState(v as CycleCloseReason)}>
                <SelectTrigger className="h-6 text-[10px] w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CLOSE_REASON_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-6 text-[10px]"
                onClick={() => onCloseCycle(closeReasonState)}>Close cycle</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={onReclaim}>Request reclaim</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={onRefresh}>Refresh old shortlist</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SnapshotRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-muted-foreground uppercase tracking-wider text-[9px]">{k}</span>
      <span className="truncate font-medium">{v}</span>
    </div>
  );
}

function EventRow({ e }: { e: CycleEvent }) {
  const [open, setOpen] = useState(false);
  const Icon = EVENT_ICON[e.type] ?? FileText;
  const tone = EVENT_TONE[e.type] ?? "text-foreground";
  const canExpand = !!(e.detail || (e.meta && Object.keys(e.meta).length));
  return (
    <li className="text-[11px] rounded border border-border/50 bg-background/60">
      <button type="button" onClick={() => canExpand && setOpen((v) => !v)}
        className={cn("w-full flex items-start gap-2 px-2 py-1 text-left",
          canExpand && "hover:bg-muted/50 cursor-pointer")}>
        <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", tone)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate font-medium">{e.summary}</span>
            {canExpand && (
              <span className="text-[9px] text-muted-foreground shrink-0">
                {open ? "hide" : "click for full detail"}
              </span>
            )}
          </div>
          <div className="text-[9px] text-muted-foreground">
            {new Date(e.ts).toLocaleString()} · {e.actor}
          </div>
        </div>
      </button>
      {open && (
        <div className="px-2 pb-2 pt-0.5 border-t border-border/40 text-[10px] space-y-1">
          {e.detail && <div className="text-foreground whitespace-pre-wrap">{e.detail}</div>}
          {e.meta && Object.keys(e.meta).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {Object.entries(e.meta).map(([k, v]) => (
                v == null || v === "" ? null : (
                  <span key={k} className="text-[9px] px-1 py-0.5 rounded bg-muted border border-border/40 font-mono">
                    {k}: {String(v)}
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}


function Next7Section({ leadId }: { leadId: string }) {
  const touches = useLifecycle((s) => s.touches[leadId]) ?? EMPTY_ARR;
  const cycles = useLifecycle((s) => s.cycles[leadId]) ?? EMPTY_ARR;
  const schedule = useLifecycle((s) => s.scheduleTouches);
  const skipTouch = useLifecycle((s) => s.skipTouch);
  const markTouch = useLifecycle((s) => s.markTouch);
  const open = cycles.find((c) => !c.closedAt);
  const plan = useMemo(() => next7Touches(touches), [touches]);

  return (
    <section className="rounded-lg border border-border bg-card p-3 space-y-3">
      <WhySectionBanner
        title="Next-7 touches plan"
        why="TCM should never wonder 'what next?' — the next 7 actions are pre-loaded per lead."
        admin="See exactly what's queued per TCM per lead; edit or override"
        tcm="One-click execute; nothing missed; skip needs a reason"
        client="Consistent, well-timed follow-ups — no chasing, no ghosting"
      />

      {open && (
        <div className="flex flex-wrap gap-1">
          {CADENCE_RULES.map((r) => (
            <Button key={r.outcome} size="sm" variant="outline" className="h-6 text-[10px]"
              onClick={() => schedule(leadId, open.id, r.outcome)}>
              + {r.label}
            </Button>
          ))}
        </div>
      )}

      {plan.length === 0 && (
        <div className="text-[10px] text-muted-foreground italic">
          No touches queued. Log an outcome above to auto-schedule the cadence.
        </div>
      )}

      <div className="space-y-1">
        {plan.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded border border-border px-2 py-1 text-[11px]">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-[10px]">{new Date(t.scheduledFor).toLocaleString()}</span>
            <ChannelBadge ch={t.channel} />
            <span className="text-muted-foreground truncate flex-1">{t.scriptKey}</span>
            {t.autoExecute && <Tag tone="info">auto</Tag>}
            <Tag tone={t.trigger === "sla-breach" ? "danger" : "info"}>{t.trigger}</Tag>
            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1"
              onClick={() => markTouch(leadId, t.id, { status: "sent", sentAt: new Date().toISOString() })}>
              <CheckCircle2 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1 text-destructive"
              onClick={() => skipTouch(leadId, t.id, prompt("Skip reason?") ?? "not-needed")}>
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────── Commitment Ledger ────────────────────

const COMMITMENT_TYPES: CommitmentType[] = [
  "callback","visit","payment","family-call","document-share","decision-by","arrival","custom",
];

function CommitmentSection({ leadId }: { leadId: string }) {
  const commitments = useLifecycle((s) => s.commitments[leadId]) ?? EMPTY_ARR;
  const cycles = useLifecycle((s) => s.cycles[leadId]) ?? EMPTY_ARR;
  const addCommitment = useLifecycle((s) => s.addCommitment);
  const mark = useLifecycle((s) => s.markCommitment);
  const health = useMemo(() => commitmentHealth(commitments), [commitments]);
  const open = cycles.find((c) => !c.closedAt);
  const [type, setType] = useState<CommitmentType>("callback");
  const [wording, setWording] = useState("");
  const [dueAt, setDueAt] = useState("");

  return (
    <section className="rounded-lg border border-border bg-card p-3 space-y-3">
      <WhySectionBanner
        title="Commitment ledger"
        why="Every promise ('will pay Fri', 'call at 6', 'family calling tomorrow') is tracked with a deadline."
        admin="See broken-promise ratio per TCM; identify unreliable lead patterns"
        tcm="Never forget a callback; auto-reminder before deadline"
        client="Feels heard — 'they remembered what I said'"
      />

      <div className="flex items-center gap-2 text-[11px]">
        <Tag tone="success">{health.kept} kept</Tag>
        <Tag tone="danger">{health.broken} broken</Tag>
        <span className="text-muted-foreground">Reliability: {health.keptPct}%</span>
      </div>

      {open && (
        <div className="grid grid-cols-4 gap-1.5">
          <Select value={type} onValueChange={(v) => setType(v as CommitmentType)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{COMMITMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="h-7 text-xs col-span-2" placeholder="'Will visit Sat 4pm'"
            value={wording} onChange={(e) => setWording(e.target.value)} />
          <Input type="datetime-local" className="h-7 text-xs"
            value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          <Button size="sm" className="h-7 text-xs col-span-4"
            disabled={!wording || !dueAt}
            onClick={() => {
              addCommitment(leadId, {
                cycleId: open.id, type, wording,
                dueAt: new Date(dueAt).toISOString(),
                createdBy: "current-user",
              });
              setWording(""); setDueAt("");
            }}>
            <HandshakeIcon className="h-3 w-3 mr-1" /> Log commitment
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {commitments.map((c) => {
          const overdue = c.state === "pending" && new Date(c.dueAt).getTime() < Date.now();
          return (
            <div key={c.id} className={cn("rounded border px-2 py-1 text-[11px] flex items-center gap-2",
              c.state === "kept" && "border-success/40 bg-success/5",
              c.state === "broken" && "border-destructive/40 bg-destructive/5",
              c.state === "pending" && overdue && "border-warning/40 bg-warning/5",
              c.state === "pending" && !overdue && "border-border")}>
              <span className="font-semibold">{c.type}</span>
              <span className="italic text-muted-foreground truncate flex-1">"{c.wording}"</span>
              <span className="font-mono text-[10px]">{new Date(c.dueAt).toLocaleString()}</span>
              {overdue && c.state === "pending" && <Tag tone="danger">overdue</Tag>}
              {c.state === "pending" && (
                <>
                  <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px] text-success"
                    onClick={() => mark(leadId, c.id, "kept")}>kept</Button>
                  <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px] text-destructive"
                    onClick={() => mark(leadId, c.id, "broken")}>broken</Button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────── Automation Config ────────────────────

const AUTO_KEYS: Array<{ key: keyof typeof DEFAULT_AUTOMATION; label: string; why: string; admin?: string; tcm?: string; client?: string }> = [
  { key: "drip",             label: "Nurture drips",       why: "Weekly WA to Future leads (new listings, price drops).", admin: "Keeps pipeline warm without labor", tcm: "Auto-fires — no manual scheduling", client: "Stays in the loop" },
  { key: "reminders",        label: "Commitment reminders", why: "Auto WA/SMS before promised time.", admin: "Fewer broken commits", tcm: "Never forgets a callback" },
  { key: "firstContact",     label: "First contact",        why: "Initial call/WA within SLA.", admin: "First-response time metric", tcm: "Pre-loaded script + timer" },
  { key: "postVisit",        label: "Post-visit follow-up", why: "6h call + 24h WA after every visit.", admin: "Post-visit conversion rate", tcm: "Structured recap flow" },
  { key: "dormancy",         label: "Dormancy sweeps",      why: "7/14/30/60/180d untouched leads surfaced with pre-written revival opener.", admin: "Nothing rots in the pipeline", tcm: "Wake-up queue every morning" },
  { key: "slaBreach",        label: "SLA breach escalation",why: "Missed follow-up → admin notified + reassignment offer.", admin: "Real-time evidence of gaps", tcm: "Fair-warning before reassign" },
  { key: "waSentimentNudge", label: "WA sentiment nudge",   why: "Read-not-replied 2h → auto nudge; cold-tone → change script.", admin: "Sentiment-aware conversion", tcm: "Zero silent-ghost losses" },
  { key: "revivalOpening",   label: "Revival opening",      why: "Old lead returns → welcome-back script, not cold opener.", admin: "Revival close rate", tcm: "Right tone, right script", client: "Feels remembered" },
];

function AutomationSection() {
  const automation = useLifecycle((s) => s.automation);
  const setAutomation = useLifecycle((s) => s.setAutomation);

  return (
    <section className="rounded-lg border border-border bg-card p-3 space-y-3">
      <WhySectionBanner
        title="Automation config (hybrid)"
        why="Aggressive by default for safe touches; assisted for human decisions. Admin toggles per rule."
        admin="Set org-wide policy; audit every auto-send"
        tcm="Focus energy on calls + closing, not on scheduling"
        client="Consistent cadence; never over-messaged"
      />
      <div className="space-y-1.5">
        {AUTO_KEYS.map((row) => (
          <div key={row.key} className="grid grid-cols-[1fr_auto] items-start gap-2">
            <div>
              <div className="text-xs font-medium">{row.label}</div>
              <WhyCaption why={row.why} admin={row.admin} tcm={row.tcm} client={row.client} compact />
            </div>
            <Select value={automation[row.key]} onValueChange={(v) => setAutomation({ [row.key]: v as AutomationMode })}>
              <SelectTrigger className="h-7 text-[11px] w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aggressive">Aggressive</SelectItem>
                <SelectItem value="assisted">Assisted</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────── Scenario Packs ────────────────────

const SCENARIO_GROUPS: Array<{ title: string; packs: Array<{ key: ScenarioPack; label: string; why: string }> }> = [
  {
    title: "Lifestyle / accessibility (10)",
    packs: [
      { key: "lang-mismatch",         label: "Language mismatch",        why: "Route to same-language TCM; log translator" },
      { key: "accessibility-hearing", label: "Hearing/speech accessibility", why: "WA-first cadence; no cold calls" },
      { key: "senior-citizen",        label: "Senior citizen",           why: "Slower pace, ground-floor room, family loop" },
      { key: "differently-abled",     label: "Differently-abled",        why: "Accessibility audit before tour" },
      { key: "near-hospital",         label: "Near-hospital required",   why: "Medical need — filter properties by distance" },
      { key: "religious-proximity",   label: "Religious proximity",      why: "Temple/mosque distance filter" },
      { key: "pet-owner",             label: "Pet owner",                why: "Pet-friendly filter + owner consent" },
      { key: "night-shift",           label: "Night-shift worker",       why: "Quiet-daytime rooms; 24/7 entry" },
      { key: "wfh-space",             label: "Remote worker WFH space",  why: "Wi-Fi speed + desk/window filter" },
      { key: "scholarship-delay",     label: "Scholarship-delay payment",why: "Deferred-payment flag + guardian co-sign" },
    ],
  },
  {
    title: "Fraud / quality gates (9)",
    packs: [
      { key: "wrong-number",       label: "Wrong number",         why: "Mark and quarantine to avoid repeat" },
      { key: "spam-fraud",         label: "Spam / fraud lead",    why: "Blocklist + source-quality report" },
      { key: "agent-broker",       label: "Agent/broker posing",  why: "Different flow: commission, not TCM effort" },
      { key: "competitor-scout",   label: "Competitor scouting",  why: "Redirect; do not share sensitive pricing" },
      { key: "duplicate-source",   label: "Duplicate across sources", why: "Merge; attribute first source" },
      { key: "sold-twice",         label: "Sold to us twice",     why: "Refund/credit reconciliation" },
      { key: "minor-no-guardian",  label: "Minor without guardian", why: "Cannot book; escalate to guardian call" },
      { key: "expired-id",         label: "Expired ID",           why: "Reject ID + request fresh doc" },
      { key: "name-mismatch-id",   label: "Name mismatch on ID",  why: "KYC gate; supporting doc required" },
    ],
  },
  {
    title: "Operational friction (10)",
    packs: [
      { key: "weather-delay",         label: "Weather/traffic delay",  why: "Auto-WA apology + reschedule" },
      { key: "tcm-sick-handoff",      label: "TCM sick handoff",       why: "Instant reassign; brief covered by dossier" },
      { key: "owner-cancel-last-min", label: "Owner cancels last-min", why: "Apology + priority re-tour + admin flag" },
      { key: "key-unavailable",       label: "Key unavailable",        why: "Alt-property fallback ready" },
      { key: "room-mismatch",         label: "Room different from listed", why: "Evidence photo + owner accountability" },
      { key: "price-mismatch-at-visit", label: "Price mismatch at visit", why: "Escalate to owner; honor listed price if possible" },
      { key: "negotiation-loop",      label: "Negotiation loop",       why: "Cap iterations; escalate to manager" },
      { key: "token-paid-agreement-stuck", label: "Token paid, agreement stuck", why: "Daily nudge + owner escalation" },
      { key: "movein-noshow",         label: "Move-in-day no-show",    why: "Refund window + revival cycle" },
      { key: "first-week-complaint",  label: "First-week complaint",   why: "Rapid response; NPS impact tracked" },
    ],
  },
  {
    title: "Loss reasons + revival hooks (8)",
    packs: [
      { key: "lost-to-competitor",   label: "Lost to competitor",   why: "Log competitor + price gap → intel" },
      { key: "lost-own-arrangement", label: "Lost — own arrangement", why: "6-month revival trigger" },
      { key: "lost-buying-flat",     label: "Lost — buying flat",   why: "Long-cycle revival (12mo)" },
      { key: "moved-different-city", label: "Moved to different city", why: "Cross-city referral to partner" },
      { key: "deferred-indefinitely",label: "Deferred indefinitely",why: "45-day nurture sweep" },
      { key: "health-emergency-loss",label: "Health emergency",     why: "Pause 60d; warm re-open script" },
      { key: "job-loss-loss",        label: "Job loss",             why: "90-day revival; budget-flex flag" },
      { key: "family-emergency-loss",label: "Family emergency",     why: "45-day pause + empathy opener" },
    ],
  },
];

function ScenarioSection({ leadId }: { leadId: string }) {
  const cycles = useLifecycle((s) => s.cycles[leadId]) ?? EMPTY_ARR;
  const flags = useLifecycle((s) => s.scenarios[leadId]) ?? EMPTY_ARR;
  const flag = useLifecycle((s) => s.flagScenario);
  const resolve = useLifecycle((s) => s.resolveScenario);
  const open = cycles.find((c) => !c.closedAt);
  const active = flags.filter((f) => !f.resolvedAt);

  return (
    <section className="rounded-lg border border-border bg-card p-3 space-y-3">
      <WhySectionBanner
        title="Scenario packs (37 flows)"
        why="Every real-world edge case gets a dedicated flow with evidence, script, SLA, revival hook."
        admin="Coverage report — which scenarios your team handles well vs badly"
        tcm="Pre-baked playbook for the messy stuff (fraud, ghosts, weather, mismatch)"
        client="Every situation handled with intent, not improvisation"
      />

      {active.length > 0 && (
        <div className="space-y-1">
          {active.map((f) => (
            <div key={f.id} className="rounded border border-warning/40 bg-warning/5 px-2 py-1 text-[11px] flex items-center gap-2">
              <ShieldAlert className="h-3 w-3 text-warning" />
              <span className="font-semibold">{f.pack}</span>
              <span className="text-muted-foreground italic truncate flex-1">{f.notes}</span>
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1"
                onClick={() => resolve(leadId, f.id)}>Resolve</Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {SCENARIO_GROUPS.map((g) => (
          <div key={g.title}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{g.title}</div>
            <div className="flex flex-wrap gap-1">
              {g.packs.map((p) => (
                <button key={p.key} type="button"
                  disabled={!open}
                  title={p.why}
                  onClick={() => open && flag(leadId, open.id, p.key, p.why)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full border border-border hover:bg-muted disabled:opacity-40">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────── Small primitives ────────────────────

function Tag({ tone, children }: { tone: "success" | "warn" | "danger" | "info"; children: React.ReactNode }) {
  return (
    <span className={cn(
      "text-[9px] px-1 py-0.5 rounded border font-semibold uppercase leading-none",
      tone === "success" && "bg-success/10 text-success border-success/30",
      tone === "warn"    && "bg-warning/10 text-warning border-warning/30",
      tone === "danger"  && "bg-destructive/10 text-destructive border-destructive/30",
      tone === "info"    && "bg-primary/10 text-primary border-primary/30",
    )}>{children}</span>
  );
}

function ChannelBadge({ ch }: { ch: TouchChannel }) {
  return (
    <span className={cn(
      "text-[9px] px-1 py-0.5 rounded border font-semibold uppercase",
      ch === "call" && "bg-primary/10 text-primary border-primary/30",
      ch === "wa" && "bg-success/10 text-success border-success/30",
      ch === "sms" && "bg-accent/10 text-accent border-accent/30",
      ch === "email" && "bg-muted text-foreground border-border",
      (ch === "visit" || ch === "in-person") && "bg-warning/10 text-warning border-warning/30",
    )}>{ch}</span>
  );
}
