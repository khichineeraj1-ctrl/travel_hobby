'use client';
import { useEffect, useState } from 'react';

type Weather = {
  tempC: number; feelsC: number; label: string; windKmh: number; verdict: string; source: string;
  daily: { date: string; max: number; min: number; rainPct: number; label: string }[];
};

const day = (iso: string, i: number) =>
  i === 0 ? 'Today' : new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });

export function WeatherWidget({ slug, name }: { slug: string; name: string }) {
  const [w, setW] = useState<Weather | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/weather/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => alive && setW(j))
      .catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [slug]);

  if (err) return <div className="card p-7 text-mute">Live weather is unavailable right now. The <a href="#best-time" className="text-blue-link hover:underline">month guide above</a> shows what {name} is usually like — or <a href="#enquire" className="text-blue-link hover:underline">ask us</a> and we’ll check conditions for your dates.</div>;
  if (!w) return <div className="card h-48 animate-pulse p-7 text-faint">Checking the sky over {name}…</div>;

  return (
    <div className="card p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-mute">Right now in {name}</p>
          <p className="text-6xl font-semibold tracking-tightest">{w.tempC}°</p>
          <p className="text-[15px] text-mute">{w.label[0].toUpperCase() + w.label.slice(1)} · feels {w.feelsC}° · wind {w.windKmh} km/h</p>
        </div>
        <p className="max-w-xs rounded-2xl bg-blue-soft px-4 py-3 text-[15px] text-ink">{w.verdict}</p>
      </div>
      <div className="mt-6 grid grid-cols-5 gap-2">
        {w.daily.map((d, i) => (
          <div key={d.date} className="rounded-2xl bg-paper p-3 text-center">
            <p className="text-xs font-semibold text-mute">{day(d.date, i)}</p>
            <p className="mt-1 text-xl font-semibold">{d.max}°</p>
            <p className="text-xs text-faint">{d.min}°</p>
            <p className="mt-1 text-xs text-blue-link">{d.rainPct}% rain</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-faint">
        {w.source === 'mock' ? 'Demo data' : <>Live · <a href="https://open-meteo.com/" className="underline" rel="nofollow noopener" target="_blank">open-meteo.com</a></>}
      </p>
    </div>
  );
}
