import json

with open('data/peta_desa_v3.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)
features = data['features']
print(f'Total desa/kelurahan: {len(features)}')
p = features[0]['properties']
print(f'Property keys: {list(p.keys())}')
for f in features[:5]:
    print(f'  {f["properties"]["Nama_Desa_"]} - {f["properties"]["Kecamatan"]}')
