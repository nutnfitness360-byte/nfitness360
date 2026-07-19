import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc, query, orderBy } from 'firebase/firestore';
import Plan from './Plan';
import Menus from './Menus';
import HistoriaClinica from './HistoriaClinica';
import InBodyModal from './InBodyModal';
import ImportarPacientes from './ImportarPacientes';
import { buildRecomendacionesHTML } from '../report/recomendacionesHTML';

/* ===== utilidades ===== */
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fmtMes = (f) => { const d = new Date(f + 'T00:00:00'); return isNaN(d) ? f : `${d.getDate()} ${MESES[d.getMonth()]}`; };
const bitacoraToApego = (bit) => (bit || []).filter(b => typeof b.apego === 'number').map(b => {
  const d = new Date(b.fecha);
  const iso = isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { fecha: iso, apego: b.apego };
});
const fmtSello = (ts) => { const d = new Date(ts); return isNaN(d) ? '' : d.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const fileToBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
const fmtFecha = (f) => { const d = new Date(f + 'T00:00:00'); return isNaN(d) ? f : `${d.getDate()} de ${MESES_L[d.getMonth()]} de ${d.getFullYear()}`; };
// Fecha de creación del expediente: usa 'creado' (timestamp) o, si no existe, 'inicio' (ISO).
const pacCreadoTs = (p) => (typeof p.creado === 'number' ? p.creado : (p.inicio ? (new Date(p.inicio + 'T00:00:00').getTime() || 0) : 0));
const pacCreadoISO = (p) => {
  if (typeof p.creado === 'number') { const d = new Date(p.creado); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  return p.inicio || '';
};
const initials = (n) => n ? n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() : 'NU';
const last = (a) => (a && a.length ? a[a.length - 1] : null);
const hoyISO = () => new Date().toISOString().slice(0, 10);

/* ===== mediciones manuales: pliegues (mm) y perímetros (cm) ===== */
const PLIEGUES = [
  { k: 'triceps', l: 'Tríceps' },
  { k: 'subescapular', l: 'Subescapular' },
  { k: 'supraespinal', l: 'Supraespinal / suprailiaco' },
  { k: 'abdominal', l: 'Abdominal' },
  { k: 'muslo', l: 'Muslo' },
  { k: 'pantorrilla', l: 'Pantorrilla' },
];
const PERIMETROS = [
  { k: 'brazoRelajado', l: 'Brazo relajado' },
  { k: 'brazoFuerza', l: 'Brazo con fuerza' },
  { k: 'cintura', l: 'Cintura' },
  { k: 'abdomen', l: 'Abdomen' },
  { k: 'cadera', l: 'Cadera' },
];
const MANUAL_CAMPOS = [...PLIEGUES, ...PERIMETROS].reduce((o, c) => { o[c.k] = ''; return o; }, {});
const ANTRO_COLORS = ['var(--gold)', 'var(--stone)', 'var(--sage)', '#B0593F', '#5B7C99', '#3E6B5B', '#8E7CC3', '#C98A3F', '#6FA8A0', '#A0522D', '#4A7BA6'];

/* ===== mini gráfica de línea (SVG, sin librerías) ===== */
function Linea({ data, field, color, unit }) {
  const valid = (data || []).filter(d => typeof d[field] === 'number');
  if (valid.length === 0) return <div style={{ fontSize: 12, color: 'var(--stone)', padding: '14px 0', textAlign: 'center' }}>Sin mediciones aún</div>;
  const w = 300, h = 120, pad = 26;
  const vals = valid.map(d => d[field]);
  const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const n = valid.length;
  const X = (i) => n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1);
  const Y = (v) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const pts = valid.map((d, i) => `${X(i)},${Y(d[field])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block', fontFamily: 'Montserrat, sans-serif' }}>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" strokeWidth="1" />
      {valid.length > 1 && <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {valid.map((d, i) => <circle key={i} cx={X(i)} cy={Y(d[field])} r="3.5" fill={color} />)}
      {valid.map((d, i) => (
        <text key={'x' + i} x={X(i)} y={h - pad + 14} fontSize="8.5" fill="var(--stone)" textAnchor="middle">{fmtMes(d.fecha)}</text>
      ))}
      <text x={pad - 4} y={Y(max) + 3} fontSize="9" fill="var(--stone)" textAnchor="end">{max}{unit}</text>
      {min !== max && <text x={pad - 4} y={Y(min) + 3} fontSize="9" fill="var(--stone)" textAnchor="end">{min}{unit}</text>}
    </svg>
  );
}

/* ===== componente principal ===== */
const RECO_SECCIONES = [
  { key: 'estudios', titulo: 'Estudios', items: ['Estudio QS35', 'Estudio EGO', 'Estudio BH', 'Estudio perfil tiroideo', 'Estudio insulina en suero', 'Índice HOMA', 'Hemoglobina glucosilada'] },
  { key: 'suplementos', titulo: 'Suplementos', items: ['Proteína', 'Creatina', 'Vitamina D', 'Omega 3', 'Magnesio', 'Beta-Alanina', 'Cafeína', 'Resveratrol', 'Berberina', 'Colágeno', 'Calcio', 'Hierro'] },
  { key: 'ejercicio', titulo: 'Ejercicio', items: [{ l: 'Fuerza' }, { l: 'Cardio o funcional' }, { l: 'Tiempo', ins: 'Tiempo: ' }, { l: 'Frecuencia', ins: 'Frecuencia: ' }] },
  { key: 'hidratacion', titulo: 'Hidratación', items: ['Agua', 'Electrolitos', 'Bebida deportiva'] },
  { key: 'generales', titulo: 'Generales', items: [] },
];
const RECO_KEYS = RECO_SECCIONES.map(s => s.key);

export default function Pacientes({ onRegisterExitGuard, resetToList }) {
  const [pacientes, setPacientes] = useState([]);
  const [selId, setSelId] = useState(null);
  const [sub, setSub] = useState('dash');
  const [nuevo, setNuevo] = useState(false);
  const [busca, setBusca] = useState('');
  const [orden, setOrden] = useState('alfabetico'); // 'alfabetico' | 'creacion-desc' | 'creacion-asc'
  const [vistaOpen, setVistaOpen] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [menuReabrir, setMenuReabrir] = useState(null);
  const [med, setMed] = useState({ fecha: hoyISO(), peso: '', grasa: '', musculo: '', grasaKg: '', visceral: '', agua: '', apego: '' });
  const [editMed, setEditMed] = useState({ fecha: '', peso: '', grasa: '', musculo: '', grasaKg: '', visceral: '', agua: '', tmb: '' });
  const [editApego, setEditApego] = useState('');
  const [openEdit, setOpenEdit] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ edad: '', sexo: '', estatura: '', contacto: '', objetivo: '' });
  const [recoPdfMsg, setRecoPdfMsg] = useState('');
  const [plan, setPlan] = useState({ nombre: '', fecha: hoyISO(), link: '' });
  const [openMed, setOpenMed] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [inbodyOpen, setInbodyOpen] = useState(false);
  const [inbody, setInbody] = useState(null);
  const [recoForm, setRecoForm] = useState({ estudios: '', suplementos: '', ejercicio: '', hidratacion: '', generales: '' });
  const [recoAnalisis, setRecoAnalisis] = useState(null);
  const [recoEditIdx, setRecoEditIdx] = useState(null);
  const [recoChips, setRecoChips] = useState({});
  const [verHistoria, setVerHistoria] = useState(false);
  const recoFormRef = useRef(null);
  const recoLoadedForRef = useRef(null);
  const [bitacoraTexto, setBitacoraTexto] = useState('');
  const [bitacoraApego, setBitacoraApego] = useState('');
  const [isakFile, setIsakFile] = useState(null);
  const [isakBusy, setIsakBusy] = useState(false);
  const [estudioFile, setEstudioFile] = useState(null);
  const [estudioBusy, setEstudioBusy] = useState(false);
  const [analizandoIdx, setAnalizandoIdx] = useState(null);
  const [estudioAbierto, setEstudioAbierto] = useState(null);
  const [archSec, setArchSec] = useState({ plan: false, isak: false, inbody: false, estudios: false });
  const [panel, setPanel] = useState(null);
  const [ibFile, setIbFile] = useState(null);
  const [dragIb, setDragIb] = useState(false);
  const [ibBusy, setIbBusy] = useState(false);
  const [ibMsg, setIbMsg] = useState('');
  const [medMode, setMedMode] = useState('inbody');
  const [manual, setManual] = useState({ fecha: hoyISO(), ...MANUAL_CAMPOS });
  const [manualBusy, setManualBusy] = useState(false);
  const [manualMsg, setManualMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pacientes'), orderBy('codigo', 'asc'));
    return onSnapshot(q, snap => setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => setErr('No se pudieron cargar los pacientes: ' + e.message));
  }, []);

  // Enlaces rápidos personalizados de recomendaciones (compartidos entre todos los pacientes).
  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'recomendaciones'), snap => {
      const d = snap.exists() ? snap.data() : {};
      setRecoChips((d && d.chips) || {});
    }, () => {});
  }, []);

  // Al abrir un paciente, carga su borrador de recomendaciones una sola vez (sin pisar lo que se esté escribiendo).
  useEffect(() => {
    if (!selId) { recoLoadedForRef.current = null; return; }
    if (recoLoadedForRef.current === selId) return;
    const p = pacientes.find(x => x.id === selId);
    if (!p) return;
    recoLoadedForRef.current = selId;
    const b = p.recomendacionBorrador || null;
    setRecoForm(RECO_KEYS.reduce((o, k) => { o[k] = (b && b[k]) || ''; return o; }, {}));
    setRecoAnalisis((b && b.analisis) || null);
    setRecoEditIdx(null);
    setVerHistoria(false);
  }, [selId, pacientes]);

  const sel = pacientes.find(p => p.id === selId);

  /* ----- Navegación con historial del navegador (botón Atrás / mouse / gesto) ----- */
  const navRef = useRef({});
  navRef.current = { nuevo, selId, sub };

  // Empuja una entrada al historial al entrar a una vista más profunda
  const pushNav = () => { try { window.history.pushState({ nf: true }, ''); } catch (e) {} };
  // "Atrás": deja que el navegador haga el popstate (sincroniza mouse/gesto/botón)
  const volver = () => { try { window.history.back(); } catch (e) {} };

  useEffect(() => {
    const onPop = () => {
      const s = navRef.current;
      if (s.nuevo) { setNuevo(false); }
      else if (s.selId && s.sub && s.sub !== 'dash') { setSub('dash'); }
      else if (s.selId) { setSelId(null); }
      setMenuId(null); setErr('');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Señal desde el menú lateral: al dar clic en "Pacientes" ya estando aquí, regresa al listado.
  useEffect(() => {
    if (!resetToList) return; // no corre en el montaje inicial (empieza en 0)
    setSelId(null); setSub('dash'); setNuevo(false); setMenuId(null); setInbody(null); setMenuReabrir(null); setErr(''); setBusca('');
  }, [resetToList]);

  const irNuevo = () => { setErr(''); pushNav(); setNuevo(true); };
  const irSub = (s) => { pushNav(); setPanel(null); setSub(s); };

  const CODE_PREFIX = process.env.REACT_APP_CODE_PREFIX || 'NF-';
  const nextCodigo = () => {
    let mx = 0;
    pacientes.forEach(p => { const m = /(\d+)/.exec(p.codigo || ''); if (m) mx = Math.max(mx, +m[1]); });
    return CODE_PREFIX + String(mx + 1).padStart(4, '0');
  };

  const derivar = (h) => {
    const d = (h && h.datos) || {};
    const out = {
      nombre: (d.nombre || '').trim(), edad: d.edad || '', sexo: d.sexo || 'Femenino',
      estatura: d.talla || '', objetivo: d.objetivo || '', correo: (d.correo || '').trim().toLowerCase(),
    };
    const tel = (d.telefono || '').trim();
    if (tel) out.contacto = tel;
    return out;
  };

  // Opción C: copia el sexo (y nombre) al registro de suscriptor, si hay correo vinculado.
  const mirrorSuscriptor = async (correo, sexo, nombre) => {
    const c = (correo || '').trim().toLowerCase();
    if (!c || c.indexOf('@') < 0) return;
    try {
      await setDoc(doc(db, 'suscriptores', c), {
        correo: c,
        ...(sexo ? { sexo } : {}),
        ...(nombre ? { nombre } : {}),
      }, { merge: true });
    } catch (e) { /* secundario */ }
  };

  const guardarHistoriaNueva = async (h) => {
    const der = derivar(h);
    if (!der.nombre) { setErr('Escribe el nombre en "Datos generales".'); throw new Error('sin nombre'); }
    const ref = await addDoc(collection(db, 'pacientes'), {
      codigo: (h.datos && h.datos.pacienteNo) || nextCodigo(), ...der,
      historia: h, inicio: hoyISO(), mediciones: [], planes: [], creado: Date.now(),
    });
    mirrorSuscriptor(der.correo, der.sexo, der.nombre);
    setNuevo(false); setErr(''); setSelId(ref.id); setSub('dash');
  };

  const guardarHistoriaExistente = async (h) => {
    const der = derivar(h);
    await updateDoc(doc(db, 'pacientes', sel.id), { ...der, historia: h });
    mirrorSuscriptor(der.correo, der.sexo, der.nombre);
    setErr('');
  };

  const abrir = (id) => { pushNav(); setSelId(id); setSub('dash'); setInbody(null); setMenuId(null); };

  const eliminar = async (p) => {
    setMenuId(null);
    const ok = window.confirm(
      '¿Eliminar a ' + (p.nombre || 'este paciente') + '?\n\n' +
      'Se borrará su expediente, mediciones, planes e historia clínica de forma permanente. ' +
      'Los archivos que ya estén en Google Drive NO se eliminan.'
    );
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'pacientes', p.id));
      if (selId === p.id) { setSelId(null); setSub('dash'); }
      setErr('');
    } catch (e) { setErr('No se pudo eliminar: ' + e.message); }
  };

  // Editar los datos de "Información general" (no las mediciones de peso/grasa).
  const abrirEditarInfo = () => {
    setInfoForm({
      edad: (sel.edad === 0 || sel.edad) ? String(sel.edad) : '',
      sexo: sel.sexo || '',
      estatura: (sel.estatura === 0 || sel.estatura) ? String(sel.estatura) : '',
      contacto: sel.contacto || '',
      objetivo: sel.objetivo || '',
    });
    setErr(''); setOpenInfo(true);
  };
  const guardarInfo = async () => {
    const patch = {
      edad: infoForm.edad === '' ? null : (parseInt(infoForm.edad, 10) || null),
      sexo: infoForm.sexo || '',
      estatura: infoForm.estatura === '' ? null : (parseFloat(infoForm.estatura) || null),
      contacto: infoForm.contacto || '',
      objetivo: infoForm.objetivo || '',
    };
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), patch);
      setOpenInfo(false); setErr('');
    } catch (e) { setErr('No se pudo guardar: ' + e.message); }
  };

  // Índice de la última nota de bitácora con un % de apego numérico.
  const lastApegoIdx = (bit) => {
    const b = bit || [];
    for (let k = b.length - 1; k >= 0; k--) if (typeof b[k].apego === 'number') return k;
    return -1;
  };

  const addMedicion = async () => {
    if (!med.fecha || !med.peso) { setErr('Fecha y peso son necesarios.'); return; }
    const num = (x) => (x === '' || x === null || x === undefined || isNaN(+x)) ? undefined : +x;
    const nm = { fecha: med.fecha, peso: +med.peso, grasa: +med.grasa || 0, musculo: +med.musculo || 0 };
    if (num(med.grasaKg) !== undefined) nm.grasaKg = +med.grasaKg;
    if (num(med.visceral) !== undefined) nm.visceral = +med.visceral;
    if (num(med.agua) !== undefined) nm.agua = +med.agua;
    const arr = [...(sel.mediciones || []), nm].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const updates = { mediciones: arr };
    // % de apego: agrega un punto nuevo (en bitácora) con la fecha de esta medición.
    const ap = num(med.apego);
    if (ap !== undefined) {
      const ts = new Date(med.fecha + 'T00:00:00').getTime();
      updates.bitacora = [...(sel.bitacora || []), { texto: '', apego: ap, fecha: isNaN(ts) ? Date.now() : ts }];
    }
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), updates);
      setMed({ fecha: hoyISO(), peso: '', grasa: '', musculo: '', grasaKg: '', visceral: '', agua: '', apego: '' }); setOpenMed(false); setErr('');
    } catch (e) { setErr('No se pudo guardar: ' + e.message); }
  };

  // Editar la ÚLTIMA medición (corrige una lectura errónea del InBody/PDF).
  const abrirEditarUltima = () => {
    const u = last((sel.mediciones || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha)));
    if (!u) return;
    const v = (x) => (x === 0 || x ? String(x) : '');
    setEditMed({ fecha: u.fecha || hoyISO(), peso: v(u.peso), grasa: v(u.grasa), musculo: v(u.musculo), grasaKg: v(u.grasaKg), visceral: v(u.visceral), agua: v(u.agua), tmb: v(u.tmb) });
    const ai = lastApegoIdx(sel.bitacora);
    setEditApego(ai >= 0 ? String(sel.bitacora[ai].apego) : '');
    setOpenMed(false); setErr(''); setOpenEdit(true);
  };

  const guardarEditUltima = async () => {
    if (!editMed.fecha || editMed.peso === '') { setErr('Fecha y peso son necesarios.'); return; }
    const base = [...(sel.mediciones || [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (!base.length) { setOpenEdit(false); return; }
    base.pop(); // quita la última (la más reciente), que es la que estamos editando
    const num = (x) => (x === '' || x === null || x === undefined || isNaN(+x)) ? undefined : +x;
    const edited = { fecha: editMed.fecha, peso: +editMed.peso, grasa: +editMed.grasa || 0, musculo: +editMed.musculo || 0 };
    if (num(editMed.grasaKg) !== undefined) edited.grasaKg = +editMed.grasaKg;
    if (num(editMed.visceral) !== undefined) edited.visceral = +editMed.visceral;
    if (num(editMed.agua) !== undefined) edited.agua = +editMed.agua;
    if (num(editMed.tmb) !== undefined) edited.tmb = +editMed.tmb;
    const arr = [...base, edited].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const updates = { mediciones: arr };
    // % de apego: edita el valor más reciente (o lo asigna a la última nota si no hay).
    const apRaw = (editApego || '').trim();
    if (apRaw !== '') {
      const ap = parseFloat(apRaw);
      if (isFinite(ap)) {
        const bit = [...(sel.bitacora || [])];
        const ai = lastApegoIdx(bit);
        if (ai >= 0) bit[ai] = { ...bit[ai], apego: ap };
        else if (bit.length) bit[bit.length - 1] = { ...bit[bit.length - 1], apego: ap };
        else bit.push({ texto: '', apego: ap, fecha: Date.now() });
        updates.bitacora = bit;
      }
    }
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), updates);
      setOpenEdit(false); setErr('');
    } catch (e) { setErr('No se pudo guardar: ' + e.message); }
  };

  const addPlan = async () => {
    if (!plan.nombre.trim()) { setErr('Escribe el nombre del plan.'); return; }
    const arr = [...(sel.planes || []), { nombre: plan.nombre.trim(), fecha: plan.fecha || hoyISO(), link: plan.link.trim() }];
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), { planes: arr });
      setPlan({ nombre: '', fecha: hoyISO(), link: '' }); setOpenPlan(false); setErr('');
    } catch (e) { setErr('No se pudo guardar: ' + e.message); }
  };

  const removePlan = async (i) => {
    const pl = (sel.planes || [])[i];
    if (!window.confirm('¿Eliminar el plan "' + ((pl && pl.nombre) || 'sin nombre') + '"?\n\nDesaparecerá también de la vista del paciente. (El archivo seguirá en Drive.)')) return;
    const arr = (sel.planes || []).filter((_, k) => k !== i);
    const updates = { planes: arr };
    // Si tiene un menú gemelo en el historial (mismo enlace de Drive), quítalo también.
    if (pl && pl.link) {
      const hist = (sel.menusHistorial || []).filter(mh => mh.link !== pl.link);
      if (hist.length !== (sel.menusHistorial || []).length) updates.menusHistorial = hist;
    }
    try { await updateDoc(doc(db, 'pacientes', sel.id), updates); } catch (e) { setErr(e.message); }
  };

  const removeMenuHistorial = async (idx) => {
    const mh = (sel.menusHistorial || [])[idx];
    if (!mh) return;
    if (!window.confirm('¿Eliminar el menú "' + (mh.nombre || 'sin nombre') + '"?\n\nDesaparecerá de aquí y también del panel del paciente (en "Mis archivos"). El archivo seguirá en Drive.')) return;
    const hist = (sel.menusHistorial || []).filter((_, k) => k !== idx);
    const updates = { menusHistorial: hist };
    // Quita también el plan gemelo que ve el paciente (mismo enlace de Drive).
    if (mh.link) {
      const planes = (sel.planes || []).filter(p => p.link !== mh.link);
      if (planes.length !== (sel.planes || []).length) updates.planes = planes;
    }
    try { await updateDoc(doc(db, 'pacientes', sel.id), updates); } catch (e) { setErr(e.message); }
  };

  const addChipTo = (key, texto) => {
    const linea = '• ' + texto;
    setRecoForm(prev => {
      const cur = prev[key] || '';
      const lineas = cur ? cur.split('\n') : [];
      if (lineas.some(x => x.trim() === linea.trim())) return prev; // ya está
      const base = cur && !cur.endsWith('\n') ? cur + '\n' : cur;
      return { ...prev, [key]: base + linea + '\n' };
    });
  };

  // "Agregar": guarda un enlace rápido nuevo (compartido) y lo deja listo para usarse.
  const agregarChip = async (key) => {
    const txt = (window.prompt('Escribe el enlace rápido que quieres guardar (quedará disponible para futuras recomendaciones):') || '').trim();
    if (!txt) return;
    const cur = recoChips[key] || [];
    if (!cur.some(x => (x || '').toLowerCase() === txt.toLowerCase())) {
      const next = { ...recoChips, [key]: [...cur, txt] };
      try {
        await setDoc(doc(db, 'config', 'recomendaciones'), { chips: next }, { merge: true });
      } catch (e) { setErr('No se pudo guardar el enlace rápido: ' + e.message); return; }
    }
    addChipTo(key, txt); // queda listo y además lo inserta en la recomendación actual
  };

  const recoSeccionesConContenido = (r) => RECO_SECCIONES
    .filter(s => (r[s.key] || '').toString().trim())
    .map(s => ({ titulo: s.titulo, texto: r[s.key] }));

  const guardarBorradorReco = async () => {
    if (!sel) return;
    const b = RECO_KEYS.reduce((o, k) => { o[k] = (recoForm[k] || ''); return o; }, {});
    if (recoAnalisis) b.analisis = recoAnalisis;
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), { recomendacionBorrador: b });
      setRecoPdfMsg('Borrador guardado ✓');
    } catch (e) { setRecoPdfMsg('No se pudo guardar el borrador: ' + e.message); }
  };

  const addReco = async () => {
    const r = {};
    RECO_KEYS.forEach(k => { r[k] = (recoForm[k] || '').trim(); });
    if (recoAnalisis) r.analisis = recoAnalisis;
    if (!RECO_KEYS.some(k => r[k]) && !recoAnalisis) { setErr('Escribe al menos una recomendación en alguna sección (o adjunta un análisis).'); return; }
    let arr;
    if (recoEditIdx != null && (sel.recomendaciones || [])[recoEditIdx]) {
      // Editar: reemplaza esa recomendación, conservando su fecha original.
      const orig = sel.recomendaciones[recoEditIdx];
      arr = (sel.recomendaciones || []).map((x, k) => k === recoEditIdx ? { ...x, ...r, fecha: orig.fecha } : x);
    } else {
      arr = [...(sel.recomendaciones || []), { ...r, fecha: Date.now() }];
    }
    try {
      // Al publicar, se limpia el borrador guardado.
      await updateDoc(doc(db, 'pacientes', sel.id), { recomendaciones: arr, recomendacionBorrador: {} });
      setRecoForm(RECO_KEYS.reduce((o, k) => { o[k] = ''; return o; }, {}));
      setRecoAnalisis(null);
      setRecoEditIdx(null);
      setErr('');
    } catch (e) { setErr('No se pudo guardar la recomendación: ' + e.message); }
  };

  const editarReco = (idx) => {
    const r = (sel.recomendaciones || [])[idx];
    if (!r) return;
    setRecoForm(RECO_KEYS.reduce((o, k) => { o[k] = r[k] || ''; return o; }, {}));
    setRecoAnalisis(r.analisis || null);
    setRecoEditIdx(idx);
    setErr('');
    setTimeout(() => { try { recoFormRef.current && recoFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }, 50);
  };

  const cancelarEdicionReco = () => {
    setRecoForm(RECO_KEYS.reduce((o, k) => { o[k] = ''; return o; }, {}));
    setRecoAnalisis(null);
    setRecoEditIdx(null);
    setErr('');
  };

  // Adjunta la tabla de análisis de un estudio al borrador de recomendación actual.
  const adjuntarAnalisisAReco = (i) => {
    const est = (sel.estudios || [])[i];
    if (!est || !est.analisis) { setErr('Primero analiza el estudio.'); return; }
    setRecoAnalisis({
      tipo: est.analisis.tipo || '', fecha: est.analisis.fecha || '',
      fueraDeRango: est.analisis.fueraDeRango || [],
      dentroDeRango: est.analisis.dentroDeRango || 0,
      valores: est.analisis.valores || [],
    });
    setPanel('reco');
    setRecoPdfMsg('Tabla de análisis adjuntada a la recomendación. Publícala o genera el PDF para incluirla.');
    setTimeout(() => { try { recoFormRef.current && recoFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }, 60);
  };

  const removeReco = async (i) => {
    if (!window.confirm('¿Eliminar esta recomendación?')) return;
    const arr = (sel.recomendaciones || []).filter((_, k) => k !== i);
    try { await updateDoc(doc(db, 'pacientes', sel.id), { recomendaciones: arr }); } catch (e) { setErr(e.message); }
  };

  const generarPDFReco = async (reco) => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRecoPdfMsg('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    if (!reco || !(reco.texto || reco.estudios || reco.suplementos || reco.ejercicio || reco.hidratacion || reco.generales || reco.analisis)) { setRecoPdfMsg('No hay recomendación para generar el PDF.'); return; }
    setRecoPdfMsg('Generando PDF…');
    try {
      const html = buildRecomendacionesHTML({ nombre: sel.nombre, recomendaciones: [reco], fecha: Date.now(), suplementacion: sel.historia?.suplementacion });
      const fechaImp = hoyISO(); // fecha de impresión (AAAA-MM-DD)
      const filename = `Recomendacion_${(sel.nombre || 'paciente').replace(/[^\w-]+/g, '_')}_${fechaImp}.pdf`;
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveRecomendaciones', patient: sel.nombre || 'Paciente', correo: sel.correo || '', filename, html }),
        redirect: 'follow',
      });
      let d; try { d = JSON.parse(await res.text()); } catch (_) { d = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (!d.ok || !d.link) throw new Error(d.error || 'No se recibió el enlace del PDF.');
      setRecoPdfMsg('PDF generado y guardado en Drive ✓');
      window.open(d.link, '_blank', 'noopener');
    } catch (e) {
      setRecoPdfMsg('No se pudo generar: ' + e.message);
    }
  };

  const addBitacora = async () => {
    const t = bitacoraTexto.trim();
    if (!t) { setErr('Escribe la nota de la consulta.'); return; }
    const entry = { texto: t, fecha: Date.now() };
    const ap = parseFloat(bitacoraApego);
    if (isFinite(ap)) entry.apego = ap;
    const arr = [...(sel.bitacora || []), entry];
    try {
      await updateDoc(doc(db, 'pacientes', sel.id), { bitacora: arr });
      setBitacoraTexto(''); setBitacoraApego(''); setErr('');
    } catch (e) { setErr('No se pudo guardar la nota: ' + e.message); }
  };

  const removeBitacora = async (i) => {
    if (!window.confirm('¿Eliminar esta nota de la bitácora?')) return;
    const arr = (sel.bitacora || []).filter((_, k) => k !== i);
    try { await updateDoc(doc(db, 'pacientes', sel.id), { bitacora: arr }); } catch (e) { setErr(e.message); }
  };

  const subirIsak = async () => {
    if (!isakFile) { setErr('Selecciona el PDF del reporte ISAK.'); return; }
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setErr('No está configurada la conexión para subir archivos.'); return; }
    setIsakBusy(true); setErr('');
    try {
      const b64 = await fileToBase64(isakFile);
      const fecha = hoyISO();
      const filename = 'ISAK_' + (sel.codigo || '') + '_' + fecha + '.pdf';
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveISAK', patient: sel.nombre, correo: (sel.correo || ''), filename, pdfBase64: b64 }),
        redirect: 'follow',
      });
      const data = await resp.json().catch(() => null);
      if (!data || !data.ok || !data.link) throw new Error((data && data.error) || 'No se recibió el enlace del archivo.');
      const arr = [...(sel.isak || []), { nombre: data.filename || filename, fecha, link: data.link }];
      await updateDoc(doc(db, 'pacientes', sel.id), { isak: arr });
      setIsakFile(null); setErr('');
    } catch (e) { setErr('No se pudo cargar el reporte ISAK: ' + e.message); }
    setIsakBusy(false);
  };

  const removeIsak = async (i) => {
    if (!window.confirm('¿Quitar este reporte de la lista? (El archivo seguirá en Drive.)')) return;
    const arr = (sel.isak || []).filter((_, k) => k !== i);
    try { await updateDoc(doc(db, 'pacientes', sel.id), { isak: arr }); } catch (e) { setErr(e.message); }
  };

  const subirEstudio = async () => {
    if (!estudioFile) { setErr('Selecciona el archivo del estudio (PDF o imagen).'); return; }
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setErr('No está configurada la conexión para subir archivos.'); return; }
    setEstudioBusy(true); setErr('');
    try {
      const b64 = await fileToBase64(estudioFile);
      const fecha = hoyISO();
      const ext = (estudioFile.name.split('.').pop() || 'pdf').toLowerCase();
      const filename = 'Estudio_' + (sel.codigo || '') + '_' + fecha + '.' + ext;
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveEstudio', patient: sel.nombre, correo: (sel.correo || ''), filename, mime: estudioFile.type || 'application/pdf', fileBase64: b64 }),
        redirect: 'follow',
      });
      const data = await resp.json().catch(() => null);
      if (!data || !data.ok || !data.link) throw new Error((data && data.error) || 'No se recibió el enlace del archivo.');
      const arr = [...(sel.estudios || []), { nombre: estudioFile.name || filename, fecha, link: data.link, fileId: data.fileId || '' }];
      await updateDoc(doc(db, 'pacientes', sel.id), { estudios: arr });
      setEstudioFile(null); setErr('');
    } catch (e) { setErr('No se pudo cargar el estudio: ' + e.message); }
    setEstudioBusy(false);
  };

  const removeEstudio = async (i) => {
    if (!window.confirm('¿Quitar este estudio de la lista? (El archivo seguirá en Drive.)')) return;
    const arr = (sel.estudios || []).filter((_, k) => k !== i);
    try { await updateDoc(doc(db, 'pacientes', sel.id), { estudios: arr }); } catch (e) { setErr(e.message); }
  };

  const analizarEstudio = async (i) => {
    const est = (sel.estudios || [])[i];
    if (!est) return;
    if (!est.fileId && !est.link) { setErr('Este estudio no tiene archivo asociado para analizar.'); return; }
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setErr('No está configurada la conexión para analizar archivos.'); return; }
    setAnalizandoIdx(i); setErr('');
    try {
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'analizarEstudio', fileId: est.fileId || '', link: est.link || '' }),
        redirect: 'follow',
      });
      const data = await resp.json().catch(() => null);
      if (!data || !data.ok) throw new Error((data && data.error) || 'No se pudo analizar el estudio.');
      const analisis = {
        fecha: data.fecha || '', tipo: data.tipo || '',
        valores: data.valores || [], fueraDeRango: data.fueraDeRango || [],
        dentroDeRango: data.dentroDeRango || 0, generadoEn: data.generadoEn || new Date().toISOString(),
      };
      const arr = (sel.estudios || []).map((r, k) => (k === i ? { ...r, analisis } : r));
      await updateDoc(doc(db, 'pacientes', sel.id), { estudios: arr });
      setEstudioAbierto(i);
    } catch (e) {
      setErr('No se pudo analizar el estudio: ' + e.message);
    }
    setAnalizandoIdx(null);
  };

  const archHeader = (id, titulo) => (
    <button type="button" onClick={() => setArchSec(s => ({ ...s, [id]: !s[id] }))} style={S.archHead}>
      <span>{titulo}</span>
      <span style={{ display: 'inline-block', transition: 'transform .15s', transform: archSec[id] ? 'rotate(90deg)' : 'none', fontSize: 12 }}>▸</span>
    </button>
  );

  const leerYGuardarInBody = async (fileArg) => {
    const file = (fileArg && fileArg.name) ? fileArg : ibFile;
    if (!file) { setErr('Selecciona el archivo del InBody (PDF o imagen).'); return; }
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setErr('Falta la configuración del servidor (REACT_APP_APPSCRIPT_URL).'); return; }
    setIbBusy(true); setErr(''); setIbMsg('Leyendo el InBody con IA… (puede tardar unos segundos)');
    try {
      const b64 = await fileToBase64(file);
      const IB_EXT = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
      const ibExt = IB_EXT[(file.type || '').toLowerCase()] || ((file.name || '').split('.').pop() || 'pdf').toLowerCase();
      const filename = 'InBody_' + (sel.codigo || '') + '_' + hoyISO() + '.' + ibExt;
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'leerInBody', patient: sel.nombre, correo: (sel.correo || ''), filename, pdfBase64: b64, mime: file.type || '' }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = null; }
      if (data && data.ok && data.datos) {
        const d = data.datos;
        const nm = {
          fecha: (d.fecha && /^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) ? d.fecha : hoyISO(),
          peso: parseFloat(d.peso) || 0,
          grasa: parseFloat(d.grasa) || 0,
          musculo: parseFloat(d.mme) || 0,
          grasaKg: parseFloat(d.grasaKg) || 0,
          visceral: parseFloat(d.visceral) || 0,
          agua: parseFloat(d.agua) || 0,
          tmb: parseFloat(d.tmb) || 0,
        };
        const arr = [...(sel.mediciones || []), nm].sort((a, b) => a.fecha.localeCompare(b.fecha));
        const updates = { mediciones: arr };
        // La estatura (Altura del InBody) alimenta el cálculo del plan. Se guarda solo si el paciente aún no tiene una.
        const tallaIB = parseFloat(d.talla) || 0;
        if (tallaIB > 0 && !(parseFloat(sel.estatura) > 0)) updates.estatura = tallaIB;
        if (data.link) updates.inbodyArchivos = [...(sel.inbodyArchivos || []), { nombre: data.filename || filename, fecha: nm.fecha, link: data.link }];
        await updateDoc(doc(db, 'pacientes', sel.id), updates);
        setIbFile(null);
        setIbMsg('InBody leído y guardado ✓ — revisa los valores en las gráficas y, si algo quedó mal, usa “Editar última” en Gráficas de avance.');
      } else {
        // La lectura falló; si el PDF alcanzó a guardarse, al menos registramos el archivo.
        if (data && data.link) {
          await updateDoc(doc(db, 'pacientes', sel.id), { inbodyArchivos: [...(sel.inbodyArchivos || []), { nombre: data.filename || 'InBody', fecha: hoyISO(), link: data.link }] });
        }
        setIbMsg('');
        setErr('No se pudo leer el InBody automáticamente: ' + ((data && data.error) || 'intenta con un archivo más nítido.'));
      }
    } catch (e) {
      setIbMsg('');
      setErr('No se pudo procesar el InBody: ' + e.message);
    }
    setIbBusy(false);
  };

  const guardarMedicionManual = async () => {
    const numOrU = (s) => { const v = parseFloat(s); return isNaN(v) ? undefined : v; };
    const entry = { fecha: manual.fecha || hoyISO() };
    let algo = false;
    [...PLIEGUES, ...PERIMETROS].forEach(({ k }) => { const v = numOrU(manual[k]); if (v !== undefined) { entry[k] = v; algo = true; } });
    if (!algo) { setManualMsg('Escribe al menos un valor antes de guardar.'); return; }
    if (PLIEGUES.some(({ k }) => typeof entry[k] === 'number')) {
      const suma = PLIEGUES.reduce((a, { k }) => a + (typeof entry[k] === 'number' ? entry[k] : 0), 0);
      entry.suma6 = Math.round(suma * 10) / 10;
    }
    setManualBusy(true); setManualMsg('');
    try {
      const arr = [...(sel.medicionesManual || []), entry].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      await updateDoc(doc(db, 'pacientes', sel.id), { medicionesManual: arr });
      setManual({ fecha: hoyISO(), ...MANUAL_CAMPOS });
      setManualMsg('Medición guardada ✓ — revísala en las gráficas de pliegues y perímetros.');
    } catch (e) { setManualMsg('No se pudo guardar: ' + e.message); }
    setManualBusy(false);
  };

  const onInBody = async (data) => {
    const peso = parseFloat(data.peso);
    if (isFinite(peso)) {
      const nm = { fecha: data.fecha || hoyISO(), peso, grasa: parseFloat(data.grasa) || 0, musculo: parseFloat(data.mme) || 0, grasaKg: parseFloat(data.grasaKg) || 0, tmb: parseFloat(data.tmb) || 0 };
      const arr = [...(sel.mediciones || []), nm].sort((a, b) => a.fecha.localeCompare(b.fecha));
      try { await updateDoc(doc(db, 'pacientes', sel.id), { mediciones: arr }); }
      catch (e) { setErr('No se pudo guardar la medición: ' + e.message); }
    }
    setInbody({ peso: data.peso, grasa: data.grasa, mme: data.mme, tmb: data.tmb, fecha: data.fecha });
    setInbodyOpen(false);
    irSub('plan');
  };

  const S = styles;

  /* ----- VISTA: historia clínica (alta de paciente nuevo) ----- */
  if (nuevo) {
    return <HistoriaClinica codigo={nextCodigo()} onSave={guardarHistoriaNueva} onBack={volver} onGuardChange={onRegisterExitGuard} />;
  }
  /* ----- VISTA: historia clínica de un paciente existente ----- */
  if (sel && sub === 'historia') {
    return <HistoriaClinica initial={sel.historia} codigo={sel.codigo} onSave={guardarHistoriaExistente} onBack={volver} onGuardChange={onRegisterExitGuard} />;
  }

  /* ----- VISTA: dashboard de un paciente ----- */
  if (sel) {
    const m = last(sel.mediciones);
    const mm = last(sel.medicionesManual);
    const sumaManual = PLIEGUES.reduce((a, p) => { const v = parseFloat(manual[p.k]); return a + (isNaN(v) ? 0 : v); }, 0);
    const hayPliegueManual = PLIEGUES.some(p => !isNaN(parseFloat(manual[p.k])));
    const manualMasculino = /masc|hombre|var[oó]n|^m$/i.test((sel.sexo || '').trim());
    const umbralPliegues = manualMasculino ? 50 : 30;
    const apegoData = bitacoraToApego(sel.bitacora);
    const ultApego = apegoData.length ? apegoData[apegoData.length - 1].apego : null;
    if (sub === 'plan') {
      const pdata = inbody
        ? { peso: inbody.peso || (m ? m.peso : ''), talla: sel.estatura || '', edad: sel.edad || '', sexo: sel.sexo || 'Femenino', grasa: inbody.grasa || (m ? m.grasa : ''), tmb: inbody.tmb || '' }
        : { peso: m ? m.peso : '', talla: sel.estatura || '', edad: sel.edad || '', sexo: sel.sexo || 'Femenino', grasa: m ? m.grasa : '', tmb: (m && m.tmb) || '' };
      return <Plan patient={sel} pdata={pdata} onBack={volver} onGuardChange={onRegisterExitGuard} />;
    }
    if (sub === 'menus') {
      return <Menus key={menuReabrir ? ('h-' + (menuReabrir.fecha || '') + (menuReabrir.nombre || '')) : 'actual'} patient={sel} onBack={volver} initialMenus={menuReabrir} onGuardChange={onRegisterExitGuard} />;
    }
    return (
      <div>
        {err && <div style={S.err}>{err}</div>}

        <div className="card">
          <div style={S.headRow}>
            <div className="pac-avatar">{initials(sel.nombre)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--dark)' }}>{sel.nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 2 }}>{sel.codigo} · {sel.objetivo || 'sin objetivo'}</div>
            </div>
          </div>
        </div>

        <div style={S.metricGrid}>
          <div style={S.metric}><div style={S.metricLbl}>Peso actual</div><div style={S.metricVal}>{m ? m.peso : '—'}<span style={S.metricUnit}> kg</span></div></div>
          <div style={S.metric}><div style={S.metricLbl}>% de grasa</div><div style={S.metricVal}>{m ? m.grasa : '—'}<span style={S.metricUnit}> %</span></div></div>
          <div style={S.metric}><div style={S.metricLbl}>Masa muscular</div><div style={S.metricVal}>{m ? m.musculo : '—'}<span style={S.metricUnit}> kg</span></div></div>
        </div>

        <div className="card">
          <div style={S.titleRow}>
            <div className="card-title" style={{ margin: 0 }}>Información general</div>
            <button style={S.smallBtn} onClick={openInfo ? () => setOpenInfo(false) : abrirEditarInfo}>{openInfo ? 'Cancelar' : 'Editar'}</button>
          </div>
          {openInfo ? (
            <div style={S.formRow}>
              <Field l="Edad (años)"><input style={S.inp} inputMode="numeric" value={infoForm.edad} onChange={e => setInfoForm({ ...infoForm, edad: e.target.value })} /></Field>
              <Field l="Sexo">
                <select style={S.inp} value={infoForm.sexo} onChange={e => setInfoForm({ ...infoForm, sexo: e.target.value })}>
                  <option value="">—</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </Field>
              <Field l="Estatura (cm)"><input style={S.inp} inputMode="decimal" value={infoForm.estatura} onChange={e => setInfoForm({ ...infoForm, estatura: e.target.value })} /></Field>
              <Field l="Número telefónico"><input style={S.inp} inputMode="tel" value={infoForm.contacto} onChange={e => setInfoForm({ ...infoForm, contacto: e.target.value })} /></Field>
              <Field l="Objetivo"><input style={S.inp} value={infoForm.objetivo} onChange={e => setInfoForm({ ...infoForm, objetivo: e.target.value })} /></Field>
              <button style={S.saveBtn} onClick={guardarInfo}>Guardar cambios</button>
            </div>
          ) : (
            <div style={S.infoGrid}>
              <Info l="Edad" v={sel.edad ? sel.edad + ' años' : '—'} />
              <Info l="Sexo" v={sel.sexo || '—'} />
              <Info l="Estatura" v={sel.estatura ? sel.estatura + ' cm' : '—'} />
              <Info l="Inicio" v={sel.inicio ? fmtFecha(sel.inicio) : '—'} />
              <Info l="Número telefónico" v={sel.contacto || '—'} />
              <Info l="Objetivo" v={sel.objetivo || '—'} />
            </div>
          )}
        </div>

        <CorreoVinculo patient={sel} key={'cv-' + sel.id} />

        <div className="card">
          <div style={S.titleRow}>
            <div className="card-title" style={{ margin: 0 }}>Gráficas de avance</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {m && <button style={S.smallBtn} onClick={openEdit ? () => setOpenEdit(false) : abrirEditarUltima}>{openEdit ? 'Cancelar' : 'Editar última'}</button>}
              <button style={S.smallBtn} onClick={() => { setOpenEdit(false); setOpenMed(v => !v); }}>{openMed ? 'Cancelar' : '+ Medición'}</button>
            </div>
          </div>
          {openMed && (
            <div style={S.formRow}>
              <Field l="Fecha"><input type="date" style={S.inp} value={med.fecha} onChange={e => setMed({ ...med, fecha: e.target.value })} /></Field>
              <Field l="Peso (kg)"><input style={S.inp} inputMode="decimal" value={med.peso} onChange={e => setMed({ ...med, peso: e.target.value })} /></Field>
              <Field l="% grasa"><input style={S.inp} inputMode="decimal" value={med.grasa} onChange={e => setMed({ ...med, grasa: e.target.value })} /></Field>
              <Field l="Músculo (kg)"><input style={S.inp} inputMode="decimal" value={med.musculo} onChange={e => setMed({ ...med, musculo: e.target.value })} /></Field>
              <Field l="Masa grasa (kg)"><input style={S.inp} inputMode="decimal" value={med.grasaKg} onChange={e => setMed({ ...med, grasaKg: e.target.value })} /></Field>
              <Field l="Grasa visceral"><input style={S.inp} inputMode="decimal" value={med.visceral} onChange={e => setMed({ ...med, visceral: e.target.value })} /></Field>
              <Field l="Agua (L)"><input style={S.inp} inputMode="decimal" value={med.agua} onChange={e => setMed({ ...med, agua: e.target.value })} /></Field>
              <Field l="% apego al plan"><input style={S.inp} inputMode="decimal" value={med.apego} onChange={e => setMed({ ...med, apego: e.target.value })} placeholder="Ej. 100" /></Field>
              <button style={S.saveBtn} onClick={addMedicion}>Guardar</button>
            </div>
          )}
          {openEdit && (
            <div style={S.formRow}>
              <Field l="Fecha"><input type="date" style={S.inp} value={editMed.fecha} onChange={e => setEditMed({ ...editMed, fecha: e.target.value })} /></Field>
              <Field l="Peso (kg)"><input style={S.inp} inputMode="decimal" value={editMed.peso} onChange={e => setEditMed({ ...editMed, peso: e.target.value })} /></Field>
              <Field l="% grasa"><input style={S.inp} inputMode="decimal" value={editMed.grasa} onChange={e => setEditMed({ ...editMed, grasa: e.target.value })} /></Field>
              <Field l="Músculo (kg)"><input style={S.inp} inputMode="decimal" value={editMed.musculo} onChange={e => setEditMed({ ...editMed, musculo: e.target.value })} /></Field>
              <Field l="Masa grasa (kg)"><input style={S.inp} inputMode="decimal" value={editMed.grasaKg} onChange={e => setEditMed({ ...editMed, grasaKg: e.target.value })} /></Field>
              <Field l="Grasa visceral"><input style={S.inp} inputMode="decimal" value={editMed.visceral} onChange={e => setEditMed({ ...editMed, visceral: e.target.value })} /></Field>
              <Field l="Agua (L)"><input style={S.inp} inputMode="decimal" value={editMed.agua} onChange={e => setEditMed({ ...editMed, agua: e.target.value })} /></Field>
              <Field l="% apego al plan"><input style={S.inp} inputMode="decimal" value={editApego} onChange={e => setEditApego(e.target.value)} placeholder="Ej. 100" /></Field>
              <button style={S.saveBtn} onClick={guardarEditUltima}>Guardar cambios</button>
            </div>
          )}
          <div style={S.chartGrid}>
            <ChartCard title="Peso" unit=" kg" valor={m ? m.peso : null}><Linea data={sel.mediciones} field="peso" color="var(--gold)" unit="" /></ChartCard>
            <ChartCard title="% de grasa" unit="%" valor={m ? m.grasa : null}><Linea data={sel.mediciones} field="grasa" color="var(--stone)" unit="" /></ChartCard>
            <ChartCard title="Masa muscular" unit=" kg" valor={m ? m.musculo : null}><Linea data={sel.mediciones} field="musculo" color="var(--sage)" unit="" /></ChartCard>
            <ChartCard title="Masa grasa" unit=" kg" valor={m ? m.grasaKg : null}><Linea data={sel.mediciones} field="grasaKg" color="#B0593F" unit="" /></ChartCard>
            <ChartCard title="Grasa visceral" unit="" valor={m ? m.visceral : null}><Linea data={sel.mediciones} field="visceral" color="#36302B" unit="" /></ChartCard>
            <ChartCard title="Agua corporal total" unit=" L" valor={m ? m.agua : null}><Linea data={sel.mediciones} field="agua" color="#5B7C99" unit="" /></ChartCard>
            <ChartCard title="Apego al plan" unit="%" valor={ultApego}><Linea data={apegoData} field="apego" color="#3E6B5B" unit="%" /></ChartCard>
          </div>
        </div>

        {sel.medicionesManual && sel.medicionesManual.length > 0 && (
          <div className="card">
            <div style={S.titleRow}><div className="card-title" style={{ margin: 0 }}>Gráficas de pliegues y perímetros</div></div>
            <div style={S.subLbl}>Pliegues (mm)</div>
            <div style={S.chartGrid}>
              {PLIEGUES.map((p, i) => (
                <ChartCard key={p.k} title={p.l} unit=" mm" valor={mm && typeof mm[p.k] === 'number' ? mm[p.k] : null}>
                  <Linea data={sel.medicionesManual} field={p.k} color={ANTRO_COLORS[i % ANTRO_COLORS.length]} unit="" />
                </ChartCard>
              ))}
              <ChartCard title="Sumatoria 6 pliegues" unit=" mm" valor={mm && typeof mm.suma6 === 'number' ? mm.suma6 : null}>
                <Linea data={sel.medicionesManual} field="suma6" color="#3E6B5B" unit="" />
              </ChartCard>
            </div>
            <div style={{ ...S.subLbl, marginTop: 6 }}>Perímetros (cm)</div>
            <div style={S.chartGrid}>
              {PERIMETROS.map((p, i) => (
                <ChartCard key={p.k} title={p.l} unit=" cm" valor={mm && typeof mm[p.k] === 'number' ? mm[p.k] : null}>
                  <Linea data={sel.medicionesManual} field={p.k} color={ANTRO_COLORS[(i + 6) % ANTRO_COLORS.length]} unit="" />
                </ChartCard>
              ))}
            </div>
          </div>
        )}

        <div style={S.panelGrid}>
          {/* Historial clínico */}
          <div className="card" style={panel === 'historia' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'historia' ? null : 'historia')}>
              <span style={S.panelTitle}>Historial clínico nutricio</span>
              <span style={panel === 'historia' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'historia' && (
              <div style={S.panelBody}>
                <div style={S.titleRow}>
                  <div style={S.note}>Datos generales, padecimientos, bioquímica, suplementación, síntomas, antecedentes, historia dietética, ejercicio y notas generales.</div>
                  <button style={S.smallBtn} onClick={() => irSub('historia')}>Ver / editar</button>
                </div>
                {sel.historia
                  ? <div style={{ fontSize: 13, color: 'var(--dark)' }}>Historia clínica registrada.</div>
                  : <div className="empty-state">Aún no hay historia clínica.</div>}
              </div>
            )}
          </div>

          {/* Archivos del paciente (mismas secciones que ve el paciente) */}
          <div className="card" style={panel === 'archivos' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'archivos' ? null : 'archivos')}>
              <span style={S.panelTitle}>Archivos del paciente</span>
              <span style={panel === 'archivos' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'archivos' && (
              <div style={S.panelBody}>
                <div style={S.note}>Todos los archivos del paciente, organizados como en su panel. El paciente ve estos mismos archivos.</div>

                {archHeader('plan', 'Mi plan alimenticio')}
                {archSec.plan && (
                  <div style={S.archBody}>
                    {sel.plan && sel.plan.totales && (
                      <div style={{ background: 'var(--cream)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Plan vigente</div>
                        <div style={{ fontSize: 14, color: 'var(--dark)', fontWeight: 700, marginTop: 2 }}>{sel.plan.totales.kcal} kcal · {fmtFecha(sel.plan.fecha)}</div>
                      </div>
                    )}
                    <div style={S.titleRow}>
                      <div style={S.note}>El PDF del plan se guarda en Drive y aquí se registra su enlace.</div>
                      <button style={S.smallBtn} onClick={() => setOpenPlan(v => !v)}>{openPlan ? 'Cancelar' : '+ Plan'}</button>
                    </div>
                    {openPlan && (
                      <div style={S.formRow}>
                        <Field l="Nombre del plan"><input style={S.inp} value={plan.nombre} onChange={e => setPlan({ ...plan, nombre: e.target.value })} placeholder="Plan · 2200 kcal" /></Field>
                        <Field l="Fecha"><input type="date" style={S.inp} value={plan.fecha} onChange={e => setPlan({ ...plan, fecha: e.target.value })} /></Field>
                        <Field l="Enlace de Drive"><input style={S.inp} value={plan.link} onChange={e => setPlan({ ...plan, link: e.target.value })} placeholder="https://drive.google.com/…" /></Field>
                        <button style={S.saveBtn} onClick={addPlan}>Guardar</button>
                      </div>
                    )}
                    {(!sel.planes || sel.planes.length === 0)
                      ? <div className="empty-state">Aún no hay planes para este paciente.</div>
                      : sel.planes.map((pl, i) => (
                        <div key={i} style={S.planRow}>
                          <div style={S.planIcon}>PDF</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{pl.nombre}</div>
                            <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 1 }}>{pl.fecha ? fmtFecha(pl.fecha) : ''}</div>
                          </div>
                          {pl.link
                            ? <a href={pl.link} target="_blank" rel="noreferrer" style={S.openBtn}>Abrir</a>
                            : <span style={{ fontSize: 11, color: 'var(--stone)', fontStyle: 'italic' }}>Sin enlace</span>}
                          <button style={S.rm} onClick={() => removePlan(i)} title="Quitar">×</button>
                        </div>
                      ))}
                  </div>
                )}

                {archHeader('isak', 'Reportes ISAK')}
                {archSec.isak && (
                  <div style={S.archBody}>
                    <label style={S.upload}>
                      <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => setIsakFile(e.target.files && e.target.files[0])} />
                      {isakFile ? ('PDF seleccionado: ' + isakFile.name) : 'Seleccionar PDF del reporte ISAK'}
                    </label>
                    <button style={{ ...S.saveBtn, marginTop: 10 }} onClick={subirIsak} disabled={isakBusy}>{isakBusy ? 'Cargando…' : 'Cargar reporte ISAK'}</button>
                    <div style={{ marginTop: 14 }}>
                      {(!sel.isak || sel.isak.length === 0)
                        ? <div className="empty-state">Aún no hay reportes ISAK.</div>
                        : [...sel.isak].map((r, idx) => ({ r, idx })).reverse().map(({ r, idx }) => (
                          <div key={idx} style={S.planRow}>
                            <div style={S.planIcon}>PDF</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{r.nombre || 'Reporte ISAK'}</div>
                              <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 1 }}>{r.fecha ? fmtFecha(r.fecha) : ''}</div>
                            </div>
                            {r.link && <a href={r.link} target="_blank" rel="noreferrer" style={S.openBtn}>Abrir</a>}
                            <button style={S.rm} onClick={() => removeIsak(idx)} title="Quitar">×</button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {archHeader('inbody', 'Mediciones')}
                {archSec.inbody && (
                  <div style={S.archBody}>
                    <div style={S.note}>Las mediciones se cargan y leen con IA (PDF o imagen del InBody) desde el panel <b>Mediciones</b>. Aquí ves los archivos guardados.</div>
                    {(!sel.inbodyArchivos || sel.inbodyArchivos.length === 0)
                      ? <div className="empty-state">Aún no hay archivos de InBody.</div>
                      : [...sel.inbodyArchivos].map((r, idx) => ({ r, idx })).reverse().map(({ r, idx }) => (
                        <div key={idx} style={S.planRow}>
                          <div style={S.planIcon}>PDF</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{r.nombre || 'InBody'}</div>
                            <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 1 }}>{r.fecha ? fmtFecha(r.fecha) : ''}</div>
                          </div>
                          {r.link && <a href={r.link} target="_blank" rel="noreferrer" style={S.openBtn}>Abrir</a>}
                        </div>
                      ))}
                  </div>
                )}

                {archHeader('estudios', 'Estudios clínicos')}
                {archSec.estudios && (
                  <div style={S.archBody}>
                    <div style={S.note}>El paciente los sube desde su panel; también puedes subirlos tú.</div>
                    <label style={S.upload}>
                      <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => setEstudioFile(e.target.files && e.target.files[0])} />
                      {estudioFile ? ('Archivo seleccionado: ' + estudioFile.name) : 'Seleccionar estudio (PDF o imagen)'}
                    </label>
                    <button style={{ ...S.saveBtn, marginTop: 10 }} onClick={subirEstudio} disabled={estudioBusy}>{estudioBusy ? 'Cargando…' : 'Cargar estudio'}</button>
                    <div style={{ marginTop: 14 }}>
                      {(!sel.estudios || sel.estudios.length === 0)
                        ? <div className="empty-state">Aún no hay estudios clínicos.</div>
                        : [...sel.estudios].map((r, idx) => ({ r, idx })).reverse().map(({ r, idx }) => (
                          <div key={idx} style={{ marginBottom: 8 }}>
                            <div style={{ ...S.planRow, marginBottom: 0 }}>
                              <div style={S.planIcon}>PDF</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{r.nombre || 'Estudio clínico'}</div>
                                <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 1 }}>
                                  {r.fecha ? fmtFecha(r.fecha) : ''}{r.analisis ? ' · Analizado' : ''}
                                </div>
                              </div>
                              {r.analisis
                                ? <button style={{ ...S.openBtn, border: 'none', cursor: 'pointer' }} onClick={() => setEstudioAbierto(estudioAbierto === idx ? null : idx)}>
                                    {estudioAbierto === idx ? 'Ocultar' : 'Ver análisis'}
                                  </button>
                                : <button style={{ ...S.openBtn, border: 'none', cursor: 'pointer', opacity: analizandoIdx === idx ? 0.6 : 1 }} onClick={() => analizarEstudio(idx)} disabled={analizandoIdx === idx}>
                                    {analizandoIdx === idx ? 'Analizando…' : 'Analizar'}
                                  </button>}
                              {r.link && <a href={r.link} target="_blank" rel="noreferrer" style={S.openBtn}>Abrir</a>}
                              <button style={S.rm} onClick={() => removeEstudio(idx)} title="Quitar">×</button>
                            </div>
                            {r.analisis && estudioAbierto === idx && (
                              <div style={{ marginTop: 6, padding: '12px 14px', background: 'var(--mint)', border: '0.5px solid var(--border)', borderRadius: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)' }}>
                                  {r.analisis.tipo || 'Análisis del estudio'}{r.analisis.fecha ? ' · ' + r.analisis.fecha : ''}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2, marginBottom: 10 }}>
                                  Lectura automática para revisión. No sustituye el criterio de la nutrióloga.
                                </div>
                                {(r.analisis.fueraDeRango && r.analisis.fueraDeRango.length > 0) ? (
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                      <tr style={{ textAlign: 'left', color: 'var(--stone)' }}>
                                        <th style={{ padding: '4px 6px', fontWeight: 600 }}>Parámetro</th>
                                        <th style={{ padding: '4px 6px', fontWeight: 600 }}>Resultado</th>
                                        <th style={{ padding: '4px 6px', fontWeight: 600 }}>Referencia</th>
                                        <th style={{ padding: '4px 6px', fontWeight: 600 }}>Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.analisis.fueraDeRango.map((vv, k) => (
                                        <tr key={k} style={{ borderTop: '0.5px solid var(--border)' }}>
                                          <td style={{ padding: '6px', fontWeight: 600, color: 'var(--dark)' }}>{vv.parametro}</td>
                                          <td style={{ padding: '6px', color: 'var(--dark)' }}>{vv.resultado}{vv.unidad ? ' ' + vv.unidad : ''}</td>
                                          <td style={{ padding: '6px', color: 'var(--stone)' }}>{vv.referencia || '—'}</td>
                                          <td style={{ padding: '6px' }}>
                                            <span style={{ padding: '1px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#fff', background: vv.estado === 'alto' ? '#c0392b' : '#2563eb' }}>
                                              {vv.estado === 'alto' ? '↑ Alto' : '↓ Bajo'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div style={{ fontSize: 12, color: 'var(--dark)' }}>Todos los valores leídos están dentro del rango de referencia.</div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                                  <button style={{ ...S.openBtn, border: 'none', cursor: 'pointer' }} onClick={() => adjuntarAnalisisAReco(idx)}>
                                    Adjuntar a recomendaciones
                                  </button>
                                  <button style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 11 }} onClick={() => analizarEstudio(idx)} disabled={analizandoIdx === idx}>
                                    {analizandoIdx === idx ? 'Analizando…' : 'Volver a analizar'}
                                  </button>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 8 }}>
                                  {(r.analisis.dentroDeRango || 0)} dentro de rango · {(r.analisis.valores || []).length} parámetro(s) leídos.
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* InBody */}
          <div className="card" style={panel === 'inbody' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'inbody' ? null : 'inbody')}>
              <span style={S.panelTitle}>Mediciones</span>
              <span style={panel === 'inbody' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'inbody' && (
              <div style={S.panelBody}>
                <div style={S.segWrap}>
                  <button style={medMode === 'inbody' ? S.segOn : S.segOff} onClick={() => setMedMode('inbody')}>InBody</button>
                  <button style={medMode === 'manual' ? S.segOn : S.segOff} onClick={() => setMedMode('manual')}>Manual</button>
                </div>

                {medMode === 'inbody' && (
                  <div>
                    <div style={S.note}>Sube el PDF o la imagen (JPG/PNG) del InBody y el sistema lo lee automáticamente (IA): extrae peso, % de grasa, masa muscular, masa grasa, grasa visceral, agua y TMB, y alimenta las gráficas. Si algún valor sale mal, corrígelo con “Editar última” en Gráficas de avance.</div>
                    <label
                      style={{ ...S.upload, ...(dragIb ? { border: '2px dashed var(--dark)', background: '#EFE3D2' } : null) }}
                      onDragOver={e => { e.preventDefault(); if (!ibBusy) setDragIb(true); }}
                      onDragEnter={e => { e.preventDefault(); if (!ibBusy) setDragIb(true); }}
                      onDragLeave={e => { e.preventDefault(); setDragIb(false); }}
                      onDrop={e => {
                        e.preventDefault(); setDragIb(false);
                        if (ibBusy) return;
                        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                        if (!f) return;
                        const ok = /pdf|image\//i.test(f.type || '') || /\.(pdf|jpe?g|png|webp|gif)$/i.test(f.name || '');
                        if (!ok) { setErr('Arrastra un PDF o una imagen (JPG/PNG) del InBody.'); return; }
                        setIbFile(f); setIbMsg(''); setErr('');
                        leerYGuardarInBody(f);
                      }}
                    >
                      <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => { setIbFile(e.target.files && e.target.files[0]); setIbMsg(''); }} />
                      {dragIb ? 'Suelta el archivo para cargarlo automáticamente…' : (ibFile ? ('Archivo seleccionado: ' + ibFile.name) : 'Arrastra aquí el PDF o imagen del InBody, o haz clic para seleccionarlo')}
                    </label>
                    <button style={{ ...S.saveBtn, marginTop: 4 }} onClick={leerYGuardarInBody} disabled={ibBusy}>{ibBusy ? 'Leyendo…' : 'Leer y guardar InBody'}</button>
                    {ibMsg && <div style={{ ...S.note, marginTop: 10, marginBottom: 0, color: 'var(--dark)' }}>{ibMsg}</div>}
                    <div style={{ ...S.note, marginTop: 12, marginBottom: 0 }}>Los archivos guardados aparecen en <b>Archivos del paciente → Mediciones</b>.</div>
                  </div>
                )}

                {medMode === 'manual' && (
                  <div>
                    <div style={S.note}>Captura pliegues (mm) y perímetros (cm). Se guardan con su fecha y alimentan las gráficas de seguimiento.</div>
                    <div style={{ maxWidth: 200, marginBottom: 6 }}>
                      <Field l="Fecha de la medición"><input type="date" style={S.inp} value={manual.fecha} onChange={e => setManual({ ...manual, fecha: e.target.value })} /></Field>
                    </div>

                    <div style={S.subLbl}>Pliegues (mm)</div>
                    <div style={S.medGrid}>
                      {PLIEGUES.map(p => (
                        <Field key={p.k} l={p.l}><input style={S.inp} inputMode="decimal" value={manual[p.k]} onChange={e => setManual({ ...manual, [p.k]: e.target.value })} /></Field>
                      ))}
                    </div>

                    <div style={S.sumaBox}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--stone)' }}>Sumatoria de 6 pliegues</div>
                        <div style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: 22, color: 'var(--dark)' }}>{hayPliegueManual ? (Math.round(sumaManual * 10) / 10) : '—'} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--stone)' }}>mm</span></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--stone)', marginBottom: 4 }}>Ideal {manualMasculino ? 'hombres' : 'mujeres'} &lt; {umbralPliegues} mm</div>
                        {hayPliegueManual && (
                          <span style={sumaManual < umbralPliegues ? S.badgeOk : S.badgeWarn}>{sumaManual < umbralPliegues ? 'Dentro del rango ideal' : 'Por encima del rango ideal'}</span>
                        )}
                      </div>
                    </div>

                    <div style={S.subLbl}>Perímetros (cm)</div>
                    <div style={S.medGrid}>
                      {PERIMETROS.map(p => (
                        <Field key={p.k} l={p.l}><input style={S.inp} inputMode="decimal" value={manual[p.k]} onChange={e => setManual({ ...manual, [p.k]: e.target.value })} /></Field>
                      ))}
                    </div>

                    <button style={{ ...S.saveBtn, marginTop: 6 }} onClick={guardarMedicionManual} disabled={manualBusy}>{manualBusy ? 'Guardando…' : 'Guardar medición manual'}</button>
                    {manualMsg && <div style={{ ...S.note, marginTop: 10, marginBottom: 0, color: 'var(--dark)' }}>{manualMsg}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {panel === null && <div style={S.rowSep} aria-hidden="true" />}
          {/* Plan nutricional */}
          <div className="card" style={panel === 'plan' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'plan' ? null : 'plan')}>
              <span style={S.panelTitle}>Plan nutricional</span>
              <span style={panel === 'plan' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'plan' && (
              <div style={S.panelBody}>
                <div style={S.titleRow}>
                  <div style={S.note}>Calcula los equivalentes (SMAE) y los macros del plan a partir de los datos del paciente.</div>
                  <button style={S.smallBtn} onClick={() => { setInbody(null); irSub('plan'); }}>Abrir cálculo</button>
                </div>
                {sel.plan && sel.plan.totales
                  ? <div style={{ fontSize: 13, color: 'var(--dark)' }}>Plan guardado: <b>{sel.plan.totales.kcal} kcal</b> · {fmtFecha(sel.plan.fecha)}</div>
                  : <div className="empty-state">Aún no hay cálculo de plan.</div>}
              </div>
            )}
          </div>

          {/* Menús */}
          <div className="card" style={panel === 'menus' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'menus' ? null : 'menus')}>
              <span style={S.panelTitle}>Menús o equivalencias</span>
              <span style={panel === 'menus' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'menus' && (
              <div style={S.panelBody}>
                <div style={S.titleRow}>
                  <div style={S.note}>Reparte los equivalentes del plan en los tiempos de comida y arma las opciones de menú.</div>
                  <button style={S.smallBtn} onClick={() => { setMenuReabrir(null); irSub('menus'); }}>Nuevo menú</button>
                </div>
                {!(sel.plan && sel.plan.eq)
                  ? <div className="empty-state">Primero calcula y guarda el plan.</div>
                  : (sel.plan.menus && sel.plan.menus.tiempos
                    ? <div style={{ fontSize: 13, color: 'var(--dark)' }}>{sel.plan.menus.tiempos.length} tiempos de comida configurados.</div>
                    : <div className="empty-state">Aún no hay menús generados.</div>)}
                {Array.isArray(sel.menusHistorial) && sel.menusHistorial.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={S.note}>Menús anteriores · reábrelos para editar o abre su PDF.</div>
                    {[...sel.menusHistorial].map((mh, idx) => ({ mh, idx })).reverse().map(({ mh, idx }) => (
                      <div key={idx} style={S.planRow}>
                        <div style={S.planIcon}>PDF</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{mh.nombre || 'Menú'}</div>
                          <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 1 }}>{mh.fecha ? fmtFecha(mh.fecha) : ''}{mh.tiempos ? ' · ' + mh.tiempos.length + ' tiempos' : ''}</div>
                        </div>
                        <button style={S.smallBtn} onClick={() => { setMenuReabrir(mh); irSub('menus'); }}>Reabrir</button>
                        {mh.link && <a href={mh.link} target="_blank" rel="noreferrer" style={S.openBtn}>PDF</a>}
                        <button style={S.rm} onClick={() => removeMenuHistorial(idx)} title="Quitar">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {panel === null && <div style={S.rowSep} aria-hidden="true" />}
          {/* Seguimientos (notas internas de consulta, no visibles para el paciente) */}
          <div className="card" style={panel === 'bitacora' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'bitacora' ? null : 'bitacora')}>
              <span style={S.panelTitle}>Seguimientos</span>
              <span style={panel === 'bitacora' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'bitacora' && (
              <div style={S.panelBody}>
                <div style={S.note}>Notas de seguimiento de la consulta (texto libre). <b>El paciente no las ve.</b></div>
                <div style={{ marginBottom: 12 }}>
                  <textarea style={S.recoArea} rows={3} value={bitacoraTexto} onChange={e => setBitacoraTexto(e.target.value)}
                    placeholder="Anota lo que comente el paciente, observaciones, acuerdos…" />
                  <div style={{ marginTop: 8, maxWidth: 200 }}>
                    <Field l="% apego al plan (opcional)"><input style={S.inp} inputMode="decimal" value={bitacoraApego} onChange={e => setBitacoraApego(e.target.value)} placeholder="Ej. 100" /></Field>
                  </div>
                  <button style={{ ...S.saveBtn, marginTop: 8 }} onClick={addBitacora}>+ Agregar nota</button>
                </div>
                {(!sel.bitacora || sel.bitacora.length === 0)
                  ? <div className="empty-state">Aún no hay notas de consulta.</div>
                  : [...sel.bitacora].map((r, idx) => ({ r, idx })).reverse().map(({ r, idx }) => (
                    <div key={idx} style={S.recoItem}>
                      <div style={{ flex: 1 }}>
                        <div style={S.recoDate}>{fmtSello(r.fecha)}</div>
                        <div style={S.recoText}>{r.texto}</div>
                      </div>
                      <button style={S.rm} onClick={() => removeBitacora(idx)} title="Eliminar">×</button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Recomendaciones */}
          <div className="card" style={panel === 'reco' ? S.panelOpen : S.panel}>
            <button style={S.panelHead} onClick={() => setPanel(p => p === 'reco' ? null : 'reco')}>
              <span style={S.panelTitle}>Recomendaciones</span>
              <span style={panel === 'reco' ? S.chevOpen : S.chev}>⌄</span>
            </button>
            {panel === 'reco' && (
              <div style={S.panelBody} ref={recoFormRef}>
                <div style={S.note}>Cada recomendación se publica con fecha y hora; el paciente la verá en su sección "Recomendaciones". Usa los botones para agregar atajos a cada apartado.</div>
                {sel.historia && (
                  <button style={{ ...S.smallBtn, marginBottom: 12 }} onClick={() => setVerHistoria(true)} title="Consultar la historia clínica sin salir">
                    Ver historia clínica
                  </button>
                )}
                {verHistoria && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
                    <div onClick={() => setVerHistoria(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
                    <div style={{ position: 'relative', width: 'min(640px, 94vw)', height: '100%', background: 'var(--bg)', boxShadow: '-10px 0 30px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--card)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14 }}>Historia clínica · {sel.nombre || ''} <span style={{ fontWeight: 400, color: 'var(--stone)', fontSize: 12 }}>(solo lectura)</span></span>
                        <button style={S.smallBtn} onClick={() => setVerHistoria(false)}>Cerrar ✕</button>
                      </div>
                      <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <HistoriaClinica initial={sel.historia} codigo={sel.codigo} readOnly onBack={() => setVerHistoria(false)} />
                      </div>
                    </div>
                  </div>
                )}
                {RECO_SECCIONES.map(sec => (
                  <div key={sec.key} style={S.recoSeccion}>
                    <div style={S.recoSeccionTitulo}>{sec.titulo}</div>
                    <div style={S.chipRow}>
                      {sec.items.map(it => {
                        const label = typeof it === 'string' ? it : it.l;
                        const ins = typeof it === 'string' ? it : (it.ins || it.l);
                        return <button key={'p-' + label} type="button" style={S.chip} onClick={() => addChipTo(sec.key, ins)}>+ {label}</button>;
                      })}
                      {(recoChips[sec.key] || []).map(c => (
                        <button key={'c-' + c} type="button" style={S.chip} onClick={() => addChipTo(sec.key, c)}>+ {c}</button>
                      ))}
                      <button type="button" style={S.chipAdd} onClick={() => agregarChip(sec.key)} title="Guardar un enlace rápido nuevo para futuras recomendaciones">＋ Agregar</button>
                    </div>
                    <textarea style={S.recoArea} rows={3} value={recoForm[sec.key]}
                      onChange={e => setRecoForm(prev => ({ ...prev, [sec.key]: e.target.value }))}
                      placeholder={`Recomendaciones de ${sec.titulo.toLowerCase()}…`} />
                  </div>
                ))}
                {recoAnalisis && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 12, background: 'var(--mint)', border: '0.5px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--dark)' }}>
                      <b>Tabla de análisis adjunta</b>
                      {recoAnalisis.tipo ? ' · ' + recoAnalisis.tipo : ''} ·{' '}
                      {(recoAnalisis.fueraDeRango || []).length} valor(es) fuera de rango. Se incluirá en el PDF.
                    </div>
                    <button style={S.rm} onClick={() => setRecoAnalisis(null)} title="Quitar la tabla adjunta">×</button>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 14, flexWrap: 'wrap' }}>
                  <button style={S.saveBtn} onClick={addReco}>{recoEditIdx != null ? 'Guardar cambios' : '+ Agregar recomendación'}</button>
                  {recoEditIdx == null && <button style={S.smallBtn} onClick={guardarBorradorReco}>Guardar borrador</button>}
                  {recoEditIdx != null && <button style={S.smallBtn} onClick={cancelarEdicionReco}>Cancelar</button>}
                  {recoEditIdx != null && <span style={{ fontSize: 12, color: '#9A7B2E', fontWeight: 600 }}>Editando una recomendación existente</span>}
                  {recoPdfMsg && <span style={{ fontSize: 12, color: 'var(--stone)' }}>{recoPdfMsg}</span>}
                </div>
                {(!sel.recomendaciones || sel.recomendaciones.length === 0)
                  ? <div className="empty-state">Aún no hay recomendaciones.</div>
                  : [...sel.recomendaciones].map((r, idx) => ({ r, idx })).reverse().map(({ r, idx }) => {
                    const secs = recoSeccionesConContenido(r);
                    return (
                      <div key={idx} style={S.recoItem}>
                        <div style={{ flex: 1 }}>
                          <div style={S.recoDate}>{fmtSello(r.fecha)}</div>
                          {secs.length > 0
                            ? secs.map(s => (
                              <div key={s.titulo} style={{ marginTop: 7 }}>
                                <div style={S.recoItemSecTitulo}>{s.titulo}</div>
                                <div style={S.recoText}>{s.texto}</div>
                              </div>))
                            : <div style={S.recoText}>{r.texto || ''}</div>}
                        </div>
                        <button style={S.smallBtn} onClick={() => editarReco(idx)} title="Editar esta recomendación">Editar</button>
                        <button style={S.smallBtn} onClick={() => generarPDFReco(r)} title="Generar PDF de esta recomendación">PDF</button>
                        <button style={S.rm} onClick={() => removeReco(idx)} title="Eliminar">×</button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {panel === null && <div style={S.rowSep} aria-hidden="true" />}
        </div>

        <button style={{ ...S.back, marginTop: 16, marginBottom: 0 }} onClick={volver}>← Atrás</button>

        {inbodyOpen && (
          <InBodyModal
            patient={sel}
            onClose={() => setInbodyOpen(false)}
            onDesdeCero={() => { setInbody(null); setInbodyOpen(false); irSub('plan'); }}
            onInBody={onInBody}
          />
        )}
      </div>
    );
  }

  /* ----- VISTA: lista de pacientes ----- */
  return (
    <div>
      <div style={S.titleRow}>
        <div className="card-title" style={{ margin: 0, fontSize: 16 }}>Pacientes</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input style={S.search} value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar paciente…" />
          <div style={{ position: 'relative' }}>
            <button style={S.smallBtn} onClick={() => setVistaOpen(v => !v)}>Vista ▾</button>
            {vistaOpen && (
              <>
                <div style={S.menuOverlay} onClick={() => setVistaOpen(false)} />
                <div style={{ ...S.menu, top: 42, right: 0, minWidth: 250 }}>
                  {[['alfabetico', 'Orden alfabético'], ['creacion-desc', 'Fecha de creación · más reciente'], ['creacion-asc', 'Fecha de creación · más antigua']].map(([val, label]) => (
                    <button key={val} style={{ ...S.menuItem, fontWeight: orden === val ? 800 : 500, background: orden === val ? 'var(--cream)' : 'transparent' }}
                      onClick={() => { setOrden(val); setVistaOpen(false); }}>{label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button style={S.smallBtn} onClick={() => setOpenImport(true)}>Importar</button>
          <button style={S.smallBtn} onClick={irNuevo}>+ Nuevo paciente</button>
        </div>
      </div>
      <ImportarPacientes
        open={openImport}
        onClose={() => setOpenImport(false)}
        pacientes={pacientes}
        prefix={CODE_PREFIX}
      />


      {err && <div style={S.err}>{err}</div>}

      <div className="card">
        {(() => {
          const q = busca.trim().toLowerCase();
          const filtrados = q
            ? pacientes.filter(p => (p.nombre || '').toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q))
            : pacientes;
          const ordenados = [...filtrados].sort((a, b) => {
            if (orden === 'alfabetico') return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
            if (orden === 'creacion-asc') return pacCreadoTs(a) - pacCreadoTs(b);
            return pacCreadoTs(b) - pacCreadoTs(a); // creacion-desc (más reciente primero)
          });
          return (
            <>
              <div className="card-title">Mis pacientes ({filtrados.length})</div>
              {pacientes.length === 0
                ? <div className="empty-state">No hay pacientes registrados aún. Usa “+ Nuevo paciente”.</div>
                : filtrados.length === 0
                  ? <div className="empty-state">No se encontraron pacientes con “{busca}”.</div>
                  : ordenados.map(p => {
                    const m = last(p.mediciones);
                    return (
                      <div className="pac-item" key={p.id} style={{ position: 'relative' }}
                        onClick={() => abrir(p.id)}>
                        <div className="pac-avatar">{initials(p.nombre)}</div>
                        <div style={{ flex: 1 }}>
                          <div className="pac-nombre">{p.nombre}</div>
                          <div className="pac-detalle">{p.codigo} · {p.objetivo || 'sin objetivo'}</div>
                        </div>
                        {orden.startsWith('creacion') && (
                          <div style={{ flexShrink: 0, textAlign: 'right', marginLeft: 8, minWidth: 130 }}>
                            <div style={{ fontSize: 9.5, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Fecha de creación</div>
                            <div style={{ fontSize: 12.5, color: 'var(--dark)', fontWeight: 600 }}>{fmtFecha(pacCreadoISO(p)) || '—'}</div>
                          </div>
                        )}
                        <div className="pac-citas">{m ? m.peso + ' kg' : '—'}</div>
                        <button style={S.kebab} title="Opciones rápidas"
                          onClick={(e) => { e.stopPropagation(); setMenuId(menuId === p.id ? null : p.id); }}>⋮</button>
                        {menuId === p.id && (
                          <>
                            <div style={S.menuOverlay} onClick={(e) => { e.stopPropagation(); setMenuId(null); }} />
                            <div style={S.menu} onClick={(e) => e.stopPropagation()}>
                              <button style={S.menuItem} onClick={() => abrir(p.id)}>Ver paciente</button>
                              <button style={{ ...S.menuItem, color: '#B0593F' }} onClick={() => eliminar(p)}>Eliminar</button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
              }
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* ===== piezas pequeñas ===== */
function Info({ l, v }) {
  return <div style={styles.infoCell}><div style={styles.infoLbl}>{l}</div><div style={styles.infoVal}>{v}</div></div>;
}

function CorreoVinculo({ patient }) {
  const [v, setV] = useState(patient.correo || '');
  const [st, setSt] = useState('');
  const save = async () => {
    setSt('Guardando…');
    const correo = v.trim().toLowerCase();
    try {
      await updateDoc(doc(db, 'pacientes', patient.id), { correo });
      if (correo && correo.indexOf('@') >= 0) {
        try { await setDoc(doc(db, 'suscriptores', correo), { correo, sexo: patient.sexo || '', nombre: patient.nombre || '' }, { merge: true }); } catch (e) {}
      }
      setSt('Vínculo guardado ✓');
    }
    catch (e) { setSt('Error: ' + e.message); }
  };
  return (
    <div className="card">
      <div className="card-title">Vínculo con la cuenta del paciente</div>
      <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 10, lineHeight: 1.5 }}>
        El paciente verá su plan al iniciar sesión con este correo (debe ser el mismo de su cuenta de Google).
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ ...styles.inp, flex: 1, minWidth: 200 }} value={v} onChange={e => setV(e.target.value)} placeholder="correo@gmail.com" />
        <button style={styles.smallBtn} onClick={save}>Guardar correo</button>
      </div>
      {st && <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 8 }}>{st}</div>}
    </div>
  );
}
function Field({ l, children }) {
  return <label style={styles.field}><span style={styles.fieldLbl}>{l}</span>{children}</label>;
}
function ChartCard({ title, unit, valor, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTop}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)' }}>{title}</span>
        <span style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: 22, color: 'var(--dark)' }}>{valor != null ? valor : '—'}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--stone)' }}>{unit}</span></span>
      </div>
      {children}
    </div>
  );
}

const styles = {
  back: { background: '#fff', border: '0.5px solid var(--border)', color: 'var(--dark)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 14px', borderRadius: 8, marginBottom: 14 },
  err: { background: '#fef0f0', color: '#c0392b', fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 12 },
  headRow: { display: 'flex', alignItems: 'center', gap: 12 },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  infoCell: { background: 'var(--cream)', borderRadius: 10, padding: '9px 11px' },
  infoLbl: { fontSize: 9.5, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600, marginBottom: 3 },
  infoVal: { fontSize: 13, color: 'var(--dark)', fontWeight: 600 },
  chartGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 },
  metric: { background: '#fff', border: '0.5px solid var(--border)', borderRadius: 14, padding: '14px 16px' },
  metricLbl: { fontSize: 11, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 },
  metricVal: { fontSize: 26, fontWeight: 800, color: 'var(--dark)', marginTop: 4, lineHeight: 1.1 },
  metricUnit: { fontSize: 12, fontWeight: 600, color: 'var(--stone)' },
  recoArea: { width: '100%', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', resize: 'vertical', boxSizing: 'border-box' },
  chipGroups: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 },
  chipGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  chipLabel: { fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--stone)' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { background: 'var(--cream)', border: '1px solid var(--gold)', borderRadius: 999, padding: '5px 11px', fontSize: 12, fontWeight: 600, color: 'var(--dark)', cursor: 'pointer', fontFamily: 'var(--font)' },
  chipAdd: { background: 'transparent', border: '1px dashed var(--gold)', borderRadius: 999, padding: '5px 11px', fontSize: 12, fontWeight: 700, color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font)' },
  recoSeccion: { marginBottom: 14 },
  recoSeccionTitulo: { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 7 },
  recoItemSecTitulo: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 2 },
  archHead: { width: '100%', background: 'var(--dark)', color: '#fff', fontWeight: 700, fontSize: 13.5, padding: '9px 13px', borderRadius: 9, letterSpacing: 0.3, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font)', marginTop: 10 },
  archBody: { marginTop: 12, marginBottom: 6, paddingLeft: 2 },
  segWrap: { display: 'inline-flex', background: 'var(--cream)', borderRadius: 9, padding: 3, gap: 3, marginBottom: 14 },
  segOn: { border: 'none', background: '#fff', color: 'var(--dark)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 7, cursor: 'pointer', boxShadow: '0 0 0 0.5px var(--border)' },
  segOff: { border: 'none', background: 'transparent', color: 'var(--stone)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 7, cursor: 'pointer' },
  subLbl: { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--stone)', margin: '4px 0 10px' },
  medGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '4px 12px', marginBottom: 14 },
  sumaBox: { background: 'var(--cream)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 },
  badgeOk: { fontSize: 12, padding: '4px 10px', borderRadius: 8, background: '#e6f4ea', color: '#2e7d4f', fontWeight: 600 },
  badgeWarn: { fontSize: 12, padding: '4px 10px', borderRadius: 8, background: '#fdf0e3', color: '#b5701f', fontWeight: 600 },
  recoItem: { display: 'flex', alignItems: 'flex-start', gap: 10, border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, background: 'var(--cream)' },
  recoDate: { fontSize: 10.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 },
  recoText: { fontSize: 13, color: 'var(--dark)', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  panelGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'start' },
  panel: { padding: 0, overflow: 'hidden' },
  panelOpen: { padding: 0, overflow: 'hidden', gridColumn: '1 / -1' },
  rowSep: { gridColumn: '1 / -1', height: 2, background: 'var(--gold)', borderRadius: 2, margin: '2px 0' },
  panelHead: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: '16px 16px', textAlign: 'left' },
  panelTitle: { fontSize: 14, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.3 },
  chev: { color: 'var(--stone)', fontSize: 16, transition: 'transform .15s', flexShrink: 0 },
  chevOpen: { color: 'var(--gold)', fontSize: 16, transform: 'rotate(180deg)', flexShrink: 0 },
  panelBody: { padding: '14px 16px 16px', borderTop: '1px solid rgba(54,48,43,0.14)' },
  upload: { display: 'block', textAlign: 'center', background: 'var(--cream)', border: '1px dashed var(--gold)', borderRadius: 10, padding: '14px', fontSize: 13, fontWeight: 600, color: 'var(--dark)', cursor: 'pointer', marginBottom: 12 },
  chartCard: { border: '0.5px solid var(--border)', borderRadius: 12, padding: '10px 12px', background: '#fff' },
  chartTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLbl: { fontSize: 9.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' },
  fieldsWrap: {},
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, background: 'var(--cream)', borderRadius: 10, padding: 12, marginBottom: 12, alignItems: 'end' },
  inp: { border: '0.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', width: '100%' },
  saveBtn: { background: 'var(--gold)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  smallBtn: { background: '#fff', color: 'var(--dark)', border: '0.5px solid var(--border)', padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  search: { flex: '1 1 160px', minWidth: 150, maxWidth: 260, background: '#fff', color: 'var(--dark)', border: '0.5px solid var(--border)', padding: '7px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)', boxSizing: 'border-box' },
  kebab: { flexShrink: 0, width: 34, height: 34, marginLeft: 8, borderRadius: '50%', border: '0.5px solid var(--border)', background: '#fff', color: 'var(--stone)', fontSize: 18, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  menuOverlay: { position: 'fixed', inset: 0, zIndex: 25, background: 'transparent' },
  menu: { position: 'absolute', top: 46, right: 10, zIndex: 30, background: '#fff', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 30px rgba(33,28,23,0.18)', padding: 5, minWidth: 150 },
  menuItem: { display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '9px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600, color: 'var(--dark)', cursor: 'pointer', fontFamily: 'var(--font)' },
  note: { fontSize: 11.5, color: 'var(--stone)', marginBottom: 12, lineHeight: 1.5 },
  planRow: { display: 'flex', alignItems: 'center', gap: 12, border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 },
  planIcon: { width: 36, height: 36, borderRadius: 8, background: 'var(--dark)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 },
  openBtn: { background: 'var(--gold)', color: '#fff', textDecoration: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  rm: { background: 'transparent', border: 'none', color: 'var(--stone)', fontSize: 19, cursor: 'pointer', lineHeight: 1, padding: '0 4px' },
};
