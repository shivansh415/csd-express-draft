import Link from 'next/link';
import LogoMark from './LogoMark';

export default function DxNav({ dark = false, home = '/directions' }: { dark?: boolean; home?: string }) {
  return (
    <header id="nav" className={`dx-nav${dark ? ' dark' : ''}`}>
      <Link className="dx-brand" href={home} aria-label="CSD Express LLP">
        <LogoMark className="dx-logo" />
        <span>CSD Express</span>
      </Link>
      <nav aria-label="Sections">
        <a href="#track">Track</a>
        <a href="#lanes">Corridors</a>
        <a href="#services">Services</a>
        <a href="#process">How we work</a>
        <a href="#contact">Contact</a>
      </nav>
      <a className="btn solid magnetic" href="#contact"><span>Book a pickup</span></a>
    </header>
  );
}
