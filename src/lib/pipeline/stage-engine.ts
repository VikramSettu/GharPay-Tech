import { STAGE_CONFIG, STAGE_ORDER, type PipelineStage } from "./stage-config";
import type { Dossier, PipelineState, SlaState, StageGate } from "./types";

const DOSSIER_FIELDS: (keyof Dossier)[] = [
  "moveDate", "budget", "area", "gender", "sharing",
  "movingFeasibility", "decisionMaker", "competition", "objection",
  "closingExpectation", "goal", "leadPersona",
];

export const DOSSIER_FIELD_KEYS = DOSSIER_FIELDS;

function isFilled(d: Dossier, k: keyof Dossier): boolean {
  const v = d[k];
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

export function dossierCompletion(d: Dossier | undefined): number {
  if (!d) return 0;
  const skipped = d.skipped ?? {};
  const done = DOSSIER_FIELDS.filter((k) => isFilled(d, k) || skipped[k as string]).length;
  return Math.round((done / DOSSIER_FIELDS.length) * 100);
}

export function missingDossierFields(d: Dossier | undefined): (keyof Dossier)[] {
  if (!d) return DOSSIER_FIELDS;
  const skipped = d.skipped ?? {};
  return DOSSIER_FIELDS.filter((k) => !isFilled(d, k) && !skipped[k as string]);
}

export function dossierFieldStatus(
  d: Dossier | undefined,
  k: keyof Dossier,
): "filled" | "skipped" | "empty" {
  if (!d) return "empty";
  if (isFilled(d, k)) return "filled";
  if (d.skipped?.[k as string]) return "skipped";
  return "empty";
}

/** Can we advance from current stage → target stage? */
export function canAdvance(
  state: PipelineState,
  to: PipelineStage,
): { ok: boolean; reason?: string } {
  const from = state.currentStage;
  if (from === to) return { ok: true };
  const fromIdx = STAGE_ORDER.indexOf(from);
  const toIdx = STAGE_ORDER.indexOf(to);
  if (toIdx < 0) return { ok: false, reason: `Unknown stage ${to}` };
  if (toIdx < fromIdx) return { ok: true }; // going backward always allowed

  // Enforce exit criteria of "from" stage
  switch (from) {
    case "NEW":
      return { ok: true };
    case "DOSSIER":
      if (dossierCompletion(state.dossier) < 100) {
        return { ok: false, reason: "Dossier is incomplete — fill all 9 fields." };
      }
      return { ok: true };
    case "MATCHED":
      if (!state.dossier.p1) return { ok: false, reason: "Pin at least P1." };
      return { ok: true };
    case "TOUR_SCHEDULED":
      if (!state.tour?.date) return { ok: false, reason: "Tour date required." };
      return { ok: true };
    case "TOUR_CONFIRMED":
      if (!state.tour?.confirmedAt) return { ok: false, reason: "Tour must be confirmed." };
      return { ok: true };
    case "TOUR_IN_PROGRESS":
      if (!state.tour?.completedAt) return { ok: false, reason: "Mark tour complete first." };
      return { ok: true };
    case "POST_VISIT":
      if (!state.postVisit?.decision) return { ok: false, reason: "Log post-visit decision." };
      return { ok: true };
    case "QUOTED":
      if (!state.quote?.amount) return { ok: false, reason: "Quote required (15-min SLA)." };
      return { ok: true };
    case "NEGOTIATION":
      return { ok: true };
    case "BOOKED":
      if (!state.booking?.paymentRef) return { ok: false, reason: "Payment reference required." };
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function newGate(stage: PipelineStage, atIso = new Date().toISOString()): StageGate {
  const cfg = STAGE_CONFIG[stage];
  return {
    stage,
    enteredAt: atIso,
    slaDeadline: new Date(Date.parse(atIso) + cfg.slaMs).toISOString(),
    breached: false,
    completedFields: [],
  };
}

/** Compute SLA state of the current active gate. */
export function computeSlaState(state: PipelineState, now = Date.now()): SlaState {
  const current = state.history[state.history.length - 1];
  if (!current) return "ok";
  const deadline = Date.parse(current.slaDeadline);
  const cfg = STAGE_CONFIG[current.stage];
  const elapsed = now - Date.parse(current.enteredAt);
  const remaining = deadline - now;
  if (remaining < -cfg.slaMs) return "escalated";
  if (remaining < 0) return "breached";
  if (elapsed > cfg.slaMs * 0.7) return "warning";
  return "ok";
}

export function timeInStageMs(state: PipelineState, now = Date.now()): number {
  const current = state.history[state.history.length - 1];
  if (!current) return 0;
  return now - Date.parse(current.enteredAt);
}

export function initialPipelineState(atIso = new Date().toISOString()): PipelineState {
  return {
    currentStage: "DOSSIER",
    history: [newGate("NEW", atIso), newGate("DOSSIER", atIso)],
    dossier: { completionPct: 0 },
  };
}
