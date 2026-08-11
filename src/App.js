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
    // Colores Aretia al INSTANTE (antes de pintar), para que no se vea el destello de la
    // paleta por defecto mientras carga la config desde la base de datos.
    var C = { '--cream': '#F4F1EA', '--gold': '#E0913F', '--sage': '#7C9BBE', '--stone': '#64726B', '--dark': '#1E3A5F', '--card': '#FFFFFF', '--border': '#E4E1D8' };
    var rs = document.documentElement.style;
    Object.keys(C).forEach(function (k) { rs.setProperty(k, C[k]); });
    document.title = 'Aretia';
    // Favicon = símbolo Aretia (SVG en línea, teja esmeralda + "A" con punta ámbar)
    const favicon = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='24'%20fill='%231E3A5F'/%3E%3Cpath%20d='M29%2074%20L50%2030%20L71%2074'%20fill='none'%20stroke='%23F4F1EA'%20stroke-width='9'%20stroke-linejoin='miter'/%3E%3Cpath%20d='M40.5%2050%20L50%2030%20L59.5%2050'%20fill='none'%20stroke='%23E0913F'%20stroke-width='9'%20stroke-linejoin='miter'/%3E%3C/svg%3E";
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.setAttribute('type', 'image/svg+xml');
    link.setAttribute('href', favicon);
  } catch (_) { /* no-op */ }
}

// Ejecutar de inmediato al cargar el bundle (antes del render de React) para que la
// paleta Aretia ya esté aplicada en el primer pintado y NO haya destello de color.
aplicarMarcaPorDominio();

function AppContent() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-n">{(typeof window !== 'undefined' && window.location && window.location.hostname.indexOf('sistemanutricio') !== -1) ? 'A' : 'N'}</div>
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
