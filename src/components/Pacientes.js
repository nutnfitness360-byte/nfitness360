import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import Plan from './Plan';
import Menus from './Menus';
import HistoriaClinica from './HistoriaClinica';
import InBodyModal from './InBodyModal';

/* ===== utilidades ===== */
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fmtMes = (f) => { const d = new Date(f + 'T00:00:00'); return isNaN(d) ? f : `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fmtSello = (ts) => { const d = new Date(ts); return isNaN(d) ? '' : d.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const fileToBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
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
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block', fontFamily: 'Montserrat, sans-serif' }}>
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
  const [busca, setBusca] = useState('');
  const [menuId, setMenuId] = useState(null);
  const [med, setMed] = useState({ fecha: hoyISO(), peso: '', grasa: '', musculo: '' });
  const [plan, setPlan] = useState({ nombre: '', fecha: hoyISO(), link: '' });
  const [openMed, setOpenMed] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [inbodyOpen, setInbodyOpen] = useState(false);
  const [inbody, setInbody] = useState(null);
  const [recoTexto, setRecoTexto] = useState('');
  const [panel, setPanel] = useState(null);
  const [ib, setIb] = useState({ fecha: hoyISO(), peso: '', grasa: '', mme: '', grasaKg: '', visceral: '', agua: '' });
  const [ibFile, setIbFile] = useState(null);
  const [ibBusy, setIbBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pacientes'), orderBy('codigo', 'asc'));
    return onSnapshot(q, snap => setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => setErr('No se pudieron cargar los pacientes: ' + e.message));
  }, []);

  const sel = pacientes.find(p => p.id === selId);

  /* ----- Navegación con historial del navegador (botón Atrás / mouse / gesto) ----- */
  const navRef = useRef({});
  navRef.current = { nuevo, selId, sub };

  // Empuja una entrada al historial al entrar a una vista más profunda
  const pushNav = () => { try { window.history.pushState({ nf: true }, ''); } catch (e) {} };
  // "Atrás": deja que el navegador haga el popstate (sincroniza mouse/gesto/botón)
  const volver = () => { try { window.history.back(); } catch (e) {} };

  useEffect(() => {
    const onPop = () => {
      const s = navRef.current;
      if (s.nuevo) { setNuevo(false); }
      else if (s.selId && s.sub && s.sub !== 'dash') { setSub('dash'); }
      else if (s.selId) { setSelId(null); }
      setMenuId(null); setErr('');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const irNuevo = () => { setErr(''); pushNav(); setNuevo(true); };
  const irSub = (s) => { pushNav(); setSub(s); };

  const nextCodigo = () => {
    let mx = 0;
    pacientes.forEach(p => { const m = /NF-(\d+)/.exec(p.codigo || ''); if (m) mx = Math.max(mx, +m[1]); });
    return 'NF-' + String(mx + 1).padStart(4, '0');
  };

  const derivar = (h) => {
    const d = (h && h.datos) || {};
    return {
      nombre: (d.nombre || '').trim(), edad: d.edad || '', sexo: d.sexo || 'Femenino',
      estatura: d.talla || '', objetivo: d.objetivo || '', correo: (d.correo || '').trim().toLowerCase(),
    };
  };

  const guardarHistoriaNueva = async (h) => {
    const der = derivar(h);
    if (!der.nombre) { setErr('Escribe el nombre en "Datos generales".'); throw new Error('sin nombre'); }
    const ref = await addDoc(collection(db, 'pacientes'), {
      codigo: (h.datos && h.datos.pacienteNo) || nextCodigo(), ...der, contacto: '',
      historia: h, inicio: hoyISO(), mediciones: [], planes: [], creado: Date.now(),
    });
    setNuevo(false); setErr(''); setSelId(ref.id); setSub('dash');
  };

  const guardarHistoriaExistente = async (h) => {
    const der = derivar(h);
    await updateDoc(doc(db, 'pacientes', sel.id), { ...der, historia: h });
    setErr('');
  };

  const abrir = (id) => { pushNav(); setSelId(id); setSub('dash'); setInbody(null); setMenuId(null); };

  const eliminar = async (p) => {
    setMenuId(null);
    const ok = window.confirm(
      '¿Eliminar a ' + (p.nombre || 'este paciente') + '?\n\n' +
      'Se borrará su expediente, mediciones, planes e historia clínica de forma permanente. ' +
      'Los archivos que ya estén en Google Drive NO se eliminan.'
    );
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'pacientes', p.id));
      if (selId === p.id) { setSelId(null); setSub('dash'); }
      setErr('');
    } catch (e) { setErr('No se pudo eliminar: ' + e.message); }
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

  const addReco = async () => {
    const t = recoTexto.trim();
    if (!t) { setErr('Escribe la recomendación.'); return; }
    const arr = [...(sel.recomendaciones || []), { texto: t, fecha: Date.now() }];
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), { recomendaciones: arr });
      setRecoTexto(''); setErr('');
    } catch (e) { setErr('No se pudo guardar la recomendación: ' + e.message); }
  };

  const removeReco = async (i) => {
    if (!window.confirm('¿Eliminar esta recomendación?')) return;
    const arr = (sel.recomendaciones || []).filter((_, k) => k !== i);
    try { await updateDoc(doc(db, 'pacientes', sel.id), { recomendaciones: arr }); } catch (e) { setErr(e.message); }
  };

  const guardarInBody = async () => {
    const peso = parseFloat(ib.peso);
    if (!isFinite(peso)) { setErr('El peso es necesario para registrar el InBody.'); return; }
    setIbBusy(true);
    const nm = {
      fecha: ib.fecha || hoyISO(),
      peso,
      grasa: parseFloat(ib.grasa) || 0,
      musculo: parseFloat(ib.mme) || 0,
      grasaKg: parseFloat(ib.grasaKg) || 0,
      visceral: parseFloat(ib.visceral) || 0,
      agua: parseFloat(ib.agua) || 0,
    };
    const arr = [...(sel.mediciones || []), nm].sort((a, b) => a.fecha.localeCompare(b.fecha));
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), { mediciones: arr });
      // Respaldo del PDF en Drive (carpeta "InBody" del paciente). Es secundario.
      if (ibFile) {
        try {
          const b64 = await fileToBase64(ibFile);
          const url = process.env.REACT_APP_APPSCRIPT_URL;
          if (url) await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'saveInBody', patient: sel.nombre, filename: 'InBody_' + (sel.codigo || '') + '_' + nm.fecha + '.pdf', pdfBase64: b64 }),
            redirect: 'follow',
          });
        } catch (e) { /* el respaldo en Drive es secundario; la medición ya quedó guardada */ }
      }
      setIb({ fecha: hoyISO(), peso: '', grasa: '', mme: '', grasaKg: '', visceral: '', agua: '' });
      setIbFile(null); setErr('');
    } catch (e) { setErr('No se pudo guardar el InBody: ' + e.message); }
    setIbBusy(false);
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
    irSub('plan');
  };

  const S = styles;

  /* ----- VISTA: historia clínica (alta de paciente nuevo) ----- */
  if (nuevo) {
    return <HistoriaClinica codigo={nextCodigo()} onSave={guardarHistoriaNueva} onBack={volver} />;
  }
  /* ----- VISTA: historia clínica de un paciente existente ----- */
  if (sel && sub === 'historia') {
    return <HistoriaClinica initial={sel.historia} codigo={sel.codigo} onSave={guardarHistoriaExistente} onBack={volver} />;
  }

  /* ----- VISTA: dashboard de un paciente ----- */
  if (sel) {
    const m = last(sel.mediciones);
    if (sub === 'plan') {
      const pdata = inbody
        ? { peso: inbody.peso || (m ? m.peso : ''), talla: sel.estatura || '', edad: sel.edad || '', sexo: sel.sexo || 'Femenino', grasa: inbody.grasa || (m ? m.grasa : ''), tmb: inbody.tmb || '' }
        : { peso: m ? m.peso : '', talla: sel.estatura || '', edad: sel.edad || '', sexo: sel.sexo || 'Femenino', grasa: m ? m.grasa : '', tmb: (m && m.tmb) || '' };
      return <Plan patient={sel} pdata={pdata} onBack={volver} />;
    }
    if (sub === 'menus') {
      return <Menus patient={sel} onBack={volver} />;
    }
    return (
      <div>
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

        <div style={S.metricGrid}>
          <div style={S.metric}><div style={S.metricLbl}>Peso actual</div><div style={S.metricVal}>{m ? m.peso : '—'}<span style={S.metricUnit}> kg</span></div></div>
          <div style={S.metric}><div style={S.metricLbl}>% de grasa</div><div style={S.metricVal}>{m ? m.grasa : '—'}<span style={S.metricUnit}> %</span></div></div>
          <div style={S.metric}><div style={S.metricLbl}>Masa muscular</div><div style={S.metricVal}>{m ? m.musculo : '—'}<span style={S.metricUnit}> kg</span></div></div>
        </div>

        <div className="card">
          <div className="card-title">Información general</div>
          <div style={S.infoGrid}>
            <Info l="Edad" v={sel.edad ? sel.edad + ' años' : '—'} />
            <Info l="Sexo" v={sel.sexo || '—'} />
            <Info l="Estatura" v={sel.estatura ? sel.estatura + ' cm' : '—'} />
            <Info l="Inicio" v={sel.inicio ? fmtFecha(sel.inicio) : '—'} />
            <Info l="Contacto" v={sel.contacto || '—'} />
            <Info l="Objetivo" v={sel.objetivo || '—'} />
          </div>
        </div>

        <CorreoVinculo patient={sel} key={'cv-' + sel.id} />

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
            <ChartCard title="Masa grasa" unit=" kg" valor={m ? m.grasaKg : null}><Linea data={sel.mediciones} field="grasaKg" color="#B0593F" unit="" /></ChartCard>
            <ChartCard title="Grasa visceral" unit="" valor={m ? m.visceral : null}><Linea data={sel.mediciones} field="visceral" color="#36302B" unit="" /></ChartCard>
            <ChartCard title="Agua corporal total" unit=" L" valor={m ? m.agua : null}><Linea data={sel.mediciones} field="agua" color="#5B7C99" unit="" /></ChartCard>
          </div>
        </div>

        <div style={S.panelGrid}>
          {/* Historial clínico */}
          <div className="card" style={panel === 'historia' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'historia' ? null : 'historia')}>
              <span style={S.panelTitle}>Historial clínico</span>
              <span style={panel === 'historia' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'historia' && (
              <div style={S.panelBody}>
                <div style={S.titleRow}>
                  <div style={S.note}>Datos generales, bioquímica, suplementación, síntomas, antecedentes, historia dietética y ejercicio.</div>
                  <button style={S.smallBtn} onClick={() => irSub('historia')}>Ver / editar</button>
                </div>
                {sel.historia
                  ? <div style={{ fontSize: 13, color: 'var(--dark)' }}>Historia clínica registrada.</div>
                  : <div className="empty-state">Aún no hay historia clínica.</div>}
              </div>
            )}
          </div>

          {/* InBody */}
          <div className="card" style={panel === 'inbody' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'inbody' ? null : 'inbody')}>
              <span style={S.panelTitle}>InBody</span>
              <span style={panel === 'inbody' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'inbody' && (
              <div style={S.panelBody}>
                <div style={S.note}>Sube el PDF del InBody (se respalda en Drive) y captura los valores del estudio. Estos datos alimentan las gráficas de seguimiento.</div>
                <label style={S.upload}>
                  <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => setIbFile(e.target.files && e.target.files[0])} />
                  {ibFile ? ('PDF seleccionado: ' + ibFile.name) : 'Seleccionar PDF del InBody'}
                </label>
                <div style={S.formRow}>
                  <Field l="Fecha del test"><input type="date" style={S.inp} value={ib.fecha} onChange={e => setIb({ ...ib, fecha: e.target.value })} /></Field>
                  <Field l="Peso (kg)"><input style={S.inp} inputMode="decimal" value={ib.peso} onChange={e => setIb({ ...ib, peso: e.target.value })} placeholder="74.0" /></Field>
                  <Field l="% de grasa"><input style={S.inp} inputMode="decimal" value={ib.grasa} onChange={e => setIb({ ...ib, grasa: e.target.value })} placeholder="18.2" /></Field>
                  <Field l="Masa muscular (kg)"><input style={S.inp} inputMode="decimal" value={ib.mme} onChange={e => setIb({ ...ib, mme: e.target.value })} placeholder="34.5" /></Field>
                  <Field l="Masa grasa corporal (kg)"><input style={S.inp} inputMode="decimal" value={ib.grasaKg} onChange={e => setIb({ ...ib, grasaKg: e.target.value })} placeholder="13.4" /></Field>
                  <Field l="Grasa visceral (nivel)"><input style={S.inp} inputMode="decimal" value={ib.visceral} onChange={e => setIb({ ...ib, visceral: e.target.value })} placeholder="7" /></Field>
                  <Field l="Agua corporal total (L)"><input style={S.inp} inputMode="decimal" value={ib.agua} onChange={e => setIb({ ...ib, agua: e.target.value })} placeholder="38.5" /></Field>
                </div>
                <button style={{ ...S.saveBtn, marginTop: 10 }} onClick={guardarInBody} disabled={ibBusy}>{ibBusy ? 'Guardando…' : 'Guardar InBody'}</button>
              </div>
            )}
          </div>

          {/* Recomendaciones */}
          <div className="card" style={panel === 'reco' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'reco' ? null : 'reco')}>
              <span style={S.panelTitle}>Recomendaciones</span>
              <span style={panel === 'reco' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'reco' && (
              <div style={S.panelBody}>
                <div style={S.note}>Notas de bitácora para el paciente. Se guardan con la fecha y hora en que las publicas, y el paciente las verá en su sección "Recomendaciones".</div>
                <div style={{ marginBottom: 12 }}>
                  <textarea style={S.recoArea} rows={3} value={recoTexto} onChange={e => setRecoTexto(e.target.value)}
                    placeholder="Escribe una recomendación para el paciente…" />
                  <button style={{ ...S.saveBtn, marginTop: 8 }} onClick={addReco}>+ Agregar recomendación</button>
                </div>
                {(!sel.recomendaciones || sel.recomendaciones.length === 0)
                  ? <div className="empty-state">Aún no hay recomendaciones.</div>
                  : [...sel.recomendaciones].map((r, idx) => ({ r, idx })).reverse().map(({ r, idx }) => (
                    <div key={idx} style={S.recoItem}>
                      <div style={{ flex: 1 }}>
                        <div style={S.recoDate}>{fmtSello(r.fecha)}</div>
                        <div style={S.recoText}>{r.texto}</div>
                      </div>
                      <button style={S.rm} onClick={() => removeReco(idx)} title="Eliminar">×</button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Plan nutricional */}
          <div className="card" style={panel === 'plan' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'plan' ? null : 'plan')}>
              <span style={S.panelTitle}>Plan nutricional</span>
              <span style={panel === 'plan' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'plan' && (
              <div style={S.panelBody}>
                <div style={S.titleRow}>
                  <div style={S.note}>Calcula los equivalentes (SMAE) y los macros del plan a partir de los datos del paciente.</div>
                  <button style={S.smallBtn} onClick={() => setInbodyOpen(true)}>Abrir cálculo</button>
                </div>
                {sel.plan && sel.plan.totales
                  ? <div style={{ fontSize: 13, color: 'var(--dark)' }}>Plan guardado: <b>{sel.plan.totales.kcal} kcal</b> · {fmtFecha(sel.plan.fecha)}</div>
                  : <div className="empty-state">Aún no hay cálculo de plan.</div>}
              </div>
            )}
          </div>

          {/* Menús */}
          <div className="card" style={panel === 'menus' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'menus' ? null : 'menus')}>
              <span style={S.panelTitle}>Menús por tiempo de comida</span>
              <span style={panel === 'menus' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'menus' && (
              <div style={S.panelBody}>
                <div style={S.titleRow}>
                  <div style={S.note}>Reparte los equivalentes del plan en los tiempos de comida y arma las opciones de menú.</div>
                  <button style={S.smallBtn} onClick={() => irSub('menus')}>Abrir menús</button>
                </div>
                {!(sel.plan && sel.plan.eq)
                  ? <div className="empty-state">Primero calcula y guarda el plan.</div>
                  : (sel.plan.menus && sel.plan.menus.tiempos
                    ? <div style={{ fontSize: 13, color: 'var(--dark)' }}>{sel.plan.menus.tiempos.length} tiempos de comida configurados.</div>
                    : <div className="empty-state">Aún no hay menús generados.</div>)}
              </div>
            )}
          </div>

          {/* Planes */}
          <div className="card" style={panel === 'planes' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'planes' ? null : 'planes')}>
              <span style={S.panelTitle}>Planes</span>
              <span style={panel === 'planes' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'planes' && (
              <div style={S.panelBody}>
                <div style={S.titleRow}>
                  <div style={S.note}>El reporte (PDF) se guarda en Google Drive y aquí se registra su enlace.</div>
                  <button style={S.smallBtn} onClick={() => setOpenPlan(v => !v)}>{openPlan ? 'Cancelar' : '+ Plan'}</button>
                </div>
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
            )}
          </div>
        </div>

        <button style={{ ...S.back, marginTop: 16, marginBottom: 0 }} onClick={volver}>← Atrás</button>

        {inbodyOpen && (
          <InBodyModal
            patient={sel}
            onClose={() => setInbodyOpen(false)}
            onDesdeCero={() => { setInbody(null); setInbodyOpen(false); irSub('plan'); }}
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input style={S.search} value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar paciente…" />
          <button style={S.smallBtn} onClick={irNuevo}>+ Nuevo paciente</button>
        </div>
      </div>
      {err && <div style={S.err}>{err}</div>}

      <div className="card">
        {(() => {
          const q = busca.trim().toLowerCase();
          const filtrados = q
            ? pacientes.filter(p => (p.nombre || '').toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q))
            : pacientes;
          return (
            <>
              <div className="card-title">Mis pacientes ({filtrados.length})</div>
              {pacientes.length === 0
                ? <div className="empty-state">No hay pacientes registrados aún. Usa “+ Nuevo paciente”.</div>
                : filtrados.length === 0
                  ? <div className="empty-state">No se encontraron pacientes con “{busca}”.</div>
                  : filtrados.map(p => {
                    const m = last(p.mediciones);
                    return (
                      <div className="pac-item" key={p.id} style={{ position: 'relative' }}
                        onClick={() => abrir(p.id)}>
                        <div className="pac-avatar">{initials(p.nombre)}</div>
                        <div style={{ flex: 1 }}>
                          <div className="pac-nombre">{p.nombre}</div>
                          <div className="pac-detalle">{p.codigo} · {p.objetivo || 'sin objetivo'}</div>
                        </div>
                        <div className="pac-citas">{m ? m.peso + ' kg' : '—'}</div>
                        <button style={S.kebab} title="Opciones rápidas"
                          onClick={(e) => { e.stopPropagation(); setMenuId(menuId === p.id ? null : p.id); }}>⋮</button>
                        {menuId === p.id && (
                          <>
                            <div style={S.menuOverlay} onClick={(e) => { e.stopPropagation(); setMenuId(null); }} />
                            <div style={S.menu} onClick={(e) => e.stopPropagation()}>
                              <button style={S.menuItem} onClick={() => abrir(p.id)}>Ver paciente</button>
                              <button style={{ ...S.menuItem, color: '#B0593F' }} onClick={() => eliminar(p)}>Eliminar</button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
              }
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* ===== piezas pequeñas ===== */
function Info({ l, v }) {
  return <div style={styles.infoCell}><div style={styles.infoLbl}>{l}</div><div style={styles.infoVal}>{v}</div></div>;
}

function CorreoVinculo({ patient }) {
  const [v, setV] = useState(patient.correo || '');
  const [st, setSt] = useState('');
  const save = async () => {
    setSt('Guardando…');
    try { await updateDoc(doc(db, 'pacientes', patient.id), { correo: v.trim().toLowerCase() }); setSt('Vínculo guardado ✓'); }
    catch (e) { setSt('Error: ' + e.message); }
  };
  return (
    <div className="card">
      <div className="card-title">Vínculo con la cuenta del paciente</div>
      <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 10, lineHeight: 1.5 }}>
        El paciente verá su plan al iniciar sesión con este correo (debe ser el mismo de su cuenta de Google).
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ ...styles.inp, flex: 1, minWidth: 200 }} value={v} onChange={e => setV(e.target.value)} placeholder="correo@gmail.com" />
        <button style={styles.smallBtn} onClick={save}>Guardar correo</button>
      </div>
      {st && <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 8 }}>{st}</div>}
    </div>
  );
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
  back: { background: '#fff', border: '0.5px solid var(--border)', color: 'var(--dark)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 14px', borderRadius: 8, marginBottom: 14 },
  err: { background: '#fef0f0', color: '#c0392b', fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 12 },
  headRow: { display: 'flex', alignItems: 'center', gap: 12 },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  infoCell: { background: 'var(--cream)', borderRadius: 10, padding: '9px 11px' },
  infoLbl: { fontSize: 9.5, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600, marginBottom: 3 },
  infoVal: { fontSize: 13, color: 'var(--dark)', fontWeight: 600 },
  chartGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 },
  metric: { background: '#fff', border: '0.5px solid var(--border)', borderRadius: 14, padding: '14px 16px' },
  metricLbl: { fontSize: 11, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 },
  metricVal: { fontSize: 26, fontWeight: 800, color: 'var(--dark)', marginTop: 4, lineHeight: 1.1 },
  metricUnit: { fontSize: 12, fontWeight: 600, color: 'var(--stone)' },
  recoArea: { width: '100%', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', resize: 'vertical', boxSizing: 'border-box' },
  recoItem: { display: 'flex', alignItems: 'flex-start', gap: 10, border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, background: 'var(--cream)' },
  recoDate: { fontSize: 10.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 },
  recoText: { fontSize: 13, color: 'var(--dark)', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  panelGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'start' },
  panel: { padding: 0, overflow: 'hidden' },
  panelOpen: { padding: 0, overflow: 'hidden', gridColumn: '1 / -1' },
  panelHead: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: '16px 16px', textAlign: 'left' },
  panelTitle: { fontSize: 14, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.3 },
  chev: { color: 'var(--stone)', fontSize: 16, transition: 'transform .15s', flexShrink: 0 },
  chevOpen: { color: 'var(--gold)', fontSize: 16, transform: 'rotate(180deg)', flexShrink: 0 },
  panelBody: { padding: '0 16px 16px' },
  upload: { display: 'block', textAlign: 'center', background: 'var(--cream)', border: '1px dashed var(--gold)', borderRadius: 10, padding: '14px', fontSize: 13, fontWeight: 600, color: 'var(--dark)', cursor: 'pointer', marginBottom: 12 },
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
  search: { flex: '1 1 160px', minWidth: 150, maxWidth: 260, background: '#fff', color: 'var(--dark)', border: '0.5px solid var(--border)', padding: '7px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)', boxSizing: 'border-box' },
  kebab: { flexShrink: 0, width: 34, height: 34, marginLeft: 8, borderRadius: '50%', border: '0.5px solid var(--border)', background: '#fff', color: 'var(--stone)', fontSize: 18, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  menuOverlay: { position: 'fixed', inset: 0, zIndex: 25, background: 'transparent' },
  menu: { position: 'absolute', top: 46, right: 10, zIndex: 30, background: '#fff', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 30px rgba(33,28,23,0.18)', padding: 5, minWidth: 150 },
  menuItem: { display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '9px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600, color: 'var(--dark)', cursor: 'pointer', fontFamily: 'var(--font)' },
  note: { fontSize: 11.5, color: 'var(--stone)', marginBottom: 12, lineHeight: 1.5 },
  planRow: { display: 'flex', alignItems: 'center', gap: 12, border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 },
  planIcon: { width: 36, height: 36, borderRadius: 8, background: 'var(--dark)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 },
  openBtn: { background: 'var(--gold)', color: '#fff', textDecoration: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  rm: { background: 'transparent', border: 'none', color: 'var(--stone)', fontSize: 19, cursor: 'pointer', lineHeight: 1, padding: '0 4px' },
};
