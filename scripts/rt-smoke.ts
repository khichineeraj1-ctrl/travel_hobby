import { readDb } from '../src/lib/db';
import { legs, totals } from '../src/lib/roadtrips';
import { upcomingEvents, recentPastEvents, countdown } from '../src/lib/events';
const db = readDb();
for (const t of db.roadTrips) { const x = totals(t); console.log(t.slug.padEnd(34), x.km+'km', x.driveHours+'h', x.days+'d', 'longest', x.longestDay+'h'); }
console.log(legs(db.roadTrips[0]));
console.log('upcoming', upcomingEvents(db, 90).map(e=>`${e.name} ${countdown(e)}`));
console.log('past', recentPastEvents(db).map(e=>`${e.name} ${countdown(e)}`));
