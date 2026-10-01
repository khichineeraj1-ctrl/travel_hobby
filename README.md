# bhatko — get lost, on purpose

Offbeat-India discovery + impromptu trip engine for Gen Z travellers.
Tell it your **days, starting city, crew, wallet and vibe**. It returns less-travelled places ranked by *whether the trip actually works for you*: real door-to-door travel time, hours you'll get on the ground, season fit, live weather, and an honest "ick" list.

## How it's different from booking aggregators

| Aggregators | bhatko |
|---|---|
| Rank by commission / sponsored | Rank by trip fit (time, season, crew, budget, vibe) |
| Packages, deals, hotel funnels | No booking. Pure discovery |
| Distance in km | Door-to-door hours + **hours on the ground** |
| Glossy "top 10 hill stations" | Crowd meter (1–5), bias toward hidden gems |
| Only pros | **"the ick"**: permits, bad roads, no ATMs, AMS |
| Search box | Vibes ("touch grass", "no signal era", "broke but bored"…) + 🎲 "just send me somewhere" |

## Run it locally

**Easiest (Mac):** double-click `start.command`. First run installs dependencies, then opens http://localhost:3030.

**Terminal:**

```bash
npm install
npm run dev          # http://localhost:3030
```

- Admin: http://localhost:3030/admin. The password is `ADMIN_PASSWORD` in `.env.local` (see `.env.example`).
- Needs Node.js 18.18+ (LTS recommended).

## Deploy on Railway

Deploying needs one service and one volume. The content (`db.json`) and uploaded photos live on the volume, so they survive redeploys.

1. **New Project → Deploy from GitHub repo** → pick this repo. Railway reads `railway.json`: the build is `npm run build`, the start is `npm start` (listens on `$PORT`), and the healthcheck is `/api/health`.
2. **Add a volume** to the service with mount path **`/data`**.
3. **Variables** (Raw Editor → paste):
   ```
   BHATKO_DATA_DIR=/data
   ADMIN_PASSWORD=<strong password>
   ADMIN_SECRET=<long random string>
   EVENTS_INGEST_TOKEN=<long random string>
   # optional once you have a custom domain:
   # SITE_URL=https://bhatko.in
   ```
   Without `SITE_URL`, canonical URLs and the sitemap use Railway's domain (`RAILWAY_PUBLIC_DOMAIN`).
4. **Settings → Networking → Generate Domain**, or add your custom domain.
5. On first boot, the empty volume is seeded with the starter content. After that, the admin owns the data.

Notes:
- Keep **1 replica**. The JSON store is single-writer; move to Postgres before scaling out.
- Public pages render on request (`force-dynamic`), so edits and redeploys never show stale prerendered content.
- Back up the volume from time to time. Admin → Bookings/Leads → CSV export also works as a quick backup.

## Admin

| Section | What you can do |
|---|---|
| Overview | Counts, places missing photos, what's peaking this month, recent edits |
| Places | Search/filter, add, edit every field, upload a photo, publish/unpublish (drafts are hidden and 404 publicly), delete |
| Vibes | Add/edit/reorder/delete categories (emoji or an uploaded icon); order = order in the home rail |
| Starting cities | Add/edit/remove the cities used for travel times and `/from/<city>` pages |
| Site content | Announcement banner, hero headline + links, featured rail picks, planner labels, "Why bhatko" tiles, footer note |

- Content lives in `data/db.json`, photos in `data/uploads/` (served at `/media/<file>`). **Back up the `data/` folder.** The file is created from `src/data/*` seed files on first run.
- Saving in the admin revalidates the whole site, so changes show up immediately, even in production.
- Place URLs are fixed once created, to protect SEO. Unpublish instead of deleting when you can.
- Auth: a single password with a signed httpOnly cookie that lasts 7 days. For a team, swap `src/lib/auth.ts` for a proper auth provider.

## Booking engine & leads

Booking works on a **reserve now, pay later** basis. Nothing is charged online: you confirm availability, then send a payment link.

| Bookable | Traveller flow | Capacity rule |
|---|---|---|
| **Group trips** (`/trips`, place pages) | Pick travellers → reserve | `seatsTotal` minus travellers in non-cancelled bookings |
| **Stays** (place pages) | Pick dates, rooms, guests → live availability check → reserve | Rooms free on every night of the stay, so overlapping bookings are blocked |
| **Custom trips** (`/book/custom`) | Place, dates or "roughly when", group, budget, style | None (quote manually) |

- Checkout has 2 steps. As soon as step 1 (name + phone) is filled, a **booking drop-off lead** is saved. If the traveller finishes, that lead is marked *converted* automatically. If they don't, it sits in Admin → Leads, with a one-tap WhatsApp follow-up message.
- Capacity is re-checked at the moment of writing, so two people can't grab the last seat.
- Each booking gets a reference like `BK-7F3K9Q` and a private status page at `/booking/<ref>?key=<secret>`.
- Lead forms:
  - **Plan my trip** enquiry: on `/plan-my-trip` and on every place page.
  - **Newsletter**: in the footer.
  - **Partner signup**: on `/partners`.
- Spam protection: honeypot field, per-IP rate limit, phone and email validation, and an explicit consent checkbox that is unticked by default (India DPDP-friendly).
- Admin → **Bookings**:
  - Filter bookings and set the status (pending → confirmed → paid / cancelled).
  - Set a final price, add internal notes, and use WhatsApp/Call/Email buttons.
  - Export to CSV.
- Admin → **Leads**: tabs by type, a status for each lead (new → contacted → converted / closed), notes, and CSV export.
- Admin → **Group trips / Stays**:
  - Create and edit inventory, and upload stay photos.
  - See travellers booked on each trip, and a 30-night room-availability grid for each stay.
- The sidebar shows badges for pending bookings and new leads.
- To take payments later: add a Razorpay order in `createBooking` (`src/app/actions/public.ts`) and a webhook that flips the booking status to `paid`.

## Real road travel times

Road distances and times come from real road routing, cached in the DB:

- By default the site uses **OpenStreetMap routing** (the public OSRM server), which needs no key.
- If you set `ORS_API_KEY`, it uses **OpenRouteService** instead (free key at openrouteservice.org).
- `ROUTING_PROVIDER=off` turns routing off and falls back to the estimate model.

Pages never call the routing API. They read from the cache. The cache fills in the background: on server start, once a day, and whenever you save a place, city, event or road trip.

Admin → Overview shows how much of the cache is filled and has a "Fetch missing" button. There are about 800 routes, fetched in around 6 batched calls.

Routers assume empty roads at the speed limit, so times are adjusted: ×1.15 for traffic, extra time for hill roads (`roadFactor`), plus breaks. Flights and trains are still modelled, because there is no free, reliable API for them.

## Best spots nearby (Google Maps / OpenStreetMap)

Every place page gets a **Best spots around …** section, and `/spots` lists them all with filters (hidden gems, water, views, nature, heritage, in season now).

- **Google Maps (recommended):** set `GOOGLE_MAPS_API_KEY` in Railway (Google Cloud → enable *Places API (New)* → create an API key, restrict it to that API). Spots are ranked by rating × review count; defaults: rating ≥ 4.2, ≥ 30 reviews, within 35 km (change in *Site content → Best spots nearby*). "Hidden gem" = 4.5★+ with under 1,500 reviews. Two calls per place per refresh ≈ 64 calls/month for 32 places — well inside Google's free monthly usage.
- **Without a key:** free OpenStreetMap data (named viewpoints, waterfalls, lakes, forts, peaks), ranked by notability. No ratings.
- Refreshes on start-up, daily for anything older than 25 days (Google allows caching up to 30), and when you save a place. *Admin → Nearby spots* shows everything, lets you hide a spot, or re-fetch a place.
- `PLACES_PROVIDER=off|osm` to disable or force OSM.

## Explore & search (all content in one place)

- **`/explore`:** every full guide plus every all-India hidden gem, about 690 places in 36 states and UTs, in one list.
  - **Filters:** state, month, type (water / views / nature & treks / heritage / sacred), full guides vs hidden gems, sort. A "Good in <this month>" chip is built in.
  - **Plain-language search:** "waterfalls in Meghalaya in October", "forts in Rajasthan", "snow", "north east", "monsoon". It picks out the state, month and type from the text and matches the rest by name.
  - **SEO:** filtered URLs are noindexed; `/explore` itself is indexed.
- **Home page:**
  - a big search box with live suggestions (`/api/search`)
  - season-aware quick chips: this month, monsoon waterfalls Jul–Oct, snow Dec–Feb, and the in-season states with the most gems
  - a "Good right now" rail of in-season gems across India, rotating daily
- **Seasons:**
  - full guides use their own researched months
  - hidden gems use the usual tourism season for their state (`src/data/state-seasons.ts`, labelled on the site as such)
  - waterfalls use Jul–Oct

## All-India hidden gems (Google Places)

`/hidden-gems` and `/hidden-gems/<state>` cover all 36 states and UTs, not just our 32 places. The best 6 also show on each `/state/<state>` page, and the voice assistant can answer "hidden waterfalls in Kerala" from them.

- **Search:** each state gets 4 themed Google Text Searches: waterfalls & lakes; viewpoints, valleys & treks; forts & heritage; nature spots & villages.
- **What's kept:** places that are
  - really in that state (checked against the address)
  - rated ≥ 4.4★
  - 40–8,000 reviews (real, but not mainstream)
  - not hotels, food or shops
- **Ranking:** by a review-weighted rating, with at most 5 of any one type (so temples can't fill a list). Top 24 per state.
- **Refresh:** every 25 days, about 145 Text Search calls per run, inside Google's free monthly calls. *Admin → Nearby spots → All-India hidden gems* lets you re-fetch a state or hide any gem.
- **Data and SEO:** every gem is Google data with attribution; nothing is AI-written. State pages are noindexed until they have gems.

## Live stay prices & budget per day (LiteAPI)

Budgets come from real hotel rates, not scraping. [LiteAPI](https://liteapi.travel) (Nuitee) is a licensed hotel-rates API. Search and rate calls are free under a reasonable look-to-book ratio.

1. Sign up at liteapi.travel → dashboard → copy your **production** API key.
2. Railway → Variables → `LITEAPI_KEY=<key>`. A `sand_…` key works but its prices stay admin-only.

- For each place: 1-night rates (1 room, 2 adults, INR, taxes incl.) for stays within 25 km, on a weekday and a Saturday about 3 weeks out. Each property's cheapest room is kept, then min / 25th / median / 75th percentile.
- **Budget/day per person** = p25 room ÷ 2 + food & local travel low … p75 room ÷ 2 + food & local travel high. The food & local travel allowance is set in *Site content → Budget per day* (default ₹600–₹1,500) and is labelled an estimate on the site.
- It feeds every place card, place page (sidebar price box + FAQ), and the trip planner's budget matching.
- Places with fewer than 3 priced stays (remote treks) keep the hand-written budget, shown as "estimate".
- Refreshes weekly per place, retries failures every 6 h, and re-fetches when you save a place. See *Admin → Stay prices*.

## Ask Beyond — voice assistant

A mic ("Ask") button sits in the nav, in the on-screen guide and in the home hero. Visitors speak or type, for example *"somewhere cold and quiet in December, 3 days from Delhi"*. It answers out loud in 1–3 sentences and shows tappable cards for places, events and road trips, plus "See all matches".

- **Voice:** the browser's built-in speech recognition (en-IN) and speech output, free. Works in Chrome, Edge and Safari. Other browsers get text only.
- **Brain:** Claude, via `ANTHROPIC_API_KEY` in Railway. It uses the Messages API with tools that read **only our database**:
  - `search_places`, the same engine as the planner
  - `get_place`: facts, live prices, spots and events
  - `find_events`
  - `road_trips`
  - `save_lead`: a WhatsApp enquiry, saved only when the visitor gives their number and agrees
- **Model:** default `claude-haiku-4-5`, which is fast and cheap (roughly ₹0.5–1 a question). Set `ASSISTANT_MODEL` to change it.
- **Cost guards:**
  - 25 questions per visitor per 10 minutes
  - `ASSISTANT_DAILY_LIMIT` a day in total (default 400); after that it points to the planner
  - `ASSISTANT=off` disables it
- **Admin → Overview:** shows questions asked today and the latest questions (no personal data). Leads land in Leads marked "voice assistant".
- **Hidden:** with no key, the mic button doesn't appear anywhere.

## Road trips & events

**Road trips** (`/road-trips`, `/road-trips/<slug>`) are multi-stop routes. Each page has:

- a self-drawn SVG route map (no map API needed)
- a day-by-day plan with the km and hours for each leg
- the total distance, driving time and longest day
- fuel gaps, permits and best months
- an "Open in Google Maps" link with the stops as waypoints
- events on or near the route
- a "Plan it with us" link, which opens a custom booking with the road trip pre-filled

There are 8 starter routes: Manali–Leh–Turtuk, the Spiti circuit, Zanskar via Shinku La, the Konkan coast, Tawang via Sela, Kumaon, Kutch and Sikkim's Silk Route.

For mountain roads, drive time grows with terrain (`roadFactor`), and you can override the factor for a single leg (`legFactor`, e.g. for a stretch of plains driving into the hills).

**Events** (`/events`, `/events/<slug>`) are festivals, music, monastery dances and seasonal events, each with dates, a source link and how to reach them from every city. Events trigger travel in five places:

- **Home page:** a "Happening soon" rail, and a "Just missed" strip for events that ended in the last 30 days (e.g. Zanskar Festival, 15–16 Sep 2026).
- **Place pages:** "Happening in & around …" (the linked place, or anything within 100 km).
- **Planner:** +6 points and a 🎉 reason when an event falls in the month the traveller picks, at or near the place.
- **Event page:**
  - A countdown, and trips and stays that overlap the event dates.
  - A "Plan my trip for this" button, which opens a custom booking with the event pre-filled.
  - **Alert me** sign-ups, saved as "Event alert" leads.
- **Past events:** a "You just missed it" message that points to the next edition and back to the place, plus "Alert me for next year".

In Admin → **Events**, open any event to see everyone waiting for alerts, each with a one-tap WhatsApp message already written.

**Picking up new events automatically:**

1. Set `EVENTS_INGEST_TOKEN` in `.env.local`.
2. POST event JSON to `/api/events/ingest` with `Authorization: Bearer <token>`. Admin → Events → Import also accepts pasted JSON.
3. Incoming events land in **Suggested**. Approve or dismiss each one; nothing goes live on its own.
4. Duplicates (same name and year) are skipped, and events with coordinates outside India are rejected.

Events whose dates follow the usual pattern but haven't been announced are marked **expected**. Re-check them before promoting.

## Design

The design is Apple-inspired:

- **Type:** the system SF Pro stack (`-apple-system, SF Pro Display/Text`). It renders as SF Pro on Mac and iOS and falls back to Helvetica/Arial elsewhere.
- **Colours:** `#f5f5f7` background, `#1d1d1f` text, `#6e6e73` secondary text.
- **CTAs:** `#0071e3` pill buttons and `#0066cc` text links.
- **Layout:** 18px rounded tiles with soft shadows, a translucent 44px global nav, the announcement ribbon, and horizontal rails with round arrow buttons.
- **Tokens:** defined in `tailwind.config.ts` and `src/app/globals.css` (`.btn`, `.btn-secondary`, `.link-arrow`, `.card`, `.chip`, `.headline`).

No Apple logos or assets are used. The brand is the `bhatko` wordmark.

## Stack

- Next.js 15 (App Router, RSC), React 19, TypeScript, Tailwind 3
- Data: JSON file store (`data/db.json`, via `src/lib/db.ts`) behind a repository layer (`src/lib/repo.ts`), so moving to Postgres/Neon means reimplementing two functions
- Weather: [Open-Meteo](https://open-meteo.com) (free, no key), cached 30 min
- No paid APIs, no database required to run

```bash
WEATHER_MOCK=1 npm run dev   # offline weather demo data
npm run build && npm start   # production mode
npm run test:engine          # prints engine rankings + travel times for sanity checks
```

Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) for canonical URLs and the sitemap.

**Deploying:** the JSON store needs a persistent disk, so use a VPS, Railway or Render with a volume mounted at `data/`. On serverless hosts like Vercel, move `db.ts` to Postgres and uploads to object storage first.

## SEO URL structure

All place, city, vibe, month, crew and state pages are **statically generated**, with ISR (hourly, plus instant revalidation on every admin save). Places added in the admin work without a rebuild, and unknown or draft slugs return a 404.

| URL | Targets queries like |
|---|---|
| `/places/ziro-valley-arunachal-pradesh` | "ziro valley best time to visit", "how to reach ziro" |
| `/from/delhi` | "offbeat weekend getaways from delhi" |
| `/when/october` | "offbeat places to visit in october" |
| `/vibe/digital-detox` | "digital detox places in india" |
| `/for/solo` | "offbeat places for solo travellers india" |
| `/state/himachal-pradesh` | "offbeat places in himachal" |

- Slugs follow `<place>-<state>`: lowercase and hyphenated. **Never rename a slug.** Add a redirect in `next.config.mjs` instead (`/place/*` and `/destinations/*` already 301 to `/places/*`).
- Each page has a canonical URL, Open Graph and Twitter tags, and JSON-LD: `TouristDestination` + `FAQPage` on place pages, `ItemList` on listings, `BreadcrumbList` everywhere, and `WebSite` site-wide.
- Place pages answer the high-intent questions as H2s: best time to visit, weather right now, how to reach (travel-time table for 17 cities), solo or family, and FAQ.
- The `/plan` (personalised) and `/roll` pages are `noindex` and disallowed in robots, which avoids infinite URL combinations.
- The "from your city" personalisation on place pages runs client-side (`FromBanner`), so the page itself stays static and cacheable.
- `sitemap.xml` and `robots.txt` are generated automatically.

## Suggestion engine (`src/lib/engine.ts`)

Each score is out of 100:

| Factor | Points | Logic |
|---|---|---|
| Time fit | 30 | On-ground days vs the place's ideal (18) + a low share of the trip spent in transit (12) |
| Season | 25 | Best month 25, OK month 14, skip month 0 + a warning explaining why |
| Crew | 15 | Per-place fit for solo / duo / squad / fam (1–5). Also warns about altitude for families |
| Vibe | 15 | Overlap with the selected vibes |
| Budget | 10 | Per-day spend vs the place's range. Flights add about ₹9k return spread over the trip; under ₹1.8k/day flights aren't assumed at all |
| Hidden gem | 5 | Fewer crowds, more points |

Hard filters: not enough days on the ground, and the optional "basically nobody's heard of it" crowd cap.
`roll()` makes a weighted-random pick from the top 5. That powers impromptu mode.

## Travel time (`src/lib/travel.ts`)

This is an estimate, not a routing API. It uses:

- Great-circle distance with detour factors.
- Terrain slowdown on the last 150 km (`roadFactor` per place).
- Train to the nearest railhead + a road last leg.
- Flight = airport overhead + air time + a likely connection for long hops to regional airports + a road last leg.

For precision, swap `roadHours()` for OSRM or the Google Distance Matrix.

## APIs

- `GET /api/suggest?from=delhi&days=3&budget=2000&crew=solo&month=10&vibes=touch-grass,soft-life&maxCrowd=2` returns ranked results.
- `GET /api/suggest?...&roll=1` returns a single impromptu pick.
- `GET /api/weather/:slug` returns live weather, a 5-day forecast and a one-line verdict.
- `GET /api/places` returns the catalogue (for a map or mobile app later).

## Content ops (before launch)

- There are 32 seed destinations and 17 origin cities. **Re-verify permits, road status, months and signal** with local sources before going live.
- To add a place, use Admin → Places → Add a place. All listing pages, the sitemap and the engine pick it up automatically.
- Next steps: real photography (UGC, credited), user "been there" check-ins to keep the crowd meter live, a map view, shareable trip cards (OG images), and moving the catalogue to Postgres (Neon) or a CMS.
