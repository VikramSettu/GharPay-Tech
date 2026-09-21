/**
 * FOUNDER OS — the single, ZONE-CENTRIC command page.
 *
 * Everything is organised zone → person → customer. One time control drives
 * every number, every number is clickable, and every block is copyable to
 * WhatsApp. All data is derived from the live CRM snapshot.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, ArrowRight, ClipboardCopy, Flame, MapPin, Sparkles, Users, Zap,
} from "lucide-react";
import { explain, type StageStat, type WhyAnalysis, type FeedEvent } from "@/founder/lib/brain/company-now";
import {
  buildCheckpoints, peopleWhatsApp, personWhatsApp,
  momentsWhatsApp, zoneWhatsApp, zeroAndStars,
  type PersonNow, type MomentSet,
} from "@/founder/lib/brain/people-now";
import { delta } from "@/founder/lib/brain/timeengine";
import { useAdminFocus } from "@/founder/lib/admin-focus";


export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Founder OS · Run Gharpayy zone by zone" },
      { name: "description", content: "Zone league, zone desks, people truth, moments, recovery war room and EOD — every number clickable down to the customer and copyable to WhatsApp." },
      { property: "og:title", content: "Founder OS · Run Gharpayy zone by zone" },
      { property: "og:description", content: "One time control, zone-centric funnel, moments and a recovery war room built on live CRM data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FounderOS,
});

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function copy(text: string, label: string) {
  void navigator.clipboard?.writeText(text);
  toast.success(`${label} copied — paste into WhatsApp`);
}

function CopyBtn({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  return (
    <Button size="sm" variant="outline" className={`h-7 text-xs ${className}`} onClick={() => copy(text, label)}>
      <ClipboardCopy className="mr-1 h-3 w-3" /> Copy
    </Button>
  );
}

function DeltaChip({ cur, prev }: { cur: number; prev: number | null }) {
  const d = delta(cur, prev);
  if (prev == null) return null;
  const cls = d.dir === "up" ? "text-emerald-600" : d.dir === "down" ? "text-destructive" : "text-muted-foreground";
  return <span className={`text-[10px] font-medium ${cls}`}>{d.text}</span>;
}

/** subtle "was N" chip used next to every person number */
function Prev({ p }: { p: number | undefined }) {
  if (p === undefined) return null;
  return <span className="ml-1 text-[9px] text-muted-foreground/70">({p})</span>;
}

function FounderOS() {
  const f = useAdminFocus();
  const {
    hydrated, range, cmp, showCmp, zoneName, zone, zones, people, total, focus, company,
  } = f;
  const setZoneName = f.setZoneName;
  const setFocusId = f.setPersonId;
  const focusId = f.personId;
  const setPerson = f.openPerson;
  const setDrill = f.openRows;
  const [why, setWhy] = useState<WhyAnalysis | null>(null);
  const [feedKind, setFeedKind] = useState<string>("all");

  const checkpoints = useMemo(() => (people.length ? buildCheckpoints(people) : []), [people]);
  const risk = useMemo(() => zeroAndStars(people), [people]);

  if (!hydrated || !company || !total) {
    return <div className="rounded-lg border p-10 text-sm text-muted-foreground">Reading the live CRM…</div>;
  }

  const g = (k: string) => company.funnel.find((x) => x.key === k);
  const headline: { key: string; label: string }[] = [
    { key: "new", label: "New leads" },
    { key: "connected", label: "Connected" },
    { key: "tour-sched", label: "Tours booked" },
    { key: "tour-done", label: "Tours done" },
    { key: "quote", label: "Quotations" },
    { key: "booking", label: "Bookings" },
    { key: "checkin", label: "Check-ins" },
  ];

  const openStage = (s: StageStat) => {
    const rows = zone ? s.rows.filter((r) => r.zone === zone.name) : s.rows;
    setDrill({ title: `${s.label}${zone ? ` · ${zone.name}` : ""}`, subtitle: `${rows.length} customers in ${range.label}${cmp ? ` · ${s.prev} company-wide in ${cmp.label}` : ""}`, rows });
  };
  const openMoment = (owner: string, m: MomentSet, stuck = false) =>
    setDrill({
      title: `${owner} · ${m.label}${stuck ? " · stuck" : ""}`,
      subtitle: stuck ? `${m.stuck} customers stuck at this moment` : `${m.to} of ${m.from} converted (${m.rate}%) in ${range.label}`,
      rows: stuck ? m.stuckRows : m.rows,
    });


  const feed: FeedEvent[] = company.feed
    .filter((f) => (zone ? f.zone === zone.name : true))
    .filter((f) => feedKind === "all" || f.kind === feedKind);
  const feedKinds = ["all", ...Array.from(new Set(company.feed.map((f) => f.kind)))];

  const numCols = ["calls", "connectRate", "newLeads", "oldContacted", "moved", "toursScheduled", "toursDone", "quotes", "bookings", "untouched", "overdue"] as const;
  const rowTone = (p: PersonNow) =>
    p.zeroDay && p.loggedInToday
      ? "bg-destructive/10 ring-1 ring-inset ring-destructive/40"
      : p.zeroDay
        ? "bg-muted/60"
        : p.star
          ? "bg-emerald-500/10"
          : "";

  return (
    <div className="space-y-4 pb-24">
      {/* time, zone and person scope live in the shared Battlefield Bar above */}


      {/* ---------------- zone league ---------------- */}
      <section className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Zone league — {range.label}</div>
          <span className="text-xs text-muted-foreground">click a zone to run the whole page on it</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {zones.map((z, i) => {
            const t = z.total.v;
            const p = z.total.pv;
            const active = zoneName === z.name;
            return (
              <div key={z.name}
                className={`rounded-md border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "hover:border-primary"} ${z.zeros.length ? "ring-1 ring-inset ring-destructive/30" : ""}`}>
                <button className="w-full text-left" onClick={() => { setZoneName(active ? "all" : z.name); setFocusId(null); }}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">#{i + 1} {z.name}</span>
                    <Badge variant="outline" className="text-[10px]">score {z.score}</Badge>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{t.bookings ?? 0}</span>
                    <span className="text-[11px] text-muted-foreground">bookings</span>
                    {showCmp && <DeltaChip cur={t.bookings ?? 0} prev={p.bookings ?? null} />}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {t.calls ?? 0} calls<Prev p={showCmp ? p.calls : undefined} /> · {t.toursDone ?? 0} tours done<Prev p={showCmp ? p.toursDone : undefined} /> · {t.quotes ?? 0} quotes
                  </div>
                  <div className="mt-1 text-[11px]">
                    <span className="text-destructive">{t.untouched ?? 0} untouched</span>
                    {" · "}
                    <span className="text-amber-600">{t.momentsStuck ?? 0} stuck</span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {z.people.length} people · {z.stars.length} firing · {z.zeros.length} zero-output
                  </div>
                </button>
                <div className="mt-2 flex items-center gap-1.5">
                  <button className="text-[11px] text-primary" onClick={() => setPerson(z.total)}>Zone 360 →</button>
                  <CopyBtn className="ml-auto h-6" text={zoneWhatsApp(z, range.label)} label={z.name} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- result strip ---------------- */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
        {headline.map((h) => {
          const s = g(h.key);
          if (!s) return null;
          const count = zone ? s.rows.filter((r) => r.zone === zone.name).length : s.count;
          return (
            <button key={h.key} onClick={() => openStage(s)}
              className="rounded-lg border bg-card p-3 text-left transition hover:border-primary">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-[11px] leading-tight text-muted-foreground">{h.label}</div>
              <div className="mt-1 flex items-center gap-1">
                {!zone && showCmp && <DeltaChip cur={s.count} prev={s.prev} />}
              </div>
              <div className="mt-1 text-[10px] text-primary">open customers →</div>
            </button>
          );
        })}
      </section>

      {/* ---------------- moments ---------------- */}
      <section className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Moments — {zone ? zone.name : "all zones"}</div>
          <span className="text-xs text-muted-foreground">the three handovers that decide revenue</span>
          <CopyBtn className="ml-auto" text={momentsWhatsApp(people, total, `${range.label} · ${zone ? zone.name : "all zones"}`)} label="Moments" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {total.moments.map((m) => (
            <div key={m.key} className="rounded-md border p-3">
              <button className="w-full text-left" onClick={() => openMoment(total.name, m)}>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{m.to}<span className="text-sm text-muted-foreground">/{m.from}</span></span>
                  <Badge variant={m.rate >= 60 ? "outline" : "destructive"} className="text-[10px]">{m.rate}%</Badge>
                </div>
                <div className="text-xs font-medium">{m.label}</div>
              </button>
              <Progress value={Math.min(100, m.rate)} className="mt-2 h-1" />
              <button className="mt-2 text-[11px] text-destructive" onClick={() => openMoment(total.name, m, true)}>
                {m.stuck} stuck — open customers →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- zero output / stars ---------------- */}
      {(risk.zeros.length > 0 || risk.ghosts.length > 0 || risk.stars.length > 0) && (
        <section className="grid gap-2 md:grid-cols-3">
          {[
            { key: "zeros", title: "Logged in, zero output", list: risk.zeros, cls: "border-destructive/50 bg-destructive/5", tone: "text-destructive" },
            { key: "ghosts", title: "Never logged in", list: risk.ghosts, cls: "border-muted", tone: "text-muted-foreground" },
            { key: "stars", title: "Firing today", list: risk.stars, cls: "border-emerald-500/50 bg-emerald-500/5", tone: "text-emerald-600" },
          ].map((b) => (
            <div key={b.key} className={`rounded-lg border p-3 ${b.cls}`}>
              <div className="flex items-center gap-2">
                {b.key === "stars" ? <Sparkles className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className={`h-4 w-4 ${b.tone}`} />}
                <div className="text-sm font-semibold">{b.title}</div>
                <span className={`ml-auto text-lg font-bold ${b.tone}`}>{b.list.length}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {b.list.length === 0 && <span className="text-[11px] text-muted-foreground">Nobody here.</span>}
                {b.list.map((p) => (
                  <button key={p.id} onClick={() => { setFocusId(p.id); setPerson(p); }}
                    className="rounded-full border bg-card px-2 py-0.5 text-[11px] hover:border-primary">
                    {p.name} · {p.zone} · {p.v.calls ?? 0}/{p.v.toursDone ?? 0}/{p.v.bookings ?? 0}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ---------------- recovery hero ---------------- */}
      {company.recovery.length > 0 && (
        <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Flame className="h-4 w-4 text-destructive" />
            <div className="font-semibold">Recovery War Room</div>
            <Badge variant="destructive" className="text-[10px]">
              {company.recoverableBookings} bookings recoverable · {money(company.recoverableRevenue)}
            </Badge>
            <CopyBtn className="ml-auto"
              text={[`GHARPAYY RECOVERY — ${range.label}`, "", ...company.recovery.map((r) => `${r.title}: ${r.count} cases · +${r.bookings} bookings · deadline ${r.deadline}`)].join("\n")}
              label="Recovery plan" />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {company.recovery.map((r) => {
              const rows = zone ? r.rows.filter((x) => x.zone === zone.name) : r.rows;
              return (
                <button key={r.id} onClick={() => setDrill({ title: r.title, subtitle: `${rows.length} cases · deadline ${r.deadline}`, rows })}
                  className="rounded-md border bg-card p-3 text-left transition hover:border-primary">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-bold">{rows.length}</div>
                    <div className="text-[11px] text-muted-foreground">{r.deadline}</div>
                  </div>
                  <div className="text-xs">{r.title}</div>
                  <div className="mt-1 text-[11px] text-emerald-600">+{r.bookings} bookings · {money(r.revenue)}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------- funnel grid ---------------- */}
      <section className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Company funnel — {range.label}</div>
          <span className="text-xs text-muted-foreground">click a stage to open the customers{zone ? ` in ${zone.name}` : ""} · “Why” explains the movement</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {company.funnel.map((s) => (
            <div key={s.key} className="rounded-md border p-3">
              <button onClick={() => openStage(s)} className="w-full text-left">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{zone ? s.rows.filter((r) => r.zone === zone.name).length : s.count}</span>
                  {showCmp && !zone && <DeltaChip cur={s.count} prev={s.prev} />}
                </div>
                <div className="text-xs font-medium">{s.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {s.conversion}% from previous · median {s.medianMins}m · EOD ~{s.projection}
                </div>
              </button>
              <Progress value={Math.min(100, s.conversion)} className="mt-2 h-1" />
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {s.notes.map((n) => (
                  <button key={n} onClick={() => openStage(s)}>
                    <Badge variant="outline" className="text-[10px]">{n}</Badge>
                  </button>
                ))}
                {s.overdue > 0 && <Badge variant="destructive" className="text-[10px]">{s.overdue} overdue</Badge>}
                <button className="ml-auto text-[11px] text-primary"
                  onClick={() => setWhy(explain(s.key, company.snap, range, cmp))}>
                  Why →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- checkpoints ---------------- */}
      {checkpoints.length > 0 && (
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {checkpoints.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{c.at} · {c.label}</span>
                {c.upcoming && <Badge variant="outline" className="text-[10px]">Upcoming</Badge>}
              </div>
              <div className="mt-2 flex gap-1.5 text-xs">
                {([["done", c.done], ["late", c.late], ["missed", c.missed]] as const).map(([k, list]) => (
                  <button key={k}
                    onClick={() => setDrill({
                      title: `${c.label} · ${k}`,
                      subtitle: `${list.length} people${zone ? ` in ${zone.name}` : ""}`,
                      rows: list.map((p) => ({
                        id: p.id, kind: "person" as const, title: p.name, subtitle: p.verdict,
                        owner: p.name, zone: p.zone, nextAction: p.flags[0] ?? "Keep going",
                        problem: k === "done" ? undefined : `Checkpoint ${k}`,
                      })),
                    })}
                    className={`flex-1 rounded border px-2 py-1 ${k === "done" ? "border-emerald-500/40" : k === "late" ? "border-amber-500/40" : "border-destructive/40"}`}>
                    <div className="text-base font-bold">{list.length}</div>
                    <div className="text-[10px] capitalize text-muted-foreground">{k}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ---------------- people desk ---------------- */}
      <section className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">People Desk — {zone ? zone.name : "all zones"}</div>
          <span className="text-[11px] text-muted-foreground">red = logged in with zero output · green = firing</span>
          <CopyBtn className="ml-auto" text={peopleWhatsApp(people, `${range.label} · ${zone ? zone.name : "all zones"}`)} label="People desk" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                {["Person", "Grade", "Score", "Calls", "Conn%", "New", "Old cont.", "Moved", "Tours", "Done", "Quotes", "Bookings", "Untouched", "Overdue", ""].map((h, i) => (
                  <th key={`${h}-${i}`} className="px-2 py-1.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[total, ...people].map((p) => {
                const isTotal = p.id === "__total__";
                return (
                  <tr key={p.id}
                    className={`border-b ${isTotal ? "bg-primary/5 font-semibold" : `hover:bg-muted/50 ${rowTone(p)}`} ${focusId === p.id ? "ring-1 ring-inset ring-primary" : ""}`}>
                    <td className="px-2 py-1.5">
                      <button className="font-medium text-primary" onClick={() => { setFocusId(isTotal ? null : p.id); setPerson(p); }}>{p.name}</button>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {p.zone} · {p.lastSeen}
                        {!isTotal && p.zeroDay && p.loggedInToday && <span className="ml-1 font-semibold text-destructive">ZERO OUTPUT</span>}
                        {!isTotal && p.star && <span className="ml-1 text-emerald-600">★</span>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{p.grade}</Badge></td>
                    <td className="px-2 py-1.5">{p.score}<Prev p={showCmp ? p.pv.score : undefined} /></td>
                    {numCols.map((k) => (
                      <td key={k} className="px-2 py-1.5">
                        <button className="hover:underline" onClick={() => { setFocusId(isTotal ? null : p.id); setPerson(p); }}>
                          {p.v[k] ?? 0}
                        </button>
                        <Prev p={showCmp ? p.pv[k] : undefined} />
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <button className="text-[11px] text-primary" onClick={() => copy(personWhatsApp(p, range.label), p.name)}>copy</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- person focus ---------------- */}
      {focus && (
        <section className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold">{focus.name} — focus · {focus.zone}</div>
            <Badge variant="outline" className="text-[10px]">{focus.role}</Badge>
            <Badge variant="outline" className="text-[10px]">grade {focus.grade}</Badge>
            <CopyBtn className="ml-auto" text={personWhatsApp(focus, range.label)} label={focus.name} />
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setFocusId(null)}>Clear</Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {([
              ["Leads owned", "leads"], ["New added", "newLeads"], ["Old contacted", "oldContacted"],
              ["Leads moved", "moved"], ["Tours done", "toursDone"], ["Bookings", "bookings"],
            ] as const).map(([label, key]) => (
              <button key={key} onClick={() => setPerson(focus)}
                className="rounded-md border bg-card p-2 text-left hover:border-primary">
                <div className="text-xl font-bold">{focus.v[key] ?? 0}<Prev p={showCmp ? focus.pv[key] : undefined} /></div>
                <div className="text-[11px] text-muted-foreground">{label}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {focus.moments.map((m) => (
              <button key={m.key} onClick={() => openMoment(focus.name, m, m.stuck > 0)}
                className="rounded-md border bg-card p-2 text-left hover:border-primary">
                <div className="text-xs font-medium">{m.label}</div>
                <div className="text-sm">{m.to}/{m.from} ({m.rate}%) · <span className="text-destructive">{m.stuck} stuck</span></div>
              </button>
            ))}
          </div>
          {focus.flags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {focus.flags.map((f) => <Badge key={f} variant="destructive" className="text-[10px]">{f}</Badge>)}
            </div>
          )}
          <div className="mt-2 max-h-[200px] overflow-y-auto rounded border bg-card">
            {focus.timeline.slice(0, 40).map((t, i) => (
              <div key={`${t.ts}-${i}`} className="flex gap-2 border-b px-2 py-1 text-[11px] last:border-0">
                <span className="w-12 shrink-0 text-muted-foreground">{t.time}</span>
                <span className="w-16 shrink-0 capitalize text-primary">{t.kind}</span>
                <span className="flex-1">{t.text}</span>
              </div>
            ))}
            {focus.timeline.length === 0 && <div className="px-2 py-3 text-[11px] text-muted-foreground">No activity in this window.</div>}
          </div>
        </section>
      )}

      {/* ---------------- live feed ---------------- */}
      <section className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <div className="text-sm font-semibold">Live feed{zone ? ` · ${zone.name}` : ""}</div>
          {feedKinds.map((k) => (
            <button key={k} onClick={() => setFeedKind(k)}
              className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${feedKind === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {k}
            </button>
          ))}
          <CopyBtn className="ml-auto"
            text={[`GHARPAYY FEED — ${range.label}${zone ? ` · ${zone.name}` : ""}`, "", ...feed.slice(0, 50).map((f) => `${f.time} ${f.owner}: ${f.text}`)].join("\n")}
            label="Live feed" />
        </div>
        <div className="max-h-[380px] space-y-1 overflow-y-auto">
          {feed.length === 0 && <div className="text-xs text-muted-foreground">Nothing happened in this window.</div>}
          {feed.map((f) => (
            <button key={f.id} disabled={!f.row}
              onClick={() => f.row && setDrill({ title: f.text, subtitle: `${f.owner} · ${f.zone}`, rows: [f.row] })}
              className="flex w-full gap-2 border-b py-1 text-left text-xs last:border-0 disabled:opacity-70">
              <span className="w-12 shrink-0 text-muted-foreground">{f.time}</span>
              <span className="w-16 shrink-0 capitalize text-primary">{f.kind}</span>
              <span className="flex-1">{f.text}</span>
              <span className="shrink-0 text-muted-foreground">{f.owner}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------------- EOD bubble ---------------- */}
      <section className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <div className="text-sm font-semibold">EOD summary</div>
          <CopyBtn className="ml-auto" text={company.eod.text} label="EOD" />
        </div>
        <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-[11px] leading-relaxed">{company.eod.text}</pre>
      </section>

      {/* ---------------- why panel ---------------- */}
      {why && (
        <section className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto border-t bg-card p-4 shadow-2xl">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">{why.title}</div>
              <span className="text-xs text-muted-foreground">{why.headline}</span>
              <CopyBtn className="ml-auto"
                text={[why.title, why.headline, "", why.conclusion, "", ...why.zones.map((z) => `${z.name}: ${z.current} (${z.delta >= 0 ? "+" : ""}${z.delta})`)].join("\n")}
                label="Why analysis" />
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setWhy(null)}>Close</Button>
            </div>
            <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/5 p-2 text-xs">{why.conclusion}</div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Zones</div>
                {why.zones.map((z) => (
                  <button key={z.name} onClick={() => { setZoneName(z.name); setWhy(null); }}
                    className="flex w-full justify-between border-b py-1 text-xs last:border-0 hover:bg-muted">
                    <span>{z.name}</span>
                    <span className={z.delta < 0 ? "text-destructive" : "text-emerald-600"}>{z.current} ({z.delta >= 0 ? "+" : ""}{z.delta})</span>
                  </button>
                ))}
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Chain</div>
                <div className="max-h-[220px] overflow-y-auto">
                  {why.chain.map((c) => (
                    <div key={c.label} className="flex justify-between border-b py-1 text-xs last:border-0">
                      <span>{c.label}</span>
                      <span className={c.deltaPct < 0 ? "text-destructive" : "text-emerald-600"}>{c.current} ({c.deltaPct >= 0 ? "+" : ""}{c.deltaPct}%)</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">People</div>
                <div className="max-h-[220px] overflow-y-auto">
                  {why.people.map((p) => (
                    <button key={p.name} onClick={() => setDrill({ title: `${why.title} · ${p.name}`, subtitle: p.line, rows: p.rows })}
                      className="flex w-full items-center gap-2 border-b py-1 text-left text-xs last:border-0 hover:bg-muted">
                      <span className="font-medium">{p.name}</span>
                      <span className="truncate text-muted-foreground">{p.line}</span>
                      <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}


    </div>
  );
}
