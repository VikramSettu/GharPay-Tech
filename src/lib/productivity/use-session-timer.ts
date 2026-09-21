import { useEffect, useRef, useState } from "react";
import { useProductivity, SessionKind, TARGET_SEC } from "./store";

/**
 * Starts a work session while `active` is true and closes it when the surface
 * closes/unmounts. Returns the live elapsed seconds so a 120s timer can render.
 */
export function useSessionTimer(opts: {
  active: boolean;
  kind: SessionKind;
  leadId: string;
  leadName: string;
  actorId: string;
  actorName: string;
  outcome?: string;
}) {
  const { active, kind, leadId, leadName, actorId, actorName, outcome } = opts;
  const start = useProductivity((s) => s.start);
  const end = useProductivity((s) => s.end);
  const idRef = useRef<string | null>(null);
  const outcomeRef = useRef<string | undefined>(outcome);
  outcomeRef.current = outcome;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || !leadId) return;
    idRef.current = start({ kind, leadId, leadName, actorId, actorName });
    setElapsed(0);
    const t0 = Date.now();
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => {
      clearInterval(iv);
      if (idRef.current) end(idRef.current, outcomeRef.current);
      idRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, leadId, kind]);

  return {
    elapsed,
    remaining: Math.max(0, TARGET_SEC - elapsed),
    overTarget: elapsed > TARGET_SEC,
    sessionId: idRef.current,
  };
}
