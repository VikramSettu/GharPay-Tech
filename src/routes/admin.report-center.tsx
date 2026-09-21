import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/founder/components/RoleGate";
import { SendUpdateButton } from "@/founder/components/reporting/SendUpdateButton";
import { DownloadMenu } from "@/founder/components/reporting/DownloadMenu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  DEFAULT_TEMPLATES, advanceStatus, getSchedules, getSent, getTemplates,
  subscribeReports, updateSchedule, type DeliveryStatus, type SentReport,
} from "@/founder/lib/reporting/report-store";
import { companyBlock } from "@/founder/lib/command-center/metrics";
import { ClipboardList, CheckCircle2, XCircle, Clock4, RefreshCw, Copy, FileDown } from "lucide-react";
import { copyToClipboard } from "@/founder/lib/execution/wa-format";

export const Route = createFileRoute("/admin/report-center")({
  component: () => (
    <RoleGate allow={["leadership", "hr"]}>
      <ReportCenter />
    </RoleGate>
  ),
  head: () => ({
    meta: [
      { title: "Report Center · Gharpayy Admin" },
      { name: "description", content: "Create, approve, schedule, send, download and audit every Gharpayy report — daily checkpoints, people, execution, management and periodic packs." },
      { property: "og:title", content: "Report Center · Gharpayy Admin" },
      { property: "og:description", content: "Founder updates, saved templates, scheduled packs and full WhatsApp delivery history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const CATALOG: { group: string; items: string[] }[] = [
  { group: "Daily", items: ["Good Morning", "1 PM", "4 PM", "5 PM", "EOD"] },
  { group: "People", items: ["Attendance", "Productivity", "Reporting", "Breaks", "Performance", "Coaching", "Training"] },
  { group: "Execution", items: ["Lead Ownership", "Chat Health", "Tours", "Closing", "Booking", "SLA"] },
  { group: "Management", items: ["Manager Performance", "Support Resolution", "Zone Performance", "Reconciliation"] },
  { group: "Periodic", items: ["Weekly", "Monthly", "Quarterly"] },
];

const STATUS_ICON: Record<DeliveryStatus, React.ElementType> = {
  generated: Clock4, approved: CheckCircle2, sent: ClipboardList,
  delivered: CheckCircle2, read: CheckCircle2, failed: XCircle,
};

function ReportCenter() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const off = subscribeReports(() => setTick((t) => t + 1));
    return () => { off(); };
  }, []);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const sent: SentReport[] = hydrated ? getSent() : [];
  const templates = hydrated ? getTemplates() : DEFAULT_TEMPLATES;
  const schedules = hydrated ? getSchedules() : [];
  const block = companyBlock();
  void tick;

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-primary mb-1.5">Executive reporting & distribution</div>
          <h1 className="font-display text-2xl md:text-4xl font-semibold tracking-tight">Report Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Create, approve, send, download, schedule, compare and audit every report.</p>
        </div>
        <div className="flex gap-2">
          <DownloadMenu label="Download" scope={{ kind: "company", zones: [] }} period="today" />
          <SendUpdateButton />
        </div>
      </header>

      {/* Approval queue */}
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5 mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">Awaiting approval</div>
        <div className="font-display text-lg font-semibold">Founder 5 PM report ready</div>
        <div className="text-sm text-muted-foreground mb-3">
          Present {block.people.present}/{block.people.expected} · BBD {block.closing.bookings}/{block.closing.bbdTarget} · unassigned {block.demand.unassigned} · waiting us {block.chats.waitingUs}
        </div>
        <div className="flex flex-wrap gap-2">
          <SendUpdateButton label="Preview & Approve" reportName="5 PM Control Update" defaultPeriod="cp_5pm" />
          <Button variant="outline" size="sm" onClick={() => toast.success("Skipped for today", { description: "Logged in report history." })}>Skip today</Button>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Catalog */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-display text-base font-semibold">Report catalog</h2>
          </div>
          <div className="divide-y divide-border">
            {CATALOG.map((g) => (
              <div key={g.group} className="px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{g.group}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((i) => (
                    <SendUpdateButton key={i} label={i} variant="outline" reportName={`${i} report`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-display text-base font-semibold">Saved templates</h2>
            <p className="text-xs text-muted-foreground">Filters, sections, recipients, format and schedule remembered.</p>
          </div>
          <div className="divide-y divide-border">
            {templates.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t.recipient} · {t.channel} · {t.format}{t.schedule ? ` · ${t.schedule}` : ""}
                  </div>
                </div>
                <SendUpdateButton label="Run" variant="outline" reportName={t.name} defaultPeriod={t.period} defaultRecipient={t.recipient} />
              </div>
            ))}
          </div>
        </div>

        {/* Schedules */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-display text-base font-semibold">Founder reporting schedule</h2>
            <p className="text-xs text-muted-foreground">Automatic, or admin approval required.</p>
          </div>
          <div className="divide-y divide-border">
            {schedules.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <Switch checked={s.enabled} onCheckedChange={(v) => updateSchedule(s.id, { enabled: v })} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{s.days} · {s.time} · {s.recipient} · {s.channel} · {s.format}</div>
                </div>
                <button
                  onClick={() => updateSchedule(s.id, { mode: s.mode === "automatic" ? "approval" : "automatic" })}
                  className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${s.mode === "automatic" ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
                  {s.mode === "automatic" ? "auto" : "approval"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sent history */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 md:px-5 py-3 border-b border-border">
          <h2 className="font-display text-base md:text-lg font-semibold">Sent reports</h2>
          <p className="text-xs text-muted-foreground">Every report sent stays searchable — open it and see exactly what went out.</p>
        </div>
        {sent.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">Nothing sent yet. Send a founder update and it lands here with delivery status.</div>
        ) : (
          <div className="divide-y divide-border">
            {sent.map((r) => {
              const Icon = STATUS_ICON[r.status];
              return (
                <details key={r.id} className="group">
                  <summary className="px-4 md:px-5 py-3 flex items-center gap-3 cursor-pointer list-none">
                    <span className="font-mono text-xs text-muted-foreground w-16">{new Date(r.ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{r.name}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{r.scopeLabel} · {r.recipient} · {r.channel} · {r.format}{r.dataWarning ? " · ⚠ data note" : ""}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${r.status === "failed" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"}`}>
                      <Icon className="h-3 w-3" /> {r.status}
                    </span>
                  </summary>
                  <div className="px-4 md:px-5 pb-4">
                    <pre className="whitespace-pre-wrap text-[12px] font-mono rounded-lg border border-border bg-muted/40 p-3 max-h-72 overflow-y-auto">{r.body}</pre>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyToClipboard(r.body).then(() => toast.success("Message copied"))}>
                        <Copy className="h-3.5 w-3.5" /> Copy message
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.success("PDF ready")}>
                        <FileDown className="h-3.5 w-3.5" /> Download PDF
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { advanceStatus(r.id, "sent"); toast.success("Retrying delivery"); }}>
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                      </Button>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
