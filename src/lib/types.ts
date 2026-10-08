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
  /** runtime only (not stored): set when budgetPerDay was derived from live hotel rates */
  live?: { stay: StayRates; onGround: [number, number] };
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
  autoPublishEvents?: boolean; // scout/ingest events go live immediately (default true)
  spots?: { minRating: number; minReviews: number; radiusKm: number };
  rates?: { onGroundLo: number; onGroundHi: number }; // food + local transport per person per day, added to live stay prices
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

/** A byline on our articles — managed in Admin → Authors, shown at /authors/<slug> (E-E-A-T). */
export interface Author {
  slug: string;
  name: string;
  kind: 'Person' | 'Organization';
  role: string; // "Travel writers & trip planners"
  bio: string; // paragraphs separated by blank lines
  photo?: string; // /media/… upload
  expertise: string[];
  regions: string[]; // places they know first-hand
  since?: string; // "2024"
  standards?: string; // editorial standards / how they write
  links: string[]; // profile URLs (Instagram, LinkedIn, YouTube, website) → schema sameAs
  email?: string; // public contact
}

/* ---------- contributors (Google sign-in) ---------- */

export interface Account {
  id: string;
  email: string; // from Google, lower-case
  googleSub?: string;
  name: string;
  picture?: string;
  authorSlug: string; // their public byline (Author)
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  via: 'invite' | 'application';
}

export interface Invite {
  token: string;
  note?: string; // who it's for
  createdAt: string;
  expiresAt: string;
  usedBy?: string; // account id
  usedAt?: string;
}

export interface Application {
  id: string;
  name: string;
  email: string;
  phone?: string;
  places: string; // where they've travelled
  sample?: string; // link to their writing / Instagram
  pitch: string; // what they'd write about
  createdAt: string;
  status: 'new' | 'approved' | 'rejected';
  note?: string; // admin note
}

export interface NotePhotoDoc { src: string; alt: string; caption?: string; wide?: boolean }
export interface NoteSection { kicker?: string; heading: string; body: string; photos: NotePhotoDoc[] }

/** A field note written in the contributor studio (stored in the DB). */
export interface NoteDoc {
  id: string;
  slug: string; // set on first publish, then fixed
  authorSlug: string;
  accountId?: string; // who can edit it
  status: 'draft' | 'pending' | 'changes' | 'published';
  reviewNote?: string; // admin → writer
  title: string;
  description: string; // meta description / card text
  place: string;
  stateSlug: string;
  visited: string; // "October 2026"
  intro: string;
  cover?: NotePhotoDoc;
  sections: NoteSection[];
  quick: { q: string; a: string }[];
  faq: { q: string; a: string }[];
  sources: { label: string; href: string }[];
  keywords: string;
  photoConsent?: boolean; // writer confirmed: own photos, no kids' faces/number plates
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  publishedAt?: string;
  checked?: string; // facts checked date (ISO)
}

export interface Db {
  authors?: Author[];
  accounts?: Account[];
  invites?: Invite[];
  applications?: Application[];
  notes?: NoteDoc[];
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
  routeCache?: Record<string, CachedRoute>; // real road distances/times from a routing API
  routeMeta?: { lastRun?: string; lastError?: string; provider?: string; fetched?: number };
  spots?: Record<string, SpotSet>; // destSlug → best-rated spots nearby (Google Places / OpenStreetMap)
  spotMeta?: { lastRun?: string; lastError?: string; provider?: string; fetched?: number };
  hiddenSpots?: string[]; // spot ids the admin has hidden
  gems?: Record<string, GemSet>; // stateSlug → all-India hidden gems from Google Places
  gemsMeta?: { lastRun?: string; lastError?: string; fetched?: number };
  stayRates?: Record<string, StayRates>; // destSlug → live hotel prices (LiteAPI)
  rateMeta?: { lastRun?: string; lastError?: string; fetched?: number };
  assistantUsage?: { day: string; count: number }; // voice assistant requests today (cost guard)
  assistantLog?: { at: string; q: string }[]; // last questions asked (no personal data) — shown in admin
}

/** Live nightly room prices near a destination (1 room, 2 adults, taxes incl., INR). */
export interface StayRates {
  at: string;
  src: 'liteapi';
  sandbox?: boolean; // test key → never shown publicly
  dates: string[]; // check-in dates sampled (1 night each)
  count: number; // hotels with a price
  min: number;
  p25: number;
  median: number;
  p75: number;
  hotels: { id: string; name: string; stars?: number; rating?: number; price: number; distKm?: number }[];
  error?: string;
}

/** A real, mappable point of interest near a destination. */
export interface Spot {
  id: string; // google place id or osm "node/123"
  name: string;
  lat: number;
  lng: number;
  kind: string; // "Viewpoint", "Waterfall", "Hiking area"…
  rating?: number; // Google only
  reviews?: number; // Google only
  mapsUrl: string;
  distKm: number; // straight-line from the destination
  gem?: boolean; // highly rated but not yet over-reviewed
  src: 'google' | 'osm';
}

/** A hidden gem anywhere in India (not tied to one of our destinations). */
export type Gem = Spot & { area?: string; stateSlug: string };
export interface GemSet { at: string; gems: Gem[]; error?: string }

export interface SpotSet { at: string; src: 'google' | 'osm'; spots: Spot[]; error?: string }

/** One origin→destination road route, from OSRM / OpenRouteService. min = free-flow minutes. */
export interface CachedRoute { km: number; min: number; at: string; src: string; none?: boolean }

export type ModeId = 'road' | 'train' | 'flight';

export interface Leg {
  mode: ModeId;
  hours: number;
  note: string;
  routed?: boolean; // road time comes from real road-network routing (not the estimate model)
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
