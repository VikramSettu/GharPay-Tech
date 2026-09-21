// Transcript parser. Accepts a WhatsApp export, a copy-pasted chat, or a
// simple "Agent: / Customer:" call transcript and normalises it.

import type { ChatMsg, Speaker } from "./types";

const WA = /^\[?(\d{1,2})[/-](\d{1,2})[/-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?\]?\s*[-–]?\s*([^:]{1,48}?):\s?([\s\S]*)$/i;
const TIME_ONLY = /^\[?(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?\]?\s*[-–]?\s*([^:]{1,48}?):\s?([\s\S]*)$/i;
const PLAIN = /^([A-Za-z][A-Za-z .'_-]{0,40}?):\s?([\s\S]*)$/;

const AGENT_WORDS = /\b(agent|gharpayy|tcm|me\b|us\b|team|closing|advisor|executive|rm\b|tour manager)\b/i;
const CUSTOMER_WORDS = /\b(customer|lead|client|prospect|guest)\b/i;

function to24(h: number, mer?: string) {
  if (!mer) return h;
  const pm = /p/i.test(mer);
  if (pm && h < 12) return h + 12;
  if (!pm && h === 12) return 0;
  return h;
}

export interface ParseOptions {
  /** Comma-separated names that belong to our side. */
  agentAliases?: string;
}

export function parseTranscript(raw: string, opts: ParseOptions = {}): ChatMsg[] {
  const aliases = (opts.agentAliases ?? "")
    .split(/[,\n]/).map((s) => s.trim().toLowerCase()).filter(Boolean);

  const lines = raw.replace(/\r/g, "").split("\n");
  type Draft = { date: Date | null; author: string; text: string };
  const drafts: Draft[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    let m = line.match(WA);
    if (m) {
      const [, d, mo, y, hh, mm, mer, author, text] = m;
      const year = Number(y.length === 2 ? `20${y}` : y);
      drafts.push({
        date: new Date(year, Number(mo) - 1, Number(d), to24(Number(hh), mer), Number(mm)),
        author: author.trim(), text: text.trim(),
      });
      continue;
    }
    m = line.match(TIME_ONLY);
    if (m) {
      const [, hh, mm, mer, author, text] = m;
      const base = new Date(2026, 0, 1, to24(Number(hh), mer), Number(mm));
      drafts.push({ date: base, author: author.trim(), text: text.trim() });
      continue;
    }
    m = line.match(PLAIN);
    if (m && m[1].split(" ").length <= 4) {
      drafts.push({ date: null, author: m[1].trim(), text: m[2].trim() });
      continue;
    }
    if (drafts.length) drafts[drafts.length - 1].text += `\n${line.trim()}`;
  }

  // Decide which author is us.
  const authors = Array.from(new Set(drafts.map((d) => d.author)));
  const isAgent = (author: string): Speaker => {
    const a = author.toLowerCase();
    if (aliases.some((x) => a.includes(x))) return "agent";
    if (CUSTOMER_WORDS.test(a)) return "customer";
    if (AGENT_WORDS.test(a)) return "agent";
    return "customer";
  };

  let speakers = drafts.map((d) => isAgent(d.author));
  // If nothing resolved to agent, assume the author who speaks the most
  // "Gharpayy language" is us; fall back to the second distinct author.
  if (!speakers.includes("agent") && authors.length >= 1) {
    const score = new Map<string, number>();
    for (const d of drafts) {
      const s = (d.text.match(/gharpayy|option|deposit|token|property|visit|tour|shall i|i will/gi) ?? []).length;
      score.set(d.author, (score.get(d.author) ?? 0) + s);
    }
    const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? authors[0];
    speakers = drafts.map((d) => (d.author === best ? "agent" : "customer"));
  }

  const first = drafts.find((d) => d.date)?.date ?? null;
  return drafts.map((d, i) => ({
    i,
    ts: d.date ? d.date.toISOString() : null,
    at: d.date && first ? Math.round((d.date.getTime() - first.getTime()) / 60000) : null,
    speaker: speakers[i],
    author: d.author,
    text: d.text,
  }));
}

export const SAMPLE_CHAT = `[10:02, 12/08/2026] Ananya: Hi, looking for a PG near HSR Layout
[10:31, 12/08/2026] Rahul (Gharpayy): Hi Ananya, this is Rahul from Gharpayy. Sure, I can help with HSR.
[10:32, 12/08/2026] Rahul (Gharpayy): What is your budget and by when do you want to move in?
[10:40, 12/08/2026] Ananya: Budget around 12k, moving in next week. Office is in Bellandur.
[10:44, 12/08/2026] Rahul (Gharpayy): Perfect. Option 1 Gharpayy Aster HSR 5th Sector at 11500 single AC, because it is 18 mins from Bellandur by cab. Sharing photos.
[10:45, 12/08/2026] Rahul (Gharpayy): <Media omitted>
[11:10, 12/08/2026] Ananya: Looks nice but slightly high for me
[16:20, 12/08/2026] Rahul (Gharpayy): I understand. Let me check with the owner, I can try to get you a special rate.
[09:15, 13/08/2026] Rahul (Gharpayy): Just following up — shall I block a visit tomorrow at 6 pm?
[09:40, 13/08/2026] Ananya: Let me discuss with my parents and confirm`;