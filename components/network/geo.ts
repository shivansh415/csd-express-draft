/* Geography for the network map: projection, the two texture windows (must match scripts/bake-map.py),
   the routes CSD runs and the towns drawn along them. */

export type P2 = [number, number];

/** lon/lat (degrees) -> world x/z. One unit is one degree of latitude; north is -z. */
export const proj = (lon: number, lat: number): P2 => [(lon - 78.6) * 0.97, -(lat - 13.8)];

/** public/map/map2d.webp covers WIDE; color/height/forest/land.png cover ZONE. Plain lon/lat grids, north up. */
export const WIDE = { lon0: 70.0, lon1: 88.0, lat0: 5.5, lat1: 22.0 };
export const ZONE = { lon0: 75.0, lon1: 81.6, lat0: 8.9, lat1: 18.2 };
/** height.png stores sqrt(metres / HEIGHT_MAX_M); world y = km * HEIGHT_SCALE. */
export const HEIGHT_MAX_M = 2800;
export const HEIGHT_SCALE = 0.26;

const C = {
  Bengaluru: [77.59, 12.97], Hyderabad: [78.49, 17.39], Anantapur: [77.6, 14.68], Kurnool: [78.04, 15.83],
  Chittoor: [79.1, 13.22], Tirupati: [79.42, 13.63], Nellore: [79.99, 14.44], Ongole: [80.05, 15.51], Guntur: [80.44, 16.31], Vijayawada: [80.65, 16.51],
  Vellore: [79.13, 12.92], Kanchipuram: [79.7, 12.83], Chennai: [80.27, 13.08],
  Hosur: [77.83, 12.74], Namakkal: [78.17, 11.22], Karur: [78.08, 10.96], Dindigul: [77.98, 10.36], Madurai: [78.12, 9.93],
  Salem: [78.15, 11.66], Tirupur: [77.34, 11.11], Coimbatore: [76.96, 11.02], Kochi: [76.27, 9.93], Calicut: [75.78, 11.25],
} satisfies Record<string, P2>;
export type City = keyof typeof C;
export const CITY_AT = C as Record<City, P2>;

/** Road bends between stops, so lines follow the highways instead of cutting across hills. Not labelled. */
const via = {
  Kolar: [78.13, 13.14], Krishnagiri: [78.21, 12.52], Dharmapuri: [78.16, 12.13], Erode: [77.72, 11.34],
  Palakkad: [76.65, 10.78], Thrissur: [76.21, 10.52], Mysuru: [76.64, 12.3], Gundlupet: [76.69, 11.81], Bathery: [76.27, 11.66],
} satisfies Record<string, P2>;

export type Route = {
  key: string; name: string; color: string; lane: number;
  /** stops in order; strings are labelled stops, tuples are unlabelled road bends */
  path: (City | P2)[];
  depart?: string; arrive?: string; desk?: string; note: string;
};

export const ROUTES: Route[] = [
  { key: 'hyd', name: 'Hyderabad', color: '#1C2158', lane: 0, path: ['Bengaluru', 'Anantapur', 'Kurnool', 'Hyderabad'], depart: '22:30', arrive: '05:45', desk: '+91 96329 39298', note: 'Dedicated interstate corridor into Telangana.' },
  { key: 'vja', name: 'Vijayawada', color: '#179A47', lane: 1, path: ['Bengaluru', via.Kolar, 'Chittoor', 'Tirupati', 'Nellore', 'Ongole', 'Guntur', 'Vijayawada'], depart: '23:00', arrive: '06:30', desk: '+91 93530 32343', note: 'Dedicated corridor along the Andhra coast.' },
  { key: 'maa', name: 'Chennai', color: '#D8322B', lane: -1, path: ['Bengaluru', via.Kolar, 'Chittoor', 'Vellore', 'Kanchipuram', 'Chennai'], note: 'Into Chennai through the Vellore belt.' },
  { key: 'mdu', name: 'Madurai', color: '#E08C1A', lane: -1, path: ['Bengaluru', 'Hosur', via.Krishnagiri, via.Dharmapuri, 'Namakkal', 'Karur', 'Dindigul', 'Madurai'], note: 'Down the NH44 spine to south Tamil Nadu.' },
  { key: 'cbe', name: 'Coimbatore', color: '#178A8A', lane: 0, path: ['Bengaluru', via.Krishnagiri, via.Dharmapuri, 'Salem', via.Erode, 'Tirupur', 'Coimbatore'], note: 'Through Salem to the textile belt.' },
  { key: 'cok', name: 'Kochi', color: '#6B4FB0', lane: 1, path: ['Bengaluru', via.Krishnagiri, via.Dharmapuri, 'Salem', via.Erode, via.Palakkad, via.Thrissur, 'Kochi'], note: 'Across the Palakkad gap to the Kerala coast.' },
  { key: 'ccj', name: 'Calicut', color: '#2A78D0', lane: 0, path: ['Bengaluru', via.Mysuru, via.Gundlupet, via.Bathery, 'Calicut'], note: 'Over the Wayanad ghats to the Malabar coast.' },
];

export const stopsOf = (r: Route) => r.path.filter((p): p is City => typeof p === 'string');
export const pointsOf = (r: Route): P2[] => r.path.map((p) => (typeof p === 'string' ? CITY_AT[p] : p));

/** Every labelled stop once, with the routes that call there. */
export const STOPS = (Object.keys(C) as City[]).map((name) => ({ name, at: CITY_AT[name], routes: ROUTES.filter((r) => stopsOf(r).includes(name)).map((r) => r.key) }))
  .filter((s) => s.routes.length);

/** Town size for the 3D building clusters (0..1). Hubs and metros are bigger. */
export const TOWN_SIZE: Partial<Record<City, number>> = {
  Bengaluru: 1, Hyderabad: 1, Chennai: 0.95, Coimbatore: 0.6, Madurai: 0.55, Kochi: 0.55, Vijayawada: 0.55, Calicut: 0.45, Salem: 0.45,
  Tirupati: 0.35, Nellore: 0.35, Vellore: 0.35, Guntur: 0.35, Tirupur: 0.35, Kurnool: 0.3, Anantapur: 0.3, Dindigul: 0.3, Karur: 0.25,
  Namakkal: 0.25, Kanchipuram: 0.3, Chittoor: 0.25, Hosur: 0.3, Ongole: 0.25,
};

/** Catmull-Rom through 2D points, `per` samples per span. */
export function smooth(points: P2[], per: number): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] ?? points[i + 1];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** World-space polyline for a route, nudged sideways by its lane so shared stretches read as parallel lines. */
export function routeLine(r: Route, per = 24, spacing = 0.055): P2[] {
  const pts = smooth(pointsOf(r).map(([lon, lat]) => proj(lon, lat)), per);
  const off = r.lane * spacing;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
    const fade = Math.min(1, i / 6); // all lanes meet at the hub
    return [p[0] - (dz / len) * off * fade, p[1] + (dx / len) * off * fade];
  });
}
