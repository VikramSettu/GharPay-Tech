import { useState } from "react";
import { ClipboardList, NotebookPen, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Lead } from "@/lib/types";
import type { CallNumber } from "@/lib/journey-gates";
import { CallScriptCapture, useScriptProgress } from "./CallScriptCapture";

export function LeadTalkTrack({
  lead,
  call,
  me,
  onSaveNote,
  onCapture,
  onLogActivity,
}: {
  lead: Lead;
  call: CallNumber;
  me: string;
  /** Legacy: capture now writes to the store inside CallScriptCapture. */
  onSaveCore?: (field: "budget" | "moveInDate" | "preferredArea", value: string) => void;
  onSaveNote: (text: string) => void;
  onCapture?: (label: string, value: string, call: CallNumber) => void;
  /** Close the call out through the full Log activity flow. */
  onLogActivity?: (call: CallNumber) => void;
}) {
  const { captured, total } = useScriptProgress(lead, call);

  return (
    <section className="space-y-2 px-5 pb-3" aria-label="Call script">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Quote className="h-3 w-3" /> Say it like this · C{call}
        <span className="normal-case tracking-normal text-muted-foreground/70">read top to bottom</span>
        <span className="ml-auto tabular-nums">{captured}/{total} captured</span>
      </div>

      <CallScriptCapture lead={lead} call={call} me={me} onCapture={onCapture} />

      <ExtraNotes call={call} onSave={onSaveNote} />

      {onLogActivity && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-full text-[11px]"
          onClick={() => onLogActivity(call)}
        >
          <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
          Close C{call} · log activity &amp; next step
        </Button>
      )}
    </section>
  );
}

function ExtraNotes({ call, onSave }: { call: CallNumber; onSave: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="rounded-md border border-dashed border-border bg-background px-2.5 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <NotebookPen className="h-3 w-3" /> Extra notes from this call
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Anything else they told you — roommate joining, parents deciding, wants gym nearby…"
        rows={2}
        className="text-xs"
      />
      <div className="mt-1 flex justify-end">
        <Button
          size="sm"
          className="h-7 px-2 text-[10px]"
          disabled={!text.trim()}
          onClick={() => {
            onSave(`[C${call}] ${text.trim()}`);
            setText("");
          }}
        >
          Add to C{call} notes
        </Button>
      </div>
    </div>
  );
}
