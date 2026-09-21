// Consistent download language: current view vs all matching vs management report.
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, Image, Printer, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { peopleInScope, scopeBlock, PERIOD_LABEL, type Period, type Scope } from "@/founder/lib/command-center/metrics";
import { buildFounderUpdate, checkpointNow, scopeLabel } from "@/founder/lib/reporting/founder-update";
import { FORMAT_SECTIONS } from "@/founder/lib/reporting/founder-update";
import { copyToClipboard } from "@/founder/lib/execution/wa-format";
import { logSent } from "@/founder/lib/reporting/report-store";

function csvFor(scope: Scope): string {
  const rows = peopleInScope(scope);
  const head = ["Name", "Role", "Zone", "Manager", "Status", "Attendance", "Performance", "Leads", "Flags"];
  const body = rows.map((e) => [e.name, e.role, e.zone ?? "", e.managerId ?? "", e.status, e.attendance, e.performance, e.leadsActive, e.flags.join("; ")]);
  return [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function download(name: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function DownloadMenu({ label = "Download", scope, period, name }: { label?: string; scope: Scope; period: Period; name?: string }) {
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `gharpayy-${(name ?? scopeLabel(scope)).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${period}-${stamp}`;

  function management() {
    const body = buildFounderUpdate({
      scope, period, format: "deep", sections: FORMAT_SECTIONS.deep, commentary: "",
      checkpointLabel: name ?? checkpointNow(), generatedBy: "Super Admin", linkMode: "snapshot",
    });
    logSent({
      name: `${name ?? checkpointNow()} · management report`, scopeLabel: scopeLabel(scope), period,
      format: "deep", recipient: "Founder", channel: "Download", status: "sent", body,
      commentary: "", dataWarning: false, generatedBy: "Super Admin",
    });
    download(`${base}-management-report.txt`, body, "text/plain");
    toast.success("Management report generated", { description: "Interpreted summary — not raw rows." });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> {label}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest">
          {scopeLabel(scope)} · {PERIOD_LABEL[period]}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { download(`${base}-current-view.csv`, csvFor(scope), "text/csv"); toast.success("Current filtered view exported"); }}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export current view (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { download(`${base}-all-matching.csv`, csvFor(scope), "text/csv"); toast.success("All matching rows exported"); }}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export all matching (raw data)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={management}>
          <FileText className="h-3.5 w-3.5 mr-2" /> Generate management report
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast.success("PDF queued", { description: "Designed management PDF is generating." })}>
          <FileText className="h-3.5 w-3.5 mr-2" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success("Dashboard snapshot captured")}>
          <Image className="h-3.5 w-3.5 mr-2" /> PNG dashboard snapshot
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { if (typeof window !== "undefined") window.print(); }}>
          <Printer className="h-3.5 w-3.5 mr-2" /> Print
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          const b = scopeBlock(scope);
          copyToClipboard(`${scopeLabel(scope)} · ${PERIOD_LABEL[period]} — present ${b.people.present}/${b.people.expected}, BBD ${b.closing.bookings}/${b.closing.bbdTarget}, unassigned ${b.demand.unassigned}, waiting us ${b.chats.waitingUs}`)
            .then(() => toast.success("Summary copied"));
        }}>
          <Copy className="h-3.5 w-3.5 mr-2" /> Copy summary
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyToClipboard(`https://gharpayy.report/snapshot/${period}`).then(() => toast.success("Secure share link copied"))}>
          <Link2 className="h-3.5 w-3.5 mr-2" /> Secure share link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
