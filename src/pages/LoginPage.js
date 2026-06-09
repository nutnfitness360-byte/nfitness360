import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase/config';
import { signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const [showNutri, setShowNutri] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loginGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      setError('Error al iniciar con Google');
    }
    setLoading(false);
  };

  const loginEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(e.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos' :
               e.code === 'auth/email-already-in-use' ? 'Este correo ya está registrado' :
               'Error al iniciar sesión');
    }
    setLoading(false);
  };

  if (showNutri) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '340px' }}>
          <button onClick={() => setShowNutri(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--stone)', cursor: 'pointer', marginBottom: '2rem', background: 'none', border: 'none', fontFamily: 'var(--font)' }}>
            ← Regresar
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(154,185,173,0.2)', border: '1px solid rgba(154,185,173,0.4)', borderRadius: '20px', padding: '4px 12px', fontSize: '10px', fontWeight: '600', color: '#2d6b5e', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>
            ✦ Acceso profesional
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '400', color: 'var(--dark)', marginBottom: '0.25rem' }}>Portal nutrióloga</div>
          <div style={{ fontSize: '11px', color: 'var(--stone)', marginBottom: '1.5rem' }}>Nfitness 360® · Panel de gestión</div>

          {error && <div style={{ background: '#fef0f0', color: '#c0392b', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={loginEmail}>
            <div className="fg"><label>Correo electrónico</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nutnfitness360@gmail.com" required /></div>
            <div className="fg"><label>Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.875rem', background: 'var(--dark)', border: 'none', borderRadius: '12px', fontFamily: 'var(--font)', fontSize: '13px', fontWeight: '600', color: 'var(--cream)', cursor: 'pointer', transition: 'all 0.2s', marginTop: '0.5rem' }}>
              {loading ? 'Ingresando...' : 'Ingresar al panel'}
            </button>
          </form>

          <button onClick={loginGoogle} disabled={loading} style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', fontFamily: 'var(--font)', fontSize: '12px', color: 'var(--stone)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '0.625rem', transition: 'all 0.2s' }}>
            🔵 Continuar con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--dark)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '340px', textAlign: 'center' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: '300', color: 'var(--gold)', lineHeight: '1', letterSpacing: '-2px' }}>N</div>
          <div style={{ fontFamily: 'var(--font)', fontSize: '10px', fontWeight: '600', color: 'var(--stone)', letterSpacing: '8px', textTransform: 'uppercase', marginTop: '6px' }}>Fitness 360®</div>
        </div>

        <div style={{ fontSize: '16px', fontWeight: '300', color: 'var(--cream)', marginBottom: '0.375rem', letterSpacing: '0.5px' }}>¡Hola!</div>
        <div style={{ fontSize: '10px', color: 'var(--stone)', marginBottom: '2rem', letterSpacing: '0.5px' }}>Inicia sesión para gestionar tus citas y planes</div>

        {error && <div style={{ background: '#3a1a1a', color: '#f09595', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '1rem' }}>{error}</div>}

        <button onClick={loginGoogle} disabled={loading} style={{ width: '100%', padding: '0.875rem', background: 'transparent', border: '1px solid #444', borderRadius: '12px', fontFamily: 'var(--font)', fontSize: '13px', fontWeight: '500', color: 'var(--cream)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', marginBottom: '0.625rem' }}
          onMouseEnter={e => { e.target.style.borderColor = 'var(--sage)'; e.target.style.background = 'var(--sage)'; e.target.style.color = 'var(--dark)'; }}
          onMouseLeave={e => { e.target.style.borderColor = '#444'; e.target.style.background = 'transparent'; e.target.style.color = 'var(--cream)'; }}>
          🔵 Continuar con Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '1rem 0' }}>
          <div style={{ flex: 1, height: '0.5px', background: '#333' }}></div>
          <span style={{ fontSize: '10px', color: '#444' }}>o</span>
          <div style={{ flex: 1, height: '0.5px', background: '#333' }}></div>
        </div>

        <button onClick={() => setShowNutri(false)} style={{ width: '100%', padding: '0.875rem', background: 'var(--gold)', border: 'none', borderRadius: '12px', fontFamily: 'var(--font)', fontSize: '13px', fontWeight: '600', color: 'var(--dark)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}
          onClick={() => {}}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--sage)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--gold)'}>
          ✉️ Continuar con correo
        </button>

        {!showNutri && (
          <div style={{ marginTop: '2rem', fontSize: '10px', color: '#444' }}>
            ¿Eres nutrióloga? <span onClick={() => setShowNutri(true)} style={{ color: 'var(--stone)', borderBottom: '0.5px solid #444', paddingBottom: '1px', cursor: 'pointer' }}>Acceso profesional →</span>
          </div>
        )}
      </div>
    </div>
  );
}
