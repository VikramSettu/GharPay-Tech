import { RoleGate } from "@/components/tower/RoleGate";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTowerAuth } from "@/lib/tower/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  DAILY_TARGET, MANDATORY_REVIEW_CASES, STATUS_CLASS, STATUS_LABEL, TEAMS, TEAM_LABEL,
  bandMeta, fmtTime, istDay, type FeedbackStatus, type ReviewKind, type ReviewTeam,
} from "@/lib/tower/review-os";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/tower/review/")({
  component: () => <RoleGate module="review"><ReviewHome /></RoleGate>,
  head: () => ({
    meta: [
      { title: "Daily Review Board — Gharpayy Chat & Call Review OS" },
      { name: "description", content: "Every lead assigned in the last 24 hours, reviewed daily by Control Tower, Flow Ops, PCM and Closing — from lead edit to lead feedback." },
      { property: "og:title", content: "Daily Review Board — Gharpayy Review OS" },
      { property: "og:description", content: "Score every chat and call within 24 hours, assign corrections and close the loop in one shared timeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Review = Database["public"]["Tables"]["reviews"]["Row"];
type Profile = { user_id: string; full_name: string | null; team: ReviewTeam | null };
type LeadLite = { id: string; phone: string; wa_name: string | null };
type Assignment = {
  id: string;
  lead_id: string;
  owner_id: string;
  priority: string;
  assigned_at: string;
  state: string;
  leads: { phone: string; wa_name: string | null; status: string } | null;
};

const KINDS: { id: ReviewKind; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "call", label: "Call" },
  { id: "lead_journey", label: "Lead journey" },
];

type Prefill = { leadId?: string; revieweeId?: string; team?: ReviewTeam; kind?: ReviewKind };

function ReviewHome() {
  const auth = useTowerAuth();
  const nav = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<Review[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<LeadLite[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dialog, setDialog] = useState<Prefill | null>(null);

  const load = async () => {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(300);
    setRows((data ?? []) as Review[]);
  };

  useEffect(() => {
    setMounted(true);
    load();
    (async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [p, l, a] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, team").order("full_name"),
        supabase.from("leads").select("id, phone, wa_name").order("created_at", { ascending: false }).limit(200),
        supabase.from("assignments")
          .select("id, lead_id, owner_id, priority, assigned_at, state, leads(phone, wa_name, status)")
          .gte("assigned_at", since).order("assigned_at", { ascending: false }),
      ]);
      setPeople((p.data ?? []) as Profile[]);
      setLeads((l.data ?? []) as LeadLite[]);
      setAssignments((a.data ?? []) as unknown as Assignment[]);
    })();
    const ch = supabase.channel("reviews-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const nameOf = (id: string | null) => people.find((p) => p.user_id === id)?.full_name ?? "Member";
  const teamOf = (id: string | null): ReviewTeam => people.find((p) => p.user_id === id)?.team ?? "flow_ops";
  const today = istDay();

  const todays = rows.filter((r) => r.review_day === today);
  const mine = auth.user ? rows.filter((r) => r.reviewee_id === auth.user!.id) : [];
  const myOpen = mine.filter((r) => r.status !== "closed");
  const overdue = rows.filter((r) => r.status !== "closed" && r.deadline && new Date(r.deadline) < new Date()).length;
  const covered = new Set(todays.map((r) => r.lead_id).filter(Boolean));
  const coveragePct = assignments.length ? Math.round((assignments.filter((a) => covered.has(a.lead_id)).length / assignments.length) * 100) : 100;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Chat &amp; Call Review OS</h1>
          <p className="text-sm text-muted-foreground">
            Every lead assigned in the last 24 hours gets reviewed. One lead, one timeline, one next action — visible to every team.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/tower/feedback"><Button variant="outline" size="sm">My Feedback{myOpen.length ? ` (${myOpen.length})` : ""}</Button></Link>
          {auth.can("quality") && <Link to="/tower/quality"><Button variant="outline" size="sm">Quality Dashboard</Button></Link>}
          <Link to="/tower/guide"><Button variant="ghost" size="sm">How to review</Button></Link>
          {auth.isTowerOps && <Button size="sm" onClick={() => setDialog({})}>+ New review</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Leads assigned (24h)" value={assignments.length} hint="all must be reviewed today" />
        <Kpi label="Reviews done today" value={todays.length} />
        <Kpi label="Chats today" value={todays.filter((r) => r.kind === "chat").length} hint={`target ${DAILY_TARGET.chat}/person`} />
        <Kpi label="Calls today" value={todays.filter((r) => r.kind === "call").length} hint={`target ${DAILY_TARGET.call}/person`} />
        <Kpi label="Overdue corrections" value={overdue} danger={overdue > 0} />
      </div>

      <Card className="p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">24-hour review coverage</span>
          <span className={coveragePct === 100 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{coveragePct}%</span>
        </div>
        <Progress value={coveragePct} />
        <p className="text-xs text-muted-foreground">
          Coverage counts every lead assigned in the last 24 hours that already has at least one review today.
        </p>
      </Card>

      <Tabs defaultValue={auth.isTowerOps ? "board" : "mine"}>
        <TabsList>
          <TabsTrigger value="board">Daily board ({assignments.length})</TabsTrigger>
          <TabsTrigger value="mine">My feedback ({myOpen.length})</TabsTrigger>
          <TabsTrigger value="all">All reviews ({rows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-2 pt-3">
          {assignments.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No leads were assigned in the last 24 hours.</Card>}
          {assignments.map((a) => {
            const done = todays.filter((r) => r.lead_id === a.lead_id);
            const hasChat = done.some((r) => r.kind === "chat");
            const hasCall = done.some((r) => r.kind === "call");
            return (
              <Card key={a.id} className={`p-3 ${done.length === 0 ? "border-amber-500/50" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{a.leads?.wa_name ?? "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">{a.leads?.phone}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.priority.replace("_", " ")}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{nameOf(a.owner_id)} · {TEAM_LABEL[teamOf(a.owner_id)]}</Badge>
                  <Badge className={`text-[10px] ${hasChat ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>Chat {hasChat ? "✓" : "pending"}</Badge>
                  <Badge className={`text-[10px] ${hasCall ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>Call {hasCall ? "✓" : "pending"}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{mounted ? `assigned ${fmtTime(a.assigned_at)}` : ""}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {auth.isTowerOps && (
                    <>
                      <Button size="sm" variant={hasChat ? "outline" : "default"}
                        onClick={() => setDialog({ leadId: a.lead_id, revieweeId: a.owner_id, team: teamOf(a.owner_id), kind: "chat" })}>
                        Review chat
                      </Button>
                      <Button size="sm" variant={hasCall ? "outline" : "default"}
                        onClick={() => setDialog({ leadId: a.lead_id, revieweeId: a.owner_id, team: teamOf(a.owner_id), kind: "call" })}>
                        Review call
                      </Button>
                    </>
                  )}
                  <Link to="/tower/leads/$id" params={{ id: a.lead_id }}>
                    <Button size="sm" variant="ghost">Open lead timeline</Button>
                  </Link>
                  {done.map((r) => (
                    <Link key={r.id} to="/tower/review/$id" params={{ id: r.id }}>
                      <Badge className={`text-[10px] ${STATUS_CLASS[r.status]}`}>{r.kind} · {r.total_score}/100 · {STATUS_LABEL[r.status]}</Badge>
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="mine" className="space-y-2 pt-3">
          {!auth.user && <Card className="p-6 text-sm text-muted-foreground">Pick who you are in the top right to see your own feedback.</Card>}
          {auth.user && mine.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No reviews on your work yet.</Card>}
          {mine.map((r) => <ReviewRow key={r.id} r={r} name={nameOf(r.reviewee_id)} mounted={mounted} />)}
        </TabsContent>

        <TabsContent value="all" className="pt-3">
          <AllReviews rows={rows} people={people} nameOf={nameOf} mounted={mounted} />
        </TabsContent>
      </Tabs>

      {dialog && (
        <NewReviewDialog
          prefill={dialog}
          people={people}
          leads={leads}
          onClose={() => setDialog(null)}
          onCreated={(id) => nav({ to: "/tower/review/$id", params: { id } })}
        />
      )}
    </div>
  );
}

function ReviewRow({ r, name, mounted }: { r: Review; name: string; mounted: boolean }) {
  const band = bandMeta(r.band);
  const late = r.status !== "closed" && r.deadline && new Date(r.deadline) < new Date();
  return (
    <Link to="/tower/review/$id" params={{ id: r.id }} className="block">
      <Card className={`p-3 hover:border-primary/60 transition ${r.critical_error ? "border-red-500/60" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{TEAM_LABEL[r.team]}</Badge>
          <Badge variant="secondary" className="text-[10px] capitalize">{r.kind.replace("_", " ")}</Badge>
          <span className="font-semibold text-sm">{name}</span>
          <Badge className={`text-[10px] ${band.className}`}>{r.total_score}/100 · {band.label}</Badge>
          <Badge className={`text-[10px] ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</Badge>
          {r.critical_error && <Badge className="text-[10px] bg-red-600 text-white">Critical error</Badge>}
          {mounted && late && <Badge className="text-[10px] bg-red-600 text-white">Overdue</Badge>}
          <span className="ml-auto text-xs text-muted-foreground">{mounted ? fmtTime(r.occurred_at) : ""}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {r.what_happened || r.mandatory_reason || "Draft review — scoring pending."}
        </div>
        {r.corrective_action && r.status !== "closed" && (
          <div className="text-xs mt-1"><span className="font-medium">Next action:</span> {r.corrective_action}</div>
        )}
        {r.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {r.tags.slice(0, 6).map((t) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
          </div>
        )}
      </Card>
    </Link>
  );
}

function AllReviews({ rows, people, nameOf, mounted }: { rows: Review[]; people: Profile[]; nameOf: (id: string | null) => string; mounted: boolean }) {
  const auth = useTowerAuth();
  const [fTeam, setFTeam] = useState("all");
  const [fKind, setFKind] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fPerson, setFPerson] = useState("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => rows.filter((r) => {
    if (fTeam !== "all" && r.team !== fTeam) return false;
    if (fKind !== "all" && r.kind !== fKind) return false;
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (fPerson !== "all" && r.reviewee_id !== fPerson) return false;
    if (q.trim()) {
      const hay = `${r.source_ref ?? ""} ${r.what_happened ?? ""} ${r.tags.join(" ")} ${r.mandatory_reason ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [rows, fTeam, fKind, fStatus, fPerson, q]);

  return (
    <div className="space-y-2">
      <Card className="p-3 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs">Search</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tag, source, summary…" />
        </div>
        <Filter label="Team" value={fTeam} onChange={setFTeam} options={[["all", "All teams"], ...TEAMS.map((t) => [t.id, t.label] as [string, string])]} />
        <Filter label="Type" value={fKind} onChange={setFKind} options={[["all", "All types"], ...KINDS.map((k) => [k.id, k.label] as [string, string])]} />
        <Filter label="Status" value={fStatus} onChange={setFStatus} options={[["all", "All statuses"], ...(Object.keys(STATUS_LABEL) as FeedbackStatus[]).map((s) => [s, STATUS_LABEL[s]] as [string, string])]} />
        <Filter label="Employee" value={fPerson} onChange={setFPerson} options={[["all", "Everyone"], ...people.map((p) => [p.user_id, p.full_name ?? "Member"] as [string, string])]} />
        {auth.user && <Button variant="ghost" size="sm" onClick={() => setFPerson(auth.user!.id)}>Only me</Button>}
      </Card>
      {filtered.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No reviews match these filters.</Card>}
      {filtered.map((r) => <ReviewRow key={r.id} r={r} name={nameOf(r.reviewee_id)} mounted={mounted} />)}
    </div>
  );
}

function Kpi({ label, value, hint, danger }: { label: string; value: number; hint?: string; danger?: boolean }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${danger ? "text-red-500" : ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="min-w-[140px]">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function NewReviewDialog({ prefill, people, leads, onClose, onCreated }: {
  prefill: Prefill; people: Profile[]; leads: LeadLite[]; onClose: () => void; onCreated: (id: string) => void;
}) {
  const auth = useTowerAuth();
  const [reviewee, setReviewee] = useState(prefill.revieweeId ?? "");
  const [team, setTeam] = useState<ReviewTeam>(prefill.team ?? "flow_ops");
  const [kind, setKind] = useState<ReviewKind>(prefill.kind ?? "chat");
  const [leadId, setLeadId] = useState(prefill.leadId ?? "none");
  const [sourceRef, setSourceRef] = useState("");
  const [mandatory, setMandatory] = useState("none");
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!reviewee) { toast.error("Select the employee being reviewed"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("reviews").insert({
      reviewee_id: reviewee,
      reviewer_id: auth.user?.id ?? null,
      team, kind,
      lead_id: leadId === "none" ? null : leadId,
      source_ref: sourceRef || null,
      transcript: transcript || null,
      mandatory_reason: mandatory === "none" ? null : mandatory,
      status: "new",
    }).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Review created — score it now");
    onCreated(data.id);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New review</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Employee reviewed</Label>
            <Select value={reviewee} onValueChange={setReviewee}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{people.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name ?? "Member"}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Team</Label>
              <Select value={team} onValueChange={(v) => setTeam(v as ReviewTeam)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEAMS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Review type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as ReviewKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Lead (links the review to the shared timeline)</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No lead linked</SelectItem>
                {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.wa_name ?? "Unknown"} · {l.phone}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Conversation / recording link</Label>
            <Input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="WhatsApp link or call recording URL" />
          </div>
          <div>
            <Label className="text-xs">Mandatory 100% review case (if any)</Label>
            <Select value={mandatory} onValueChange={setMandatory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not a mandatory case</SelectItem>
                {MANDATORY_REVIEW_CASES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Conversation / transcript (paste)</Label>
            <Textarea rows={5} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste the chat or call transcript so the reviewer sees exactly what the customer saw." />
          </div>
          <Button className="w-full" disabled={saving} onClick={create}>{saving ? "Creating…" : "Create & score"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
