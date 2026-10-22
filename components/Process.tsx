import MiniTruck from './MiniTruck';

const steps: [string, string, string[]][] = [
  ['Booking', 'Your desk, our portal', ['Create the shipment', 'LR / AWB generated', 'Freight calculated']],
  ['Pickup', 'Your dock', ['Pickup scheduling', 'Vehicle allocation', 'Shipment collection']],
  ['Consolidation', 'Bengaluru hub', ['Route-wise sorting', 'PTL consolidation', 'Manifest creation']],
  ['Dispatch', 'Late evening', ['Vehicle loading', 'Out-scan', 'Digital trip management']],
  ['In transit', 'Through the night', ['Live vehicle tracking', 'Corridor checkpoints', 'Night support']],
  ['Delivery', 'Early morning', ['Cargo reaches destination', 'Customer support']],
  ['Digital POD', 'Closed, with proof', ['Digital signature', 'Delivery photograph', 'GPS location', 'Instant confirmation']],
];

export default function Process() {
  return (
    <section className="pr" id="process">
      <div className="pr-pin" id="procPin">
        <div className="wrap pr-head">
          <div style={{ display: 'grid', gap: '1.2rem' }}>
            <p className="dx-eyebrow big">How we work</p>
            <h2 className="dx-h2" data-split>Seven steps, the same order every night.</h2>
          </div>
          <p className="dx-lede" data-reveal>Each step leaves a digital record, so you and our dispatch desk are always looking at the same information.</p>
        </div>
        <div className="wrap">
          <div className="pr-track" id="procTrack">
            {steps.map(([name, where, tags], i) => (
              <article className={`pr-step${i === steps.length - 1 ? ' last' : ''}`} key={name}>
                <span className="no">0{i + 1}</span>
                <div><h3 className="dx-h3">{name}</h3><p>{where}</p></div>
                <div className="pr-tags">{tags.map((t) => <span key={t}>{t}</span>)}</div>
              </article>
            ))}
          </div>
          <div className="pr-rail"><i id="procFill" /><div id="procTruck" style={{ position: 'absolute', left: 0, bottom: 0 }}><MiniTruck /></div></div>
        </div>
      </div>
    </section>
  );
}
