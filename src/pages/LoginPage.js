import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebase/config';
import {
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { NUTRI_EMAIL } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';

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
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/popup-closed-by-user': 'Se cerró la ventana de Google.',
  'auth/operation-not-allowed': 'El acceso con correo no está habilitado. Avisa al administrador.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
};
const traducir = (code) => MSG[code] || ('Ocurrió un error (' + code + ').');

// Códigos que pueden significar "la cuenta no existe" (Firebase a veces los
// enmascara como credencial inválida cuando la protección anti-enumeración
// está activada).
const POSIBLE_SIN_CUENTA = ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'];

export default function LoginPage() {
  const [vista, setVista] = useState('inicio');     // inicio | acceso | email | crear | denegado
  const { logo, portada } = useBranding();
  const logoSrc = (logo === undefined) ? '/logo.png' : logo;
  // Textos de portada: si la instancia los define en su config/branding, se usan;
  // si no, se conserva el texto por defecto (instancia de Natalia intacta).
  const PORTADA_TITULO_DEFAULT = 'Agenda tu cita con Natalia';
  const PORTADA_SUBTITULO_DEFAULT = 'Este es tu portal para reservar tus consultas, confirmarlas y dar seguimiento a tu plan.';
  const portadaTitulo = (portada && portada.titulo && String(portada.titulo).trim()) || PORTADA_TITULO_DEFAULT;
  const portadaSubtitulo = (portada && portada.subtitulo && String(portada.subtitulo).trim()) || PORTADA_SUBTITULO_DEFAULT;
  const [puerta, setPuerta] = useState('paciente'); // nutri | paciente
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ofrecerCrear, setOfrecerCrear] = useState(false);

  const esNutriPuerta = puerta === 'nutri';
  const tituloPuerta = esNutriPuerta ? 'Panel de nutrición' : 'Portal del paciente';

  const abrir = (p) => { setPuerta(p); setError(''); setEmail(''); setPass(''); setPass2(''); setNombre(''); setOfrecerCrear(false); setVista('acceso'); };
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

  // ---- Entrar con correo + contraseña ----
  const entrarConCorreo = async () => {
    const e = email.trim().toLowerCase();
    if (!e || e.indexOf('@') < 0) { setError('Escribe un correo válido.'); return; }
    if (!pass) { setError('Escribe tu contraseña.'); return; }
    setLoading(true); setError(''); setOfrecerCrear(false);
    try {
      if (esNutriPuerta && !(await esNutriAutorizada(e))) { setLoading(false); setVista('denegado'); return; }
      const cred = await signInWithEmailAndPassword(auth, e, pass);
      if (esNutriPuerta && !(await esNutriAutorizada(cred.user.email))) {
        await signOut(auth); setVista('denegado');
      }
      // éxito → AuthContext entra al panel
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        setError('La contraseña no es correcta.');
      } else if (POSIBLE_SIN_CUENTA.includes(err.code)) {
        setError('No pudimos iniciar sesión. Si ya tienes cuenta, revisa tu contraseña; si es tu primera vez, crea tu cuenta.');
        setOfrecerCrear(true);
      } else {
        setError(traducir(err.code));
      }
    }
    setLoading(false);
  };

  // ---- Crear cuenta (solo si el correo es nuevo) ----
  const irACrear = () => { setError(''); setOfrecerCrear(false); setPass2(''); setNombre(''); setVista('crear'); };

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
        setError('Ya tienes una cuenta con este correo. Escribe tu contraseña para entrar.');
        setVista('email'); setOfrecerCrear(false);
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
    cardTitle: { fontSize: 13.5, fontWeight: 700, marginTop: 10 },
    cardDesc: { fontSize: 10.5, color: '#B7ABA2', marginTop: 4, lineHeight: 1.4 },
    panel: { background: '#fff', borderRadius: 16, padding: '22px 20px', textAlign: 'left' },
    h3: { fontSize: 16, fontWeight: 700, color: 'var(--dark)', margin: '0 0 4px' },
    p: { fontSize: 11.5, color: 'var(--stone)', margin: '0 0 16px', lineHeight: 1.5 },
    btn: { width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', cursor: 'pointer', border: 'none' },
    btnGoogle: { background: '#fff', border: '1px solid var(--border)', color: 'var(--dark)', marginBottom: 9 },
    btnDark: { background: 'var(--dark)', color: '#fff' },
    btnGhost: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--stone)' },
    btnGold: { background: 'var(--gold)', color: '#fff', marginTop: 8 },
    lbl: { fontSize: 10, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px', display: 'block' },
    inp: { width: '100%', boxSizing: 'border-box', border: '0.5px solid var(--border)', borderRadius: 9, padding: 10, fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', marginBottom: 12 },
    err: { background: '#fbeae6', color: '#B0593F', fontSize: 11.5, padding: '9px 11px', borderRadius: 8, marginBottom: 12, lineHeight: 1.4 },
    back: { background: 'none', border: 'none', color: 'var(--stone)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 14, fontFamily: 'var(--font)' },
    ico: { fontSize: 16, verticalAlign: '-3px', marginRight: 7 },
    // --- Pantalla de inicio (info + recuadros) ---
    landingBox: { width: '100%', maxWidth: 760 },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(258px, 1fr))', gap: 30, alignItems: 'center' },
    lLogo: { height: 42, width: 'auto', objectFit: 'contain', marginBottom: 16 },
    lHead: { color: 'var(--cream)', fontSize: 23, fontWeight: 700, lineHeight: 1.2, textAlign: 'left' },
    lSub: { color: '#B7ABA2', fontSize: 12.5, lineHeight: 1.55, margin: '12px 0 20px', textAlign: 'left', maxWidth: 300 },
    lStepsLbl: { color: 'var(--gold)', fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', marginBottom: 13, textAlign: 'left' },
    lStep: { display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 13, textAlign: 'left' },
    lStepN: { minWidth: 22, height: 22, borderRadius: '50%', background: 'var(--gold)', color: 'var(--dark)', fontSize: 11, fontWeight: 700, lineHeight: '22px', textAlign: 'center' },
    lStepT: { color: 'var(--cream)', fontSize: 12.5, lineHeight: 1.4, paddingTop: 1 },
    rLbl: { color: '#8a7f76', fontSize: 10, fontWeight: 600, letterSpacing: '0.6px', marginBottom: 12, textTransform: 'uppercase', textAlign: 'left' },
    cardPat: { background: 'rgba(205,167,136,0.10)', border: '1.5px solid var(--gold)', borderRadius: 16, padding: '18px 16px', position: 'relative', marginBottom: 14, cursor: 'pointer' },
    cardNut: { background: 'rgba(255,255,255,0.03)', border: '1px solid #3a352f', borderRadius: 16, padding: '18px 16px', cursor: 'pointer' },
    badge: { position: 'absolute', top: -9, left: 18, background: 'var(--gold)', color: 'var(--dark)', fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', padding: '2px 9px', borderRadius: 8 },
    cardRow: { display: 'flex', alignItems: 'center', gap: 13 },
    cTitle: { fontSize: 15, fontWeight: 700 },
    cDesc: { fontSize: 11, marginTop: 2 },
  };

  // ===================== PANTALLA 1: info + dos recuadros =====================
  const IconoPaciente = ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" /></svg>
  );
  const IconoNutri = ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.285Z" /></svg>
  );
  const Chevron = ({ color }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ marginLeft: 'auto', flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
  );

  if (vista === 'inicio') {
    return (
      <div style={S.wrap}>
        <div style={S.landingBox}>
          <div style={S.grid2}>

            {/* Columna izquierda: mensaje + pasos */}
            <div>
              {logoSrc ? <img src={logoSrc} alt="" style={S.lLogo} /> : null}
              <div style={S.lHead}>{portadaTitulo}</div>
              <div style={S.lSub}>{portadaSubtitulo}</div>
              <div style={S.lStepsLbl}>CÓMO AGENDAR</div>
              <div style={S.lStep}>
                <div style={S.lStepN}>1</div>
                <div style={S.lStepT}>Entra al recuadro <b>Paciente</b> y crea tu cuenta o inicia sesión</div>
              </div>
              <div style={S.lStep}>
                <div style={S.lStepN}>2</div>
                <div style={S.lStepT}>Elige el día y la hora que prefieras en el calendario</div>
              </div>
              <div style={{ ...S.lStep, marginBottom: 0 }}>
                <div style={S.lStepN}>3</div>
                <div style={S.lStepT}>Recibe la confirmación de tu cita</div>
              </div>
            </div>

            {/* Columna derecha: los dos recuadros */}
            <div>
              <div style={S.rLbl}>¿Cómo deseas ingresar?</div>

              <div style={S.cardPat} onClick={() => abrir('paciente')}>
                <div style={S.badge}>EMPIEZA AQUÍ</div>
                <div style={S.cardRow}>
                  <IconoPaciente color="var(--gold)" />
                  <div>
                    <div style={{ ...S.cTitle, color: '#fff' }}>Paciente</div>
                    <div style={{ ...S.cDesc, color: '#B7ABA2' }}>Agenda y sigue tus consultas</div>
                  </div>
                  <Chevron color="var(--gold)" />
                </div>
              </div>

              <div style={S.cardNut} onClick={() => abrir('nutri')}>
                <div style={S.cardRow}>
                  <IconoNutri color="#7d7368" />
                  <div>
                    <div style={{ ...S.cTitle, color: '#C9BEB4' }}>Panel de nutrición</div>
                    <div style={{ ...S.cDesc, color: '#8a7f76' }}>Acceso profesional</div>
                  </div>
                  <Chevron color="#5f574f" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ===================== VENTANILLA =====================
  const backHandler = () => {
    setError(''); setOfrecerCrear(false);
    if (vista === 'acceso') volverInicio();
    else if (vista === 'crear') setVista('email');
    else setVista('acceso');
  };

  return (
    <div style={S.wrap}>
      <div style={{ ...S.box, maxWidth: 340 }}>
        <div style={S.panel}>
          <button style={S.back} onClick={backHandler}>← Atrás</button>

          {vista === 'denegado' ? (
            <>
              <div style={S.h3}>Acceso no autorizado</div>
              <div style={S.err}>Este correo no está autorizado para el panel de nutrición.</div>
              <p style={S.p}>Si crees que es un error, contacta al administrador. Si eres paciente, regresa y entra por "Paciente".</p>
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
                  <p style={S.p}>Ingresa tu correo y contraseña.</p>
                  {error && <div style={S.err}>{error}</div>}
                  <label style={S.lbl}>Correo electrónico</label>
                  <input style={S.inp} type="email" value={email} onChange={e => { setEmail(e.target.value); setOfrecerCrear(false); }} placeholder="correo@ejemplo.com" />
                  <label style={S.lbl}>Contraseña</label>
                  <input style={S.inp} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                    onKeyDown={e => { if (e.key === 'Enter') entrarConCorreo(); }} />
                  <button style={{ ...S.btn, ...S.btnDark }} onClick={entrarConCorreo} disabled={loading}>
                    {loading ? 'Entrando…' : 'Entrar'}
                  </button>
                  {ofrecerCrear && (
                    <button style={{ ...S.btn, ...S.btnGold }} onClick={irACrear} disabled={loading}>
                      Crear cuenta con este correo
                    </button>
                  )}
                </>
              )}

              {vista === 'crear' && (
                <>
                  <p style={S.p}>Crea tu cuenta para <b>{email.trim().toLowerCase()}</b>.</p>
                  {error && <div style={S.err}>{error}</div>}
                  <label style={S.lbl}>Tu nombre</label>
                  <input style={S.inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido" />
                  <label style={S.lbl}>Contraseña</label>
                  <input style={S.inp} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  <label style={S.lbl}>Confirmar contraseña</label>
                  <input style={S.inp} type="password" value={pass2} onChange={e => setPass2(e.target.value)} placeholder="Repite la contraseña"
                    onKeyDown={e => { if (e.key === 'Enter') crearCuenta(); }} />
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
