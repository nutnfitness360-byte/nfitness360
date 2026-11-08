import React, { useState } from 'react';

/* ============================================================
   NFITNESS 360 — Somatocarta del paciente (ficha tipo videojuego)
   Fase 4 de la rutina de gimnasio. Todo se calcula con lo que ya se
   registra (peso, reps, fecha) en registrosRutina.porEjercicio + la
   rutina aprobada (para músculo y días planeados). No pide datos nuevos.

   Dos vistas del radar, con botón para alternar: GRÁFICA (pentágono SVG)
   o BARRAS (HTML). La preferencia se recuerda en el navegador.
   Colores siempre resueltos a HEX (nunca var() en el SVG, por Safari).
   ============================================================ */

const REF_FUERZA_1RM = 140;        // kg de 1RM estimado que marca 100 en "Fuerza"
const REF_VOLUMEN_SEMANA = 12000;  // kg/semana que marca 100 en "Volumen"
const REF_RESISTENCIA_REPS = 20;   // reps/serie que marca 100 en "Resistencia"

const EJES = ['Fuerza', 'Volumen', 'Progresión', 'Constancia', 'Resistencia'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (x) => { const n = parseFloat(x); return isFinite(n) ? n : null; };
const epley = (peso, reps) => { const p = num(peso), r = num(reps); if (p == null || r == null) return null; return p * (1 + r / 30); };

function isoWeekKey(fecha) {
  const d = new Date(String(fecha) + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
  return t.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}
function mondayMs(fecha) {
  const d = new Date(String(fecha) + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function calcRacha(fechas) {
  const set = new Set();
  fechas.forEach(f => { const m = mondayMs(f); if (m != null) set.add(m); });
  if (!set.size) return 0;
  const weeks = Array.from(set).sort((a, b) => b - a);
  const WK = 7 * 86400000;
  let racha = 1, cur = weeks[0];
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i] === cur - WK) { racha++; cur = weeks[i]; }
    else if (weeks[i] < cur - WK) break;
  }
  return racha;
}
function calcProgPct(volPorSemana) {
  const keys = Object.keys(volPorSemana).sort();
  if (keys.length < 2) return 0;
  const n = Math.min(4, Math.floor(keys.length / 2));
  if (n < 1) return 0;
  const recientes = keys.slice(-n), previos = keys.slice(-2 * n, -n);
  const avg = (a) => a.reduce((t, w) => t + volPorSemana[w], 0) / a.length;
  const r = avg(recientes), p = avg(previos);
  if (!p) return 0;
  return ((r - p) / p) * 100;
}
function nivelDeXP(xp) {
  let nivel = 1, costo = 100, acum = 0;
  while (xp >= acum + costo) { acum += costo; nivel++; costo += 50; }
  return { nivel, xpEnNivel: xp - acum, xpParaSiguiente: costo };
}
function tituloNivel(n) {
  if (n >= 13) return 'Élite';
  if (n >= 8) return 'Avanzado';
  if (n >= 4) return 'Intermedio';
  return 'Principiante';
}

// ===== Cálculo principal (JS puro; no toca el DOM) =====
export function calcSomatocarta(porEjercicio, rutina) {
  const ejs = porEjercicio || {};
  const ids = Object.keys(ejs);

  const meta = {};
  const diasRutina = (rutina && Array.isArray(rutina.dias)) ? rutina.dias : [];
  diasRutina.forEach(d => (d.ejercicios || []).forEach(e => { if (e && e.id) meta[e.id] = { musculo: e.musculo || '', nombre: e.nombre || '' }; }));

  const hoy = Date.now(), MS30 = 30 * 86400000;
  const fechas = [];
  const diasSet = new Set();
  let volTotal = 0;
  const volPorSemana = {};
  let mejor1RM = 0;
  let sumReps = 0, nReps = 0;
  let prs = 0;
  const musculoCount = {};
  let liftProg = { nombre: '', delta: 0 };

  ids.forEach(id => {
    const sesiones = Array.isArray(ejs[id]) ? ejs[id] : [];
    const asc = sesiones.slice().reverse();
    const musc = (meta[id] && meta[id].musculo) || 'Otro';
    let maxPesoPrev = 0;
    let primer1RM = null, ultimo1RM = null, max1RM30 = 0, max1RMprev = 0;

    asc.forEach(ses => {
      const fecha = ses.fecha;
      if (fecha) { fechas.push(fecha); diasSet.add(fecha); }
      let sesMaxPeso = 0, ses1RM = 0, sesVol = 0;
      (ses.series || []).forEach(s => {
        const p = num(s.peso), r = num(s.reps);
        if (p != null && r != null) { sesVol += p * r; const e = epley(p, r); if (e && e > ses1RM) ses1RM = e; }
        if (p != null && p > sesMaxPeso) sesMaxPeso = p;
        if (r != null) { sumReps += r; nReps++; }
      });
      volTotal += sesVol;
      if (fecha) { const wk = isoWeekKey(fecha); if (wk) volPorSemana[wk] = (volPorSemana[wk] || 0) + sesVol; }
      if (ses1RM > mejor1RM) mejor1RM = ses1RM;
      if (maxPesoPrev > 0 && sesMaxPeso > maxPesoPrev) prs++;
      if (sesMaxPeso > maxPesoPrev) maxPesoPrev = sesMaxPeso;
      musculoCount[musc] = (musculoCount[musc] || 0) + 1;
      const dd = new Date(String(fecha) + 'T00:00:00').getTime();
      if (!isNaN(dd)) {
        const age = hoy - dd;
        if (age <= MS30) { if (ses1RM > max1RM30) max1RM30 = ses1RM; }
        else if (age <= 2 * MS30) { if (ses1RM > max1RMprev) max1RMprev = ses1RM; }
      }
      if (primer1RM == null && ses1RM > 0) primer1RM = ses1RM;
      if (ses1RM > 0) ultimo1RM = ses1RM;
    });

    let deltaKg = 0;
    if (max1RM30 > 0 && max1RMprev > 0) deltaKg = max1RM30 - max1RMprev;
    else if (ultimo1RM && primer1RM) deltaKg = ultimo1RM - primer1RM;
    if (Math.abs(deltaKg) >= Math.abs(liftProg.delta)) liftProg = { nombre: (meta[id] && meta[id].nombre) || '', delta: deltaKg };
  });

  const semanas = Object.keys(volPorSemana);
  const volSemanaProm = semanas.length ? semanas.reduce((t, w) => t + volPorSemana[w], 0) / semanas.length : 0;
  const racha = calcRacha(fechas);

  let diasPlan = 3;
  if (rutina && Number(rutina.dias)) diasPlan = Number(rutina.dias);
  else if (diasRutina.length) diasPlan = diasRutina.length;
  const sesionesPorSemana = semanas.length ? diasSet.size / semanas.length : 0;

  const constancia = clamp((sesionesPorSemana / (diasPlan || 3)) * 100, 0, 100);
  const progresion = clamp(50 + calcProgPct(volPorSemana) * 2.5, 0, 100);
  const fuerza = clamp((mejor1RM / REF_FUERZA_1RM) * 100, 0, 100);
  const volumen = clamp((volSemanaProm / REF_VOLUMEN_SEMANA) * 100, 0, 100);
  const resistencia = nReps ? clamp(((sumReps / nReps) / REF_RESISTENCIA_REPS) * 100, 0, 100) : 0;

  let musculoFav = '', maxM = 0;
  Object.keys(musculoCount).forEach(m => { if (m !== 'Otro' && musculoCount[m] > maxM) { maxM = musculoCount[m]; musculoFav = m; } });
  if (!musculoFav) musculoFav = '—';

  const xp = Math.round(diasSet.size * 10 + prs * 25 + racha * 15 + volTotal / 1000);
  const nv = nivelDeXP(xp);

  return {
    radar: {
      Fuerza: Math.round(fuerza), Volumen: Math.round(volumen), Progresión: Math.round(progresion),
      Constancia: Math.round(constancia), Resistencia: Math.round(resistencia),
    },
    nivel: nv.nivel, titulo: tituloNivel(nv.nivel),
    xpEnNivel: nv.xpEnNivel, xpParaSiguiente: nv.xpParaSiguiente, xpTotal: xp,
    pills: { sesiones: diasSet.size, musculoFav, progreso: liftProg, racha },
    hayDatos: diasSet.size > 0,
  };
}

// Paleta de la marca resuelta a HEX (nunca var() en el SVG; Safari lo rechaza).
function palette() {
  const def = { gold: '#c69a6d', stone: '#8a7f77', border: '#e8ddd4', cream: '#f6f1e8', card: '#ffffff', dark: '#1a1612', sage: '#9ab9ad' };
  try {
    const cs = getComputedStyle(document.documentElement);
    const g = (n, d) => { const v = (cs.getPropertyValue(n) || '').trim(); return v || d; };
    return {
      gold: g('--gold', def.gold), stone: g('--stone', def.stone), border: g('--border', def.border),
      cream: g('--cream', def.cream), card: g('--card', def.card), dark: g('--dark', def.dark), sage: g('--sage', def.sage),
    };
  } catch (e) { return def; }
}

// ===== Vista GRÁFICA: radar de pentágono (SVG, colores ya en hex) =====
function puntoRadar(cx, cy, R, pct, i) {
  const rad = (-90 + i * 72) * Math.PI / 180;
  const r = (clamp(pct, 0, 100) / 100) * R;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function poligono(cx, cy, R, pct) {
  return EJES.map((_, i) => puntoRadar(cx, cy, R, pct, i).map(n => n.toFixed(1)).join(',')).join(' ');
}
function RadarGrafica({ valores, col }) {
  const border = col.border, gold = col.gold, stone = col.stone;
  const cx = 110, cy = 104, R = 74, grid = [25, 50, 75, 100];
  const dataPoly = EJES.map((e, i) => puntoRadar(cx, cy, R, valores[e] || 0, i).map(n => n.toFixed(1)).join(',')).join(' ');
  const labelPos = EJES.map((e, i) => puntoRadar(cx, cy, R + 16, 100, i));
  return (
    <svg viewBox="0 0 220 208" style={{ width: '100%', maxWidth: 260, margin: '8px auto 0', display: 'block' }}>
      <g fill="none" stroke={border} strokeWidth="1">
        {grid.map((g, k) => <polygon key={k} points={poligono(cx, cy, R, g)} />)}
      </g>
      <g stroke={border} strokeWidth="1">
        {EJES.map((e, i) => { const [x, y] = puntoRadar(cx, cy, R, 100, i); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} />; })}
      </g>
      <polygon points={dataPoly} fill={gold} fillOpacity="0.24" stroke={gold} strokeWidth="2" />
      {EJES.map((e, i) => { const [x, y] = puntoRadar(cx, cy, R, valores[e] || 0, i); return <circle key={i} cx={x} cy={y} r="2.6" fill={gold} />; })}
      <g fontSize="9" fontWeight="700" fill={stone} textAnchor="middle">
        {EJES.map((e, i) => { const [x, y] = labelPos[i]; return <text key={i} x={x} y={y + (i === 0 ? -1 : 3)}>{e}</text>; })}
      </g>
    </svg>
  );
}

// ===== Vista BARRAS: una barra por eje (HTML) =====
function RadarBarras({ valores, col }) {
  return (
    <div style={{ marginTop: 10 }}>
      {EJES.map(e => {
        const v = Math.max(0, Math.min(100, valores[e] || 0));
        return (
          <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 82, fontSize: 10.5, color: col.stone, flexShrink: 0 }}>{e}</div>
            <div style={{ flex: 1, height: 9, background: col.cream, borderRadius: 5, overflow: 'hidden', border: '0.5px solid ' + col.border }}>
              <div style={{ height: '100%', width: v + '%', background: col.gold }} />
            </div>
            <div style={{ width: 26, textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: col.dark, flexShrink: 0 }}>{v}</div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Componente principal =====
export default function Somatocarta({ porEjercicio, rutina, nombre, titulo }) {
  const [vista, setVista] = useState(() => {
    try { const v = localStorage.getItem('somato_vista'); return (v === 'barras' || v === 'grafica') ? v : 'grafica'; }
    catch (e) { return 'grafica'; }
  });
  const cambiarVista = (v) => { setVista(v); try { localStorage.setItem('somato_vista', v); } catch (e) {} };

  let d;
  try { d = calcSomatocarta(porEjercicio, rutina); }
  catch (e) { try { console.error('Somatocarta calc error:', e); } catch (_) {} d = { hayDatos: false }; }

  const P = palette();
  const root = { background: P.card, border: '0.5px solid ' + P.border, borderRadius: 16, padding: '16px 16px 18px', marginBottom: 14 };
  const head = { fontSize: 11, letterSpacing: '0.08em', color: P.gold, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 };

  if (!d.hayDatos) {
    return (
      <div style={root}>
        <div style={head}>{titulo || 'Somatocarta'}</div>
        <div style={{ fontSize: 12.5, color: P.stone, lineHeight: 1.5, marginTop: 6 }}>
          Aún no hay registros de entrenamiento para construir la somatocarta. Aparecerá en cuanto {nombre ? 'el paciente registre' : 'registres'} las primeras series.
        </div>
      </div>
    );
  }

  const pct = Math.round((d.xpEnNivel / d.xpParaSiguiente) * 100);
  const prog = d.pills.progreso || { nombre: '', delta: 0 };
  const progTxt = prog.delta ? (prog.delta > 0 ? '+' : '') + (Math.round(prog.delta * 10) / 10) + ' kg' : '—';
  const progSub = prog.nombre ? String(prog.nombre).split(' ')[0] : 'fuerza 30 d';
  const pill = { background: P.cream, border: '0.5px solid ' + P.border, borderRadius: 10, padding: '7px 10px', fontSize: 10.5, color: P.stone, textAlign: 'center', flex: '1 1 72px' };
  const pillB = { display: 'block', color: P.dark, fontSize: 14, fontWeight: 800, lineHeight: 1.15 };
  const segBtn = (on) => ({ background: on ? P.gold : 'transparent', color: on ? '#fff' : P.stone, border: 'none', padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' });

  return (
    <div style={root}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={head}>{titulo || 'Somatocarta'}</div>
          {nombre ? <div style={{ fontSize: 13, fontWeight: 700, color: P.dark }}>{nombre}</div> : null}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: P.cream, border: '0.5px solid ' + P.border, borderRadius: 20, padding: '4px 11px', fontSize: 12, color: P.dark, fontWeight: 600, whiteSpace: 'nowrap' }}>
          Nivel <b style={{ color: P.gold }}>{d.nivel}</b> · {d.titulo}
        </div>
      </div>

      {/* Barra de XP */}
      <div style={{ marginTop: 10 }}>
        <div style={{ height: 7, background: P.cream, borderRadius: 5, overflow: 'hidden', border: '0.5px solid ' + P.border }}>
          <div style={{ height: '100%', width: clamp(pct, 2, 100) + '%', background: P.gold }} />
        </div>
        <div style={{ fontSize: 10.5, color: P.stone, marginTop: 4 }}>{d.xpEnNivel} / {d.xpParaSiguiente} XP para Nivel {d.nivel + 1}</div>
      </div>

      {/* Botón para alternar Gráfica / Barras */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <div style={{ display: 'inline-flex', border: '0.5px solid ' + P.border, borderRadius: 8, overflow: 'hidden' }}>
          <button type="button" onClick={() => cambiarVista('grafica')} style={segBtn(vista === 'grafica')}>Gráfica</button>
          <button type="button" onClick={() => cambiarVista('barras')} style={segBtn(vista === 'barras')}>Barras</button>
        </div>
      </div>

      {/* Radar: gráfica o barras según la preferencia */}
      {vista === 'grafica'
        ? <RadarGrafica valores={d.radar} col={P} />
        : <RadarBarras valores={d.radar} col={P} />}

      {/* Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
        <div style={pill}><b style={pillB}>{d.pills.sesiones}</b>sesiones</div>
        <div style={pill}><b style={pillB}>{d.pills.musculoFav}</b>músculo + usado</div>
        <div style={pill}><b style={pillB}>{progTxt}</b>{progSub}</div>
        <div style={pill}><b style={pillB}>{d.pills.racha}</b>sem. seguidas</div>
      </div>
    </div>
  );
}
