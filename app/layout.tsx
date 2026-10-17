import type { Metadata, Viewport } from 'next';
import { Montserrat, IBM_Plex_Sans, IBM_Plex_Mono, Alfa_Slab_One } from 'next/font/google';
import './globals.css';

/* Delhivery sets headings in Gotham (commercial licence) and body in IBM Plex Sans.
   Montserrat is the closest open-source match for Gotham; swap in licensed Gotham files here if purchased. */
const heading = Montserrat({ subsets: ['latin'], variable: '--font-heading', display: 'swap' });
const body = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });
/* logo wordmark: wide heavy slab, slanted in BrandLogo, close to the one in the company portfolio */
const logo = Alfa_Slab_One({ subsets: ['latin'], weight: '400', variable: '--font-logo', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'CSD Supply Chain | Overnight cargo between Bengaluru and South India',
  description:
    'Two dedicated interstate cargo corridors from Bengaluru, running every night. Part load or full truck, with live vehicle tracking and digital proof of delivery.',
};

export const viewport: Viewport = {
  themeColor: '#F2F1EC',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable} ${logo.variable}`}>
      <body>
        <noscript>
          <style>{'.preloader{display:none}[data-split],[data-reveal]{visibility:visible}'}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
