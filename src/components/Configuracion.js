import React, { useState, useRef, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useBranding, DEFAULT_COLORS, aplicarColores } from '../context/BrandingContext';

// Bloqueo de marca por instancia (definido aquí para no depender de otro archivo):
// si REACT_APP_BRANDING_LOCKED === 'true', no se muestra el editor de colores.
const BRANDING_LOCKED = String(process.env.REACT_APP_BRANDING_LOCKED || '').toLowerCase() === 'true';

const COLOR_LABELS = [
  ['gold', 'Acento (botones, detalles)'],
  ['dark', 'Oscuro (barras y texto fuerte)'],
  ['cream', 'Crema (fondos suaves)'],
  ['sage', 'Salvia (acentos)'],
  ['stone', 'Piedra (texto secundario)'],
  ['card', 'Tarjetas (fondo)'],
  ['border', 'Bordes'],
  ['ink', 'Texto principal (cálido)'],
  ['mint', 'Fondos suaves (tablas, tintes)'],
  ['danger', 'Alertas / rojo'],
];

// Carga una imagen, la redimensiona (máx 480px de ancho) y la devuelve como PNG
// en base64 (PNG para conservar transparencia del logo).
function comprimirLogo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Configuracion() {
  const { logo, colors } = useBranding();
  const [colorsLocal, setColorsLocal] = useState(colors);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setColorsLocal(colors); }, [colors]);

  const logoSrc = (logo === undefined) ? '/logo.png' : logo;

  const guardar = async (patch) => {
    setBusy(true); setMsg('');
    try {
      await setDoc(doc(db, 'config', 'branding'), patch, { merge: true });
      setMsg('Guardado ✓');
    } catch (e) { setMsg('No se pudo guardar: ' + e.message); }
    setBusy(false);
  };

  const onFile = async (file) => {
    if (!file || !(file.type || '').startsWith('image/')) { setMsg('Elige un archivo de imagen.'); return; }
    setBusy(true); setMsg('Procesando imagen…');
    try {
      const data = await comprimirLogo(file);
      await guardar({ logo: data });
    } catch (e) { setMsg('No se pudo procesar la imagen.'); setBusy(false); }
  };

  const setColor = (k, v) => {
    const next = { ...colorsLocal, [k]: v };
    setColorsLocal(next);
    aplicarColores(next); // vista previa en vivo
  };

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <div className="card-title">Configuración de marca</div>
      <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 22, lineHeight: 1.5 }}>
        Personaliza el logo y los colores de este sistema. Los cambios aplican solo a esta instancia.
      </div>

      {/* LOGO */}
      <div style={B.label}>Logo</div>
      <div
        onClick={() => fileRef.current && fileRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
        style={{ ...B.drop, borderColor: drag ? 'var(--gold)' : 'var(--border)' }}>
        {logoSrc
          ? <img src={logoSrc} alt="logo" style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }} />
          : <div style={{ color: 'var(--stone)', fontSize: 13 }}>Carga tu logo aquí · da clic o arrastra una imagen</div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => onFile(e.target.files && e.target.files[0])} />
      <div style={{ display: 'flex', gap: 10, marginTop: 10, marginBottom: 26, flexWrap: 'wrap' }}>
        <button style={B.primary} onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}>
          {logoSrc ? 'Cambiar logo' : 'Subir logo'}
        </button>
        {logoSrc ? <button style={B.ghost} onClick={() => guardar({ logo: '' })} disabled={busy}>Quitar logo</button> : null}
        {(logo === '' ) ? <button style={B.ghost} onClick={() => guardar({ logo: null })} disabled={busy}>Usar logo por defecto</button> : null}
      </div>

      {!BRANDING_LOCKED && (
        <div>
          {/* COLORES */}
          <div style={B.label}>Colores</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 10, marginBottom: 18 }}>
            {COLOR_LABELS.map(([k, label]) => (
              <label key={k} style={B.colorRow}>
                <input type="color" value={colorsLocal[k] || '#000000'}
                  onChange={e => setColor(k, e.target.value)} style={B.colorInput} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={B.primary} onClick={() => guardar({ colors: colorsLocal })} disabled={busy}>Guardar colores</button>
            <button style={B.ghost} onClick={() => { setColorsLocal(DEFAULT_COLORS); aplicarColores(DEFAULT_COLORS); guardar({ colors: DEFAULT_COLORS }); }} disabled={busy}>Restablecer colores</button>
          </div>
        </div>
      )}
      {msg ? <span style={{ fontSize: 12.5, color: 'var(--stone)', display: 'block', marginTop: 10 }}>{msg}</span> : null}
    </div>
  );
}

const B = {
  label: { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 },
  drop: { border: '1.5px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: 'var(--cream)' },
  primary: { background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' },
  ghost: { background: '#fff', color: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' },
  colorRow: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--dark)' },
  colorInput: { width: 44, height: 34, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer', padding: 2 },
};
