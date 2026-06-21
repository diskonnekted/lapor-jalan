/**
 * Laporan Detail Modal - shown when tapping a photo or card
 */
export function LaporanDetail({ laporan, onClose }) {
  const daysSince = (dateStr) => Math.max(0, Math.floor((new Date() - new Date(dateStr)) / 86400000));

  if (!laporan) return null;

  return (
    <div className="laporan-detail-overlay" onClick={onClose}>
      <div className="laporan-detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="laporan-detail-header">
          <span>Laporan #{laporan.id}</span>
          <button className="detail-close-btn" onClick={onClose}>{Icons.close}</button>
        </div>

        {/* Photo */}
        {laporan.foto_path && (
          <div className="detail-photo">
            <img src={laporan.foto_path} alt="Foto kerusakan" />
          </div>
        )}

        {/* Details */}
        <div className="detail-body">
          <div className="detail-row">
            <span className="detail-label">Jenis Kerusakan</span>
            <span className="detail-value">
              {laporan.jenis_kerusakan ? (
                <>
                  <strong>{(() => {
                    const dt = DAMAGE_TYPES_BY_CATEGORY ? Object.values(DAMAGE_TYPES_BY_CATEGORY).flat().find(d => d.id === laporan.jenis_kerusakan) : null;
                    return dt ? dt.label : laporan.jenis_kerusakan;
                  })()}</strong>
                  <br />
                  <span style={{ fontSize: '0.75rem', color: '#999' }}>
                    {(() => {
                      const cat = DAMAGE_TYPES_BY_CATEGORY ? Object.entries(DAMAGE_TYPES_BY_CATEGORY).find(([, types]) => types.some(t => t.id === laporan.jenis_kerusakan)) : null;
                      return cat ? cat[0] : '';
                    })()}
                  </span>
                </>
              ) : (
                <span style={{ color: '#999' }}>—</span>
              )}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Keparahan</span>
            <span className="detail-value">
              <span className="badge-sm" style={{ background: DAMAGE_CONFIG[laporan.tingkat_kerusakan]?.color + '20', color: DAMAGE_CONFIG[laporan.tingkat_kerusakan]?.color }}>
                {DAMAGE_CONFIG[laporan.tingkat_kerusakan]?.label}
              </span>
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Lokasi</span>
            <span className="detail-value">
              {laporan.desa ? (
                <>
                  <div>{laporan.desa}</div>
                  <div style={{ fontSize: '0.8rem', color: '#999' }}>{laporan.kecamatan}, Banjarnegara</div>
                </>
              ) : (
                <span style={{ color: '#999' }}>{laporan.alamat || `${laporan.lat?.toFixed(4)}, ${laporan.lng?.toFixed(4)}`}</span>
              )}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <span className="badge-sm" style={{ background: STATUS_CONFIG[laporan.status]?.color + '20', color: STATUS_CONFIG[laporan.status]?.color }}>
                {STATUS_CONFIG[laporan.status]?.label}
              </span>
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Pelapor</span>
            <span className="detail-value">
              {laporan.nama_pelapor || 'Anonim'}
              {laporan.no_hp && <span style={{ color: '#999', fontSize: '0.85rem' }}> • {laporan.no_hp}</span>}
            </span>
          </div>

          {laporan.deskripsi && (
            <div className="detail-row">
              <span className="detail-label">Deskripsi</span>
              <span className="detail-value">{laporan.deskripsi}</span>
            </div>
          )}

          <div className="detail-row">
            <span className="detail-label">Tanggal</span>
            <span className="detail-value">
              {new Date(laporan.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              <span style={{ color: '#999', fontSize: '0.85rem' }}> • {daysSince(laporan.created_at)} hari lalu</span>
            </span>
          </div>

          {laporan.foto_perbaikan_path && (
            <div className="detail-row detail-row-highlight">
              <span className="detail-label">Foto Setelah Perbaikan</span>
              <div className="detail-photo-small">
                <img src={laporan.foto_perbaikan_path} alt="Foto perbaikan" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
