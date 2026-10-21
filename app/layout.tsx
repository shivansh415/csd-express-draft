import type { Metadata, Viewport } from 'next';
import { Montserrat, IBM_Plex_Sans, IBM_Plex_Mono, Alegreya } from 'next/font/google';
import './globals.css';

/* Delhivery sets headings in Gotham (commercial licence) and body in IBM Plex Sans.
   Montserrat is the closest open-source match for Gotham; swap in licensed Gotham files here if purchased. */
const heading = Montserrat({ subsets: ['latin'], variable: '--font-heading', display: 'swap' });
const body = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });
/* logo tagline: bold serif matching the client's final logo */
const logo = Alegreya({ subsets: ['latin'], weight: ['800'], variable: '--font-logo', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://csd-express-draft.vercel.app';
const TITLE = 'CSD Supply Chain | Overnight cargo between Bengaluru and South India';
const DESCRIPTION =
  'Seven two-way cargo routes between Bengaluru and Hyderabad, Vijayawada, Chennai, Madurai, Coimbatore, Kochi and Calicut. Part load or full truck, with live tracking and digital proof of delivery.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'CSD Supply Chain',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: '/', siteName: 'CSD Supply Chain', title: TITLE, description: DESCRIPTION, locale: 'en_IN' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#F2F1EC',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable} ${logo.variable}`} suppressHydrationWarning>
      <head>
        {/* the intro animation plays once per browser session; repeat visits go straight to the page */}
        <script dangerouslySetInnerHTML={{ __html: "try{sessionStorage.getItem('csd-intro')&&document.documentElement.classList.add('no-intro')}catch(e){}" }} />
      </head>
      <body>
        <noscript>
          <style>{'.preloader{display:none}[data-split],[data-reveal]{visibility:visible}'}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
