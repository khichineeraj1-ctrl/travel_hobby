export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type Crew = 'solo' | 'duo' | 'squad' | 'fam';

/** vibe ids are admin-managed, so this is a plain string slug */
export type VibeId = string;

export type Terrain = 'mountain' | 'high-altitude' | 'hills' | 'coast' | 'plains' | 'desert' | 'island';

export type Signal = 'none' | 'patchy' | 'decent';

export interface Hub {
  name: string;
  lat: number;
  lng: number;
}

export interface Destination {
  slug: string; // SEO slug: <place>-<state>
  name: string;
  state: string;
  stateSlug: string;
  lat: number;
  lng: number;
  altitudeM: number;
  terrain: Terrain;
  /** one-liner, lowercase, how a friend would text it */
  hook: string;
  /** 2–3 sentence honest description */
  about: string;
  vibes: VibeId[];
  bestMonths: Month[];
  okMonths: Month[]; // doable, with caveats
  /** months to skip + why */
  skip: { months: Month[]; why: string }[];
  /** 1 = basically empty, 5 = instagram already found it */
  crowd: 1 | 2 | 3 | 4 | 5;
  /** per-person per-day INR, backpacker → comfy */
  budgetPerDay: [number, number];
  crewFit: Record<Crew, 1 | 2 | 3 | 4 | 5>;
  minDays: number;
  idealDays: number;
  signal: Signal;
  airport: Hub | null;
  railhead: Hub | null;
  /** extra last-mile slowdown on roads (1 = highway, 1.8 = mountain switchbacks) */
  roadFactor: number;
  doThis: string[];
  theIck: string[]; // honest cons — aggregators never tell you this
  stayTypes: string[];
  palette: [string, string]; // gradient fallback when there's no photo
  image?: string; // /media/<file> — uploaded via admin
  imageCredit?: string;
  published?: boolean; // default true; drafts are hidden from the public site
  updatedAt?: string;
}

export interface OriginCity {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  hasAirport: boolean;
}

export interface Vibe {
  id: VibeId;
  label: string;
  blurb: string;
  seoTitle: string;
  emoji: string;
  image?: string;
}

export interface SiteSettings {
  banner: { enabled: boolean; text: string; linkLabel: string; linkHref: string };
  hero: { title: string; tagline: string; sub: string; primaryCta: string; secondaryCta: string };
  rail: { title: string; subtitle: string };
  planner: { title: string; subtitle: string; submitLabel: string; rollLabel: string };
  featured: string[]; // destination slugs pinned to the top of the home rail
  pitch: { title: string; body: string }[];
  footerNote: string;
}

/* ---------- booking engine ---------- */

/** A curated group trip with fixed dates and limited seats */
export interface Departure {
  id: string;
  destSlug: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  pricePerPerson: number;
  seatsTotal: number;
  startsFrom: string; // e.g. "Guwahati airport"
  inclusions: string[];
  exclusions: string[];
  published: boolean;
}

/** A partner property (homestay, camp…) bookable by the night */
export interface Stay {
  id: string;
  destSlug: string;
  name: string;
  type: string; // homestay, camp, cottage, hostel…
  pricePerNight: number; // per room
  rooms: number;
  maxGuestsPerRoom: number;
  amenities: string[];
  about: string;
  image?: string;
  published: boolean;
}

export type BookingKind = 'trip' | 'stay' | 'custom';
export type BookingStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

export interface Contact {
  name: string;
  phone: string;
  email?: string;
}

export interface Booking {
  id: string; // public reference, e.g. BK-7F3K9Q
  key: string; // secret for the traveller's confirmation link
  kind: BookingKind;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  destSlug?: string;
  departureId?: string;
  stayId?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number;
  guests: number;
  total?: number; // estimated INR, pay later
  details: Record<string, string>; // custom-trip answers etc.
  notes?: string; // from traveller
  adminNotes?: string;
  source?: string; // page path
}

/* ---------- road trips ---------- */

export interface RoadStop {
  name: string;
  lat: number;
  lng: number;
  nights: number; // 0 = pass-through / viewpoint
  note?: string;
  destSlug?: string; // link to a place page
  legFactor?: number; // terrain factor for the drive INTO this stop (overrides the trip's)
}

export interface RoadTrip {
  slug: string;
  title: string;
  hook: string;
  about: string;
  stops: RoadStop[]; // in driving order; first = start, last = finish
  roadFactor: number; // terrain slowdown for drive-time estimates (1 highway … 2 brutal)
  bestMonths: Month[];
  difficulty: 'easy' | 'moderate' | 'hardcore';
  vehicle: string; // "Any car", "SUV recommended", "Bike-friendly"
  highlights: string[];
  theIck: string[];
  permits?: string;
  fuelNote?: string;
  vibes: VibeId[];
  palette: [string, string];
  image?: string;
  published: boolean;
}

/* ---------- events ---------- */

export type EventCategory = 'festival' | 'music' | 'culture' | 'religious' | 'sports' | 'nature';
export type EventStatus = 'published' | 'draft' | 'suggested'; // suggested = came in via ingest, awaiting review

export interface TravelEvent {
  slug: string; // SEO: <name>-<year>
  name: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dateStatus: 'confirmed' | 'expected';
  town: string;
  state: string;
  lat: number;
  lng: number;
  destSlug?: string;
  roadTripSlug?: string;
  hook: string;
  about: string;
  tips: string[];
  recurring: 'annual' | 'one-off';
  nextEdition?: string; // "Usually mid-September"
  sourceUrl?: string;
  ticketUrl?: string;
  roadFactor?: number; // last-mile terrain override for travel times (e.g. 2.8 for Zanskar)
  image?: string;
  status: EventStatus;
  createdAt?: string;
}

export type LeadKind = 'enquiry' | 'dropoff' | 'newsletter' | 'partner' | 'event';
export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';

export interface Lead {
  id: string;
  kind: LeadKind;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  name?: string;
  phone?: string;
  email?: string;
  data: Record<string, string>;
  source?: string;
  bookingId?: string; // set when a drop-off later converts
  adminNotes?: string;
}

export interface Db {
  settings: SiteSettings;
  vibes: Vibe[];
  cities: OriginCity[];
  destinations: Destination[];
  departures: Departure[];
  stays: Stay[];
  bookings: Booking[];
  leads: Lead[];
  roadTrips: RoadTrip[];
  events: TravelEvent[];
}

export type ModeId = 'road' | 'train' | 'flight';

export interface Leg {
  mode: ModeId;
  hours: number;
  note: string;
}

export interface TravelEstimate {
  fastest: Leg;
  options: Leg[];
  straightLineKm: number;
}

export interface PlanInput {
  from: string; // origin city slug
  days: number; // total days incl. travel
  budget: number; // per person per day INR
  crew: Crew;
  month: Month;
  vibes: VibeId[];
  maxCrowd?: number;
}

export interface Suggestion {
  destination: Destination;
  score: number; // 0–100
  travel: TravelEstimate;
  hoursOnGround: number;
  reasons: string[];
  warnings: string[];
}
