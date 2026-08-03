// Utilidad para mostrar en pantalla el texto con formato de las recomendaciones.
//
// El editor de recomendaciones (RichArea) guarda HTML básico: negritas <b>,
// subrayado <u>, listas <ul><li>, saltos <br>, párrafos <div>/<p> y &nbsp;.
// En pantalla, React escapa los strings por seguridad, por eso las etiquetas
// aparecían como texto ("<div><br></div>", "&nbsp;", "<ul><li>…").
//
// renderRich() limpia ese HTML a una lista blanca de etiquetas seguras y lo
// devuelve listo para usarse con dangerouslySetInnerHTML. Es la MISMA lógica
// que usa el PDF (report/recomendacionesHTML.js) para que ambos coincidan.

const ETIQUETAS_OK = /^(b|strong|i|em|u|ul|ol|li|br|p|div|span)$/i;

export const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export function sanitizeRich(html) {
  let t = String(html == null ? '' : html).replace(/\r?\n/g, ' ');
  // Fuera scripts/estilos por completo (etiqueta y contenido inseguro).
  t = t.replace(/<\/?(script|style)[^>]*>/gi, '');
  // Deja solo las etiquetas de la lista blanca, sin atributos.
  t = t.replace(/<\/?([a-zA-Z0-9]+)[^>]*?>/g, (m, tag) => {
    if (!ETIQUETAS_OK.test(tag)) return '';
    return m.charAt(1) === '/' ? ('</' + tag.toLowerCase() + '>') : ('<' + tag.toLowerCase() + '>');
  });
  return t;
}

// Si trae etiquetas, se limpia y se devuelve como HTML; si es texto plano, se escapa.
export function renderRich(v) {
  const str = String(v == null ? '' : v);
  return /<[a-zA-Z][^>]*>/.test(str) ? sanitizeRich(str) : esc(str);
}
