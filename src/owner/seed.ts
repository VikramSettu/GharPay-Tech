import type { OwnerProfile, OwnerRoomStatus, OwnerRoomMedia, OwnerBlockRequest, OwnerInsightDaily, OwnerObjection } from './types';
import { rooms as mytRooms } from '@/myt/lib/properties-seed';
import { todayKey } from './compliance';

const now = new Date();
const iso = (offsetMin = 0) => new Date(Date.now() + offsetMin * 60_000).toISOString();

export const seedOwners: OwnerProfile[] = [
  { id: 'own-1', name: 'Rakesh Sharma',  phone: '+919876543210', propertyIds: ['p-koramangala-1'], isDedicated: true,  tier: 'priority',  joinedAt: '2024-08-01' },
  { id: 'own-2', name: 'Meera Iyer',     phone: '+919812345678', propertyIds: ['p-indiranagar-1'], isDedicated: true,  tier: 'standard',  joinedAt: '2024-09-12' },
  { id: 'own-3', name: 'Ankit Verma',    phone: '+919900112233', propertyIds: ['p-hsr-1'],         isDedicated: false, tier: 'throttled', joinedAt: '2025-01-20' },
  { id: 'own-4', name: 'Deepa Krishnan', phone: '+919876501122', propertyIds: ['p-whitefield-1'],  isDedicated: true,  tier: 'priority',  joinedAt: '2024-11-04' },
];

const ownerByProperty: Record<string, string> = {
  'p-koramangala-1': 'own-1',
  'p-indiranagar-1': 'own-2',
  'p-hsr-1': 'own-3',
  'p-whitefield-1': 'own-4',
};

// MYT properties use ids like `p1`, `p2`, ... — distribute them across the
// 4 owners so we can switch between owners on the home page and see
// genuinely different inventory.
const ownerIdsRR = ['own-1', 'own-2', 'own-3', 'own-4'];
function ownerForProperty(propertyId: string, fallbackIndex: number): string {
  if (ownerByProperty[propertyId]) return ownerByProperty[propertyId];
  // Stable mapping based on numeric suffix of property id (`p1`, `p12`, ...).
  const m = propertyId.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : fallbackIndex;
  return ownerIdsRR[n % ownerIdsRR.length];
}

export const seedRoomStatuses: OwnerRoomStatus[] = (mytRooms || []).map((r, idx) => {
  const ownerId = ownerForProperty(r.propertyId, idx);
  const free = r.bedsTotal - r.bedsOccupied;
  const kind: OwnerRoomStatus['kind'] = free === 0 ? 'occupied' : free === r.bedsTotal ? 'vacant' : 'occupied';
  const verifiedToday = (r.id.charCodeAt(r.id.length - 1) % 3) !== 0;
  return {
    roomId: r.id,
    propertyId: r.propertyId,
    ownerId,
    kind,
    rentConfirmed: r.currentPrice,
    floorPrice: Math.round(r.currentPrice * 0.9),
    updatedAt: iso(-30),
    verifiedToday,
    lockedUnsellable: false,
    isDedicated: idx % 4 === 0,
    views: ((idx * 13) % 60) + 2,
  };
});

// Demand objections — what the market is saying about your supply
export const seedObjections: OwnerObjection[] = seedRoomStatuses.slice(0, 8).map((r, i) => ({
  id: `obj-${i + 1}`,
  roomId: r.roomId,
  ownerId: r.ownerId,
  reason: (['price', 'location', 'price', 'amenities', 'price', 'timing', 'location', 'price'] as const)[i],
  notes: i % 2 === 0 ? 'Asked for ₹1k less' : undefined,
  loggedAt: iso(-60 * (i + 1)),
  loggedBy: 'Anil (Sales)',
}));

export const seedMedia: OwnerRoomMedia[] = seedRoomStatuses
  .filter((r) => r.kind === 'vacant')
  .slice(0, 6)
  .map((r) => ({
    roomId: r.roomId,
    ownerId: r.ownerId,
    photos: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg'],
    videoUrl: 'https://example.com/room-video.mp4',
    uploadedAt: iso(-60 * 24 * 2),
    expiresAt: iso(60 * 24 * 5), // 5 days left
  }));

export const seedBlocks: OwnerBlockRequest[] = [
  {
    id: 'blk-1',
    roomId: seedRoomStatuses[0]?.roomId ?? 'r-1',
    propertyId: seedRoomStatuses[0]?.propertyId ?? 'p-koramangala-1',
    ownerId: 'own-1',
    leadId: 'l-101',
    leadName: 'Priya Reddy',
    intent: 'hard',
    requestedAt: iso(-8),
    expiresAt: iso(7),
    state: 'pending',
  },
];

export const seedInsights: OwnerInsightDaily[] = seedOwners.map((o) => ({
  ownerId: o.id,
  date: todayKey(now),
  leadsPitched: Math.round(Math.random() * 18) + 4,
  visitsDone: Math.round(Math.random() * 4),
  highIntent: Math.round(Math.random() * 3),
  topObjection: ['Price ₹1.5k high', 'Wants AC', 'Far from metro', 'Food not preferred'][Math.floor(Math.random() * 4)],
  priceMismatchSignal: Math.random() > 0.6 ? 'Asking ₹2k below median' : undefined,
}));
