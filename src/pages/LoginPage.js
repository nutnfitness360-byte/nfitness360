import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebase/config';
import {
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail, updateProfile, signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const NUTRI_EMAIL = 'nutnfitness360@gmail.com';

async function esNutriAutorizada(email) {
  const e = (email || '').toLowerCase();
  if (e === NUTRI_EMAIL) return true;
  try {
    const snap = await getDoc(doc(db, 'autorizados', e));
    return snap.exists() && snap.data().rol === 'nutriologa';
  } catch (_) { return false; }
}

const MSG = {
  'auth/invalid-email': 'El correo no es válido.',
  'auth/wrong-password': 'La contraseña no es correcta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/popup-closed-by-user': 'Se cerró la ventana de Google.',
  'auth/operation-not-allowed': 'El acceso con correo no está habilitado. Avisa al administrador.',
};
const traducir = (code) => MSG[code] || ('Ocurrió un error (' + code + ').');

export default function LoginPage() {
  const [vista, setVista] = useState('inicio');   // inicio | acceso | email | password | crear | denegado
  const [puerta, setPuerta] = useState('paciente'); // nutri | paciente
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const esNutriPuerta = puerta === 'nutri';
  const tituloPuerta = esNutriPuerta ? 'Panel de nutrición' : 'Portal del paciente';

  const abrir = (p) => { setPuerta(p); setError(''); setEmail(''); setPass(''); setPass2(''); setNombre(''); setVista('acceso'); };
  const volverInicio = () => { setError(''); setVista('inicio'); };

  // ---- Google ----
  const conGoogle = async () => {
    setLoading(true); setError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const correo = (cred.user.email || '').toLowerCase();
      if (esNutriPuerta && !(await esNutriAutorizada(correo))) {
        await signOut(auth);
        setVista('denegado');
      }
      // Si pasa, AuthContext detecta el rol y entra al panel que corresponde.
    } catch (e) {
      setError(traducir(e.code));
    }
    setLoading(false);
  };

  // ---- Continuar con correo: detecta si es primera vez ----
  const continuarCorreo = async () => {
    const e = email.trim().toLowerCase();
    if (!e || e.indexOf('@') < 0) { setError('Escribe un correo válido.'); return; }
    setLoading(true); setError('');
    try {
      if (esNutriPuerta && !(await esNutriAutorizada(e))) {
        setLoading(false); setVista('denegado'); return;
      }
      const metodos = await fetchSignInMethodsForEmail(auth, e);
      if (metodos.includes('password')) {
        setVista('password');
      } else if (metodos.length > 0 && metodos.includes('google.com')) {
        setError('Este correo ya usa acceso con Google. Usa el botón "Continuar con Google".');
      } else {
        setVista('crear'); // sin métodos conocidos → primera vez (con respaldo abajo)
      }
    } catch (err) {
      setError(traducir(err.code));
    }
    setLoading(false);
  };

  // ---- Iniciar sesión con contraseña existente ----
  const entrarPassword = async () => {
    if (!pass) { setError('Escribe tu contraseña.'); return; }
    setLoading(true); setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
      if (esNutriPuerta && !(await esNutriAutorizada(cred.user.email))) {
        await signOut(auth); setVista('denegado');
      }
    } catch (e) {
      setError(traducir(e.code));
    }
    setLoading(false);
  };

  // ---- Crear contraseña (primera vez) ----
  const crearCuenta = async () => {
    const e = email.trim().toLowerCase();
    if (!nombre.trim()) { setError('Escribe tu nombre.'); return; }
    if (pass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (pass !== pass2) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true); setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, e, pass);
      try { await updateProfile(cred.user, { displayName: nombre.trim() }); } catch (_) {}
      // AuthContext entra al panel que corresponda.
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        // Ya existía: lo mandamos a iniciar sesión con su contraseña.
        setError('Ya tienes una cuenta con este correo. Escribe tu contraseña para entrar.');
        setVista('password');
      } else {
        setError(traducir(err.code));
      }
    }
    setLoading(false);
  };

  // ===================== ESTILOS =====================
  const S = {
    wrap: { background: 'var(--dark)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'var(--font)' },
    box: { width: '100%', maxWidth: 380, textAlign: 'center' },
    logo: { height: 46, width: 'auto', objectFit: 'contain', marginBottom: 18 },
    hola: { fontSize: 14, color: 'var(--cream)', marginBottom: 22, opacity: 0.85 },
    cards: { display: 'flex', gap: 12 },
    card: { flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid #4A423B', borderRadius: 14, padding: '22px 12px', cursor: 'pointer', color: '#fff' },
    cardIcon: { fontSize: 26, color: 'var(--gold)' },
    cardTitle: { fontSize: 13.5, fontWeight: 700, marginTop: 10 },
    cardDesc: { fontSize: 10.5, color: '#B7ABA2', marginTop: 4, lineHeight: 1.4 },
    panel: { background: '#fff', borderRadius: 16, padding: '22px 20px', textAlign: 'left' },
    h3: { fontSize: 16, fontWeight: 700, color: 'var(--dark)', margin: '0 0 4px' },
    p: { fontSize: 11.5, color: 'var(--stone)', margin: '0 0 16px', lineHeight: 1.5 },
    btn: { width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', cursor: 'pointer', border: 'none' },
    btnGoogle: { background: '#fff', border: '1px solid var(--border)', color: 'var(--dark)', marginBottom: 9 },
    btnDark: { background: 'var(--dark)', color: '#fff' },
    btnGhost: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--stone)' },
    lbl: { fontSize: 10, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px', display: 'block' },
    inp: { width: '100%', boxSizing: 'border-box', border: '0.5px solid var(--border)', borderRadius: 9, padding: 10, fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', marginBottom: 12 },
    err: { background: '#fbeae6', color: '#B0593F', fontSize: 11.5, padding: '9px 11px', borderRadius: 8, marginBottom: 12, lineHeight: 1.4 },
    back: { background: 'none', border: 'none', color: 'var(--stone)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 14, fontFamily: 'var(--font)' },
    ico: { fontSize: 16, verticalAlign: '-3px', marginRight: 7 },
  };

  // ===================== PANTALLA 1: dos recuadros =====================
  if (vista === 'inicio') {
    return (
      <div style={S.wrap}>
        <div style={S.box}>
          <img src="/logo.png" alt="Nfitness 360" style={S.logo} />
          <div style={S.hola}>¿Cómo deseas ingresar?</div>
          <div style={S.cards}>
            <div style={S.card} onClick={() => abrir('nutri')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.285Z" /></svg>
              <div style={S.cardTitle}>Panel de nutrición</div>
              <div style={S.cardDesc}>Acceso profesional</div>
            </div>
            <div style={S.card} onClick={() => abrir('paciente')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" /></svg>
              <div style={S.cardTitle}>Paciente</div>
              <div style={S.cardDesc}>Tu portal personal</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== VENTANILLA (acceso / email / password / crear / denegado) =====================
  return (
    <div style={S.wrap}>
      <div style={{ ...S.box, maxWidth: 340 }}>
        <div style={S.panel}>
          <button style={S.back} onClick={vista === 'acceso' ? volverInicio : () => { setError(''); setVista('acceso'); }}>← Atrás</button>

          {vista === 'denegado' ? (
            <>
              <div style={S.h3}>Acceso no autorizado</div>
              <div style={S.err}>Este correo no está autorizado para el panel de nutrición.</div>
              <p style={S.p}>Si crees que es un error, contacta al administrador para que te dé de alta. Si eres paciente, regresa y entra por "Paciente".</p>
              <button style={{ ...S.btn, ...S.btnGhost }} onClick={volverInicio}>Volver al inicio</button>
            </>
          ) : (
            <>
              <div style={S.h3}>{tituloPuerta}</div>

              {vista === 'acceso' && (
                <>
                  <p style={S.p}>Elige cómo ingresar. Validaremos que tu correo tenga acceso.</p>
                  {error && <div style={S.err}>{error}</div>}
                  <button style={{ ...S.btn, ...S.btnGoogle }} onClick={conGoogle} disabled={loading}>
                    <svg style={S.ico} width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
                    Continuar con Google
                  </button>
                  <button style={{ ...S.btn, ...S.btnDark }} onClick={() => { setError(''); setVista('email'); }} disabled={loading}>
                    Continuar con correo
                  </button>
                </>
              )}

              {vista === 'email' && (
                <>
                  <p style={S.p}>Escribe tu correo para continuar.</p>
                  {error && <div style={S.err}>{error}</div>}
                  <label style={S.lbl}>Correo electrónico</label>
                  <input style={S.inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                  <button style={{ ...S.btn, ...S.btnDark }} onClick={continuarCorreo} disabled={loading}>
                    {loading ? 'Verificando…' : 'Continuar'}
                  </button>
                </>
              )}

              {vista === 'password' && (
                <>
                  <p style={S.p}>Ingresa tu contraseña para <b>{email.trim().toLowerCase()}</b>.</p>
                  {error && <div style={S.err}>{error}</div>}
                  <label style={S.lbl}>Contraseña</label>
                  <input style={S.inp} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
                  <button style={{ ...S.btn, ...S.btnDark }} onClick={entrarPassword} disabled={loading}>
                    {loading ? 'Entrando…' : 'Entrar'}
                  </button>
                </>
              )}

              {vista === 'crear' && (
                <>
                  <p style={S.p}>Primera vez con <b>{email.trim().toLowerCase()}</b>. Crea tu contraseña.</p>
                  {error && <div style={S.err}>{error}</div>}
                  <label style={S.lbl}>Tu nombre</label>
                  <input style={S.inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido" />
                  <label style={S.lbl}>Crear contraseña</label>
                  <input style={S.inp} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  <label style={S.lbl}>Confirmar contraseña</label>
                  <input style={S.inp} type="password" value={pass2} onChange={e => setPass2(e.target.value)} placeholder="Repite la contraseña" />
                  <button style={{ ...S.btn, ...S.btnDark }} onClick={crearCuenta} disabled={loading}>
                    {loading ? 'Creando…' : 'Crear y entrar'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
