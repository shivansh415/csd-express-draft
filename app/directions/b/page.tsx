import Image from 'next/image';
import DxNav from '@/components/dx/DxNav';
import TruckScene from '@/components/dx/TruckScene';
import Contact from '@/components/Contact';

const services = [
  ['Part load', 'Share truck space on a scheduled corridor run.'],
  ['Full truck load', 'A dedicated vehicle, sealed from your dock to destination.'],
  ['Warehousing', 'Short-term holding and staging at the Bengaluru hub.'],
  ['Trailer services', 'Flatbed and low-bed for machinery and oversize cargo.'],
  ['Container movement', '20 ft and 40 ft haulage between depots, ports and plants.'],
];

export default function DirectionB() {
  return (
    <>
      <DxNav />
      <main>
        <section className="b-hero">
          <div className="wrap">
            <div className="b-copy">
              <p className="dx-eyebrow" data-reveal>Now relaunching from Bengaluru</p>
              <h1 className="dx-h1" data-split>Loaded by dusk. Delivered by <em>sunrise.</em></h1>
              <p className="dx-lede" data-reveal="1">Two dedicated interstate corridors, every night. Part load or full truck, tracked live to the dock.</p>
              <div className="dx-actions" data-reveal="2">
                <a className="btn solid magnetic" href="#contact"><span>Book a pickup</span></a>
                <a className="dx-phone" href="tel:+919353032343">+91 93530 32343</a>
              </div>
            </div>
            <div className="b-visual" data-reveal="1">
              <div className="b-sun" data-parallax="6" />
              <div className="b-truck"><Image src="/trucks/truck-front.png" alt="CSD Express truck" width={1180} height={670} priority sizes="(max-width: 900px) 100vw, 55vw" /></div>
              <div className="b-chip one" data-float><small>Tonight</small><b>BLR &rarr; HYD &middot; 22:30</b></div>
              <div className="b-chip two" data-float><small>Live tracking</small><b>NH44, crossing Kurnool</b></div>
            </div>
          </div>
          <div className="wrap">
            <div className="b-facts" data-reveal="3">
              <div><b>24-hour delivery</b>Guaranteed on both launch corridors.</div>
              <div><b>Digital proof of delivery</b>Signature, photo and GPS on every consignment.</div>
              <div><b>Cargo since 1995</b>Three decades of South India operations.</div>
            </div>
          </div>
        </section>

        <TruckScene tone="ink">
          <p className="dx-eyebrow">The fleet</p>
          <h2 className="dx-h2" data-split>Our name rides on every run.</h2>
        </TruckScene>

        <section className="dx-section" id="services">
          <div className="wrap">
            <div className="dx-head">
              <p className="dx-eyebrow">Core services</p>
              <h2 className="dx-h2" data-split>What we move, and how.</h2>
            </div>
            <div className="b-svc">
              {services.map(([name, text], i) => (
                <div className="b-row" key={name} data-reveal>
                  <span className="no">0{i + 1}</span>
                  <div className="nm">{name}</div>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <Contact />
      </main>
    </>
  );
}
