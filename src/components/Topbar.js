import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

const LOGO = '/logo.png';

export default function Topbar({ role, user, onPerfil }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
        const handleClick = (e) => {
  
      if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
      }
        };
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = (name) => name ? name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : '??';
  const nombre = user?.displayName || user?.email?.split('@')[0] || '';

  return (
    <div className="topbar">
      <div>
        <img src={LOGO} alt="N Fitness 360" className="topbar-logo-img" />
        <div className="topbar-role">{role === 'nutriologa' ? 'Panel nutrióloga' : 'Mi cuenta'}</div>
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
              <div style={{fontSize:'12px',fontWeight:'600',color:'var(--cream)',fontFamily:'var(--font)'}}>{nombre}</div>
              <div style={{fontSize:'10px',color:'var(--stone)',marginTop:'2px',fontFamily:'var(--font)'}}>{user?.email}</div>
            </div>
            <button className="avatar-menu-item" onClick={() => { setMenuOpen(false); onPerfil && onPerfil(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Mi perfil
            </button>
            <div className="avatar-menu-divider" />
            <button className="avatar-menu-item danger" onClick={() => { setMenuOpen(false); signOut(auth); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
