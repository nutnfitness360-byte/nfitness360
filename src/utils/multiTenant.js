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
import { where } from 'firebase/firestore';

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

// Slug del nutriólogo tomado del link ?n=<slug> (canal por el que entra el paciente).
export function slugNutriURL() {
  try {
    const p = new URLSearchParams(window.location.search);
    const n = (p.get('n') || '').trim().toLowerCase();
    return n || null;
  } catch (_) { return null; }
}
