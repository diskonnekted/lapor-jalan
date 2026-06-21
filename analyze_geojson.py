import json

with open('data/banjarnegara-jalan.geojson', 'r', encoding='utf-8', errors='ignore') as f:
    data = json.load(f)
features = data['features']
print(f'Total features: {len(features)}')

# Analyze types
types = {}
for f in features:
    t = f['properties'].get('type', 'unknown')
    types[t] = types.get(t, 0) + 1
print('\nRoad types:')
for t, c in sorted(types.items(), key=lambda x: -x[1]):
    print(f'  {t}: {c}')

# Check name coverage
named = sum(1 for f in features if f['properties'].get('name'))
print(f'\nNamed roads: {named}/{len(features)} ({named/len(features)*100:.1f}%)')

# Sample
s = features[0]
print(f'\nSample feature keys: {list(s["properties"].keys())}')
print(f'Sample coords count: {len(s["geometry"]["coordinates"])}')

# Bounding box
lats = []
lngs = []
for f in features:
    for coord in f['geometry']['coordinates']:
        lngs.append(coord[0])
        lats.append(coord[1])
print(f'\nBounding box: lat {min(lats):.4f}-{max(lats):.4f}, lng {min(lngs):.4f}-{max(lngs):.4f}')
