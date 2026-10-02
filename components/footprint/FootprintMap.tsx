'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CITIES, HEIGHT_MAX_M, HEIGHT_SCALE, REGIONS, ROUTES, WINDOW, proj, smooth, type P2 } from './geo';

const STOPS = ROUTES.flatMap((r) => r.stops.slice(1).map((s) => ({ ...s, key: r.key })));
const sstep = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/* Pinned 3D scene: you arrive through cloud, the camera glides down over South India as you scroll,
   both corridors draw across the terrain with trucks on them, and each region opens a glass card on hover.
   three.js is loaded on demand so it stays out of the main bundle. */
export default function FootprintMap() {
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stopRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [shown, setShown] = useState(0); // last region shown, so the card keeps its content while fading out
  const [failed, setFailed] = useState(false);

  const pick = (i: number | null) => {
    activeRef.current = i;
    setActive(i);
    if (i !== null) setShown(i);
  };

  useEffect(() => {
    const pin = pinRef.current!, canvas = canvasRef.current!;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let cleanup = () => {};
    const progress = { target: RM ? 1 : 0, now: RM ? 1 : 0 };

    gsap.registerPlugin(ScrollTrigger);
    const st = RM ? null : ScrollTrigger.create({
      trigger: pin, start: 'top top', end: '+=230%', pin: true, scrub: true, anticipatePin: 1,
      onUpdate: (self) => { progress.target = self.progress; },
    });

    (async () => {
      const THREE = await import('three');
      if (disposed) return;
      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      } catch {
        setFailed(true);
        return;
      }
      const small = matchMedia('(max-width: 760px)').matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a882, 1.5));
      const sun = new THREE.DirectionalLight(0xfff1d6, 2.4); // same direction as the baked terrain light
      sun.position.set(-6, 6.2, -5);
      scene.add(sun);

      const disposables: { dispose: () => void }[] = [];
      const keep = <T extends { dispose: () => void }>(o: T) => { disposables.push(o); return o; };

      /* ---------- baked data (scripts/bake-map.py): real elevation, land mask, tree density ---------- */
      const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
      const pixels = (im: HTMLImageElement, size: number) => {
        const cv = document.createElement('canvas'); cv.width = cv.height = size;
        const g = cv.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(im, 0, 0, size, size);
        return g.getImageData(0, 0, size, size).data;
      };
      let imgs: HTMLImageElement[];
      try {
        imgs = await Promise.all(['/map/height.png', '/map/forest.png', '/map/mask.png'].map(loadImg));
      } catch {
        renderer.dispose(); setFailed(true); return;
      }
      if (disposed) { renderer.dispose(); return; }
      const HN = 1024, FN = 512;
      const hPix = pixels(imgs[0], HN), fPix = pixels(imgs[1], FN), mPix = pixels(imgs[2], FN);
      const [x0, zN] = proj(WINDOW.lon0, WINDOW.lat1), [x1, zS] = proj(WINDOW.lon1, WINDOW.lat0);
      const MW = x1 - x0, MD = zS - zN, MCX = (x0 + x1) / 2, MCZ = (zN + zS) / 2;
      const grid = (data: Uint8ClampedArray, n: number, x: number, z: number) => {
        const u = Math.min(n - 1.001, Math.max(0, ((x - x0) / MW) * n - 0.5)), w = Math.min(n - 1.001, Math.max(0, ((z - zN) / MD) * n - 0.5));
        const i = Math.floor(u), j = Math.floor(w), fu = u - i, fw = w - j, at = (a: number, b: number) => data[(b * n + a) * 4];
        return ((at(i, j) * (1 - fu) + at(i + 1, j) * fu) * (1 - fw) + (at(i, j + 1) * (1 - fu) + at(i + 1, j + 1) * fu) * fw) / 255;
      };
      const heightAt = (x: number, z: number) => { const v = grid(hPix, HN, x, z); return (v * v * HEIGHT_MAX_M / 1000) * HEIGHT_SCALE; };
      const forestAt = (x: number, z: number) => grid(fPix, FN, x, z);
      const landAt = (x: number, z: number) => grid(mPix, FN, x, z);
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

      const loader = new THREE.TextureLoader();
      const tex = (src: string, srgb: boolean) => {
        const t = keep(loader.load(src));
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return t;
      };
      const colorTex = tex('/map/color.webp', true), maskTex = tex('/map/mask.png', false);

      /* ---------- land: real relief, lit and shadowed in the bake so it costs nothing per frame ---------- */
      const SEGS = small ? 220 : 420;
      const landGeo = keep(new THREE.PlaneGeometry(MW, MD, SEGS, SEGS));
      landGeo.rotateX(-Math.PI / 2); landGeo.translate(MCX, 0, MCZ);
      const lp = landGeo.attributes.position;
      for (let i = 0; i < lp.count; i++) lp.setY(i, heightAt(lp.getX(i), lp.getZ(i)) + 0.003);
      const cut = (m: import('three').MeshBasicMaterial) => { m.alphaMap = maskTex; m.alphaTest = 0.5; m.alphaToCoverage = true; return keep(m); };
      scene.add(new THREE.Mesh(landGeo, cut(new THREE.MeshBasicMaterial({ map: colorTex }))));

      /* cliff: the coast outline repeated downwards reads as a solid block of layered rock */
      const flat = keep(new THREE.PlaneGeometry(MW, MD));
      flat.rotateX(-Math.PI / 2); flat.translate(MCX, 0, MCZ);
      const LAYERS = small ? 10 : 16, THICK = 0.46;
      const rockA = new THREE.Color(0xc2a074), rockB = new THREE.Color(0x7a5c3e);
      for (let k = 0; k < LAYERS; k++) {
        const t = k / (LAYERS - 1), col = rockA.clone().lerp(rockB, t).multiplyScalar(k % 3 === 1 ? 0.9 : 1);
        const m = new THREE.Mesh(flat, cut(new THREE.MeshBasicMaterial({ color: col })));
        m.position.y = -t * THICK;
        scene.add(m);
      }
      const shadowMesh = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(MW * 1.12, MD * 1.12)),
        keep(new THREE.MeshBasicMaterial({ map: tex('/map/shadow.png', true), transparent: true, depthWrite: false })),
      );
      shadowMesh.rotation.x = -Math.PI / 2; shadowMesh.position.set(MCX + 0.28, -THICK - 0.01, MCZ + 0.34);
      scene.add(shadowMesh);

      /* forests: thousands of instanced trees where the bake says it is wooded */
      const dummy = new THREE.Object3D(), tint = new THREE.Color();
      const TREES = small ? 3500 : 11000;
      const treeGeo = keep(new THREE.ConeGeometry(0.5, 1, 5)); treeGeo.translate(0, 0.5, 0);
      const trees = new THREE.InstancedMesh(treeGeo, keep(new THREE.MeshLambertMaterial()), TREES);
      let placed = 0;
      for (let tries = 0; placed < TREES && tries < TREES * 60; tries++) {
        const x = x0 + rnd() * MW, z = zN + rnd() * MD, f = forestAt(x, z);
        if (landAt(x, z) < 0.7 || rnd() > f * f) continue;
        const sz = 0.026 + rnd() * 0.026;
        dummy.position.set(x, heightAt(x, z), z);
        dummy.scale.set(sz * 0.6, sz * (1 + rnd() * 0.7), sz * 0.6);
        dummy.rotation.set(0, rnd() * 6.28, 0); dummy.updateMatrix();
        trees.setMatrixAt(placed, dummy.matrix);
        trees.setColorAt(placed, tint.setHSL(0.31 + rnd() * 0.05, 0.36 + rnd() * 0.16, 0.17 + rnd() * 0.1));
        placed++;
      }
      trees.count = placed;
      scene.add(trees);

      /* towns: buildings on a street grid, densest and tallest in the centre, glass towers in the big cities */
      const boxGeo = keep(new THREE.BoxGeometry(1, 1, 1)); boxGeo.translate(0, 0.5, 0);
      const GRID = small ? 0.062 : 0.052;
      const blocks: { x: number; z: number; w: number; d: number; h: number; ang: number; glass: boolean }[] = [];
      CITIES.forEach(([lon, lat, size]) => {
        const [cx, cz] = proj(lon, lat), R = 0.12 + 0.3 * size, ang = rnd() * 1.2, ca = Math.cos(ang), sa = Math.sin(ang);
        const span = Math.ceil(R / GRID) + 1;
        for (let gi = -span; gi <= span; gi++) for (let gj = -span; gj <= span; gj++) {
          if (gi % 4 === 0 || gj % 5 === 0) continue; // streets
          const lx = gi * GRID, lz = gj * GRID, r = Math.hypot(lx, lz);
          const edge = R * (0.8 + 0.35 * Math.sin(Math.atan2(lz, lx) * 3 + size * 9)); // ragged outskirts
          if (r > edge || rnd() > 1.15 - r / edge) continue;
          const x = cx + lx * ca - lz * sa, z = cz + lx * sa + lz * ca;
          if (landAt(x, z) < 0.75) continue;
          const core = Math.max(0, 1 - r / (edge * 0.8)), tall = size > 0.5 && core > 0.55 && rnd() < 0.35;
          blocks.push({
            x, z, ang,
            w: GRID * (0.55 + rnd() * 0.3), d: GRID * (0.55 + rnd() * 0.3),
            h: tall ? 0.12 + rnd() * 0.2 * size : 0.016 + core * (0.03 + rnd() * 0.07) * (0.5 + size),
            glass: tall,
          });
        }
      });
      const towns = new THREE.InstancedMesh(boxGeo, keep(new THREE.MeshLambertMaterial()), Math.max(1, blocks.length));
      blocks.forEach((bk, n) => {
        dummy.position.set(bk.x, heightAt(bk.x, bk.z), bk.z);
        dummy.scale.set(bk.w, bk.h, bk.d);
        dummy.rotation.set(0, bk.ang, 0); dummy.updateMatrix();
        towns.setMatrixAt(n, dummy.matrix);
        towns.setColorAt(n, bk.glass ? tint.setHSL(0.6 + rnd() * 0.03, 0.22, 0.62 + rnd() * 0.12) : tint.setHSL(0.08 + rnd() * 0.05, 0.08 + rnd() * 0.12, 0.78 + rnd() * 0.17));
      });
      towns.count = blocks.length;
      scene.add(towns);

      /* ---------- routes and trucks ---------- */
      const lift = (p: P2, up: number) => new THREE.Vector3(p[0], heightAt(p[0], p[1]) + up, p[1]);
      const routes = ROUTES.map((r) => {
        const pts = smooth(r.stops.map((s) => proj(s.at[0], s.at[1])), 22).map((p) => lift(p, 0.03));
        const curve = new THREE.CatmullRomCurve3(pts);
        const SEG = 260, RAD = 6;
        const tube = keep(new THREE.TubeGeometry(curve, SEG, 0.024, RAD, false));
        tube.setDrawRange(0, 0);
        scene.add(new THREE.Mesh(tube, keep(new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.5 }))));

        const truck = new THREE.Group();
        const box = (w: number, h: number, d: number, color: number, x: number, y: number) => {
          const m = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), keep(new THREE.MeshStandardMaterial({ color, roughness: 0.6 })));
          m.position.set(0, y, x); truck.add(m);
        };
        box(0.1, 0.1, 0.24, 0xffffff, -0.035, 0.085);  // container
        box(0.102, 0.03, 0.242, 0x1c2158, -0.035, 0.045); // navy skirt
        box(0.104, 0.008, 0.244, 0x179a47, -0.035, 0.064); // green stripe
        box(0.095, 0.085, 0.07, 0x1c2158, 0.125, 0.0725); // cab
        truck.scale.setScalar(0.8);
        truck.visible = false;
        scene.add(truck);
        return { curve, tube, truck, perSeg: RAD * 6, SEG };
      });

      /* ---------- pins ---------- */
      const tones = { ink: 0x1c2158, green: 0x179a47, soft: 0x8b8ea4 };
      const pins = REGIONS.map((r) => {
        const p = proj(r.at[0], r.at[1]), base = lift(p, 0);
        const g = new THREE.Group();
        g.position.copy(base);
        const mat = keep(new THREE.MeshStandardMaterial({ color: tones[r.tone], roughness: 0.4 }));
        const stem = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.011, 0.011, 0.55, 8)), mat);
        stem.position.y = 0.275;
        const head = new THREE.Mesh(keep(new THREE.SphereGeometry(0.075, 24, 16)), mat);
        head.position.y = 0.6;
        const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.09, 0.12, 32)), keep(new THREE.MeshBasicMaterial({ color: tones[r.tone], transparent: true, opacity: 0.55, side: THREE.DoubleSide })));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
        g.add(stem, head, ring);
        g.scale.setScalar(0);
        scene.add(g);
        return { g, head, ring, top: base.clone().add(new THREE.Vector3(0, 0.72, 0)), base };
      });
      const dotGeo = keep(new THREE.SphereGeometry(0.04, 16, 12));
      const stops = STOPS.map((s) => {
        const at = lift(proj(s.at[0], s.at[1]), 0.05);
        const m = new THREE.Mesh(dotGeo, keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })));
        m.position.copy(at); m.scale.setScalar(0); scene.add(m);
        return { m, at };
      });

      /* ---------- clouds ---------- */
      const cloudCv = document.createElement('canvas'); cloudCv.width = cloudCv.height = 256;
      const cg = cloudCv.getContext('2d')!;
      for (let i = 0; i < 16; i++) {
        const x = 70 + rnd() * 116, y = 90 + rnd() * 76, r = 34 + rnd() * 44;
        const gr = cg.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        cg.fillStyle = gr; cg.fillRect(0, 0, 256, 256);
      }
      const cloudTex = keep(new THREE.CanvasTexture(cloudCv));
      const clouds = Array.from({ length: small ? 16 : 24 }, (_, i) => {
        const stay = i % 4 === 0; // a few linger at the edges after the reveal
        const a = rnd() * Math.PI * 2, rad = stay ? 4.5 + rnd() * 2.5 : Math.sqrt(rnd()) * 5.2;
        const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0 })));
        const size = 5 + rnd() * 4.5;
        sp.scale.set(size, size * 0.62, 1);
        scene.add(sp);
        return { sp, stay, x: 0.4 + Math.cos(a) * rad, z: Math.sin(a) * rad, y: 1.9 + rnd() * 2.2, phase: rnd() * 6.28, dir: new THREE.Vector2(Math.cos(a), Math.sin(a)) };
      });

      /* ---------- camera path ---------- */
      const camA = new THREE.Vector3(0.4, 17, 1.2), lookA = new THREE.Vector3(0.4, 0, 0);
      const camB = new THREE.Vector3(-2.6, 11.5, 14.2), lookB = new THREE.Vector3(-1.3, 0, 0.3);
      const camC = new THREE.Vector3(1.9, 7.5, 8.7), lookC = new THREE.Vector3(-1.15, 0.1, -0.8);
      const camPos = new THREE.Vector3(), look = new THREE.Vector3(), lookNow = new THREE.Vector3().copy(lookA), v = new THREE.Vector3(), tan = new THREE.Vector3();


      let W = 1, H = 1;
      const resize = () => {
        W = pin.clientWidth; H = pin.clientHeight;
        renderer.setSize(W, H, false);
        camera.aspect = W / H; camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize); ro.observe(pin); resize();

      let visible = true;
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '200px' });
      io.observe(pin);

      const place = (el: HTMLElement | null, at: import('three').Vector3, alpha: number) => {
        if (!el) return null;
        v.copy(at).project(camera);
        const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
        el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        el.style.opacity = String(v.z < 1 ? alpha : 0);
        el.style.pointerEvents = alpha > 0.6 ? '' : 'none';
        return [x, y] as const;
      };

      const clock = new THREE.Clock();
      let raf = 0;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        const t = clock.getElapsedTime();
        const dev = process.env.NODE_ENV !== 'production' ? (window as unknown as { __mapP?: number }).__mapP : undefined; // dev-only override for checking a fixed scroll position
        if (dev !== undefined) { progress.now = dev; lookNow.copy(look); } else progress.now += (progress.target - progress.now) * 0.12;
        const p = progress.now;

        /* camera: straight down through cloud -> wide oblique -> closer over the corridors */
        const k1 = sstep(0.05, 0.6, p), k2 = sstep(0.55, 1, p);
        camPos.copy(camA).lerp(camB, k1).lerp(camC, k2);
        look.copy(lookA).lerp(lookB, k1).lerp(lookC, k2);
        let hov = activeRef.current;
        lookNow.lerp(look, 0.08);
        const fit = Math.min(2.3, Math.max(1, 1.35 / camera.aspect)); // pull back on tall screens
        camPos.sub(look).multiplyScalar(fit).add(look);
        camera.position.copy(camPos);
        camera.lookAt(lookNow);

        /* clouds part and thin out; a few keep drifting */
        const part = sstep(0.04, 0.6, p);
        clouds.forEach((cl) => {
          const push = 1 + part * (cl.stay ? 0.5 : 2.4);
          cl.sp.position.set(cl.x * push + Math.sin(t * 0.08 + cl.phase) * 0.35, cl.y + part * 0.6, cl.z * push + Math.cos(t * 0.06 + cl.phase) * 0.25);
          cl.sp.material.opacity = cl.stay ? 0.95 - part * 0.5 : 0.95 * (1 - sstep(0.1, 0.55, p));
        });
        if (veilRef.current) veilRef.current.style.opacity = String(1 - sstep(0.0, 0.16, p));

        /* routes draw, trucks lead them, then keep circulating once the map is fully revealed */
        const draw = sstep(0.42, 0.86, p);
        routes.forEach((r, i) => {
          r.tube.setDrawRange(0, Math.floor(draw * r.SEG) * r.perSeg);
          const u = draw < 1 ? draw : RM ? 0.6 : (t * 0.035 + i * 0.37) % 1;
          r.truck.visible = draw > 0.01;
          r.curve.getPointAt(Math.min(0.999, u), r.truck.position);
          r.curve.getTangentAt(Math.min(0.999, u), tan);
          r.truck.lookAt(v.copy(r.truck.position).add(tan));
        });

        /* pins and labels rise in near the end */
        if (hov !== null && sstep(0.5 + hov * 0.05, 0.68 + hov * 0.05, p) < 0.6) {
          activeRef.current = hov = null;
          setActive(null);
        }
        pins.forEach((pn, i) => {
          const a = sstep(0.5 + i * 0.05, 0.68 + i * 0.05, p), on = hov === i;
          pn.g.scale.setScalar(a);
          pn.head.scale.setScalar(pn.head.scale.x + ((on ? 1.5 : 1) - pn.head.scale.x) * 0.15);
          pn.ring.scale.setScalar(1 + ((t * 0.6 + i * 0.3) % 1) * 1.6);
          (pn.ring.material as import('three').MeshBasicMaterial).opacity = 0.5 * (1 - ((t * 0.6 + i * 0.3) % 1));
          place(labelRefs.current[i], pn.top, a * (hov === null || on ? 1 : 0.45));
        });
        const sa = sstep(0.78, 0.94, p);
        stops.forEach((s, i) => { s.m.scale.setScalar(sa); place(stopRefs.current[i], s.at, sa * (hov === null ? 1 : 0.35)); });

        /* glass card follows the hovered pin on wide screens; CSS docks it to the bottom on phones */
        const card = cardRef.current;
        if (card && hov !== null && W > 760) {
          v.copy(pins[hov].top).project(camera);
          const lx = (v.x * 0.5 + 0.5) * W, ly = (-v.y * 0.5 + 0.5) * H, cw = card.offsetWidth, ch = card.offsetHeight;
          const gap = (labelRefs.current[hov]?.firstElementChild?.clientWidth ?? 120) / 2 + 14; // clear the label chip
          const x = lx + gap + cw > W - 16 ? lx - gap - cw : lx + gap;
          const y = Math.max(88, Math.min(H - ch - 16, ly - ch * 0.4));
          card.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        } else if (card && W <= 760) card.style.transform = '';

        renderer.render(scene, camera);
      };
      frame();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect(); io.disconnect();
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
      };
    })();

    return () => { disposed = true; st?.kill(); cleanup(); };
  }, []);

  const r = REGIONS[shown];
  return (
    <section className="fp" id="coverage" aria-label="Network footprint">
      <div className="fp-pin" ref={pinRef} onPointerDown={(e) => { if (!(e.target as Element).closest('.fp-label')) pick(null); }}>
        <canvas ref={canvasRef} className="fp-canvas" aria-hidden="true" />
        <div className="fp-veil" ref={veilRef} aria-hidden="true" />
        <div className="fp-head">
          <p className="dx-eyebrow">Network footprint</p>
          <h2 className="dx-h2">Five states and territories. One network.</h2>
        </div>

        {failed ? (
          <ul className="fp-fallback">
            {REGIONS.map((x) => <li key={x.name}><b>{x.name}</b><span>{x.tag}</span></li>)}
          </ul>
        ) : (
          <>
            {STOPS.map((s, i) => (
              <span key={s.key + s.name} className="fp-stop" ref={(el) => { stopRefs.current[i] = el; }} aria-hidden="true"><i>{s.name}</i></span>
            ))}
            {REGIONS.map((x, i) => (
              <button
                key={x.name} type="button" className={`fp-label ${x.tone}${active === i ? ' on' : ''}`}
                ref={(el) => { labelRefs.current[i] = el; }}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') pick(i); }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') pick(null); }}
                onFocus={() => pick(i)} onBlur={() => pick(null)}
                onClick={() => pick(activeRef.current === i && matchMedia('(hover:none)').matches ? null : i)}
                aria-expanded={active === i}
              >
                <span>{x.name}</span>
              </button>
            ))}
            <div className={`fp-card${active !== null ? ' show' : ''}`} ref={cardRef} role="status">
              <p className="tag">{r.tag}</p>
              <h3 className="dx-h3">{r.name}</h3>
              <p className="txt">{r.text}</p>
              <dl>{r.rows.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>
            </div>
            <div className="fp-legend" aria-hidden="true">
              <span><i className="ink" />Hyderabad lane</span>
              <span><i className="green" />Vijayawada lane</span>
              <span className="hint">Hover or tap a region</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
