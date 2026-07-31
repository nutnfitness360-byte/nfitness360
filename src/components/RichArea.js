import React, { useRef, useEffect } from 'react';

// Editor de texto sencillo con formato básico para las recomendaciones.
// Guarda HTML (negritas <b>, subrayado <u>, listas <ul><li>). Es "no controlado"
// por dentro para no perder el cursor al escribir: solo re-sincroniza cuando el
// valor cambia desde afuera (cargar borrador, limpiar tras guardar, editar).

function esVacio(html) {
  const t = String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
  return t === '';
}

export default function RichArea({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const lastRef = useRef('');

  useEffect(() => {
    const v = value || '';
    if (ref.current && v !== lastRef.current) {
      ref.current.innerHTML = v;
      lastRef.current = v;
    }
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    let html = ref.current.innerHTML;
    if (esVacio(html)) html = '';
    lastRef.current = html;
    onChange(html);
  };

  // onMouseDown + preventDefault conserva la selección para que el formato se aplique al texto marcado.
  const cmd = (command) => (e) => {
    e.preventDefault();
    if (ref.current) ref.current.focus();
    try { document.execCommand(command, false, null); } catch (_) { /* noop */ }
    emit();
  };

  const showPh = esVacio(value);

  return (
    <div style={styles.wrap}>
      <div style={styles.bar}>
        <button type="button" style={styles.btn} onMouseDown={cmd('bold')} title="Negritas"><b>B</b></button>
        <button type="button" style={styles.btn} onMouseDown={cmd('underline')} title="Subrayado"><span style={{ textDecoration: 'underline' }}>U</span></button>
        <button type="button" style={styles.btn} onMouseDown={cmd('insertUnorderedList')} title="Lista con viñetas">• Lista</button>
      </div>
      <div style={{ position: 'relative' }}>
        {showPh && <div style={styles.ph}>{placeholder}</div>}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          style={styles.area}
          onInput={emit}
          onBlur={emit}
        />
      </div>
    </div>
  );
}

const styles = {
  wrap: { border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' },
  bar: { display: 'flex', gap: 4, padding: '6px 8px', background: 'var(--mint)', borderBottom: '0.5px solid var(--border)' },
  btn: { minWidth: 30, height: 26, padding: '0 8px', border: '0.5px solid var(--border)', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--dark)', fontFamily: 'var(--font)', lineHeight: '24px' },
  area: { minHeight: 72, padding: '9px 11px', fontSize: 13, lineHeight: 1.5, color: 'var(--dark)', fontFamily: 'var(--font)', outline: 'none' },
  ph: { position: 'absolute', top: 9, left: 11, fontSize: 13, color: '#9b9088', pointerEvents: 'none' },
};
