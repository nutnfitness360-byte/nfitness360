import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import LoginPage from './pages/LoginPage';
import NutriDashboard from './pages/NutriDashboard';
import PacienteDashboard from './pages/PacienteDashboard';
import './styles.css';

// Marca por instancia (por dominio): la instancia de venta se muestra como "Aretia"
// (título de pestaña + favicon con el símbolo). Cualquier otra instancia (Natalia)
// conserva lo de index.html sin cambios.
function aplicarMarcaPorDominio() {
  try {
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
    if (host.indexOf('sistemanutricio') === -1) return; // solo la instancia Aretia (venta/demo)
    document.title = 'Aretia';
    // Favicon = símbolo Aretia (SVG en línea, teja esmeralda + "A" con punta ámbar)
    const favicon = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='24'%20fill='%2321403A'/%3E%3Cpath%20d='M29%2074%20L50%2030%20L71%2074'%20fill='none'%20stroke='%23F4F1EA'%20stroke-width='9'%20stroke-linejoin='miter'/%3E%3Cpath%20d='M40.5%2050%20L50%2030%20L59.5%2050'%20fill='none'%20stroke='%23BE6E30'%20stroke-width='9'%20stroke-linejoin='miter'/%3E%3C/svg%3E";
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.setAttribute('type', 'image/svg+xml');
    link.setAttribute('href', favicon);
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
  useEffect(() => { aplicarMarcaPorDominio(); }, []);
  return (
    <AuthProvider>
      <BrandingProvider>
        <AppContent />
      </BrandingProvider>
    </AuthProvider>
  );
}
