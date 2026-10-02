import Image from 'next/image';
import DxNav from '@/components/dx/DxNav';
import TruckScene from '@/components/dx/TruckScene';
import Contact from '@/components/Contact';

const steps = [
  ['Booking', 'LR generated, freight calculated'],
  ['Pickup', 'Vehicle allocated to your dock'],
  ['Consolidation', 'Sorted route-wise at the hub'],
  ['Dispatch', 'Loaded and out-scanned'],
  ['In transit', 'Live vehicle tracking'],
  ['Delivery', 'At the dock by early morning'],
  ['Digital POD', 'Signature, photo and GPS'],
];

export default function DirectionD() {
  return (
    <>
      <DxNav />
      <main>
        <section className="d-hero">
          <div className="d-grid">
            <div className="d-card d-main" data-reveal="0">
              <p className="dx-eyebrow">Overnight cargo from Bengaluru</p>
              <h1 className="dx-h1" data-split>Loaded by dusk. Delivered by <em>sunrise.</em></h1>
              <div className="dx-actions">
                <a className="btn solid magnetic" href="#contact"><span>Book a pickup</span></a>
                <a className="btn magnetic" href="#tracking"><span>Track a shipment</span></a>
              </div>
            </div>
            <div className="d-card d-truck" data-reveal="1">
              <span className="dx-pill">Part load and full truck</span>
              <Image src="/trucks/truck-loaded.png" alt="CSD Express truck loaded with cartons" width={1175} height={627} priority sizes="(max-width: 980px) 100vw, 42vw" />
            </div>
            <div className="d-card d-board" data-reveal="2">
              <small>Tonight&rsquo;s dispatch</small>
              <div>BLR &rarr; HYD <span>22:30</span></div>
              <div>BLR &rarr; VJA <span>23:00</span></div>
            </div>
            <div className="d-card d-stat" data-reveal="3">
              <div className="n">24h</div>
              <p>Delivery guarantee</p>
            </div>
          </div>
        </section>

        <TruckScene tone="dusk">
          <p className="dx-eyebrow">The fleet</p>
          <h2 className="dx-h2" data-split>Our name rides on every run.</h2>
        </TruckScene>

        <section className="dx-section" id="tracking">
          <div className="wrap">
            <div className="dx-head">
              <p className="dx-eyebrow">How we work</p>
              <h2 className="dx-h2" data-split>Seven steps, the same order every night.</h2>
            </div>
            <div className="d-steps">
              {steps.map(([name, text], i) => (
                <article className={`d-step${i === steps.length - 1 ? ' last' : ''}`} key={name} data-reveal={i % 4}>
                  <span className="no">0{i + 1}</span>
                  <div><h3 className="dx-h3">{name}</h3><small>{text}</small></div>
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
