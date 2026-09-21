import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { ConfidenceBar, IntentChip, StageBadge } from "@/components/atoms";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LeadStage } from "@/lib/types";
import { useMountedNow } from "@/hooks/use-now";
import {
  LeadStackQueue,
  LeadFocusStack,
  LeadStageBoard,
  LeadMoveInBuckets,
  type LeadViewMode,
} from "@/components/leads/LeadViews";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Gharpayy" },
      {
        name: "description",
        content: "Every lead, ranked by deal probability, one click into the control panel.",
      },
      { property: "og:title", content: "Leads — Gharpayy" },
      {
        property: "og:description",
        content: "Manage every lead through a clear five-call closing ladder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { leads, tcms, selectLead } = useApp();
  const [, mounted] = useMountedNow();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"confidence" | "moveIn" | "updated">("confidence");
  const [view, setView] = useState<LeadViewMode>("table");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filtered = useMemo(() => {
    const list = leads.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q.toLowerCase()) && !l.phone.includes(q))
        return false;
      if (stage !== "all" && l.stage !== stage) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "confidence") return b.confidence - a.confidence;
      if (sortBy === "moveIn") return +new Date(a.moveInDate) - +new Date(b.moveInDate);
      return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    });
    return list;
  }, [leads, q, stage, sortBy]);

  const paginatedFiltered = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filtered.slice(start, end);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const exportToExcel = () => {
    const data = paginatedFiltered.map((lead) => ({
      Name: lead.name,
      Phone: lead.phone,
      Stage: lead.stage,
      Intent: lead.intent,
      Confidence: lead.confidence,
      Area: lead.preferredArea,
      Budget: lead.budget,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "Leads.xlsx");
  };

  const totalLeads = leads.length;

  const bookedLeads = leads.filter((lead) => lead.stage === "booked").length;

  const negotiationLeads = leads.filter((lead) => lead.stage === "negotiation").length;

  const droppedLeads = leads.filter((lead) => lead.stage === "dropped").length;

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Leads</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {leads.length} · ranked by deal probability
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or phone…"
              className="h-9 w-56 text-sm"
            />

            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-9 w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {(
                  [
                    "new",
                    "contacted",
                    "tour-scheduled",
                    "tour-done",
                    "negotiation",
                    "booked",
                    "dropped",
                  ] as LeadStage[]
                ).map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace("-", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-9 w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confidence">Sort: Confidence</SelectItem>
                <SelectItem value="moveIn">Sort: Move-in date</SelectItem>
                <SelectItem value="updated">Sort: Last updated</SelectItem>
              </SelectContent>
            </Select>

            {/* 👇 New Button */}
            <Button onClick={exportToExcel} className="h-9">
              Export Excel
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <h3 className="text-gray-500 text-sm">Total Leads</h3>
            <p className="text-3xl font-bold">{totalLeads}</p>
          </div>

          <div className="border rounded-lg p-4 bg-green-50 shadow-sm">
            <h3 className="text-green-600 text-sm">Booked</h3>
            <p className="text-3xl font-bold text-green-700">{bookedLeads}</p>
          </div>

          <div className="border rounded-lg p-4 bg-yellow-50 shadow-sm">
            <h3 className="text-yellow-600 text-sm">Negotiation</h3>
            <p className="text-3xl font-bold text-yellow-700">{negotiationLeads}</p>
          </div>

          <div className="border rounded-lg p-4 bg-red-50 shadow-sm">
            <h3 className="text-red-600 text-sm">Dropped</h3>
            <p className="text-3xl font-bold text-red-700">{droppedLeads}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/30 p-1.5">
          {(
            [
              { key: "table", label: "Table" },
              { key: "stack", label: "Stack queue" },
              { key: "focus", label: "Focus stack" },
              { key: "board", label: "Stage board" },
              { key: "buckets", label: "Move-in buckets" },
            ] as { key: LeadViewMode; label: string }[]
          ).map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors " +
                (view === v.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === "table" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border bg-muted/40">
                <div className="col-span-3">Lead</div>
                <div className="col-span-2">Stage</div>
                <div className="col-span-2">Intent · score</div>
                <div className="col-span-2">Area · budget</div>
                <div className="col-span-2">Assigned</div>
                <div className="col-span-1 text-right">Updated</div>
              </div>
              <div className="divide-y divide-border">
                {paginatedFiltered.map((l) => {
                  const tcm = tcms.find((t) => t.id === l.assignedTcmId);
                  return (
                    <div key={l.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        data-testid={`lead-row-${l.id}`}
                        onPointerDownCapture={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('[data-copy-phone="true"]')) return;
                          selectLead(l.id);
                        }}
                        onClick={() => selectLead(l.id)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          selectLead(l.id);
                        }}
                        className="w-full text-left grid grid-cols-12 px-4 py-3 items-center hover:bg-accent/5 transition-colors cursor-pointer"
                      >
                        <div className="col-span-3">
                          <div className="font-medium text-sm">{l.name}</div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>
                              {l.phone} · {l.source}
                            </span>

                            <span
                              role="button"
                              tabIndex={0}
                              data-copy-phone="true"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(l.phone);
                                alert("Phone Number Copied!");
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter" && e.key !== " ") return;
                                e.preventDefault();
                                e.stopPropagation();
                                navigator.clipboard.writeText(l.phone);
                                alert("Phone Number Copied!");
                              }}
                              className="rounded border px-2 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50"
                            >
                              Copy
                            </span>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <StageBadge stage={l.stage} />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <IntentChip intent={l.intent} />
                          <ConfidenceBar value={l.confidence} />
                        </div>
                        <div className="col-span-2 text-xs">
                          <div>{l.preferredArea}</div>
                          <div className="text-muted-foreground">
                            ₹{(l.budget / 1000).toFixed(0)}k
                          </div>
                        </div>
                        <div className="col-span-2 text-xs">
                          <div>{tcm?.name ?? "—"}</div>
                          <div className="text-muted-foreground">{tcm?.zone ?? "—"}</div>
                        </div>
                        <div className="col-span-1 text-right text-[11px] text-muted-foreground">
                          {mounted
                            ? formatDistanceToNow(new Date(l.updatedAt), { addSuffix: true })
                            : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {paginatedFiltered.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No leads match.
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between px-2">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {view === "stack" && <LeadStackQueue leads={filtered} onOpen={selectLead} />}
        {view === "focus" && <LeadFocusStack leads={filtered} onOpen={selectLead} />}
        {view === "board" && <LeadStageBoard leads={filtered} onOpen={selectLead} />}
        {view === "buckets" && <LeadMoveInBuckets leads={filtered} onOpen={selectLead} />}
      </div>
    </AppShell>
  );
}
