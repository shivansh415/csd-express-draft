import Preloader from '@/components/Preloader';
import DxNav from '@/components/dx/DxNav';
import TruckScene from '@/components/dx/TruckScene';
import TrackDesk from '@/components/TrackDesk';
import Marquee from '@/components/Marquee';
import Corridors from '@/components/Corridors';
import FootprintMap from '@/components/footprint/FootprintMap';
import Services from '@/components/Services';
import Process from '@/components/Process';
import Story from '@/components/Story';
import Commit from '@/components/Commit';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import SiteFX from '@/components/SiteFX';

export default function Home() {
  return (
    <>
      <Preloader />
      <DxNav home="/" />
      <main id="top">
        <TruckScene tone="paper" enter="load">
          <p className="dx-eyebrow" data-reveal>Overnight cargo from Bengaluru</p>
          <h1 className="dx-h1" data-split>Loaded by dusk.<br />Delivered by <em>sunrise.</em></h1>
          <p className="dx-lede" data-reveal="1">Two dedicated corridors to Hyderabad and Vijayawada, running every night.</p>
          <div className="dx-actions" data-reveal="2">
            <a className="btn solid magnetic" href="#track"><span>Track a shipment</span></a>
            <a className="btn magnetic" href="#lanes"><span>See the corridors</span></a>
          </div>
        </TruckScene>
        <TrackDesk />
        <Marquee />
        <Corridors />
        <FootprintMap />
        <Services />
        <Process />
        <Story />
        <Commit />
        <Contact />
      </main>
      <Footer />
      <SiteFX />
    </>
  );
}
