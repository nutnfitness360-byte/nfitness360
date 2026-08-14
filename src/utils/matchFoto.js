// Empareja el nombre de un platillo con una foto.
//
// Banco = ESTÁTICO (public/menu-images/, importado abajo) + DINÁMICO (fotos que
// sube la nutrióloga; se guardan en Firestore y se registran aquí en runtime con
// setBancoCustom). Las entradas dinámicas usan file = 'custom:<slug>' y traen su
// propio data-URI (base64), así que se ven en pantalla y en el PDF sin depender
// de /menu-images/.
//
// Normaliza el nombre (minúsculas, sin acentos, sin palabras de relleno como
// "fit/light/de/con"), lo compara contra las palabras clave de cada foto y
// devuelve la mejor coincidencia + alternativas.

import BANCO_FOTOS from '../data/bancoFotos';

// Carpeta pública donde se sirven las imágenes estáticas (Vercel).
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

// ---- Banco dinámico (fotos subidas por la nutrióloga) ----
// Cada entrada: { slug, label, keys:[], dataUri }
let CUSTOM = [];
let CUSTOM_DATA = {}; // slug -> dataUri

// Lo llama Menus.js al suscribirse a la colección `bancoFotos` de Firestore.
export function setBancoCustom(arr) {
  CUSTOM = Array.isArray(arr) ? arr.filter(x => x && x.slug) : [];
  CUSTOM_DATA = {};
  CUSTOM.forEach(x => { if (x.dataUri) CUSTOM_DATA[x.slug] = x.dataUri; });
}

// Slug estable para el id del documento y la clave 'custom:<slug>'.
export function slugPlatillo(nombre) {
  return norm(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'foto';
}

// Palabras clave a partir del nombre (para que la foto subida se re-empareje luego).
export function keysDeNombre(nombre) {
  return Array.from(new Set(tokens(nombre)));
}

// Entradas del banco dinámico en el mismo formato {file,label,keys} que el estático.
function customEntries() {
  return CUSTOM.map(x => ({ file: 'custom:' + x.slug, label: x.label || x.slug, keys: x.keys || [], _custom: true }));
}

// Devuelve la URL/origen mostrable de una foto por su clave.
export function fotoUrl(file) {
  if (!file) return '';
  if (file.startsWith('data:')) return file;                 // data-URI directo
  if (file.startsWith('custom:')) return CUSTOM_DATA[file.slice(7)] || ''; // foto subida
  return FOTO_BASE + file;                                    // foto del banco estático
}

// Empareja un nombre de platillo. Devuelve:
//   { best: {file,label,keys} | null, score: number, alts: [{file,label,keys}] }
export function matchFoto(nombre) {
  const toks = new Set(tokens(nombre));
  if (!toks.size) return { best: null, score: 0, alts: [] };
  // 1) Si hay una foto subida con EXACTAMENTE el mismo nombre, se prefiere.
  const sl = slugPlatillo(nombre);
  const exacto = CUSTOM.find(x => x.slug === sl);
  const banco = [...customEntries(), ...BANCO_FOTOS];
  const scored = banco
    .map(it => {
      let hit = 0;
      (it.keys || []).forEach(k => { if (toks.has(norm(k))) hit++; });
      // Señal secundaria: cuántas palabras del platillo aparecen en el NOMBRE de la foto.
      const labelToks = new Set(tokens(it.label));
      let labelOverlap = 0;
      toks.forEach(t => { if (labelToks.has(t)) labelOverlap++; });
      return { it, hit, labelOverlap, custom: it._custom ? 1 : 0 };
    })
    .filter(x => x.hit > 0)
    // 1) más keys, 2) más palabras compartidas con el nombre, 3) fotos subidas primero, 4) foto más específica
    .sort((a, b) => b.hit - a.hit || b.labelOverlap - a.labelOverlap || b.custom - a.custom || (a.it.keys || []).length - (b.it.keys || []).length);
  if (exacto) {
    const bestExact = { file: 'custom:' + exacto.slug, label: exacto.label, keys: exacto.keys || [] };
    return { best: bestExact, score: 99, alts: scored.slice(0, 3).map(x => x.it) };
  }
  if (!scored.length) return { best: null, score: 0, alts: [] };
  // Candado de confianza: en platillos COMPUESTOS (3+ palabras de contenido) no
  // autoasignamos una foto que solo coincide en UNA palabra suelta (p. ej.
  // "tostada" o "arroz"): casi siempre es la foto de un ingrediente, no del
  // platillo. Mejor dejar "Sin foto" para que la nutrióloga suba la correcta
  // (que luego se re-empareja sola por su nombre).
  const top = scored[0];
  const contentCount = tokens(nombre).length;
  const fuerte = top.hit >= 2 || top.labelOverlap >= 2 || top.custom === 1;
  if (contentCount >= 3 && !fuerte) {
    return { best: null, score: 0, alts: scored.slice(0, 4).map(x => x.it), lowConfidence: true };
  }
  return { best: top.it, score: top.hit, alts: scored.slice(1, 4).map(x => x.it) };
}

// Atajo: devuelve solo la clave de la mejor coincidencia (o '').
export function matchFotoKey(nombre) {
  const r = matchFoto(nombre);
  return r.best ? r.best.file : '';
}

// Búsqueda para el selector manual: filtra el banco (dinámico + estático) por texto.
export function buscarFotos(q, limit = 40) {
  const f = norm(q);
  const banco = [...customEntries(), ...BANCO_FOTOS];
  if (!f) return banco.slice(0, limit);
  return banco.filter(it => norm(it.label).includes(f) || (it.keys || []).some(k => norm(k).includes(f))).slice(0, limit);
}

// ---- Para el PDF: convierte una foto a data URL (base64) ----
// Las fotos subidas ('custom:' o 'data:') ya son base64; las del banco estático
// se leen del propio dominio (public/menu-images/) y se convierten.
const _dataCache = {};
export async function fotoDataUrl(file) {
  if (!file) return '';
  if (file.startsWith('data:')) return file;
  if (file.startsWith('custom:')) return CUSTOM_DATA[file.slice(7)] || '';
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

// Devuelve un mapa { clave: dataURL } para una lista de claves (para el reporte).
export async function fotosDataMap(keys) {
  const uniq = Array.from(new Set((keys || []).filter(Boolean)));
  const out = {};
  await Promise.all(uniq.map(async k => { const d = await fotoDataUrl(k); if (d) out[k] = d; }));
  return out;
}

export { BANCO_FOTOS };
