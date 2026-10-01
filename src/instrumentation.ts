/**
 * Runs once when the server boots. Warms the road-time cache in the background
 * (and re-checks daily) so travel times come from real road routing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  const routes = () => import('./lib/routing').then((m) => m.refreshRoutesInBackground()).catch(() => {});
  // spots: only places that are missing/stale get fetched, so checking every 2h is cheap and retries failures
  const spots = () => import('./lib/places').then((m) => m.refreshSpotsInBackground()).catch(() => {})
    .then(() => new Promise((r) => setTimeout(r, 5 * 60_000))) // let place spots finish first
    .then(() => import('./lib/gems')).then((m) => m.refreshGemsInBackground()).catch(() => {});
  setTimeout(routes, 20_000); // let the server settle / healthcheck pass first
  const rates = () => import('./lib/rates').then((m) => m.refreshRatesInBackground()).catch(() => {});
  setTimeout(spots, 30_000);
  setTimeout(rates, 45_000);
  setInterval(rates, 6 * 3600 * 1000).unref?.(); // only places older than 7 days (or failed) are re-fetched
  setInterval(routes, 24 * 3600 * 1000).unref?.();
  setInterval(spots, 2 * 3600 * 1000).unref?.();
}
