import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSupplyStore } from "@/supply-hub/lib/store";
import { useCribBookings } from "@/cribbooking/store";
import {
  blankDraft, cribMessage, cribLink, cribTotals, inr, fmtDate, roomLabel, endDate,
  DUE_TYPES, RENT_CYCLES, ROOM_TYPES,
  type CribDraft, type CribBooking, type RentCycle, type DueType, type CribStatus,
} from "@/cribbooking/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Check, Link2, Trash2, MessageSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cribbooking/")({
  head: () => ({
    meta: [
      { title: "Crib Booking — Generate a booking link | Gharpayy" },
      { name: "description", content: "Fill property, room type, tenant, rent, deposit and agreement terms — generate a shareable crib booking link and a WhatsApp-ready confirmation." },
      { property: "og:title", content: "Crib Booking — Gharpayy" },
      { property: "og:description", content: "One form, one link: full agreement terms plus a paste-ready customer message." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CribBookingPage,
});

function CopyBtn({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setDone(true);
        toast.success("Copied");
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}

function CribBookingPage() {
  const { items } = useSupplyStore();
  const { rows, loading, create, update, remove } = useCribBookings();
  const [draft, setDraft] = useState<CribDraft>(blankDraft());
  const [saving, setSaving] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const properties = useMemo(
    () => items.filter((i) => i.enabled).map((i) => i.pg).sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  const set = <K extends keyof CribDraft>(k: K, v: CribDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const totals = cribTotals(draft);
  const message = cribMessage(draft, lastToken ?? undefined);

  const missing = [
    !draft.property_id && "property",
    !draft.room_type_id && "room type",
    !draft.tenant_name.trim() && "tenant name",
    !draft.tenant_phone.trim() && "phone",
    !draft.agreement_start_date && "start date",
    !draft.monthly_rent && "monthly rent",
    !draft.due_value && "due value",
  ].filter(Boolean) as string[];

  async function onGenerate() {
    if (missing.length) {
      toast.error(`Missing: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    const res = await create(draft);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLastToken(res.row.token);
    toast.success("Crib link generated");
  }

  function onPickProperty(id: string) {
    const pg = properties.find((p) => p.id === id);
    setDraft((d) => ({
      ...d,
      property_id: id,
      property_name: pg?.name ?? "",
      monthly_rent: d.monthly_rent || pickPrice(pg, d.room_type_id),
      security_deposit: d.security_deposit || pickPrice(pg, d.room_type_id),
    }));
  }

  function onPickRoom(roomId: string) {
    const pg = properties.find((p) => p.id === draft.property_id);
    const price = pickPrice(pg, roomId);
    setDraft((d) => ({ ...d, room_type_id: roomId, monthly_rent: price || d.monthly_rent }));
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
        <header className="mb-5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Crib Booking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill the agreement once — get a shareable crib link plus a paste-ready WhatsApp confirmation.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ---------- FORM ---------- */}
          <section className="space-y-5">
            <Card title="Property & tenant">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Property" hint={draft.property_id ? `id: ${draft.property_id}` : undefined}>
                  <Select value={draft.property_id} onValueChange={onPickProperty}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}{p.area ? ` — ${p.area}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Room type">
                  <Select value={draft.room_type_id} onValueChange={onPickRoom}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tenant name">
                  <Input value={draft.tenant_name} onChange={(e) => set("tenant_name", e.target.value)} placeholder="Full name" />
                </Field>
                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2">
                  <Field label="Code">
                    <Input value={draft.country_code} onChange={(e) => set("country_code", e.target.value)} placeholder="+91" />
                  </Field>
                  <Field label="Phone">
                    <Input
                      inputMode="tel"
                      value={draft.tenant_phone}
                      onChange={(e) => set("tenant_phone", e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="10-digit number"
                    />
                  </Field>
                </div>
              </div>
            </Card>

            <Card title="Money">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monthly rent">
                  <NumInput value={draft.monthly_rent} onChange={(v) => set("monthly_rent", v)} />
                </Field>
                <Field label="Security deposit">
                  <NumInput value={draft.security_deposit} onChange={(v) => set("security_deposit", v)} />
                </Field>
                <Field label="Maintenance amount">
                  <NumInput value={draft.maintenance_amount} onChange={(v) => set("maintenance_amount", v)} />
                </Field>
                <Field label="Rent cycle">
                  <Select value={draft.rent_cycle} onValueChange={(v) => set("rent_cycle", v as RentCycle)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RENT_CYCLES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Due type">
                  <Select value={draft.due_type} onValueChange={(v) => set("due_type", v as DueType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DUE_TYPES.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Due value" hint={DUE_TYPES.find((d) => d.id === draft.due_type)?.hint}>
                  <Input
                    value={draft.due_value}
                    disabled={draft.due_type === "same_as_start"}
                    onChange={(e) => set("due_value", e.target.value)}
                    placeholder="5"
                  />
                </Field>
              </div>
            </Card>

            <Card title="Agreement terms">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Agreement start date">
                  <Input type="date" value={draft.agreement_start_date} onChange={(e) => set("agreement_start_date", e.target.value)} />
                </Field>
                <Field label="Agreement duration (months)" hint={draft.agreement_start_date ? `Ends ${fmtDate(endDate(draft.agreement_start_date, draft.agreement_duration))}` : undefined}>
                  <NumInput value={draft.agreement_duration} onChange={(v) => set("agreement_duration", v)} />
                </Field>
                <Field label="Lock-in period (months)">
                  <NumInput value={draft.lock_in_period} onChange={(v) => set("lock_in_period", v)} />
                </Field>
                <Field label="Notice period (months)">
                  <NumInput value={draft.notice_period} onChange={(v) => set("notice_period", v)} />
                </Field>
                <Field label="Status">
                  <Select value={draft.status} onValueChange={(v) => set("status", v as CribStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["draft", "sent", "signed", "cancelled"] as CribStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Notes (optional)" className="sm:col-span-2">
                  <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Anything promised to the customer" />
                </Field>
              </div>
            </Card>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onGenerate} disabled={saving}>
                <Link2 className="h-4 w-4" /> {saving ? "Generating…" : "Generate crib link"}
              </Button>
              <CopyBtn text={message} label="Copy for WhatsApp" />
              <Button variant="ghost" size="sm" onClick={() => { setDraft(blankDraft()); setLastToken(null); }}>Reset</Button>
              {missing.length > 0 && (
                <span className="text-xs text-muted-foreground">Missing: {missing.join(", ")}</span>
              )}
            </div>
          </section>

          {/* ---------- LIVE SUMMARY ---------- */}
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <Card title="Live summary">
              <dl className="space-y-1.5 text-sm">
                <Row k="Tenant" v={draft.tenant_name || "—"} />
                <Row k="Phone" v={`${draft.country_code} ${draft.tenant_phone || "—"}`} />
                <Row k="Property" v={draft.property_name || "—"} />
                <Row k="Room" v={roomLabel(draft.room_type_id)} />
                <Row k="Rent / month" v={inr(draft.monthly_rent)} />
                <Row k="Maintenance" v={inr(draft.maintenance_amount)} />
                <Row k="Deposit" v={inr(draft.security_deposit)} />
                <Row k={`Per cycle (${totals.cycleMonths}m)`} v={inr(totals.perCycle)} />
                <Row k="Move-in payable" v={inr(totals.moveIn)} strong />
                <Row k="Contract value" v={inr(totals.contract)} />
              </dl>
              {lastToken && (
                <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                  <p className="break-all text-xs font-medium">{cribLink(lastToken)}</p>
                  <div className="flex flex-wrap gap-2">
                    <CopyBtn text={cribLink(lastToken)} label="Copy link" />
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/cribbooking/$token" params={{ token: lastToken }}><FileText className="h-3.5 w-3.5" /> Open</Link>
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <Card title="WhatsApp message" action={<CopyBtn text={message} label="Copy" />}>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 text-xs leading-relaxed">{message}</pre>
            </Card>
          </aside>
        </div>

        {/* ---------- EXISTING BOOKINGS ---------- */}
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Crib bookings {rows.length > 0 && <span className="text-muted-foreground">({rows.length})</span>}</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No crib bookings yet — fill the form above and generate the first link.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => <BookingRow key={r.id} row={r} onStatus={(s) => void update(r.id, { status: s })} onDelete={() => void remove(r.id)} />)}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function BookingRow({ row, onStatus, onDelete }: { row: CribBooking; onStatus: (s: CribStatus) => void; onDelete: () => void }) {
  const t = cribTotals(row);
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {row.tenant_name} <span className="font-normal text-muted-foreground">· {row.property_name || row.property_id}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {roomLabel(row.room_type_id)} · {inr(row.monthly_rent)}/mo · move-in {inr(t.moveIn)} · from {fmtDate(row.agreement_start_date)} · {row.agreement_duration}m
          </p>
        </div>
        <Badge variant={row.status === "signed" ? "default" : row.status === "cancelled" ? "destructive" : "secondary"}>{row.status}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <CopyBtn text={cribLink(row.token)} label="Link" />
        <CopyBtn text={cribMessage(row, row.token)} label="WhatsApp" />
        <Button asChild size="sm" variant="secondary">
          <Link to="/cribbooking/$token" params={{ token: row.token }}><FileText className="h-3.5 w-3.5" /> Open crib</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a
            href={`https://wa.me/${(row.country_code + row.tenant_phone).replace(/[^\d]/g, "")}?text=${encodeURIComponent(cribMessage(row, row.token))}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Send
          </a>
        </Button>
        <Select value={row.status} onValueChange={(v) => onStatus(v as CribStatus)}>
          <SelectTrigger className="h-8 w-[126px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["draft", "sent", "signed", "cancelled"] as CribStatus[]).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete crib booking">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- small UI bits ---------- */
function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      inputMode="numeric"
      value={value === 0 ? "" : String(value)}
      onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
      placeholder="0"
    />
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className={cn("text-right text-sm", strong && "font-bold")}>{v}</dd>
    </div>
  );
}

function pickPrice(pg: { prices?: { single: number; double: number; triple: number; min: number } } | undefined, room: string) {
  if (!pg?.prices) return 0;
  if (room === "single") return pg.prices.single || pg.prices.min || 0;
  if (room === "double") return pg.prices.double || pg.prices.min || 0;
  if (room === "triple") return pg.prices.triple || pg.prices.min || 0;
  return pg.prices.min || 0;
}
