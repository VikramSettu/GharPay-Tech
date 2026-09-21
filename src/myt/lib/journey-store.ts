import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BlockerId, JourneyId } from '@/myt/lib/journey';

/** Manual overrides on top of the derived journey — set by clicking the chips. */
export type Override = 'on' | 'off';

interface JourneyOverrideState {
  steps: Record<string, Partial<Record<JourneyId, Override>>>;
  blockers: Record<string, Partial<Record<BlockerId, Override>>>;
  toggleStep: (leadId: string, id: JourneyId, derived: boolean) => void;
  toggleBlocker: (leadId: string, id: BlockerId, derived: boolean) => void;
}

export const useJourneyOverrides = create<JourneyOverrideState>()(
  persist(
    (set) => ({
      steps: {},
      blockers: {},
      toggleStep: (leadId, id, derived) =>
        set((s) => {
          const cur = s.steps[leadId]?.[id];
          const effective = cur ? cur === 'on' : derived;
          const next: Override = effective ? 'off' : 'on';
          return { steps: { ...s.steps, [leadId]: { ...(s.steps[leadId] ?? {}), [id]: next } } };
        }),
      toggleBlocker: (leadId, id, derived) =>
        set((s) => {
          const cur = s.blockers[leadId]?.[id];
          const effective = cur ? cur === 'on' : derived;
          const next: Override = effective ? 'off' : 'on';
          return { blockers: { ...s.blockers, [leadId]: { ...(s.blockers[leadId] ?? {}), [id]: next } } };
        }),
    }),
    { name: 'gharpayy-journey-overrides' },
  ),
);

export const applyOverride = (derived: boolean, o?: Override) => (o ? o === 'on' : derived);
