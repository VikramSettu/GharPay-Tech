import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { XCircle } from "lucide-react";
import { CLOSE_PROBLEMS } from "@/lib/commitments/windows";
import { markBroken } from "@/lib/commitments/store";

interface Props {
  commitmentId: string;
  leadName: string;
  actorName: string;
  onDone?: () => void;
  trigger?: ReactNode;
}

/**
 * A promise can never break silently. If it did not close, the closer says in one
 * tap what problem came up — that list is what the daily review actually fixes.
 */
export function NotClosedDialog({ commitmentId, leadName, actorName, onDone, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string>("");
  const [note, setNote] = useState("");

  const submit = () => {
    if (!problem) {
      toast.error("Pick what stopped it", { description: "One tap — the board needs to know the problem, not the excuse." });
      return;
    }
    markBroken(commitmentId, actorName, problem, note);
    toast.warning(`Logged: ${leadName} did not close`, { description: problem });
    setProblem("");
    setNote("");
    setOpen(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px] text-destructive">
            <XCircle className="h-3 w-3" /> Did not close
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <XCircle className="h-4 w-4 text-destructive" /> Why did {leadName} not close?
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed">
            One tap on the real problem. This is the only thing the daily review can act on — a broken promise
            with no reason teaches the floor nothing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1">
          {CLOSE_PROBLEMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProblem(p)}
              className={cn(
                "rounded-full border px-2 py-1 text-[11px] transition",
                problem === p
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Optional — anything else worth knowing."
          className="text-[11px]"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" size="sm" className="gap-1" onClick={submit}>
            <XCircle className="h-3.5 w-3.5" /> Log it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
