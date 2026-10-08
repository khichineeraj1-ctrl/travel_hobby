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
};

export const NOTES: FieldNote[] = [
  {
    slug: 'jim-corbett-safari-zones-booking-village-vatika',
    title: 'Jim Corbett: which safari zone is open when, and where to eat after.',
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
    keywords: 'jim corbett national park tiger reserve ramnagar nainital safari jungle stay forest rest house dhikala bijrani jhirna dhela garjia durga devi village vatika restaurant dinner byob whisky',
    intro: 'We just got back from Corbett. Two things we wish someone had told us before we went: the jungle isn’t one park — it’s eight zones that open on different dates — and the best dinner in Ramnagar is a garden restaurant right on the main road where families bring their own bottle.',
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
