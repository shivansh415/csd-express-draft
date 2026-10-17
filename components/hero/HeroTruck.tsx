import Image from 'next/image';
import ContainerTracker from './ContainerTracker';

/* Hero: headline, then a large side-view truck whose container doubles as the shipment tracker.
   The truck drives in on load (SiteFX); below ~950px the tracker drops beneath the truck as a card. */
export default function HeroTruck() {
  return (
    <section className="ht" id="top-hero">
      <div className="ht-copy">
        <p className="dx-eyebrow" data-reveal>Overnight cargo from Bengaluru</p>
        <h1 className="dx-h1" data-split>Loaded by dusk. Delivered by <em>sunrise.</em></h1>
        <p className="dx-lede" data-reveal="1">Seven two-way routes between Bengaluru and South India. Track a consignment right on the truck.</p>
        <div className="dx-actions" data-reveal="2">
          <a className="btn solid magnetic" href="#contact"><span>Book a pickup</span></a>
          <a className="btn magnetic" href="#network"><span>See our routes</span></a>
        </div>
      </div>
      <div className="ht-stage">
        <div className="ht-truck">
          <Image src="/trucks/truck-side.png" alt="CSD Supply Chain truck, side view" width={1282} height={503} priority loading="eager" sizes="(max-width: 1400px) 94vw, 1320px" />
          <i className="ht-shadow" />
          <ContainerTracker />
        </div>
        <div className="ts-road"><i /></div>
      </div>
    </section>
  );
}
