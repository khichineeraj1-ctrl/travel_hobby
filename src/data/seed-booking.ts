import type { Departure, Stay } from '@/lib/types';

/**
 * Former sample inventory (made-up prices/dates). No longer seeded; the ids are kept so
 * db.ts can remove these samples from existing databases. Add real trips/stays in Admin.
 */
export const seedDepartures: Departure[] = [
  {
    id: 'ziro-music-slow-week-oct26', destSlug: 'ziro-valley-arunachal-pradesh', title: 'Ziro slow week',
    startDate: '2026-10-24', endDate: '2026-10-29', pricePerPerson: 24500, seatsTotal: 10, startsFrom: 'Guwahati airport',
    inclusions: ['ILP permit assistance', '5 nights bamboo homestays', 'All meals', 'Shared transfers from Guwahati', 'Local Apatani guide'],
    exclusions: ['Flights to Guwahati', 'Personal expenses'], published: true,
  },
  {
    id: 'chopta-chandrashila-nov26', destSlug: 'chopta-uttarakhand', title: 'Chandrashila sunrise trek',
    startDate: '2026-11-13', endDate: '2026-11-16', pricePerPerson: 9800, seatsTotal: 14, startsFrom: 'Rishikesh',
    inclusions: ['Tempo traveller from Rishikesh', '3 nights camps', 'Meals on trek', 'Trek leader'],
    exclusions: ['Travel to Rishikesh', 'Porter for personal bags'], published: true,
  },
  {
    id: 'majuli-raas-nov26', destSlug: 'majuli-assam', title: 'Majuli Raas festival',
    startDate: '2026-11-22', endDate: '2026-11-25', pricePerPerson: 12900, seatsTotal: 8, startsFrom: 'Jorhat',
    inclusions: ['Stilt-house homestay', 'Ferry + island transfers', 'Satra visits with a local host', 'All meals'],
    exclusions: ['Travel to Jorhat'], published: true,
  },
  {
    id: 'gandikota-camp-dec26', destSlug: 'gandikota-andhra-pradesh', title: 'Canyon rim camp weekend',
    startDate: '2026-12-11', endDate: '2026-12-13', pricePerPerson: 5900, seatsTotal: 16, startsFrom: 'Bengaluru',
    inclusions: ['AC bus from Bengaluru', '1 night rim camping', 'Dinner + breakfast', 'Belum caves entry'],
    exclusions: ['Lunch'], published: true,
  },
  {
    id: 'hanle-dark-sky-jun27', destSlug: 'hanle-ladakh', title: 'Hanle dark-sky expedition',
    startDate: '2027-06-10', endDate: '2027-06-18', pricePerPerson: 42000, seatsTotal: 8, startsFrom: 'Leh airport',
    inclusions: ['Permits', '2 acclimatisation nights in Leh', 'Astro-homestay with telescope', 'SUV transfers', 'All meals'],
    exclusions: ['Flights to Leh'], published: true,
  },
];

export const seedStays: Stay[] = [
  {
    id: 'hong-bamboo-homestay', destSlug: 'ziro-valley-arunachal-pradesh', name: 'Hong Village Bamboo Homestay', type: 'Homestay',
    pricePerNight: 2200, rooms: 4, maxGuestsPerRoom: 3, amenities: ['Breakfast + dinner', 'Hot water', 'Wi-Fi (patchy)', 'Bonfire'],
    about: 'A family-run Apatani home in Hong village, a short walk from the paddy fields.', published: true,
  },
  {
    id: 'gushaini-riverside-cottage', destSlug: 'tirthan-valley-himachal-pradesh', name: 'Gushaini Riverside Cottage', type: 'Cottage',
    pricePerNight: 3200, rooms: 5, maxGuestsPerRoom: 3, amenities: ['River view', 'All meals available', 'Trout on request', 'Parking'],
    about: 'Wooden cottages right on the Tirthan river, 10 minutes from the GHNP gate.', published: true,
  },
  {
    id: 'kudle-cliff-huts', destSlug: 'gokarna-karnataka', name: 'Kudle Cliff Huts', type: 'Beach huts',
    pricePerNight: 1800, rooms: 8, maxGuestsPerRoom: 2, amenities: ['Sea view', 'Café', 'Hammocks'],
    about: 'Simple huts on the cliff above Kudle beach. Sunset from your doorstep.', published: true,
  },
  {
    id: 'hanle-astro-homestay', destSlug: 'hanle-ladakh', name: 'Hanle Astro Homestay', type: 'Homestay',
    pricePerNight: 3000, rooms: 3, maxGuestsPerRoom: 3, amenities: ['Telescope night', 'All meals', 'Heated room'],
    about: 'Stay with an astro-ambassador family; telescope sessions every clear night.', published: true,
  },
];
