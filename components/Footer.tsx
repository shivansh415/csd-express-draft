import BrandLogo from './dx/BrandLogo';

export default function Footer() {
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-grid">
          <div><b>CSD Supply Chain</b><p>3rd Floor, &lsquo;A&rsquo; Block, Connection Point,<br />No. 5/16, Civil Aviation Road,<br />Konena Agrahara, Vimanpura,<br />Bengaluru 560017</p></div>
          <div><b>Routes, both ways</b><p>Bengaluru &rarr; Hyderabad, Vijayawada<br />Chennai, Madurai, Coimbatore<br />Kochi, Calicut</p></div>
          <div><b>Sections</b><p><a href="#track">Track a shipment</a><br /><a href="#network">Routes</a><br /><a href="#services">Services</a><br /><a href="#process">How we work</a></p></div>
        </div>
        <div className="ft-mark">
          <BrandLogo tagline tone="light" className="ft-logo" />
          <div style={{ textAlign: 'right' }}>
            &copy; 2026 CSD Supply Chain
            <small className="ft-credit">Map elevation: Mapzen Terrain Tiles via AWS Open Data (SRTM, GMTED, ETOPO1 and others).</small>
          </div>
        </div>
      </div>
    </footer>
  );
}
