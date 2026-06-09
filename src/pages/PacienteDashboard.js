import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Topbar';
import PerfilPaciente from '../components/PerfilPaciente';

const CALENDLY_URL = 'https://calendly.com/nutnfitness360';

export default function PacienteDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('inicio');
  const [citas, setCitas] = useState([]);

  useEffect(() => {
    const q = query(collection(db,'citas'), where('pacienteEmail','==',user.email));
    return onSnapshot(q, snap => setCitas(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.fecha.localeCompare(b.fecha))));
  }, [user]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://assets.calendly.com/assets/external/widget.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try { document.head.removeChild(link); document.body.removeChild(script); } catch(e) {}
    };
  }, []);

  const abrirCalendly = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({
        url: CALENDLY_URL,
        prefill: { name: user.displayName || '', email: user.email || '' }
      });
    } else {
      window.open(CALENDLY_URL, '_blank');
    }
  };

  const hoyKey = new Date().toISOString().slice(0,10);
  const proxima = citas.find(c => c.fecha >= hoyKey && c.estado !== 'cancelada');
  const nombre = user?.displayName?.split(' ')[0] || 'bienvenida';

  const fmtFecha = (key) => {
    const [y,m,d] = key.split('-');
    return new Date(+y,+m-1,+d).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}).replace(/^\w/,c=>c.toUpperCase());
  };

  const tabs = [
    { id:'inicio', label:'Inicio', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg> },
    { id:'agendar', label:'Agendar', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg> },
    { id:'planes', label:'Mi plan', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg> },
  ];

  if (tab === 'perfil') {
    return (
      <div className="app">
        <Topbar role="paciente" user={user} onPerfil={() => setTab('perfil')} />
        <div className="content">
          <PerfilPaciente onBack={() => setTab('inicio')} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Topbar role="paciente" user={user} onPerfil={() => setTab('perfil')} />

      <div className="content">
        {tab === 'inicio' && (
          <>
            <div className="card">
              <div className="card-title">Hola, {nombre}!</div>
              {proxima ? (
                <>
                  <div style={{fontSize:'12px',color:'var(--stone)',marginBottom:'1rem'}}>
                    Tu proxima cita es el <strong style={{color:'var(--dark)'}}>{fmtFecha(proxima.fecha)}</strong> a las <strong style={{color:'var(--dark)'}}>{proxima.hora}</strong>
                  </div>
                  <div className="cita-item" style={{paddingTop:0}}>
                    <div className="cita-hora">{proxima.hora}</div>
                    <div style={{flex:1}}>
                      <div className="cita-nombre">{proxima.motivo}</div>
                      <div className="cita-motivo">{fmtFecha(proxima.fecha)}</div>
                    </div>
                    <span className={`badge b-${proxima.estado==='confirmada'?'confirm':proxima.estado==='cancelada'?'cancel':'pending'}`}>{proxima.estado}</span>
                  </div>
                </>
              ) : (
                <div className="empty-state">No tienes citas proximas</div>
              )}
            </div>
            <button className="btn-primary" onClick={abrirCalendly}>
              + Agendar nueva cita
            </button>
            {citas.length > 0 && (
              <div className="card" style={{marginTop:'0.875rem'}}>
                <div className="card-title">Mis citas</div>
                {citas.slice(0,5).map(c => (
                  <div className="cita-item" key={c.id}>
                    <div className="cita-hora">{c.hora}</div>
                    <div style={{flex:1}}>
                      <div className="cita-nombre">{c.motivo}</div>
                      <div className="cita-motivo">{fmtFecha(c.fecha)}</div>
                    </div>
                    <span className={`badge b-${c.estado==='confirmada'?'confirm':c.estado==='cancelada'?'cancel':'pending'}`}>{c.estado}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'agendar' && (
          <div className="card">
            <div className="card-title">Agendar cita</div>
            <div style={{fontSize:'13px',color:'var(--stone)',marginBottom:'1.5rem',lineHeight:'1.5'}}>
              Selecciona el dia y horario de tu preferencia. Recibiras un correo de confirmacion automaticamente.
            </div>
            <button className="btn-primary" onClick={abrirCalendly}>
              Ver disponibilidad y agendar
            </button>
            <div style={{marginTop:'1rem',fontSize:'11px',color:'var(--stone)',textAlign:'center'}}>
              Los correos de confirmacion se envian automaticamente
            </div>
          </div>
        )}

        {tab === 'planes' && (
          <div className="card">
            <div className="card-title">Mi plan alimenticio</div>
            <div className="empty-state">
              <div style={{fontSize:'32px',marginBottom:'0.5rem'}}>🥗</div>
              Tu nutriologa asignara tu plan aqui cuando este listo
            </div>
          </div>
        )}
      </div>

      <nav className="bottomnav">
        {tabs.map(t => (
          <button key={t.id} className={`nav-item${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
