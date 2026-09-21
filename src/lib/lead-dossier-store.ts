import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Extra dossier facts captured live on a call that the core CRM Lead record
 * has no column for (city fit, amenities, sharing, shortlist, property...).
 * Keyed by lead id so a rep can fill them mid-conversation, from any screen.
 */
export type DossierKey =
  | "inBlr"
  | "amenities"
  | "workLocation"
  | "commuteOk"
  | "sharing"
  | "shortlist"
  | "property"
  | "tourMode"
  | "reaction"
  | "quotation"
  | "objection"
  | "decisionBy";

export type LeadDossier = Partial<Record<DossierKey, string>>;

interface DossierState {
  byLead: Record<string, LeadDossier>;
  setField: (leadId: string, key: DossierKey, value: string) => void;
  clearField: (leadId: string, key: DossierKey) => void;
}

export const useLeadDossier = create<DossierState>()(
  persist(
    (set) => ({
      byLead: {},
      setField: (leadId, key, value) =>
        set((s) => ({
          byLead: { ...s.byLead, [leadId]: { ...(s.byLead[leadId] ?? {}), [key]: value } },
        })),
      clearField: (leadId, key) =>
        set((s) => {
          const next = { ...(s.byLead[leadId] ?? {}) };
          delete next[key];
          return { byLead: { ...s.byLead, [leadId]: next } };
        }),
    }),
    { name: "gharpayy-lead-dossier" },
  ),
);
