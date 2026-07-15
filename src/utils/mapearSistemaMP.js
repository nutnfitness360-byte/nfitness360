// mapearSistemaMP.js
// Convierte un registro crudo del Sistema MP (viejo) al formato del documento
// `pacientes` de Nfitness 360, SIN perder datos. Todo campo original se conserva
// verbatim en historia.importado, y los que tienen "casa" se copian a la historia.

const MESES = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

const TIEMPOS = ['Desayuno', 'Colación', 'Comida', 'Colación', 'Cena'];

const FREQ_LABELS = [
  'Lácteos', 'Carnes rojas', 'Pollo', 'Pescado o mariscos', 'Fruta', 'Verdura',
  'Huevo', 'Pan o tortilla', 'Arroz o pasta', 'Leguminosas', 'Semillas oleaginosas',
  'Alcohol', 'Refrescos', 'Café', 'Golosinas', 'Botanas', 'Postres', 'Agua',
];

const limpiar = (v) => (v == null ? '' : String(v)).trim();

function parseFechaNacimiento(txt) {
  const t = limpiar(txt).toLowerCase();
  if (!t) return { iso: '', edad: '' };
  const m = t.match(/(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})/);
  if (!m) return { iso: '', edad: '' };
  const dia = m[1].padStart(2, '0');
  const mes = MESES[m[2]] || '';
  const anio = m[3];
  if (!mes) return { iso: '', edad: '' };
  const iso = `${anio}-${mes}-${dia}`;
  const nac = new Date(`${iso}T00:00:00`);
  let edad = '';
  if (!isNaN(nac)) {
    const hoy = new Date();
    edad = hoy.getFullYear() - nac.getFullYear();
    const md = hoy.getMonth() - nac.getMonth();
    if (md < 0 || (md === 0 && hoy.getDate() < nac.getDate())) edad--;
  }
  return { iso, edad: edad === '' ? '' : String(edad) };
}

function mapSexo(genero) {
  const g = limpiar(genero).toLowerCase();
  if (g.startsWith('muj') || g === 'femenino' || g === 'f') return 'Femenino';
  if (g.startsWith('hom') || g === 'masculino' || g === 'm') return 'Masculino';
  return 'Femenino';
}

function mapObjetivo(campos) {
  const cat = (limpiar(campos['Número de componentes']) + ' ' + limpiar(campos['Tipo de consulta'])).toLowerCase();
  if (/grasa/.test(cat)) return 'Baja de grasa';
  if (/masa|músculo|musculo/.test(cat)) return 'Aumento de masa muscular';
  if (/recomp/.test(cat)) return 'Recomposición corporal';
  if (/rendimiento/.test(cat)) return 'Rendimiento deportivo';
  if (/embarazo/.test(cat)) return 'Embarazo';
  if (/lactancia/.test(cat)) return 'Lactancia';
  if (/salud/.test(cat)) return 'Salud';
  return 'Otro';
}

function bioquimicaVacia() {
  return {
    fecha: '',
    filas: [
      { parametro: 'Glucosa', resultado: '', referencia: '' },
      { parametro: 'Colesterol total', resultado: '', referencia: '' },
      { parametro: 'Triglicéridos', resultado: '', referencia: '' },
      { parametro: 'HDL', resultado: '', referencia: '' },
      { parametro: 'LDL', resultado: '', referencia: '' },
      { parametro: 'Vitamina D', resultado: '', referencia: '' },
    ],
    observaciones: '',
    analisis: [],
  };
}

function textoFrecuencia(campos) {
  const lineas = FREQ_LABELS
    .map((l) => (campos[l] !== undefined && campos[l] !== '') ? `- ${l}: ${campos[l]}/semana` : null)
    .filter(Boolean);
  const litros = limpiar(campos['Agua (Litros por día)']);
  if (litros) lineas.push(`- Agua: ${litros} L/día`);
  if (!lineas.length) return '';
  return 'Frecuencia semanal de alimentos (Sistema MP):\n' + lineas.join('\n');
}

function frecuenciaEstructurada(campos) {
  const o = {};
  FREQ_LABELS.forEach((l) => { if (campos[l] !== undefined) o[l] = campos[l]; });
  o['Agua (Litros por día)'] = limpiar(campos['Agua (Litros por día)']);
  return o;
}

const unir = (partes) => partes.filter((p) => limpiar(p)).join('\n\n');

export function mapearPaciente(raw, hoyISO) {
  const campos = raw.campos || {};
  const enc = raw.encabezado || {};

  const fnac = parseFechaNacimiento(campos['Fecha de nacimiento']);
  const sexo = mapSexo(campos['Género']);
  const objetivo = mapObjetivo(campos);
  const correo = limpiar(campos['Email']).toLowerCase();
  const telefono = limpiar(campos['Celular']);
  const nombre = limpiar(campos['Nombre']);

  const peso = limpiar(enc.peso);
  const talla = limpiar(enc.altura);
  const edad = limpiar(enc.edad).split('.')[0] || fnac.edad || '';

  const relato = limpiar(campos['Describe un día de tu alimentación']);
  const freqTexto = textoFrecuencia(campos);
  const problemas = limpiar(campos['Problemas de salud']);
  const suplementos = limpiar(campos['Suplementos']);
  const hidratacion = limpiar(campos['Hidratación']);
  const observaciones = limpiar(campos['Observaciones']);
  const objetivoTexto = limpiar(campos['Objetivo deportivo / Objetivo de la consulta']);
  const ejercicio = limpiar(campos['Ejercicio']);
  const actPos = limpiar(campos['Actividad y posición si aplica']);
  const equipo = limpiar(campos['Equipo (si aplica)']);
  const numero = limpiar(campos['Número (si aplica)']);
  const alcohol = limpiar(campos['Alcohol']);
  const aguaFreq = limpiar(campos['Agua']);

  const historia = {
    datos: {
      nombre, pacienteNo: '', fecha: '', fechaNacimiento: fnac.iso,
      edad, sexo, peso, talla, correo, telefono, ocupacion: '', objetivo,
    },
    padecimientos: { lista: [], medicamentos: '' },
    bioquimica: bioquimicaVacia(),
    suplementacion: {
      items: [
        { nombre: suplementos ? suplementos.slice(0, 120) : '', marca: '', dosis: '', frecuencia: '', horario: '' },
        { nombre: '', marca: '', dosis: '', frecuencia: '', horario: '' },
      ],
      notas: suplementos,
    },
    sintomas: { digestivos: '', dermatologicos: '', energiaSueno: '', otros: '' },
    antecedentes: {
      heredofamiliares: '',
      alcohol: alcohol ? `${alcohol}/semana` : '',
      tabaco: '', otros: problemas,
      periodo: '', ultimaCitaGineco: '', anticonceptivos: '', anticonceptivoDetalle: '',
    },
    dietetica: {
      alergias: '', agua: aguaFreq, liquidos: hidratacion,
      leGusta: '', noLeGusta: '', despierta: '', duerme: '',
      notas: unir([relato, freqTexto]),
      dieta: TIEMPOS.map((t) => ({ momento: t, alimentos: '' })),
    },
    ejercicio: {
      tipo: '', horario: '', dias: '', tiempoDia: '', intensidad: '',
      comeAntes: 'No', queComeAntes: '', comeDurante: 'No', queComeDurante: '',
      comeDespues: 'No', queComeDespues: '', hidratacion: '',
      notas: unir([
        ejercicio,
        actPos ? `Actividad/posición: ${actPos}` : '',
        equipo ? `Equipo: ${equipo}` : '',
        numero ? `Número: ${numero}` : '',
      ]),
    },
    notasGenerales: {
      texto: unir([
        objetivoTexto ? `Objetivo de consulta: ${objetivoTexto}` : '',
        observaciones ? `Observaciones: ${observaciones}` : '',
      ]),
    },
    importado: {
      origen: 'sistema-mp',
      idOriginal: raw.id || '',
      capturadoEl: new Date().toISOString(),
      encabezado: enc,
      frecuenciaAlimentos: frecuenciaEstructurada(campos),
      camposOriginales: campos,
    },
  };

  const mediciones = [];
  if (peso || enc.grasa || enc.masaMuscular || enc.pliegues) {
    mediciones.push({
      fecha: hoyISO,
      peso: peso || '',
      grasa: limpiar(enc.grasa).replace('%', ''),
      masaMuscular: limpiar(enc.masaMuscular),
      pliegues: limpiar(enc.pliegues),
      origen: 'sistema-mp',
    });
  }

  return {
    nombre, edad, sexo, estatura: talla, objetivo, correo, contacto: telefono,
    historia, inicio: hoyISO, mediciones, planes: [], creado: Date.now(),
  };
}
