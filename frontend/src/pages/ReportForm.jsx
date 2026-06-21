import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../utils/api';
import { classifyImage, loadModel } from '../utils/aiClassifier';
import { offlineStore, isOnline, onOnlineStatusChange } from '../utils/offlineStore';
import { DAMAGE_TYPES_BY_CATEGORY, getDamageTypeById } from '../utils/damageTypes';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Map picker component
function MapPicker({ position, onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

const DAMAGE_CONFIG = {
  berat: { label: 'Berat', color: '#F44336', icon: '🔴' },
  sedang: { label: 'Sedang', color: '#FF9800', icon: '🟡' },
  ringan: { label: 'Ringan', color: '#4CAF50', icon: '🟢' },
  tidak_terdeteksi: { label: 'Tidak Terdeteksi', color: '#9E9E9E', icon: '⚪' },
};

export default function ReportForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nama_pelapor: '',
    no_hp: '',
    alamat: '',
    desa: '',
    kecamatan: '',
    jenis_kerusakan: '',
    tingkat_kerusakan: '',
    deskripsi: '',
    lat: null,
    lng: null,
  });
  const [desaDetecting, setDesaDetecting] = useState(false);
  const [outsideBoundary, setOutsideBoundary] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [tfModelLoaded, setTfModelLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [isOnlineStatus, setIsOnlineStatus] = useState(isOnline());
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    // Preload TensorFlow model for fallback
    loadModel().then((m) => { if (m) setTfModelLoaded(true); });
    onOnlineStatusChange((online) => setIsOnlineStatus(online));
    offlineStore.getPendingCount().then(setUnsyncedCount);
  }, []);

  useEffect(() => {
    if (isOnlineStatus) syncDrafts();
  }, [isOnlineStatus]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLocation = async (pos) => {
    setForm((f) => ({ ...f, lat: pos.lat, lng: pos.lng }));
    setOutsideBoundary(false);
    // Auto-detect desa/kecamatan
    if (isOnlineStatus) {
      setDesaDetecting(true);
      try {
        const desaInfo = await api.getDesaAtLocation(pos.lat, pos.lng);
        if (desaInfo.outside_boundary) {
          setOutsideBoundary(true);
          setForm((f) => ({
            ...f,
            lat: pos.lat,
            lng: pos.lng,
            desa: '',
            kecamatan: '',
          }));
          showToast('️ Lokasi diluar batas Kabupaten Banjarnegara');
        } else {
          setForm((f) => ({
            ...f,
            lat: pos.lat,
            lng: pos.lng,
            desa: desaInfo.nama_desa || '',
            kecamatan: desaInfo.kecamatan || '',
          }));
        }
      } catch (err) {
        console.warn('Desa detection failed:', err);
      }
      setDesaDetecting(false);
    }
  };

  const handleGeoLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolokasi tidak didukung browser ini');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { handleLocation(pos.coords); showToast('Lokasi terdeteksi!'); },
      () => showToast('Gagal mendeteksi lokasi. Pastikan GPS aktif.'),
      { enableHighAccuracy: true }
    );
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target.result);
      // AI classification via Google Vision API
      if (isOnlineStatus) {
        classifyWithGoogleVision(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const classifyWithGoogleVision = async (file) => {
    setAiLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const result = await api.classifyImage(formData);
      if (result.prediction && result.prediction !== 'tidak_terdeteksi') {
        setAiResult(result);
        setForm((f) => ({
          ...f,
          tingkat_kerusakan: f.tingkat_kerusakan || result.prediction,
        }));
        return;
      }
    } catch (err) {
      console.warn('Google Vision failed, falling back to TensorFlow.js:', err.message);
    }

    // Fallback to TensorFlow.js
    if (tfModelLoaded) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const result = await classifyImage(img);
        setAiResult(result);
        if (result.prediction) {
          setForm((f) => ({
            ...f,
            tingkat_kerusakan: f.tingkat_kerusakan || result.prediction,
          }));
        }
        setAiLoading(false);
      };
      img.src = photoPreview;
    } else {
      setAiLoading(false);
    }
  };

  const syncDrafts = async () => {
    const drafts = await offlineStore.getUnsyncedDrafts();
    if (drafts.length === 0) return;
    try {
      for (const draft of drafts) {
        const formData = new FormData();
        formData.append('nama_pelapor', draft.nama_pelapor);
        formData.append('no_hp', draft.no_hp);
        formData.append('lat', draft.lat);
        formData.append('lng', draft.lng);
        formData.append('alamat', draft.alamat);
        formData.append('tingkat_kerusakan', draft.tingkat_kerusakan);
        formData.append('deskripsi', draft.deskripsi);
        formData.append('ai_prediction', draft.ai_prediction);
        formData.append('ai_confidence', draft.ai_confidence);
        if (draft.fotoDataUrl) {
          const blob = await fetch(draft.fotoDataUrl).then((r) => r.blob());
          formData.append('foto', blob, 'photo.jpg');
        }
        await api.createLaporan(formData);
        await offlineStore.markSynced(draft.id);
      }
      const remaining = await offlineStore.getPendingCount();
      setUnsyncedCount(remaining);
      showToast(`${drafts.length} laporan berhasil disinkronkan!`);
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lat || !form.lng) {
      showToast('Pilih lokasi kerusakan di peta');
      return;
    }
    setSubmitting(true);

    const formData = new FormData();
    formData.append('nama_pelapor', form.nama_pelapor);
    formData.append('no_hp', form.no_hp);
    formData.append('lat', form.lat);
    formData.append('lng', form.lng);
    formData.append('alamat', form.alamat);
    formData.append('desa', form.desa);
    formData.append('kecamatan', form.kecamatan);
    formData.append('jenis_kerusakan', form.jenis_kerusakan);
    formData.append('tingkat_kerusakan', form.tingkat_kerusakan);
    formData.append('deskripsi', form.deskripsi);
    formData.append('ai_prediction', aiResult?.prediction);
    formData.append('ai_confidence', aiResult?.confidence);
    if (photo) formData.append('foto', photo);

    try {
      if (isOnlineStatus) {
        await api.createLaporan(formData);
        showToast('Laporan berhasil dikirim!');
        setTimeout(() => navigate('/'), 1000);
      } else {
        await offlineStore.addDraft({
          ...form,
          fotoDataUrl: photoPreview,
          ai_prediction: aiResult?.prediction,
          ai_confidence: aiResult?.confidence,
        });
        setUnsyncedCount(await offlineStore.getPendingCount());
        showToast('Disimpan offline. Akan dikirim saat ada koneksi.');
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) {
      console.error('Submit error:', err);
      await offlineStore.addDraft({
        ...form,
        fotoDataUrl: photoPreview,
        ai_prediction: aiResult?.prediction,
        ai_confidence: aiResult?.confidence,
      });
      showToast('Gagal mengirim. Disimpan offline.');
      setTimeout(() => navigate('/'), 1000);
    }
    setSubmitting(false);
  };

  const dmg = aiResult ? DAMAGE_CONFIG[aiResult.prediction] || DAMAGE_CONFIG.tidak_terdeteksi : null;

  return (
    <div className="report-page container" style={{ padding: '20px 16px' }}>
      {toast && <div className="toast">{toast}</div>}

      <h2 style={{ marginBottom: 16 }}>📝 Lapor Kerusakan Jalan</h2>

      {!isOnlineStatus && (
        <div className="card" style={{ background: '#FFF3E0', borderColor: '#FF9800' }}>
          ⚠️ Mode Offline — {unsyncedCount > 0 && `${unsyncedCount} laporan belum tersinkron`}
        </div>
      )}

      {/* Map for location */}
      <div className="card">
        <div className="card-title">📍 Lokasi Kerusakan</div>
        <div style={{ marginBottom: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={handleGeoLocation} type="button">
            📡 Deteksi Lokasi Saya
          </button>
          {form.lat && form.lng && (
            <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
            </span>
          )}
        </div>
        <MapContainer center={[-7.4, 109.68]} zoom={13} style={{ height: '250px', borderRadius: 8 }}>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapPicker position={form.lat ? { lat: form.lat, lng: form.lng } : null} onLocationSelect={handleLocation} />
        </MapContainer>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Klik pada peta untuk menandai lokasi</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-title">📸 Foto Kerusakan + AI Analisis</div>
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} />

          {photoPreview && (
            <div style={{ marginTop: 12 }}>
              <img src={photoPreview} alt="Preview" style={{ borderRadius: 8, maxHeight: 200, width: '100%', objectFit: 'cover' }} />
              {aiLoading && (
                <div className="ai-box" style={{ background: '#E3F2FD', borderColor: '#90CAF9' }}>
                  <strong>🤖 Google Vision AI:</strong> Menganalisis foto...
                  <div className="spinner" style={{ marginTop: 4 }} />
                </div>
              )}
              {aiResult && !aiLoading && (
                <div className="ai-box" style={{
                  background: dmg.color + '15',
                  borderColor: dmg.color,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.5rem' }}>{dmg.icon}</span>
                    <div>
                      <strong style={{ color: dmg.color }}>🤖 AI Analisis:</strong>
                      <div>Kerusakan <strong>{dmg.label}</strong> ({aiResult.confidence}% yakin)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {aiResult.rawLabels ? 'via Google Vision' : 'via TensorFlow.js (lokal)'}
                      </div>
                    </div>
                  </div>
                  {aiResult.detectedFeatures && aiResult.detectedFeatures.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                      <strong>Fitur terdeteksi:</strong>{' '}
                      {aiResult.detectedFeatures.map((f, i) => (
                        <span key={i} style={{
                          display: 'inline-block',
                          background: dmg.color + '30',
                          padding: '2px 6px',
                          borderRadius: 4,
                          marginRight: 4,
                          marginTop: 4,
                          fontSize: '0.75rem',
                        }}>
                          {f.keyword} ({f.confidence}%)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">📋 Detail Laporan</div>

          <div className="form-group">
            <label>Nama Pelapor (opsional)</label>
            <input type="text" value={form.nama_pelapor} onChange={(e) => setForm({ ...form, nama_pelapor: e.target.value })} placeholder="Nama Anda" />
          </div>

          <div className="form-group">
            <label>No. HP (opsional)</label>
            <input type="tel" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} placeholder="08xxxxxxxxxx" />
          </div>

          <div className="form-group">
            <label>Jenis Kerusakan *</label>
            <select value={form.jenis_kerusakan} onChange={(e) => {
              const selected = getDamageTypeById(e.target.value);
              setForm({
                ...form,
                jenis_kerusakan: e.target.value,
                tingkat_kerusakan: selected ? selected.severity_default : '',
              });
            }} required>
              <option value="">— Pilih jenis kerusakan —</option>
              {Object.entries(DAMAGE_TYPES_BY_CATEGORY).map(([category, types]) => (
                <optgroup key={category} label={category}>
                  {types.map((dt) => (
                    <option key={dt.id} value={dt.id}>{dt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {form.jenis_kerusakan && (
              <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
                {getDamageTypeById(form.jenis_kerusakan)?.description}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Tingkat Keparahan *</label>
            <select value={form.tingkat_kerusakan} onChange={(e) => setForm({ ...form, tingkat_kerusakan: e.target.value })} required>
              <option value="">— Pilih tingkat keparahan —</option>
              <option value="ringan">🟢 Ringan</option>
              <option value="sedang">🟡 Sedang</option>
              <option value="berat">🔴 Berat</option>
            </select>
            {aiResult && (
              <small style={{ color: dmg.color }}>
                💡 AI menyarankan: <strong>{dmg.icon} {dmg.label}</strong> ({aiResult.confidence}%)
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Alamat / Patokan</label>
            <input type="text" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Contoh: Jl. Merdeka depan toko ABC" />
          </div>

          <div className="form-group">
            <label>Desa / Kelurahan</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={form.desa} readOnly placeholder="Otomatis dari GPS" style={{ flex: 1, background: '#f5f5f5' }} />
              <input type="text" value={form.kecamatan} readOnly placeholder="Kecamatan" style={{ width: 150, background: '#f5f5f5' }} />
            </div>
            {desaDetecting && (
              <small style={{ color: 'var(--text-secondary)' }}>
                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Mendeteksi desa...
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Deskripsi Kerusakan</label>
            <textarea rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Jelaskan kerusakan yang terlihat..." />
          </div>

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? <span className="spinner" /> : '📤 Kirim Laporan'}
          </button>
        </div>
      </form>
    </div>
  );
}
