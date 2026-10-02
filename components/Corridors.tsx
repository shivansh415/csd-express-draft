import LogoMark from './dx/LogoMark';

/* Top-down truck, nose pointing +x and centred on 0,0, so MotionPath can align and autoRotate it along a route.
   Navy cab, white container with the CSD mark on the roof, headlight beams ahead. */
function MapTruck({ id }: { id: string }) {
  return (
    <g id={id} className="map-truck">
      <g transform="scale(1.35)">
      <path className="beam" d="M19.5,-5.2 L40,-12 L40,12 L19.5,5.2 Z" fill="url(#beam)" />
      <rect x="-19" y="-5.5" width="40" height="14" rx="3" fill="rgba(28,33,88,.22)" filter="url(#truckBlur)" />
      <rect x="-20.5" y="-7.2" width="29" height="14.4" rx="1.8" fill="#fff" stroke="#C7C5BC" strokeWidth=".6" />
      <rect x="-20.5" y="-7.2" width="29" height="1.3" fill="#1C2158" />
      <rect x="-20.5" y="5.9" width="29" height="1.3" fill="#1C2158" />
      <rect x="-20.5" y="-5.6" width="29" height=".6" fill="#179A47" />
      <rect x="-20.5" y="5" width="29" height=".6" fill="#179A47" />
      <LogoMark className="logo-fill" x={-13.4} y={-3.4} width={14.4} height={(14.4 * 655) / 1394} />
      <rect x="8.4" y="-2" width="2" height="4" fill="#3A3D55" />
      <rect x="10.2" y="-6.6" width="9.6" height="13.2" rx="2.6" fill="#1C2158" />
      <rect x="16.8" y="-5.4" width="2.2" height="10.8" rx="1" fill="#A9BDE0" />
      <rect x="12.4" y="-8.4" width="1.6" height="1.6" rx=".4" fill="#1C2158" />
      <rect x="12.4" y="6.8" width="1.6" height="1.6" rx=".4" fill="#1C2158" />
      <circle cx="19.6" cy="-4.6" r=".9" fill="#FFE7A8" />
      <circle cx="19.6" cy="4.6" r=".9" fill="#FFE7A8" />
      </g>
    </g>
  );
}

const lanes = [
  { key: 'hyd', to: 'Hyderabad', desc: 'Dedicated interstate corridor for reliable, repeatable movement into Telangana.', via: 'via Anantapur and Kurnool', dep: '22:30', arr: '05:45', desk: '+91 96329 39298' },
  { key: 'vja', to: 'Vijayawada', desc: 'Dedicated corridor for regular commercial shipments along the Andhra coast.', via: 'via Chittoor, Tirupati, Nellore, Ongole and Guntur', dep: '23:00', arr: '06:30', desk: '+91 93530 32343' },
];

const reasons = [
  ['Regular dispatch planning', 'Designed for repeat business and predictable movement, week after week.'],
  ['Part load and full truck', 'Share a scheduled run or take a dedicated vehicle. Same lanes, same discipline.'],
  ['Business-focused handling', 'Documentation checked at booking, loads manifested, dispatch out-scanned.'],
  ['South India connectivity', 'An existing network footprint supports expansion beyond the launch lanes.'],
];

export default function Corridors() {
  return (
    <section className="dx-section" id="lanes">
      <div className="wrap">
        <div className="dx-head">
          <p className="dx-eyebrow">Launch network</p>
          <h2 className="dx-h2" data-split>Two corridors. Every night.</h2>
          <p className="dx-lede" data-reveal>We would rather be the most dependable operator on two lanes than an average one on twenty.</p>
        </div>
        <div className="co-grid">
          <div className="co-map" data-reveal>
            <svg className="map" id="map" viewBox="0 0 600 520" aria-label="Schematic map of the Bengaluru to Hyderabad and Bengaluru to Vijayawada corridors">
              <defs>
                <linearGradient id="beam" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#FFE7A8" stopOpacity=".75" />
                  <stop offset="1" stopColor="#FFE7A8" stopOpacity="0" />
                </linearGradient>
                <filter id="truckBlur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.4" /></filter>
              </defs>
              <path className="ghost" d="M110,430 C150,390 190,360 215,330 S280,270 300,230 S350,140 390,90" />
              <path className="ghost" d="M110,430 C140,448 175,455 205,455 S245,445 265,435 S320,400 345,370 S390,320 410,300 S445,245 470,225 S515,190 540,175" />
              <g className="hyd-g">
                <path className="route hyd" id="routeHyd" d="M110,430 C150,390 190,360 215,330 S280,270 300,230 S350,140 390,90" />
                <circle className="node" cx="215" cy="330" r="5" /><text x="228" y="334">Anantapur</text>
                <circle className="node" cx="300" cy="230" r="5" /><text x="313" y="234">Kurnool</text>
                <circle className="node" cx="390" cy="90" r="6" /><text className="big" x="405" y="80">Hyderabad</text><text x="405" y="98">Telangana</text>
              </g>
              <g className="vja-g">
                <path className="route vja" id="routeVja" d="M110,430 C140,448 175,455 205,455 S245,445 265,435 S320,400 345,370 S390,320 410,300 S445,245 470,225 S515,190 540,175" />
                <circle className="node g" cx="205" cy="455" r="5" /><text x="196" y="482">Chittoor</text>
                <circle className="node g" cx="265" cy="435" r="5" /><text x="258" y="462">Tirupati</text>
                <circle className="node g" cx="345" cy="370" r="5" /><text x="358" y="382">Nellore</text>
                <circle className="node g" cx="410" cy="300" r="5" /><text x="423" y="312">Ongole</text>
                <circle className="node g" cx="470" cy="225" r="5" /><text x="483" y="240">Guntur</text>
                <circle className="node g" cx="540" cy="175" r="6" /><text className="big" x="598" y="150" textAnchor="end">Vijayawada</text><text x="598" y="130" textAnchor="end">Andhra Pradesh</text>
              </g>
              <circle className="node origin" cx="110" cy="430" r="7" />
              <text className="big" x="30" y="416">Bengaluru</text><text x="30" y="398">Origin hub</text>
              <g className="vja-g"><MapTruck id="truckVja" /></g>
              <g className="hyd-g"><MapTruck id="truckHyd" /></g>
            </svg>
          </div>
          <div className="co-lanes">
            {lanes.map((l, i) => (
              <article className="co-lane" key={l.key} data-lane={l.key} data-reveal={i + 1}>
                <div>
                  <div className="city">Bengaluru<i>&rarr;</i>{l.to}</div>
                  <p className="via">{l.via}</p>
                  <p className="desc">{l.desc}</p>
                </div>
                <dl>
                  <div><dt>Departs</dt><dd>{l.dep}</dd></div>
                  <div><dt>Arrives</dt><dd>{l.arr}</dd></div>
                  <div><dt>Lane desk</dt><dd>{l.desk}</dd></div>
                </dl>
                <div><span className="dx-pill">Exclusive lane, nightly</span></div>
              </article>
            ))}
          </div>
        </div>

        <div className="why">
          {reasons.map(([title, text], i) => (
            <div className="why-col" key={title} data-reveal={i}>
              <span className="no">0{i + 1}</span>
              <div><b>{title}</b><p>{text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
