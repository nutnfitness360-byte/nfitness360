import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import NutriDashboard from './pages/NutriDashboard';
import PacienteDashboard from './pages/PacienteDashboard';
import { TerminosGate } from './components/TerminosModal';
import './styles.css';

// Marca por INSTANCIA: variable de entorno REACT_APP_MARCA → respaldo por dominio
// (sistemanutricio/aretia) → Natalia por defecto. Natalia: sin variable y en su dominio
// → false → NO se toca nada (conserva EXACTAMENTE su título, favicon y colores de index.html).
function esInstanciaAretia() {
  try {
    const marca = (process.env.REACT_APP_MARCA || '').toLowerCase();
    if (marca) return marca !== 'natalia';
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
    return host.indexOf('sistemanutricio') !== -1 || host.indexOf('aretia') !== -1;
  } catch (_) { return false; }
}

// La instancia de venta/cliente se muestra como "Aretia" (título de pestaña + favicon con
// el símbolo) y aplica los colores al instante (anti-destello). Cualquier otra instancia
// (Natalia) conserva lo de index.html sin cambios.
function aplicarMarcaPorDominio() {
  try {
    // Marca por VARIABLES (env) — reproducible por instancia (p.ej. Fitmeal).
    // Si la instancia define REACT_APP_BRAND_COLORS (JSON de variables CSS), se aplica su
    // paleta + favicon + título y se IGNORA la ruta Aretia. Natalia (sin nada) y Aretia
    // (con REACT_APP_MARCA pero sin BRAND_COLORS) NO cambian.
    var _brandRaw = process.env.REACT_APP_BRAND_COLORS;
    if (_brandRaw) {
      try {
        var CB = JSON.parse(_brandRaw);
        var rsb = document.documentElement.style;
        // Los "#" de los hex van codificados como %23 en la variable de entorno para que
        // NINGÚN importador de .env los trate como comentario y trunque el valor. Aquí se
        // decodifican de vuelta a "#" antes de aplicarlos. (Valores sin %23 quedan igual.)
        Object.keys(CB).forEach(function (k) { rsb.setProperty(k, String(CB[k]).replace(/%23/g, '#')); });
      } catch (e) { /* JSON inválido → se ignora, se conservan los defaults */ }
      if (process.env.REACT_APP_MARCA_NOMBRE) document.title = process.env.REACT_APP_MARCA_NOMBRE;
      var favB = process.env.REACT_APP_FAVICON;
      if (favB) {
        var lb = document.querySelector("link[rel~='icon']");
        if (!lb) { lb = document.createElement('link'); lb.rel = 'icon'; document.head.appendChild(lb); }
        lb.setAttribute('href', favB);
      }
      return;
    }
    if (!esInstanciaAretia()) return; // solo instancias Aretia; Natalia intacta
    // Colores Aretia al INSTANTE (antes de pintar), para que no se vea el destello de la
    // paleta por defecto mientras carga la config desde la base de datos.
    var C = { '--cream': '#F4F1EA', '--gold': '#E0913F', '--sage': '#7C9BBE', '--stone': '#64726B', '--dark': '#1E3A5F', '--card': '#FFFFFF', '--border': '#E4E1D8' };
    var rs = document.documentElement.style;
    Object.keys(C).forEach(function (k) { rs.setProperty(k, C[k]); });
    document.title = process.env.REACT_APP_MARCA_NOMBRE || 'Aretia';
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
        <div className="loading-n">{((process.env.REACT_APP_MARCA_NOMBRE || '').trim().charAt(0).toUpperCase()) || (esInstanciaAretia() ? 'A' : 'N')}</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  // Tanto nutrióloga como paciente deben aceptar los términos y el aviso de
  // privacidad la primera vez que entran (los pacientes son titulares de datos
  // sensibles). El modal se guarda por usuario en Firestore.
  return (
    <TerminosGate>
      {role === 'nutriologa' ? <NutriDashboard /> : <PacienteDashboard />}
    </TerminosGate>
  );
}

export default function App() {
  useEffect(() => { aplicarMarcaPorDominio(); }, []);
  return (
    <AuthProvider>
      <BrandingProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </BrandingProvider>
    </AuthProvider>
  );
}
