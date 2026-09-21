import { useState } from "react";
import { Copy, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { whatsappLink, copyToClipboard } from "@/myt/lib/messaging-utils";

export interface VisitSyncMessage {
  key: string;
  label: string;
  /** who it goes to — customer gets a wa.me link, group gets copy-to-paste */
  to: "customer" | "owner_group";
  text: string;
}

/**
 * The three-message loop around every visit (customer confirm, owner group
 * readiness, owner group visit-done) plus the pre-booking availability check.
 * Copy for the PG owner group, one tap send for the customer.
 */
export function VisitSyncKit({
  messages,
  phone,
  hint,
}: {
  messages: VisitSyncMessage[];
  phone: string;
  hint?: string;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(messages[0]?.key ?? null);

  if (!messages.length) return null;

  const textFor = (m: VisitSyncMessage) => drafts[m.key] ?? m.text;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Visit &amp; room sync — send all of these
      </p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}

      {messages.map((m) => {
        const isOpen = open === m.key;
        return (
          <div key={m.key} className="rounded-md border border-border bg-background">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : m.key)}
              className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                {done[m.key] ? <Check className="h-3 w-3 text-primary" /> : null}
                {m.label}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.to === "customer" ? "customer" : "PG owner group"}
              </span>
            </button>

            {isOpen ? (
              <div className="space-y-1.5 border-t border-border p-2">
                <Textarea
                  value={textFor(m)}
                  onChange={(e) => setDrafts((d) => ({ ...d, [m.key]: e.target.value }))}
                  rows={m.text.split("\n").length + 1}
                  className="text-[12px] leading-snug"
                />
                <div className="flex gap-1.5">
                  <Action
                    onClick={async () => {
                      const ok = await copyToClipboard(textFor(m));
                      toast[ok ? "success" : "error"](ok ? "Message copied" : "Copy failed");
                      if (ok) setDone((d) => ({ ...d, [m.key]: true }));
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Copy
                  </Action>
                  {m.to === "customer" && phone ? (
                    <Action
                      primary
                      onClick={() => {
                        window.open(whatsappLink(phone, textFor(m)), "_blank");
                        setDone((d) => ({ ...d, [m.key]: true }));
                      }}
                    >
                      <Send className="mr-1 h-3 w-3" /> Send on WhatsApp
                    </Action>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Action({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
        primary
          ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
          : "border-border text-muted-foreground hover:border-foreground/30",
      )}
    >
      {children}
    </button>
  );
}
