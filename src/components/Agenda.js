import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];
const HORARIOS = ['08:00','09:00','10:00','11:00','12:00','13:00','15:00','16:00','17:00','18:00','19:00','20:00'];
const MOTIVOS = ['Primera vez','Seguimiento','Deportiva primera vez','Seguimiento deportiva','Online primera vez','Online seguimiento'];

function toKey(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function fmtDate(key) {
  const [y,m,d] = key.split('-');
  return new Date(+y,+m-1,+d).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}).replace(/^\w/,c=>c.toUpperCase());
}

export default function Agenda({ isNutri }) {
  const { user } = useAuth();
  const hoy = new Date();
  const [view, setView] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() });
  const [selDate, setSelDate] = useState(toKey(hoy));
  const [citas, setCitas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selHora, setSelHora] = useState(null);
  const [selMotivo, setSelMotivo] = useState(null);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [nPaciente, setNPaciente] = useState('');
  const [nFecha, setNFecha] = useState(toKey(hoy));
  const [nHora, setNHora] = useState('09:00');
  const [nMotivo, setNMotivo] = useState(MOTIVOS[0]);
  const [nNotas, setNNotas] = useState('');

  useEffect(() => {
    const q = isNutri
      ? query(collection(db, 'citas'), orderBy('fecha', 'asc'))
      : query(collection(db, 'citas'), where('pacienteEmail', '==', user.email));
    const unsub = onSnapshot(q, snap => {
      setCitas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [isNutri, user]);

  const citasDia = citas.filter(c => c.fecha === selDate).sort((a,b) => a.hora.localeCompare(b.hora));
  const horasOcupadas = new Set(citas.filter(c => c.fecha === selDate).map(c => c.hora));
  const citaDates = new Set(citas.map(c => c.fecha));

  const confirmarCita = async () => {
    if (!selHora || !selMotivo) { alert('Selecciona hora y motivo'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'citas'), {
        fecha: selDate,
        hora: selHora,
        motivo: selMotivo,
        notas: notas,
        estado: 'pendiente',
        pacienteEmail: user.email,
        pacienteNombre: user.displayName || user.email.split('@')[0],
        creadoEn: Timestamp.now()
      });
      setShowModal(false);
      setSelHora(null);
      setSelMotivo(null);
      setNotas('');
    } catch(e) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const crearCitaNutri = async () => {
    if (!nPaciente || !nFecha || !nHora) { alert('Completa todos los campos'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'citas'), {
        fecha: nFecha,
        hora: nHora,
        motivo: nMotivo,
        notas: nNotas,
        estado: 'confirmada',
        pacienteEmail: '',
        pacienteNombre: nPaciente,
        creadoEn: Timestamp.now()
      });
      setShowModal(false);
      setNPaciente('');
      setNNotas('');
    } catch(e) { alert('Error: ' + e.message); }
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
      let cls = 'cal-day';
      if (dow === 0) cls += ' sunday';
      if (key === toKey(hoy)) cls += ' today';
      if (key === selDate) cls += ' selected';
      if (citaDates.has(key)) cls += ' has-cita';
      cells.push(<div key={key} className={cls} onClick={() => dow !== 0 && setSelDate(key)}>{d}</div>);
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
        <div className="section-label">{fmtDate(selDate)}</div>
        {citasDia.length === 0
          ? <div className="empty-state">Sin citas este dia</div>
          : citasDia.map(c => (
            <div className="cita-item" key={c.id}>
              <div className="cita-hora">{c.hora}</div>
              <div style={{flex:1}}>
                <div className="cita-nombre">{c.pacienteNombre}</div>
                <div className="cita-motivo">{c.motivo}</div>
              </div>
              <span className={`badge b-${c.estado === 'confirmada' ? 'confirm' : c.estado === 'cancelada' ? 'cancel' : 'pending'}`}>{c.estado}</span>
            </div>
          ))
        }
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + {isNutri ? 'Nueva cita' : 'Agendar cita'}
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{isNutri ? 'Nueva cita' : 'Agendar cita'}</div>

            {isNutri ? (
              <>
                <div className="fg"><label>Paciente</label><input value={nPaciente} onChange={e=>setNPaciente(e.target.value)} placeholder="Nombre del paciente" /></div>
                <div className="f2">
                  <div className="fg"><label>Fecha</label><input type="date" value={nFecha} onChange={e=>setNFecha(e.target.value)} /></div>
                  <div className="fg"><label>Hora</label><input type="time" value={nHora} onChange={e=>setNHora(e.target.value)} /></div>
                </div>
                <div className="fg"><label>Motivo</label>
                  <select value={nMotivo} onChange={e=>setNMotivo(e.target.value)}>
                    {MOTIVOS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Notas</label><textarea value={nNotas} onChange={e=>setNNotas(e.target.value)} placeholder="Observaciones..." /></div>
                <div className="btn-row">
                  <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button className="btn-save" onClick={crearCitaNutri} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cita'}</button>
                </div>
              </>
            ) : (
              <>
                <div className="section-label">Horarios disponibles — {fmtDate(selDate)}</div>
                <div className="horario-grid">
                  {HORARIOS.map(h => (
                    <button key={h}
                      className={`horario-slot${horasOcupadas.has(h)?' ocupado':selHora===h?' selected':''}`}
                      onClick={() => { if(!horasOcupadas.has(h)) setSelHora(h); }}>{h}</button>
                  ))}
                </div>
                <div className="section-label">Motivo de consulta</div>
                <div className="motivos-grid">
                  {MOTIVOS.map(m => (
                    <button key={m}
                      className={`motivo-btn${selMotivo===m?' selected':''}`}
                      onClick={() => setSelMotivo(m)}>{m}</button>
                  ))}
                </div>
                <div className="fg"><label>Notas (opcional)</label><textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Cuentanos tu objetivo..." /></div>
                <div className="btn-row">
                  <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button className="btn-save" onClick={confirmarCita} disabled={saving || !selHora || !selMotivo}>
                    {saving ? 'Guardando...' : 'Confirmar cita'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
