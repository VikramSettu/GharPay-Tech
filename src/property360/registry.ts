// Merged Property 360 registry: the seeded supply-hub master plus every
// property onboarded through the collective onboarding flow.

import { useMemo } from "react";
import { allProperties360, type Property360 } from "./model";
import { draftToProperty360, pidForDraft } from "./onboarding/build";
import { listDrafts, useDrafts } from "./onboarding/store";
import type { OnboardingDraft } from "./onboarding/types";

function onboardedFrom(drafts: OnboardingDraft[]): Property360[] {
  const published = drafts.filter((d) => d.status === "published");
  const seqByKey: Record<string, number> = {};
  return published.map((d) => {
    const base = pidForDraft(d, 1).slice(0, 8);
    seqByKey[base] = (seqByKey[base] ?? 0) + 1;
    return draftToProperty360(d, seqByKey[base]);
  });
}

/** All passports, seeded + onboarded. Reactive to onboarding changes. */
export function useAllProperties360(): Property360[] {
  const drafts = useDrafts();
  return useMemo(() => [...onboardedFrom(drafts), ...allProperties360()], [drafts]);
}

/** Non-reactive read, safe on the server (returns seeded set only there). */
export function allMergedProperties360(): Property360[] {
  return [...onboardedFrom(listDrafts()), ...allProperties360()];
}

export function findMergedProperty360(idOrPid: string): Property360 | undefined {
  return allMergedProperties360().find((p) => p.pid === idOrPid || p.legacyId === idOrPid);
}
