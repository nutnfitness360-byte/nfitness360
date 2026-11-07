// =====================================================================
//  LO NUEVO · Lista de novedades / mejoras del sistema (changelog)
// =====================================================================
//  La entrada MÁS RECIENTE va PRIMERO (arriba).
//  Al publicar una actualización, agrega una entrada nueva hasta arriba con:
//    - id:    un identificador único (lo más fácil: la fecha "AAAA-MM-DD").
//    - fecha: cómo se muestra la fecha al usuario.
//    - puntos: 1 a 5 cambios, cada uno { t: "Título corto", d: "Descripción breve" }.
//  El "id" de la primera entrada es lo que la app usa para avisar que hay algo nuevo.
// =====================================================================

export const NOVEDADES = [
  {
    id: '2026-11-07',
    fecha: 'Noviembre 2026',
    puntos: [
      { t: 'IA más precisa en platillos y recetas', d: 'La preparación usa solo los alimentos indicados en cada tiempo (ya no agrega ingredientes que no van, como yogurt o chía) y respeta tus restricciones, por ejemplo "sin lácteos" (usa bebida vegetal).' },
      { t: 'Regenerar y ajustar platillos con IA', d: 'Pedir de nuevo un platillo ya no falla por un error de formato, y "Ajustar gramajes" ahora también funciona en los platillos hechos con IA.' },
      { t: 'Rutina de gimnasio renovada', d: 'Registro más rápido (las series vienen precargadas, el peso y las reps se arrastran de una serie a la siguiente) e historial en tarjetas. Además, la somatocarta del paciente: ficha tipo videojuego con nivel, radar y logros.' },
      { t: 'Recordatorio de cumpleaños', d: 'En tu panel de inicio ves quién cumple hoy y los próximos, para felicitarlos a tiempo.' },
      { t: 'Mejoras en la vista móvil', d: 'Ajustes para que la app se vea y se use mejor desde el celular, y captura de fechas en formato día/mes/año.' },
    ],
  },
  {
    id: '2026-10-16',
    fecha: '16 de octubre de 2026',
    puntos: [
      { t: 'Análisis de estudios con IA', d: 'Sube un estudio de laboratorio (PDF o foto) y el sistema extrae y clasifica cada valor (alto, bajo o normal) para tu revisión.' },
      { t: 'Calculadora de hidratación', d: 'En Recomendaciones: toma el peso del paciente y calcula el agua recomendada al día (Peso × ml/kg).' },
      { t: 'Buscador en la Agenda', d: 'Encuentra las citas de un paciente por su nombre, y con "Ver detalles" contáctalo por WhatsApp al instante.' },
    ],
  },
  {
    id: '2026-10-01',
    fecha: 'Octubre 2026',
    puntos: [
      { t: 'Gráficas de seguimiento', d: 'Ahora muestran el valor de cada punto, no solo el máximo y el mínimo.' },
      { t: 'Menú por equivalencias', d: 'Aparece la hora de cada tiempo de comida debajo de su nombre.' },
    ],
  },
];

// Id de la novedad más reciente (sirve para saber si el usuario ya la vio).
export const NOVEDADES_ULTIMA = (NOVEDADES[0] && NOVEDADES[0].id) || '';
