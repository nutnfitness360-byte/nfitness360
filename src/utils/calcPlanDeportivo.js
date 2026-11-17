/* ============================================================
   NFITNESS 360 — Plan deportivo · MOTOR DE CÁLCULO (determinista)
   ------------------------------------------------------------
   Convierte los parámetros de una sesión de fueling (dial de
   carbos/h + duración/ritmo + intervalo) en una LÍNEA DE TIEMPO
   de checkpoints, con una propuesta de productos del banco.
   Sin IA ni red: corre en el front, es instantáneo y predecible.
   La nutrióloga revisa y EDITA la propuesta.

   Uso:
     import { calcularProtocolo } from './calcPlanDeportivo';
     const r = calcularProtocolo(cfg, productos);
   ============================================================ */

const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;

// Minutos → "h:mm" / "mm min"
export function fmtMin(min) {
  const m = Math.max(0, Math.round(num(min)));
  const h = Math.floor(m / 60), mm = m % 60;
  return h > 0 ? (h + ':' + String(mm).padStart(2, '0')) : (mm + ' min');
}

/* --- Selección determinista de productos para ~objetivo g de carbos ---
   Solo "combustible" sólido/gel (NO bebidas: esas van en la hidratación,
   se sorben de continuo, no se consumen de golpe en un checkpoint).
   opts.lead: producto (objeto) con el que arrancar el combo → permite VARIAR
     el producto principal entre checkpoints (rotación) en vez de repetir siempre
     el mismo. opts.maxPiezas (def 3), opts.tolerancia (def 6).
   Greedy: arma el combo de 1 a maxPiezas piezas que mejor se acerque al objetivo
   sin pasarse demasiado. Devuelve { items, carbos }. */
export function seleccionarProductos(objetivo, productos, opts = {}) {
  const maxPiezas = opts.maxPiezas || 3, tolerancia = opts.tolerancia != null ? opts.tolerancia : 6;
  const obj = num(objetivo);
  const cand = (productos || []).filter(p => p && p.tipo !== 'bebida' && num(p.carbos_g) > 0)
    .sort((a, b) => num(b.carbos_g) - num(a.carbos_g));
  if (!(obj > 0) || !cand.length) return { items: [], carbos: 0 };

  const conteo = {};
  let suma = 0;
  // Arranca con el "lead" (producto principal rotado) si cabe sin pasarse demasiado.
  const lead = opts.lead && cand.find(p => p.id === opts.lead.id);
  if (lead && (num(lead.carbos_g) <= obj + tolerancia)) { conteo[lead.id] = 1; suma += num(lead.carbos_g); }
  // Rellena con lo que mejor cierre el objetivo.
  while (Object.values(conteo).reduce((a, b) => a + b, 0) < maxPiezas) {
    const faltan = obj - suma;
    if (faltan <= tolerancia) break;
    let mejor = null, mejorScore = Infinity;
    for (const p of cand) {
      const c = num(p.carbos_g);
      const overshoot = (suma + c) - obj;
      const score = Math.abs(faltan - c) + (overshoot > tolerancia ? overshoot : 0);
      if (score < mejorScore) { mejorScore = score; mejor = p; }
    }
    if (!mejor) break;
    conteo[mejor.id] = (conteo[mejor.id] || 0) + 1;
    suma += num(mejor.carbos_g);
  }
  const items = Object.keys(conteo).map(id => {
    const p = cand.find(x => x.id === id) || productos.find(x => x.id === id);
    return { id, nombre: p.nombre, cant: conteo[id], carbos: r0(conteo[id] * num(p.carbos_g)) };
  });
  return { items, carbos: r0(suma) };
}

/* --- Cálculo principal de una sesión/protocolo de fueling ---
   cfg: {
     carbos_toma,                    // g por toma (el "dial": 15,20,25,30,40 o libre)
     duracion_min | (distancia_km, ritmo_min_km),  // duración directa O calculada
     modo: 'tiempo' | 'km',
     intervalo,                      // min (modo tiempo) o km (modo km)
     liquido_ml_h?, sodio_mg_h?,     // opcionales
     cafeina?: { usar, mg_max? }     // opcional
   }
   productos: lista del banco DISPONIBLE para esta sesión. */
export function calcularProtocolo(cfg, productos) {
  cfg = cfg || {};
  const avisos = [];
  const carbos_toma = num(cfg.carbos_toma);
  if (!(carbos_toma > 0)) return { error: 'Falta los gramos de carbohidrato por toma.' };

  // Duración
  let duracion_min = num(cfg.duracion_min);
  const distancia_km = num(cfg.distancia_km);
  const ritmo = num(cfg.ritmo_min_km);
  if (!(duracion_min > 0) && distancia_km > 0 && ritmo > 0) duracion_min = distancia_km * ritmo;
  if (!(duracion_min > 0)) return { error: 'Falta la duración (directa, o distancia + ritmo).' };
  const duracion_h = duracion_min / 60;

  const modo = cfg.modo === 'km' ? 'km' : 'tiempo';
  const intervalo = num(cfg.intervalo);
  if (!(intervalo > 0)) return { error: 'Falta el intervalo (min o km).' };

  // Construye los puntos de ingesta
  const checkpoints = [];
  if (modo === 'tiempo') {
    for (let min = intervalo; min <= duracion_min + 1e-6; min += intervalo)
      checkpoints.push({ minuto: r0(min), km: ritmo > 0 ? r1(min / ritmo) : null });
  } else {
    if (!(distancia_km > 0)) return { error: 'En modo por distancia falta la distancia total (km).' };
    for (let km = intervalo; km <= distancia_km + 1e-6; km += intervalo)
      checkpoints.push({ km: r1(km), minuto: ritmo > 0 ? r0(km * ritmo) : null });
  }
  if (!checkpoints.length) avisos.push('El intervalo es mayor que la duración/distancia: no hay checkpoints.');

  // Carbos por checkpoint (mantiene el promedio = carbos_h cuando hay base de tiempo)
  let intervalo_h = null;
  if (modo === 'tiempo') intervalo_h = intervalo / 60;
  else if (ritmo > 0) intervalo_h = (intervalo * ritmo) / 60;
  const carbos_cp = carbos_toma;                                  // dosis fija por toma (la define la nutrióloga)
  const carbos_total = carbos_toma * checkpoints.length;          // total = dosis × nº de tomas
  const carbos_h_equiv = intervalo_h ? (carbos_toma / intervalo_h) : null; // g/h resultante (informativo)
  if (carbos_h_equiv != null && (carbos_h_equiv < 30 || carbos_h_equiv > 90))
    avisos.push('Equivale a ' + r0(carbos_h_equiv) + ' g/h (fuera del rango habitual 30–90 g/h).');

  // Opcionales por checkpoint
  const liquido_h = num(cfg.liquido_ml_h), sodio_h = num(cfg.sodio_mg_h);
  const liquido_cp = (intervalo_h && liquido_h) ? liquido_h * intervalo_h : null;
  const sodio_cp = (intervalo_h && sodio_h) ? sodio_h * intervalo_h : null;
  const usarCaf = !!(cfg.cafeina && cfg.cafeina.usar);

  // Llena cada checkpoint
  const fuel = (productos || []).filter(p => p && p.tipo !== 'bebida');
  if (usarCaf && !fuel.some(p => num(p.cafeina_mg) > 0)) avisos.push('Pediste cafeína pero no hay producto con cafeína en el banco disponible.');
  if (!fuel.length) avisos.push('No hay productos de combustible (gel/gomita/pouch/comida) disponibles; agrega al menos uno.');

  const totales = {};
  let carbos_real_total = 0;
  checkpoints.forEach((cp, i) => {
    // Cafeína: sugerida a partir de los 60 min, en checkpoints alternos (la nutrióloga ajusta).
    const puntoCaf = usarCaf && cp.minuto != null && cp.minuto >= 60 && i % 2 === 0;
    // Productos elegibles en ESTE checkpoint: la cafeína SOLO entra en los puntos de cafeína
    // (ni como principal ni como relleno en los demás).
    const prodsCP = puntoCaf ? productos : (productos || []).filter(p => !num(p.cafeina_mg));
    const fuelCP = prodsCP.filter(p => p && p.tipo !== 'bebida');
    // Rota el producto principal para variar entre checkpoints (gel, gomita, pouch, comida…);
    // en punto de cafeína, lidera con un combustible con cafeína.
    let lead = fuelCP.length ? fuelCP[i % fuelCP.length] : null;
    if (puntoCaf) { const caf = fuelCP.find(p => num(p.cafeina_mg) > 0); if (caf) lead = caf; }
    const sel = seleccionarProductos(carbos_cp, prodsCP, { lead });
    cp.carbos_obj = r0(carbos_cp);
    cp.productos = sel.items;
    cp.carbos_real = sel.carbos;
    carbos_real_total += sel.carbos;
    sel.items.forEach(it => { totales[it.id] = (totales[it.id] || 0) + it.cant; });
    if (liquido_cp != null) cp.liquido_ml = r0(liquido_cp);
    if (sodio_cp != null) cp.sodio_mg = r0(sodio_cp);
    if (puntoCaf) cp.cafeina = true;
    cp.etiqueta = modo === 'km' ? (cp.km + ' km') : fmtMin(cp.minuto);
  });

  const resumen = {
    carbos_toma: r0(carbos_toma),
    carbos_h_equiv: carbos_h_equiv != null ? r0(carbos_h_equiv) : null,
    duracion_min: r0(duracion_min), duracion_h: r1(duracion_h),
    carbos_total: r0(carbos_total), carbos_real_total: r0(carbos_real_total),
    n_checkpoints: checkpoints.length, carbos_por_checkpoint: r0(carbos_cp),
    liquido_total_ml: liquido_h ? r0(liquido_h * duracion_h) : null,
    sodio_total_mg: sodio_h ? r0(sodio_h * duracion_h) : null,
    // "qué cargar" en total
    productos: Object.keys(totales).map(id => {
      const p = (productos || []).find(x => x.id === id);
      return { id, nombre: p ? p.nombre : id, unidades: totales[id] };
    })
  };

  return { ok: true, modo, checkpoints, resumen, avisos };
}
