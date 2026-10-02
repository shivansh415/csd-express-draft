'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  ['a', 'A · Stage'],
  ['b', 'B · Editorial'],
  ['c', 'C · Night run'],
  ['d', 'D · Bento'],
];

export default function Switcher() {
  const path = usePathname();
  return (
    <div className="dx-switch" role="navigation" aria-label="Design directions">
      <Link href="/directions" className={path === '/directions' ? 'on' : ''}>All</Link>
      {items.map(([k, label]) => (
        <Link key={k} href={`/directions/${k}`} className={path === `/directions/${k}` ? 'on' : ''}>{label}</Link>
      ))}
    </div>
  );
}
