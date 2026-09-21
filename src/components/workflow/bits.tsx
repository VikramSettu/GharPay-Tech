import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Health, LeadMotion, Severity } from "@/lib/workflow/engine";
import { fmtDur } from "@/lib/workflow/engine";

export function KpiTile({
  label, value, meaning, tone = "default", to, onClick, big,
}: {
  label: string; value: ReactNode; meaning?: string;
  tone?: "default" | "good" | "warn" | "bad";
  to?: string; onClick?: () => void; big?: boolean;
}) {
  const toneCls = {
    default: "border-border",
    good: "border-emerald-500/40 bg-emerald-500/5",
    warn: "border-amber-500/40 bg-amber-500/5",
    bad: "border-destructive/40 bg-destructive/5",
  }[tone];
  const body = (
    <div className={cn("rounded-xl border p-3 h-full transition-colors hover:bg-muted/40", toneCls)}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-semibold tabular-nums", big ? "text-3xl" : "text-xl")}>{value}</div>
      {meaning && <div className="text-[11px] text-muted-foreground mt-0.5">{meaning}</div>}
    </div>
  );
  if (to) return <Link to={to} className="block">{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="block w-full text-left">{body}</button>;
  return body;
}

export function HealthPill({ health }: { health: Health }) {
  const map: Record<Health, { label: string; cls: string }> = {
    healthy: { label: "Healthy", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    "due-soon": { label: "Due soon", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    "action-required": { label: "Action required", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    blocked: { label: "Blocked · supply", cls: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  };
  const m = map[health];
  return <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium", m.cls)}>{m.label}</span>;
}

export function SeverityChip({ severity }: { severity: Severity }) {
  const cls = severity === "P0"
    ? "bg-destructive text-destructive-foreground"
    : severity === "P1" ? "bg-amber-500 text-black" : "bg-muted text-muted-foreground";
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", cls)}>{severity}</span>;
}

export function MotionLine({ m }: { m: LeadMotion }) {
  return (
    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
      <span>{m.lead.area || "No area"}</span>
      <span>{m.lead.phoneRaw || m.lead.phoneE164}</span>
      <span>Owner: {m.ownerName}</span>
      <span>Age {fmtDur(m.ageMs)}</span>
      {m.action && <span>Next: {m.action.label}</span>}
    </div>
  );
}

export function ProgressRow({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const tone = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{value} / {target}</span>
      </div>
      <div className="h-1.5 rounded bg-muted overflow-hidden">
        <div className={cn("h-full rounded", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyQueue({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground max-w-md mx-auto">{children}</div>
    </div>
  );
}

export function CountBadge({ n }: { n: number }) {
  return <Badge variant="secondary" className="font-mono">{n}</Badge>;
}
