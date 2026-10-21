import Link from 'next/link';
import BrandLogo from '@/components/dx/BrandLogo';

export default function NotFound() {
  return (
    <main className="nf">
      <BrandLogo variant="tagline" className="nf-logo" />
      <h1 className="dx-h2">This page took a wrong turn.</h1>
      <p className="dx-lede">The page you are looking for does not exist or has moved.</p>
      <Link className="btn solid" href="/"><span>Back to the home page</span></Link>
    </main>
  );
}
