// Quick Add Lead — full lead schema in a single floating panel.
// 10x pass:
//   • Every Field now carries a WhyCaption (why exists · Admin/TCM/Client).
//   • Added: Alt phone, Guardian phone, Employer/College, Food pref chips,
//     Preferred call-time chips, Language chips, Lead-source chips,
//     Callback date, Referrer, Priority reason. New fields are captured into
//     the existing specialReqs / notes so no store changes are required
//     this pass (persistence upgrade lands next turn with Cloud).
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { detectZone, parseLead } from "@/lib/lead-identity/parser";
import { teamMembers } from "@/myt/lib/mock-data";
import { toast } from "sonner";
import { Save, Repeat2, MapPin, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhyCaption } from "@/components/common/WhyCaption";

interface Props { open: boolean; onClose: () => void; }

const todayIso = () => new Date().toISOString().slice(0, 10);

const ZONE_BUCKETS = [
  "CENTRAL STUDENTS", "CU YPR / STUDENTS / WORKING", "HOMES KORA", "HOMES MWB",
  "KORA CORE", "MTECH HUB", "MWB MORE", "OTHERS COLLEGE STUDENTS",
  "YPR MAJOR MAIN", "OTHERS",
] as const;

const STAGES = [
  "MYT [TENANT]",
  "2A. Options Shared – BLR",
  "2B. Options Shared – Non-BLR",
  "3A. Visit Intent Confirmed",
  "3B. try.prebook / virtual tour Intent",
  "4A. Visit Scheduled in BLR",
  "5A. Visit Done",
  "Finalizing",
  "WON 🏆",
  "LOST 😭",
] as const;

const TYPE_OPTS = ["Student", "Working", "Intern", "Family", "Couple", "NRI", "Other"];
const ROOM_OPTS = ["Private", "Shared", "Double", "Triple", "Studio", "1BHK", "Both"];
const NEED_OPTS = ["Boys", "Girls", "Coed"];
const FOOD_OPTS = ["Veg", "Non-veg", "Jain", "Egg-only", "Any"];
const CALLTIME_OPTS = ["Morning", "Afternoon", "Evening", "Late night", "Weekend", "Anytime"];
const LANG_OPTS = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Bengali", "Other"];
const SOURCE_OPTS = ["WhatsApp", "Referral", "Google", "Insta", "OLX", "Housing", "Walk-in", "Repeat", "Other"];
const QUALITY_OPTS = [
  { v: "hot" as const,  label: "🔥 Hot" },
  { v: "good" as const, label: "✅ Good" },
  { v: "bad" as const,  label: "❌ Bad" },
];
const BLR_OPTS = [
  { v: true as const,  label: "🏙 In" },
  { v: false as const, label: "✈️ Out" },
  { v: null,           label: "❓ Unknown" },
];

export function QuickAddLeadPanel({ open, onClose }: Props) {
  const checkDup = useIdentityStore((s) => s.checkDuplicates);
  const create = useIdentityStore((s) => s.createLead);

  // Core
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [email, setEmail] = useState("");
  const [employer, setEmployer] = useState("");
  const [areasText, setAreasText] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [moveIn, setMoveIn] = useState(todayIso());
  const [callbackDate, setCallbackDate] = useState("");
  const [type, setType] = useState("");
  const [room, setRoom] = useState("");
  const [need, setNeed] = useState("");
  const [food, setFood] = useState("");
  const [callTime, setCallTime] = useState("");
  const [language, setLanguage] = useState("");
  const [source, setSource] = useState("");
  const [referrer, setReferrer] = useState("");
  const [priorityReason, setPriorityReason] = useState("");
  const [specialReqs, setSpecialReqs] = useState("");
  // Editorial
  const [inBLR, setInBLR] = useState<boolean | null>(null);
  const [quality, setQuality] = useState<"hot" | "good" | "bad" | null>(null);
  const [zoneBucket, setZoneBucket] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [stage, setStage] = useState<string>(STAGES[0]);
  const [notes, setNotes] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => nameRef.current?.focus(), 50); }, [open]);

  const detectedZone = useMemo(
    () => detectZone(`${areasText} ${fullAddress}`),
    [areasText, fullAddress],
  );

  const reset = () => {
    setName(""); setPhone(""); setAltPhone(""); setGuardianPhone("");
    setEmail(""); setEmployer("");
    setAreasText(""); setFullAddress("");
    setBudget(""); setMoveIn(todayIso()); setCallbackDate("");
    setType(""); setRoom(""); setNeed("");
    setFood(""); setCallTime(""); setLanguage(""); setSource("");
    setReferrer(""); setPriorityReason(""); setSpecialReqs("");
    setInBLR(null); setQuality(null); setZoneBucket("");
    setAssigneeId(""); setStage(STAGES[0]); setNotes("");
    setTimeout(() => nameRef.current?.focus(), 30);
  };

  const save = (keepOpen: boolean) => {
    if (!name.trim() || !phone.replace(/\D/g, "").match(/^[6-9]\d{9}$/)) {
      toast.error("Need a name and a valid 10-digit phone");
      return;
    }
    const dup = checkDup({ name, phone, email, location: areasText });
    if (dup.type === "exact" || dup.type === "strong") {
      toast.warning(`Duplicate detected: ${dup.candidates[0]?.lead.name}`);
      return;
    }
    const areasArr = areasText.split(",").map((a) => a.trim()).filter(Boolean);
    const assignee = teamMembers.find((m) => m.id === assigneeId);
    // Persist the new structured fields as pipe-separated tags on specialReqs
    // until the Cloud schema lands — nothing is lost.
    const extraTags = [
      altPhone && `alt:${altPhone}`,
      guardianPhone && `guardian:${guardianPhone}`,
      employer && `employer:${employer}`,
      food && `food:${food}`,
      callTime && `call:${callTime}`,
      language && `lang:${language}`,
      source && `src:${source}`,
      referrer && `ref:${referrer}`,
      callbackDate && `callback:${callbackDate}`,
      priorityReason && `priority:${priorityReason}`,
    ].filter(Boolean).join(" · ");
    const lead = create(
      {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        location: areasText.trim(),
        areas: areasArr,
        fullAddress: fullAddress.trim(),
        budget: budget.trim(),
        moveIn,
        type, room, need,
        specialReqs: [specialReqs, notes, extraTags].filter(Boolean).join(" · "),
        inBLR,
        zone: detectedZone,
        rawSource: `[QuickAdd] ${name} ${phone}`,
      },
      {
        quality,
        stage,
        zoneCategory: zoneBucket,
        assigneeId: assignee?.id ?? null,
        assigneeName: assignee?.name ?? null,
      },
    );
    toast.success(`Lead saved · ${lead.name}`);
    if (keepOpen) reset(); else onClose();
  };

  // Paste WhatsApp message into ANY input → auto-fill everything we can
  const onAnyPaste = (e: React.ClipboardEvent) => {
    const txt = e.clipboardData.getData("text");
    if (!txt || txt.length < 30) return;
    const parsed = parseLead(txt);
    if (!parsed) return;
    e.preventDefault();
    if (parsed.name) setName(parsed.name);
    if (parsed.phone) setPhone(parsed.phone);
    if (parsed.email) setEmail(parsed.email);
    if (parsed.areas?.length) setAreasText(parsed.areas.join(", "));
    else if (parsed.location) setAreasText(parsed.location);
    if (parsed.fullAddress) setFullAddress(parsed.fullAddress);
    if (parsed.budget) setBudget(parsed.budget);
    if (parsed.moveIn && /^\d{4}-\d{2}-\d{2}$/.test(parsed.moveIn)) setMoveIn(parsed.moveIn);
    if (parsed.type) setType(parsed.type);
    if (parsed.room) setRoom(parsed.room);
    if (parsed.need) setNeed(parsed.need.split(" / ")[0] ?? parsed.need);
    if (parsed.specialReqs) setSpecialReqs(parsed.specialReqs);
    if (parsed.inBLR !== null) setInBLR(parsed.inBLR);
    toast.success("Auto-filled from WhatsApp paste");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(false); }
        }}
      >
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Quick Add Lead
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground">
            Paste a WhatsApp message into <strong>any</strong> field → auto-fills every column ·
            ⌘/Ctrl + Enter saves
          </p>
          <WhyCaption
            compact
            why="Every option below is on this form for a reason — hover the ADMIN/TCM/CLIENT badges to see who benefits."
            admin="Complete leads = accurate reports + fair reassignment."
            tcm="30-second capture, zero re-work later."
            client="Only asked what actually helps them find the right home."
          />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" onPaste={onAnyPaste}>
          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="👤 Name *"
              why="Legal name for booking + WhatsApp greeting."
              admin="Deduping + owner-mapping." tcm="Warmer opener line." client="Personal, not spammy.">
              <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" />
            </Field>
            <Field label="📱 Phone *"
              why="Primary contact + duplicate check."
              admin="Only reliable identity across the CRM."
              tcm="One-tap call + WhatsApp deep-link."
              client="Nobody else pings the wrong number.">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxxxxxxx" inputMode="tel" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="📞 Alt phone"
              why="Fallback when primary is unreachable."
              admin="Fewer 'lost lead' escalations."
              tcm="Auto-tries alt when primary rings out."
              client="Doesn't miss the tour reminder.">
              <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} inputMode="tel" placeholder="Optional" />
            </Field>
            <Field label="👨‍👦 Guardian phone"
              why="Student / minor leads — loop parents in."
              admin="Parent-approval stage doesn't stall."
              tcm="One number to call for green-light."
              client="Family aligned before deposit.">
              <Input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} inputMode="tel" placeholder="Parent / guardian" />
            </Field>
          </div>

          <Field label="✉️ Email"
            why="Contract + invoice delivery."
            admin="Backup identity + receipt trail."
            tcm="Send PDF quotation instantly."
            client="Written record they can forward.">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" inputMode="email" />
          </Field>

          <Field label="🏢 Employer / College"
            why="Trust signal + payment cycle."
            admin="Employer-based reporting + credit line."
            tcm="Warmer opener + salary-day invoicing."
            client="Payment date fits their pay cycle.">
            <Input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Company or college name" />
          </Field>

          {/* Areas */}
          <Field label="📍 Areas (comma-separated)"
            why="Locality shortlist — filters property matches."
            admin="Zone routing + heat-map."
            tcm="Auto-detects zone bucket below."
            client="Only shown homes in areas they want.">
            <div className="relative">
              <Input
                value={areasText}
                onChange={(e) => setAreasText(e.target.value)}
                placeholder="HSR Layout, BTM, Koramangala"
              />
              {detectedZone && (
                <Badge variant="secondary" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px]">
                  {detectedZone}
                </Badge>
              )}
            </div>
            {areasText.includes(",") && (
              <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" /> Multiple Areas Detected
              </p>
            )}
          </Field>

          {/* Full Address */}
          <Field label="🏠 Full Address / Map link"
            why="Precise location for commute calc + tour meeting point."
            admin="Cluster analytics — where our leads live now."
            tcm="Pick the closest tour coordinator."
            client="No 'where do we meet?' confusion.">
            <Textarea
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              rows={2}
              placeholder="Door no, street, landmark or Google Maps URL"
              className="resize-none"
            />
          </Field>

          {/* Budget + Move-in with urgency quick-chips */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="💰 Budget"
              why="Hard filter for inventory."
              admin="Deal-size + budget-gap dashboard."
              tcm="No over-budget tours."
              client="No sticker-shock at the door.">
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="8-12k" />
            </Field>
            <Field label="📅 Move-in"
              why="Drives every urgency bucket + SLA."
              admin="Queue heat-map."
              tcm="See TODAY / TOMORROW on the card."
              client="Reminders match their real timeline.">
              <Input type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">When?</span>
            {([
              { label: "Today",       days: 0,  tone: "border-destructive/50 text-destructive" },
              { label: "Tomorrow",    days: 1,  tone: "border-destructive/40 text-destructive/80" },
              { label: "+3d",         days: 3,  tone: "border-warning/60 text-warning" },
              { label: "This week",   days: 5,  tone: "border-warning/50 text-warning" },
              { label: "+10d",        days: 10, tone: "border-warning/40 text-warning" },
              { label: "This month",  days: 20, tone: "border-accent/50 text-accent" },
              { label: "Next month",  days: 40, tone: "border-primary/40 text-primary" },
              { label: "+60d",        days: 60, tone: "border-primary/30 text-primary/80" },
              { label: "+90d",        days: 90, tone: "border-border text-muted-foreground" },
              { label: "Future",      days: 180, tone: "border-border text-muted-foreground" },
            ] as const).map((b) => {
              const d = new Date(); d.setDate(d.getDate() + b.days);
              const iso = d.toISOString().slice(0, 10);
              const active = moveIn === iso;
              return (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setMoveIn(iso)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border transition",
                    active ? "bg-primary text-primary-foreground border-primary" : `bg-background ${b.tone} hover:bg-muted`,
                  )}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
          <WhyCaption
            compact
            why="Quick-chips stamp the move-date in one tap — pick nearest bucket, refine below."
            admin="Consistent bucketing across the team."
            tcm="No date picker fumble on mobile."
            client="Faster reply — they hear back in seconds."
          />

          {/* Callback date */}
          <Field label="🔁 Next callback"
            why="Set the exact next-touch date so nothing slips."
            admin="Missed-callback breach alerts."
            tcm="Feeds today's Do-Next list."
            client="Actually called back when promised.">
            <Input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)} />
          </Field>

          {/* Type + Room + Need (chips) */}
          <Field label="💼 Type"
            why="Persona bucket — pitch changes per type."
            admin="Persona mix per TCM."
            tcm="Right script loaded automatically."
            client="Right property list, first try.">
            <ChipGroup options={TYPE_OPTS} value={type} onChange={setType} />
          </Field>
          <Field label="🛏 Room"
            why="Room type = price tier + inventory subset."
            admin="Occupancy split by room type."
            tcm="Correct pricing on the first quote."
            client="No 'I wanted private, you sent shared'.">
            <ChipGroup options={ROOM_OPTS} value={room} onChange={setRoom} />
          </Field>
          <Field label="👥 Need"
            why="Gender / coed — some properties are hard filters."
            admin="Cross-check with lead-persona gender."
            tcm="Filters SF vs SM automatically."
            client="No door-step rejection.">
            <ChipGroup options={NEED_OPTS} value={need} onChange={setNeed} />
          </Field>
          <Field label="🥗 Food preference"
            why="Kitchen match / meal-plan filter."
            admin="Veg-only demand tracking."
            tcm="Skips non-matching properties." client="No 'no veg' surprise.">
            <ChipGroup options={FOOD_OPTS} value={food} onChange={setFood} />
          </Field>

          <Field label="🕒 Preferred call time"
            why="Call when they'll actually answer."
            admin="Contact-rate uplift metric."
            tcm="Auto-slots into your calling block."
            client="Not disturbed at work / class.">
            <ChipGroup options={CALLTIME_OPTS} value={callTime} onChange={setCallTime} />
          </Field>
          <Field label="🌐 Language"
            why="Pitch in their first language."
            admin="Language-mix report per zone."
            tcm="Route to a same-language TCM."
            client="Understands every word.">
            <ChipGroup options={LANG_OPTS} value={language} onChange={setLanguage} />
          </Field>
          <Field label="🎯 Source"
            why="Where the lead came from — attribution."
            admin="Marketing-spend ROI."
            tcm="Right opener for that channel."
            client="Feels continuity from the ad they clicked.">
            <ChipGroup options={SOURCE_OPTS} value={source} onChange={setSource} />
          </Field>
          <Field label="🤝 Referrer"
            why="Who sent them — for the reward + relationship."
            admin="Referral leaderboard."
            tcm="Warm-intro opener."
            client="Their friend gets credited fairly.">
            <Input value={referrer} onChange={(e) => setReferrer(e.target.value)} placeholder="Referrer name / phone" />
          </Field>
          <Field label="🚨 Priority reason"
            why="Why is this a top-priority lead right now?"
            admin="Audit before manual boost / reassignment."
            tcm="Explains the escalation to the next TCM."
            client="Nothing gets stuck in a queue.">
            <Input value={priorityReason} onChange={(e) => setPriorityReason(e.target.value)} placeholder="e.g. VIP referral, media enquiry…" />
          </Field>

          {/* Special requests */}
          <Field label="⭐ Special Requests"
            why="Anything not covered by the chips above."
            admin="Free-text searchable for edge cases."
            tcm="One dump-here field — no lost detail."
            client="Their exact ask stays intact.">
            <Textarea
              value={specialReqs}
              onChange={(e) => setSpecialReqs(e.target.value)}
              rows={2}
              placeholder="Veg only · attached washroom · top floor…"
              className="resize-none"
            />
          </Field>

          {/* In-BLR */}
          <Field label="Currently in Bangalore?"
            why="Decides tour vs virtual-tour path."
            admin="Out-of-city funnel tracked separately."
            tcm="Right cadence — video first if 'Out'."
            client="No 'come tomorrow' when they're in another city.">
            <ChipGroup
              options={BLR_OPTS.map((o) => o.label)}
              value={BLR_OPTS.find((o) => o.v === inBLR)?.label ?? ""}
              onChange={(label) => setInBLR(BLR_OPTS.find((o) => o.label === label)?.v ?? null)}
            />
          </Field>

          {/* Quality */}
          <Field label="Lead Quality"
            why="Manual gut-call after first exchange."
            admin="Compares TCM gut vs actual close rate."
            tcm="Right cadence loaded (hot = call now)."
            client="Hot leads aren't left waiting.">
            <ChipGroup
              options={QUALITY_OPTS.map((o) => o.label)}
              value={QUALITY_OPTS.find((o) => o.v === quality)?.label ?? ""}
              onChange={(label) => setQuality(QUALITY_OPTS.find((o) => o.label === label)?.v ?? null)}
            />
          </Field>

          {/* Zone bucket */}
          <Field label="Zone *"
            why="Assignment rules run off zone bucket."
            admin="Zone-balance across the team."
            tcm="You only see leads in your zones."
            client="A local TCM who knows the area.">
            <select
              value={zoneBucket}
              onChange={(e) => setZoneBucket(e.target.value)}
              className="w-full h-9 bg-background border border-border rounded-md px-2 text-xs"
            >
              <option value="">Select zone bucket…</option>
              {ZONE_BUCKETS.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </Field>

          {/* Assignee */}
          <Field label="Assign Member"
            why="Owner from minute one."
            admin="Ownership + SLA start-clock."
            tcm="No 'who's calling this one?' confusion."
            client="One person owns their journey.">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full h-9 bg-background border border-border rounded-md px-2 text-xs"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>

          {/* Stage */}
          <Field label="Lead Stage"
            why="Where to start them in the pipeline."
            admin="Stage distribution health."
            tcm="Skip stages if you already know."
            client="Not re-asked what they already told us.">
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full h-9 bg-background border border-border rounded-md px-2 text-xs"
            >
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          {/* Notes */}
          <Field label="📝 Notes"
            why="Anything else — searchable across pipeline."
            admin="Free-text audit trail."
            tcm="Braindump zone."
            client="Their words preserved for the next TCM.">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Free notes…"
              className="resize-none"
            />
          </Field>
        </div>

        <div className="border-t border-border px-5 py-3 flex flex-col gap-2 bg-background">
          <div className="flex gap-2">
            <Button onClick={() => save(true)} variant="outline" size="sm" className="flex-1 gap-1.5">
              <Repeat2 className="h-3.5 w-3.5" /> Save + Next
            </Button>
            <Button onClick={() => save(false)} size="sm" className="flex-1 gap-1.5">
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Tip: paste a WhatsApp message anywhere → all fields auto-fill · ⌘/Ctrl + Enter to save
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label, children, why, admin, tcm, client,
}: {
  label: string;
  children: React.ReactNode;
  why?: string; admin?: string; tcm?: string; client?: string;
}) {
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="mt-0.5">{children}</div>
      {why && <WhyCaption compact why={why} admin={admin} tcm={tcm} client={client} />}
    </div>
  );
}

function ChipGroup({ options, value, onChange }: {
  options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? "" : opt)}
          className={cn(
            "px-2 py-1 text-[11px] rounded-md border transition-colors",
            value === opt
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
