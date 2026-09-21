import { useEffect, useState } from 'react';
import { glueBus, type GlueEvent } from './event-bus';

export function useGlueEvents(filter?: (e: GlueEvent) => boolean, limit = 50) {
  const [events, setEvents] = useState<GlueEvent[]>([]);
  useEffect(() => {
    setEvents(glueBus.recent(filter, limit));
    const off = glueBus.subscribe(() => {
      setEvents(glueBus.recent(filter, limit));
    });
    return off;
  }, [filter, limit]);
  return events;
}

export function useGlueSubscribe(handler: (e: GlueEvent) => void) {
  useEffect(() => glueBus.subscribe(handler), [handler]);
}
