/**
 * Runs once when the server boots. Warms the road-time cache in the background
 * (and re-checks daily) so travel times come from real road routing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  const run = () =>
    import('./lib/routing')
      .then((m) => m.refreshRoutesInBackground())
      .catch(() => {})
      .then(() => import('./lib/places'))
      .then((m) => m.refreshSpotsInBackground())
      .catch(() => {});
  setTimeout(run, 20_000); // let the server settle / healthcheck pass first
  setInterval(run, 24 * 3600 * 1000).unref?.();
}
