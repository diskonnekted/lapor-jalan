import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api.login(username, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('role', result.role);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Login gagal');
    }

    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>🔐 Admin Login</h2>
        {error && (
          <div style={{ background: '#FFEBEE', color: '#C62828', padding: 8, borderRadius: 4, marginBottom: 12 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? <span className="spinner" /> : 'Login'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <a href="/" style={{ color: 'var(--primary)' }}>← Kembali ke Peta</a>
        </p>
      </div>
    </div>
  );
}
