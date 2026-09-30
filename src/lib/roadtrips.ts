/** Road-trip maths: legs, totals, map projection and a Google Maps directions link. */
import type { RoadTrip } from './types';
import { km } from './travel';
import { cachedRoute, realisticHours } from './routing';

export interface Leg { from: string; to: string; km: number; hours: number; routed?: boolean }

/** Mountain roads wind: straight-line → road distance grows with terrain (Manali–Leh is ~2.2×). */
const detour = (f: number) => 1.2 + (f - 1) * 1.0;
const speed = (f: number) => 65 / f; // average km/h incl. slow sections

export function legs(t: RoadTrip): Leg[] {
  return t.stops.slice(1).map((s, i) => {
    const a = t.stops[i];
    const f = s.legFactor ?? t.roadFactor;
    const routed = cachedRoute(a, s);
    if (routed) {
      // real road distance; mountain routes are slow the whole way, so apply terrain to the full leg
      const h = (routed.min / 60) * 1.15 * Math.max(1, 1 + (f - 1) * 0.35) + Math.floor(routed.min / 60 / 4) * 0.4;
      return { from: a.name, to: s.name, km: Math.round(routed.km / 5) * 5, hours: Math.round(h * 2) / 2, routed: true };
    }
    const roadKm = km(a, s) * detour(f);
    const drive = roadKm / speed(f);
    return { from: a.name, to: s.name, km: Math.round(roadKm / 5) * 5, hours: Math.round((drive + Math.floor(drive / 4) * 0.4) * 2) / 2 };
  });
}

export function totals(t: RoadTrip) {
  const L = legs(t);
  const nights = t.stops.reduce((n, s) => n + s.nights, 0);
  return {
    km: L.reduce((n, l) => n + l.km, 0),
    driveHours: L.reduce((n, l) => n + l.hours, 0),
    nights,
    days: nights + 1,
    longestDay: L.reduce((m, l) => Math.max(m, l.hours), 0),
  };
}

export function mapsLink(t: RoadTrip) {
  const pts = t.stops.map((s) => `${s.lat},${s.lng}`);
  const q = new URLSearchParams({ api: '1', origin: pts[0], destination: pts[pts.length - 1], travelmode: 'driving' });
  const mid = pts.slice(1, -1);
  if (mid.length) q.set('waypoints', mid.slice(0, 9).join('|'));
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}

/** project stops into an SVG box (equirectangular, lat-corrected) */
export function project(t: RoadTrip, w = 600, h = 360, pad = 48) {
  const lat0 = t.stops.reduce((s, p) => s + p.lat, 0) / t.stops.length;
  const kx = Math.cos((lat0 * Math.PI) / 180);
  const xs = t.stops.map((s) => s.lng * kx);
  const ys = t.stops.map((s) => -s.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((w - 2 * pad) / (maxX - minX || 1), (h - 2 * pad) / (maxY - minY || 1));
  const ox = (w - (maxX - minX) * scale) / 2, oy = (h - (maxY - minY) * scale) / 2;
  return t.stops.map((s, i) => ({ ...s, x: ox + (xs[i] - minX) * scale, y: oy + (ys[i] - minY) * scale }));
}
