/**
 * Travel-time estimator.
 *
 * No paid routing API needed: we model road / train / flight using great-circle
 * distance + detour factors + per-destination terrain slowdown. Good enough to
 * answer "can I pull this off in a long weekend?" — which is the real question.
 * Swap `roadHours` for OSRM / Google Distance Matrix later if you want precision.
 */
import type { Destination, Hub, Leg, OriginCity, TravelEstimate } from './types';
import { cachedRoute, realisticHours } from './routing';

const R = 6371;
export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const ROAD_DETOUR = 1.25; // roads aren't straight lines
const HIGHWAY_KMPH = 64;

/** road hours; `slow` = terrain factor applied to the last ~150 km */
function roadHours(distKm: number, slow = 1) {
  // extreme terrain (Zanskar, Spiti interiors): roads wind ~3x the straight line and crawl the whole way
  if (slow >= 2.2) {
    const wild = Math.min(distKm, 150); // the last ~150 km (straight-line) are the brutal part
    const h = ((distKm - wild) * ROAD_DETOUR) / HIGHWAY_KMPH + (wild * (1.2 + (slow - 1))) / (65 / slow);
    return h + Math.floor(h / 4) * 0.4;
  }
  const road = distKm * ROAD_DETOUR;
  const lastMile = Math.min(road, 150);
  const highway = road - lastMile;
  const h = highway / HIGHWAY_KMPH + (lastMile * slow) / HIGHWAY_KMPH;
  const breaks = Math.floor(h / 4) * 0.4;
  return h + breaks;
}

/** Road time a→b: real road-network routing when cached, else the estimate model. */
function roadLeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }, slow = 1) {
  const c = cachedRoute(a, b);
  if (c) return { hours: realisticHours(c, slow), routed: true, km: c.km };
  return { hours: roadHours(km(a, b), slow), routed: false, km: Math.round(km(a, b) * ROAD_DETOUR) };
}

const TRAIN_KMPH = 70;
const round = (h: number) => Math.round(h * 4) / 4;

function nearestAirportCity(o: OriginCity, cities: OriginCity[]): OriginCity {
  if (o.hasAirport || !cities.length) return o;
  return cities.filter((c) => c.hasAirport).sort((a, b) => km(o, a) - km(o, b))[0];
}

export function estimateTravel(origin: OriginCity, d: Destination, opts: { allowFlights?: boolean; cities?: OriginCity[] } = {}): TravelEstimate {
  const allowFlights = opts.allowFlights ?? true;
  const straight = km(origin, d);
  const options: Leg[] = [];

  // 1) Road — always an option
  const road = roadLeg(origin, d, d.roadFactor);
  options.push({ mode: 'road', hours: round(road.hours), note: `${road.km.toLocaleString('en-IN')} km · self-drive / cab / bus`, routed: road.routed });

  // 2) Train + last mile (only worth it for longer trips)
  if (d.railhead) {
    const toRail = km(origin, d.railhead);
    if (toRail > 180) {
      const last = roadLeg(d.railhead, d, d.roadFactor);
      const lastLeg = last.hours;
      const h = (toRail * 1.2) / TRAIN_KMPH + 0.75 + lastLeg;
      options.push({ mode: 'train', hours: round(h), note: `train to ${d.railhead.name}, then ${Math.round(lastLeg * 2) / 2}h by road`, routed: last.routed });
    }
  }

  // 3) Flight + last mile
  if (d.airport && allowFlights) {
    const from = nearestAirportCity(origin, opts.cities ?? []);
    const toAirportCity = from.slug === origin.slug ? 0 : roadLeg(origin, from).hours;
    const air = km(from, d.airport as Hub);
    if (air > 450) {
      const layover = air > 1200 ? 1.5 : 0; // long hops to small regional airports usually mean a connection
      const last = roadLeg(d.airport, d, d.roadFactor);
      const lastLeg = last.hours;
      const h = toAirportCity + 2.5 + air / 650 + layover + lastLeg;
      options.push({
        mode: 'flight',
        hours: round(h),
        note: `fly ${from.name} → ${d.airport.name.split(',')[0]}${layover ? ' (likely 1 stop)' : ''}, then ${Math.round(lastLeg * 2) / 2}h by road`,
        routed: last.routed,
      });
    }
  }

  options.sort((a, b) => a.hours - b.hours);
  return { fastest: options[0], options, straightLineKm: Math.round(straight) };
}

/** how many trip-days one-way travel eats */
export function travelDays(hours: number) {
  if (hours <= 4) return 0.25;
  if (hours <= 8) return 0.5;
  if (hours <= 14) return 1;
  if (hours <= 24) return 1.5;
  return 2;
}
