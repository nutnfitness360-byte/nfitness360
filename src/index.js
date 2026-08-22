import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ─────────────────────────────────────────────────────────────────────────────
// Marca en la pestaña POR DOMINIO — SEGURO PARA NATALIA.
// El repo es compartido (un código → dos sitios). Por eso NO se cambia el favicon
// en public/index.html (eso afectaría a Natalia). Aquí solo el dominio de Aretia
// ('sistemanutricio') cambia su icono y título; cualquier otro dominio (incluido
// el de Natalia) NO se toca: la función se sale de inmediato.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  try {
    if (window.location.hostname.indexOf('sistemanutricio') === -1) return; // ← Natalia: no tocar
    // Favicon de Aretia (teja marino + "A" + punta ámbar), auto-contenido:
    var ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjI0IiBmaWxsPSIjMUUzQTVGIi8+CiAgPHBhdGggZD0iTTI5IDc0IEw1MCAzMCBMNzEgNzQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0Y0RjFFQSIgc3Ryb2tlLXdpZHRoPSI5IiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+CiAgPHBhdGggZD0iTTQwLjUgNTAgTDUwIDMwIEw1OS41IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiNFMDkxM0YiIHN0cm9rZS13aWR0aD0iOSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPgo8L3N2Zz4K';
    document.querySelectorAll("link[rel~='icon']").forEach(function (l) { l.parentNode.removeChild(l); });
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = ICON;
    document.head.appendChild(link);
    // (Opcional) Título de la pestaña para Aretia. Si NO lo quieres, borra esta línea:
    document.title = 'Aretia — Del plan al resultado';
  } catch (e) { /* si algo fallara, se queda lo por defecto; nunca rompe el build */ }
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
