import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertTriangle, Ban, CheckCircle2, HelpCircle, Search, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CloseCommitButton } from "@/components/commitments/CloseCommitButton";
import { LEAD_LABELS, LABEL_BY_ID, LABEL_GROUPS, CORE_LABEL_IDS, labelsInGroup, SEVERITY_LABEL, SEVERITY_STYLE, type LeadLabelDef } from "@/lib/labels/catalog";
import {
  applyLabel, isOverdue, openLabelsForLead, removeLabel, resolveLabel, useLeadLabels,
} from "@/lib/labels/store";

interface Props {
  leadId: string;
  leadName: string;
  leadPhone: string;
  actorName: string;
  /** compact = inline on a lead card; full = console row with the manual expanded. */
  variant?: "compact" | "full";
}

/** The label strip: read the open instructions on a lead, and add a new one. */
export function LeadLabelStrip({ leadId, leadName, leadPhone, actorName, variant = "compact" }: Props) {
  const all = useLeadLabels();
  const open = openLabelsForLead(all, leadId);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {open.map((l) => {
        const def = LABEL_BY_ID[l.labelId];
        if (!def) return null;
        const overdue = isOverdue(l);
        return (
          <Popover key={l.id}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition hover:opacity-80",
                  SEVERITY_STYLE[def.severity],
                  overdue && "ring-1 ring-destructive",
                )}
              >
                <Tag className="h-2.5 w-2.5" />
                {def.short}
                {overdue && <AlertTriangle className="h-2.5 w-2.5" />}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[380px] max-h-[70vh] overflow-y-auto p-0">
              <LabelManual
                def={def}
                note={l.note}
                appliedBy={l.appliedBy}
                dueAt={l.dueAt}
                onDone={(text) => {
                  resolveLabel(l.id, actorName, text);
                  toast.success(`Marked done — ${def.short}`, { description: `${leadName}: the reviewer can now verify it.` });
                }}
                onRemove={() => {
                  removeLabel(l.id);
                  toast.warning("Label removed from this lead");
                }}
              />
            </PopoverContent>
          </Popover>
        );
      })}

      <AddLabelButton
        leadId={leadId}
        leadName={leadName}
        leadPhone={leadPhone}
        actorName={actorName}
        variant={variant}
      />

      {/* The promise lives beside the instruction — a label without a close date is a wish. */}
      <CloseCommitButton
        leadId={leadId}
        leadName={leadName}
        leadPhone={leadPhone}
        actorName={actorName}
        size={variant === "full" ? "sm" : "xs"}
      />
    </div>
  );
}

function AddLabelButton({ leadId, leadName, leadPhone, actorName, variant }: Props) {
  const [openState, setOpenState] = useState(false);
  const [picked, setPicked] = useState<string>("");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const def = picked ? LABEL_BY_ID[picked] : null;

  const term = q.trim().toLowerCase();
  const matches = (l: (typeof LEAD_LABELS)[number]) =>
    !term ||
    l.label.toLowerCase().includes(term) ||
    l.short.toLowerCase().includes(term) ||
    l.why.toLowerCase().includes(term) ||
    (l.quickNotes ?? []).some((n) => n.toLowerCase().includes(term));

  const submit = () => {
    if (!picked) return;
    applyLabel({ leadId, leadName, leadPhone, labelId: picked, note, appliedBy: actorName });
    toast.success(`Labelled: ${LABEL_BY_ID[picked].short}`, {
      description: `${leadName} — owner must action within ${LABEL_BY_ID[picked].slaHours}h.`,
    });
    setPicked(""); setNote(""); setQ(""); setOpenState(false);
  };

  const Row = ({ l }: { l: (typeof LEAD_LABELS)[number] }) => (
    <button
      type="button"
      onClick={() => { setPicked(l.id === picked ? "" : l.id); setNote(""); }}
      className={cn(
        "w-full rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition",
        picked === l.id ? SEVERITY_STYLE[l.severity] : "border-border hover:bg-muted",
      )}
    >
      <span className="font-semibold">{l.label}</span>
      <span className="ml-1 opacity-70">· {SEVERITY_LABEL[l.severity]} · {l.slaHours}h</span>
    </button>
  );

  return (
    <Popover open={openState} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-6 gap-1 rounded-full px-2 text-[10px]", variant === "full" && "h-7 text-[11px]")}>
          <Tag className="h-3 w-3" /> Label this lead
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] max-h-[78vh] overflow-y-auto p-3">
        <p className="text-xs font-semibold">Tell the owner exactly what to do</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {LEAD_LABELS.length} instructions in {LABEL_GROUPS.length} groups. Search the scenario you saw —
          every label carries its own why / how / don't / risk / if-else manual.
        </p>

        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="h-8 pl-8 text-xs"
            placeholder="owner not seeing follow-ups, no budget, tour no-show…" />
        </div>

        {term ? (
          <div className="mt-2 space-y-1">
            {LEAD_LABELS.filter(matches).slice(0, 25).map((l) => <Row key={l.id} l={l} />)}
            {LEAD_LABELS.filter(matches).length === 0 && (
              <p className="py-4 text-center text-[11px] text-muted-foreground">
                No label for that yet. Use the closest one and write the specifics in the note.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Most used</p>
            <div className="mt-1 space-y-1">
              {CORE_LABEL_IDS.map((id) => <Row key={id} l={LABEL_BY_ID[id]} />)}
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">All scenarios</p>
            <Accordion type="multiple" value={openGroups} onValueChange={setOpenGroups} className="w-full">
              {LABEL_GROUPS.map((g) => {
                const inGroup = labelsInGroup(g.id);
                if (inGroup.length === 0) return null;
                return (
                  <AccordionItem key={g.id} value={g.id} className="border-b-0">
                    <AccordionTrigger className="py-1.5 text-[11px] font-semibold hover:no-underline">
                      <span className="text-left">
                        {g.title}
                        <span className="ml-1 font-normal text-muted-foreground">({inGroup.length})</span>
                        <span className="block text-[10px] font-normal text-muted-foreground">{g.blurb}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-2">
                      {inGroup.map((l) => <Row key={l.id} l={l} />)}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        )}

        {def && (
          <div className="mt-3 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
            {(def.quickNotes ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {def.quickNotes!.map((n) => (
                  <button key={n} type="button" onClick={() => setNote(n)}
                    className="rounded-full border border-primary/40 bg-background px-2 py-0.5 text-[10px] hover:bg-muted">
                    {n}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                def.id === "follow-up-like-this"
                  ? "Write the model follow-up you want copied — the actual sentences."
                  : "Name the specific gap you saw. One word helps nobody."
              }
              className="min-h-[64px] bg-background text-xs"
            />
            <Button size="sm" className="w-full" onClick={submit}>
              Apply label · owner has {def.slaHours}h
            </Button>
            <div className="rounded-lg border border-dashed bg-background p-2">
              <LabelManual def={def} compactHeader />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}


/** The full operating manual for a label — why, how, don'ts, risks, if/else. */
export function LabelManual({
  def, note, appliedBy, dueAt, onDone, onRemove, compactHeader,
}: {
  def: LeadLabelDef;
  note?: string;
  appliedBy?: string;
  dueAt?: string;
  onDone?: (text: string) => void;
  onRemove?: () => void;
  compactHeader?: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className={cn("space-y-2", !compactHeader && "p-3")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">{def.label}</p>
          <p className="text-[10px] text-muted-foreground">
            {SEVERITY_LABEL[def.severity]} · action window {def.slaHours}h
            {appliedBy ? ` · set by ${appliedBy}` : ""}
            {dueAt ? ` · due ${new Date(dueAt).toLocaleString()}` : ""}
          </p>
        </div>
        {onRemove && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onRemove} aria-label="Remove label">
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {note && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-[11px]">
          <span className="font-semibold">Reviewer's instruction: </span>{note}
        </div>
      )}

      <Accordion type="multiple" className="w-full">
        <Section value="why" icon={<HelpCircle className="h-3 w-3" />} title="Why this label exists">
          <p>{def.why}</p>
        </Section>
        <Section value="how" icon={<CheckCircle2 className="h-3 w-3" />} title="How to execute it, step by step">
          <ol className="list-decimal space-y-1 pl-4">{def.howToExecute.map((s) => <li key={s}>{s}</li>)}</ol>
        </Section>
        <Section value="not" icon={<Ban className="h-3 w-3" />} title="What NOT to do">
          <ul className="list-disc space-y-1 pl-4">{def.whatNotToDo.map((s) => <li key={s}>{s}</li>)}</ul>
        </Section>
        <Section value="risk" icon={<AlertTriangle className="h-3 w-3" />} title="What problems can occur">
          <ul className="list-disc space-y-1 pl-4">{def.problemsThatCanOccur.map((s) => <li key={s}>{s}</li>)}</ul>
        </Section>
        <Section value="branch" icon={<Tag className="h-3 w-3" />} title="If / else — decide without guessing">
          <ul className="space-y-1.5">
            {def.branches.map((b) => (
              <li key={b.condition} className="rounded border border-border p-1.5">
                <span className="font-semibold">IF </span>{b.condition}
                <span className="font-semibold"> → THEN </span>{b.then}
              </li>
            ))}
          </ul>
        </Section>
      </Accordion>

      <p className="rounded-lg bg-muted p-2 text-[11px]">
        <span className="font-semibold">Counted as done when: </span>{def.doneWhen}
      </p>

      {onDone && (
        <div className="space-y-1.5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you actually do? The reviewer verifies this against the chat."
            className="min-h-[56px] text-xs"
          />
          <Button size="sm" className="w-full" disabled={!text.trim()} onClick={() => onDone(text.trim())}>
            Mark this instruction done
          </Button>
        </div>
      )}
    </div>
  );
}

function Section({ value, icon, title, children }: { value: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={value} className="border-b-0">
      <AccordionTrigger className="py-1.5 text-[11px] font-semibold hover:no-underline">
        <span className="flex items-center gap-1.5">{icon}{title}</span>
      </AccordionTrigger>
      <AccordionContent className="pb-2 text-[11px] leading-relaxed text-muted-foreground">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
