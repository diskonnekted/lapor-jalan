import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { getDamageTypeById } from '../utils/damageTypes';

const DAMAGE_LABELS = {
  ringan: 'Ringan',
  sedang: 'Sedang',
  berat: 'Berat',
};

const DAMAGE_CONFIG = {
  ringan: { label: 'Ringan', color: '#4CAF50', bg: '#E8F5E9' },
  sedang: { label: 'Sedang', color: '#FF9800', bg: '#FFF3E0' },
  berat: { label: 'Berat', color: '#F44336', bg: '#FFEBEE' },
};

const STATUS_CONFIG = {
  masuk: { label: 'Laporan Masuk', color: '#1565C0', bg: '#E3F2FD' },
  diverifikasi: { label: 'Diverifikasi', color: '#E65100', bg: '#FFF3E0' },
  diperbaiki: { label: 'Sudah Diperbaiki', color: '#6A1B9A', bg: '#F3E5F5' },
  selesai: { label: 'Selesai', color: '#2E7D32', bg: '#E8F5E9' },
};

// Flat icon components
const Icons = {
  ringan: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" fill="#4CAF50"/></svg>,
  sedang: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" fill="#FF9800"/></svg>,
  berat: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polygon points="8,1 15,14 1,14" fill="#F44336"/></svg>,
  masuk: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v7M4 7l4 4 4-4M3 13h10" stroke="#1565C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  diverifikasi: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="#E65100" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  diperbaiki: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L6 12H4v-2l7.5-7.5z" stroke="#6A1B9A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  selesai: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#2E7D32" strokeWidth="1.5"/><path d="M5 8l2 2 4-4" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  camera: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3l.5-1.5h3L9 3" stroke="currentColor" strokeWidth="1.2"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  location: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12s-5-4.5-5-7a5 5 0 1110 0c0 2.5-5 7-5 7z" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  grid: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor"/><rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor"/><rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor"/><rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor"/></svg>,
  table: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1 5h12M1 9h12M5 1v12" stroke="currentColor" strokeWidth="1.2"/></svg>,
  back: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1L4 7l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  map: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3l4-1.5 4 1.5 4-1.5v9l-4 1.5-4-1.5-4 1.5V3z" stroke="currentColor" strokeWidth="1.2"/><path d="M5 1.5v9M9 3v9" stroke="currentColor" strokeWidth="1.2"/></svg>,
  upload: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 9V2M4 4l3-3 3 3M2 10v2h10v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  close: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  empty: <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="12" width="32" height="24" rx="3" stroke="#9E9E9E" strokeWidth="2"/><path d="M16 22l4 4 12-12" stroke="#9E9E9E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

export default function LaporanList() {
  const [laporan, setLaporan] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedLaporan, setSelectedLaporan] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or table
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterTingkat, search]);

  const fetchData = () => {
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (filterTingkat) params.tingkat = filterTingkat;
    if (search) params.nama = search;

    Promise.all([api.getLaporan(params), api.getLaporanStats()])
      .then(([data, s]) => {
        setLaporan(data);
        setStats(s);
        setLoading(false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const daysSince = (dateStr) => {
    const now = new Date();
    const then = new Date(dateStr);
    return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
  };

  const handleUploadPhoto = async (id) => {
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('foto_perbaikan', uploadFile);
    try {
      await api.updateLaporanPhoto(id, formData);
      setUploadFile(null);
      setSelectedLaporan(null);
      fetchData();
    } catch (err) {
      alert('Gagal upload: ' + err.message);
    }
    setUploading(false);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const getFilteredAndSorted = () => {
    let filtered = [...laporan];
    if (filterStatus) filtered = filtered.filter((l) => l.status === filterStatus);
    if (filterTingkat) filtered = filtered.filter((l) => l.tingkat_kerusakan === filterTingkat);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.nama_pelapor?.toLowerCase().includes(q) ||
          l.alamat?.toLowerCase().includes(q) ||
          l.deskripsi?.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else if (sortBy === 'days') {
        valA = daysSince(a.created_at);
        valB = daysSince(b.created_at);
      } else if (sortBy === 'severity') {
        const order = { berat: 3, sedang: 2, ringan: 1 };
        valA = order[a.tingkat_kerusakan] || 0;
        valB = order[b.tingkat_kerusakan] || 0;
      } else {
        valA = a[sortBy] || '';
        valB = b[sortBy] || '';
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const filtered = getFilteredAndSorted();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Daftar Laporan Kerusakan Jalan</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Kabupaten Banjarnegara • Total {laporan.length} laporan
          </p>
        </div>
        <a href="/" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {Icons.back} Kembali ke Peta
        </a>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #1976D2' }}>
          <div className="number" style={{ color: '#1976D2', fontSize: '2.2rem' }}>{stats?.total || 0}</div>
          <div className="label">Total Laporan</div>
        </div>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = laporan.filter((l) => l.status === key).length;
          return (
            <div key={key} className="stat-card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
              <div className="number" style={{ color: cfg.color, fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                {Icons[key]} {count}
              </div>
              <div className="label">{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters & Controls */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>{Icons.search}</span>
            <input
              type="text"
              placeholder="Cari pelapor, lokasi, atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.95rem', boxSizing: 'border-box' }}
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.95rem' }}>
            <option value="">Semua Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={filterTingkat} onChange={(e) => setFilterTingkat(e.target.value)} style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.95rem' }}>
            <option value="">Semua Tingkat</option>
            {Object.entries(DAMAGE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode('grid')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{Icons.grid} Grid</button>
            <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode('table')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{Icons.table} Tabel</button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: 12 }}>{Icons.empty}</div>
              <p>Tidak ada laporan ditemukan</p>
            </div>
          ) : (
            filtered.map((l) => (
              <div key={l.id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', borderLeft: `4px solid ${DAMAGE_CONFIG[l.tingkat_kerusakan]?.color || '#999'}` }}
                onClick={() => setSelectedLaporan(l)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text)' }}>#{l.id} — {l.nama_pelapor || 'Anonim'}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {new Date(l.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <span className="badge" style={{ background: DAMAGE_CONFIG[l.tingkat_kerusakan]?.bg, color: DAMAGE_CONFIG[l.tingkat_kerusakan]?.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {Icons[l.tingkat_kerusakan]} {DAMAGE_CONFIG[l.tingkat_kerusakan]?.label}
                  </span>
                </div>

                {/* Location */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', marginBottom: 4, color: 'var(--text-secondary)' }}>
                  {Icons.location} {l.alamat || `${l.lat?.toFixed(4)}, ${l.lng?.toFixed(4)}`}
                </div>
                {l.desa && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    📍 {l.desa}{l.kecamatan ? `, ${l.kecamatan}` : ''}
                  </div>
                )}

                {/* Jenis Kerusakan */}
                {l.jenis_kerusakan && getDamageTypeById(l.jenis_kerusakan) && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>Jenis:</span> {getDamageTypeById(l.jenis_kerusakan)?.label}
                  </div>
                )}

                {/* Description */}
                {l.deskripsi && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.4, maxHeight: 42, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.deskripsi}
                  </p>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <span className="badge" style={{ background: STATUS_CONFIG[l.status]?.bg, color: STATUS_CONFIG[l.status]?.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {Icons[l.status]} {STATUS_CONFIG[l.status]?.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {l.foto_path && <span style={{ color: 'var(--text-secondary)' }}>{Icons.camera}</span>}
                    {l.foto_perbaikan_path && <span style={{ color: 'var(--success)' }}>{Icons.check}</span>}
                    <span className="badge" style={{
                      background: daysSince(l.created_at) > 30 ? '#FFEBEE' : daysSince(l.created_at) > 14 ? '#FFF3E0' : '#E8F5E9',
                      color: daysSince(l.created_at) > 30 ? '#C62828' : daysSince(l.created_at) > 14 ? '#E65100' : '#2E7D32',
                    }}>
                      {daysSince(l.created_at)} hari
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}># {sortBy === 'id' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Tanggal {sortBy === 'created_at' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort('days')} style={{ cursor: 'pointer' }}>Hari {sortBy === 'days' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                  <th>Pelapor</th>
                  <th>Jenis Kerusakan</th>
                  <th>Lokasi</th>
                  <th>Desa/Kecamatan</th>
                  <th onClick={() => handleSort('severity')} style={{ cursor: 'pointer' }}>Keparahan {sortBy === 'severity' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Tidak ada laporan ditemukan</td></tr>
                ) : (
                  filtered.map((l) => (
                    <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLaporan(l)}>
                      <td><strong>#{l.id}</strong></td>
                      <td>{new Date(l.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <span className="badge" style={{
                          background: daysSince(l.created_at) > 30 ? '#FFEBEE' : daysSince(l.created_at) > 14 ? '#FFF3E0' : '#E8F5E9',
                          color: daysSince(l.created_at) > 30 ? '#C62828' : daysSince(l.created_at) > 14 ? '#E65100' : '#2E7D32',
                        }}>
                          {daysSince(l.created_at)} hari
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{l.nama_pelapor || '—'}</div>
                        {l.no_hp && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l.no_hp}</div>}
                      </td>
                      <td>
                        {l.jenis_kerusakan && getDamageTypeById(l.jenis_kerusakan) ? (
                          <div>
                            <div style={{ fontWeight: 500 }}>{getDamageTypeById(l.jenis_kerusakan)?.label}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{getDamageTypeById(l.jenis_kerusakan)?.category}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                      <td><div style={{ maxWidth: 220 }}>{l.alamat || `${l.lat?.toFixed(4)}, ${l.lng?.toFixed(4)}`}</div></td>
                      <td>
                        {l.desa ? (
                          <div>
                            <div style={{ fontWeight: 500 }}>{l.desa}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l.kecamatan || ''}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ background: DAMAGE_CONFIG[l.tingkat_kerusakan]?.bg, color: DAMAGE_CONFIG[l.tingkat_kerusakan]?.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {Icons[l.tingkat_kerusakan]} {DAMAGE_CONFIG[l.tingkat_kerusakan]?.label}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: STATUS_CONFIG[l.status]?.bg, color: STATUS_CONFIG[l.status]?.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {Icons[l.status]} {STATUS_CONFIG[l.status]?.label}
                        </span>
                        {l.foto_perbaikan_path && <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>{Icons.check} Foto perbaikan</div>}
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedLaporan(l); }}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLaporan && (
        <div className="modal-overlay" onClick={() => { setSelectedLaporan(null); setUploadFile(null); }}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Detail Laporan #{selectedLaporan.id}</h3>
              <button onClick={() => { setSelectedLaporan(null); setUploadFile(null); }} style={{ background: 'none', fontSize: '1.5rem', color: 'var(--text-secondary)' }}>×</button>
            </div>

            {/* Photo */}
            {selectedLaporan.foto_path && (
              <div style={{ marginBottom: 16 }}>
                <strong>📸 Foto Kerusakan:</strong>
                <img src={selectedLaporan.foto_path} alt="Foto kerusakan" style={{ width: '100%', borderRadius: 8, marginTop: 8, maxHeight: 280, objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Tanggal</div>
                  <div style={{ fontWeight: 500 }}>{new Date(selectedLaporan.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Hari sejak laporan</div>
                  <div style={{ fontWeight: 700, color: daysSince(selectedLaporan.created_at) > 30 ? 'var(--danger)' : 'var(--text)' }}>
                    {daysSince(selectedLaporan.created_at)} hari
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Jenis Kerusakan</div>
                  {selectedLaporan.jenis_kerusakan && getDamageTypeById(selectedLaporan.jenis_kerusakan) ? (
                    <div>
                      <div style={{ fontWeight: 500 }}>{getDamageTypeById(selectedLaporan.jenis_kerusakan)?.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{getDamageTypeById(selectedLaporan.jenis_kerusakan)?.category}</div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>—</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Keparahan</div>
                  <span className="badge" style={{ background: DAMAGE_CONFIG[selectedLaporan.tingkat_kerusakan]?.bg, color: DAMAGE_CONFIG[selectedLaporan.tingkat_kerusakan]?.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {DAMAGE_CONFIG[selectedLaporan.tingkat_kerusakan] ? Icons[selectedLaporan.tingkat_kerusakan] : null} {DAMAGE_CONFIG[selectedLaporan.tingkat_kerusakan]?.label}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Status</div>
                  <span className="badge" style={{ background: STATUS_CONFIG[selectedLaporan.status]?.bg, color: STATUS_CONFIG[selectedLaporan.status]?.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {STATUS_CONFIG[selectedLaporan.status] ? Icons[selectedLaporan.status] : null} {STATUS_CONFIG[selectedLaporan.status]?.label}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Pelapor</div>
                <div>{selectedLaporan.nama_pelapor || 'Anonim'} {selectedLaporan.no_hp && `• ${selectedLaporan.no_hp}`}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Lokasi</div>
                <div>{selectedLaporan.alamat || `${selectedLaporan.lat?.toFixed(6)}, ${selectedLaporan.lng?.toFixed(6)}`}</div>
              </div>

              {selectedLaporan.desa && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Desa / Kecamatan</div>
                  <div>{selectedLaporan.desa}{selectedLaporan.kecamatan ? `, ${selectedLaporan.kecamatan}` : ''}</div>
                </div>
              )}

              {selectedLaporan.deskripsi && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Deskripsi</div>
                  <div>{selectedLaporan.deskripsi}</div>
                </div>
              )}

              {selectedLaporan.foto_perbaikan_path && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: 2 }}>✅ Foto Setelah Perbaikan</div>
                  <img src={selectedLaporan.foto_perbaikan_path} alt="Foto perbaikan" style={{ width: '100%', borderRadius: 8, marginTop: 4, maxHeight: 280, objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {/* Upload photo perbaikan */}
            {(selectedLaporan.status === 'diperbaiki' || selectedLaporan.status === 'selesai') && !selectedLaporan.foto_perbaikan_path && (
              <div style={{ padding: 16, background: '#E8F5E9', borderRadius: 8, marginBottom: 16 }}>
                <strong style={{ color: 'var(--success)' }}>📸 Upload Foto Setelah Perbaikan</strong>
                <div style={{ marginTop: 8 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} />
                </div>
                {uploadFile && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleUploadPhoto(selectedLaporan.id)} disabled={uploading}>
                      {uploading ? <span className="spinner" /> : '📤 Upload'}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Batal</button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => window.open(`https://www.google.com/maps?q=${selectedLaporan.lat},${selectedLaporan.lng}`, '_blank')}>
                📍 Buka di Google Maps
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
