// Onboarding draft model — the collection shape for everything a Property 360
// passport needs. Filled either by the property owner (owner mode) or by the
// Gharpayy team on their behalf (team mode).

import type { AccessLevel, BedStatus, Room } from "../model";

export type OnboardingMode = "team" | "owner";
export type DraftStatus = "draft" | "submitted" | "published";

export interface DraftBed {
  label: string;
  position: string;
  price: number;
  status: BedStatus;
  availableFrom?: string;
}

export interface DraftRoom {
  number: string;
  type: Room["type"];
  ac: boolean;
  bathroom: "Attached" | "Shared";
  balcony: boolean;
  windowDirection: "East" | "West" | "North" | "South";
  sizeSqft: number;
  standardRent: number;
  currentRent: number;
  floorRent: number;
  deposit: string;
  beds: DraftBed[];
  why: string[];
  whyNot: string[];
  bestFor: string;
  mediaCount: number;
  hasVideo: boolean;
}

export interface DraftFloor {
  no: number;
  name: string;
  usp: string[];
  weakness: string[];
  rooms: DraftRoom[];
  hasMap: boolean;
}

export interface DraftLandmark {
  name: string;
  category: string;
  km: number;
  walkMin: number;
}

export interface DraftPerson {
  role: string;
  name: string;
  phone: string;
  hours: string;
  access: AccessLevel;
}

export interface DraftCommercial {
  label: string;
  value: string;
  access: AccessLevel;
}

export interface DraftMediaGroup {
  group: string;
  count: number;
  hasVideo: boolean;
}

export interface DraftDocument {
  name: string;
  kind: string;
  access: AccessLevel;
  provided: boolean;
}

export interface DraftPersona {
  persona: string;
  score: number;
  why: string;
}

export interface OnboardingDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  mode: OnboardingMode;
  status: DraftStatus;
  filledBy: string;
  publishedPid?: string;

  identity: {
    displayName: string;
    actualName: string;
    group: string;
    gender: string;
    tier: string;
    propertyType: string;
    status: "Active" | "Paused" | "Upcoming" | "Sold Out";
    priority: "Hero" | "Core" | "Backup" | "Long-tail";
    onboardedOn: string;
  };

  location: {
    zone: string;
    subArea: string;
    microLocation: string;
    address: string;
    mapsLink: string;
    lat: string;
    lng: string;
    landmarks: DraftLandmark[];
  };

  floors: DraftFloor[];

  amenities: { group: string; items: string }[];
  food: { type: string; meals: string; notes: string };
  rules: { label: string; value: string }[];
  commercials: DraftCommercial[];
  people: DraftPerson[];
  media: DraftMediaGroup[];
  documents: DraftDocument[];
  personas: DraftPersona[];
  why: string[];
  whyNot: string[];
  notFor: string[];
  faq: { q: string; a: string }[];
  internalNotes: string[];
  experience: { metric: string; score: number }[];
}

export const LANDMARK_CATEGORIES = [
  "College / University",
  "IT Park / Office",
  "Metro / Transport",
  "Mall / Market",
  "Hospital",
  "Restaurant / Cafe",
  "Gym / Sports",
  "Other landmark",
];

export const AMENITY_GROUPS = ["Room", "Property", "Safety", "Services", "Lifestyle"];

export const MEDIA_GROUPS = [
  "Exterior & arrival",
  "Common areas",
  "Floor walkthroughs",
  "Room media",
  "Approach / route video",
];

export const EXPERIENCE_METRICS = [
  "Room Quality", "Food", "Cleanliness", "Location", "Value",
  "Management", "Amenities", "Safety", "Social Environment", "Quietness",
];

export const PERSONA_SEEDS = [
  "Student (nearby college)",
  "IT / working professional",
  "Premium professional",
  "Budget customer",
  "Food-first customer",
  "Immediate move-in",
];

/** Steps of the collective onboarding flow. `owner` marks steps an owner fills. */
export const STEPS = [
  { id: "identity", label: "Identity", owner: true, hint: "What the property is called, who runs it, which tier." },
  { id: "location", label: "Location & landmarks", owner: true, hint: "Exact address, map pin, and what is nearby." },
  { id: "building", label: "Building & floors", owner: true, hint: "How many floors, and what each floor is like." },
  { id: "rooms", label: "Rooms & beds", owner: true, hint: "Every sellable room and every bed in it." },
  { id: "amenities", label: "Amenities & food", owner: true, hint: "What is provided in the room, property and kitchen." },
  { id: "rules", label: "Rules & stay terms", owner: true, hint: "Timings, deposit, lock-in, utilities, housekeeping." },
  { id: "commercials", label: "Commercials", owner: false, hint: "Pricing, negotiation room and payout — role gated." },
  { id: "people", label: "People", owner: true, hint: "Manager, owner, food and maintenance contacts." },
  { id: "media", label: "Media & documents", owner: true, hint: "Photos, videos and paperwork per section." },
  { id: "fit", label: "Customer fit", owner: false, hint: "Personas, why / why not, who it is not for." },
  { id: "faq", label: "FAQ & notes", owner: true, hint: "The questions customers always ask." },
  { id: "review", label: "Review & publish", owner: false, hint: "Completeness, gates and readiness before it goes live." },
] as const;

export type StepId = (typeof STEPS)[number]["id"];
