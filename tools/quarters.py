"""Run from the repo root: python tools/quarters.py — finds where the real quarters of each place are on
OpenStreetMap (Nominatim, max 1 request a second) and caches them in tools/cache/quarters-<place>.json."""
import json, os, subprocess, time, urllib.parse
CANDIDATES = {
    'cocody': ['Deux Plateaux', 'Vallon', 'Blockhaus', 'Danga', 'Saint-Jean', 'Riviera 2', 'Riviera 3', 'Riviera Palmeraie', 'Angré', "M'Pouto", 'Akouédo', 'Anono', 'Attoban', 'Cocody Centre', 'Riviera Golf', 'Bonoumin', 'Ambassades'],
    'abobo': ['Abobo Gare', 'Anador', 'PK 18', 'Avocatier', 'Sagbé', "N'Dotré", 'Abobo Té', 'Belleville', 'Akeikoi', 'Samaké', 'Kennedy', 'Habitat', 'Baoulé', 'Plaque', 'Agbékoi', 'Dokui', 'Clouetcha'],
    'bouake': ['Commerce', 'Municipal', 'Koko', 'Nimbo', 'Dar-Es-Salam', 'Air France', 'Ngattakro', 'TSF', 'Broukro', 'Ahougnansou', 'Kennedy', 'Gonfreville', 'Belleville', 'Sokoura', 'Zone Industrielle', 'Dougouba', 'Liberté'],
    'korhogo': ['Haoussabougou', 'Soba', 'Quartier 14', 'Air France', 'Koko', 'Petit-Paris', 'Prémafolo', 'Ali Kader', 'Tchekelezo', 'Résidentiel', 'Commerce', 'Delafosse'],
    'man': ['Libreville', 'Domoraud', 'Air France', 'Grand Gbapleu', 'Petit Gbapleu', 'Kennedy', 'Commerce', 'Lycée', 'CAFOP', 'Doyaguiné', 'Gbêpleu', 'Thérèse', 'Belle-Ville', 'Zélé'],
}
CITY = {'cocody': 'Cocody, Abidjan', 'abobo': 'Abobo, Abidjan', 'bouake': 'Bouaké', 'korhogo': 'Korhogo', 'man': 'Man'}
BOX = {'cocody': (5.31, 5.45, -4.03, -3.90), 'abobo': (5.38, 5.48, -4.18, -3.95), 'bouake': (7.62, 7.77, -5.12, -4.95), 'korhogo': (9.40, 9.51, -5.70, -5.57), 'man': (7.36, 7.46, -7.60, -7.50)}
GOOD = {'quarter', 'neighbourhood', 'suburb', 'residential', 'marketplace', 'bus_station', 'village', 'hamlet', 'locality', 'city_block', 'administrative', 'bus_stop'}
for place, names in CANDIDATES.items():
    if os.path.exists(f'tools/cache/quarters-{place}.json'): continue
    out = {}
    a, b, c, d = BOX[place]
    for n in names:
        u = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': f'{n}, {CITY[place]}', 'format': 'json', 'limit': 5, 'countrycodes': 'ci'})
        for t in range(4):
            r = subprocess.run(['curl', '-sS', '-m', '40', '-A', 'babiland-boss-map-build', u], capture_output=True, text=True)
            time.sleep(1.5 + 4 * t)
            try:
                got = json.loads(r.stdout or '[]'); break
            except ValueError:
                got = []
        res = [x for x in got if a < float(x['lat']) < b and c < float(x['lon']) < d and x['type'] in GOOD]
        if res:
            x = res[0]
            out[n] = [round(float(x['lat']), 5), round(float(x['lon']), 5), x['name'], x['type']]
        print(place, n, '->', out.get(n))
    json.dump(out, open(f'tools/cache/quarters-{place}.json', 'w'), ensure_ascii=False, indent=0)
