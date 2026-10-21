import Image from 'next/image';

/* Small side-view truck for progress rails. Decorative. */
export default function MiniTruck() {
  return (
    <span className="mini-truck" aria-hidden="true">
      <Image src="/trucks/truck-side.png" alt="" width={1282} height={503} sizes="140px" />
    </span>
  );
}
