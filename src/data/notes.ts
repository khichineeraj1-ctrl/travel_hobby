/**
 * Field notes: first-hand trip write-ups with our own photos.
 * Facts we couldn't check ourselves are marked "confirm on the official site" on the page.
 */
export type NotePhoto = { src: string; alt: string; caption?: string; wide?: boolean };
export type Zone = { name: string; gate: string; opens: 'all-year' | 'oct-15' | 'nov-15'; note?: string };
export type FieldNote = {
  slug: string;
  title: string; // page H1
  seoTitle: string;
  description: string;
  place: string;
  stateSlug: string;
  stateName: string;
  visited: string; // "October 2026"
  lat: number;
  lng: number;
  hero: NotePhoto;
  intro: string;
  /** short name used in search results and cards */
  shortName: string;
  /** extra words people may search for */
  keywords: string;
  /** 16:9, ≥1200px wide — for Google Discover / share cards */
  cover: { src: string; width: number; height: number };
  authorSlug: string; // Admin → Authors
  published: string; // ISO date
  checked: string; // ISO date facts were last checked
  /** answer-first summary: direct answers AI search and skimmers can lift as-is */
  quick: { q: string; a: string }[];
  /** FAQ (also emitted as FAQPage schema) */
  faq: { q: string; a: string }[];
  sources: { label: string; href: string }[];
};

export const NOTES: FieldNote[] = [
  {
    slug: 'jim-corbett-safari-zones-booking-village-vatika',
    title: 'Jim Corbett: which safari zone is open when, how to book, and where to eat',
    seoTitle: 'Jim Corbett Safari Zones, Booking & Village Vatika',
    description: 'Field notes from Jim Corbett: which of the 8 safari zones are open year-round, from 15 October or 15 November, how to book a jungle stay a month ahead, and dinner at Village Vatika, Ramnagar.',
    place: 'Jim Corbett',
    stateSlug: 'uttarakhand',
    stateName: 'Uttarakhand',
    visited: 'October 2026',
    lat: 29.53,
    lng: 78.77,
    hero: { src: '/notes/corbett/village-vatika-sign.jpg', alt: 'Village Vatika restaurant sign on the main road in Ramnagar, Jim Corbett', wide: true },
    shortName: 'Jim Corbett: safari zones, booking & where to eat',
    cover: { src: '/notes/corbett/cover-16x9.jpg', width: 1280, height: 720 },
    authorSlug: 'beyond-explored-team',
    published: '2026-10-08',
    checked: '2026-10-08',
    quick: [
      { q: 'Which zones are open all year?', a: 'Jhirna, Dhela and Garjia.' },
      { q: 'When does Bijrani open?', a: '15 October.' },
      { q: 'When do Dhikala, Durga Devi, Sonanadi and Pakhro open?', a: '15 November.' },
      { q: 'Best way to see a tiger?', a: 'Stay overnight inside the reserve at a forest rest house, not just a day safari.' },
      { q: 'How early should I book?', a: 'At least a month ahead, on the official Corbett Tiger Reserve website only.' },
      { q: 'Where should I eat in Ramnagar?', a: 'Village Vatika on NH309 — great food, family crowd, bring your own drinks.' },
    ],
    faq: [
      { q: 'Which Jim Corbett safari zones are open all year?', a: 'Three zones run all year: Jhirna and Dhela (both through Dhela gate) and Garjia (Garjia gate). The other five zones close for the monsoon and reopen in October or November.' },
      { q: 'When does the Bijrani zone open in Corbett?', a: 'Bijrani opens on 15 October each year. You enter through Amdanda gate near Ramnagar. It is the most popular day-safari zone and the easiest first safari.' },
      { q: 'When does Dhikala open, and why is it special?', a: 'Dhikala opens on 15 November. It is the deepest and wildest part of the reserve, entered through Dhangarhi gate, and is best experienced with an overnight stay at a forest rest house inside the zone.' },
      { q: 'Which month should I visit Jim Corbett?', a: 'If you want every zone open, go between 15 November and mid-June. In October you can still safari in the three all-year zones, and in Bijrani from 15 October. Core zones shut for the monsoon from around mid/late June.' },
      { q: 'How far in advance should I book a Corbett safari or jungle stay?', a: 'Book at least a month ahead — more for long weekends and the Diwali-to-New-Year season. Rooms inside the reserve are limited and the good dates go the day booking opens. Book only on the official Corbett Tiger Reserve website.' },
      { q: 'How do I improve my chances of seeing a tiger in Corbett?', a: 'Stay inside the reserve at a forest rest house so you are in the jungle at dawn and dusk, take the early-morning safari slot, and choose a deeper zone such as Dhikala once it opens on 15 November. Sightings are never guaranteed.' },
      { q: 'Where should I eat in Ramnagar near Jim Corbett?', a: 'We loved Village Vatika on NH309 at Ladwachaur, Ramnagar. The food was excellent, the evening crowd is mostly families, and you can bring your own whisky or drinks.' },
      { q: 'Can you bring your own alcohol to Village Vatika, Ramnagar?', a: 'Yes — when we visited in October 2026, guests could bring their own whisky or drinks and order food around it. Arrange a driver if you are drinking.' },
    ],
    sources: [
      { label: 'Official Corbett Tiger Reserve booking site', href: 'https://corbettonline.uk.gov.in/' },
      { label: 'Corbett jungle safari zones (official)', href: 'https://corbettonline.uk.gov.in/crbt_junglesafari.aspx' },
    ],
    keywords: 'jim corbett national park tiger reserve ramnagar nainital safari jungle stay forest rest house dhikala bijrani jhirna dhela garjia durga devi village vatika restaurant dinner byob whisky',
    intro: 'Many people think Corbett is one park with one gate. It’s not. It has eight safari zones, each with its own gate and its own opening date. If you don’t check, you can drive five hours from Delhi and find the gate closed. We went in early October 2026. Here’s what we’d tell a friend before they go — and the dinner place we loved.',
  },
];

/** The 8 zones as we found them in October 2026. Dates shift some years — always check the official site. */
export const CORBETT_ZONES: Zone[] = [
  { name: 'Jhirna', gate: 'Dhela gate', opens: 'all-year' },
  { name: 'Dhela', gate: 'Dhela gate', opens: 'all-year' },
  { name: 'Garjia', gate: 'Garjia gate', opens: 'all-year' },
  { name: 'Bijrani', gate: 'Amdanda gate', opens: 'oct-15', note: 'The most popular day-safari zone' },
  { name: 'Dhikala', gate: 'Dhangarhi gate', opens: 'nov-15', note: 'Deepest zone — best for tigers; stay overnight inside' },
  { name: 'Durga Devi', gate: 'Durga Devi gate', opens: 'nov-15', note: 'Some years opens from 15 Oct' },
  { name: 'Sonanadi', gate: 'Vatanvasa gate (Kotdwar side)', opens: 'nov-15' },
  { name: 'Pakhro', gate: 'Pakhro gate (Kotdwar side)', opens: 'nov-15' },
];

export const CORBETT_OFFICIAL = 'https://corbettonline.uk.gov.in/';

export const noteBySlug = (slug: string) => NOTES.find((n) => n.slug === slug);
export const notesForState = (stateSlug: string) => NOTES.filter((n) => n.stateSlug === stateSlug);
