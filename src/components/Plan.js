import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

/* ============================================================
   NFITNESS 360 — Cálculo del plan nutricional (SMAE)
   Mismo diseño que el panel original, conectado a Firestore.
   ============================================================ */

const T = {
  bg: '#EEE4DA', surface: '#FFFFFF', ink: '#36302B', inkSoft: '#978C87',
  line: '#E3D8CC', lineSoft: '#EFE7DD', pine: '#211C17', amber: '#CDA788',
  mint: '#F4EBDF', danger: '#B0593F', sage: '#9AB9AD', black: '#000000',
};
const mono = "'Montserrat', system-ui, sans-serif";

const GRUPOS = [
  ['Cereales y tubérculos', 70, 2, 0, 15],
  ['Cereales con grasa', 115, 2, 5, 15],
  ['Leguminosas', 120, 8, 1, 20],
  ['Verdura', 25, 2, 0, 4],
  ['Fruta', 60, 0, 0, 15],
  ['Prod. animales · muy bajo en grasa', 40, 7, 1, 0],
  ['Prod. animales · bajo en grasa', 55, 7, 3, 0],
  ['Prod. animales · moderado en grasa', 75, 7, 5, 0],
  ['Prod. animales · alto en grasa', 100, 7, 8, 0],
  ['Leche descremada', 95, 9, 2, 12],
  ['Leche semidescremada', 110, 9, 4, 12],
  ['Leche entera', 150, 9, 8, 12],
  ['Leche con azúcar', 200, 8, 5, 30],
  ['Grasas', 45, 0, 5, 0],
  ['Grasas con proteína', 70, 3, 5, 3],
  ['Azúcares', 40, 0, 0, 10],
  ['Azúcares con grasa', 85, 0, 5, 10],
  ['Alimentos libres', 0, 0, 0, 0],
];

const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const isFin = (v) => typeof v === 'number' && isFinite(v);
const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;

/* Plantilla base: % de la energía total que aporta cada grupo (índice de GRUPOS).
   Editable después en vivo. Suma = 100%. */
const PLANTILLA_PCT = { 0: 28, 2: 10, 3: 5, 4: 12, 5: 20, 9: 10, 13: 12, 15: 3 };
function plantillaEq(energia) {
  const e = num(energia);
  return GRUPOS.map((g, i) => {
    const pct = PLANTILLA_PCT[i];
    if (!pct || !e || !g[1]) return 0;
    return Math.round((pct / 100 * e) / g[1]);
  });
}

const FACTORES = [
  ['1.2', 'Sedentario'],
  ['1.375', 'Actividad ligera'],
  ['1.55', 'Actividad moderada'],
  ['1.725', 'Actividad intensa'],
  ['1.9', 'Muy intensa'],
];

export default function Plan({ patient, pdata, onBack }) {
  const saved = patient.plan || {};
  const [pp, setPp] = useState({
    peso: pdata.peso || '', talla: pdata.talla || '', edad: pdata.edad || '',
    sexo: pdata.sexo || 'Femenino', grasa: pdata.grasa || '',
  });
  const [eq, setEq] = useState(() => (Array.isArray(saved.eq) && saved.eq.length === GRUPOS.length) ? saved.eq.map(String) : GRUPOS.map(() => '0'));
  const [meta, setMeta] = useState(() => saved.meta || { energia: '', pP: 30, pL: 20, pC: 50, factor: 1.55 });
  const [status, setStatus] = useState(patient.plan ? 'guardado' : 'nuevo');

  const setP = (k, v) => { setPp(p => ({ ...p, [k]: v })); setStatus('nuevo'); };
  const setM = (k, v) => { setMeta(m => ({ ...m, [k]: v })); setStatus('nuevo'); };
  const setEqi = (i, v) => { setEq(e => e.map((x, k) => k === i ? v : x)); setStatus('nuevo'); };

  const peso = num(pp.peso), talla = num(pp.talla), edad = num(pp.edad);
  const esHombre = pp.sexo === 'Masculino';
  const grasa = num(pp.grasa);
  const tmb = num(pdata.tmb);

  const mifflin = peso && talla && edad ? (10 * peso + 6.25 * talla - 5 * edad) + (esHombre ? 5 : -161) : NaN;
  const hb = peso && talla && edad
    ? (esHombre ? 66.473 + 13.7516 * peso + 5.0033 * talla - 6.755 * edad
      : 655.0955 + 9.5634 * peso + 1.8496 * talla - 4.6756 * edad) : NaN;
  const mlg = peso > 0 && grasa > 0 ? peso * (1 - grasa / 100) : NaN;
  const cunningham = isFin(mlg) ? 500 + 22 * mlg : NaN;
  const factor = num(meta.factor);
  const sugerido = isFin(mifflin) ? mifflin * factor : NaN;

  useEffect(() => {
    const e0 = num(meta.energia) || (isFin(sugerido) ? r0(sugerido) : 0);
    if (!num(meta.energia) && isFin(sugerido)) setMeta(m => ({ ...m, energia: r0(sugerido) }));
    // Plan nuevo (sin equivalentes guardados): aplicar la plantilla base.
    const teniaEq = Array.isArray(saved.eq) && saved.eq.some(v => num(v) > 0);
    const eqVacios = eq.every(v => num(v) === 0);
    if (!teniaEq && eqVacios && e0) setEq(plantillaEq(e0).map(String));
    // eslint-disable-next-line
  }, []);

  // Sección C siempre en sintonía con la energía meta (sección B):
  // al cambiar las kcal, se recalcula la tabla de equivalentes con la plantilla base.
  // (No corre en el primer render, para no pisar los equivalentes ya guardados de un plan existente.)
  const primeraRender = useRef(true);
  useEffect(() => {
    if (primeraRender.current) { primeraRender.current = false; return; }
    const e = num(meta.energia);
    if (e > 0) { setEq(plantillaEq(e).map(String)); setStatus('nuevo'); }
    // eslint-disable-next-line
  }, [meta.energia]);

  const energia = num(meta.energia);
  const pP = num(meta.pP), pL = num(meta.pL), pC = num(meta.pC);
  const sumaPct = pP + pL + pC;
  const metaProtG = energia ? (pP / 100 * energia) / 4 : 0;
  const metaLipG = energia ? (pL / 100 * energia) / 9 : 0;
  const metaCarbG = energia ? (pC / 100 * energia) / 4 : 0;

  const filas = GRUPOS.map((g, i) => { const n = num(eq[i]); return { kcal: n * g[1], prot: n * g[2], lip: n * g[3], hc: n * g[4] }; });
  const tot = filas.reduce((a, f) => ({ kcal: a.kcal + f.kcal, prot: a.prot + f.prot, lip: a.lip + f.lip, hc: a.hc + f.hc }), { kcal: 0, prot: 0, lip: 0, hc: 0 });

  const adEnergia = energia ? tot.kcal * 100 / energia : 0;
  const adProt = metaProtG ? tot.prot * 100 / metaProtG : 0;
  const adLip = metaLipG ? tot.lip * 100 / metaLipG : 0;
  const adCarb = metaCarbG ? tot.hc * 100 / metaCarbG : 0;
  const distP = tot.kcal ? tot.prot * 4 * 100 / tot.kcal : 0;
  const distL = tot.kcal ? tot.lip * 9 * 100 / tot.kcal : 0;
  const distC = tot.kcal ? tot.hc * 4 * 100 / tot.kcal : 0;
  const adColor = (v) => (v >= 90 && v <= 110 ? T.sage : T.danger);

  const gkgP = peso > 0 ? r1(tot.prot / peso) : null;
  const gkgL = peso > 0 ? r1(tot.lip / peso) : null;
  const gkgC = peso > 0 ? r1(tot.hc / peso) : null;

  const guardar = async () => {
    if (sumaPct !== 100) { setStatus('error'); return; }
    setStatus('guardando');
    const plan = {
      eq: eq.map(num), meta: { energia: num(meta.energia), pP, pL, pC, factor },
      totales: { kcal: r0(tot.kcal), prot: r0(tot.prot), lip: r0(tot.lip), hc: r0(tot.hc), distP: r1(distP), distL: r1(distL), distC: r1(distC) },
      fecha: new Date().toISOString().slice(0, 10),
    };
    try { await updateDoc(doc(db, 'pacientes', patient.id), { plan }); setStatus('guardado'); }
    catch (e) { setStatus('error'); }
  };

  return (
    <div style={styles.root}>
      <style>{css}</style>

      <header style={styles.header}>
        <button style={styles.back} onClick={onBack}>← {patient.nombre}</button>
        <div style={styles.titleRow}>
          <div style={{ flex: 1 }}>
            <div style={styles.eyebrow}>Panel de la nutrióloga</div>
            <h1 style={styles.h1}>Cálculo del plan nutricional</h1>
            <div style={styles.idBlock}>
              <span style={styles.noPill}>{patient.codigo || 'NF-…'}</span>
              <p style={styles.patientLine}>{patient.nombre}{patient.objetivo ? ' · ' + patient.objetivo : ''}</p>
            </div>
          </div>
          <SaveBadge status={status} />
        </div>
      </header>

      <main style={styles.main}>
        {/* SECCIÓN A */}
        <Section n="A" title="Datos y gasto energético" hint="Tomados del expediente / InBody. Puedes ajustarlos para el cálculo.">
          <Grid>
            <Field label="Peso (kg)"><input style={styles.input} inputMode="decimal" value={pp.peso} onChange={(e) => setP('peso', e.target.value)} /></Field>
            <Field label="Talla (cm)"><input style={styles.input} inputMode="decimal" value={pp.talla} onChange={(e) => setP('talla', e.target.value)} /></Field>
            <Field label="Edad (años)"><input style={styles.input} inputMode="numeric" value={pp.edad} onChange={(e) => setP('edad', e.target.value)} /></Field>
            <Field label="Sexo">
              <select style={styles.input} value={pp.sexo} onChange={(e) => setP('sexo', e.target.value)}>
                <option>Femenino</option><option>Masculino</option>
              </select>
            </Field>
            <Field label="% grasa corporal"><input style={styles.input} inputMode="decimal" value={pp.grasa} onChange={(e) => setP('grasa', e.target.value)} /></Field>
          </Grid>

          <div style={styles.bmrRow}>
            {tmb > 0 && <BmrCard label="InBody · TMB" value={tmb} sub="medido" />}
            <BmrCard label="Mifflin-St Jeor" value={mifflin} sub="gasto basal" />
            <BmrCard label="Harris-Benedict" value={hb} sub="gasto basal" />
            <BmrCard label="Cunningham" value={cunningham} sub="usa masa magra" />
            <div style={styles.bmrCardAccent}>
              <div style={styles.bmrLabel}>Gasto estimado</div>
              <div style={styles.bmrValue}>{isFin(sugerido) ? r0(sugerido) : '—'}<span style={styles.kcalU}> kcal</span></div>
              <select style={styles.factorSel} value={meta.factor} onChange={(e) => setM('factor', e.target.value)}>
                {FACTORES.map(([v, l]) => <option key={v} value={v}>×{v} · {l}</option>)}
              </select>
            </div>
          </div>
          {!(peso && talla && edad) && <p style={styles.warn}>Captura peso, talla y edad para estimar el gasto energético.</p>}
          {peso > 0 && !(grasa > 0) && <p style={styles.hintBox}>Captura el % de grasa corporal para calcular Cunningham (usa la masa libre de grasa).</p>}
        </Section>

        {/* SECCIÓN B */}
        <Section n="B" title="Meta energética y distribución de macros">
          <Grid>
            <Field label="Energía meta (kcal)"><input style={{ ...styles.input, ...styles.inputStrong }} inputMode="numeric" value={meta.energia} onChange={(e) => setM('energia', e.target.value)} /></Field>
            <Field label="% Proteína"><input style={styles.input} inputMode="numeric" value={meta.pP} onChange={(e) => setM('pP', e.target.value)} /></Field>
            <Field label="% Lípidos"><input style={styles.input} inputMode="numeric" value={meta.pL} onChange={(e) => setM('pL', e.target.value)} /></Field>
            <Field label="% H. de C."><input style={styles.input} inputMode="numeric" value={meta.pC} onChange={(e) => setM('pC', e.target.value)} /></Field>
          </Grid>
          <div style={styles.metaRow}>
            <span style={{ ...styles.sumTag, ...(sumaPct === 100 ? styles.sumOk : styles.sumBad) }}>
              Suma de macros: {sumaPct}%{sumaPct === 100 ? ' ✓' : ' (debe ser 100%)'}
            </span>
            <span style={styles.gramTag}>Meta en gramos: <b>{r1(metaProtG)}</b> P · <b>{r1(metaLipG)}</b> L · <b>{r1(metaCarbG)}</b> HC</span>
          </div>
        </Section>

        {/* SECCIÓN C */}
        <Section n="C" title="Tabla de equivalentes" hint="Se calcula automáticamente a partir de la energía meta (B). Puedes ajustar el # Eq de cada grupo; el recálculo es en vivo.">
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, ...styles.thLeft }}>Grupo</th>
                  <th style={styles.thEq}># Eq.</th>
                  <th style={styles.th}>Energía<span style={styles.thU}>kcal</span></th>
                  <th style={styles.th}>Proteína<span style={styles.thU}>g</span></th>
                  <th style={styles.th}>Lípidos<span style={styles.thU}>g</span></th>
                  <th style={styles.th}>H. de C.<span style={styles.thU}>g</span></th>
                </tr>
              </thead>
              <tbody>
                {GRUPOS.map((g, i) => {
                  const f = filas[i];
                  const activa = num(eq[i]) > 0;
                  return (
                    <tr key={i} style={activa ? styles.trOn : undefined}>
                      <td style={styles.tdLeft}>{g[0]}</td>
                      <td style={styles.tdEq}><input style={styles.eqInput} value={eq[i]} inputMode="decimal" onChange={(e) => setEqi(i, e.target.value)} /></td>
                      <td style={styles.td}>{f.kcal ? r0(f.kcal) : '—'}</td>
                      <td style={styles.td}>{f.prot ? r1(f.prot) : '—'}</td>
                      <td style={styles.td}>{f.lip ? r1(f.lip) : '—'}</td>
                      <td style={styles.td}>{f.hc ? r1(f.hc) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={styles.trTot}>
                  <td style={styles.tdTotLabel}>Totales</td>
                  <td style={styles.tdEq}></td>
                  <td style={styles.tdTot}>{r0(tot.kcal)}</td>
                  <td style={styles.tdTot}>{r1(tot.prot)}</td>
                  <td style={styles.tdTot}>{r1(tot.lip)}</td>
                  <td style={styles.tdTot}>{r1(tot.hc)}</td>
                </tr>
                <tr style={styles.trAd}>
                  <td style={styles.tdAdLabel}>% de adecuación</td>
                  <td style={styles.tdEq}></td>
                  <td style={{ ...styles.tdAd, color: adColor(adEnergia) }}>{r1(adEnergia)}%</td>
                  <td style={{ ...styles.tdAd, color: adColor(adProt) }}>{r1(adProt)}%</td>
                  <td style={{ ...styles.tdAd, color: adColor(adLip) }}>{r1(adLip)}%</td>
                  <td style={{ ...styles.tdAd, color: adColor(adCarb) }}>{r1(adCarb)}%</td>
                </tr>
                <tr style={styles.trDist}>
                  <td style={styles.tdAdLabel}>Distribución real</td>
                  <td style={styles.tdEq}></td>
                  <td style={styles.tdDist}>—</td>
                  <td style={styles.tdDist}>{r1(distP)}%</td>
                  <td style={styles.tdDist}>{r1(distL)}%</td>
                  <td style={styles.tdDist}>{r1(distC)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>

        {/* RESUMEN */}
        <section style={styles.summary}>
          <div style={styles.sumMain}>
            <div style={styles.sumKLabel}>Kilocalorías totales del plan</div>
            <div style={styles.sumK}>{r0(tot.kcal)}<span style={styles.sumKU}> kcal</span></div>
            <div style={styles.sumMeta}>Adecuación energética <b style={{ color: adColor(adEnergia) }}>{r1(adEnergia)}%</b> · meta {r0(energia)} kcal</div>
          </div>
          <div style={styles.sumMacros}>
            <Macro c={T.sage} label="Proteína" g={r1(tot.prot)} pct={r1(distP)} gkg={gkgP} />
            <Macro c={T.amber} label="Lípidos" g={r1(tot.lip)} pct={r1(distL)} gkg={gkgL} />
            <Macro c="#FFFFFF" label="H. de C." g={r1(tot.hc)} pct={r1(distC)} gkg={gkgC} />
          </div>
        </section>

        <div style={styles.actions}>
          <div style={styles.footerInfo}>
            {status === 'guardado' && 'Plan guardado.'}
            {status === 'guardando' && 'Guardando cambios…'}
            {status === 'error' && (sumaPct !== 100 ? 'Los macros deben sumar 100%.' : 'No se pudo guardar.')}
            {status === 'nuevo' && 'Cambios sin guardar.'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={styles.volverBtn} onClick={onBack}>← Atrás</button>
            <button style={styles.primaryBtn} className="nf-primary" onClick={guardar}>Guardar plan</button>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ===================== subcomponentes ===================== */
function Section({ n, title, hint, action, children }) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHead}>
        <span style={styles.cardNum}>{n}</span>
        <div style={{ flex: 1 }}><h2 style={styles.h2}>{title}</h2>{hint && <p style={styles.hint}>{hint}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Grid({ children }) { return <div style={styles.grid}>{children}</div>; }
function Field({ label, children }) {
  return <label style={styles.field}><span style={styles.label}>{label}</span>{children}</label>;
}
function BmrCard({ label, value, sub }) {
  return (
    <div style={styles.bmrCard}>
      <div style={styles.bmrLabel}>{label}</div>
      <div style={styles.bmrValue}>{isFin(value) ? r0(value) : '—'}<span style={styles.kcalU}> kcal</span></div>
      <div style={styles.bmrSub}>{sub}</div>
    </div>
  );
}
function Macro({ c, label, g, pct, gkg }) {
  return (
    <div style={styles.macro}>
      <div style={{ ...styles.macroDot, background: c }} />
      <div style={{ flex: 1 }}>
        <div style={styles.macroLabel}>{label}</div>
        <div style={styles.macroVal}>{g} g · {pct}%</div>
      </div>
      <div style={styles.gkgBadge}>{gkg != null ? gkg : '—'}<span style={styles.gkgU}> g/kg</span></div>
    </div>
  );
}
function SaveBadge({ status }) {
  const map = {
    guardado: { t: 'Guardado', c: T.sage }, guardando: { t: 'Guardando…', c: T.amber },
    error: { t: 'Revisar', c: T.danger }, nuevo: { t: 'Sin guardar', c: T.inkSoft },
  };
  const s = map[status] || map.nuevo;
  return (
    <div style={styles.saveBadge}>
      <span style={{ ...styles.saveDot, background: s.c }} className={status === 'guardando' ? 'nf-pulse' : ''} />
      <span style={{ color: s.c, fontWeight: 600 }}>{s.t}</span>
    </div>
  );
}

/* ===================== estilos ===================== */
const styles = {
  root: { fontFamily: mono, color: T.ink, WebkitFontSmoothing: 'antialiased' },
  header: { marginBottom: 4 },
  back: { background: 'transparent', border: 'none', color: T.inkSoft, fontFamily: mono, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 10 },
  titleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: T.amber, marginBottom: 4 },
  h1: { fontSize: 23, fontWeight: 800, letterSpacing: -0.6, margin: 0, color: T.ink },
  idBlock: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  noPill: { background: T.amber, color: '#211C17', fontWeight: 800, fontSize: 12.5, padding: '4px 11px', borderRadius: 7, letterSpacing: 0.6, display: 'inline-block' },
  patientLine: { margin: 0, color: T.inkSoft, fontSize: 14 },
  saveBadge: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, background: T.surface, border: `1px solid ${T.line}`, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap' },
  saveDot: { width: 8, height: 8, borderRadius: 999, display: 'inline-block' },
  main: { display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 },
  card: { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: '20px 20px 22px', boxShadow: '0 1px 2px rgba(22,34,30,0.03)' },
  cardHead: { display: 'flex', gap: 13, marginBottom: 18, alignItems: 'flex-start' },
  cardNum: { minWidth: 30, height: 30, borderRadius: 9, background: T.amber, color: '#211C17', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14 },
  h2: { fontSize: 17, fontWeight: 750, margin: 0, letterSpacing: -0.3 },
  hint: { margin: '3px 0 0', fontSize: 12.5, color: T.inkSoft, lineHeight: 1.45 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px 14px' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: T.inkSoft },
  input: { width: '100%', border: `1px solid ${T.line}`, borderRadius: 9, padding: '10px 12px', fontSize: 14, color: T.ink, background: '#FCFDFC', boxSizing: 'border-box', fontFamily: mono },
  inputStrong: { fontWeight: 700, fontSize: 16, color: T.pine },
  bmrRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10, marginTop: 16 },
  hintBox: { marginTop: 12, fontSize: 12.5, color: T.inkSoft, background: T.mint, borderRadius: 9, padding: '9px 12px' },
  bmrCard: { border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 14px', background: '#FCFAF7' },
  bmrCardAccent: { border: `1px solid ${T.amber}`, borderRadius: 12, padding: '12px 14px', background: T.mint },
  bmrLabel: { fontSize: 11.5, fontWeight: 600, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
  bmrValue: { fontSize: 24, fontWeight: 800, color: T.pine, marginTop: 4, letterSpacing: -0.5 },
  kcalU: { fontSize: 12, fontWeight: 600, color: T.inkSoft },
  bmrSub: { fontSize: 11, color: T.inkSoft, marginTop: 2 },
  factorSel: { marginTop: 8, width: '100%', border: `1px solid ${T.line}`, borderRadius: 8, padding: '6px 8px', fontSize: 12.5, background: '#fff', fontFamily: mono, color: T.ink },
  warn: { marginTop: 12, fontSize: 12.5, color: T.danger, background: '#F7EAE5', borderRadius: 9, padding: '9px 12px' },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, alignItems: 'center' },
  sumTag: { fontSize: 12.5, fontWeight: 700, padding: '6px 12px', borderRadius: 8 },
  sumOk: { background: '#E9F1ED', color: '#3E6B5B' },
  sumBad: { background: '#F7EAE5', color: T.danger },
  gramTag: { fontSize: 12.5, color: T.inkSoft },
  tableScroll: { overflowX: 'auto', border: `1px solid ${T.line}`, borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 },
  th: { background: T.pine, color: '#fff', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, padding: '9px 8px', textAlign: 'right' },
  thLeft: { textAlign: 'left', paddingLeft: 14 },
  thEq: { background: T.amber, color: '#211C17', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, padding: '9px 8px', textAlign: 'center', width: 78 },
  thU: { display: 'block', fontSize: 9, fontWeight: 500, opacity: 0.8, letterSpacing: 0 },
  tdLeft: { padding: '9px 8px 9px 14px', textAlign: 'left', borderBottom: `1px solid ${T.lineSoft}`, color: T.ink, fontWeight: 500 },
  td: { padding: '9px 8px', textAlign: 'right', borderBottom: `1px solid ${T.lineSoft}`, color: T.inkSoft, fontVariantNumeric: 'tabular-nums' },
  tdEq: { padding: '5px 6px', textAlign: 'center', borderBottom: `1px solid ${T.lineSoft}`, background: '#FBF6EF' },
  eqInput: { width: 56, textAlign: 'center', border: `1px solid ${T.line}`, borderRadius: 7, padding: '7px 4px', fontSize: 14, fontWeight: 700, color: T.pine, background: '#fff', fontFamily: mono, boxSizing: 'border-box' },
  trOn: { background: '#FFFDFA' },
  trTot: { background: T.mint },
  tdTotLabel: { padding: '11px 8px 11px 14px', fontWeight: 800, color: T.pine, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: 0.4 },
  tdTot: { padding: '11px 8px', textAlign: 'right', fontWeight: 800, color: T.pine, fontSize: 14, fontVariantNumeric: 'tabular-nums' },
  trAd: { background: '#FFFFFF' },
  trDist: { background: '#FBF8F4' },
  tdAdLabel: { padding: '9px 8px 9px 14px', fontWeight: 600, color: T.inkSoft, fontSize: 11.5 },
  tdAd: { padding: '9px 8px', textAlign: 'right', fontWeight: 800, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' },
  tdDist: { padding: '9px 8px', textAlign: 'right', fontWeight: 700, color: T.ink, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' },
  summary: { display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, background: T.pine, borderRadius: 16, padding: '20px 22px', color: '#fff' },
  sumMain: {},
  sumKLabel: { fontSize: 12, fontWeight: 600, color: '#C9BEB4', textTransform: 'uppercase', letterSpacing: 0.6 },
  sumK: { fontSize: 44, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05, marginTop: 4, color: T.amber },
  sumKU: { fontSize: 16, fontWeight: 600, color: '#C9BEB4', letterSpacing: 0 },
  sumMeta: { fontSize: 12.5, color: '#E7DECF', marginTop: 8 },
  sumMacros: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 },
  macro: { display: 'flex', alignItems: 'center', gap: 11 },
  macroDot: { width: 12, height: 12, borderRadius: 4, flexShrink: 0 },
  macroLabel: { fontSize: 11.5, color: '#C9BEB4', textTransform: 'uppercase', letterSpacing: 0.4 },
  macroVal: { fontSize: 15, fontWeight: 700, color: '#fff' },
  gkgBadge: { background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 800, fontSize: 13.5, padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  gkgU: { fontSize: 10.5, fontWeight: 600, color: '#C9BEB4' },
  actions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '4px 2px 8px' },
  footerInfo: { fontSize: 12.5, color: T.inkSoft },
  primaryBtn: { background: T.amber, color: '#211C17', border: 'none', padding: '12px 24px', borderRadius: 11, fontSize: 14.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: mono },
  volverBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.pine}`, padding: '12px 20px', borderRadius: 11, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: mono },
  templateBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.amber}`, padding: '8px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: mono, alignSelf: 'flex-start' },
};

const css = `
.nf-primary:hover { background: #C0986F; }
.nf-tpl:hover { background: ${T.mint}; }
input:focus, select:focus { outline: none; border-color: ${T.amber} !important; box-shadow: 0 0 0 3px rgba(205,167,136,0.30); }
input::placeholder { color: #B7AC9F; }
.nf-pulse { animation: nfpulse 1s ease-in-out infinite; }
@keyframes nfpulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
`;
