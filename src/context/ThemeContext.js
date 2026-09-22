import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* ============================================================
   TEMA (Modo día / Modo noche) — SOLO Fitmeal.
   - Natalia y Aretia NO tienen modo día: temaDisponible = false y el
     atributo data-theme nunca se pone → su chrome oscuro queda idéntico.
   - Fitmeal: cada usuario elige día/noche; la preferencia se recuerda en
     localStorage y se aplica como data-theme="dia" en <html>. El CSS con
     :root[data-theme="dia"] (styles.css) recolorea la barra/topbar en claro.
   ============================================================ */

export const ES_FITMEAL = (process.env.REACT_APP_MARCA_NOMBRE || '').toLowerCase() === 'fitmeal';
const STORAGE_KEY = 'fm_tema';

function leerTema() {
  if (!ES_FITMEAL) return 'noche';
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t === 'dia' ? 'dia' : 'noche';
  } catch (_) { return 'noche'; }
}

function aplicarTema(t) {
  try {
    const el = document.documentElement;
    if (ES_FITMEAL && t === 'dia') el.setAttribute('data-theme', 'dia');
    else el.removeAttribute('data-theme');
  } catch (_) { /* SSR / sin DOM → no-op */ }
}

// Anti-destello: aplica el tema guardado en cuanto se evalúa el módulo
// (antes del primer render de React), para que no parpadee el chrome oscuro.
aplicarTema(leerTema());

const ThemeContext = createContext({ tema: 'noche', setTema: () => {}, temaDisponible: false });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [tema, setTemaState] = useState(leerTema);

  const setTema = useCallback((t) => {
    const val = t === 'dia' ? 'dia' : 'noche';
    setTemaState(val);
    try { localStorage.setItem(STORAGE_KEY, val); } catch (_) { /* modo privado → sin persistir */ }
    aplicarTema(val);
  }, []);

  useEffect(() => { aplicarTema(tema); }, [tema]);

  return (
    <ThemeContext.Provider value={{ tema, setTema, temaDisponible: ES_FITMEAL }}>
      {children}
    </ThemeContext.Provider>
  );
}
