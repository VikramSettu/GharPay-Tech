import { useAppState } from '@/myt/lib/app-context';
import { StatusBadge, OutcomeBadge } from '@/myt/components/StatusBadge';
import { useState } from 'react';
import { TourStatus, TourOutcome } from '@/myt/lib/types';
import { Link } from '@/shims/react-router-dom';
import { MessageSquare } from 'lucide-react';

export default function AllTours() {
  const { tours } = useAppState();
  const [statusFilter, setStatusFilter] = useState<TourStatus | 'all'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<TourOutcome | 'all'>('all');

  const filtered = tours.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (outcomeFilter !== 'all' && t.outcome !== outcomeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 md:space-y-6 animate-slide-up">
      <h1 className="text-xl md:text-2xl font-heading font-bold text-foreground">All Tours</h1>

      <div className="flex gap-2 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="no-show">No Show</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={outcomeFilter ?? 'all'} onChange={e => setOutcomeFilter(e.target.value === 'all' ? 'all' : e.target.value as TourOutcome)} className="bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
          <option value="all">All Outcomes</option>
          <option value="draft">Draft</option>
          <option value="follow-up">Follow-up</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.slice(0, 30).map(t => (
          <Link to={`/myt/tour/${t.id}`} key={t.id} className="block glass-card p-3 space-y-1.5 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground text-sm">{t.leadName}</span>
              <span className="text-xs text-muted-foreground">{t.tourTime}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t.propertyName} · {t.area}</p>
            <p className="text-[10px] text-muted-foreground">TCM: {t.assignedToName} · By: {t.scheduledByName}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={t.status} />
              {t.showUp !== null && <span className="text-xs">{t.showUp ? '✅' : '❌'}</span>}
              <OutcomeBadge outcome={t.outcome} />
              <span className="text-[10px] text-muted-foreground capitalize">{t.bookingSource}</span>
              <span className="ml-auto text-[10px] text-primary inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Open</span>
            </div>
            {t.remarks && <p className="text-[10px] text-muted-foreground italic">"{t.remarks}"</p>}
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground bg-surface-2/50">
                <th className="text-left py-3 px-4 font-medium">Time</th>
                <th className="text-left py-3 px-2 font-medium">Lead</th>
                <th className="text-left py-3 px-2 font-medium">Property</th>
                <th className="text-left py-3 px-2 font-medium">Area</th>
                <th className="text-left py-3 px-2 font-medium">TCM</th>
                <th className="text-left py-3 px-2 font-medium">Source</th>
                <th className="text-left py-3 px-2 font-medium">Status</th>
                <th className="text-left py-3 px-2 font-medium">Show</th>
                <th className="text-left py-3 px-2 font-medium">Outcome</th>
                <th className="text-left py-3 px-2 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="py-2 px-4 text-muted-foreground">{t.tourTime}</td>
                  <td className="py-2 px-2 font-medium text-foreground">
                    <Link to={`/myt/tour/${t.id}`} className="hover:text-primary inline-flex items-center gap-1">
                      {t.leadName} <MessageSquare className="h-3 w-3 opacity-60" />
                    </Link>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{t.propertyName}</td>
                  <td className="py-2 px-2 text-muted-foreground">{t.area}</td>
                  <td className="py-2 px-2 text-muted-foreground">{t.assignedToName}</td>
                  <td className="py-2 px-2 text-muted-foreground capitalize">{t.bookingSource}</td>
                  <td className="py-2 px-2"><StatusBadge status={t.status} /></td>
                  <td className="py-2 px-2">{t.showUp === true ? '✅' : t.showUp === false ? '❌' : '—'}</td>
                  <td className="py-2 px-2"><OutcomeBadge outcome={t.outcome} /></td>
                  <td className="py-2 px-2 text-muted-foreground text-xs max-w-[120px] truncate">{t.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
