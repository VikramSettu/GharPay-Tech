import type { Database } from "@/integrations/supabase/types";
import type { ReviewTeam } from "@/lib/tower/review-os";

export type Role = Database["public"]["Enums"]["app_role"];

/* ---------------- Roles ---------------- */

export const ALL_ROLES: Role[] = ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator", "sales"];

export const ROLE_LABEL: Record<Role, string> = {
  founder_admin: "Founder Admin",
  admin: "Admin",
  manager: "Manager",
  zone_manager: "Zone Manager",
  control_tower: "Control Tower",
  operator: "Operator",
  sales: "Team Member",
};

export const ROLE_SUMMARY: Record<Role, string> = {
  founder_admin: "Company-wide founder view — every zone, every person, every report, plus the Founder Admin console.",
  admin: "Full access — roles, teams, zones, settings and every review.",
  manager: "Full quality and performance view across all teams, closes reviews.",
  zone_manager: "Owns a zone — its leads, its team, its SLA and its performance.",
  control_tower: "Only the major things: lead flow, assignment, SLA, review coverage and quality pulse.",
  operator: "Day-to-day lead operations plus the review queue.",
  sales: "Own leads, own feedback, and all reviews across teams.",
};

/** Roles that operate the tower itself (lead flow, assignment, SLA). */
export const TOWER_ROLES: Role[] = ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator"];

/** Default team a role belongs to, used when the profile has no team set. */
export const ROLE_DEFAULT_TEAM: Partial<Record<Role, ReviewTeam>> = {
  founder_admin: "control_tower",
  admin: "control_tower",
  manager: "cross_functional",
  zone_manager: "cross_functional",
  control_tower: "control_tower",
  operator: "control_tower",
};


/* ---------------- Modules ---------------- */

export type ModuleId =
  | "overview"
  | "my-leads"
  | "team"
  | "review"
  | "feedback"
  | "quality"
  | "analytics"
  | "dashboard"
  | "eod"
  | "access"
  | "guide"
  | "admin"
  | "founder";

export type TowerModule = {
  id: ModuleId;
  to: string;
  label: string;
  exact?: boolean;
  group: "Operations" | "Review OS" | "Management";
  purpose: string;
  roles: Role[];
};

export const MODULES: TowerModule[] = [
  {
    id: "overview",
    to: "/tower",
    label: "Control Tower",
    exact: true,
    group: "Operations",
    purpose: "Live lead flow, unassigned queue, SLA risk — the major picture only.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator"],
  },
  {
    id: "my-leads",
    to: "/tower/my-leads",
    label: "My Leads",
    group: "Operations",
    purpose: "The leads assigned to you, with the shared quality timeline on each.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator", "sales"],
  },
  {
    id: "team",
    to: "/tower/team",
    label: "Team",
    group: "Operations",
    purpose: "Who is on shift, workload and capacity across the floor.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator"],
  },
  {
    id: "review",
    to: "/tower/review",
    label: "Review OS",
    group: "Review OS",
    purpose: "Every chat, call and lead-journey review — visible to all teams.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator", "sales"],
  },
  {
    id: "feedback",
    to: "/tower/feedback",
    label: "My Feedback",
    group: "Review OS",
    purpose: "Your quality card, open corrections and deadlines.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator", "sales"],
  },
  {
    id: "quality",
    to: "/tower/quality",
    label: "Quality",
    group: "Review OS",
    purpose: "Company quality pulse, coverage per person and the daily cadence.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower"],
  },
  {
    id: "analytics",
    to: "/tower/analytics",
    label: "100x Analytics",
    group: "Review OS",
    purpose: "Everything interconnected: lead flow, SLA, review coverage, feedback closure and the 14 checkpoints.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator", "sales"],
  },
  {
    id: "dashboard",
    to: "/tower/dashboard",
    label: "Dashboard",
    group: "Management",
    purpose: "Deeper performance analytics for managers.",
    roles: ["founder_admin", "admin", "manager", "zone_manager"],
  },
  {
    id: "eod",
    to: "/tower/eod",
    label: "EOD",
    group: "Management",
    purpose: "End-of-day close-out and checklist.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower"],
  },
  {
    id: "access",
    to: "/tower/access",
    label: "Access Map",
    group: "Management",
    purpose: "Who sees what — the role-wise visibility matrix.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator", "sales"],
  },
  {
    id: "guide",
    to: "/tower/guide",
    label: "How to use",
    group: "Management",
    purpose: "The daily review rhythm, step by step, for every team.",
    roles: ["founder_admin", "admin", "manager", "zone_manager", "control_tower", "operator", "sales"],
  },
  {
    id: "admin",
    to: "/tower/admin",
    label: "Admin",
    group: "Management",
    purpose: "Roles, teams, zones and performer categories.",
    roles: ["founder_admin", "admin"],
  },
  {
    id: "founder",
    to: "/admin",
    label: "Founder Admin",
    group: "Management",
    purpose: "Company pulse, zone performance, people discipline, playbooks and the daily report centre.",
    roles: ["founder_admin", "admin", "manager", "zone_manager"],
  },
];

export function modulesForRoles(roles: Role[]): TowerModule[] {
  if (roles.length === 0) return [];
  return MODULES.filter((m) => m.roles.some((r) => roles.includes(r)));
}

export function canAccess(id: ModuleId, roles: Role[]): boolean {
  const m = MODULES.find((x) => x.id === id);
  if (!m) return false;
  return m.roles.some((r) => roles.includes(r));
}

/** Highest-authority role held, used for the header chip. */
export function primaryRole(roles: Role[]): Role | null {
  for (const r of ALL_ROLES) if (roles.includes(r)) return r;
  return null;
}
