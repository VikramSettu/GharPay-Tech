import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StageBadge, IntentChip, ConfidenceBar } from "@/components/atoms";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays } from "date-fns";
import { ChevronLeft, ChevronRight, Flame, Layers, Phone } from "lucide-react";
import type { Lead, LeadStage } from "@/lib/types";

export type LeadViewMode = "table" | "stack" | "focus" | "board" | "buckets";

const STAGE_ORDER: LeadStage[] = [
  "new",
  "contacted",
  "tour-scheduled",
  "tour-done",
  "negotiation",
  "booked",
  "dropped",
];

const STAGE_MAX_DAYS: Record<string, number> = {
  new: 1,
  contacted: 3,
  "tour-scheduled": 2,
  "tour-done": 2,
  negotiation: 5,
};

export function urgencyScore(lead: Lead) {
  const days = differenceInCalendarDays(new Date(lead.moveInDate), new Date());
  let score = lead.confidence;
  if (lead.intent === "hot") score += 40;
  if (lead.intent === "warm") score += 15;
  if (days <= 0) score += 60;
  else if (days <= 3) score += 40;
  else if (days <= 7) score += 25;
  if (lead.nextFollowUpAt && +new Date(lead.nextFollowUpAt) < Date.now()) score += 50;
  if (!lead.nextFollowUpAt && lead.stage !== "booked" && lead.stage !== "dropped") score += 30;
  if (lead.stage === "booked" || lead.stage === "dropped") score -= 500;
  return score;
}

export function queueReason(lead: Lead): { reason: string; cta: string; level: 1 | 2 | 3 } {
  const moveIn = differenceInCalendarDays(new Date(lead.moveInDate), new Date());
  const stale = differenceInCalendarDays(new Date(), new Date(lead.updatedAt));
  const max = STAGE_MAX_DAYS[lead.stage];
  if (!lead.nextFollowUpAt && lead.stage === "new")
    return { reason: "Never contacted — first call is overdue", cta: "Call now", level: 1 };
  if (lead.nextFollowUpAt && +new Date(lead.nextFollowUpAt) < Date.now())
    return { reason: "Follow-up overdue", cta: "Follow up", level: 1 };
  if (moveIn < 0)
    return {
      reason: `Move-in was ${Math.abs(moveIn)}d ago — close or drop`,
      cta: "Act now",
      level: 1,
    };
  if (moveIn === 0)
    return { reason: "Move-in today — close right now", cta: "Close now", level: 1 };
  if (moveIn === 1) return { reason: "Move-in tomorrow — last chance", cta: "Close now", level: 2 };
  if (max && stale > max)
    return {
      reason: `Stuck in ${lead.stage.replace("-", " ")} for ${stale}d`,
      cta: "Act now",
      level: 2,
    };
  if (!lead.nextFollowUpAt)
    return { reason: "No next step planned", cta: "Plan next step", level: 3 };
  return {
    reason: `Next step ${format(new Date(lead.nextFollowUpAt), "MMM d, p")}`,
    cta: "Open",
    level: 3,
  };
}

const BUCKETS = [
  { key: "missed", label: "🚨 Missed", test: (d: number) => d < 0 },
  { key: "today", label: "🔥 Today", test: (d: number) => d === 0 },
  { key: "tomorrow", label: "⚡ Tomorrow", test: (d: number) => d === 1 },
  { key: "week", label: "📅 This week", test: (d: number) => d > 1 && d <= 7 },
  { key: "fortnight", label: "📆 8–14 days", test: (d: number) => d > 7 && d <= 14 },
  { key: "month", label: "🗓 15–30 days", test: (d: number) => d > 14 && d <= 30 },
  { key: "future", label: "🔭 30+ days", test: (d: number) => d > 30 },
];

function LeadMiniCard({
  lead,
  onOpen,
  reason,
}: {
  lead: Lead;
  onOpen: (id: string) => void;
  reason?: ReturnType<typeof queueReason>;
}) {
  return (
    <button
      onClick={() => onOpen(lead.id)}
      className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{lead.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {lead.preferredArea} · ₹{(lead.budget / 1000).toFixed(0)}k · move-in{" "}
            {format(new Date(lead.moveInDate), "MMM d")}
          </div>
        </div>
        <IntentChip intent={lead.intent} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <StageBadge stage={lead.stage} />
        <ConfidenceBar value={lead.confidence} />
      </div>
      {reason && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-[11px]",
              reason.level === 1
                ? "text-destructive"
                : reason.level === 2
                  ? "text-warning"
                  : "text-muted-foreground",
            )}
          >
            {reason.reason}
          </span>
          <Badge
            variant={reason.level === 1 ? "destructive" : "secondary"}
            className="shrink-0 text-[10px]"
          >
            {reason.cta}
          </Badge>
        </div>
      )}
    </button>
  );
}

export function LeadStackQueue({ leads, onOpen }: { leads: Lead[]; onOpen: (id: string) => void }) {
  const [intentTab, setIntentTab] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const ranked = useMemo(() => {
    const filtered = intentTab === "all" ? leads : leads.filter((l) => l.intent === intentTab);

    return filtered
      .map((l) => ({ lead: l, reason: queueReason(l) }))
      .sort(
        (a, b) => a.reason.level - b.reason.level || urgencyScore(b.lead) - urgencyScore(a.lead),
      );
  }, [leads, intentTab]);

  const paginatedRanked = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return ranked.slice(start, start + itemsPerPage);
  }, [ranked, currentPage]);

  const totalPages = Math.ceil(ranked.length / itemsPerPage);

  const groups = [1, 2, 3].map((level) => ({
    level,
    label: level === 1 ? "Urgent — act now" : level === 2 ? "Today" : "Planned",
    items: paginatedRanked.filter((r) => r.reason.level === level),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {(
            [
              { key: "all", label: "All" },
              { key: "hot", label: "🔥 Hot" },
              { key: "warm", label: "☀️ Warm" },
              { key: "cold", label: "❄️ Cold" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setIntentTab(tab.key as any);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                intentTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.level} className="space-y-2">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.level === 1 && <Flame className="h-3.5 w-3.5 text-destructive" />}
                {g.label} · {g.items.length}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map(({ lead, reason }) => (
                  <LeadMiniCard key={lead.id} lead={lead} onOpen={onOpen} reason={reason} />
                ))}
              </div>
            </section>
          ),
      )}
      {ranked.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Queue clear.
        </div>
      )}
    </div>
  );
}

export function LeadFocusStack({ leads, onOpen }: { leads: Lead[]; onOpen: (id: string) => void }) {
  const ranked = useMemo(
    () =>
      leads
        .map((l) => ({ lead: l, reason: queueReason(l) }))
        .sort(
          (a, b) => a.reason.level - b.reason.level || urgencyScore(b.lead) - urgencyScore(a.lead),
        ),
    [leads],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedRanked = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return ranked.slice(start, start + itemsPerPage);
  }, [ranked, currentPage]);

  const totalPages = Math.ceil(ranked.length / itemsPerPage);

  if (ranked.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        Nothing in the stack.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Showing {paginatedRanked.length} of {ranked.length} leads
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border bg-muted/40">
          <div className="col-span-4">Lead</div>
          <div className="col-span-3">Priority / Intent</div>
          <div className="col-span-3">Reason</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-border">
          {paginatedRanked.map(({ lead, reason }) => (
            <div
              key={lead.id}
              className="grid grid-cols-12 px-4 py-3 items-center hover:bg-accent/5 transition-colors"
            >
              <div className="col-span-4">
                <div className="font-medium text-sm">{lead.name}</div>
                <div className="text-[11px] text-muted-foreground">{lead.phone}</div>
              </div>
              <div className="col-span-3 flex items-center gap-2">
                <IntentChip intent={lead.intent} />
                <ConfidenceBar value={lead.confidence} />
              </div>
              <div className="col-span-3">
                <span
                  className={cn(
                    "text-xs",
                    reason.level === 1 ? "text-destructive font-medium" : "text-muted-foreground",
                  )}
                >
                  {reason.reason}
                </span>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onOpen(lead.id)}
                >
                  View
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onOpen(lead.id)}>
                  {reason.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LeadStageBoard({ leads, onOpen }: { leads: Lead[]; onOpen: (id: string) => void }) {
  const [activeStage, setActiveStage] = useState<LeadStage>("new");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredLeads = useMemo(
    () =>
      leads
        .filter((l) => l.stage === activeStage)
        .sort((a, b) => urgencyScore(b) - urgencyScore(a)),
    [leads, activeStage],
  );

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {STAGE_ORDER.map((stage) => (
            <button
              key={stage}
              onClick={() => {
                setActiveStage(stage);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all capitalize",
                activeStage === stage
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {stage.replace("-", " ")}
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border bg-muted/40">
          <div className="col-span-4">Lead</div>
          <div className="col-span-3">Priority / Intent</div>
          <div className="col-span-3">Details</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-border">
          {paginatedLeads.map((lead) => (
            <div
              key={lead.id}
              className="grid grid-cols-12 px-4 py-3 items-center hover:bg-accent/5 transition-colors"
            >
              <div className="col-span-4">
                <div className="font-medium text-sm">{lead.name}</div>
                <div className="text-[11px] text-muted-foreground">{lead.phone}</div>
              </div>
              <div className="col-span-3 flex items-center gap-2">
                <IntentChip intent={lead.intent} />
                <ConfidenceBar value={lead.confidence} />
              </div>
              <div className="col-span-3">
                <div className="text-xs text-muted-foreground">
                  {lead.preferredArea} · ₹{(lead.budget / 1000).toFixed(0)}k
                </div>
                <div className="text-[10px] text-muted-foreground/70">
                  Move-in: {format(new Date(lead.moveInDate), "MMM d")}
                </div>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onOpen(lead.id)}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No leads in this stage.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LeadMoveInBuckets({
  leads,
  onOpen,
}: {
  leads: Lead[];
  onOpen: (id: string) => void;
}) {
  const [activeBucket, setActiveBucket] = useState(BUCKETS[0].key);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const currentBucket = BUCKETS.find((b) => b.key === activeBucket)!;

  const filteredLeads = useMemo(
    () =>
      leads
        .filter((l) =>
          currentBucket.test(differenceInCalendarDays(new Date(l.moveInDate), new Date())),
        )
        .sort((a, b) => urgencyScore(b) - urgencyScore(a)),
    [leads, activeBucket],
  );

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto">
          {BUCKETS.map((b) => (
            <button
              key={b.key}
              onClick={() => {
                setActiveBucket(b.key);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                activeBucket === b.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border bg-muted/40">
          <div className="col-span-4">Lead</div>
          <div className="col-span-3">Priority / Intent</div>
          <div className="col-span-3">Details</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-border">
          {paginatedLeads.map((lead) => (
            <div
              key={lead.id}
              className="grid grid-cols-12 px-4 py-3 items-center hover:bg-accent/5 transition-colors"
            >
              <div className="col-span-4">
                <div className="font-medium text-sm">{lead.name}</div>
                <div className="text-[11px] text-muted-foreground">{lead.phone}</div>
              </div>
              <div className="col-span-3 flex items-center gap-2">
                <IntentChip intent={lead.intent} />
                <ConfidenceBar value={lead.confidence} />
              </div>
              <div className="col-span-3">
                <div className="text-xs text-muted-foreground">
                  {lead.preferredArea} · ₹{(lead.budget / 1000).toFixed(0)}k
                </div>
                <div className="text-[10px] text-muted-foreground/70">
                  Move-in: {format(new Date(lead.moveInDate), "MMM d")}
                </div>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onOpen(lead.id)}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No leads in this move-in bucket.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
