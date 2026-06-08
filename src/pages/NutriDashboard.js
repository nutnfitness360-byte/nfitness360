import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, where, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Agenda from '../components/Agenda';

function initials(name) { return name ? name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'NU'; }

export default function NutriDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('inicio');
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);

  const hoy = new Date();
  const hoyKey = hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-'+String(hoy.getDate()).padStart(2,'0');

  useEffect(() => {
    const q = query(collection(db, 'citas'), orderBy('fecha','asc'));
    return onSnapshot(q, snap => setCitas(snap.docs.map(d => ({id:d.id,...d.data()}))));
  }, []);

  const citasHoy = citas.filter(c => c.fecha === hoyKey).sort((a,b)=>a.hora.localeCompare(b.hora));
  const pendientes = citas.filter(c => c.estado === 'pendiente').length;
  const pacientesUnicos = [...new Set(citas.map(c => c.pacienteNombre))].filter(Boolean);

  const tabs = [
    { id:'inicio', label:'Inicio', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg> },
    { id:'agenda', label:'Agenda', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg> },
    { id:'pacientes', label:'Pacientes', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg> },
    { id:'planes', label:'Planes', icon:<svg viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg> },
  ];

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <div className="topbar-logo">N Fitness 360®</div>
          <div className="topbar-role">Panel nutrióloga</div>
        </div>
        <div className="avatar" onClick={() => signOut(auth)}>{initials(user?.displayName)}</div>
      </div>

      <div className="content">
        {tab === 'inicio' && (
          <>
            <div className="stats">
              <div className="stat"><div className="stat-num">{pacientesUnicos.length}</div><div className="stat-lbl">Pacientes</div></div>
              <div className="stat"><div className="stat-num">{citasHoy.length}</div><div className="stat-lbl">Citas hoy</div></div>
              <div className="stat"><div className="stat-num">{pendientes}</div><div className="stat-lbl">Por confirmar</div></div>
              <div className="stat"><div className="stat-num">{citas.length}</div><div className="stat-lbl">Total citas</div></div>
            </div>
            <div className="card">
              <div className="card-title">Citas de hoy</div>
              {citasHoy.length === 0
                ? <div className="empty-state">Sin citas programadas para hoy</div>
                : citasHoy.map(c => (
                  <div className="cita-item" key={c.id}>
                    <div className="cita-hora">{c.hora}</div>
                    <div style={{flex:1}}>
                      <div className="cita-nombre">{c.pacienteNombre}</div>
                      <div className="cita-motivo">{c.motivo}</div>
                    </div>
                    <span className={`badge b-${c.estado==='confirmada'?'confirm':c.estado==='cancelada'?'cancel':'pending'}`}>{c.estado}</span>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {tab === 'agenda' && <Agenda isNutri={true} />}

        {tab === 'pacientes' && (
          <div className="card">
            <div className="card-title">Mis pacientes</div>
            {pacientesUnicos.length === 0
              ? <div className="empty-state">No hay pacientes registrados aún</div>
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

        {tab === 'planes' && (
          <div className="card">
            <div className="card-title">Planes alimenticios</div>
            <div className="upload-zone">
              <div style={{fontSize:'28px',marginBottom:'0.5rem'}}>📁</div>
              <div style={{fontSize:'13px',fontWeight:'600',color:'var(--dark)',marginBottom:'4px'}}>Subir nuevo plan</div>
              <div style={{fontSize:'11px'}}>PDF · próximamente disponible</div>
            </div>
            <div style={{marginTop:'1rem',fontSize:'12px',color:'var(--stone)',textAlign:'center'}}>
              La integración de archivos estará disponible en la siguiente versión
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
