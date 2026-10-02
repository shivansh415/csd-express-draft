import Image from 'next/image';
import DxNav from '@/components/dx/DxNav';
import TruckScene from '@/components/dx/TruckScene';
import Contact from '@/components/Contact';

const cards = [
  ['Part load', 'Share truck space on a scheduled corridor run, consolidated at the Bengaluru hub.'],
  ['Full truck load', 'A dedicated vehicle, loaded at your dock and sealed through to destination.'],
  ['Warehousing', 'Short-term holding, sorting and route-wise staging before dispatch.'],
];

export default function DirectionC() {
  return (
    <>
      <DxNav dark />
      <main>
        <section className="c-hero">
          <div className="c-stars" />
          <div className="wrap">
            <p className="dx-eyebrow" data-reveal>Tonight&rsquo;s run is loading</p>
            <h1 className="dx-h1" data-split>While you sleep, your cargo <em>moves.</em></h1>
            <p className="dx-lede" data-reveal="1">Bengaluru to Hyderabad and Vijayawada, every night. Out by dusk, at the dock by sunrise.</p>
            <div className="dx-actions" data-reveal="2">
              <a className="btn solid magnetic" href="#contact"><span>Book a pickup</span></a>
              <a className="btn magnetic" href="#tracking"><span>Track a shipment</span></a>
            </div>
          </div>
          <div className="c-board" data-reveal="3">
            <div>BLR &rarr; HYD<b>22:30 &rarr; 05:45</b></div>
            <div>BLR &rarr; VJA<b>23:00 &rarr; 06:30</b></div>
            <div>Status<b className="ok">On time</b></div>
          </div>
          <div className="c-truck" data-reveal="1"><Image src="/trucks/truck-dusk.png" alt="CSD Express container truck on the night run" width={859} height={474} priority sizes="(max-width: 820px) 86vw, 58vw" /></div>
          <div className="c-ground" />
        </section>

        <TruckScene tone="white">
          <p className="dx-eyebrow">The fleet</p>
          <h2 className="dx-h2" data-split>Our name rides on every run.</h2>
        </TruckScene>

        <section className="dx-section" id="services">
          <div className="wrap">
            <div className="dx-head">
              <p className="dx-eyebrow">Core services</p>
              <h2 className="dx-h2" data-split>What we move, and how.</h2>
            </div>
            <div className="c-cards">
              {cards.map(([name, text], i) => (
                <article className="c-card" key={name} data-reveal={i}>
                  <span className="no">0{i + 1}</span>
                  <div><h3 className="dx-h3">{name}</h3><p style={{ marginTop: '.6rem' }}>{text}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <Contact />
      </main>
    </>
  );
}
