/**
 * The 10x Workflow Guarantee — the closed loop the whole company runs on.
 *
 * System identifies the required movement → assigns the right owner → sets the
 * deadline → ranks execution → operator completes a structured outcome → system
 * creates the next movement → the downstream role receives it → Control Tower
 * watches exceptions → capacity and conversion are forecast → recovery begins
 * before the final target fails.
 *
 * Every link is measured against live data, so the loop can never be "assumed".
 */
import type { LeadMotion, PersonFlow, ViolationCode, WorkflowKpis } from "./engine";

export type LinkState = "sealed" | "strained" | "broken";

export interface ChainLink {
  id: string;
  step: number;
  title: string;
  promise: string;
  /** 0–100 integrity of this link */
  pct: number;
  state: LinkState;
  /** count of items failing this link */
  failing: number;
  detail: string;
  /** what the system does automatically when this link slips */
  autoResponse: string;
  to?: string;
}

const pct = (ok: number, total: number) => (total === 0 ? 100 : Math.round((ok / total) * 100));
const stateOf = (p: number): LinkState => (p >= 95 ? "sealed" : p >= 80 ? "strained" : "broken");

const has = (m: LeadMotion, c: ViolationCode) => m.violations.some((x) => x.code === c);

export interface ChainResult {
  links: ChainLink[];
  /** weakest link first */
  weakest: ChainLink | null;
  integrity: number;
  /** the one simple state the company is trying to hold */
  steady: boolean;
  statement: string;
}

export function guaranteeChain(
  board: LeadMotion[],
  kpis: WorkflowKpis,
  people: PersonFlow[],
): ChainResult {
  const total = Math.max(board.length, 0);
  const idle = total === 0;

  const identified = board.filter((m) => m.action || m.reason).length;
  const owned = board.filter((m) => m.ownerId).length;
  const dated = board.filter((m) => m.dueAt !== null).length;
  const ranked = board.filter((m) => m.priorityScore > 0).length;
  const structured = people.reduce((s, p) => s + p.completedActions, 0);
  const requiredWork = people.reduce((s, p) => s + p.requiredActions, 0);
  const nextCreated = total - kpis.noNextAction;
  const received = total - kpis.brokenHandoffs;
  const exceptionsOpen = kpis.needsAction;
  const capacityShort = people.filter((p) => p.queueGap > 0).length;
  const forecastOk = people.filter((p) => p.projectedEod >= p.requiredActions).length;
  const recoveryNeeded = people.filter((p) => p.pace === "behind" || p.risk === "critical").length;

  const raw: Omit<ChainLink, "state">[] = [
    {
      id: "identify", step: 1, title: "Movement identified",
      promise: "System decides what must move next — never the operator's memory.",
      pct: pct(identified, total), failing: total - identified,
      detail: `${total - identified} leads with no defined movement`,
      autoResponse: "Motion engine derives the required step from stage + signals.",
    },
    {
      id: "assign", step: 2, title: "Right owner assigned",
      promise: "Zone, capacity and conversion pick the owner automatically.",
      pct: pct(owned, total), failing: total - owned,
      detail: `${total - owned} unassigned`,
      autoResponse: "Auto-assignment routes to the best-fit owner with capacity.",
      to: "/tower/interventions",
    },
    {
      id: "deadline", step: 3, title: "Deadline set",
      promise: "Every movement carries a due time — nothing is open-ended.",
      pct: pct(dated, total), failing: total - dated,
      detail: `${total - dated} without a due time`,
      autoResponse: "SLA template stamps a deadline the moment work is created.",
    },
    {
      id: "rank", step: 4, title: "Execution ranked",
      promise: "The queue is ordered by value at risk, not arrival order.",
      pct: pct(ranked, total), failing: total - ranked,
      detail: `${ranked} of ${total} ranked in the live queue`,
      autoResponse: "Priority score re-sorts every queue on each tick.",
      to: "/tower/my-leads",
    },
    {
      id: "outcome", step: 5, title: "Structured outcome captured",
      promise: "Work closes with a scenario code, not a free-text note.",
      pct: idle ? 100 : pct(structured, Math.max(requiredWork, structured)), failing: idle ? 0 : Math.max(requiredWork - structured, 0),
      detail: idle ? "No active work in the loop" : `${structured} of ${requiredWork} required actions completed`,
      autoResponse: "Outcome dialog blocks close-out until the scenario is chosen.",
    },
    {
      id: "next", step: 6, title: "Next movement created",
      promise: "Completing a step must produce the following step.",
      pct: pct(nextCreated, total), failing: kpis.noNextAction,
      detail: `${kpis.noNextAction} leads stopped with no next action`,
      autoResponse: "Scenario templates auto-create the follow-on action.",
      to: "/tower/interventions",
    },
    {
      id: "handoff", step: 7, title: "Downstream role receives it",
      promise: "Handoffs are accepted, not hoped for.",
      pct: pct(received, total), failing: kpis.brokenHandoffs,
      detail: `${kpis.brokenHandoffs} handoffs never landed`,
      autoResponse: "Unaccepted handoffs bounce back and escalate.",
      to: "/handoffs",
    },
    {
      id: "exceptions", step: 8, title: "Control Tower watches exceptions",
      promise: "Only broken things reach a human supervisor.",
      pct: pct(total - exceptionsOpen, total), failing: exceptionsOpen,
      detail: `${exceptionsOpen} exceptions in the queue`,
      autoResponse: "Violations surface with a one-click fix in the intervention queue.",
      to: "/tower/interventions",
    },
    {
      id: "forecast", step: 9, title: "Capacity and conversion forecast",
      promise: "Tomorrow's shortfall is visible today.",
      pct: idle ? 100 : pct(forecastOk, Math.max(people.length, 1)), failing: idle ? 0 : people.length - forecastOk,
      detail: idle ? "No load to forecast" : `${capacityShort} queue shortages · ${people.length - forecastOk} projected to miss`,
      autoResponse: "Reverse funnel converts targets into required actions per person.",
      to: "/tower/analytics",
    },
    {
      id: "recovery", step: 10, title: "Recovery starts before the miss",
      promise: "The plan is repaired while the target is still reachable.",
      pct: idle ? 100 : pct(Math.max(people.length - recoveryNeeded, 0), Math.max(people.length, 1)), failing: idle ? 0 : recoveryNeeded,
      detail: idle || recoveryNeeded === 0 ? "No recovery required" : `${recoveryNeeded} people need a recovery plan now`,
      autoResponse: "Recovery queue reloads work and redistributes before EOD.",
      to: "/tower/interventions",
    },
  ];

  const links: ChainLink[] = raw.map((l) => ({ ...l, state: stateOf(l.pct) }));
  const integrity = Math.round(links.reduce((s, l) => s + l.pct, 0) / links.length);
  const sorted = [...links].sort((a, b) => a.pct - b.pct);
  const weakest = sorted[0] && sorted[0].pct < 100 ? sorted[0] : null;
  const steady = links.every((l) => l.state === "sealed");

  return {
    links,
    weakest,
    integrity,
    steady,
    statement: steady
      ? "Every lead is owned, moving, on a deadline, and its next step already exists."
      : weakest
        ? `The loop is leaking at step ${weakest.step} — ${weakest.title.toLowerCase()}.`
        : "Loop forming — waiting for live work.",
  };
}

export const STEADY_STATE_LINE =
  "Nothing waits for a human to remember it. Work appears, gets owned, gets done, and creates the next work by itself.";
