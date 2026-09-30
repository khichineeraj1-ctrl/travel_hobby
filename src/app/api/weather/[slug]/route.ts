import { NextResponse } from 'next/server';
import { getDestination } from '@/lib/repo';
import { fetchWeather, weatherVerdict, type WeatherNow } from '@/lib/weather';

export const revalidate = 1800; // 30 min cache — weather doesn't change that fast

function mock(): WeatherNow {
  const today = new Date();
  return {
    tempC: 14, feelsC: 12, code: 2, label: 'partly cloudy', windKmh: 9, isDay: true,
    daily: Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today.getTime() + i * 86400000);
      return { date: d.toISOString().slice(0, 10), max: 18 - i, min: 7 - i, rainPct: [10, 20, 60, 30, 5][i], code: [1, 2, 61, 3, 0][i], label: ['mostly clear', 'partly cloudy', 'light rain', 'overcast', 'clear sky'][i] };
    }),
    fetchedAt: today.toISOString(),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) return NextResponse.json({ error: 'unknown place' }, { status: 404 });

  try {
    const w = process.env.WEATHER_MOCK === '1' ? mock() : await fetchWeather(d.lat, d.lng);
    return NextResponse.json({ ...w, verdict: weatherVerdict(w), source: process.env.WEATHER_MOCK === '1' ? 'mock' : 'open-meteo' });
  } catch {
    return NextResponse.json({ error: 'weather unavailable' }, { status: 502 });
  }
}
