import LogoMark from './dx/LogoMark';

export default function Footer() {
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-grid">
          <div><b>CSD Express LLP</b><p>3rd Floor, &lsquo;A&rsquo; Block, Connection Point,<br />No. 5/16, Civil Aviation Road,<br />Konena Agrahara, Vimanpura,<br />Bengaluru 560017</p></div>
          <div><b>Launch lanes</b><p>Bengaluru &rarr; Hyderabad<br />Bengaluru &rarr; Vijayawada</p></div>
          <div><b>Sections</b><p><a href="#track">Track a shipment</a><br /><a href="#lanes">Corridors</a><br /><a href="#services">Services</a><br /><a href="#process">How we work</a></p></div>
        </div>
        <div className="ft-mark">
          <LogoMark />
          <div style={{ textAlign: 'right' }}>
            Millions of Miles &ndash; Millions of Smiles<br />&copy; 2026 CSD Express LLP
            <small className="ft-credit">Map elevation: Mapzen Terrain Tiles via AWS Open Data (SRTM, GMTED, ETOPO1 and others).</small>
          </div>
        </div>
      </div>
    </footer>
  );
}
