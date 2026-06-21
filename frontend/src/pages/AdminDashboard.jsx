import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import './AdminDashboard.css';

const DAMAGE_LABELS = {
  ringan: 'Ringan',
  sedang: 'Sedang',
  berat: 'Berat',
};

const STATUS_LABELS = {
  masuk: 'Masuk',
  diverifikasi: 'Diverifikasi',
  diperbaiki: 'Diperbaiki',
  selesai: 'Selesai',
};

const STATUS_FLOW = ['masuk', 'diverifikasi', 'diperbaiki', 'selesai'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [laporan, setLaporan] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');
  const [search, setSearch] = useState('');
  const [selectedLaporan, setSelectedLaporan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fixingDesa, setFixingDesa] = useState(false);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const fetchData = () => {
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (filterTingkat) params.tingkat = filterTingkat;
    if (search) params.nama = search;

    Promise.all([api.getLaporan(params), api.getLaporanStats()])
      .then(([lap, s]) => {
        setLaporan(lap);
        setStats(s);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterTingkat, search]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateLaporanStatus(id, newStatus);
      fetchData();
    } catch (err) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus laporan ini?')) return;
    try {
      await api.deleteLaporan(id);
      setSelectedLaporan(null);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  const handleFixDesa = async () => {
    if (!confirm('Auto-fill desa/kecamatan for laporan yang belum memiliki data desa?')) return;
    setFixingDesa(true);
    try {
      const result = await fetch('/api/laporan/fix-desadata', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      }).then(r => r.json());
      alert(`✅ ${result.message}`);
      fetchData(); // Refresh data
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
    setFixingDesa(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Admin Header */}
      <div className="header" style={{ background: 'var(--secondary)' }}>
        <h1>🛠️ Admin Dashboard</h1>
        <nav>
          <a href="/">Lihat Peta</a>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
            onClick={handleFixDesa}
            disabled={fixingDesa}
          >
            {fixingDesa ? '⏳ Memperbaiki...' : '🔧 Fix Desa'}
          </button>
          <button onClick={handleLogout}>Logout</button>
        </nav>
      </div>

      <div className="container" style={{ padding: '20px 16px' }}>
        {/* Stats */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="number">{stats.total || 0}</div>
              <div className="label">Total</div>
            </div>
            <div className="stat-card">
              <div className="number" style={{ color: 'var(--info)' }}>{stats.masuk || 0}</div>
              <div className="label">Masuk</div>
            </div>
            <div className="stat-card">
              <div className="number" style={{ color: 'var(--warning)' }}>{stats.diverifikasi || 0}</div>
              <div className="label">Diverifikasi</div>
            </div>
            <div className="stat-card">
              <div className="number" style={{ color: '#6A1B9A' }}>{stats.diperbaiki || 0}</div>
              <div className="label">Diperbaiki</div>
            </div>
            <div className="stat-card">
              <div className="number" style={{ color: 'var(--success)' }}>{stats.selesai || 0}</div>
              <div className="label">Selesai</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <input
              type="text"
              placeholder="🔍 Cari pelapor / alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              {STATUS_FLOW.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select value={filterTingkat} onChange={(e) => setFilterTingkat(e.target.value)}>
              <option value="">Semua Tingkat</option>
              <option value="ringan">Ringan</option>
              <option value="sedang">Sedang</option>
              <option value="berat">Berat</option>
            </select>
          </div>
        </div>

        {/* Laporan Table */}
        <div className="card">
          <div className="card-title">Daftar Laporan ({laporan.length})</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pelapor</th>
                  <th>Lokasi</th>
                  <th>Kerusakan</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {laporan.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                      Tidak ada laporan
                    </td>
                  </tr>
                ) : (
                  laporan.map((l) => (
                    <tr key={l.id}>
                      <td>{l.id}</td>
                      <td>
                        {l.nama_pelapor || '-'}
                        {l.no_hp && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l.no_hp}</div>}
                      </td>
                      <td>
                        {l.alamat || `${l.lat?.toFixed(4)}, ${l.lng?.toFixed(4)}`}
                      </td>
                      <td>
                        <span className={`badge badge-${l.tingkat_kerusakan}`}>
                          {DAMAGE_LABELS[l.tingkat_kerusakan] || '-'}
                        </span>
                        {l.ai_prediction && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            🤖 AI: {l.ai_prediction} ({l.ai_confidence}%)
                          </div>
                        )}
                      </td>
                      <td>
                        <select
                          value={l.status}
                          onChange={(e) => handleStatusChange(l.id, e.target.value)}
                          style={{ padding: 4, borderRadius: 4, border: '1px solid var(--border)', fontSize: '0.8rem' }}
                        >
                          {STATUS_FLOW.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(l.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setSelectedLaporan(l)}
                        >
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
      </div>

      {/* Detail Modal */}
      {selectedLaporan && (
        <div className="modal-overlay" onClick={() => setSelectedLaporan(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Detail Laporan #{selectedLaporan.id}</h3>
              <button
                onClick={() => setSelectedLaporan(null)}
                style={{ background: 'none', fontSize: '1.5rem', color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>

            {selectedLaporan.foto_path && (
              <img
                src={selectedLaporan.foto_path}
                alt="Foto kerusakan"
                style={{ width: '100%', borderRadius: 8, marginBottom: 16, maxHeight: 300, objectFit: 'cover' }}
              />
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              <p><strong>Pelapor:</strong> {selectedLaporan.nama_pelapor || '-'}</p>
              <p><strong>No. HP:</strong> {selectedLaporan.no_hp || '-'}</p>
              <p><strong>Lokasi:</strong> {selectedLaporan.lat?.toFixed(6)}, {selectedLaporan.lng?.toFixed(6)}</p>
              <p><strong>Alamat:</strong> {selectedLaporan.alamat || '-'}</p>
              <p>
                <strong>Kerusakan:</strong>{' '}
                <span className={`badge badge-${selectedLaporan.tingkat_kerusakan}`}>
                  {DAMAGE_LABELS[selectedLaporan.tingkat_kerusakan]}
                </span>
              </p>
              {selectedLaporan.ai_prediction && (
                <p>
                  <strong>Prediksi AI:</strong> {selectedLaporan.ai_prediction} ({selectedLaporan.ai_confidence}%)
                </p>
              )}
              <p><strong>Deskripsi:</strong> {selectedLaporan.deskripsi || '-'}</p>
              <p>
                <strong>Status:</strong>{' '}
                <span className={`badge badge-${selectedLaporan.status}`}>
                  {STATUS_LABELS[selectedLaporan.status]}
                </span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(selectedLaporan.id)}
              >
                🗑️ Hapus
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const url = `https://www.google.com/maps?q=${selectedLaporan.lat},${selectedLaporan.lng}`;
                  window.open(url, '_blank');
                }}
              >
                📍 Buka di Google Maps
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
