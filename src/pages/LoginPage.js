import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase/config';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const [showNutri, setShowNutri] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loginGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError('Error Google: ' + e.code);
    }
    setLoading(false);
  };

  const loginEmail = async () => {
    if (!email || !password) { setError('Escribe correo y contrasena'); return; }
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError('Error: ' + e.code);
    }
    setLoading(false);
  };

  if (showNutri) {
    return (
      <div style={{background:'var(--cream)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
        <div style={{width:'100%',maxWidth:'340px'}}>
          <button onClick={() => setShowNutri(false)} style={{fontSize:'11px',color:'var(--stone)',cursor:'pointer',marginBottom:'2rem',background:'none',border:'none',fontFamily:'var(--font)'}}>
            Regresar
          </button>
          <div style={{fontFamily:'var(--font-display)',fontSize:'28px',fontWeight:'400',color:'var(--dark)',marginBottom:'1.5rem'}}>Portal nutriologa</div>
          {error && <div style={{background:'#fef0f0',color:'#c0392b',padding:'10px',borderRadius:'8px',fontSize:'11px',marginBottom:'1rem',wordBreak:'break-word'}}>{error}</div>}
          <div className="fg">
            <label>Correo</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nutnfitness360@gmail.com" />
          </div>
          <div className="fg">
            <label>Contrasena</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="..." />
          </div>
          <button onClick={loginEmail} disabled={loading} style={{width:'100%',padding:'0.875rem',background:'var(--dark)',border:'none',borderRadius:'12px',fontFamily:'var(--font)',fontSize:'13px',fontWeight:'600',color:'var(--cream)',cursor:'pointer',marginTop:'0.5rem'}}>
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
          <button onClick={loginGoogle} disabled={loading} style={{width:'100%',padding:'0.75rem',background:'transparent',border:'1px solid var(--border)',borderRadius:'12px',fontFamily:'var(--font)',fontSize:'12px',color:'var(--stone)',cursor:'pointer',marginTop:'0.625rem'}}>
            Continuar con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:'var(--dark)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
      <div style={{width:'100%',maxWidth:'340px',textAlign:'center'}}>
                <img src="/logo.png" alt="N Fitness 360" style={{height:'48px',width:'auto',objectFit:'contain',marginBottom:'1.5rem'}} />
        <div style={{fontSize:'16px',color:'var(--cream)',marginBottom:'2rem'}}>Hola!</div>
        {error && <div style={{background:'#3a1a1a',color:'#f09595',padding:'10px',borderRadius:'8px',fontSize:'11px',marginBottom:'1rem',wordBreak:'break-word'}}>{error}</div>}
        <button onClick={loginGoogle} disabled={loading} style={{width:'100%',padding:'0.875rem',background:'transparent',border:'1px solid #444',borderRadius:'12px',fontFamily:'var(--font)',fontSize:'13px',color:'var(--cream)',cursor:'pointer',marginBottom:'0.625rem'}}>
          Continuar con Google
        </button>
        <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'1rem 0'}}>
          <div style={{flex:1,height:'0.5px',background:'#333'}}></div>
          <span style={{fontSize:'10px',color:'#444'}}>o</span>
          <div style={{flex:1,height:'0.5px',background:'#333'}}></div>
        </div>
        <button style={{width:'100%',padding:'0.875rem',background:'var(--gold)',border:'none',borderRadius:'12px',fontFamily:'var(--font)',fontSize:'13px',fontWeight:'600',color:'var(--dark)',cursor:'pointer'}} onClick={() => setShowNutri(false)}>
          Continuar con correo
        </button>
        <div style={{marginTop:'2rem',fontSize:'10px',color:'#444'}}>
          Eres nutriologa? <span onClick={() => setShowNutri(true)} style={{color:'var(--stone)',borderBottom:'0.5px solid #444',cursor:'pointer'}}>Acceso profesional</span>
        </div>
      </div>
    </div>
  );
}
