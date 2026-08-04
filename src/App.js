import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import LoginPage from './pages/LoginPage';
import NutriDashboard from './pages/NutriDashboard';
import PacienteDashboard from './pages/PacienteDashboard';
import './styles.css';

// Título de la pestaña FIJO por instancia (por dominio). El sitio de venta muestra
// "Sistema Nutricio Mx"; cualquier otra instancia (Natalia) conserva el de index.html.
function aplicarTituloPorDominio() {
  try {
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
    if (host.indexOf('sistemanutricio') !== -1) document.title = 'Sistema Nutricio Mx';
  } catch (_) { /* no-op */ }
}

function AppContent() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-n">N</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (role === 'nutriologa') return <NutriDashboard />;
  return <PacienteDashboard />;
}

export default function App() {
  useEffect(() => { aplicarTituloPorDominio(); }, []);
  return (
    <AuthProvider>
      <BrandingProvider>
        <AppContent />
      </BrandingProvider>
    </AuthProvider>
  );
}
