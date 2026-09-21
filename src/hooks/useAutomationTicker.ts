import { useEffect, useState } from "react";

/** Ticks every intervalMs so consumers re-render for SLA countdowns. */
export function useAutomationTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
