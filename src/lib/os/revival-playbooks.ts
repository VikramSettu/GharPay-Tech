// 15 revival playbooks — each has script, channel, timing, SLA, offer.

import type { RevivalReason } from "./types";

export interface RevivalPlaybook {
  reason: RevivalReason;
  label: string;
  script: string;
  channel: "wa" | "call" | "email";
  timingDays: number;             // when to trigger from now
  offer?: string;
  sla: string;
}

export const REVIVAL_PLAYBOOKS: RevivalPlaybook[] = [
  { reason: "budget",         label: "Budget revival",           script: "Hey {{name}} — new options at your earlier budget just opened up. Want a quick look?", channel: "wa",   timingDays: 30, offer: "5% off deposit", sla: "reply 30m" },
  { reason: "office-change",  label: "Office relocation",        script: "Congrats on the new office. Sharing 3 options within 3km + free tour cab.",              channel: "wa",   timingDays: 7,  offer: "Free tour cab", sla: "reply 1h" },
  { reason: "college",        label: "College session start",    script: "Session starts soon — {{n}} beds left near {{college}}.",                                channel: "wa",   timingDays: 21, offer: "1st month EMI", sla: "reply 1h" },
  { reason: "family",         label: "Family approval regain",   script: "Setting up a parent-tour + reference call with existing tenant's family.",              channel: "call", timingDays: 5,  offer: "Parent video-tour", sla: "same-day" },
  { reason: "parent-approval",label: "Parent approval",          script: "Sharing a walkthrough video specifically for parents — safety, food, warden.",           channel: "wa",   timingDays: 3,  offer: "Parent video pack", sla: "reply 2h" },
  { reason: "roommate",       label: "Roommate found/lost",      script: "Sharing 2-bed / 3-bed re-match based on new roommate count.",                            channel: "wa",   timingDays: 3,  offer: "No re-tour fee", sla: "reply 1h" },
  { reason: "transfer",       label: "Company transfer",         script: "Handling city-to-city transfer with sister PG in {{city}}.",                             channel: "call", timingDays: 5,  offer: "Cross-city discount", sla: "same-day" },
  { reason: "job-switch",     label: "Job switch",               script: "New office confirmed? Re-matching options within 3km.",                                  channel: "wa",   timingDays: 7,  offer: "Free tour cab", sla: "reply 1h" },
  { reason: "salary",         label: "Salary hike / new job",    script: "Now that you've upgraded — sharing better options within same area.",                    channel: "wa",   timingDays: 14, offer: "Upgrade credit", sla: "reply 2h" },
  { reason: "festival",       label: "Festival return",          script: "Post-{{festival}} move-in special — deposit split into 2 EMIs.",                         channel: "wa",   timingDays: 7,  offer: "Festival EMI", sla: "reply 2h" },
  { reason: "bonus",          label: "Post-bonus revival",       script: "Bonus season — upgrade or move; sharing curated 3.",                                     channel: "wa",   timingDays: 30, offer: "Bonus upgrade credit", sla: "reply 2h" },
  { reason: "lease-ending",   label: "Current lease ending",     script: "Your current lease ends {{leaseEnd}} — pre-book 30d out with ₹1 token.",                 channel: "wa",   timingDays: 45, offer: "₹1 token block", sla: "reply 1h" },
  { reason: "internship",     label: "Internship start",         script: "Sharing intern-friendly 3-month plans with monthly billing.",                            channel: "wa",   timingDays: 21, offer: "Monthly billing", sla: "reply 2h" },
  { reason: "marriage",       label: "Marriage / couple move",   script: "Congrats! Sharing couple-friendly 1BHKs with private washroom.",                         channel: "call", timingDays: 14, offer: "Couple-move gift", sla: "same-day" },
  { reason: "emergency",      label: "Emergency move",           script: "Instant options — same-day move-in with waived tour.",                                   channel: "call", timingDays: 0,  offer: "Same-day check-in", sla: "reply 15m" },
];

export function playbookFor(reason: RevivalReason): RevivalPlaybook | undefined {
  return REVIVAL_PLAYBOOKS.find((p) => p.reason === reason);
}
