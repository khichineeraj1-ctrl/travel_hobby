import { NextResponse } from 'next/server';
import { ask, assistantEnabled, overDailyLimit, type Turn } from '@/lib/assistant';
import { rateLimited } from '@/lib/booking';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!assistantEnabled()) return NextResponse.json({ error: 'off' }, { status: 404 });
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || 'local').trim();
  if (rateLimited(`ask:${ip}`, 25, 10 * 60 * 1000)) {
    return NextResponse.json({ text: 'You’re on a roll! Give me a minute to catch my breath, then ask again.', cards: [] }, { status: 429 });
  }
  if (overDailyLimit()) {
    return NextResponse.json({ text: 'I’ve talked a lot today and need a nap. Try the trip planner, or leave your number and a human will help.', cards: [{ kind: 'plan', title: 'Plan my trip', sub: 'Match in 10 seconds', href: '/plan-my-trip' }] });
  }
  let body: { messages?: Turn[]; source?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }))
    .slice(-10);
  if (!history.length || history[history.length - 1].role !== 'user') return NextResponse.json({ error: 'ask something' }, { status: 400 });
  while (history[0]?.role === 'assistant') history.shift(); // API wants the first turn from the user
  try {
    const r = await ask(history, `voice assistant · ${String(body.source ?? '').slice(0, 120)}`);
    return NextResponse.json(r);
  } catch (e) {
    console.error('[assistant]', (e as Error).message);
    return NextResponse.json({ text: 'My brain glitched for a sec. Try again — or use the planner meanwhile.', cards: [{ kind: 'plan', title: 'Plan my trip', sub: 'Match in 10 seconds', href: '/plan-my-trip' }] });
  }
}
