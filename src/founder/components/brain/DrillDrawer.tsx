import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import type { BrainRow } from "@/founder/lib/brain/engine";
import { downloadCsv, rowsToCsv } from "@/founder/lib/brain/watchtower";


export interface Drill {
  title: string;
  subtitle?: string;
  rows: BrainRow[];
}

const waText = (r: BrainRow) =>
  `Hi ${r.title}, quick update from Gharpayy — ${r.nextAction}. Can we take this forward now?`;

export function DrillDrawer({ drill, onClose }: { drill: Drill | null; onClose: () => void }) {
  return (
    <Sheet open={!!drill} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="px-4">
          <SheetTitle className="text-base">{drill?.title}</SheetTitle>
          <SheetDescription>
            {drill?.subtitle ?? `${drill?.rows.length ?? 0} case${drill?.rows.length === 1 ? "" : "s"} — every row opens the customer, the evidence and the next action.`}
          </SheetDescription>
        </SheetHeader>

        {(drill?.rows.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => {
                const text = [
                  `GHARPAYY · ${drill!.title}`,
                  drill!.subtitle ?? "",
                  "",
                  ...drill!.rows.map((r) => `• ${r.title} — ${r.subtitle} · ${r.owner} · ${r.zone} → ${r.nextAction}`),
                ].filter(Boolean).join("\n");
                void navigator.clipboard?.writeText(text);
                toast.success("List copied for WhatsApp");
              }}>
              Copy list
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => downloadCsv(`${drill!.title.replace(/[^\w]+/g, "-").toLowerCase()}.csv`, rowsToCsv(drill!.rows))}>
              Download CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs"
              onClick={() => toast.success(`Assigned ${drill!.rows.length} cases`, { description: "Owners notified with the next action on each customer." })}>
              Assign all
            </Button>
          </div>
        )}


        <div className="px-4 pb-8 space-y-2">
          {(drill?.rows.length ?? 0) === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing here right now. This checkpoint is clean.
            </div>
          )}
          {drill?.rows.map((r, i) => (
            <div key={r.kind + r.id + i} className="rounded-md border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs">{r.owner}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.zone}</div>
                </div>
              </div>

              {(r.problem || r.impact || r.overdue) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.problem && <Badge variant="destructive" className="text-[10px]">{r.problem}</Badge>}
                  {r.overdue && <Badge variant="outline" className="text-[10px]">{r.overdue}</Badge>}
                  {r.impact && <Badge variant="secondary" className="text-[10px]">{r.impact}</Badge>}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge className="text-[10px]">Next: {r.nextAction}</Badge>
                {r.phone && (
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                    <a href={`tel:${r.phone}`}>Call</a>
                  </Button>
                )}
                {r.phone && (
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                    <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(waText(r))}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  </Button>
                )}
                {r.leadId && (
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                    <Link to="/myt/my-leads" search={{ lead: r.leadId } as never}>Open customer</Link>
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => toast.success(`Escalated · ${r.title}`, { description: `${r.owner} notified — ${r.nextAction}` })}>
                  Escalate
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => { void navigator.clipboard?.writeText(waText(r)); toast.success("Copied to WhatsApp"); }}>
                  Copy
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
