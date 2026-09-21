import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Minus } from "lucide-react";
import { useTowerAuth } from "@/lib/tower/auth";
import { ALL_ROLES, MODULES, ROLE_LABEL, ROLE_SUMMARY } from "@/lib/tower/access";
import { TEAMS } from "@/lib/tower/review-os";

export const Route = createFileRoute("/tower/access")({
  component: AccessMap,
  head: () => ({
    meta: [
      { title: "Access Map — Gharpayy Control Tower" },
      { name: "description", content: "Role-wise visibility across the Gharpayy Control Tower: who sees leads, who sees reviews, and who owns quality." },
      { property: "og:title", content: "Access Map — Gharpayy Control Tower" },
      { property: "og:description", content: "Who sees what across Control Tower, Flow Ops, PCM and Closing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const GROUPS = ["Operations", "Review OS", "Management"] as const;

function AccessMap() {
  const auth = useTowerAuth();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Access Map — who sees what</h1>
        <p className="text-sm text-muted-foreground">
          Control Tower sees only the major operating things. Every other team sees their own leads plus the full Review OS,
          so the loop from lead edit to lead feedback stays visible to everyone.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {ALL_ROLES.map((r) => (
          <Card key={r} className={`p-3 space-y-1 ${auth.role === r ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">{ROLE_LABEL[r]}</div>
              {auth.role === r && <Badge className="text-[9px] px-1">You</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{ROLE_SUMMARY[r]}</p>
            <div className="text-xs pt-1">
              {MODULES.filter((m) => m.roles.includes(r)).length} of {MODULES.length} modules
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium">Module</th>
              {ALL_ROLES.map((r) => (
                <th key={r} className="p-2 font-medium text-center whitespace-nowrap">{ROLE_LABEL[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <Fragment key={g}>
                <tr className="bg-muted/30">
                  <td colSpan={ALL_ROLES.length + 1} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</td>
                </tr>
                {MODULES.filter((m) => m.group === g).map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="p-2">
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.purpose}</div>
                    </td>
                    {ALL_ROLES.map((r) => (
                      <td key={r} className="p-2 text-center">
                        {m.roles.includes(r)
                          ? <Check className="h-4 w-4 mx-auto text-primary" aria-label="Visible" />
                          : <Minus className="h-4 w-4 mx-auto text-muted-foreground/40" aria-label="Hidden" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-3 space-y-2">
        <div className="font-semibold text-sm">Team ownership — what each team is reviewed on</div>
        <div className="grid gap-2 md:grid-cols-2">
          {TEAMS.map((t) => (
            <div key={t.id} className={`border rounded p-2 ${auth.team === t.id ? "border-primary" : ""}`}>
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm">{t.label}</div>
                {auth.team === t.id && <Badge variant="outline" className="text-[9px] px-1">Your team</Badge>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t.owns.join(" · ")}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-3 space-y-1 text-sm">
        <div className="font-semibold">Always shared, whatever the role</div>
        <p className="text-muted-foreground">
          Reviews, the 6-part feedback, corrections and the Lead Quality Timeline on every lead are readable by every signed-in
          team member. Only the reviewer, the person reviewed, and managers can change a review; only reviewers and managers can close one.
        </p>
      </Card>
    </div>
  );
}
