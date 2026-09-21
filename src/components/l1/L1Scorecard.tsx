import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PHASE_LABEL } from "@/lib/l1/playbook";
import { L1_BAND_META } from "@/lib/l1/engine";
import type { L1Analysis } from "@/lib/l1/types";
import {
  Bot, CheckCircle2, CircleSlash, Clock, Frown, Gauge, HandCoins, Repeat,
  Sparkles, Target, User, XCircle,
} from "lucide-react";

function Stat({ icon: Icon, label, value, sub, tone }: {
  icon: typeof Gauge; label: string; value: string; sub?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const cls = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-rose-600" : "";
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${cls}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}

const tone = (n: number) => (n >= 80 ? "good" : n >= 60 ? "warn" : "bad") as "good" | "warn" | "bad";

export function L1Scorecard({ a }: { a: L1Analysis }) {
  const band = L1_BAND_META[a.band];
  const phases = Array.from(new Set(a.steps.map((s) => s.step.phase)));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold tabular-nums">{a.total}</span>
              <span className="text-sm text-muted-foreground">/100</span>
              <Badge className={band.className}>{band.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{band.action}</p>
          </div>
          <div className="min-w-[180px]">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Step compliance</span><span className="tabular-nums">{a.stepScore}%</span>
            </div>
            <Progress value={a.stepScore} className="mt-1 h-2" />
          </div>
        </div>
      </Card>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={Clock} label="First reply" tone={tone(a.speed.score)}
          value={a.speed.firstResponseMin == null ? "—" : a.speed.firstResponseMin < 60 ? `${a.speed.firstResponseMin}m` : `${Math.round(a.speed.firstResponseMin / 60)}h`}
          sub={a.speed.verdict} />
        <Stat icon={Repeat} label="Follow-ups" tone={tone(a.followUp.score)}
          value={`${a.followUp.agentInitiated}/${a.followUp.expected}`} sub={a.followUp.verdict} />
        <Stat icon={Gauge} label="Understanding" tone={tone(a.understanding.score)}
          value={`${a.understanding.score}%`} sub={`${a.understanding.questionsAnswered}/${a.understanding.questionsAsked} questions answered`} />
        <Stat icon={a.authorship.verdict === "human" ? User : Bot} label="Written by"
          tone={a.authorship.verdict === "human" ? "good" : a.authorship.verdict === "assisted" ? "warn" : "bad"}
          value={a.authorship.verdict === "human" ? "Human" : a.authorship.verdict === "assisted" ? "AI-assisted" : "AI-written"}
          sub={`${a.authorship.aiLikelihood}% machine signal`} />
        <Stat icon={Sparkles} label="Extra 10%" tone={tone(a.extraValuePct)}
          value={`${a.extraValuePct}%`} sub={`${a.extraValue.length} value adds`} />
        <Stat icon={Target} label="Next step" tone={a.nextStepLocked ? "good" : "bad"}
          value={a.nextStepLocked ? "Locked" : "Missing"} sub={a.nextStepLocked ? a.nextStepQuote : "Conversation ended without our commitment"} />
      </div>

      {/* Money */}
      <Card className="border-2 border-primary/30 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <HandCoins className="size-4 text-primary" /> Why has the customer not paid?
        </div>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-[11px] text-muted-foreground">Blocker</div>
            <div className="text-sm font-semibold">{a.money.blockerLabel}</div>
            {a.money.evidence && <div className="mt-1 text-[11px] italic text-muted-foreground">“{a.money.evidence}”</div>}
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Will they pay?</div>
            <div className="text-sm font-semibold tabular-nums">{a.money.payProbability}% · {a.money.paid ? "already paid" : `~${a.money.expectedPayInDays} days`}</div>
            <div className="text-[11px] text-muted-foreground">Expected by {a.money.expectedPayDate}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Contribution to 30 BPD</div>
            <div className="text-sm font-semibold tabular-nums">{a.money.bpdContribution} booking</div>
            <div className="text-[11px] text-muted-foreground">{Math.ceil(30 / Math.max(0.05, a.money.bpdContribution))} chats like this = 30/day</div>
          </div>
        </div>
        <div className="mt-3 rounded-md bg-muted/50 p-2 text-xs">
          <span className="font-semibold">The unlock: </span>{a.money.unlock}
        </div>
      </Card>

      {/* Moments */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-emerald-500/40 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-emerald-600" /> Wow moment</div>
          {a.wow ? (
            <>
              <p className="mt-1 text-xs italic">“{a.wow.quote}”</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{a.wow.why}</p>
            </>
          ) : <p className="mt-1 text-xs text-muted-foreground">No wow moment in this conversation. That is the problem.</p>}
        </Card>
        <Card className="border-rose-500/40 bg-rose-500/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Frown className="size-4 text-rose-600" /> Dull moment</div>
          {a.dull ? (
            <>
              <p className="mt-1 text-xs italic">“{a.dull.quote}”</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{a.dull.why}</p>
            </>
          ) : <p className="mt-1 text-xs text-muted-foreground">Nothing flat — the energy held throughout.</p>}
        </Card>
      </div>

      {/* Steps */}
      <Card className="p-4">
        <div className="text-sm font-semibold">Was every step followed?</div>
        <div className="mt-3 space-y-4">
          {phases.map((p) => (
            <div key={p}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{PHASE_LABEL[p]}</div>
              <ul className="mt-1 space-y-1">
                {a.steps.filter((s) => s.step.phase === p).map((s) => (
                  <li key={s.step.id} className="flex items-start gap-2 text-xs">
                    {s.done
                      ? <CheckCircle2 className={`mt-0.5 size-3.5 shrink-0 ${s.confirmed ? "text-emerald-600" : "text-amber-500"}`} />
                      : <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />}
                    <div className="min-w-0">
                      <span className={s.done ? "" : "font-medium text-rose-600"}>{s.step.label}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">·{s.step.weight}</span>
                      {s.done && s.evidence && <div className="truncate text-[11px] italic text-muted-foreground">“{s.evidence}”</div>}
                      {!s.done && <div className="text-[11px] text-muted-foreground">{s.step.why}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Extra value + hesitation */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-3">
          <div className="text-sm font-semibold">The extra 10% we gave</div>
          {a.extraValue.length ? (
            <ul className="mt-2 space-y-1 text-xs">
              {a.extraValue.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.label}</span>
                  <div className="text-[11px] italic text-muted-foreground">“{e.quote}”</div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-1 text-xs text-muted-foreground">Nothing beyond the brief. Pure order-taking.</p>}
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><CircleSlash className="size-4" /> Hesitation & fumble markers</div>
          {a.hesitation.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-rose-600">
              {a.hesitation.map((h) => <li key={h}>{h}</li>)}
            </ul>
          ) : <p className="mt-1 text-xs text-muted-foreground">Confident throughout — no hedging language.</p>}
          {a.understanding.ignored.length > 0 && (
            <div className="mt-2 text-[11px] text-amber-600">
              Unanswered customer questions: {a.understanding.ignored.map((q) => `“${q}”`).join(" · ")}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold">Act like an owner — do these now</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
          {a.ownerActions.map((x, i) => <li key={i}>{x}</li>)}
        </ol>
      </Card>
    </div>
  );
}