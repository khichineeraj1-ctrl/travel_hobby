import type { SiteSettings } from '@/lib/types';

export const defaultSettings: SiteSettings = {
  banner: {
    enabled: true,
    text: 'October is peak season for 14 hidden spots — and most of them are still empty.',
    linkLabel: 'See what’s peaking',
    linkHref: '/when/october',
  },
  hero: {
    title: 'Explore.',
    tagline: 'The best way to find places nobody’s posted yet.',
    sub: 'Hidden India, matched to your days, your crew, your wallet and your vibe.',
    primaryCta: 'Plan my escape',
    secondaryCta: 'Just send me somewhere',
  },
  rail: { title: 'Peaking now.', subtitle: 'Places at their absolute best this month.' },
  planner: {
    title: 'The planner.',
    subtitle: 'Tell us your days. We’ll find the exit.',
    submitLabel: 'Find my escape',
    rollLabel: 'Surprise me',
  },
  featured: ['ziro-valley-arunachal-pradesh', 'gurez-valley-jammu-kashmir', 'hanle-ladakh'],
  pitch: [
    { title: 'Ranked by fit, not commission.', body: 'No sponsored listings. Places rank by whether the trip actually works for you.' },
    { title: 'Hours on the ground.', body: 'Door-to-door travel time by road, train or flight — and what’s left for the fun part.' },
    { title: 'The ick list.', body: 'Permits, bad roads, no ATMs, altitude. The honest stuff nobody else tells you.' },
    { title: 'A crowd meter.', body: 'From “basically empty” to “instagram found it”. We tell you before you go.' },
  ],
  footerNote: 'Travel times are estimates. Weather by open-meteo.com. Always check permits and road status before you go.',
};
