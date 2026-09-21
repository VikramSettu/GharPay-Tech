import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  OwnerProfile, OwnerRoomStatus, OwnerRoomMedia, OwnerBlockRequest,
  ComplianceSnapshot, OwnerInsightDaily, RoomStatusKind, DailyTruthState,
  OwnerObjection, ObjectionReason,
} from './types';
import { seedOwners, seedRoomStatuses, seedMedia, seedBlocks, seedInsights, seedObjections } from './seed';
import { dailyTruthPhase, msUntilNextPhase, scoreOwnerCompliance, todayKey } from './compliance';
import { glueBus } from './event-bus';
import { properties as mytProperties, rooms as mytRooms } from '@/myt/lib/properties-seed';
import type { Property as MytProperty, Room as MytRoom } from '@/myt/lib/types';
import { registerOwnerBridge } from './team-bridge';

type OwnerRole = 'owner' | null;

interface OwnerCtxValue {
  // identity
  currentOwnerId: string | null;
  setCurrentOwnerId: (id: string | null) => void;
  ownerRole: OwnerRole;
  setOwnerRole: (r: OwnerRole) => void;

  // data
  owners: OwnerProfile[];
  properties: MytProperty[];
  rooms: MytRoom[];
  roomStatuses: OwnerRoomStatus[];
  media: OwnerRoomMedia[];
  blocks: OwnerBlockRequest[];
  insights: OwnerInsightDaily[];
  objections: OwnerObjection[];
  violations: number;

  // daily truth
  truth: DailyTruthState;

  // mutators
  updateRoomStatus: (roomId: string, patch: Partial<Omit<OwnerRoomStatus, 'roomId' | 'propertyId' | 'ownerId'>>) => void;
  markRoomVerified: (roomId: string) => void;
  uploadMedia: (roomId: string, photos: string[], videoUrl?: string) => void;
  decideBlock: (blockId: string, decision: 'approved' | 'rejected') => void;
  requestBlock: (input: Omit<OwnerBlockRequest, 'id' | 'requestedAt' | 'expiresAt' | 'state'>) => void;
  toggleDedicated: (roomId: string) => void;
  bulkVerify: (roomIds: string[]) => void;
  bulkRentDelta: (roomIds: string[], delta: number) => void;
  addProperty: (input: { name: string; area: string }) => void;
  addRoom: (input: { propertyId: string; type: 'single' | 'double' | 'triple' | 'studio'; bedsTotal: number; price: number; floorPrice?: number }) => void;
  logObjection: (input: { roomId: string; reason: ObjectionReason; notes?: string; loggedBy?: string }) => void;
  overrideBooking: (roomId: string, reason: string) => void;

  // selectors
  complianceFor: (ownerId: string) => ComplianceSnapshot;
}

const OwnerCtx = createContext<OwnerCtxValue | null>(null);

const STORAGE_KEY = 'gharpayy.owner.v1';

interface PersistShape {
  roomStatuses: OwnerRoomStatus[];
  media: OwnerRoomMedia[];
  blocks: OwnerBlockRequest[];
  objections: OwnerObjection[];
  violations: number;
  currentOwnerId: string | null;
  ownerRole: OwnerRole;
  lastTruthKey?: string;
}

function loadPersisted(): Partial<PersistShape> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as PersistShape : {};
  } catch { return {}; }
}

export function OwnerProvider({ children }: { children: React.ReactNode }) {
  const persisted = useMemo(() => loadPersisted(), []);

  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(persisted.currentOwnerId ?? 'own-1');
  const [ownerRole, setOwnerRole] = useState<OwnerRole>(persisted.ownerRole ?? null);
  const [owners] = useState<OwnerProfile[]>(seedOwners);
  const [properties, setProperties] = useState<MytProperty[]>(mytProperties);
  const [rooms, setRooms] = useState<MytRoom[]>(mytRooms);
  const [roomStatuses, setRoomStatuses] = useState<OwnerRoomStatus[]>(persisted.roomStatuses ?? seedRoomStatuses);
  const [media, setMedia] = useState<OwnerRoomMedia[]>(persisted.media ?? seedMedia);
  const [blocks, setBlocks] = useState<OwnerBlockRequest[]>(persisted.blocks ?? seedBlocks);
  const [insights] = useState<OwnerInsightDaily[]>(seedInsights);
  const [objections, setObjections] = useState<OwnerObjection[]>(persisted.objections ?? seedObjections);
  const [violations, setViolations] = useState<number>(persisted.violations ?? 0);

  // Truth phase ticker — client only
  const [truth, setTruth] = useState<DailyTruthState>({
    phase: 'idle', msToNextTransition: 0, todayKey: todayKey(),
  });

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const phase = dailyTruthPhase(d);
      setTruth({ phase, msToNextTransition: msUntilNextPhase(d), todayKey: todayKey(d) });

      // 11 AM auto-lock: flip lockedUnsellable=true on rooms not verified today
      if (phase === 'locked') {
        setRoomStatuses((prev) => {
          let changed = false;
          const next = prev.map((r) => {
            if (!r.verifiedToday && !r.lockedUnsellable) {
              changed = true;
              glueBus.publish({ type: 'owner.room.locked', roomId: r.roomId, propertyId: r.propertyId, ownerId: r.ownerId, reason: 'unverified_by_11am' });
              return { ...r, lockedUnsellable: true };
            }
            return r;
          });
          return changed ? next : prev;
        });
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-release blocks past expiry
  useEffect(() => {
    const id = setInterval(() => {
      setBlocks((prev) => {
        const nowMs = Date.now();
        let changed = false;
        const next = prev.map((b) => {
          if (b.state === 'pending' && new Date(b.expiresAt).getTime() <= nowMs) {
            changed = true;
            return { ...b, state: 'auto_released' as const, decidedAt: new Date().toISOString() };
          }
          return b;
        });
        return changed ? next : prev;
      });
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload: PersistShape = { roomStatuses, media, blocks, objections, violations, currentOwnerId, ownerRole };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
  }, [roomStatuses, media, blocks, objections, violations, currentOwnerId, ownerRole]);

  const updateRoomStatus: OwnerCtxValue['updateRoomStatus'] = (roomId, patch) => {
    setRoomStatuses((prev) => prev.map((r) => {
      if (r.roomId !== roomId) return r;
      const next = { ...r, ...patch, updatedAt: new Date().toISOString(), verifiedToday: true, lockedUnsellable: false };
      glueBus.publish({ type: 'owner.room.updated', roomId: r.roomId, propertyId: r.propertyId, status: next.kind, ownerId: r.ownerId });
      return next;
    }));
  };

  const markRoomVerified: OwnerCtxValue['markRoomVerified'] = (roomId) => {
    setRoomStatuses((prev) => prev.map((r) =>
      r.roomId === roomId ? { ...r, verifiedToday: true, lockedUnsellable: false, updatedAt: new Date().toISOString() } : r
    ));
    const r = roomStatuses.find((x) => x.roomId === roomId);
    if (r) glueBus.publish({ type: 'owner.room.updated', roomId, propertyId: r.propertyId, status: r.kind, ownerId: r.ownerId });
  };

  const uploadMedia: OwnerCtxValue['uploadMedia'] = (roomId, photos, videoUrl) => {
    const room = roomStatuses.find((r) => r.roomId === roomId);
    if (!room) return;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setMedia((prev) => {
      const filtered = prev.filter((m) => m.roomId !== roomId);
      return [...filtered, { roomId, ownerId: room.ownerId, photos, videoUrl, uploadedAt: new Date().toISOString(), expiresAt }];
    });
    glueBus.publish({ type: 'owner.media.uploaded', roomId, ownerId: room.ownerId, expiresAt });
  };

  const decideBlock: OwnerCtxValue['decideBlock'] = (blockId, decision) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId) return b;
      const next = { ...b, state: decision, decidedAt: new Date().toISOString() };
      if (decision === 'approved') {
        glueBus.publish({ type: 'owner.block.approved', blockId, roomId: b.roomId, leadId: b.leadId });
      } else {
        glueBus.publish({ type: 'owner.block.rejected', blockId, roomId: b.roomId, leadId: b.leadId });
      }
      return next;
    }));
  };

  const requestBlock: OwnerCtxValue['requestBlock'] = (input) => {
    const id = `blk-${Math.random().toString(36).slice(2, 8)}`;
    const requestedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const block: OwnerBlockRequest = { ...input, id, requestedAt, expiresAt, state: 'pending' };
    setBlocks((prev) => [block, ...prev]);
    glueBus.publish({ type: 'team.block.requested', blockId: id, roomId: input.roomId, leadId: input.leadId, ownerId: input.ownerId });
  };

  const toggleDedicated: OwnerCtxValue['toggleDedicated'] = (roomId) => {
    setRoomStatuses((prev) => prev.map((r) =>
      r.roomId === roomId
        ? { ...r, isDedicated: !r.isDedicated, updatedAt: new Date().toISOString(), verifiedToday: true }
        : r
    ));
  };

  const bulkVerify: OwnerCtxValue['bulkVerify'] = (roomIds) => {
    if (!roomIds.length) return;
    const set = new Set(roomIds);
    setRoomStatuses((prev) => prev.map((r) =>
      set.has(r.roomId) ? { ...r, verifiedToday: true, lockedUnsellable: false, updatedAt: new Date().toISOString() } : r
    ));
  };

  const bulkRentDelta: OwnerCtxValue['bulkRentDelta'] = (roomIds, delta) => {
    if (!roomIds.length || !delta) return;
    const set = new Set(roomIds);
    setRoomStatuses((prev) => prev.map((r) =>
      set.has(r.roomId)
        ? { ...r, rentConfirmed: Math.max(0, (r.rentConfirmed ?? 0) + delta), updatedAt: new Date().toISOString(), verifiedToday: true }
        : r
    ));
  };

  const addProperty: OwnerCtxValue['addProperty'] = ({ name, area }) => {
    if (!currentOwnerId) return;
    const id = `p-custom-${Math.random().toString(36).slice(2, 7)}`;
    const newProp: MytProperty = {
      id, name, zoneId: 'z-custom', area,
      address: `${area}`, basePrice: 10000,
      foodRating: 4, hygieneRating: 4, amenities: ['WiFi'],
      ownerName: owners.find((o) => o.id === currentOwnerId)?.name ?? 'Owner',
      photoCount: 0, pageViews: 0, shares: 0,
    };
    setProperties((prev) => [newProp, ...prev]);
  };

  const addRoom: OwnerCtxValue['addRoom'] = ({ propertyId, type, bedsTotal, price, floorPrice }) => {
    if (!currentOwnerId) return;
    const id = `r-${Math.random().toString(36).slice(2, 7)}`;
    const newRoom: MytRoom = { id, propertyId, type, bedsTotal, bedsOccupied: 0, currentPrice: price };
    setRooms((prev) => [...prev, newRoom]);
    setRoomStatuses((prev) => [
      ...prev,
      {
        roomId: id, propertyId, ownerId: currentOwnerId,
        kind: 'vacant', rentConfirmed: price, floorPrice,
        updatedAt: new Date().toISOString(), verifiedToday: true, lockedUnsellable: false,
        isDedicated: false, views: 0,
      },
    ]);
  };

  const logObjection: OwnerCtxValue['logObjection'] = ({ roomId, reason, notes, loggedBy = 'Sales' }) => {
    const room = roomStatuses.find((r) => r.roomId === roomId);
    if (!room) return;
    setObjections((prev) => [
      { id: `obj-${Math.random().toString(36).slice(2, 7)}`, roomId, ownerId: room.ownerId, reason, notes, loggedAt: new Date().toISOString(), loggedBy },
      ...prev,
    ]);
  };

  const overrideBooking: OwnerCtxValue['overrideBooking'] = (_roomId, _reason) => {
    setViolations((v) => v + 1);
  };

  const bumpRoomViews = (roomId: string, by = 1) => {
    setRoomStatuses((prev) => prev.map((r) =>
      r.roomId === roomId ? { ...r, views: (r.views ?? 0) + by } : r
    ));
  };

  // Register the team↔owner bridge so post-tour objections + tour completions
  // from the Team store push into the Owner store.
  useEffect(() => {
    registerOwnerBridge({
      logObjection: (input) => logObjection(input),
      bumpRoomViews,
      resolveRoomIdByPropertyKey: (key) => {
        if (!roomStatuses.length) return null;
        // deterministic hash → consistent owner room for any team property
        let h = 0;
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
        return roomStatuses[h % roomStatuses.length]?.roomId ?? null;
      },
    });
  }, [roomStatuses]);

  const complianceFor = (ownerId: string): ComplianceSnapshot => {
    const owner = owners.find((o) => o.id === ownerId) ?? owners[0];
    return scoreOwnerCompliance(owner, roomStatuses, media, blocks);
  };

  const value: OwnerCtxValue = {
    currentOwnerId, setCurrentOwnerId,
    ownerRole, setOwnerRole,
    owners, properties, rooms, roomStatuses, media, blocks, insights, objections, violations,
    truth,
    updateRoomStatus, markRoomVerified, uploadMedia, decideBlock, requestBlock,
    toggleDedicated, bulkVerify, bulkRentDelta, addProperty, addRoom, logObjection, overrideBooking,
    complianceFor,
  };

  return <OwnerCtx.Provider value={value}>{children}</OwnerCtx.Provider>;
}

export function useOwner() {
  const ctx = useContext(OwnerCtx);
  if (!ctx) throw new Error('useOwner must be used within OwnerProvider');
  return ctx;
}
