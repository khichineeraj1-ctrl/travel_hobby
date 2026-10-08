# Beyond Explored — content guide for SEO + GEO (AI search)

Source: Neeraj's notes from Google Search Central Live Deep Dive, Barcelona (shared Oct 2026). Use this for every page we write.

## How people search now
- AI Mode searches are about 3× longer than classic Google searches. There are about 2.5 billion monthly AI Overview users and about 1 billion AI Mode users, and AI Mode queries are doubling every quarter. Classic Google search has about 5 billion monthly users.
- Questions that start with **"where should I…?"**, **"which…?"** and **"ideas for…"** are growing, especially in AI search.
- People research ideas in AI tools first, then use Google to check them.
- "Good SEO is good GEO." Discover and AI search use normal crawling and indexing, so they have no special requirements.
- The new buzzword is UEO, user experience optimisation. In practice: write for the person, not the algorithm.

## Google's 4 quality pillars
1. **Effort**: real work went into the page, such as our own trip, photos, and facts checked against official sources.
2. **Originality**: things nobody else says, such as first-hand observations and opinions.
3. **Talent & skill**: well written in a confident, senior travel-writer voice, and easy to scan.
4. **Accuracy**: dates and facts checked, sources linked, and a "facts checked on" date.

Content should be people-first and show unique expertise and experience.

## Page checklist (what we do on every article/field note)
- [ ] **Question-led H2s** that match real queries ("Which Corbett zones are open — and when?", "Where should I eat in Ramnagar?", "Ideas for a spare day near …"). A blogger-style line goes above each as a kicker.
- [ ] **Answer-first "Quick answers" box** under the intro: 4–6 Q→A pairs, each a direct, quotable answer.
- [ ] **FAQ section** with 6–10 full-sentence answers, also output as FAQPage schema. The visible text must match the schema.
- [ ] **Byline + experience**: author picked from Admin → Authors (links to /authors/<slug> profile with bio, expertise, places visited, editorial standards, sameAs links), plus "visited <month year>" and "facts checked <date>".
- [ ] **"How we wrote this" line** with links to the official sources.
- [ ] **Our own photos** only. No children's faces and no number plates, and location data is stripped from the files.
- [ ] **Large cover image**: 16:9, at least 1200px wide (about 300k+ pixels). It is used for og:image and Discover.
- [ ] **Robots** set to `max-image-preview:large` and `max-snippet:-1`, both on site-wide now.
- [ ] **Schema**: Article (Person author, datePublished/dateModified, image), FAQPage, and BreadcrumbList.
- [ ] **Never invent experiences.** Only use what we saw or did. Mark anything unverified "confirm on official site".
- [ ] Add the page to `/llms.txt`, the sitemap, and search (catalog keywords).

## Voice
A senior travel blogger: confident, sensory, opinionated, and practical. Write "we" for first-hand experience. Short paragraphs. Give one honest "here's the catch" per section, and end sections with what to do next.

## Still to do (outside the code)
- Set up the Search profile in Search Console / Google for publishers and creators, to shape how we appear in search and to highlight content.

## Guest writers (contributor studio)
- Writers join with an **invite link** (Admin → Contributors) or by **applying** at /contribute and being approved. Sign-in is with Google.
- They write in **/studio**. The editor enforces this guide as a live checklist: question headings, quick answers, FAQ, own photos with alt text, 400+ words, a bio on their author profile, and the photo promise.
- Photos are auto-rotated, resized and **stripped of EXIF/GPS** on upload. Covers are cropped to 1600×900 (16:9).
- Nothing goes live without review: Admin → **Field notes** → Preview / Edit / Send back with comments / Publish. Use "Mark facts checked today" when you re-verify a live note.
