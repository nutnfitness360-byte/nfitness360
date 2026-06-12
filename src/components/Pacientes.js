import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import Plan from './Plan';
import Menus from './Menus';
import InBodyModal from './InBodyModal';

/* ===== utilidades ===== */
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fmtMes = (f) => { const d = new Date(f + 'T00:00:00'); return isNaN(d) ? f : `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fmtFecha = (f) => { const d = new Date(f + 'T00:00:00'); return isNaN(d) ? f : `${d.getDate()} de ${MESES_L[d.getMonth()]} de ${d.getFullYear()}`; };
const initials = (n) => n ? n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() : 'NU';
const last = (a) => (a && a.length ? a[a.length - 1] : null);
const hoyISO = () => new Date().toISOString().slice(0, 10);

/* ===== mini gráfica de línea (SVG, sin librerías) ===== */
function Linea({ data, field, color, unit }) {
  const valid = (data || []).filter(d => typeof d[field] === 'number');
  if (valid.length === 0) return <div style={{ fontSize: 12, color: 'var(--stone)', padding: '14px 0', textAlign: 'center' }}>Sin mediciones aún</div>;
  const w = 300, h = 120, pad = 26;
  const vals = valid.map(d => d[field]);
  const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const n = valid.length;
  const X = (i) => n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1);
  const Y = (v) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const pts = valid.map((d, i) => `${X(i)},${Y(d[field])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" strokeWidth="1" />
      {valid.length > 1 && <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {valid.map((d, i) => <circle key={i} cx={X(i)} cy={Y(d[field])} r="3.5" fill={color} />)}
      {valid.map((d, i) => (
        <text key={'x' + i} x={X(i)} y={h - pad + 14} fontSize="8.5" fill="var(--stone)" textAnchor="middle">{fmtMes(d.fecha)}</text>
      ))}
      <text x={pad - 4} y={Y(max) + 3} fontSize="9" fill="var(--stone)" textAnchor="end">{max}{unit}</text>
      {min !== max && <text x={pad - 4} y={Y(min) + 3} fontSize="9" fill="var(--stone)" textAnchor="end">{min}{unit}</text>}
    </svg>
  );
}

/* ===== componente principal ===== */
export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [selId, setSelId] = useState(null);
  const [sub, setSub] = useState('dash');
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: '', edad: '', sexo: 'Femenino', estatura: '', objetivo: '', contacto: '' });
  const [med, setMed] = useState({ fecha: hoyISO(), peso: '', grasa: '', musculo: '' });
  const [plan, setPlan] = useState({ nombre: '', fecha: hoyISO(), link: '' });
  const [openMed, setOpenMed] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [inbodyOpen, setInbodyOpen] = useState(false);
  const [inbody, setInbody] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pacientes'), orderBy('codigo', 'asc'));
    return onSnapshot(q, snap => setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => setErr('No se pudieron cargar los pacientes: ' + e.message));
  }, []);

  const sel = pacientes.find(p => p.id === selId);

  const nextCodigo = () => {
    let mx = 0;
    pacientes.forEach(p => { const m = /NF-(\d+)/.exec(p.codigo || ''); if (m) mx = Math.max(mx, +m[1]); });
    return 'NF-' + String(mx + 1).padStart(4, '0');
  };

  const crearPaciente = async () => {
    if (!form.nombre.trim()) { setErr('Escribe el nombre del paciente.'); return; }
    try {
      await addDoc(collection(db, 'pacientes'), {
        codigo: nextCodigo(),
        nombre: form.nombre.trim(),
        edad: form.edad, sexo: form.sexo, estatura: form.estatura,
        objetivo: form.objetivo, contacto: form.contacto,
        inicio: hoyISO(), mediciones: [], planes: [], creado: Date.now(),
      });
      setForm({ nombre: '', edad: '', sexo: 'Femenino', estatura: '', objetivo: '', contacto: '' });
      setNuevo(false); setErr('');
    } catch (e) { setErr('No se pudo crear: ' + e.message); }
  };

  const addMedicion = async () => {
    if (!med.fecha || !med.peso) { setErr('Fecha y peso son necesarios.'); return; }
    const nm = { fecha: med.fecha, peso: +med.peso, grasa: +med.grasa || 0, musculo: +med.musculo || 0 };
    const arr = [...(sel.mediciones || []), nm].sort((a, b) => a.fecha.localeCompare(b.fecha));
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), { mediciones: arr });
      setMed({ fecha: hoyISO(), peso: '', grasa: '', musculo: '' }); setOpenMed(false); setErr('');
    } catch (e) { setErr('No se pudo guardar: ' + e.message); }
  };

  const addPlan = async () => {
    if (!plan.nombre.trim()) { setErr('Escribe el nombre del plan.'); return; }
    const arr = [...(sel.planes || []), { nombre: plan.nombre.trim(), fecha: plan.fecha || hoyISO(), link: plan.link.trim() }];
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), { planes: arr });
      setPlan({ nombre: '', fecha: hoyISO(), link: '' }); setOpenPlan(false); setErr('');
    } catch (e) { setErr('No se pudo guardar: ' + e.message); }
  };

  const removePlan = async (i) => {
    const arr = (sel.planes || []).filter((_, k) => k !== i);
    try { await updateDoc(doc(db, 'pacientes', sel.id), { planes: arr }); } catch (e) { setErr(e.message); }
  };

  const onInBody = async (data) => {
    const peso = parseFloat(data.peso);
    if (isFinite(peso)) {
      const nm = { fecha: data.fecha || hoyISO(), peso, grasa: parseFloat(data.grasa) || 0, musculo: parseFloat(data.mme) || 0, grasaKg: parseFloat(data.grasaKg) || 0, tmb: parseFloat(data.tmb) || 0 };
      const arr = [...(sel.mediciones || []), nm].sort((a, b) => a.fecha.localeCompare(b.fecha));
      try { await updateDoc(doc(db, 'pacientes', sel.id), { mediciones: arr }); }
      catch (e) { setErr('No se pudo guardar la medición: ' + e.message); }
    }
    setInbody({ peso: data.peso, grasa: data.grasa, mme: data.mme, tmb: data.tmb, fecha: data.fecha });
    setInbodyOpen(false);
    setSub('plan');
  };

  const S = styles;

  /* ----- VISTA: dashboard de un paciente ----- */
  if (sel) {
    const m = last(sel.mediciones);
    if (sub === 'plan') {
      const pdata = inbody
        ? { peso: inbody.peso || (m ? m.peso : ''), talla: sel.estatura || '', edad: sel.edad || '', sexo: sel.sexo || 'Femenino', grasa: inbody.grasa || (m ? m.grasa : ''), tmb: inbody.tmb || '' }
        : { peso: m ? m.peso : '', talla: sel.estatura || '', edad: sel.edad || '', sexo: sel.sexo || 'Femenino', grasa: m ? m.grasa : '', tmb: (m && m.tmb) || '' };
      return <Plan patient={sel} pdata={pdata} onBack={() => setSub('dash')} />;
    }
    if (sub === 'menus') {
      return <Menus patient={sel} onBack={() => setSub('dash')} />;
    }
    return (
      <div>
        <button style={S.back} onClick={() => { setSelId(null); setErr(''); }}>← Pacientes</button>
        {err && <div style={S.err}>{err}</div>}

        <div className="card">
          <div style={S.headRow}>
            <div className="pac-avatar">{initials(sel.nombre)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--dark)' }}>{sel.nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 2 }}>{sel.codigo} · {sel.objetivo || 'sin objetivo'}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Información general</div>
          <div style={S.infoGrid}>
            <Info l="Edad" v={sel.edad ? sel.edad + ' años' : '—'} />
            <Info l="Sexo" v={sel.sexo || '—'} />
            <Info l="Estatura" v={sel.estatura ? sel.estatura + ' cm' : '—'} />
            <Info l="Inicio" v={sel.inicio ? fmtFecha(sel.inicio) : '—'} />
            <Info l="Contacto" v={sel.contacto || '—'} />
            <Info l="Peso actual" v={m ? m.peso + ' kg' : '—'} />
            <Info l="% grasa" v={m ? m.grasa + '%' : '—'} />
            <Info l="Masa muscular" v={m ? m.musculo + ' kg' : '—'} />
          </div>
        </div>

        <div className="card">
          <div style={S.titleRow}>
            <div className="card-title" style={{ margin: 0 }}>Seguimiento</div>
            <button style={S.smallBtn} onClick={() => setOpenMed(v => !v)}>{openMed ? 'Cancelar' : '+ Medición'}</button>
          </div>
          {openMed && (
            <div style={S.formRow}>
              <Field l="Fecha"><input type="date" style={S.inp} value={med.fecha} onChange={e => setMed({ ...med, fecha: e.target.value })} /></Field>
              <Field l="Peso (kg)"><input style={S.inp} inputMode="decimal" value={med.peso} onChange={e => setMed({ ...med, peso: e.target.value })} /></Field>
              <Field l="% grasa"><input style={S.inp} inputMode="decimal" value={med.grasa} onChange={e => setMed({ ...med, grasa: e.target.value })} /></Field>
              <Field l="Músculo (kg)"><input style={S.inp} inputMode="decimal" value={med.musculo} onChange={e => setMed({ ...med, musculo: e.target.value })} /></Field>
              <button style={S.saveBtn} onClick={addMedicion}>Guardar</button>
            </div>
          )}
          <div style={S.chartGrid}>
            <ChartCard title="Peso" unit=" kg" valor={m ? m.peso : null}><Linea data={sel.mediciones} field="peso" color="var(--gold)" unit="" /></ChartCard>
            <ChartCard title="% de grasa" unit="%" valor={m ? m.grasa : null}><Linea data={sel.mediciones} field="grasa" color="var(--stone)" unit="" /></ChartCard>
            <ChartCard title="Masa muscular" unit=" kg" valor={m ? m.musculo : null}><Linea data={sel.mediciones} field="musculo" color="var(--sage)" unit="" /></ChartCard>
          </div>
        </div>

        <div className="card">
          <div style={S.titleRow}>
            <div className="card-title" style={{ margin: 0 }}>Plan nutricional</div>
            <button style={S.smallBtn} onClick={() => setInbodyOpen(true)}>Abrir cálculo</button>
          </div>
          <div style={S.note}>Calcula los equivalentes (SMAE) y los macros del plan a partir de los datos del paciente.</div>
          {sel.plan && sel.plan.totales
            ? <div style={{ fontSize: 13, color: 'var(--dark)' }}>Plan guardado: <b>{sel.plan.totales.kcal} kcal</b> · {fmtFecha(sel.plan.fecha)}</div>
            : <div className="empty-state">Aún no hay cálculo de plan.</div>}
        </div>

        <div className="card">
          <div style={S.titleRow}>
            <div className="card-title" style={{ margin: 0 }}>Menús por tiempo de comida</div>
            <button style={S.smallBtn} onClick={() => setSub('menus')}>Abrir menús</button>
          </div>
          <div style={S.note}>Reparte los equivalentes del plan en los tiempos de comida y arma las opciones de menú.</div>
          {!(sel.plan && sel.plan.eq)
            ? <div className="empty-state">Primero calcula y guarda el plan.</div>
            : (sel.plan.menus && sel.plan.menus.tiempos
              ? <div style={{ fontSize: 13, color: 'var(--dark)' }}>{sel.plan.menus.tiempos.length} tiempos de comida configurados.</div>
              : <div className="empty-state">Aún no hay menús generados.</div>)}
        </div>

        <div className="card">
          <div style={S.titleRow}>
            <div className="card-title" style={{ margin: 0 }}>Planes</div>
            <button style={S.smallBtn} onClick={() => setOpenPlan(v => !v)}>{openPlan ? 'Cancelar' : '+ Plan'}</button>
          </div>
          <div style={S.note}>El reporte (PDF) se guarda en Google Drive y aquí se registra su enlace.</div>
          {openPlan && (
            <div style={S.formRow}>
              <Field l="Nombre del plan"><input style={S.inp} value={plan.nombre} onChange={e => setPlan({ ...plan, nombre: e.target.value })} placeholder="Plan · 2200 kcal" /></Field>
              <Field l="Fecha"><input type="date" style={S.inp} value={plan.fecha} onChange={e => setPlan({ ...plan, fecha: e.target.value })} /></Field>
              <Field l="Enlace de Drive"><input style={S.inp} value={plan.link} onChange={e => setPlan({ ...plan, link: e.target.value })} placeholder="https://drive.google.com/…" /></Field>
              <button style={S.saveBtn} onClick={addPlan}>Guardar</button>
            </div>
          )}
          {(!sel.planes || sel.planes.length === 0)
            ? <div className="empty-state">Aún no hay planes para este paciente.</div>
            : sel.planes.map((pl, i) => (
              <div key={i} style={S.planRow}>
                <div style={S.planIcon}>PDF</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{pl.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 1 }}>{pl.fecha ? fmtFecha(pl.fecha) : ''}</div>
                </div>
                {pl.link
                  ? <a href={pl.link} target="_blank" rel="noreferrer" style={S.openBtn}>Abrir</a>
                  : <span style={{ fontSize: 11, color: 'var(--stone)', fontStyle: 'italic' }}>Sin enlace</span>}
                <button style={S.rm} onClick={() => removePlan(i)} title="Quitar">×</button>
              </div>
            ))
          }
        </div>

        {inbodyOpen && (
          <InBodyModal
            patient={sel}
            onClose={() => setInbodyOpen(false)}
            onDesdeCero={() => { setInbody(null); setInbodyOpen(false); setSub('plan'); }}
            onInBody={onInBody}
          />
        )}
      </div>
    );
  }

  /* ----- VISTA: lista de pacientes ----- */
  return (
    <div>
      <div style={S.titleRow}>
        <div className="card-title" style={{ margin: 0, fontSize: 16 }}>Pacientes</div>
        <button style={S.smallBtn} onClick={() => setNuevo(v => !v)}>{nuevo ? 'Cancelar' : '+ Nuevo paciente'}</button>
      </div>
      {err && <div style={S.err}>{err}</div>}

      {nuevo && (
        <div className="card">
          <div className="card-title">Nuevo paciente</div>
          <div style={S.formGrid}>
            <Field l="Nombre"><input style={S.inp} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
            <Field l="Edad"><input style={S.inp} inputMode="numeric" value={form.edad} onChange={e => setForm({ ...form, edad: e.target.value })} /></Field>
            <Field l="Sexo">
              <select style={S.inp} value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })}>
                <option>Femenino</option><option>Masculino</option>
              </select>
            </Field>
            <Field l="Estatura (cm)"><input style={S.inp} inputMode="numeric" value={form.estatura} onChange={e => setForm({ ...form, estatura: e.target.value })} /></Field>
            <Field l="Objetivo"><input style={S.inp} value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })} placeholder="Aumento de músculo" /></Field>
            <Field l="Contacto"><input style={S.inp} value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="correo o teléfono" /></Field>
          </div>
          <button style={{ ...S.saveBtn, marginTop: 12 }} onClick={crearPaciente}>Guardar paciente</button>
        </div>
      )}

      <div className="card">
        <div className="card-title">Mis pacientes ({pacientes.length})</div>
        {pacientes.length === 0
          ? <div className="empty-state">No hay pacientes registrados aún. Usa “+ Nuevo paciente”.</div>
          : pacientes.map(p => {
            const m = last(p.mediciones);
            return (
              <div className="pac-item" key={p.id} onClick={() => { setSelId(p.id); setSub('dash'); setInbody(null); }}>
                <div className="pac-avatar">{initials(p.nombre)}</div>
                <div style={{ flex: 1 }}>
                  <div className="pac-nombre">{p.nombre}</div>
                  <div className="pac-detalle">{p.codigo} · {p.objetivo || 'sin objetivo'}</div>
                </div>
                <div className="pac-citas">{m ? m.peso + ' kg' : '—'}</div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

/* ===== piezas pequeñas ===== */
function Info({ l, v }) {
  return <div style={styles.infoCell}><div style={styles.infoLbl}>{l}</div><div style={styles.infoVal}>{v}</div></div>;
}
function Field({ l, children }) {
  return <label style={styles.field}><span style={styles.fieldLbl}>{l}</span>{children}</label>;
}
function ChartCard({ title, unit, valor, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTop}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)' }}>{title}</span>
        <span style={{ fontFamily: 'var(--font-display), serif', fontSize: 22, color: 'var(--dark)' }}>{valor != null ? valor : '—'}<span style={{ fontSize: 11, color: 'var(--stone)' }}>{unit}</span></span>
      </div>
      {children}
    </div>
  );
}

const styles = {
  back: { background: 'transparent', border: 'none', color: 'var(--stone)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 12 },
  err: { background: '#fef0f0', color: '#c0392b', fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 12 },
  headRow: { display: 'flex', alignItems: 'center', gap: 12 },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  infoCell: { background: 'var(--cream)', borderRadius: 10, padding: '9px 11px' },
  infoLbl: { fontSize: 9.5, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600, marginBottom: 3 },
  infoVal: { fontSize: 13, color: 'var(--dark)', fontWeight: 600 },
  chartGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 12 },
  chartCard: { border: '0.5px solid var(--border)', borderRadius: 12, padding: '10px 12px', background: '#fff' },
  chartTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLbl: { fontSize: 9.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' },
  fieldsWrap: {},
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, background: 'var(--cream)', borderRadius: 10, padding: 12, marginBottom: 12, alignItems: 'end' },
  inp: { border: '0.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', width: '100%' },
  saveBtn: { background: 'var(--gold)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  smallBtn: { background: '#fff', color: 'var(--dark)', border: '0.5px solid var(--border)', padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  note: { fontSize: 11.5, color: 'var(--stone)', marginBottom: 12, lineHeight: 1.5 },
  planRow: { display: 'flex', alignItems: 'center', gap: 12, border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 },
  planIcon: { width: 36, height: 36, borderRadius: 8, background: 'var(--dark)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 },
  openBtn: { background: 'var(--gold)', color: '#fff', textDecoration: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  rm: { background: 'transparent', border: 'none', color: 'var(--stone)', fontSize: 19, cursor: 'pointer', lineHeight: 1, padding: '0 4px' },
};
