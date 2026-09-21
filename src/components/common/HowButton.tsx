import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HowProps {
  title: string;
  /** One-line business reason. */
  why: string;
  howToExecute?: string[];
  whatNotToDo?: string[];
  problemsThatCanOccur?: string[];
  branches?: { condition: string; then: string }[];
  doneWhen?: string;
  children?: ReactNode;
  className?: string;
  /** Show the word "How" next to the icon. */
  withText?: boolean;
}

function Block({ title, items, tone }: { title: string; items?: string[]; tone?: string }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1">
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide", tone ?? "text-muted-foreground")}>{title}</p>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-foreground/90">
            <span className="text-muted-foreground">{i + 1}.</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The universal "How" affordance — every button in the app can explain itself. */
export function HowButton({
  title, why, howToExecute, whatNotToDo, problemsThatCanOccur, branches, doneWhen, children, className, withText,
}: HowProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`How: ${title}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
            className,
          )}
        >
          <HelpCircle className="h-3 w-3" />
          {withText && "How"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[380px] max-h-[70vh] space-y-3 overflow-y-auto">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{why}</p>
        </div>
        <Block title="How to execute" items={howToExecute} />
        <Block title="What NOT to do" items={whatNotToDo} tone="text-destructive" />
        <Block title="Problems that can occur" items={problemsThatCanOccur} tone="text-amber-600 dark:text-amber-400" />
        {!!branches?.length && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">If / else</p>
            {branches.map((b, i) => (
              <p key={i} className="rounded-md bg-muted/60 p-1.5 text-[11px] leading-relaxed">
                <span className="font-medium">If {b.condition}</span> → {b.then}
              </p>
            ))}
          </div>
        )}
        {doneWhen && (
          <p className="rounded-md border border-primary/30 bg-primary/5 p-1.5 text-[11px] text-foreground">
            <span className="font-semibold">Done when:</span> {doneWhen}
          </p>
        )}
        {children}
      </PopoverContent>
    </Popover>
  );
}
