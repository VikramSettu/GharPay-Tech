import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  MOVE_IN_SCORE,
  SLA_CONFIG,
  locationScoreFor,
  priorityFor,
  SCENARIOS,
  type MoveInBucket,
  type LeadPriority,
  type ScenarioCode,
} from "./scoring";

export type DuplicateCheck =
  | { kind: "new" }
  | { kind: "existing"; leadId: string; cycles: number; owner: string | null; priority: LeadPriority | null };

export async function checkDuplicate(phone: string): Promise<DuplicateCheck> {
  const normalized = phone.replace(/\s+/g, "");
  const { data } = await supabase
    .from("leads")
    .select("id, current_owner, priority")
    .eq("phone", normalized)
    .maybeSingle();
  if (!data) return { kind: "new" };
  const { count } = await supabase
    .from("lead_cycles")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", data.id);
  return { kind: "existing", leadId: data.id, cycles: count ?? 0, owner: data.current_owner, priority: data.priority };
}

export type CreateAndAssignInput = {
  conversationId: string;
  phone: string;
  waName: string | null;
  zoneId: string; // selected zone
  locationText: string;
  moveinBucket: MoveInBucket;
  moveinDate?: string | null;
};

export type AssignResult =
  | { ok: true; leadId: string; assignmentId: string | null; priority: LeadPriority; score: number; ownerId: string | null; reason?: string }
  | { ok: false; leadId: string; priority: LeadPriority; score: number; error: string };

// Core assignment: eligible pool → best pick, respecting caps, category, availability, fair distribution.
export async function createAndAssign(input: CreateAndAssignInput): Promise<AssignResult> {
  // 1. Zone details for location scoring
  const { data: zone } = await supabase
    .from("zones")
    .select("id, inventory_strength, is_serviceable")
    .eq("id", input.zoneId)
    .single();

  const locationScore = locationScoreFor(zone?.inventory_strength, zone?.is_serviceable ?? true);
  const moveinScore = MOVE_IN_SCORE[input.moveinBucket];
  const score = locationScore + moveinScore;
  const priority = priorityFor(score);

  // 2. Duplicate check → attach or create
  const dup = await checkDuplicate(input.phone);
  let leadId: string;
  let cycleNo = 1;
  if (dup.kind === "existing") {
    leadId = dup.leadId;
    const { data: cycles } = await supabase.from("lead_cycles").select("cycle_no").eq("lead_id", leadId).order("cycle_no", { ascending: false }).limit(1);
    cycleNo = (cycles?.[0]?.cycle_no ?? 0) + 1;
    await supabase.from("leads").update({
      wa_name: input.waName,
      location_text: input.locationText,
      zone_id: input.zoneId,
      movein_bucket: input.moveinBucket,
      movein_date: input.moveinDate ?? null,
      location_score: locationScore,
      movein_score: moveinScore,
      score,
      priority,
      status: "open",
    }).eq("id", leadId);
  } else {
    const ins = await supabase.from("leads").insert({
      phone: input.phone.replace(/\s+/g, ""),
      wa_name: input.waName,
      location_text: input.locationText,
      zone_id: input.zoneId,
      movein_bucket: input.moveinBucket,
      movein_date: input.moveinDate ?? null,
      location_score: locationScore,
      movein_score: moveinScore,
      score,
      priority,
      status: "open",
    }).select("id").single();
    if (ins.error || !ins.data) return { ok: false, leadId: "", priority, score, error: ins.error?.message ?? "insert failed" };
    leadId = ins.data.id;
  }

  // 3. Open a cycle
  const cyc = await supabase.from("lead_cycles").insert({
    lead_id: leadId,
    cycle_no: cycleNo,
    open_reason: dup.kind === "existing" ? "returning_lead" : "new_lead",
  }).select("id").single();
  const cycleId = cyc.data?.id ?? null;

  // 4. Attach conversation to lead + capture
  await supabase.from("inbound_conversations").update({
    lead_id: leadId,
    cycle_id: cycleId,
    captured_at: new Date().toISOString(),
    captured_by: (await supabase.auth.getUser()).data.user?.id,
  }).eq("id", input.conversationId);

  // 5. Duplicate record
  if (dup.kind === "existing") {
    await supabase.from("duplicate_matches").insert({
      phone: input.phone,
      existing_lead_id: leadId,
      new_conversation_id: input.conversationId,
      resolution: "attached_new_cycle",
    });
  }

  // 6. Build eligible pool
  const pool = await buildEligiblePool(input.zoneId, priority);
  if (pool.length === 0) {
    await supabase.from("audit_logs").insert({
      entity: "lead", entity_id: leadId, action: "assign_failed", reason: "no_eligible_owner",
      next: { priority, zoneId: input.zoneId },
    });
    return { ok: true, leadId, assignmentId: null, priority, score, ownerId: null, reason: "No eligible owner — queued for exception review" };
  }

  // 7. Pick best
  const best = pool[0];

  // 8. Create assignment with SLA deadlines
  const sla = SLA_CONFIG[priority];
  const now = new Date();
  const acceptDeadline = new Date(now.getTime() + sla.accept * 1000).toISOString();
  const firstDeadline = new Date(now.getTime() + sla.firstAction * 1000).toISOString();

  const asg = await supabase.from("assignments").insert({
    lead_id: leadId,
    cycle_id: cycleId,
    owner_id: best.user_id,
    priority,
    sla_deadline_accept: acceptDeadline,
    sla_deadline_first_action: firstDeadline,
    state: "pending_accept",
  }).select("id").single();

  if (asg.error || !asg.data) return { ok: false, leadId, priority, score, error: asg.error?.message ?? "assign insert failed" };

  await supabase.from("leads").update({ current_owner: best.user_id }).eq("id", leadId);
  await supabase.from("audit_logs").insert({
    entity: "assignment", entity_id: asg.data.id, action: "created",
    next: { owner: best.user_id, priority, score },
  });

  // 9. Bump workload counter (approx)
  await bumpWorkload(best.user_id, 4);

  return { ok: true, leadId, assignmentId: asg.data.id, priority, score, ownerId: best.user_id };
}

type PoolMember = {
  user_id: string;
  full_name: string | null;
  category: "A" | "B" | "C" | "D";
  points: number;
  max_points: number;
  uncontacted: number;
  overdue: number;
  last_assigned: number;
};

async function buildEligiblePool(zoneId: string, priority: LeadPriority): Promise<PoolMember[]> {
  // profiles in zone, clocked-in, available, not restricted
  const { data: mems } = await supabase.from("zone_membership").select("user_id").eq("zone_id", zoneId);
  const userIds = (mems ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, performer_category, is_clocked_in, is_available, is_restricted")
    .in("user_id", userIds);

  const { data: wl } = await supabase
    .from("workload_points")
    .select("user_id, points, max_points, uncontacted, overdue_followups, state")
    .in("user_id", userIds);
  const wlMap = new Map((wl ?? []).map((w) => [w.user_id, w]));

  const catFor = (p: LeadPriority): Array<"A" | "B" | "C" | "D"> => {
    if (p === "super_hot") return ["A"];
    if (p === "hot") return ["A", "B"];
    if (p === "active") return ["B", "C"];
    return ["B", "C"];
  };
  const allowed = catFor(priority);

  // last-assigned time
  const { data: lastAssigned } = await supabase
    .from("assignments")
    .select("owner_id, assigned_at")
    .in("owner_id", userIds)
    .order("assigned_at", { ascending: false })
    .limit(200);
  const lastMap = new Map<string, number>();
  (lastAssigned ?? []).forEach((a) => {
    if (!lastMap.has(a.owner_id)) lastMap.set(a.owner_id, new Date(a.assigned_at).getTime());
  });

  const pool: PoolMember[] = [];
  for (const p of profiles ?? []) {
    if (!p.is_clocked_in || !p.is_available || p.is_restricted) continue;
    if (!allowed.includes(p.performer_category)) continue;
    const w = wlMap.get(p.user_id);
    const points = w?.points ?? 0;
    const max = w?.max_points ?? 25;
    if (points >= max) continue;
    if (w?.state === "blocked" || w?.state === "unavailable" || w?.state === "restricted") continue;
    pool.push({
      user_id: p.user_id,
      full_name: p.full_name,
      category: p.performer_category,
      points,
      max_points: max,
      uncontacted: w?.uncontacted ?? 0,
      overdue: w?.overdue_followups ?? 0,
      last_assigned: lastMap.get(p.user_id) ?? 0,
    });
  }

  // Sort: uncontacted↑, overdue↑, points↑, last_assigned↑
  pool.sort((a, b) => a.uncontacted - b.uncontacted || a.overdue - b.overdue || a.points - b.points || a.last_assigned - b.last_assigned);
  return pool;
}

export async function bumpWorkload(userId: string, delta: number) {
  const { data } = await supabase.from("workload_points").select("points, max_points").eq("user_id", userId).maybeSingle();
  const current = data?.points ?? 0;
  const max = data?.max_points ?? 25;
  const next = Math.max(0, current + delta);
  const state: Database["public"]["Enums"]["availability_state"] =
    next >= max ? "blocked" : next >= max * 0.8 ? "near_capacity" : "available";
  if (data) {
    await supabase.from("workload_points").update({ points: next, state, updated_at: new Date().toISOString() }).eq("user_id", userId);
  } else {
    await supabase.from("workload_points").insert({ user_id: userId, points: next, state });
  }
}
export async function acceptAssignment(assignmentId: string) {
  await supabase.from("assignments").update({ accepted_at: new Date().toISOString(), state: "accepted" }).eq("id", assignmentId);
  await supabase.from("audit_logs").insert({ entity: "assignment", entity_id: assignmentId, action: "accepted" });
}

export async function logFirstAction(assignmentId: string, notes: string) {
  await supabase.from("assignments").update({ first_action_at: new Date().toISOString() }).eq("id", assignmentId);
  await supabase.from("audit_logs").insert({ entity: "assignment", entity_id: assignmentId, action: "first_action", next: { notes } });
}

export async function setScenarioAndNextAction(params: {
  leadId: string;
  assignmentId: string | null;
  scenario: ScenarioCode;
  notes?: string;
  ownerId: string | null;
  dueAt?: string; // ISO override
}) {
  const scen = SCENARIOS.find((s) => s.code === params.scenario)!;
  const due = params.dueAt ?? new Date(Date.now() + scen.nextAction.dueInMin * 60_000).toISOString();
  await supabase.from("leads").update({ current_scenario: params.scenario }).eq("id", params.leadId);
  await supabase.from("lead_scenarios_log").insert({
    lead_id: params.leadId, assignment_id: params.assignmentId, scenario: params.scenario, notes: params.notes ?? null,
  });
  await supabase.from("next_actions").insert({
    lead_id: params.leadId, owner_id: params.ownerId, kind: scen.nextAction.kind, due_at: due, notes: params.notes ?? null,
  });
}

export async function reassign(leadId: string, reason: string) {
  // Close previous open assignment
  const { data: prev } = await supabase.from("assignments").select("id, owner_id, priority").eq("lead_id", leadId).in("state", ["pending_accept", "accepted"]).order("assigned_at", { ascending: false }).limit(1).maybeSingle();
  if (prev) {
    await supabase.from("assignments").update({ state: "reassigned", reassign_reason: reason, reassigned_at: new Date().toISOString() }).eq("id", prev.id);
    await bumpWorkload(prev.owner_id, -4);
  }
  const { data: lead } = await supabase.from("leads").select("zone_id, priority").eq("id", leadId).single();
  if (!lead?.zone_id || !lead.priority) return { ok: false as const, error: "lead missing zone or priority" };
  const pool = await buildEligiblePool(lead.zone_id, lead.priority);
  const pick = pool.find((p) => p.user_id !== prev?.owner_id) ?? pool[0];
  if (!pick) return { ok: false as const, error: "No eligible owner" };
  const sla = SLA_CONFIG[lead.priority];
  const now = Date.now();
  const asg = await supabase.from("assignments").insert({
    lead_id: leadId,
    owner_id: pick.user_id,
    previous_owner: prev?.owner_id ?? null,
    priority: lead.priority,
    sla_deadline_accept: new Date(now + sla.accept * 1000).toISOString(),
    sla_deadline_first_action: new Date(now + sla.firstAction * 1000).toISOString(),
    state: "pending_accept",
    reassign_reason: reason,
  }).select("id").single();
  await supabase.from("leads").update({ current_owner: pick.user_id }).eq("id", leadId);
  await bumpWorkload(pick.user_id, 4);
  await supabase.from("audit_logs").insert({ entity: "lead", entity_id: leadId, action: "reassigned", reason, next: { newOwner: pick.user_id } });
  return { ok: true as const, newOwner: pick.user_id, assignmentId: asg.data?.id ?? null };
}

export async function simulateIncoming(sourceId: string, waName: string, phone: string, firstMessage: string) {
  const link = `https://wa.me/${phone.replace(/\D/g, "")}`;
  return supabase.from("inbound_conversations").insert({
    source_id: sourceId, wa_name: waName, phone, first_message: firstMessage, latest_message: firstMessage, conversation_link: link,
  }).select("id").single();
}

// ============================================================================
// Multi-cycle lifecycle: a single lead (phone) can enquire 15+ times over
// months/years. Each enquiry = one cycle with its own assignment, ownership,
// scenarios, and next actions. History is preserved forever; the lead row
// carries the "current" pointer only.
// ============================================================================

export async function closeCycle(leadId: string, reason: string) {
  // Close open cycle
  const { data: openCycle } = await supabase
    .from("lead_cycles").select("id").eq("lead_id", leadId).is("closed_at", null)
    .order("cycle_no", { ascending: false }).limit(1).maybeSingle();
  if (openCycle) {
    await supabase.from("lead_cycles").update({
      closed_at: new Date().toISOString(), close_reason: reason,
    }).eq("id", openCycle.id);
  }
  // Close any live assignment + free workload
  const { data: openAsg } = await supabase.from("assignments")
    .select("id, owner_id").eq("lead_id", leadId)
    .in("state", ["pending_accept", "accepted"]).maybeSingle();
  if (openAsg) {
    await supabase.from("assignments").update({ state: "completed", reassign_reason: reason }).eq("id", openAsg.id);
    await bumpWorkload(openAsg.owner_id, -4);
  }
  await supabase.from("leads").update({ status: "closed", current_owner: null, current_scenario: null }).eq("id", leadId);
  await supabase.from("audit_logs").insert({ entity: "lead", entity_id: leadId, action: "cycle_closed", reason });
}

export type ReopenInput = {
  leadId: string;
  reason: string; // "returning after 6 months", "changed mind", "new search", etc.
  zoneId?: string; // if location changed
  locationText?: string;
  moveinBucket?: MoveInBucket; // fresh urgency
  moveinDate?: string | null;
};

export async function reopenCycle(input: ReopenInput): Promise<AssignResult> {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", input.leadId).single();
  if (!lead) return { ok: false, leadId: input.leadId, priority: "nurture", score: 0, error: "lead not found" };

  // Make sure any prior cycle is closed first (idempotent).
  await closeCycle(input.leadId, `superseded by reopen: ${input.reason}`);

  const zoneId = input.zoneId ?? lead.zone_id;
  const moveinBucket = input.moveinBucket ?? lead.movein_bucket ?? "not_confirmed";
  const { data: zone } = zoneId
    ? await supabase.from("zones").select("inventory_strength, is_serviceable").eq("id", zoneId).single()
    : { data: null };
  const locationScore = locationScoreFor(zone?.inventory_strength, zone?.is_serviceable ?? true);
  const moveinScore = MOVE_IN_SCORE[moveinBucket];
  const score = locationScore + moveinScore;
  const priority = priorityFor(score);

  // Bump cycle_no
  const { data: last } = await supabase.from("lead_cycles").select("cycle_no")
    .eq("lead_id", input.leadId).order("cycle_no", { ascending: false }).limit(1).maybeSingle();
  const cycleNo = (last?.cycle_no ?? 0) + 1;
  const cyc = await supabase.from("lead_cycles").insert({
    lead_id: input.leadId, cycle_no: cycleNo, open_reason: input.reason,
  }).select("id").single();
  const cycleId = cyc.data?.id ?? null;

  // Refresh lead pointers
  await supabase.from("leads").update({
    status: "open",
    zone_id: zoneId,
    location_text: input.locationText ?? lead.location_text,
    movein_bucket: moveinBucket,
    movein_date: input.moveinDate ?? lead.movein_date,
    location_score: locationScore,
    movein_score: moveinScore,
    score,
    priority,
    current_scenario: null,
    current_owner: null,
  }).eq("id", input.leadId);

  await supabase.from("audit_logs").insert({
    entity: "lead", entity_id: input.leadId, action: "cycle_reopened",
    reason: input.reason, next: { cycleNo, priority, score },
  });

  // Route to a fresh owner via the same pool logic used on first entry.
  if (!zoneId) {
    return { ok: true, leadId: input.leadId, assignmentId: null, priority, score, ownerId: null, reason: "No zone — queued" };
  }
  const pool = await buildEligiblePool(zoneId, priority);
  if (pool.length === 0) {
    return { ok: true, leadId: input.leadId, assignmentId: null, priority, score, ownerId: null, reason: "No eligible owner — queued" };
  }
  const best = pool[0];
  const sla = SLA_CONFIG[priority];
  const now = Date.now();
  const asg = await supabase.from("assignments").insert({
    lead_id: input.leadId, cycle_id: cycleId, owner_id: best.user_id, priority,
    sla_deadline_accept: new Date(now + sla.accept * 1000).toISOString(),
    sla_deadline_first_action: new Date(now + sla.firstAction * 1000).toISOString(),
    state: "pending_accept",
    reassign_reason: `Cycle #${cycleNo}: ${input.reason}`,
  }).select("id").single();
  await supabase.from("leads").update({ current_owner: best.user_id }).eq("id", input.leadId);
  await bumpWorkload(best.user_id, 4);
  return { ok: true, leadId: input.leadId, assignmentId: asg.data?.id ?? null, priority, score, ownerId: best.user_id };
}

// Helper: fetch grouped cycle history for the detail view.
export async function loadCycleHistory(leadId: string) {
  const [cycles, asg, scen, na] = await Promise.all([
    supabase.from("lead_cycles").select("*").eq("lead_id", leadId).order("cycle_no", { ascending: false }),
    supabase.from("assignments").select("*").eq("lead_id", leadId).order("assigned_at", { ascending: false }),
    supabase.from("lead_scenarios_log").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase.from("next_actions").select("*").eq("lead_id", leadId).order("due_at", { ascending: false }),
  ]);
  return { cycles: cycles.data ?? [], assignments: asg.data ?? [], scenarios: scen.data ?? [], nextActions: na.data ?? [] };
}

// Co-work claim on an already-owned lead: creates a shadow assignment so a
// second operator can work in parallel while the primary is on call/WA.
export async function claimCowork(leadId: string, reason: string) {
  const me = (await supabase.auth.getUser()).data.user;
  if (!me) return { ok: false as const, error: "not signed in" };
  const { data: lead } = await supabase.from("leads").select("priority, current_owner").eq("id", leadId).single();
  if (!lead?.priority) return { ok: false as const, error: "lead missing priority" };
  const sla = SLA_CONFIG[lead.priority];
  const now = Date.now();
  const asg = await supabase.from("assignments").insert({
    lead_id: leadId, owner_id: me.id, previous_owner: lead.current_owner,
    priority: lead.priority,
    sla_deadline_accept: new Date(now + sla.accept * 1000).toISOString(),
    sla_deadline_first_action: new Date(now + sla.firstAction * 1000).toISOString(),
    state: "accepted",
    accepted_at: new Date().toISOString(),
    reassign_reason: `Co-work claim: ${reason}`,
  }).select("id").single();
  await supabase.from("audit_logs").insert({
    entity: "lead", entity_id: leadId, action: "cowork_claimed",
    reason, next: { claimer: me.id, primary: lead.current_owner },
  });
  return { ok: true as const, assignmentId: asg.data?.id ?? null };
}