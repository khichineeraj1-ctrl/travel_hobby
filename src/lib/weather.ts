/**
 * Live weather via Open-Meteo (free, no API key, CC-BY 4.0 — credit shown in UI).
 * https://open-meteo.com/en/docs
 */
export interface WeatherNow {
  tempC: number;
  feelsC: number;
  code: number;
  label: string;
  windKmh: number;
  isDay: boolean;
  daily: { date: string; max: number; min: number; rainPct: number; code: number; label: string }[];
  fetchedAt: string;
}

const CODES: Record<number, string> = {
  0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'foggy', 48: 'icy fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'rain showers', 81: 'rain showers', 82: 'violent showers',
  85: 'snow showers', 86: 'heavy snow showers', 95: 'thunderstorm', 96: 'thunderstorm + hail', 99: 'thunderstorm + hail',
};
export const weatherLabel = (c: number) => CODES[c] ?? 'mixed';

export async function fetchWeather(lat: number, lng: number): Promise<WeatherNow> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia%2FKolkata&forecast_days=5`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const j = await res.json();
  return {
    tempC: Math.round(j.current.temperature_2m),
    feelsC: Math.round(j.current.apparent_temperature),
    code: j.current.weather_code,
    label: weatherLabel(j.current.weather_code),
    windKmh: Math.round(j.current.wind_speed_10m),
    isDay: j.current.is_day === 1,
    daily: j.daily.time.map((date: string, i: number) => ({
      date,
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      rainPct: j.daily.precipitation_probability_max[i] ?? 0,
      code: j.daily.weather_code[i],
      label: weatherLabel(j.daily.weather_code[i]),
    })),
    fetchedAt: new Date().toISOString(),
  };
}

/** one-line gen-z verdict on the forecast */
export function weatherVerdict(w: WeatherNow): string {
  const rainy = w.daily.filter((d) => d.rainPct >= 60).length;
  if (w.tempC <= 0) return 'sub-zero. layers on layers on layers.';
  if (rainy >= 3) return 'rain-heavy week. pack a poncho or pick another spot.';
  if (w.code >= 71 && w.code <= 86) return 'it’s snowing. main character weather.';
  if (w.tempC >= 36) return 'it’s giving oven. go early morning or not at all.';
  if (rainy === 0 && w.code <= 2) return 'clear skies all week. no excuses.';
  return 'mixed bag — nothing a hoodie can’t fix.';
}
