// Fuentes por instancia (opt-in). REACT_APP_FONT_BODY = fuente de Google (p.ej. 'Lato')
// para el texto/UI; REACT_APP_FONT_DISPLAY = fuente local en /<Nombre>.ttf (p.ej. 'Elyaris')
// para titulos destacados. Sin estas variables, el sistema queda en Montserrat/Cormorant.
export function aplicarFuentes() {
  try {
    const clean = (s) => String(s || '').replace(/[^A-Za-z0-9 _-]/g, '').trim();
    const body = clean(process.env.REACT_APP_FONT_BODY);
    const disp = clean(process.env.REACT_APP_FONT_DISPLAY);
    if (typeof document === 'undefined') return;
    const head = document.head, root = document.documentElement.style;
    if (body) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + body.replace(/ /g, '+') + ':wght@300;400;500;600;700;900&display=swap';
      head.appendChild(l);
      root.setProperty('--font', "'" + body + "', sans-serif");
    }
    if (disp) {
      const st = document.createElement('style');
      st.textContent = "@font-face{font-family:'" + disp + "';src:url('/" + disp + ".ttf') format('truetype');font-display:swap;}";
      head.appendChild(st);
      root.setProperty('--font-display', "'" + disp + "', serif");
    }
  } catch (_) { /* no-op */ }
}
