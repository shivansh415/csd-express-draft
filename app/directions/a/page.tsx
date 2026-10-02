import DxNav from '@/components/dx/DxNav';
import TruckScene from '@/components/dx/TruckScene';
import Contact from '@/components/Contact';

const lanes = [
  { to: 'Hyderabad', via: 'via Anantapur and Kurnool', dep: '22:30', arr: '05:45' },
  { to: 'Vijayawada', via: 'via Chittoor, Tirupati, Nellore, Ongole and Guntur', dep: '23:00', arr: '06:30' },
];

export default function DirectionA() {
  return (
    <>
      <DxNav />
      <main>
        <TruckScene tone="paper" enter="load">
          <p className="dx-eyebrow" data-reveal>Overnight cargo from Bengaluru</p>
          <h1 className="dx-h1" data-split>Loaded by dusk.<br />Delivered by <em>sunrise.</em></h1>
          <p className="dx-lede" data-reveal="1">Two dedicated corridors to Hyderabad and Vijayawada, running every night.</p>
          <div className="dx-actions" data-reveal="2">
            <a className="btn solid magnetic" href="#contact"><span>Book a pickup</span></a>
            <a className="btn magnetic" href="#lanes"><span>See the corridors</span></a>
          </div>
        </TruckScene>

        <section className="dx-section" id="lanes">
          <div className="wrap">
            <div className="dx-head">
              <p className="dx-eyebrow">Launch network</p>
              <h2 className="dx-h2" data-split>Two corridors. Every night.</h2>
            </div>
            <div className="a-lanes">
              {lanes.map((l, i) => (
                <article className="a-lane" key={l.to} data-reveal={i}>
                  <div>
                    <div className="city">Bengaluru<i>&rarr;</i>{l.to}</div>
                    <p className="via">{l.via}</p>
                  </div>
                  <div className="time"><small>Departs / arrives</small>{l.dep} &rarr; {l.arr}</div>
                  <span className="dx-pill">Nightly</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="dx-section" style={{ paddingTop: 0 }}>
          <div className="wrap a-stats">
            <div className="dx-stat" data-reveal="0"><div className="n"><span data-count="1995">1995</span></div><p>Cargo heritage, started in Bengaluru.</p></div>
            <div className="dx-stat" data-reveal="1"><div className="n"><span data-count="24">24</span><sup>h</sup></div><p>Delivery guarantee on both corridors.</p></div>
            <div className="dx-stat" data-reveal="2"><div className="n"><span data-count="2">2</span></div><p>Exclusive lanes, each running every night.</p></div>
          </div>
        </section>
        <Contact />
      </main>
    </>
  );
}
