import { Property, Room, RoomBlock, RoomType } from './types';
import { zones } from './mock-data';

const propertyNames = [
  'Prestige Lakeside','Brigade Meadows','Sobha Dream Acres','Godrej Splendour',
  'Mantri Serenity','Puravankara Zenium','Salarpuria Sattva','Embassy Springs',
  'Total Environment','Raheja Residency','Adarsh Palm Retreat','Shriram Greenfield',
  'Provident Sunworth','Nitesh Forest Hills','DivyaSree Republic','Sterling Ascentia',
  'Casagrand Aldea','Vaswani Reserve',
];

const owners = ['Ramesh K','Sunita Gowda','Manoj Pillai','Anita Reddy','Vikas Hegde','Deepak Bose','Lakshmi N','Suresh Babu'];
const amenitiesPool = ['WiFi','AC','Laundry','Gym','Lounge','Cafeteria','Power backup','Parking','CCTV','Daily housekeeping'];

function pick<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

export const properties: Property[] = propertyNames.map((name, i) => {
  const zone = zones[i % zones.length];
  return {
    id: `p${i + 1}`,
    name,
    zoneId: zone.id,
    area: zone.area,
    address: `${10 + i} Main Rd, ${zone.area}`,
    basePrice: 8000 + (i % 7) * 1500,
    foodRating: parseFloat((2.8 + ((i * 7) % 22) / 10).toFixed(1)),
    hygieneRating: parseFloat((3.2 + ((i * 11) % 18) / 10).toFixed(1)),
    amenities: pick(amenitiesPool, 4 + (i % 4)),
    ownerName: owners[i % owners.length],
    photoCount: 4 + (i % 8),
    pageViews: 50 + ((i * 37) % 280),
    shares: 2 + ((i * 5) % 25),
  };
});

const roomTypes: RoomType[] = ['single', 'double', 'triple', 'studio'];

export const rooms: Room[] = properties.flatMap((p, pi) => {
  const roomCount = 4 + (pi % 4);
  return Array.from({ length: roomCount }, (_, ri) => {
    const type = roomTypes[(pi + ri) % 4];
    const bedsTotal = type === 'single' ? 1 : type === 'double' ? 2 : type === 'triple' ? 3 : 1;
    const bedsOccupied = Math.floor(Math.random() * (bedsTotal + 1));
    const priceMult = type === 'single' ? 1.3 : type === 'studio' ? 1.5 : type === 'double' ? 1.0 : 0.8;
    return {
      id: `r${p.id}-${ri + 1}`,
      propertyId: p.id,
      type,
      bedsTotal,
      bedsOccupied,
      currentPrice: Math.round(p.basePrice * priceMult),
    };
  });
});

// A few seed active blocks so the UI shows life immediately
export const initialBlocks: RoomBlock[] = rooms.slice(0, 6).map((r, i) => ({
  id: `blk-seed-${i}`,
  roomId: r.id,
  propertyId: r.propertyId,
  leadName: ['Arun Mehta','Simran Kaur','Rajat Gupta','Neha Jain','Akash Bose','Tanya Sharma'][i],
  intent: i % 2 === 0 ? 'hard' : 'medium',
  createdAt: new Date(Date.now() - i * 30 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + (i % 2 === 0 ? 4 : 1) * 60 * 60 * 1000 - i * 10 * 60 * 1000).toISOString(),
  status: 'active',
}));
