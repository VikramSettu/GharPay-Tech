// Admin notes log — the running written record per person.
// 1-on-1 takeaways, feedback, warnings and praise all land here with an
// optional follow-up date, so nothing the admin writes ever gets lost.

import { useMemo, useSyncExternalStore } from "react";
import { makeStore } from "@/founder/lib/store";

export type NoteKind = "one-on-one" | "feedback" | "warning" | "praise";

export interface AdminNote {
  id: string;
  employeeId: string;
  kind: NoteKind;
  text: string;
  followUp?: string; // yyyy-mm-dd
  createdAt: number;
  createdBy: string;
}

const store = makeStore<AdminNote[]>("gp_admin_notes_v1", []);

export function useAdminNotes(): AdminNote[] {
  const all = useSyncExternalStore(store.subscribe, store.read, store.getServerSnapshot);
  return useMemo(() => [...all].sort((a, b) => b.createdAt - a.createdAt), [all]);
}

export function addNote(input: {
  employeeId: string;
  kind: NoteKind;
  text: string;
  followUp?: string;
  createdBy?: string;
}): AdminNote {
  const note: AdminNote = {
    id: crypto.randomUUID(),
    employeeId: input.employeeId,
    kind: input.kind,
    text: input.text,
    followUp: input.followUp || undefined,
    createdAt: Date.now(),
    createdBy: input.createdBy ?? "admin",
  };
  store.write([note, ...store.read()]);
  return note;
}

export function removeNote(id: string) {
  store.write(store.read().filter((n) => n.id !== id));
}

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  "one-on-one": "1-on-1",
  feedback: "Feedback",
  warning: "Warning",
  praise: "Praise",
};

export const NOTE_KIND_CLASS: Record<NoteKind, string> = {
  "one-on-one": "bg-primary/10 text-primary border-primary/30",
  feedback: "bg-secondary text-secondary-foreground border-border",
  warning: "bg-destructive/10 text-destructive border-destructive/30",
  praise: "bg-success/10 text-success border-success/30",
};

export const NOTE_KINDS: NoteKind[] = ["one-on-one", "feedback", "warning", "praise"];
