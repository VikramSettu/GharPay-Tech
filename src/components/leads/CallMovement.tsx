import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { useLeadDossier } from "@/lib/lead-dossier-store";
import type { Lead } from "@/lib/types";
import type { CallNumber } from "@/lib/journey-gates";
import { VisitSyncKit, type VisitSyncMessage } from "./VisitSyncKit";
import {
  customerVisitMessage, ownerPreVisitMessage, ownerVisitDoneMessage,
  ownerRoomAvailabilityMessage, customerPreBookingMessage,
} from "@/lib/visit-sync";


/**
 * The movement half of a call. C1..C5 each push the lead one physical step
 * forward — PDF sent, tour booked, tour done + quotation, token + check-in,
 * revival date. Everything here is applied by the single "Log activity" save,
 * so a rep never has to open a second screen to move the customer.
 */

const CALL_MOVEMENT: Record<CallNumber, string> = {
  1: "Send the options PDF",
  2: "Book the tour",
  3: "Tour done → send the quotation",
  4: "Token, booking & check-in",
  5: "Reset the plan and re-enter the ladder",
};

export interface CallMovementResult {
  node: ReactNode;
  /** Applies every movement the rep filled in. Returns trail lines to log. */
  apply: () => string[];
  title: string;
}

export function useCallMovement(lead: Lead, call: CallNumber): CallMovementResult {
  const {
    properties, tours, currentTcmId,
    scheduleTour, completeTour, closeDeal, patchLead, addLeadTag, sendMessage,
  } = useApp();
  const setField = useLeadDossier((s) => s.setField);

  const leadTours = useMemo(
    () => tours.filter((t) => t.leadId === lead.id),
    [tours, lead.id],
  );
  const openTour = leadTours.find((t) => t.status === "scheduled");
  const latestTour = leadTours[0];

  const [pdfSent, setPdfSent] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [tourMode, setTourMode] = useState<"virtual" | "physical">("physical");
  const [tourAt, setTourAt] = useState("");
  const [tourDone, setTourDone] = useState(false);
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [sharing, setSharing] = useState("");
  const [token, setToken] = useState("");
  const [checkInAt, setCheckInAt] = useState("");
  const [reviveDate, setReviveDate] = useState("");
  const [reviveBudget, setReviveBudget] = useState("");

  useEffect(() => {
    setPdfSent(false);
    setPropertyId(openTour?.propertyId ?? latestTour?.propertyId ?? "");
    setTourMode("physical");
    setTourAt("");
    setTourDone(false);
    setRent(lead.budget ? String(lead.budget) : "");
    setDeposit("");
    setSharing("");
    setToken("");
    setCheckInAt("");
    setReviveDate("");
    setReviveBudget("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, call]);

  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? id;

  const apply = (): string[] => {
    const trail: string[] = [];

    if (call === 1 && pdfSent) {
      sendMessage(lead.id, "Property options PDF shared on WhatsApp");
      addLeadTag(lead.id, "pdf sent");
      trail.push("Options PDF sent");
    }

    if (call === 2) {
      setField(lead.id, "tourMode", tourMode);
      if (propertyId) setField(lead.id, "property", propertyName(propertyId));
      if (propertyId && tourAt) {
        scheduleTour({
          leadId: lead.id,
          propertyId,
          tcmId: lead.assignedTcmId || currentTcmId,
          scheduledAt: new Date(tourAt).toISOString(),
        });
        addLeadTag(lead.id, `${tourMode} tour`);
        trail.push(`${tourMode === "virtual" ? "Virtual" : "Physical"} tour booked · ${propertyName(propertyId)}`);
      }
    }

    if (call === 3) {
      if (tourDone && openTour) {
        completeTour(openTour.id);
        trail.push("Tour marked done");
      }
      if (rent || deposit || sharing) {
        const quote = [
          rent ? `rent ₹${Number(rent).toLocaleString("en-IN")}` : "",
          deposit ? `deposit ₹${Number(deposit).toLocaleString("en-IN")}` : "",
          sharing ? `${sharing} sharing` : "",
        ].filter(Boolean).join(" · ");
        setField(lead.id, "quotation", quote);
        if (sharing) setField(lead.id, "sharing", sharing);
        addLeadTag(lead.id, "quotation sent");
        trail.push(`Quotation sent — ${quote}`);
      }
    }

    if (call === 4) {
      if (propertyId) setField(lead.id, "property", propertyName(propertyId));
      if (checkInAt) {
        setField(lead.id, "decisionBy", `check-in ${checkInAt}`);
        addLeadTag(lead.id, "check-in set");
        trail.push(`Check-in set · ${checkInAt}`);
      }
      if (propertyId && token) {
        closeDeal({
          leadId: lead.id,
          tourId: latestTour?.id ?? "",
          propertyId,
          tcmId: lead.assignedTcmId || currentTcmId,
          amount: Number(rent || lead.budget || 0),
        });
        addLeadTag(lead.id, "token paid");
        trail.push(`Token ₹${Number(token).toLocaleString("en-IN")} collected · booked ${propertyName(propertyId)}`);
      }
    }

    if (call === 5) {
      const patch: { moveInDate?: string; budget?: number } = {};
      if (reviveDate) patch.moveInDate = reviveDate;
      if (reviveBudget) patch.budget = Number(reviveBudget);
      if (Object.keys(patch).length) {
        patchLead(lead.id, patch);
        trail.push(
          `Plan reset — ${[reviveDate && `move ${reviveDate}`, reviveBudget && `budget ₹${Number(reviveBudget).toLocaleString("en-IN")}`]
            .filter(Boolean).join(" · ")}`,
        );
      }
    }

    return trail;
  };

  const propSelect = (
    <div>
      <Field label="Property">
        <Select value={propertyId} onValueChange={setPropertyId}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pick property" /></SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-sm">
                {p.name} · {p.area} · ₹{p.pricePerBed.toLocaleString("en-IN")} · {p.vacantBeds} beds
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );

  const prop = properties.find((p) => p.id === propertyId)
    ?? properties.find((p) => p.id === (openTour?.propertyId ?? latestTour?.propertyId));
  const fmtWhen = (v: string) =>
    v
      ? new Date(v).toLocaleString("en-IN", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit",
        })
      : "";
  const base = {
    leadName: lead.name,
    propertyName: prop?.name ?? "the property",
    area: prop?.area ?? lead.preferredArea,
    whenLabel: "",
    sharing,
    rent: rent || lead.budget,
    moveInDate: lead.moveInDate,
  };

  const syncMessages: VisitSyncMessage[] = [];
  if (call === 2) {
    const when = fmtWhen(tourAt) || "the confirmed slot";
    syncMessages.push(
      { key: "cust_visit", label: "1 · Visit confirmation", to: "customer", text: customerVisitMessage({ ...base, whenLabel: when, mode: tourMode }) },
      { key: "owner_ready", label: "2 · Owner group — is everything ready?", to: "owner_group", text: ownerPreVisitMessage({ ...base, whenLabel: when }) },
    );
  } else if (call === 3) {
    const when = fmtWhen(openTour?.scheduledAt ?? new Date().toISOString());
    syncMessages.push(
      { key: "owner_done", label: "1 · Owner group — visit is done", to: "owner_group", text: ownerVisitDoneMessage({ ...base, whenLabel: when }) },
      { key: "owner_avail", label: "2 · Owner group — room available for pre-booking?", to: "owner_group", text: ownerRoomAvailabilityMessage({ ...base, whenLabel: when, checkInDate: lead.moveInDate }) },
    );
  } else if (call === 4) {
    const when = checkInAt || lead.moveInDate;
    syncMessages.push(
      { key: "owner_avail4", label: "1 · Owner group — block room for this check-in", to: "owner_group", text: ownerRoomAvailabilityMessage({ ...base, whenLabel: when, checkInDate: checkInAt, token }) },
      { key: "cust_prebook", label: "2 · Customer — room confirmed, pre-book now", to: "customer", text: customerPreBookingMessage({ ...base, whenLabel: when, checkInDate: checkInAt, token }) },
    );
  }

  const syncNode = syncMessages.length ? (
    <VisitSyncKit
      messages={syncMessages}
      phone={lead.phone}
      hint={
        call === 3
          ? "Close the loop in the PG owner group, then confirm the room is free for the pre-booking date."
          : call === 4
            ? "Room availability confirmation is the gate — get the owner's AVAILABLE before you ask for the token."
            : "Send the customer their confirmation and ask the PG owner group to get the room ready."
      }
    />
  ) : null;

  let node: ReactNode = null;


  if (call === 1) {
    node = (
      <Toggle on={pdfSent} onClick={() => setPdfSent((v) => !v)}>
        Options PDF shared on WhatsApp
      </Toggle>
    );
  } else if (call === 2) {
    node = (
      <div className="space-y-2">
        <div className="flex gap-1.5">
          {(["physical", "virtual"] as const).map((m) => (
            <Toggle key={m} on={tourMode === m} onClick={() => setTourMode(m)}>
              {m === "physical" ? "Physical visit" : "Virtual tour"}
            </Toggle>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {propSelect}
          <Field label="Tour at">
            <Input type="datetime-local" value={tourAt} onChange={(e) => setTourAt(e.target.value)} className="h-9 text-sm" />
          </Field>
        </div>
      </div>
    );
  } else if (call === 3) {
    node = (
      <div className="space-y-2">
        <Toggle on={tourDone} onClick={() => setTourDone((v) => !v)} disabled={!openTour}>
          {openTour ? "Tour completed" : "No open tour to close"}
        </Toggle>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Rent /mo">
            <Input inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="14000" className="h-9 text-sm" />
          </Field>
          <Field label="Deposit">
            <Input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="28000" className="h-9 text-sm" />
          </Field>
          <Field label="Sharing">
            <Select value={sharing} onValueChange={setSharing}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {["single", "double", "triple", "four"].map((s) => (
                  <SelectItem key={s} value={s} className="text-sm capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    );
  } else if (call === 4) {
    node = (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {propSelect}
          <Field label="Token amount">
            <Input inputMode="numeric" value={token} onChange={(e) => setToken(e.target.value)} placeholder="5000" className="h-9 text-sm" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Monthly rent">
            <Input inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value)} className="h-9 text-sm" />
          </Field>
          <Field label="Check-in date">
            <Input type="date" value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} className="h-9 text-sm" />
          </Field>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Property + token together close the deal, free a bed and mark the lead booked.
        </p>
      </div>
    );
  } else {
    node = (
      <div className="grid grid-cols-2 gap-2">
        <Field label="New move-in date">
          <Input type="date" value={reviveDate} onChange={(e) => setReviveDate(e.target.value)} className="h-9 text-sm" />
        </Field>
        <Field label="New budget">
          <Input inputMode="numeric" value={reviveBudget} onChange={(e) => setReviveBudget(e.target.value)} placeholder="13000" className="h-9 text-sm" />
        </Field>
      </div>
    );
  }

  if (syncNode) node = <div className="space-y-2">{node}{syncNode}</div>;

  return { node, apply, title: CALL_MOVEMENT[call] };

}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  on, onClick, disabled, children,
}: { on: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
        on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/30",
      )}
    >
      {children}
    </button>
  );
}
