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

const CREAM = '#F2ECE3';
const TAN = '#CDA788';
const INK = '#1a1612';
const SOFT = '#4a443e';
const STONE = '#8a7d70';
const META = '#7d7368';
const LINE = '#e0d6cb';

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const fechaLarga = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return esc(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
};

// Bloque de firma/logo en la esquina inferior.
const cornerBlock = () => `
  <table class="corner"><tr>
    <td><img src="${LOGO}" class="clogo"/></td>
    <td class="csig">${esc(NUTRI_NOMBRE)}<br/>${esc(NUTRI_LINEA2)}</td>
  </tr></table>`;

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

// Una estación de la línea de tiempo (columna): círculo, imagen, textos.
const estacionCell = (est, esMeta) => {
  const supl = [est.suplemento, est.marca].filter(Boolean).join(' ');
  const cant = est.cantidad ? esc(est.cantidad) : '';
  const caf = est.cafeina === 'Sí' ? ' · cafeína' : '';
  const img = est.img
    ? `<div class="prodwrap"><img src="${est.img}" class="prod"/></div>`
    : `<div class="prodwrap"></div>`;
  const circle = esMeta
    ? `<div class="metawrap">${banderaCuadros()}<div class="circle meta">${esc(est.punto || 'Meta')}</div></div>`
    : `<div class="circle">${esc(est.punto || '')}</div>`;
  const lineas = [
    est.hidratacion ? `<div class="hyd">${esc(est.hidratacion)}</div>` : '',
    supl ? `<div class="supl">${esc(supl)}${cant ? ' · ' + cant : ''}${caf}</div>` : (cant ? `<div class="supl">${cant}${caf}</div>` : ''),
    est.notas ? `<div class="enota">${esc(est.notas)}</div>` : '',
  ].join('');
  return `<td class="stcell">${circle}${img}<div class="sttext">${lineas}</div></td>`;
};

const flechaCell = () => `<td class="arrow">&rsaquo;</td>`;

// ---------------- Página de DISTANCIA ----------------
function paginaDistancia(comp, p) {
  const ests = Array.isArray(p.estaciones) ? p.estaciones : [];
  const cols = [];
  ests.forEach((e, i) => {
    const esMeta = i === ests.length - 1;
    cols.push(estacionCell(e, esMeta));
    if (i < ests.length - 1) cols.push(flechaCell());
  });

  const panelCena = p.cenaPrevia
    ? `<div class="ipanel"><span class="ihead">CENA PREVIA <span class="tag">PM</span></span>${esc(p.cenaPrevia)}${p.electrolitos ? ' · electrolitos' : ''}</div>`
    : '';
  const antes = [
    p.preWorkout ? esc(p.preWorkout) : '',
    p.bebida ? esc(p.bebida) : '',
    p.hidratacion ? '<b>Hidratación:</b> ' + esc(p.hidratacion) : '',
  ].filter(Boolean).join(' · ');
  const panelAntes = antes
    ? `<div class="ipanel"><span class="ihead">ANTES DE LA DISTANCIA <span class="tag">AM</span></span>${antes}</div>`
    : '';
  const nadaNuevo = p.nadaNuevo ? `<span class="nada">NADA NUEVO</span>` : '';
  const notas = p.notas ? `<div class="pnota"><b>Notas:</b> ${esc(p.notas)}</div>` : '';
  const post = p.post ? `<div class="ppost"><b>Recuperación:</b> ${esc(p.post)}</div>` : '';
  const ejeTxt = p.eje === 'tiempo' ? 'por tiempo' : 'por kilómetros';

  return `<div class="page">
    <table class="dhead"><tr>
      <td class="dtitle"><div class="dt1">DISTANCIA</div><div class="dt2">${esc(p.titulo || '')}</div><div class="deje">${ejeTxt} ${nadaNuevo}</div></td>
      <td class="dpanels">${panelCena}${panelAntes}</td>
    </tr></table>

    <table class="timeline"><tr>${cols.join('')}</tr></table>

    ${post}${notas}
    ${cornerBlock()}
  </div>`;
}

// ---------------- Página de CARGA DE CARBOHIDRATOS ----------------
function comidaBox(label, m) {
  if (!m) m = {};
  const tag = /desayuno/i.test(label) ? 'AM' : /cena/i.test(label) ? 'AM/PM' : /snack/i.test(label) ? 'AM/PM' : 'PM';
  const img = m.img ? `<div class="cbimg"><img src="${m.img}"/></div>` : '';
  const ind = m.ind ? `<div class="cbind">${esc(m.ind)}</div>` : '';
  const eq = m.eq ? `<div class="cbeq">${esc(m.eq)}</div>` : '';
  if (!m.ind && !m.eq && !m.img) return '';
  return `<div class="cbox"><div class="cbhead">${esc(label)} <span class="tag">${tag}</span></div>${img}${ind}${eq}</div>`;
}

function paginaCarga(comp, p) {
  const c = p.comidas || {};
  const left = [comidaBox('Desayuno', c.desayuno), comidaBox('Snacks', c.snacks)].filter(Boolean).join('');
  const right = [comidaBox('Comida', c.comida), comidaBox('Cena', c.cena)].filter(Boolean).join('');
  const hid = p.hidratacion ? `<div class="cline"><b>Hidratación:</b> ${esc(p.hidratacion)}</div>` : '';
  const evi = p.evitar ? `<div class="cline"><b>Evitar:</b> ${esc(p.evitar)}</div>` : '';
  const notas = p.notas ? `<div class="cline"><b>Notas:</b> ${esc(p.notas)}</div>` : '';

  return `<div class="page">
    <div class="chead">CARGA DE CARBOHIDRATOS <span class="csub">${esc(p.dias || '')} ${(p.dias === '1') ? 'día' : 'días'}</span></div>
    <table class="cgrid"><tr>
      <td class="ccol">${left}</td>
      <td class="cring"><div class="ringwrap"><img src="${LOGO}" class="ringlogo"/></div></td>
      <td class="ccol">${right}</td>
    </tr></table>
    ${hid}${evi}${notas}
    ${cornerBlock()}
  </div>`;
}

// ---------------- Documento completo ----------------
export function buildDeportivoHTML({ comp, paginas }) {
  comp = comp || {};
  paginas = Array.isArray(paginas) ? paginas : [];

  // Portada breve
  const portada = `<div class="page cover">
    <img src="${LOGO}" class="covlogo"/>
    <div class="covt">NUTRICIÓN DEPORTIVA</div>
    <div class="covname">${esc(comp.nombre || '')}</div>
    <table class="covmeta"><tr>
      ${comp.modalidad ? `<td><span>Modalidad</span>${esc(comp.modalidad)}</td>` : ''}
      ${comp.fecha ? `<td><span>Fecha</span>${fechaLarga(comp.fecha)}</td>` : ''}
      ${comp.objetivo ? `<td><span>Objetivo</span>${esc(comp.objetivo)}</td>` : ''}
    </tr></table>
    ${cornerBlock()}
  </div>`;

  const cuerpo = paginas.map(p => p.tipo === 'carga' ? paginaCarga(comp, p) : paginaDistancia(comp, p)).join('');

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
.dt1{font-size:26px;font-weight:800;letter-spacing:1px;line-height:1;}
.dt2{font-size:26px;font-weight:800;color:${TAN};line-height:1.05;}
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
.circle{width:80px;height:80px;border-radius:50%;background:${TAN};color:#fff;font-size:22px;font-weight:800;text-align:center;line-height:80px;margin:0 auto;}
.circle.meta{background:${META};}
.metawrap{position:relative;}
.prodwrap{width:52px;height:52px;margin:9px auto 6px;}
.prod{max-width:52px;max-height:52px;display:block;margin:0 auto;}
.sttext{font-size:8.5px;color:${SOFT};line-height:1.3;}
.hyd{font-weight:700;}
.supl{margin-top:2px;}
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

/* Carga de carbohidratos */
.chead{font-size:15px;font-weight:800;letter-spacing:2px;color:${STONE};}
.csub{color:${TAN};}
.cgrid{width:100%;border-collapse:collapse;margin-top:4mm;}
.ccol{width:33%;vertical-align:middle;}
.cring{width:34%;text-align:center;vertical-align:middle;}
.ringwrap{width:150px;height:150px;border-radius:50%;border:16px solid ${META};margin:0 auto;text-align:center;}
.ringlogo{width:96px;margin-top:22px;}
.cbox{background:#fff;border:0.5px solid ${LINE};border-radius:10px;padding:9px 11px;margin:6px 4px;}
.cbhead{font-size:11px;font-weight:800;color:${INK};}
.cbimg{margin:5px 0;}
.cbimg img{max-width:60px;max-height:44px;display:block;}
.cbind{font-size:9px;color:${SOFT};line-height:1.4;margin-top:3px;}
.cbeq{font-size:9px;color:${INK};font-weight:700;margin-top:3px;}
.cline{font-size:9.5px;color:${SOFT};margin-top:5px;}

/* Esquina firma */
.corner{position:absolute;bottom:8mm;left:14mm;border-collapse:collapse;}
.corner .clogo{width:30px;}
.corner .csig{font-size:8px;color:${STONE};padding-left:8px;line-height:1.3;}
</style></head><body>
${portada}
${cuerpo}
</body></html>`;
}
