// Catálogos del SAT para CFDI 4.0 (subconjuntos usados en el sistema).
// NOTA: confirmar con el contador los valores que aplican a servicios de nutrición.

// Régimen fiscal del receptor (los más comunes para pacientes).
export const REGIMENES_FISCALES = [
  { clave: '605', nombre: '605 · Sueldos y salarios e ingresos asimilados' },
  { clave: '612', nombre: '612 · Personas físicas con actividades empresariales y profesionales' },
  { clave: '626', nombre: '626 · Régimen Simplificado de Confianza (RESICO)' },
  { clave: '616', nombre: '616 · Sin obligaciones fiscales' },
  { clave: '621', nombre: '621 · Incorporación Fiscal' },
  { clave: '606', nombre: '606 · Arrendamiento' },
  { clave: '608', nombre: '608 · Demás ingresos' },
  { clave: '611', nombre: '611 · Ingresos por dividendos' },
  { clave: '614', nombre: '614 · Ingresos por intereses' },
  { clave: '601', nombre: '601 · General de Ley Personas Morales' },
  { clave: '603', nombre: '603 · Personas Morales con Fines no Lucrativos' },
];

// Uso del CFDI (receptor) — CFDI 4.0.
export const USOS_CFDI = [
  { clave: 'G03', nombre: 'G03 · Gastos en general' },
  { clave: 'D01', nombre: 'D01 · Honorarios médicos, dentales y gastos hospitalarios' },
  { clave: 'D07', nombre: 'D07 · Primas por seguros de gastos médicos' },
  { clave: 'G01', nombre: 'G01 · Adquisición de mercancías' },
  { clave: 'S01', nombre: 'S01 · Sin efectos fiscales' },
  { clave: 'CP01', nombre: 'CP01 · Pagos' },
];

// Clave de unidad del concepto.
export const CLAVES_UNIDAD = [
  { clave: 'E48', nombre: 'E48 · Unidad de servicio' },
  { clave: 'ACT', nombre: 'ACT · Actividad' },
  { clave: 'H87', nombre: 'H87 · Pieza' },
];

// Tratamiento de IVA del concepto.
export const OPCIONES_IVA = [
  { clave: 'exento', nombre: 'Exento (sin IVA)' },
  { clave: '0', nombre: 'Tasa 0%' },
  { clave: '8', nombre: '8% (región fronteriza)' },
  { clave: '16', nombre: '16%' },
];

// Valores por defecto de la configuración CFDI (editables en Configuración).
export const CFDI_DEFAULT = {
  claveProdServ: '85121800',        // Servicios de nutrición (SAT)
  descripcion: 'Consulta de nutrición',
  claveUnidad: 'E48',
  iva: 'exento',
  // Datos del emisor (Natalia) y retenciones. Las retenciones dependen del
  // régimen del emisor; normalmente solo aplican cuando el receptor es persona moral.
  regimenEmisor: '',
  retencionAplica: false,
  retIsr: '',                       // % ISR retenido (ej. 10 en honorarios, 1.25 en RESICO)
  retIva: '',                       // % IVA retenido (ej. 10.6667 = 2/3 del 16%)
};

export function nombreRegimen(clave) {
  const r = REGIMENES_FISCALES.find(x => x.clave === clave);
  return r ? r.nombre : (clave || '');
}
export function nombreUsoCFDI(clave) {
  const u = USOS_CFDI.find(x => x.clave === clave);
  return u ? u.nombre : (clave || '');
}
