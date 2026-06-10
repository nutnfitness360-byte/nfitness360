import React, { useState, useRef } from 'react';
import { auth } from '../firebase/config';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';

export default function PerfilPaciente({ onBack }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState(user?.photoURL || null);
  const fileRef = useRef(null);

  const handleFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
        if (file.size > 5000000) { setMsg('La imagen debe ser menor a 5MB'); return; }

    setSaving(true);
    setMsg('');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        await updateProfile(auth.currentUser, { photoURL: dataUrl });
        setPreview(dataUrl);
        setMsg('Foto actualizada correctamente');
        setSaving(false);
      };
      reader.readAsDataURL(file);
    } catch(e) {
      setMsg('Error al actualizar: ' + e.message);
      setSaving(false);
    }
  };

  const nombre = user?.displayName || user?.email?.split('@')[0] || '';
  const initials = (n) => n ? n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase() : '??';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'1.5rem'}}>
        <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'var(--stone)',fontFamily:'var(--font)',fontSize:'12px',display:'flex',alignItems:'center',gap:'4px'}}>
          ← Regresar
        </button>
      </div>

      <div className="card">
        <div className="perfil-avatar-wrap">
          <div className="perfil-avatar-large" onClick={() => fileRef.current.click()}>
            {preview
              ? <img src={preview} alt="foto" />
              : <span>{initials(nombre)}</span>
            }
            <div className="perfil-avatar-overlay">
              {saving ? 'Guardando...' : 'Cambiar'}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFoto} />
          <div className="perfil-nombre">{nombre}</div>
          <div className="perfil-email">{user?.email}</div>
          {msg && (
            <div style={{marginTop:'1rem',padding:'8px 16px',borderRadius:'8px',fontSize:'12px',background: msg.includes('Error') ? '#fef0f0' : 'rgba(154,185,173,0.2)', color: msg.includes('Error') ? '#c0392b' : '#2d6b5e',fontFamily:'var(--font)'}}>
              {msg}
            </div>
          )}
        </div>

        <div style={{borderTop:'0.5px solid var(--border)',paddingTop:'1rem',marginTop:'0.5rem'}}>
          <div className="section-label">Información de la cuenta</div>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid var(--border)'}}>
              <span style={{fontSize:'12px',color:'var(--stone)',fontFamily:'var(--font)'}}>Nombre</span>
              <span style={{fontSize:'12px',fontWeight:'600',color:'var(--dark)',fontFamily:'var(--font)'}}>{nombre}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid var(--border)'}}>
              <span style={{fontSize:'12px',color:'var(--stone)',fontFamily:'var(--font)'}}>Correo</span>
              <span style={{fontSize:'12px',fontWeight:'600',color:'var(--dark)',fontFamily:'var(--font)'}}>{user?.email}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}>
              <span style={{fontSize:'12px',color:'var(--stone)',fontFamily:'var(--font)'}}>Tipo de cuenta</span>
              <span style={{fontSize:'12px',fontWeight:'600',color:'var(--sage)',fontFamily:'var(--font)'}}>Paciente</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{textAlign:'center',fontSize:'11px',color:'var(--stone)',marginTop:'1rem',fontFamily:'var(--font)'}}>
        Toca la foto de perfil para cambiarla
      </div>
    </div>
  );
}
