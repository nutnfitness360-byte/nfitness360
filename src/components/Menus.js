import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { buildReportHTML } from '../report/reporteHTML';

/* ============================================================
   NFITNESS 360 — Menús por tiempo de comida
   Capa 1: distribución automática (editable) + 3 opciones por
   tiempo + recuadro de imagen. La generación con IA (Capa 2)
   queda lista para enchufar en `generarIA`.
   ============================================================ */

const T = {
  bg: '#EEE4DA', surface: '#FFFFFF', ink: '#36302B', inkSoft: '#978C87',
  line: '#E3D8CC', lineSoft: '#EFE7DD', pine: '#211C17', amber: '#CDA788',
  mint: '#F4EBDF', danger: '#B0593F', sage: '#9AB9AD',
};
const mono = "'Montserrat', system-ui, sans-serif";

const GRUPOS = [
  ['Cereales y tubérculos', 70, 2, 0, 15], ['Cereales con grasa', 115, 2, 5, 15],
  ['Leguminosas', 120, 8, 1, 20], ['Verdura', 25, 2, 0, 4], ['Fruta', 60, 0, 0, 15],
  ['Prod. animales · muy bajo en grasa', 40, 7, 1, 0], ['Prod. animales · bajo en grasa', 55, 7, 3, 0],
  ['Prod. animales · moderado en grasa', 75, 7, 5, 0], ['Prod. animales · alto en grasa', 100, 7, 8, 0],
  ['Leche descremada', 95, 9, 2, 12], ['Leche semidescremada', 110, 9, 4, 12], ['Leche entera', 150, 9, 8, 12],
  ['Leche con azúcar', 200, 8, 5, 30], ['Grasas', 45, 0, 5, 0], ['Grasas con proteína', 70, 3, 5, 3],
  ['Azúcares', 40, 0, 0, 10], ['Azúcares con grasa', 85, 0, 5, 10], ['Alimentos libres', 0, 0, 0, 0],
];
const GSHORT = ['Cereales', 'Cereales c/grasa', 'Leguminosas', 'Verdura', 'Fruta', 'P. animal MB', 'P. animal B', 'P. animal M', 'P. animal A', 'Leche desc.', 'Leche semi', 'Leche entera', 'Leche c/az.', 'Grasas', 'Grasas c/prot', 'Azúcares', 'Az. c/grasa', 'Libres'];

/* pesos por grupo hacia [Desayuno, Col AM, Comida, Col PM, Cena] */
const GW = [
  [.30, .10, .30, .05, .25], [.30, .10, .30, .05, .25], [0, 0, .6, 0, .4], [0, 0, .5, 0, .5],
  [.30, .35, 0, .35, 0], [.2, 0, .4, 0, .4], [.2, 0, .4, 0, .4], [.2, 0, .4, 0, .4], [.2, 0, .4, 0, .4],
  [.5, .25, 0, .25, 0], [.5, .25, 0, .25, 0], [.5, .25, 0, .25, 0], [.5, .25, 0, .25, 0],
  [.3, 0, .35, 0, .35], [.3, 0, .35, 0, .35], [.5, .5, 0, 0, 0], [.5, .5, 0, 0, 0], [.2, .2, .2, .2, .2],
];
const DEFAULT_TIEMPOS = [
  { nombre: 'Desayuno', hora: '07:00' }, { nombre: 'Colación AM', hora: '10:30' },
  { nombre: 'Comida', hora: '14:30' }, { nombre: 'Colación PM', hora: '18:00' }, { nombre: 'Cena', hora: '21:00' },
];

const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const r0 = (n) => Math.round(n);
const uid = () => Math.random().toString(36).slice(2, 9);

function distribuir(eqArr, nMeals) {
  const meals = Array.from({ length: nMeals }, () => Array(18).fill(0));
  for (let g = 0; g < 18; g++) {
    const total = r0(num(eqArr[g]));
    if (!total) continue;
    let w = [];
    for (let m = 0; m < nMeals; m++) w.push(GW[g] && GW[g][m] != null ? GW[g][m] : 0);
    let sw = w.reduce((a, b) => a + b, 0);
    if (sw <= 0) { meals[Math.min(2, nMeals - 1)][g] = total; continue; }
    w = w.map(x => x / sw);
    const raw = w.map(x => x * total);
    const fl = raw.map(Math.floor);
    let rem = total - fl.reduce((a, b) => a + b, 0);
    const order = raw.map((x, i) => [i, x - Math.floor(x)]).sort((a, b) => b[1] - a[1]);
    for (let k = 0; k < rem; k++) fl[order[k % order.length][0]]++;
    for (let m = 0; m < nMeals; m++) meals[m][g] = fl[m];
  }
  return meals;
}

function compressImage(file, maxW = 620, quality = 0.5) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject; img.src = reader.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

const nuevaOpcion = () => ({ nombre: '', prep: '' });
function nuevoTiempo(def, eqRow) {
  return { id: uid(), nombre: def?.nombre || 'Nuevo tiempo', hora: def?.hora || '12:00', eq: eqRow || Array(18).fill(0), opciones: [nuevaOpcion(), nuevaOpcion(), nuevaOpcion()], foto: '' };
}

export default function Menus({ patient, onBack }) {
  const plan = patient.plan || {};
  const planEq = Array.isArray(plan.eq) ? plan.eq.map(num) : null;
  const usados = planEq ? planEq.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0) : [];

  const [tiempos, setTiempos] = useState(() => {
    const saved = plan.menus && Array.isArray(plan.menus.tiempos) ? plan.menus.tiempos : null;
    if (saved && saved.length) return saved.map(t => ({ ...t, eq: Array.isArray(t.eq) ? t.eq : Array(18).fill(0), opciones: t.opciones || [nuevaOpcion(), nuevaOpcion(), nuevaOpcion()] }));
    if (!planEq) return [];
    const dist = distribuir(planEq, DEFAULT_TIEMPOS.length);
    return DEFAULT_TIEMPOS.map((d, m) => nuevoTiempo(d, dist[m]));
  });
  const [status, setStatus] = useState(plan.menus ? 'guardado' : 'nuevo');
  const [rep, setRep] = useState('');

  const touch = () => setStatus('nuevo');
  const setT = (idx, patch) => { setTiempos(ts => ts.map((t, i) => i === idx ? { ...t, ...patch } : t)); touch(); };
  const setEqCell = (idx, g, v) => setT(idx, { eq: tiempos[idx].eq.map((x, k) => k === g ? r0(num(v)) : x) });
  const setOpcion = (idx, oi, patch) => setT(idx, { opciones: tiempos[idx].opciones.map((o, k) => k === oi ? { ...o, ...patch } : o) });

  const redistribuir = () => {
    if (!planEq) return;
    const dist = distribuir(planEq, tiempos.length);
    setTiempos(ts => ts.map((t, m) => ({ ...t, eq: dist[m] }))); touch();
  };
  const addTiempo = () => { setTiempos(ts => [...ts, nuevoTiempo({ nombre: 'Nuevo tiempo', hora: '12:00' }, Array(18).fill(0))]); touch(); };
  const delTiempo = (idx) => { setTiempos(ts => ts.filter((_, i) => i !== idx)); touch(); };

  const onFoto = async (idx, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try { const data = await compressImage(file); setT(idx, { foto: data }); }
    catch (_) { setStatus('error'); }
  };

  const generarIA = () => { /* CAPA 2: aquí se conecta Sonnet 4.6 para rellenar opciones. */ };

  const guardar = async () => {
    setStatus('guardando');
    try { await updateDoc(doc(db, 'pacientes', patient.id), { 'plan.menus': { tiempos } }); setStatus('guardado'); }
    catch (e) { setStatus('error'); }
  };

  const generarReporte = async () => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRep('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    setRep('Guardando menús y generando reporte…');
    try {
      await updateDoc(doc(db, 'pacientes', patient.id), { 'plan.menus': { tiempos } });
      setStatus('guardado');
      const html = buildReportHTML({ nombre: patient.nombre, objetivo: patient.objetivo, plan: patient.plan, tiempos });
      const fechaTxt = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
      const filename = 'Plan nutricional ' + String(patient.nombre || 'paciente').trim() + ' ' + fechaTxt + '.pdf';
      setRep('Subiendo a Drive…');
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'savePlan', patient: patient.nombre, correo: (patient.correo || ''), filename, html }), redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (data.ok && data.link) {
        const nuevo = { nombre: 'Plan nutricional ' + String(patient.nombre || 'paciente').trim() + ' ' + fechaTxt, fecha: new Date().toISOString().slice(0, 10), link: data.link };
        await updateDoc(doc(db, 'pacientes', patient.id), { planes: [...(patient.planes || []), nuevo] });
        setRep('Reporte subido a Drive y registrado en Planes ✓');
      } else { setRep('Error: ' + (data.error || 'no se recibió enlace.')); }
    } catch (e) { setRep('No se pudo generar/subir: ' + e.message); }
  };

  // balance: suma por grupo de todos los tiempos vs total del plan
  const sumaPorGrupo = (g) => tiempos.reduce((a, t) => a + num(t.eq[g]), 0);
  const cuadra = planEq ? usados.every(g => sumaPorGrupo(g) === r0(planEq[g])) : false;

  const S = styles;

  if (!planEq || usados.length === 0) {
    return (
      <div style={S.root}>
        <style>{css}</style>
        <button style={S.back} onClick={onBack}>← {patient.nombre}</button>
        <div style={S.empty}>
          Primero <b>calcula y guarda el plan</b> (sección "Plan nutricional"). Los menús se arman a partir de los equivalentes del plan.
        </div>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <style>{css}</style>
      <button style={S.back} onClick={onBack}>← {patient.nombre}</button>
      <div style={S.titleRow}>
        <div style={{ flex: 1 }}>
          <div style={S.eyebrow}>Plan nutricional</div>
          <h1 style={S.h1}>Menús por tiempo de comida</h1>
        </div>
        <span style={{ ...S.balance, ...(cuadra ? S.balOk : S.balBad) }}>{cuadra ? 'Equivalentes cuadran ✓' : 'Revisar reparto'}</span>
      </div>

      <div style={S.toolbar}>
        <button style={S.toolBtn} onClick={redistribuir}>Redistribuir equivalentes</button>
        <button style={{ ...S.toolBtn, ...S.iaBtn }} onClick={generarIA} disabled title="Disponible al conectar la IA (Capa 2)">Generar menús con IA ✦</button>
      </div>
      <div style={S.iaNote}>La generación automática de los platillos con IA se activa al conectar la API (Sonnet 4.6). Por ahora puedes escribir las opciones a mano; el reparto de equivalentes ya es automático.</div>

      {tiempos.map((t, idx) => {
        const en = t.eq.reduce((a, _, g) => ({
          kcal: a.kcal + num(t.eq[g]) * GRUPOS[g][1], prot: a.prot + num(t.eq[g]) * GRUPOS[g][2],
          lip: a.lip + num(t.eq[g]) * GRUPOS[g][3], hc: a.hc + num(t.eq[g]) * GRUPOS[g][4],
        }), { kcal: 0, prot: 0, lip: 0, hc: 0 });
        return (
          <div key={t.id} style={S.card}>
            <div style={S.mealHead}>
              <input style={S.mealName} value={t.nombre} onChange={e => setT(idx, { nombre: e.target.value })} />
              <input style={S.mealHora} value={t.hora} onChange={e => setT(idx, { hora: e.target.value })} />
              <div style={S.mealKcal}>{r0(en.kcal)} kcal · {r0(en.prot)}P {r0(en.lip)}L {r0(en.hc)}HC</div>
              {tiempos.length > 1 && <button style={S.del} onClick={() => delTiempo(idx)} title="Quitar tiempo">×</button>}
            </div>

            <div style={S.eqLabel}>Equivalentes de este tiempo</div>
            <div style={S.eqGrid}>
              {usados.map(g => (
                <label key={g} style={S.eqItem}>
                  <span style={S.eqName}>{GSHORT[g]}</span>
                  <input style={S.eqInput} inputMode="numeric" value={t.eq[g]} onChange={e => setEqCell(idx, g, e.target.value)} />
                </label>
              ))}
            </div>

            <div style={S.optsRow}>
              <div style={{ flex: 1 }}>
                {t.opciones.map((o, oi) => (
                  <div key={oi} style={S.opt}>
                    <div style={S.optTag}>Opción {oi + 1}</div>
                    <input style={S.optName} placeholder="Nombre del platillo" value={o.nombre} onChange={e => setOpcion(idx, oi, { nombre: e.target.value })} />
                    <textarea style={S.optPrep} rows={2} placeholder="Preparación y gramajes" value={o.prep} onChange={e => setOpcion(idx, oi, { prep: e.target.value })} />
                  </div>
                ))}
              </div>
              <div style={S.photoCol}>
                <div style={S.photoLabel}>Foto ejemplo</div>
                {t.foto
                  ? <img src={t.foto} alt="" style={S.photo} />
                  : <div style={S.photoEmpty}>Sin foto</div>}
                <label style={S.photoBtn}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onFoto(idx, e)} />
                  {t.foto ? 'Cambiar' : 'Cargar imagen'}
                </label>
                {t.foto && <button style={S.photoRm} onClick={() => setT(idx, { foto: '' })}>Quitar</button>}
              </div>
            </div>
          </div>
        );
      })}

      <button style={S.addBtn} onClick={addTiempo}>+ Agregar tiempo de comida</button>

      <div style={S.actions}>
        <div style={S.footerInfo}>
          {rep || (status === 'guardado' && 'Menús guardados.') || (status === 'guardando' && 'Guardando…') || (status === 'error' && 'No se pudo guardar.') || (status === 'nuevo' && 'Cambios sin guardar.')}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={S.volverBtn} onClick={onBack}>← Atrás</button>
          <button style={S.reportBtn} className="nf-tpl2" onClick={generarReporte}>Generar reporte PDF</button>
          <button style={S.primaryBtn} className="nf-primary" onClick={guardar}>Guardar menús</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: { fontFamily: mono, color: T.ink },
  back: { background: 'transparent', border: 'none', color: T.inkSoft, fontFamily: mono, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 10 },
  titleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: T.amber, marginBottom: 4 },
  h1: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: T.ink },
  balance: { fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap' },
  balOk: { background: '#E9F1ED', color: '#3E6B5B' }, balBad: { background: '#F7EAE5', color: T.danger },
  toolbar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 },
  toolBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.amber}`, padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  iaBtn: { borderColor: T.line, color: T.inkSoft, cursor: 'not-allowed', background: '#FBF8F4' },
  iaNote: { fontSize: 12, color: T.inkSoft, background: T.mint, borderRadius: 9, padding: '9px 12px', marginBottom: 16, lineHeight: 1.5 },
  card: { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 },
  mealHead: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  mealName: { fontSize: 16, fontWeight: 800, color: T.pine, border: 'none', borderBottom: `1px solid ${T.line}`, padding: '2px 0', fontFamily: mono, background: 'transparent', flex: '1 1 140px', minWidth: 120 },
  mealHora: { width: 72, fontSize: 13, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 7, padding: '6px 8px', fontFamily: mono, background: '#FCFDFC' },
  mealKcal: { fontSize: 11.5, color: T.inkSoft, fontWeight: 600 },
  del: { background: 'transparent', border: 'none', color: T.inkSoft, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' },
  eqLabel: { fontSize: 10.5, fontWeight: 700, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  eqGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 8, marginBottom: 16 },
  eqItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#FBF8F4', border: `1px solid ${T.lineSoft}`, borderRadius: 8, padding: '5px 6px 5px 10px' },
  eqName: { fontSize: 11.5, color: T.ink, fontWeight: 500 },
  eqInput: { width: 42, textAlign: 'center', border: `1px solid ${T.line}`, borderRadius: 6, padding: '5px 3px', fontSize: 13, fontWeight: 700, color: T.pine, background: '#fff', fontFamily: mono },
  optsRow: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  opt: { border: `1px solid ${T.lineSoft}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 },
  optTag: { fontSize: 10, fontWeight: 800, color: T.amber, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  optName: { width: '100%', border: `1px solid ${T.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, fontWeight: 600, color: T.pine, fontFamily: mono, background: '#FCFDFC', marginBottom: 6, boxSizing: 'border-box' },
  optPrep: { width: '100%', border: `1px solid ${T.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 12.5, color: T.ink, fontFamily: mono, background: '#FCFDFC', resize: 'vertical', boxSizing: 'border-box' },
  photoCol: { width: 150, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  photoLabel: { fontSize: 10, fontWeight: 700, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4, alignSelf: 'flex-start' },
  photo: { width: 130, height: 130, objectFit: 'cover', borderRadius: '50%', border: `2px solid ${T.amber}` },
  photoEmpty: { width: 130, height: 130, borderRadius: '50%', border: `2px dashed ${T.line}`, display: 'grid', placeItems: 'center', color: T.inkSoft, fontSize: 11.5 },
  photoBtn: { background: T.amber, color: '#211C17', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  photoRm: { background: 'transparent', border: 'none', color: T.inkSoft, fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' },
  addBtn: { width: '100%', background: '#fff', border: `1px dashed ${T.amber}`, color: T.pine, borderRadius: 11, padding: '12px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: mono, marginBottom: 16 },
  actions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '2px 2px 8px' },
  footerInfo: { fontSize: 12.5, color: T.inkSoft },
  primaryBtn: { background: T.amber, color: '#211C17', border: 'none', padding: '12px 24px', borderRadius: 11, fontSize: 14.5, fontWeight: 800, cursor: 'pointer', fontFamily: mono },
  reportBtn: { background: T.pine, color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  volverBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.pine}`, padding: '12px 18px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  empty: { background: T.mint, border: `1px solid ${T.line}`, borderRadius: 12, padding: '18px', fontSize: 13.5, color: T.ink, lineHeight: 1.6 },
};

const css = `
.nf-primary:hover { background: #C0986F; }
input:focus, textarea:focus { outline: none; border-color: ${T.amber} !important; box-shadow: 0 0 0 3px rgba(205,167,136,0.25); }
`;
