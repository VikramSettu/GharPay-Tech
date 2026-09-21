import { usePipeline } from "@/lib/pipeline/store";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { DossierTimer } from "./DossierTimer";
import { DossierForm } from "./DossierForm";
import { EvidenceStrip } from "./EvidenceStrip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface Props { leadId: string; }

export function StagePanel({ leadId }: Props) {
  const state = usePipeline((s) => s.states[leadId]);
  const advanceStage = usePipeline((s) => s.advanceStage);
  const setTour = usePipeline((s) => s.setTour);
  const setPostVisit = usePipeline((s) => s.setPostVisit);
  const setQuote = usePipeline((s) => s.setQuote);
  const setBooking = usePipeline((s) => s.setBooking);
  const user = useIdentityStore((s) => s.currentUser);
  const actor = { userId: user.id, userName: user.name };

  if (!state) return null;

  switch (state.currentStage) {
    case "DOSSIER":
      return (
        <div className="space-y-4">
          <DossierTimer leadId={leadId} />
          <DossierForm leadId={leadId} />
        </div>
      );
    case "MATCHED":
      return <MatchPanel leadId={leadId} onNext={() => advanceStage(leadId, "TOUR_SCHEDULED", actor)} />;
    case "TOUR_SCHEDULED":
      return (
        <TourSchedulePanel
          leadId={leadId}
          initial={state.tour?.date ?? ""}
          onSave={(date, coordinator, meetingPoint) => {
            setTour(leadId, { date, coordinator, meetingPoint });
          }}
          onConfirm={() => {
            setTour(leadId, { confirmedAt: new Date().toISOString() });
            advanceStage(leadId, "TOUR_CONFIRMED", actor);
          }}
        />
      );
    case "TOUR_CONFIRMED":
      return (
        <Card leadId={leadId} stage="TOUR_CONFIRMED" title="Tour confirmed — awaiting start">
          <p className="text-sm text-muted-foreground mb-3">
            Reminder cascade (24h/6h/2h/30m) auto-firing. When the lead reaches the property, mark started.
          </p>
          <Button onClick={() => {
            setTour(leadId, { startedAt: new Date().toISOString() });
            advanceStage(leadId, "TOUR_IN_PROGRESS", actor);
          }}>Mark tour started</Button>
        </Card>
      );
    case "TOUR_IN_PROGRESS":
      return (
        <Card leadId={leadId} stage="TOUR_IN_PROGRESS" title="Tour in progress">
          <p className="text-sm text-muted-foreground mb-3">Live tour. Mark complete once all properties toured.</p>
          <Button onClick={() => {
            setTour(leadId, { completedAt: new Date().toISOString() });
            advanceStage(leadId, "POST_VISIT", actor);
          }}>Mark tour complete</Button>
        </Card>
      );
    case "POST_VISIT":
      return (
        <PostVisitPanel leadId={leadId} onDecision={(d) => {
          setPostVisit(leadId, { decision: d });
          advanceStage(leadId, "QUOTED", actor);
        }} />
      );
    case "QUOTED":
      return (
        <QuotePanel leadId={leadId} onSend={(amount, expiry, discount) => {
          setQuote(leadId, {
            amount, expiry, discount,
            sentAt: new Date().toISOString(),
            followUpsFired: [],
          });
          advanceStage(leadId, "NEGOTIATION", actor);
        }} />
      );
    case "NEGOTIATION":
      return (
        <Card leadId={leadId} stage="NEGOTIATION" title="Negotiation">
          <p className="text-sm text-muted-foreground mb-3">Track calls, discount requests, best offer. When booked, log payment.</p>
          <Button onClick={() => advanceStage(leadId, "BOOKED", actor)}>Advance to booking</Button>
        </Card>
      );
    case "BOOKED":
      return (
        <BookingPanel leadId={leadId} onBook={(amount, ref, room) => {
          setBooking(leadId, {
            amount, paymentRef: ref, roomNumber: room,
            at: new Date().toISOString(),
          });
          advanceStage(leadId, "CHECKED_IN", actor);
        }} />
      );
    case "CHECKED_IN":
      return <Card leadId={leadId} stage="CHECKED_IN" title="Live tenant"><p className="text-sm">Lead has moved in. Capture NPS after 7 days.</p></Card>;
    default:
      return null;
  }
}

function Card({ leadId, stage, title, children }: {
  leadId: string;
  stage: import("@/lib/pipeline/stage-config").PipelineStage;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <EvidenceStrip leadId={leadId} stage={stage} />
      <div className="text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function MatchPanel({ leadId, onNext }: { leadId: string; onNext: () => void }) {
  const updateDossier = usePipeline((s) => s.updateDossier);
  const dossier = usePipeline((s) => s.states[leadId]?.dossier);
  const user = useIdentityStore((s) => s.currentUser);
  const actor = { userId: user.id, userName: user.name };
  return (
    <Card leadId={leadId} stage="MATCHED" title="Pin P1 / P2 / P3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {(["p1", "p2", "p3"] as const).map((k) => (
          <div key={k}>
            <Label className="text-xs uppercase">{k}</Label>
            <Input value={(dossier?.[k] as string) ?? ""}
              onChange={(e) => updateDossier(leadId, { [k]: e.target.value }, actor)}
              placeholder="Property name" />
          </div>
        ))}
      </div>
      <Button disabled={!dossier?.p1} onClick={onNext}>Schedule tour</Button>
    </Card>
  );
}

function TourSchedulePanel({ leadId, initial, onSave, onConfirm }: {
  leadId: string; initial: string;
  onSave: (date: string, coordinator: string, meetingPoint: string) => void;
  onConfirm: () => void;
}) {
  const [date, setDate] = useState(initial);
  const [coord, setCoord] = useState("");
  const [mp, setMp] = useState("");
  return (
    <Card leadId={leadId} stage="TOUR_SCHEDULED" title="Schedule tour">
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div><Label className="text-xs">Date & time</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><Label className="text-xs">Coordinator</Label><Input value={coord} onChange={(e) => setCoord(e.target.value)} /></div>
        <div><Label className="text-xs">Meeting point</Label><Input value={mp} onChange={(e) => setMp(e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={!date} onClick={() => onSave(date, coord, mp)}>Save</Button>
        <Button disabled={!date} onClick={() => { onSave(date, coord, mp); onConfirm(); }}>Save + confirm</Button>
      </div>
    </Card>
  );
}

function PostVisitPanel({ leadId, onDecision }: { leadId: string; onDecision: (d: NonNullable<import("@/lib/pipeline/types").PipelineState["postVisit"]>["decision"]) => void }) {
  const options: { key: NonNullable<import("@/lib/pipeline/types").PipelineState["postVisit"]>["decision"]; label: string }[] = [
    { key: "liked", label: "Liked" },
    { key: "didnt-like", label: "Didn't like" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "needs-parents", label: "Needs parents" },
    { key: "needs-discount", label: "Needs discount" },
    { key: "needs-time", label: "Needs time" },
    { key: "needs-another-visit", label: "Needs another visit" },
    { key: "needs-alternative", label: "Needs alternative" },
  ];
  return (
    <Card leadId={leadId} stage="POST_VISIT" title="Post-visit — decision (mandatory, 15 min SLA)">
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <Button key={o.key} variant="outline" size="sm" onClick={() => onDecision(o.key)}>{o.label}</Button>
        ))}
      </div>
    </Card>
  );
}

function QuotePanel({ leadId, onSend }: { leadId: string; onSend: (amount: number, expiry: string, discount: number) => void }) {
  const [amount, setAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [hours, setHours] = useState("1");
  return (
    <Card leadId={leadId} stage="QUOTED" title="Send quotation — 15-min SLA">
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div><Label className="text-xs">Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
        <div><Label className="text-xs">Discount</Label><Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
        <div>
          <Label className="text-xs">Valid for</Label>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.25">15 min</SelectItem>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="6">6 hours</SelectItem>
              <SelectItem value="24">24 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button disabled={!amount} onClick={() => {
        const exp = new Date(Date.now() + Number(hours) * 3600 * 1000).toISOString();
        onSend(amount, exp, discount);
      }}>Send quote via WhatsApp</Button>
    </Card>
  );
}

function BookingPanel({ leadId, onBook }: { leadId: string; onBook: (amount: number, ref: string, room: string) => void }) {
  const [amount, setAmount] = useState(0);
  const [ref, setRef] = useState("");
  const [room, setRoom] = useState("");
  return (
    <Card leadId={leadId} stage="BOOKED" title="Log booking">
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div><Label className="text-xs">Booking amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
        <div><Label className="text-xs">Payment ref</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} /></div>
        <div><Label className="text-xs">Room #</Label><Input value={room} onChange={(e) => setRoom(e.target.value)} /></div>
      </div>
      <Button disabled={!amount || !ref} onClick={() => onBook(amount, ref, room)}>Confirm booking</Button>
    </Card>
  );
}

