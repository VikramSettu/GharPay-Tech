import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CribBooking, CribDraft } from "./types";

// The generated Supabase types don't know this table yet, so we go through a
// loosely-typed handle and cast at the boundary.
const table = () => (supabase as unknown as { from: (t: string) => any }).from("crib_bookings");

export function useCribBookings() {
  const [rows, setRows] = useState<CribBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await table().select("*").order("created_at", { ascending: false });
    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data ?? []) as CribBooking[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (draft: CribDraft) => {
      const { data, error: err } = await table().insert(draft).select("*").single();
      if (err) return { ok: false as const, error: err.message };
      await load();
      return { ok: true as const, row: data as CribBooking };
    },
    [load],
  );

  const update = useCallback(
    async (id: string, patch: Partial<CribDraft>) => {
      const { error: err } = await table().update(patch).eq("id", id);
      if (err) return { ok: false as const, error: err.message };
      await load();
      return { ok: true as const };
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error: err } = await table().delete().eq("id", id);
      if (err) return { ok: false as const, error: err.message };
      await load();
      return { ok: true as const };
    },
    [load],
  );

  return { rows, loading, error, reload: load, create, update, remove };
}

export async function fetchCribByToken(token: string) {
  const { data, error } = await table().select("*").eq("token", token).maybeSingle();
  if (error) return { row: null as CribBooking | null, error: error.message };
  return { row: (data ?? null) as CribBooking | null, error: null as string | null };
}
