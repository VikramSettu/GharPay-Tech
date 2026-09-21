// Applied lead labels — local-first store shared by the Marketplace, My Leads,
// the Label Console and L1 Review. A label is an instruction with an owner,
// a deadline and a resolution, not a decorative tag.

import { useSyncExternalStore } from "react";
import { LABEL_BY_ID } from "./catalog";

export interface AppliedLabel {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  labelId: string;
  /** Free-text instruction from the Control Tower — the "like this" part. */
  note: string;
  appliedBy: string;
  appliedAt: string;
  dueAt: string;
  /** Set when the owner has executed the instruction. */
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

const KEY = "gharpayy.lead.labels.v1";

let cache: AppliedLabel[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: AppliedLabel[] = [];

function read(): AppliedLabel[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as AppliedLabel[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: AppliedLabel[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota — keep the in-memory copy */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLeadLabels(): AppliedLabel[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function labelsForLead(all: AppliedLabel[], leadId: string) {
  return all.filter((l) => l.leadId === leadId);
}

export function openLabelsForLead(all: AppliedLabel[], leadId: string) {
  return all.filter((l) => l.leadId === leadId && !l.resolvedAt);
}

export function applyLabel(input: {
  leadId: string;
  leadName: string;
  leadPhone: string;
  labelId: string;
  note?: string;
  appliedBy: string;
}): AppliedLabel {
  const def = LABEL_BY_ID[input.labelId];
  const now = new Date();
  const rec: AppliedLabel = {
    id: `lbl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    leadId: input.leadId,
    leadName: input.leadName,
    leadPhone: input.leadPhone,
    labelId: input.labelId,
    note: input.note?.trim() ?? "",
    appliedBy: input.appliedBy,
    appliedAt: now.toISOString(),
    dueAt: new Date(now.getTime() + (def?.slaHours ?? 24) * 3_600_000).toISOString(),
  };
  // One open instance of a label per lead — re-applying refreshes it instead of stacking.
  const rest = read().filter((l) => !(l.leadId === rec.leadId && l.labelId === rec.labelId && !l.resolvedAt));
  write([rec, ...rest]);
  return rec;
}

export function resolveLabel(id: string, by: string, resolutionNote = "") {
  write(
    read().map((l) =>
      l.id === id ? { ...l, resolvedAt: new Date().toISOString(), resolvedBy: by, resolutionNote } : l,
    ),
  );
}

export function removeLabel(id: string) {
  write(read().filter((l) => l.id !== id));
}

export function isOverdue(l: AppliedLabel, now = Date.now()) {
  return !l.resolvedAt && new Date(l.dueAt).getTime() < now;
}

/** Counts used by the console header and the nav badge. */
export function labelStats(all: AppliedLabel[], now = Date.now()) {
  const open = all.filter((l) => !l.resolvedAt);
  return {
    total: all.length,
    open: open.length,
    overdue: open.filter((l) => isOverdue(l, now)).length,
    resolvedToday: all.filter(
      (l) => l.resolvedAt && new Date(l.resolvedAt).toDateString() === new Date(now).toDateString(),
    ).length,
  };
}
