/* Prebuild: incrusta en base64 el logo de la instancia para los PDF, leyéndolo de public/.
   Lee REACT_APP_LOGO_URL (color) y REACT_APP_LOGO_CLARO (claro) y genera
   src/report/logoInstancia.gen.js. Es BLINDADO: nunca rompe el build; si algo falla,
   deja exports vacíos (las instancias legacy no los usan). */
const fs = require('fs');
const path = require('path');
const outFile = path.join(__dirname, '..', 'src', 'report', 'logoInstancia.gen.js');
function b64(rel) {
  try {
    if (!rel) return '';
    const f = path.join(__dirname, '..', 'public', String(rel).replace(/^\//, ''));
    if (fs.existsSync(f)) return 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  } catch (e) { /* ignora */ }
  return '';
}
let color = '', claro = '';
try { color = b64(process.env.REACT_APP_LOGO_URL); claro = b64(process.env.REACT_APP_LOGO_CLARO); } catch (e) {}
const body = '// Generado por scripts/gen-logo-pdf.js — NO editar a mano.\n'
  + 'export const LOGO_INSTANCIA = ' + JSON.stringify(color) + ';\n'
  + 'export const LOGO_INSTANCIA_CLARO = ' + JSON.stringify(claro) + ';\n';
try { fs.writeFileSync(outFile, body); } catch (e) {
  try { fs.writeFileSync(outFile, 'export const LOGO_INSTANCIA="";export const LOGO_INSTANCIA_CLARO="";\n'); } catch (_) {}
}
