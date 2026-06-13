import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

// Tipos de consulta (definen la duración de la cita)
const SERVICIOS = [
  { id: 'primera',       nombre: 'Primera vez',           dur: 60, online: false },
  { id: 'seguimiento',   nombre: 'Seguimiento',           dur: 30, online: false },
  { id: 'deportivo',     nombre: 'Deportivo',             dur: 60, online: false },
  { id: 'seg_deportivo', nombre: 'Seguimiento deportivo', dur: 30, online: false },
  { id: 'online',        nombre: 'Online',                dur: 40, online: true  },
  { id: 'online_dep',    nombre: 'Deportivo online',      dur: 40, online: true  },
];
const DUR_POR_ID = Object.fromEntries(SERVICIOS.map(s => [s.id, s.dur]));

// Objetivo (independiente del tipo de consulta)
const OBJETIVOS = ['Aumento de masa muscular','Baja de grasa','Recomposición corporal','Salud','Rendimiento deportivo','Otro'];

// ---- Disponibilidad ----
// Bloqueados: domingo (0), martes (2) y jueves (4)
const DOW_BLOQ = new Set([0, 2, 4]);
const APERTURA = 9 * 60;                 // 09:00
const ultimoInicio = (dow) => (dow === 6 ? 13 * 60 : 18 * 60); // Sábado 13:00, L/X/V 18:00

function toKey(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dowDe(key) { const [y,m,d] = key.split('-'); return new Date(+y,+m-1,+d).getDay(); }
function bloqueado(key) { return DOW_BLOQ.has(dowDe(key)); }
function fmtDate(key) {
  const [y,m,d] = key.split('-');
  return new Date(+y,+m-1,+d).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}).replace(/^\w/,c=>c.toUpperCase());
}
function toMin(h) { const [H,M] = h.split(':').map(Number); return H*60+M; }
function fromMin(m) { return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }
function proxDisponible(date) {
  const d = new Date(date);
  for (let i = 0; i < 14; i++) { if (!DOW_BLOQ.has(d.getDay())) return d; d.setDate(d.getDate()+1); }
  return date;
}
// Duración (min) de una cita existente (compatibilidad con citas viejas que solo tienen 'motivo')
function durDeCita(c) {
  if (c.dur) return c.dur;
  if (c.tipo && DUR_POR_ID[c.tipo]) return DUR_POR_ID[c.tipo];
  const legacy = { 'Primera vez':60,'Seguimiento':30,'Deportiva primera vez':60,'Seguimiento deportiva':30,'Online primera vez':40,'Online seguimiento':40 };
  return legacy[c.motivo] || 60;
}

// Genera los horarios candidatos del día: rejilla base de 30 min + puntos de
// continuación (cada 10 min) tras cada cita existente. Marca cuáles caben para
// la duración elegida (sin traslaparse con citas existentes).
function generarSlots(dateKey, durMin, citasDelDia) {
  const dow = dowDe(dateKey);
  if (DOW_BLOQ.has(dow)) return [];
  const fin = ultimoInicio(dow);
  const ocup = citasDelDia.map(c => { const s = toMin(c.hora); return { s, e: s + durDeCita(c) }; });
  const set = new Set();
  for (let t = APERTURA; t <= fin; t += 30) set.add(t);            // rejilla base 30 min
  ocup.forEach(o => { let c = o.e; while (c % 30 !== 0 && c <= fin) { set.add(c); c += 10; } }); // continuación 10 min
  const cand = [...set].filter(t => t >= APERTURA && t <= fin).sort((a,b)=>a-b);
  const choca = (s, d) => ocup.some(o => s < o.e && o.s < s + d);
  return cand.map(t => ({ hora: fromMin(t), disponible: durMin ? !choca(t, durMin) : false }));
}

export default function Agenda({ isNutri }) {
  const { user } = useAuth();
  const hoy = new Date();
  const [view, setView] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() });
  const [selDate, setSelDate] = useState(toKey(proxDisponible(hoy)));
  const [citas, setCitas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos del modal (unificados para nutrióloga y paciente)
  const [mPaciente, setMPaciente] = useState('');
  const [mPacienteEmail, setMPacienteEmail] = useState('');
  const [mTipo, setMTipo] = useState(null);
  const [mObjetivo, setMObjetivo] = useState(OBJETIVOS[0]);
  const [mObjetivoOtro, setMObjetivoOtro] = useState('');
  const [mHora, setMHora] = useState(null);
  const [mNotas, setMNotas] = useState('');

  // Autocompletado de pacientes (solo nutrióloga)
  const [pacientesList, setPacientesList] = useState([]);
  const [showSug, setShowSug] = useState(false);

  useEffect(() => {
    // Se cargan TODAS las citas para calcular la disponibilidad real (slots ocupados).
    // Los datos de otros pacientes nunca se muestran: la lista del día filtra por dueño.
    const q = query(collection(db, 'citas'), orderBy('fecha', 'asc'));
    return onSnapshot(q, snap => setCitas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [isNutri, user]);

  useEffect(() => {
    if (!isNutri) return undefined;
    const qp = query(collection(db, 'pacientes'), orderBy('codigo', 'asc'));
    return onSnapshot(qp, snap => setPacientesList(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
  }, [isNutri]);

  const emailUser = (user.email || '').toLowerCase();
  const esPropia = (c) => isNutri || (c.pacienteEmail || '').toLowerCase() === emailUser;
  // Para los SLOTS se consideran TODAS las citas del día (disponibilidad real)
  const citasDelDia = citas.filter(c => c.fecha === selDate);
  // Para MOSTRAR (lista del día y puntos del calendario) solo las propias del paciente
  const citasDia = citasDelDia.filter(esPropia).slice().sort((a,b) => a.hora.localeCompare(b.hora));
  const citaDates = new Set(citas.filter(esPropia).map(c => c.fecha));

  const servSel = SERVICIOS.find(s => s.id === mTipo) || null;
  const slots = generarSlots(selDate, servSel ? servSel.dur : 0, citasDelDia);

  const abrirModal = () => {
    setMPaciente(''); setMPacienteEmail(''); setMTipo(null);
    setMObjetivo(OBJETIVOS[0]); setMObjetivoOtro(''); setMHora(null); setMNotas('');
    setShowSug(false); setShowModal(true);
  };
  const cerrarModal = () => setShowModal(false);

  const guardar = async () => {
    if (isNutri && !mPaciente.trim()) { alert('Selecciona el paciente.'); return; }
    if (isNutri && !mPacienteEmail) {
      alert('Elige un paciente de la lista (debe tener correo registrado). Si es nuevo, primero debe crear su cuenta / darse de alta.');
      return;
    }
    if (!servSel) { alert('Selecciona el tipo de consulta.'); return; }
    if (bloqueado(selDate)) { alert('Ese día no hay atención. Elige otro día.'); return; }
    if (!mHora) { alert('Selecciona un horario.'); return; }
    const objetivoFinal = mObjetivo === 'Otro' ? (mObjetivoOtro.trim() || 'Otro') : mObjetivo;
    const correo = (isNutri ? mPacienteEmail : user.email || '').toLowerCase();
    const pacienteNombre = isNutri ? mPaciente.trim() : (user.displayName || user.email.split('@')[0]);
    setSaving(true);
    try {
      // 1) Guardar la cita en la base de datos (rápido y prioritario).
      await addDoc(collection(db, 'citas'), {
        fecha: selDate,
        hora: mHora,
        tipo: servSel.id,
        tipoNombre: servSel.nombre,
        dur: servSel.dur,
        online: servSel.online,
        objetivo: objetivoFinal,
        motivo: servSel.nombre, // compatibilidad con vistas previas
        notas: mNotas,
        estado: 'confirmada',
        pacienteEmail: correo,
        pacienteNombre: pacienteNombre,
        creadoEn: Timestamp.now(),
      });
      // 2) Crear el evento en Google Calendar + enviar el correo (vía Apps Script).
      //    Es secundario: si fallara, la cita ya quedó agendada.
      const url = process.env.REACT_APP_APPSCRIPT_URL;
      if (url && correo) {
        try {
          await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'crearCita',
              paciente: pacienteNombre,
              correo: correo,
              fecha: selDate,
              hora: mHora,
              dur: servSel.dur,
              tipoNombre: servSel.nombre,
              online: servSel.online,
              objetivo: objetivoFinal,
              notas: mNotas,
            }), redirect: 'follow',
          });
        } catch (e) { /* el evento/correo es secundario; la cita ya quedó guardada */ }
      }
      cerrarModal();
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const renderCal = () => {
    const first = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m+1, 0).getDate();
    const cells = [];
    for (let i=0; i<first; i++) cells.push(<div key={'e'+i} className="cal-day empty" />);
    for (let d=1; d<=days; d++) {
      const key = view.y+'-'+String(view.m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      const dow = new Date(view.y, view.m, d).getDay();
      const bloq = DOW_BLOQ.has(dow);
      let cls = 'cal-day';
      if (bloq) cls += ' sunday';                       // reutiliza el estilo "deshabilitado"
      if (key === toKey(hoy)) cls += ' today';
      if (key === selDate) cls += ' selected';
      if (citaDates.has(key)) cls += ' has-cita';
      cells.push(<div key={key} className={cls} title={bloq ? 'No disponible' : ''}
        onClick={() => { if (!bloq) setSelDate(key); }}>{d}</div>);
    }
    return cells;
  };

  return (
    <div>
      <div className="card">
        <div className="cal-nav">
          <button onClick={() => setView(v => { let m=v.m-1,y=v.y; if(m<0){m=11;y--;} return {y,m}; })}>&#x2039;</button>
          <span className="month">{MESES[view.m]} {view.y}</span>
          <button onClick={() => setView(v => { let m=v.m+1,y=v.y; if(m>11){m=0;y++;} return {y,m}; })}>&#x203a;</button>
        </div>
        <div className="cal-grid">
          {DIAS.map(d => <div key={d} className="cal-lbl">{d}</div>)}
          {renderCal()}
        </div>
        <div style={{ fontSize: 10, color: 'var(--stone)', marginBottom: 12 }}>
          Martes, jueves y domingo no disponibles.
        </div>

        <div className="section-label">{fmtDate(selDate)}</div>
        {bloqueado(selDate)
          ? <div className="empty-state">Día no disponible para citas.</div>
          : citasDia.length === 0
            ? <div className="empty-state">Sin citas este día</div>
            : citasDia.map(c => (
              <div className="cita-item" key={c.id}>
                <div className="cita-hora">{c.hora}</div>
                <div style={{flex:1}}>
                  <div className="cita-nombre">{c.pacienteNombre}</div>
                  <div className="cita-motivo">{(c.tipoNombre || c.motivo)}{c.objetivo ? ' · ' + c.objetivo : ''}</div>
                </div>
                <span className={`badge b-${c.estado === 'confirmada' ? 'confirm' : c.estado === 'cancelada' ? 'cancel' : 'pending'}`}>{c.estado}</span>
              </div>
            ))
        }
        <button className="btn-primary" onClick={abrirModal} disabled={bloqueado(selDate)}>
          + {isNutri ? 'Nueva cita' : 'Agendar cita'}
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal">
            <div className="modal-title">{isNutri ? 'Nueva cita' : 'Agendar cita'}</div>

            {isNutri && (
              <div className="fg" style={{ position: 'relative' }}>
                <label>Paciente</label>
                <input value={mPaciente} autoComplete="off"
                  onChange={e => { setMPaciente(e.target.value); setMPacienteEmail(''); setShowSug(true); }}
                  onFocus={() => setShowSug(true)}
                  onBlur={() => setTimeout(() => setShowSug(false), 150)}
                  placeholder="Escribe el nombre del paciente…" />
                {showSug && mPaciente.trim() && (() => {
                  const qq = mPaciente.trim().toLowerCase();
                  const matches = pacientesList.filter(p => (p.nombre || '').toLowerCase().includes(qq)).slice(0, 6);
                  if (matches.length === 0) return null;
                  return (
                    <div style={{ position:'absolute', left:0, right:0, top:'100%', zIndex:50, background:'#fff', border:'1px solid var(--border)', borderRadius:10, marginTop:4, boxShadow:'0 10px 30px rgba(33,28,23,0.15)', maxHeight:190, overflowY:'auto' }}>
                      {matches.map(p => (
                        <button key={p.id} type="button"
                          onMouseDown={(e) => { e.preventDefault(); setMPaciente(p.nombre); setMPacienteEmail((p.correo || '').toLowerCase()); setShowSug(false); }}
                          style={{ display:'block', width:'100%', textAlign:'left', background:'transparent', border:'none', padding:'9px 12px', fontSize:13, cursor:'pointer', color:'var(--dark)', fontFamily:'Montserrat, sans-serif' }}>
                          {p.nombre} <span style={{ color:'var(--stone)', fontSize:11 }}>· {p.codigo}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="section-label">Tipo de consulta</div>
            <div className="motivos-grid">
              {SERVICIOS.map(s => (
                <button key={s.id}
                  className={`motivo-btn${mTipo === s.id ? ' selected' : ''}`}
                  onClick={() => { setMTipo(s.id); setMHora(null); }}>
                  {s.nombre}<br/><span style={{ fontSize:9, opacity:.8 }}>{s.dur} min{s.online ? ' · online' : ''}</span>
                </button>
              ))}
            </div>

            <div className="fg"><label>Objetivo</label>
              <select value={mObjetivo} onChange={e=>setMObjetivo(e.target.value)}>
                {OBJETIVOS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            {mObjetivo === 'Otro' && (
              <div className="fg"><label>Especifica el objetivo</label>
                <input value={mObjetivoOtro} onChange={e=>setMObjetivoOtro(e.target.value)} placeholder="Describe el objetivo" />
              </div>
            )}

            <div className="section-label">Horarios disponibles — {fmtDate(selDate)}</div>
            {!servSel
              ? <div className="empty-state">Selecciona el tipo de consulta para ver los horarios.</div>
              : slots.length === 0
                ? <div className="empty-state">No hay horarios para este día.</div>
                : slots.every(s => !s.disponible)
                  ? <div className="empty-state">Sin horarios disponibles (día lleno).</div>
                  : (
                    <div className="horario-grid">
                      {slots.map(s => (
                        <button key={s.hora}
                          className={`horario-slot${!s.disponible ? ' ocupado' : mHora === s.hora ? ' selected' : ''}`}
                          onClick={() => { if (s.disponible) setMHora(s.hora); }}>{s.hora}</button>
                      ))}
                    </div>
                  )
            }

            <div className="fg"><label>Notas (opcional)</label>
              <textarea value={mNotas} onChange={e=>setMNotas(e.target.value)} placeholder={isNutri ? 'Observaciones…' : 'Cuéntanos tu objetivo…'} />
            </div>

            <div className="btn-row">
              <button className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-save" onClick={guardar} disabled={saving || !servSel || !mHora || (isNutri && !mPacienteEmail)}>
                {saving ? 'Guardando...' : (isNutri ? 'Guardar cita' : 'Confirmar cita')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
