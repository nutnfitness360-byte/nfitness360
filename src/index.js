<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <meta name="theme-color" content="#211C17" />
    <meta name="description" content="Nfitness 360 — Nutrición y bienestar" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Nfitness 360" />
    <title>Nfitness 360®</title>
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="%PUBLIC_URL%/favicon-32.png" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/apple-touch-icon.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <script>
      /* Ícono/manifest por instancia: SOLO en el dominio de Aretia (sistemanutricio) se
         cambian el manifest, el apple-touch-icon, el favicon, el theme-color y el título.
         En el dominio de Natalia este bloque NO hace nada → su ícono e identidad quedan
         EXACTAMENTE igual. */
      (function () {
        try {
          if (location.hostname.indexOf('sistemanutricio') === -1) return;
          function setLink(rel, href, type, sizes) {
            var sel = 'link[rel="' + rel + '"]' + (sizes ? '[sizes="' + sizes + '"]' : '');
            var l = document.querySelector(sel);
            if (!l) {
              l = document.createElement('link');
              l.setAttribute('rel', rel);
              if (type) l.setAttribute('type', type);
              if (sizes) l.setAttribute('sizes', sizes);
              document.head.appendChild(l);
            }
            l.setAttribute('href', href);
          }
          setLink('manifest', '/manifest-aretia.json');
          setLink('apple-touch-icon', '/aretia-apple-touch-icon.png');
          setLink('icon', '/aretia-favicon-32.png', 'image/png', '32x32');
          var tc = document.querySelector('meta[name="theme-color"]');
          if (tc) tc.setAttribute('content', '#1E3A5F');
          var at = document.querySelector('meta[name="apple-mobile-web-app-title"]');
          if (at) at.setAttribute('content', 'Aretia');
          document.title = 'Aretia';
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <noscript>Necesitas JavaScript para usar esta app.</noscript>
    <div id="root"></div>
  </body>
</html>
