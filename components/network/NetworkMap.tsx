'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CITY_AT, HEIGHT_MAX_M, HEIGHT_SCALE, ROUTES, STOPS, TOWN_SIZE, WIDE, ZONE, proj, routeLine, stopsOf, type P2 } from './geo';

type Mode = '2d' | '3d';
/* route line: solid route colour with soft light pulses travelling outbound and inbound (every route runs both ways) */
const FLOW_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLOW_FS = `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; uniform float uRep; varying vec2 vUv;
void main() {
  float x = vUv.x * uRep;
  float outb = smoothstep(0.87, 1.0, fract(x - uTime * 0.45));
  float inb = smoothstep(0.87, 1.0, fract(-x - uTime * 0.45 + 0.5));
  gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.45 * max(outb, inb)), uOpacity);
  #include <colorspace_fragment>
}`;
const sstep = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const BASE = 0.07;   // plinth height of the raised corridor land
const RISE_MS = 1500;
/* towns named even when no route is picked: the hub, every terminus and the Salem junction */
const MAJOR = new Set<string>(['Bengaluru', 'Salem', ...ROUTES.map((r) => stopsOf(r).at(-1)!)]);

/* Pinned map section. Scroll brings you down through cloud onto a flat 2D map of South India with every route drawn.
   "3D view" raises the land along the routes into a diorama (real relief, forests, towns, cliff edges) while the rest
   of the map stays flat. Camera only moves on scroll, mode change or route selection, never on hover. */
export default function NetworkMap() {
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const modeRef = useRef<Mode>('2d');
  const selRef = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  const dirtyRef = useRef(true);
  const [mode, setMode] = useState<Mode>('2d');
  const [sel, setSel] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const changeMode = (m: Mode) => { modeRef.current = m; setMode(m); dirtyRef.current = true; };
  const select = (k: string | null) => { selRef.current = k; setSel(k); dirtyRef.current = true; };
  const hover = (k: string | null) => { hoverRef.current = k; };

  useEffect(() => {
    const pin = pinRef.current!, canvas = canvasRef.current!;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let cleanup = () => {};
    const progress = { target: RM ? 1 : 0, now: RM ? 1 : 0 };

    gsap.registerPlugin(ScrollTrigger);
    const st = RM ? null : ScrollTrigger.create({
      trigger: pin, start: 'top top', end: '+=140%', pin: true, scrub: true, anticipatePin: 1,
      onUpdate: (self) => { progress.target = self.progress; },
    });

    (async () => {
      /* heavy setup waits for an idle moment and yields between steps, so it never stalls scrolling */
      const idle = () => new Promise<void>((r) => ('requestIdleCallback' in window ? window.requestIdleCallback(() => r(), { timeout: 1500 }) : setTimeout(r, 300)));
      const yieldNow = () => new Promise<void>((r) => setTimeout(r, 0));
      await idle();
      const THREE = await import('three');
      if (disposed) return;
      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      } catch {
        setFailed(true);
        return;
      }
      const small = matchMedia('(max-width: 760px)').matches;
      const MAX_DPR = Math.min(window.devicePixelRatio, small ? 1.5 : 1.75);
      let dpr = MAX_DPR;
      renderer.setPixelRatio(dpr);
      const HAZE = new THREE.Color(0xcde4ec); // same as the open sea at the map's edges, so the map never shows a border
      renderer.setClearColor(HAZE);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(HAZE, 30, 60);
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a882, 1.6));
      const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); // same direction as the baked terrain light
      sun.position.set(-6, 6.2, -5);
      scene.add(sun);

      const disposables: { dispose: () => void }[] = [];
      const keep = <T extends { dispose: () => void }>(o: T) => { disposables.push(o); return o; };
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

      /* ---------- baked data (scripts/bake-map.py) ---------- */
      const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
      const canvasOf = (n: number) => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
      const pixels = (im: CanvasImageSource, n: number) => {
        const g = canvasOf(n).getContext('2d', { willReadFrequently: true })!;
        g.drawImage(im, 0, 0, n, n);
        return g.getImageData(0, 0, n, n).data;
      };
      let imgs: HTMLImageElement[];
      try {
        imgs = await Promise.all(['/map/height.png', '/map/forest.png', '/map/land.png'].map(loadImg));
      } catch {
        renderer.dispose(); setFailed(true); return;
      }
      if (disposed) { renderer.dispose(); return; }

      const [zx0, zzN] = proj(ZONE.lon0, ZONE.lat1), [zx1, zzS] = proj(ZONE.lon1, ZONE.lat0);
      const ZW = zx1 - zx0, ZD = zzS - zzN, ZCX = (zx0 + zx1) / 2, ZCZ = (zzN + zzS) / 2;
      const sampler = (data: Uint8ClampedArray, n: number) => (x: number, z: number) => {
        const u = Math.min(n - 1.001, Math.max(0, ((x - zx0) / ZW) * n - 0.5)), w = Math.min(n - 1.001, Math.max(0, ((z - zzN) / ZD) * n - 0.5));
        const i = Math.floor(u), j = Math.floor(w), fu = u - i, fw = w - j, at = (a: number, b: number) => data[(b * n + a) * 4];
        return ((at(i, j) * (1 - fu) + at(i + 1, j) * fu) * (1 - fw) + (at(i, j + 1) * (1 - fu) + at(i + 1, j + 1) * fu) * fw) / 255;
      };
      const hRaw = sampler(pixels(imgs[0], 1024), 1024);
      const heightAt = (x: number, z: number) => { const v = hRaw(x, z); return (v * v * HEIGHT_MAX_M / 1000) * HEIGHT_SCALE; };
      const forestAt = sampler(pixels(imgs[1], 512), 512);
      const landAt = sampler(pixels(imgs[2], 512), 512);
      await yieldNow(); if (disposed) { renderer.dispose(); return; }

      /* ---------- the corridor zone: a band along every route plus a pad around each town, clipped to land ---------- */
      const lines = ROUTES.map((r) => routeLine(r));
      const ZN = 2048;
      const zoneCv = canvasOf(ZN), zg = zoneCv.getContext('2d')!;
      zg.setTransform(ZN / ZW, 0, 0, ZN / ZD, -zx0 * ZN / ZW, -zzN * ZN / ZD);
      zg.fillStyle = zg.strokeStyle = '#fff';
      zg.lineCap = zg.lineJoin = 'round';
      zg.lineWidth = 0.4;
      lines.forEach((ln) => {
        zg.beginPath(); ln.forEach(([x, z], i) => (i ? zg.lineTo(x, z) : zg.moveTo(x, z))); zg.stroke();
        for (let i = 0; i < ln.length; i += 5) { zg.beginPath(); zg.arc(ln[i][0], ln[i][1], 0.17 + rnd() * 0.16, 0, Math.PI * 2); zg.fill(); }
      });
      STOPS.forEach((s) => {
        const [x, z] = proj(s.at[0], s.at[1]);
        zg.beginPath(); zg.arc(x, z, 0.2 + 0.3 * (TOWN_SIZE[s.name] ?? 0.25), 0, Math.PI * 2); zg.fill();
      });
      const landCv = canvasOf(ZN), lg = landCv.getContext('2d')!;
      lg.drawImage(imgs[2], 0, 0, ZN, ZN);
      const ld = lg.getImageData(0, 0, ZN, ZN);
      for (let i = 0; i < ld.data.length; i += 4) { ld.data[i + 3] = ld.data[i]; ld.data[i] = ld.data[i + 1] = ld.data[i + 2] = 255; }
      lg.putImageData(ld, 0, 0);
      zg.setTransform(1, 0, 0, 1, 0, 0);
      zg.globalCompositeOperation = 'destination-in';
      zg.drawImage(landCv, 0, 0);
      const ZS = 512;
      const zoneData = pixels(zoneCv, ZS);
      const zoneAt = (x: number, z: number) => zoneData[(Math.min(ZS - 1, Math.max(0, Math.floor(((z - zzN) / ZD) * ZS))) * ZS + Math.min(ZS - 1, Math.max(0, Math.floor(((x - zx0) / ZW) * ZS)))) * 4 + 3] / 255;

      const loader = new THREE.TextureLoader();
      const tex = (src: string) => {
        const t = keep(loader.load(src, (done) => renderer.initTexture(done))); // upload to the GPU as soon as it lands, not on first view
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return t;
      };

      /* ---------- flat 2D map underneath everything ---------- */
      const [wx0, wzN] = proj(WIDE.lon0, WIDE.lat1), [wx1, wzS] = proj(WIDE.lon1, WIDE.lat0);
      const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(wx1 - wx0, wzS - wzN)), keep(new THREE.MeshBasicMaterial({ map: tex('/map/map2d.webp') })));
      ground.rotation.x = -Math.PI / 2; ground.position.set((wx0 + wx1) / 2, 0, (wzN + wzS) / 2);
      scene.add(ground);

      /* soft shadow the raised land casts on the flat map (sun from the north-west) */
      const shCv = canvasOf(1024), sg = shCv.getContext('2d')!;
      sg.shadowColor = 'rgba(28,33,60,1)'; sg.shadowBlur = 22; sg.shadowOffsetX = 1024;
      sg.drawImage(zoneCv, -1024, 0, 1024, 1024);
      const shTex = keep(new THREE.CanvasTexture(shCv));
      const shadowMat = keep(new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0 }));
      const shadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(ZW, ZD)), shadowMat);
      shadow.rotation.x = -Math.PI / 2; shadow.position.set(ZCX + 0.16, 0.002, ZCZ + 0.2);
      scene.add(shadow);

      /* ---------- raised land: everything in `rise` is scaled in y by the 2D->3D amount ---------- */
      const rise = new THREE.Group();
      rise.position.y = 0.004;
      scene.add(rise);
      const zoneTex = keep(new THREE.CanvasTexture(zoneCv));
      const SEG = small ? 300 : 520;
      const landGeo = keep(new THREE.PlaneGeometry(ZW, ZD, SEG, SEG));
      landGeo.rotateX(-Math.PI / 2); landGeo.translate(ZCX, 0, ZCZ);
      const lp = landGeo.attributes.position;
      for (let i = 0; i < lp.count; i++) lp.setY(i, BASE + heightAt(lp.getX(i), lp.getZ(i)));
      const landMat = keep(new THREE.MeshBasicMaterial({ map: tex('/map/color.webp'), alphaMap: zoneTex, alphaTest: 0.5, transparent: true }));
      rise.add(new THREE.Mesh(landGeo, landMat));
      await yieldNow(); if (disposed) { renderer.dispose(); return; }

      /* cliff walls: marching squares round the zone outline, each edge pulled down to the flat map as a rock face */
      const strata = canvasOf(64), stg = strata.getContext('2d')!;
      const bands = ['#6f5a3c', '#8c7350', '#a68b62', '#b89d72', '#9c8158', '#b29770', '#c2a87e', '#a88d64'];
      for (let y = 0; y < 64; y++) { stg.fillStyle = bands[Math.floor((y / 64) * bands.length)]; stg.fillRect(0, y, 64, 1); }
      const strataTex = keep(new THREE.CanvasTexture(strata));
      strataTex.colorSpace = THREE.SRGBColorSpace; strataTex.wrapS = strataTex.wrapT = THREE.RepeatWrapping;
      {
        const M = small ? 360 : 512, md = pixels(zoneCv, M), v = (i: number, j: number) => md[(j * M + i) * 4 + 3] / 255;
        const gx = (i: number) => zx0 + ((i + 0.5) / M) * ZW, gz = (j: number) => zzN + ((j + 0.5) / M) * ZD;
        const pos: number[] = [], uv: number[] = [];
        const wall = (ax: number, az: number, bx: number, bz: number) => {
          const ha = BASE + heightAt(ax, az), hb = BASE + heightAt(bx, bz), ua = (ax + az) * 3, ub = (bx + bz) * 3;
          pos.push(ax, 0, az, bx, 0, bz, bx, hb, bz, ax, 0, az, bx, hb, bz, ax, ha, az);
          uv.push(ua, 1, ub, 1, ub, 1 - hb * 2.2, ua, 1, ub, 1 - hb * 2.2, ua, 1 - ha * 2.2);
        };
        const lerpE = (p: number, q: number, a: number, b: number) => p + (q - p) * ((0.5 - a) / (b - a));
        for (let j = 0; j < M - 1; j++) for (let i = 0; i < M - 1; i++) {
          const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
          const k = (a > 0.5 ? 8 : 0) | (b > 0.5 ? 4 : 0) | (c > 0.5 ? 2 : 0) | (d > 0.5 ? 1 : 0);
          if (k === 0 || k === 15) continue;
          const T: P2 = [lerpE(gx(i), gx(i + 1), a, b), gz(j)], R: P2 = [gx(i + 1), lerpE(gz(j), gz(j + 1), b, c)];
          const B: P2 = [lerpE(gx(i), gx(i + 1), d, c), gz(j + 1)], L: P2 = [gx(i), lerpE(gz(j), gz(j + 1), a, d)];
          const segs: [P2, P2][] = ({
            1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[T, R]], 5: [[T, R], [L, B]], 6: [[T, B]], 7: [[T, L]],
            8: [[T, L]], 9: [[T, B]], 10: [[T, L], [B, R]], 11: [[T, R]], 12: [[L, R]], 13: [[B, R]], 14: [[L, B]],
          } as Record<number, [P2, P2][]>)[k];
          segs.forEach(([p, q]) => wall(p[0], p[1], q[0], q[1]));
        }
        const wg = keep(new THREE.BufferGeometry());
        wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        rise.add(new THREE.Mesh(wg, keep(new THREE.MeshBasicMaterial({ map: strataTex, side: THREE.DoubleSide }))));
      }

      await yieldNow(); if (disposed) { renderer.dispose(); return; }

      /* forests: rounded canopies wherever the bake says it is wooded, inside the zone only */
      const dummy = new THREE.Object3D(), tint = new THREE.Color();
      const TREES = small ? 2500 : 6500;
      /* keep a clear verge along every road so lines and trucks stay readable */
      const roadCv = canvasOf(512), rg = roadCv.getContext('2d')!;
      rg.setTransform(512 / ZW, 0, 0, 512 / ZD, -zx0 * 512 / ZW, -zzN * 512 / ZD);
      rg.strokeStyle = '#fff'; rg.lineWidth = 0.07; rg.lineCap = rg.lineJoin = 'round';
      lines.forEach((ln) => { rg.beginPath(); ln.forEach(([x, z], i) => (i ? rg.lineTo(x, z) : rg.moveTo(x, z))); rg.stroke(); });
      const roadData = pixels(roadCv, 512);
      const nearRoad = (x: number, z: number) => roadData[(Math.min(511, Math.max(0, Math.floor(((z - zzN) / ZD) * 512))) * 512 + Math.min(511, Math.max(0, Math.floor(((x - zx0) / ZW) * 512)))) * 4 + 3] > 40;
      const canopy = keep(new THREE.IcosahedronGeometry(0.5, 0)); canopy.translate(0, 0.5, 0);
      const trees = new THREE.InstancedMesh(canopy, keep(new THREE.MeshLambertMaterial({ flatShading: true })), TREES);
      let placed = 0;
      for (let tries = 0; placed < TREES && tries < TREES * 80; tries++) {
        const x = zx0 + rnd() * ZW, z = zzN + rnd() * ZD;
        if (zoneAt(x, z) < 0.6 || landAt(x, z) < 0.7 || nearRoad(x, z)) continue;
        const f = forestAt(x, z);
        if (rnd() > f * f + 0.003) continue;
        const sz = 0.016 + rnd() * 0.018;
        dummy.position.set(x, BASE + heightAt(x, z), z);
        dummy.scale.set(sz, sz * (0.75 + rnd() * 0.5), sz);
        dummy.rotation.set(0, rnd() * 6.28, 0); dummy.updateMatrix();
        trees.setMatrixAt(placed, dummy.matrix);
        trees.setColorAt(placed, tint.setHSL(0.27 + rnd() * 0.07, 0.42 + rnd() * 0.18, 0.2 + rnd() * 0.12));
        placed++;
      }
      trees.count = placed;
      rise.add(trees);

      await yieldNow(); if (disposed) { renderer.dispose(); return; }

      /* towns: buildings on a street grid, tallest in the centre; glass towers in the metros, colourful low-rise outside */
      const box = keep(new THREE.BoxGeometry(1, 1, 1)); box.translate(0, 0.5, 0);
      const GRID = small ? 0.052 : 0.044;
      const blocks: { x: number; z: number; w: number; d: number; h: number; ang: number; tone: number }[] = [];
      STOPS.forEach((s) => {
        const size = TOWN_SIZE[s.name] ?? 0.25;
        const [cx, cz] = proj(s.at[0], s.at[1]), R = 0.1 + 0.28 * size, ang = rnd() * 1.2, ca = Math.cos(ang), sa = Math.sin(ang);
        const span = Math.ceil(R / GRID) + 1;
        for (let gi = -span; gi <= span; gi++) for (let gj = -span; gj <= span; gj++) {
          if (gi % 4 === 0 || gj % 5 === 0) continue; // streets
          const lx = gi * GRID, lz = gj * GRID, r = Math.hypot(lx, lz);
          const edge = R * (0.8 + 0.35 * Math.sin(Math.atan2(lz, lx) * 3 + size * 9));
          if (r > edge || rnd() > 1.15 - r / edge) continue;
          const x = cx + lx * ca - lz * sa, z = cz + lx * sa + lz * ca;
          if (landAt(x, z) < 0.75 || zoneAt(x, z) < 0.6) continue;
          const core = Math.max(0, 1 - r / (edge * 0.8)), tall = size > 0.5 && core > 0.5 && rnd() < 0.4;
          blocks.push({
            x, z, ang, tone: tall ? 0 : rnd() < 0.3 ? 2 : 1,
            w: GRID * (0.55 + rnd() * 0.3), d: GRID * (0.55 + rnd() * 0.3),
            h: tall ? 0.1 + rnd() * 0.2 * size : 0.016 + core * (0.025 + rnd() * 0.06) * (0.5 + size),
          });
        }
      });
      const towns = new THREE.InstancedMesh(box, keep(new THREE.MeshLambertMaterial()), Math.max(1, blocks.length));
      const pastel = [0.03, 0.08, 0.11, 0.55, 0.95];
      blocks.forEach((bk, n) => {
        dummy.position.set(bk.x, BASE + heightAt(bk.x, bk.z), bk.z);
        dummy.scale.set(bk.w, bk.h, bk.d);
        dummy.rotation.set(0, bk.ang, 0); dummy.updateMatrix();
        towns.setMatrixAt(n, dummy.matrix);
        towns.setColorAt(n,
          bk.tone === 0 ? tint.setHSL(0.58 + rnd() * 0.04, 0.2 + rnd() * 0.1, 0.62 + rnd() * 0.14)
            : bk.tone === 2 ? tint.setHSL(pastel[Math.floor(rnd() * pastel.length)], 0.35, 0.72 + rnd() * 0.08)
              : tint.setHSL(0.08 + rnd() * 0.05, 0.06 + rnd() * 0.1, 0.82 + rnd() * 0.14));
      });
      towns.count = blocks.length;
      rise.add(towns);

      /* ---------- routes: a white casing and a coloured line, morphing between flat and draped on the relief ---------- */
      const resample = (ln: P2[], step: number) => {
        const out: P2[] = [ln[0]]; let carry = 0;
        for (let i = 1; i < ln.length; i++) {
          const [ax, az] = ln[i - 1], [bx, bz] = ln[i], len = Math.hypot(bx - ax, bz - az);
          let d = step - carry;
          while (d <= len) { out.push([ax + ((bx - ax) * d) / len, az + ((bz - az) * d) / len]); d += step; }
          carry = len - (d - step);
        }
        out.push(ln[ln.length - 1]);
        return out;
      };
      const raisedY = (x: number, z: number) => 0.004 + BASE + heightAt(x, z) + 0.03;
      const flow = { value: 0 };
      const routes = ROUTES.map((r, ri) => {
        const pts = resample(lines[ri], 0.02);
        const flatCurve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0.014, z)));
        const highCurve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, raisedY(x, z), z)));
        const SEGS = pts.length * 2, RAD = 6, len = flatCurve.getLength();
        const mk = (radius: number, color: string, y: number) => {
          const flat = keep(new THREE.TubeGeometry(flatCurve, SEGS, radius, RAD, false));
          const high = keep(new THREE.TubeGeometry(highCurve, SEGS, radius, RAD, false));
          flat.translate(0, y, 0); high.translate(0, y, 0);
          const geo = keep(flat.clone());
          geo.setDrawRange(0, 0);
          const mat = radius < 0.03
            ? keep(new THREE.ShaderMaterial({
              uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uTime: flow, uRep: { value: Math.max(2, len / 0.85) } },
              vertexShader: FLOW_VS, fragmentShader: FLOW_FS, transparent: true,
            }))
            : keep(new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
          const mesh = new THREE.Mesh(geo, mat);
          mesh.renderOrder = radius < 0.03 ? 3 : 2;
          scene.add(mesh);
          return { geo, mat: mat as { opacity: number; uniforms?: { uOpacity: { value: number } } }, a: flat.attributes.position.array as Float32Array, b: high.attributes.position.array as Float32Array };
        };
        const casing = mk(0.034, '#ffffff', -0.002), line = mk(0.021, r.color, 0);

        /* two trucks per route: one leaving Bengaluru, one coming back, each keeping to its own (left) side */
        const makeTruck = () => {
          const g = new THREE.Group();
          const piece = (w: number, h: number, d: number, color: string, z: number, y: number) => {
            const m = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), keep(new THREE.MeshLambertMaterial({ color })));
            m.position.set(0, y, z); g.add(m);
          };
          piece(0.1, 0.1, 0.24, '#ffffff', -0.035, 0.07);
          piece(0.103, 0.022, 0.243, r.color, -0.035, 0.03);
          piece(0.095, 0.085, 0.07, '#1C2158', 0.125, 0.0575);
          g.scale.setScalar(0.55);
          g.visible = false;
          scene.add(g);
          return g;
        };
        const trucks = [{ g: makeTruck(), dir: 1, u: rnd() }, { g: makeTruck(), dir: -1, u: rnd() }];
        return { key: r.key, flatCurve, highCurve, casing, line, trucks, SEGS, RAD, len, dim: 1 };
      });

      /* stops: white dots with a dark ring; the hub gets a pulse */
      const dotGeo = keep(new THREE.CylinderGeometry(0.042, 0.042, 0.018, 20));
      const ringGeo = keep(new THREE.CylinderGeometry(0.058, 0.058, 0.014, 20));
      const dotMat = keep(new THREE.MeshBasicMaterial({ color: '#ffffff' })), ringMat = keep(new THREE.MeshBasicMaterial({ color: '#1C2158' }));
      const stops = STOPS.map((s) => {
        const [x, z] = proj(s.at[0], s.at[1]);
        const g = new THREE.Group();
        const ring = new THREE.Mesh(ringGeo, ringMat), dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.y = 0.006; ring.renderOrder = dot.renderOrder = 3;
        g.add(ring, dot); g.scale.setScalar(0); scene.add(g);
        return { s, g, x, z, hi: raisedY(x, z) + 0.01, major: MAJOR.has(s.name) };
      });
      const hubAt = proj(CITY_AT.Bengaluru[0], CITY_AT.Bengaluru[1]);
      const pulse = new THREE.Mesh(keep(new THREE.RingGeometry(0.1, 0.13, 40)), keep(new THREE.MeshBasicMaterial({ color: '#1C2158', transparent: true, side: THREE.DoubleSide, depthWrite: false })));
      pulse.rotation.x = -Math.PI / 2;
      scene.add(pulse);

      /* ---------- clouds for the arrival ---------- */
      const cloudCv = canvasOf(256), cg = cloudCv.getContext('2d')!;
      for (let i = 0; i < 16; i++) {
        const x = 70 + rnd() * 116, y = 90 + rnd() * 76, r = 34 + rnd() * 44;
        const gr = cg.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        cg.fillStyle = gr; cg.fillRect(0, 0, 256, 256);
      }
      const cloudTex = keep(new THREE.CanvasTexture(cloudCv));
      const clouds = Array.from({ length: small ? 14 : 22 }, () => {
        const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0, fog: false })));
        scene.add(sp);
        const a = rnd() * Math.PI * 2;
        return { sp, a, r: Math.sqrt(rnd()), y: rnd(), s: rnd(), phase: rnd() * 6.28 };
      });

      /* ---------- camera framing ---------- */
      const V = THREE.Vector3;
      const allBox = (() => {
        const b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
        lines.flat().forEach(([x, z]) => { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z); });
        return b;
      })();
      const boxOf = (key: string | null) => {
        if (!key) return allBox;
        const ln = lines[ROUTES.findIndex((r) => r.key === key)];
        const b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
        ln.forEach(([x, z]) => { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z); });
        return b;
      };
      const probe = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
      const dirOf = (m: Mode) => (m === '3d' ? new V(Math.sin(0.2) * Math.cos(0.9), Math.sin(0.9), Math.cos(0.2) * Math.cos(0.9)) : new V(0, 1, 0.0008)).normalize();
      let W = 1, H = 1;
      const reserve = () => (W >= 900
        ? { l: (Math.min(400, W * 0.33) + 48) / W, r: 40 / W, t: 104 / H, b: 48 / H }
        : { l: 14 / W, r: 14 / W, t: 168 / H, b: (selRef.current ? 250 : 100) / H });
      const fit = (key: string | null, m: Mode) => {
        const bx = { ...boxOf(key) }, pad = key ? 0.5 : 0.2, rs = reserve();
        const grow = (lo: 'x0' | 'z0', hi: 'x1' | 'z1', min: number) => { const c = (bx[lo] + bx[hi]) / 2, h = Math.max(min, bx[hi] - bx[lo]) / 2; bx[lo] = c - h; bx[hi] = c + h; };
        grow('x0', 'x1', 2.6); grow('z0', 'z1', 2.6); // never zoom in tighter than ~2.6 degrees
        const corners: InstanceType<typeof V>[] = [];
        for (const x of [bx.x0 - pad, bx.x1 + pad]) for (const z of [bx.z0 - pad, bx.z1 + pad]) for (const y of m === '3d' ? [0, 0.55] : [0]) corners.push(new V(x, y, z));
        const dir = dirOf(m), target = new V((bx.x0 + bx.x1) / 2, 0, (bx.z0 + bx.z1) / 2);
        const want = { x: (rs.l - rs.r), y: (rs.b - rs.t) }; // NDC centre of the free area
        const room = { x: 2 - 2 * rs.l - 2 * rs.r, y: 2 - 2 * rs.t - 2 * rs.b };
        probe.aspect = W / H; probe.updateProjectionMatrix();
        let dist = 10;
        const span = () => {
          probe.position.copy(target).addScaledVector(dir, dist); probe.lookAt(target); probe.updateMatrixWorld();
          let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
          corners.forEach((p) => { const q = p.clone().project(probe); a = Math.min(a, q.x); b = Math.max(b, q.x); c = Math.min(c, q.y); d = Math.max(d, q.y); });
          return { a, b, c, d };
        };
        for (let pass = 0; pass < 3; pass++) {
          let lo = 2, hi = 120;
          for (let k = 0; k < 26; k++) { dist = (lo + hi) / 2; const s = span(); if (s.b - s.a <= room.x && s.d - s.c <= room.y) hi = dist; else lo = dist; }
          dist = hi;
          const s = span(), halfH = dist * Math.tan((probe.fov * Math.PI) / 360), halfW = halfH * probe.aspect;
          const right = new V().setFromMatrixColumn(probe.matrixWorld, 0).setY(0).normalize();
          const up = new V().setFromMatrixColumn(probe.matrixWorld, 1).setY(0).normalize();
          const el = Math.asin(Math.max(0.2, dir.y));
          target.addScaledVector(right, ((s.a + s.b) / 2 - want.x) * halfW).addScaledVector(up, (((s.c + s.d) / 2 - want.y) * halfH) / Math.sin(el));
        }
        return { pos: target.clone().addScaledVector(dir, dist), target, dist };
      };

      const resize = () => {
        W = pin.clientWidth; H = pin.clientHeight;
        renderer.setSize(W, H, false);
        camera.aspect = W / H; camera.updateProjectionMatrix();
        dirtyRef.current = true;
      };
      const ro = new ResizeObserver(resize); ro.observe(pin); resize();
      let visible = true;
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '200px' });
      io.observe(pin);

      let goal = fit(null, '2d');
      const camPos = goal.pos.clone().multiplyScalar(1), camTarget = goal.target.clone();
      const goal2d = { d: goal.dist };
      const rise3d = { from: 0, to: 0, start: 0, now: 0 };
      let lastMode: Mode = '2d';
      const v = new V(), a = new V(), b = new V(), tan = new V(), side = new V(), up = new V(0, 1, 0);

      const place = (el: HTMLElement | null, at: InstanceType<typeof V>, alpha: number) => {
        if (!el) return;
        v.copy(at).project(camera);
        el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * W).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * H).toFixed(1)}px,0)`;
        el.style.opacity = String(v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 ? alpha : 0);
      };

      const clock = new THREE.Clock();
      let raf = 0, prevT = 0, frameMs = 16, lastDprChange = 0;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        const now = clock.getElapsedTime(), raw = now - prevT, dt = Math.min(0.05, raw); prevT = now;
        /* adaptive resolution: drop pixel ratio when frames run long, restore it when there is headroom */
        if (raw > 0 && raw < 0.2) {
          frameMs = frameMs * 0.9 + raw * 1000 * 0.1;
          if (now - lastDprChange > 1.5) {
            const next = frameMs > 22 ? Math.max(1, dpr - 0.25) : frameMs < 13 ? Math.min(MAX_DPR, dpr + 0.25) : dpr;
            if (next !== dpr) { dpr = next; renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); lastDprChange = now; }
          }
        }
        flow.value = now;
        const dev = process.env.NODE_ENV !== 'production' ? (window as unknown as { __mapP?: number }).__mapP : undefined; // dev-only scroll override
        progress.now = dev ?? progress.now + (progress.target - progress.now) * 0.12;
        const p = progress.now;

        /* mode change: tween the rise, refit the camera */
        if (modeRef.current !== lastMode) {
          lastMode = modeRef.current;
          rise3d.from = rise3d.now; rise3d.to = lastMode === '3d' ? 1 : 0; rise3d.start = now;
        }
        rise3d.now = RM ? rise3d.to : rise3d.from + (rise3d.to - rise3d.from) * easeInOut(Math.min(1, ((now - rise3d.start) * 1000) / RISE_MS));
        const t = rise3d.now;
        if (dirtyRef.current) { goal = fit(selRef.current, modeRef.current); if (modeRef.current === '2d' && !selRef.current) goal2d.d = goal.dist; dirtyRef.current = false; }

        /* camera: falls from above the clouds, then eases to whatever the mode and selection ask for */
        const k = sstep(0.04, 0.72, p);
        a.copy(goal.target).addScaledVector(dirOf('2d'), goal2d.d * 1.7);
        b.copy(goal.pos);
        const ease = RM ? 1 : 1 - Math.exp(-dt * 3.4);
        camPos.lerp(v.copy(a).lerp(b, k), k < 1 ? 1 : ease);
        camTarget.lerp(goal.target, k < 1 ? 1 : ease);
        camera.position.copy(camPos);
        camera.lookAt(camTarget);
        const camDist = camPos.distanceTo(camTarget);
        (scene.fog as import('three').Fog).near = camDist * 1.15; (scene.fog as import('three').Fog).far = camDist * 2.6;

        /* clouds: fill the view at the top of the scroll, part and fade on the way down */
        const D = goal2d.d, part = sstep(0.04, 0.6, p);
        clouds.forEach((c) => {
          const rad = D * (0.15 + 0.45 * c.r) * (1 + part * 1.8);
          c.sp.position.set(goal.target.x + Math.cos(c.a + now * 0.01) * rad, D * (0.3 + 0.55 * c.y), goal.target.z + Math.sin(c.a + now * 0.01) * rad);
          const sz = D * (0.5 + 0.45 * c.s); c.sp.scale.set(sz, sz * 0.62, 1);
          c.sp.material.opacity = 0.95 * (1 - sstep(0.12, 0.6, p));
          c.sp.visible = c.sp.material.opacity > 0.01; // big transparent quads: skip them once faded
        });
        if (veilRef.current) veilRef.current.style.opacity = String(1 - sstep(0, 0.18, p));

        /* the rise */
        rise.scale.y = Math.max(0.0001, t);
        rise.visible = t > 0.001;
        landMat.opacity = Math.min(1, t * 3); landMat.alphaTest = 0.5 * landMat.opacity;
        const blend = landMat.opacity < 1;
        if (landMat.transparent !== blend) { landMat.transparent = blend; landMat.needsUpdate = true; } // blending only during the fade
        trees.visible = towns.visible = t > 0.02;
        shadowMat.opacity = 0.42 * t;

        /* routes draw in during the arrival, then trucks keep running */
        const draw = sstep(0.38, 0.92, p);
        const active = selRef.current ?? hoverRef.current;
        routes.forEach((r) => {
          const on = !active || active === r.key;
          r.dim += ((on ? 1 : 0.16) - r.dim) * 0.15;
          for (const seg of [r.casing, r.line]) {
            const arr = seg.geo.attributes.position.array as Float32Array;
            if (seg.geo.userData.t !== t) {
              for (let i = 1; i < arr.length; i += 3) arr[i] = seg.a[i] + (seg.b[i] - seg.a[i]) * t;
              seg.geo.attributes.position.needsUpdate = true; seg.geo.userData.t = t;
            }
            seg.geo.setDrawRange(0, Math.floor(draw * r.SEGS) * r.RAD * 6);
            if (seg.mat.uniforms) seg.mat.uniforms.uOpacity.value = r.dim; else seg.mat.opacity = r.dim * 0.95;
          }
          r.trucks.forEach((tk, ti) => {
            tk.u = draw < 1 ? (ti ? 1 - draw * 0.5 : draw) : RM ? (ti ? 0.3 : 0.65) : (tk.u + (tk.dir * dt * 0.3) / r.len + 1) % 1;
            const u = Math.min(0.995, Math.max(0.005, tk.u));
            r.flatCurve.getPointAt(u, a); r.highCurve.getPointAt(u, b);
            r.flatCurve.getTangentAt(u, tan); r.highCurve.getTangentAt(u, v); tan.lerp(v, t).normalize();
            side.crossVectors(tan, up).setY(0).normalize().multiplyScalar(-tk.dir * 0.024);
            tk.g.position.copy(a).lerp(b, t).add(side);
            tk.g.lookAt(v.copy(tk.g.position).addScaledVector(tan, tk.dir));
            tk.g.visible = (ti ? draw > 0.6 : draw > 0.02) && r.dim > 0.3;
          });
        });

        /* stops and their labels */
        const sa = sstep(0.75, 0.95, p);
        stops.forEach((sp, i) => {
          const on = !active || sp.s.routes.includes(active);
          const y = 0.016 + (sp.hi - 0.016) * t;
          sp.g.position.set(sp.x, y, sp.z);
          sp.g.scale.setScalar(sa * (on ? 1 : 0.6));
          const named = active ? on : sp.major;
          place(stopRefs.current[i], v.set(sp.x, y + 0.02, sp.z), sa * (named ? 1 : 0));
        });
        const ph = (now * 0.7) % 1;
        pulse.position.set(hubAt[0], 0.02 + (raisedY(hubAt[0], hubAt[1]) - 0.02) * t + 0.01, hubAt[1]);
        pulse.scale.setScalar(sa * (1 + ph * 2.2));
        (pulse.material as import('three').MeshBasicMaterial).opacity = 0.5 * (1 - ph);

        renderer.render(scene, camera);
      };
      renderer.compile(scene, camera); // compile every shader now rather than on the first visible frame
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

  const selected = ROUTES.find((r) => r.key === sel) ?? null;
  const viaOf = (r: (typeof ROUTES)[number]) => stopsOf(r).slice(1, -1);
  const detail = (r: (typeof ROUTES)[number]) => (
    <div className="nm-detail-in">
      <ol className="nm-stops" style={{ '--c': r.color } as React.CSSProperties}>
        {stopsOf(r).map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p className="nm-note">{r.note}</p>
      {r.depart && (
        <dl>
          <div><dt>Departs</dt><dd>{r.depart}</dd></div>
          <div><dt>Arrives</dt><dd>{r.arrive}</dd></div>
          <div><dt>Lane desk</dt><dd>{r.desk}</dd></div>
        </dl>
      )}
    </div>
  );

  return (
    <section className={`nm${mode === '3d' ? ' is-3d' : ''}`} id="network" aria-label="Route network">
      <div className="nm-pin" ref={pinRef}>
        {failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="nm-canvas" src="/map/map2d.webp" alt="Map of South India" />
        ) : (
          <canvas ref={canvasRef} className="nm-canvas" aria-hidden="true" />
        )}
        <div className="nm-veil" ref={veilRef} aria-hidden="true" />
        <div className="nm-labels" aria-hidden="true">
          {STOPS.map((s, i) => (
            <span key={s.name} className={`nm-stop${s.name === 'Bengaluru' ? ' hub' : ''}`} ref={(el) => { stopRefs.current[i] = el; }}>
              <i>{s.name === 'Bengaluru' ? 'Bengaluru hub' : s.name}</i>
            </span>
          ))}
        </div>

        <aside className="nm-panel">
          <p className="dx-eyebrow">Our network</p>
          <h2 className="dx-h2">Seven routes. One hub in Bengaluru.</h2>
          <p className="nm-lede">Every route runs both ways: out of Bengaluru and back. Pick one to follow it, or switch to 3D.</p>
          <ul className="nm-routes">
            {ROUTES.map((r) => (
              <li key={r.key} className={sel === r.key ? 'on' : ''} style={{ '--c': r.color } as React.CSSProperties}>
                <button type="button" aria-expanded={sel === r.key}
                  onClick={() => select(sel === r.key ? null : r.key)}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse') hover(r.key); }}
                  onPointerLeave={(e) => { if (e.pointerType === 'mouse') hover(null); }}>
                  <i className="sw" />
                  <span className="rn">Bengaluru <svg className="tw" viewBox="0 0 24 24" aria-label="both ways"><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" /></svg> {r.name}</span>
                  <span className="via">{viaOf(r).length ? `via ${viaOf(r).join(', ')}` : 'Direct'}</span>
                </button>
                {sel === r.key && <div className="nm-detail desk">{detail(r)}</div>}
              </li>
            ))}
          </ul>
          <div className="nm-facts" aria-hidden="true">
            <span><b>7</b>routes</span>
            <span><b>{STOPS.length}</b>towns</span>
            <span><svg className="tw" viewBox="0 0 24 24"><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" /></svg>both ways</span>
          </div>
        </aside>

        <div className="nm-chips" role="group" aria-label="Routes">
          {ROUTES.map((r) => (
            <button key={r.key} type="button" className={sel === r.key ? 'on' : ''} style={{ '--c': r.color } as React.CSSProperties}
              aria-pressed={sel === r.key} onClick={() => select(sel === r.key ? null : r.key)}>
              <i />{r.name}
            </button>
          ))}
        </div>

        {selected && (
          <div className="nm-detail sheet" style={{ '--c': selected.color } as React.CSSProperties}>
            <div className="nm-sheet-head">
              <b>Bengaluru <svg className="tw" viewBox="0 0 24 24" aria-label="both ways"><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" /></svg> {selected.name}</b>
              <button type="button" onClick={() => select(null)} aria-label="Close route">&times;</button>
            </div>
            {detail(selected)}
          </div>
        )}

        <div className="nm-toggle" role="group" aria-label="Map view">
          <i className="thumb" />
          <button type="button" aria-pressed={mode === '2d'} onClick={() => changeMode('2d')} disabled={failed}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 5l5-2 6 2 5-2v12l-5 2-6-2-5 2z M7 3v12 M13 5v12" /></svg>2D map
          </button>
          <button type="button" aria-pressed={mode === '3d'} onClick={() => changeMode('3d')} disabled={failed}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2l7 4v8l-7 4-7-4V6z M3 6l7 4 7-4 M10 10v8" /></svg>3D view
          </button>
        </div>
      </div>
    </section>
  );
}
