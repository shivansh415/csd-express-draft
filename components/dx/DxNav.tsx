import Link from 'next/link';
import BrandLogo from './BrandLogo';

export default function DxNav({ dark = false, home = '/directions' }: { dark?: boolean; home?: string }) {
  return (
    <header id="nav" className={`dx-nav${dark ? ' dark' : ''}`}>
      <Link className="dx-brand" href={home} aria-label="CSD Supply Chain">
        <BrandLogo compact className="dx-logo" tone={dark ? 'light' : 'brand'} />
      </Link>
      <nav aria-label="Sections">
        <a href="#track">Track</a>
        <a href="#process">How we work</a>
        <a href="#network">Routes</a>
        <a href="#services">Services</a>
        <a href="#contact">Contact</a>
      </nav>
      <a className="btn solid magnetic" href="#contact"><span>Book a pickup</span></a>
    </header>
  );
}
