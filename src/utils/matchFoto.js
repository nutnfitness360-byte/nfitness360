// Empareja el nombre de un platillo con una foto del banco (public/menu-images/).
//
// Normaliza el nombre (minúsculas, sin acentos, sin palabras de relleno como
// "fit/light/de/con"), lo compara contra las palabras clave de cada foto y
// devuelve la mejor coincidencia + alternativas. Si no hay coincidencia, la
// nutrióloga puede poner la foto a mano.
//
// La misma lógica que se validó en la demo del banco.

import BANCO_FOTOS from '../data/bancoFotos';

// Carpeta pública donde se sirven las imágenes (Vercel).
export const FOTO_BASE = '/menu-images/';

const FILLERS = new Set([
  'fit', 'light', 'healthy', 'casero', 'caseros', 'estilo', 'al', 'a', 'la',
  'el', 'los', 'las', 'con', 'de', 'del', 'y', 'o', 'u', 'sin', 'en', 'para',
  'un', 'una', 'tipo', 'style', 'receta', 'opcion', 'gusto', 'rico', 'fresco',
  'sencillo', 'proteico', 'proteica',
]);

function norm(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function tokens(s) {
  return norm(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !FILLERS.has(w));
}

// Devuelve la URL pública de una foto por su nombre de archivo.
export function fotoUrl(file) {
  return file ? FOTO_BASE + file : '';
}

// Empareja un nombre de platillo. Devuelve:
//   { best: {file,label,keys} | null, score: number, alts: [{file,label,keys}] }
export function matchFoto(nombre) {
  const toks = new Set(tokens(nombre));
  if (!toks.size) return { best: null, score: 0, alts: [] };
  const scored = BANCO_FOTOS
    .map(it => {
      let hit = 0;
      it.keys.forEach(k => { if (toks.has(norm(k))) hit++; });
      // Señal secundaria: cuántas palabras del platillo aparecen en el NOMBRE de la foto.
      const labelToks = new Set(tokens(it.label));
      let labelOverlap = 0;
      toks.forEach(t => { if (labelToks.has(t)) labelOverlap++; });
      return { it, hit, labelOverlap };
    })
    .filter(x => x.hit > 0)
    // 1) más coincidencias de palabras clave, 2) más palabras compartidas con el nombre, 3) foto más específica
    .sort((a, b) => b.hit - a.hit || b.labelOverlap - a.labelOverlap || a.it.keys.length - b.it.keys.length);
  if (!scored.length) return { best: null, score: 0, alts: [] };
  return { best: scored[0].it, score: scored[0].hit, alts: scored.slice(1, 4).map(x => x.it) };
}

// Atajo: devuelve solo el nombre de archivo de la mejor coincidencia (o '').
export function matchFotoKey(nombre) {
  const r = matchFoto(nombre);
  return r.best ? r.best.file : '';
}

// Búsqueda para el selector manual: filtra el banco por texto (nombre o keys).
export function buscarFotos(q, limit = 40) {
  const f = norm(q);
  if (!f) return BANCO_FOTOS.slice(0, limit);
  return BANCO_FOTOS.filter(it => norm(it.label).includes(f) || it.keys.some(k => norm(k).includes(f))).slice(0, limit);
}

// ---- Para el PDF: convierte una foto del banco a data URL (base64) ----
// El reporte se convierte a PDF en Apps Script, que sí incrusta data URLs
// (como las fotos que sube la nutrióloga). Aquí se leen las imágenes del
// propio dominio (public/menu-images/) y se convierten a base64.
const _dataCache = {};
export async function fotoDataUrl(file) {
  if (!file) return '';
  if (_dataCache[file]) return _dataCache[file];
  try {
    const res = await fetch(fotoUrl(file));
    if (!res.ok) return '';
    const blob = await res.blob();
    const data = await new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve('');
      r.readAsDataURL(blob);
    });
    _dataCache[file] = data;
    return data;
  } catch (_) { return ''; }
}

// Devuelve un mapa { file: dataURL } para una lista de archivos (para el reporte).
export async function fotosDataMap(keys) {
  const uniq = Array.from(new Set((keys || []).filter(Boolean)));
  const out = {};
  await Promise.all(uniq.map(async k => { const d = await fotoDataUrl(k); if (d) out[k] = d; }));
  return out;
}

export { BANCO_FOTOS };
