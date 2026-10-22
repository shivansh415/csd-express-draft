'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

const CONTENTS = [
  'General goods', 'Electronics and appliances', 'Apparel and textiles', 'Auto parts', 'FMCG and groceries',
  'Pharma and healthcare', 'Furniture and home', 'Machinery and industrial', 'Documents and printed matter', 'Others, please specify',
];
const OTHER = CONTENTS[CONTENTS.length - 1];
const SLOTS = ['09:00 to 12:00', '12:00 to 16:00', '16:00 to 19:00'];
const STEPS = ['Package', 'Pickup', 'Delivery', 'Schedule'];
const CUTOFF = 17; // same-day pickups close at 5 pm so the cargo still makes the night truck
const EWAY = 50000; // GST e-way bill threshold
const NAME = "[A-Za-z][A-Za-z .']{2,49}";
const MOBILE = '[6-9][0-9]{9}';
const PIN = '[1-9][0-9]{5}';

type Data = Record<string, string>;

function pickupDays() {
  const now = new Date();
  return [0, 1, 2].map((n) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
    const date = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    return { value: date, top: n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'long' }), sub: date.replace(/^\w+,?\s/, ''), off: n === 0 && now.getHours() >= CUTOFF };
  });
}

const num = (v: FormDataEntryValue | string | undefined) => Number(v) || 0;
const kg = (n: number) => `${Math.round(n * 10) / 10} kg`;

/* Book-a-pickup steps shown in place of the live-route panel: the same details Delhivery's booking flow asks for
   (package contents, declared value, size and weight, pickup and delivery contacts, pickup day), in CSD's panel.
   TODO: no booking API yet, so the last step opens WhatsApp with the request written out for the dispatch desk. */
export default function PickupSteps({ route, load, whatsapp }: { route: string; load: string; whatsapp: string }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Data>({ count: '1' });
  const [days] = useState(pickupDays);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const moved = useRef(false);

  // after Next/Back, move focus to the first field of the new step (not on first open: the tab keeps focus)
  useEffect(() => {
    if (!moved.current) return;
    formRef.current?.querySelector<HTMLElement>('input:not([disabled]),select')?.focus({ preventScroll: true });
  }, [step, sent]);

  const read = (form: HTMLFormElement): Data => {
    const d: Data = {};
    new FormData(form).forEach((v, k) => { d[k] = String(v).trim(); });
    form.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((c) => { d[c.name] = c.checked ? 'yes' : ''; });
    return d;
  };
  const sync = (e: FormEvent<HTMLFormElement>) => { const d = read(e.currentTarget); setData((p) => ({ ...p, ...d })); };
  const go = (to: number) => { moved.current = true; setStep(to); };
  const back = () => { const d = read(formRef.current!); setData((p) => ({ ...p, ...d })); go(step - 1); };

  const vol = (num(data.l) * num(data.b) * num(data.h) * Math.max(1, num(data.count))) / 5000;
  const charge = Math.max(num(data.weight), vol);

  const next = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const all = { ...data, ...read(e.currentTarget) };
    setData(all);
    if (step < STEPS.length - 1) return go(step + 1);

    const v3 = (num(all.l) * num(all.b) * num(all.h) * Math.max(1, num(all.count))) / 5000;
    const size = all.l && all.b && all.h ? `, ${all.l}×${all.b}×${all.h} cm each` : '';
    const text = [
      'CSD pickup request',
      `Route: ${route}`,
      `Load: ${load}`,
      `Contents: ${all.content === OTHER ? all.other : all.content}`,
      `Declared value: ₹${Number(all.value).toLocaleString('en-IN')}`,
      `Packages: ${all.count}, ${all.weight} kg${size}${v3 > num(all.weight) ? ` (volumetric ${kg(v3)})` : ''}`,
      `Pickup: ${all.pName}, ${all.pPhone}, ${all.pAddr}, ${all.pPin}${all.pMail ? `, ${all.pMail}` : ''}`,
      `Delivery: ${all.dName}, ${all.dPhone}, ${all.dAddr}, ${all.dPin}`,
      `Pickup day: ${all.day}, ${all.slot}`,
      `Cargo insurance: ${all.insure ? 'yes, on declared value' : 'no'}`,
    ].join('\n');
    window.open(`${whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    moved.current = true;
    setSent(true);
  };

  const v = (k: string) => data[k] ?? '';
  const foot = (hint: React.ReactNode, cta = 'Next') => (
    <div className="pk-foot">
      <p className="pk-hint" aria-live="polite">{hint}</p>
      {step > 0 && <button type="button" className="pk-back" onClick={back}>Back</button>}
      <button className="btn solid" type="submit"><span>{cta}</span></button>
    </div>
  );

  if (sent) {
    return (
      <div className="pk pk-done" role="status">
        <span className="pk-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
        <h3>Your request is ready in WhatsApp.</h3>
        <p>Send it to the dispatch desk. They confirm the pickup slot and the rate for {route}.</p>
        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); setSent(false); setStep(0); setData({ count: '1' }); }}>
          <button className="pk-back" type="submit">Book another pickup</button>
        </form>
      </div>
    );
  }

  return (
    <div className="pk">
      <ol className="pk-steps" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'on' : ''} aria-current={i === step ? 'step' : undefined}>
            <b>{i < step ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : i + 1}</b>{s}
          </li>
        ))}
      </ol>

      <form key={step} ref={formRef} className="pk-step" onSubmit={next} onInput={sync} onInvalidCapture={(e) => e.currentTarget.classList.add('was')}>
        {step === 0 && (
          <>
            <div className="pk-grid">
              <label className={`pk-f${v('content') === OTHER ? '' : ' w2'}`}>Package contents
                <select name="content" required defaultValue={v('content')}>
                  <option value="" disabled>Select contents</option>
                  {CONTENTS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              {v('content') === OTHER && (
                <label className="pk-f">Specify contents
                  <input name="other" required maxLength={60} defaultValue={v('other')} placeholder="e.g. Solar panels" />
                </label>
              )}
              <label className="pk-f">Declared value (₹)
                <input name="value" type="number" inputMode="numeric" required min={1} max={99999999} defaultValue={v('value')} placeholder="Invoice value" />
              </label>
              <label className="pk-f">No. of packages
                <input name="count" type="number" inputMode="numeric" required min={1} max={9999} defaultValue={v('count')} />
              </label>
              <label className="pk-f">Total weight (kg)
                <input name="weight" type="number" inputMode="decimal" required min={0.1} max={40000} step="any" defaultValue={v('weight')} placeholder="e.g. 120" />
              </label>
              <div className="pk-f" role="group" aria-label="Size of each package in centimetres">Size per package (cm)
                <span className="pk-dim">
                  {(['l', 'b', 'h'] as const).map((k, i) => (
                    <input key={k} name={k} type="number" inputMode="numeric" min={1} max={1500} defaultValue={v(k)} placeholder={'LBH'[i]} aria-label={['Length', 'Breadth', 'Height'][i]} />
                  ))}
                </span>
              </div>
            </div>
            {foot(
              num(data.value) > EWAY ? <>Above ₹50,000 the consignment needs an <b>e-way bill</b>. Keep it with the invoice.</>
              : charge > 0 ? <>Chargeable weight <b>{kg(charge)}</b>{vol > num(data.weight) ? ' (volumetric)' : ''}. Final weight is taken at pickup.</>
              : 'Size is optional. It helps us plan space on the truck.',
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="pk-grid">
              <label className="pk-f">Contact name<input name="pName" required pattern={NAME} title="3 to 50 letters" autoComplete="name" defaultValue={v('pName')} /></label>
              <label className="pk-f">Mobile number<input name="pPhone" type="tel" inputMode="numeric" required pattern={MOBILE} maxLength={10} title="10-digit mobile number" autoComplete="tel-national" defaultValue={v('pPhone')} /></label>
              <label className="pk-f">Pincode<input name="pPin" inputMode="numeric" required pattern={PIN} maxLength={6} title="6-digit pincode" autoComplete="postal-code" defaultValue={v('pPin')} /></label>
              <label className="pk-f w2">Pickup address<input name="pAddr" required minLength={8} maxLength={160} autoComplete="street-address" defaultValue={v('pAddr')} placeholder="Building, street, area, city" /></label>
              <label className="pk-f"><span>Email <i>(optional)</i></span><input name="pMail" type="email" maxLength={80} autoComplete="email" defaultValue={v('pMail')} /></label>
            </div>
            {foot('We call this number to coordinate the pickup.')}
          </>
        )}

        {step === 2 && (
          <>
            <div className="pk-grid">
              <label className="pk-f">Receiver name<input name="dName" required pattern={NAME} title="3 to 50 letters" defaultValue={v('dName')} /></label>
              <label className="pk-f">Mobile number<input name="dPhone" type="tel" inputMode="numeric" required pattern={MOBILE} maxLength={10} title="10-digit mobile number" defaultValue={v('dPhone')} /></label>
              <label className="pk-f">Pincode<input name="dPin" inputMode="numeric" required pattern={PIN} maxLength={6} title="6-digit pincode" defaultValue={v('dPin')} /></label>
              <label className="pk-f w3">Delivery address<input name="dAddr" required minLength={8} maxLength={160} defaultValue={v('dAddr')} placeholder="Building, street, area, city" /></label>
            </div>
            {foot('We call the receiver before the truck reaches them.')}
          </>
        )}

        {step === 3 && (
          <>
            <div className="pk-grid">
              <fieldset className="pk-f w2 pk-days">
                <legend>Pickup day</legend>
                <span>
                  {days.map((d) => (
                    <label key={d.value} title={d.off ? 'Same-day pickups close at 5 pm' : undefined}>
                      <input type="radio" name="day" value={d.value} required disabled={d.off} defaultChecked={v('day') === d.value} />
                      <b>{d.top}</b><small>{d.off ? 'Closed' : d.sub}</small>
                    </label>
                  ))}
                </span>
              </fieldset>
              <label className="pk-f">Time slot
                <select name="slot" defaultValue={v('slot') || SLOTS[0]}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label className="pk-check w3">
                <input type="checkbox" name="insure" defaultChecked={!!v('insure')} />
                <span>Insure this consignment on its declared value against loss or damage</span>
              </label>
              <label className="pk-check w3">
                <input type="checkbox" name="agree" required defaultChecked={!!v('agree')} />
                <span>I declare the contents are not prohibited goods and the details above are correct</span>
              </label>
            </div>
            {foot(<>{route}<br /><b>{data.count} pkg · {kg(charge)}</b></>, 'Book on WhatsApp')}
          </>
        )}
      </form>
    </div>
  );
}
