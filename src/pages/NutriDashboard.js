import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Agenda from '../components/Agenda';
import Topbar from '../components/Topbar';

function initials(name) { return name ? name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'NU'; }

export default function NutriDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('inicio');
  const [citas, setCitas] = useState([]);

  const hoy = new Date();
  const hoyKey = hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-'+String(hoy.getDate()).padStart(2,'0');

  useEffect(() => {
    const q = query(collection(db, 'citas'), orderBy('fecha','asc'));
    return onSnapshot(q, snap => setCitas(snap.docs.map(d => ({id:d.id,...d.data()}))));
  }, []);

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'citas', id), { estado: nuevoEstado });
    } catch(e) { alert('Error: ' + e.message); }
  };

  const citasHoy = citas.filter(c => c.fecha === hoyKey).sort((a,b)=>a.hora.localeCompare(b.hora));
  const pendientes = citas.filter(c => c.estado === 'pendiente').length;
  const pacientesUnicos = [...new Set(citas.map(c => c.pacienteNombre))].filter(Boolean);

  const CitaItem = ({ c, mostrarBotones }) => (
    <div style={{borderBottom:'0.5px solid var(--border)',paddingBottom:'0.75rem',marginBottom:'0.75rem'}}>
      <div className="cita-item" style={{paddingBottom:0,marginBottom:0,borderBottom:'none'}}>
        <div className="cita-hora">{c.hora}</div>
        <div style={{flex:1}}>
          <div className="cita-nombre">{c.pacienteNombre}</div>
          <div className="cita-motivo">{c.motivo} · {c.fecha}</div>
        </div>
        <span className={`badge b-${c.estado==='confirmada'?'confirm':c.estado==='cancelada'?'cancel':'pending'}`}>{c.estado}</span>
      </div>
      {mostrarBotones && c.estado === 'pendiente' && (
        <div style={{display:'flex',gap:'8px',marginTop:'8px',marginLeft:'56px'}}>
          <button onClick={() => cambiarEstado(c.id, 'confirmada')}
            style={{padding:'5px 14px',background:'var(--sage)',border:'none',borderRadius:'8px',fontSize:'11px',fontWeight:'600',color:'#fff',cursor:'pointer',fontFamily:'var(--font)'}}>
            Confirmar
          </button>
          <button onClick={() => cambiarEstado(c.id, 'cancelada')}
            style={{padding:'5px 14px',background:'transparent',border:'1px solid #e0a0a0',borderRadius:'8px',fontSize:'11px',fontWeight:'600',color:'#c0392b',cursor:'pointer',fontFamily:'var(--font)'}}>
            Cancelar
          </button>
        </div>
      )}
      {mostrarBotones && c.estado === 'confirmada' && (
        <div style={{marginTop:'6px',marginLeft:'56px'}}>
          <button onClick={() => cambiarEstado(c.id, 'cancelada')}
            style={{padding:'5px 14px',background:'transparent',border:'1px solid #e0a0a0',borderRadius:'8px',fontSize:'11px',fontWeight:'600',color:'#c0392b',cursor:'pointer',fontFamily:'var(--font)'}}>
            Cancelar cita
          </button>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id:'inicio', label:'Inicio', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg> },
    { id:'agenda', label:'Agenda', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg> },
    { id:'pendientes', label:'Pendientes', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg> },
    { id:'pacientes', label:'Pacientes', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg> },
  ];

  return (
    <div className="app">
      <Topbar role="nutriologa" user={user} onPerfil={() => setTab('perfil')} />

      <div className="content">
        {tab === 'inicio' && (
          <>
            <div className="stats">
              <div className="stat"><div className="stat-num">{pacientesUnicos.length}</div><div className="stat-lbl">Pacientes</div></div>
              <div className="stat"><div className="stat-num">{citasHoy.length}</div><div className="stat-lbl">Citas hoy</div></div>
              <div className="stat"><div className="stat-num" style={{color: pendientes > 0 ? '#c0392b' : 'var(--dark)'}}>{pendientes}</div><div className="stat-lbl">Por confirmar</div></div>
              <div className="stat"><div className="stat-num">{citas.length}</div><div className="stat-lbl">Total citas</div></div>
            </div>
            <div className="card">
              <div className="card-title">Citas de hoy</div>
              {citasHoy.length === 0
                ? <div className="empty-state">Sin citas programadas para hoy</div>
                : citasHoy.map(c => <CitaItem key={c.id} c={c} mostrarBotones={true} />)
              }
            </div>
          </>
        )}
        {tab === 'agenda' && <Agenda isNutri={true} />}
        {tab === 'pendientes' && (
          <div className="card">
            <div className="card-title">
              Citas por confirmar
              {pendientes > 0 && <span style={{marginLeft:'8px',background:'#fef0f0',color:'#c0392b',fontSize:'10px',padding:'2px 8px',borderRadius:'20px',fontWeight:'700'}}>{pendientes}</span>}
            </div>
            {citas.filter(c => c.estado === 'pendiente').length === 0
              ? <div className="empty-state">No hay citas pendientes</div>
              : citas.filter(c => c.estado === 'pendiente').map(c => <CitaItem key={c.id} c={c} mostrarBotones={true} />)
            }
          </div>
        )}
        {tab === 'pacientes' && (
          <div className="card">
            <div className="card-title">Mis pacientes</div>
            {pacientesUnicos.length === 0
              ? <div className="empty-state">No hay pacientes registrados aun</div>
              : pacientesUnicos.map(nombre => {
                  const citasPac = citas.filter(c => c.pacienteNombre === nombre);
                  return (
                    <div className="pac-item" key={nombre}>
                      <div className="pac-avatar">{initials(nombre)}</div>
                      <div style={{flex:1}}>
                        <div className="pac-nombre">{nombre}</div>
                        <div className="pac-detalle">Paciente activo</div>
                      </div>
                      <div className="pac-citas">{citasPac.length} cita{citasPac.length !== 1 ? 's' : ''}</div>
                    </div>
                  );
                })
            }
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
