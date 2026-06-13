import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Topbar';
import PerfilPaciente from '../components/PerfilPaciente';
import Agenda from '../components/Agenda';

export default function PacienteDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('inicio');
  const [citas, setCitas] = useState([]);
  const [expediente, setExpediente] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'citas'), where('pacienteEmail', '==', user.email));
    return onSnapshot(q, snap => setCitas(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.fecha.localeCompare(b.fecha))));
  }, [user]);

  // Vincula el expediente del paciente con su cuenta por el correo de sesión.
  useEffect(() => {
    if (!user?.email) return;
    const q = query(collection(db, 'pacientes'), where('correo', '==', user.email.toLowerCase()));
    return onSnapshot(q,
      snap => setExpediente(snap.docs.length ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null),
      () => setExpediente(null));
  }, [user]);

  const hoyKey = new Date().toISOString().slice(0, 10);
  const proxima = citas.find(c => c.fecha >= hoyKey && c.estado !== 'cancelada');
  const nombre = user?.displayName?.split(' ')[0] || 'bienvenida';

  const cancelarCita = async (c) => {
    if (c.estado === 'cancelada') return;
    const ok = window.confirm(
      '¿Cancelar tu cita del ' + c.fecha + ' a las ' + c.hora + '?\n' +
      'Recuerda las políticas de cancelación. Si necesitas reagendar, podrás hacerlo desde la app.'
    );
    if (!ok) return;
    try {
      await updateDoc(doc(db, 'citas', c.id), { estado: 'cancelada' });
      const url = process.env.REACT_APP_APPSCRIPT_URL;
      if (url) {
        try {
          await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'cancelarCita',
              eventId: c.eventId || '',
              correo: (c.pacienteEmail || user.email || '').toLowerCase(),
              paciente: c.pacienteNombre || nombre,
              fecha: c.fecha,
              hora: c.hora,
              tipoNombre: c.tipoNombre || c.motivo || '',
              online: !!c.online,
              canceladoPor: 'paciente',
            }), redirect: 'follow',
          });
        } catch (e) { /* secundario: ya quedó cancelada */ }
      }
    } catch (e) { alert('No se pudo cancelar: ' + e.message); }
  };

  const fmtFecha = (key) => {
    if (!key) return '';
    const [y, m, d] = key.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase());
  };

  const planes = expediente && Array.isArray(expediente.planes) ? [...expediente.planes].reverse() : [];

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg> },
    { id: 'agendar', label: 'Agendar', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg> },
    { id: 'planes', label: 'Mi plan', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg> },
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
                  <div style={{ fontSize: '12px', color: 'var(--stone)', marginBottom: '1rem' }}>
                    Tu proxima cita es el <strong style={{ color: 'var(--dark)' }}>{fmtFecha(proxima.fecha)}</strong> a las <strong style={{ color: 'var(--dark)' }}>{proxima.hora}</strong>
                  </div>
                  <div className="cita-item" style={{ paddingTop: 0 }}>
                    <div className="cita-hora">{proxima.hora}</div>
                    <div style={{ flex: 1 }}>
                      <div className="cita-nombre">{proxima.motivo}</div>
                      <div className="cita-motivo">{fmtFecha(proxima.fecha)}</div>
                    </div>
                    <span className={`badge b-${proxima.estado === 'confirmada' ? 'confirm' : proxima.estado === 'cancelada' ? 'cancel' : 'pending'}`}>{proxima.estado}</span>
                    {proxima.estado !== 'cancelada' && (
                      <button onClick={() => cancelarCita(proxima)} title="Cancelar cita"
                        style={{ marginLeft: 8, padding: '5px 10px', background: 'transparent', border: '1px solid #B0593F', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#B0593F', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-state">No tienes citas proximas</div>
              )}
            </div>
            <button className="btn-primary" onClick={() => setTab('agendar')}>
              + Agendar nueva cita
            </button>
            {citas.length > 0 && (
              <div className="card" style={{ marginTop: '0.875rem' }}>
                <div className="card-title">Mis citas</div>
                {citas.slice(0, 5).map(c => (
                  <div className="cita-item" key={c.id}>
                    <div className="cita-hora">{c.hora}</div>
                    <div style={{ flex: 1 }}>
                      <div className="cita-nombre">{c.motivo}</div>
                      <div className="cita-motivo">{fmtFecha(c.fecha)}</div>
                    </div>
                    <span className={`badge b-${c.estado === 'confirmada' ? 'confirm' : c.estado === 'cancelada' ? 'cancel' : 'pending'}`}>{c.estado}</span>
                    {c.estado !== 'cancelada' && c.fecha >= hoyKey && (
                      <button onClick={() => cancelarCita(c)} title="Cancelar cita"
                        style={{ marginLeft: 8, padding: '5px 10px', background: 'transparent', border: '1px solid #B0593F', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#B0593F', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'agendar' && (
          <Agenda isNutri={false} />
        )}

        {tab === 'planes' && (
          <div className="card">
            <div className="card-title">Mi plan alimenticio</div>

            {expediente && expediente.plan && expediente.plan.totales && (
              <div style={{ background: 'var(--cream)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>Tu plan</div>
                <div style={{ fontSize: '15px', color: 'var(--dark)', fontWeight: 700, marginTop: '2px' }}>
                  {expediente.plan.totales.kcal} kcal al día
                </div>
                <div style={{ fontSize: '12px', color: 'var(--stone)', marginTop: '2px' }}>
                  HC {expediente.plan.totales.hc} g · Proteína {expediente.plan.totales.prot} g · Grasa {expediente.plan.totales.lip} g
                </div>
              </div>
            )}

            {!expediente ? (
              <div className="empty-state">
                <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>🥗</div>
                Aún no hay un plan vinculado a esta cuenta.<br />
                Pídele a tu nutrióloga que registre tu correo: <strong>{user.email}</strong>
              </div>
            ) : planes.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>🥗</div>
                Tu plan estará disponible aquí en cuanto tu nutrióloga lo genere.
              </div>
            ) : (
              planes.map((p, i) => (
                <div className="cita-item" key={i}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--dark)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>PDF</div>
                  <div style={{ flex: 1, marginLeft: '12px' }}>
                    <div className="cita-nombre">{p.nombre || 'Plan nutricional'}</div>
                    <div className="cita-motivo">{p.fecha ? fmtFecha(p.fecha) : ''}</div>
                  </div>
                  {p.link
                    ? <a href={p.link} target="_blank" rel="noreferrer" style={{ background: 'var(--gold)', color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>Abrir</a>
                    : <span style={{ fontSize: '11px', color: 'var(--stone)' }}>Sin archivo</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <nav className="bottomnav">
        {tabs.map(t => (
          <button key={t.id} className={`nav-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
