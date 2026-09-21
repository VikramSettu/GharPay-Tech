// Zone-based role model + function-based pods.
// Six primary roles per zone with a documented backup matrix, plus a
// company-wide function catalogue and pods.  Pure data + helpers — no I/O.

export type ZoneId = "central" | "south" | "east" | "north" | "west";

export interface Zone {
  id: ZoneId;
  name: string;
  neighborhoods: string[];
}

export const ZONES: Zone[] = [
  { id: "central", name: "Central",   neighborhoods: ["MG Road", "Ulsoor", "Shivajinagar"] },
  { id: "south",   name: "South",     neighborhoods: ["Koramangala", "HSR", "BTM", "JP Nagar"] },
  { id: "east",    name: "East",      neighborhoods: ["Indiranagar", "Whitefield", "Marathahalli"] },
  { id: "north",   name: "North",     neighborhoods: ["Hebbal", "Yelahanka", "Jakkur"] },
  { id: "west",    name: "West",      neighborhoods: ["Rajajinagar", "Vijayanagar", "Malleshwaram"] },
];

export type ZoneRoleKey =
  | "lead-specialist"
  | "followup-specialist"
  | "visit-scheduler"
  | "field-executive"
  | "booking-closer"
  | "zone-lead"
  | "control-tower";

export interface ZoneRoleDef {
  key: ZoneRoleKey;
  title: string;
  primary: string;
  backup: string;                 // description of backup responsibility
  backupOf: ZoneRoleKey;          // role this person covers when absent
}

export const ZONE_ROLES: ZoneRoleDef[] = [
  {
    key: "lead-specialist",
    title: "Lead Specialist",
    primary: "New leads · unreads · qualification",
    backup: "Covers immediate / hot leads",
    backupOf: "followup-specialist",
  },
  {
    key: "followup-specialist",
    title: "Follow-up & Re-initiation Specialist",
    primary: "Stuck chats · old leads · re-initiation",
    backup: "Covers unread inbox",
    backupOf: "zone-lead",
  },
  {
    key: "visit-scheduler",
    title: "Visit Scheduler",
    primary: "Schedule visits · reminders · virtual tours",
    backup: "Covers immediate leads on peak days",
    backupOf: "lead-specialist",
  },
  {
    key: "field-executive",
    title: "Field Visit Executive",
    primary: "Property visits · walk-ins · inventory verification",
    backup: "Covers visit coordination",
    backupOf: "booking-closer",
  },
  {
    key: "booking-closer",
    title: "Booking & Closing Specialist",
    primary: "Negotiation · bookings · token collection",
    backup: "Covers parent / decision-maker calls",
    backupOf: "zone-lead",
  },
  {
    key: "zone-lead",
    title: "Zone Lead",
    primary: "Performance · WA allocation · escalations · reporting",
    backup: "Floats to any function during peak load",
    backupOf: "booking-closer",
  },
  {
    key: "control-tower",
    title: "Control Tower Team",
    primary: "Aligns everyone · watches inbound · works old leads (7d/30d) · guards the flawless process · single-owner enforcement",
    backup: "Floats between zones to cover any absent role and re-balance load",
    backupOf: "zone-lead",
  },
];

/** Explicit backup matrix: if role X is absent → covered by Y. */
export const BACKUP_MATRIX: Record<ZoneRoleKey, ZoneRoleKey> = Object.fromEntries(
  ZONE_ROLES.map((r) => [r.key, r.backupOf]),
) as Record<ZoneRoleKey, ZoneRoleKey>;

// ─────────────────────────────────────────────────────────────
// Per-zone seeded people so the board renders out of the box.
// ─────────────────────────────────────────────────────────────
export interface ZoneMember {
  id: string;
  name: string;
  initials: string;
  zoneId: ZoneId;
  roleKey: ZoneRoleKey;
  presentToday: boolean;
  activeLeads: number;
  slaBreaches: number;
  closedThisWeek: number;
}

const FIRST = ["Aarav","Priya","Rohan","Neha","Kabir","Isha","Vivaan","Ananya","Rehan","Diya","Karan","Meera","Yash","Sana","Aditya","Riya","Tarun","Kavya","Raghav","Nisha","Aman","Pooja","Tushar","Sara","Kunal","Anita","Vivek","Farah","Manav","Zoya"];
const LAST = ["Mehta","Shah","Iyer","Verma","Khanna","Pillai","Sharma","Rao","Nair","Joshi","Kapoor","Bhatt","Rana","Sinha","Ghosh"];

let seedIdx = 0;
function pick(a: string[]): string { const x = a[seedIdx % a.length]; seedIdx++; return x; }

export function seedZoneMembers(): ZoneMember[] {
  const out: ZoneMember[] = [];
  ZONES.forEach((z, zi) => {
    ZONE_ROLES.forEach((r, ri) => {
      const first = pick(FIRST);
      const last  = pick(LAST);
      const id = `zm-${z.id}-${r.key}`;
      out.push({
        id,
        name: `${first} ${last}`,
        initials: (first[0] + last[0]).toUpperCase(),
        zoneId: z.id,
        roleKey: r.key,
        presentToday: !((zi + ri) % 7 === 0), // ~1 absent per zone
        activeLeads: 6 + ((zi * 3 + ri * 5) % 14),
        slaBreaches: (zi + ri) % 4,
        closedThisWeek: (zi * 2 + ri) % 6,
      });
    });
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// Function-based catalogue (hire by function, not by zone)
// ─────────────────────────────────────────────────────────────
export interface FunctionRole {
  key: string;
  title: string;
  responsibility: string;
  idealCount: string;
  pod: PodKey;
}

export type PodKey =
  | "lead-acquisition"
  | "qualification"
  | "immediate-conversion"
  | "stuck-chat-recovery"
  | "re-initiation"
  | "visit-operations"
  | "booking-closing"
  | "customer-success"
  | "inventory-property"
  | "performance-qa";

export const PODS: { key: PodKey; label: string }[] = [
  { key: "lead-acquisition",     label: "Lead Acquisition" },
  { key: "qualification",        label: "Qualification" },
  { key: "immediate-conversion", label: "Immediate Conversion" },
  { key: "stuck-chat-recovery",  label: "Stuck Chat Recovery" },
  { key: "re-initiation",        label: "Re-initiation" },
  { key: "visit-operations",     label: "Visit Operations" },
  { key: "booking-closing",      label: "Booking & Closing" },
  { key: "customer-success",     label: "Customer Success" },
  { key: "inventory-property",   label: "Inventory & Property" },
  { key: "performance-qa",       label: "Performance & QA" },
];

export const FUNCTION_ROLES: FunctionRole[] = [
  { key: "new-lead-exec",       title: "New Lead Executive",             responsibility: "First response, qualification, assignment", idealCount: "6",   pod: "lead-acquisition" },
  { key: "immediate-lead",      title: "Immediate Lead Specialist",      responsibility: "Hot leads & same-day move-ins",             idealCount: "4",   pod: "immediate-conversion" },
  { key: "student-specialist",  title: "Student Specialist",             responsibility: "Students and parents",                      idealCount: "3",   pod: "qualification" },
  { key: "working-specialist",  title: "Working Professional Specialist",responsibility: "Professionals and families",                idealCount: "3",   pod: "qualification" },
  { key: "reinit-exec",         title: "Re-initiation Executive",        responsibility: "Revive old CRM leads",                      idealCount: "5",   pod: "re-initiation" },
  { key: "stuck-chat",          title: "Stuck Chat Specialist",          responsibility: "Move conversations to next stage",          idealCount: "5",   pod: "stuck-chat-recovery" },
  { key: "visit-scheduler",     title: "Visit Scheduler",                responsibility: "Schedule and confirm visits",               idealCount: "4",   pod: "visit-operations" },
  { key: "visit-coord",         title: "Visit Coordinator",              responsibility: "Ongoing tours and field coordination",      idealCount: "4",   pod: "visit-operations" },
  { key: "field-sales",         title: "Field Sales Executive",          responsibility: "Conduct property visits",                   idealCount: "6",   pod: "visit-operations" },
  { key: "virtual-tour",        title: "Virtual Tour Executive",         responsibility: "Video tours for remote customers",          idealCount: "2",   pod: "visit-operations" },
  { key: "booking-closer",      title: "Booking / Closing Specialist",   responsibility: "Collect token, negotiate, close",           idealCount: "6",   pod: "booking-closing" },
  { key: "customer-success",    title: "Customer Success Executive",     responsibility: "Post-booking support until move-in",        idealCount: "3",   pod: "customer-success" },
  { key: "inventory-manager",   title: "Inventory Manager",              responsibility: "Live room availability & owner updates",    idealCount: "3",   pod: "inventory-property" },
  { key: "prm",                 title: "Property Relationship Manager",  responsibility: "Owner onboarding & relationship",           idealCount: "3",   pod: "inventory-property" },
  { key: "wa-ops",              title: "WhatsApp Operations Executive",  responsibility: "Inbox allocation · tagging · SLA",          idealCount: "3",   pod: "stuck-chat-recovery" },
  { key: "crm-exec",            title: "CRM Executive",                  responsibility: "Data quality · routing · reports",          idealCount: "2",   pod: "performance-qa" },
  { key: "qa-exec",             title: "QA Executive",                   responsibility: "Audit chats, calls, SOP compliance",        idealCount: "2",   pod: "performance-qa" },
  { key: "perf-analyst",        title: "Performance Analyst",            responsibility: "Dashboards & KPIs",                         idealCount: "2",   pod: "performance-qa" },
  { key: "team-leader",         title: "Team Leader",                    responsibility: "Manages one operational zone",              idealCount: "4–6", pod: "performance-qa" },
  { key: "ops-manager",         title: "Operations Manager",             responsibility: "Overall daily operations",                  idealCount: "1–2", pod: "performance-qa" },
];

/** Every pod should have Primary / Backup / Emergency Backup so no
 *  operation stops when one person is absent. */
export const POD_COVERAGE_RULE = "1 Primary Owner · 1 Backup · 1 Emergency Backup";
