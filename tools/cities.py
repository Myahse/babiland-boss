"""Run from the repo root: pip install shapely numpy; python tools/quarters.py; python tools/cities.py
Real districts of every place except Yopougon (that one is tools/districts.py), from OpenStreetMap (ODbL):
- each district is a real quarter, found on OpenStreetMap by Nominatim (tools/quarters.py, cached in
  tools/cache/); its area is the part of the commune closer to it than to the other quarters (Voronoi);
- the commune is its real boundary (Nominatim, cached) and/or the area where its shops, maquis, schools,
  churches and mosques are (Babi Life data: github.com/Myahse/babi-life, backend/internal/world/osm/).
Writes public/assets/maps/<place>.json (areas, labels, neighbours) and src/arcade/realDistricts.ts (names,
bosses, neighbours, key zones) that turf.ts reads."""
import json, os
import numpy as np
from shapely.geometry import MultiPoint, Point, shape, mapping
from shapely.ops import voronoi_diagram, unary_union
from shapely import concave_hull

OSM = os.environ.get('OSM', '../myahse/babi-life/backend/internal/world/osm')
if not os.path.isdir(OSM): OSM = '../babi-life/backend/internal/world/osm'
CACHE = 'tools/cache'
MAPS = 'web/public/assets/maps'
TS = 'web/src/arcade/realDistricts.ts'


def q(place, *names):
    """Quarters found by tools/quarters.py, in this order (the first one is where you start)."""
    got = json.load(open(f'{CACHE}/quarters-{place}.json'))
    return [(n.split('=')[0], *got[n.split('=')[-1]][:2]) for n in names]


# (name, lat, lng); the first is your home district. Hand-checked on the map: no two quarters closer than ~500 m.
SEEDS = {
    'cocody': q('cocody', 'Deux Plateaux', 'Vallon', 'Blockhaus', 'Ambassades', 'Riviera Golf', 'Riviera 2', 'Riviera 3', 'Palmeraie=Riviera Palmeraie', 'Attoban', 'Angré', 'M’Pouto=M\'Pouto', 'Akouédo'),
    'abobo': q('abobo', 'Abobo Gare', 'Anador', 'Sagbé', 'Samaké', 'Kennedy', 'Abobo Té', 'Belleville', 'Habitat', 'Akeïkoi=Akeikoi', 'Avocatier', 'N’Dotré=N\'Dotré', 'PK 18'),
    'treichville': [('Arras', 5.29995, -4.00339), ('Biafra', 5.31344, -4.00484), ('Belleville', 5.30461, -3.99714), ('Gare de Bassam', 5.29905, -4.00329),
                    ('Notre-Dame', 5.30394, -4.00403), ('Zone 2', 5.29962, -4.00954), ('Zone 3', 5.29571, -3.99597), ('Cité du Port', 5.28650, -4.01250)],
    'bouake': q('bouake', 'Commerce=Municipal', 'Koko', 'Nimbo', 'Dar-es-Salam=Dar-Es-Salam', 'Air France', 'Ngattakro', 'TSF', 'Broukro', 'Kennedy', 'Gonfreville', 'Belleville', 'Zone Industrielle'),
    'korhogo': q('korhogo', 'Soba', 'Haoussabougou', 'Quartier 14', 'Air France', 'Koko', 'Prémafolo', 'Ali Kader', 'Résidentiel'),
    'gagnoa': [('Garahio', 6.11525, -5.93398), ('Commerce', 6.13089, -5.94484), ('Libreville', 6.12087, -5.94953), ('Soleil', 6.12395, -5.93117),
               ('Château', 6.13894, -5.95995), ('Barouhio', 6.12482, -5.96131), ('Lycée', 6.11005, -5.92500)],
    'man': [('Kennedy', 7.42216, -7.55102), ('Libreville', 7.42302, -7.55596), ('Air France', 7.41861, -7.54560), ('Domoraud', 7.41164, -7.56468), ('Commerce', 7.40508, -7.55702),
            ('Dioulabougou', 7.41064, -7.55218), ('CAFOP', 7.39695, -7.56392), ('Gbêpleu', 7.41557, -7.57096), ('Gbapleu', 7.40852, -7.53017)],
}
# where the shops are (to draw the commune's outline where there is no boundary or it is far too big)
SRC = {'cocody': 'cocody', 'abobo': 'abobo', 'treichville': 'treichville', 'bouake': 'bouake-centre', 'korhogo': 'korhogo-centre', 'man': 'man-centre'}
# key zones: district -> (bonus kind, the real place it stands for)
KEYS = {
    'cocody': {'Vallon': ('night', 'les maquis de la rue des Jardins'), 'Angré': ('market', 'le marché d’Angré'), 'Blockhaus': ('gare', 'la gare lagunaire'), 'Riviera 2': ('sales', 'le carrefour de la Riviera 2')},
    'abobo': {'Kennedy': ('market', 'le marché Kennedy Clouetcha'), 'Anador': ('gare', 'la gare d’Anador'), 'Sagbé': ('night', 'les maquis de Sagbé'), 'PK 18': ('industry', 'les ateliers du PK 18')},
    'treichville': {'Belleville': ('market', 'le marché de Belleville'), 'Gare de Bassam': ('gare', 'la gare de Bassam'), 'Cité du Port': ('industry', 'le port d’Abidjan'), 'Biafra': ('night', 'les maquis de la rue 12')},
    'bouake': {'Gonfreville': ('industry', 'l’usine Gonfreville'), 'Dar-es-Salam': ('market', 'le marché de Dar-es-Salam'), 'Koko': ('night', 'les maquis de Koko'), 'Nimbo': ('gare', 'la gare routière'), 'Zone Industrielle': ('industry', 'la zone industrielle')},
    'korhogo': {'Haoussabougou': ('market', 'le grand marché de Korhogo'), 'Koko': ('night', 'les maquis de Koko'), 'Air France': ('gare', 'la gare UTB')},
    'gagnoa': {'Commerce': ('market', 'le grand marché de Gagnoa'), 'Soleil': ('night', 'les maquis du quartier Soleil'), 'Château': ('gare', 'la gare routière')},
    'man': {'Commerce': ('market', 'le grand marché de Man'), 'Air France': ('night', 'les maquis d’Air France'), 'Gbapleu': ('gare', 'la gare de Gbapleu')},
}
BOSSES = {
    'cocody': ['Boss Kader', 'Tantie Rose', 'Le Grand Yves', 'Mama Akissi', 'Le Ministre', 'Miss Prisca', 'Tonton Brou', 'Boss Ange', 'Le Doc', 'Tantie Nadège', 'Petit Wilfried', 'Mama Évelyne'],
    'abobo': ['Boss Drissa', 'Mama Salimata', 'Le Vieux Bamba', 'Petit Koné', 'Tonton Lassina', 'Mama Kadi', 'Boss Ousmane', 'Le Gaou Fofana', 'Tantie Awa', 'Commandant Sylla', 'Grand Moussa', 'Mama Rokia'],
    'treichville': ['Boss Tapé', 'Tantie Lou', 'Le Doyen Gnahoré', 'Mama Adjoua', 'Capitaine Djédjé', 'DJ Zouglou', 'Mama Lagune', 'Le Vieux Ahoua'],
    'bouake': ['Boss Kouassi', 'Mama Amenan', 'Le Vieux Konan', 'Tantie Affoué', 'Commandant Yao', 'Mama Ahou', 'Boss Kouadio', 'Le Grand N’Guessan', 'Tantie Adjoua', 'Petit Kouamé', 'Le Vieux Tanoh', 'Mama Akissi'],
    'korhogo': ['Boss Soro', 'Mama Fatim', 'Le Vieux Coulibaly', 'Tantie Mariam', 'Boss Silué', 'Mama Nabintou', 'Le Grand Yéo', 'Tonton Tuo'],
    'gagnoa': ['Boss Gbagbo', 'Mama Zadi', 'Le Vieux Dakoury', 'Tantie Gnépo', 'Boss Kipré', 'Mama Gnahoré', 'Le Grand Zoukou'],
    'man': ['Boss Tia', 'Mama Gueu', 'Le Vieux Dan', 'Tantie Sahi', 'Boss Gbeu', 'Mama Kpan', 'Le Grand Zézé', 'Tonton Dion', 'Mama Gonh'],
}
M = 1 / 111000  # ~ one metre in degrees


def boundary(place):
    f = f'{CACHE}/boundary-{place}.json'
    g = json.load(open(f))['geojson'] if os.path.exists(f) else None
    return shape(g).buffer(0) if g and g['type'] in ('Polygon', 'MultiPolygon') else None


def build(place):
    seeds = SEEDS[place]
    sp = MultiPoint([Point(lng, lat) for _, lat, lng in seeds])
    # the town: around the quarters, where the places are (not farther than 1.6 km from a quarter)
    area = sp.convex_hull.buffer(700 * M)
    if place in SRC:
        pts = [Point(p[4], p[3]) for p in json.load(open(f'{OSM}/{SRC[place]}.json'))['places']]
        pts = [p for p in pts if sp.distance(p) < 1600 * M]
        if len(pts) > 30:
            area = unary_union([area, concave_hull(MultiPoint(pts), ratio=0.3).buffer(350 * M)])
    bnd = boundary(place)
    outline = area.intersection(bnd) if bnd is not None else area
    if outline.geom_type != 'Polygon':
        outline = max(outline.geoms, key=lambda g: g.area)
    outline = outline.simplify(60 * M)
    cells = voronoi_diagram(sp, envelope=outline.envelope.buffer(0.02))
    areas = []
    for _, lat, lng in seeds:
        c = next(c for c in cells.geoms if c.contains(Point(lng, lat)))
        a = c.intersection(outline)
        if a.geom_type != 'Polygon':
            a = max((g for g in a.geoms if g.geom_type == 'Polygon'), key=lambda g: g.area)
        areas.append(a)
    feats, meta = [], []
    for i, a in enumerate(areas):
        name = seeds[i][0]
        n = [j for j in range(len(areas)) if j != i and a.buffer(15 * M).intersects(areas[j]) and a.buffer(15 * M).intersection(areas[j]).area > (60 * M) ** 2]
        # the label sits on the real quarter when it is inside its area
        sp_i = Point(seeds[i][2], seeds[i][1])
        lab = sp_i if a.buffer(-80 * M).contains(sp_i) else a.representative_point()
        b = KEYS[place].get(name) if i else None
        feats.append({'type': 'Feature', 'properties': {'i': i, 'osm': name, 'label': [lab.x, lab.y], 'n': n}, 'geometry': mapping(a)})
        meta.append({'name': name, 'n': n, 'bonus': b})
    out = {'type': 'FeatureCollection', 'bounds': list(outline.bounds), 'source': 'OpenStreetMap contributors (ODbL)', 'features': feats}
    json.dump(rnd(out), open(f'{MAPS}/{place}.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    km2 = outline.area * (111.0 ** 2) * np.cos(np.radians(seeds[0][1]))
    print(place, round(km2, 1), 'km²')
    for m in meta: print('  ', m['name'], m['n'], m['bonus'] or '')
    missing = [k for k in KEYS[place] if k not in [m['name'] for m in meta[1:]]]
    if missing: print('   !! key zones not found:', missing)
    return meta


def rnd(o):
    if isinstance(o, float): return round(o, 5)
    if isinstance(o, (list, tuple)): return [rnd(v) for v in o]
    if isinstance(o, dict): return {k: rnd(v) for k, v in o.items()}
    return o


res = {p: build(p) for p in SEEDS}
lines = ['// Generated by tools/cities.py from OpenStreetMap (ODbL): do not edit by hand.',
         '// The real districts of each place (index 0 = where you start), the ones they share a border with, and',
         '// the key zones: bonus kind + the real place it stands for.',
         "export type RealDistrict = { name: string; boss: string; n: number[]; bonus?: ['sales' | 'industry' | 'market' | 'night' | 'gare', string] }",
         'export const REAL_DISTRICTS: Record<string, RealDistrict[]> = {']
for p, meta in res.items():
    lines.append(f'  {p}: [')
    for i, m in enumerate(meta):
        b = f", bonus: ['{m['bonus'][0]}', {json.dumps(m['bonus'][1], ensure_ascii=False)}]" if m['bonus'] else ''
        lines.append(f"    {{ name: {json.dumps(m['name'], ensure_ascii=False)}, boss: {json.dumps(BOSSES[p][i % len(BOSSES[p])], ensure_ascii=False)}, n: {json.dumps(m['n'])}{b} }},")
    lines.append('  ],')
lines.append('}')
open(TS, 'w').write('\n'.join(lines) + '\n')
print('wrote', TS)
