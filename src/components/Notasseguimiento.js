import React from 'react';

/* Panel lateral de solo lectura con las notas de seguimiento del paciente.
   Se usa desde el Plan nutricional y desde Menús para consultarlas sin salir
   de la pantalla. Las notas viven en patient.bitacora: { fecha, texto, apego? }. */

const fmtFechaNota = (ms) => {
  try {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  } catch (e) { return ''; }
};

export default function NotasSeguimiento({ notas, nombre, onClose, closeBtnStyle }) {
  const lista = Array.isArray(notas)
    ? [...notas].sort((a, b) => (b.fecha || 0) - (a.fecha || 0))
    : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      <div style={{ position: 'relative', width: 'min(640px, 94vw)', height: '100%', background: 'var(--cream)', boxShadow: '-10px 0 30px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--card)' }}>
          <span style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14 }}>
            Notas de seguimiento{nombre ? ' · ' + nombre : ''}{' '}
            <span style={{ fontWeight: 400, color: 'var(--stone)', fontSize: 12 }}>(solo lectura)</span>
          </span>
          <button style={closeBtnStyle} onClick={onClose}>Cerrar ✕</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', padding: 16 }}>
          {lista.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '20px 16px', textAlign: 'center', color: 'var(--stone)', fontSize: 13, lineHeight: 1.55, fontFamily: 'var(--font)' }}>
              El paciente aún no cuenta con notas de seguimiento.
            </div>
          ) : lista.map((n, i) => {
            const ap = parseFloat(n && n.apego);
            return (
              <div key={i} style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10, fontFamily: 'var(--font)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, letterSpacing: 1, color: 'var(--stone)', fontWeight: 700 }}>{fmtFechaNota(n && n.fecha)}</span>
                  {isFinite(ap) && (
                    <span style={{ background: 'var(--mint)', color: 'var(--dark)', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Apego {ap}%</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{(n && n.texto) || ''}</div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
