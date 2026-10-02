"""Bake the footprint-map textures from open elevation data.

Input : Terrarium elevation tiles (Mapzen / AWS Terrain Tiles, open data), zoom 8, x 179-188, y 113-122, saved as
        <tiles>/<x>_<y>.png   (https://s3.amazonaws.com/elevation-tiles-prod/terrarium/8/<x>/<y>.png)
Output: public/map/color.webp  land colour with baked sun, cast shadows, rivers and town patches
        public/map/mask.png    land mask (mainland south of ~19.75N)
        public/map/height.png  elevation, sqrt-encoded: metres = (v/255)^2 * 2800
        public/map/forest.png  tree density
        public/map/shadow.png  soft ground shadow of the slab
Usage : python3 scripts/bake-map.py <tiles-dir> public/map
The lon/lat window here must match WINDOW in components/footprint/geo.ts.
"""
import sys, heapq
import numpy as np
from PIL import Image

TILES, OUT = sys.argv[1], sys.argv[2]
Z, X0, X1, Y0, Y1 = 8, 179, 188, 113, 122
LON0, LON1, LAT0, LAT1 = 72.4, 85.6, 7.6, 20.0
N = 2048
CUT = 19.75      # northern edge of the slab
YSCALE = 0.26    # world units per km of elevation
CITIES = [(77.59, 12.97, 15), (78.49, 17.39, 15), (80.27, 13.08, 14), (80.65, 16.51, 9), (80.44, 16.31, 6), (79.42, 13.63, 5),
          (79.99, 14.44, 5), (80.05, 15.51, 4), (78.04, 15.83, 5), (77.60, 14.68, 4), (79.10, 13.22, 4), (79.81, 11.94, 5),
          (76.96, 11.0, 7), (78.12, 9.93, 7), (76.27, 9.93, 7), (83.3, 17.7, 8), (76.64, 12.30, 6), (74.85, 12.9, 5), (75.12, 15.36, 6)]

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

# ---- mosaic + resample to a plain lon/lat grid ----
mos = np.zeros(((Y1 - Y0 + 1) * 256, (X1 - X0 + 1) * 256), np.float32)
for x in range(X0, X1 + 1):
    for y in range(Y0, Y1 + 1):
        t = np.asarray(Image.open(f'{TILES}/{x}_{y}.png').convert('RGB')).astype(np.float32)
        mos[(y - Y0) * 256:(y - Y0 + 1) * 256, (x - X0) * 256:(x - X0 + 1) * 256] = t[..., 0] * 256 + t[..., 1] + t[..., 2] / 256 - 32768
lon = LON0 + (np.arange(N) + .5) / N * (LON1 - LON0)
lat = LAT1 - (np.arange(N) + .5) / N * (LAT1 - LAT0)
px = (lon + 180) / 360 * 2 ** Z * 256 - X0 * 256 - .5
py = (1 - np.arcsinh(np.tan(np.radians(lat))) / np.pi) / 2 * 2 ** Z * 256 - Y0 * 256 - .5
x0 = np.clip(np.floor(px).astype(int), 0, mos.shape[1] - 2); fx = (px - x0).astype(np.float32)
y0 = np.clip(np.floor(py).astype(int), 0, mos.shape[0] - 2); fy = (py - y0).astype(np.float32)[:, None]
h = (mos[np.ix_(y0, x0)] * (1 - fx) + mos[np.ix_(y0, x0 + 1)] * fx) * (1 - fy) + (mos[np.ix_(y0 + 1, x0)] * (1 - fx) + mos[np.ix_(y0 + 1, x0 + 1)] * fx) * fy

# ---- mainland mask ----
land = (h > 0) & (lat[:, None] < CUT)
sx, sy = int((77.59 - LON0) / (LON1 - LON0) * N), int((LAT1 - 12.97) / (LAT1 - LAT0) * N)
q = 4; m = N // q                                                     # flood from Bengaluru on a coarse grid to drop islands
coarse = land.reshape(m, q, m, q).max((1, 3)).ravel().tolist()
seen = bytearray(m * m); stack = [(sy // q) * m + sx // q]; seen[stack[0]] = 1
while stack:
    i = stack.pop()
    for j in (i - 1, i + 1, i - m, i + m):
        if 0 <= j < m * m and coarse[j] and not seen[j]: seen[j] = 1; stack.append(j)
main = np.kron(np.frombuffer(bytes(seen), np.uint8).reshape(m, m), np.ones((q, q), np.uint8)) > 0
mask = (land & main).astype(np.float32)
edge = np.clip((blur(mask, 6) - 0.5) * 2, 0, 1)                       # 0 at the coast, 1 inland
north = sstep(0, 0.18, CUT - lat)[:, None]                            # bevel down to the northern cut
hm = blur(np.maximum(h, 0), 1, 1) * mask * edge * north               # metres
hw = hm / 1000 * YSCALE                                               # world units
print('land px', int(mask.sum()), 'max m', float(hm.max()))

# ---- rivers: priority-flood drainage tree at half resolution ----
n = N // 2
H2 = hm.reshape(n, 2, n, 2).mean((1, 3)); M2 = mask.reshape(n, 2, n, 2).min((1, 3)) > 0
Hl = H2.ravel().tolist(); Ml = M2.ravel().tolist()
pm = np.pad(M2, 1); border = M2 & ~(pm[:-2, 1:-1] & pm[2:, 1:-1] & pm[1:-1, :-2] & pm[1:-1, 2:])
done = bytearray(n * n); parent = [-1] * (n * n); order = []
heap = [(Hl[i], i) for i in np.flatnonzero(border.ravel()).tolist()]
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
rv = np.clip((np.log(np.maximum(acc, 1)) - np.log(1500)) / (np.log(90000) - np.log(1500)), 0, 1) * (acc > 1500)
rv = np.kron(rv, np.ones((2, 2), np.float32))
river = np.clip(np.maximum(blur((rv > 0).astype(np.float32), 1, 2) * 1.8, blur((rv > 0.45).astype(np.float32), 2, 2) * 2.6), 0, 1) * mask
valley = np.clip(blur((rv > 0.25).astype(np.float32), 14, 2) * 5, 0, 1)

# ---- land cover guess: forest on hills and the wet west, farmland near coasts and rivers, dry tan plateau ----
dlon = (LON1 - LON0) / N
cols = np.arange(N)[None, :]
has = mask.max(1) > 0
first = np.where(has, mask.argmax(1), 10 ** 6)[:, None]; last = np.where(has, N - 1 - mask[:, ::-1].argmax(1), -10 ** 6)[:, None]
dW = np.maximum(cols - first, 0) * dlon; dE = np.maximum(last - cols, 0) * dlon
gy, gx = np.gradient(blur(hm, 1, 1))
steep = blur(np.hypot(gx, gy), 5, 2)
rng = np.random.default_rng(4)
n1 = blur(rng.standard_normal((N, N)).astype(np.float32), 14, 2); n1 /= n1.std()
n2 = blur(rng.standard_normal((N, N)).astype(np.float32), 3, 2); n2 /= n2.std()
n3 = rng.standard_normal((N, N)).astype(np.float32)
wetW = np.exp(-dW / 0.75)
moist = np.clip(np.maximum(wetW * 1.5, np.exp(-dE / 1.3) * 0.6) + sstep(900, 1600, hm) * 0.6, 0, 1)
forest = np.clip(sstep(7, 26, steep) * (0.4 + 0.6 * moist) + wetW * 0.5 * sstep(-0.6, 0.8, n1) + n1 * 0.08, 0, 1) * mask
green = np.clip(np.maximum.reduce([np.exp(-dE / 0.9), wetW * 1.3, valley * 0.85]) + n1 * 0.1, 0, 1)

tan, sage, lush, wood = (np.array(c, np.float32) for c in ([206, 186, 138], [164, 176, 112], [126, 158, 92], [50, 84, 50]))
col = lerp(np.broadcast_to(tan, (N, N, 3)).copy(), sage, green)
col = lerp(col, lush, np.clip(green * wetW * 1.6, 0, 1))
col = lerp(col, wood, sstep(0.25, 0.8, forest) * 0.92)
col *= (1 + 0.07 * n1 + 0.035 * n2 + 0.015 * n3)[..., None]
col = lerp(col, np.array([84, 128, 136], np.float32), river * 0.9)
urban = np.zeros((N, N), np.float32)
for clon, clat, rad in CITIES:
    cx, cy = (clon - LON0) / (LON1 - LON0) * N, (LAT1 - clat) / (LAT1 - LAT0) * N
    yy, xx = np.ogrid[:N, :N]
    urban = np.maximum(urban, np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * rad * rad))))
col = lerp(col, np.array([206, 198, 186], np.float32), np.clip(urban * (0.75 + 0.3 * n2), 0, 1) * 0.8)

# ---- baked light: sun from the north-west, cast shadows, ambient occlusion ----
wx, wz = dlon * 0.97, (LAT1 - LAT0) / N
gz, gxw = np.gradient(blur(hw, 1, 1)); gxw /= wx; gz /= wz
L = np.array([-0.60, 0.62, -0.50]); L /= np.linalg.norm(L)
lam = (-gxw * L[0] + L[1] - gz * L[2]) / np.sqrt(gxw ** 2 + 1 + gz ** 2)
light = np.clip(0.5 + 0.5 * lam / L[1], 0.3, 1.2)
drop = np.hypot(wx, wz) * L[1] / np.hypot(L[0], L[2])
occ = np.zeros((N, N), np.float32)
for k in range(1, 90):
    s = np.zeros_like(hw); s[k:, k:] = hw[:-k, :-k]
    occ = np.maximum(occ, s - k * drop - hw)
shadow = blur(sstep(0.0, 0.03, occ), 1, 1)
ao = np.clip(1 - (blur(hw, 7, 2) - hw) * 5, 0.62, 1.06)
col = np.clip(col * (light * (1 - 0.42 * shadow) * ao)[..., None], 0, 255)
col = np.where(mask[..., None] > 0, col, blur(mask, 3)[..., None] * 0 + np.array([176, 148, 104], np.float32))

# ---- write ----
Image.fromarray(col.astype(np.uint8)).save(f'{OUT}/color.webp', quality=90, method=6)
Image.fromarray((np.clip(blur(mask, 1, 2), 0, 1) * 255).astype(np.uint8)).save(f'{OUT}/mask.png', optimize=True)
h1 = hm.reshape(n, 2, n, 2).mean((1, 3))
Image.fromarray((np.sqrt(np.clip(h1 / 2800, 0, 1)) * 255 + .5).astype(np.uint8)).save(f'{OUT}/height.png', optimize=True)
Image.fromarray((forest.reshape(512, 4, 512, 4).mean((1, 3)) * 255).astype(np.uint8)).save(f'{OUT}/forest.png', optimize=True)
sh = blur(mask.reshape(512, 4, 512, 4).mean((1, 3)), 9, 3)
rgba = np.zeros((512, 512, 4), np.uint8); rgba[..., 0] = 28; rgba[..., 1] = 33; rgba[..., 2] = 60; rgba[..., 3] = (sh * 150).astype(np.uint8)
Image.fromarray(rgba).save(f'{OUT}/shadow.png', optimize=True)
Image.fromarray(col.astype(np.uint8)).resize((1024, 1024)).save(f'{OUT}/_preview.jpg', quality=85)
print('done')
