import { useMemo, useState } from "react";
import { useOs, decisionConflict, decisionMap } from "@/lib/os/store";
import { WhyCaption } from "@/components/common/WhyCaption";
import { WHY } from "@/lib/os/why-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, AlertTriangle, Users } from "lucide-react";
import type { DecisionPower, PayResponsibility, PersonRelation, OsPerson, OsGroup } from "@/lib/os/types";

const RELATIONS: PersonRelation[] = ["self","friend","partner","spouse","sibling","parent","guardian","roommate","colleague","manager","hr-poc","other"];
const POWERS: DecisionPower[] = ["final","strong","influencer","user"];
const PAYS: PayResponsibility[] = ["self","shared","parent","company","other"];

export function MultiPersonPanel({ leadId }: { leadId: string }) {
  const group = useOs((s) => s.groups[leadId]);
  const ensureGroup = useOs((s) => s.ensureGroup);
  const addPerson = useOs((s) => s.addPerson);
  const updatePerson = useOs((s) => s.updatePerson);
  const removePerson = useOs((s) => s.removePerson);
  const setGroupMeta = useOs((s) => s.setGroupMeta);

  if (!group) ensureGroup(leadId);

  const conflict = useMemo(() => decisionConflict(group), [group]);
  const dmap = useMemo(() => decisionMap(group), [group]);

  const [draft, setDraft] = useState<Omit<OsPerson, "id">>({
    name: "", relation: "friend", decisionPower: "user", payResponsibility: "self",
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Multi-Person Dossier</h3>
        <Badge variant="outline" className="ml-auto">{group?.people.length ?? 0} people</Badge>
      </header>
      <WhyCaption {...WHY["os.people.add"]} />

      {/* group meta */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <label className="space-y-1">
          <span className="text-muted-foreground">Headcount</span>
          <Input
            type="number" min={1} value={group?.headcount ?? 1}
            onChange={(e) => setGroupMeta(leadId, { headcount: Math.max(1, +e.target.value) })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Group type</span>
          <Select value={group?.groupType ?? ""} onValueChange={(v) => setGroupMeta(leadId, { groupType: v as OsGroup["groupType"] })}>
            <SelectTrigger><SelectValue placeholder="pick" /></SelectTrigger>
            <SelectContent>
              {["solo","friends","couple","married","family","office","students","startup","mixed"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">WA group link</span>
          <Input placeholder="https://chat.whatsapp.com/…" value={group?.waGroupLink ?? ""} onChange={(e) => setGroupMeta(leadId, { waGroupLink: e.target.value })} />
        </label>
      </div>

      {/* conflict banner */}
      {conflict.hasConflict && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs">
          <div className="flex items-center gap-1 font-semibold text-warning">
            <AlertTriangle className="h-3 w-3" /> Decision conflict detected
          </div>
          <ul className="list-disc pl-4 mt-1 text-muted-foreground">
            {conflict.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <WhyCaption {...WHY["os.people.conflict"]} compact />
        </div>
      )}

      {/* decision map */}
      {(group?.people.length ?? 0) > 0 && (
        <div className="rounded-md border p-2 text-xs space-y-1">
          <div className="font-semibold">Decision map</div>
          <div><span className="text-muted-foreground">Final: </span>{dmap.finalDeciders.map((p) => p.name).join(", ") || "—"}</div>
          <div><span className="text-muted-foreground">Payers: </span>{dmap.payers.map((p) => p.name).join(", ") || "—"}</div>
          <div><span className="text-muted-foreground">Influencers: </span>{dmap.influencers.map((p) => p.name).join(", ") || "—"}</div>
        </div>
      )}

      {/* people list */}
      <div className="space-y-2">
        {group?.people.map((p) => (
          <div key={p.id} className="rounded-md border p-2 text-xs grid grid-cols-6 gap-1 items-center">
            <Input className="col-span-2" value={p.name} onChange={(e) => updatePerson(leadId, p.id, { name: e.target.value })} />
            <Select value={p.relation} onValueChange={(v) => updatePerson(leadId, p.id, { relation: v as PersonRelation })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RELATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={p.decisionPower} onValueChange={(v) => updatePerson(leadId, p.id, { decisionPower: v as DecisionPower })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{POWERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={p.payResponsibility} onValueChange={(v) => updatePerson(leadId, p.id, { payResponsibility: v as PayResponsibility })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => removePerson(leadId, p.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* add */}
      <div className="rounded-md border border-dashed p-2 text-xs grid grid-cols-6 gap-1 items-center">
        <Input className="col-span-2" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <Select value={draft.relation} onValueChange={(v) => setDraft({ ...draft, relation: v as PersonRelation })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{RELATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={draft.decisionPower} onValueChange={(v) => setDraft({ ...draft, decisionPower: v as DecisionPower })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{POWERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={draft.payResponsibility} onValueChange={(v) => setDraft({ ...draft, payResponsibility: v as PayResponsibility })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PAYS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" onClick={() => {
          if (!draft.name.trim()) return;
          addPerson(leadId, draft);
          setDraft({ name: "", relation: "friend", decisionPower: "user", payResponsibility: "self" });
        }}>
          <UserPlus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}
