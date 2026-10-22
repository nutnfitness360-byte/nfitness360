import React, { useState, useEffect } from 'react';

// Campo de fecha en formato MEXICANO (día/mes/año) que el usuario escribe a mano.
// Reemplaza al <input type="date"> nativo (cuyo formato lo decide el navegador y
// no se puede forzar). Hacia afuera sigue trabajando en ISO (yyyy-mm-dd), así que
// el cálculo de edad, los PDF y Firestore NO cambian: solo cambia cómo se ve/escribe.

// ISO (yyyy-mm-dd) -> display (dd/mm/aaaa)
export function isoADisplay(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

// display (dd/mm/aaaa) -> ISO (yyyy-mm-dd); '' si está incompleto o no es fecha válida
export function displayAIso(disp) {
  const m = String(disp || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return '';
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Enmascara lo tecleado a dd/mm/aaaa (inserta las diagonales solo)
function enmascarar(v) {
  const n = String(v || '').replace(/\D/g, '').slice(0, 8); // ddmmaaaa
  if (n.length <= 2) return n;
  if (n.length <= 4) return n.slice(0, 2) + '/' + n.slice(2);
  return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4);
}

export default function FechaInput({ value, onChange, style, placeholder = 'dd/mm/aaaa', ...rest }) {
  const [txt, setTxt] = useState(isoADisplay(value));

  // Si el valor cambia desde afuera (p. ej. se carga un expediente), refleja el nuevo.
  // No pisa lo que el usuario está tecleando porque mientras escribe no emitimos onChange
  // hasta que la fecha está completa, así que `value` no cambia a media captura.
  useEffect(() => { setTxt(isoADisplay(value)); }, [value]);

  const manejar = (e) => {
    const m = enmascarar(e.target.value);
    setTxt(m);
    if (m === '') { onChange(''); return; }
    const iso = displayAIso(m);
    if (iso) onChange(iso); // solo emite cuando es una fecha completa y válida
  };

  const alSalir = () => {
    // Si quedó incompleta o inválida al salir, se limpia para no dejar basura.
    if (txt && !displayAIso(txt)) { setTxt(isoADisplay(value)); }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={txt}
      style={style}
      onChange={manejar}
      onBlur={alSalir}
      {...rest}
    />
  );
}
