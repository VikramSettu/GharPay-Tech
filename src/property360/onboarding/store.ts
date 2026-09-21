// Local persistence for onboarding drafts + published passports.
// Internal tool, single device: the drafts live in localStorage so a half-filled
// owner form is never lost, and published properties merge into Property 360.

import { useSyncExternalStore } from "react";
import type { OnboardingDraft, OnboardingMode } from "./types";
import { newDraft } from "./build";

const KEY = "gharpayy.property360.onboarding.v1";

let cache: OnboardingDraft[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: OnboardingDraft[] = [];

function read(): OnboardingDraft[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as OnboardingDraft[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: OnboardingDraft[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota — keep in-memory copy */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDrafts(): OnboardingDraft[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function listDrafts(): OnboardingDraft[] {
  return read();
}

export function getDraft(id: string): OnboardingDraft | undefined {
  return read().find((d) => d.id === id);
}

export function createDraft(mode: OnboardingMode, filledBy = ""): OnboardingDraft {
  const draft = newDraft(mode, filledBy);
  write([draft, ...read()]);
  return draft;
}

export function saveDraft(draft: OnboardingDraft) {
  const next = { ...draft, updatedAt: new Date().toISOString() };
  const list = read();
  write(list.some((d) => d.id === next.id) ? list.map((d) => (d.id === next.id ? next : d)) : [next, ...list]);
  return next;
}

export function deleteDraft(id: string) {
  write(read().filter((d) => d.id !== id));
}

/** Marks a draft as owner-submitted and waiting for team review. */
export function submitDraft(id: string) {
  const d = getDraft(id);
  if (d) saveDraft({ ...d, status: "submitted" });
}

/** Publishes a draft: assigns a canonical PID and makes it visible in Property 360. */
export function publishDraft(id: string, pid: string) {
  const d = getDraft(id);
  if (d) saveDraft({ ...d, status: "published", publishedPid: pid });
}

export function unpublishDraft(id: string) {
  const d = getDraft(id);
  if (d) saveDraft({ ...d, status: "submitted" });
}
