import Image from 'next/image';
import LogoMark from './dx/LogoMark';

/* Small side-view truck with the CSD mark already painted on. Decorative. */
export default function MiniTruck() {
  return (
    <span className="mini-truck" aria-hidden="true">
      <Image src="/trucks/truck-side.png" alt="" width={1282} height={503} sizes="140px" />
      <LogoMark className="ts-logo" />
    </span>
  );
}
