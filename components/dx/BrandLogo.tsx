/* CSD logo as supplied by the client (final): the CSD mark, the tagline "Moving Business - Delivering Trust"
   in a bold serif (--font-logo, Alegreya) and four circled service icons (sea, air, road, express).
   `variant="mark"` is the mark alone, for tight spaces like the nav. */
const ICONS = ['sea', 'air', 'road', 'express'] as const;
const ICON_LABEL = { sea: 'Sea', air: 'Air', road: 'Road', express: 'Express' } as const;

export default function BrandLogo({ variant = 'full', tone = 'brand', className = '' }: { variant?: 'mark' | 'tagline' | 'full'; tone?: 'brand' | 'light'; className?: string }) {
  const ink = tone === 'light' ? '#fff' : 'var(--logo-ink)';
  const h = variant === 'mark' ? 655 : variant === 'tagline' ? 820 : 1080;
  return (
    <svg className={`brand-logo ${tone} ${className}`} viewBox={`-20 -8 1434 ${h + 16}`} role="img" aria-label="CSD Supply Chain: Moving Business, Delivering Trust">
      {/* the mark is a cached file rather than 15 KB of inline paths on every page */}
      <image href={tone === 'light' ? '/brand/csd-mark-light.svg' : '/brand/csd-mark.svg'} x={0} y={0} width={1394} height={655} />
      {variant !== 'mark' && (
        <text x={697} y={790} textAnchor="middle" textLength={1335} lengthAdjust="spacingAndGlyphs" fill={ink}
          style={{ fontFamily: 'var(--font-logo), Georgia, serif', fontWeight: 800, fontSize: 98 }}>
          Moving Business - Delivering Trust
        </text>
      )}
      {variant === 'full' && ICONS.map((n, i) => (
        <image key={n} href={`/brand/${n}${tone === 'light' ? '-white' : ''}.webp`} x={76 + i * 345} y={850} width={212} height={212}>
          <title>{ICON_LABEL[n]}</title>
        </image>
      ))}
    </svg>
  );
}
