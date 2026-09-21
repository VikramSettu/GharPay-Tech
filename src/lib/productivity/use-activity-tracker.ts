import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useProductivity, IDLE_AFTER_SEC } from "./store";

const TICK_SEC = 5;

/**
 * Global attendance tracker. Mounted once in the app shell.
 *
 * - Every real interaction (click, key, scroll) moves the person's
 *   first/last-action bookends for the day.
 * - Every 5 seconds we add those seconds to the current route as either
 *   ACTIVE (interacted within the last 60s) or IDLE (nothing at all).
 * That's what lets the Productivity board say: day span = lead time +
 * other CRM time + idle time.
 */
export function useActivityTracker(actorId: string, actorName: string) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const markAction = useProductivity((s) => s.markAction);
  const heartbeat = useProductivity((s) => s.heartbeat);

  const lastActive = useRef(Date.now());
  const ref = useRef({ path, actorId, actorName });
  ref.current = { path, actorId, actorName };

  useEffect(() => {
    const onActivity = () => {
      lastActive.current = Date.now();
      markAction(ref.current.actorId, ref.current.actorName);
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    // First paint counts as arriving at work.
    onActivity();
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [markAction]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const idle = (Date.now() - lastActive.current) / 1000 > IDLE_AFTER_SEC;
      const hidden = typeof document !== "undefined" && document.hidden;
      heartbeat({
        actorId: ref.current.actorId,
        actorName: ref.current.actorName,
        path: ref.current.path,
        activeSec: idle || hidden ? 0 : TICK_SEC,
        idleSec: idle || hidden ? TICK_SEC : 0,
      });
    }, TICK_SEC * 1000);
    return () => window.clearInterval(id);
  }, [heartbeat]);
}
