/** Overpass QL for "things worth a detour" around a point. Shared by the server fetcher and the admin's in-browser fetcher. */
export const OVERPASS_MIRRORS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export function osmQuery(p: { lat: number; lng: number }, radiusKm: number) {
  // a bounding box is far faster on Overpass than around:… (which times out on lakes/park polygons)
  const rk = Math.min(radiusKm, 40);
  const dLat = rk / 111, dLng = rk / (111 * Math.cos((p.lat * Math.PI) / 180));
  const bb = [p.lat - dLat, p.lng - dLng, p.lat + dLat, p.lng + dLng].map((n) => n.toFixed(4)).join(',');
  return `[out:json][timeout:60][bbox:${bb}];(
    nwr["tourism"~"^(viewpoint|attraction|museum)$"]["name"];
    node["natural"~"^(peak|waterfall|glacier|hot_spring|cave_entrance|beach)$"]["name"];
    nwr["water"="lake"]["name"];
    nwr["historic"~"^(fort|castle|ruins|archaeological_site|monument)$"]["name"];
    wr["leisure"="nature_reserve"]["name"];
    wr["boundary"="national_park"]["name"];
    nwr["amenity"="place_of_worship"]["name"]["wikidata"];
  );out center tags 300;`;
}
