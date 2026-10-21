import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { LOGO_FITMEAL } from '../report/logoFitmeal';
import { LOGO_ARETIA_CREMA } from '../report/logoAretia';
import { LOGO_NUTRIALEGO_BLANCO } from '../report/logoNutriAleGo';

const LOGO = process.env.REACT_APP_LOGO_URL || '/logo.png';

// Instancia Aretia (por dominio app.aretia.mx / demo sistemanutricio, o marca). Su logo va en
// crema/ámbar porque el topbar es azul marino. Solo aplica si la config de marca no trae logo.
// Nutri Ale Go: dominio nutrialego.aretia.mx (contiene "aretia") pero con su propio logo claro.
const ES_NUTRIALEGO_TB = ((typeof window !== 'undefined' && window.location &&
  window.location.hostname.indexOf('nutrialego') !== -1) ||
  ((process.env.REACT_APP_MARCA_NOMBRE || '').toLowerCase() === 'nutri ale go'));
const ES_ARETIA_TB = !ES_NUTRIALEGO_TB && ((typeof window !== 'undefined' && window.location &&
  (window.location.hostname.indexOf('aretia') !== -1 || window.location.hostname.indexOf('sistemanutricio') !== -1)) ||
  ((process.env.REACT_APP_MARCA_NOMBRE || '').toLowerCase() === 'aretia'));

export default function Topbar({ role, user, onPerfil }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { logo } = useBranding();
  const { tema, temaDisponible } = useTheme();
  // En modo día (solo Fitmeal) el topbar es blanco → se usa el logo OSCURO Fitmeal.
  const logoDia = (temaDisponible && tema === 'dia') ? LOGO_FITMEAL : null;
  const logoSrc = logoDia || ((logo === undefined) ? LOGO : logo); // undefined = por defecto · '' = sin logo

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = (name) => name ? name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : '??';
  const nombre = user?.displayName || user?.email?.split('@')[0] || '';

  return (
    <div className="topbar">
      <div>
        {(ES_NUTRIALEGO_TB && !logoDia) ? (
          <img src={LOGO_NUTRIALEGO_BLANCO} alt="Nutri Ale Go" style={{ height: 75, width: 'auto', display: 'block' }} />
        ) : (ES_ARETIA_TB && !logoDia) ? (
          <img src={LOGO_ARETIA_CREMA} alt="Aretia" style={{ height: 48, width: 'auto', display: 'block' }} />
        ) : (logoSrc ? <img src={logoSrc} alt="" className="topbar-logo-img" /> : null)}
        <div className="topbar-role">{role === 'nutriologa' ? 'Panel de nutrición' : 'Mi cuenta'}</div>
      </div>

      <div className="avatar-wrapper" ref={menuRef}>
        <div className="avatar" onClick={() => setMenuOpen(!menuOpen)}>
          {user?.photoURL
            ? <img src={user.photoURL} alt="avatar" />
            : initials(nombre)
          }
        </div>

        {menuOpen && (
          <div className="avatar-menu">
            <div style={{padding:'0.75rem 1rem',borderBottom:'1px solid #333'}}>
              <div className="tb-acct-name">{nombre}</div>
              <div className="tb-acct-email">{user?.email}</div>
            </div>
            <button className="avatar-menu-item" onClick={() => { setMenuOpen(false); onPerfil && onPerfil(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Mi perfil
            </button>
            <div className="avatar-menu-divider" />
            <button className="avatar-menu-item danger" onClick={() => { setMenuOpen(false); signOut(auth); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Cerrar sesion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
