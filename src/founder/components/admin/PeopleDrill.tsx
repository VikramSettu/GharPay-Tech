// Generic "who is behind this number" dialog.
// Any stat tile, checkpoint card or zone card can open it with a list of
// people and the one line that explains why each person is in the list.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/founder/components/Avatar";
import { Copy, ChevronRight } from "lucide-react";
import type { PersonDay } from "@/founder/lib/admin/admin-digest";

export interface DrillEntry {
  row: PersonDay;
  reason: string;
  right?: string;
  tone?: "good" | "warn" | "bad";
}

export function PeopleDrill({
  open, onClose, title, subtitle, entries, onPick, onCopy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  entries: DrillEntry[];
  onPick: (row: PersonDay) => void;
  onCopy?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left">
            <div className="font-display text-lg font-semibold">{title}</div>
            {subtitle && <div className="text-xs text-muted-foreground font-normal mt-0.5">{subtitle}</div>}
          </DialogTitle>
        </DialogHeader>

        {onCopy && (
          <div>
            <Button variant="outline" size="sm" onClick={onCopy}>
              <Copy className="w-4 h-4 mr-1.5" /> Copy this list
            </Button>
          </div>
        )}

        {entries.length === 0 && (
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-8 text-sm text-muted-foreground text-center">
            Nobody in this list right now.
          </div>
        )}

        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {entries.map((e) => (
            <button
              key={e.row.emp.id}
              onClick={() => onPick(e.row)}
              className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-secondary transition-colors"
            >
              <Avatar id={e.row.emp.id} name={e.row.emp.name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{e.row.emp.name}</div>
                <div className="text-xs text-muted-foreground truncate">{e.reason}</div>
              </div>
              {e.right && (
                <span className={`font-mono text-xs ${e.tone === "bad" ? "text-destructive" : e.tone === "warn" ? "text-warning" : e.tone === "good" ? "text-success" : "text-muted-foreground"}`}>
                  {e.right}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Tap any name to open the full day timeline, the last 14 days and the admin actions.</p>
      </DialogContent>
    </Dialog>
  );
}
