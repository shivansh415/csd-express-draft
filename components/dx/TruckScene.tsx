import Image from 'next/image';
import type { ReactNode } from 'react';
import LogoMark from './LogoMark';

type Props = {
  tone?: 'paper' | 'ink' | 'white' | 'dusk';
  /** 'load' = truck drives in on page load (hero use); 'scroll' = it drives in as the section pins */
  enter?: 'load' | 'scroll';
  children: ReactNode;
};

/* Side-view truck with the CSD mark painted onto the container as the user scrolls. Animated in DirectionFX. */
export default function TruckScene({ tone = 'paper', enter = 'scroll', children }: Props) {
  return (
    <section className={`ts ts-${tone}`} data-truck-scene data-enter={enter}>
      <div className="ts-pin">
        <div className="ts-copy">{children}</div>
        <div className="ts-stage">
          <div className="ts-truck">
            <Image src="/trucks/truck-side.png" alt="CSD Express truck, side view" width={1282} height={503} priority sizes="(max-width: 1200px) 92vw, 1100px" />
            <LogoMark className="ts-logo" />
            <span className="ts-tag">Millions of Miles &ndash; Millions of Smiles</span>
            <i className="ts-shadow" />
          </div>
          <div className="ts-road"><i /></div>
        </div>
        <p className="ts-hint" aria-hidden="true"><i />Scroll to paint the fleet</p>
      </div>
    </section>
  );
}
