// Activity monitoring store — logs every meaningful CRM action.
// Feeds the /monitoring command center with per-person, per-feature analytics.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RawActivity {
  id: string;
  ts: string;             // ISO
  userId: string;
  userName: string;
  team?: string;
  leadId?: string;
  leadName?: string;
  action: string;         // "lead-added" | "stage-changed" | "quote-sent" | ...
  feature: string;        // button/feature clicked
  stageFrom?: string;
  stageTo?: string;
  durationSec?: number;
  device?: "web" | "mobile";
  remarks?: string;
}

interface MonitoringStore {
  activities: RawActivity[];
  log: (a: Omit<RawActivity, "id" | "ts">) => void;
  clear: () => void;
  activitiesSince: (sinceMs: number) => RawActivity[];
  lastActivityByUser: () => Record<string, string>; // userId → ISO
}

export const useMonitoring = create<MonitoringStore>()(
  persist(
    (set, get) => ({
      activities: [],
      log: (a) => {
        const entry: RawActivity = {
          ...a,
          id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ts: new Date().toISOString(),
        };
        set((s) => ({ activities: [entry, ...s.activities].slice(0, 5000) }));
      },
      clear: () => set({ activities: [] }),
      activitiesSince: (sinceMs) => {
        const cutoff = Date.now() - sinceMs;
        return get().activities.filter((a) => Date.parse(a.ts) >= cutoff);
      },
      lastActivityByUser: () => {
        const out: Record<string, string> = {};
        for (const a of get().activities) {
          if (!out[a.userId]) out[a.userId] = a.ts;
        }
        return out;
      },
    }),
    { name: "gharpayy-monitoring-v1" },
  ),
);

/** Convenience wrapper — call from anywhere in the app to log. */
export function logAction(input: {
  userId: string;
  userName: string;
  team?: string;
  leadId?: string;
  leadName?: string;
  action: string;
  feature: string;
  stageFrom?: string;
  stageTo?: string;
  remarks?: string;
}) {
  useMonitoring.getState().log({ ...input, device: "web" });
}
