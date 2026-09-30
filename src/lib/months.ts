import type { Month } from './types';

export const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

export const monthName = (m: Month) => MONTHS[m - 1];
export const monthLabel = (m: Month) => MONTHS[m - 1][0].toUpperCase() + MONTHS[m - 1].slice(1);
export const monthShort = (m: Month) => monthLabel(m).slice(0, 3);
export const monthFromSlug = (slug: string): Month | undefined => {
  const i = MONTHS.indexOf(slug as (typeof MONTHS)[number]);
  return i === -1 ? undefined : ((i + 1) as Month);
};
export const allMonths: Month[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** IST-safe current month */
export const currentMonth = (): Month => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return (d.getUTCMonth() + 1) as Month;
};
