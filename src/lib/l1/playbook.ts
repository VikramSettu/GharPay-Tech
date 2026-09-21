// The canonical Gharpayy step list. L1 review exists to prove — message by
// message — that every one of these actually happened.

import type { PlaybookStep } from "./types";

export const PHASE_LABEL: Record<string, string> = {
  open: "1 · Open",
  discover: "2 · Discover",
  match: "3 · Match",
  convince: "4 · Convince",
  close: "5 · Close the money",
};

export const CHAT_STEPS: PlaybookStep[] = [
  {
    id: "ack", label: "Acknowledged the customer in their first line", phase: "open", weight: 4,
    why: "The first reply must reference what they actually asked, not a template.",
    detect: /\b(sure|got it|noted|thanks for|understood|absolutely|perfect|of course|i can help|happy to help|let me help)\b/i,
  },
  {
    id: "identity", label: "Introduced self + Gharpayy", phase: "open", weight: 3,
    why: "A named human beats an anonymous number every single time.",
    detect: /\b(this is|i am|i'?m)\s+[A-Z][a-z]+|gharpayy\b/i,
  },
  {
    id: "d-location", label: "Captured preferred location / area", phase: "discover", weight: 6,
    why: "Zone drives every downstream match.",
    detect: /\b(which area|preferred location|where do you|locality|near which|area are you looking|which location)\b/i,
    confirm: /\b(hsr|btm|koramangala|whitefield|marathahalli|indiranagar|hebbal|electronic city|jayanagar|bellandur|sarjapur|banashankari|yelahanka|kr puram|rajaji|malleshwaram)\b/i,
  },
  {
    id: "d-budget", label: "Captured budget", phase: "discover", weight: 6,
    why: "No budget = no quotation = no booking.",
    detect: /\b(budget|price range|how much.*(spend|budget)|per month.*(budget|range))\b/i,
    confirm: /(₹|rs\.?|inr)\s?\d{3,}|\b\d{1,2}\s?k\b/i,
  },
  {
    id: "d-movein", label: "Captured move-in date", phase: "discover", weight: 6,
    why: "Date decides urgency and which inventory is even shown.",
    detect: /\b(move[\s-]?in|shifting|when do you|from when|date of joining|by when do you need)\b/i,
    confirm: /\b(today|tomorrow|immediate|asap|\d{1,2}(st|nd|rd|th)?\s?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|next (week|month))\b/i,
  },
  {
    id: "d-room", label: "Captured room type / sharing preference", phase: "discover", weight: 5,
    why: "Single vs double changes the price story completely.",
    detect: /\b(single|double|triple|sharing|private room|room type|ac or non[\s-]?ac|attached washroom)\b/i,
  },
  {
    id: "d-work", label: "Captured office / college + commute", phase: "discover", weight: 5,
    why: "Commute is the real reason people pick a PG.",
    detect: /\b(office|college|company|university|workplace|where do you work|which company|which college)\b/i,
  },
  {
    id: "d-duration", label: "Captured stay duration / food preference", phase: "discover", weight: 3,
    why: "Long stays and food-first customers get different offers.",
    detect: /\b(how long|duration of stay|months|food|veg|non[\s-]?veg|meals|mess)\b/i,
  },
  {
    id: "m-options", label: "Shared specific property options (named)", phase: "match", weight: 8,
    why: "Named properties with numbers, not 'we have many options'.",
    detect: /\b(option\s?\d|property|pg\b|gharpayy\s+[A-Z]|i have shortlisted|here are|sharing (you )?(\d|two|three|few))\b/i,
  },
  {
    id: "m-why", label: "Explained WHY each option fits this customer", phase: "match", weight: 7,
    why: "Matching without reasoning is just a list — reasoning is the sell.",
    detect: /\b(because|since|this suits|ideal for you|closest to your (office|college)|within your budget|matches your)\b/i,
  },
  {
    id: "m-media", label: "Sent photos / video / location pin", phase: "match", weight: 5,
    why: "Visual proof cuts the decision cycle in half.",
    detect: /(photo|image|video|pictures|maps\.app|goo\.gl\/maps|google\.com\/maps|location pin|sharing (the )?(pics|photos|video)|<attached|omitted>)/i,
  },
  {
    id: "v-value", label: "Communicated Gharpayy value (not price-only)", phase: "convince", weight: 6,
    why: "Verified inventory, zero brokerage and support are why we win.",
    detect: /\b(verified|no brokerage|zero brokerage|maintained by|our team|support|assistance|hassle[\s-]?free|we take care|move[\s-]?in support)\b/i,
  },
  {
    id: "v-objection", label: "Surfaced and handled the real objection", phase: "convince", weight: 7,
    why: "An unnamed objection is an unclosed deal.",
    detect: /\b(i understand|i hear you|the concern|if price is|in that case|let me check with the owner|alternative|instead we can|what if)\b/i,
  },
  {
    id: "c-tour", label: "Proposed a specific tour slot (day + time)", phase: "close", weight: 8,
    why: "'Let me know' is not a slot. Give two exact times.",
    detect: /\b((today|tomorrow|mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*(at|around|by)?\s*\d{1,2}(:\d{2})?\s?(am|pm)|visit at|tour at|\d{1,2}\s?(am|pm)\b)/i,
    confirm: /\b(ok|okay|yes|confirm|done|sure|works|fine)\b/i,
  },
  {
    id: "c-quote", label: "Shared full quotation (rent + deposit + terms)", phase: "close", weight: 7,
    why: "Partial pricing creates a second objection later.",
    detect: /\b(deposit|advance|token|maintenance|lock[\s-]?in|notice period|total (comes|would be)|all inclusive)\b/i,
  },
  {
    id: "c-urgency", label: "Created honest urgency (real scarcity)", phase: "close", weight: 5,
    why: "Beds do get taken — say so with facts, never with pressure.",
    detect: /\b(only \d+ (bed|room)s? left|last (bed|room)|getting booked|hold (it|the room)|blocked till|valid till|till (today|tomorrow))\b/i,
  },
  {
    id: "c-payment", label: "Made a clear payment / token ask", phase: "close", weight: 8,
    why: "No ask, no money. Every closing chat asks once, clearly.",
    detect: /\b(token amount|booking amount|pay|payment link|upi|advance of|block the (bed|room) with)\b/i,
  },
  {
    id: "c-next", label: "Locked a clear next step with a time", phase: "close", weight: 9,
    why: "Every conversation ends with who does what, by when.",
    detect: /\b(i (will|'ll) (call|message|share|confirm|follow up).*(at|by|tomorrow|today|in \d+)|shall i call you at|i will get back to you by|next step)\b/i,
  },
  {
    id: "c-followup", label: "Followed up after silence (no abandonment)", phase: "close", weight: 7,
    why: "Most leads are lost to silence, not to competitors.",
    detect: /\b(just following up|checking in|gentle reminder|any update|did you get a chance|following up on)\b/i,
  },
];

export const CALL_STEPS: PlaybookStep[] = [
  {
    id: "open", label: "Opened with name, Gharpayy and purpose", phase: "open", weight: 6,
    why: "Three seconds decide whether the call survives.",
    detect: /\b(this is|i am|i'?m)\b.*\bgharpayy\b|calling regarding|calling about/i,
  },
  {
    id: "permission", label: "Confirmed it is a good time to talk", phase: "open", weight: 4,
    why: "Permission earns attention.",
    detect: /\b(is this a good time|are you free|can we talk|2 minutes|two minutes)\b/i,
  },
  {
    id: "d-need", label: "Discovered the real requirement", phase: "discover", weight: 10,
    why: "Requirement, not just fields.",
    detect: /\b(what are you looking for|tell me|requirement|preference|which area|budget|move[\s-]?in)\b/i,
  },
  {
    id: "d-priority", label: "Identified the #1 priority and hidden concern", phase: "discover", weight: 8,
    why: "Everyone has one deal-breaker. Find it on the call.",
    detect: /\b(most important|priority|main concern|what matters most|apart from price|any concern)\b/i,
  },
  {
    id: "d-timeline", label: "Confirmed decision timeline and decision maker", phase: "discover", weight: 8,
    why: "You cannot forecast a booking without a date and a decider.",
    detect: /\b(by when will you decide|decision|who (else )?decides|parents|family|finalise|finalize)\b/i,
  },
  {
    id: "listen", label: "Summarised the requirement back", phase: "discover", weight: 6,
    why: "Repeating it back proves listening and kills rework.",
    detect: /\b(so if i understand|to summarise|to summarize|just to confirm|so you need|correct me if)\b/i,
  },
  {
    id: "m-match", label: "Recommended 2–3 properties with reasons", phase: "match", weight: 10,
    why: "Curation beats catalogue.",
    detect: /\b(i (would )?recommend|two options|three options|best fit|because it is|suits you because)\b/i,
  },
  {
    id: "v-value", label: "Built value before price", phase: "convince", weight: 8,
    why: "Price quoted before value always sounds expensive.",
    detect: /\b(verified|maintained|our team|support|no brokerage|move[\s-]?in assistance|quality)\b/i,
  },
  {
    id: "v-objection", label: "Handled the objection with evidence, not discount", phase: "convince", weight: 9,
    why: "Discounting first destroys margin and trust.",
    detect: /\b(i understand|let me explain|compared to|the reason|alternative|we can look at)\b/i,
  },
  {
    id: "c-next", label: "Closed with a specific next step owned by us", phase: "close", weight: 16,
    why: "No call ends without our commitment, our time, our action.",
    detect: /\b(i will|i'?ll)\b.*\b(call|send|share|confirm|book|visit|whatsapp)\b.*\b(at|by|today|tomorrow|in \d+)/i,
  },
  {
    id: "c-tour", label: "Confirmed tour date & time or payment step", phase: "close", weight: 10,
    why: "The next step must move money or move feet.",
    detect: /\b(tour|visit|token|advance|payment|booking amount)\b.*\b(\d{1,2}\s?(am|pm)|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  },
  {
    id: "c-crm", label: "Documented outcome + commitments in CRM", phase: "close", weight: 5,
    why: "Undocumented calls do not exist.",
    detect: /\b(noted in crm|updating the crm|logged|recorded)\b/i,
  },
];

/** The "10% extra" — the moves that turn a transaction into a relationship. */
export const EXTRA_VALUE_MARKERS: { id: string; label: string; detect: RegExp }[] = [
  { id: "commute", label: "Gave real commute time / route to office or college", detect: /\b(\d{1,2}\s?(min|mins|minutes)\s?(by|from|to|walk|drive|ride)|metro station|bus stop|walking distance)\b/i },
  { id: "food", label: "Explained food menu / meal timings unprompted", detect: /\b(menu|breakfast|lunch|dinner|meal timing|home[\s-]?style food|south indian|north indian)\b/i },
  { id: "safety", label: "Covered safety — CCTV, warden, gate timing", detect: /\b(cctv|security guard|warden|biometric|gate timing|safe for (girls|women)|24x7 security)\b/i },
  { id: "roommates", label: "Described roommate / community profile", detect: /\b(roommate|current residents|mostly (students|working)|community|floor mates)\b/i },
  { id: "flex", label: "Went back to the owner to get flexibility", detect: /\b(check with the owner|spoke to the owner|got you|special (rate|approval)|negotiat)/i },
  { id: "logistics", label: "Solved logistics — pickup, luggage, shifting help", detect: /\b(pick you up|pickup|luggage|shifting help|cab|auto|i will be there)\b/i },
  { id: "personal", label: "Personal touch — used their name, wished them, remembered detail", detect: /\b(congratulations|all the best|hope your (trip|journey|interview)|welcome to bangalore|good luck)\b/i },
  { id: "proactive", label: "Proactive alternative before being asked", detect: /\b(if this doesn'?t work|i also have|as a backup|option b|in case you)\b/i,
  },
  { id: "written", label: "Put commitments in writing (summary message)", detect: /\b(to summarise|to summarize|summary|as discussed|confirming in writing|noting down)\b/i },
  { id: "postmove", label: "Talked about life after move-in / support", detect: /\b(after you move|any issue.*(let me know|call me)|i will be your point of contact|24x7 support)\b/i },
];

export const HESITATION_MARKERS: { label: string; detect: RegExp }[] = [
  { label: "Passive hand-off to the customer ('let me know')", detect: /\b(let me know|as you wish|whenever you want|up to you|as per your convenience)\b/i },
  { label: "Dead-end 'not available' with no alternative", detect: /\b(not available|sold out|no rooms|we don'?t have)\b/i },
  { label: "Apologetic filler / low confidence", detect: /\b(sorry for the trouble|sorry sorry|i think maybe|not sure|might be|i guess)\b/i },
  { label: "Price-first opener", detect: /^(₹|rs\.?|inr)\s?\d/i },
  { label: "One-word dead reply", detect: /^(ok|okay|k|yes|no|sure|hmm|noted)\.?$/i },
];