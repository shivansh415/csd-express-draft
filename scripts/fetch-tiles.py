"""Download the Terrarium elevation tiles the map bake needs (Mapzen / AWS Terrain Tiles, open data).
Usage: python3 scripts/fetch-tiles.py <out-dir>
Writes <out-dir>/z<zoom>/<x>_<y>.png for the two windows in scripts/bake-map.py."""
import math, os, sys, subprocess
from concurrent.futures import ThreadPoolExecutor

OUT = sys.argv[1]
WINDOWS = {8: (70.0, 88.0, 5.5, 22.0), 9: (75.0, 81.6, 8.9, 18.2)}  # zoom: lon0, lon1, lat0, lat1

def tx(lon, z): return int((lon + 180) / 360 * 2 ** z)
def ty(lat, z): return int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2 ** z)

jobs = []
for z, (lon0, lon1, lat0, lat1) in WINDOWS.items():
    os.makedirs(f'{OUT}/z{z}', exist_ok=True)
    for x in range(tx(lon0, z), tx(lon1, z) + 1):
        for y in range(ty(lat1, z), ty(lat0, z) + 1):
            dst = f'{OUT}/z{z}/{x}_{y}.png'
            if not os.path.exists(dst):
                jobs.append((f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png', dst))
    print(f'z{z}: x {tx(lon0, z)}-{tx(lon1, z)}, y {ty(lat1, z)}-{ty(lat0, z)}')

def get(job):
    return subprocess.run(['curl', '-s', '--fail', '--retry', '3', job[0], '-o', job[1]]).returncode
with ThreadPoolExecutor(12) as ex:
    bad = sum(1 for rc in ex.map(get, jobs) if rc)
print(f'downloaded {len(jobs) - bad}, failed {bad}')
