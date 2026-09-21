// Local persistence for L1 reviews. Internal tool, single device.

import { useSyncExternalStore } from "react";
import type { L1Review } from "./types";

const KEY = "gharpayy.l1.reviews.v1";

let cache: L1Review[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: L1Review[] = [];

function read(): L1Review[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as L1Review[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: L1Review[]) {
  cache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useL1Reviews(): L1Review[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function saveL1Review(r: L1Review) {
  const rest = read().filter((x) => x.id !== r.id);
  write([r, ...rest]);
}

export function deleteL1Review(id: string) {
  write(read().filter((x) => x.id !== id));
}

export function newL1Id() {
  return `l1-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}