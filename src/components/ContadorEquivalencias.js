import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

/* ============================================================
   NFITNESS 360 — Contador de equivalencias del paciente
   ------------------------------------------------------------
   Vive en la pantalla de inicio del paciente. Se alimenta del
   plan activo (plan.eq) y del menú por tiempos (plan.menus.tiempos):
   cada tiempo de comida se desglosa en sus grupos de equivalencias
   y el paciente marca CADA grupo por separado (con +/- para
   porciones parciales). Guardado automático (sin botón Guardar) en
   pacientes/{id}.seguimientoEq. Reinicio diario: al cambiar de día
   el día anterior se cierra en el historial y el contador vuelve a 0.

   Estructura que se guarda en seguimientoEq:
   {
     fecha: 'YYYY-MM-DD',            // día en curso
     consumo: { [secKey]: { [g]: valor } },  // consumido por tiempo y grupo
     planTotal, planGrupo:[18],     // meta del día (referencia)
     tocado: bool,                  // el paciente interactuó hoy
     pctHoy, consumidoHoy,          // avance en vivo (para las gráficas)
     dias: [ { fecha, pct, consumido, planTotal } ]  // días cerrados
   }
   ============================================================ */

const GRUPOS_SHORT = ['Cereales y tubérculos', 'Cereales con grasa', 'Leguminosas', 'Verdura', 'Fruta', 'Proteína (muy bajo en grasa)', 'Proteína (bajo en grasa)', 'Proteína (moderado en grasa)', 'Proteína (alto en grasa)', 'Leche descremada', 'Leche semidescremada', 'Leche entera', 'Leche con azúcar', 'Grasas', 'Grasas con proteína', 'Azúcares', 'Azúcares con grasa', 'Alimentos libres'];
const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_MINI = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const numf = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmtN = (n) => { const r = Math.round(n * 100) / 100; return Number.isInteger(r) ? String(r) : String(r); };
const hoyLocalISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
const diaSemAbr = (iso) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : DIAS_SEM[d.getDay()]; };
const fechaLarga = (iso) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : `${DIAS_SEM[d.getDay()]} ${d.getDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][d.getMonth()]}`; };
const addDaysISO = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function ContadorEquivalencias({ expedienteId, plan, seguimiento }) {
  const today = hoyLocalISO();

  /* --- Secciones (tiempos de comida) y grupos con meta a partir del plan --- */
  const secciones = useMemo(() => {
    const tiempos = plan && plan.menus && Array.isArray(plan.menus.tiempos) ? plan.menus.tiempos : null;
    if (tiempos && tiempos.length) {
      return tiempos.map((t, i) => {
        const eq = Array.isArray(t.eq) ? t.eq : [];
        const grupos = [];
        for (let g = 0; g < 18; g++) { const m = numf(eq[g]); if (m > 0) grupos.push({ g, max: m }); }
        const dish = (t.opciones || []).map((o) => o && o.nombre).filter(Boolean)[0] || '';
        return { key: String(i), nombre: t.nombre || ('Tiempo ' + (i + 1)), hora: t.hora || '', dish, grupos };
      }).filter((s) => s.grupos.length);
    }
    // Respaldo: sin menú por tiempos, se usa el total diario del plan (plan.eq).
    const eq = plan && Array.isArray(plan.eq) ? plan.eq : null;
    if (eq) {
      const grupos = [];
      for (let g = 0; g < 18; g++) { const m = numf(eq[g]); if (m > 0) grupos.push({ g, max: m }); }
      if (grupos.length) return [{ key: 'plan', nombre: 'Mi plan del día', hora: '', dish: '', grupos, sinMenu: true }];
    }
    return [];
  }, [plan]);

  const planGrupo = useMemo(() => { const a = Array(18).fill(0); secciones.forEach((s) => s.grupos.forEach((gr) => { a[gr.g] += gr.max; })); return a; }, [secciones]);
  const planTotal = useMemo(() => planGrupo.reduce((a, b) => a + b, 0), [planGrupo]);
  const gruposUsados = useMemo(() => planGrupo.map((v, g) => ({ g, plan: v })).filter((x) => x.plan > 0), [planGrupo]);

  /* --- Estado local del consumo del día en curso --- */
  const [consumo, setConsumo] = useState(() => (seguimiento && seguimiento.fecha === today && seguimiento.consumo && typeof seguimiento.consumo === 'object') ? seguimiento.consumo : {});
  const touchedRef = useRef(false);      // el paciente interactuó hoy
  const rolledRef = useRef(false);       // ya cerramos el día anterior en esta sesión
  const diasRef = useRef(Array.isArray(seguimiento && seguimiento.dias) ? seguimiento.dias : []);
  useEffect(() => { if (Array.isArray(seguimiento && seguimiento.dias)) diasRef.current = seguimiento.dias; }, [seguimiento]);

  const persistRaw = useCallback((segObj) => {
    if (!expedienteId) return;
    updateDoc(doc(db, 'pacientes', expedienteId), { seguimientoEq: segObj }).catch(() => {});
  }, [expedienteId]);

  const calc = useCallback((cons) => {
    const porGrupo = Array(18).fill(0);
    secciones.forEach((s) => { const cs = cons[s.key] || {}; s.grupos.forEach((gr) => { porGrupo[gr.g] += Math.max(0, Math.min(gr.max, numf(cs[gr.g]))); }); });
    const total = porGrupo.reduce((a, b) => a + b, 0);
    return { porGrupo, total };
  }, [secciones]);

  /* --- Cierre de día / hidratación --- */
  useEffect(() => {
    const seg = seguimiento;
    if (seg && seg.fecha && seg.fecha !== today && !rolledRef.current) {
      rolledRef.current = true;
      const base = { fecha: today, consumo: {}, tocado: false, pctHoy: 0, consumidoHoy: 0, planTotal, planGrupo, dias: Array.isArray(seg.dias) ? seg.dias : [] };
      if (seg.tocado) {
        const dia = { fecha: seg.fecha, pct: clampPct(seg.pctHoy), consumido: numf(seg.consumidoHoy), planTotal: numf(seg.planTotal) };
        base.dias = [...base.dias, dia].slice(-160);
      }
      diasRef.current = base.dias;
      persistRaw(base);
      setConsumo({});
      touchedRef.current = false;
    }
  }, [seguimiento, today, planTotal, planGrupo, persistRaw]);

  /* --- Guardado automático (debounce) tras interacción del paciente --- */
  useEffect(() => {
    if (!touchedRef.current) return undefined;
    const { porGrupo, total } = calc(consumo);
    const pct = planTotal > 0 ? Math.round(total / planTotal * 100) : 0;
    const seg = { fecha: today, consumo, tocado: true, pctHoy: pct, consumidoHoy: Math.round(total * 100) / 100, planTotal, planGrupo, dias: diasRef.current };
    const t = setTimeout(() => persistRaw(seg), 700);
    return () => clearTimeout(t);
  }, [consumo, calc, planTotal, planGrupo, today, persistRaw]);

  /* --- Mutadores --- */
  const mutate = (updater) => { touchedRef.current = true; setConsumo(updater); };
  const setGroup = (key, g, max, v) => mutate((c) => {
    const cs = { ...(c[key] || {}) };
    const nv = Math.max(0, Math.min(max, v));
    if (nv <= 0) delete cs[g]; else cs[g] = nv;
    const nc = { ...c };
    if (Object.keys(cs).length) nc[key] = cs; else delete nc[key];
    return nc;
  });
  const valOf = (key, g) => numf((consumo[key] || {})[g]);
  const toggleGroup = (key, g, max) => { const cur = valOf(key, g); setGroup(key, g, max, cur > 0 ? 0 : max); };
  const toggleAll = (sec) => {
    const cs = consumo[sec.key] || {};
    const full = sec.grupos.every((gr) => numf(cs[gr.g]) >= gr.max);
    mutate((c) => {
      const nc = { ...c };
      if (full) { delete nc[sec.key]; } else { const o = {}; sec.grupos.forEach((gr) => { o[gr.g] = gr.max; }); nc[sec.key] = o; }
      return nc;
    });
  };

  /* --- Derivados para la vista --- */
  const { porGrupo, total } = calc(consumo);
  const pctDia = planTotal > 0 ? Math.round(total / planTotal * 100) : 0;

  const dias7 = useMemo(() => {
    const cerrados = (Array.isArray(seguimiento && seguimiento.dias) ? seguimiento.dias : [])
      .filter((d) => d && d.fecha && d.fecha !== today)
      .slice(-6)
      .map((d) => ({ fecha: d.fecha, pct: clampPct(d.pct) }));
    cerrados.push({ fecha: today, pct: pctDia, hoy: true });
    return cerrados;
  }, [seguimiento, today, pctDia]);

  const racha = useMemo(() => {
    const map = {};
    (Array.isArray(seguimiento && seguimiento.dias) ? seguimiento.dias : []).forEach((d) => { if (d && d.fecha) map[d.fecha] = clampPct(d.pct); });
    if (touchedRef.current || pctDia > 0) map[today] = pctDia;
    let n = 0; let cur = map[today] != null ? today : addDaysISO(today, -1);
    while (map[cur] != null && map[cur] >= 70) { n += 1; cur = addDaysISO(cur, -1); }
    return n;
  }, [seguimiento, today, pctDia]);

  if (secciones.length === 0) return null;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* HERO */}
      <div style={S.hero}>
        <div style={S.ring(pctDia)}><div style={S.ringIn}><span style={S.ringPct}>{pctDia}%</span><span style={S.ringLbl}>del día</span></div></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.heroDate}>{fechaLarga(today)}</div>
          <div style={S.heroTitle}>Tu día de hoy</div>
          <div style={S.heroSub}>{fmtN(total)} de {fmtN(planTotal)} equivalencias</div>
          {racha >= 2 && <span style={S.streak}>🔥 Racha de {racha} días</span>}
        </div>
      </div>

      <div style={{ padding: '4px 16px 16px' }}>
        {/* TIEMPOS */}
        <div style={S.blockTitle}>Tus tiempos de hoy</div>
        <div style={S.blockHint}>Marca cada grupo que sí consumiste. Usa + / − si comiste solo una parte. Se guarda solo.</div>
        {secciones.map((sec) => {
          const cs = consumo[sec.key] || {};
          const full = sec.grupos.every((gr) => numf(cs[gr.g]) >= gr.max);
          const hechos = sec.grupos.filter((gr) => numf(cs[gr.g]) > 0).length;
          return (
            <div key={sec.key} style={S.meal}>
              <div style={S.mealHead}>
                <div style={{ minWidth: 0 }}>
                  <div style={S.mealTop}><span style={S.mealName}>{sec.nombre}</span>{sec.hora ? <span style={S.mealHora}>{sec.hora}</span> : null}</div>
                  {sec.dish ? <div style={S.mealDish}>{sec.dish}</div> : null}
                </div>
                <button onClick={() => toggleAll(sec)} style={{ ...S.mealAll, ...(full ? S.mealAllDone : null) }}>{full ? '✓ Todo' : 'Comí todo'}</button>
              </div>
              <div style={S.mealProg}>{hechos} de {sec.grupos.length} grupos marcados</div>
              {sec.grupos.map((gr) => {
                const v = numf(cs[gr.g]); const on = v > 0;
                return (
                  <div key={gr.g} style={S.gline}>
                    <div onClick={() => toggleGroup(sec.key, gr.g, gr.max)} style={{ ...S.gcheck, ...(on ? S.gcheckOn : null) }}>{on ? '✓' : ''}</div>
                    <span onClick={() => toggleGroup(sec.key, gr.g, gr.max)} style={{ ...S.gname, ...(on ? S.gnameOn : null) }}>{GRUPOS_SHORT[gr.g]}</span>
                    <div style={S.stepper}>
                      <button style={{ ...S.stepBtn, ...(v <= 0 ? S.stepOff : null) }} onClick={() => setGroup(sec.key, gr.g, gr.max, v - 1)} disabled={v <= 0}>−</button>
                      <span style={S.stepVal}>{fmtN(v)}<small style={S.stepMax}> / {fmtN(gr.max)}</small></span>
                      <button style={{ ...S.stepBtn, ...(v >= gr.max ? S.stepOff : null) }} onClick={() => setGroup(sec.key, gr.g, gr.max, v + 1)} disabled={v >= gr.max}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* TABLA DE EQUIVALENCIAS DEL DÍA */}
        <div style={{ ...S.blockTitle, marginTop: 18 }}>Equivalencias del día</div>
        <div style={S.blockHint}>Cuánto llevas y cuánto te falta por grupo, sumando todos tus tiempos.</div>
        {gruposUsados.map((x) => {
          const cons = porGrupo[x.g]; const rest = Math.max(0, x.plan - cons); const pct = x.plan > 0 ? Math.round(cons / x.plan * 100) : 0; const full = cons >= x.plan;
          return (
            <div key={x.g} style={{ marginBottom: 11 }}>
              <div style={S.grpTop}>
                <span style={S.grpName}>{GRUPOS_SHORT[x.g]}</span>
                <span style={S.grpNums}><span style={{ color: 'var(--sage)' }}>{fmtN(cons)}</span> / {fmtN(x.plan)} · falta <span style={{ color: 'var(--gold)' }}>{fmtN(rest)}</span></span>
              </div>
              <div style={S.bar}><span style={{ display: 'block', height: '100%', borderRadius: 999, width: Math.min(100, pct) + '%', background: full ? 'var(--sage)' : 'var(--gold)', transition: 'width .25s' }} /></div>
            </div>
          );
        })}
        <div style={S.legend}><span>Consumido: <b style={{ color: 'var(--dark)' }}>{fmtN(total)}</b></span><span>Te falta: <b style={{ color: 'var(--dark)' }}>{fmtN(Math.max(0, planTotal - total))}</b></span><span>Plan del día: <b style={{ color: 'var(--dark)' }}>{fmtN(planTotal)}</b></span></div>

        {/* HISTORIAL 7 DÍAS */}
        <div style={{ ...S.blockTitle, marginTop: 18 }}>Tu progreso · últimos días</div>
        <div style={S.days}>
          {dias7.map((d) => (
            <div key={d.fecha} style={{ flex: 1, textAlign: 'center' }}>
              <div style={S.dayBar}><span style={{ display: 'block', width: '100%', background: d.hoy ? 'var(--gold)' : 'var(--sage)', borderRadius: '8px 8px 0 0', height: Math.max(2, d.pct) + '%', transition: 'height .25s' }} /></div>
              <div style={S.dayPct}>{d.pct}%</div>
              <div style={S.dayLbl}>{d.hoy ? 'Hoy' : diaSemAbr(d.fecha)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== estilos ===================== */
const S = {
  hero: { display: 'flex', alignItems: 'center', gap: 16, background: 'var(--dark)', color: '#fff', padding: '18px 16px' },
  ring: (p) => ({ width: 88, height: 88, borderRadius: '50%', flexShrink: 0, background: `conic-gradient(var(--gold) ${p * 3.6}deg, rgba(255,255,255,.16) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  ringIn: { width: 68, height: 68, borderRadius: '50%', background: 'var(--dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 21, fontWeight: 800, color: 'var(--gold)', lineHeight: 1 },
  ringLbl: { fontSize: 8.5, color: '#C9BEB4', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 2 },
  heroDate: { fontSize: 10.5, color: '#C9BEB4', textTransform: 'uppercase', letterSpacing: '.5px' },
  heroTitle: { fontSize: 17, fontWeight: 800, marginTop: 2 },
  heroSub: { fontSize: 12.5, color: '#E7DECF', marginTop: 4 },
  streak: { display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 9, background: 'rgba(205,167,136,.18)', border: '1px solid rgba(205,167,136,.5)', color: 'var(--gold)', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800 },

  blockTitle: { fontSize: 11, fontWeight: 800, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 },
  blockHint: { fontSize: 11.5, color: 'var(--stone)', lineHeight: 1.5, marginBottom: 12 },

  meal: { border: '1px solid var(--border)', borderRadius: 13, padding: '12px 13px', marginBottom: 11, background: '#FCFAF7' },
  mealHead: { display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' },
  mealTop: { display: 'flex', alignItems: 'baseline', gap: 7 },
  mealName: { fontSize: 14.5, fontWeight: 800, color: 'var(--dark)' },
  mealHora: { fontSize: 11, color: 'var(--stone)' },
  mealDish: { fontSize: 12, color: 'var(--stone)', marginTop: 1 },
  mealAll: { flexShrink: 0, border: '1px solid var(--gold)', background: '#fff', color: 'var(--gold)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' },
  mealAllDone: { background: 'var(--sage)', borderColor: 'var(--sage)', color: '#fff' },
  mealProg: { fontSize: 10.5, color: 'var(--stone)', fontWeight: 700, margin: '8px 0 2px' },

  gline: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--soft, #EFE7DD)' },
  gcheck: { width: 24, height: 24, borderRadius: 7, border: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', cursor: 'pointer', background: '#fff', transition: '.12s' },
  gcheckOn: { background: 'var(--sage)', borderColor: 'var(--sage)' },
  gname: { flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ink, #36302B)', cursor: 'pointer' },
  gnameOn: { color: '#3E6B5B' },
  stepper: { display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', background: '#fff' },
  stepBtn: { width: 30, height: 30, border: 'none', background: '#fff', color: 'var(--dark)', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', lineHeight: 1 },
  stepOff: { color: '#d8ccbe', cursor: 'default' },
  stepVal: { minWidth: 46, textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--dark)', borderLeft: '1px solid var(--soft, #EFE7DD)', borderRight: '1px solid var(--soft, #EFE7DD)', padding: '0 2px', lineHeight: '30px' },
  stepMax: { color: 'var(--stone)', fontWeight: 600 },

  grpTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 5 },
  grpName: { fontSize: 12.5, fontWeight: 600, color: 'var(--ink, #36302B)' },
  grpNums: { fontSize: 12, fontWeight: 700, color: 'var(--dark)' },
  bar: { height: 9, borderRadius: 999, background: 'var(--soft, #EFE7DD)', overflow: 'hidden' },
  legend: { display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--stone)', marginTop: 2 },

  days: { display: 'flex', gap: 7, justifyContent: 'space-between' },
  dayBar: { height: 54, borderRadius: 8, background: 'var(--soft, #EFE7DD)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' },
  dayPct: { fontSize: 10, fontWeight: 700, color: 'var(--dark)', marginTop: 4 },
  dayLbl: { fontSize: 10, color: 'var(--stone)' },
};
