import { CallStage, Lead, DiscoveryKey } from './types';
import { CALL_PLAYS, DISCOVERY_FIELDS, filled } from './call-plan';

/** ---------------------------------------------------------------
 *  The talk track — C1..C5 written as a conversation, not a form.
 *
 *  Two hard forks decide which words come out of the mouth:
 *    · path      — is the customer already in Bangalore, or shifting in?
 *    · language  — English / Hinglish / Hindi.
 *
 *  Each line is something the operator actually says out loud, in
 *  order, with whatever we already know spliced in so the call
 *  never starts from zero. Read top to bottom and the call is done.
 *  --------------------------------------------------------------- */

export type LineKind = 'open' | 'say' | 'ask' | 'listen' | 'handle' | 'close';

/** BLR CX can be taken to a property today. Out-of-BLR CX cannot — ever. */
export type LeadPath = 'blr' | 'outstation' | 'unknown';

export type ScriptLang = 'en' | 'hinglish' | 'hindi';

export const SCRIPT_LANGS: { value: ScriptLang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hinglish', label: 'Hinglish' },
  { value: 'hindi', label: 'हिंदी' },
];

export const PATH_META: Record<LeadPath, { label: string; short: string; win: string; tone: 'good' | 'warn' | 'muted' }> = {
  blr: { label: 'In Bangalore', short: 'BLR CX', win: 'Physical visit — they can stand inside the room today.', tone: 'good' },
  outstation: { label: 'Out of Bangalore', short: 'OUT CX', win: 'Virtual tour + video proof — never promise a physical visit.', tone: 'warn' },
  unknown: { label: 'City unknown', short: '???', win: 'First question of C1 is the fork: are you in Bangalore right now?', tone: 'muted' },
};

/** The fork, read off the dossier. Everything downstream branches on this. */
export function leadPath(lead: Lead): LeadPath {
  const v = (lead.discovery?.inBangalore ?? '').toLowerCase();
  if (!v) return 'unknown';
  if (v.includes('out')) return 'outstation';
  if (v.includes('unknown')) return 'unknown';
  if (v.includes('bangalore') || v.includes('blr') || v.includes('here')) return 'blr';
  return 'unknown';
}

/** A line may be phrased per language; `en` is always the fallback. */
type Phrase = string | Partial<Record<ScriptLang, string>>;

export interface TalkLine {
  kind: LineKind;
  /** Word-for-word line. Anything in [brackets] is a live value. */
  text: string;
  /** Dossier field this line fills, when it fills one. */
  field?: DiscoveryKey;
  /** Why this line exists — one short reason, shown small. */
  note?: string;
  /** Only shown on this path. Absent = shown on every path. */
  path?: LeadPath;
}

interface RawLine extends Omit<TalkLine, 'text'> { text: Phrase }

export const LINE_META: Record<LineKind, { label: string; tone: 'primary' | 'good' | 'warn' | 'muted' }> = {
  open: { label: 'Open', tone: 'primary' },
  say: { label: 'Say', tone: 'muted' },
  ask: { label: 'Ask', tone: 'primary' },
  listen: { label: 'Listen', tone: 'muted' },
  handle: { label: 'Handle', tone: 'warn' },
  close: { label: 'Close', tone: 'good' },
};

const first = (n: string) => (n || 'there').split(' ')[0];

function known(lead: Lead, key: DiscoveryKey, fallback: string) {
  const v = lead.discovery?.[key];
  return v && v.trim() ? v.trim() : fallback;
}

const money = (n?: number) => (n ? `₹${(n / 1000).toFixed(0)}k` : 'your budget');

function say(p: Phrase, lang: ScriptLang): string {
  if (typeof p === 'string') return p;
  return p[lang] ?? p.hinglish ?? p.en ?? '';
}

/** The full script for one call, personalised with what we already know. */
export function talkTrack(
  lead: Lead,
  stage: CallStage,
  opts: { lang?: ScriptLang; path?: LeadPath } = {},
): TalkLine[] {
  const lang = opts.lang ?? 'en';
  const path = opts.path ?? leadPath(lead);

  const n = first(lead.name);
  const area = known(lead, 'areas', lead.area || 'Bangalore');
  const budget = known(lead, 'budget', money(lead.budget));
  const move = known(lead, 'moveIn', lead.moveInDate || 'your move date');
  const office = known(lead, 'officeLocation', 'your office / college');
  const sharing = known(lead, 'sharing', 'the sharing you want');

  const raw = rawTrack(stage, path, { n, area, budget, move, office, sharing });

  return raw
    .filter((l) => !l.path || l.path === path)
    .map((l) => ({ ...l, text: say(l.text, lang) }));
}

interface Tokens {
  n: string; area: string; budget: string; move: string; office: string; sharing: string;
}

function rawTrack(stage: CallStage, path: LeadPath, t: Tokens): RawLine[] {
  const { n, area, budget, move, office, sharing } = t;

  /* ---------------- C1 · Qualify — the fork lives here ---------------- */
  if (stage === 1) return [
    {
      kind: 'open', note: 'Name first, purpose second. Never open with a pitch.',
      text: {
        en: `Hey, am I speaking with ${n}? This is from Gharpayy — you were looking for a stay in Bangalore, right?`,
        hinglish: `Hi, ${n} baat kar rahe hain? Gharpayy se call kar raha hoon — aap Bangalore mein stay dekh rahe the na?`,
        hindi: `नमस्ते, ${n} जी बोल रहे हैं? मैं घरपे से बोल रहा हूँ — आप बैंगलोर में स्टे देख रहे थे ना?`,
      },
    },
    {
      kind: 'say', note: 'Sets the length of the call so they stay on.',
      text: {
        en: `Two minutes only, then I send options on WhatsApp — no spam, just the 3 that actually fit.`,
        hinglish: `Sirf do minute lunga, phir WhatsApp pe options bhej dunga — spam nahi, bas 3 jo actually fit hote hain.`,
        hindi: `बस दो मिनट लूँगा, फिर व्हाट्सएप पर ऑप्शन भेज दूँगा — सिर्फ़ वही तीन जो आपके लिए सही हैं।`,
      },
    },
    {
      kind: 'ask', field: 'inBangalore', note: 'THE FORK. In BLR = physical visit path. Out of BLR = virtual tour path. Nothing else in this call matters more.',
      text: {
        en: `First, one thing — are you in Bangalore right now, or shifting in from another city?`,
        hinglish: `Pehle ek cheez — aap abhi Bangalore mein hi hain, ya kisi doosre city se shift kar rahe hain?`,
        hindi: `पहले एक बात — आप अभी बैंगलोर में ही हैं, या किसी दूसरे शहर से शिफ़्ट कर रहे हैं?`,
      },
    },
    // path-specific framing right after the fork
    {
      kind: 'say', path: 'blr', note: 'BLR CX: the whole call is aimed at one physical visit. Say it now.',
      text: {
        en: `Perfect — since you are in the city, the fastest way is you see 2 places yourself. Photos never tell the full story.`,
        hinglish: `Perfect — aap city mein hain to sabse fast tarika hai aap khud 2 jagah dekh lo. Photos se pura pata nahi chalta.`,
        hindi: `बढ़िया — आप शहर में हैं तो सबसे तेज़ तरीका है कि आप खुद दो जगह देख लें। फ़ोटो से पूरी बात नहीं पता चलती।`,
      },
    },
    {
      kind: 'say', path: 'outstation', note: 'OUT CX: never promise a physical visit. Virtual tour + video is the deliverable.',
      text: {
        en: `Got it — then we do it on video. I will take you through the room, kitchen and washroom live, and share the actual videos, not brochure photos.`,
        hinglish: `Theek hai — to hum video pe karenge. Main aapko room, kitchen, washroom live dikhaunga, aur actual videos bhejunga — brochure photos nahi.`,
        hindi: `ठीक है — तो हम वीडियो पर करेंगे। मैं आपको कमरा, किचन और वॉशरूम लाइव दिखाऊँगा, और असली वीडियो भेजूँगा।`,
      },
    },
    {
      kind: 'ask', field: 'areas', note: 'Their words, not our zones. Write it as they say it.',
      text: {
        en: `Which side of the city do you want to stay — any area in mind?`,
        hinglish: `City ke kis side stay karna hai — koi area mind mein hai?`,
        hindi: `शहर के किस हिस्से में रहना है — कोई एरिया सोचा है?`,
      },
    },
    {
      kind: 'ask', field: 'officeLocation', note: 'Location before price. The commute decides which 3 options you send.',
      text: {
        en: `And where do you head out to every morning — office or college? Exact area is enough.`,
        hinglish: `Aur subah kahan jaana hota hai — office ya college? Area bata dijiye.`,
        hindi: `और सुबह कहाँ जाना होता है — ऑफ़िस या कॉलेज? एरिया बता दीजिए।`,
      },
    },
    {
      kind: 'ask', field: 'moveIn', note: 'The move date decides the whole follow-up cadence.',
      text: {
        en: `By when do you want to move in?`,
        hinglish: `Move-in kab tak karna hai?`,
        hindi: `आप कब तक शिफ़्ट करना चाहते हैं?`,
      },
    },
    {
      kind: 'ask', field: 'budget', note: 'Range before price. Never quote first — quotation belongs to C3.',
      text: {
        en: `What monthly rent are you comfortable with — a range is fine.`,
        hinglish: `Monthly rent kitna comfortable hai — range bata dijiye.`,
        hindi: `महीने का किराया कितना ठीक रहेगा — एक रेंज बता दीजिए।`,
      },
    },
    {
      kind: 'ask', field: 'whoIsComing', note: 'Group size changes the room math and the price.',
      text: {
        en: `Is this just for you, or are you shifting with someone?`,
        hinglish: `Ye sirf aapke liye hai ya kisi ke saath shift kar rahe hain?`,
        hindi: `यह सिर्फ़ आपके लिए है या किसी के साथ शिफ़्ट कर रहे हैं?`,
      },
    },
    {
      kind: 'ask', field: 'sharing', note: 'Must-haves in their words: sharing, food, AC, attached washroom.',
      text: {
        en: `Any must-haves — private room, attached washroom, food, AC?`,
        hinglish: `Koi must-have hai — private room, attached washroom, food, AC?`,
        hindi: `कोई ज़रूरी चीज़ — प्राइवेट रूम, अटैच्ड वॉशरूम, खाना, एसी?`,
      },
    },
    { kind: 'listen', text: `Stop talking. Write down the exact words they use for area, budget and must-haves.`, note: 'The dossier below is filled from this line.' },
    {
      kind: 'close', path: 'blr', note: 'C1 is won only when a physical visit slot is agreed.',
      text: {
        en: `So — ${area}, around ${budget}, moving by ${move}. I will shortlist 2 near ${office} and take you to see them. Today evening or tomorrow morning?`,
        hinglish: `To — ${area}, around ${budget}, ${move} tak move. Main ${office} ke paas 2 shortlist karke dikha dunga. Aaj evening ya kal morning?`,
        hindi: `तो — ${area}, लगभग ${budget}, ${move} तक शिफ़्ट। मैं ${office} के पास दो जगह छाँटकर दिखा दूँगा। आज शाम या कल सुबह?`,
      },
    },
    {
      kind: 'close', path: 'outstation', note: 'C1 is won only when a virtual-tour slot is agreed. No slot = not won.',
      text: {
        en: `So — ${area}, around ${budget}, moving by ${move}. I will send videos today and do a live virtual tour with you. Tonight after 8, or tomorrow morning?`,
        hinglish: `To — ${area}, around ${budget}, ${move} tak move. Aaj videos bhejta hoon aur live virtual tour karwa dunga. Aaj raat 8 ke baad ya kal morning?`,
        hindi: `तो — ${area}, लगभग ${budget}, ${move} तक शिफ़्ट। आज वीडियो भेजता हूँ और लाइव वर्चुअल टूर करा दूँगा। आज रात आठ के बाद या कल सुबह?`,
      },
    },
    {
      kind: 'close', path: 'unknown', note: 'Do not close C1 until the city fork is answered.',
      text: {
        en: `Before we go further — I still need to know if you are in Bangalore or coming from outside. That decides everything I send you.`,
        hinglish: `Aage badhne se pehle — ye batana zaroori hai ki aap Bangalore mein hain ya bahar se aa rahe hain. Usi se decide hota hai kya bhejna hai.`,
        hindi: `आगे बढ़ने से पहले — यह बताना ज़रूरी है कि आप बैंगलोर में हैं या बाहर से आ रहे हैं। इसी से तय होता है कि क्या भेजना है।`,
      },
    },
  ];

  /* ---------------- C2 · Shortlist & tour ---------------- */
  if (stage === 2) return [
    {
      kind: 'open', note: 'Reference the last call so it feels continuous.',
      text: {
        en: `Hey ${n}, Gharpayy — I sent you the places in ${area} around ${budget}. Did you get a chance to see them?`,
        hinglish: `Hi ${n}, Gharpayy se — maine ${area} mein ${budget} wale options bheje the. Dekh paaye?`,
        hindi: `नमस्ते ${n}, घरपे से — मैंने ${area} में ${budget} वाले ऑप्शन भेजे थे। देख पाए?`,
      },
    },
    { kind: 'listen', text: `Let them react to the options first. Their first sentence tells you which one is the front-runner.`, note: 'Never re-ask what C1 already captured.' },
    {
      kind: 'ask', field: 'movingFeasibility', note: 'Immediate vs 30d vs researching changes the cadence and the pressure.',
      text: {
        en: `And realistically — is this an immediate shift, or a few weeks away?`,
        hinglish: `Aur sach mein — shift immediate hai ya kuch weeks baad?`,
        hindi: `और सच में — शिफ़्ट तुरंत है या कुछ हफ़्तों बाद?`,
      },
    },
    {
      kind: 'ask', field: 'decisionMaker', note: 'If parents or the company decide, get them on the tour itself.',
      text: {
        en: `Is this your own decision, or do your parents / company also need to see it?`,
        hinglish: `Decision aapka hai ya parents / company ko bhi dekhna hai?`,
        hindi: `फ़ैसला आपका है या माता-पिता / कंपनी को भी देखना है?`,
      },
    },
    {
      kind: 'say', note: 'Justify the tour with commute, not with discount.',
      text: {
        en: `Based on ${office} and ${sharing}, two of them genuinely make sense. Let us lock one slot and settle it.`,
        hinglish: `${office} aur ${sharing} ke hisaab se do options sahi baithte hain. Ek slot lock karke settle kar dete hain.`,
        hindi: `${office} और ${sharing} के हिसाब से दो ऑप्शन सही बैठते हैं। एक स्लॉट लॉक करके तय कर लेते हैं।`,
      },
    },
    {
      kind: 'ask', field: 'tourSlot', path: 'blr', note: 'Two slots, never "when are you free?". C2 wins on a physical visit locked.',
      text: {
        en: `I can do today around 6, or tomorrow 11 — which works for the visit?`,
        hinglish: `Aaj 6 baje ya kal 11 baje — visit ke liye kaunsa theek hai?`,
        hindi: `आज छह बजे या कल ग्यारह बजे — विज़िट के लिए कौन सा ठीक है?`,
      },
    },
    {
      kind: 'ask', field: 'tourSlot', path: 'outstation', note: 'C2 wins on a virtual tour actually happening — a scheduled video call, not "I will send videos".',
      text: {
        en: `For the virtual tour I need you free for ten minutes on video — tonight after 8, or tomorrow morning?`,
        hinglish: `Virtual tour ke liye das minute video pe free chahiye — aaj raat 8 ke baad ya kal morning?`,
        hindi: `वर्चुअल टूर के लिए दस मिनट वीडियो पर चाहिए — आज रात आठ के बाद या कल सुबह?`,
      },
    },
    {
      kind: 'ask', field: 'tourSlot', path: 'unknown', note: 'Still unknown city — settle the fork before booking anything.',
      text: {
        en: `Are you in the city this week? If yes we visit, if not we do it on video.`,
        hinglish: `Is week city mein hain? Haan to visit karte hain, nahi to video pe kar lenge.`,
        hindi: `इस हफ़्ते शहर में हैं? हाँ तो विज़िट करते हैं, नहीं तो वीडियो पर कर लेंगे।`,
      },
    },
    {
      kind: 'close', note: 'A tour is real only once the pin / video-call link is sent.',
      text: {
        en: `Locking it. I will send the pin and the caretaker number on WhatsApp, and call you an hour before.`,
        hinglish: `Lock kar raha hoon. Pin aur caretaker number WhatsApp pe bhej dunga, aur ek ghanta pehle call karunga.`,
        hindi: `लॉक कर रहा हूँ। पिन और केयरटेकर नंबर व्हाट्सएप पर भेज दूँगा, और एक घंटा पहले कॉल करूँगा।`,
      },
    },
  ];

  /* ---------------- C3 · Close (quotation lives here) ---------------- */
  if (stage === 3) return [
    {
      kind: 'open', note: 'Open on feeling, not on booking.',
      text: {
        en: `Hey ${n}, how did the place feel?`,
        hinglish: `Hi ${n}, jagah kaisi lagi?`,
        hindi: `नमस्ते ${n}, जगह कैसी लगी?`,
      },
    },
    { kind: 'listen', text: `Ten seconds of silence. Their first sentence is the real objection.`, note: 'Most closes are lost by talking too early.' },
    {
      kind: 'ask', field: 'objection', note: 'Name it out loud or it kills the deal silently.',
      text: {
        en: `Honestly — what is the one thing stopping you from confirming today?`,
        hinglish: `Sach batayein — aaj confirm karne mein ek cheez kya rok rahi hai?`,
        hindi: `सच बताइए — आज कन्फ़र्म करने में एक चीज़ क्या रोक रही है?`,
      },
    },
    {
      kind: 'ask', field: 'competition', note: 'Comparing / booked elsewhere changes the urgency completely.',
      text: {
        en: `Are you looking at a couple of other places too, or is this the one?`,
        hinglish: `Kuch aur jagah bhi dekh rahe hain ya ye final hai?`,
        hindi: `कुछ और जगह भी देख रहे हैं या यही फ़ाइनल है?`,
      },
    },
    { kind: 'handle', text: `Handle exactly one objection — price, location or timing. One answer, then stop.`, note: 'Stacking answers sounds like desperation.' },
    {
      kind: 'say', note: 'Quotation is a C3 event and only after the dossier is complete. Never quote on C1.',
      text: {
        en: `Sending the written quotation now — rent, deposit, what is included, and the move-in date. No hidden line items.`,
        hinglish: `Written quotation bhej raha hoon — rent, deposit, kya included hai, aur move-in date. Koi hidden charge nahi.`,
        hindi: `लिखित कोटेशन भेज रहा हूँ — किराया, डिपॉज़िट, क्या शामिल है, और मूव-इन डेट। कोई छिपा चार्ज नहीं।`,
      },
    },
    {
      kind: 'ask', field: 'moveInConfirmed', note: 'A confirmed date turns a tour into a booking.',
      text: {
        en: `You are still moving in around ${move}, correct?`,
        hinglish: `${move} ke around hi move kar rahe hain na?`,
        hindi: `आप ${move} के आसपास ही शिफ़्ट कर रहे हैं ना?`,
      },
    },
    {
      kind: 'ask', field: 'tokenReadiness', note: 'Ask, then stay silent until they answer.',
      text: {
        en: `Then let me block the room for you today — shall I go ahead?`,
        hinglish: `To main aaj room block kar deta hoon — aage badhu?`,
        hindi: `तो मैं आज कमरा ब्लॉक कर देता हूँ — आगे बढ़ूँ?`,
      },
    },
    {
      kind: 'close', note: 'Never end C3 without the next step being money.',
      text: {
        en: `Blocking it now. Payment link on WhatsApp, and I stay on the line with you.`,
        hinglish: `Abhi block kar raha hoon. Payment link WhatsApp pe, aur main line pe rehta hoon.`,
        hindi: `अभी ब्लॉक कर रहा हूँ। पेमेंट लिंक व्हाट्सएप पर, और मैं लाइन पर रहता हूँ।`,
      },
    },
  ];

  /* ---------------- C4 · Money & handover ---------------- */
  if (stage === 4) return [
    {
      kind: 'open', note: 'Do not hang up before the money lands.',
      text: {
        en: `Hey ${n}, sending the payment link now — I will stay on the call while you do it.`,
        hinglish: `Hi ${n}, payment link bhej raha hoon — aap karte hain, main call pe rehta hoon.`,
        hindi: `नमस्ते ${n}, पेमेंट लिंक भेज रहा हूँ — आप करते हैं, मैं कॉल पर रहता हूँ।`,
      },
    },
    {
      kind: 'ask', field: 'tokenAmount', note: 'No agreed number = no booking, only a promise.',
      text: {
        en: `Confirming the token we agreed — [amount], right?`,
        hinglish: `Token confirm kar leta hoon — [amount], sahi?`,
        hindi: `टोकन कन्फ़र्म कर लेता हूँ — [amount], सही?`,
      },
    },
    {
      kind: 'ask', field: 'paymentMode', note: 'Mode decides how fast the money actually lands.',
      text: {
        en: `UPI now, or bank transfer?`,
        hinglish: `UPI abhi, ya bank transfer?`,
        hindi: `यूपीआई अभी, या बैंक ट्रांसफ़र?`,
      },
    },
    {
      kind: 'ask', field: 'agreementReady', note: 'Handover stalls on paperwork more often than on price.',
      text: {
        en: `For the agreement I need an ID, one photo and an emergency contact — ready now?`,
        hinglish: `Agreement ke liye ID, ek photo aur emergency contact chahiye — abhi ready hai?`,
        hindi: `एग्रीमेंट के लिए आईडी, एक फ़ोटो और इमरजेंसी कॉन्टैक्ट चाहिए — अभी तैयार है?`,
      },
    },
    {
      kind: 'close', note: 'End with who, what and when — no loose ends.',
      text: {
        en: `Received. Room locked for ${move}. Agreement and caretaker number coming on WhatsApp; someone hands over keys on the day.`,
        hinglish: `Mil gaya. Room ${move} ke liye lock. Agreement aur caretaker number WhatsApp pe; keys us din hand over ho jayengi.`,
        hindi: `मिल गया। कमरा ${move} के लिए लॉक। एग्रीमेंट और केयरटेकर नंबर व्हाट्सएप पर; चाबी उस दिन दे दी जाएगी।`,
      },
    },
  ];

  /* ---------------- C5 · Revive ---------------- */
  return [
    {
      kind: 'open', note: 'Say why you are calling back before pitching anything.',
      text: {
        en: `Hey ${n}, Gharpayy — we spoke about a stay in ${area}. Is that plan still on, or has it changed?`,
        hinglish: `Hi ${n}, Gharpayy — humne ${area} mein stay ki baat ki thi. Plan abhi bhi hai ya change ho gaya?`,
        hindi: `नमस्ते ${n}, घरपे से — हमने ${area} में स्टे की बात की थी। प्लान अभी भी है या बदल गया?`,
      },
    },
    {
      kind: 'ask', field: 'revivalReason', note: 'C5 only works if you name the real reason it went cold.',
      text: {
        en: `Last time it did not move — what was the actual reason?`,
        hinglish: `Pichli baar aage nahi badha — actual reason kya tha?`,
        hindi: `पिछली बार आगे नहीं बढ़ा — असली वजह क्या थी?`,
      },
    },
    {
      kind: 'say', note: 'One new reason to restart. Only one.',
      text: {
        en: `Fair enough. One thing changed since — [new property / price drop / new slot] in ${area}.`,
        hinglish: `Theek hai. Ek cheez badli hai — ${area} mein [naya property / price drop / naya slot].`,
        hindi: `ठीक है। एक चीज़ बदली है — ${area} में [नई प्रॉपर्टी / प्राइस ड्रॉप / नया स्लॉट]।`,
      },
    },
    {
      kind: 'ask', field: 'recallWindow', note: 'Sets when the lead re-enters the queue.',
      text: {
        en: `Should I check back this week, or is it a later thing?`,
        hinglish: `Is week check karun ya baad mein?`,
        hindi: `इस हफ़्ते पूछूँ या बाद में?`,
      },
    },
    {
      kind: 'close', note: 'A clean dead beats a fake maybe.',
      text: {
        en: `Noted ${n}. If it is not happening at all, tell me straight and I stop calling — no problem either way.`,
        hinglish: `Note kar liya ${n}. Agar bilkul nahi ho raha to seedha bata dijiye, main call band kar dunga.`,
        hindi: `नोट कर लिया ${n}। अगर बिलकुल नहीं हो रहा तो सीधा बता दीजिए, मैं कॉल बंद कर दूँगा।`,
      },
    },
  ];
}

/** How far through the script we are, measured by dossier fields filled. */
export function trackProgress(lead: Lead, stage: CallStage) {
  const lines = talkTrack(lead, stage).filter((l) => l.field);
  const done = lines.filter((l) => filled(lead.discovery, l.field!)).length;
  return { done, total: lines.length, pct: lines.length ? Math.round((done / lines.length) * 100) : 100 };
}

/** Every dossier value captured so far, newest-relevant first — for the header strip. */
export function capturedDossier(lead: Lead): { key: DiscoveryKey; label: string; value: string; stage: CallStage }[] {
  return DISCOVERY_FIELDS
    .filter((f) => filled(lead.discovery, f.key))
    .map((f) => ({ key: f.key, label: f.label, value: lead.discovery![f.key]!, stage: f.stage }));
}

/** The one-line read-back: what we can now say without guessing. */
export function dossierSummary(lead: Lead): string {
  const d = lead.discovery ?? {};
  const bits = [
    d.inBangalore,
    d.areas ?? lead.area,
    d.budget ?? (lead.budget ? money(lead.budget) : undefined),
    d.moveIn ?? lead.moveInDate,
    d.sharing,
    d.whoIsComing,
  ].filter((v): v is string => !!v && v.trim().length > 0);
  return bits.length ? bits.join(' · ') : 'Nothing captured yet — start at C1.';
}

export { CALL_PLAYS };
