export default function Story() {
  return (
    <section className="dx-section">
      <div className="wrap">
        <div className="st-head">
          <div style={{ display: 'grid', gap: '1.2rem' }}>
            <p className="dx-eyebrow">Our story</p>
            <h2 className="dx-h2" data-split>Three decades of cargo, now a diversified logistics business.</h2>
          </div>
          <p className="dx-lede" data-reveal>Our roots go back to 1995 and time-sensitive, point-to-point cargo across South India. Today we are diversifying: two-way routes, part and full loads, warehousing, trailers and container movement, all run with the same discipline and a support desk that answers.</p>
        </div>
        <div className="timeline">
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
            <line x1="8" y1="20" x2="1192" y2="20" stroke="#D9D7CF" strokeWidth="2" />
            <line className="tl-draw" x1="8" y1="20" x2="1192" y2="20" stroke="#1C2158" strokeWidth="2" />
          </svg>
          <div className="tl-items">
            <div data-reveal="0"><div className="yr">1995</div><p>Founded in Bengaluru for time-sensitive, point-to-point cargo.</p></div>
            <div data-reveal="1"><div className="yr">2000s</div><p>Grew into interstate operations and a South India network.</p></div>
            <div data-reveal="2"><div className="yr" style={{ color: 'var(--green)' }}>2026</div><p>Diversifying into seven two-way routes, warehousing and a digital operations stack.</p></div>
          </div>
        </div>
        <div className="a-stats st-stats">
          <div className="dx-stat" data-reveal="0"><div className="n"><span data-count="24">24</span><sup>h</sup></div><p>Delivery guarantee on the Hyderabad and Vijayawada corridors.</p></div>
          <div className="dx-stat" data-reveal="1"><div className="n"><span data-count="7">7</span></div><p>Two-way routes between Bengaluru and South India.</p></div>
          <div className="dx-stat" data-reveal="2"><div className="n"><span data-count="5">5</span></div><p>States on the network.</p></div>
        </div>
      </div>
    </section>
  );
}
