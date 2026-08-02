/* Navegación por teclado para las tablas de equivalencias.
   Enter / ↓ pasan a la casilla de abajo; ↑ a la de arriba.
   ← y → saltan de columna solo cuando el cursor está al inicio/fin del texto,
   para no estorbar la edición normal dentro de la casilla.

   Cada <input> debe llevar data-row y data-col, y estar dentro de un
   contenedor con [data-gridnav] (o una <table>). */

export function gridKeyDown(e) {
  const el = e.target;
  if (!el || el.tagName !== 'INPUT') return;
  const row = parseInt(el.getAttribute('data-row'), 10);
  const col = parseInt(el.getAttribute('data-col'), 10);
  if (isNaN(row) || isNaN(col)) return;

  const cont = el.closest('[data-gridnav]') || el.closest('table');
  if (!cont) return;

  const len = el.value ? el.value.length : 0;
  const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
  const atEnd = el.selectionStart === len && el.selectionEnd === len;

  let r = row, c = col, nav = false;
  switch (e.key) {
    case 'Enter':
    case 'ArrowDown': r = row + 1; nav = true; break;
    case 'ArrowUp': r = row - 1; nav = true; break;
    case 'ArrowRight': if (atEnd) { c = col + 1; nav = true; } break;
    case 'ArrowLeft': if (atStart) { c = col - 1; nav = true; } break;
    default: return;
  }
  if (!nav) return;

  const find = (rr, cc) => cont.querySelector('input[data-row="' + rr + '"][data-col="' + cc + '"]');
  let target = find(r, c);

  // Con Enter/↓ al final de una columna, salta al inicio de la siguiente columna.
  if (!target && (e.key === 'Enter' || e.key === 'ArrowDown')) target = find(0, col + 1);
  // Con ↑ al inicio de una columna, sube al final de la columna anterior si existe.
  if (!target && e.key === 'ArrowUp' && col > 0) {
    let rr = 0; while (find(rr + 1, col - 1)) rr++;
    target = find(rr, col - 1);
  }

  if (target) {
    e.preventDefault();
    target.focus();
    if (typeof target.select === 'function') target.select();
  }
}
