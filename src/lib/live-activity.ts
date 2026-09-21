// Live Activity — Wispr Flow-style live indicators for calls & WhatsApp chats.
// Users toggle auto-tracking on/off (like a mic button); when ON, starting a
// call or opening WhatsApp auto-registers a live session that shows in the
// dock and timeline. Missed/ended sessions stay visible as "recent".
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Channel = "call" | "chat";
export type SessionState = "live" | "ended" | "missed";

export interface LiveSession {
  id: string;
  leadId: string;
  leadName: string;
  channel: Channel;
  actorId: string;
  actorName: string;
  startedAt: number;
  endedAt?: number;
  state: SessionState;
  note?: string;
}

export interface CoworkClaim {
  id: string;
  leadId: string;
  claimerId: string;
  claimerName: string;
  primaryOwnerName: string;
  reason: string;
  ts: number;
  state: "active" | "released" | "handed-off";
}

interface LiveActivityStore {
  autoTrack: Record<Channel, boolean>;
  sessions: LiveSession[];
  claims: CoworkClaim[];
  toggleAutoTrack: (c: Channel) => void;
  setAutoTrack: (c: Channel, on: boolean) => void;
  startSession: (input: Omit<LiveSession, "id" | "startedAt" | "state">) => LiveSession;
  endSession: (id: string, note?: string) => void;
  markMissed: (id: string) => void;
  clearEnded: () => void;
  claimCowork: (input: Omit<CoworkClaim, "id" | "ts" | "state">) => CoworkClaim;
  releaseClaim: (id: string) => void;
  handoffClaim: (id: string) => void;
  activeSessions: () => LiveSession[];
  recentSessions: (limit?: number) => LiveSession[];
}

const uid = () => `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useLiveActivity = create<LiveActivityStore>()(
  persist(
    (set, get) => ({
      autoTrack: { call: true, chat: true },
      sessions: [],
      claims: [],
      toggleAutoTrack: (c) =>
        set((s) => ({ autoTrack: { ...s.autoTrack, [c]: !s.autoTrack[c] } })),
      setAutoTrack: (c, on) =>
        set((s) => ({ autoTrack: { ...s.autoTrack, [c]: on } })),
      startSession: (input) => {
        const sess: LiveSession = {
          ...input,
          id: uid(),
          startedAt: Date.now(),
          state: "live",
        };
        set((s) => ({ sessions: [sess, ...s.sessions].slice(0, 200) }));
        return sess;
      },
      endSession: (id, note) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id ? { ...x, endedAt: Date.now(), state: "ended", note: note ?? x.note } : x,
          ),
        })),
      markMissed: (id) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id ? { ...x, endedAt: Date.now(), state: "missed" } : x,
          ),
        })),
      clearEnded: () =>
        set((s) => ({ sessions: s.sessions.filter((x) => x.state === "live") })),
      claimCowork: (input) => {
        const c: CoworkClaim = { ...input, id: uid(), ts: Date.now(), state: "active" };
        set((s) => ({ claims: [c, ...s.claims].slice(0, 100) }));
        return c;
      },
      releaseClaim: (id) =>
        set((s) => ({
          claims: s.claims.map((c) => (c.id === id ? { ...c, state: "released" } : c)),
        })),
      handoffClaim: (id) =>
        set((s) => ({
          claims: s.claims.map((c) => (c.id === id ? { ...c, state: "handed-off" } : c)),
        })),
      activeSessions: () => get().sessions.filter((s) => s.state === "live"),
      recentSessions: (limit = 8) => get().sessions.slice(0, limit),
    }),
    { name: "live-activity-v1" },
  ),
);

/** Convenience: begin a live session unless auto-track is off for that channel. */
export function beginLiveIfEnabled(input: Omit<LiveSession, "id" | "startedAt" | "state">) {
  const st = useLiveActivity.getState();
  if (!st.autoTrack[input.channel]) return null;
  return st.startSession(input);
}
