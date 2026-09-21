// Productivity store — tracks time spent per lead, per surface (drawer, claim
// flow, call ladder). Every session has a 120s target; anything longer is
// flagged as "over target" so leadership can see where time leaks.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const TARGET_SEC = 120;

export type SessionKind = "drawer" | "claim" | "call" | "followup";

export interface WorkSession {
  id: string;
  kind: SessionKind;
  leadId: string;
  leadName: string;
  actorId: string;
  actorName: string;
  startedAt: string;   // ISO
  endedAt?: string;    // ISO
  durationSec: number;
  overTarget: boolean;
  outcome?: string;    // what happened at the end
}

/** How long without a click/keypress/scroll before we call it idle. */
export const IDLE_AFTER_SEC = 60;

/** Time parked on one page/route, split into active vs idle seconds. */
export interface PageStint {
  id: string;
  actorId: string;
  actorName: string;
  path: string;
  day: string;        // YYYY-MM-DD
  startedAt: string;  // ISO — first time they landed here today
  lastAt: string;     // ISO — most recent heartbeat
  activeSec: number;
  idleSec: number;
}

/** First / last action of the day per person — the bookends of the workday. */
export interface DayMarks {
  actorId: string;
  actorName: string;
  day: string;
  firstActionAt: string;
  lastActionAt: string;
}

interface State {
  sessions: WorkSession[];
  pages: PageStint[];
  marks: DayMarks[];
  start: (s: Omit<WorkSession, "id" | "startedAt" | "durationSec" | "overTarget" | "endedAt">) => string;
  end: (id: string, outcome?: string) => void;
  note: (id: string, outcome: string) => void;
  /** Called on every real interaction — moves the day bookends. */
  markAction: (actorId: string, actorName: string) => void;
  /** Called by the ticker — adds active or idle seconds to the current page. */
  heartbeat: (a: { actorId: string; actorName: string; path: string; activeSec: number; idleSec: number }) => void;
  clear: () => void;
}

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;


export const useProductivity = create<State>()(
  persist(
    (set, get) => ({
      sessions: [],
      pages: [],
      marks: [],
      start: (s) => {
        const id = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const entry: WorkSession = {
          ...s,
          id,
          startedAt: new Date().toISOString(),
          durationSec: 0,
          overTarget: false,
        };
        set((st) => ({ sessions: [entry, ...st.sessions].slice(0, 4000) }));
        return id;
      },
      end: (id, outcome) => {
        set((st) => ({
          sessions: st.sessions.map((x) => {
            if (x.id !== id || x.endedAt) return x;
            const dur = Math.max(1, Math.round((Date.now() - Date.parse(x.startedAt)) / 1000));
            return {
              ...x,
              endedAt: new Date().toISOString(),
              durationSec: dur,
              overTarget: dur > TARGET_SEC,
              outcome: outcome ?? x.outcome,
            };
          }),
        }));
      },
      note: (id, outcome) =>
        set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? { ...x, outcome } : x)) })),
      markAction: (actorId, actorName) => {
        const now = new Date().toISOString();
        const day = dayKey();
        set((st) => {
          const i = st.marks.findIndex((m) => m.actorId === actorId && m.day === day);
          if (i === -1) {
            return { marks: [...st.marks, { actorId, actorName, day, firstActionAt: now, lastActionAt: now }] };
          }
          const marks = st.marks.slice();
          marks[i] = { ...marks[i], actorName, lastActionAt: now };
          return { marks };
        });
      },
      heartbeat: ({ actorId, actorName, path, activeSec, idleSec }) => {
        if (activeSec <= 0 && idleSec <= 0) return;
        const now = new Date().toISOString();
        const day = dayKey();
        set((st) => {
          const i = st.pages.findIndex((p) => p.actorId === actorId && p.day === day && p.path === path);
          if (i === -1) {
            const entry: PageStint = {
              id: `pg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              actorId, actorName, path, day, startedAt: now, lastAt: now, activeSec, idleSec,
            };
            return { pages: [...st.pages, entry].slice(-2000) };
          }
          const pages = st.pages.slice();
          const cur = pages[i]!;
          pages[i] = {
            ...cur, actorName, lastAt: now,
            activeSec: cur.activeSec + activeSec,
            idleSec: cur.idleSec + idleSec,
          };
          return { pages };
        });
      },
      clear: () => set({ sessions: [], pages: [], marks: [] }),
    }),
    { name: "gharpayy-productivity-v1" },
  ),
);

export { dayKey };

/** Human label for a route path. */
export function pageLabel(path: string) {
  if (path === "/" || path === "") return "Home";
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .join(" › ");
}

export interface DayBreakdown {
  actorId: string;
  actorName: string;
  firstActionAt?: string;
  lastActionAt?: string;
  spanSec: number;      // last action − first action
  leadSec: number;      // measured inside lead drawers / claim / call flows
  idleSec: number;      // on a page, but no click/typing/scroll
  otherSec: number;     // active in the CRM but not on a lead
  unaccountedSec: number; // span not covered by any of the above (app closed / away)
  pages: { path: string; label: string; activeSec: number; idleSec: number }[];
}

/**
 * Full picture of a person's day: when they started, when they stopped, how much
 * of that window went into leads, into other CRM pages, and how much was idle.
 */
export function dayBreakdown(
  sessions: WorkSession[],
  pages: PageStint[],
  marks: DayMarks[],
): DayBreakdown[] {
  const ids = new Set<string>([
    ...sessions.map((s) => s.actorId),
    ...pages.map((p) => p.actorId),
    ...marks.map((m) => m.actorId),
  ]);
  const out: DayBreakdown[] = [];
  for (const id of ids) {
    const mine = marks.filter((m) => m.actorId === id);
    const myPages = pages.filter((p) => p.actorId === id);
    const mySessions = sessions.filter((s) => s.actorId === id);
    const name =
      mine[0]?.actorName ?? myPages[0]?.actorName ?? mySessions[0]?.actorName ?? id;

    const firsts = mine.map((m) => Date.parse(m.firstActionAt));
    const lasts = mine.map((m) => Date.parse(m.lastActionAt));
    const first = firsts.length ? Math.min(...firsts) : undefined;
    const last = lasts.length ? Math.max(...lasts) : undefined;
    const spanSec = first && last ? Math.max(0, Math.round((last - first) / 1000)) : 0;

    const leadSec = mySessions.reduce((a, s) => a + s.durationSec, 0);
    const idleSec = myPages.reduce((a, p) => a + p.idleSec, 0);
    const activeSec = myPages.reduce((a, p) => a + p.activeSec, 0);
    const otherSec = Math.max(0, activeSec - leadSec);
    const unaccountedSec = Math.max(0, spanSec - leadSec - idleSec - otherSec);

    out.push({
      actorId: id,
      actorName: name,
      firstActionAt: first ? new Date(first).toISOString() : undefined,
      lastActionAt: last ? new Date(last).toISOString() : undefined,
      spanSec, leadSec, idleSec, otherSec, unaccountedSec,
      pages: myPages
        .map((p) => ({ path: p.path, label: pageLabel(p.path), activeSec: p.activeSec, idleSec: p.idleSec }))
        .sort((a, b) => b.activeSec + b.idleSec - (a.activeSec + a.idleSec)),
    });
  }
  return out.sort((a, b) => b.spanSec - a.spanSec);
}

export function isSameDay(iso: string, day: Date) {
  const d = new Date(iso);
  return d.toDateString() === day.toDateString();
}

export function fmtDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export interface PersonRollup {
  actorId: string;
  actorName: string;
  sessions: number;
  leads: number;
  totalSec: number;
  avgSec: number;
  overTarget: number;
  byKind: Record<SessionKind, number>;
}

export function rollupByPerson(sessions: WorkSession[]): PersonRollup[] {
  const map = new Map<string, PersonRollup>();
  const leadSets = new Map<string, Set<string>>();
  for (const s of sessions) {
    let r = map.get(s.actorId);
    if (!r) {
      r = {
        actorId: s.actorId, actorName: s.actorName, sessions: 0, leads: 0,
        totalSec: 0, avgSec: 0, overTarget: 0,
        byKind: { drawer: 0, claim: 0, call: 0, followup: 0 },
      };
      map.set(s.actorId, r);
      leadSets.set(s.actorId, new Set());
    }
    r.sessions += 1;
    r.totalSec += s.durationSec;
    if (s.overTarget) r.overTarget += 1;
    r.byKind[s.kind] += s.durationSec;
    leadSets.get(s.actorId)!.add(s.leadId);
  }
  return [...map.values()]
    .map((r) => ({ ...r, leads: leadSets.get(r.actorId)!.size, avgSec: r.sessions ? Math.round(r.totalSec / r.sessions) : 0 }))
    .sort((a, b) => b.totalSec - a.totalSec);
}

export interface LeadRollup {
  leadId: string;
  leadName: string;
  sessions: number;
  totalSec: number;
  lastAt: string;
  people: string[];
  outcomes: string[];
}

export function rollupByLead(sessions: WorkSession[]): LeadRollup[] {
  const map = new Map<string, LeadRollup & { _people: Set<string> }>();
  for (const s of sessions) {
    let r = map.get(s.leadId);
    if (!r) {
      r = { leadId: s.leadId, leadName: s.leadName, sessions: 0, totalSec: 0, lastAt: s.startedAt, people: [], outcomes: [], _people: new Set() };
      map.set(s.leadId, r);
    }
    r.sessions += 1;
    r.totalSec += s.durationSec;
    if (Date.parse(s.startedAt) > Date.parse(r.lastAt)) r.lastAt = s.startedAt;
    r._people.add(s.actorName);
    if (s.outcome) r.outcomes.push(s.outcome);
  }
  return [...map.values()]
    .map(({ _people, ...r }) => ({ ...r, people: [..._people] }))
    .sort((a, b) => b.totalSec - a.totalSec);
}

/** Productive = enough leads touched, most sessions inside the 120s target. */
export function productivityScore(r: PersonRollup) {
  const focus = r.sessions ? 1 - r.overTarget / r.sessions : 0;
  const volume = Math.min(1, r.leads / 15);
  const score = Math.round((focus * 0.55 + volume * 0.45) * 100);
  const verdict = score >= 70 ? "Productive" : score >= 45 ? "Mixed" : "Needs focus";
  return { score, verdict };
}
