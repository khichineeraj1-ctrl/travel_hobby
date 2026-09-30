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
