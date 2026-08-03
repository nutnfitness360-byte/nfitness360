// Utilidad para abrir archivos de Google Drive/Docs DENTRO de la app, sin exponer
// nada del Drive al paciente.
//
// La clave es el enlace de PREVISUALIZACIÓN ("/preview"): muestra solo el contenido
// del archivo, sin la cabecera de Drive, sin la lista de carpetas y sin navegación.
// Embebido en un <iframe>, el paciente ve el documento y al cerrar vuelve a la app,
// nunca al Drive.
//
// parseDriveLink() reconoce cualquier formato de enlace y devuelve:
//   { kind: 'file' | 'folder' | 'other', id, url }
//   - 'file'   -> url lista para <iframe> (previsualización)
//   - 'folder' -> NO abrir: es una carpeta y mostraría su contenido
//   - 'other'  -> no se reconoció; url = original (último recurso)

export function parseDriveLink(link) {
  const raw = String(link == null ? '' : link).trim();
  if (!raw) return { kind: 'other', id: '', url: '' };

  // Carpeta:  /drive/folders/ID   o   ...folderview?...id=ID
  let m = raw.match(/\/folders\/([-\w]{10,})/) || raw.match(/folderview[^]*?[?&]id=([-\w]{10,})/i);
  if (m) return { kind: 'folder', id: m[1], url: raw };

  // Google Docs / Sheets / Slides:  docs.google.com/<tipo>/d/ID
  m = raw.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([-\w]{10,})/i);
  if (m) return { kind: 'file', id: m[2], url: 'https://docs.google.com/' + m[1].toLowerCase() + '/d/' + m[2] + '/preview' };

  // Archivo de Drive:  /file/d/ID   o   open?id=ID   o   uc?id=ID   o   ?id=ID
  m = raw.match(/\/file\/d\/([-\w]{10,})/) || raw.match(/[?&]id=([-\w]{10,})/);
  if (m) return { kind: 'file', id: m[1], url: 'https://drive.google.com/file/d/' + m[1] + '/preview' };

  // Un ID suelto largo (por si pegan solo el ID).
  m = raw.match(/([-\w]{25,})/);
  if (m) return { kind: 'file', id: m[1], url: 'https://drive.google.com/file/d/' + m[1] + '/preview' };

  return { kind: 'other', id: '', url: raw };
}

// Devuelve directamente el enlace de previsualización embebible (o '' si es carpeta/no válido).
export function driveEmbedUrl(link) {
  const p = parseDriveLink(link);
  return p.kind === 'file' ? p.url : '';
}
