import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

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
const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;

export default function Plan({ patient, pdata, onBack }) {
  const saved = patient.plan || {};
  const [eq, setEq] = useState(() => (Array.isArray(saved.eq) && saved.eq.length === GRUPOS.length) ? saved.eq.map(String) : GRUPOS.map(() => '0'));
  const [meta, setMeta] = useState(() => saved.meta || { energia: '', pP: 30, pL: 20, pC: 50, factor: 1.2 });
  const [status, setStatus] = useState('');

  const peso = num(pdata.peso), talla = num(pdata.talla), edad = num(pdata.edad);
  const esHombre = pdata.sexo === 'Masculino';
  const grasa = num(pdata.grasa);

  const mifflin = peso && talla && edad ? (10 * peso + 6.25 * talla - 5 * edad) + (esHombre ? 5 : -161) : NaN;
  const hb = peso && talla && edad
    ? (esHombre ? 66.473 + 13.7516 * peso + 5.0033 * talla - 6.755 * edad
      : 655.0955 + 9.5634 * peso + 1.8496 * talla - 4.6756 * edad) : NaN;
  const mlg = peso > 0 && grasa > 0 ? peso * (1 - grasa / 100) : NaN;
  const cunningham = isFinite(mlg) ? 500 + 22 * mlg : NaN;
  const factor = num(meta.factor);
  const sugerido = isFinite(mifflin) ? mifflin * factor : NaN;

  useEffect(() => {
    if (!num(meta.energia) && isFinite(sugerido)) setMeta(m => ({ ...m, energia: r0(sugerido) }));
    // eslint-disable-next-line
  }, []);

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
  const adColor = (v) => (v >= 90 && v <= 110 ? 'var(--sage)' : '#c0392b');

  const setEqi = (i, v) => setEq(e => e.map((x, k) => k === i ? v : x));
  const setM = (k, v) => setMeta(m => ({ ...m, [k]: v }));

  const guardar = async () => {
    if (sumaPct !== 100) { setStatus('Los porcentajes de macros deben sumar 100%.'); return; }
    setStatus('Guardando…');
    const plan = {
      eq: eq.map(num),
      meta: { energia: num(meta.energia), pP, pL, pC, factor },
      totales: { kcal: r0(tot.kcal), prot: r0(tot.prot), lip: r0(tot.lip), hc: r0(tot.hc), distP: r1(distP), distL: r1(distL), distC: r1(distC) },
      fecha: new Date().toISOString().slice(0, 10),
    };
    try { await updateDoc(doc(db, 'pacientes', patient.id), { plan }); setStatus('Plan guardado ✓'); }
    catch (e) { setStatus('No se pudo guardar: ' + e.message); }
  };

  const S = styles;
  const faltanDatos = !(peso && talla && edad);

  const EnergyCard = ({ label, value }) => (
    <div style={S.eCard}>
      <div style={S.eLbl}>{label}</div>
      <div style={S.eVal}>{isFinite(value) ? r0(value) : '—'}<span style={S.eUnit}> kcal</span></div>
      {isFinite(value) && <button style={S.eUse} onClick={() => setM('energia', r0(value))}>Usar</button>}
    </div>
  );

  return (
    <div>
      <button style={S.back} onClick={onBack}>← {patient.nombre}</button>
      <div style={S.titleRow}><div className="card-title" style={{ margin: 0, fontSize: 16 }}>Plan nutricional · cálculo</div></div>

      {faltanDatos && <div style={S.warn}>Para estimar la energía, captura el <b>peso</b> (en una medición), la <b>estatura</b>, la <b>edad</b> y el <b>sexo</b> del paciente.</div>}

      <div className="card">
        <div className="card-title">Gasto energético estimado</div>
        <div style={S.eGrid}>
          <EnergyCard label="Mifflin-St Jeor" value={mifflin} />
          <EnergyCard label="Harris-Benedict" value={hb} />
          <EnergyCard label="Cunningham" value={cunningham} />
          <EnergyCard label={`Sugerido (×${factor || '—'})`} value={sugerido} />
        </div>
        <div style={S.factorRow}>
          <label style={S.field}><span style={S.fLbl}>Factor de actividad</span>
            <input style={S.inpSm} inputMode="decimal" value={meta.factor} onChange={e => setM('factor', e.target.value)} /></label>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Meta energética y macros</div>
        <div style={S.metaGrid}>
          <label style={S.field}><span style={S.fLbl}>Energía meta (kcal)</span>
            <input style={S.inp} inputMode="numeric" value={meta.energia} onChange={e => setM('energia', e.target.value)} /></label>
          <label style={S.field}><span style={S.fLbl}>% HC</span>
            <input style={S.inp} inputMode="numeric" value={meta.pC} onChange={e => setM('pC', e.target.value)} /></label>
          <label style={S.field}><span style={S.fLbl}>% Proteína</span>
            <input style={S.inp} inputMode="numeric" value={meta.pP} onChange={e => setM('pP', e.target.value)} /></label>
          <label style={S.field}><span style={S.fLbl}>% Grasa</span>
            <input style={S.inp} inputMode="numeric" value={meta.pL} onChange={e => setM('pL', e.target.value)} /></label>
        </div>
        <div style={{ ...S.sumTag, color: sumaPct === 100 ? 'var(--sage)' : '#c0392b' }}>
          Suma de macros = {sumaPct}%{sumaPct === 100 ? ' ✓' : ' (debe ser 100%)'}
        </div>
        <div style={S.metaTargets}>
          Meta en gramos: HC {r0(metaCarbG)} g · Proteína {r0(metaProtG)} g · Grasa {r0(metaLipG)} g
        </div>
      </div>

      <div className="card">
        <div className="card-title">Equivalentes por grupo (SMAE)</div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: 'left' }}>Grupo</th>
                <th style={S.th}># Eq</th>
                <th style={S.th}>kcal</th>
                <th style={S.th}>Prot</th>
                <th style={S.th}>Líp</th>
                <th style={S.th}>HC</th>
              </tr>
            </thead>
            <tbody>
              {GRUPOS.map((g, i) => (
                <tr key={i}>
                  <td style={{ ...S.td, textAlign: 'left' }}>{g[0]}</td>
                  <td style={S.td}><input style={S.eqInp} inputMode="numeric" value={eq[i]} onChange={e => setEqi(i, e.target.value)} /></td>
                  <td style={S.td}>{r0(filas[i].kcal)}</td>
                  <td style={S.td}>{r1(filas[i].prot)}</td>
                  <td style={S.td}>{r1(filas[i].lip)}</td>
                  <td style={S.td}>{r1(filas[i].hc)}</td>
                </tr>
              ))}
              <tr style={S.totRow}>
                <td style={{ ...S.td, textAlign: 'left', fontWeight: 700 }}>Totales</td>
                <td style={S.td}></td>
                <td style={{ ...S.td, fontWeight: 700 }}>{r0(tot.kcal)}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{r0(tot.prot)}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{r0(tot.lip)}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{r0(tot.hc)}</td>
              </tr>
              <tr>
                <td style={{ ...S.td, textAlign: 'left', fontSize: 10, color: 'var(--stone)' }}>% Adecuación</td>
                <td style={S.td}></td>
                <td style={{ ...S.td, color: adColor(adEnergia), fontWeight: 600 }}>{r0(adEnergia)}%</td>
                <td style={{ ...S.td, color: adColor(adProt), fontWeight: 600 }}>{r0(adProt)}%</td>
                <td style={{ ...S.td, color: adColor(adLip), fontWeight: 600 }}>{r0(adLip)}%</td>
                <td style={{ ...S.td, color: adColor(adCarb), fontWeight: 600 }}>{r0(adCarb)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--dark)' }}>
        <div style={S.sumGrid}>
          <div>
            <div style={S.sumLbl}>Energía total</div>
            <div style={S.sumBig}>{r0(tot.kcal)}<span style={{ fontSize: 14, color: 'var(--gold)' }}> kcal</span></div>
          </div>
          <div style={S.macroCol}>
            <div style={S.macroItem}><span style={{ color: '#fff' }}>● HC</span> {r0(tot.hc)} g · {r1(distC)}%{peso > 0 ? ` · ${r1(tot.hc / peso)} g/kg` : ''}</div>
            <div style={S.macroItem}><span style={{ color: 'var(--sage)' }}>● Proteína</span> {r0(tot.prot)} g · {r1(distP)}%{peso > 0 ? ` · ${r1(tot.prot / peso)} g/kg` : ''}</div>
            <div style={S.macroItem}><span style={{ color: 'var(--gold)' }}>● Grasa</span> {r0(tot.lip)} g · {r1(distL)}%{peso > 0 ? ` · ${r1(tot.lip / peso)} g/kg` : ''}</div>
          </div>
        </div>
      </div>

      <div style={S.saveRow}>
        <span style={S.statusTxt}>{status}</span>
        <button style={S.saveBtn} onClick={guardar}>Guardar plan</button>
      </div>
    </div>
  );
}

const styles = {
  back: { background: 'transparent', border: 'none', color: 'var(--stone)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 12 },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  warn: { background: '#fdf6e3', border: '0.5px solid var(--gold)', color: '#8a6d3b', fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 14, lineHeight: 1.5 },
  eGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  eCard: { background: 'var(--cream)', borderRadius: 10, padding: '10px 12px', position: 'relative' },
  eLbl: { fontSize: 9.5, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 },
  eVal: { fontFamily: 'var(--font-display), serif', fontSize: 24, color: 'var(--dark)', marginTop: 2 },
  eUnit: { fontSize: 11, color: 'var(--stone)' },
  eUse: { marginTop: 6, background: '#fff', border: '0.5px solid var(--border)', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--dark)', cursor: 'pointer', fontFamily: 'var(--font)' },
  factorRow: { marginTop: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  fLbl: { fontSize: 9.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' },
  inp: { border: '0.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', width: '100%' },
  inpSm: { border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', width: 100 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  sumTag: { fontSize: 12, fontWeight: 600, marginTop: 10 },
  metaTargets: { fontSize: 12, color: 'var(--stone)', marginTop: 6 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 440 },
  th: { background: 'var(--dark)', color: '#fff', padding: '8px 6px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' },
  td: { padding: '6px', textAlign: 'center', borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' },
  eqInp: { width: 46, border: '0.5px solid var(--border)', borderRadius: 6, padding: '5px', fontSize: 12, textAlign: 'center', fontFamily: 'var(--font)', background: '#fff' },
  totRow: { background: 'var(--cream)' },
  sumGrid: { display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' },
  sumLbl: { fontSize: 10, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 },
  sumBig: { fontFamily: 'var(--font-display), serif', fontSize: 38, color: '#fff', lineHeight: 1 },
  macroCol: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 200 },
  macroItem: { fontSize: 12.5, color: '#fff' },
  saveRow: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginTop: 6 },
  statusTxt: { fontSize: 12.5, color: 'var(--stone)' },
  saveBtn: { background: 'var(--gold)', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
};
