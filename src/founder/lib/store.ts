// Generic localStorage-backed store with subscribe/emit, used by all Arena stores.
//
// IMPORTANT: read() must return a STABLE reference between calls when nothing
// has changed. Otherwise useSyncExternalStore's snapshot cache check fails on
// every render and we get an infinite update loop ("getSnapshot should be
// cached"). We cache the parsed value and only re-parse after a write or an
// external storage event.

type Listener = () => void;

export function makeStore<T>(key: string, seed: T) {
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());

  // Cached snapshot for stable identity across reads.
  let cache: T = seed;
  let hydrated = false;

  const loadFromStorage = (): T => {
    if (typeof window === "undefined") return seed;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return seed;
      return JSON.parse(raw) as T;
    } catch {
      return seed;
    }
  };

  const read = (): T => {
    if (typeof window === "undefined") return seed;
    if (!hydrated) {
      cache = loadFromStorage();
      hydrated = true;
    }
    return cache;
  };

  const write = (value: T) => {
    cache = value;
    hydrated = true;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore quota errors
      }
    }
    emit();
  };

  const ensureSeed = () => {
    if (typeof window === "undefined") return;
    try {
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, JSON.stringify(seed));
      }
    } catch {
      // ignore
    }
    cache = loadFromStorage();
    hydrated = true;
    emit();
  };

  // Stable server snapshot for SSR + first client render. Always returns the
  // seed so the server-rendered HTML matches the very first client render,
  // before useEffect-based seed hydration kicks in.
  const getServerSnapshot = (): T => seed;

  const subscribe = (fn: Listener) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  };

  return { read, write, subscribe, ensureSeed, emit, getServerSnapshot };
}
