import { useEffect, useState } from "react";
import { Copy, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard, waDeepLink, getWaTarget } from "@/founder/lib/execution/wa-format";
import { toast } from "sonner";

interface Props {
  text: string;
  label?: string;
}

export function WhatsAppCopyBlock({ text, label = "Copy to WhatsApp" }: Props) {
  const [copied, setCopied] = useState(false);
  const [target, setTarget] = useState("");
  // Reporting number lives in localStorage — read after hydration.
  useEffect(() => setTarget(getWaTarget()), []);
  if (!text) return null;

  const doCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      toast.success("Copied — paste in WhatsApp group");
      setTimeout(() => setCopied(false), 2200);
    } else {
      toast.error("Copy failed — long-press to select");
    }
  };

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 mt-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Auto WhatsApp message · {target ? "opens the reporting chat" : "ready to send"}
        </span>
        <div className="flex gap-1">
          <a
            href={waDeepLink(text, target)}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center h-7 px-2.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
          >
            <Send className="h-3 w-3 mr-1" /> Send on WhatsApp
          </a>
          <Button size="sm" variant="ghost" onClick={doCopy} className="h-7 text-xs">
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copied" : label}
          </Button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap text-xs font-mono bg-background/70 rounded p-2 border border-border max-h-56 overflow-auto">
{text}
      </pre>
    </div>
  );
}