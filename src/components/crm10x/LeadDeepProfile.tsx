import { useState } from "react";
import { useCRM10x } from "@/lib/crm10x/store";
import type {
  DecisionAuthority, FlexibilityScore, FoodPref, FurnishingPref,
  Gender, LangPref, LeadSource, RoomTypePref,
} from "@/lib/crm10x/types";
import type { Lead } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, CheckCircle2, ChevronDown, ChevronUp, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function LeadDeepProfile({ lead }: { lead: Lead }) {
  const profile = useCRM10x((s) => s.profiles[lead.id]);
  const upsert = useCRM10x((s) => s.upsertProfile);
  const addShiftingDate = useCRM10x((s) => s.addShiftingDate);
  const [open, setOpen] = useState(false);
  const [newShift, setNewShift] = useState("");
  const [shiftReason, setShiftReason] = useState("");

  const f = profile ?? { leadId: lead.id, updatedAt: new Date().toISOString() };
  const history = f.shiftingHistory ?? [];

  const submitShift = () => {
    if (!newShift) { toast.error("Pick a date"); return; }
    addShiftingDate(lead.id, {
      shiftingDate: new Date(newShift).toISOString(),
      reason: shiftReason || undefined,
      loggedBy: lead.assignedTcmId,
    });
    toast.success("Shifting date updated — old entry kept in history");
    setNewShift(""); setShiftReason("");
  };

  const completion = countFilled(f as unknown as Record<string, unknown>) * 10; // out of ~100

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/40"
      >
        <span className="font-semibold flex items-center gap-2">
          Deep profile
          <span className="text-[10px] text-muted-foreground">{completion}% complete</span>
          {completion >= 80 && <CheckCircle2 className="h-3 w-3 text-success" />}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="p-3 space-y-3 border-t border-border">
          <div className="grid grid-cols-2 gap-2">
            <Field label="PG type">
              <Select value={f.gender ?? ""} onValueChange={(v) => upsert({ leadId: lead.id, gender: v as Gender })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boys-pg">Boys PG</SelectItem>
                  <SelectItem value="girls-pg">Girls PG</SelectItem>
                  <SelectItem value="co-live">Co-live</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Room">
              <Select value={f.roomType ?? ""} onValueChange={(v) => upsert({ leadId: lead.id, roomType: v as RoomTypePref })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(["single","double","triple","any"] as const).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Furnishing">
              <Select value={f.furnishing ?? ""} onValueChange={(v) => upsert({ leadId: lead.id, furnishing: v as FurnishingPref })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(["ac","non-ac","semi","any"] as const).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Food">
              <Select value={f.food ?? ""} onValueChange={(v) => upsert({ leadId: lead.id, food: v as FoodPref })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(["veg","non-veg","no-food","any"] as const).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Source">
              <Select value={f.source ?? ""} onValueChange={(v) => upsert({ leadId: lead.id, source: v as LeadSource })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(["whatsapp","website","referral","indiamart","google","walk-in","other"] as const).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Decision-maker">
              <Select value={f.decisionMaker ?? ""} onValueChange={(v) => upsert({ leadId: lead.id, decisionMaker: v as DecisionAuthority })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="parents">Parents</SelectItem>
                  <SelectItem value="company-hr">Company / HR</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Language">
              <Select value={f.language ?? ""} onValueChange={(v) => upsert({ leadId: lead.id, language: v as LangPref })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="kannada">Kannada</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Flexibility">
              <Select
                value={f.flexibility ? String(f.flexibility) : ""}
                onValueChange={(v) => upsert({ leadId: lead.id, flexibility: Number(v) as FlexibilityScore })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Rigid</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3 — Mid</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5 — Very flexible</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Company / college">
              <Input
                className="h-8 text-xs"
                value={f.companyOrCollege ?? ""}
                onChange={(e) => upsert({ leadId: lead.id, companyOrCollege: e.target.value })}
              />
            </Field>
            <Field label="Best time to call">
              <Input
                className="h-8 text-xs"
                placeholder="e.g. after 6 PM"
                value={f.bestCallTime ?? ""}
                onChange={(e) => upsert({ leadId: lead.id, bestCallTime: e.target.value })}
              />
            </Field>
            <Field label="Stated budget (₹)">
              <Input
                type="number" className="h-8 text-xs"
                value={f.budgetStated ?? ""}
                onChange={(e) => upsert({ leadId: lead.id, budgetStated: Number(e.target.value) })}
              />
            </Field>
            <Field label="Max budget (₹)">
              <Input
                type="number" className="h-8 text-xs"
                value={f.budgetMax ?? ""}
                onChange={(e) => upsert({ leadId: lead.id, budgetMax: Number(e.target.value) })}
              />
            </Field>
            <Field label="PGs shortlisted">
              <Input
                type="number" className="h-8 text-xs"
                value={f.shortlistedCount ?? ""}
                onChange={(e) => upsert({ leadId: lead.id, shortlistedCount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Referral name">
              <Input
                className="h-8 text-xs"
                value={f.referralName ?? ""}
                onChange={(e) => upsert({ leadId: lead.id, referralName: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm" variant={f.verifiedBudget ? "default" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => { upsert({ leadId: lead.id, verifiedBudget: !f.verifiedBudget }); toast.success("Budget verification updated"); }}
            >
              {f.verifiedBudget ? "✓ Budget verified" : "Mark budget verified"}
            </Button>
            <Button
              size="sm" variant={f.verifiedMoveIn ? "default" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => { upsert({ leadId: lead.id, verifiedMoveIn: !f.verifiedMoveIn }); toast.success("Move-in verification updated"); }}
            >
              {f.verifiedMoveIn ? "✓ Move-in verified" : "Mark move-in verified"}
            </Button>
          </div>

          {/* Shifting-date history (versioned, never deletes) */}
          <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                <CalendarClock className="h-3.5 w-3.5 text-accent" />
                Shifting date history
              </div>
              {f.preferredMoveInDate && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  Active: {format(new Date(f.preferredMoveInDate), "MMM d, yyyy")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-end">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">New shifting date</Label>
                <Input type="date" className="h-8 text-xs" value={newShift} onChange={(e) => setNewShift(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reason</Label>
                <Input className="h-8 text-xs" placeholder="parents wanted next month…" value={shiftReason} onChange={(e) => setShiftReason(e.target.value)} />
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={submitShift}>Update</Button>
            </div>
            {history.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <History className="h-3 w-3" /> Past entries · Gharpayy never forgets
                </div>
                {history.slice(0, 6).map((h, i) => (
                  <div key={`${h.ts}-${i}`} className="flex items-center justify-between text-[11px]">
                    <span>
                      <span className={i === 0 ? "font-semibold text-foreground" : "text-muted-foreground line-through"}>
                        {format(new Date(h.shiftingDate), "MMM d, yyyy")}
                      </span>
                      {h.reason && <span className="text-muted-foreground"> · {h.reason}</span>}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {format(new Date(h.ts), "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function countFilled(p: Record<string, unknown>): number {
  const keys = [
    "gender","roomType","furnishing","food","source","decisionMaker",
    "language","companyOrCollege","budgetStated","verifiedBudget",
  ];
  return keys.filter((k) => {
    const v = p[k];
    return v !== undefined && v !== null && v !== "";
  }).length;
}
