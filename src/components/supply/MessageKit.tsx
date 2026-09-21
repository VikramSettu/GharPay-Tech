import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { PG } from "@/supply-hub/data/types";
import { messageKit } from "@/supply-hub/lib/messages-kit";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        toast.success("Copied — paste it straight to the customer");
        setTimeout(() => setDone(false), 1600);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted",
        done && "border-emerald-400/50 text-emerald-400",
        className,
      )}
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {done ? "Copied" : label}
    </button>
  );
}

export function MessageKitPanel({ pg, compact }: { pg: PG; compact?: boolean }) {
  const kit = messageKit(pg);
  const all = kit.map((m) => m.text).join("\n\n———\n\n");
  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">Copy-paste kit</div>
          <h3 className="font-semibold text-sm">Send exactly as written — no rewording</h3>
        </div>
        <div className="flex gap-2">
          <CopyButton text={all} label="Copy all" />
          <a
            href={`https://wa.me/?text=${encodeURIComponent(all)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground hover:opacity-90"
          >
            <MessageCircle className="h-3 w-3" /> WhatsApp
          </a>
        </div>
      </header>
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
        {kit.map((m) => (
          <div key={m.kind} className="rounded-md border border-border/70 bg-background p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs font-medium">
                {m.label}{" "}
                <span
                  className={cn(
                    "ml-1 rounded px-1 py-0.5 text-[9px] uppercase tracking-wider",
                    m.verbatim ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400",
                  )}
                >
                  {m.verbatim ? "Sheet verbatim" : "Auto-built"}
                </span>
              </div>
              <CopyButton text={m.text} />
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground">
              {m.text}
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}
