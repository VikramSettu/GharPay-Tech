// Deterministic demo history so the analytics and admin reporting surfaces are
// never empty. Runs once on the client; real logging always overrides it.

import { EMPLOYEES } from "@/founder/data/seed";
import { CORE_ROLES, coreRoleForName, currentCheckpoint, targetAt, type CoreRole } from "@/founder/lib/execution/core-roles";
import { phasesFor } from "@/founder/lib/execution/core-tasks";
import { bulkSeed, type CoreDay } from "@/founder/lib/execution/core-progress";

const FLAG = "gp_core_seed_v3";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) / 2 ** 31 % 1;
}

/** Which core role a seeded employee runs. */
export function coreRoleOf(employeeRole: string): CoreRole {
  return coreRoleForName(employeeRole);
}

export function seedCoreDemo() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FLAG)) return;

  const cp = currentCheckpoint();
  const recs: CoreDay[] = [];

  for (const emp of EMPLOYEES) {
    const role = coreRoleOf(emp.role);
    // performance-weighted multiplier: strong performers overshoot, weak lag
    const skill = 0.55 + (emp.performance ?? 70) / 160; // ~0.9 – 1.15

    for (let back = 13; back >= 0; back--) {
      const d = new Date();
      d.setDate(d.getDate() - back);
      const date = d.toISOString().slice(0, 10);
      if (d.getDay() === 0) continue; // Sunday off

      const noise = 0.75 + hash(`${emp.id}${date}`) * 0.55;
      const factor = Math.min(1.35, skill * noise);
      const today = back === 0;

      const counts: Record<string, number> = {};
      for (const t of role.targets) {
        const ceiling = today ? targetAt(t, cp) : t.eod;
        counts[t.id] = Math.max(0, Math.round(ceiling * factor));
      }

      const checks: Record<string, number> = {};
      const phases: CoreDay["phases"] = {};
      const submissions: CoreDay["submissions"] = {};
      const list = phasesFor(role);
      const reached = today ? (cp === "p1" ? 1 : cp === "p2" ? 2 : 4) : 4;
      list.forEach((p, pi) => {
        if (pi > reached) return;
        const complete = pi < reached ? factor > 0.85 : false;
        phases[p.id] = { startedAt: d.getTime(), ...(complete ? { doneAt: d.getTime() } : {}) };
        p.steps.forEach((s, si) => {
          const ok = complete || hash(`${emp.id}${date}${s.id}`) < factor - 0.15;
          if (ok) checks[s.id] = d.getTime() + si * 60000;
        });
        if (complete) {
          const values: Record<string, string> = {};
          for (const fl of p.report) {
            const m = /^m_(p1|p2|eod)_(.+)$/.exec(fl.id);
            if (m) {
              const t = role.targets.find((x) => x.id === m[2]);
              values[fl.id] = String(t ? Math.round(targetAt(t, m[1] as "p1" | "p2" | "eod") * factor) : 0);
            } else if (fl.kind === "number") {
              values[fl.id] = String(Math.round(2 + hash(`${emp.id}${date}${fl.id}`) * 6));
            } else {
              values[fl.id] = fl.placeholder || "Filed on time.";
            }
          }
          submissions[p.id] = { ts: d.getTime() + (pi + 1) * 3_600_000, values };
        }
      });

      const recoveries = factor < 0.9 && !today
        ? [{
            ts: d.getTime(),
            checkpoint: "Phase 2 · by 5:00 PM",
            metric: role.targets[0].label,
            gap: Math.max(1, Math.round(role.targets[0].eod * (1 - factor))),
            answers: [
              `Short by ${Math.max(1, Math.round(role.targets[0].eod * (1 - factor)))} ${role.targets[0].label.toLowerCase()}.`,
              "Lost the first block to unassigned queue clean-up.",
              "Adding a 90-minute focused block and pulling 12 warm cases forward.",
              "Need Zone Lead for 2 approvals by 6 PM.",
            ],
          }]
        : [];

      recs.push({ employeeId: emp.id, roleId: role.id, date, counts, checks, phases, submissions, selfies: {}, recoveries });
    }
  }

  bulkSeed(recs);
  localStorage.setItem(FLAG, "1");
}

export const CORE_ROLE_IDS = CORE_ROLES.map((r) => r.id);
