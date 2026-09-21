import { useMemo } from 'react';
import { useOwner } from '@/owner/owner-context';
import { Building2, ShieldCheck, Lock, Camera, Inbox, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoachInline } from '@/components/CoachInline';

export default function OwnersCompare() {
  const { owners, properties, rooms, roomStatuses, media, blocks, complianceFor } = useOwner();

  const data = useMemo(() => {
    return owners.map((o) => {
      const c = complianceFor(o.id);
      const myStatuses = roomStatuses.filter((s) => s.ownerId === o.id);
      const total = myStatuses.length || 1;
      const locked = myStatuses.filter((s) => s.lockedUnsellable).length;
      const verified = myStatuses.filter((s) => s.verifiedToday).length;
      const vacant = myStatuses.filter((s) => s.kind === 'vacant').length;
      const occupied = myStatuses.filter((s) => s.kind === 'occupied').length;
      const myMedia = media.filter((m) => myStatuses.some((s) => s.roomId === m.roomId));
      const myBlocks = blocks.filter((b) => b.ownerId === o.id);
      const pendingBlocks = myBlocks.filter((b) => b.state === 'pending').length;
      const myProps = properties.filter((p) => o.propertyIds.includes(p.id));
      const myRoomsCount = myStatuses.length || rooms.filter((r) => myProps.some((p) => p.id === r.propertyId)).length;
      const lockRate = Math.round((locked / total) * 100);
      const verifyRate = Math.round((verified / total) * 100);
      return {
        owner: o, compliance: c, total: myStatuses.length, locked, verified, vacant, occupied,
        mediaCount: myMedia.length, pendingBlocks, totalBlocks: myBlocks.length,
        myRoomsCount, lockRate, verifyRate,
      };
    }).sort((a, b) => b.compliance.score - a.compliance.score);
  }, [owners, properties, rooms, roomStatuses, media, blocks, complianceFor]);

  const best = data[0];
  const worst = data[data.length - 1];

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">HR · Owner Performance</div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Owners Compare</h1>
          <p className="text-sm text-muted-foreground">
            Side-by-side trust, lock rate, and response across all {owners.length} owners.
          </p>
        </div>
      </header>

      <CoachInline page="owners-compare" />

      {/* Headline cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard label="Top performer" value={best.owner.name} sub={`Trust ${best.compliance.score} · ${best.verifyRate}% verified`} tone="success" />
        <SummaryCard label="Needs help" value={worst.owner.name} sub={`Trust ${worst.compliance.score} · ${worst.lockRate}% locked`} tone="destructive" />
        <SummaryCard
          label="Open requests"
          value={String(data.reduce((a, x) => a + x.pendingBlocks, 0))}
          sub={`across ${data.filter((x) => x.pendingBlocks > 0).length} owners`}
          tone="warning"
        />
      </div>

      {/* Comparison table */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold">Side-by-side</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-3 py-2 font-semibold">Owner</th>
                <th className="text-left px-3 py-2 font-semibold">Tier</th>
                <th className="text-right px-3 py-2 font-semibold">Trust</th>
                <th className="text-right px-3 py-2 font-semibold">Rooms</th>
                <th className="text-right px-3 py-2 font-semibold">Verified</th>
                <th className="text-right px-3 py-2 font-semibold">Locked</th>
                <th className="text-right px-3 py-2 font-semibold">Vacant</th>
                <th className="text-right px-3 py-2 font-semibold">Media</th>
                <th className="text-right px-3 py-2 font-semibold">Pending blocks</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.owner.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{row.owner.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{row.owner.phone}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <TierPill tier={row.compliance.tier} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <span className={cn(
                        "font-mono font-semibold",
                        row.compliance.score >= 90 ? "text-success" : row.compliance.score >= 70 ? "text-info" : "text-destructive",
                      )}>{row.compliance.score}</span>
                      <ScoreBar value={row.compliance.score} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.myRoomsCount}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono">{row.verified}</span>
                    <span className="text-muted-foreground text-[10px]"> · {row.verifyRate}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn("font-mono", row.lockRate > 30 ? "text-destructive" : "")}>{row.locked}</span>
                    <span className="text-muted-foreground text-[10px]"> · {row.lockRate}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.vacant}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.mediaCount}</td>
                  <td className="px-3 py-2.5 text-right">
                    {row.pendingBlocks > 0
                      ? <span className="inline-flex items-center gap-1 text-warning"><Inbox className="h-3 w-3" />{row.pendingBlocks}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cards grid for mobile clarity */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map((row) => (
          <div key={row.owner.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display font-semibold text-sm">{row.owner.name}</div>
                <div className="text-[11px] text-muted-foreground">{row.myRoomsCount} rooms · {row.owner.propertyIds.length} property</div>
              </div>
              <TierPill tier={row.compliance.tier} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat icon={<ShieldCheck className="h-3 w-3" />} label="Trust" value={String(row.compliance.score)} />
              <Stat icon={<Camera className="h-3 w-3" />} label="Verified" value={`${row.verifyRate}%`} />
              <Stat icon={<Lock className="h-3 w-3" />} label="Locked" value={`${row.lockRate}%`} tone={row.lockRate > 30 ? "destructive" : undefined} />
            </div>
            {row.pendingBlocks > 0 && (
              <div className="text-[11px] text-warning inline-flex items-center gap-1">
                <Inbox className="h-3 w-3" /> {row.pendingBlocks} block request{row.pendingBlocks > 1 ? 's' : ''} awaiting decision
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'success' | 'destructive' | 'warning' }) {
  const map = {
    success: 'border-success/30 bg-success/5',
    destructive: 'border-destructive/30 bg-destructive/5',
    warning: 'border-warning/30 bg-warning/5',
  } as const;
  return (
    <div className={cn("rounded-lg border p-4", map[tone])}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className="font-display text-lg font-semibold mt-1">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function TierPill({ tier }: { tier: 'priority' | 'standard' | 'throttled' }) {
  const map = {
    priority: 'bg-success/15 text-success border-success/30',
    standard: 'bg-info/10 text-info border-info/30',
    throttled: 'bg-destructive/10 text-destructive border-destructive/30',
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold", map[tier])}>
      <TrendingUp className="h-2.5 w-2.5" />
      {tier}
    </span>
  );
}

function ScoreBar({ value }: { value: number }) {
  return (
    <span className="inline-block h-1.5 w-12 rounded-full bg-muted overflow-hidden">
      <span
        className={cn(
          "block h-full",
          value >= 90 ? "bg-success" : value >= 70 ? "bg-info" : "bg-destructive",
        )}
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'destructive' }) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-0.5 justify-center">
        {icon}{label}
      </div>
      <div className={cn("font-display font-semibold text-sm mt-0.5", tone === "destructive" && "text-destructive")}>
        {value}
      </div>
    </div>
  );
}
