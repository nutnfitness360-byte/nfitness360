// Temas del sistema (opt-in por instancia con REACT_APP_TEMAS=true).
// 3 looks fijos; la nutriologa elige uno en Configuracion y se guarda en
// config/branding.tema (aplica a TODA la instancia: panel, portal y portada).
// Sin la bandera, nada cambia para las demas marcas.
export const TEMAS_ON = String(process.env.REACT_APP_TEMAS || '').toLowerCase() === 'true';
export const TEMA_DEFAULT = (process.env.REACT_APP_TEMA_DEFAULT || 'bosque');

export const TEMAS = {
  bosque: {
    nombre: 'Verde bosque', desc: 'Fondo verde oscuro, acento terracota.',
    swatch: '#0E482E', swatch2: '#C27A3C',
    vars: {
      '--dark': '#0E482E', '--pine': '#0E482E', '--gold': '#C27A3C', '--cream': '#ECE3D8',
      '--sage': '#A7C684', '--mint': '#A7C684', '--stone': '#8A8A8A', '--card': '#FFFFFF',
      '--border': '#E3E3E0', '--line': '#E3E3E0', '--line-soft': '#EDE6D9', '--ink': '#223A2C', '--danger': '#8B2F2F',
      '--on-accent': '#FFFFFF', '--nav-accent': '#F3C813', '--nav-active-bg': 'rgba(243,200,19,0.14)',
      '--avatar-bg': 'rgba(194,122,60,0.18)', '--warn-bg': 'rgba(194,122,60,0.18)', '--warn-fg': '#7a4a22',
      '--ok-bg': 'rgba(167,198,132,0.25)', '--ok-fg': '#2a4620', '--accent2-soft': 'rgba(167,198,132,0.22)',
      '--hover-soft': '#e3edd8', '--muted-bg': '#e8efe1',
    },
  },
  claro: {
    nombre: 'Verde claro', desc: 'Verde sage fresco, acento durazno.',
    swatch: '#5F8248', swatch2: '#E5AA7E',
    vars: {
      '--dark': '#5F8248', '--pine': '#5F8248', '--gold': '#E5AA7E', '--cream': '#EEF3E7',
      '--sage': '#A7C684', '--mint': '#A7C684', '--stone': '#7E8A74', '--card': '#FFFFFF',
      '--border': '#DDE6D2', '--line': '#DDE6D2', '--line-soft': '#E6EDDC', '--ink': '#2E4328', '--danger': '#8B2F2F',
      '--on-accent': '#3A2416', '--nav-accent': '#FFF0E2', '--nav-active-bg': 'rgba(229,170,126,0.26)',
      '--avatar-bg': 'rgba(229,170,126,0.20)', '--warn-bg': 'rgba(229,170,126,0.22)', '--warn-fg': '#7a4a22',
      '--ok-bg': 'rgba(167,198,132,0.28)', '--ok-fg': '#2a4620', '--accent2-soft': 'rgba(167,198,132,0.24)',
      '--hover-soft': '#e3edd8', '--muted-bg': '#e9efe0',
    },
  },
  gris: {
    nombre: 'Gris sobrio', desc: 'Neutro y elegante, minimo color.',
    swatch: '#353A3C', swatch2: '#728A7E',
    vars: {
      '--dark': '#353A3C', '--pine': '#353A3C', '--gold': '#728A7E', '--cream': '#F2F3F2',
      '--sage': '#AEBCB5', '--mint': '#AEBCB5', '--stone': '#8C9290', '--card': '#FFFFFF',
      '--border': '#E4E6E5', '--line': '#E4E6E5', '--line-soft': '#ECEEED', '--ink': '#2B2F31', '--danger': '#8B4A3F',
      '--on-accent': '#FFFFFF', '--nav-accent': '#FFFFFF', '--nav-active-bg': 'rgba(255,255,255,0.10)',
      '--avatar-bg': 'rgba(114,138,126,0.18)', '--warn-bg': 'rgba(140,146,144,0.18)', '--warn-fg': '#4a4f4d',
      '--ok-bg': 'rgba(114,138,126,0.22)', '--ok-fg': '#2b322e', '--accent2-soft': 'rgba(174,188,181,0.30)',
      '--hover-soft': '#e7eae8', '--muted-bg': '#eceeed',
    },
  },
};

export function aplicarTema(key) {
  try {
    const t = TEMAS[key]; if (!t) return;
    const s = document.documentElement.style;
    Object.keys(t.vars).forEach((k) => s.setProperty(k, t.vars[k]));
  } catch (_) { /* sin DOM -> no-op */ }
}
