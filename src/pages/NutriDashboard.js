import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Agenda from '../components/Agenda';
import Topbar from '../components/Topbar';
import Pacientes from '../components/Pacientes';

function initials(name) { return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'NU'; }
const SERVICIOS_NOMBRES = ['Primera vez', 'Seguimiento', 'Deportivo', 'Seguimiento deportivo', 'Online', 'Deportivo online'];
const norm = (s) => (s || '').trim().toLowerCase();
const money = (n) => '$' + Math.round(n || 0).toLocaleString('es-MX');
const uid = () => Math.random().toString(36).slice(2, 9);

function primerNombre(full) {
  if (!full) return '';
  const limpio = full.replace(/^(lic\.?|nut\.?|dra?\.?|mtra?\.?)\s+/i, '').trim();
  const tokens = limpio.split(/\s+/).filter(Boolean);
  const real = tokens.find(t => t.replace(/\./g, '').length > 1);
  return real || tokens[0] || full;
}
function diasDesde(fechaStr, hoy) {
  if (!fechaStr) return null;
  const d = new Date(fechaStr + 'T00:00:00');
  if (isNaN(d)) return null;
  return Math.floor((hoy.getTime() - d.getTime()) / 86400000);
}

export default function NutriDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('inicio');
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [cfg, setCfg] = useState({ pendientes: [], precios: {} });
  const [nuevoPend, setNuevoPend] = useState('');
  const [editaPrecios, setEditaPrecios] = useState(false);

  const hoy = new Date();
  const hoyKey = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
  const mesKey = hoyKey.slice(0, 7);

  useEffect(() => {
    const q = query(collection(db, 'citas'), orderBy('fecha', 'asc'));
    return onSnapshot(q, snap => setCitas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'pacientes'), snap => setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'dashboard'), snap => {
      const d = snap.exists() ? snap.data() : {};
      setCfg({ pendientes: Array.isArray(d.pendientes) ? d.pendientes : [], precios: d.precios || {} });
    });
  }, []);

  const guardarCfg = async (patch) => {
    const next = { pendientes: cfg.pendientes, precios: cfg.precios, ...patch };
    setCfg(next);
    try { await setDoc(doc(db, 'config', 'dashboard'), next, { merge: true }); } catch (e) { /* no bloquear UI */ }
  };

  // ---- Citas ----
  const citasHoy = citas.filter(c => c.fecha === hoyKey && c.estado !== 'cancelada').sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  const proximas = citas.filter(c => c.fecha >= hoyKey && c.estado !== 'cancelada').length;

  // ---- Pendientes (checklist) ----
  const addPendiente = () => {
    const t = nuevoPend.trim();
    if (!t) return;
    guardarCfg({ pendientes: [...cfg.pendientes, { id: uid(), texto: t, hecho: false }] });
    setNuevoPend('');
  };
  const togglePend = (id) => guardarCfg({ pendientes: cfg.pendientes.map(p => p.id === id ? { ...p, hecho: !p.hecho } : p) });
  const delPend = (id) => guardarCfg({ pendientes: cfg.pendientes.filter(p => p.id !== id) });

  // ---- Financiero (mes actual) ----
  const citasMes = citas.filter(c => (c.fecha || '').slice(0, 7) === mesKey && c.estado !== 'cancelada');
  const conteoTipo = {};
  citasMes.forEach(c => { const t = c.tipoNombre || c.motivo || 'Otro'; conteoTipo[t] = (conteoTipo[t] || 0) + 1; });
  const precios = cfg.precios || {};
  const porServicio = Object.keys(conteoTipo).map(t => ({ tipo: t, n: conteoTipo[t], ingreso: conteoTipo[t] * (precios[t] || 0) }))
    .sort((a, b) => b.ingreso - a.ingreso);
  const ingresoMes = porServicio.reduce((a, s) => a + s.ingreso, 0);
  const masVende = Object.keys(conteoTipo).sort((a, b) => conteoTipo[b] - conteoTipo[a])[0];
  const hayPrecios = SERVICIOS_NOMBRES.some(s => (precios[s] || 0) > 0);

  // ---- Retención (semáforo por fecha del último PLAN generado) ----
  // El reloj de "regreso a consulta" arranca el día en que se generó el plan completo
  // (entrada más reciente en p.planes): ese día se le envió la información al paciente.
  const retencion = pacientes.map(p => {
    const planes = Array.isArray(p.planes) ? p.planes : [];
    let ult = null;
    planes.forEach(pl => { if (pl && pl.fecha && (!ult || pl.fecha > ult)) ult = pl.fecha; });
    const d = diasDesde(ult, hoy);
    let color;
    if (d === null) color = 'sinplan';        // aún no tiene plan completo: no cuenta como inactivo
    else if (d <= 30) color = 'verde';
    else if (d <= 45) color = 'amarillo';
    else color = 'rojo';
    return { nombre: p.nombre || '—', ult, dias: d, color };
  }).sort((a, b) => (a.dias === null ? 99999 : a.dias) - (b.dias === null ? 99999 : b.dias));
  const cuenta = { verde: 0, amarillo: 0, rojo: 0, sinplan: 0 };
  retencion.forEach(r => { cuenta[r.color]++; });
  const conPlan = cuenta.verde + cuenta.amarillo + cuenta.rojo;
  const pctRetencion = conPlan ? Math.round(cuenta.verde * 100 / conPlan) : 0;

  // ---- Pacientes por objetivo ----
  const porObjetivo = {};
  pacientes.forEach(p => { const o = (p.objetivo || '').trim() || 'Sin objetivo'; porObjetivo[o] = (porObjetivo[o] || 0) + 1; });
  const objetivos = Object.keys(porObjetivo).map(o => ({ obj: o, n: porObjetivo[o] })).sort((a, b) => b.n - a.n);
  const maxObj = objetivos.reduce((m, o) => Math.max(m, o.n), 0) || 1;

  const COLOR = { verde: '#9AB9AD', amarillo: '#CDA788', rojo: '#B0593F', sinplan: '#C9BFB4' };

  const CitaItem = ({ c }) => (
    <div style={{ borderBottom: '0.5px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
      <div className="cita-item" style={{ paddingBottom: 0, marginBottom: 0, borderBottom: 'none' }}>
        <div className="cita-hora">{c.hora}</div>
        <div style={{ flex: 1 }}>
          <div className="cita-nombre">{c.pacienteNombre}</div>
          <div className="cita-motivo">{(c.tipoNombre || c.motivo)}{c.objetivo ? ' · ' + c.objetivo : ''}</div>
        </div>
        <span className={`badge b-${c.estado === 'confirmada' ? 'confirm' : c.estado === 'cancelada' ? 'cancel' : 'pending'}`}>{c.estado}</span>
      </div>
    </div>
  );

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
    { id: 'agenda', label: 'Agenda', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> },
    { id: 'pacientes', label: 'Pacientes', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
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
        <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
        <span>Mi perfil</span>
      </button>
    </nav>
  );

  return (
    <div className="app">
      <Topbar role="nutriologa" user={user} onPerfil={() => setTab('perfil')} />

      <div className="content">
        {tab === 'inicio' && (
          <>
            <h1 style={D.saludo}>¡Hola, {primerNombre(user?.displayName) || 'Natalia'}!</h1>

            <div className="stats">
              <div className="stat"><div className="stat-num">{totalPac}</div><div className="stat-lbl">Pacientes</div></div>
              <div className="stat"><div className="stat-num">{citasHoy.length}</div><div className="stat-lbl">Citas hoy</div></div>
              <div className="stat"><div className="stat-num">{proximas}</div><div className="stat-lbl">Próximas</div></div>
              <div className="stat"><div className="stat-num">{citas.filter(c => c.estado !== 'cancelada').length}</div><div className="stat-lbl">Total citas</div></div>
            </div>

            <div style={D.grid2}>
              {/* Citas de hoy */}
              <div className="card">
                <div className="card-title">Citas de hoy</div>
                {citasHoy.length === 0
                  ? <div className="empty-state">Sin citas programadas para hoy</div>
                  : citasHoy.map(c => <CitaItem key={c.id} c={c} />)}
              </div>

              {/* Pendientes */}
              <div className="card">
                <div className="card-title">Pendientes</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input style={D.pendInput} value={nuevoPend} onChange={e => setNuevoPend(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addPendiente(); }} placeholder="Escribe una tarea y Enter…" />
                  <button style={D.addBtn} onClick={addPendiente}>+</button>
                </div>
                {cfg.pendientes.length === 0
                  ? <div className="empty-state">Sin pendientes. ¡Todo al día!</div>
                  : cfg.pendientes.map(p => (
                    <div key={p.id} style={D.pendRow}>
                      <button onClick={() => togglePend(p.id)} style={{ ...D.check, ...(p.hecho ? D.checkOn : {}) }}>{p.hecho ? '✓' : ''}</button>
                      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--dark)', textDecoration: p.hecho ? 'line-through' : 'none', opacity: p.hecho ? 0.5 : 1 }}>{p.texto}</span>
                      <button onClick={() => delPend(p.id)} style={D.pendDel} title="Eliminar">×</button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Resumen financiero */}
            <div className="card">
              <div style={D.cardHeadRow}>
                <div className="card-title" style={{ marginBottom: 0 }}>Resumen financiero · {mesKey}</div>
                <button style={D.linkBtn} onClick={() => setEditaPrecios(v => !v)}>{editaPrecios ? 'Cerrar' : 'Editar precios'}</button>
              </div>

              {editaPrecios && (
                <div style={D.preciosBox}>
                  <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 8 }}>Precio por tipo de consulta (MXN). El ingreso se calcula como citas × precio.</div>
                  {SERVICIOS_NOMBRES.map(s => (
                    <div key={s} style={D.precioRow}>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--dark)' }}>{s}</span>
                      <span style={{ color: 'var(--stone)', fontSize: 13 }}>$</span>
                      <input style={D.precioInput} inputMode="numeric" value={precios[s] || ''}
                        onChange={e => guardarCfg({ precios: { ...precios, [s]: parseFloat(e.target.value) || 0 } })} placeholder="0" />
                    </div>
                  ))}
                </div>
              )}

              {!hayPrecios && !editaPrecios ? (
                <div className="empty-state">Define el precio de cada consulta (botón “Editar precios”) para ver tus ingresos.</div>
              ) : (
                <>
                  <div style={D.finTop}>
                    <div style={D.finBig}>
                      <div style={D.finBigNum}>{money(ingresoMes)}</div>
                      <div style={D.finBigLbl}>Ingresos del mes</div>
                    </div>
                    <div style={D.finBig}>
                      <div style={D.finBigNum}>{masVende || '—'}</div>
                      <div style={D.finBigLbl}>Consulta que más vende{masVende ? ` (${conteoTipo[masVende]})` : ''}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {porServicio.length === 0
                      ? <div className="empty-state">Sin consultas este mes.</div>
                      : porServicio.map(s => (
                        <div key={s.tipo} style={D.svcRow}>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--dark)' }}>{s.tipo}</span>
                          <span style={{ fontSize: 12, color: 'var(--stone)', width: 70, textAlign: 'right' }}>{s.n} citas</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', width: 90, textAlign: 'right', fontFamily: 'Montserrat, sans-serif' }}>{money(s.ingreso)}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>

            <div style={D.grid2}>
              {/* Retención */}
              <div className="card">
                <div className="card-title">Retención de pacientes</div>
                <div style={D.semaforo}>
                  <div style={D.semItem}><span style={{ ...D.dot, background: COLOR.verde }} /> {cuenta.verde} activos</div>
                  <div style={D.semItem}><span style={{ ...D.dot, background: COLOR.amarillo }} /> {cuenta.amarillo} +30 días</div>
                  <div style={D.semItem}><span style={{ ...D.dot, background: COLOR.rojo }} /> {cuenta.rojo} +45 días</div>
                  {cuenta.sinplan > 0 && <div style={D.semItem}><span style={{ ...D.dot, background: COLOR.sinplan }} /> {cuenta.sinplan} sin plan</div>}
                </div>
                <div style={D.retPct}><b style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 26, fontWeight: 800 }}>{pctRetencion}%</b> de retención <span style={{ color: 'var(--stone)' }}>(de pacientes con plan)</span></div>
                <div style={{ marginTop: 10, maxHeight: 220, overflowY: 'auto' }}>
                  {retencion.length === 0
                    ? <div className="empty-state">Aún no hay pacientes registrados.</div>
                    : retencion.map((r, i) => (
                      <div key={i} style={D.retRow}>
                        <span style={{ ...D.dot, background: COLOR[r.color] }} />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--dark)' }}>{r.nombre}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--stone)' }}>{r.dias === null ? 'Sin plan aún' : r.dias <= 0 ? 'Plan de hoy' : `Hace ${r.dias} días`}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Pacientes por objetivo */}
              <div className="card">
                <div className="card-title">Pacientes por objetivo</div>
                {objetivos.length === 0
                  ? <div className="empty-state">Aún no hay pacientes registrados.</div>
                  : objetivos.map((o, i) => (
                    <div key={i} style={{ marginBottom: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--dark)', marginBottom: 4 }}>
                        <span>{o.obj}</span><span style={{ fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>{o.n}</span>
                      </div>
                      <div style={D.barTrack}><div style={{ ...D.barFill, width: (o.n / maxObj * 100) + '%' }} /></div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
        {tab === 'agenda' && <Agenda isNutri={true} />}
        {tab === 'pacientes' && <Pacientes />}
        {tab === 'perfil' && (
          <div className="card">
            <div className="card-title">Mi perfil</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div className="pac-avatar">{initials(user?.displayName || 'Natalia Flores')}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)' }}>{user?.displayName || 'Lic. N. Natalia Flores'}</div>
                <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 2 }}>{user?.email}</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.6 }}>Panel de la nutrióloga · Nfitness 360. Desde aquí gestionas tu agenda, tus pacientes y sus expedientes.</div>
          </div>
        )}
      </div>

      {navEl}
    </div>
  );
}

const D = {
  saludo: { fontSize: 30, fontWeight: 800, color: 'var(--dark)', margin: '4px 4px 16px', fontFamily: 'Montserrat, sans-serif', letterSpacing: 0.2 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 14 },
  cardHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
  linkBtn: { background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' },
  pendInput: { flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontFamily: 'Montserrat, sans-serif', background: '#fff', color: 'var(--dark)' },
  addBtn: { width: 38, border: 'none', borderRadius: 9, background: 'var(--gold)', color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer', lineHeight: 1 },
  pendRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '0.5px solid var(--border)' },
  check: { width: 22, height: 22, borderRadius: 6, border: '1.5px solid var(--gold)', background: '#fff', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 800, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  checkOn: { background: 'var(--gold)' },
  pendDel: { background: 'transparent', border: 'none', color: 'var(--stone)', fontSize: 18, cursor: 'pointer', lineHeight: 1, flexShrink: 0 },
  preciosBox: { background: 'var(--cream)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 },
  precioRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' },
  precioInput: { width: 90, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'Montserrat, sans-serif', textAlign: 'right', background: '#fff', color: 'var(--dark)' },
  finTop: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  finBig: { flex: 1, minWidth: 130, background: 'var(--cream)', borderRadius: 12, padding: '14px 16px' },
  finBigNum: { fontSize: 24, fontWeight: 800, color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.15 },
  finBigLbl: { fontSize: 11, color: 'var(--stone)', marginTop: 4, fontWeight: 600 },
  svcRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid var(--border)' },
  semaforo: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 },
  semItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--dark)' },
  dot: { width: 11, height: 11, borderRadius: '50%', flexShrink: 0, display: 'inline-block' },
  retPct: { fontSize: 13, color: 'var(--dark)', display: 'flex', alignItems: 'baseline', gap: 6 },
  retRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: '0.5px solid var(--border)' },
  barTrack: { height: 8, background: 'var(--cream)', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', background: 'var(--gold)', borderRadius: 999 },
};
