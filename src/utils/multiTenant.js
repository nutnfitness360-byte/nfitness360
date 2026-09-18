// ============================================================================
//  Multi-inquilino (multi-nutriólogo) — utilidades OPT-IN
//  Se activa SOLO si REACT_APP_MULTI_NUTRI === 'true' (p. ej. instancia Fitmeal).
//  Con la bandera apagada, TODAS las funciones son neutras (no agregan filtros ni
//  sellan documentos) → Natalia y Aretia se comportan EXACTAMENTE igual que hoy.
//
//  Concepto: cada documento "de paciente" lleva un campo `nutriDueno` = correo del
//  nutriólogo dueño (minúsculas). Las listas del nutriólogo se filtran por ese dueño
//  y las creaciones lo sellan. Los pacientes ya ven solo lo suyo (por su correo).
// ============================================================================
import { where, doc, getDoc } from 'firebase/firestore';

export const MULTI_NUTRI = String(process.env.REACT_APP_MULTI_NUTRI || '').toLowerCase() === 'true';

// Constraint(s) de dueño para intercalar en query(...). [] si no aplica (bandera
// apagada o sin dueño) → la consulta queda idéntica a la de hoy.
export function filtroDueno(dueno) {
  return (MULTI_NUTRI && dueno) ? [where('nutriDueno', '==', String(dueno).toLowerCase())] : [];
}

// Campos a fusionar al CREAR un documento para sellar al dueño. {} si no aplica.
export function selloDueno(dueno) {
  return (MULTI_NUTRI && dueno) ? { nutriDueno: String(dueno).toLowerCase() } : {};
}

// Perfil del nutriólogo (para PDF/correos) según el dueño del paciente. Lee el doc
// `config/nutriologos` = { perfiles: [ { correo, nombre, cedula, web } , ... ] }.
// Devuelve { nombre, linea2, web } o null (→ el generador usa la identidad de la instancia, env).
// El LOGO del PDF es de marca (mismo para los 3) y va incrustado en el código, no aquí.
export async function cargarPerfilPdf(db, dueno) {
  if (!MULTI_NUTRI || !dueno) return null;
  try {
    const snap = await getDoc(doc(db, 'config', 'nutriologos'));
    const arr = (snap.exists() && Array.isArray(snap.data().perfiles)) ? snap.data().perfiles : [];
    const d = String(dueno).toLowerCase();
    const p = arr.find(x => x && String(x.correo || '').toLowerCase() === d);
    if (!p) return null;
    const linea2 = p.linea2 || [p.cedula, p.correo].filter(Boolean).join(' · ');
    return { nombre: p.nombre || '', linea2, web: p.web || '' };
  } catch (e) { return null; }
}

// Slug del nutriólogo tomado del link ?n=<slug> (canal por el que entra el paciente).
export function slugNutriURL() {
  try {
    const p = new URLSearchParams(window.location.search);
    const n = (p.get('n') || '').trim().toLowerCase();
    return n || null;
  } catch (_) { return null; }
}
