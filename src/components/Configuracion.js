import React, { useState, useRef, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HORARIO_DEFAULT, MODALIDADES, franjasDe, SERVICIOS_DEFAULT } from './Agenda';
import { useBranding, DEFAULT_COLORS, aplicarColores } from '../context/BrandingContext';
import { useTheme, ES_FITMEAL } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { MULTI_NUTRI, slugDeNombre, linkNutri } from '../utils/multiTenant';
import { PAQUETES_DEFAULT, FAMILIAS } from '../utils/creditos';
import { CFDI_DEFAULT, CLAVES_UNIDAD, OPCIONES_IVA, REGIMENES_FISCALES } from '../data/catalogosCFDI';

// Bloqueo de marca por instancia (definido aquí para no depender de otro archivo):
// si REACT_APP_BRANDING_LOCKED === 'true', no se muestra el editor de colores.
const BRANDING_LOCKED = String(process.env.REACT_APP_BRANDING_LOCKED || '').toLowerCase() === 'true';

// Facturación (CFDI) en modo prueba: la tarjeta de config se OCULTA salvo que la
// instancia la habilite con REACT_APP_FACTURACION=true.
const FACTURACION_ON = String(process.env.REACT_APP_FACTURACION || '').toLowerCase() === 'true';

// Broker de pagos (MercadoPago) — conexión OAuth self-service. Por ahora solo Fitmeal
// usa el broker (Natalia/Aretia cobran por Stripe). Una sola terminal para todo Fitmeal.
const MP_BROKER_URL = String(process.env.REACT_APP_BROKER_URL || 'https://mp-broker.vercel.app').replace(/\/+$/, '');
const MP_INST = String(process.env.REACT_APP_MP_INST || 'fitmeal');

const DIAS_SEMANA = [
  [1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'],
  [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo'],
];

const COLOR_LABELS = [
  ['gold', 'Acento (botones, detalles)'],
  ['dark', 'Oscuro (barras y texto fuerte)'],
  ['cream', 'Crema (fondos suaves)'],
  ['sage', 'Salvia (acentos)'],
  ['stone', 'Piedra (texto secundario)'],
  ['card', 'Tarjetas (fondo)'],
  ['border', 'Bordes'],
  ['ink', 'Texto principal (cálido)'],
  ['mint', 'Fondos suaves (tablas, tintes)'],
  ['danger', 'Alertas / rojo'],
];

// Carga una imagen, la redimensiona (máx 480px de ancho) y la devuelve como PNG
// en base64 (PNG para conservar transparencia del logo).
function comprimirLogo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Configuracion() {
  const { logo, colors } = useBranding();
  const { tema, setTema, temaDisponible } = useTheme();
  const { esAdmin } = useAuth();
  const [colorsLocal, setColorsLocal] = useState(colors);

  // --- Cobros MercadoPago (Fitmeal, solo admin) ---
  const [mpEstado, setMpEstado] = useState(null);   // null = cargando; {conectado, user_id, desde}
  const [mpMsg, setMpMsg] = useState('');
  const cargarEstadoMp = async () => {
    try {
      const r = await fetch(MP_BROKER_URL + '/api/oauth/status?inst=' + encodeURIComponent(MP_INST), { cache: 'no-store' });
      const d = await r.json();
      setMpEstado(d && typeof d.conectado === 'boolean' ? d : { conectado: false });
    } catch (_) { setMpEstado({ conectado: false, error: true }); }
  };
  const conectarMp = () => {
    let ret;
    try { const u = new URL(window.location.href); u.searchParams.delete('mp'); ret = u.toString(); }
    catch (_) { ret = window.location.origin; }
    window.location.href = MP_BROKER_URL + '/api/oauth/start?inst=' + encodeURIComponent(MP_INST) + '&return=' + encodeURIComponent(ret);
  };
  useEffect(() => {
    if (!(ES_FITMEAL && esAdmin)) return;
    try {
      const m = window.location.href.match(/[?&]mp=(ok|error)/);
      if (m) {
        setMpMsg(m[1] === 'ok'
          ? '¡MercadoPago conectado! Ya puedes cobrar en línea.'
          : 'No se pudo conectar MercadoPago. Vuelve a intentarlo.');
        const limpio = window.location.href
          .replace(/([?&])mp=(ok|error)(&|$)/, (mm, pre, v, post) => post === '&' ? pre : '')
          .replace(/[?&]$/, '');
        window.history.replaceState({}, '', limpio);
      }
    } catch (_) { /* no-op */ }
    cargarEstadoMp();
  }, [esAdmin]);

  // --- Nutriólogas del equipo (multi-inquilino, solo admin) ---
  const [nutriList, setNutriList] = useState([]);
  const nfVacio = { correo: '', nombre: '', cedula: '', slug: '', logo: '', firma: '' };
  const [nfForm, setNfForm] = useState(nfVacio);
  const [nfEdit, setNfEdit] = useState(null);   // correo en edición, o null
  const [nfBusy, setNfBusy] = useState(false);
  const [nfMsg, setNfMsg] = useState('');
  const [nfCopiado, setNfCopiado] = useState('');
  const [nfSlugTocado, setNfSlugTocado] = useState(false);
  const nfLogoRef = useRef(null);
  const nfFirmaRef = useRef(null);

  useEffect(() => {
    if (!MULTI_NUTRI) return undefined;
    return onSnapshot(doc(db, 'config', 'nutriologos'), snap => {
      const arr = (snap.exists() && Array.isArray(snap.data().perfiles)) ? snap.data().perfiles : [];
      setNutriList(arr);
    }, () => {});
  }, []);

  const nfSet = (campo, val) => setNfForm(f => {
    const next = { ...f, [campo]: val };
    if (campo === 'nombre' && !nfSlugTocado) next.slug = slugDeNombre(val);
    return next;
  });
  const nfArchivo = (file, campo) => { if (!file) return; comprimirLogo(file).then(b64 => nfSet(campo, b64)).catch(() => {}); };
  const nfEditar = (p) => { setNfForm({ correo: p.correo || '', nombre: p.nombre || '', cedula: p.cedula || '', slug: p.slug || '', logo: p.logo || '', firma: p.firma || '' }); setNfEdit((p.correo || '').toLowerCase()); setNfSlugTocado(true); setNfMsg(''); };
  const nfCancelar = () => { setNfForm(nfVacio); setNfEdit(null); setNfSlugTocado(false); setNfMsg(''); };
  const copiarLink = (slug) => {
    try { navigator.clipboard.writeText(linkNutri(slug)); setNfCopiado(slug); setTimeout(() => setNfCopiado(''), 1800); }
    catch (_) { setNfMsg('No se pudo copiar; copia el link a mano.'); }
  };
  const guardarNutri = async () => {
    const correo = (nfForm.correo || '').trim().toLowerCase();
    const nombre = (nfForm.nombre || '').trim();
    const slug = (nfForm.slug || slugDeNombre(nombre)).trim().toLowerCase();
    if (!correo || correo.indexOf('@') < 0) { setNfMsg('Escribe un correo válido.'); return; }
    if (!nombre) { setNfMsg('Escribe el nombre de la nutrióloga.'); return; }
    if (!slug) { setNfMsg('Falta el identificador del link (slug).'); return; }
    const slugChoca = nutriList.some(p => (p.slug || '').toLowerCase() === slug && (p.correo || '').toLowerCase() !== correo);
    if (slugChoca) { setNfMsg('Ese identificador de link ya lo usa otra nutrióloga; cámbialo.'); return; }
    setNfBusy(true); setNfMsg('');
    try {
      const perfil = { correo, nombre, cedula: (nfForm.cedula || '').trim(), slug, logo: nfForm.logo || '', firma: nfForm.firma || '' };
      const otros = nutriList.filter(p => (p.correo || '').toLowerCase() !== correo);
      await setDoc(doc(db, 'config', 'nutriologos'), { perfiles: [...otros, perfil] }, { merge: true });
      // Habilita su acceso como nutrióloga (sin admin).
      await setDoc(doc(db, 'autorizados', correo), { rol: 'nutriologa' }, { merge: true });
      setNfMsg(nfEdit ? 'Nutrióloga actualizada.' : 'Nutrióloga agregada. Ya puede entrar con su correo.');
      nfCancelar();
    } catch (e) { setNfMsg('No se pudo guardar. Revisa tu conexión y permisos.'); }
    setNfBusy(false);
  };
  const quitarNutri = async (correo) => {
    const c = (correo || '').toLowerCase();
    setNfBusy(true); setNfMsg('');
    try {
      const perfiles = nutriList.filter(p => (p.correo || '').toLowerCase() !== c);
      await setDoc(doc(db, 'config', 'nutriologos'), { perfiles }, { merge: true });
      setNfMsg('Nutrióloga quitada del equipo. (Su acceso sigue activo hasta que lo revoques en autorizados.)');
    } catch (e) { setNfMsg('No se pudo quitar.'); }
    setNfBusy(false);
  };
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setColorsLocal(colors); }, [colors]);

  // --- Horarios de atención ---
  const [horario, setHorario] = useState(HORARIO_DEFAULT);
  const [excepciones, setExcepciones] = useState({});
  const [excFecha, setExcFecha] = useState('');
  const [horBusy, setHorBusy] = useState(false);
  const [horMsg, setHorMsg] = useState('');
  const [precios, setPrecios] = useState({});
  const [servicios, setServicios] = useState(SERVICIOS_DEFAULT);
  const [nuevoServ, setNuevoServ] = useState({ nombre: '', dur: 30, online: false, precio: '' });
  const [precioBusy, setPrecioBusy] = useState(false);
  const [precioMsg, setPrecioMsg] = useState('');
  const [reactivacion, setReactivacion] = useState({ activo: false, dias: 45 });
  const [reactBusy, setReactBusy] = useState(false);
  const [reactMsg, setReactMsg] = useState('');
  const [paquetes, setPaquetes] = useState(PAQUETES_DEFAULT);
  const [nuevoPkg, setNuevoPkg] = useState({ nombre: '', familia: 'normal', consultas: '', precio: '', vigenciaMeses: '' });
  const [pkgBusy, setPkgBusy] = useState(false);
  const [pkgMsg, setPkgMsg] = useState('');
  const [cfdi, setCfdi] = useState(CFDI_DEFAULT);
  const [cfdiBusy, setCfdiBusy] = useState(false);
  const [cfdiMsg, setCfdiMsg] = useState('');
  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'dashboard'), snap => {
      const d = (snap && snap.data()) || {};
      setHorario({ ...HORARIO_DEFAULT, ...(d.horario || {}) });
      setExcepciones(d.excepciones || {});
      setPrecios(d.precios || {});
      setServicios(Array.isArray(d.servicios) && d.servicios.length ? d.servicios : SERVICIOS_DEFAULT);
      setReactivacion({ activo: !!(d.reactivacion && d.reactivacion.activo), dias: (d.reactivacion && d.reactivacion.dias) || 45 });
      setPaquetes(Array.isArray(d.paquetes) && d.paquetes.length ? d.paquetes : PAQUETES_DEFAULT);
      setCfdi({ ...CFDI_DEFAULT, ...(d.cfdi || {}) });
    }, () => {});
  }, []);
  const guardarReactivacion = async () => {
    setReactBusy(true); setReactMsg('');
    try {
      const dias = parseInt(reactivacion.dias, 10) || 45;
      await setDoc(doc(db, 'config', 'dashboard'), { reactivacion: { activo: !!reactivacion.activo, dias } }, { merge: true });
      const url = process.env.REACT_APP_APPSCRIPT_URL;
      if (url) {
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'setReactivacion', activo: !!reactivacion.activo, dias }), redirect: 'follow' });
      }
      setReactMsg('Configuración guardada.');
    } catch (e) { setReactMsg('No se pudo guardar: ' + e.message); }
    setReactBusy(false);
  };

  const slug = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'srv';

  const agregarServicio = () => {
    const nombre = (nuevoServ.nombre || '').trim();
    if (!nombre) { setPrecioMsg('Escribe un nombre para el servicio.'); return; }
    if (servicios.some(s => s.nombre.toLowerCase() === nombre.toLowerCase())) { setPrecioMsg('Ya existe un servicio con ese nombre.'); return; }
    const dur = parseInt(nuevoServ.dur, 10) || 30;
    let id = slug(nombre); if (servicios.some(s => s.id === id)) id = id + '_' + Math.random().toString(36).slice(2, 6);
    setServicios(prev => [...prev, { id, nombre, dur, online: !!nuevoServ.online }]);
    const precio = parseFloat(nuevoServ.precio) || 0;
    if (precio) setPrecios(p => ({ ...p, [nombre]: precio }));
    setNuevoServ({ nombre: '', dur: 30, online: false, precio: '' });
    setPrecioMsg('');
  };

  const quitarServicio = (id) => {
    const s = servicios.find(x => x.id === id);
    setServicios(prev => prev.filter(x => x.id !== id));
    if (s) setPrecios(p => { const n = { ...p }; delete n[s.nombre]; return n; });
  };

  const editarServicio = (id, patch) => setServicios(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const guardarServicios = async () => {
    setPrecioBusy(true); setPrecioMsg('');
    try {
      await setDoc(doc(db, 'config', 'dashboard'), { servicios, precios }, { merge: true });
      setPrecioMsg('Servicios y precios guardados.');
    } catch (e) { setPrecioMsg('No se pudo guardar: ' + e.message); }
    setPrecioBusy(false);
  };

  const agregarPaquete = () => {
    const nombre = (nuevoPkg.nombre || '').trim();
    if (!nombre) { setPkgMsg('Escribe un nombre para el paquete.'); return; }
    const consultas = parseInt(nuevoPkg.consultas, 10) || 0;
    if (consultas < 1) { setPkgMsg('El paquete debe tener al menos 1 consulta.'); return; }
    let id = slug(nombre); if (paquetes.some(p => p.id === id)) id = id + '_' + Math.random().toString(36).slice(2, 6);
    setPaquetes(prev => [...prev, {
      id, nombre,
      familia: nuevoPkg.familia === 'deportiva' ? 'deportiva' : 'normal',
      consultas,
      precio: parseFloat(nuevoPkg.precio) || 0,
      vigenciaMeses: parseInt(nuevoPkg.vigenciaMeses, 10) || 6,
    }]);
    setNuevoPkg({ nombre: '', familia: 'normal', consultas: '', precio: '', vigenciaMeses: '' });
    setPkgMsg('');
  };
  const quitarPaquete = (id) => setPaquetes(prev => prev.filter(p => p.id !== id));
  const editarPaquete = (id, patch) => setPaquetes(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  const guardarPaquetes = async () => {
    setPkgBusy(true); setPkgMsg('');
    try {
      await setDoc(doc(db, 'config', 'dashboard'), { paquetes }, { merge: true });
      setPkgMsg('Paquetes guardados.');
    } catch (e) { setPkgMsg('No se pudo guardar: ' + e.message); }
    setPkgBusy(false);
  };
  const setCfdiCampo = (k, v) => setCfdi(c => ({ ...c, [k]: v }));
  const guardarCfdi = async () => {
    setCfdiBusy(true); setCfdiMsg('');
    try {
      await setDoc(doc(db, 'config', 'dashboard'), { cfdi }, { merge: true });
      setCfdiMsg('Datos de facturación guardados.');
    } catch (e) { setCfdiMsg('No se pudo guardar: ' + e.message); }
    setCfdiBusy(false);
  };

  const setDia = (dow, patch) => setHorario(h => ({ ...h, [dow]: { ...(h[dow] || HORARIO_DEFAULT[dow]), ...patch } }));
  // Semanas del mes en que aplica el día ([] = todas).
  const toggleSemana = (dow, n) => setHorario(h => {
    const c = h[dow] || HORARIO_DEFAULT[dow];
    const cur = Array.isArray(c.semanas) ? c.semanas : [];
    const next = cur.includes(n) ? cur.filter(x => x !== n) : [...cur, n].sort((a, b) => a - b);
    return { ...h, [dow]: { ...c, semanas: next } };
  });
  // --- Franjas horarias por día (cada una con su modalidad) ---
  const setFranjas = (dow, franjas) => setHorario(h => ({ ...h, [dow]: { ...(h[dow] || HORARIO_DEFAULT[dow]), franjas } }));
  const setFranja = (dow, i, patch) => {
    const cur = franjasDe(horario[dow] || HORARIO_DEFAULT[dow]);
    setFranjas(dow, cur.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  };
  const addFranja = (dow) => {
    const cur = franjasDe(horario[dow] || HORARIO_DEFAULT[dow]);
    const ult = cur[cur.length - 1];
    setFranjas(dow, [...cur, { ini: (ult && ult.fin) || '15:00', fin: '19:00', mod: 'ambas' }]);
  };
  const delFranja = (dow, i) => {
    const cur = franjasDe(horario[dow] || HORARIO_DEFAULT[dow]);
    if (cur.length <= 1) return; // siempre queda al menos una
    setFranjas(dow, cur.filter((_, k) => k !== i));
  };

  const addExcepcion = (tipo) => {
    if (!excFecha) { setHorMsg('Elige una fecha para la excepción.'); return; }
    setExcepciones(e => ({ ...e, [excFecha]: tipo === 'cerrado' ? 'cerrado' : { franjas: [{ ini: '09:00', fin: '14:00', mod: 'ambas' }] } }));
    setExcFecha(''); setHorMsg('');
  };
  const delExcepcion = (fecha) => setExcepciones(e => { const n = { ...e }; delete n[fecha]; return n; });
  const fmtFecha = (f) => { const [y, m, d] = f.split('-'); return new Date(+y, +m - 1, +d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }); };
  const guardarHorario = async () => {
    const invalido = DIAS_SEMANA.some(([dow]) => {
      const c = horario[dow] || {};
      if (!c.activo) return false;
      const fr = franjasDe(c);
      return !fr.length || fr.some(f => !(f.ini && f.fin && f.ini < f.fin));
    });
    if (invalido) { setHorMsg('Revisa los horarios: en cada franja, la hora de fin debe ser posterior a la de inicio.'); return; }
    setHorBusy(true); setHorMsg('');
    try {
      await setDoc(doc(db, 'config', 'dashboard'), { horario, excepciones }, { merge: true });
      setHorMsg('Horarios y excepciones guardados. Ya se reflejan en la agenda.');
    } catch (e) { setHorMsg('No se pudo guardar: ' + e.message); }
    setHorBusy(false);
  };

  const logoSrc = (logo === undefined) ? '/logo.png' : logo;

  const guardar = async (patch) => {
    setBusy(true); setMsg('');
    try {
      await setDoc(doc(db, 'config', 'branding'), patch, { merge: true });
      setMsg('Guardado ✓');
    } catch (e) { setMsg('No se pudo guardar: ' + e.message); }
    setBusy(false);
  };

  const onFile = async (file) => {
    if (!file || !(file.type || '').startsWith('image/')) { setMsg('Elige un archivo de imagen.'); return; }
    setBusy(true); setMsg('Procesando imagen…');
    try {
      const data = await comprimirLogo(file);
      await guardar({ logo: data });
    } catch (e) { setMsg('No se pudo procesar la imagen.'); setBusy(false); }
  };

  const setColor = (k, v) => {
    const next = { ...colorsLocal, [k]: v };
    setColorsLocal(next);
    aplicarColores(next); // vista previa en vivo
  };

  return (
    <>
      {MULTI_NUTRI && esAdmin && (
        <div className="card" style={{ maxWidth: 760, marginBottom: 18 }}>
          <div className="card-title">Nutriólogas del equipo</div>
          <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 16, lineHeight: 1.5 }}>
            Da de alta a cada nutrióloga y comparte su link. Cada una entra con su propio correo y ve solo sus pacientes. El paciente que abra el link de una nutrióloga queda asignado a ella.
          </div>

          {nutriList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {nutriList.map(p => (
                <div key={p.correo} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)' }}>{p.nombre || '(sin nombre)'}</div>
                      <div style={{ fontSize: 12, color: 'var(--stone)' }}>{p.correo}{p.cedula ? ' · Céd. ' + p.cedula : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={B.ghost} onClick={() => nfEditar(p)}>Editar</button>
                      <button style={{ ...B.ghost, color: 'var(--danger)' }} onClick={() => quitarNutri(p.correo)} disabled={nfBusy}>Quitar</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <input readOnly value={linkNutri(p.slug)} onFocus={e => e.target.select()}
                      style={{ flex: 1, minWidth: 220, fontFamily: 'var(--font)', fontSize: 12, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--cream)', color: 'var(--dark)' }} />
                    <button style={B.primary} onClick={() => copiarLink(p.slug)}>{nfCopiado === p.slug ? '¡Copiado!' : 'Copiar link'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ ...B.label, marginBottom: 10 }}>{nfEdit ? 'Editar nutrióloga' : 'Agregar nutrióloga'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 10 }}>
              <label><span style={B.label}>Nombre</span><input style={B.inp2} value={nfForm.nombre} onChange={e => nfSet('nombre', e.target.value)} placeholder="LN Nombre Apellido" /></label>
              <label><span style={B.label}>Correo (su acceso)</span><input style={{ ...B.inp2, opacity: nfEdit ? 0.6 : 1 }} value={nfForm.correo} onChange={e => nfSet('correo', e.target.value)} placeholder="correo@ejemplo.com" disabled={!!nfEdit} /></label>
              <label><span style={B.label}>Cédula</span><input style={B.inp2} value={nfForm.cedula} onChange={e => nfSet('cedula', e.target.value)} placeholder="Cédula profesional" /></label>
              <label><span style={B.label}>Identificador del link</span><input style={B.inp2} value={nfForm.slug} onChange={e => { setNfSlugTocado(true); nfSet('slug', slugDeNombre(e.target.value)); }} placeholder="ej. yoddam" /></label>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={B.label}>Logo (PDF)</div>
                <div onClick={() => nfLogoRef.current && nfLogoRef.current.click()} style={{ ...B.drop, width: 150, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                  {nfForm.logo ? <img src={nfForm.logo} alt="logo" style={{ maxHeight: 52, maxWidth: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: 'var(--stone)' }}>Subir logo</span>}
                </div>
                <input ref={nfLogoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => nfArchivo(e.target.files && e.target.files[0], 'logo')} />
              </div>
              <div>
                <div style={B.label}>Firma (PDF)</div>
                <div onClick={() => nfFirmaRef.current && nfFirmaRef.current.click()} style={{ ...B.drop, width: 150, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                  {nfForm.firma ? <img src={nfForm.firma} alt="firma" style={{ maxHeight: 52, maxWidth: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: 'var(--stone)' }}>Subir firma</span>}
                </div>
                <input ref={nfFirmaRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => nfArchivo(e.target.files && e.target.files[0], 'firma')} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={B.primary} onClick={guardarNutri} disabled={nfBusy}>{nfBusy ? 'Guardando…' : (nfEdit ? 'Guardar cambios' : 'Agregar nutrióloga')}</button>
              {nfEdit ? <button style={B.ghost} onClick={nfCancelar} disabled={nfBusy}>Cancelar</button> : null}
              {nfMsg ? <span style={{ fontSize: 12.5, color: 'var(--stone)' }}>{nfMsg}</span> : null}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--stone)', marginTop: 10, lineHeight: 1.5 }}>
              El <b>logo</b> y la <b>firma</b> se usarán en los PDF/correos de esa nutrióloga (esa parte se conecta en el motor, en la siguiente fase).
            </div>
          </div>
        </div>
      )}

      {ES_FITMEAL && esAdmin && (
        <div className="card" style={{ maxWidth: 760, marginBottom: 18 }}>
          <div className="card-title">Cobros con MercadoPago</div>
          <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 16, lineHeight: 1.5 }}>
            Conecta tu cuenta de MercadoPago para cobrar consultas y paquetes en línea. El dinero llega
            directo a tu cuenta de MercadoPago. Solo necesitas conectarla una vez.
          </div>

          {mpEstado === null ? (
            <div style={{ fontSize: 13, color: 'var(--stone)' }}>Comprobando conexión…</div>
          ) : mpEstado.conectado ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ ...H.pill, background: '#E8F0EA', color: '#3E6B52' }}>Conectado ✓</span>
              <span style={{ fontSize: 12.5, color: 'var(--stone)' }}>Cuenta MercadoPago #{mpEstado.user_id || '—'}</span>
              <button style={B.ghost} onClick={conectarMp}>Volver a conectar</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ ...H.pill, background: '#FBF4EF', color: 'var(--danger, #B0593F)' }}>Sin conectar</span>
              <button style={B.primary} onClick={conectarMp}>Conectar MercadoPago</button>
            </div>
          )}
          {mpMsg ? <span style={{ fontSize: 12.5, color: 'var(--stone)', display: 'block', marginTop: 12 }}>{mpMsg}</span> : null}
        </div>
      )}

      {temaDisponible && (
        <div className="card" style={{ maxWidth: 760, marginBottom: 18 }}>
          <div className="card-title">Apariencia</div>
          <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 16, lineHeight: 1.5 }}>
            Elige cómo se ven la barra lateral y el encabezado. Tu preferencia se
            guarda en este dispositivo.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12 }}>
            {[
              { id: 'noche', titulo: 'Modo noche', desc: 'Barras oscuras (predeterminado)', bg: '#32363A', chip: '#F5D92C', txt: '#fff' },
              { id: 'dia', titulo: 'Modo día', desc: 'Barras claras, acento magenta', bg: '#FFFFFF', chip: '#BA007C', txt: '#32363A', borde: '#EDE6EF' },
            ].map(opt => {
              const activo = tema === opt.id;
              return (
                <button key={opt.id} type="button" onClick={() => setTema(opt.id)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: 14,
                    background: '#fff', fontFamily: 'var(--font)',
                    border: activo ? '2px solid var(--gold)' : '1px solid var(--border)',
                    boxShadow: activo ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span style={{ width: 30, height: 22, borderRadius: 6, background: opt.bg, border: opt.borde ? `1px solid ${opt.borde}` : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ width: 12, height: 4, borderRadius: 3, background: opt.chip }} />
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)' }}>{opt.titulo}</span>
                    {activo && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Activo</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.4 }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 760 }}>
      <div className="card-title">Configuración de marca</div>
      <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 22, lineHeight: 1.5 }}>
        Personaliza el logo y los colores de este sistema. Los cambios aplican solo a esta instancia.
      </div>

      {/* LOGO */}
      <div style={B.label}>Logo</div>
      <div
        onClick={() => fileRef.current && fileRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
        style={{ ...B.drop, borderColor: drag ? 'var(--gold)' : 'var(--border)' }}>
        {logoSrc
          ? <img src={logoSrc} alt="logo" style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }} />
          : <div style={{ color: 'var(--stone)', fontSize: 13 }}>Carga tu logo aquí · da clic o arrastra una imagen</div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => onFile(e.target.files && e.target.files[0])} />
      <div style={{ display: 'flex', gap: 10, marginTop: 10, marginBottom: 26, flexWrap: 'wrap' }}>
        <button style={B.primary} onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}>
          {logoSrc ? 'Cambiar logo' : 'Subir logo'}
        </button>
        {logoSrc ? <button style={B.ghost} onClick={() => guardar({ logo: '' })} disabled={busy}>Quitar logo</button> : null}
        {(logo === '' ) ? <button style={B.ghost} onClick={() => guardar({ logo: null })} disabled={busy}>Usar logo por defecto</button> : null}
      </div>

      {!BRANDING_LOCKED && (
        <div>
          {/* COLORES */}
          <div style={B.label}>Colores</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 10, marginBottom: 18 }}>
            {COLOR_LABELS.map(([k, label]) => (
              <label key={k} style={B.colorRow}>
                <input type="color" value={colorsLocal[k] || '#000000'}
                  onChange={e => setColor(k, e.target.value)} style={B.colorInput} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={B.primary} onClick={() => guardar({ colors: colorsLocal })} disabled={busy}>Guardar colores</button>
            <button style={B.ghost} onClick={() => { setColorsLocal(DEFAULT_COLORS); aplicarColores(DEFAULT_COLORS); guardar({ colors: DEFAULT_COLORS }); }} disabled={busy}>Restablecer colores</button>
          </div>
        </div>
      )}
      {msg ? <span style={{ fontSize: 12.5, color: 'var(--stone)', display: 'block', marginTop: 10 }}>{msg}</span> : null}
      </div>

      <div className="card" style={{ maxWidth: 760, marginTop: 18 }}>
        <div className="card-title">Horarios de atención</div>
        <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 18, lineHeight: 1.5 }}>
          Define los días y el horario en que atiendes. La agenda solo ofrecerá citas dentro de estos horarios,
          y los días desactivados aparecerán como no disponibles para tus pacientes.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DIAS_SEMANA.map(([dow, nombre]) => {
            const c = horario[dow] || HORARIO_DEFAULT[dow];
            return (
              <div key={dow} style={H.row}>
                <label style={H.dayToggle}>
                  <input type="checkbox" checked={!!c.activo}
                    onChange={e => setDia(dow, { activo: e.target.checked })} />
                  <span style={{ fontWeight: 700, color: c.activo ? 'var(--dark)' : 'var(--stone)' }}>{nombre}</span>
                </label>
                {c.activo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 280 }}>
                    {franjasDe(c).map((f, i) => (
                      <div key={i} style={H.hours}>
                        <span style={H.lbl}>De</span>
                        <input type="time" value={f.ini || '09:00'} style={H.time}
                          onChange={e => setFranja(dow, i, { ini: e.target.value })} />
                        <span style={H.lbl}>a</span>
                        <input type="time" value={f.fin || '18:00'} style={H.time}
                          onChange={e => setFranja(dow, i, { fin: e.target.value })} />
                        <select value={f.mod || 'ambas'} style={{ ...H.time, cursor: 'pointer' }}
                          onChange={e => setFranja(dow, i, { mod: e.target.value })}>
                          {MODALIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        {franjasDe(c).length > 1 && (
                          <button style={H.del} onClick={() => delFranja(dow, i)} title="Quitar franja">×</button>
                        )}
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <button style={H.addFranja} onClick={() => addFranja(dow)}>+ Tiempo</button>
                      <div style={H.hours}>
                        <span style={H.lbl} title="Deja todas sin marcar para atender cada semana">Semanas:</span>
                        {[1, 2, 3, 4, 5].map(n => {
                          const sem = Array.isArray(c.semanas) ? c.semanas : [];
                          const on = sem.includes(n);
                          return (
                            <button key={n} type="button" onClick={() => toggleSemana(dow, n)}
                              title={'Atender el ' + n + 'º ' + nombre.toLowerCase() + ' del mes'}
                              style={{ ...H.week, ...(on ? H.weekOn : {}) }}>{n}º</button>
                          );
                        })}
                        {(!Array.isArray(c.semanas) || !c.semanas.length) && (
                          <span style={{ fontSize: 11.5, color: 'var(--stone)' }}>todas</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 12.5, color: 'var(--stone)' }}>Sin atención</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={B.label}>Excepciones por fecha</div>
          <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 12, lineHeight: 1.5 }}>
            Días puntuales que se salen de tu horario: vacaciones, festivos, o un día extra de atención.
            La excepción tiene prioridad sobre el horario semanal.
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <input type="date" value={excFecha} style={H.time} onChange={e => setExcFecha(e.target.value)} />
            <button style={B.ghost} onClick={() => addExcepcion('cerrado')} disabled={horBusy}>Cerrar este día</button>
            <button style={B.ghost} onClick={() => addExcepcion('abierto')} disabled={horBusy}>Abrir este día</button>
          </div>

          {Object.keys(excepciones).length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--stone)' }}>Sin excepciones registradas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.keys(excepciones).sort().map(f => {
                const v = excepciones[f];
                const cerrado = v === 'cerrado';
                return (
                  <div key={f} style={H.row}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 200 }}>
                      <span style={{ ...H.pill, background: cerrado ? '#F6E7E1' : '#E8F0EA', color: cerrado ? 'var(--danger, #B0593F)' : '#3E6B52' }}>
                        {cerrado ? 'Cerrado' : 'Abierto'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{fmtFecha(f)}</span>
                    </div>
                    {!cerrado && (() => {
                      const fr = franjasDe(v)[0] || { ini: '09:00', fin: '14:00', mod: 'ambas' };
                      const upd = (patch) => setExcepciones(e => ({ ...e, [f]: { franjas: [{ ...fr, ...patch }] } }));
                      return (
                        <div style={H.hours}>
                          <span style={H.lbl}>De</span>
                          <input type="time" value={fr.ini} style={H.time} onChange={e => upd({ ini: e.target.value })} />
                          <span style={H.lbl}>a</span>
                          <input type="time" value={fr.fin} style={H.time} onChange={e => upd({ fin: e.target.value })} />
                          <select value={fr.mod || 'ambas'} style={{ ...H.time, cursor: 'pointer' }} onChange={e => upd({ mod: e.target.value })}>
                            {MODALIDADES.map(([val, l]) => <option key={val} value={val}>{l}</option>)}
                          </select>
                        </div>
                      );
                    })()}
                    <button style={H.del} onClick={() => delExcepcion(f)} title="Quitar excepción">×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <button style={B.primary} onClick={guardarHorario} disabled={horBusy}>
            {horBusy ? 'Guardando…' : 'Guardar horarios'}
          </button>
          <button style={B.ghost} onClick={() => setHorario(HORARIO_DEFAULT)} disabled={horBusy}>Restablecer</button>
        </div>
        {horMsg ? <span style={{ fontSize: 12.5, color: 'var(--stone)', display: 'block', marginTop: 10 }}>{horMsg}</span> : null}
      </div>

      <div className="card" style={{ maxWidth: 760, marginTop: 18 }}>
        <div className="card-title">Servicios y precios</div>
        <p style={{ fontSize: 12.5, color: 'var(--stone)', marginTop: -4, marginBottom: 14 }}>
          Solo visible para ti. Define las consultas que se pueden agendar, su duración y su precio. Se usan en la agenda y en el resumen financiero.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {servicios.map(s => (
            <div key={s.id} style={P.row}>
              <span style={{ flex: '1 1 160px', fontSize: 13.5, fontWeight: 600 }}>{s.nombre}</span>
              <label style={P.field}>
                <input inputMode="numeric" value={s.dur || ''} placeholder="30"
                  onChange={e => editarServicio(s.id, { dur: parseInt(e.target.value, 10) || 0 })} style={P.num} />
                <span style={P.unit}>min</span>
              </label>
              <label style={P.check}>
                <input type="checkbox" checked={!!s.online} onChange={e => editarServicio(s.id, { online: e.target.checked })} />
                En línea
              </label>
              <label style={P.field}>
                <span style={P.unit}>$</span>
                <input inputMode="numeric" value={precios[s.nombre] || ''} placeholder="0"
                  onChange={e => setPrecios(p => ({ ...p, [s.nombre]: parseFloat(e.target.value) || 0 }))} style={P.num} />
              </label>
              <button title="Quitar servicio" style={P.del} onClick={() => quitarServicio(s.id)}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ ...P.row, marginTop: 12, background: 'var(--cream)' }}>
          <input placeholder="Nuevo servicio" value={nuevoServ.nombre}
            onChange={e => setNuevoServ(v => ({ ...v, nombre: e.target.value }))}
            style={{ flex: '1 1 160px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
          <label style={P.field}>
            <input inputMode="numeric" placeholder="30" value={nuevoServ.dur}
              onChange={e => setNuevoServ(v => ({ ...v, dur: e.target.value }))} style={P.num} />
            <span style={P.unit}>min</span>
          </label>
          <label style={P.check}>
            <input type="checkbox" checked={nuevoServ.online} onChange={e => setNuevoServ(v => ({ ...v, online: e.target.checked }))} />
            En línea
          </label>
          <label style={P.field}>
            <span style={P.unit}>$</span>
            <input inputMode="numeric" placeholder="0" value={nuevoServ.precio}
              onChange={e => setNuevoServ(v => ({ ...v, precio: e.target.value }))} style={P.num} />
          </label>
          <button style={B.ghost} onClick={agregarServicio}>Agregar</button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <button style={B.primary} onClick={guardarServicios} disabled={precioBusy}>
            {precioBusy ? 'Guardando…' : 'Guardar servicios'}
          </button>
        </div>
        {precioMsg ? <span style={{ fontSize: 12.5, color: 'var(--stone)', display: 'block', marginTop: 10 }}>{precioMsg}</span> : null}
      </div>

      <div className="card" style={{ maxWidth: 760, marginTop: 18 }}>
        <div className="card-title">Paquetes de consultas</div>
        <p style={{ fontSize: 12.5, color: 'var(--stone)', marginTop: -4, marginBottom: 14 }}>
          Define los paquetes que un paciente puede tener como saldo de consultas. La <b>familia</b> separa el saldo:
          los créditos deportivos solo se gastan en consultas deportivas. La <b>vigencia</b> se cuenta a partir de la primera consulta usada del paquete.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paquetes.map(p => (
            <div key={p.id} style={P.row}>
              <input value={p.nombre} placeholder="Nombre"
                onChange={e => editarPaquete(p.id, { nombre: e.target.value })}
                style={{ flex: '1 1 150px', padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
              <select value={p.familia === 'deportiva' ? 'deportiva' : 'normal'}
                onChange={e => editarPaquete(p.id, { familia: e.target.value })}
                style={{ padding: '7px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)', background: '#fff' }}>
                {FAMILIAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              <label style={P.field}>
                <input inputMode="numeric" value={p.consultas || ''} placeholder="0"
                  onChange={e => editarPaquete(p.id, { consultas: parseInt(e.target.value, 10) || 0 })} style={P.num} />
                <span style={P.unit}>consultas</span>
              </label>
              <label style={P.field}>
                <span style={P.unit}>$</span>
                <input inputMode="numeric" value={p.precio || ''} placeholder="0"
                  onChange={e => editarPaquete(p.id, { precio: parseFloat(e.target.value) || 0 })} style={P.num} />
              </label>
              <label style={P.field}>
                <input inputMode="numeric" value={p.vigenciaMeses || ''} placeholder="6"
                  onChange={e => editarPaquete(p.id, { vigenciaMeses: parseInt(e.target.value, 10) || 0 })} style={{ ...P.num, width: 48 }} />
                <span style={P.unit}>meses vig.</span>
              </label>
              <button title="Quitar paquete" style={P.del} onClick={() => quitarPaquete(p.id)}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ ...P.row, marginTop: 12, background: 'var(--cream)' }}>
          <input placeholder="Nuevo paquete" value={nuevoPkg.nombre}
            onChange={e => setNuevoPkg(v => ({ ...v, nombre: e.target.value }))}
            style={{ flex: '1 1 150px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
          <select value={nuevoPkg.familia} onChange={e => setNuevoPkg(v => ({ ...v, familia: e.target.value }))}
            style={{ padding: '7px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)', background: '#fff' }}>
            {FAMILIAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <label style={P.field}>
            <input inputMode="numeric" placeholder="0" value={nuevoPkg.consultas}
              onChange={e => setNuevoPkg(v => ({ ...v, consultas: e.target.value }))} style={P.num} />
            <span style={P.unit}>consultas</span>
          </label>
          <label style={P.field}>
            <span style={P.unit}>$</span>
            <input inputMode="numeric" placeholder="0" value={nuevoPkg.precio}
              onChange={e => setNuevoPkg(v => ({ ...v, precio: e.target.value }))} style={P.num} />
          </label>
          <label style={P.field}>
            <input inputMode="numeric" placeholder="6" value={nuevoPkg.vigenciaMeses}
              onChange={e => setNuevoPkg(v => ({ ...v, vigenciaMeses: e.target.value }))} style={{ ...P.num, width: 48 }} />
            <span style={P.unit}>meses vig.</span>
          </label>
          <button style={B.ghost} onClick={agregarPaquete}>Agregar</button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <button style={B.primary} onClick={guardarPaquetes} disabled={pkgBusy}>
            {pkgBusy ? 'Guardando…' : 'Guardar paquetes'}
          </button>
        </div>
        {pkgMsg ? <span style={{ fontSize: 12.5, color: 'var(--stone)', display: 'block', marginTop: 10 }}>{pkgMsg}</span> : null}
      </div>

      {FACTURACION_ON && (
      <div className="card" style={{ maxWidth: 760, marginTop: 18 }}>
        <div className="card-title">Facturación (CFDI)</div>
        <p style={{ fontSize: 12.5, color: 'var(--stone)', marginTop: -4, marginBottom: 14 }}>
          Valores por defecto del concepto para las facturas de consultas. Confírmalos con tu contador (clave del SAT, unidad e IVA). El timbrado se conecta con tu proveedor (FEL).
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: cfdi.activo ? '#E9F1ED' : '#FBF4EF', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, maxWidth: 640 }}>
          <input type="checkbox" checked={!!cfdi.activo} onChange={e => setCfdiCampo('activo', e.target.checked)} style={{ marginTop: 3 }} />
          <label style={{ fontSize: 13.5, color: 'var(--dark)', lineHeight: 1.5, cursor: 'pointer' }} onClick={() => setCfdiCampo('activo', !cfdi.activo)}>
            <b>Activar facturación en línea para el paciente</b><br />
            <span style={{ fontSize: 12.5, color: 'var(--stone)' }}>
              Mientras esté <b>apagado</b>, el paciente ve el apartado "Facturación" en su portal pero el botón <b>Facturar</b> queda inhabilitado (modo pruebas). Actívalo cuando el timbrado con FEL ya esté validado.
            </span>
          </label>
        </div>
        {cfdi.activo && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: cfdi.produccion ? '#F7EAE5' : '#F4F1EC', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, maxWidth: 640 }}>
            <input type="checkbox" checked={!!cfdi.produccion} onChange={e => setCfdiCampo('produccion', e.target.checked)} style={{ marginTop: 3 }} />
            <label style={{ fontSize: 13.5, color: 'var(--dark)', lineHeight: 1.5, cursor: 'pointer' }} onClick={() => setCfdiCampo('produccion', !cfdi.produccion)}>
              <b>Emitir facturas REALES (producción)</b><br />
              <span style={{ fontSize: 12.5, color: 'var(--stone)' }}>
                Apagado = ambiente de <b>pruebas</b> (no genera facturas fiscales). Enciéndelo solo cuando ya estén cargadas las credenciales reales de FEL y quieras timbrar de verdad ante el SAT.
              </span>
            </label>
          </div>
        )}
        <div className="form-2up">
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={B.label}>Clave producto/servicio (SAT)</span>
            <input value={cfdi.claveProdServ} onChange={e => setCfdiCampo('claveProdServ', e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
              inputMode="numeric" placeholder="85121800" style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={B.label}>Clave de unidad</span>
            <select value={cfdi.claveUnidad} onChange={e => setCfdiCampo('claveUnidad', e.target.value)}
              style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)', background: '#fff' }}>
              {CLAVES_UNIDAD.map(u => <option key={u.clave} value={u.clave}>{u.nombre}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
            <span style={B.label}>Descripción del concepto</span>
            <input value={cfdi.descripcion} onChange={e => setCfdiCampo('descripcion', e.target.value)}
              placeholder="Consulta de nutrición" style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={B.label}>IVA</span>
            <select value={cfdi.iva} onChange={e => setCfdiCampo('iva', e.target.value)}
              style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)', background: '#fff' }}>
              {OPCIONES_IVA.map(o => <option key={o.clave} value={o.clave}>{o.nombre}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
            <span style={B.label}>Nombre / razón social del emisor (como en el SAT)</span>
            <input value={cfdi.emisorNombre} onChange={e => setCfdiCampo('emisorNombre', e.target.value)}
              placeholder="Nombre o razón social como aparece en el SAT" style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={B.label}>Código postal del emisor (lugar de expedición)</span>
            <input value={cfdi.lugarExpedicion} onChange={e => setCfdiCampo('lugarExpedicion', e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
              inputMode="numeric" placeholder="Código postal (5 dígitos)" style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={B.label}>Precio de la consulta a facturar (MXN)</span>
            <input value={cfdi.precioConsulta} onChange={e => setCfdiCampo('precioConsulta', e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal" placeholder="Ej. 800" style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
            <span style={B.label}>Régimen fiscal del emisor</span>
            <select value={cfdi.regimenEmisor} onChange={e => setCfdiCampo('regimenEmisor', e.target.value)}
              style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)', background: '#fff' }}>
              <option value="">Selecciona…</option>
              {REGIMENES_FISCALES.map(r => <option key={r.clave} value={r.clave}>{r.nombre}</option>)}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', maxWidth: 640 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 600, color: 'var(--dark)', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!cfdi.retencionAplica} onChange={e => setCfdiCampo('retencionAplica', e.target.checked)} />
            Aplicar retenciones (ISR / IVA) por defecto
          </label>
          <p style={{ fontSize: 12, color: 'var(--stone)', margin: '6px 0 12px', lineHeight: 1.5 }}>
            Normalmente solo aplican cuando el receptor es persona moral. Al facturar podrás activarlas o ajustarlas por paciente. Confirma las tasas con tu contador.
          </p>
          {cfdi.retencionAplica && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={B.label}>ISR retenido (%)</span>
                <input value={cfdi.retIsr} onChange={e => setCfdiCampo('retIsr', e.target.value.replace(/[^0-9.]/g, ''))}
                  inputMode="decimal" placeholder="10" style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={B.label}>IVA retenido (%)</span>
                <input value={cfdi.retIva} onChange={e => setCfdiCampo('retIva', e.target.value.replace(/[^0-9.]/g, ''))}
                  inputMode="decimal" placeholder="10.6667" style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
              </label>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <button style={B.primary} onClick={guardarCfdi} disabled={cfdiBusy}>
            {cfdiBusy ? 'Guardando…' : 'Guardar facturación'}
          </button>
        </div>
        {cfdiMsg ? <span style={{ fontSize: 12.5, color: 'var(--stone)', display: 'block', marginTop: 10 }}>{cfdiMsg}</span> : null}
      </div>
      )}

      <div className="card" style={{ maxWidth: 760, marginTop: 18 }}>
        <div className="card-title">Reactivación de pacientes inactivos</div>
        <p style={{ fontSize: 12.5, color: 'var(--stone)', marginTop: -4, marginBottom: 14 }}>
          Envía automáticamente un correo cálido a los pacientes que llevan cierto tiempo sin un plan nuevo, invitándolos a retomar su seguimiento. Se envía una sola vez por periodo de inactividad, y te llega un resumen de a quién se le mandó.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, marginBottom: 14 }}>
          <input type="checkbox" checked={!!reactivacion.activo} onChange={e => setReactivacion(r => ({ ...r, activo: e.target.checked }))} />
          Activar envío automático
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
          Enviar después de
          <input inputMode="numeric" value={reactivacion.dias}
            onChange={e => setReactivacion(r => ({ ...r, dias: e.target.value.replace(/[^0-9]/g, '') }))}
            style={{ width: 64, padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, textAlign: 'right', fontFamily: 'var(--font)' }} />
          días de inactividad
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <button style={B.primary} onClick={guardarReactivacion} disabled={reactBusy}>
            {reactBusy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        {reactMsg ? <span style={{ fontSize: 12.5, color: 'var(--stone)', display: 'block', marginTop: 10 }}>{reactMsg}</span> : null}
      </div>
    </>
  );
}

const P = {
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card)', flexWrap: 'wrap' },
  field: { display: 'flex', alignItems: 'center', gap: 4 },
  num: { width: 64, padding: '7px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, textAlign: 'right', fontFamily: 'var(--font)' },
  unit: { fontSize: 12.5, color: 'var(--stone)' },
  check: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--stone)', cursor: 'pointer' },
  del: { background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, padding: '4px 6px' },
};

const H = {
  row: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card)' },
  dayToggle: { display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, cursor: 'pointer', minWidth: 130, paddingTop: 6 },
  hours: { display: 'flex', alignItems: 'center', gap: 8 },
  lbl: { fontSize: 12.5, color: 'var(--stone)' },
  time: { border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff' },
  week: { width: 30, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: '#fff', color: 'var(--stone)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
  weekOn: { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' },
  pill: { fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 20, letterSpacing: 0.3 },
  del: { background: 'transparent', border: 'none', color: 'var(--stone)', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '0 4px' },
  addFranja: { background: '#fff', color: 'var(--gold)', border: '1px dashed var(--gold)', borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
};

const B = {
  label: { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 },
  drop: { border: '1.5px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: 'var(--cream)' },
  primary: { background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' },
  ghost: { background: '#fff', color: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' },
  inp2: { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 10px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', marginTop: 4, background: '#fff' },
  colorRow: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--dark)' },
  colorInput: { width: 44, height: 34, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer', padding: 2 },
};
