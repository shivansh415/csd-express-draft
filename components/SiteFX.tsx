'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';

/* All motion for the site. Markup lives in server components; this attaches to it via data attributes and ids:
   data-split (line reveal), data-reveal (fade up), data-parallax, data-float, data-count, data-truck-scene,
   plus #preloader, #nav, #marqueeTrack, .ht, #procPin, #commitText when they are on the page. */
export default function SiteFX() {
  const path = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase);
    CustomEase.create('osmo', '0.625,0.05,0,1');
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TOUCH = matchMedia('(hover:none)').matches;
    const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
    const $$ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => [...c.querySelectorAll<T>(s)];
    const abort = new AbortController();
    const { signal } = abort;
    let alive = true;

    /* ---------- smooth scroll + anchors ---------- */
    let lenis: Lenis | null = null;
    const raf = (t: number) => lenis?.raf(t * 1000);
    if (!TOUCH && !RM) {
      lenis = new Lenis({ lerp: 0.1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }
    document.addEventListener('click', (e) => {
      const a = (e.target as Element).closest?.('a[href^="#"]');
      const h = a?.getAttribute('href');
      const el = h && h.length > 1 ? document.querySelector<HTMLElement>(h) : null;
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
    }, { signal });

    /* ---------- things that work with or without motion ---------- */
    $$('.copy').forEach((b) => b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy ?? '');
        b.textContent = 'Copied';
      } catch {
        b.textContent = 'Press ⌘C';
      }
      setTimeout(() => (b.textContent = 'Copy'), 1600);
    }, { signal }));

    const ctx = gsap.context(() => {});
    const pre = $('#preloader');

    /* ---------- everything scroll- and intro-driven; runs once the preloader lifts ---------- */
    const init = () => ctx.add(() => {
      /* pins first, in page order, so later triggers measure with their spacing in place */
      $$('[data-truck-scene]').forEach((scene) => {
        const q = gsap.utils.selector(scene);
        const truck = q('.ts-truck');
        const paths = q('.ts-truck > .ts-logo path');
        const onLoad = scene.dataset.enter === 'load';
        gsap.set(paths, { fillOpacity: 0 });
        if (onLoad) {
          gsap.from(truck, { x: () => -window.innerWidth, duration: 1.9, ease: 'power3.out', delay: 0.2 });
          gsap.from(q('.ts-road i'), { backgroundPositionX: 900, duration: 1.9, ease: 'power3.out', delay: 0.2 });
        }
        const tl = gsap.timeline({ scrollTrigger: { trigger: q('.ts-pin'), start: 'top top', end: onLoad ? '+=150%' : '+=190%', pin: true, scrub: 0.6, anticipatePin: 1 } });
        const t0 = onLoad ? 0.04 : 0.3;
        if (!onLoad) {
          tl.fromTo(truck, { x: () => -window.innerWidth }, { x: 0, duration: 0.3, ease: 'power2.out' }, 0)
            .fromTo(q('.ts-road i'), { backgroundPositionX: 900 }, { backgroundPositionX: 0, duration: 0.3, ease: 'power2.out' }, 0);
        }
        const span = 0.86 - t0;
        tl.from(q('.ts-logo .c'), { drawSVG: '0%', duration: span * 0.34, ease: 'none' }, t0)
          .from(q('.ts-logo .s'), { drawSVG: '0%', duration: span * 0.34, ease: 'none' }, t0 + span * 0.2)
          .from(q('.ts-logo .d'), { drawSVG: '0%', duration: span * 0.34, ease: 'none' }, t0 + span * 0.42)
          .from(q('.ts-logo .r'), { drawSVG: '0%', duration: span * 0.2, ease: 'none' }, t0 + span * 0.66)
          .to(paths, { fillOpacity: 1, duration: span * 0.16, stagger: span * 0.03, ease: 'power1.out' }, t0 + span * 0.8)
          .fromTo(q('.ts-tag'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.07 }, 0.88)
          .to(q('.ts-hint'), { autoAlpha: 0, duration: 0.05 }, t0)
          .to({}, { duration: 0.05 }, 0.95);
      });

      /* hero: the truck drives in, then the tracker wipes onto the container */
      if ($('.ht')) {
        gsap.from('.ht-truck', { x: () => -window.innerWidth, duration: 1.8, ease: 'power3.out', delay: 0.1 });
        gsap.from('.ht .ts-road i', { backgroundPositionX: 900, duration: 1.8, ease: 'power3.out', delay: 0.1 });
        gsap.fromTo('.ct-in', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power2.inOut', delay: 1.45, clearProps: 'clipPath' });
      }

      /* process: horizontal scroll with the truck riding the rail; each step switches on as the truck reaches it */
      const procTrack = $('#procTrack');
      if (procTrack) {
        const fill = $('#procFill')!;
        const rider = $('#procTruck')!;
        const cards = $$('.pr-step', procTrack);
        const mm = gsap.matchMedia();
        mm.add('(min-width: 901px)', () => {
          const dist = () => Math.max(0, procTrack.scrollWidth - procTrack.parentElement!.clientWidth);
          cards.forEach((c, i) => c.classList.toggle('on', i === 0));
          gsap.to(procTrack, {
            x: () => -dist(),
            ease: 'none',
            scrollTrigger: {
              trigger: '#procPin', start: 'top top', end: () => '+=' + dist() * 1.1, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
              onUpdate: (self) => {
                fill.style.width = self.progress * 100 + '%';
                rider.style.left = `calc(${self.progress} * (100% - 110px))`;
                const reached = self.progress * (cards.length - 1) + 0.35;
                cards.forEach((c, i) => c.classList.toggle('on', i <= reached));
              },
            },
          });
        });
        mm.add('(max-width: 900px)', () => {
          cards.forEach((c) => {
            c.classList.remove('on');
            ScrollTrigger.create({ trigger: c, start: 'top 78%', once: true, onEnter: () => c.classList.add('on') });
          });
        });
      }

      /* relaunch: the pause icon turns into play when the story scrolls in */
      const pp = $('#pausePlay');
      if (pp) ScrollTrigger.create({ trigger: pp, start: 'top 80%', once: true, onEnter: () => gsap.delayedCall(0.7, () => pp.classList.add('play')) });

      /* headline line reveals */
      $$('[data-split]').forEach((el) => {
        const sp = new SplitText(el, { type: 'lines', mask: 'lines' });
        gsap.set(el, { visibility: 'visible' });
        gsap.from(sp.lines, { yPercent: 110, duration: 1.2, stagger: 0.09, ease: 'osmo', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });

      /* fade-up reveals; siblings stagger via data-reveal="1|2|3" */
      $$('[data-reveal]').forEach((el) => {
        const order = Number(el.dataset.reveal) || 0;
        gsap.fromTo(el, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'osmo', delay: 0.15 + order * 0.09, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      });

      $$('[data-float]').forEach((el, i) => {
        gsap.to(el, { y: -10, duration: 2.4 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.3 });
      });
      $$('[data-parallax]').forEach((el) => {
        const amt = Number(el.dataset.parallax) || 10;
        gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      $$('[data-count]').forEach((el) => {
        const end = Number(el.dataset.count);
        const obj = { v: end > 100 ? end - 60 : 0 };
        gsap.to(obj, { v: end, duration: 1.6, ease: 'power3.out', snap: { v: 1 }, onUpdate: () => { el.textContent = String(Math.round(obj.v)); }, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });

      /* nav: glass on scroll, hide going down, show going up */
      const nav = $('#nav');
      if (nav) {
        let lastY = 0;
        ScrollTrigger.create({
          start: 0, end: 'max',
          onUpdate: (self) => {
            const y = self.scroll();
            nav.classList.toggle('scrolled', y > 40);
            nav.classList.toggle('hide', y > 400 && y > lastY + 4);
            if (y < lastY - 4) nav.classList.remove('hide');
            lastY = y;
          },
        });
      }

      /* marquee speeds up with scroll velocity */
      if ($('#marqueeTrack')) {
        const mq = gsap.to('#marqueeTrack', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
        ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { gsap.to(mq, { timeScale: gsap.utils.clamp(-4, 4, 1 + self.getVelocity() / 600), duration: 0.6, overwrite: true }); } });
      }

      /* service glyphs redraw on hover */
      $$('.sv-row').forEach((row) => {
        const shapes = $$('.glyph *', row);
        row.addEventListener('mouseenter', () => {
          gsap.fromTo(shapes, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, stagger: 0.05, ease: 'power2.inOut', overwrite: true });
        }, { signal });
      });

      /* timeline line + commitment words scrub */
      if ($('.tl-draw')) {
        gsap.from('.tl-draw', { drawSVG: '0%', ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 80%', end: 'bottom 60%', scrub: 0.6 } });
      }
      const commit = $('#commitText');
      if (commit) {
        const words = new SplitText(commit, { type: 'words', wordsClass: 'w' });
        gsap.to(words.words, { color: '#1C2158', stagger: 0.08, ease: 'none', scrollTrigger: { trigger: commit, start: 'top 75%', end: 'bottom 45%', scrub: 0.5 } });
      }

      /* magnetic buttons */
      if (!TOUCH) {
        $$('.magnetic').forEach((btn) => {
          const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
          const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
          btn.addEventListener('mousemove', (e) => {
            const r = btn.getBoundingClientRect();
            xTo((e.clientX - r.left - r.width / 2) * 0.28);
            yTo((e.clientY - r.top - r.height / 2) * 0.4);
          }, { signal });
          btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); }, { signal });
        });
      }

      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });

    if (RM) {
      if (pre) pre.style.display = 'none';
      ctx.add(() => {
        gsap.set('[data-split],[data-reveal]', { visibility: 'visible' });
        gsap.set('.ts-tag', { autoAlpha: 1 });
        gsap.set('.ts-truck > .ts-logo path', { fillOpacity: 1 });
        gsap.set('#commitText', { color: '#1C2158' });
        $$('.pr-step').forEach((el) => el.classList.add('on'));
        $('#pausePlay')?.classList.add('play');
      });
    } else if (pre) {
      lenis?.stop();
      ctx.add(() => {
        const count = { v: 0 };
        const countEl = $('#preCount');
        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, paused: true });
        tl.from('.preloader .mark .c', { drawSVG: '0%', duration: 0.9 }, 0.1)
          .from('.preloader .mark .s', { drawSVG: '0%', duration: 0.9 }, 0.35)
          .from('.preloader .mark .d', { drawSVG: '0%', duration: 0.9 }, 0.6)
          .from('.preloader .mark .r', { drawSVG: '0%', duration: 0.5 }, 0.95)
          .to('.preloader .mark path', { fillOpacity: 1, duration: 0.45, stagger: 0.06, ease: 'power1.out' }, 1.2)
          .to('.pre-word span', { y: 0, duration: 0.8, ease: 'osmo' }, 1.3)
          .to('.pre-tag', { opacity: 1, duration: 0.5 }, 1.55)
          .to(count, { v: 100, duration: 1.9, onUpdate: () => { if (countEl) countEl.textContent = String(Math.round(count.v)).padStart(2, '0'); } }, 0.1)
          .addLabel('out', 2.25)
          .to('.pre-count, .pre-route, .pre-tag', { autoAlpha: 0, duration: 0.4 }, 'out')
          .to('.preloader .mark, .pre-word', { y: -40, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 'out')
          .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1.0, ease: 'expo.inOut' }, 'out+=0.25')
          .add(() => { lenis?.start(); init(); }, 'out+=0.25')
          .set(pre, { display: 'none' });
        gsap.set(pre, { clipPath: 'inset(0 0 0% 0)' });
        Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(() => { if (alive) tl.play(); });
      });
    } else {
      init();
    }

    document.fonts?.ready.then(() => alive && ScrollTrigger.refresh());

    return () => {
      alive = false;
      abort.abort();
      ctx.revert();
      gsap.ticker.remove(raf);
      lenis?.destroy();
    };
  }, [path]);

  return null;
}
