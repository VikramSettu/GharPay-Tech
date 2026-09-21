import { useEffect, useState } from 'react';

/** SSR-safe countdown — renders em-dash until mounted to avoid hydration mismatch. */
export function Countdown({ to, prefix = '', urgentBelowMs = 5 * 60 * 1000 }: { to: string; prefix?: string; urgentBelowMs?: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <span className="font-mono tabular-nums">—</span>;
  const diff = Date.parse(to) - now;
  if (diff <= 0) return <span className="font-mono tabular-nums text-destructive">{prefix}expired</span>;
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const txt = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
  const urgent = diff < urgentBelowMs;
  return <span className={`font-mono tabular-nums ${urgent ? 'text-destructive font-medium' : ''}`}>{prefix}{txt}</span>;
}
