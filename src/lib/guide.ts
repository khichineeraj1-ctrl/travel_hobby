/**
 * The on-screen guide: any section can say what the guide should tell the visitor while
 * that section is on screen. Spread the result onto the section element:
 *   <section {...guide('Liking these? We’ll stitch them into a plan.', { label: 'Free itinerary', href: '#enquire' })}>
 * Use guideQuiet on sections where the visitor is already acting (forms, checkout) — the guide steps aside.
 */
export type GuideCta = { label: string; href: string };

export const guide = (text: string, cta?: GuideCta) => ({
  'data-guide': text,
  ...(cta ? { 'data-guide-cta': cta.label, 'data-guide-href': cta.href } : {}),
});

export const guideQuiet = { 'data-guide': '', 'data-guide-quiet': '1' };
