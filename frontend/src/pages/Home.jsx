import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { api } from '../utils/api';
import './Home.css';

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icon - large circle with white border for high visibility
function createWarningIcon(level) {
  const colors = {
    ringan: '#4CAF50',
    sedang: '#FF9800',
    berat: '#F44336',
  };
  const color = colors[level] || '#999';

  return L.divIcon({
    className: 'damage-marker-icon',
    html: `<div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${color};
      border: 4px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.5);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-weight: bold;
        font-size: 16px;
        font-family: Arial, sans-serif;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      ">!</div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

// MarkerCluster component
function DamageMarkerCluster({ markers }) {
  const map = useMap();
  const clusterRef = useRef(null);

  useEffect(() => {
    if (!map || markers.length === 0) return;

    // Create cluster group
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        let color = '#4CAF50';
        if (count > 10) { size = 'large'; color = '#F44336'; }
        else if (count > 5) { size = 'medium'; color = '#FF9800'; }

        return L.divIcon({
          html: `<div style="
            background: ${color};
            color: white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">${count}</div>`,
          className: 'custom-cluster',
          iconSize: L.point(40, 40),
        });
      },
    });

    // Add markers
    markers.forEach((m) => {
      const marker = L.marker([m.data.lat, m.data.lng], {
        icon: createWarningIcon(m.data.tingkat_kerusakan),
      }).bindPopup(`
        <div style="min-width:200px">
          <strong>${m.data.alamat || 'Lokasi Tidak Dikenal'}</strong><br/>
          <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;background:${m.data.tingkat_kerusakan === 'berat' ? '#FFEBEE;color:#C62828' : m.data.tingkat_kerusakan === 'sedang' ? '#FFF3E0;color:#E65100' : '#E8F5E9;color:#2E7D32'}">${m.data.tingkat_kerusakan?.toUpperCase() || 'N/A'}</span>
          ${m.data.deskripsi ? `<p style="margin-top:8px">${m.data.deskripsi}</p>` : ''}
          ${m.data.foto_path ? `<img src="${m.data.foto_path}" style="width:100%;border-radius:4px;margin-top:8px"/>` : ''}
          <div style="font-size:0.75rem;color:#999;margin-top:4px">${new Date(m.data.created_at).toLocaleDateString('id-ID')}</div>
        </div>
      `);
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterRef.current = clusterGroup;

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
      }
    };
  }, [markers, map]);

  return null;
}

// Component to render desa boundaries
function DesaBoundaryLayer({ desaBoundaries, showDesa }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    console.log('DesaBoundaryLayer: showDesa=', showDesa, 'count=', desaBoundaries?.length);
    if (!showDesa || !desaBoundaries || desaBoundaries.length === 0) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    const layer = L.featureGroup();
    let rendered = 0;

    desaBoundaries.forEach((d) => {
      try {
        const geometry = JSON.parse(d.geometry);
        if (geometry.type === 'Polygon') {
          const coords = geometry.coordinates[0].map((c) => [c[1], c[0]]);
          L.polygon(coords, {
            color: '#9C27B0',
            weight: 1.5,
            opacity: 0.5,
            fillColor: '#9C27B0',
            fillOpacity: 0.05,
          }).bindPopup(`<strong>${d.nama_desa}</strong><br/>${d.kecamatan}`).addTo(layer);
          rendered++;
        }
      } catch (e) {
        // Skip invalid geometry
      }
    });

    console.log(`DesaBoundaryLayer: rendered ${rendered} polygons`);
    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [desaBoundaries, showDesa, map]);

  return null;
}

// Component to fit map bounds
function FitBounds({ markers, ruasJalan, showRuas, osmRoads, showOsmRoads }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    if (markers.length > 0) {
      markers.forEach((m) => points.push([m.lat, m.lng]));
    }
    if (showRuas && ruasJalan && ruasJalan.length > 0) {
      ruasJalan.forEach((r) => {
        if (r.from_lat && r.from_lng) points.push([r.from_lat, r.from_lng]);
        if (r.to_lat && r.to_lng) points.push([r.to_lat, r.to_lng]);
      });
    }
    if (showOsmRoads && osmRoads && osmRoads.length > 0) {
      const sample = osmRoads.slice(0, 50);
      sample.forEach((r) => {
        if (r.geometry) {
          r.geometry.forEach((coord) => points.push([coord[1], coord[0]]));
        }
      });
    }
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [markers, ruasJalan, showRuas, osmRoads, showOsmRoads, map]);
  return null;
}

const DAMAGE_COLORS = {
  ringan: '#4CAF50',
  sedang: '#FF9800',
  berat: '#F44336',
};

const DAMAGE_LABELS = {
  ringan: 'Ringan',
  sedang: 'Sedang',
  berat: 'Berat',
};

// Road type colors
const ROAD_TYPE_COLORS = {
  primary: '#D32F2F',
  secondary: '#F57C00',
  tertiary: '#FBC02D',
  trunk: '#B71C1C',
  unclassified: '#90A4AE',
  living_street: '#78909C',
  residential: '#B0BEC5',
  service: '#CFD8DC',
  track: '#8D6E63',
  path: '#66BB6A',
  footway: '#4CAF50',
  pedestrian: '#26A69A',
  steps: '#5D4037',
};

const ROAD_TYPE_LABELS = {
  primary: 'Jalan Utama (Primary)',
  secondary: 'Jalan Sekunder',
  tertiary: 'Jalan Tersier',
  trunk: 'Jalan Tol/Trunk',
  unclassified: 'Jalan Tidak Diklasifikasi',
  living_street: 'Jalan Perumahan',
  residential: 'Jalan Residen',
  service: 'Jalan Layanan',
  track: 'Jalan Setapak',
  path: 'Jalur Pejalan',
  footway: 'Trotoar',
  pedestrian: 'Jalan Pedestrian',
  steps: 'Tangga',
};

export default function Home() {
  const [laporan, setLaporan] = useState([]);
  const [ruasJalan, setRuasJalan] = useState([]);
  const [osmRoads, setOsmRoads] = useState([]);
  const [stats, setStats] = useState(null);
  const [damageFilter, setDamageFilter] = useState({ ringan: false, sedang: false, berat: false });
  const [loading, setLoading] = useState(true);
  const [showRuas, setShowRuas] = useState(true);
  const [showOsmRoads, setShowOsmRoads] = useState(true);
  const [showDesa, setShowDesa] = useState(false);
  const [desaBoundaries, setDesaBoundaries] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  // Road type filter
  const [selectedTypes, setSelectedTypes] = useState([
    'primary', 'secondary', 'tertiary', 'trunk', 'unclassified', 'living_street'
  ]);

  useEffect(() => {
    const typeParam = selectedTypes.join(',');
    Promise.all([
      api.getLaporan(),
      api.getRuasJalan(),
      api.getOsmRoads(typeParam),
      api.getLaporanStats(),
    ])
      .then(([lap, ruas, roads, s]) => {
        console.log(`Loaded ${ruas.length} official ruas, ${roads.length} OSM segments, ${lap.length} laporan`);
        setLaporan(lap);
        setRuasJalan(ruas);
        setOsmRoads(roads);
        setStats(s);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setFetchError(err.message);
        setLoading(false);
      });
  }, [selectedTypes]);

  // Fetch desa boundaries on mount (lazy load)
  useEffect(() => {
    if (desaBoundaries.length > 0) return;
    fetch('/api/desa/boundaries')
      .then((r) => r.json())
      .then((data) => {
        console.log(`Loaded ${data.length} desa boundaries`);
        setDesaBoundaries(data);
      })
      .catch((err) => console.error('Failed to load desa boundaries:', err));
  }, []);

  const filtered = Object.values(damageFilter).some(v => v)
    ? laporan.filter((l) => damageFilter[l.tingkat_kerusakan])
    : laporan;

  const markers = filtered
    .filter((l) => l.lat && l.lng)
    .map((l) => ({ lat: l.lat, lng: l.lng, data: l }));

  const toggleRoadType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="home-page">
      {fetchError && (
        <div className="card" style={{ background: '#FFEBEE', margin: '8px 16px' }}>
          ⚠️ Gagal memuat data: {fetchError}
        </div>
      )}

      {/* Filter & Layer Controls */}
      <div className="filter-container">
        <div className="container">
          <div className="filter-bar" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Damage type checkboxes */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 500 }}>
              <input type="checkbox" checked={damageFilter.ringan} onChange={(e) => setDamageFilter(prev => ({ ...prev, ringan: e.target.checked }))} />
              <span style={{ color: DAMAGE_COLORS.ringan }}>🟢 Ringan</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 500 }}>
              <input type="checkbox" checked={damageFilter.sedang} onChange={(e) => setDamageFilter(prev => ({ ...prev, sedang: e.target.checked }))} />
              <span style={{ color: DAMAGE_COLORS.sedang }}> Sedang</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 500 }}>
              <input type="checkbox" checked={damageFilter.berat} onChange={(e) => setDamageFilter(prev => ({ ...prev, berat: e.target.checked }))} />
              <span style={{ color: DAMAGE_COLORS.berat }}>🔴 Berat</span>
            </label>

            <span style={{ margin: '0 8px', color: 'var(--border)' }}>|</span>

            {/* Road layer toggles */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
              <input type="checkbox" checked={showRuas} onChange={(e) => setShowRuas(e.target.checked)} />
              Ruas Jalan ({ruasJalan.length})
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
              <input type="checkbox" checked={showOsmRoads} onChange={(e) => setShowOsmRoads(e.target.checked)} />
              Jalan OSM ({osmRoads.length})
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
              <input type="checkbox" checked={showDesa} onChange={(e) => setShowDesa(e.target.checked)} />
              Batas Desa ({desaBoundaries.length})
            </label>

            {/* Road type filter buttons */}
            {showOsmRoads && (
              <>
                <span style={{ margin: '0 8px', color: 'var(--border)' }}>|</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '32px' }}>Filter:</span>
                {['primary', 'secondary', 'tertiary', 'trunk', 'unclassified', 'living_street', 'residential'].map((type) => (
                  <button
                    key={type}
                    className={`btn btn-sm ${selectedTypes.includes(type) ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => toggleRoadType(type)}
                    style={!selectedTypes.includes(type) ? { borderColor: ROAD_TYPE_COLORS[type], color: ROAD_TYPE_COLORS[type] } : {}}
                  >
                    <span style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: ROAD_TYPE_COLORS[type],
                      marginRight: 4,
                    }} />
                    {type}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <MapContainer center={[-7.4, 109.68]} zoom={12} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* OSM Road Segments - from GeoJSON */}
        {showOsmRoads && osmRoads.map((r) =>
          r.geometry && r.geometry.length >= 2 ? (
            <Polyline
              key={`osm-${r.id}`}
              positions={r.geometry.map((coord) => [coord[1], coord[0]])}
              color={ROAD_TYPE_COLORS[r.type] || '#78909C'}
              weight={r.type === 'primary' || r.type === 'trunk' ? 3 : r.type === 'secondary' ? 2.5 : 1.5}
              opacity={0.8}
              className={`osm-road osm-road-${r.type || 'unknown'}`}
            >
              <Popup>
                <strong>{r.name || 'Unnamed Road'}</strong>
                <br />
                <span className="badge" style={{ background: ROAD_TYPE_COLORS[r.type], color: 'white' }}>
                  {r.type}
                </span>
                {r.ref && <><br />Ref: {r.ref}</>}
              </Popup>
            </Polyline>
          ) : null
        )}

        {/* Official Ruas Jalan - with OSRM-matched geometry */}
        {showRuas && ruasJalan.map((r) => {
          // OSRM decodePolyline returns [lat, lng] which is what Leaflet expects
          const positions = r.geometry
            ? r.geometry
            : (r.from_lat && r.from_lng && r.to_lat && r.to_lng
              ? [[r.from_lat, r.from_lng], [r.to_lat, r.to_lng]]
              : null);

          if (!positions || positions.length < 2) return null;

          // Red for roads with damage reports, blue for normal roads
          const roadColor = r.hasDamage ? '#F44336' : '#1976D2';
          const roadWeight = r.hasDamage ? 5 : 4;

          return (
            <Polyline
              key={`official-${r.id}`}
              positions={positions}
              color={roadColor}
              weight={roadWeight}
              opacity={0.8}
            >
              <Popup>
                <strong>{r.nama_ruas}</strong>
                <br />
                {r.panjang_km} km | Lebar: {r.lebar_m}m
                <br />
                <small>{r.titik_awal} → {r.titik_akhir}</small>
                {r.hasDamage && (
                  <div style={{ color: '#F44336', fontWeight: 'bold', marginTop: 4 }}>
                    ⚠️ Ada laporan kerusakan
                  </div>
                )}
              </Popup>
            </Polyline>
          );
        })}

        <DesaBoundaryLayer desaBoundaries={desaBoundaries} showDesa={showDesa} />
        <FitBounds markers={markers} ruasJalan={ruasJalan} showRuas={showRuas} osmRoads={osmRoads} showOsmRoads={showOsmRoads} />

        {/* Clustered damage markers with triangle warning icons */}
        <DamageMarkerCluster markers={markers} />
      </MapContainer>
    </div>
  );
}
