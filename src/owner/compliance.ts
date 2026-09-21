import type { OwnerRoomStatus, OwnerRoomMedia, OwnerBlockRequest, ComplianceSnapshot, OwnerProfile } from './types';

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isMediaFresh(m: OwnerRoomMedia | undefined, now = Date.now()): boolean {
  if (!m) return false;
  if (!m.photos || m.photos.length < 3) return false;
  if (!m.videoUrl) return false;
  return new Date(m.expiresAt).getTime() > now;
}

export function scoreOwnerCompliance(
  owner: OwnerProfile,
  rooms: OwnerRoomStatus[],
  media: OwnerRoomMedia[],
  blocks: OwnerBlockRequest[],
  now = Date.now()
): ComplianceSnapshot {
  const ownerRooms = rooms.filter((r) => r.ownerId === owner.id);
  const total = ownerRooms.length || 1;
  const verified = ownerRooms.filter((r) => r.verifiedToday && !r.lockedUnsellable).length;
  const vacantRooms = ownerRooms.filter((r) => r.kind === 'vacant');
  const fresh = vacantRooms.filter((r) => isMediaFresh(media.find((m) => m.roomId === r.roomId), now)).length;
  const myBlocks = blocks.filter((b) => b.ownerId === owner.id);
  const decided = myBlocks.filter((b) => b.state !== 'pending' && b.state !== 'auto_released').length;

  const verifyPart = (verified / total) * 60;
  const mediaPart = vacantRooms.length ? (fresh / vacantRooms.length) * 25 : 25;
  const blockPart = myBlocks.length ? (decided / myBlocks.length) * 15 : 15;
  const score = Math.round(verifyPart + mediaPart + blockPart);

  let tier: ComplianceSnapshot['tier'] = 'standard';
  if (score >= 90) tier = 'priority';
  else if (score < 70) tier = 'throttled';

  return {
    ownerId: owner.id,
    date: todayKey(new Date(now)),
    totalRooms: ownerRooms.length,
    verifiedRooms: verified,
    mediaFreshRooms: fresh,
    blocksRespondedInTime: decided,
    blocksTotal: myBlocks.length,
    score,
    tier,
  };
}

// Daily-truth phase from current local time
export function dailyTruthPhase(d = new Date()): 'idle' | 'open' | 'warning' | 'locked' {
  const mins = d.getHours() * 60 + d.getMinutes();
  if (mins < 9 * 60 + 30) return 'idle';        // before 9:30
  if (mins < 10 * 60 + 30) return 'open';       // 9:30 → 10:30
  if (mins < 11 * 60) return 'warning';         // 10:30 → 11:00
  return 'locked';                              // ≥ 11:00
}

export function msUntilNextPhase(d = new Date()): number {
  const mins = d.getHours() * 60 + d.getMinutes();
  let target: number;
  if (mins < 9 * 60 + 30) target = 9 * 60 + 30;
  else if (mins < 10 * 60 + 30) target = 10 * 60 + 30;
  else if (mins < 11 * 60) target = 11 * 60;
  else target = (24 + 9) * 60 + 30; // tomorrow 9:30
  const targetDate = new Date(d);
  targetDate.setHours(0, 0, 0, 0);
  targetDate.setMinutes(target);
  return targetDate.getTime() - d.getTime();
}
