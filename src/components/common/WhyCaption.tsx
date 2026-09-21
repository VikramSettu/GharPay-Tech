// Always-visible micro-caption under a control.
// Answers the three user-mandated questions for every option in the app:
//   • why does this option exist?
//   • where does the data go / who benefits? (Admin, TCM, Client)
// Dense, non-blocking, keyboard-friendly. Never removes existing UI.
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

export interface WhyCaptionProps {
  /** One-line reason this control exists (why is it there at all). */
  why: string;
  /** What the admin/manager gets when this is filled. */
  admin?: string;
  /** What the TCM (filler) gets when this is filled. */
  tcm?: string;
  /** What the client (lead) gets when this is filled. */
  client?: string;
  className?: string;
  /** Compact = single-line, no icon. Default = wraps with info icon. */
  compact?: boolean;
}

const TONES = {
  admin:  "bg-primary/10 text-primary border-primary/30",
  tcm:    "bg-accent/10 text-accent border-accent/30",
  client: "bg-success/10 text-success border-success/30",
} as const;

const LABELS = { admin: "ADMIN", tcm: "TCM", client: "CLIENT" } as const;

export function WhyCaption({ why, admin, tcm, client, className, compact }: WhyCaptionProps) {
  const entries: Array<{ key: keyof typeof TONES; tip: string }> = [];
  if (admin)  entries.push({ key: "admin",  tip: admin  });
  if (tcm)    entries.push({ key: "tcm",    tip: tcm    });
  if (client) entries.push({ key: "client", tip: client });

  return (
    <p
      className={cn(
        "mt-0.5 text-[10px] leading-snug text-muted-foreground/80 flex items-start gap-1",
        compact && "mt-0 text-[9.5px]",
        className,
      )}
    >
      {!compact && <Info className="h-2.5 w-2.5 mt-[2px] shrink-0 opacity-60" aria-hidden />}
      <span className="flex-1">
        <span>{why}</span>
        {entries.length > 0 && (
          <span className="ml-1 inline-flex flex-wrap gap-0.5 align-middle">
            {entries.map((e) => (
              <span
                key={e.key}
                title={`${LABELS[e.key]} · ${e.tip}`}
                className={cn(
                  "text-[8px] font-semibold px-1 rounded border leading-[1.4] cursor-help",
                  TONES[e.key],
                )}
              >
                {LABELS[e.key]}
              </span>
            ))}
          </span>
        )}
      </span>
    </p>
  );
}

/** Section-level "why this section exists" banner. */
export function WhySectionBanner({
  title, why, admin, tcm, client,
}: { title: string } & Omit<WhyCaptionProps, "className" | "compact">) {
  return (
    <div className="rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 px-2 py-1.5 space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        Why "{title}" exists
      </div>
      <WhyCaption why={why} admin={admin} tcm={tcm} client={client} compact />
    </div>
  );
}
