/**
 * ADMIN FOCUS — the single battlefield.
 *
 * One provider mounted in the /admin layout holds the whole admin context:
 * time window, comparison, zone, focused person, and one global drill drawer +
 * person sheet. Every admin page reads and writes the same state, so a zone or
 * a person picked on one tab stays picked on every other tab, and any number
 * anywhere can open the customers behind it without its own local plumbing.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { watchCrm } from "@/founder/lib/crm-link";
import { buildCompanyNow, type CompanyNow } from "@/founder/lib/brain/company-now";
import {
  buildPeople, buildTotal, buildZoneDesks,
  type PersonNow, type ZoneDesk,
} from "@/founder/lib/brain/people-now";
import { compareRange, periodRange, type CompareKey, type PeriodKey, type Range } from "@/founder/lib/brain/timeengine";
import { DrillDrawer, type Drill } from "@/founder/components/brain/DrillDrawer";
import { PersonSheet } from "@/founder/components/brain/PersonSheet";
import { CommandPalette } from "@/founder/components/admin/CommandPalette";

import type { BrainRow } from "@/founder/lib/brain/engine";
import type { Metric } from "@/founder/lib/brain/engine";

export interface AdminFocusValue {
  hydrated: boolean;
  /* time */
  period: PeriodKey;
  setPeriod: (p: PeriodKey) => void;
  cmpKey: CompareKey;
  setCmpKey: (c: CompareKey) => void;
  showCmp: boolean;
  setShowCmp: (s: boolean) => void;
  range: Range;
  cmp: Range | null;
  /* scope */
  zoneName: string;
  setZoneName: (z: string) => void;
  personId: string | null;
  setPersonId: (id: string | null) => void;
  /* data (one source of truth for every admin page) */
  company: CompanyNow | null;
  allPeople: PersonNow[];
  zones: ZoneDesk[];
  zone: ZoneDesk | null;
  people: PersonNow[];
  total: PersonNow | null;
  focus: PersonNow | null;
  /* actions */
  openDrill: (title: string, rows: BrainRow[], subtitle?: string) => void;
  openRows: (drill: Drill) => void;
  openPerson: (p: PersonNow) => void;
  openMetric: (p: PersonNow, m: Metric) => void;
  /** focus a person by name coming from a non-CRM page (console, flow, ops) */
  focusByName: (name: string) => PersonNow | null;
  closeAll: () => void;
}

const Ctx = createContext<AdminFocusValue | null>(null);

export function useAdminFocus(): AdminFocusValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminFocus must be used inside AdminFocusProvider");
  return v;
}

/** Safe variant for pages that may render outside the /admin layout. */
export function useAdminFocusOptional(): AdminFocusValue | null {
  return useContext(Ctx);
}

export function AdminFocusProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [, bump] = useState(0);
  useEffect(() => {
    setHydrated(true);
    return watchCrm(() => bump((n) => n + 1));
  }, []);

  const [period, setPeriod] = useState<PeriodKey>("today");
  const [cmpKey, setCmpKey] = useState<CompareKey>("yesterday");
  const [showCmp, setShowCmp] = useState(true);
  const [zoneName, setZoneName] = useState("all");
  const [personId, setPersonId] = useState<string | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [person, setPerson] = useState<PersonNow | null>(null);

  const range = useMemo(() => periodRange(period), [period, hydrated]);
  const cmp = useMemo(() => (showCmp ? compareRange(range, cmpKey) : null), [range, cmpKey, showCmp]);

  const company = useMemo(() => (hydrated ? buildCompanyNow(range, cmp) : null), [hydrated, range, cmp, bump]);
  const allPeople = useMemo(() => (company ? buildPeople(company.snap, range, cmp) : []), [company, range, cmp]);
  const zones = useMemo(() => (allPeople.length ? buildZoneDesks(allPeople) : []), [allPeople]);

  const zone = zones.find((z) => z.name === zoneName) ?? null;
  const people = zone ? zone.people : allPeople;
  const total = useMemo(
    () => (people.length ? buildTotal(people, zone ? `${zone.name} — zone total` : "TOTAL — whole team") : null),
    [people, zone],
  );
  const focus = people.find((p) => p.id === personId) ?? allPeople.find((p) => p.id === personId) ?? null;

  const value: AdminFocusValue = {
    hydrated,
    period, setPeriod, cmpKey, setCmpKey, showCmp, setShowCmp, range, cmp,
    zoneName,
    setZoneName: (z) => { setZoneName(z); setPersonId(null); },
    personId, setPersonId,
    company, allPeople, zones, zone, people, total, focus,
    openDrill: (title, rows, subtitle) => setDrill({ title, rows, subtitle }),
    openRows: (d) => setDrill(d),
    openPerson: (p) => { setPersonId(p.id === "__total__" ? null : p.id); setPerson(p); },
    openMetric: (p, m) =>
      setDrill({ title: `${p.name} · ${m.label}`, subtitle: `${m.value}${m.suffix ?? ""} in ${range.label}`, rows: m.rows }),
    focusByName: (name) => {
      const key = name.trim().toLowerCase();
      const hit = allPeople.find((p) => p.name.toLowerCase() === key)
        ?? allPeople.find((p) => p.name.toLowerCase().includes(key.split(" ")[0] ?? key));
      if (hit) { setZoneName("all"); setPersonId(hit.id); setPerson(hit); }
      return hit ?? null;
    },
    closeAll: () => { setDrill(null); setPerson(null); },
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <CommandPalette />
      <DrillDrawer drill={drill} onClose={() => setDrill(null)} />
      <PersonSheet
        person={person}
        onClose={() => setPerson(null)}
        rangeLabel={range.label}
        onMetric={(p, m) => value.openMetric(p, m)}
      />
    </Ctx.Provider>
  );
}

