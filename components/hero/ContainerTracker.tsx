'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import PickupSteps from './PickupSteps';

const SAMPLE = 'CSD-BLR-26-04719';
const CITIES = ['Hyderabad', 'Vijayawada', 'Chennai', 'Madurai', 'Coimbatore', 'Kochi', 'Calicut'];
const WHATSAPP = 'https://wa.me/919353032343';
const DESIGN_W = 960; // layout width of the panel on the container; it is scaled to fit the truck
const idTypes = [
  { label: 'LR number', placeholder: 'e.g. CSD-BLR-26-04719' },
  { label: 'AWB', placeholder: 'Enter your AWB number' },
  { label: 'Mobile', placeholder: 'Enter your mobile number' },
];
const steps = [
  { name: 'Booked', time: '18:40', pos: 0 },
  { name: 'Picked up', time: '20:15', pos: 0.04 },
  { name: 'Out-scanned', time: '22:30', pos: 0.1 },
  { name: 'In transit', time: '02:10', pos: 0.64 },
  { name: 'Delivered', time: 'ETA 05:45', pos: 1 },
];

/* Tracker painted onto the truck's container: track a consignment or request a pickup.
   Sits over the container panel on wide screens; below 991px (CSS) it drops under the truck as a card, so the
   layout is decided before any script runs and nothing shifts on load. */
export default function ContainerTracker() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tab, setTab] = useState(0);
  const [idType, setIdType] = useState(0);
  const [value, setValue] = useState('');
  const [step, setStep] = useState(-1); // -1 idle; otherwise index of the latest reached step
  const [notFound, setNotFound] = useState('');
  const [route, setRoute] = useState(`Bengaluru to ${CITIES[0]}`);
  const [load, setLoad] = useState('Part load (PTL)');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const truck = hostRef.current!.parentElement!;
    const ro = new ResizeObserver(() => {
      const s = (truck.clientWidth * 0.721) / DESIGN_W;
      setScale(s);
    });
    ro.observe(truck);
    return () => { ro.disconnect(); timers.current.forEach(clearTimeout); };
  }, []);

  // TODO: no tracking API yet. Only the sample LR replays a journey; anything else is handed to the dispatch desk.
  const track = (id: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setNotFound('');
    if (id.toUpperCase() !== SAMPLE) {
      setStep(-1);
      if (id) setNotFound(id);
      return;
    }
    setStep(0);
    [1, 2, 3].forEach((s, i) => timers.current.push(setTimeout(() => setStep(s), 500 * (i + 1))));
  };
  const onTrack = (e: FormEvent) => { e.preventDefault(); track(value.trim()); };
  const live = step >= 0;
  const p = live ? steps[step].pos : 0;

  return (
    <div className="ct" id="track" ref={hostRef} style={{ '--s': scale } as React.CSSProperties}>
      <div className="ct-cue" aria-hidden="true">
        <span className="ct-mouse"><i /></span>
        <span>Scroll to track your cargo</span>
      </div>
      <div className="ct-in">
        <div className="ct-form">
          <div className="ct-tabs" role="tablist" style={{ '--i': tab } as React.CSSProperties}>
            <i />
            {['Track a shipment', 'Book a pickup'].map((t, i) => (
              <button key={t} role="tab" type="button" aria-selected={tab === i} onClick={() => setTab(i)}>{t}</button>
            ))}
          </div>
          {tab === 0 ? (
            <>
              <h2 className="ct-h">Where is my <em>cargo?</em></h2>
              <div className="ct-seg" style={{ '--i': idType } as React.CSSProperties}>
                <i />
                {idTypes.map((t, i) => (
                  <button key={t.label} type="button" aria-pressed={idType === i} onClick={() => setIdType(i)}>{t.label}</button>
                ))}
              </div>
              <form className="ct-input" onSubmit={onTrack}>
                <label className="sr" htmlFor="ctId">{idTypes[idType].label}</label>
                <input id="ctId" value={value} onChange={(e) => setValue(e.target.value)} placeholder={idTypes[idType].placeholder} inputMode={idType === 2 ? 'tel' : 'text'} autoComplete="off" maxLength={40} spellCheck={false} />
                <button className="btn solid" type="submit"><span>Track</span></button>
              </form>
              {notFound ? (
                <p className="ct-msg" role="status">
                  Online tracking is being switched on. The dispatch desk can trace <b>{notFound}</b>:{' '}
                  <a href={`${WHATSAPP}?text=${encodeURIComponent(`Please share the status of ${notFound}`)}`} target="_blank" rel="noopener">ask on WhatsApp</a>.
                </p>
              ) : (
                <button className="ct-sample" type="button" onClick={() => { setIdType(0); setValue(SAMPLE); track(SAMPLE); }}>
                  No number handy? Replay a sample night: <b>{SAMPLE}</b>
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="ct-h">On tonight&rsquo;s <em>truck.</em></h2>
              <div className="ct-fields">
                <label>Route
                  <select name="route" value={route} onChange={(e) => setRoute(e.target.value)}>
                    <optgroup label="From Bengaluru">{CITIES.map((c) => <option key={c}>Bengaluru to {c}</option>)}</optgroup>
                    <optgroup label="To Bengaluru">{CITIES.map((c) => <option key={c}>{c} to Bengaluru</option>)}</optgroup>
                    <option>Other (South India)</option>
                  </select>
                </label>
                <label>Load type
                  <select name="load" value={load} onChange={(e) => setLoad(e.target.value)}>
                    <option>Part load (PTL)</option><option>Full truck load (FTL)</option><option>Trailer</option><option>Container</option><option>Warehousing</option>
                  </select>
                </label>
              </div>
              <p className="ct-note">Four quick steps: package, pickup, delivery and pickup day. WhatsApp then opens with your request ready for the dispatch desk, who confirm the slot and rate.</p>
            </>
          )}
        </div>

        {tab === 1 ? <PickupSteps route={route} load={load} whatsapp={WHATSAPP} /> : (
          <div className="ct-live" style={{ '--p': p } as React.CSSProperties} aria-live="polite">
            <div className="ct-top">
              <div className="ct-lr">{live ? 'LR number' : 'Tonight on the Hyderabad lane'}<b>{live ? SAMPLE : 'Bengaluru 22:30 → Hyderabad 05:45'}</b></div>
              <span className={`ct-status${live ? ' live' : ''}`}>{live ? (step >= 3 ? 'In transit, crossing Kurnool' : steps[step].name) : 'Lanes open'}</span>
            </div>
            <div className="ct-route">
              <div className="ct-line"><i /><b className="ct-dot" /></div>
              <div className="ct-stops"><span>Bengaluru</span><span>Anantapur</span><span>Kurnool</span><span>Hyderabad</span></div>
            </div>
            <ol className="ct-steps">
              {steps.map((s, i) => (
                <li key={s.name} className={i <= step ? 'on' : ''}><b>{s.name}</b><span>{s.time}</span></li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
