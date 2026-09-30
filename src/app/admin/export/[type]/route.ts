import { isAdmin } from '@/lib/auth';
import { readDb } from '@/lib/db';

const esc = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: Record<string, unknown>[]) => {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
};

export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 });
  const { type } = await params;
  const db = readDb();
  let rows: Record<string, unknown>[];
  if (type === 'bookings') {
    rows = db.bookings.map((b) => ({
      ref: b.id, created: b.createdAt, status: b.status, type: b.kind, name: b.contact.name, phone: b.contact.phone, email: b.contact.email,
      place: b.destSlug, trip: b.departureId, stay: b.stayId, check_in: b.checkIn, check_out: b.checkOut, guests: b.guests, rooms: b.rooms,
      total_inr: b.total, notes: b.notes, admin_notes: b.adminNotes, ...Object.fromEntries(Object.entries(b.details).map(([k, v]) => [`q_${k}`, v])),
    }));
  } else if (type === 'leads') {
    rows = db.leads.map((l) => ({
      id: l.id, created: l.createdAt, type: l.kind, status: l.status, name: l.name, phone: l.phone, email: l.email, source: l.source,
      booking: l.bookingId, admin_notes: l.adminNotes, ...Object.fromEntries(Object.entries(l.data).map(([k, v]) => [`q_${k}`, v])),
    }));
  } else return new Response('Not found', { status: 404 });

  // BOM so Excel opens ₹ and non-ASCII names correctly
  return new Response('﻿' + csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bhatko-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
