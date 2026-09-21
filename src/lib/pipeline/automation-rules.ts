// Pure automation rules — run on a 30s tick.
// Each returns actions the caller should apply.
import { QUOTE_FOLLOWUP_LADDER, TOUR_REMINDER_CASCADE } from "./stage-config";
import type { PipelineState } from "./types";

export type AutomationAction =
  | { kind: "escalate"; leadId: string; reason: string }
  | { kind: "reminder"; leadId: string; label: string }
  | { kind: "followup"; leadId: string; ladderIdx: number }
  | { kind: "sla-breach"; leadId: string; stage: string }
  | { kind: "move-to-queue"; leadId: string; queue: "action" | "revival" | "negotiation" };

export function runRules(
  leadId: string,
  state: PipelineState,
  now = Date.now(),
): AutomationAction[] {
  const out: AutomationAction[] = [];
  const gate = state.history[state.history.length - 1];
  if (!gate) return out;

  // R2: Dossier timer expired
  if (gate.stage === "DOSSIER" && now > Date.parse(gate.slaDeadline)) {
    out.push({ kind: "sla-breach", leadId, stage: "DOSSIER" });
    out.push({ kind: "escalate", leadId, reason: "Dossier 60s expired" });
  }

  // R3: No tour after 24h in MATCHED
  if (gate.stage === "MATCHED" && now - Date.parse(gate.enteredAt) > 24 * 3600 * 1000) {
    out.push({ kind: "move-to-queue", leadId, queue: "action" });
  }

  // R4: Tour confirmation cascade
  if (state.tour?.date && gate.stage === "TOUR_SCHEDULED") {
    const tourAt = Date.parse(state.tour.date);
    const sent = new Set(state.tour.remindersSent);
    for (const r of TOUR_REMINDER_CASCADE) {
      if (tourAt - now <= r.at && tourAt - now > 0 && !sent.has(r.label)) {
        out.push({ kind: "reminder", leadId, label: r.label });
      }
    }
  }

  // R5: Post-visit → quote in 15 min
  if (gate.stage === "POST_VISIT" && now > Date.parse(gate.slaDeadline)) {
    out.push({ kind: "sla-breach", leadId, stage: "POST_VISIT" });
    out.push({ kind: "escalate", leadId, reason: "Quote missing 15m after tour" });
  }

  // R6: Quote follow-up ladder
  if (state.quote?.sentAt) {
    const sentAt = Date.parse(state.quote.sentAt);
    const fired = new Set(state.quote.followUpsFired);
    QUOTE_FOLLOWUP_LADDER.forEach((delta, idx) => {
      if (now - sentAt >= delta && !fired.has(idx)) {
        out.push({ kind: "followup", leadId, ladderIdx: idx });
      }
    });
  }

  // R7: Quote sent but no booking after 7d → negotiation queue
  if (gate.stage === "QUOTED" && now - Date.parse(gate.enteredAt) > 7 * 24 * 3600 * 1000) {
    out.push({ kind: "move-to-queue", leadId, queue: "negotiation" });
  }

  return out;
}
