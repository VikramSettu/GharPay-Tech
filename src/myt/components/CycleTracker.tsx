import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Target, PhoneCall, Check, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

type MetricKey = 'chatsClosed' | 'mytLeads' | 'toursScheduled' | 'sameDayConfirmed';

export type CycleRow = {
  cycleNumber: number;
  chatsClosed: number;
  mytLeads: number;
  toursScheduled: number;
  sameDayConfirmed: number;
};

type CallLog = {
  id: string;
  cycle: number;
  name: string;
  phone: string;
  city: string;
  area: string;
  budget: string;
  movingDate: string;
  shortlist: string;
  property: string;
  sharing: string;
  outcome: OutcomeKey;
  notes: string;
  at: number;
};

const CITIES = ['Bangalore', 'Hyderabad', 'Pune', 'Delhi NCR', 'Mumbai'];
const SHARING = ['Single', 'Double', 'Triple', 'Four+'];


const CYCLE_TARGETS: Record<MetricKey, number> = {
  chatsClosed: 30,
  mytLeads: 10,
  toursScheduled: 4,
  sameDayConfirmed: 2,
};

const CYCLES = [
  { n: 1, label: 'C1', window: '09:00 – 10:30' },
  { n: 2, label: 'C2', window: '10:30 – 12:00' },
  { n: 3, label: 'C3', window: '12:00 – 14:30' },
  { n: 4, label: 'C4', window: '14:30 – 17:00' },
  { n: 5, label: 'C5', window: '17:00 – 19:30' },
];

const OUTCOMES = [
  { key: 'connected', label: 'Connected & qualified', effects: ['chatsClosed'] as MetricKey[] },
  { key: 'myt', label: 'MYT lead created', effects: ['chatsClosed', 'mytLeads'] as MetricKey[] },
  { key: 'tour', label: 'Tour scheduled', effects: ['chatsClosed', 'mytLeads', 'toursScheduled'] as MetricKey[] },
  { key: 'sameday', label: 'Same-day confirmed', effects: ['chatsClosed', 'mytLeads', 'toursScheduled', 'sameDayConfirmed'] as MetricKey[] },
  { key: 'callback', label: 'Callback requested', effects: [] as MetricKey[] },
  { key: 'noanswer', label: 'No answer', effects: [] as MetricKey[] },
  { key: 'notinterested', label: 'Not interested', effects: [] as MetricKey[] },
] as const;

type OutcomeKey = (typeof OUTCOMES)[number]['key'];

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'chatsClosed', label: 'Chats Closed' },
  { key: 'mytLeads', label: 'MYT Leads' },
  { key: 'toursScheduled', label: 'Tours Scheduled' },
  { key: 'sameDayConfirmed', label: 'Same-Day' },
];

const emptyCycles = (): CycleRow[] =>
  CYCLES.map(c => ({ cycleNumber: c.n, chatsClosed: 0, mytLeads: 0, toursScheduled: 0, sameDayConfirmed: 0 }));

export function CycleTracker() {
  const [cycles, setCycles] = useState<CycleRow[]>(emptyCycles);
  const [activeCycle, setActiveCycle] = useState(0);
  const [logs, setLogs] = useState<CallLog[]>([]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Bangalore');
  const [area, setArea] = useState('');
  const [budget, setBudget] = useState('');
  const [movingDate, setMovingDate] = useState('');
  const [shortlist, setShortlist] = useState('');
  const [property, setProperty] = useState('');
  const [sharing, setSharing] = useState('Double');
  const [outcome, setOutcome] = useState<OutcomeKey>('connected');
  const [notes, setNotes] = useState('');
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

  const updateCycle = (field: MetricKey, delta: number) => {
    setCycles(prev => prev.map((c, i) => (i === activeCycle ? { ...c, [field]: Math.max(0, c[field] + delta) } : c)));
  };

  const submitCall = () => {
    const def = OUTCOMES.find(o => o.key === outcome)!;
    const log: CallLog = {
      id: `${Date.now()}`,
      cycle: CYCLES[activeCycle].n,
      name: name.trim() || 'Unknown lead',
      phone: phone.trim(),
      city,
      area: area.trim(),
      budget: budget.trim(),
      movingDate,
      shortlist: shortlist.trim(),
      property: property.trim(),
      sharing,
      outcome,
      notes: notes.trim(),
      at: Date.now(),
    };
    setLogs(prev => [log, ...prev]);
    setCycles(prev =>
      prev.map((c, i) => {
        if (i !== activeCycle) return c;
        const next = { ...c };
        def.effects.forEach(k => { next[k] = next[k] + 1; });
        return next;
      }),
    );
    toast.success(`Call logged to ${CYCLES[activeCycle].label} — ${def.label}`);
    setName(''); setPhone(''); setNotes(''); setOutcome('connected');
    setArea(''); setBudget(''); setMovingDate(''); setShortlist(''); setProperty('');
    setOpen(false);
  };


  const removeLog = (id: string) => setLogs(prev => prev.filter(l => l.id !== id));

  const dailyTotals = useMemo(
    () =>
      cycles.reduce(
        (acc, c) => ({
          chatsClosed: acc.chatsClosed + c.chatsClosed,
          mytLeads: acc.mytLeads + c.mytLeads,
          toursScheduled: acc.toursScheduled + c.toursScheduled,
          sameDayConfirmed: acc.sameDayConfirmed + c.sameDayConfirmed,
        }),
        { chatsClosed: 0, mytLeads: 0, toursScheduled: 0, sameDayConfirmed: 0 },
      ),
    [cycles],
  );

  const cycleLogs = logs.filter(l => l.cycle === CYCLES[activeCycle].n);
  const cur = cycles[activeCycle];
  const cycleScore = Math.round(
    (METRICS.reduce((s, m) => s + Math.min(1, cur[m.key] / CYCLE_TARGETS[m.key]), 0) / METRICS.length) * 100,
  );

  return (
    <div className="glass-card p-3 md:p-5">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-xs md:text-sm text-foreground">Cycle Tracker · C1–C5</h3>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 h-8">
              <PhoneCall className="h-3.5 w-3.5" /> Log call
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Fill data over call · {CYCLES[activeCycle].label}</DialogTitle>
              <DialogDescription>
                Log the outcome while you're on the call — cycle counters update automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Lead name" value={name} onChange={e => setName(e.target.value)} />
                <Input placeholder="Phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">City</p>
                <div className="flex flex-wrap gap-1.5">
                  {CITIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-[11px] transition-colors',
                        city === c
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-surface-2/40 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Preferred area</p>
                  <Input placeholder="e.g. Hebbal" value={area} onChange={e => setArea(e.target.value)} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Budget (₹/month)</p>
                  <Input placeholder="e.g. 12000" inputMode="numeric" value={budget} onChange={e => setBudget(e.target.value)} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Moving date</p>
                  <Input type="date" value={movingDate} onChange={e => setMovingDate(e.target.value)} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Shortlist (count)</p>
                  <Input placeholder="e.g. 3" inputMode="numeric" value={shortlist} onChange={e => setShortlist(e.target.value)} />
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Which property</p>
                <Input placeholder="Property name shown / discussed" value={property} onChange={e => setProperty(e.target.value)} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">Sharing</p>
                <div className="flex flex-wrap gap-1.5">
                  {SHARING.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSharing(s)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-[11px] transition-colors',
                        sharing === s
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-surface-2/40 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">Call outcome</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {OUTCOMES.map(o => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setOutcome(o.key)}
                      className={cn(
                        'flex items-center justify-between rounded-md border px-3 py-2 text-xs transition-colors text-left',
                        outcome === o.key
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-surface-2/40 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span>{o.label}</span>
                      {o.effects.length > 0 ? (
                        <span className="text-[10px] text-muted-foreground">+{o.effects.length} metric{o.effects.length > 1 ? 's' : ''}</span>
                      ) : (
                        outcome === o.key && <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea placeholder="Notes (area, budget, move-in date…)" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={submitCall}>Save to {CYCLES[activeCycle].label}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-5 gap-1 mb-4">
        {CYCLES.map((c, i) => {
          const row = cycles[i];
          const score = Math.round(
            (METRICS.reduce((s, m) => s + Math.min(1, row[m.key] / CYCLE_TARGETS[m.key]), 0) / METRICS.length) * 100,
          );
          return (
            <button
              key={c.n}
              onClick={() => setActiveCycle(i)}
              className={cn(
                'rounded-md px-1 py-1.5 transition-colors border',
                activeCycle === i
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface-2 text-muted-foreground border-transparent hover:text-foreground',
              )}
            >
              <span className="block text-xs font-semibold">{c.label}</span>
              <span className="block text-[9px] opacity-80">{score}%</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {CYCLES[activeCycle].window}</span>
        <span>Cycle health <strong className="text-foreground">{cycleScore}%</strong> · {cycleLogs.length} call{cycleLogs.length === 1 ? '' : 's'} logged</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {METRICS.map(item => {
          const val = cur[item.key];
          const target = CYCLE_TARGETS[item.key];
          const pct = Math.min(100, Math.round((val / target) * 100));
          return (
            <div key={item.key} className="bg-surface-2/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{val}/{target}</span>
              </div>
              <div className="h-1.5 bg-surface-3 rounded-full mb-2">
                <div
                  className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-success' : pct >= 50 ? 'bg-primary' : 'bg-warning')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => updateCycle(item.key, -1)} className="h-7 w-7 p-0 text-xs">−</Button>
                <span className="text-lg font-heading font-bold text-foreground w-8 text-center">{val}</span>
                <Button size="sm" variant="ghost" onClick={() => updateCycle(item.key, 1)} className="h-7 w-7 p-0 text-xs">+</Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground mb-2">Calls logged in {CYCLES[activeCycle].label}</p>
        {cycleLogs.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No calls logged yet — use “Log call” to fill data live during the call.</p>
        ) : (
          <div className="space-y-1.5">
            {cycleLogs.map(l => (
              <div key={l.id} onClick={() => setSelectedLog(l)} className="flex items-start justify-between gap-2 rounded-md bg-surface-2/50 px-2.5 py-1.5 cursor-pointer hover:bg-surface-2/80 transition-colors">
                <div className="min-w-0">
                  <div className="text-xs text-foreground truncate">
                    {l.name}{l.phone && <span className="text-muted-foreground"> · {l.phone}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {OUTCOMES.find(o => o.key === l.outcome)?.label}
                    {l.notes && ` · ${l.notes}`}
                  </div>
                  {(() => {
                    const chips = [
                      l.city && { k: 'City', v: l.city },
                      l.area && { k: 'Area', v: l.area },
                      l.budget && { k: 'Budget', v: `₹${l.budget}` },
                      l.movingDate && { k: 'Moving', v: l.movingDate },
                      l.shortlist && { k: 'Shortlist', v: l.shortlist },
                      l.property && { k: 'Property', v: l.property },
                      l.sharing && { k: 'Sharing', v: l.sharing },
                    ].filter(Boolean) as { k: string; v: string }[];
                    const missing = ['Area', 'Budget', 'Moving', 'Sharing'].filter(
                      k => !chips.some(c => c.k === k),
                    );
                    return (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {chips.map(c => (
                          <span key={c.k} className="rounded bg-surface-3/70 px-1.5 py-0.5 text-[10px] text-foreground">
                            <span className="text-muted-foreground">{c.k} </span>{c.v}
                          </span>
                        ))}
                        {missing.length > 0 && (
                          <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">
                            Missing: {missing.join(', ')}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={e => { e.stopPropagation(); removeLog(l.id); }}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={selectedLog !== null} onOpenChange={open => !open && setSelectedLog(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Call details · {selectedLog?.name ?? 'Unknown lead'}</SheetTitle>
            <SheetDescription>
              {selectedLog ? (
                <>
                  {OUTCOMES.find(o => o.key === selectedLog.outcome)?.label} · {CYCLES.find(c => c.n === selectedLog.cycle)?.label}
                </>
              ) : '—'}
            </SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className="space-y-4 mt-5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-2/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Phone</p>
                  <p className="text-foreground">{selectedLog.phone || '—'}</p>
                </div>
                <div className="bg-surface-2/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">City</p>
                  <p className="text-foreground">{selectedLog.city || '—'}</p>
                </div>
                <div className="bg-surface-2/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Preferred area</p>
                  <p className="text-foreground">{selectedLog.area || '—'}</p>
                </div>
                <div className="bg-surface-2/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Budget</p>
                  <p className="text-foreground">{selectedLog.budget ? `₹${selectedLog.budget}` : '—'}</p>
                </div>
                <div className="bg-surface-2/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Moving date</p>
                  <p className="text-foreground">{selectedLog.movingDate || '—'}</p>
                </div>
                <div className="bg-surface-2/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Shortlist</p>
                  <p className="text-foreground">{selectedLog.shortlist || '—'}</p>
                </div>
              </div>
              <div className="bg-surface-2/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Property discussed</p>
                <p className="text-foreground">{selectedLog.property || '—'}</p>
              </div>
              <div className="bg-surface-2/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Sharing</p>
                <p className="text-foreground">{selectedLog.sharing || '—'}</p>
              </div>
              {selectedLog.notes && (
                <div className="bg-surface-2/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Notes</p>
                  <p className="text-foreground whitespace-pre-wrap">{selectedLog.notes}</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Logged at {new Date(selectedLog.at).toLocaleString()}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground mb-1">Day totals across C1–C5</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-foreground"><strong>{dailyTotals.chatsClosed}</strong>/150 chats</span>
          <span className="text-foreground"><strong>{dailyTotals.mytLeads}</strong>/50 MYT</span>
          <span className="text-foreground"><strong>{dailyTotals.toursScheduled}</strong>/20 tours</span>
          <span className="text-foreground"><strong>{dailyTotals.sameDayConfirmed}</strong>/10 same-day</span>
        </div>
      </div>
    </div>
  );
}
