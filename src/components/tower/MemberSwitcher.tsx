import { useState } from "react";
import { useTowerAuth } from "@/lib/tower/auth";
import { ALL_ROLES, ROLE_LABEL, type Role } from "@/lib/tower/access";
import { TEAM_LABEL, type ReviewTeam } from "@/lib/tower/review-os";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TEAMS: ReviewTeam[] = ["control_tower", "flow_ops", "pcm", "closing", "cross_functional"];

/** No login — you just say who you are. The choice sticks on this device. */
export function MemberSwitcher() {
  const auth = useTowerAuth();
  const [open, setOpen] = useState(false);

  if (auth.loading) return <div className="text-xs text-muted-foreground">Loading team…</div>;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-auto py-1.5">
            <span className="text-left">
              <span className="block text-xs font-medium">{auth.user ? auth.user.name : "Who are you?"}</span>
              <span className="block text-[10px] text-muted-foreground">
                {auth.role ? ROLE_LABEL[auth.role] : "pick yourself"}
                {auth.team ? ` · ${TEAM_LABEL[auth.team]}` : ""}
              </span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-2">
          <div className="text-xs text-muted-foreground px-2 pb-2">
            Viewing as — switch to see any team&apos;s view. No password needed.
          </div>
          <div className="max-h-72 overflow-auto space-y-0.5">
            {auth.members.map((m) => (
              <button
                key={m.id}
                onClick={() => { auth.setMember(m.id); setOpen(false); }}
                className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted flex items-center justify-between gap-2 ${m.id === auth.user?.id ? "bg-muted" : ""}`}
              >
                <span className="truncate">{m.name}</span>
                <span className="flex gap-1 shrink-0">
                  {m.roles[0] && <Badge className="text-[9px] px-1">{ROLE_LABEL[m.roles[0]]}</Badge>}
                  {m.team && <Badge variant="outline" className="text-[9px] px-1">{TEAM_LABEL[m.team]}</Badge>}
                </span>
              </button>
            ))}
            {auth.members.length === 0 && <div className="text-sm text-muted-foreground px-2 py-3">No team members yet — add the first one.</div>}
          </div>
          <div className="pt-2 border-t mt-2">
            <AddMemberDialog onDone={() => setOpen(false)} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function AddMemberDialog({ onDone }: { onDone: () => void }) {
  const auth = useTowerAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [team, setTeam] = useState<ReviewTeam>("flow_ops");
  const [role, setRole] = useState<Role>("sales");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await auth.addMember({ name: name.trim(), team, role, phone: phone.trim() || undefined });
      toast.success(`${name.trim()} added to the floor`);
      setName(""); setPhone(""); setOpen(false); onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="w-full justify-start text-xs">+ Add a team member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a team member</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aditi Verma" />
          </div>
          <div className="space-y-1">
            <Label>Phone (optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Team</Label>
              <Select value={team} onValueChange={(v) => setTeam(v as ReviewTeam)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{TEAM_LABEL[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !name.trim()}>{busy ? "Adding…" : "Add member"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
