"""Run from the repo root after tools/cities.py: python3 tools/neighbours.py
The districts of every place for the server (backend/internal/turf/districts.json): their names and the ones
they touch, so the server itself checks that you only attack next to what you hold."""
import json, glob, os
out = {}
for f in sorted(glob.glob('web/public/assets/maps/*.json')):
    place = os.path.basename(f)[:-5]
    d = json.load(open(f))
    feats = sorted(d['features'], key=lambda x: x['properties']['i'])
    out[place] = [{'name': x['properties']['osm'].replace('\xa0', ' ').replace('Sogefiha Solic 1 & 2', 'Sogefiha').replace('Koweit', 'Koweït'), 'n': x['properties']['n']} for x in feats]
json.dump(out, open('backend/internal/turf/districts.json', 'w'), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in out.items()})
