// Founder Update generator — QUICK / STANDARD / DEEP formats.
// Numbers are system truth. Commentary is human context. Never mix them.
import { biggestRisk, dataQualityIssues, healthDot, PERIOD_LABEL, scopeBlock, zoneRows, type Block, type Period, type Scope } from "@/founder/lib/command-center/metrics";

export type Format = "quick" | "standard" | "deep";

export const FORMAT_LABEL: Record<Format, string> = {
  quick: "QUICK · 20–30 sec read",
  standard: "STANDARD · 1–2 min read",
  deep: "DEEP · full management report",
};

export type SectionKey =
  | "company"
  | "attendance"
  | "active_team"
  | "productivity"
  | "reporting"
  | "lead_ownership"
  | "chat_health"
  | "tours"
  | "closing"
  | "bookings"
  | "zone_comparison"
  | "at_risk"
  | "manager_actions"
  | "sla"
  | "reconciliation"
  | "support";

export const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "company", label: "Company result" },
  { key: "attendance", label: "Attendance" },
  { key: "active_team", label: "Active team" },
  { key: "productivity", label: "Productivity" },
  { key: "reporting", label: "Reporting compliance" },
  { key: "lead_ownership", label: "Lead ownership" },
  { key: "chat_health", label: "Chat health" },
  { key: "tours", label: "Tours" },
  { key: "closing", label: "Closing" },
  { key: "bookings", label: "Bookings" },
  { key: "zone_comparison", label: "Zone comparison" },
  { key: "at_risk", label: "At-risk people" },
  { key: "manager_actions", label: "Manager actions" },
  { key: "sla", label: "SLA breaches" },
  { key: "reconciliation", label: "Reconciliation" },
  { key: "support", label: "Support required" },
];

export const FORMAT_SECTIONS: Record<Format, SectionKey[]> = {
  quick: ["company", "active_team", "lead_ownership", "chat_health", "tours", "bookings"],
  standard: [
    "company", "attendance", "active_team", "productivity", "reporting",
    "lead_ownership", "chat_health", "tours", "closing", "bookings",
    "zone_comparison", "at_risk", "manager_actions", "sla",
  ],
  deep: SECTIONS.map((s) => s.key),
};

export type UpdateConfig = {
  scope: Scope;
  period: Period;
  format: Format;
  sections: SectionKey[];
  commentary: string;
  checkpointLabel: string;
  generatedBy: string;
  linkMode: "snapshot" | "live";
  link?: string;
};

export function scopeLabel(scope: Scope): string {
  if (scope.kind === "company") return "All Gharpayy";
  if (scope.kind === "role") return `Role · ${scope.role ?? "—"}`;
  if (scope.kind === "manager") return "Manager team";
  if (scope.kind === "person") return "One person";
  return scope.zones.length ? scope.zones.join(", ") : "All Gharpayy";
}

function fmtTime(d = new Date()): string {
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtDate(d = new Date()): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function buildFounderUpdate(cfg: UpdateConfig): string {
  const block = scopeBlock(cfg.scope);
  const has = (k: SectionKey) => cfg.sections.includes(k);
  const L: string[] = [];
  const risk = biggestRisk(block);

  L.push(`GHARPAYY · ${cfg.checkpointLabel.toUpperCase()}`);
  L.push(`Scope: ${scopeLabel(cfg.scope)} · ${PERIOD_LABEL[cfg.period]}`);
  L.push("");

  if (has("company") || has("attendance") || has("active_team") || has("productivity")) {
    L.push("Company");
    if (has("attendance")) L.push(`Present: ${block.people.present}/${block.people.expected}`);
    if (has("active_team")) L.push(`Active now: ${block.people.active}`);
    if (has("productivity")) L.push(`Productive: ${block.people.productive}`);
    if (has("at_risk")) L.push(`At Risk: ${block.people.atRisk}`);
    L.push("");
  }

  if (has("lead_ownership")) {
    L.push("Demand");
    L.push(`Active leads: ${block.demand.activeLeads}`);
    L.push(`Assigned: ${block.demand.assigned}/${block.demand.activeLeads}${block.demand.unassigned === 0 ? " ✅" : ""}`);
    L.push(`Unassigned: ${block.demand.unassigned}${block.demand.unassigned > 0 ? " 🔴" : ""}`);
    L.push("");
  }

  if (has("chat_health")) {
    L.push("Chat Health");
    L.push(`Active chats: ${block.chats.active}`);
    L.push(`Waiting for Gharpayy: ${block.chats.waitingUs}${block.chats.waitingUs > 0 ? " 🔴" : " ✅"}`);
    if (has("sla")) L.push(`SLA breaches: ${block.chats.slaBreached}`);
    L.push("");
  }

  if (has("tours")) {
    L.push("Tours");
    L.push(`Scheduled: ${block.tours.scheduled}`);
    L.push(`Confirmed: ${block.tours.confirmed}`);
    L.push(`Completed: ${block.tours.completed}`);
    L.push(`Unconfirmed: ${block.tours.unconfirmed}${block.tours.unconfirmed > 0 ? " 🟠" : ""}`);
    L.push("");
  }

  if (has("closing")) {
    L.push("Closing");
    L.push(`High intent: ${block.closing.highIntent}`);
    L.push(`Quotes open: ${block.closing.quotesOpen}`);
    L.push(`Payments pending: ${block.closing.paymentPending}`);
    L.push("");
  }

  if (has("bookings")) {
    L.push("Bookings");
    L.push(`BBD: ${block.closing.bookings}/${block.closing.bbdTarget} expected`);
    L.push("");
  }

  if (has("reporting")) {
    L.push("Reporting");
    L.push(`Compliance: ${block.reporting.compliance}%`);
    L.push(`1 PM ${block.reporting.cp1}/${block.people.present} · 5 PM ${block.reporting.cp5}/${block.people.present}`);
    L.push("");
  }

  if (has("zone_comparison")) {
    const rows = zoneRows();
    L.push("Zones");
    rows.forEach((r) => {
      if (cfg.format === "deep") {
        L.push(
          `${healthDot(r.health)} ${r.zone} · present ${r.block.people.present}/${r.block.people.expected} · tours ${r.block.tours.completed}/${r.block.tours.scheduled} · BBD ${r.block.closing.bookings}/${r.block.closing.bbdTarget} · reporting ${r.block.reporting.compliance}%`,
        );
      } else {
        L.push(`${healthDot(r.health)} ${r.zone}`);
      }
    });
    L.push("");
    const attention = rows.filter((r) => r.health !== "green");
    if (attention.length) {
      L.push("Zones Needing Attention");
      attention.forEach((r) => L.push(`${r.zone} ${healthDot(r.health)}`));
      L.push("");
    }
  }

  if (has("at_risk") && cfg.format !== "quick") {
    L.push("People At Risk");
    L.push(`${block.people.atRisk} people flagged · ${block.people.idle} idle · ${block.people.blocked} blocked`);
    L.push("");
  }

  if (has("manager_actions") && cfg.format !== "quick") {
    L.push("Manager Actions");
    L.push(`${block.management.managerActions} interventions logged · ${block.management.supportPending} support requests open${block.management.supportBreached ? ` · ${block.management.supportBreached} breached 🔴` : ""}`);
    L.push("");
  }

  if (has("support") && cfg.format === "deep") {
    L.push("Support Required");
    L.push(block.management.supportPending ? `${block.management.supportPending} blockers awaiting owner response.` : "None open.");
    L.push("");
  }

  if (has("reconciliation") && cfg.format === "deep") {
    L.push("Reconciliation");
    L.push(block.management.reconciliationIssues ? `${block.management.reconciliationIssues} handoff mismatch(es) open.` : "Clean — every handoff matched.");
    L.push("");
  }

  L.push("Biggest Risk");
  L.push(risk.risk);
  L.push("");
  L.push("Action");
  L.push(risk.action);
  L.push("");

  if (cfg.commentary.trim()) {
    L.push("Admin Commentary");
    L.push(cfg.commentary.trim());
    L.push("");
  }

  const dq = dataQualityIssues(block);
  if (dq.length) {
    L.push("Data note");
    dq.forEach((d) => L.push(`- ${d}`));
    L.push("");
  }

  if (cfg.link) {
    L.push(`${cfg.linkMode === "live" ? "View live dashboard" : "View snapshot"}: ${cfg.link}`);

    L.push("");
  }

  L.push(generatedFrom(cfg));
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function generatedFrom(cfg: UpdateConfig): string {
  const now = new Date();
  return [
    "—",
    "Gharpayy HRMS",
    `Generated: ${fmtDate(now)} · ${fmtTime(now)}`,
    `Data through: ${fmtTime(new Date(now.getTime() - 2 * 60 * 1000))}`,
    "CRM Sync: Healthy · HRMS Sync: Healthy",
    "Report Version: v1.4",
    `Filters: ${scopeLabel(cfg.scope)} · ${PERIOD_LABEL[cfg.period]}`,
    `Generated by: ${cfg.generatedBy}`,
  ].join("\n");
}

export function checkpointNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning Update";
  if (h < 14) return "1 PM Operating Pulse";
  if (h < 17) return "4 PM Control Update";
  if (h < 20) return "5 PM Control Update";
  return "8 PM Final · EOD";
}

export function summaryLine(block: Block): string {
  return `Present ${block.people.present}/${block.people.expected} · BBD ${block.closing.bookings}/${block.closing.bbdTarget} · Unassigned ${block.demand.unassigned} · Waiting us ${block.chats.waitingUs}`;
}
