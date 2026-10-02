'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import MiniTruck from './MiniTruck';

const SAMPLE = 'CSD-BLR-26-04719';
const WHATSAPP = 'https://wa.me/919353032343';
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

export default function TrackDesk() {
  const [tab, setTab] = useState(0);
  const [idType, setIdType] = useState(0);
  const [value, setValue] = useState('');
  const [step, setStep] = useState(-1); // -1 idle; otherwise index of the latest reached step
  const [notFound, setNotFound] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

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
  const onTrack = (e: FormEvent) => {
    e.preventDefault();
    track(value.trim());
  };
  const onBook = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const text = `Pickup request from Bengaluru to ${d.get('to')}. Load: ${d.get('load')}. Weight: ${d.get('weight') || 'not sure yet'}.`;
    window.open(`${WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const live = step >= 0;
  const p = live ? steps[step].pos : 0;

  return (
    <section className="td" id="track">
      <div className="wrap">
        <div className="td-card" data-reveal>
          <div className="td-form">
            <div className="td-tabs" role="tablist" style={{ '--i': tab } as React.CSSProperties}>
              <i />
              {['Track a shipment', 'Book a pickup'].map((t, i) => (
                <button key={t} role="tab" type="button" aria-selected={tab === i} onClick={() => setTab(i)}>{t}</button>
              ))}
            </div>

            {tab === 0 ? (
              <>
                <h2 className="dx-h2">Where is my <em>cargo?</em></h2>
                <div className="td-seg" style={{ '--i': idType } as React.CSSProperties}>
                  <i />
                  {idTypes.map((t, i) => (
                    <button key={t.label} type="button" aria-pressed={idType === i} onClick={() => setIdType(i)}>{t.label}</button>
                  ))}
                </div>
                <form className="td-input" onSubmit={onTrack}>
                  <label className="sr" htmlFor="tdId">{idTypes[idType].label}</label>
                  <input id="tdId" value={value} onChange={(e) => setValue(e.target.value)} placeholder={idTypes[idType].placeholder} inputMode={idType === 2 ? 'tel' : 'text'} autoComplete="off" />
                  <button className="btn solid" type="submit"><span>Track</span></button>
                </form>
                {notFound ? (
                  <p className="td-msg" role="status">
                    Online tracking is being switched on with the relaunch. For now the dispatch desk can trace <b>{notFound}</b> for you:{' '}
                    <a href={`${WHATSAPP}?text=${encodeURIComponent(`Please share the status of ${notFound}`)}`} target="_blank" rel="noopener">ask on WhatsApp</a> or call +91 93530 32343.
                  </p>
                ) : (
                  <button className="td-sample" type="button" onClick={() => { setIdType(0); setValue(SAMPLE); track(SAMPLE); }}>
                    No number handy? Replay a sample night: <b>{SAMPLE}</b>
                  </button>
                )}
              </>
            ) : (
              <>
                <h2 className="dx-h2">On tonight&rsquo;s <em>truck.</em></h2>
                <form className="td-fields" onSubmit={onBook}>
                  <label>Destination
                    <select name="to"><option>Hyderabad</option><option>Vijayawada</option><option>Guntur</option><option>Nellore</option><option>Kurnool</option><option>Other (South India)</option></select>
                  </label>
                  <label>Load type
                    <select name="load"><option>Part load (PTL)</option><option>Full truck load (FTL)</option><option>Trailer</option><option>Container</option><option>Warehousing</option></select>
                  </label>
                  <label className="full">Approximate weight
                    <input name="weight" placeholder="e.g. 400 kg" />
                  </label>
                  <button className="btn solid full" type="submit"><span>Continue on WhatsApp</span></button>
                </form>
                <p className="td-note">Opens WhatsApp with your request ready to send to the dispatch desk. They reply with a rate and the next departure.</p>
              </>
            )}
          </div>

          <div className="td-live" style={{ '--p': p } as React.CSSProperties} aria-live="polite">
            <div className="td-top">
              <div className="td-lr">{live ? 'LR number' : 'Tonight on the Hyderabad lane'}<b>{live ? SAMPLE : 'Bengaluru 22:30 → Hyderabad 05:45'}</b></div>
              <span className={`td-status${live ? ' live' : ''}`}>{live ? (step >= 3 ? 'In transit, crossing Kurnool' : steps[step].name) : 'Lanes open'}</span>
            </div>
            <div className="td-route">
              <MiniTruck />
              <div className="td-line"><i /></div>
              <div className="td-stops"><span>Bengaluru</span><span>Anantapur</span><span>Kurnool</span><span>Hyderabad</span></div>
            </div>
            <ol className="td-steps">
              {steps.map((s, i) => (
                <li key={s.name} className={i <= step ? 'on' : ''}><b>{s.name}</b><span>{s.time}</span></li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
