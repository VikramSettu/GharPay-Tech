// Crib Booking — quotation-pair sibling: the final agreement record that gets
// a shareable crib link. All fields map 1:1 to public.crib_bookings.

export type RentCycle = "monthly" | "quarterly" | "half-yearly" | "yearly";
export type DueType = "day_of_month" | "days_after_start" | "same_as_start";
export type CribStatus = "draft" | "sent" | "signed" | "cancelled";

export interface CribBooking {
  id: string;
  token: string;
  property_id: string;
  property_name: string | null;
  room_type_id: string;
  tenant_name: string;
  country_code: string;
  tenant_phone: string;
  agreement_start_date: string;
  rent_cycle: RentCycle;
  monthly_rent: number;
  security_deposit: number;
  maintenance_amount: number;
  agreement_duration: number;
  lock_in_period: number;
  notice_period: number;
  due_type: DueType;
  due_value: string;
  status: CribStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CribDraft = Omit<CribBooking, "id" | "token" | "created_at" | "updated_at">;

export const RENT_CYCLES: { id: RentCycle; label: string; months: number }[] = [
  { id: "monthly", label: "Monthly", months: 1 },
  { id: "quarterly", label: "Quarterly", months: 3 },
  { id: "half-yearly", label: "Half-yearly", months: 6 },
  { id: "yearly", label: "Yearly", months: 12 },
];

export const DUE_TYPES: { id: DueType; label: string; hint: string }[] = [
  { id: "day_of_month", label: "Day of month", hint: "e.g. 5 → rent due on the 5th" },
  { id: "days_after_start", label: "Days after start", hint: "e.g. 30 → 30 days after start date" },
  { id: "same_as_start", label: "Same as start date", hint: "Due on the same date each cycle" },
];

export const ROOM_TYPES: { id: string; label: string }[] = [
  { id: "single", label: "Single sharing" },
  { id: "double", label: "Double sharing" },
  { id: "triple", label: "Triple sharing" },
  { id: "quad", label: "Quad sharing" },
  { id: "studio", label: "Studio / 1RK" },
  { id: "1bhk", label: "1 BHK" },
  { id: "2bhk", label: "2 BHK" },
];

export function blankDraft(): CribDraft {
  return {
    property_id: "",
    property_name: "",
    room_type_id: "single",
    tenant_name: "",
    country_code: "+91",
    tenant_phone: "",
    agreement_start_date: new Date().toISOString().slice(0, 10),
    rent_cycle: "monthly",
    monthly_rent: 0,
    security_deposit: 0,
    maintenance_amount: 0,
    agreement_duration: 11,
    lock_in_period: 3,
    notice_period: 1,
    due_type: "day_of_month",
    due_value: "5",
    status: "draft",
    notes: "",
  };
}

export const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

export function cycleMonths(cycle: RentCycle) {
  return RENT_CYCLES.find((c) => c.id === cycle)?.months ?? 1;
}

/** Money maths shown on the crib page and in the copy block. */
export function cribTotals(b: CribDraft) {
  const m = cycleMonths(b.rent_cycle);
  const perCycle = (b.monthly_rent + b.maintenance_amount) * m;
  const moveIn = perCycle + b.security_deposit;
  const contract = (b.monthly_rent + b.maintenance_amount) * (b.agreement_duration || 0);
  return { cycleMonths: m, perCycle, moveIn, contract };
}

export function endDate(start: string, months: number) {
  if (!start) return "";
  const d = new Date(`${start}T00:00:00`);
  d.setMonth(d.getMonth() + (months || 0));
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function dueLabel(b: CribDraft) {
  if (b.due_type === "same_as_start") return `Same date as start (${fmtDate(b.agreement_start_date)})`;
  if (b.due_type === "days_after_start") return `${b.due_value} days after start date`;
  return `${b.due_value}${suffix(Number(b.due_value))} of every month`;
}

function suffix(n: number) {
  if (!Number.isFinite(n)) return "";
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

export function roomLabel(id: string) {
  return ROOM_TYPES.find((r) => r.id === id)?.label ?? id;
}

export function cribLink(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/cribbooking/${token}`;
}

/** WhatsApp-ready booking confirmation — paste straight to the customer. */
export function cribMessage(b: CribDraft, token?: string) {
  const t = cribTotals(b);
  const lines = [
    `*GHARPAYY BOOKING CONFIRMATION*`,
    ``,
    `Name: ${b.tenant_name || "—"}`,
    `Phone: ${b.country_code} ${b.tenant_phone || "—"}`,
    `Property: ${b.property_name || b.property_id || "—"}`,
    `Room: ${roomLabel(b.room_type_id)}`,
    ``,
    `Start date: ${fmtDate(b.agreement_start_date)}`,
    `Agreement: ${b.agreement_duration} months (till ${fmtDate(endDate(b.agreement_start_date, b.agreement_duration))})`,
    `Lock-in: ${b.lock_in_period} months · Notice: ${b.notice_period} month(s)`,
    ``,
    `Rent: ${inr(b.monthly_rent)} / month (${RENT_CYCLES.find((c) => c.id === b.rent_cycle)?.label})`,
    `Maintenance: ${inr(b.maintenance_amount)} / month`,
    `Security deposit: ${inr(b.security_deposit)}`,
    `Rent due: ${dueLabel(b)}`,
    ``,
    `Payable per cycle: ${inr(t.perCycle)}`,
    `*Move-in payable: ${inr(t.moveIn)}*`,
  ];
  if (b.notes) lines.push("", `Note: ${b.notes}`);
  if (token) lines.push("", `Confirm here: ${cribLink(token)}`);
  return lines.join("\n");
}
