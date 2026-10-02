import Image from 'next/image';

const services = [
  { name: 'Part load', text: 'Share truck space on a scheduled corridor run, consolidated at the Bengaluru hub.', glyph: <><rect x="6" y="40" width="60" height="8" /><rect x="12" y="26" width="20" height="14" /><rect x="34" y="18" width="26" height="22" /><path d="M38 18v-6h18v6" /></> },
  { name: 'Full truck load', text: 'A dedicated vehicle, loaded at your dock and sealed through to destination.', glyph: <><rect x="4" y="14" width="42" height="26" /><path d="M46 22h14l8 10v8H46z" /><circle cx="16" cy="44" r="5" /><circle cx="56" cy="44" r="5" /></> },
  { name: 'Warehousing', text: 'Short-term holding, sorting and route-wise staging before dispatch.', glyph: <><path d="M6 48V22L36 8l30 14v26" /><path d="M6 48h60" /><rect x="18" y="34" width="12" height="14" /><rect x="32" y="26" width="12" height="22" /><rect x="46" y="38" width="10" height="10" /></> },
  { name: 'Trailer services', text: 'Flatbed and low-bed trailers for machinery and over-dimensional cargo.', glyph: <><path d="M4 40h50" /><path d="M54 40h10l4-8v8" /><rect x="14" y="20" width="26" height="20" /><circle cx="14" cy="46" r="4" /><circle cx="26" cy="46" r="4" /><circle cx="60" cy="46" r="4" /></> },
  { name: 'Container movement', text: '20 ft and 40 ft haulage between inland depots, ports and your plant.', glyph: <><rect x="8" y="14" width="56" height="26" /><path d="M16 14v26M24 14v26M48 14v26M56 14v26" /><path d="M8 44h56" /><circle cx="20" cy="48" r="4" /><circle cx="52" cy="48" r="4" /></> },
];

export default function Services() {
  return (
    <section className="dx-section" id="services" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="dx-head">
          <p className="dx-eyebrow">Core services</p>
          <h2 className="dx-h2" data-split>What we move, and how.</h2>
        </div>
        <div className="sv-grid">
          <div className="sv-list">
            {services.map((s, i) => (
              <div className="sv-row" key={s.name} data-reveal>
                <span className="no">0{i + 1}</span>
                <div><div className="nm">{s.name}</div><p>{s.text}</p></div>
                <svg className="glyph" viewBox="0 0 72 56" aria-hidden="true">{s.glyph}</svg>
              </div>
            ))}
          </div>
          <figure className="sv-visual" data-reveal>
            <span className="dx-pill">Scanned in, scanned out</span>
            <Image src="/trucks/truck-loaded.png" alt="CSD Express truck with rear doors open, loaded with cartons" width={1175} height={627} sizes="(max-width: 900px) 80vw, 45vw" data-parallax="5" />
            <small>Every option is booked against a schedule, manifested and tracked to the dock.</small>
          </figure>
        </div>
      </div>
    </section>
  );
}
