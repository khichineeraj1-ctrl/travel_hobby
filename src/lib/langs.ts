/** Languages the site can be read in. Shared by server and client. */
export const LANGS = [
  { code: 'en', name: 'English', native: 'English', hreflang: 'en-IN' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', hreflang: 'hi-IN' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', hreflang: 'bn-IN' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', hreflang: 'mr-IN' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', hreflang: 'te-IN' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', hreflang: 'ta-IN' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', hreflang: 'gu-IN' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', hreflang: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', hreflang: 'ml-IN' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', hreflang: 'pa-IN' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', hreflang: 'or-IN' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', hreflang: 'as-IN' },
] as const;

export type Lang = (typeof LANGS)[number]['code'];
export const NON_EN = LANGS.filter((l) => l.code !== 'en').map((l) => l.code);
export const isLang = (s: unknown): s is Lang => LANGS.some((l) => l.code === s);
export const langInfo = (c: string) => LANGS.find((l) => l.code === c) ?? LANGS[0];

/** Visitor's state (from IP) → the language we switch to. States not listed stay in English. */
const STATE_LANG: Record<string, Lang> = {
  'uttar pradesh': 'hi', 'madhya pradesh': 'hi', bihar: 'hi', jharkhand: 'hi', chhattisgarh: 'hi', rajasthan: 'hi', haryana: 'hi',
  delhi: 'hi', 'national capital territory of delhi': 'hi', 'himachal pradesh': 'hi', uttarakhand: 'hi', uttaranchal: 'hi',
  'jammu and kashmir': 'hi', ladakh: 'hi', 'andaman and nicobar islands': 'hi',
  'tamil nadu': 'ta', puducherry: 'ta', pondicherry: 'ta',
  'andhra pradesh': 'te', telangana: 'te',
  karnataka: 'kn',
  kerala: 'ml', lakshadweep: 'ml',
  'west bengal': 'bn', tripura: 'bn',
  maharashtra: 'mr', goa: 'mr',
  gujarat: 'gu', 'dadra and nagar haveli and daman and diu': 'gu', 'dadra and nagar haveli': 'gu', 'daman and diu': 'gu',
  punjab: 'pa', chandigarh: 'pa',
  odisha: 'or', orissa: 'or',
  assam: 'as',
};
export const langForState = (region?: string): Lang => STATE_LANG[(region ?? '').toLowerCase().replace(/^nct of /, '').trim()] ?? 'en';

/** Prefix a site path with the language (English has no prefix). */
export const withLang = (lang: string, path: string) => (lang === 'en' ? path : `/${lang}${path === '/' ? '' : path}`);
