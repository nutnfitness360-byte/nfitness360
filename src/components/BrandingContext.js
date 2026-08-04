import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Colores base del sistema (coinciden con :root en styles.css).
export const DEFAULT_COLORS = {
  cream: '#EEE4DA', gold: '#CDA788', sage: '#9AB9AD',
  stone: '#978C87', dark: '#1a1612', card: '#ffffff', border: '#e8ddd4',
};

const VARMAP = {
  cream: '--cream', gold: '--gold', sage: '--sage', stone: '--stone',
  dark: '--dark', card: '--card', border: '--border',
};

// Aplica un set de colores a las variables CSS de :root (recolorea la app en vivo).
export function aplicarColores(colors) {
  if (!colors) return;
  Object.keys(VARMAP).forEach(k => {
    if (colors[k]) document.documentElement.style.setProperty(VARMAP[k], colors[k]);
  });
}

const BrandingContext = createContext({ logo: undefined, colors: DEFAULT_COLORS, portada: null });
export const useBranding = () => useContext(BrandingContext);

export function BrandingProvider({ children }) {
  // logo: undefined = sin configurar (usa el logo por defecto) · '' = quitado · string = imagen cargada
  const [logo, setLogo] = useState(undefined);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  // portada: textos de la pantalla de inicio, por instancia. null = sin configurar →
  // LoginPage usa su texto por defecto (así la instancia de Natalia queda intacta).
  // Forma esperada: { titulo, subtitulo }
  const [portada, setPortada] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'branding'), snap => {
      const d = snap.exists() ? snap.data() : {};
      setLogo(Object.prototype.hasOwnProperty.call(d, 'logo') ? (d.logo || '') : undefined);
      const c = { ...DEFAULT_COLORS, ...(d.colors || {}) };
      setColors(c);
      aplicarColores(c);
      setPortada(d.portada && typeof d.portada === 'object' ? d.portada : null);
    }, () => { /* sin acceso a la config → se usan los valores por defecto */ });
    return unsub;
  }, []);

  return (
    <BrandingContext.Provider value={{ logo, colors, portada }}>
      {children}
    </BrandingContext.Provider>
  );
}
