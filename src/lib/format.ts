export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

export const hrs = (h: number) => {
  if (h < 1) return `${Math.round(h * 60)} min`;
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60 / 15) * 15;
  if (mins === 60) return `${whole + 1}h`;
  return mins ? `${whole}h ${mins}m` : `${whole}h`;
};

export const crowdLabel = (c: number) =>
  ['', 'basically empty', 'a few backpackers', 'getting known', 'weekend-busy', 'instagram found it'][c];

export const signalLabel = { none: 'no signal', patchy: 'patchy signal', decent: 'decent signal' } as const;

export const crewLabel = { solo: 'solo', duo: 'duo / couple', squad: 'squad', fam: 'fam' } as const;

export const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
