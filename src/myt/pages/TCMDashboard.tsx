import { useState, useEffect } from 'react';
import { useAppState } from '@/myt/lib/app-context';
import { MetricCard } from '@/myt/components/MetricCard';
import { TourCard } from '@/myt/components/TourCard';
import { CalendarCheck, TrendingUp, FileText, Target } from 'lucide-react';
import { Tour } from '@/myt/lib/types';
import { GlueFeed } from '@/components/GlueFeed';
import { CoachInline } from '@/components/CoachInline';
import { RoleGuaranteePanel } from '@/components/workflow/RoleGuaranteePanel';

const intentRank: Record<Tour['intent'], number> = { hard: 0, medium: 1, soft: 2 };

export default function TCMDashboard() {
  const { tours, setTours, currentMemberId } = useAppState();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const myTours = (currentMemberId
    ? tours.filter(t => t.assignedTo === currentMemberId)
    : tours.filter(t => t.assignedTo === 'm5' || t.assignedTo === 'm6')
  ).filter(t => t.tourDate === today);

  const sortedTours = [...myTours].sort((a, b) => {
    const r = intentRank[a.intent] - intentRank[b.intent];
    return r !== 0 ? r : a.tourTime.localeCompare(b.tourTime);
  });

  const completed = myTours.filter(t => t.status === 'completed').length;
  const showUps = myTours.filter(t => t.showUp === true).length;
  const drafts = myTours.filter(t => t.outcome === 'draft' || t.outcome === 'booked').length;
  const dailyTarget = 10;
  const targetPct = Math.min(100, Math.round((completed / dailyTarget) * 100));

  const updateTour = (tourId: string, updates: Partial<Tour>) => {
    setTours(prev => prev.map(t => t.id === tourId ? { ...t, ...updates } : t));
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-slide-up">
      <CoachInline page="tcm" />
      <div>
        <h1 className="text-xl md:text-2xl font-heading font-bold text-foreground">Tour Conversion Manager</h1>
        <p className="text-xs text-muted-foreground">
          Own scheduled → confirmed → arrived → completed → structured outcome → Closing acceptance.
        </p>
      </div>

      <RoleGuaranteePanel role="tour" />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <MetricCard label="Tours Controlled" value={myTours.length} color="green" icon={<CalendarCheck className="h-4 w-4" />} />
        <MetricCard label="Completed" value={completed} color="green" icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="Show-Up %" value={myTours.length > 0 ? `${Math.round((showUps / myTours.length) * 100)}%` : '0%'} color={showUps / Math.max(1, myTours.length) >= 0.7 ? 'green' : 'red'} />
        <MetricCard label="Outcome / Booking" value={drafts} color="amber" icon={<FileText className="h-4 w-4" />} />
      </div>

      <div className="glass-card p-3 md:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Completed Tour Outcome</span>
          </div>
          <span className="text-xs font-mono tabular-nums text-foreground">{completed} / {dailyTarget}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${targetPct}%` }} />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Do not count raw assigned tours as success. Workflow Guarantee separates upstream tour supply from TCM execution and completed-tour output.</p>
      </div>

      {sortedTours.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground text-sm">
          No tours available today. If the role guarantee shows an input shortage, this is an upstream Flow Ops gap — not a TCM execution miss.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {sortedTours.map(t => (
            <TourCard key={t.id} tour={t} onUpdate={updateTour} />
          ))}
        </div>
      )}
      <GlueFeed limit={20} title="Closed-loop activity · TCM" />
    </div>
  );
}
