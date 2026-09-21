/**
 * Profile / account menu in the AppShell header.
 *
 * Surfaces:
 *  - Add Lead (jumps straight to the universal lead creator)
 *  - Switch Role (Flow Ops / TCM / HR / Owner)
 *  - Pick TCM (visible only when in TCM mode)
 *  - Settings, Help, Sign out
 *
 * This keeps power-user actions one click away from any screen.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  UserRound,
  UserPlus,
  Settings,
  HelpCircle,
  LogOut,
  RefreshCw,
  Users,
  Building2,
  ShieldCheck,
  Target,
} from "lucide-react";
import { toast } from "sonner";

const ROLE_META = {
  "flow-ops": { label: "Flow Ops", dot: "bg-info", initials: "FO", icon: Target },
  tcm: { label: "TCM", dot: "bg-accent", initials: "TC", icon: Users },
  hr: { label: "HR / Leadership", dot: "bg-success", initials: "HR", icon: ShieldCheck },
  owner: { label: "Owner Portal", dot: "bg-warning", initials: "OW", icon: Building2 },
} as const;

export function ProfileMenu() {
  const { role, setRole, currentTcmId, setCurrentTcmId, tcms } = useApp();
  const navigate = useNavigate();
  const meta = ROLE_META[role];
  const tcm = role === "tcm" ? tcms.find((t) => t.id === currentTcmId) : null;
  const initials = tcm?.initials ?? meta.initials;
  const displayName = tcm?.name ?? meta.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Open profile menu"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-accent"
        >
          {initials}
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background", meta.dot)} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold")}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="text-[11px] text-muted-foreground">{meta.label}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => navigate({ to: "/leads/add" })}>
          <UserPlus className="mr-2 h-4 w-4" /> Add lead
          <span className="ml-auto text-[10px] text-muted-foreground">N</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/leads"><Target className="mr-2 h-4 w-4" /> All leads</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <RefreshCw className="mr-2 h-4 w-4" /> Switch role
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup value={role} onValueChange={(v) => { setRole(v as typeof role); toast.success(`Now viewing as ${ROLE_META[v as typeof role].label}`); }}>
              {(Object.keys(ROLE_META) as Array<keyof typeof ROLE_META>).map((r) => (
                <DropdownMenuRadioItem key={r} value={r}>
                  <span className={cn("mr-2 h-1.5 w-1.5 rounded-full", ROLE_META[r].dot)} />
                  {ROLE_META[r].label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {role === "tcm" && tcms.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Users className="mr-2 h-4 w-4" /> Switch TCM
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuRadioGroup value={currentTcmId} onValueChange={setCurrentTcmId}>
                {tcms.map((t) => (
                  <DropdownMenuRadioItem key={t.id} value={t.id}>
                    {t.name} <span className="ml-auto text-[10px] text-muted-foreground">{t.zone}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/myt/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/help"><HelpCircle className="mr-2 h-4 w-4" /> How to use</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toast.info("Sign out is local-only in this build.")}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { UserRound };
