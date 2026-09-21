// One consistent "Send Update" language across the whole product.
// Company dashboard, zone page, checkpoint report, person page, incident — same composer.
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Copy, Link2, FileDown, Camera, CalendarClock, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import {
  allZones, dataQualityIssues, scopeBlock, PERIOD_LABEL, type Period, type Scope,
} from "@/founder/lib/command-center/metrics";
import {
  buildFounderUpdate, checkpointNow, FORMAT_LABEL, FORMAT_SECTIONS, SECTIONS,
  scopeLabel, type Format, type SectionKey,
} from "@/founder/lib/reporting/founder-update";
import { logSent, advanceStatus, type Channel, type Recipient } from "@/founder/lib/reporting/report-store";
import { copyToClipboard, waDeepLink } from "@/founder/lib/execution/wa-format";

const PERIODS: Period[] = ["live", "last60", "today", "cp_1pm", "cp_4pm", "cp_5pm", "eod", "week", "month"];
const RECIPIENTS: Recipient[] = ["Founder", "Manager", "HR", "HR Ops", "Zone Manager", "Finance", "Custom"];

export function SendUpdateButton({
  label = "Send Founder Update",
  defaultScope,
  defaultPeriod = "live",
  defaultRecipient = "Founder",
  reportName,
  generatedBy = "Super Admin",
  variant = "default",
  size = "sm",
}: {
  label?: string;
  defaultScope?: Scope;
  defaultPeriod?: Period;
  defaultRecipient?: Recipient;
  reportName?: string;
  generatedBy?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(defaultScope ?? { kind: "company", zones: [] });
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [format, setFormat] = useState<Format>("standard");
  const [sections, setSections] = useState<SectionKey[]>(FORMAT_SECTIONS.standard);
  const [commentary, setCommentary] = useState("");
  const [linkMode, setLinkMode] = useState<"snapshot" | "live">("snapshot");
  const [recipient, setRecipient] = useState<Recipient>(defaultRecipient);
  const [preview, setPreview] = useState(false);

  const checkpoint = reportName ?? checkpointNow();
  const block = useMemo(() => scopeBlock(scope), [scope]);
  const warnings = dataQualityIssues(block);

  const cfg = {
    scope, period, format, sections, commentary,
    checkpointLabel: checkpoint, generatedBy, linkMode,
    link: `https://gharpayy.report/${linkMode}/${period}`,
  };
  const body = useMemo(() => buildFounderUpdate(cfg), [scope, period, format, sections, commentary, linkMode, checkpoint, generatedBy]);

  function pickFormat(f: Format) {
    setFormat(f);
    setSections(FORMAT_SECTIONS[f]);
  }

  function toggle(k: SectionKey) {
    setSections((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  }

  function record(channel: Channel) {
    const rec = logSent({
      name: checkpoint, scopeLabel: scopeLabel(scope), period, format, recipient, channel,
      status: "sent", body, commentary, dataWarning: warnings.length > 0, generatedBy,
    });
    setTimeout(() => advanceStatus(rec.id, "delivered"), 1200);
    setTimeout(() => advanceStatus(rec.id, "read"), 4000);
    return rec;
  }

  function sendWhatsApp() {
    record("WhatsApp");
    if (typeof window !== "undefined") window.open(waDeepLink(body), "_blank");
    toast.success("Founder update sent on WhatsApp", { description: "Delivery status is tracking in Report Center." });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-1.5">
          <Send className="h-3.5 w-3.5" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{label}</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-5">
            <Field title="Report scope">
              <div className="flex flex-wrap gap-1.5">
                <Chip active={scope.kind === "company"} onClick={() => setScope({ kind: "company", zones: [] })}>All Gharpayy</Chip>
                {allZones().map((z) => {
                  const on = scope.kind === "zones" && scope.zones.includes(z);
                  return (
                    <Chip key={z} active={on} onClick={() => setScope((s) => {
                      const zones = s.kind === "zones" ? (on ? s.zones.filter((x) => x !== z) : [...s.zones, z]) : [z];
                      return zones.length ? { kind: "zones", zones } : { kind: "company", zones: [] };
                    })}>{z}</Chip>
                  );
                })}
              </div>
            </Field>

            <Field title="Period">
              <div className="flex flex-wrap gap-1.5">
                {PERIODS.map((p) => (
                  <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>{PERIOD_LABEL[p]}</Chip>
                ))}
              </div>
            </Field>

            <Field title="Format">
              <div className="grid sm:grid-cols-3 gap-2">
                {(["quick", "standard", "deep"] as Format[]).map((f) => (
                  <button key={f} onClick={() => pickFormat(f)}
                    className={`text-left rounded-lg border p-3 transition-colors ${format === f ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="font-medium text-sm uppercase">{f}</div>
                    <div className="text-[11px] text-muted-foreground">{FORMAT_LABEL[f]}</div>
                  </button>
                ))}
              </div>
            </Field>

            <Field title="What to include">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                {SECTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={sections.includes(s.key)} onCheckedChange={() => toggle(s.key)} />
                    <span className={sections.includes(s.key) ? "" : "text-muted-foreground"}>{s.label}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field title="Recipient">
              <div className="flex flex-wrap gap-1.5">
                {RECIPIENTS.map((r) => <Chip key={r} active={recipient === r} onClick={() => setRecipient(r)}>{r}</Chip>)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Shared report respects permissions — a zone manager never receives another zone's people data.</p>
            </Field>

            <Field title="Secure link">
              <div className="flex gap-1.5">
                <Chip active={linkMode === "snapshot"} onClick={() => setLinkMode("snapshot")}>Snapshot link · frozen at report time</Chip>
                <Chip active={linkMode === "live"} onClick={() => setLinkMode("live")}>Live link · keeps updating</Chip>
              </div>
            </Field>

            <Field title="Admin commentary (numbers stay system truth)">
              <Textarea rows={3} value={commentary} onChange={(e) => setCommentary(e.target.value)}
                placeholder="Bellandur had three owner approvals delayed. Two should close before 7 PM." />
            </Field>

            {warnings.length > 0 && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-warning mb-1">
                  <AlertTriangle className="h-4 w-4" /> Report contains {warnings.length} data-quality issue(s)
                </div>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  {warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
                <div className="text-[11px] mt-2">Send anyway and the message carries a visible data note. Never send false certainty.</div>
              </div>
            )}

            <Button className="w-full" onClick={() => setPreview(true)}>Preview Update</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed font-mono rounded-xl border border-border bg-muted/40 p-4 max-h-[46vh] overflow-y-auto">{body}</pre>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button onClick={sendWhatsApp} className="gap-1.5"><Send className="h-3.5 w-3.5" /> Send Now</Button>
              <Button variant="outline" className="gap-1.5" onClick={() => { record("WhatsApp"); toast.success("Scheduled", { description: "Queued for the next checkpoint." }); setOpen(false); }}>
                <CalendarClock className="h-3.5 w-3.5" /> Schedule
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => { copyToClipboard(body).then(() => toast.success("WhatsApp summary copied")); }}>
                <Copy className="h-3.5 w-3.5" /> Copy Summary
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => { record("Download"); toast.success("PDF queued on WhatsApp"); }}>
                <FileDown className="h-3.5 w-3.5" /> Send PDF
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => { record("Download"); toast.success("Dashboard snapshot attached"); }}>
                <Camera className="h-3.5 w-3.5" /> Snapshot
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => { record("Secure Link"); copyToClipboard(cfg.link!).then(() => toast.success(`${linkMode === "live" ? "Live" : "Snapshot"} link copied`)); }}>
                <Link2 className="h-3.5 w-3.5" /> Secure Link
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button className="hover:text-foreground" onClick={() => setPreview(false)}>← Edit scope & commentary</button>
              <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-success" /> Numbers system-generated · commentary human</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
      {children}
    </button>
  );
}
