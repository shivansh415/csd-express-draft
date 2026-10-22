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
   data-split (line reveal), data-reveal (fade up), data-parallax, data-float, data-count,
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
      /* hero: the truck drives in, then the tracker wipes onto the container */
      if ($('.ht')) {
        gsap.from('.ht-truck', { x: () => -window.innerWidth, duration: 2.2, ease: 'power3.out', delay: 0.1 });
        gsap.from('.ht .ts-road i', { backgroundPositionX: 900, duration: 2.2, ease: 'power3.out', delay: 0.1 });
        /* the tracker panel stays hidden (CSS) with a scroll cue on the container; the first bit of scrolling
           (or keyboard focus reaching it) makes the panel cover the container, then its contents settle in */
        const parts = $$('.ct-form > *, .ct-top, .ct-route, .ct-steps li');
        gsap.set(parts, { autoAlpha: 0, y: 14 });
        const cue = gsap.fromTo('.ct-cue', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 1.9 });
        const reveal = gsap.timeline({ paused: true })
          .fromTo('.ct-in', { clipPath: 'inset(0% 100% 0% 0% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.1, ease: 'power3.inOut' })
          .to(parts, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, 0.55)
          .set('.ct-in', { clipPath: 'none' }); // keep an inline value: the CSS default is the hidden state
        let shown = false;
        const show = () => {
          if (shown) return;
          shown = true;
          cue.kill();
          gsap.to('.ct-cue', { autoAlpha: 0, y: -12, duration: 0.35, ease: 'power2.in' });
          reveal.play();
        };
        const onScroll = () => { if (window.scrollY > 12) show(); };
        window.addEventListener('scroll', onScroll, { passive: true, signal });
        $('.ct')?.addEventListener('focusin', show, { signal });
        onScroll(); // page restored part-way down
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
        const sp = new SplitText(el, { type: 'lines', mask: 'lines', aria: 'none' });
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
        const words = new SplitText(commit, { type: 'words', wordsClass: 'w', aria: 'none' });
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
        gsap.set('#commitText', { color: '#1C2158' });
        gsap.set('.ct-in', { clipPath: 'none' });
        gsap.set('.ct-cue', { display: 'none' });
        $$('.pr-step').forEach((el) => el.classList.add('on'));
        $('#pausePlay')?.classList.add('play');
      });
    } else if (pre && !document.documentElement.classList.contains('no-intro')) {
      lenis?.stop();
      try { sessionStorage.setItem('csd-intro', '1'); } catch { /* storage blocked: intro shows again next time */ }
      ctx.add(() => {
        const count = { v: 0 };
        const countEl = $('#preCount');
        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, paused: true });
        tl.from('.preloader .mark .c', { drawSVG: '0%', duration: 0.65 }, 0.05)
          .from('.preloader .mark .s', { drawSVG: '0%', duration: 0.65 }, 0.22)
          .from('.preloader .mark .d', { drawSVG: '0%', duration: 0.65 }, 0.4)
          .from('.preloader .mark .r', { drawSVG: '0%', duration: 0.35 }, 0.65)
          .to('.preloader .mark path', { fillOpacity: 1, duration: 0.35, stagger: 0.05, ease: 'power1.out' }, 0.82)
          .to('.pre-word span', { y: 0, duration: 0.6, ease: 'osmo' }, 0.9)
          .to('.pre-tag', { opacity: 1, duration: 0.4 }, 1.05)
          .to(count, { v: 100, duration: 1.4, onUpdate: () => { if (countEl) countEl.textContent = String(Math.round(count.v)).padStart(2, '0'); } }, 0.05)
          .addLabel('out', 1.6)
          .to('.pre-count, .pre-route, .pre-tag', { autoAlpha: 0, duration: 0.3 }, 'out')
          .to('.preloader .mark, .pre-word', { y: -30, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 'out')
          .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'expo.inOut' }, 'out+=0.15')
          .add(() => { lenis?.start(); init(); }, 'out+=0.15')
          .set(pre, { display: 'none' });
        gsap.set(pre, { clipPath: 'inset(0 0 0% 0)' });
        Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 700))]).then(() => { if (alive) tl.play(); });
      });
    } else {
      if (pre) pre.style.display = 'none';
      init();
    }

    document.fonts?.ready.then(() => alive && ScrollTrigger.refresh());
    /* re-measure pinned sections after a real width change (window resize, device rotation); without this the
       pin spacers keep their old width and the page scrolls sideways */
    let lastW = window.innerWidth, resizeT = 0;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastW) return; // mobile address-bar show/hide only changes height
      lastW = window.innerWidth;
      clearTimeout(resizeT);
      resizeT = window.setTimeout(() => alive && ScrollTrigger.refresh(), 250);
    }, { signal });

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
