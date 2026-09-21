import { useMemo } from "react";
import { useIdentityStore } from "@/lib/lead-identity/store";
import type { UnifiedLead } from "@/lib/lead-identity/types";
import { useMountedNow } from "@/hooks/use-now";
import { useWorkflow, targetsFor } from "./store";
import {
  computeBoard, computeKpis, personFlow, checkpointVerdict, inferRole, deriveStage,
  type LeadMotion, type MotionContext, type PersonFlow,
} from "./engine";
import { allRoleGuarantees, allRolesScore, type RoleGuarantee } from "./roles";

/**
 * Transitional bridge until the workflow state machine is server-backed:
 * the legacy engine excludes CLOSED leads from its active board, but a booking
 * is not operationally complete until check-in ownership/date is safe. Keep
 * those unsafe bookings visible as check-in work instead of letting them vanish.
 */
function unsafeBookingMotions(leads: UnifiedLead[], now: number): LeadMotion[] {
  return leads
    .filter((lead) => (deriveStage(lead) === "CLOSED" || lead.state === "converted") && !lead.anchors?.checkInDate)
    .map((lead) => {
      const created = +new Date(lead.createdAt);
      const updated = +new Date(lead.updatedAt);
      return {
        lead,
        action: null,
        dueAt: null,
        health: "action-required",
        violations: [{
          code: "BOOKING_NO_HANDOVER",
          label: "Booking without check-in handover",
          detail: "Paid booking exists but downstream check-in date/ownership is not safe yet",
          severity: "P1",
          fn: "check-in",
          actions: ["assign", "open"],
        }],
        worst: "P1",
        priorityScore: 95,
        ageMs: Number.isFinite(created) ? now - created : 0,
        idleMs: Number.isFinite(updated) ? now - updated : 0,
        ownerId: null,
        ownerName: "Check-in owner required",
        fn: "check-in",
        reason: "Booking is not complete until the downstream check-in workflow is owned and dated",
      } satisfies LeadMotion;
    });
}

/**
 * One hook that every Workflow Guarantee screen consumes: the live motion
 * board, org KPIs, per-person flow rows and the per-role guarantee. SSR-safe
 * (empty until mounted).
 */
export function useWorkflowBoard() {
  const leads = useIdentityStore((s) => s.leads);
  const currentUser = useIdentityStore((s) => s.currentUser);
  const quotes = useWorkflow((s) => s.quotes);
  const blocked = useWorkflow((s) => s.blocked);
  const waiting = useWorkflow((s) => s.waiting);
  const resolved = useWorkflow((s) => s.resolved);
  const attempts = useWorkflow((s) => s.attempts);
  const targets = useWorkflow((s) => s.targets);
  const handoffs = useWorkflow((s) => s.handoffs);
  const [now, mounted] = useMountedNow(60_000);

  const ctx: MotionContext = useMemo(
    () => ({ now: now || 0, quotes, blocked, waiting, resolved }),
    [now, quotes, blocked, waiting, resolved],
  );

  const board = useMemo<LeadMotion[]>(() => {
    if (!mounted) return [];
    const active = computeBoard(leads, ctx);
    const unsafeBookings = unsafeBookingMotions(leads, now);
    return [...active, ...unsafeBookings].sort((a, b) => b.priorityScore - a.priorityScore);
  }, [leads, ctx, mounted, now]);

  const people = useMemo<PersonFlow[]>(() => {
    if (!mounted) return [];
    const byOwner = new Map<string, { name: string }>();
    board.forEach((m) => {
      if (m.ownerId) byOwner.set(m.ownerId, { name: m.ownerName });
    });
    if (!byOwner.has(currentUser.id)) byOwner.set(currentUser.id, { name: currentUser.name });
    return [...byOwner.entries()].map(([userId, meta]) => {
      const role = inferRole(board, userId);
      return personFlow({
        userId, name: meta.name, role, board, attempts, now,
        targets: targetsFor(targets, role),
      });
    }).sort((a, b) => (a.risk === b.risk ? b.requiredActions - a.requiredActions : a.risk === "critical" ? -1 : 1));
  }, [board, attempts, now, targets, mounted, currentUser]);

  const shortages = people.filter((p) => p.queueGap > 0).length;
  const eodRisks = people.filter((p) => p.pace === "behind").length;
  const kpis = useMemo(() => computeKpis(board, shortages, eodRisks), [board, shortages, eodRisks]);

  const myRole = useMemo(() => inferRole(board, currentUser.id), [board, currentUser.id]);

  const myFlow = useMemo(() => {
    if (!mounted) return null;
    return personFlow({
      userId: currentUser.id, name: currentUser.name, role: myRole,
      board, attempts, now, targets: targetsFor(targets, myRole),
    });
  }, [board, attempts, now, targets, mounted, currentUser, myRole]);

  const roles = useMemo<RoleGuarantee[]>(
    () => mounted
      ? allRoleGuarantees(board, people, now, { leads, handoffs, targets, quotes, blocked })
      : [],
    [board, people, now, mounted, leads, handoffs, targets, quotes, blocked],
  );

  /** The company is only as strong as its weakest active role guarantee. */
  const allRolesGuarantee = useMemo(() => allRolesScore(roles), [roles]);

  return {
    now, mounted, board, people, kpis, shortages, eodRisks, myFlow, currentUser,
    myRole, roles, allRolesGuarantee,
    verdict: myFlow ? checkpointVerdict(myFlow) : null,
  };
}
