'use client';
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { captureDropoff, checkStay, createBooking, type FormState } from '@/app/actions/public';
import { Consent, FieldBox, Honeypot, inputCls } from './forms';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const addDays = (s: string, n: number) => new Date(new Date(`${s}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

type TripProps = { kind: 'trip'; id: string; title: string; dates: string; pricePerPerson: number; seatsLeft: number };
type StayProps = { kind: 'stay'; id: string; title: string; pricePerNight: number; maxGuestsPerRoom: number; totalRooms: number; today: string };
type CustomProps = { kind: 'custom'; places: { slug: string; name: string }[]; defaultPlace?: string; today: string; context?: { label: string; fields: Record<string, string> } };
export type CheckoutProps = (TripProps | StayProps | CustomProps) & { source: string };

export function Checkout(props: CheckoutProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(createBooking, {});
  const e = state.errors ?? {};
  const [step, setStep] = useState<1 | 2>(1);
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [stepErr, setStepErr] = useState<Record<string, string>>({});
  const [dropId, setDropId] = useState('');
  const [guests, setGuests] = useState(props.kind === 'trip' ? 1 : 2);

  // stay-only state
  const today = props.kind === 'trip' ? '' : props.today;
  const [checkIn, setCheckIn] = useState(today ? addDays(today, 7) : '');
  const [checkOut, setCheckOut] = useState(today ? addDays(today, 9) : '');
  const [rooms, setRooms] = useState(1);
  const [avail, setAvail] = useState<{ roomsLeft: number; nights: number } | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (props.kind !== 'stay') return;
    const id = ++reqId.current;
    setAvail(null);
    checkStay(props.id, checkIn, checkOut).then((r) => { if (id === reqId.current) setAvail(r); });
  }, [props, checkIn, checkOut]);

  // if the server bounced us back with contact errors, show step 1
  useEffect(() => { if (e.name || e.phone || e.email) setStep(1); }, [e.name, e.phone, e.email]);

  const total = useMemo(() => {
    if (props.kind === 'trip') return props.pricePerPerson * guests;
    if (props.kind === 'stay' && avail?.nights) return props.pricePerNight * rooms * avail.nights;
    return 0;
  }, [props, guests, rooms, avail]);

  const itemName = props.kind === 'custom' ? 'Custom trip' : props.title;

  async function next() {
    const err: Record<string, string> = {};
    if (!contact.name.trim()) err.name = 'Your name, please.';
    const digits = contact.phone.replace(/\D/g, '');
    if (digits.length < 10) err.phone = 'A valid mobile number is required.';
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email)) err.email = 'That email doesn’t look right.';
    setStepErr(err);
    if (Object.keys(err).length) return;
    setStep(2);
    // capture a drop-off lead so we can follow up if they don't finish
    const r = await captureDropoff({
      ...contact,
      item: props.kind === 'custom' ? 'custom' : props.id,
      itemName,
      dates: props.kind === 'trip' ? props.dates : undefined,
      source: props.source,
    }).catch(() => null);
    if (r?.ok) setDropId(r.leadId);
  }

  const ce = { ...stepErr, ...e };

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); startTransition(() => action(fd)); }} className="relative space-y-6" noValidate>
      <Honeypot />
      <input type="hidden" name="kind" value={props.kind} />
      <input type="hidden" name="source" value={props.source} />
      <input type="hidden" name="dropoffLeadId" value={dropId} />
      {props.kind === 'trip' && <input type="hidden" name="departureId" value={props.id} />}
      {props.kind === 'stay' && <input type="hidden" name="stayId" value={props.id} />}

      <ol className="flex gap-6 text-sm">
        {['Your details', props.kind === 'custom' ? 'Your trip' : 'Booking'].map((t, i) => (
          <li key={t} className={`flex items-center gap-2 ${step === i + 1 ? 'font-semibold text-ink' : 'text-faint'}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${step > i ? 'bg-blue text-white' : 'bg-line text-mute'}`}>{i + 1}</span>{t}
          </li>
        ))}
      </ol>

      {state.message && !state.ok && <p className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#b3261e]" role="alert">{state.message}</p>}

      {/* step 1 — kept mounted so the values submit */}
      <div className={step === 1 ? 'space-y-4' : 'hidden'}>
        <FieldBox label="Full name" error={ce.name}>
          <input name="name" autoComplete="name" value={contact.name} onChange={(ev) => setContact({ ...contact, name: ev.target.value })} className={inputCls(ce.name)} />
        </FieldBox>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldBox label="Mobile / WhatsApp" error={ce.phone}>
            <input name="phone" type="tel" autoComplete="tel" placeholder="98xxxxxx10" value={contact.phone} onChange={(ev) => setContact({ ...contact, phone: ev.target.value })} className={inputCls(ce.phone)} />
          </FieldBox>
          <FieldBox label="Email (optional)" error={ce.email}>
            <input name="email" type="email" autoComplete="email" value={contact.email} onChange={(ev) => setContact({ ...contact, email: ev.target.value })} className={inputCls(ce.email)} />
          </FieldBox>
        </div>
        <button type="button" className="btn" onClick={next}>Continue</button>
        <p className="text-xs text-faint">We’ll only use this to confirm your booking.</p>
      </div>

      {/* step 2 */}
      <div className={step === 2 ? 'space-y-5' : 'hidden'}>
        <button type="button" className="text-sm text-blue-link hover:underline" onClick={() => setStep(1)}>‹ {contact.name || 'Edit details'} · {contact.phone}</button>

        {props.kind === 'trip' && (
          <FieldBox label="Travellers" error={e.guests} hint={`${props.seatsLeft} seats left`}>
            <select name="guests" value={guests} onChange={(ev) => setGuests(Number(ev.target.value))} className={inputCls(e.guests)}>
              {Array.from({ length: Math.min(props.seatsLeft, 12) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'traveller' : 'travellers'}</option>)}
            </select>
          </FieldBox>
        )}

        {props.kind === 'stay' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBox label="Check-in" error={e.checkIn}>
                <input type="date" name="checkIn" min={props.today} value={checkIn} onChange={(ev) => { setCheckIn(ev.target.value); if (ev.target.value >= checkOut) setCheckOut(addDays(ev.target.value, 1)); }} className={inputCls(e.checkIn)} />
              </FieldBox>
              <FieldBox label="Check-out" error={e.checkOut}>
                <input type="date" name="checkOut" min={checkIn ? addDays(checkIn, 1) : props.today} value={checkOut} onChange={(ev) => setCheckOut(ev.target.value)} className={inputCls(e.checkOut)} />
              </FieldBox>
              <FieldBox label="Rooms" error={e.rooms}>
                <select name="rooms" value={rooms} onChange={(ev) => setRooms(Number(ev.target.value))} className={inputCls(e.rooms)}>
                  {Array.from({ length: props.totalRooms }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'room' : 'rooms'}</option>)}
                </select>
              </FieldBox>
              <FieldBox label="Guests" error={e.guests} hint={`Up to ${props.maxGuestsPerRoom} per room`}>
                <input type="number" name="guests" min={1} max={rooms * props.maxGuestsPerRoom} value={guests} onChange={(ev) => setGuests(Number(ev.target.value))} className={inputCls(e.guests)} />
              </FieldBox>
            </div>
            <p className={`rounded-xl px-4 py-3 text-sm ${!avail ? 'bg-paper text-mute' : avail.roomsLeft >= rooms ? 'bg-[#e9f7ee] text-good' : 'bg-[#fff0ed] text-[#b3261e]'}`} aria-live="polite">
              {!avail ? 'Checking availability…'
                : avail.nights < 1 ? 'Pick valid dates.'
                : avail.roomsLeft >= rooms ? `Available · ${avail.roomsLeft} room${avail.roomsLeft > 1 ? 's' : ''} free for ${avail.nights} night${avail.nights > 1 ? 's' : ''}`
                : avail.roomsLeft ? `Only ${avail.roomsLeft} room${avail.roomsLeft > 1 ? 's' : ''} free for these dates`
                : 'Fully booked for these dates — try others.'}
            </p>
          </>
        )}

        {props.kind === 'custom' && (
          <>
            {props.context && (
              <p className="rounded-xl bg-blue-soft px-4 py-3 text-[15px] font-medium text-blue-link">{props.context.label}</p>
            )}
            {props.context && Object.entries(props.context.fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBox label="Where to?" error={e.destSlug}>
                <select name="destSlug" defaultValue={props.defaultPlace ?? ''} className={inputCls(e.destSlug)}>
                  <option value="">Somewhere else / not sure</option>
                  {props.places.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                </select>
              </FieldBox>
              <FieldBox label="Or describe it"><input name="placeText" placeholder="e.g. somewhere snowy in the northeast" className="field" /></FieldBox>
              <FieldBox label="From" error={e.checkIn}><input type="date" name="checkIn" min={props.today} className={inputCls(e.checkIn)} /></FieldBox>
              <FieldBox label="To"><input type="date" name="checkOut" min={props.today} className="field" /></FieldBox>
            </div>
            <FieldBox label="Dates not fixed? Tell us roughly when"><input name="flexibleWhen" placeholder="e.g. any 5 days in December" className="field" /></FieldBox>
            <div className="grid gap-4 sm:grid-cols-3">
              <FieldBox label="Travellers" error={e.guests}><input type="number" name="guests" min={1} max={30} value={guests} onChange={(ev) => setGuests(Number(ev.target.value))} className={inputCls(e.guests)} /></FieldBox>
              <FieldBox label="Starting from"><input name="from" placeholder="Delhi" className="field" /></FieldBox>
              <FieldBox label="Who’s going">
                <select name="crew" className="field"><option>Solo</option><option>Couple</option><option>Friends</option><option>Family</option></select>
              </FieldBox>
              <FieldBox label="Budget per person">
                <select name="budget" className="field" defaultValue=""><option value="">Flexible</option><option>Under ₹10k</option><option>₹10k–25k</option><option>₹25k–50k</option><option>₹50k+</option></select>
              </FieldBox>
              <FieldBox label="Stay style">
                <select name="stayStyle" className="field"><option>Homestays</option><option>Camps</option><option>Boutique</option><option>Mix it up</option></select>
              </FieldBox>
              <FieldBox label="Into"><input name="interests" placeholder="treks, food, photography…" className="field" /></FieldBox>
            </div>
          </>
        )}

        <FieldBox label="Notes for us (optional)"><textarea name="notes" rows={3} placeholder="Dietary needs, pickup point, celebrating something…" className="field" /></FieldBox>

        {props.kind !== 'custom' && (
          <div className="rounded-2xl bg-paper p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-mute">Estimated total</span>
              <span className="text-2xl font-semibold">{total ? inr(total) : '—'}</span>
            </div>
            <p className="mt-1 text-xs text-faint">
              {props.kind === 'trip' ? `${inr(props.pricePerPerson)} × ${guests}` : avail?.nights ? `${inr(props.pricePerNight)} × ${rooms} room${rooms > 1 ? 's' : ''} × ${avail.nights} night${avail.nights > 1 ? 's' : ''}` : ''}
              {' · '}Nothing to pay now. We confirm availability and send a payment link.
            </p>
          </div>
        )}

        <Consent error={e.consent} text="I agree to be contacted on phone/WhatsApp/email about this booking, and to the cancellation terms shared at confirmation." />
        <button className="btn w-full sm:w-auto" disabled={pending || (props.kind === 'stay' && (!avail || avail.roomsLeft < rooms))}>
          {pending ? 'Reserving…' : props.kind === 'custom' ? 'Send my trip request' : 'Reserve now — pay later'}
        </button>
      </div>
    </form>
  );
}
