import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Colores base del sistema (coinciden con :root en styles.css).
// Los valores por defecto son los de Nfitness 360: así, si una instancia no
// define un color, se ve igual que siempre (Natalia intacta). Cada instancia
// (p. ej. Aretia) sobrescribe los que quiera en config/branding.
export const DEFAULT_COLORS = {
  cream: '#EEE4DA', gold: '#CDA788', sage: '#9AB9AD',
  stone: '#978C87', dark: '#1a1612', card: '#ffffff', border: '#e8ddd4',
  ink: '#36302B', mint: '#F4EBDF', danger: '#B0593F',
  line: '#E3D8CC', lineSoft: '#EFE7DD', pine: '#211C17',
};

const VARMAP = {
  cream: '--cream', gold: '--gold', sage: '--sage', stone: '--stone',
  dark: '--dark', card: '--card', border: '--border',
  ink: '--ink', mint: '--mint', danger: '--danger',
  line: '--line', lineSoft: '--line-soft', pine: '--pine',
};

// Aplica un set de colores a las variables CSS de :root (recolorea la app en vivo).
export function aplicarColores(colors) {
  if (!colors) return;
  Object.keys(VARMAP).forEach(k => {
    if (colors[k]) document.documentElement.style.setProperty(VARMAP[k], colors[k]);
  });
  // Aretia (por dominio): pine/line/lineSoft en tonos fríos. El editor de marca NO expone estas
  // 3 llaves, así que sin esto los encabezados de tabla y bordes del Plan/Menús saldrían en el café
  // por defecto de Nfitness. Solo corre en el dominio de Aretia → Natalia queda EXACTAMENTE igual.
  try {
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
    if (host.indexOf('sistemanutricio') !== -1) {
      const s = document.documentElement.style;
      if (!colors.pine || colors.pine === DEFAULT_COLORS.pine) s.setProperty('--pine', '#1E3A5F');
      if (!colors.line || colors.line === DEFAULT_COLORS.line) s.setProperty('--line', '#CBD8E6');
      if (!colors.lineSoft || colors.lineSoft === DEFAULT_COLORS.lineSoft) s.setProperty('--line-soft', '#DDE7F1');
    }
  } catch (e) { /* sin dominio → sin override */ }
}

const BrandingContext = createContext({ logo: undefined, colors: DEFAULT_COLORS });
export const useBranding = () => useContext(BrandingContext);

export function BrandingProvider({ children }) {
  // logo: undefined = sin configurar (usa el logo por defecto) · '' = quitado · string = imagen cargada
  const [logo, setLogo] = useState(undefined);
  const [colors, setColors] = useState(DEFAULT_COLORS);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'branding'), snap => {
      const d = snap.exists() ? snap.data() : {};
      setLogo(Object.prototype.hasOwnProperty.call(d, 'logo') ? (d.logo || '') : undefined);
      const c = { ...DEFAULT_COLORS, ...(d.colors || {}) };
      setColors(c);
      aplicarColores(c);
    }, () => { /* sin acceso a la config → se usan los valores por defecto */ });
    return unsub;
  }, []);

  return (
    <BrandingContext.Provider value={{ logo, colors }}>
      {children}
    </BrandingContext.Provider>
  );
}
