import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { api } from '../utils/api';
import { DAMAGE_TYPES_BY_CATEGORY, getDamageTypeById } from '../utils/damageTypes';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import './MobileApp.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DAMAGE_CONFIG = {
  ringan: { label: 'Ringan', color: '#4CAF50', icon: '' },
  sedang: { label: 'Sedang', color: '#FF9800', icon: '🟡' },
  berat: { label: 'Berat', color: '#F44336', icon: '🔴' },
};

const STATUS_CONFIG = {
  masuk: { label: 'Masuk', color: '#1565C0' },
  diverifikasi: { label: 'Diverifikasi', color: '#E65100' },
  diperbaiki: { label: 'Diperbaiki', color: '#6A1B9A' },
  selesai: { label: 'Selesai', color: '#2E7D32' },
};

// Icons - using currentColor to inherit from parent
const Icons = {
  camera: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M9 5l1.5-2h3L15 5" />
    </svg>
  ),
  list: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 12h8M8 15h5" />
    </svg>
  ),
  map: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l6-3 6 3 6-3v12l-6 3-6-3-6 3V6z" />
      <path d="M9 3v12M15 6v12" />
    </svg>
  ),
  info: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 9v4M12 15v1" />
    </svg>
  ),
  location: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M8 14s-5-4.5-5-7a5 5 0 1110 0c0 2.5-5 7-5 7z" />
      <circle cx="8" cy="7" r="1.5" />
    </svg>
  ),
  close: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l3.5 3.5L13 5" />
    </svg>
  ),
};

// Map component
function MobileMap({ laporan }) {
  return (
    <MapContainer center={[-7.4, 109.68]} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {laporan
        .filter((l) => l.lat && l.lng)
        .map((l, i) => (
          <Marker
            key={i}
            position={[l.lat, l.lng]}
            icon={L.divIcon({
              className: '',
              html: `<div style="background:${DAMAGE_CONFIG[l.tingkat_kerusakan]?.color || '#999'};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })}
          >
            <Popup>
              <div style={{ minWidth: '150px' }}>
                <strong>{l.alamat || 'Lokasi'}</strong>
                <div style={{ fontSize: '0.75rem', color: DAMAGE_CONFIG[l.tingkat_kerusakan]?.color }}>
                  {DAMAGE_CONFIG[l.tingkat_kerusakan]?.label}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}

// Halaman: Lapor (Camera first)
function PageLapor({ onSuccess }) {
  const [step, setStep] = useState('camera'); // camera, form, submitting, done
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [locationInfo, setLocationInfo] = useState({
    lat: null,
    lng: null,
    alamat: '',
    desa: '',
    kecamatan: '',
  });
  const [form, setForm] = useState({
    nama_pelapor: '',
    no_hp: '',
    jenis_kerusakan: '',
    tingkat_kerusakan: '',
    deskripsi: '',
  });
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Auto-open camera
  useEffect(() => {
    if (step === 'camera') {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(() => {
          // Fallback: show file picker
          if (fileInputRef.current) fileInputRef.current.click();
        });
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [step]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        setPhoto(blob);
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.8));
        setStep('form');
        detectLocation();
      }, 'image/jpeg', 0.8);
    }
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let desa = '', kecamatan = '';
        try {
          const info = await api.getDesaAtLocation(lat, lng);
          desa = info.nama_desa || '';
          kecamatan = info.kecamatan || '';
        } catch (e) {}
        setLocationInfo({ lat, lng, alamat: '', desa, kecamatan });
      },
      () => {}
    );
  };

  const handleSubmit = async () => {
    if (!locationInfo.lat) {
      alert('Lokasi tidak terdeteksi. Pastikan GPS aktif.');
      return;
    }
    setStep('submitting');
    const formData = new FormData();
    formData.append('foto', photo, 'photo.jpg');
    formData.append('lat', locationInfo.lat);
    formData.append('lng', locationInfo.lng);
    formData.append('alamat', form.nama_pelapor ? `${form.alamat || ''}` : locationInfo.alamat || `${locationInfo.lat.toFixed(4)}, ${locationInfo.lng.toFixed(4)}`);
    formData.append('desa', locationInfo.desa);
    formData.append('kecamatan', locationInfo.kecamatan);
    formData.append('jenis_kerusakan', form.jenis_kerusakan);
    formData.append('tingkat_kerusakan', form.tingkat_kerusakan);
    formData.append('deskripsi', form.deskripsi);
    formData.append('nama_pelapor', form.nama_pelapor);
    formData.append('no_hp', form.no_hp);
    if (aiResult) {
      formData.append('ai_prediction', aiResult.prediction);
      formData.append('ai_confidence', aiResult.confidence);
    }

    try {
      await api.createLaporan(formData);
      setStep('done');
      setTimeout(() => {
        onSuccess?.();
        // Reset
        setStep('camera');
        setPhoto(null);
        setPhotoPreview(null);
        setForm({ nama_pelapor: '', no_hp: '', jenis_kerusakan: '', tingkat_kerusakan: '', deskripsi: '' });
        setLocationInfo({ lat: null, lng: null, alamat: '', desa: '', kecamatan: '' });
        setAiResult(null);
      }, 2000);
    } catch (err) {
      alert('Gagal mengirim: ' + err.message);
      setStep('form');
    }
  };

  if (step === 'done') {
    return (
      <div className="mobile-page">
        <div className="success-screen">
          <div className="success-icon">✅</div>
          <h2>Laporan Terkirim!</h2>
          <p>Terima kasih telah melaporkan kerusakan jalan.</p>
        </div>
      </div>
    );
  }

  if (step === 'submitting') {
    return (
      <div className="mobile-page">
        <div className="submitting-screen">
          <div className="spinner" style={{ width: 40, height: 40 }} />
          <p>Mengirim laporan...</p>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="mobile-page mobile-page-with-header">
        <div className="mobile-header">
          <button className="back-btn" onClick={() => setStep('camera')}>{Icons.close}</button>
          <span>Detail Laporan</span>
          <div />
        </div>

        {/* Photo preview */}
        {photoPreview && (
          <div className="photo-preview">
            <img src={photoPreview} alt="Preview" />
          </div>
        )}

        {/* Location info */}
        <div className="location-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {Icons.location}
            <span style={{ fontSize: '0.85rem' }}>
              {locationInfo.desa ? `${locationInfo.desa}, ${locationInfo.kecamatan}` : 'Mendeteksi lokasi...'}
            </span>
          </div>
          {locationInfo.lat && (
            <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>
              {locationInfo.lat.toFixed(6)}, {locationInfo.lng.toFixed(6)}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="mobile-form">
          <div className="form-group">
            <label>Nama (opsional)</label>
            <input type="text" value={form.nama_pelapor} onChange={(e) => setForm({ ...form, nama_pelapor: e.target.value })} placeholder="Nama Anda" />
          </div>

          <div className="form-group">
            <label>No. HP (opsional)</label>
            <input type="tel" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} placeholder="08xxxxxxxxxx" />
          </div>

          <div className="form-group">
            <label>Jenis Kerusakan</label>
            <select value={form.jenis_kerusakan} onChange={(e) => {
              const selected = getDamageTypeById(e.target.value);
              setForm({
                ...form,
                jenis_kerusakan: e.target.value,
                tingkat_kerusakan: form.tingkat_kerusakan || selected?.severity_default || '',
              });
            }}>
              <option value="">Pilih jenis...</option>
              {Object.entries(DAMAGE_TYPES_BY_CATEGORY).map(([cat, types]) => (
                <optgroup key={cat} label={cat}>
                  {types.map((dt) => (
                    <option key={dt.id} value={dt.id}>{dt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tingkat Keparahan</label>
            <div className="severity-buttons">
              {['ringan', 'sedang', 'berat'].map((level) => (
                <button
                  key={level}
                  className={`severity-btn ${form.tingkat_kerusakan === level ? 'active' : ''}`}
                  style={form.tingkat_kerusakan === level ? { borderColor: DAMAGE_CONFIG[level].color, background: DAMAGE_CONFIG[level].color + '20' } : {}}
                  onClick={() => setForm({ ...form, tingkat_kerusakan: level })}
                >
                  {DAMAGE_CONFIG[level].icon} {DAMAGE_CONFIG[level].label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Deskripsi</label>
            <textarea rows={2} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Jelaskan kerusakan..." />
          </div>

          <button className="btn-primary btn-full" onClick={handleSubmit}>
            📤 Kirim Laporan
          </button>
        </div>
      </div>
    );
  }

  // Camera view
  return (
    <div className="mobile-page mobile-camera">
      <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              setPhoto(file);
              setPhotoPreview(ev.target.result);
              setStep('form');
              detectLocation();
            };
            reader.readAsDataURL(file);
          }
        }}
      />
      <div className="camera-overlay">
        <div className="camera-frame" />
        <button className="capture-btn" onClick={capturePhoto}>
          <div className="capture-btn-inner" />
        </button>
        <p style={{ color: 'white', fontSize: '0.85rem', marginTop: 12 }}>
          Arahkan kamera ke kerusakan jalan
        </p>
      </div>
    </div>
  );
}

// Halaman: Daftar Laporan
function PageLaporanList() {
  const [laporan, setLaporan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedLaporan, setSelectedLaporan] = useState(null);

  useEffect(() => {
    api.getLaporan(filter ? { status: filter } : {})
      .then((data) => {
        setLaporan(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const daysSince = (dateStr) => Math.max(0, Math.floor((new Date() - new Date(dateStr)) / 86400000));

  const getDamageTypeLabel = (id) => {
    if (!id) return '';
    for (const [, types] of Object.entries(DAMAGE_TYPES_BY_CATEGORY || {})) {
      const found = types.find(t => t.id === id);
      if (found) return found.label;
    }
    return id;
  };

  const getDamageTypeCategory = (id) => {
    if (!id) return '';
    for (const [cat, types] of Object.entries(DAMAGE_TYPES_BY_CATEGORY || {})) {
      if (types.find(t => t.id === id)) return cat;
    }
    return '';
  };

  // Detail Modal
  if (selectedLaporan) {
    const l = selectedLaporan;
    return (
      <div className="laporan-detail-overlay" onClick={() => setSelectedLaporan(null)}>
        <div className="laporan-detail-content" onClick={(e) => e.stopPropagation()}>
          <div className="laporan-detail-header">
            <span>Laporan #{l.id}</span>
            <button className="detail-close-btn" onClick={() => setSelectedLaporan(null)}>{Icons.close}</button>
          </div>
          {l.foto_path && (
            <div className="detail-photo">
              <img src={l.foto_path} alt="Foto kerusakan" />
            </div>
          )}
          <div className="detail-body">
            <div className="detail-row">
              <span className="detail-label">Jenis Kerusakan</span>
              <span className="detail-value">
                {l.jenis_kerusakan ? (
                  <>
                    <strong>{getDamageTypeLabel(l.jenis_kerusakan)}</strong>
                    <br />
                    <span style={{ fontSize: '0.75rem', color: '#999' }}>{getDamageTypeCategory(l.jenis_kerusakan)}</span>
                  </>
                ) : (
                  <span style={{ color: '#999' }}>—</span>
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Keparahan</span>
              <span className="detail-value">
                <span className="badge-sm" style={{ background: DAMAGE_CONFIG[l.tingkat_kerusakan]?.color + '20', color: DAMAGE_CONFIG[l.tingkat_kerusakan]?.color }}>
                  {DAMAGE_CONFIG[l.tingkat_kerusakan]?.label}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Lokasi</span>
              <span className="detail-value">
                {l.desa ? (
                  <>
                    <div>{l.desa}</div>
                    <div style={{ fontSize: '0.8rem', color: '#999' }}>{l.kecamatan}, Banjarnegara</div>
                  </>
                ) : (
                  <span style={{ color: '#999' }}>{l.alamat || `${l.lat?.toFixed(4)}, ${l.lng?.toFixed(4)}`}</span>
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                <span className="badge-sm" style={{ background: STATUS_CONFIG[l.status]?.color + '20', color: STATUS_CONFIG[l.status]?.color }}>
                  {STATUS_CONFIG[l.status]?.label}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Pelapor</span>
              <span className="detail-value">
                {l.nama_pelapor || 'Anonim'}
                {l.no_hp && <span style={{ color: '#999', fontSize: '0.85rem' }}> • {l.no_hp}</span>}
              </span>
            </div>
            {l.deskripsi && (
              <div className="detail-row">
                <span className="detail-label">Deskripsi</span>
                <span className="detail-value">{l.deskripsi}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Tanggal</span>
              <span className="detail-value">
                {new Date(l.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                <span style={{ color: '#999', fontSize: '0.85rem' }}> • {daysSince(l.created_at)} hari lalu</span>
              </span>
            </div>
            {l.foto_perbaikan_path && (
              <div className="detail-row">
                <span className="detail-label">Foto Setelah Perbaikan</span>
                <div className="detail-photo-small">
                  <img src={l.foto_perbaikan_path} alt="Foto perbaikan" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-page mobile-page-with-header">
      <div className="mobile-header">
        <span>Daftar Laporan</span>
        <div className="filter-chips">
          <button className={`chip ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>Semua</button>
          <button className={`chip ${filter === 'masuk' ? 'active' : ''}`} onClick={() => setFilter('masuk')}>Baru</button>
          <button className={`chip ${filter === 'selesai' ? 'active' : ''}`} onClick={() => setFilter('selesai')}>Selesai</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : laporan.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem' }}></div>
          <p>Belum ada laporan</p>
        </div>
      ) : (
        <div className="laporan-list">
          {laporan.map((l) => (
            <div key={l.id} className="laporan-card" onClick={() => setSelectedLaporan(l)} style={{ cursor: 'pointer' }}>
              <div className="laporan-card-header">
                <span className="laporan-id">#{l.id}</span>
                <span className={`badge-sm`} style={{ background: DAMAGE_CONFIG[l.tingkat_kerusakan]?.color + '20', color: DAMAGE_CONFIG[l.tingkat_kerusakan]?.color }}>
                  {DAMAGE_CONFIG[l.tingkat_kerusakan]?.label}
                </span>
              </div>
              <div className="laporan-location">
                {Icons.location}
                <span>{l.desa ? `${l.desa}, ${l.kecamatan}` : l.alamat || `${l.lat?.toFixed(4)}, ${l.lng?.toFixed(4)}`}</span>
              </div>
              {l.deskripsi && <div className="laporan-desc">{l.deskripsi}</div>}
              <div className="laporan-footer">
                <span className="laporan-date">
                  {new Date(l.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • {daysSince(l.created_at)} hari
                </span>
                <span className={`badge-sm`} style={{ background: STATUS_CONFIG[l.status]?.color + '20', color: STATUS_CONFIG[l.status]?.color }}>
                  {STATUS_CONFIG[l.status]?.label}
                </span>
              </div>
              {l.foto_path && (
                <img src={l.foto_path} alt="" className="laporan-photo" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Halaman: Peta
function PagePeta({ laporan }) {
  const mapRef = useRef(null);

  useEffect(() => {
    // Invalidate map size when component mounts or tab changes
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);
  }, []);

  return (
    <div className="mobile-map-page">
      <div className="mobile-header-overlay">
        <span>Peta Kerusakan</span>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>{laporan.length} laporan</span>
      </div>
      <MapContainer
        center={[-7.4, 109.68]}
        zoom={12}
        className="mobile-leaflet-map"
        ref={mapRef}
        whenCreated={(map) => {
          setTimeout(() => map.invalidateSize(), 100);
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {laporan
          .filter((l) => l.lat && l.lng)
          .map((l, i) => (
            <Marker
              key={i}
              position={[l.lat, l.lng]}
              icon={L.divIcon({
                className: '',
                html: `<div style="background:${DAMAGE_CONFIG[l.tingkat_kerusakan]?.color || '#999'};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              })}
            >
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <strong>{l.alamat || 'Lokasi'}</strong>
                  <div style={{ fontSize: '0.75rem', color: DAMAGE_CONFIG[l.tingkat_kerusakan]?.color }}>
                    {DAMAGE_CONFIG[l.tingkat_kerusakan]?.label}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}

// Halaman: Info
function PageInfo() {
  return (
    <div className="mobile-page mobile-page-with-header">
      <div className="mobile-header">
        <span>Info Aplikasi</span>
      </div>

      <div className="info-content">
        <div className="app-logo">
          <span style={{ fontSize: '3rem' }}>🗺️</span>
          <h2>Peta Jalan Banjarnegara</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Lapor Kerusakan Jalan</p>
        </div>

        <div className="info-section">
          <h3>📖 Cara Penggunaan</h3>
          <div className="info-steps">
            <div className="info-step">
              <div className="step-number">1</div>
              <div>
                <strong>Buka Tab "Lapor"</strong>
                <p>Kamera akan otomatis terbuka. Arahkan ke kerusakan jalan.</p>
              </div>
            </div>
            <div className="info-step">
              <div className="step-number">2</div>
              <div>
                <strong>Ambil Foto</strong>
                <p>Tekan tombol kamera untuk mengambil foto kerusakan.</p>
              </div>
            </div>
            <div className="info-step">
              <div className="step-number">3</div>
              <div>
                <strong>Isi Detail</strong>
                <p>Lokasi, desa, dan kecamatan terdeteksi otomatis. Pilih jenis & tingkat kerusakan.</p>
              </div>
            </div>
            <div className="info-step">
              <div className="step-number">4</div>
              <div>
                <strong>Kirim Laporan</strong>
                <p>Laporan akan masuk ke database dan ditampilkan di peta.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3>ℹ️ Tentang Aplikasi</h3>
          <p>Aplikasi ini dibuat untuk memudahkan masyarakat Kabupaten Banjarnegara dalam melaporkan kerusakan jalan secara cepat dan akurat.</p>
          <p>Setiap laporan akan diverifikasi oleh admin dan ditampilkan di peta interaktif.</p>
        </div>

        <div className="info-section">
          <h3>👨‍💻 Developer</h3>
          <div className="developer-info">
            <strong>Clasnet Group</strong>
            <p style={{ color: '#666', fontSize: '0.85rem' }}>Software Development</p>
          </div>
        </div>

        <div className="info-version">
          <span>Versi 1.0.0</span>
          <span>© 2026 Clasnet Group</span>
        </div>
      </div>
    </div>
  );
}

// Main Mobile App
export default function MobileApp() {
  const [activeTab, setActiveTab] = useState('lapor');
  const [laporan, setLaporan] = useState([]);

  useEffect(() => {
    api.getLaporan().then(setLaporan).catch(() => {});
  }, []);

  const handleReportSuccess = () => {
    api.getLaporan().then(setLaporan).catch(() => {});
  };

  return (
    <div className="mobile-app">
      <div className="mobile-content">
        {activeTab === 'lapor' && <PageLapor onSuccess={handleReportSuccess} />}
        {activeTab === 'laporan' && <PageLaporanList />}
        {activeTab === 'peta' && <PagePeta laporan={laporan} />}
        {activeTab === 'info' && <PageInfo />}
      </div>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'lapor' ? 'active' : ''}`} onClick={() => setActiveTab('lapor')}>
          <div className="nav-icon">{Icons.camera}</div>
          <span>Lapor</span>
        </button>
        <button className={`nav-item ${activeTab === 'laporan' ? 'active' : ''}`} onClick={() => setActiveTab('laporan')}>
          <div className="nav-icon">{Icons.list}</div>
          <span>Laporan</span>
        </button>
        <button className={`nav-item ${activeTab === 'peta' ? 'active' : ''}`} onClick={() => setActiveTab('peta')}>
          <div className="nav-icon">{Icons.map}</div>
          <span>Peta</span>
        </button>
        <button className={`nav-item ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
          <div className="nav-icon">{Icons.info}</div>
          <span>Info</span>
        </button>
      </nav>
    </div>
  );
}
