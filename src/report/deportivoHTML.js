import { FONT_CSS, LOGO, NUTRI_NOMBRE, NUTRI_LINEA2 } from './reporteHTML';

/* ============================================================
   NFITNESS 360 — PDF del plan deportivo (alto rendimiento)
   Genera un documento horizontal (A4 landscape) con:
     - una página por cada "distancia" (línea de tiempo de estaciones)
     - una página por cada "carga de carbohidratos" (logo al centro + tiempos)
   Maquetación pensada para el convertidor HTML→PDF de Google:
   tablas e inline-block con anchos fijos, colores con print-color-adjust,
   nada de flexbox complejo.
   ============================================================ */

/* ---- Paleta del PDF EN COLORES DE CADA MARCA ----
   Prioridad: 1) REACT_APP_BRAND_COLORS (la instancia define sus colores) →
   2) mapa por instancia conocida (por nombre o por hostname) →
   3) default (arena, estilo de la referencia / Natalia). */
function parseBrandColors_(raw) {
  if (!raw) return null;
  try {
    var o = JSON.parse(String(raw).replace(/%23/g, '#'));
    return (o && typeof o === 'object') ? o : null;
  } catch (e) { return null; }
}
var PAL_DEFAULT = { CREAM: '#F2ECE3', TAN: '#CDA788', INK: '#1a1612', SOFT: '#4a443e', STONE: '#8a7d70', META: '#7d7368', LINE: '#e0d6cb', ACCENT: '#CDA788' };
var PAL_MARCA = {
  fitmeal: { CREAM: '#FBF7FA', TAN: '#BA007C', INK: '#32363A', SOFT: '#46414B', STONE: '#7C7A85', META: '#86085D', LINE: '#EAD9E4', ACCENT: '#BA007C' },
  aretia:  { CREAM: '#EFF2F7', TAN: '#E0913F', INK: '#16202E', SOFT: '#3A4656', STONE: '#64726B', META: '#1E3A5F', LINE: '#E1E8F1', ACCENT: '#E0913F' },
};
function hostMarca_() {
  try {
    var h = ((typeof window !== 'undefined' && window.location && window.location.hostname) || '').toLowerCase();
    if (/aretia|sistemanutricio/.test(h)) return 'aretia';
    if (/fitmeal/.test(h)) return 'fitmeal';
  } catch (e) {}
  return '';
}
function resolvePalette_() {
  var bc = parseBrandColors_(process.env.REACT_APP_BRAND_COLORS);
  if (bc && bc['--gold']) {
    return {
      CREAM: bc['--cream'] || PAL_DEFAULT.CREAM,
      TAN: bc['--gold'],
      INK: bc['--ink'] || PAL_DEFAULT.INK,
      SOFT: bc['--stone'] || PAL_DEFAULT.SOFT,
      STONE: bc['--stone'] || PAL_DEFAULT.STONE,
      META: bc['--pine'] || bc['--dark'] || PAL_DEFAULT.META,
      LINE: bc['--line'] || bc['--border'] || PAL_DEFAULT.LINE,
      ACCENT: bc['--gold'],
    };
  }
  var m = (process.env.REACT_APP_MARCA_NOMBRE || '').toLowerCase() || hostMarca_();
  return PAL_MARCA[m] || PAL_DEFAULT;
}
var _P = resolvePalette_();
var CREAM = _P.CREAM, TAN = _P.TAN, INK = _P.INK, SOFT = _P.SOFT, STONE = _P.STONE, META = _P.META, LINE = _P.LINE, ACCENT = _P.ACCENT;

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const fechaLarga = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return esc(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
};

// Bloque de firma/logo en la esquina inferior. Con `perfil` (multi-nutriólogo) usa SUS datos.
const cornerBlock = (perfil) => {
  const nom = (perfil && perfil.nombre) || NUTRI_NOMBRE;
  const l2 = (perfil && perfil.linea2) || NUTRI_LINEA2;
  const lg = (perfil && perfil.logo) || LOGO;
  return `
  <table class="corner"><tr>
    <td><img src="${lg}" class="clogo"/></td>
    <td class="csig">${esc(nom)}<br/>${esc(l2)}</td>
  </tr></table>`;
};

// Bandera a cuadros (fuera del círculo de meta), como tabla b/n: robusta en el convertidor.
const banderaCuadros = () => {
  let filas = '';
  for (let r = 0; r < 3; r++) {
    let celdas = '';
    for (let c = 0; c < 4; c++) {
      const negro = (r + c) % 2 === 0;
      celdas += `<td class="${negro ? 'fq-b' : 'fq-w'}"></td>`;
    }
    filas += `<tr>${celdas}</tr>`;
  }
  return `<table class="flag"><tr><td class="fpole" rowspan="1"></td></tr></table>
    <table class="flagbody">${filas}</table>`;
};

// Una estación de la línea de tiempo (columna): círculo (km grande + tiempo chico), imagen, textos.
const estacionCell = (est, esMeta) => {
  const cant = est.cantidad ? esc(est.cantidad) : '';
  const chip = est.suplemento ? `<span class="schip">${esc(est.suplemento)}</span>` : '';
  const caf = est.cafeina === 'Sí' ? `<div class="cafline"><span class="caf">Cafeína</span></div>` : '';
  const img = est.img
    ? `<div class="prodwrap"><img src="${esc(est.img)}" class="prod"/></div>`
    : `<div class="prodwrap"></div>`;
  const sub = (!esMeta && est.puntoSub) ? `<span class="csmall">${esc(est.puntoSub)}</span>` : '';
  const oneCls = (esMeta || !est.puntoSub) ? ' one' : '';
  const circle = esMeta
    ? `<div class="metawrap">${banderaCuadros()}<div class="circle meta one"><span class="cbig">${esc(est.punto || 'Meta')}</span></div></div>`
    : `<div class="circle${oneCls}"><span class="cbig">${esc(est.punto || '')}</span>${sub}</div>`;
  const lineas = [
    est.hidratacion ? `<div class="hyd">${esc(est.hidratacion)}</div>` : '',
    (chip || cant) ? `<div class="supl">${chip}${cant}</div>` : '',
    caf,
    est.notas ? `<div class="enota">${esc(est.notas)}</div>` : '',
  ].join('');
  return `<td class="stcell">${circle}${img}<div class="sttext">${lineas}</div></td>`;
};

const flechaCell = () => `<td class="arrow">&rsaquo;</td>`;

// Tiempo (min) de una estacion: 0 en la salida, o parseando "H:MM" de puntoSub o punto.
function estMin_(est) {
  if (!est) return null;
  if (String(est.punto) === '0' || String(est.puntoSub || '').toLowerCase() === 'salida') return 0;
  const parse = (s) => { const m = /^\s*(\d+):(\d{1,2})\s*$/.exec(String(s == null ? '' : s)); return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : null; };
  const a = parse(est.puntoSub); if (a != null) return a;
  const b = parse(est.punto); if (b != null) return b;
  return null;
}
function fmtHM_(min) { const h = Math.floor(min / 60), m = min % 60; return h + ':' + (m < 10 ? '0' : '') + m; }

// Celda entre dos estaciones: ticks de hidratacion segun la frecuencia (min); si no, una flecha.
function gapCell_(a, b, freq, cant) {
  const t1 = estMin_(a), t2 = estMin_(b);
  if (freq > 0 && t1 != null && t2 != null && t2 > t1) {
    const items = [];
    for (let k = Math.floor(t1 / freq) + 1; k * freq < t2; k++) {
      const tm = k * freq;
      items.push(`<td class="htk"><div class="htt">${fmtHM_(tm)}</div><div class="htmk"></div>${cant ? `<div class="htv">${cant}</div>` : ''}</td>`);
    }
    if (items.length) return `<td class="gapcell"><table class="htks"><tr>${items.join('')}</tr></table></td>`;
  }
  return `<td class="gapcell"><div class="arrowbig">&rsaquo;</div></td>`;
}

// ---------------- Página de DISTANCIA ----------------
function paginaDistancia(comp, p, perfil) {
  const ests = Array.isArray(p.estaciones) ? p.estaciones : [];
  const _freq = parseInt(p.hidFreq, 10);
  const _cant = p.hidCantidad ? esc(p.hidCantidad) : '';
  const cols = [];
  ests.forEach((e, i) => {
    const esMeta = i === ests.length - 1;
    cols.push(estacionCell(e, esMeta));
    if (i < ests.length - 1) cols.push(gapCell_(e, ests[i + 1], _freq, _cant));
  });

  const panelCena = p.cenaPrevia
    ? `<div class="ipanel"><span class="ihead">CENA PREVIA <span class="tag">PM</span></span>${esc(p.cenaPrevia)}${p.electrolitos ? ' · electrolitos' : ''}</div>`
    : '';
  const antes = p.preWorkout ? esc(p.preWorkout) : '';
  const panelAntes = antes
    ? `<div class="ipanel"><span class="ihead">ANTES DE LA DISTANCIA <span class="tag">AM</span></span>${antes}</div>`
    : '';
  // Hidratacion en su propio recuadro: frecuencia + cantidad + producto (compat con el campo viejo).
  const hidResumen = [p.hidFreq ? ('Cada ' + esc(p.hidFreq) + ' min') : '', p.hidCantidad ? esc(p.hidCantidad) : ''].filter(Boolean).join(' · ');
  const hidProd = p.hidProducto ? esc(p.hidProducto) : (p.hidratacion ? esc(p.hidratacion) : '');
  const panelHid = (hidResumen || hidProd)
    ? `<div class="ipanel hydbox"><span class="ihead">HIDRATACIÓN <span class="tag">EN RUTA</span></span>${hidResumen ? '<span class="hfreq">' + hidResumen + '</span>' : ''}${hidResumen && hidProd ? ' — ' : ''}${hidProd}</div>`
    : '';
  const nadaNuevo = p.nadaNuevo ? `<span class="nada">NADA NUEVO</span>` : '';
  const notas = p.notas ? `<div class="pnota"><b>Notas:</b> ${esc(p.notas)}</div>` : '';
  const post = p.post ? `<div class="ppost"><b>Recuperación:</b> ${esc(p.post)}</div>` : '';
  const ejeTxt = p.eje === 'tiempo' ? 'por tiempo' : 'por kilómetros';

  return `<div class="page">
    <table class="dhead"><tr>
      <td class="dtitle"><div class="dt1">DISTANCIA</div><div class="dt2">${esc(p.titulo || '')}</div><div class="deje">${ejeTxt} ${nadaNuevo}</div></td>
      <td class="dpanels">${panelCena}${panelAntes}${panelHid}</td>
    </tr></table>

    <table class="timeline"><tr>${cols.join('')}</tr></table>

    ${post}${notas}
    ${cornerBlock(perfil)}
  </div>`;
}

// ---------------- Página de CARGA DE CARBOHIDRATOS (rueda, fondo oscuro de marca) ----------------
function paginaCarga(comp, p, perfil) {
  const c = p.comidas || {};
  const lg = (perfil && perfil.logo) || LOGO;
  const diasTxt = '-' + (p.dias || '') + ' ' + (p.dias === '1' ? 'día' : 'días') + ' de carga';

  // Bloque de texto de una sección (al margen)
  const blk = (label, tag, ind, eq) => {
    if (!ind && !eq) return '';
    return `<div class="cblk"><div class="cbh">${esc(label)} <span class="tag">${tag}</span></div>`
      + (ind ? `<div class="cbd">${esc(ind)}</div>` : '')
      + (eq ? `<div class="cbq">${esc(eq)}</div>` : '')
      + `</div>`;
  };
  // Círculo de foto sobre el aro (usa la imagen si existe; si no, queda el aro)
  const pc = (pos, img, tag, tagPos) => {
    const inner = img ? `<img src="${esc(img)}" class="cpimg"/>` : '';
    return `<div class="cpc" style="${pos}">${inner}</div>`
      + (tag ? `<div class="cpt" style="${tagPos}">${tag}</div>` : '');
  };

  const der = [
    blk('Desayuno', 'AM', c.desayuno && c.desayuno.ind, c.desayuno && c.desayuno.eq),
    p.hidratacion ? blk('Hidratación', 'AM', p.hidratacion, '') : '',
    blk('Comidas', 'PM', c.comida && c.comida.ind, c.comida && c.comida.eq),
  ].filter(Boolean).join('');
  const izq = [
    blk('Cena', 'PM', c.cena && c.cena.ind, c.cena && c.cena.eq),
    blk('Snacks', 'AM/PM', c.snacks && c.snacks.ind, c.snacks && c.snacks.eq),
  ].filter(Boolean).join('');

  const circles =
    pc('top:20px;left:210px', c.desayuno && c.desayuno.img, 'AM', 'top:12px;left:300px') +
    pc('top:151px;left:391px', null, 'AM', 'top:150px;left:500px') +
    pc('top:364px;left:322px', c.comida && c.comida.img, 'PM', 'top:468px;left:430px') +
    pc('top:364px;left:98px', c.cena && c.cena.img, 'PM', 'top:468px;left:84px') +
    pc('top:151px;left:29px', c.snacks && c.snacks.img, 'AM/PM', 'top:150px;left:2px');

  const foot = [p.evitar ? 'Evitar: ' + esc(p.evitar) : '', p.notas ? esc(p.notas) : ''].filter(Boolean).join(' · ');

  return `<div class="page dark">
    <div class="ctitle"><div class="ct1">CARGA DE<br/>CARBOHIDRATOS</div><div class="ct2">${esc(diasTxt)}</div></div>
    <table class="cgrid2"><tr>
      <td class="ccol2">${izq}</td>
      <td class="cwheelcell">
        <div class="cwheel">
          <div class="cring2"><div class="cmedal"><img src="${lg}" class="cringlogo"/></div></div>
          ${circles}
        </div>
      </td>
      <td class="ccol2">${der}</td>
    </tr></table>
    ${foot ? `<div class="cfoot">${foot}</div>` : ''}
    ${cornerBlock(perfil)}
  </div>`;
}

// ---------------- Documento completo ----------------
export function buildDeportivoHTML({ comp, paginas, perfil = null }) {
  comp = comp || {};
  paginas = Array.isArray(paginas) ? paginas : [];

  // Portada breve
  const portada = `<div class="page cover">
    <img src="${(perfil && perfil.logo) || LOGO}" class="covlogo"/>
    <div class="covt">NUTRICIÓN DEPORTIVA</div>
    <div class="covname">${esc(comp.nombre || '')}</div>
    <table class="covmeta"><tr>
      ${comp.modalidad ? `<td><span>Modalidad</span>${esc(comp.modalidad)}</td>` : ''}
      ${comp.fecha ? `<td><span>Fecha</span>${fechaLarga(comp.fecha)}</td>` : ''}
      ${comp.objetivo ? `<td><span>Objetivo</span>${esc(comp.objetivo)}</td>` : ''}
    </tr></table>
    ${cornerBlock(perfil)}
  </div>`;

  const cuerpo = paginas.map(p => p.tipo === 'carga' ? paginaCarga(comp, p, perfil) : paginaDistancia(comp, p, perfil)).join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
${FONT_CSS}
@page{size:A4 landscape;margin:0;}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;color:${INK};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{position:relative;width:297mm;height:209mm;background:${CREAM};padding:12mm 14mm 16mm;page-break-after:always;overflow:hidden;}
.page:last-child{page-break-after:auto;}

/* Portada */
.cover{text-align:center;}
.covlogo{width:120px;margin:14mm auto 6mm;display:block;}
.covt{font-size:26px;font-weight:800;letter-spacing:3px;color:${INK};}
.covname{font-size:20px;font-weight:600;color:${TAN};margin-top:6px;}
.covmeta{margin:14mm auto 0;border-collapse:collapse;}
.covmeta td{padding:0 18px;font-size:12px;color:${SOFT};text-align:center;border-left:1px solid ${LINE};}
.covmeta td:first-child{border-left:none;}
.covmeta span{display:block;font-size:9px;letter-spacing:1px;color:${STONE};font-weight:700;margin-bottom:3px;}

/* Encabezado de distancia */
.dhead{width:100%;border-collapse:collapse;}
.dtitle{vertical-align:top;width:34%;}
.dt1{font-size:26px;font-weight:800;letter-spacing:1px;line-height:1;color:${INK};}
.dt2{font-size:26px;font-weight:800;color:${ACCENT};line-height:1.05;}
.deje{font-size:10px;color:${STONE};margin-top:4px;}
.nada{display:inline-block;background:${TAN};color:#fff;font-size:9px;font-weight:800;letter-spacing:1px;padding:2px 8px;border-radius:8px;margin-left:6px;}
.dpanels{vertical-align:top;}
.ipanel{background:#fff;border:0.5px solid ${LINE};border-radius:8px;padding:8px 11px;font-size:10px;color:${SOFT};line-height:1.35;margin-bottom:7px;}
.ihead{display:block;font-weight:800;color:${STONE};letter-spacing:0.5px;font-size:9px;margin-bottom:2px;}
.tag{background:${TAN};color:#fff;border-radius:999px;padding:1px 7px;font-size:8px;font-weight:700;margin-left:4px;}

/* Línea de tiempo */
.timeline{width:100%;border-collapse:collapse;margin-top:6mm;}
.stcell{vertical-align:top;text-align:center;padding:0 2px;}
.arrow{vertical-align:middle;color:#b5a893;font-size:22px;font-weight:700;width:16px;padding-bottom:70px;}
.circle{width:84px;height:84px;border-radius:50%;background:${TAN};color:#fff;text-align:center;margin:0 auto;}
.circle .cbig{display:block;font-size:19px;font-weight:800;line-height:1;padding-top:25px;}
.circle .csmall{display:block;font-size:10px;font-weight:700;opacity:0.92;line-height:1.1;margin-top:3px;}
.circle.one .cbig{padding-top:33px;}
.circle.meta{background:${META};}
.metawrap{position:relative;}
.prodwrap{width:52px;height:52px;margin:9px auto 6px;}
.prod{max-width:52px;max-height:52px;display:block;margin:0 auto;}
.sttext{font-size:8.5px;color:${SOFT};line-height:1.3;}
.hyd{font-weight:700;}
.supl{margin-top:3px;}
.schip{display:inline-block;font-size:7.5px;font-weight:800;letter-spacing:0.3px;color:#fff;background:${ACCENT};border-radius:4px;padding:1px 5px;margin-right:4px;}
.cafline{margin-top:3px;}
.caf{display:inline-block;font-size:8px;font-weight:700;color:${META};border:0.5px solid ${META};border-radius:999px;padding:1px 7px;}
.enota{margin-top:2px;color:${STONE};}

/* Bandera a cuadros (fuera del círculo) */
.metawrap .flag{margin:0 auto;border-collapse:collapse;}
.fpole{width:3px;height:0;background:${INK};}
.flagbody{margin:0 auto 3px;border-collapse:collapse;}
.flagbody td{width:9px;height:8px;padding:0;}
.fq-b{background:${INK};}
.fq-w{background:#fff;border:0.5px solid ${INK};}

.ppost{font-size:10px;color:${SOFT};margin-top:8mm;}
.pnota{font-size:9.5px;color:${STONE};margin-top:5px;}
.hydbox{border:1px solid ${TAN};}
.hfreq{color:${TAN};font-weight:700;}
/* Ticks de hidratacion entre estaciones */
.gapcell{vertical-align:top;text-align:center;padding:0 2px;}
.arrowbig{color:#b5a893;font-size:22px;font-weight:700;padding-top:32px;}
.htks{border-collapse:collapse;margin:30px auto 0;}
.htks td.htk{text-align:center;padding:0 4px;vertical-align:top;}
.htt{font-size:8px;font-weight:700;color:${INK};}
.htmk{width:1.5px;height:12px;background:${TAN};margin:3px auto;}
.htv{font-size:7.5px;color:${STONE};}

/* Carga de carbohidratos — rueda en fondo oscuro de marca */
.page.dark{background:${INK};color:${CREAM};}
.dark .tag{background:${ACCENT};color:${INK};}
.ctitle{margin-bottom:3mm;}
.ct1{font-size:31px;font-weight:800;letter-spacing:2px;line-height:1.05;color:${CREAM};}
.ct2{font-size:13px;font-weight:700;letter-spacing:2px;color:${ACCENT};margin-top:5px;text-transform:uppercase;}
.cgrid2{width:100%;border-collapse:collapse;}
.ccol2{width:29%;vertical-align:middle;}
.cblk{margin-bottom:9mm;}
.cbh{font-size:13.5px;font-weight:800;letter-spacing:0.4px;color:${CREAM};text-transform:uppercase;}
.cbd{font-size:11.5px;color:${CREAM};line-height:1.45;margin-top:3px;}
.cbq{font-size:11px;color:${ACCENT};font-weight:700;margin-top:3px;}
.cwheelcell{width:42%;text-align:center;vertical-align:middle;}
.cwheel{position:relative;width:540px;height:540px;margin:0 auto;}
.cring2{position:absolute;top:80px;left:80px;width:380px;height:380px;border-radius:50%;border:16px solid ${STONE};}
.cmedal{position:absolute;top:79px;left:79px;width:190px;height:190px;border-radius:50%;background:${CREAM};text-align:center;}
.cringlogo{width:118px;margin-top:66px;}
.cpc{position:absolute;width:120px;height:120px;border-radius:50%;border:4px solid ${ACCENT};background:${META};overflow:hidden;}
.cpimg{width:100%;height:100%;object-fit:cover;display:block;}
.cpt{position:absolute;background:${ACCENT};color:${INK};border-radius:999px;padding:2px 9px;font-size:9.5px;font-weight:800;}
.cfoot{position:absolute;left:14mm;right:14mm;bottom:9mm;text-align:center;font-size:10.5px;color:${STONE};line-height:1.45;}

/* Esquina firma */
.corner{position:absolute;bottom:8mm;left:14mm;border-collapse:collapse;}
.corner .clogo{width:30px;}
.corner .csig{font-size:8px;color:${STONE};padding-left:8px;line-height:1.3;}
</style></head><body>
${portada}
${cuerpo}
</body></html>`;
}
