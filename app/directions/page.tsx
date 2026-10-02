import Link from 'next/link';

const picks = [
  { k: 'A', href: '/directions/a', name: 'Stage', text: 'Centred and calm. One headline, one truck. The hero itself is the scroll scene: the truck drives in and the CSD mark paints onto the container.', ink: false },
  { k: 'B', href: '/directions/b', name: 'Editorial split', text: 'Headline left, three-quarter truck on a dusk sun right, floating live chips. The logo scene follows on a full navy band.', ink: false },
  { k: 'C', href: '/directions/c', name: 'Night run', text: 'Dark navy hero fading to dusk at the horizon, tail-lights glowing, road moving. The most cinematic of the four.', ink: true },
  { k: 'D', href: '/directions/d', name: 'Bento', text: 'Rounded cards in a grid: headline, truck, tonight’s board and a stat. Modern, product-like, very scannable.', ink: false },
];

export default function DirectionsIndex() {
  return (
    <main className="dx-index">
      <div className="wrap">
        <p className="dx-eyebrow">CSD Express &middot; UI directions</p>
        <h1 className="dx-h2" style={{ marginTop: '1.2rem', maxWidth: '14em' }} data-split>Four ways the new site could look. Pick one to build out.</h1>
        <div className="dx-index-grid">
          {picks.map((p, i) => (
            <Link key={p.k} href={p.href} className={`dx-pick${p.ink ? ' ink' : ''}`} data-reveal={i}>
              <span className="k">{p.k}</span>
              <div>
                <h2 className="dx-h3">{p.name}</h2>
                <p style={{ marginTop: '.5rem' }}>{p.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
