"""Run from the repo root: pip install shapely scipy; python tools/districts.py
Real district areas of Yopougon from OpenStreetMap places (Babi Life data, ODbL).
Each OSM quarter goes to the nearest game district; every place point gets its district; a Voronoi diagram of
all the points, merged per district and clipped to the commune's outline (concave hull of all places), gives
the areas. Output: GeoJSON of the game districts (index = order in turf.ts)."""
import json, sys
from collections import defaultdict
from shapely.geometry import MultiPoint, Point, mapping, box
from shapely.ops import unary_union, voronoi_diagram
from shapely import concave_hull

import os
# the OSM places of the commune, from Babi Life (github.com/Myahse/babi-life, backend/internal/world/osm/)
SRC = os.environ.get('SRC', '../babi-life/backend/internal/world/osm/yopougon.json')
OUT = os.environ.get('OUT', 'web/public/assets/maps/yopougon.json')
GAME = ['Selmer', 'Wassakara', 'Siporex', 'Score', 'Banco\xa02', 'Sogefiha Solic 1 & 2', 'Quartier Maroc', 'Port-Bouët II', 'Micao', 'Gesco', 'Zone Industrielle', 'Koweit']

d = json.load(open(SRC))
pts = [(p[4], p[3], p[5]) for p in d['places']]  # lng, lat, quarter
q = defaultdict(list)
for x, y, k in pts: q[k].append((x, y))
cent = {k: (sum(a for a, _ in v) / len(v), sum(b for _, b in v) / len(v)) for k, v in q.items()}
gc = [cent[g] for g in GAME]
def nearest(c):
    return min(range(len(GAME)), key=lambda i: (gc[i][0] - c[0]) ** 2 + (gc[i][1] - c[1]) ** 2)
quarter_to = {k: (GAME.index(k) if k in GAME else nearest(c)) for k, c in cent.items()}

# dedupe points a little (Voronoi on 7000 points is fine)
seen = {}
for x, y, k in pts:
    seen[(round(x, 4), round(y, 4))] = quarter_to[k]
mp = MultiPoint([Point(x, y) for (x, y) in seen])
outline = concave_hull(mp, ratio=0.12).buffer(0.0012).simplify(0.0004).intersection(box(-4.2, 5.313, -4.0, 5.4))  # drop the thin tail of isolated shops along the southern road
cells = voronoi_diagram(mp, envelope=outline.envelope.buffer(0.01))
by = defaultdict(list)
lookup = {}
for (x, y), i in seen.items(): lookup[(x, y)] = i
for cell in cells.geoms:
    # the point inside this cell
    c = cell.representative_point()
    best = None
    for p in mp.geoms:
        if cell.contains(p):
            best = lookup[(p.x, p.y)]
            break
    if best is None: continue
    by[best].append(cell)
feats = []
areas = []
for i, g in enumerate(GAME):
    area = unary_union(by[i]).intersection(outline).buffer(0.00025).buffer(-0.00025).simplify(0.00012)
    if area.geom_type == 'MultiPolygon':  # keep the main piece
        area = max(area.geoms, key=lambda a: a.area)
    areas.append(area)
    lab = area.representative_point()
    feats.append({'type': 'Feature', 'properties': {'i': i, 'osm': g, 'label': [round(lab.x, 5), round(lab.y, 5)]}, 'geometry': json.loads(json.dumps(mapping(area)))})
    print(g, round(area.area * 1e6, 1), 'quarters:', sum(1 for k, v in quarter_to.items() if v == i))
# which districts touch (share a border)
for i, f in enumerate(feats):
    f['properties']['n'] = [j for j in range(len(areas)) if j != i and areas[i].buffer(0.0004).intersects(areas[j])]
    print(GAME[i], '->', [GAME[j] for j in f['properties']['n']])
b = outline.bounds
out = {'type': 'FeatureCollection', 'bounds': [round(v, 5) for v in b], 'source': 'OpenStreetMap contributors (ODbL), via Babi Life', 'features': feats}
# round coordinates to keep the file small
def rnd(o):
    if isinstance(o, float): return round(o, 5)
    if isinstance(o, list): return [rnd(v) for v in o]
    if isinstance(o, tuple): return [rnd(v) for v in o]
    if isinstance(o, dict): return {k: rnd(v) for k, v in o.items()}
    return o
json.dump(rnd(out), open(OUT, 'w'), separators=(',', ':'))
print('bounds', b)
