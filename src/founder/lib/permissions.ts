// Permissions matrix for the HRMS dashboard.
import type { AppRole, Employee, Role } from "@/founder/data/seed";

// ---------- Tier (the real 4-hierarchy model) ----------
export type Tier = "superadmin" | "leadership" | "hr" | "leader" | "recruiter" | "teammate";

export const TIER_LABEL: Record<Tier, string> = {
  superadmin: "Super Admin",
  leadership: "Leadership",
  hr: "HR",
  leader: "Leader",
  recruiter: "Recruiter",
  teammate: "Teammate",
};

export const TIER_TAGLINE: Record<Tier, string> = {
  superadmin: "Owns the whole operating system. Reports, distribution, governance, audit.",
  leadership: "Sees the whole arena. Owns revenue & direction.",
  hr: "Owns people, pulse and policy.",
  leader: "Owns a pod. Coaches, approves, ships.",
  recruiter: "Owns the funnel. Sources, screens, seals offers.",
  teammate: "Owns the day. Executes, learns, climbs.",
};

const SUPER_ROLES: Role[] = ["Super Admin"];
const LEADERSHIP_ROLES: Role[] = ["Admin", "Owner"];
const HR_ROLES: Role[] = ["HR"];
const LEADER_ROLES: Role[] = ["Floor Lead", "Coach"];
const RECRUITER_ROLES: Role[] = ["Recruiter"];
// Teammates: Operator, Flow Ops, TCM, and anyone unmatched.

export function tierOf(emp: Pick<Employee, "role" | "appRole">): Tier {
  if (SUPER_ROLES.includes(emp.role)) return "superadmin";
  if (LEADERSHIP_ROLES.includes(emp.role)) return "leadership";
  if (HR_ROLES.includes(emp.role)) return "hr";
  if (LEADER_ROLES.includes(emp.role)) return "leader";
  if (RECRUITER_ROLES.includes(emp.role)) return "recruiter";
  // appRole=admin override (in case seed changes)
  if (emp.appRole === "admin") return "leadership";
  return "teammate";
}


export type Capability =
  | "view_all_attendance"
  | "edit_attendance"
  | "approve_leaves"
  | "assign_tasks_any"
  | "assign_tasks_team"
  | "view_team_scores"
  | "view_all_scores"
  | "give_kudos"
  | "broadcast_announcement"
  | "manage_users"
  | "manage_roles"
  | "view_war_room"
  | "view_payroll"
  | "view_own_score";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

export const ROLE_DESC: Record<AppRole, string> = {
  admin: "Full surface area. Owns the system.",
  manager: "Owns a team. Coaches, approves, decides.",
  employee: "Owns their day. Executes, learns, climbs.",
};

const MATRIX: Record<Capability, AppRole[]> = {
  view_all_attendance: ["admin", "manager"],
  edit_attendance: ["admin"],
  approve_leaves: ["admin", "manager"],
  assign_tasks_any: ["admin"],
  assign_tasks_team: ["admin", "manager"],
  view_team_scores: ["admin", "manager"],
  view_all_scores: ["admin"],
  give_kudos: ["admin", "manager", "employee"],
  broadcast_announcement: ["admin", "manager"],
  manage_users: ["admin"],
  manage_roles: ["admin"],
  view_war_room: ["admin", "manager"],
  view_payroll: ["admin"],
  view_own_score: ["admin", "manager", "employee"],
};

export function can(role: AppRole, cap: Capability): boolean {
  return MATRIX[cap].includes(role);
}

export const CAP_LIST: { cap: Capability; label: string; group: string }[] = [
  { cap: "view_own_score", label: "View own score", group: "Performance" },
  { cap: "view_team_scores", label: "View team scores", group: "Performance" },
  { cap: "view_all_scores", label: "View all scores", group: "Performance" },
  { cap: "view_all_attendance", label: "View attendance roster", group: "Attendance" },
  { cap: "edit_attendance", label: "Edit attendance entries", group: "Attendance" },
  { cap: "approve_leaves", label: "Approve / reject leaves", group: "Leaves" },
  { cap: "assign_tasks_team", label: "Assign tasks to team", group: "Tasks" },
  { cap: "assign_tasks_any", label: "Assign tasks to anyone", group: "Tasks" },
  { cap: "give_kudos", label: "Give kudos", group: "Recognition" },
  { cap: "broadcast_announcement", label: "Broadcast announcement", group: "Comms" },
  { cap: "view_war_room", label: "Open War Room", group: "Comms" },
  { cap: "manage_users", label: "Add / remove users", group: "Admin" },
  { cap: "manage_roles", label: "Change role assignments", group: "Admin" },
  { cap: "view_payroll", label: "View payroll signals", group: "Admin" },
];
