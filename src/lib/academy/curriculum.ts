// The Gharpayy Academy curriculum.
//
// This is the anti-one-word document. Every screen, every feature and every
// button is written out with: what it is, why it exists, exactly how to use it,
// what NOT to do, what can go wrong, and the if/else the person must follow.
// A new joiner should be able to run the floor from this file alone.

export interface ButtonDoc {
  name: string;
  where: string;
  what: string;
  why: string;
  how: string[];
  notThis: string[];
  risks: string[];
  branches: { condition: string; then: string }[];
}

export interface AcademyModule {
  id: string;
  title: string;
  route: string;
  oneLine: string;
  /** Who is expected to live in this screen every day. */
  whoUses: string[];
  /** The business outcome this screen exists to move. */
  purpose: string;
  /** What must be true before you open it. */
  before: string[];
  /** The ritual — the exact sequence of a normal working session. */
  ritual: { step: string; detail: string }[];
  buttons: ButtonDoc[];
  metrics: { name: string; meaning: string; good: string; bad: string }[];
  mistakes: string[];
  graduation: string;
}

export const ACADEMY: AcademyModule[] = [
  {
    id: "marketplace",
    title: "Lead Marketplace",
    route: "/myt/marketplace",
    oneLine: "The open board of every lead nobody owns yet. First come, first responsible.",
    whoUses: ["TCM / sales", "Flow Ops", "Control Tower (labelling only)"],
    purpose:
      "Turn an anonymous pile of enquiries into owned, time-bound work. A lead with no owner has no " +
      "deadline, and a lead with no deadline is a lost booking with a delay. The marketplace exists to " +
      "make ownership visible and instant, and to make the cost of leaving a lead unclaimed obvious to " +
      "everyone on the floor.",
    before: [
      "You are clocked in and have capacity — do not claim leads you cannot call in the next hour.",
      "You know your zone filter. Working outside your zone creates duplicate calls with the zone owner.",
      "Your previous claimed leads have next actions set. Claiming new work while old work is undated is how pipelines rot.",
    ],
    ritual: [
      { step: "Read the daily goal strip", detail: "The top strip shows connected calls against target. If you are behind, work the 'Call now' lane only — do not browse." },
      { step: "Work the lanes top to bottom", detail: "Call now → Do today → Work next → Future move-in. The lanes are sorted by decay speed, not by size." },
      { step: "Claim one, work it, then claim the next", detail: "Never bulk-claim. Ownership without action is worse than no ownership because it hides the lead from everyone else." },
      { step: "Log the outcome in the call sheet", detail: "The sheet opens automatically after claiming. Fill it while you still remember the call, not at 8pm." },
      { step: "Release what you cannot work", detail: "If your day changed, release the lead. It costs you nothing and saves the booking." },
    ],
    buttons: [
      {
        name: "Claim",
        where: "On every lead card in the marketplace",
        what: "Moves the lead out of the open board and into your My Leads queue for the ownership window.",
        why:
          "Claiming is a commitment, not a bookmark. It removes the lead from everyone else's board, so from " +
          "that second the customer's experience is entirely your responsibility. The system trades exclusivity " +
          "for speed: you get sole access, and in exchange the clock starts.",
        how: [
          "Read the card fully first: budget, area, move-in and the conversion probability.",
          "Check that no open label on the card contradicts claiming it (for example a duplicate warning).",
          "Click Claim. The call sheet opens immediately — this is intentional, the first touch should happen now.",
          "Make the first contact attempt before you close the sheet.",
        ],
        notThis: [
          "Do not claim more than you can touch within the hour.",
          "Do not claim to 'reserve' a good lead for later — that is hoarding and it is visible on the ownership report.",
          "Do not claim a lead in a zone you cannot serve.",
        ],
        risks: [
          "Claimed-and-untouched leads are the single biggest silent leak on the floor.",
          "Ownership expires; if you forget, the lead returns to the board mid-conversation and someone else calls the same customer.",
          "Claiming a duplicate causes two people to call one customer within minutes — always scan the phone number first.",
        ],
        branches: [
          { condition: "The lead is in the 'Call now' lane", then: "Claim and call immediately. Do not open a second tab." },
          { condition: "You have more than five untouched claimed leads", then: "Do not claim. Clear your queue first." },
          { condition: "The lead is outside your zone but nobody has touched it in 2 hours", then: "Claim it, but note the zone in the lead so the zone owner is not surprised." },
          { condition: "You claim by mistake", then: "Release immediately — the lead returns with its notes intact." },
        ],
      },
      {
        name: "Label this lead",
        where: "Label chip row on every lead card, and in the Label Console",
        what: "Attaches a Control Tower instruction to the lead with a deadline and a full operating manual.",
        why:
          "Notes are read by nobody and remembered by no system. A label is an instruction with an owner and " +
          "a clock: 'see this on priority', 'no question is sent to this lead', 'send them some question', " +
          "'take follow-up like this'. It converts a reviewer's observation into a tracked action.",
        how: [
          "Pick the label that matches what you saw, not the one that is easiest to justify.",
          "Write the note. For 'follow up like this', write the actual model message you want copied.",
          "Apply. The owner sees the chip on the card and can open the full manual from it.",
          "Come back the next day and verify the resolution note against the chat.",
        ],
        notThis: [
          "Do not label without a note. A bare label is the one-word problem all over again.",
          "Do not apply four labels at once; the owner will not know which one wins.",
          "Do not label a lead you are unwilling to follow up on.",
        ],
        risks: [
          "Label inflation makes every chip invisible within a week.",
          "Labels applied to a lead with no owner go nowhere — assign first.",
          "Resolved labels that were never verified train the floor to close instructions without doing them.",
        ],
        branches: [
          { condition: "The problem is urgency", then: "Use 'Please see this lead on priority' — 1 hour window." },
          { condition: "The problem is that we never asked anything", then: "Use 'No question is sent to this lead'." },
          { condition: "The problem is the wrong question", then: "Use 'Please send them some question' and name the gap." },
          { condition: "The problem is a weak second touch", then: "Use 'Please take follow-up like this' and paste the model." },
        ],
      },
      {
        name: "Add a note anyone can use",
        where: "Note field at the bottom of each lead card",
        what: "Writes a shared, permanent note on the lead that survives release and re-claiming.",
        why:
          "The next person to touch this lead should start warmer than you did. A note is how the floor " +
          "compounds knowledge instead of re-learning the same customer three times.",
        how: [
          "Write facts, not feelings: 'Works in Whitefield, wants under 25 min commute' beats 'nice guy'.",
          "Include what you tried and what the response was.",
          "Keep it to one line. Long notes do not get read.",
        ],
        notThis: [
          "Do not write anything you would not want the customer to read.",
          "Do not use notes as a substitute for logging the touch outcome.",
        ],
        risks: [
          "Notes accumulate and contradict each other; the newest note wins, so date-sensitive facts must be re-stated.",
          "Personal data in notes is still personal data — no ID numbers, no salary details.",
        ],
        branches: [
          { condition: "You learned a hard constraint (budget, date, area)", then: "Put it in the note AND in the lead fields." },
          { condition: "You learned a soft signal (tone, hesitation)", then: "Note it — this is exactly what the next caller needs." },
        ],
      },
      {
        name: "Release",
        where: "On owned lead cards",
        what: "Returns the lead to the open marketplace with all notes and tags intact.",
        why:
          "Releasing is a professional act, not an admission of failure. A lead you cannot work today is worth " +
          "more to the company on the open board than in your queue.",
        how: [
          "Add a note explaining why before you release — the next person needs the context.",
          "Release. The lead reappears in the marketplace immediately.",
        ],
        notThis: [
          "Do not release right before the ownership clock expires just to reset it on the same lead.",
          "Do not release a lead mid-conversation without a handover note; the customer will notice.",
        ],
        risks: [
          "Repeatedly released leads become 'untouchable' — nobody wants them. Watch for leads released more than twice.",
          "Releasing after a bad call without a note sets up the next person to repeat it.",
        ],
        branches: [
          { condition: "You are going on leave", then: "Release everything with notes, do not let ownership expire silently." },
          { condition: "The lead is out of your zone", then: "Release and flag the zone owner directly." },
          { condition: "The customer asked for someone else", then: "Release and note the request — respect it." },
        ],
      },
    ],
    metrics: [
      { name: "Connected calls today", meaning: "Calls where a human actually answered.", good: "At or above the daily target by 6pm.", bad: "High call count with low connect rate — you are calling at the wrong hours." },
      { name: "Conversion probability", meaning: "Model estimate from budget power and intent.", good: "Work the 70%+ band first.", bad: "Ignoring low-probability leads entirely — they still need a close-the-loop message." },
      { name: "Unclaimed age", meaning: "How long a lead has sat on the board.", good: "Under 30 minutes in working hours.", bad: "Anything over 2 hours means the board is not being worked." },
    ],
    mistakes: [
      "Browsing the board instead of working the top lane.",
      "Claiming in bulk at the start of the day and touching a third of them.",
      "Treating the marketplace as a lead list rather than a queue with decay.",
      "Ignoring label chips because 'that is the reviewer's job'.",
    ],
    graduation: "You can pick up a cold board, work the top lane for an hour, and leave every touched lead with a logged outcome and a dated next action.",
  },
  {
    id: "my-leads",
    title: "My Leads — the execution queue",
    route: "/myt/my-leads",
    oneLine: "Everything you own, sorted by what will go cold first.",
    whoUses: ["TCM / sales", "Flow Ops", "Managers reviewing a person's queue"],
    purpose:
      "The marketplace is about acquisition; this screen is about not losing what you already have. Most " +
      "revenue is lost here, quietly, between the first call and the second one.",
    before: [
      "Your claimed leads all have a next action. If not, fix that before doing anything else.",
      "You have a two-hour calling block protected. Execution in five-minute gaps produces nothing.",
    ],
    ritual: [
      { step: "Open 'Due now'", detail: "This is your actual to-do list. Nothing else on the screen matters until it is empty." },
      { step: "Clear incomplete leads first", detail: "A lead missing budget, area or date cannot be matched or closed. Complete the record on the next call." },
      { step: "Work overdue next actions", detail: "An overdue action is a broken promise to a customer, whether or not they know it." },
      { step: "Then work 'All mine'", detail: "Only after due-now is clear." },
      { step: "End the block by setting next actions", detail: "No lead leaves your queue undated. This is non-negotiable." },
    ],
    buttons: [
      {
        name: "Due now / All mine / Team",
        where: "Bucket switcher at the top",
        what: "Filters your queue between what is urgent, everything you own, and what the rest of the team owns.",
        why:
          "Three different jobs. 'Due now' is execution. 'All mine' is hygiene. 'Team' is for cover and for managers " +
          "checking load balance. Mixing them is why people feel busy and finish nothing.",
        how: [
          "Start every block in 'Due now' and stay there until it is empty.",
          "Use 'All mine' once a day for hygiene: missing fields, stale leads, no next action.",
          "Use 'Team' only to cover for someone absent or to rebalance — never to poach.",
        ],
        notThis: [
          "Do not work from 'All mine' by default; you will work the easy leads and skip the urgent ones.",
          "Do not action another person's lead from the Team view without telling them.",
        ],
        risks: [
          "'Due now' can be empty because nothing is dated, not because nothing is due. Check your undated count.",
          "Team view can create duplicate contact — always check the last touch time.",
        ],
        branches: [
          { condition: "'Due now' is empty and you have undated leads", then: "Your queue is not clean. Date them, do not claim more." },
          { condition: "A teammate is absent and their leads are overdue", then: "Work from Team view and log the touch under your name." },
        ],
      },
      {
        name: "Log a touch (call sheet)",
        where: "Opens on claim, on contact, or from the card actions",
        what: "Records channel, outcome, what you learned, the tags, and the next call in the ladder.",
        why:
          "This is the single most important form in the product. Every dashboard, every review, every " +
          "forecast is built from it. An unlogged call did not happen, and the customer pays for it when " +
          "the next person repeats the same conversation.",
        how: [
          "Log it while the call is still in your head — within five minutes, not end of day.",
          "Pick the true outcome, including the ugly ones. 'No answer' logged honestly is more useful than a vague 'follow up'.",
          "Fill the discovery fields you learned. Even one field per call compounds fast.",
          "Set the next call stage and time before you save.",
        ],
        notThis: [
          "Do not log a touch you did not make to keep your activity count up. This is the fastest way to lose a job.",
          "Do not leave the notes blank on a connected call.",
          "Do not set a next call time you know you will not honour.",
        ],
        risks: [
          "Batch-logging at end of day produces vague, useless data and inflates response-time metrics.",
          "Wrong outcome codes corrupt the payment forecast for the whole zone.",
          "Over-tagging makes tag filters meaningless.",
        ],
        branches: [
          { condition: "Call connected and qualified", then: "Log the facts, set the tour or the next call, and move the stage forward." },
          { condition: "Call connected but incomplete", then: "Log what you got and set the next call within 24 hours while you are still fresh in their memory." },
          { condition: "No answer", then: "Log it, send a WhatsApp referencing something specific, retry in a different hour band." },
          { condition: "Wrong number or spam", then: "Log it as such immediately so nobody else wastes a slot on it." },
        ],
      },
    ],
    metrics: [
      { name: "Overdue next actions", meaning: "Promises past their time.", good: "Zero at the end of every block.", bad: "Anything above five means the queue owns you." },
      { name: "Incomplete leads", meaning: "Missing budget, area or move-in.", good: "Under 10% of your queue.", bad: "Above 30% — you are calling without qualifying." },
      { name: "Touches per owned lead", meaning: "Average contact attempts.", good: "3–5 across the ownership window.", bad: "1 — you claimed and abandoned. 10+ — you are harassing." },
    ],
    mistakes: [
      "Working the newest leads because they feel exciting, while dated actions expire.",
      "Setting next actions for 'tomorrow' by default instead of the right time.",
      "Logging outcomes in bulk at the end of the day.",
    ],
    graduation: "You end every day with zero overdue actions and every owned lead dated, and you can explain the blocker on any lead in your queue from memory.",
  },
  {
    id: "l1-daily",
    title: "L1 Review — the Daily 100",
    route: "/l1",
    oneLine: "One hundred chats marked every day, by a human, with evidence.",
    whoUses: ["Control Tower reviewers", "Floor managers", "Owner (spot checks)"],
    purpose:
      "Quality is not an opinion you form at the end of the month. It is a hundred small observations made " +
      "every day. The Daily 100 gives the floor a fixed, countable review habit that works whether or not " +
      "AI is available, and produces the coaching list for tomorrow morning.",
    before: [
      "WhatsApp is open beside this screen — you mark what you read, never what you assume.",
      "You know today's reviewer split so two people do not mark the same chats.",
      "You have the four dispositions clear in your head. If not, read their manuals on the screen first.",
    ],
    ritual: [
      { step: "Set your name once", detail: "Every mark carries an author. Anonymous marks cannot be calibrated." },
      { step: "Open a chat in WhatsApp, read the last 5–10 messages", detail: "Read the customer's last message first — it tells you whose turn it is." },
      { step: "Write one evidence line", detail: "The one fact you saw. 'Customer asked about deposit 2 days ago, no reply.'" },
      { step: "Hit one of the four buttons", detail: "Done / Not done / Very poor / This guy is not helping." },
      { step: "Label the lead when the mark implies an action", detail: "A 'not done' mark without a label is an observation nobody will act on." },
      { step: "Go deep on the worst ten", detail: "At the end of the session, run a full manual review on the ten worst chats." },
    ],
    buttons: [
      {
        name: "This chat is done",
        where: "Marking lane, first button",
        what: "Closes the chat out of the review queue as a clean end state.",
        why:
          "It is the only mark that lets work leave the board, so it must be the hardest one to earn. Loose " +
          "'done' marks are how live revenue disappears from the queue while the customer is still deciding.",
        how: [
          "Confirm one of: paid, tour scheduled with a date and time, or an explicit customer no.",
          "Confirm nothing in the thread is waiting on us.",
          "Mark done and move on.",
        ],
        notThis: [
          "Do not mark done because the customer went silent.",
          "Do not mark done on a verbal promise with no dated action.",
          "Do not mark done to move the counter.",
        ],
        risks: [
          "Premature closure hides an active lead.",
          "'Done' chats that reopen are not re-queued automatically — check returning customers.",
        ],
        branches: [
          { condition: "Paid", then: "Done. Verify the booking record exists." },
          { condition: "Tour booked", then: "Done for the chat, lead stays active until the tour outcome." },
          { condition: "Hard no", then: "Done, record the reason, move to nurture." },
          { condition: "Anything else", then: "Not done. Use another mark." },
        ],
      },
      {
        name: "This chat is not done",
        where: "Marking lane, second button",
        what: "Flags a live conversation where the next move is ours and has not been made.",
        why:
          "This is the most common state and the most expensive one. Marking it explicitly forces a name and " +
          "a deadline onto revenue that would otherwise drift.",
        how: [
          "Read the last message. If it is the customer's and needed a reply, mark it.",
          "If the last message is ours but had no ask, mark it too.",
          "Attach the label that names the missing move.",
        ],
        notThis: [
          "Do not mark without an evidence line.",
          "Do not use it as a softer 'very poor'.",
        ],
        risks: [
          "The queue fills faster than it clears; watch the open count per owner.",
          "The customer replies right after marking, making the mark stale.",
        ],
        branches: [
          { condition: "Customer question unanswered", then: "Also apply the priority label — 1 hour." },
          { condition: "We never asked anything", then: "Apply 'No question is sent to this lead'." },
          { condition: "Customer went quiet after our question", then: "Apply 'Please take follow-up like this' with the model text." },
        ],
      },
      {
        name: "Very poor",
        where: "Marking lane, third button",
        what: "Flags bad work — wrong information, careless tone, or hours of unexplained silence.",
        why:
          "Separates 'behind' from 'damaging'. Speed problems are fixed with a nudge; quality problems need " +
          "coaching, and sometimes they need a correction sent to the customer today.",
        how: [
          "Quote the exact message. No quote, no mark.",
          "Check the timestamps for working-hour gaps over an hour.",
          "Check every factual claim about price and availability against the record.",
        ],
        notThis: [
          "Do not judge the outcome — judge the behaviour.",
          "Do not name people publicly in a group.",
        ],
        risks: [
          "Reviewer standards drift; recalibrate weekly on a shared sample.",
          "The agent may have inherited the thread — check who wrote what.",
        ],
        branches: [
          { condition: "Wrong info shared", then: "Apply the wrong-info label and get a correction out within the hour." },
          { condition: "Slow but correct", then: "This is 'not done' with a speed note, not 'very poor'." },
          { condition: "Rude to the customer", then: "Escalate to the manager the same day." },
        ],
      },
      {
        name: "This guy is not helping",
        where: "Marking lane, fourth button",
        what: "Flags an effort pattern — present, polite, and adding nothing.",
        why:
          "Nothing was broken, which is why it never shows in a metric. The customer was processed rather than " +
          "helped. Naming this is how a floor separates activity from effort.",
        how: [
          "Look for the same sentence across multiple chats from the same person.",
          "Ask whether a single new fact, option or idea was added.",
          "Check whether the agent took the next step or handed the work back to the customer.",
        ],
        notThis: [
          "Do not use it on someone in their first two weeks — that is training, not effort.",
          "Do not write it in language you would not say to their face.",
        ],
        risks: [
          "Reads as an attack and disengages the person further.",
          "May actually be a load problem — check their open-lead count first.",
        ],
        branches: [
          { condition: "Templated replies everywhere", then: "Remove the template and retrain on personalisation." },
          { condition: "Heavily overloaded", then: "Rebalance before coaching." },
          { condition: "Repeats after coaching", then: "Escalate with three example chats attached." },
        ],
      },
    ],
    metrics: [
      { name: "Marks today", meaning: "Progress toward 100.", good: "On pace by lunch — about half.", bad: "A spike of 60 marks in the last hour means memory-marking, not reviewing." },
      { name: "Flagged share", meaning: "Very poor + not helping, as a share of marks.", good: "Under 15% and falling week on week.", bad: "Zero. Nobody's floor is perfect; zero means the reviewer is not looking." },
      { name: "Label follow-through", meaning: "Labels applied vs resolved on time.", good: "Above 80% resolved inside the window.", bad: "Labels resolved with empty notes." },
    ],
    mistakes: [
      "Marking from memory at the end of the day.",
      "Using 'done' to hit the number.",
      "Marking without an evidence line, so the agent can argue with the mark instead of the fact.",
      "Reviewing only the loud chats and never sampling the quiet, average ones.",
    ],
    graduation: "You can mark 100 chats in a working day with an evidence line on each, and your flagged marks survive a challenge from the agent.",
  },
  {
    id: "l1-manual",
    title: "L1 Review — Manual mode (no AI, no transcript)",
    route: "/l1",
    oneLine: "The full scorecard, produced by a human reading WhatsApp, on the same scale as the automatic one.",
    whoUses: ["Control Tower reviewers", "Managers", "Owner"],
    purpose:
      "Never be dependent on AI, on a transcript export, or on anything being pasted. Manual mode asks the " +
      "reviewer the same questions the engine would ask and produces the same L1 scorecard, so the two paths " +
      "are directly comparable on one board.",
    before: [
      "The chat is open in WhatsApp. You are reading the real thing, with real timestamps.",
      "You have decided which agent this review is about — inherited threads must be attributed correctly.",
    ],
    ritual: [
      { step: "Mark the chat", detail: "Pick one of the four dispositions. This also counts toward the daily 100." },
      { step: "Tick only the steps you can see", detail: "Every tick must be defensible by pointing at a message." },
      { step: "Read the timestamps", detail: "WhatsApp prints a time on every bubble. Enter the real first-response gap, not a guess." },
      { step: "Judge human vs paste", detail: "Copy-paste replies are the most common invisible quality failure." },
      { step: "Pick the true payment blocker", detail: "Not the polite reason the customer gave — the real one." },
      { step: "Write the reviewer note and file it", detail: "The note is what the agent actually reads. Be specific enough to act on." },
    ],
    buttons: [
      {
        name: "Step checklist",
        where: "Section 2 of the manual review",
        what: "The playbook steps for a chat or a call, ticked one by one against the real thread.",
        why:
          "Scores without structure are just opinions. The step list makes two different reviewers arrive at " +
          "roughly the same number on the same chat, which is what makes coaching credible.",
        how: [
          "Read the thread once end to end before you tick anything.",
          "Tick a step only if you can point at the message that proves it.",
          "Leave a step unticked when it was attempted but never landed.",
        ],
        notThis: [
          "Do not tick from sympathy or from knowing the person is usually good.",
          "Do not tick a step because it happened on a phone call you did not review.",
        ],
        risks: [
          "Over-ticking inflates the floor average and destroys the value of the board.",
          "Under-ticking on unfamiliar zones creates unfair comparisons between teams.",
        ],
        branches: [
          { condition: "The step happened on a call, not in the chat", then: "Review the call separately; do not credit it in the chat review." },
          { condition: "The step is not applicable to this customer", then: "Leave it unticked and say so in the note, so the score is read in context." },
        ],
      },
      {
        name: "File manual review",
        where: "Bottom of the manual review form",
        what: "Saves the scorecard, links it to the daily mark, and puts it on the zone board.",
        why:
          "Filing is what turns a private opinion into a shared record. Once filed, the agent can see it, the " +
          "manager can roll it up, and the payment forecast picks it up.",
        how: [
          "Check the live scorecard on the right before filing — if the number surprises you, revisit your ticks.",
          "Make sure the reviewer note names one specific thing to change.",
          "File. It counts toward today's 100 automatically.",
        ],
        notThis: [
          "Do not file without a note.",
          "Do not file a review of a chat you only skimmed.",
        ],
        risks: [
          "Filed reviews are records people are judged by — an unfair one costs you the floor's trust permanently.",
          "Duplicate reviews of the same chat by two reviewers skew an agent's average.",
        ],
        branches: [
          { condition: "The score feels wrong for the chat", then: "Do not file. Re-read and re-tick — the scale is probably right and your instinct is anchored on the person." },
          { condition: "The chat spans several agents", then: "File one review per agent, each covering their own messages." },
        ],
      },
    ],
    metrics: [
      { name: "Manual vs auto score gap", meaning: "Difference between human and engine scoring on similar chats.", good: "Within 10 points — the scales agree.", bad: "A persistent 25-point gap means one of the two is miscalibrated." },
      { name: "Reviews with a specific note", meaning: "Notes that name one changeable behaviour.", good: "100%.", bad: "Notes like 'improve communication'." },
    ],
    mistakes: [
      "Filling the form from the lead record instead of the actual chat.",
      "Guessing timestamps instead of reading them.",
      "Reviewing only your favourite people, positively or negatively.",
    ],
    graduation: "Your manual reviews land within ten points of the engine on the same conversation, and agents act on your notes without needing them explained.",
  },
  {
    id: "labels",
    title: "Lead Label Console",
    route: "/labels",
    oneLine: "Search any lead, attach an instruction with a clock, verify it tomorrow.",
    whoUses: ["Control Tower", "Managers", "Anyone reviewing someone else's lead"],
    purpose:
      "Close the loop between observation and action. Reviews tell you what went wrong; labels are how the " +
      "fix reaches the person holding the lead, with a deadline attached and a manual behind it.",
    before: [
      "You have actually read the chat you are labelling about.",
      "The lead has an owner, or you are prepared to assign one.",
    ],
    ritual: [
      { step: "Search the lead", detail: "By name, phone, area or tag. Searching by the last four digits of the phone is fastest." },
      { step: "Apply the label with a real note", detail: "Name the gap, or paste the model follow-up." },
      { step: "Check 'Open instructions' every morning", detail: "Sorted by deadline. Overdue instructions are the first agenda item of the day." },
      { step: "Verify before clearing", detail: "Open the chat, confirm the instruction was honoured, then mark done." },
    ],
    buttons: [
      {
        name: "Search field",
        where: "Top of the Search & label tab",
        what: "Finds any lead across the marketplace and every owner's queue.",
        why:
          "The Control Tower does not own leads, so it needs a way to reach any lead without claiming it. " +
          "Search is that door.",
        how: [
          "Type the last four digits of a phone number for the fastest exact hit.",
          "Use the area name to review a zone's leads together.",
          "Combine with the label filter chips to audit one instruction type at a time.",
        ],
        notThis: [
          "Do not use search to reassign leads informally — use the reassign flow.",
          "Do not export or copy customer phone numbers out of this screen.",
        ],
        risks: [
          "Searching a common name returns several customers; always confirm by phone before labelling.",
        ],
        branches: [
          { condition: "Two leads share a phone number", then: "You have a duplicate. Resolve the duplicate before labelling either." },
          { condition: "No result", then: "The lead may not be captured yet — check the intake before assuming it is missing." },
        ],
      },
      {
        name: "Mark done (on an open instruction)",
        where: "Open instructions tab",
        what: "Closes the instruction and records who cleared it and how.",
        why:
          "An instruction with no closure is a suggestion. Closure with a resolution note is what makes the " +
          "next review meaningful, because you can compare what was promised to what was done.",
        how: [
          "Open the chat first and verify with your own eyes.",
          "Write what was actually done, not 'done'.",
          "Then clear it.",
        ],
        notThis: [
          "Do not clear in bulk at the end of the week.",
          "Do not clear your own label without verification just because it is old.",
        ],
        risks: [
          "Unverified closures train the floor that instructions are optional.",
          "Clearing an overdue label removes the overdue signal from the report — note the delay before clearing.",
        ],
        branches: [
          { condition: "The instruction was honoured", then: "Clear it with the evidence line." },
          { condition: "It was partly done", then: "Do not clear. Re-apply with a sharper note and a shorter window." },
          { condition: "The lead died in the meantime", then: "Clear with the reason 'lead closed' so it does not count as a floor failure." },
        ],
      },
    ],
    metrics: [
      { name: "Open instructions", meaning: "Live, unresolved labels.", good: "Under 20 across the floor.", bad: "Growing week on week — the floor is not acting, or the Tower is over-labelling." },
      { name: "Overdue instructions", meaning: "Past the action window.", good: "Zero by the morning huddle.", bad: "Anything overdue by more than a day." },
    ],
    mistakes: [
      "Labelling without reading the chat.",
      "Using labels to vent instead of to instruct.",
      "Never verifying resolutions.",
    ],
    graduation: "Your labels are cleared on time without you chasing them, because the notes are specific enough to act on immediately.",
  },
  {
    id: "control-tower",
    title: "Control Tower — the daily operating rhythm",
    route: "/tower",
    oneLine: "How the whole system is run in one day, hour by hour.",
    whoUses: ["Control Tower", "Managers", "Owner"],
    purpose:
      "Individually every screen is useful; together they only work if they run in a fixed rhythm. This module " +
      "is the rhythm: when to review, when to label, when to coach, when to leave the floor alone.",
    before: [
      "Yesterday's overdue instructions are cleared or explicitly carried over.",
      "The daily 100 target and the reviewer split are agreed before 10am.",
    ],
    ritual: [
      { step: "09:45 — Read the board", detail: "Unclaimed age, overdue actions, yesterday's flagged marks. Five minutes, no meeting." },
      { step: "10:00 — Morning huddle, 10 minutes", detail: "One floor example (good), one pattern to fix (anonymous), today's number. Nothing else." },
      { step: "10:15–13:00 — Marking lane", detail: "First 50 of the daily 100. Label as you go." },
      { step: "13:00 — Mid-day pace check", detail: "If the floor is behind on connects, cut reviews and put reviewers on calls. Revenue first." },
      { step: "14:00–18:00 — Second 50 plus deep reviews", detail: "Full manual reviews on the ten worst chats of the morning." },
      { step: "18:30 — Coaching, 1:1, never in a group", detail: "Two conversations maximum, both with a specific chat open." },
      { step: "19:30 — Close the day", detail: "Every overdue instruction either cleared or carried with a reason. No silent carryover." },
    ],
    buttons: [
      {
        name: "Member switcher",
        where: "Control Tower header",
        what: "Changes whose view of the floor you are looking at.",
        why:
          "Access and workload look completely different from each seat. Before you judge a queue, look at it " +
          "from the seat that owns it.",
        how: [
          "Switch to the person before a coaching conversation, so you see exactly what they see.",
          "Switch back to your own seat before taking any action.",
        ],
        notThis: [
          "Do not act on behalf of another person without telling them.",
          "Do not use the switcher to bypass a role restriction.",
        ],
        risks: [
          "Actions taken while switched can be attributed to the wrong person in the audit log.",
        ],
        branches: [
          { condition: "You are preparing a coaching session", then: "Switch to their seat, screenshot nothing, and note what is genuinely hard from there." },
          { condition: "You need to take an action", then: "Switch back to your own seat first." },
        ],
      },
    ],
    metrics: [
      { name: "Reviews per day", meaning: "The daily 100.", good: "100 marks with evidence lines.", bad: "100 marks filed between 7pm and 8pm." },
      { name: "Instruction turnaround", meaning: "Label applied to label resolved.", good: "Inside the label's own window.", bad: "Median above 24 hours." },
      { name: "Repeat-flag rate", meaning: "Same agent flagged for the same reason twice in a week.", good: "Falling.", bad: "Flat — coaching is happening but not landing." },
    ],
    mistakes: [
      "Running reviews and ignoring the connect target — quality systems must never outrank revenue on the same day.",
      "Coaching in a group.",
      "Carrying overdue instructions silently into the next day.",
      "Changing the standard mid-week so nobody knows what good means.",
    ],
    graduation: "The rhythm runs without you for a full day and the numbers are the same on the day you were away.",
  },
];

export const ACADEMY_BY_ID: Record<string, AcademyModule> = Object.fromEntries(
  ACADEMY.map((m) => [m.id, m]),
);
