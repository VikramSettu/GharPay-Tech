import React, { createContext, useContext, useState } from 'react';
import { Tour, Role, Lead, Booking, Room, RoomBlock, Property } from './types';
import { tours as initialTours, initialLeads, initialBookings } from './mock-data';
import { rooms as initialRooms, initialBlocks } from './properties-seed';

interface AppState {
  tours: Tour[];
  setTours: React.Dispatch<React.SetStateAction<Tour[]>>;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  blocks: RoomBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<RoomBlock[]>>;
  // User-managed properties for the Property Command Center (no seed data).
  managedProperties: Property[];
  setManagedProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  managedRooms: Room[];
  setManagedRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentMemberId: string | null;
  setCurrentMemberId: (id: string | null) => void;
  globalZoneFilter: string | null;
  setGlobalZoneFilter: (id: string | null) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tours, setTours] = useState<Tour[]>(initialTours);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [blocks, setBlocks] = useState<RoomBlock[]>(initialBlocks);
  const [managedProperties, setManagedProperties] = useState<Property[]>([]);
  const [managedRooms, setManagedRooms] = useState<Room[]>([]);
  const [currentRole, setCurrentRole] = useState<Role>('hr');
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [globalZoneFilter, setGlobalZoneFilter] = useState<string | null>(null);

  return (
    <AppContext.Provider value={{
      tours, setTours,
      leads, setLeads,
      bookings, setBookings,
      rooms, setRooms,
      blocks, setBlocks,
      managedProperties, setManagedProperties,
      managedRooms, setManagedRooms,
      currentRole, setCurrentRole,
      currentMemberId, setCurrentMemberId,
      globalZoneFilter, setGlobalZoneFilter,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
