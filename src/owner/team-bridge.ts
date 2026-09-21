// Team ↔ Owner bridge.
// When TCMs log post-tour objections in the Team store (src/lib/store), they need
// to flow into the Owner store so the demand-signal bars on the Owner dashboard
// reflect real team activity.
//
// The two stores use different property/room IDs, so the bridge resolves a
// team-side property name to an owner-side room id (deterministic hash).

import type { ObjectionReason } from "./types";

type LogObjectionFn = (input: {
  roomId: string;
  reason: ObjectionReason;
  notes?: string;
  loggedBy?: string;
}) => void;

type BumpRoomViewsFn = (roomId: string, by?: number) => void;

interface OwnerBridge {
  logObjection: LogObjectionFn;
  bumpRoomViews: BumpRoomViewsFn;
  /** team-property-key → owner-room-id (deterministic). Returns null if owner store empty. */
  resolveRoomIdByPropertyKey: (key: string) => string | null;
}

let bridge: OwnerBridge | null = null;

export function registerOwnerBridge(b: OwnerBridge) {
  bridge = b;
}

/** Map team OBJECTIONS labels → owner ObjectionReason taxonomy. */
export function mapObjectionLabelToReason(label: string | null | undefined): ObjectionReason {
  switch ((label ?? "").toLowerCase()) {
    case "budget": return "price";
    case "location": return "location";
    case "amenities": return "amenities";
    case "timing": return "timing";
    case "parents":
    case "comparing options":
    case "other":
    default:
      return "other";
  }
}

export function pushObjectionToOwner(input: {
  propertyKey: string;
  reasonLabel: string | null;
  notes?: string;
  loggedBy?: string;
}) {
  if (!bridge) return;
  const roomId = bridge.resolveRoomIdByPropertyKey(input.propertyKey);
  if (!roomId) return;
  bridge.logObjection({
    roomId,
    reason: mapObjectionLabelToReason(input.reasonLabel),
    notes: input.notes,
    loggedBy: input.loggedBy ?? "TCM",
  });
}

export function pushTourViewToOwner(propertyKey: string) {
  if (!bridge) return;
  const roomId = bridge.resolveRoomIdByPropertyKey(propertyKey);
  if (!roomId) return;
  bridge.bumpRoomViews(roomId, 1);
}
