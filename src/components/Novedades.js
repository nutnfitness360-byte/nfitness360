import React from 'react';
import { NOVEDADES } from '../data/novedades';

// Apartado "Lo nuevo": listado completo de mejoras del sistema, para que las
// nutriólogas puedan dar seguimiento a los cambios en cualquier momento.
export default function Novedades() {
  return (
    <div>
      <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--dark)', margin: '4px 4px 6px', fontFamily: 'Montserrat, sans-serif', letterSpacing: 0.2 }}>Lo nuevo</h1>
      <div style={{ fontSize: 13, color: 'var(--stone)', margin: '0 4px 18px', lineHeight: 1.5 }}>
        Mejoras y novedades del sistema. Lo más reciente aparece primero.
      </div>
      {NOVEDADES.map((rel) => (
        <div key={rel.id} className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>{rel.fecha}</div>
          {(rel.puntos || []).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, padding: '8px 0', borderTop: i === 0 ? 'none' : '0.5px solid var(--border)' }}>
              <span style={{ color: '#2E8B57', fontWeight: 800, flexShrink: 0, lineHeight: 1.5 }}>✓</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{p.t}</div>
                <div style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.5, marginTop: 2 }}>{p.d}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
