// ============================================================
// NFITNESS 360 — Lógica de "saldo de consultas" (paquetes)
// Módulo PURO: sin React ni Firebase. Fácil de probar.
//
// Doc de créditos (colección `creditosConsultas`, id = correo normalizado):
//   { correo, lotes:[Lote], usos:[Uso] }
// Lote: {
//   id, familia:'normal'|'deportiva', consultas, restantes,
//   origen, monto, fecha(ISO), paqueteId, paqueteNombre,
//   vigenciaMeses, primeraConsultaFecha(ISO|null), vence(ISO|null)
// }
//   - La vigencia arranca en la PRIMERA consulta usada del lote:
//     mientras `primeraConsultaFecha` sea null, el lote NO vence.
//     Al gastar el primer crédito se fija `primeraConsultaFecha` y `vence`.
// Uso: { fecha(ISO), citaId, loteId, familia }
// ============================================================

export const PAQUETES_DEFAULT = [
  { id: 'pres6', nombre: '6 consultas',            familia: 'normal',    consultas: 6, precio: 4999, vigenciaMeses: 6 },
  { id: 'pres3', nombre: '3 consultas',            familia: 'normal',    consultas: 3, precio: 2699, vigenciaMeses: 3 },
  { id: 'dep3',  nombre: '3 consultas deportivas', familia: 'deportiva', consultas: 3, precio: 3600, vigenciaMeses: 3 },
  { id: 'dep6',  nombre: '6 consultas deportivas', familia: 'deportiva', consultas: 6, precio: 7200, vigenciaMeses: 3 },
];

export const FAMILIAS = [
  { id: 'normal', label: 'Normal' },
  { id: 'deportiva', label: 'Deportiva' },
];

export function familiaLabel(f) {
  return f === 'deportiva' ? 'Deportiva' : 'Normal';
}

// Familia de un servicio de la agenda (por id/nombre): deportiva si menciona "deportiv" o "dep".
export function familiaDeServicio(serv) {
  if (!serv) return 'normal';
  const t = ((serv.id || '') + ' ' + (serv.nombre || '')).toLowerCase();
  const esDep = t.includes('deportiv') || t.includes('_dep') || /\bdep\b/.test(t);
  return esDep ? 'deportiva' : 'normal';
}

// Normaliza el doc de créditos a { lotes, usos }.
export function normalizarCreditos(cred) {
  const c = cred || {};
  return {
    lotes: Array.isArray(c.lotes) ? c.lotes.map(l => ({ ...l })) : [],
    usos: Array.isArray(c.usos) ? c.usos.map(u => ({ ...u })) : [],
  };
}

// Suma months meses a una fecha ISO, respetando fin de mes.
export function addMonthsISO(iso, months) {
  const d = new Date(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + Number(months || 0));
  if (d.getDate() < day) d.setDate(0); // p.ej. 31 ene + 1 mes → 28/29 feb
  return d.toISOString();
}

// Fecha de vencimiento de un lote (null si aún no arranca).
export function venceDeLote(lote) {
  if (!lote || !lote.primeraConsultaFecha) return null;
  if (lote.vence) return lote.vence;
  return addMonthsISO(lote.primeraConsultaFecha, lote.vigenciaMeses);
}

// ¿El lote tiene créditos usables ahora?
export function loteVigente(lote, nowISO) {
  if (!lote || (lote.restantes || 0) <= 0) return false;
  const vence = venceDeLote(lote);
  if (!vence) return true; // no ha arrancado: nunca vencido todavía
  return new Date(vence).getTime() > new Date(nowISO).getTime();
}

// Saldo disponible (créditos vigentes) de una familia.
export function saldoDisponible(cred, familia, nowISO) {
  const { lotes } = normalizarCreditos(cred);
  return lotes
    .filter(l => l.familia === familia && loteVigente(l, nowISO))
    .reduce((n, l) => n + (l.restantes || 0), 0);
}

// Resumen por familia: { normal:{disponible, lotes:[...]}, deportiva:{...} }
export function resumenSaldo(cred, nowISO) {
  const { lotes } = normalizarCreditos(cred);
  const out = {};
  ['normal', 'deportiva'].forEach(f => {
    const suyos = lotes.filter(l => l.familia === f);
    out[f] = {
      disponible: suyos.filter(l => loteVigente(l, nowISO)).reduce((n, l) => n + (l.restantes || 0), 0),
      lotes: suyos,
    };
  });
  return out;
}

// Orden de consumo (FIFO por vencimiento): primero los ya arrancados que vencen antes,
// luego los que aún no arrancan por fecha de compra.
function ordenConsumo(lotes, familia, nowISO) {
  return lotes
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.familia === familia && loteVigente(l, nowISO))
    .sort((a, b) => {
      const va = venceDeLote(a.l), vb = venceDeLote(b.l);
      if (va && vb) return new Date(va) - new Date(vb);
      if (va && !vb) return -1; // arrancados (con vencimiento) primero
      if (!va && vb) return 1;
      // ninguno arrancado: por fecha de compra ascendente
      return new Date(a.l.fecha || 0) - new Date(b.l.fecha || 0);
    })
    .map(({ i }) => i);
}

// Consume 1 crédito de la familia dada. Devuelve { cred, loteId } o null si no hay saldo.
export function consumirCredito(cred, familia, nowISO, citaId) {
  const next = normalizarCreditos(cred);
  const orden = ordenConsumo(next.lotes, familia, nowISO);
  if (!orden.length) return null;
  const idx = orden[0];
  const lote = next.lotes[idx];
  lote.restantes = (lote.restantes || 0) - 1;
  if (!lote.primeraConsultaFecha) {
    lote.primeraConsultaFecha = nowISO;
    lote.vence = addMonthsISO(nowISO, lote.vigenciaMeses);
  }
  next.usos.push({ fecha: nowISO, citaId: citaId || null, loteId: lote.id, familia });
  return { cred: next, loteId: lote.id };
}

// Devuelve 1 crédito a un lote (p.ej. cancelación dentro de política). Devuelve cred.
export function devolverCredito(cred, loteId, citaId) {
  const next = normalizarCreditos(cred);
  const lote = next.lotes.find(l => l.id === loteId);
  if (lote) {
    lote.restantes = Math.min((lote.restantes || 0) + 1, lote.consultas || (lote.restantes || 0) + 1);
  }
  if (citaId) {
    const j = next.usos.findIndex(u => u.citaId === citaId && u.loteId === loteId);
    if (j >= 0) next.usos.splice(j, 1);
  }
  return next;
}

// Crea un lote nuevo (para abonar manualmente o desde un paquete).
export function nuevoLote({ id, familia, consultas, origen, monto, vigenciaMeses, paqueteId, paqueteNombre, fecha }) {
  const n = Math.max(1, parseInt(consultas, 10) || 0);
  return {
    id: id || ('l' + Date.now() + Math.random().toString(36).slice(2, 6)),
    familia: familia === 'deportiva' ? 'deportiva' : 'normal',
    consultas: n,
    restantes: n,
    origen: origen || 'manual',
    monto: monto == null ? null : Number(monto),
    fecha: fecha || new Date().toISOString(),
    paqueteId: paqueteId || null,
    paqueteNombre: paqueteNombre || null,
    vigenciaMeses: Math.max(1, parseInt(vigenciaMeses, 10) || 6),
    primeraConsultaFecha: null,
    vence: null,
  };
}
