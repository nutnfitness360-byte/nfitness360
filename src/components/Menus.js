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
const round2 = (n) => Math.round((num(n) + Number.EPSILON) * 100) / 100;
const fmt = (n) => String(round2(n)); // muestra decimales tal cual (2.5, 2, 0.6) sin redondear a entero
const uid = () => Math.random().toString(36).slice(2, 9);

function distribuir(eqArr, nMeals) {
  const meals = Array.from({ length: nMeals }, () => Array(18).fill(0));
  for (let g = 0; g < 18; g++) {
    const total = num(eqArr[g]); // sin redondear: respeta el decimal del plan
    if (!total) continue;
    let w = [];
    for (let m = 0; m < nMeals; m++) w.push(GW[g] && GW[g][m] != null ? GW[g][m] : 0);
    let sw = w.reduce((a, b) => a + b, 0);
    if (sw <= 0) { meals[Math.min(2, nMeals - 1)][g] = round2(total); continue; }
    w = w.map(x => x / sw);
    const half = w.map(x => Math.round(x * total * 2) / 2); // a 0.5 más cercano
    // El sobrante se carga al tiempo de mayor peso para que la suma == total del plan exacto.
    const diff = round2(total - half.reduce((a, b) => a + b, 0));
    if (diff !== 0) { let mi = 0; for (let m = 1; m < nMeals; m++) if (w[m] > w[mi]) mi = m; half[mi] = round2(half[mi] + diff); }
    for (let m = 0; m < nMeals; m++) meals[m][g] = half[m];
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
const opcionesArr = (n) => Array.from({ length: Math.max(1, n || 1) }, nuevaOpcion);
function nuevoTiempo(def, eqRow, nOp = 3) {
  return { id: uid(), nombre: def?.nombre || 'Nuevo tiempo', hora: def?.hora || '12:00', eq: eqRow || Array(18).fill(0), opciones: opcionesArr(nOp), foto: '' };
}

export default function Menus({ patient, onBack }) {
  const plan = patient.plan || {};
  const planEq = Array.isArray(plan.eq) ? plan.eq.map(num) : null;
  const usados = planEq ? planEq.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0) : [];

  const savedMenus = plan.menus && Array.isArray(plan.menus.tiempos) && plan.menus.tiempos.length ? plan.menus : null;
  const savedNOp = savedMenus ? (savedMenus.nOpciones || (savedMenus.tiempos[0]?.opciones?.length) || 3) : 3;

  const [tiempos, setTiempos] = useState(() => {
    if (savedMenus) return savedMenus.tiempos.map(t => ({ ...t, id: t.id || uid(), eq: Array.isArray(t.eq) ? t.eq : Array(18).fill(0), opciones: (t.opciones && t.opciones.length) ? t.opciones : opcionesArr(savedNOp) }));
    return []; // los menús nuevos se arman tras la ventana de configuración
  });
  const [nOpciones, setNOpciones] = useState(savedNOp);
  const [status, setStatus] = useState(savedMenus ? 'guardado' : 'nuevo');
  const [rep, setRep] = useState('');
  const [iaBusy, setIaBusy] = useState(false);
  const [opBusy, setOpBusy] = useState(''); // "idx:oi" de la opción que se está generando

  // Ventana de configuración: aparece al abrir menús cuando aún no hay configuración guardada.
  const [showCfg, setShowCfg] = useState(!savedMenus);
  const [cfgNOp, setCfgNOp] = useState(savedNOp);
  const [cfgTiempos, setCfgTiempos] = useState(() => savedMenus ? savedMenus.tiempos.map(t => ({ nombre: t.nombre, hora: t.hora })) : DEFAULT_TIEMPOS.map(d => ({ ...d })));

  const touch = () => setStatus('nuevo');
  const setT = (idx, patch) => { setTiempos(ts => ts.map((t, i) => i === idx ? { ...t, ...patch } : t)); touch(); };
  const setEqCell = (idx, g, v) => setT(idx, { eq: tiempos[idx].eq.map((x, k) => k === g ? String(v).replace(',', '.') : x) });
  const setOpcion = (idx, oi, patch) => setT(idx, { opciones: tiempos[idx].opciones.map((o, k) => k === oi ? { ...o, ...patch } : o) });

  const redistribuir = () => {
    if (!planEq) return;
    const dist = distribuir(planEq, tiempos.length);
    setTiempos(ts => ts.map((t, m) => ({ ...t, eq: dist[m] }))); touch();
  };
  const addTiempo = () => { setTiempos(ts => [...ts, nuevoTiempo({ nombre: 'Nuevo tiempo', hora: '12:00' }, Array(18).fill(0), nOpciones)]); touch(); };
  const delTiempo = (idx) => { setTiempos(ts => ts.filter((_, i) => i !== idx)); touch(); };

  // ── Configuración (ventana emergente): número de tiempos y de opciones ──
  const cfgSetN = (n) => {
    n = Math.max(1, Math.min(8, n));
    setCfgTiempos(ts => {
      const out = ts.slice(0, n);
      while (out.length < n) { const i = out.length; const d = DEFAULT_TIEMPOS[i] || { nombre: 'Tiempo ' + (i + 1), hora: '12:00' }; out.push({ ...d }); }
      return out;
    });
  };
  const cfgSetTiempo = (i, patch) => setCfgTiempos(ts => ts.map((t, k) => k === i ? { ...t, ...patch } : t));
  const aplicarConfig = () => {
    const nOp = Math.max(1, Math.min(6, cfgNOp));
    const defs = cfgTiempos;
    const dist = planEq ? distribuir(planEq, defs.length) : defs.map(() => Array(18).fill(0));
    setTiempos(defs.map((d, m) => nuevoTiempo(d, dist[m], nOp)));
    setNOpciones(nOp);
    setShowCfg(false); setStatus('nuevo'); setRep('');
  };

  const onFoto = async (idx, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try { const data = await compressImage(file); setT(idx, { foto: data }); }
    catch (_) { setStatus('error'); }
  };

  const generarIA = async () => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRep('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    if (!planEq) return;
    setIaBusy(true); setRep('Generando menús con IA… (puede tardar unos segundos)');
    try {
      const payloadTiempos = tiempos.map(t => {
        const en = t.eq.reduce((a, _, g) => ({
          kcal: a.kcal + num(t.eq[g]) * GRUPOS[g][1], prot: a.prot + num(t.eq[g]) * GRUPOS[g][2],
          lip: a.lip + num(t.eq[g]) * GRUPOS[g][3], hc: a.hc + num(t.eq[g]) * GRUPOS[g][4],
        }), { kcal: 0, prot: 0, lip: 0, hc: 0 });
        const equivalentes = t.eq.map((n, g) => ({ grupo: GRUPOS[g][0], n: round2(num(n)) })).filter(x => x.n > 0);
        return { nombre: t.nombre, hora: t.hora, equivalentes, objetivoMacros: { kcal: r0(en.kcal), prot: r0(en.prot), lip: r0(en.lip), hc: r0(en.hc) } };
      });
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'generarMenusIA', objetivo: patient.objetivo || '', totales: plan.totales || {}, tiempos: payloadTiempos, nOpciones }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (!data.ok || !Array.isArray(data.tiempos)) throw new Error(data.error || 'No se recibieron menús.');
      setTiempos(ts => ts.map((t, i) => {
        const r = data.tiempos[i];
        if (!r || !Array.isArray(r.opciones)) return t;
        const ops = r.opciones.slice(0, nOpciones).map(o => ({ nombre: (o && o.nombre) || '', prep: (o && o.prep) || '' }));
        while (ops.length < nOpciones) ops.push(nuevaOpcion());
        return { ...t, opciones: ops };
      }));
      setStatus('nuevo');
      setRep('Menús generados por IA. Revísalos y edítalos antes de guardar.');
    } catch (e) {
      setRep('No se pudo generar con IA: ' + e.message);
    }
    setIaBusy(false);
  };

  const generarOpcionIA = async (idx, oi) => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRep('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    const t = tiempos[idx];
    setOpBusy(idx + ':' + oi); setRep('Generando la opción ' + (oi + 1) + ' de ' + t.nombre + '…');
    try {
      const en = t.eq.reduce((a, _, g) => ({
        kcal: a.kcal + num(t.eq[g]) * GRUPOS[g][1], prot: a.prot + num(t.eq[g]) * GRUPOS[g][2],
        lip: a.lip + num(t.eq[g]) * GRUPOS[g][3], hc: a.hc + num(t.eq[g]) * GRUPOS[g][4],
      }), { kcal: 0, prot: 0, lip: 0, hc: 0 });
      const equivalentes = t.eq.map((n, g) => ({ grupo: GRUPOS[g][0], n: round2(num(n)) })).filter(x => x.n > 0);
      const payloadTiempos = [{ nombre: t.nombre, hora: t.hora, equivalentes, objetivoMacros: { kcal: r0(en.kcal), prot: r0(en.prot), lip: r0(en.lip), hc: r0(en.hc) } }];
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'generarMenusIA', objetivo: patient.objetivo || '', totales: plan.totales || {}, tiempos: payloadTiempos, nOpciones: 1 }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      const nueva = data && data.ok && Array.isArray(data.tiempos) && data.tiempos[0] && Array.isArray(data.tiempos[0].opciones) ? data.tiempos[0].opciones[0] : null;
      if (!nueva) throw new Error((data && data.error) || 'No se recibió la opción.');
      setOpcion(idx, oi, { nombre: nueva.nombre || '', prep: nueva.prep || '' });
      setRep('Opción ' + (oi + 1) + ' de ' + t.nombre + ' regenerada. Revísala antes de guardar.');
    } catch (e) {
      setRep('No se pudo generar la opción: ' + e.message);
    }
    setOpBusy('');
  };

  const guardarBorrador = async () => {
    setStatus('guardando'); setRep('Guardando borrador…');
    try {
      await updateDoc(doc(db, 'pacientes', patient.id), { 'plan.menus': { tiempos, nOpciones } });
      setStatus('guardado'); setRep('Borrador guardado ✓ (sin generar el reporte). Puedes salir y retomarlo después.');
    } catch (e) {
      setStatus('error'); setRep('No se pudo guardar el borrador: ' + e.message);
    }
  };

  const guardar = async () => {
    setStatus('guardando'); setRep('Guardando menús…');
    // 1) Guardar SIEMPRE los menús primero (un fallo del PDF no debe hacer perder el trabajo).
    try {
      await updateDoc(doc(db, 'pacientes', patient.id), { 'plan.menus': { tiempos, nOpciones } });
    } catch (e) {
      setStatus('error'); setRep('No se pudieron guardar los menús: ' + e.message); return;
    }
    setStatus('guardado');
    // 2) Generar el PDF, subirlo a Drive y registrarlo en "Planes".
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRep('Menús guardados ✓ (no se generó PDF: falta REACT_APP_APPSCRIPT_URL).'); return; }
    try {
      setRep('Generando y subiendo el PDF a Drive…');
      const html = buildReportHTML({ nombre: patient.nombre, objetivo: patient.objetivo, plan: patient.plan, tiempos });
      const fechaTxt = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
      const baseNombre = 'Plan nutricional ' + String(patient.nombre || 'paciente').trim() + ' ' + fechaTxt;
      const filename = baseNombre + '.pdf';
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'savePlan', patient: patient.nombre, correo: (patient.correo || ''), filename, html }), redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (data.ok && data.link) {
        const nuevo = { nombre: baseNombre, fecha: new Date().toISOString().slice(0, 10), link: data.link };
        await updateDoc(doc(db, 'pacientes', patient.id), { planes: [...(patient.planes || []), nuevo] });
        setRep('Menús guardados y reporte subido a Drive (registrado en Planes) ✓');
      } else {
        setRep('Menús guardados ✓, pero el PDF no se pudo subir: ' + (data.error || 'no se recibió enlace.'));
      }
    } catch (e) {
      setRep('Menús guardados ✓, pero falló el PDF: ' + e.message);
    }
  };

  // balance: suma por grupo de todos los tiempos vs total del plan (con decimales)
  const sumaPorGrupo = (g) => round2(tiempos.reduce((a, t) => a + num(t.eq[g]), 0));
  const cuadra = planEq ? usados.every(g => Math.abs(sumaPorGrupo(g) - num(planEq[g])) < 0.01) : false;

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

      {showCfg && (
        <div style={S.modalWrap}>
          <div style={S.modalCard}>
            <div style={S.eyebrow}>Configurar menús</div>
            <h2 style={S.balTitle}>¿Qué menús vamos a armar?</h2>
            <div style={S.cfgRow}>
              <span style={S.cfgLbl}>Opciones de menú por tiempo</span>
              <div style={S.stepper}>
                <button style={S.stepBtn} onClick={() => setCfgNOp(n => Math.max(1, n - 1))}>−</button>
                <span style={S.stepVal}>{cfgNOp}</span>
                <button style={S.stepBtn} onClick={() => setCfgNOp(n => Math.min(6, n + 1))}>+</button>
              </div>
            </div>
            <div style={S.cfgRow}>
              <span style={S.cfgLbl}>Tiempos de comida</span>
              <div style={S.stepper}>
                <button style={S.stepBtn} onClick={() => cfgSetN(cfgTiempos.length - 1)}>−</button>
                <span style={S.stepVal}>{cfgTiempos.length}</span>
                <button style={S.stepBtn} onClick={() => cfgSetN(cfgTiempos.length + 1)}>+</button>
              </div>
            </div>
            <div style={S.cfgListLbl}>Nombre y horario de cada tiempo (editables)</div>
            <div style={S.cfgList}>
              {cfgTiempos.map((t, i) => (
                <div key={i} style={S.cfgItem}>
                  <input style={S.cfgName} value={t.nombre} onChange={e => cfgSetTiempo(i, { nombre: e.target.value })} />
                  <input style={S.cfgHora} value={t.hora} onChange={e => cfgSetTiempo(i, { hora: e.target.value })} />
                </div>
              ))}
            </div>
            {savedMenus && <div style={S.cfgWarn}>Reconfigurar regenera la estructura: las opciones de menú que ya tengas escritas se reemplazan por tarjetas vacías.</div>}
            <div style={S.cfgActions}>
              {savedMenus && <button style={S.volverBtn} onClick={() => setShowCfg(false)}>Cancelar</button>}
              <button style={S.primaryBtn} className="nf-primary" onClick={aplicarConfig}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      <button style={S.back} onClick={onBack}>← {patient.nombre}</button>
      <div style={S.titleRow}>
        <div style={{ flex: 1 }}>
          <div style={S.eyebrow}>Plan nutricional</div>
          <h1 style={S.h1}>Menús por tiempo de comida</h1>
        </div>
        <span style={{ ...S.balance, ...(cuadra ? S.balOk : S.balBad) }}>{cuadra ? 'Equivalentes cuadran ✓' : 'Revisar reparto'}</span>
      </div>

      <div style={S.toolbar}>
        <button style={S.toolBtn} onClick={() => setShowCfg(true)}>Reconfigurar</button>
        <button style={S.toolBtn} onClick={redistribuir}>Redistribuir equivalentes</button>
        <button style={{ ...S.toolBtn, ...S.iaBtn }} onClick={generarIA} disabled={iaBusy}>{iaBusy ? 'Generando…' : 'Generar todos con IA ✦'}</button>
      </div>
      <div style={S.iaNote}>Puedes generar todos los menús de golpe, o regenerar <b>una sola opción</b> con el botón <b>IA ✦</b> de cada tarjeta — así arreglas las que no sirven sin tocar las que ya quedaron bien. La IA solo sugiere: <b>revisa y edita</b> antes de guardar.</div>

      <div style={S.card}>
        <div style={S.eyebrow}>Balance por grupo</div>
        <h2 style={S.balTitle}>Distribución del plan vs. menús</h2>
        <div style={S.balWrap}>
          <table style={S.balTable}>
            <thead>
              <tr>
                <th style={{ ...S.balTh, textAlign: 'left' }}>Grupo</th>
                <th style={S.balTh}>Plan</th>
                <th style={S.balTh}>En menús</th>
                <th style={S.balTh}>Dif.</th>
              </tr>
            </thead>
            <tbody>
              {usados.map(g => {
                const plan = round2(num(planEq[g]));
                const menu = sumaPorGrupo(g);
                const dif = round2(menu - plan);
                const ok = Math.abs(dif) < 0.01;
                return (
                  <tr key={g} style={ok ? null : S.balRowBad}>
                    <td style={{ ...S.balTd, textAlign: 'left' }}>{GRUPOS[g][0]}</td>
                    <td style={S.balTd}>{fmt(plan)}</td>
                    <td style={S.balTd}>{fmt(menu)}</td>
                    <td style={{ ...S.balTd, color: ok ? T.inkSoft : T.danger, fontWeight: 700 }}>{dif > 0 ? '+' : ''}{fmt(dif)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={S.balHint}>"En menús" suma lo repartido en todos los tiempos. Cuando la diferencia es 0 en todos los grupos, el reparto cuadra con el plan.</div>
      </div>

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
                  <input style={S.eqInput} inputMode="decimal" value={t.eq[g]} onChange={e => setEqCell(idx, g, e.target.value)} />
                </label>
              ))}
            </div>

            <div style={S.optsRow}>
              <div style={{ flex: 1 }}>
                {t.opciones.map((o, oi) => (
                  <div key={oi} style={S.opt}>
                    <div style={S.optHead}>
                      <span style={S.optTag}>Opción {oi + 1}</span>
                      <button style={S.optIaBtn} onClick={() => generarOpcionIA(idx, oi)} disabled={iaBusy || opBusy === (idx + ':' + oi)}>{opBusy === (idx + ':' + oi) ? 'Generando…' : 'IA ✦'}</button>
                    </div>
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
          <button style={S.draftBtn} onClick={guardarBorrador} disabled={status === 'guardando'}>Guardar borrador</button>
          <button style={S.primaryBtn} className="nf-primary" onClick={guardar} disabled={status === 'guardando'}>{status === 'guardando' ? 'Guardando…' : 'Guardar menús'}</button>
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
  balTitle: { margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: T.pine },
  balWrap: { overflowX: 'auto' },
  balTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  balTh: { textAlign: 'right', padding: '6px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: T.inkSoft, borderBottom: `1px solid ${T.line}` },
  balTd: { textAlign: 'right', padding: '7px 10px', color: T.pine, borderBottom: `1px solid ${T.lineSoft || T.line}` },
  balRowBad: { background: '#FBF1EC' },
  balHint: { marginTop: 10, fontSize: 11.5, color: T.inkSoft, lineHeight: 1.5 },
  modalWrap: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 },
  modalCard: { background: T.surface, borderRadius: 16, padding: '22px 22px 20px', width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 18px 50px rgba(0,0,0,0.3)' },
  cfgRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.lineSoft}` },
  cfgLbl: { fontSize: 13.5, fontWeight: 600, color: T.pine },
  stepper: { display: 'flex', alignItems: 'center', gap: 10 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.line}`, background: '#fff', color: T.pine, fontSize: 18, fontWeight: 700, cursor: 'pointer', lineHeight: 1, fontFamily: mono },
  stepVal: { minWidth: 22, textAlign: 'center', fontSize: 15, fontWeight: 800, color: T.pine },
  cfgListLbl: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: T.inkSoft, margin: '14px 0 6px' },
  cfgList: { display: 'flex', flexDirection: 'column', gap: 7 },
  cfgItem: { display: 'flex', gap: 8 },
  cfgName: { flex: 1, border: `1px solid ${T.line}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: T.pine, fontFamily: mono, background: '#FCFDFC', boxSizing: 'border-box' },
  cfgHora: { width: 78, border: `1px solid ${T.line}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: T.pine, fontFamily: mono, background: '#FCFDFC', boxSizing: 'border-box' },
  cfgWarn: { marginTop: 12, fontSize: 12, color: T.danger, background: '#F7EAE5', borderRadius: 9, padding: '9px 12px', lineHeight: 1.45 },
  cfgActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  toolbar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 },
  toolBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.amber}`, padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  iaBtn: { borderColor: T.amber, color: '#211C17', cursor: 'pointer', background: T.amber },
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
  optHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  optIaBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.amber}`, borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: mono, whiteSpace: 'nowrap' },
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
  draftBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.amber}`, padding: '12px 18px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  empty: { background: T.mint, border: `1px solid ${T.line}`, borderRadius: 12, padding: '18px', fontSize: 13.5, color: T.ink, lineHeight: 1.6 },
};

const css = `
.nf-primary:hover { background: #C0986F; }
input:focus, textarea:focus { outline: none; border-color: ${T.amber} !important; box-shadow: 0 0 0 3px rgba(205,167,136,0.25); }
`;
