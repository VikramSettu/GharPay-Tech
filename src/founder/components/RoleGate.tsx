import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useTowerAuth } from "@/lib/tower/auth";
import { ROLE_LABEL, type Role } from "@/lib/tower/access";

/**
 * The ported admin console used its own tier model. It now reads the real
 * Gharpayy roles, so Founder Admin / Zone Manager access is one source of truth.
 */
export type Tier = "superadmin" | "leadership" | "hr" | "leader" | "recruiter" | "teammate";

/** Roles allowed anywhere inside the Founder Admin console. */
const ADMIN_ROLES: Role[] = ["founder_admin", "admin", "manager", "zone_manager"];

export function RoleGate({ allow, children }: { allow?: Tier[]; children: React.ReactNode }) {
  void allow;
  const auth = useTowerAuth();

  if (auth.loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  // Nobody has been added to the team yet — there is no role to check against,
  // so the console stays open for first-time setup.
  if (auth.members.length === 0) return <>{children}</>;

  const ok = auth.roles.some((r) => ADMIN_ROLES.includes(r));
  if (ok) return <>{children}</>;


  return (
    <div className="px-4 md:px-8 py-12 max-w-xl mx-auto">
      <div className="rounded-xl bg-card border border-border p-8 text-center">
        <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {auth.role ? ROLE_LABEL[auth.role] : "No role"} access
        </div>
        <h1 className="font-display text-xl font-semibold mb-2">Not your arena — yet</h1>
        <p className="text-sm text-muted-foreground mb-5">
          The Founder Admin console is open to: {ADMIN_ROLES.map((r) => ROLE_LABEL[r]).join(", ")}.
        </p>
        <Link to="/tower" className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium">
          Back to Control Tower
        </Link>
      </div>
    </div>
  );
}
