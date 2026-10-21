import Image from 'next/image';

/* Brands CSD works with, from the company portfolio ("Our proud partners"). Logos were cut from the portfolio
   collage, so they are raster; swap in official vector files here when available. */
const partners = [
  ['flipkart', 'Flipkart', 369, 330], ['amazon', 'Amazon', 543, 165], ['bluedart', 'Blue Dart', 513, 306], ['meesho', 'Meesho', 309, 330],
  ['bosch', 'Bosch', 564, 126], ['zepto', 'Zepto', 564, 186], ['dhl', 'DHL', 594, 138], ['shadowfax', 'Shadowfax', 516, 315],
  ['dell', 'Dell', 324, 321], ['dtdc', 'DTDC', 564, 141], ['xpressbees', 'XpressBees', 588, 114],
] as const;

export default function Partners() {
  const row = (hidden: boolean) => (
    <ul className="pt-row" aria-hidden={hidden || undefined}>
      {partners.map(([file, name, w, h]) => (
        <li key={file}><Image src={`/partners/${file}.webp`} alt={hidden ? '' : name} width={w} height={h} sizes="(max-width: 760px) 110px, 150px" /></li>
      ))}
    </ul>
  );
  return (
    <section className="pt" aria-label="Our proud partners">
      <p className="pt-label">Our proud partners</p>
      <div className="pt-strip">
        <div className="pt-track">{row(false)}{row(true)}</div>
      </div>
    </section>
  );
}
