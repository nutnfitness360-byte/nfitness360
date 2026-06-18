import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
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

export default function Agenda({ isNutri, reagendarDe = null, onReagendado, onSolicitarCancelar }) {
  const { user } = useAuth();
  const hoy = new Date();
  const [view, setView] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() });
  const [selDate, setSelDate] = useState(toKey(proxDisponible(hoy)));
  const [citas, setCitas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  // Modal interno de cancelar/reagendar (se usa cuando no hay callback externo, p. ej. la nutrióloga)
  const [localModal, setLocalModal] = useState(null);   // cita o null
  const [localConfirm, setLocalConfirm] = useState(false);
  const [reagendarLocal, setReagendarLocal] = useState(null);

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
  const [precios, setPrecios] = useState({});
  const [mMetodoPago, setMMetodoPago] = useState('efectivo');

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

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'dashboard'), snap => {
      const d = (snap && snap.data()) || {}; setPrecios(d.precios || {});
    }, () => {});
  }, []);

  const emailUser = (user.email || '').toLowerCase();
  const esPropia = (c) => isNutri || (c.pacienteEmail || '').toLowerCase() === emailUser;
  const citasDelDia = citas.filter(c => c.fecha === selDate);
  // Para los SLOTS solo cuentan las citas NO canceladas (la cancelada libera el horario)
  const ocupadasDia = citasDelDia.filter(c => c.estado !== 'cancelada');
  // Para MOSTRAR (lista del día y puntos del calendario) solo las propias del paciente
  const citasDia = citasDelDia.filter(esPropia).slice().sort((a,b) => a.hora.localeCompare(b.hora));
  const citaDates = new Set(citas.filter(c => c.estado !== 'cancelada').filter(esPropia).map(c => c.fecha));

  const servSel = SERVICIOS.find(s => s.id === mTipo) || null;
  const slots = generarSlots(selDate, servSel ? servSel.dur : 0, ocupadasDia);

  const abrirModal = () => {
    setMPaciente(''); setMPacienteEmail(''); setMTipo(null);
    setMObjetivo(OBJETIVOS[0]); setMObjetivoOtro(''); setMHora(null); setMNotas('');
    setMMetodoPago('efectivo');
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
    const reagOrigen = reagendarDe || reagendarLocal;
    // Pago en línea (Stripe) cuando: lo agenda el paciente, no es reagendado, y es online (obligatorio) o eligió "Pagar en línea".
    const usaStripe = !isNutri && !reagOrigen && (servSel.online || mMetodoPago === 'stripe');
    const metodo = isNutri ? 'consultorio' : (reagOrigen ? 'reagendado' : (servSel.online ? 'stripe' : mMetodoPago));
    const precio = precios[servSel.nombre] || 0;
    if (usaStripe && !(precio > 0)) { alert('Esta consulta aún no tiene precio configurado. Avísale a la nutrióloga para poder cobrar en línea.'); return; }
    setSaving(true);
    try {
      // 1) Guardar la cita en la base de datos (rápido y prioritario).
      const ref = await addDoc(collection(db, 'citas'), {
        fecha: selDate,
        hora: mHora,
        tipo: servSel.id,
        tipoNombre: servSel.nombre,
        dur: servSel.dur,
        online: servSel.online,
        objetivo: objetivoFinal,
        motivo: servSel.nombre, // compatibilidad con vistas previas
        notas: mNotas,
        estado: usaStripe ? 'pendiente_pago' : 'confirmada',
        metodoPago: metodo,
        estadoPago: 'pendiente',
        monto: precio || null,
        pacienteEmail: correo,
        pacienteNombre: pacienteNombre,
        creadoEn: Timestamp.now(),
      });
      // Pago en línea (Stripe): crea la sesión y redirige; la cita se confirma al volver (en el inicio del paciente).
      if (usaStripe) {
        const urlAS = process.env.REACT_APP_APPSCRIPT_URL;
        try {
          const base = window.location.origin;
          const successUrl = base + '/?pago=ok&cita=' + ref.id + '&session={CHECKOUT_SESSION_ID}';
          const cancelUrl = base + '/?pago=cancelado&cita=' + ref.id;
          const res = await fetch(urlAS, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'crearCheckoutStripe', montoCentavos: Math.round(precio * 100), descripcion: 'Consulta ' + servSel.nombre, correo: correo, citaId: ref.id, successUrl: successUrl, cancelUrl: cancelUrl }), redirect: 'follow',
          });
          let dp; try { dp = JSON.parse(await res.text()); } catch (_) { dp = null; }
          if (dp && dp.ok && dp.url) { window.location.href = dp.url; return; }
          alert('No se pudo iniciar el pago: ' + ((dp && dp.error) || 'intenta de nuevo.'));
          try { await updateDoc(doc(db, 'citas', ref.id), { estado: 'cancelada', estadoPago: 'cancelado' }); } catch (e) {}
          setSaving(false);
          return;
        } catch (e) {
          alert('No se pudo iniciar el pago. Intenta de nuevo.');
          try { await updateDoc(doc(db, 'citas', ref.id), { estado: 'cancelada', estadoPago: 'cancelado' }); } catch (e2) {}
          setSaving(false);
          return;
        }
      }
      // 2) Crear el evento en Google Calendar + enviar el correo (vía Apps Script).
      //    Guardamos el eventId devuelto para poder cancelar (borrar) el evento luego.
      const url = process.env.REACT_APP_APPSCRIPT_URL;
      if (url && correo) {
        try {
          const res = await fetch(url, {
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
          let d; try { d = JSON.parse(await res.text()); } catch (_) { d = null; }
          if (d && d.eventId) { try { await updateDoc(doc(db, 'citas', ref.id), { eventId: d.eventId }); } catch (e) {} }
        } catch (e) { /* el evento/correo es secundario; la cita ya quedó guardada */ }
      }
      // Si venimos de "Reagendar": cancelar la cita anterior ahora que la nueva ya quedó.
      if (reagOrigen && reagOrigen.id) {
        try { await cancelarEnServidor(reagOrigen, isNutri ? 'nutriologa' : 'paciente'); } catch (e) { /* la nueva ya quedó; el aviso de cancelación es secundario */ }
      }
      cerrarModal();
      if (reagendarLocal) setReagendarLocal(null);
      if (reagendarDe && onReagendado) onReagendado();
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const cancelarEnServidor = async (c, quien) => {
    await updateDoc(doc(db, 'citas', c.id), { estado: 'cancelada' });
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (url) {
      try {
        await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'cancelarCita',
            eventId: c.eventId || '',
            correo: (c.pacienteEmail || '').toLowerCase(),
            paciente: c.pacienteNombre || '',
            fecha: c.fecha,
            hora: c.hora,
            tipoNombre: c.tipoNombre || c.motivo || '',
            online: !!c.online,
            canceladoPor: quien,
          }), redirect: 'follow',
        });
      } catch (e) { /* el correo/borrado de evento es secundario; ya quedó cancelada */ }
    }
  };

  const reagendarActivo = reagendarDe || reagendarLocal;

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
      {reagendarActivo && (
        <div style={{ background: '#fff', border: '1px solid var(--gold)', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 12.5, color: 'var(--dark)', lineHeight: 1.5 }}>
          <b>Reagendando tu cita</b> del {reagendarActivo.fecha} a las {reagendarActivo.hora}. Elige un nuevo día y horario; al confirmar, tu cita anterior se cancelará automáticamente.
        </div>
      )}
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
                {c.estado !== 'cancelada' && (
                  <button onClick={() => (!isNutri && onSolicitarCancelar) ? onSolicitarCancelar(c) : setLocalModal(c)} title="Cancelar cita"
                    style={{ marginLeft: 8, padding: '5px 10px', background: 'transparent', border: '1px solid #B0593F', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#B0593F', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', flexShrink: 0 }}>
                    Cancelar
                  </button>
                )}
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

            {!isNutri && servSel && (
              <div className="fg"><label>Forma de pago</label>
                {servSel.online ? (
                  <div className="empty-state" style={{ textAlign: 'left' }}>Esta consulta es en línea: el pago se realiza por Stripe al confirmar la cita.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[['efectivo', 'Efectivo (en consultorio)'], ['tarjeta', 'Tarjeta (en consultorio)'], ['transferencia', 'Transferencia'], ['stripe', 'Pagar en línea ahora (Stripe)']].map(([val, lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input type="radio" name="metodoPago" checked={mMetodoPago === val} onChange={() => setMMetodoPago(val)} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="btn-row">
              <button className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-save" onClick={guardar} disabled={saving || !servSel || !mHora || (isNutri && !mPacienteEmail)}>
                {saving ? 'Guardando...' : (isNutri ? 'Guardar cita' : (((servSel && servSel.online) || mMetodoPago === 'stripe') ? 'Pagar y agendar' : 'Confirmar cita'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {localModal && (
        <div onClick={() => { setLocalModal(null); setLocalConfirm(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, padding: '22px 20px', fontFamily: 'var(--font)' }}>
            {!localConfirm ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>¿Cancelar o reagendar la cita?</div>
                <div style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.5, marginBottom: 16 }}>
                  {localModal.pacienteNombre ? localModal.pacienteNombre + ' · ' : ''}{localModal.fecha} a las {localModal.hora}.
                </div>
                <button onClick={() => { setReagendarLocal(localModal); setSelDate(localModal.fecha); setLocalModal(null); setLocalConfirm(false); }}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', marginBottom: 9, cursor: 'pointer', border: 'none', background: 'var(--gold)', color: '#fff' }}>
                  Reagendar
                </button>
                <button onClick={() => setLocalConfirm(true)}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', marginBottom: 9, cursor: 'pointer', background: 'transparent', border: '1px solid #B0593F', color: '#B0593F' }}>
                  Cancelar cita
                </button>
                <button onClick={() => { setLocalModal(null); setLocalConfirm(false); }}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 10, fontSize: 12.5, fontFamily: 'var(--font)', cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--stone)' }}>
                  Volver
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>¿Seguro que deseas cancelar?</div>
                <div style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.5, marginBottom: 16 }}>
                  Se cancelará la cita de {localModal.pacienteNombre || 'el paciente'} del {localModal.fecha} a las {localModal.hora}. Se libera el horario, se elimina el evento del calendario y se envía el correo de cancelación.
                </div>
                <button onClick={async () => { const c = localModal; setLocalModal(null); setLocalConfirm(false); try { await cancelarEnServidor(c, 'nutriologa'); } catch (e) { alert('No se pudo cancelar: ' + e.message); } }}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', marginBottom: 9, cursor: 'pointer', background: '#B0593F', border: 'none', color: '#fff' }}>
                  Sí, cancelar la cita
                </button>
                <button onClick={() => setLocalConfirm(false)}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--stone)' }}>
                  No, volver
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
