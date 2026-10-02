import type { Metadata } from 'next';
import Switcher from '@/components/dx/Switcher';
import SiteFX from '@/components/SiteFX';
import './directions.css';

export const metadata: Metadata = { title: 'CSD Express | UI directions' };

export default function DirectionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dx">
      {children}
      <Switcher />
      <SiteFX />
    </div>
  );
}
