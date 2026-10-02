/* Geography for the 3D footprint map: projection, the lon/lat window the baked textures cover
   (see scripts/bake-map.py, which must use the same window), and the places we label. */

export type P2 = [number, number];

/** lon/lat (degrees) -> world x/z. One unit is one degree of latitude; north is -z. */
export const proj = (lon: number, lat: number): P2 => [(lon - 78.6) * 0.97, -(lat - 13.8)];

/** Area covered by public/map/*: textures are plain lon/lat grids, north at the top. */
export const WINDOW = { lon0: 72.4, lon1: 85.6, lat0: 7.6, lat1: 20.0 };
/** height.png stores sqrt(metres / HEIGHT_MAX_M); world y = km * HEIGHT_SCALE. */
export const HEIGHT_MAX_M = 2800;
export const HEIGHT_SCALE = 0.26;

/** Towns drawn as building clusters: [lon, lat, relative size]. */
export const CITIES: [number, number, number][] = [
  [77.59, 12.97, 1], [78.49, 17.39, 1], [80.27, 13.08, 0.95], [80.65, 16.51, 0.6], [80.44, 16.31, 0.4], [79.42, 13.63, 0.35],
  [79.99, 14.44, 0.35], [80.05, 15.51, 0.3], [78.04, 15.83, 0.35], [77.6, 14.68, 0.3], [79.1, 13.22, 0.3], [79.81, 11.94, 0.35],
  [76.96, 11.0, 0.5], [78.12, 9.93, 0.5], [76.27, 9.93, 0.5], [83.3, 17.7, 0.55], [76.64, 12.3, 0.4], [74.85, 12.9, 0.35], [75.12, 15.36, 0.4],
];

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

/* ---------- places ---------- */
export type Region = {
  name: string; tag: string; at: P2; tone: 'ink' | 'green' | 'soft';
  text: string; rows: [string, string][];
};

export const REGIONS: Region[] = [
  {
    name: 'Bengaluru', tag: 'Origin hub, Karnataka', at: [77.59, 12.97], tone: 'ink',
    text: 'Every run starts here: pickup, route-wise consolidation and late-evening dispatch.',
    rows: [['Departures', '22:30 and 23:00'], ['Dispatch desk', '+91 93530 32343']],
  },
  {
    name: 'Telangana', tag: 'Hyderabad lane', at: [78.49, 17.39], tone: 'ink',
    text: 'Dedicated interstate corridor into Hyderabad, via Anantapur and Kurnool.',
    rows: [['Departs', '22:30'], ['Arrives', '05:45'], ['Lane desk', '+91 96329 39298']],
  },
  {
    name: 'Andhra Pradesh', tag: 'Vijayawada lane', at: [80.65, 16.51], tone: 'green',
    text: 'Dedicated corridor along the Andhra coast, via Chittoor, Tirupati, Nellore, Ongole and Guntur.',
    rows: [['Departs', '23:00'], ['Arrives', '06:30'], ['Lane desk', '+91 93530 32343']],
  },
  {
    name: 'Tamil Nadu', tag: 'Existing network', at: [78.4, 11.0], tone: 'soft',
    text: 'Part of the existing network footprint that supports expansion beyond the launch lanes.',
    rows: [['Status', 'Network footprint']],
  },
  {
    name: 'Puducherry', tag: 'Existing network', at: [79.81, 11.94], tone: 'soft',
    text: 'Part of the existing network footprint that supports expansion beyond the launch lanes.',
    rows: [['Status', 'Network footprint']],
  },
];

export const ROUTES: { key: 'hyd' | 'vja'; color: number; stops: { name: string; at: P2 }[] }[] = [
  {
    key: 'hyd', color: 0x1c2158,
    stops: [{ name: 'Bengaluru', at: [77.59, 12.97] }, { name: 'Anantapur', at: [77.6, 14.68] }, { name: 'Kurnool', at: [78.04, 15.83] }, { name: 'Hyderabad', at: [78.49, 17.39] }],
  },
  {
    key: 'vja', color: 0x179a47,
    stops: [
      { name: 'Bengaluru', at: [77.59, 12.97] }, { name: 'Chittoor', at: [79.1, 13.22] }, { name: 'Tirupati', at: [79.42, 13.63] }, { name: 'Nellore', at: [79.99, 14.44] },
      { name: 'Ongole', at: [80.05, 15.51] }, { name: 'Guntur', at: [80.44, 16.31] }, { name: 'Vijayawada', at: [80.65, 16.51] },
    ],
  },
];
