// Inline evidence strip — attach screenshots/proof to a pipeline stage.
// Renders at the top of every StagePanel card. Optional but flagged if missing.
import { useRef, useState } from "react";
import { usePipeline } from "@/lib/pipeline/store";
import { useIdentityStore } from "@/lib/lead-identity/store";
import type { PipelineStage } from "@/lib/pipeline/stage-config";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Camera, CheckCircle2, Paperclip, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  leadId: string;
  stage: PipelineStage;
  /** manager view: expose "Request proof" + verify buttons */
  adminMode?: boolean;
}

const MAX_BYTES = 4 * 1024 * 1024;

export function EvidenceStrip({ leadId, stage, adminMode }: Props) {
  const state = usePipeline((s) => s.states[leadId]);
  const attach = usePipeline((s) => s.attachEvidence);
  const request = usePipeline((s) => s.requestEvidence);
  const verify = usePipeline((s) => s.verifyEvidence);
  const user = useIdentityStore((s) => s.currentUser);
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  const gate = state?.history.find((g) => g.stage === stage);
  const evidence = gate?.evidence ?? [];
  const requested = gate?.evidenceRequested;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is over 4 MB — resize/screenshot smaller.`);
        continue;
      }
      const url = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      attach(
        leadId, stage,
        {
          url, fileName: file.name, mimeType: file.type,
          note: note.trim() || undefined,
          uploadedBy: user.name,
        },
        { userId: user.id, userName: user.name },
      );
    }
    setNote("");
    toast.success("Evidence attached");
  };

  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          <Paperclip className="h-3 w-3" />
          Evidence
          {evidence.length === 0 && !requested && (
            <span className="normal-case font-normal text-muted-foreground/70">
              · optional (flagged if missing)
            </span>
          )}
          {evidence.length > 0 && (
            <span className="normal-case font-normal text-success">
              · {evidence.length} attached
            </span>
          )}
          {requested && evidence.length === 0 && (
            <span className="normal-case font-semibold text-destructive inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              PROOF REQUESTED
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1">
                <Camera className="h-3 w-3" /> Attach
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Add a screenshot or note
              </div>
              <Input
                className="h-7 text-xs"
                placeholder="What are we proving? (WA sent, UPI ref…)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button size="sm" className="w-full h-7 text-[11px]" onClick={() => inputRef.current?.click()}>
                Pick image(s)
              </Button>
            </PopoverContent>
          </Popover>
          {adminMode && !requested && evidence.length === 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1 text-destructive">
                  <ShieldAlert className="h-3 w-3" /> Request
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2 space-y-2">
                <Input
                  className="h-7 text-xs"
                  placeholder="Why? (WA screenshot, UPI proof…)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button
                  size="sm" className="w-full h-7 text-[11px]"
                  onClick={() => {
                    request(leadId, stage, user.name, reason || "share proof", {
                      userId: user.id, userName: user.name,
                    });
                    setReason("");
                    toast.success("Proof requested");
                  }}
                >
                  Send request
                </Button>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {evidence.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {evidence.map((e) => (
            <div key={e.id} className={cn(
              "relative group rounded-md border overflow-hidden",
              e.verifiedAt ? "border-success/50" : "border-border",
            )}>
              {e.mimeType?.startsWith("image/") ? (
                <img src={e.url} alt={e.fileName ?? "evidence"}
                  className="h-14 w-14 object-cover" />
              ) : (
                <div className="h-14 w-14 flex items-center justify-center bg-muted text-[10px] text-muted-foreground p-1 text-center">
                  {e.fileName ?? "file"}
                </div>
              )}
              {e.verifiedAt && (
                <div className="absolute top-0.5 right-0.5 bg-success text-success-foreground rounded-full p-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                </div>
              )}
              {adminMode && !e.verifiedAt && (
                <button
                  type="button"
                  onClick={() => verify(leadId, stage, e.id, user.name)}
                  className="absolute inset-x-0 bottom-0 bg-primary/90 text-primary-foreground text-[9px] py-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  Verify
                </button>
              )}
              {e.note && (
                <div className="absolute inset-x-0 top-0 bg-black/60 text-white text-[8px] px-1 truncate">
                  {e.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {requested && (
        <div className="text-[10px] text-destructive/90 flex items-center gap-1">
          <X className="h-2.5 w-2.5" />
          Requested by {requested.by}
          {requested.reason ? ` — "${requested.reason}"` : ""}
        </div>
      )}
    </div>
  );
}
