// Deterministic gradient class per room id — every room has a unique visual identity.
const PALETTE = [
  'bg-gradient-to-br from-rose-400 to-rose-600',
  'bg-gradient-to-br from-amber-400 to-orange-500',
  'bg-gradient-to-br from-sky-400 to-indigo-500',
  'bg-gradient-to-br from-emerald-400 to-teal-500',
  'bg-gradient-to-br from-fuchsia-400 to-pink-500',
  'bg-gradient-to-br from-violet-400 to-purple-600',
];

export function roomHeroClass(roomId: string): string {
  let h = 0;
  for (let i = 0; i < roomId.length; i++) h = (h * 31 + roomId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export type Tier = 'Gold' | 'Silver' | 'Bronze';
export function ownerTier(score: number): { tier: Tier; tone: 'success' | 'warning' | 'muted' } {
  if (score >= 80) return { tier: 'Gold', tone: 'success' };
  if (score >= 50) return { tier: 'Silver', tone: 'warning' };
  return { tier: 'Bronze', tone: 'muted' };
}
