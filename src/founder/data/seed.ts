// Gharpayy Arena — expanded seed covering 8 roles, calendar, kudos, tasks, leaves, notifications.
// All optional new data is additive; existing fields preserved for back-compat.

export type Tier = "A" | "B" | "C" | "D";
export type Role =
  | "Super Admin"
  | "Admin"
  | "Floor Lead"
  | "Operator"
  | "Flow Ops"
  | "TCM"
  | "HR"
  | "Owner"
  | "Coach"
  | "Recruiter"
  // Role + KRA system roles
  | "Lead Intake & CRM Executive"
  | "Lead Control Tower Executive"
  | "Flow Ops Executive"
  | "Lead Revival Specialist"
  | "Tour Conversion Manager"
  | "Visit War Room Controller"
  | "Field Visit Executive"
  | "Closure & Negotiation Specialist"
  | "Supply Acquisition Executive"
  | "Owner Success Executive"
  | "Inventory Controller"
  | "Property Readiness Executive"
  | "Property Owner / Operator"
  | "Property Manager"
  | "Booking & Payment Controller"
  | "Check-in & Customer Delight Executive"
  | "Tenant Guild / After-Sales Executive"
  | "Quality Auditor"
  | "Performance Enforcer"
  | "HRMS & Workforce Control Executive"
  | "Team Lead"
  | "Zone Lead"
  | "Department Lead / Operations Manager";

export type AppRole = "admin" | "manager" | "employee";

export interface Employee {
  id: string;
  name: string;
  role: Role;
  appRole: AppRole;
  experience: "New" | "Mid" | "Core";
  attendance: number;
  performance: number;
  consistency: number;
  revenueImpact: number;
  taskCompletion: number;
  conversion: number;
  callsToday: number;
  callTarget: number;
  leadsActive: number;
  closedDeals: number;
  lostDeals: number;
  flags: string[];
  status: "Active" | "Idle" | "Late" | "Offline";
  streakDays: number;
  team: string;
  shift: string;
  avatarSeed: string;
  zone?: string;
  managerId?: string | null;
  bio?: string;
  joinedYearsAgo?: number;
  birthdayMMDD?: string; // "MM-DD"
}

export const EMPLOYEES: Employee[] = [
  { id: "e1", name: "Aarav Mehta", role: "Admin", appRole: "admin", experience: "Core", attendance: 98, performance: 94, consistency: 92, revenueImpact: 480000, taskCompletion: 96, conversion: 32, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 28, team: "HQ", shift: "10:00 - 19:00", avatarSeed: "Aarav", zone: "All", managerId: null, bio: "Builds the system everyone runs on.", joinedYearsAgo: 4, birthdayMMDD: "03-14" },
  { id: "e2", name: "Priya Sharma", role: "Floor Lead", appRole: "manager", experience: "Core", attendance: 95, performance: 88, consistency: 90, revenueImpact: 410000, taskCompletion: 91, conversion: 28, callsToday: 38, callTarget: 40, leadsActive: 22, closedDeals: 6, lostDeals: 3, flags: [], status: "Active", streakDays: 14, team: "Bandra Hub", shift: "10:00 - 19:00", avatarSeed: "Priya", zone: "Bandra", managerId: "e1", bio: "Coaches the floor, defends the pipeline.", joinedYearsAgo: 3, birthdayMMDD: "07-22" },
  { id: "e3", name: "Rohan Iyer", role: "Operator", appRole: "employee", experience: "Mid", attendance: 82, performance: 71, consistency: 68, revenueImpact: 220000, taskCompletion: 74, conversion: 18, callsToday: 22, callTarget: 40, leadsActive: 14, closedDeals: 3, lostDeals: 5, flags: ["Low response speed"], status: "Idle", streakDays: 2, team: "Bandra Hub", shift: "10:00 - 19:00", avatarSeed: "Rohan", zone: "Bandra", managerId: "e2", bio: "Closer in training. Knows every PG in Bandra.", joinedYearsAgo: 1, birthdayMMDD: "11-03" },
  { id: "e4", name: "Sneha Kulkarni", role: "Flow Ops", appRole: "manager", experience: "Core", attendance: 96, performance: 90, consistency: 88, revenueImpact: 180000, taskCompletion: 94, conversion: 41, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 21, team: "HQ Ops", shift: "09:30 - 18:30", avatarSeed: "Sneha", zone: "Mumbai", managerId: "e1", bio: "Air traffic controller for every lead in flight.", joinedYearsAgo: 2, birthdayMMDD: "01-09" },
  { id: "e5", name: "Vikram Joshi", role: "Operator", appRole: "employee", experience: "New", attendance: 70, performance: 52, consistency: 48, revenueImpact: 80000, taskCompletion: 58, conversion: 9, callsToday: 12, callTarget: 30, leadsActive: 8, closedDeals: 1, lostDeals: 6, flags: ["Late login", "Poor follow-up", "Low intent understanding"], status: "Late", streakDays: 0, team: "Andheri Hub", shift: "10:00 - 19:00", avatarSeed: "Vikram", zone: "Andheri", managerId: "e2", bio: "Hungry, learning fast. Big swings ahead.", joinedYearsAgo: 0, birthdayMMDD: "05-19" },
  { id: "e6", name: "Ananya Rao", role: "TCM", appRole: "employee", experience: "Mid", attendance: 92, performance: 84, consistency: 80, revenueImpact: 0, taskCompletion: 88, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 11, team: "Tour Ops", shift: "11:00 - 20:00", avatarSeed: "Ananya", zone: "Bandra", managerId: "e4", bio: "Conducts visits people remember.", joinedYearsAgo: 1, birthdayMMDD: "09-30" },
  { id: "e7", name: "Karan Singh", role: "Operator", appRole: "employee", experience: "Mid", attendance: 88, performance: 76, consistency: 74, revenueImpact: 290000, taskCompletion: 81, conversion: 22, callsToday: 31, callTarget: 40, leadsActive: 16, closedDeals: 4, lostDeals: 4, flags: [], status: "Active", streakDays: 7, team: "Andheri Hub", shift: "10:00 - 19:00", avatarSeed: "Karan", zone: "Andheri", managerId: "e2", bio: "Field-first. Books tours nobody else can.", joinedYearsAgo: 2, birthdayMMDD: "12-12" },
  { id: "e8", name: "Megha Pillai", role: "HR", appRole: "manager", experience: "Core", attendance: 99, performance: 86, consistency: 91, revenueImpact: 0, taskCompletion: 95, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 35, team: "People Ops", shift: "09:30 - 18:30", avatarSeed: "Megha", zone: "All", managerId: "e1", bio: "Knows everyone's name, shift, and coffee order.", joinedYearsAgo: 3, birthdayMMDD: "04-02" },
  { id: "e9", name: "Devansh Patel", role: "Operator", appRole: "employee", experience: "New", attendance: 60, performance: 38, consistency: 30, revenueImpact: 25000, taskCompletion: 42, conversion: 5, callsToday: 6, callTarget: 30, leadsActive: 4, closedDeals: 0, lostDeals: 7, flags: ["Late login", "Low response speed", "Poor follow-up"], status: "Offline", streakDays: 0, team: "Andheri Hub", shift: "10:00 - 19:00", avatarSeed: "Devansh", zone: "Andheri", managerId: "e2", bio: "Reset week — coach plan active.", joinedYearsAgo: 0, birthdayMMDD: "08-25" },
  { id: "e10", name: "Nisha Kapoor", role: "Owner", appRole: "employee", experience: "Core", attendance: 100, performance: 92, consistency: 100, revenueImpact: 0, taskCompletion: 90, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 60, team: "Property Partners", shift: "Anytime", avatarSeed: "Nisha", zone: "Bandra", managerId: null, bio: "Owns 3 properties on the Gharpayy network.", joinedYearsAgo: 2, birthdayMMDD: "02-17" },
  { id: "e11", name: "Tanya Bhatt", role: "Recruiter", appRole: "manager", experience: "Core", attendance: 97, performance: 89, consistency: 93, revenueImpact: 0, taskCompletion: 92, conversion: 34, callsToday: 24, callTarget: 30, leadsActive: 18, closedDeals: 4, lostDeals: 2, flags: [], status: "Active", streakDays: 19, team: "Talent Ops", shift: "10:00 - 19:00", avatarSeed: "Tanya", zone: "Mumbai", managerId: "e8", bio: "Hires faster than the floor can absorb.", joinedYearsAgo: 2, birthdayMMDD: "06-08" },
  // ----- Operator Console identities (4 leadership SOPs) -----
  { id: "e12", name: "Nithya Iyer",   role: "Floor Lead", appRole: "manager", experience: "Core", attendance: 99, performance: 93, consistency: 96, revenueImpact: 0,      taskCompletion: 97, conversion: 0,  callsToday: 0,  callTarget: 0,  leadsActive: 0,  closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 42, team: "In-Office Floor", shift: "10:30 - 20:00", avatarSeed: "Nithya",  zone: "HQ", managerId: "e1", bio: "Runs the Communication Shield. Floor goes quiet on her command.", joinedYearsAgo: 3, birthdayMMDD: "10-11" },
  { id: "e13", name: "Sneha Reddy",   role: "Floor Lead", appRole: "manager", experience: "Core", attendance: 98, performance: 95, consistency: 94, revenueImpact: 620000, taskCompletion: 96, conversion: 38, callsToday: 0,  callTarget: 0,  leadsActive: 0,  closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 38, team: "Tour Ops", shift: "10:30 - 20:00", avatarSeed: "SnehaR", zone: "HQ", managerId: "e1", bio: "Performance Enforcer. Owns the 10:16:60 number every single day.", joinedYearsAgo: 3, birthdayMMDD: "02-28" },
  { id: "e14", name: "Jiya Khanna",   role: "Coach",      appRole: "manager", experience: "Core", attendance: 100, performance: 91, consistency: 95, revenueImpact: 0,    taskCompletion: 94, conversion: 0,  callsToday: 0,  callTarget: 0,  leadsActive: 0,  closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 51, team: "Training", shift: "10:30 - 20:00", avatarSeed: "Jiya",   zone: "HQ", managerId: "e1", bio: "Training Architect. Raw hire to arena-ready in 48 hours.", joinedYearsAgo: 2, birthdayMMDD: "11-21" },
  { id: "e15", name: "Thanvi Kapoor", role: "Recruiter",  appRole: "manager", experience: "Core", attendance: 98, performance: 90, consistency: 92, revenueImpact: 0,     taskCompletion: 95, conversion: 36, callsToday: 0,  callTarget: 0,  leadsActive: 0,  closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 33, team: "Talent Ops", shift: "10:30 - 20:00", avatarSeed: "Thanvi", zone: "HQ", managerId: "e8", bio: "Talent Engine. Long-term operators only — quality is the standard.", joinedYearsAgo: 2, birthdayMMDD: "08-14" },

  { id: "e0", name: "DZ Kapoor", role: "Super Admin", appRole: "admin", experience: "Core", attendance: 100, performance: 97, consistency: 98, revenueImpact: 0, taskCompletion: 99, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 90, team: "HQ", shift: "Anytime", avatarSeed: "DZ", zone: "All", managerId: null, bio: "Owns the operating system: command center, report engine, distribution and audit.", joinedYearsAgo: 5, birthdayMMDD: "01-15" },

  // Role + KRA system: one operator per role so every daily flow can be reviewed.
  { id: "e100", name: "Ishita Verma", role: "Lead Intake & CRM Executive", appRole: "employee", experience: "New", attendance: 88, performance: 72, consistency: 70, revenueImpact: 0, taskCompletion: 80, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 3, team: "Demand Ops", shift: "10:15 - 20:00", avatarSeed: "Ishita", zone: "Bandra", managerId: "e1", bio: "Owns the Lead Intake & CRM Executive daily flow end to end.", joinedYearsAgo: 0, birthdayMMDD: "01-01" },
  { id: "e101", name: "Rahul Nair", role: "Lead Control Tower Executive", appRole: "employee", experience: "Mid", attendance: 89, performance: 75, consistency: 75, revenueImpact: 0, taskCompletion: 81, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 4, team: "Demand Ops", shift: "10:15 - 20:00", avatarSeed: "Rahul", zone: "Andheri", managerId: "e1", bio: "Owns the Lead Control Tower Executive daily flow end to end.", joinedYearsAgo: 1, birthdayMMDD: "02-02" },
  { id: "e102", name: "Neha Sethi", role: "Flow Ops Executive", appRole: "employee", experience: "Core", attendance: 90, performance: 78, consistency: 80, revenueImpact: 0, taskCompletion: 82, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 5, team: "Demand Ops", shift: "10:15 - 20:00", avatarSeed: "Neha", zone: "Powai", managerId: "e1", bio: "Owns the Flow Ops Executive daily flow end to end.", joinedYearsAgo: 2, birthdayMMDD: "03-03" },
  { id: "e103", name: "Arjun Gupta", role: "Lead Revival Specialist", appRole: "employee", experience: "New", attendance: 91, performance: 81, consistency: 85, revenueImpact: 0, taskCompletion: 83, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 6, team: "Demand Ops", shift: "10:15 - 20:00", avatarSeed: "Arjun", zone: "HQ", managerId: "e1", bio: "Owns the Lead Revival Specialist daily flow end to end.", joinedYearsAgo: 3, birthdayMMDD: "04-04" },
  { id: "e104", name: "Kavya Menon", role: "Tour Conversion Manager", appRole: "employee", experience: "Mid", attendance: 92, performance: 84, consistency: 90, revenueImpact: 0, taskCompletion: 84, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 7, team: "Visit & Conversion", shift: "10:15 - 20:00", avatarSeed: "Kavya", zone: "Bandra", managerId: "e1", bio: "Owns the Tour Conversion Manager daily flow end to end.", joinedYearsAgo: 0, birthdayMMDD: "05-05" },
  { id: "e105", name: "Manish Bhatia", role: "Visit War Room Controller", appRole: "employee", experience: "Core", attendance: 93, performance: 87, consistency: 95, revenueImpact: 0, taskCompletion: 85, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 8, team: "Visit & Conversion", shift: "10:15 - 20:00", avatarSeed: "Manish", zone: "Andheri", managerId: "e1", bio: "Owns the Visit War Room Controller daily flow end to end.", joinedYearsAgo: 1, birthdayMMDD: "06-06" },
  { id: "e106", name: "Pooja Desai", role: "Field Visit Executive", appRole: "employee", experience: "New", attendance: 94, performance: 90, consistency: 72, revenueImpact: 0, taskCompletion: 86, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 9, team: "Visit & Conversion", shift: "10:15 - 20:00", avatarSeed: "Pooja", zone: "Powai", managerId: "e1", bio: "Owns the Field Visit Executive daily flow end to end.", joinedYearsAgo: 2, birthdayMMDD: "07-07" },
  { id: "e107", name: "Siddharth Rane", role: "Closure & Negotiation Specialist", appRole: "employee", experience: "Mid", attendance: 95, performance: 93, consistency: 77, revenueImpact: 0, taskCompletion: 87, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 10, team: "Visit & Conversion", shift: "10:15 - 20:00", avatarSeed: "Siddharth", zone: "HQ", managerId: "e1", bio: "Owns the Closure & Negotiation Specialist daily flow end to end.", joinedYearsAgo: 3, birthdayMMDD: "08-08" },
  { id: "e108", name: "Aditya Verma", role: "Supply Acquisition Executive", appRole: "employee", experience: "Core", attendance: 96, performance: 96, consistency: 82, revenueImpact: 0, taskCompletion: 88, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 11, team: "Supply Ops", shift: "10:15 - 20:00", avatarSeed: "Aditya", zone: "Bandra", managerId: "e1", bio: "Owns the Supply Acquisition Executive daily flow end to end.", joinedYearsAgo: 0, birthdayMMDD: "09-09" },
  { id: "e109", name: "Ritika Nair", role: "Owner Success Executive", appRole: "employee", experience: "New", attendance: 97, performance: 74, consistency: 87, revenueImpact: 0, taskCompletion: 89, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 12, team: "Supply Ops", shift: "10:15 - 20:00", avatarSeed: "Ritika", zone: "Andheri", managerId: "e1", bio: "Owns the Owner Success Executive daily flow end to end.", joinedYearsAgo: 1, birthdayMMDD: "10-10" },
  { id: "e110", name: "Harsh Sethi", role: "Inventory Controller", appRole: "employee", experience: "Mid", attendance: 88, performance: 77, consistency: 92, revenueImpact: 0, taskCompletion: 90, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 13, team: "Supply Ops", shift: "10:15 - 20:00", avatarSeed: "Harsh", zone: "Powai", managerId: "e1", bio: "Owns the Inventory Controller daily flow end to end.", joinedYearsAgo: 2, birthdayMMDD: "11-11" },
  { id: "e111", name: "Sanjana Gupta", role: "Property Readiness Executive", appRole: "employee", experience: "Core", attendance: 89, performance: 80, consistency: 97, revenueImpact: 0, taskCompletion: 91, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 14, team: "Supply Ops", shift: "10:15 - 20:00", avatarSeed: "Sanjana", zone: "HQ", managerId: "e1", bio: "Owns the Property Readiness Executive daily flow end to end.", joinedYearsAgo: 3, birthdayMMDD: "12-12" },
  { id: "e112", name: "Mahesh Menon", role: "Property Owner / Operator", appRole: "employee", experience: "New", attendance: 90, performance: 83, consistency: 74, revenueImpact: 0, taskCompletion: 92, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 15, team: "Supply Partners", shift: "10:15 - 20:00", avatarSeed: "Mahesh", zone: "Bandra", managerId: "e1", bio: "Owns the Property Owner / Operator daily flow end to end.", joinedYearsAgo: 0, birthdayMMDD: "01-13" },
  { id: "e113", name: "Deepak Bhatia", role: "Property Manager", appRole: "employee", experience: "Mid", attendance: 91, performance: 86, consistency: 79, revenueImpact: 0, taskCompletion: 93, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 16, team: "Supply Ops", shift: "10:15 - 20:00", avatarSeed: "Deepak", zone: "Andheri", managerId: "e1", bio: "Owns the Property Manager daily flow end to end.", joinedYearsAgo: 1, birthdayMMDD: "02-14" },
  { id: "e114", name: "Shreya Desai", role: "Booking & Payment Controller", appRole: "employee", experience: "Core", attendance: 92, performance: 89, consistency: 84, revenueImpact: 0, taskCompletion: 94, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 17, team: "Booking & CX", shift: "10:15 - 20:00", avatarSeed: "Shreya", zone: "Powai", managerId: "e1", bio: "Owns the Booking & Payment Controller daily flow end to end.", joinedYearsAgo: 2, birthdayMMDD: "03-15" },
  { id: "e115", name: "Vidhi Rane", role: "Check-in & Customer Delight Executive", appRole: "employee", experience: "New", attendance: 93, performance: 92, consistency: 89, revenueImpact: 0, taskCompletion: 95, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 18, team: "Booking & CX", shift: "10:15 - 20:00", avatarSeed: "Vidhi", zone: "HQ", managerId: "e1", bio: "Owns the Check-in & Customer Delight Executive daily flow end to end.", joinedYearsAgo: 3, birthdayMMDD: "04-16" },
  { id: "e116", name: "Farhan Verma", role: "Tenant Guild / After-Sales Executive", appRole: "employee", experience: "Mid", attendance: 94, performance: 95, consistency: 94, revenueImpact: 0, taskCompletion: 96, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 19, team: "Booking & CX", shift: "10:15 - 20:00", avatarSeed: "Farhan", zone: "Bandra", managerId: "e1", bio: "Owns the Tenant Guild / After-Sales Executive daily flow end to end.", joinedYearsAgo: 0, birthdayMMDD: "05-17" },
  { id: "e117", name: "Aparna Nair", role: "Quality Auditor", appRole: "employee", experience: "Core", attendance: 95, performance: 73, consistency: 71, revenueImpact: 0, taskCompletion: 97, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 20, team: "Quality & People", shift: "10:15 - 20:00", avatarSeed: "Aparna", zone: "Andheri", managerId: "e1", bio: "Owns the Quality Auditor daily flow end to end.", joinedYearsAgo: 1, birthdayMMDD: "06-18" },
  { id: "e118", name: "Yash Sethi", role: "Performance Enforcer", appRole: "manager", experience: "New", attendance: 96, performance: 76, consistency: 76, revenueImpact: 0, taskCompletion: 80, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 21, team: "Quality & People", shift: "10:15 - 20:00", avatarSeed: "Yash", zone: "Powai", managerId: "e1", bio: "Owns the Performance Enforcer daily flow end to end.", joinedYearsAgo: 2, birthdayMMDD: "07-19" },
  { id: "e119", name: "Simran Gupta", role: "HRMS & Workforce Control Executive", appRole: "employee", experience: "Mid", attendance: 97, performance: 79, consistency: 81, revenueImpact: 0, taskCompletion: 81, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 22, team: "Quality & People", shift: "10:15 - 20:00", avatarSeed: "Simran", zone: "HQ", managerId: "e1", bio: "Owns the HRMS & Workforce Control Executive daily flow end to end.", joinedYearsAgo: 3, birthdayMMDD: "08-20" },
  { id: "e120", name: "Gaurav Menon", role: "Team Lead", appRole: "manager", experience: "Core", attendance: 88, performance: 82, consistency: 86, revenueImpact: 0, taskCompletion: 82, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 3, team: "Leadership", shift: "10:15 - 20:00", avatarSeed: "Gaurav", zone: "Bandra", managerId: "e1", bio: "Owns the Team Lead daily flow end to end.", joinedYearsAgo: 0, birthdayMMDD: "09-21" },
  { id: "e121", name: "Meera Bhatia", role: "Zone Lead", appRole: "manager", experience: "New", attendance: 89, performance: 85, consistency: 91, revenueImpact: 0, taskCompletion: 83, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 4, team: "Leadership", shift: "10:15 - 20:00", avatarSeed: "Meera", zone: "Andheri", managerId: "e1", bio: "Owns the Zone Lead daily flow end to end.", joinedYearsAgo: 1, birthdayMMDD: "10-22" },
  { id: "e122", name: "Vivek Desai", role: "Department Lead / Operations Manager", appRole: "manager", experience: "Mid", attendance: 90, performance: 88, consistency: 96, revenueImpact: 0, taskCompletion: 84, conversion: 0, callsToday: 0, callTarget: 0, leadsActive: 0, closedDeals: 0, lostDeals: 0, flags: [], status: "Active", streakDays: 5, team: "Leadership", shift: "10:15 - 20:00", avatarSeed: "Vivek", zone: "Powai", managerId: "e1", bio: "Owns the Department Lead / Operations Manager daily flow end to end.", joinedYearsAgo: 2, birthdayMMDD: "11-23" },
];

export function tierFor(perf: number): Tier {
  if (perf >= 85) return "A";
  if (perf >= 70) return "B";
  if (perf >= 55) return "C";
  return "D";
}

export const teamSummary = () => {
  const totalRevenue = EMPLOYEES.reduce((s, e) => s + e.revenueImpact, 0);
  const totalCalls = EMPLOYEES.reduce((s, e) => s + e.callsToday, 0);
  const totalDeals = EMPLOYEES.reduce((s, e) => s + e.closedDeals, 0);
  const totalLeads = EMPLOYEES.reduce((s, e) => s + e.leadsActive, 0);
  const sorted = [...EMPLOYEES].sort((a, b) => b.performance - a.performance);
  return {
    totalRevenue, totalCalls, totalDeals, totalLeads,
    top: sorted[0], bottom: sorted[sorted.length - 1],
    counts: {
      A: EMPLOYEES.filter(e => tierFor(e.performance) === "A").length,
      B: EMPLOYEES.filter(e => tierFor(e.performance) === "B").length,
      C: EMPLOYEES.filter(e => tierFor(e.performance) === "C").length,
      D: EMPLOYEES.filter(e => tierFor(e.performance) === "D").length,
    },
  };
};

// ---------- Kudos ----------
export type KudoTag = "Hustle" | "Customer Love" | "Team Player" | "Above & Beyond" | "Bug Fixer" | "Streak Hero";

export interface Kudo {
  id: string;
  fromId: string;
  toId: string;
  tag: KudoTag;
  message: string;
  ts: number;
}

const now = Date.now();
const D = 24 * 60 * 60 * 1000;
const H = 60 * 60 * 1000;

export const SEED_KUDOS: Kudo[] = [
  { id: "k1", fromId: "e2", toId: "e3", tag: "Hustle", message: "8 follow-ups before lunch. That's the bar.", ts: now - 2 * H },
  { id: "k2", fromId: "e8", toId: "e1", tag: "Above & Beyond", message: "Stayed past midnight to ship the new shift policy.", ts: now - 5 * H },
  { id: "k3", fromId: "e1", toId: "e4", tag: "Team Player", message: "Reassigned 12 leads in 20 minutes during the surge.", ts: now - D },
  { id: "k4", fromId: "e2", toId: "e7", tag: "Customer Love", message: "Owner Nisha messaged me — Karan is 'an angel'.", ts: now - D - 3 * H },
  { id: "k5", fromId: "e4", toId: "e6", tag: "Streak Hero", message: "30 days perfect on-time. Quiet excellence.", ts: now - 2 * D },
  { id: "k6", fromId: "e1", toId: "e8", tag: "Above & Beyond", message: "Built the new onboarding deck end to end.", ts: now - 3 * D },
];

// ---------- Tasks ----------
export type TaskStatus = "todo" | "doing" | "done" | "blocked";
export type TaskPriority = "low" | "med" | "high" | "urgent";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskComment {
  id: string;
  authorId: string;
  body: string;
  ts: number;
}

export type ActivityKind =
  | "created"
  | "status"
  | "priority"
  | "due"
  | "assignee"
  | "subtask_add"
  | "subtask_toggle"
  | "comment"
  | "link_add"
  | "attachment_add"
  | "timer_start"
  | "timer_stop";

export interface TaskActivity {
  id: string;
  kind: ActivityKind;
  byId: string;
  detail: string;
  ts: number;
}

export interface TaskLink {
  id: string;
  label: string;
  url?: string;
  kind?: "lead" | "tour" | "doc" | "url" | "file";
  sizeKb?: number;
}

export interface TimeLog {
  id: string;
  byId: string;
  startAt: number;
  endAt?: number; // open if running
  note?: string;
}

export interface AppTask {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  assignedById: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: number; // epoch ms
  createdAt: number;
  completedAt?: number;
  relatedTo?: string; // free-text e.g. "Lead #1283" or "Tour @ 4pm"
  source?: "manual" | "auto"; // auto = generated by handoff
  // ---- depth (all optional for back-compat) ----
  estimateMin?: number;
  subtasks?: Subtask[];
  comments?: TaskComment[];
  activity?: TaskActivity[];
  links?: TaskLink[];
  timeLogs?: TimeLog[];
}

export const SEED_TASKS: AppTask[] = [
  { id: "t1", title: "Follow up with 4 hot leads", description: "Pick up the 4 leads marked hot from yesterday's pipeline review. Quick call, then a WhatsApp recap.", assigneeId: "e3", assignedById: "e2", status: "doing", priority: "high", dueAt: now + 4 * H, createdAt: now - 2 * H, relatedTo: "Pipeline · Bandra", estimateMin: 90,
    subtasks: [
      { id: "s1a", title: "Call Anika G.", done: true },
      { id: "s1b", title: "Call Rohit M.", done: true },
      { id: "s1c", title: "Call Pooja S.", done: false },
      { id: "s1d", title: "Call Dev N.", done: false },
    ],
    comments: [
      { id: "cm1", authorId: "e2", body: "Lead with the Versova listing — it's their budget.", ts: now - 90 * 60_000 },
      { id: "cm2", authorId: "e3", body: "Done with first 2 — both want a tour Saturday.", ts: now - 30 * 60_000 },
    ],
    activity: [
      { id: "ac1", kind: "created", byId: "e2", detail: "Created task", ts: now - 2 * H },
      { id: "ac2", kind: "status", byId: "e3", detail: "Moved to Doing", ts: now - 90 * 60_000 },
      { id: "ac3", kind: "subtask_toggle", byId: "e3", detail: "Checked 'Call Anika G.'", ts: now - 60 * 60_000 },
    ],
    links: [
      { id: "ln1", label: "Lead sheet — Bandra hot", kind: "doc", url: "#" },
      { id: "ln2", label: "Versova B-204 listing", kind: "tour", url: "#" },
    ],
    timeLogs: [
      { id: "tl1", byId: "e3", startAt: now - 90 * 60_000, endAt: now - 30 * 60_000, note: "First two calls" },
    ],
  },
  { id: "t2", title: "Conduct tour at 4pm — Versova", description: "Anika G. — 4pm at B-204. Bring agreement draft + 2 alt rooms in case.", assigneeId: "e6", assignedById: "e2", status: "todo", priority: "high", dueAt: now + 5 * H, createdAt: now - D, relatedTo: "Tour · Anika G.", estimateMin: 60,
    subtasks: [
      { id: "s2a", title: "Confirm via WhatsApp at T-2h", done: false },
      { id: "s2b", title: "Carry agreement draft", done: false },
      { id: "s2c", title: "Show 2 backup rooms", done: false },
    ],
    links: [{ id: "ln3", label: "Anika lead profile", kind: "lead", url: "#" }],
  },
  { id: "t3", title: "Reassign Devansh's stale leads", assigneeId: "e4", assignedById: "e1", status: "todo", priority: "urgent", dueAt: now + 2 * H, createdAt: now - 3 * H, relatedTo: "Lead pool · Andheri" },
  { id: "t4", title: "Push draft agreement — Karan's deal", assigneeId: "e7", assignedById: "e2", status: "todo", priority: "med", dueAt: now + 6 * H, createdAt: now - H, source: "auto", relatedTo: "Booking · Versova B-204" },
  { id: "t5", title: "Approve June leave queue", assigneeId: "e8", assignedById: "e1", status: "todo", priority: "med", dueAt: now + 8 * H, createdAt: now - 4 * H, relatedTo: "Leave queue" },
  { id: "t6", title: "Compose weekly broadcast", assigneeId: "e8", assignedById: "e1", status: "doing", priority: "low", dueAt: now + D, createdAt: now - D, relatedTo: "All-hands Friday" },
  { id: "t7", title: "Owner check-in: Nisha (Bandra)", assigneeId: "e6", assignedById: "e4", status: "todo", priority: "med", dueAt: now + 26 * H, createdAt: now - 12 * H },
  { id: "t8", title: "Hit 40 calls today", assigneeId: "e5", assignedById: "e2", status: "doing", priority: "urgent", dueAt: now + 3 * H, createdAt: now - 5 * H, relatedTo: "Daily target" },
  { id: "t9", title: "Update room photos — B-204", assigneeId: "e10", assignedById: "e4", status: "todo", priority: "low", dueAt: now + 2 * D, createdAt: now - D },
  { id: "t10", title: "Review attendance anomalies", assigneeId: "e8", assignedById: "e1", status: "doing", priority: "high", dueAt: now + 1 * H, createdAt: now - 2 * H, relatedTo: "Anomaly inbox" },
  { id: "t11", title: "1:1 with Vikram", assigneeId: "e2", assignedById: "e2", status: "todo", priority: "high", dueAt: now + 7 * H, createdAt: now - 6 * H, relatedTo: "Coaching" },
  { id: "t12", title: "Close booking — payment link sent", assigneeId: "e3", assignedById: "e2", status: "done", priority: "high", dueAt: now - 2 * H, createdAt: now - D, completedAt: now - 30 * 60_000 },
];

// ---------- Leaves ----------
export type LeaveType = "Casual" | "Sick" | "Earned" | "Unpaid" | "WFH";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface AppLeave {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  reason: string;
  status: LeaveStatus;
  appliedAt: number;
  reviewedById?: string;
  reviewNote?: string;
}

const dKey = (offset: number) => {
  const d = new Date(now + offset * D);
  return d.toISOString().slice(0, 10);
};

export const SEED_LEAVES: AppLeave[] = [
  { id: "l1", employeeId: "e7", type: "Casual", startDate: dKey(3), endDate: dKey(3), reason: "Sister's wedding registration", status: "pending", appliedAt: now - 2 * H },
  { id: "l2", employeeId: "e3", type: "Sick", startDate: dKey(-2), endDate: dKey(-2), reason: "Fever, doctor visit", status: "approved", appliedAt: now - 3 * D, reviewedById: "e2", reviewNote: "Take rest." },
  { id: "l3", employeeId: "e6", type: "Earned", startDate: dKey(10), endDate: dKey(14), reason: "Annual trip — booked tickets", status: "pending", appliedAt: now - D },
  { id: "l4", employeeId: "e5", type: "WFH", startDate: dKey(1), endDate: dKey(1), reason: "Plumber visiting", status: "approved", appliedAt: now - 4 * H, reviewedById: "e2" },
];

// ---------- Calendar Events ----------
export type CalEventType = "shift" | "tour" | "task" | "leave" | "holiday" | "birthday" | "1:1" | "town_hall" | "anniversary";

export interface CalEvent {
  id: string;
  type: CalEventType;
  title: string;
  startAt: number;
  endAt: number;
  ownerId?: string;
  withIds?: string[];
  location?: string;
  note?: string;
}

const todayAt = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

export const SEED_CAL: CalEvent[] = [
  { id: "c1", type: "tour", title: "Tour @ Versova B-204", startAt: todayAt(16), endAt: todayAt(16, 45), ownerId: "e6", withIds: ["e3"], location: "Versova, Andheri W", note: "Anika G. — confirmed T-2h" },
  { id: "c2", type: "1:1", title: "1:1 — Priya & Vikram", startAt: todayAt(17), endAt: todayAt(17, 30), ownerId: "e2", withIds: ["e5"], location: "Huddle room 2" },
  { id: "c3", type: "town_hall", title: "Friday All-Hands", startAt: todayAt(18) + 2 * D, endAt: todayAt(19) + 2 * D, ownerId: "e1", withIds: EMPLOYEES.map((e) => e.id), location: "Zoom · pinned" },
  { id: "c4", type: "tour", title: "Tour @ Bandra A-12", startAt: todayAt(11) + D, endAt: todayAt(11, 45) + D, ownerId: "e6", withIds: ["e7"], location: "Bandra W" },
  { id: "c5", type: "holiday", title: "Public holiday — observed", startAt: todayAt(0) + 7 * D, endAt: todayAt(23, 59) + 7 * D, note: "Office closed" },
  { id: "c6", type: "birthday", title: "🎂 Karan Singh's birthday", startAt: todayAt(0) + 1 * D, endAt: todayAt(23, 59) + 1 * D, ownerId: "e7" },
  { id: "c7", type: "task", title: "Compose weekly broadcast", startAt: todayAt(15), endAt: todayAt(16), ownerId: "e8" },
];

// ---------- Notifications ----------
export type NotifKind =
  | "approval"
  | "task"
  | "kudos"
  | "attendance"
  | "mention"
  | "coach"
  | "system"
  | "calendar";

export interface AppNotif {
  id: string;
  kind: NotifKind;
  toId: string; // recipient
  fromId?: string;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  actionLabel?: string;
  actionTo?: string; // route
}

export const SEED_NOTIFS: AppNotif[] = [
  { id: "n1", kind: "approval", toId: "e2", fromId: "e7", title: "Karan requested casual leave", body: "1 day · Sister's wedding registration", ts: now - 2 * H, read: false, actionLabel: "Review", actionTo: "/leaves" },
  { id: "n2", kind: "kudos", toId: "e3", fromId: "e2", title: "Priya sent you a kudo", body: "Hustle — '8 follow-ups before lunch. That's the bar.'", ts: now - 2 * H, read: false, actionLabel: "Open", actionTo: "/kudos" },
  { id: "n3", kind: "attendance", toId: "e8", title: "Anomaly: Devansh has no clock-in today", body: "Last seen yesterday 6:42 PM. Suggest a check-in nudge.", ts: now - 3 * H, read: false, actionLabel: "Open Roster", actionTo: "/roster" },
  { id: "n4", kind: "coach", toId: "e5", title: "Coach nudge", body: "You're 18 calls behind today's pace. Knock out 6 before 1pm to stay green.", ts: now - 4 * H, read: false },
  { id: "n5", kind: "task", toId: "e6", fromId: "e2", title: "New tour assigned", body: "4pm @ Versova B-204 — Anika G.", ts: now - 6 * H, read: true, actionLabel: "Open task", actionTo: "/tasks" },
  { id: "n6", kind: "mention", toId: "e1", fromId: "e8", title: "Megha mentioned you", body: "@Aarav can you approve the new shift template?", ts: now - 8 * H, read: true },
  { id: "n7", kind: "calendar", toId: "e2", title: "1:1 with Vikram in 1 hour", body: "Huddle room 2 · 5:00 PM", ts: now - 10 * H, read: false, actionLabel: "Open calendar", actionTo: "/calendar" },
  { id: "n8", kind: "system", toId: "e1", title: "Weekly digest ready", body: "Performance · Attendance · Kudos summary for last 7 days.", ts: now - 12 * H, read: true, actionLabel: "Preview", actionTo: "/inbox/digests" },
  { id: "n9", kind: "kudos", toId: "e6", fromId: "e4", title: "Sneha sent you a kudo", body: "Streak Hero — '30 days perfect on-time.'", ts: now - 2 * D, read: true },
  { id: "n10", kind: "attendance", toId: "e5", title: "You're marked late today", body: "Shift started 10:00. You clocked in 10:43.", ts: now - 5 * H, read: false },
];

// ---------- Anomalies ----------
export interface Anomaly {
  id: string;
  employeeId: string;
  kind: "no_clockin" | "no_clockout" | "no_selfie" | "outside_zone" | "long_break";
  detail: string;
  ts: number;
}

export const SEED_ANOMALIES: Anomaly[] = [
  { id: "a1", employeeId: "e9", kind: "no_clockin", detail: "No clock-in by 11:00 AM (shift 10:00)", ts: now - 3 * H },
  { id: "a2", employeeId: "e5", kind: "no_selfie", detail: "Clock-in without selfie verification", ts: now - 5 * H },
  { id: "a3", employeeId: "e3", kind: "long_break", detail: "Break ran 52 min (policy 30 min)", ts: now - 4 * H },
];

// ---------- 1:1 Notes ----------
export type OneOnOneSentiment = "green" | "amber" | "red";

export interface OneOnOneActionItem {
  id: string;
  title: string;
  ownerId: string;
  done: boolean;
  dueAt?: number;
}

export interface OneOnOne {
  id: string;
  managerId: string;
  reportId: string;
  scheduledAt: number;
  durationMin: number;
  status: "scheduled" | "completed" | "skipped";
  sentiment?: OneOnOneSentiment;
  agenda: string;       // private to manager pre-meeting
  notes: string;        // shared post-meeting
  privateNotes?: string; // manager only
  actionItems: OneOnOneActionItem[];
  createdAt: number;
  updatedAt: number;
}

export const SEED_ONE_ON_ONES: OneOnOne[] = [
  {
    id: "o1", managerId: "e2", reportId: "e5", scheduledAt: now + 7 * H, durationMin: 30, status: "scheduled",
    agenda: "1) Why are we 18 calls behind?\n2) Lead intent diagnosis\n3) One thing I can unblock for you",
    notes: "",
    actionItems: [],
    createdAt: now - D, updatedAt: now - 2 * H,
  },
  {
    id: "o2", managerId: "e2", reportId: "e3", scheduledAt: now - 2 * D, durationMin: 30, status: "completed", sentiment: "green",
    agenda: "Pipeline review · Bandra hot leads · Tour conversion",
    notes: "Rohan's pipeline is healthy. He needs the new objection handling deck. Confidence is up — give him a stretch lead this week.",
    privateNotes: "Promotable in Q3 if conversion holds 22%+.",
    actionItems: [
      { id: "ai1", title: "Share objection handling deck", ownerId: "e2", done: true },
      { id: "ai2", title: "Assign 1 stretch lead", ownerId: "e2", done: false, dueAt: now + 2 * D },
    ],
    createdAt: now - 4 * D, updatedAt: now - 2 * D,
  },
  {
    id: "o3", managerId: "e2", reportId: "e7", scheduledAt: now - 5 * D, durationMin: 30, status: "completed", sentiment: "green",
    agenda: "Field strategy · Owner relationships",
    notes: "Karan is operating at A-tier. Wants to learn closing playbook. Pair with Priya on next 3 closes.",
    actionItems: [
      { id: "ai3", title: "Schedule shadowing — 3 closes", ownerId: "e2", done: false },
    ],
    createdAt: now - 7 * D, updatedAt: now - 5 * D,
  },
  {
    id: "o4", managerId: "e8", reportId: "e11", scheduledAt: now + 2 * D, durationMin: 45, status: "scheduled",
    agenda: "Q3 hiring plan · Pipeline health · Recruiter tooling",
    notes: "",
    actionItems: [],
    createdAt: now - D, updatedAt: now - D,
  },
  {
    id: "o5", managerId: "e1", reportId: "e2", scheduledAt: now - D, durationMin: 45, status: "completed", sentiment: "amber",
    agenda: "Bandra hub performance · Vikram coaching plan",
    notes: "Vikram needs a hard deadline. If conversion doesn't hit 12% by end of month, move to Andheri B-team. Priya owns the call.",
    privateNotes: "Watch Priya's bandwidth — she's coaching 4 reports actively.",
    actionItems: [
      { id: "ai4", title: "Set Vikram's 30-day plan in writing", ownerId: "e2", done: true },
      { id: "ai5", title: "Decision review on Vikram — Day 30", ownerId: "e1", done: false, dueAt: now + 14 * D },
    ],
    createdAt: now - 2 * D, updatedAt: now - D,
  },
];

// ---------- Recruiting Pipeline ----------
export type CandidateStage = "applied" | "screen" | "interview" | "offer" | "hired" | "rejected";
export type CandidateSource = "Referral" | "LinkedIn" | "Naukri" | "Walk-in" | "Inbound" | "Agency";

export interface CandidateNote {
  id: string;
  authorId: string;
  body: string;
  ts: number;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleApplied: Role;
  stage: CandidateStage;
  source: CandidateSource;
  rating: 1 | 2 | 3 | 4 | 5;
  recruiterId: string;
  expectedSalary: number; // INR per month
  experience: string;
  city: string;
  appliedAt: number;
  nextStepAt?: number;
  nextStepLabel?: string;
  notes: CandidateNote[];
  rejectReason?: string;
}

export const SEED_CANDIDATES: Candidate[] = [
  {
    id: "cand1", name: "Riya Malhotra", email: "riya.m@example.com", phone: "+91 98200 11122",
    roleApplied: "Operator", stage: "interview", source: "LinkedIn", rating: 4, recruiterId: "e11",
    expectedSalary: 32000, experience: "2 yrs · BYJU'S", city: "Mumbai",
    appliedAt: now - 6 * D, nextStepAt: now + D, nextStepLabel: "Round 2 with Priya",
    notes: [
      { id: "cn1", authorId: "e11", body: "Strong objection handling. Asked sharp questions about commission structure.", ts: now - 2 * D },
    ],
  },
  {
    id: "cand2", name: "Aditya Khanna", email: "adi.khanna@example.com", phone: "+91 99300 44455",
    roleApplied: "Operator", stage: "screen", source: "Referral", rating: 3, recruiterId: "e11",
    expectedSalary: 28000, experience: "1.5 yrs · NoBroker", city: "Mumbai",
    appliedAt: now - 3 * D, nextStepAt: now + 2 * H, nextStepLabel: "Phone screen",
    notes: [{ id: "cn2", authorId: "e11", body: "Referred by Karan. Available immediately.", ts: now - 3 * D }],
  },
  {
    id: "cand3", name: "Pooja Desai", email: "pooja.d@example.com", phone: "+91 98765 22211",
    roleApplied: "TCM", stage: "offer", source: "LinkedIn", rating: 5, recruiterId: "e11",
    expectedSalary: 42000, experience: "3 yrs · OYO Tour Ops", city: "Mumbai",
    appliedAt: now - 14 * D, nextStepAt: now + 6 * H, nextStepLabel: "Verbal offer call",
    notes: [
      { id: "cn3", authorId: "e8", body: "Cleared all rounds. HR fit excellent.", ts: now - 2 * D },
      { id: "cn4", authorId: "e11", body: "Counter-offer risk: current employer may match. Move fast.", ts: now - D },
    ],
  },
  {
    id: "cand4", name: "Sahil Verma", email: "sahil.v@example.com", phone: "+91 90909 11223",
    roleApplied: "Flow Ops", stage: "applied", source: "Naukri", rating: 3, recruiterId: "e11",
    expectedSalary: 35000, experience: "2 yrs · Swiggy Ops", city: "Mumbai",
    appliedAt: now - 12 * H, notes: [],
  },
  {
    id: "cand5", name: "Ishita Reddy", email: "ishita.r@example.com", phone: "+91 91111 33445",
    roleApplied: "Operator", stage: "applied", source: "Walk-in", rating: 2, recruiterId: "e11",
    expectedSalary: 26000, experience: "Fresher", city: "Mumbai",
    appliedAt: now - 4 * H, notes: [{ id: "cn5", authorId: "e11", body: "Confident, but very green. Maybe trial week.", ts: now - 3 * H }],
  },
  {
    id: "cand6", name: "Manav Joshi", email: "manav.j@example.com", phone: "+91 98888 77665",
    roleApplied: "Operator", stage: "hired", source: "Referral", rating: 5, recruiterId: "e11",
    expectedSalary: 30000, experience: "2 yrs · Magicbricks", city: "Mumbai",
    appliedAt: now - 30 * D, notes: [{ id: "cn6", authorId: "e11", body: "Joined last Monday. Already at 65% of ramp target.", ts: now - 7 * D }],
  },
  {
    id: "cand7", name: "Neha Iyer", email: "neha.i@example.com", phone: "+91 97777 11000",
    roleApplied: "HR", stage: "rejected", source: "LinkedIn", rating: 2, recruiterId: "e11",
    expectedSalary: 55000, experience: "4 yrs · Generalist", city: "Pune",
    appliedAt: now - 20 * D, rejectReason: "Comp expectation 40% above band.",
    notes: [],
  },
  {
    id: "cand8", name: "Yash Agarwal", email: "yash.a@example.com", phone: "+91 96000 11122",
    roleApplied: "Floor Lead", stage: "interview", source: "Agency", rating: 4, recruiterId: "e11",
    expectedSalary: 95000, experience: "5 yrs · Floor mgmt", city: "Mumbai",
    appliedAt: now - 9 * D, nextStepAt: now + 3 * D, nextStepLabel: "Final round with Aarav",
    notes: [{ id: "cn7", authorId: "e1", body: "Sharp on numbers. Need to test his coaching instinct.", ts: now - 2 * D }],
  },
];

export const CAND_STAGE_LABEL: Record<CandidateStage, string> = {
  applied: "Applied",
  screen: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export const CAND_STAGE_ORDER: CandidateStage[] = ["applied", "screen", "interview", "offer", "hired", "rejected"];
