// PDF de Recomendaciones (HTML -> Google lo convierte a PDF en Apps Script).
// Mantiene la marca NF360: encabezado oscuro, acento dorado, tarjetas con fecha + texto.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtFechaHora = (ms) => {
  try {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    const f = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    const h = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${f} · ${h}`;
  } catch (_) { return ''; }
};

export function buildRecomendacionesHTML({ nombre, recomendaciones, fecha } = {}) {
  const recos = (Array.isArray(recomendaciones) ? recomendaciones.slice() : [])
    .sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
  const fechaDoc = new Date(fecha || Date.now())
    .toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const items = recos.map((r) => `
      <div class="reco">
        <div class="rdate">${esc(fmtFechaHora(r.fecha))}</div>
        <div class="rtext">${esc(r.texto)}</div>
      </div>`).join('');
  const vacio = `<div class="empty">Aún no hay recomendaciones registradas.</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { margin:0; font-family: Arial, Helvetica, sans-serif; color:#3A332C; background:#FFFFFF; }
    .hdr { background:#221C16; color:#EEE4DA; padding:26px 34px; display:flex; align-items:center; justify-content:space-between; }
    .brand { font-size:20px; font-weight:800; letter-spacing:3px; }
    .sub { font-size:10px; letter-spacing:2px; color:#CDA788; margin-top:3px; }
    .badge { width:48px; height:48px; border:2px solid #CDA788; border-radius:50%; text-align:center; line-height:46px; color:#CDA788; font-weight:800; font-size:15px; }
    .body { padding:26px 34px; }
    .eyebrow { font-size:11px; letter-spacing:4px; color:#A1968C; font-weight:700; }
    .rule { height:2px; width:48px; background:#CDA788; margin:8px 0 16px; }
    .meta { display:flex; justify-content:space-between; font-size:12px; color:#6E645C; margin-bottom:18px; }
    .meta b { color:#3A332C; }
    .reco { border-left:3px solid #CDA788; background:#F3ECE3; border-radius:0 8px 8px 0; padding:12px 15px; margin-bottom:11px; }
    .rdate { font-size:10px; letter-spacing:1px; color:#A1968C; font-weight:700; text-transform:uppercase; margin-bottom:5px; }
    .rtext { font-size:13px; line-height:1.55; white-space:pre-wrap; }
    .empty { font-size:13px; color:#A1968C; padding:20px 0; }
    .ftr { padding:18px 34px 28px; border-top:1px solid #E3D8CC; display:flex; justify-content:space-between; align-items:flex-end; }
    .fnut { font-size:10.5px; color:#A1968C; line-height:1.5; }
    .fweb { font-size:10px; color:#CDA788; font-weight:700; }
  </style></head><body>
    <div class="hdr">
      <div><div class="brand">NFITNESS 360</div><div class="sub">NUTRICIÓN · ANAID PATIÑO</div></div>
      <div class="badge">NF</div>
    </div>
    <div class="body">
      <div class="eyebrow">RECOMENDACIONES</div>
      <div class="rule"></div>
      <div class="meta"><span><b>Paciente:</b> ${esc(nombre || '—')}</span><span><b>Fecha:</b> ${esc(fechaDoc)}</span></div>
      ${items || vacio}
    </div>
    <div class="ftr">
      <div class="fnut">Lic. N. Natalia Flores<br>Nutrición clínica · NFITNESS 360</div>
      <div class="fweb">nfitness360.com</div>
    </div>
  </body></html>`;
}
