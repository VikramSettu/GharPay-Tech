import { useOwner } from '@/owner/owner-context';
import { Button } from '@/components/ui/button';
import { Clock, Check, X } from 'lucide-react';
import { useMountedNow } from '@/hooks/use-now';
import { toast } from 'sonner';

export function OwnerBlocks() {
  const { currentOwnerId, blocks, decideBlock } = useOwner();
  const [now, mounted] = useMountedNow(5_000);
  const my = blocks.filter((b) => b.ownerId === currentOwnerId);
  const pending = my.filter((b) => b.state === 'pending');
  const decided = my.filter((b) => b.state !== 'pending');

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-semibold">Block requests · 15-min response</h1>
        <p className="text-sm text-muted-foreground">High-intent leads waiting for your approval. Auto-released after 15 min.</p>
      </header>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Pending ({pending.length})</h2>
        <div className="space-y-2">
          {pending.map((b) => {
            const remaining = mounted ? new Date(b.expiresAt).getTime() - now : 0;
            const minsLeft = Math.max(0, Math.floor(remaining / 60000));
            const secsLeft = Math.max(0, Math.floor((remaining % 60000) / 1000));
            const urgent = remaining < 5 * 60 * 1000;
            return (
              <div key={b.id} className={`rounded-xl border p-3 ${urgent ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{b.leadName}</div>
                    <div className="text-[11px] text-muted-foreground">Room {b.roomId} · intent <span className="font-medium capitalize">{b.intent}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono inline-flex items-center gap-1 ${urgent ? 'text-destructive' : 'text-muted-foreground'}`}>
                      <Clock className="h-3 w-3" />
                      {mounted ? `${minsLeft}:${String(secsLeft).padStart(2, '0')}` : '—:—'}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => { decideBlock(b.id, 'rejected'); toast('Block rejected'); }}>
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => { decideBlock(b.id, 'approved'); toast.success('Block approved · TCM notified'); }}>
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {pending.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Inbox zero — no pending blocks.
            </div>
          )}
        </div>
      </section>

      {decided.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Recent ({decided.length})</h2>
          <div className="space-y-1">
            {decided.slice(0, 8).map((b) => (
              <div key={b.id} className="rounded-md border border-border bg-card px-3 py-2 text-xs flex items-center justify-between">
                <span>{b.leadName} · room {b.roomId}</span>
                <span className={`font-medium ${b.state === 'approved' ? 'text-success' : b.state === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {b.state.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
