'use client';
import { startTransition, useActionState } from 'react';
import { submitLead, type FormState } from '@/app/actions/public';
import { Consent, FieldBox, Honeypot, inputCls } from './forms';

type Kind = 'enquiry' | 'newsletter' | 'partner' | 'event';
type EventCtx = { slug: string; name: string; dates: string; past?: boolean };
type PlaceOpt = { slug: string; name: string };

export function LeadForm({ kind, source, places = [], defaultPlace, compact = false, event }: {
  kind: Kind; source: string; places?: PlaceOpt[]; defaultPlace?: string; compact?: boolean; event?: EventCtx;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitLead, {});
  const e = state.errors ?? {};

  if (state.ok) {
    return (
      <div className={`${kind === 'newsletter' ? '' : 'card p-8'} text-center`} role="status">
        <p className="text-3xl">✓</p>
        <p className="mt-2 text-xl font-semibold">{state.message}</p>
      </div>
    );
  }

  if (kind === 'event' && event) {
    return (
      <form onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); startTransition(() => action(fd)); }} className="relative space-y-3">
        <Honeypot />
        <input type="hidden" name="kind" value="event" />
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="eventSlug" value={event.slug} />
        <input type="hidden" name="eventName" value={event.name} />
        <input type="hidden" name="eventDates" value={event.dates} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="phone" type="tel" placeholder="WhatsApp number" className={inputCls(e.phone)} aria-label="WhatsApp number" />
          <input name="email" type="email" placeholder="or email" className={inputCls(e.email)} aria-label="Email" />
          <input name="from" placeholder="Leaving from (city)" className="field" aria-label="Leaving from" />
          <select name="wants" className="field" aria-label="What do you want" defaultValue={event.past ? 'Next edition dates' : 'Trip plan + stays'}>
            <option>Trip plan + stays</option><option>Join a group trip</option><option>Just date reminders</option><option>Next edition dates</option>
          </select>
        </div>
        <Consent error={e.consent} text="Send me updates about this event on WhatsApp/email." />
        {(e.email || e.phone || (state.message && !state.ok)) && <p className="text-xs text-[#d70015]">{e.email || e.phone || state.message}</p>}
        <button className="btn" disabled={pending}>{pending ? 'Saving…' : event.past ? 'Alert me for next year' : 'Alert me'}</button>
      </form>
    );
  }

  if (kind === 'newsletter') {
    return (
      <form onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); startTransition(() => action(fd)); }} className="relative">
        <Honeypot />
        <input type="hidden" name="kind" value="newsletter" />
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="consent" value="on" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input name="email" type="email" placeholder="Email" className={inputCls(e.email)} aria-label="Email" />
          <input name="phone" type="tel" placeholder="or WhatsApp number" className={inputCls(e.phone)} aria-label="WhatsApp number" />
          <button className="btn shrink-0" disabled={pending}>{pending ? 'Joining…' : 'Get the drops'}</button>
        </div>
        {(e.email || e.phone || (state.message && !state.ok)) && <p className="mt-2 text-xs text-[#d70015]">{e.email || e.phone || state.message}</p>}
        <p className="mt-2 text-xs text-faint">One email or WhatsApp a month with new hidden spots and trip drops. Unsubscribe anytime.</p>
      </form>
    );
  }

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); startTransition(() => action(fd)); }} className={`relative ${compact ? 'space-y-4' : 'card space-y-5 p-6 sm:p-8'}`} noValidate>
      <Honeypot />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="source" value={source} />
      {state.message && !state.ok && <p className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#b3261e]">{state.message}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldBox label="Your name" error={e.name}><input name="name" autoComplete="name" className={inputCls(e.name)} /></FieldBox>
        <FieldBox label="Mobile / WhatsApp" error={e.phone}><input name="phone" type="tel" autoComplete="tel" placeholder="98xxxxxx10" className={inputCls(e.phone)} /></FieldBox>
      </div>
      <FieldBox label="Email (optional)" error={e.email}><input name="email" type="email" autoComplete="email" className={inputCls(e.email)} /></FieldBox>

      {kind === 'enquiry' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldBox label="Where to?">
              <select name="place" defaultValue={defaultPlace ?? ''} className="field">
                <option value="">Not sure — suggest something</option>
                {places.map((p) => <option key={p.slug} value={p.name}>{p.name}</option>)}
              </select>
            </FieldBox>
            <FieldBox label="Leaving from"><input name="from" placeholder="Delhi" className="field" /></FieldBox>
            <FieldBox label="When?"><input name="when" placeholder="e.g. mid-Nov, Diwali weekend" className="field" /></FieldBox>
            <FieldBox label="How many days?"><input name="days" type="number" min={1} max={30} placeholder="4" className="field" /></FieldBox>
            <FieldBox label="Group size"><input name="groupSize" type="number" min={1} max={50} placeholder="2" className="field" /></FieldBox>
            <FieldBox label="Budget per person">
              <select name="budget" className="field" defaultValue="">
                <option value="">Flexible</option><option>Under ₹10k</option><option>₹10k–25k</option><option>₹25k–50k</option><option>₹50k+</option>
              </select>
            </FieldBox>
          </div>
          {!compact && (
            <FieldBox label="Anything else?"><textarea name="message" rows={3} placeholder="Vibe, must-dos, dietary needs, travelling with parents…" className="field" /></FieldBox>
          )}
        </>
      )}

      {kind === 'partner' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldBox label="Property / business name" error={e.business}><input name="business" className={inputCls(e.business)} /></FieldBox>
            <FieldBox label="You are a…">
              <select name="partnerType" className="field">
                <option>Homestay</option><option>Camp / glamping</option><option>Cottage / small hotel</option><option>Hostel</option>
                <option>Local guide</option><option>Driver / transport</option><option>Trek / activity operator</option>
              </select>
            </FieldBox>
            <FieldBox label="Location"><input name="location" placeholder="Village, district, state" className="field" /></FieldBox>
            <FieldBox label="Rooms / group capacity"><input name="capacity" placeholder="e.g. 4 rooms, 12 guests" className="field" /></FieldBox>
          </div>
          <FieldBox label="Instagram / website / Google Maps link"><input name="link" className="field" /></FieldBox>
          <FieldBox label="Tell us about your place"><textarea name="message" rows={3} className="field" /></FieldBox>
        </>
      )}

      <Consent error={e.consent} />
      <button className="btn w-full sm:w-auto" disabled={pending}>
        {pending ? 'Sending…' : kind === 'partner' ? 'Apply to list' : 'Get my trip ideas'}
      </button>
    </form>
  );
}
