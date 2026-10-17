import Preloader from '@/components/Preloader';
import DxNav from '@/components/dx/DxNav';
import HeroTruck from '@/components/hero/HeroTruck';
import Marquee from '@/components/Marquee';
import Partners from '@/components/Partners';
import NetworkMap from '@/components/network/NetworkMap';
import WhyUs from '@/components/WhyUs';
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
        <HeroTruck />
        <Marquee />
        <Partners />
        <Process />
        <NetworkMap />
        <Services />
        <WhyUs />
        <Story />
        <Commit />
        <Contact />
      </main>
      <Footer />
      <SiteFX />
    </>
  );
}
