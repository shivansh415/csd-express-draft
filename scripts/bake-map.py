"""Bake the network-map textures from open elevation data.

Input : Terrarium elevation tiles (Mapzen / AWS Terrain Tiles, open data) fetched by scripts/fetch-tiles.py:
        <tiles>/z8/<x>_<y>.png (whole of South India) and <tiles>/z9/<x>_<y>.png (the corridor area)
Output (public/map):
        map2d.webp    flat pastel map of the wide window: sea depth, soft relief, rivers, sea and state names
        color.webp    realistic land colour of the zone window, with baked sun, cast shadows, rivers, towns
        height.webp   zone elevation, sqrt-encoded: metres = (v/255)^2 * HEIGHT_MAX_M (lossless)
        forest.webp   zone tree density (lossless)
        land.webp     zone mainland mask (lossless)
Usage : python3 scripts/bake-map.py <tiles-dir> public/map
WIDE and ZONE must match components/network/geo.ts. Labels use macOS Avenir Next; any bold sans works.
"""
import sys, heapq, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

TILES, OUT = sys.argv[1], sys.argv[2]
WIDE = (70.0, 88.0, 5.5, 22.0)     # lon0, lon1, lat0, lat1
ZONE = (75.0, 81.6, 8.9, 18.2)
HEIGHT_MAX_M = 2800
YSCALE = 0.26                      # world units per km, only used for lighting
FONT = '/System/Library/Fonts/Avenir Next.ttc'
CITIES = [  # towns tinted in the zone texture: lon, lat, radius in px
    (77.59, 12.97, 26), (78.49, 17.39, 22), (80.27, 13.08, 22), (76.96, 11.02, 14), (78.12, 9.93, 14), (76.27, 9.93, 14),
    (80.65, 16.51, 13), (75.78, 11.25, 11), (78.15, 11.66, 11), (79.13, 12.92, 9), (79.70, 12.83, 8), (79.10, 13.22, 8),
    (79.42, 13.63, 9), (79.99, 14.44, 9), (80.05, 15.51, 7), (80.44, 16.31, 9), (78.04, 15.83, 9), (77.60, 14.68, 8),
    (77.83, 12.74, 7), (78.17, 11.22, 7), (78.08, 10.96, 7), (77.98, 10.36, 8), (77.34, 11.11, 9), (76.64, 12.30, 11),
]

# ---------------- helpers ----------------
def box1d(a, r, axis):
    k = 2 * r + 1
    pad = [(0, 0), (0, 0)]; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
    return ((c[k:] - c[:-k]) / k if axis == 0 else (c[:, k:] - c[:, :-k]) / k).astype(np.float32)
def blur(a, r, it=3):
    if r < 1: return a
    for _ in range(it): a = box1d(box1d(a, r, 0), r, 1)
    return a
def sstep(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t[..., None]
def rgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)

def load(z, win, N):
    """Mosaic the zoom-z tiles and resample to an N x N lon/lat grid (metres, sea negative)."""
    lon0, lon1, lat0, lat1 = win
    tx = lambda lon: int((lon + 180) / 360 * 2 ** z)
    ty = lambda lat: int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2 ** z)
    X0, X1, Y0, Y1 = tx(lon0), tx(lon1), ty(lat1), ty(lat0)
    mos = np.zeros(((Y1 - Y0 + 1) * 256, (X1 - X0 + 1) * 256), np.float32)
    for x in range(X0, X1 + 1):
        for y in range(Y0, Y1 + 1):
            t = np.asarray(Image.open(f'{TILES}/z{z}/{x}_{y}.png').convert('RGB')).astype(np.float32)
            mos[(y - Y0) * 256:(y - Y0 + 1) * 256, (x - X0) * 256:(x - X0 + 1) * 256] = t[..., 0] * 256 + t[..., 1] + t[..., 2] / 256 - 32768
    lon = lon0 + (np.arange(N) + .5) / N * (lon1 - lon0)
    lat = lat1 - (np.arange(N) + .5) / N * (lat1 - lat0)
    px = (lon + 180) / 360 * 2 ** z * 256 - X0 * 256 - .5
    py = (1 - np.arcsinh(np.tan(np.radians(lat))) / np.pi) / 2 * 2 ** z * 256 - Y0 * 256 - .5
    x0 = np.clip(np.floor(px).astype(int), 0, mos.shape[1] - 2); fx = (px - x0).astype(np.float32)
    y0 = np.clip(np.floor(py).astype(int), 0, mos.shape[0] - 2); fy = (py - y0).astype(np.float32)[:, None]
    h = (mos[np.ix_(y0, x0)] * (1 - fx) + mos[np.ix_(y0, x0 + 1)] * fx) * (1 - fy) + (mos[np.ix_(y0 + 1, x0)] * (1 - fx) + mos[np.ix_(y0 + 1, x0 + 1)] * fx) * fy
    return h, lon, lat

def mainland(land, win, N):
    """Land connected to Bengaluru (drops islands and Sri Lanka), flood-filled on a coarse grid."""
    lon0, lon1, lat0, lat1 = win
    sx, sy = int((77.59 - lon0) / (lon1 - lon0) * N), int((lat1 - 12.97) / (lat1 - lat0) * N)
    q = 4; m = N // q
    coarse = land.reshape(m, q, m, q).max((1, 3)).ravel().tolist()
    seen = bytearray(m * m); stack = [(sy // q) * m + sx // q]; seen[stack[0]] = 1
    while stack:
        i = stack.pop()
        for j in (i - 1, i + 1, i - m, i + m):
            if 0 <= j < m * m and coarse[j] and not seen[j]: seen[j] = 1; stack.append(j)
    return land & (np.kron(np.frombuffer(bytes(seen), np.uint8).reshape(m, m), np.ones((q, q), np.uint8)) > 0)

def rivers(hm, mask, n):
    """Priority-flood drainage on an n x n grid; returns log flow accumulation scaled to 0..1 at full size."""
    N = hm.shape[0]; f = N // n
    H2 = hm.reshape(n, f, n, f).mean((1, 3)); M2 = mask.reshape(n, f, n, f).min((1, 3)) > 0
    Hl = H2.ravel().tolist(); Ml = M2.ravel().tolist()
    pm = np.pad(M2, 1); border = M2 & ~(pm[:-2, 1:-1] & pm[2:, 1:-1] & pm[1:-1, :-2] & pm[1:-1, 2:])
    edge = np.zeros_like(M2); edge[0, :] = edge[-1, :] = edge[:, 0] = edge[:, -1] = True
    done = bytearray(n * n); parent = [-1] * (n * n); order = []
    heap = [(Hl[i], i) for i in np.flatnonzero((border | (edge & M2)).ravel()).tolist()]
    for _, i in heap: done[i] = 1
    heapq.heapify(heap)
    nbr = [-n - 1, -n, -n + 1, -1, 1, n - 1, n, n + 1]
    while heap:
        lvl, i = heapq.heappop(heap); order.append(i)
        for d in nbr:
            j = i + d
            if 0 <= j < n * n and Ml[j] and not done[j]:
                done[j] = 1; parent[j] = i; heapq.heappush(heap, (max(Hl[j], lvl), j))
    acc = [1.0] * (n * n)
    for i in reversed(order):
        p = parent[i]
        if p >= 0: acc[p] += acc[i]
    acc = np.array(acc, np.float32).reshape(n, n)
    return np.kron(acc, np.ones((f, f), np.float32))

def shade(hw, wx, wz, steps):
    """Lambert light from the north-west plus cast shadows and a little ambient occlusion."""
    gz, gx = np.gradient(blur(hw, 1, 1)); gx /= wx; gz /= wz
    L = np.array([-0.60, 0.62, -0.50]); L /= np.linalg.norm(L)
    lam = (-gx * L[0] + L[1] - gz * L[2]) / np.sqrt(gx ** 2 + 1 + gz ** 2)
    light = np.clip(0.5 + 0.5 * lam / L[1], 0.3, 1.2)
    drop = np.hypot(wx, wz) * L[1] / np.hypot(L[0], L[2])
    occ = np.zeros_like(hw)
    for k in range(1, steps):
        s = np.zeros_like(hw); s[k:, k:] = hw[:-k, :-k]
        occ = np.maximum(occ, s - k * drop - hw)
    sh = blur(sstep(0.0, 0.03, occ), 1, 1)
    ao = np.clip(1 - (blur(hw, 7, 2) - hw) * 5, 0.62, 1.06)
    return light, sh, ao

# ================= WIDE: flat pastel map =================
N = 3072
lon0, lon1, lat0, lat1 = WIDE
h, lon, lat = load(8, WIDE, N)
land = h > 0
landf = land.astype(np.float32)
hm = blur(np.maximum(h, 0), 1, 1) * landf
depth = np.maximum(-h, 0)
print('wide: land', int(land.sum()), 'max', float(hm.max()))

# per-row coastlines of the mainland, reused by the zone bake for its wet-west / dry-east guess
main = mainland(land, WIDE, N)
has = main.max(1) > 0
coastW = np.where(has, lon[main.argmax(1)], np.nan)
coastE = np.where(has, lon[N - 1 - main[:, ::-1].argmax(1)], np.nan)

dlon, dlat = (lon1 - lon0) / N, (lat1 - lat0) / N
light, sh, ao = shade(hm / 1000 * YSCALE, dlon * 0.97, dlat, 40)
relief = np.clip(1 + (light - 1) * 0.55 - sh * 0.18, 0.72, 1.12)

rng = np.random.default_rng(3)
n1 = blur(rng.standard_normal((N, N)).astype(np.float32), 18, 2); n1 /= n1.std()
cols = np.arange(N)[None, :]
first = np.where(has, main.argmax(1), 10 ** 6)[:, None]
dW = np.maximum(cols - first, 0) * dlon
wet = np.exp(-dW / 0.8)
low, mid, high, forest_c = rgb('#D7E5BE'), rgb('#ECE4C6'), rgb('#E2D3AE'), rgb('#B9D3A0')
col = lerp(np.broadcast_to(low, (N, N, 3)).copy(), mid, sstep(80, 450, hm))
col = lerp(col, high, sstep(700, 1500, hm))
col = lerp(col, forest_c, np.clip(wet * 0.9 * sstep(200, 900, hm) + n1 * 0.06, 0, 1))
col *= relief[..., None] * (1 + 0.025 * n1)[..., None]

acc = rivers(hm, land, N // 2)
rv = np.clip((np.log(np.maximum(acc, 1)) - np.log(2500)) / (np.log(150000) - np.log(2500)), 0, 1) * (acc > 2500)
riv = np.clip(blur((rv > 0).astype(np.float32), 1, 1) * 1.6, 0, 1) * landf
col = lerp(col, rgb('#9CC4D4'), riv * 0.8)

shelf = sstep(0, 1, 1 - np.clip(depth / 180, 0, 1))      # 1 on the continental shelf
deep = sstep(200, 3500, depth)
sea = lerp(lerp(np.broadcast_to(rgb('#C6E2EC'), (N, N, 3)).copy(), rgb('#A9D0DF'), deep), rgb('#D6ECF1'), shelf * 0.5)
coast = np.clip(blur(landf, 2, 2) * (1 - landf) * 2.4, 0, 1)   # pale surf line hugging the coast
sea = lerp(sea, rgb('#EEF7F8'), coast * 0.8)
col = np.where(land[..., None], col, sea)
edge = np.clip(np.abs(blur(landf, 1, 1) - 0.5) * 2, 0, 1)        # thin darker coastline
col = lerp(col, rgb('#86AFBE'), (1 - edge) * 0.55)

img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))
d = ImageDraw.Draw(img)
def label(text, lonc, latc, size, color, spacing=0.42, angle=0):
    f = ImageFont.truetype(FONT, size, index=1)  # Avenir Next Demi Bold
    chars = list(text); w = sum(f.getlength(c) for c in chars) + size * spacing * (len(chars) - 1)
    layer = Image.new('RGBA', (int(w) + 8, int(size * 1.6)), (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
    x = 4
    for c in chars:
        ld.text((x, 0), c, font=f, fill=color); x += f.getlength(c) + size * spacing
    if angle: layer = layer.rotate(angle, expand=True, resample=Image.BICUBIC)
    cx, cy = (lonc - lon0) / (lon1 - lon0) * N, (lat1 - latc) / (lat1 - lat0) * N
    img.paste(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)), layer)
SEA_C, STATE_C = (95, 140, 160, 200), (120, 112, 86, 150)
label('ARABIAN SEA', 71.4, 14.0, 64, SEA_C, angle=72)
label('BAY OF BENGAL', 84.6, 14.6, 64, SEA_C, angle=-62)
label('LAKSHADWEEP SEA', 74.6, 8.0, 40, SEA_C)
label('INDIAN OCEAN', 79.0, 6.0, 46, SEA_C)
label('KARNATAKA', 75.4, 14.6, 40, STATE_C)
label('TELANGANA', 79.6, 18.5, 40, STATE_C)
label('ANDHRA PRADESH', 78.8, 15.15, 36, STATE_C)
label('TAMIL NADU', 79.2, 10.45, 40, STATE_C)
label('KERALA', 76.75, 8.95, 34, STATE_C, angle=-58)
label('MAHARASHTRA', 75.6, 19.9, 40, STATE_C)
label('ODISHA', 84.0, 20.2, 40, STATE_C)
label('GOA', 74.0, 15.55, 28, STATE_C)
label('SRI LANKA', 80.75, 7.8, 36, STATE_C)
img.save(f'{OUT}/map2d.webp', quality=88, method=6)
print('wide done')

# ================= ZONE: realistic corridor terrain =================
lon0, lon1, lat0, lat1 = ZONE
h, lon, lat = load(9, ZONE, N)
mask = mainland(h > 0, ZONE, N).astype(np.float32)
edgeF = np.clip((blur(mask, 6) - 0.5) * 2, 0, 1)
hm = blur(np.maximum(h, 0), 1, 1) * mask * edgeF
print('zone: land', int(mask.sum()), 'max', float(hm.max()))

dlon, dlat = (lon1 - lon0) / N, (lat1 - lat0) / N
wlat = WIDE[3] - (np.arange(len(coastW)) + .5) / len(coastW) * (WIDE[3] - WIDE[2])
okW = ~np.isnan(coastW)
cWest = np.interp(lat, wlat[okW][::-1], coastW[okW][::-1])[:, None]
cEast = np.interp(lat, wlat[okW][::-1], coastE[okW][::-1])[:, None]
dW = np.maximum(lon[None, :] - cWest, 0)
dE = np.maximum(cEast - lon[None, :], 0)

acc = rivers(hm, mask, N // 2)
rv = np.clip((np.log(np.maximum(acc, 1)) - np.log(1800)) / (np.log(120000) - np.log(1800)), 0, 1) * (acc > 1800)
river = np.clip(np.maximum(blur((rv > 0).astype(np.float32), 1, 2) * 1.8, blur((rv > 0.45).astype(np.float32), 2, 2) * 2.6), 0, 1) * mask
valley = np.clip(blur((rv > 0.25).astype(np.float32), 34, 2) * 5, 0, 1)

gy, gx = np.gradient(blur(hm, 1, 1))
steep = blur(np.hypot(gx, gy), 12, 2) * 2.6   # metres per pixel, scaled to the old 155 px/deg tuning
rng = np.random.default_rng(4)
n1 = blur(rng.standard_normal((N, N)).astype(np.float32), 34, 2); n1 /= n1.std()
n2 = blur(rng.standard_normal((N, N)).astype(np.float32), 3, 2); n2 /= n2.std()
n3 = rng.standard_normal((N, N)).astype(np.float32)
wetW = np.exp(-dW / 0.75)
moist = np.clip(np.maximum(wetW * 1.5, np.exp(-dE / 1.3) * 0.6) + sstep(900, 1600, hm) * 0.6, 0, 1)
forest = np.clip(sstep(7, 26, steep) * (0.4 + 0.6 * moist) + wetW * 0.5 * sstep(-0.6, 0.8, n1) + n1 * 0.08, 0, 1) * mask
green = np.clip(np.maximum.reduce([np.exp(-dE / 0.9), wetW * 1.3, valley * 0.85]) + n1 * 0.1, 0, 1)

col = lerp(np.broadcast_to(rgb('#CEBA8A'), (N, N, 3)).copy(), rgb('#A4B070'), green)
col = lerp(col, rgb('#7E9E5C'), np.clip(green * wetW * 1.6, 0, 1))
col = lerp(col, rgb('#325432'), sstep(0.25, 0.8, forest) * 0.92)
col *= (1 + 0.07 * n1 + 0.035 * n2 + 0.015 * n3)[..., None]
col = lerp(col, rgb('#548088'), river * 0.9)
urban = np.zeros((N, N), np.float32)
yy, xx = np.ogrid[:N, :N]
for clon, clat, rad in CITIES:
    cx, cy = (clon - lon0) / (lon1 - lon0) * N, (lat1 - clat) / (lat1 - lat0) * N
    urban = np.maximum(urban, np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * rad * rad))))
col = lerp(col, rgb('#CEC6BA'), np.clip(urban * (0.75 + 0.3 * n2), 0, 1) * 0.8)

light, sh, ao = shade(hm / 1000 * YSCALE, dlon * 0.97, dlat, 110)
col = np.clip(col * (light * (1 - 0.42 * sh) * ao)[..., None], 0, 255)
col = np.where(mask[..., None] > 0, col, rgb('#B0946A'))

Image.fromarray(col.astype(np.uint8)).save(f'{OUT}/color.webp', quality=82, method=6)
Image.fromarray((mask.reshape(1536, 2, 1536, 2).mean((1, 3)) * 255).astype(np.uint8)).convert('RGB').save(f'{OUT}/land.webp', lossless=True, method=6)
h1 = hm.reshape(1536, 2, 1536, 2).mean((1, 3))
Image.fromarray((np.sqrt(np.clip(h1 / HEIGHT_MAX_M, 0, 1)) * 255 + .5).astype(np.uint8)).convert('RGB').save(f'{OUT}/height.webp', lossless=True, method=6)
Image.fromarray((forest.reshape(768, 4, 768, 4).mean((1, 3)) * 255).astype(np.uint8)).convert('RGB').save(f'{OUT}/forest.webp', lossless=True, method=6)
print('zone done')
