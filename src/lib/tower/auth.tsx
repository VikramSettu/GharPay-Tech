import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canAccess, modulesForRoles, primaryRole, ROLE_DEFAULT_TEAM, type ModuleId, type Role, type TowerModule } from "@/lib/tower/access";
import type { ReviewTeam } from "@/lib/tower/review-os";

/**
 * No login. The tower is an internal shared tool: you pick who you are once
 * and the choice is remembered on this device. Everything else (role-wise
 * visibility, review ownership, feedback) keys off that member.
 */

const STORAGE_KEY = "gharpayy.tower.member";

export type Member = {
  id: string;
  name: string;
  team: ReviewTeam | null;
  roles: Role[];
  phone: string | null;
};

type AuthState = {
  /** The selected member. Kept as `user` so every module reads the same shape. */
  user: Member | null;
  members: Member[];
  roles: Role[];
  team: ReviewTeam | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isOperator: boolean;
  isSales: boolean;
  isControlTower: boolean;
  /** Anyone who runs the tower floor: admin, manager, control tower or operator. */
  isTowerOps: boolean;
  role: Role | null;
  modules: TowerModule[];
  can: (id: ModuleId) => boolean;
  setMember: (id: string | null) => void;
  addMember: (input: { name: string; team: ReviewTeam; role: Role; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function TowerAuthProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, team, phone").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, Role[]>();
    for (const row of r.data ?? []) {
      roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), row.role as Role]);
    }
    const list: Member[] = (p.data ?? []).map((x) => {
      const roles = roleMap.get(x.user_id) ?? ["sales" as Role];
      const fallback = roles.map((k) => ROLE_DEFAULT_TEAM[k]).find(Boolean) ?? null;
      return {
        id: x.user_id,
        name: x.full_name ?? "Unnamed",
        team: (x.team as ReviewTeam | null) ?? fallback,
        roles,
        phone: x.phone ?? null,
      };
    });
    setMembers(list);
    return list;
  }, []);

  useEffect(() => {
    let alive = true;
    load().then((list) => {
      if (!alive) return;
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const valid = stored && list.some((m) => m.id === stored) ? stored : null;
      // First visit: land on an admin so nothing looks empty, then let them switch.
      const fallback = list.find((m) => m.roles.includes("admin"))?.id ?? list[0]?.id ?? null;
      setSelectedId(valid ?? fallback);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [load]);

  const setMember = useCallback((id: string | null) => {
    setSelectedId(id);
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const addMember = useCallback(
    async (input: { name: string; team: ReviewTeam; role: Role; phone?: string }) => {
      const { data, error } = await supabase
        .from("profiles")
        .insert({ full_name: input.name, team: input.team, phone: input.phone ?? null })
        .select("user_id")
        .single();
      if (error) throw error;
      await supabase.from("user_roles").insert({ user_id: data.user_id, role: input.role });
      await supabase.from("workload_points").insert({ user_id: data.user_id });
      await load();
    },
    [load],
  );

  const user = useMemo(() => members.find((m) => m.id === selectedId) ?? null, [members, selectedId]);
  const roles = user?.roles ?? [];

  const isFounder = roles.includes("founder_admin");
  const isAdmin = roles.includes("admin") || isFounder;
  const isManager = roles.includes("manager") || roles.includes("zone_manager") || isAdmin;
  const isControlTower = roles.includes("control_tower") || isAdmin;
  const isOperator = roles.includes("operator") || isAdmin;


  const value: AuthState = {
    user,
    members,
    roles,
    team: user?.team ?? null,
    loading,
    isAdmin,
    isManager,
    isOperator,
    isSales: roles.includes("sales") || isAdmin,
    isControlTower,
    isTowerOps: isAdmin || isManager || isControlTower || isOperator,
    role: primaryRole(roles),
    modules: modulesForRoles(roles),
    can: (id: ModuleId) => canAccess(id, roles),
    setMember,
    addMember,
    signOut: async () => setMember(null),
    refresh: async () => { await load(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTowerAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTowerAuth outside provider");
  return v;
}
