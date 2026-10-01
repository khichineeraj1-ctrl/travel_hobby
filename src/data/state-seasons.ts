import type { Month } from '@/lib/types';

/**
 * Typical best months to travel in each state/UT — the widely published tourism seasons
 * (shown on the site as "usual season for <state>", not as a place-specific guarantee).
 * Our 32 full guides use their own researched months instead.
 */
export const STATE_SEASON: Record<string, Month[]> = {
  'andhra-pradesh': [10, 11, 12, 1, 2, 3],
  'arunachal-pradesh': [10, 11, 12, 1, 2, 3, 4],
  assam: [10, 11, 12, 1, 2, 3, 4],
  bihar: [10, 11, 12, 1, 2, 3],
  chhattisgarh: [10, 11, 12, 1, 2, 3],
  goa: [11, 12, 1, 2, 3],
  gujarat: [10, 11, 12, 1, 2, 3],
  haryana: [10, 11, 12, 1, 2, 3],
  'himachal-pradesh': [3, 4, 5, 6, 9, 10, 11],
  jharkhand: [10, 11, 12, 1, 2, 3],
  karnataka: [10, 11, 12, 1, 2, 3],
  kerala: [9, 10, 11, 12, 1, 2, 3],
  'madhya-pradesh': [10, 11, 12, 1, 2, 3],
  maharashtra: [10, 11, 12, 1, 2],
  manipur: [10, 11, 12, 1, 2, 3, 4],
  meghalaya: [10, 11, 12, 1, 2, 3, 4],
  mizoram: [10, 11, 12, 1, 2, 3],
  nagaland: [10, 11, 12, 1, 2, 3, 4],
  odisha: [10, 11, 12, 1, 2, 3],
  punjab: [10, 11, 12, 1, 2, 3],
  rajasthan: [10, 11, 12, 1, 2, 3],
  sikkim: [3, 4, 5, 10, 11, 12],
  'tamil-nadu': [11, 12, 1, 2, 3],
  telangana: [10, 11, 12, 1, 2],
  tripura: [10, 11, 12, 1, 2, 3],
  'uttar-pradesh': [10, 11, 12, 1, 2, 3],
  uttarakhand: [3, 4, 5, 6, 9, 10, 11],
  'west-bengal': [10, 11, 12, 1, 2, 3],
  'andaman-nicobar': [11, 12, 1, 2, 3, 4],
  chandigarh: [10, 11, 12, 1, 2, 3],
  'dadra-nagar-haveli-daman-diu': [10, 11, 12, 1, 2, 3],
  delhi: [10, 11, 12, 1, 2, 3],
  'jammu-kashmir': [3, 4, 5, 6, 9, 10],
  ladakh: [5, 6, 7, 8, 9],
  lakshadweep: [10, 11, 12, 1, 2, 3, 4],
  puducherry: [10, 11, 12, 1, 2, 3],
};

/** Waterfalls are at their fullest in and right after the monsoon. */
export const WATERFALL_MONTHS: Month[] = [7, 8, 9, 10];
