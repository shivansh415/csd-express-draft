import LogoMark from './LogoMark';

/* CSD Supply Chain lockup: the CSD mark over "SUPPLY CHAIN" (flanked by short rules) and the tagline
   "Moving Business - Delivering Trust". Text is SVG <text> fitted with textLength, set in a slanted heavy slab
   (--font-logo). `compact` drops the rules and tagline for small spaces like the nav. */
const WORD = { fontFamily: 'var(--font-logo), Rockwell, Georgia, serif', fontSize: 280 } as const;

export default function BrandLogo({ tagline = false, compact = false, tone = 'brand', className = '' }: { tagline?: boolean; compact?: boolean; tone?: 'brand' | 'light'; className?: string }) {
  const ink = tone === 'light' ? '#fff' : 'var(--logo-ink)';
  const box = compact ? '380 -10 2140 960' : tagline ? '40 -10 2820 1180' : '40 -10 2820 960';
  return (
    <svg className={`brand-logo ${tone} ${className}`} viewBox={box} role="img" aria-label="CSD Supply Chain">
      <LogoMark x={753} y={0} width={1394} height={655} />
      {!compact && (
        <g fill={ink}>
          <rect x={140} y={808} width={230} height={26} rx={13} />
          <rect x={2530} y={808} width={230} height={26} rx={13} />
        </g>
      )}
      <g transform="translate(430 915) skewX(-11)">
        <text x={0} y={0} textLength={2040} lengthAdjust="spacingAndGlyphs" fill={ink} style={WORD}>SUPPLY CHAIN</text>
      </g>
      {tagline && !compact && (
        <g transform="translate(90 1118) skewX(-11)">
          <text x={0} y={0} textLength={2720} lengthAdjust="spacingAndGlyphs" fill={ink} style={{ ...WORD, fontSize: 168 }}>Moving Business - Delivering Trust</text>
        </g>
      )}
    </svg>
  );
}
