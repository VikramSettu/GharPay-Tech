import { createFileRoute, Link } from "@tanstack/react-router";
import { CORE_ROLES } from "@/founder/lib/execution/core-roles";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RoleGate } from "@/founder/components/RoleGate";
import { EMPLOYEES } from "@/founder/data/seed";
import {
  getAllPlaybooks, upsertPlaybook, deletePlaybook, clonePlaybook,
  getAssignment, setAssignment, clearAssignment,
  getOverride, setOverride, clearOverride,
  defaultPlaybookForRole,
  subscribePlaybooks, playbooksVersion,
  type Playbook, type StageDef,
} from "@/founder/lib/execution/playbooks";
import {
  getAllFields, addCustomField, archiveField, updateField, restoreDefault,
  DEFAULT_FIELDS, subscribeFields, fieldsVersion, FIELD_GROUPS,
  type FieldDef, type FieldType,
} from "@/founder/lib/execution/field-library";
import { Plus, Trash2, Copy, Save, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/playbooks")({
  head: () => ({
    meta: [
      { title: "Playbook Manager — Gharpayy Execution OS" },
      { name: "description", content: "Design daily flows for every role. Toggle fields, proofs and KPI chips per person. Fully configurable." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { tab?: string } => ({ tab: (s.tab as string) || "playbooks" }),
  component: () => <RoleGate allow={["leadership","hr"]}><PlaybookManager /></RoleGate>,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Not found.</div>,
});

function PlaybookManager() {
  const { tab } = Route.useSearch();
  useSyncExternalStore(subscribePlaybooks, playbooksVersion, () => 0);
  useSyncExternalStore(subscribeFields, fieldsVersion, () => 0);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">System · configurable execution</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Playbook Manager</h1>
      </header>

      <Card className="p-4">
        <div className="text-sm font-medium">Core role playbooks (consolidated)</div>
        <p className="text-xs text-muted-foreground mt-1">
          The operating document is now four roles with locked P1/P2/EOD/weekly/monthly targets, five weighted KRAs,
          checkpoints, non-negotiables, escalations, enforcement bands, recovery questions and incentive models.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {CORE_ROLES.map((r) => (
            <Link
              key={r.id}
              to="/admin/flow"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              {r.name}
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {r.targets.map((t) => `${t.eod} ${t.label}`).join(" · ")}
              </span>
            </Link>
          ))}
        </div>
      </Card>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="fields">Field Library</TabsTrigger>
          <TabsTrigger value="assign">Assign · per-user</TabsTrigger>
        </TabsList>

        <TabsContent value="playbooks" className="mt-4"><PlaybookList /></TabsContent>
        <TabsContent value="fields" className="mt-4"><FieldLibraryTab /></TabsContent>
        <TabsContent value="assign" className="mt-4"><AssignTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// -------- Playbook list + editor --------
function PlaybookList() {
  const playbooks = getAllPlaybooks();
  const [editing, setEditing] = useState<string | null>(null);
  const active = editing ? playbooks.find((p) => p.id === editing) : null;

  if (active) {
    return <PlaybookEditor playbook={active} onClose={() => setEditing(null)} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {playbooks.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold">{p.name}</h3>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">{p.roleHint} · v{p.version}</div>
            </div>
            {p.builtIn && <Badge variant="outline" className="text-[10px]">Built-in</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{p.description}</p>
          <div className="text-xs mt-3">{p.stages.length} stages</div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setEditing(p.id)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => { const c = clonePlaybook(p.id, `${p.name} (copy)`); if (c) { setEditing(c.id); toast.success("Cloned"); } }}>
              <Copy className="h-3 w-3 mr-1" />Clone
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remove ${p.name}?`)) { deletePlaybook(p.id); toast.success("Removed"); } }}>
              <Trash2 className="h-3 w-3 mr-1" />
            </Button>
          </div>
        </Card>
      ))}
      <Card className="p-4 border-dashed grid place-items-center">
        <Button variant="ghost" onClick={() => {
          const p: Playbook = {
            id: `pb_custom_${Date.now()}`, name: "New Playbook", roleHint: "Custom",
            description: "Describe this flow…", version: 1, active: true, createdAt: Date.now(), builtIn: false,
            stages: [{ id: "s1", label: "Login", proofs: ["selfie"], fields: [], waTemplate: "" }],
          };
          upsertPlaybook(p);
          setEditing(p.id);
        }}><Plus className="h-4 w-4 mr-1" /> Create playbook</Button>
      </Card>
    </div>
  );
}

function PlaybookEditor({ playbook, onClose }: { playbook: Playbook; onClose: () => void }) {
  const [draft, setDraft] = useState<Playbook>(JSON.parse(JSON.stringify(playbook)));
  const [openStage, setOpenStage] = useState<string | null>(draft.stages[0]?.id || null);
  const fields = getAllFields();

  const save = () => { upsertPlaybook({ ...draft, version: draft.version + (playbook.builtIn ? 0 : 1) }); toast.success("Saved"); onClose(); };

  const addStage = () => {
    const s: StageDef = { id: `s_${Date.now()}`, label: "New stage", proofs: [], fields: [], waTemplate: "" };
    setDraft({ ...draft, stages: [...draft.stages, s] });
    setOpenStage(s.id);
  };
  const updStage = (id: string, patch: Partial<StageDef>) => {
    setDraft({ ...draft, stages: draft.stages.map((s) => s.id === id ? { ...s, ...patch } : s) });
  };
  const rmStage = (id: string) => setDraft({ ...draft, stages: draft.stages.filter((s) => s.id !== id) });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="text-lg font-semibold" />
            <div className="flex gap-2">
              <Input value={draft.roleHint} onChange={(e) => setDraft({ ...draft, roleHint: e.target.value })} placeholder="Role hint" className="max-w-48" />
              <Textarea rows={1} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={save}><Save className="h-3 w-3 mr-1" /> Save</Button>
            <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        {draft.stages.map((stage, i) => {
          const open = openStage === stage.id;
          return (
            <Card key={stage.id} className="p-3">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setOpenStage(open ? null : stage.id)}>
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Badge variant="outline" className="text-[10px] font-mono">#{i + 1}</Badge>
                <span className="font-medium text-sm flex-1">{stage.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{stage.fields.length} fields · {stage.proofs.length} proofs</span>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); rmStage(stage.id); }}><Trash2 className="h-3 w-3" /></Button>
              </div>
              {open && (
                <div className="mt-3 space-y-3 pl-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div><Label className="text-xs">Label</Label><Input value={stage.label} onChange={(e) => updStage(stage.id, { label: e.target.value })} /></div>
                    <div><Label className="text-xs">Time hint</Label><Input value={stage.time || ""} onChange={(e) => updStage(stage.id, { time: e.target.value })} /></div>
                    <div><Label className="text-xs">Score weight</Label><Input type="number" value={stage.weight || 0} onChange={(e) => updStage(stage.id, { weight: Number(e.target.value) || 0 })} /></div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Required proofs</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(["selfie","whatsapp","crm_ss","geo","file"] as const).map((p) => {
                        const on = stage.proofs.includes(p);
                        return (
                          <button key={p} type="button" onClick={() => updStage(stage.id, { proofs: on ? stage.proofs.filter((x) => x !== p) : [...stage.proofs, p] })}
                            className={`px-2 py-1 rounded border text-[11px] ${on ? "bg-primary text-primary-foreground border-primary" : ""}`}>{p}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Fields (tap to toggle)</Label>
                    <div className="max-h-56 overflow-y-auto border rounded p-2 space-y-2">
                      {FIELD_GROUPS.map((g) => {
                        const groupFields = fields.filter((f) => f.group === g && !f.archived);
                        if (!groupFields.length) return null;
                        return (
                          <div key={g}>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{g}</div>
                            <div className="flex flex-wrap gap-1">
                              {groupFields.map((f) => {
                                const on = stage.fields.includes(f.id);
                                const req = stage.requiredFields?.includes(f.id);
                                return (
                                  <div key={f.id} className="inline-flex">
                                    <button type="button" onClick={() => updStage(stage.id, { fields: on ? stage.fields.filter((x) => x !== f.id) : [...stage.fields, f.id] })}
                                      className={`px-2 py-0.5 rounded-l border text-[11px] ${on ? "bg-primary/20 border-primary" : ""}`}>{f.label}</button>
                                    {on && (
                                      <button type="button" title="Toggle required"
                                        onClick={() => updStage(stage.id, { requiredFields: req ? (stage.requiredFields || []).filter((x) => x !== f.id) : [...(stage.requiredFields || []), f.id] })}
                                        className={`px-1.5 py-0.5 rounded-r border-l-0 border text-[11px] ${req ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>{req ? "REQ" : "opt"}</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">WhatsApp template — use {"{{field_id}}"} placeholders (e.g. {"{{mission_1}}"}, {"{{calls}}"})</Label>
                    <Textarea rows={4} value={stage.waTemplate || ""} onChange={(e) => updStage(stage.id, { waTemplate: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        <Button size="sm" variant="outline" onClick={addStage}><Plus className="h-3 w-3 mr-1" /> Add stage</Button>
      </div>
    </div>
  );
}

// -------- Field Library --------
function FieldLibraryTab() {
  const fields = getAllFields();
  const [showNew, setShowNew] = useState(false);
  const [nId, setNId] = useState(""); const [nLabel, setNLabel] = useState(""); const [nType, setNType] = useState<FieldType>("text");
  const [nGroup, setNGroup] = useState("Custom"); const [nTarget, setNTarget] = useState<number | "">("");

  const addOne = () => {
    if (!nId || !nLabel) { toast.error("id + label required"); return; }
    try { addCustomField({ id: nId, label: nLabel, type: nType, group: nGroup, defaultTarget: nTarget === "" ? undefined : Number(nTarget) });
      toast.success("Field added"); setShowNew(false); setNId(""); setNLabel(""); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{fields.length} fields · admin-controlled palette used everywhere</div>
        <Button size="sm" onClick={() => setShowNew((v) => !v)}><Plus className="h-3 w-3 mr-1" /> New field</Button>
      </Card>
      {showNew && (
        <Card className="p-4 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div><Label className="text-xs">ID (snake_case)</Label><Input value={nId} onChange={(e) => setNId(e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())} /></div>
          <div><Label className="text-xs">Label</Label><Input value={nLabel} onChange={(e) => setNLabel(e.target.value)} /></div>
          <div><Label className="text-xs">Type</Label>
            <select className="w-full h-9 border rounded bg-background px-2 text-sm" value={nType} onChange={(e) => setNType(e.target.value as FieldType)}>
              {["text","longtext","number","currency","percent","kpiChip","time","date","energy","sentiment","risk","select","multiselect","checkbox"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><Label className="text-xs">Group</Label>
            <select className="w-full h-9 border rounded bg-background px-2 text-sm" value={nGroup} onChange={(e) => setNGroup(e.target.value)}>
              {FIELD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div><Label className="text-xs">Default target</Label><Input type="number" value={nTarget} onChange={(e) => setNTarget(e.target.value === "" ? "" : Number(e.target.value))} /></div>
          <div className="md:col-span-5 flex gap-2 justify-end"><Button size="sm" onClick={addOne}>Add</Button></div>
        </Card>
      )}
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr>
            <th className="text-left px-3 py-2">Label</th><th className="text-left px-3 py-2">ID</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Group</th><th className="text-right px-3 py-2">Target</th><th className="text-right px-3 py-2">Actions</th>
          </tr></thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-3 py-2 font-medium">{f.label}{f.custom && <Badge variant="outline" className="text-[9px] ml-1">custom</Badge>}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{f.id}</td>
                <td className="px-3 py-2 font-mono">{f.type}</td>
                <td className="px-3 py-2">{f.group}</td>
                <td className="px-3 py-2 text-right font-mono">{f.defaultTarget ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => archiveField(f.id)}><Trash2 className="h-3 w-3" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// -------- Assign per-user --------
function AssignTab() {
  const playbooks = getAllPlaybooks();
  return (
    <div className="space-y-2">
      {EMPLOYEES.map((emp) => {
        const assigned = getAssignment(emp.id) || defaultPlaybookForRole(emp.role);
        const ov = getOverride(emp.id);
        const pb = playbooks.find((p) => p.id === assigned);
        return <AssignRow key={emp.id} emp={emp} playbooks={playbooks} assigned={assigned} pb={pb} ov={ov} />;
      })}
    </div>
  );
}

function AssignRow({ emp, playbooks, assigned, pb, ov }: { emp: typeof EMPLOYEES[number]; playbooks: Playbook[]; assigned: string; pb?: Playbook; ov: ReturnType<typeof getOverride> }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/20 grid place-items-center text-xs font-semibold">{emp.name.charAt(0)}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{emp.name}</div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground">{emp.role} · {emp.team}</div>
        </div>
        <select className="h-8 rounded border bg-background px-2 text-xs" value={assigned} onChange={(e) => setAssignment(emp.id, e.target.value)}>
          {playbooks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "Overrides"}</Button>
      </div>
      {open && pb && (
        <div className="mt-3 pl-11 space-y-2">
          {pb.stages.map((stage) => {
            const hiddenStages = ov.hiddenStages || [];
            const hiddenFields = ov.hiddenFields?.[stage.id] || [];
            return (
              <div key={stage.id} className="border rounded p-2">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs flex items-center gap-1">
                    <input type="checkbox" checked={hiddenStages.includes(stage.id)} onChange={(e) => {
                      const next = { ...ov, hiddenStages: e.target.checked ? [...hiddenStages, stage.id] : hiddenStages.filter((x) => x !== stage.id) };
                      setOverride(emp.id, next);
                    }} /> Hide entire stage
                  </label>
                  <span className="text-xs font-medium">{stage.label}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {stage.fields.map((fid) => {
                    const off = hiddenFields.includes(fid);
                    return (
                      <button key={fid} type="button"
                        onClick={() => {
                          const next = {
                            ...ov,
                            hiddenFields: {
                              ...(ov.hiddenFields || {}),
                              [stage.id]: off ? hiddenFields.filter((x) => x !== fid) : [...hiddenFields, fid],
                            },
                          };
                          setOverride(emp.id, next);
                        }}
                        className={`px-2 py-0.5 rounded border text-[10px] ${off ? "line-through opacity-60" : "bg-primary/10 border-primary/30"}`}>
                        {fid}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <Button size="sm" variant="ghost" onClick={() => { clearOverride(emp.id); toast.success("Overrides cleared"); }}>Clear all overrides</Button>
        </div>
      )}
    </Card>
  );
}