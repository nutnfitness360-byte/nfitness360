/* ============================================================
   NFITNESS 360 — Apego al plan por periodo entre consultas
   ------------------------------------------------------------
   El paciente registra su apego DÍA A DÍA con el contador de
   equivalencias (se guarda en pacientes/{id}.seguimientoEq).
   La nutrióloga, en cambio, no quiere ver el ruido diario: quiere
   UN punto por consulta = el PROMEDIO de los % diarios del periodo
   comprendido entre la consulta anterior y esa consulta.

   Estas funciones convierten los días registrados por el contador
   en la serie de apego que dibuja la gráfica del expediente (y el
   tile de "Apego al plan" del panel del paciente), usando las
   mediciones/consultas como cortes de periodo. Si un periodo no
   tiene ningún día registrado, se usa como respaldo el % de apego
   capturado a mano en la bitácora.
   ============================================================ */

const clampPct = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
};

// Normaliza una fecha (ISO 'YYYY-MM-DD' o timestamp en ms) a 'YYYY-MM-DD'.
const aISO = (f) => {
  if (typeof f === 'string') {
    // ya viene como ISO corto
    if (/^\d{4}-\d{2}-\d{2}/.test(f)) return f.slice(0, 10);
    const d = new Date(f);
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
  }
  const d = new Date(f);
  return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* Lista de días efectivamente registrados por el contador:
   los días cerrados (seguimiento.dias) + el día en curso (si el
   paciente ya lo tocó hoy). Cada elemento: { fecha, pct }. */
export function diasRegistrados(seguimiento) {
  if (!seguimiento || typeof seguimiento !== 'object') return [];
  const out = [];
  const cerrados = Array.isArray(seguimiento.dias) ? seguimiento.dias : [];
  cerrados.forEach((d) => {
    if (!d) return;
    const fecha = aISO(d.fecha);
    const pct = clampPct(d.pct);
    if (fecha && pct != null) out.push({ fecha, pct });
  });
  // Día en curso (solo si el paciente ya interactuó hoy).
  if (seguimiento.fecha && seguimiento.tocado && typeof seguimiento.pctHoy === 'number') {
    const fecha = aISO(seguimiento.fecha);
    const pct = clampPct(seguimiento.pctHoy);
    if (fecha && pct != null && !out.some((x) => x.fecha === fecha)) out.push({ fecha, pct });
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* Serie de apego para la gráfica: un punto por consulta con el
   promedio de los días del periodo. Devuelve [{ fecha, apego }]. */
export function apegoPorPeriodo(mediciones, seguimiento, bitacora) {
  const dias = diasRegistrados(seguimiento);

  // Apego capturado a mano (respaldo): { fecha, apego }.
  const manual = (bitacora || [])
    .filter((b) => b && typeof b.apego === 'number')
    .map((b) => ({ fecha: aISO(b.fecha), apego: clampPct(b.apego) }))
    .filter((x) => x.fecha && x.apego != null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Cortes de periodo = fechas de consultas (mediciones) + fechas del apego manual.
  const set = new Set();
  (mediciones || []).forEach((m) => { const f = m && aISO(m.fecha); if (f) set.add(f); });
  manual.forEach((x) => set.add(x.fecha));
  let cortes = [...set].sort((a, b) => a.localeCompare(b));

  // Si el contador tiene días después del último corte, agrega un corte
  // "en curso" para reflejar el promedio del periodo abierto.
  if (dias.length) {
    const ultDia = dias[dias.length - 1].fecha;
    if (!cortes.length || ultDia > cortes[cortes.length - 1]) cortes.push(ultDia);
  }
  if (!cortes.length) return [];

  const out = [];
  let prev = null;
  for (const c of cortes) {
    const enPeriodo = dias.filter((d) => (prev === null || d.fecha > prev) && d.fecha <= c);
    let apego = null;
    if (enPeriodo.length) {
      apego = Math.round(enPeriodo.reduce((a, d) => a + d.pct, 0) / enPeriodo.length);
    } else {
      const m = manual.filter((x) => (prev === null || x.fecha > prev) && x.fecha <= c);
      if (m.length) apego = m[m.length - 1].apego;
    }
    if (apego != null) out.push({ fecha: c, apego });
    prev = c;
  }
  return out;
}
