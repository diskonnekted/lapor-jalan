import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import ReportForm from './pages/ReportForm';
import LaporanList from './pages/LaporanList';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import MobileApp from './pages/MobileApp';
import './App.css';

// Detect if device is mobile
function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  // Check for mobile devices
  if (/android/i.test(userAgent)) return true;
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return true;
  // Check screen size
  if (window.innerWidth <= 768) return true;
  return false;
}

function DesktopApp() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isLaporan = location.pathname === '/laporan';

  return (
    <>
      {!isAdmin && !isLaporan && (
        <header className="header">
          <Link to="/">🗺️ Peta Jalan Banjarnegara</Link>
          <nav>
            <Link to="/">Peta</Link>
            <Link to="/laporan">Daftar Laporan</Link>
            <Link to="/lapor">Lapor Kerusakan</Link>
            <Link to="/admin/login">Admin</Link>
          </nav>
        </header>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/laporan" element={<LaporanList />} />
        <Route path="/lapor" element={<ReportForm />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}

function App() {
  const [isMobile, setIsMobile] = useState(() => isMobileDevice());

  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return <MobileApp />;
  }

  return <DesktopApp />;
}

export default App;
