import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTowerAuth } from "@/lib/tower/auth";
import { MODULES, ROLE_LABEL, type ModuleId } from "@/lib/tower/access";
import type { ReactNode } from "react";

export function RoleGate({ module, children }: { module: ModuleId; children: ReactNode }) {
  const auth = useTowerAuth();
  const mod = MODULES.find((m) => m.id === module);

  if (auth.loading) return <div className="text-sm text-muted-foreground p-6">Loading…</div>;

  if (!auth.user) {
    return (
      <Card className="p-6 space-y-3 max-w-md">
        <div className="font-semibold">Pick who you are</div>
        <p className="text-sm text-muted-foreground">
          No password needed. Use the name button in the top right to say who you are, and {mod?.label ?? "this module"} opens with your team&apos;s view.
        </p>
        <Button asChild size="sm" variant="outline"><Link to="/tower/guide">How this works</Link></Button>
      </Card>
    );
  }

  if (!auth.can(module)) {
    return (
      <Card className="p-6 space-y-3 max-w-xl">
        <div className="font-semibold">{mod?.label ?? "This module"} is not part of your role</div>
        <p className="text-sm text-muted-foreground">
          You are viewing as <span className="font-medium">{auth.user.name}</span> ({auth.role ? ROLE_LABEL[auth.role] : "no role"}).
          This module is open to: {(mod?.roles ?? []).map((r) => ROLE_LABEL[r]).join(", ")}.
        </p>
        <p className="text-sm text-muted-foreground">
          Every team can always see <span className="font-medium">Review OS</span> and <span className="font-medium">My Feedback</span> — that is where the quality loop stays open.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button asChild size="sm"><Link to="/tower/review">Go to Review OS</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/tower/access">See the access map</Link></Button>
          <Button asChild size="sm" variant="ghost"><Link to="/tower/guide">How to use</Link></Button>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}
