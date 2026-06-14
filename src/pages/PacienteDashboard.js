import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Topbar';
import PerfilPaciente from '../components/PerfilPaciente';
import Agenda from '../components/Agenda';

/* ===== mini gráfica de línea (SVG, idéntica a la del expediente) ===== */
const MESES_MINI = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const fmtMesP = (f) => { const d = new Date(f + 'T00:00:00'); return isNaN(d) ? f : `${d.getDate()} ${MESES_MINI[d.getMonth()]}`; };
const fmtSello = (ts) => { const d = new Date(ts); return isNaN(d) ? '' : d.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
function Linea({ data, field, color, unit }) {
  const valid = (data || []).filter(d => typeof d[field] === 'number' && !isNaN(d[field]));
  if (valid.length === 0) return <div style={{ fontSize: 12, color: 'var(--stone)', padding: '20px 0', textAlign: 'center' }}>Sin mediciones aún</div>;
  const w = 300, h = 120, pad = 26;
  const vals = valid.map(d => d[field]);
  const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const n = valid.length;
  const X = (i) => n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1);
  const Y = (v) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const pts = valid.map((d, i) => `${X(i)},${Y(d[field])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block', fontFamily: 'Montserrat, sans-serif' }}>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" strokeWidth="1" />
      {valid.length > 1 && <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {valid.map((d, i) => <circle key={i} cx={X(i)} cy={Y(d[field])} r="3.5" fill={color} />)}
      {valid.map((d, i) => (
        <text key={'x' + i} x={X(i)} y={h - pad + 14} fontSize="8.5" fill="var(--stone)" textAnchor="middle">{fmtMesP(d.fecha)}</text>
      ))}
      <text x={pad - 4} y={Y(max) + 3} fontSize="9" fill="var(--stone)" textAnchor="end">{max}{unit}</text>
      {min !== max && <text x={pad - 4} y={Y(min) + 3} fontSize="9" fill="var(--stone)" textAnchor="end">{min}{unit}</text>}
    </svg>
  );
}

const D = {
  section: { fontSize: 18, fontWeight: 700, color: 'var(--dark)', margin: '20px 4px 10px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  gridAcc: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  tile: { background: '#fff', border: '0.5px solid var(--border)', borderRadius: 14, padding: '14px 14px 10px' },
  tileTitle: { fontSize: 15, fontWeight: 700, color: 'var(--dark)' },
  tileValue: { fontSize: 26, fontWeight: 800, color: 'var(--dark)', margin: '0 0 6px', lineHeight: 1.1 },
  tileUnit: { fontSize: 12, fontWeight: 600, color: 'var(--stone)' },
  access: { background: '#fff', border: '0.5px solid var(--border)', borderRadius: 14, padding: '18px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' },
  accessLabel: { fontSize: 15, fontWeight: 700, color: 'var(--dark)' },
  accessSub: { fontSize: 11, color: 'var(--stone)' },
};

const IconAgendar = <svg viewBox="0 0 24 24" width="30" height="30" strokeWidth="1.5" fill="none" stroke="var(--gold)"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
const IconPlan = <svg viewBox="0 0 24 24" width="30" height="30" strokeWidth="1.5" fill="none" stroke="var(--gold)"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const IconRecom = <svg viewBox="0 0 24 24" width="30" height="30" strokeWidth="1.5" fill="none" stroke="var(--gold)"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>;

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
  const medics = expediente && Array.isArray(expediente.mediciones) ? expediente.mediciones : [];
  const ultMed = medics.length ? medics[medics.length - 1] : null;

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg> },
    { id: 'agendar', label: 'Agendar', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg> },
    { id: 'planes', label: 'Mi plan', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg> },
    { id: 'recomendaciones', label: 'Recomendaciones', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg> },
  ];

  const navEl = (
    <nav className="bottomnav">
      {tabs.map(t => (
        <button key={t.id} className={`nav-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
      <div className="nav-spacer" />
      <button className={`nav-item${tab === 'perfil' ? ' active' : ''}`} onClick={() => setTab('perfil')}>
        <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
        <span>Mi perfil</span>
      </button>
    </nav>
  );

  if (tab === 'perfil') {
    return (
      <div className="app">
        <Topbar role="paciente" user={user} onPerfil={() => setTab('perfil')} />
        <div className="content">
          <PerfilPaciente onBack={() => setTab('inicio')} />
        </div>
        {navEl}
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
              <div className="card-title">¡Hola, {nombre}!</div>
              {proxima ? (
                <div className="cita-item" style={{ paddingTop: 0 }}>
                  <div className="cita-hora">{proxima.hora}</div>
                  <div style={{ flex: 1 }}>
                    <div className="cita-nombre">{proxima.tipoNombre || proxima.motivo}</div>
                    <div className="cita-motivo">Tu próxima cita · {fmtFecha(proxima.fecha)}</div>
                  </div>
                  <span className={`badge b-${proxima.estado === 'confirmada' ? 'confirm' : proxima.estado === 'cancelada' ? 'cancel' : 'pending'}`}>{proxima.estado}</span>
                  {proxima.estado !== 'cancelada' && (
                    <button onClick={() => cancelarCita(proxima)} title="Cancelar cita"
                      style={{ marginLeft: 8, padding: '5px 10px', background: 'transparent', border: '1px solid #B0593F', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#B0593F', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>
                      Cancelar
                    </button>
                  )}
                </div>
              ) : (
                <div className="empty-state">No tienes citas próximas</div>
              )}
            </div>

            <h2 style={D.section}>Tu progreso</h2>
            <div style={D.grid}>
              <div style={D.tile}>
                <div style={D.tileTitle}>Peso</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.peso === 'number' ? ultMed.peso : '—'}<span style={D.tileUnit}> kg</span></div>
                <Linea data={medics} field="peso" color="var(--gold)" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>% de grasa</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.grasa === 'number' ? ultMed.grasa : '—'}<span style={D.tileUnit}> %</span></div>
                <Linea data={medics} field="grasa" color="var(--stone)" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>Masa muscular</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.musculo === 'number' ? ultMed.musculo : '—'}<span style={D.tileUnit}> kg</span></div>
                <Linea data={medics} field="musculo" color="var(--sage)" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>Masa grasa</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.grasaKg === 'number' ? ultMed.grasaKg : '—'}<span style={D.tileUnit}> kg</span></div>
                <Linea data={medics} field="grasaKg" color="#B0593F" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>Grasa visceral</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.visceral === 'number' ? ultMed.visceral : '—'}</div>
                <Linea data={medics} field="visceral" color="#36302B" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>Agua corporal total</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.agua === 'number' ? ultMed.agua : '—'}<span style={D.tileUnit}> L</span></div>
                <Linea data={medics} field="agua" color="#5B7C99" unit="" />
              </div>
            </div>

            <h2 style={D.section}>Accesos rápidos</h2>
            <div style={D.gridAcc}>
              <button style={D.access} onClick={() => setTab('agendar')}>
                {IconAgendar}
                <span style={D.accessLabel}>Agendar cita</span>
                <span style={D.accessSub}>Reserva tu próxima consulta</span>
              </button>
              <button style={D.access} onClick={() => setTab('planes')}>
                {IconPlan}
                <span style={D.accessLabel}>Mi plan</span>
                <span style={D.accessSub}>Consulta tu plan nutricional</span>
              </button>
              <button style={D.access} onClick={() => setTab('recomendaciones')}>
                {IconRecom}
                <span style={D.accessLabel}>Recomendaciones</span>
                <span style={D.accessSub}>Consejos para tu proceso</span>
              </button>
            </div>
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

        {tab === 'recomendaciones' && (
          <div className="card">
            <button onClick={() => setTab('inicio')}
              style={{ background: '#fff', border: '0.5px solid var(--border)', color: 'var(--dark)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 14px', borderRadius: 8, marginBottom: 14 }}>
              ← Atrás
            </button>
            <div className="card-title">Recomendaciones</div>
            {(!expediente || !Array.isArray(expediente.recomendaciones) || expediente.recomendaciones.length === 0) ? (
              <div className="empty-state">
                <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>💡</div>
                Aún no tienes recomendaciones. Tu nutrióloga las publicará aquí cuando las tenga listas.
              </div>
            ) : (
              [...expediente.recomendaciones].reverse().map((r, i) => (
                <div key={i} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10, background: 'var(--cream)' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 5 }}>{fmtSello(r.fecha)}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--dark)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{r.texto}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {navEl}
    </div>
  );
}
