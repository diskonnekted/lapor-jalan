const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://your-backend-url.railway.app');

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  if (res.status === 204) return null;
  return res.json();
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),

  // Laporan (public)
  getLaporan: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/laporan${qs ? '?' + qs : ''}`);
  },
  getLaporanStats: () => request('/api/laporan/stats'),
  getLaporanById: (id) => request(`/api/laporan/${id}`),
  createLaporan: (formData) =>
    request('/api/laporan', {
      method: 'POST',
      body: formData, // FormData with file
    }),
  createLaporanBulk: (formData) =>
    request('/api/laporan/bulk', {
      method: 'POST',
      body: formData,
    }),

  // Laporan (admin)
  updateLaporanStatus: (id, status) =>
    request(`/api/laporan/${id}/status`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }),
  updateLaporan: (id, data) =>
    request(`/api/laporan/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteLaporan: (id) =>
    request(`/api/laporan/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  updateLaporanPhoto: (id, formData) =>
    request(`/api/laporan/${id}/foto-perbaikan`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    }),

  // AI Classification
  classifyImage: (formData) =>
    request('/api/ai/classify', {
      method: 'POST',
      body: formData,
    }),

  // Desa
  getDesaAtLocation: (lat, lng) =>
    request(`/api/desa/at-location?lat=${lat}&lng=${lng}`),
  getDesaList: () =>
    request('/api/desa/list'),
  getDesaBoundaries: () =>
    request('/api/desa/boundaries'),

  // Ruas Jalan
  getRuasJalan: () => request('/api/ruas-jalan/official'),
  getOsmRoads: (types = '') => request(`/api/ruas-jalan${types ? '?types=' + types : ''}`),
};
