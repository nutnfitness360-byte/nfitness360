import React, { useState, useRef, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { HORARIO_DEFAULT, MODALIDADES, franjasDe, SERVICIOS_DEFAULT } from './Agenda';
import { useBranding, DEFAULT_COLORS, aplicarColores } from '../context/BrandingContext';

// Bloqueo de marca por instancia (definido aquí para no depender de otro archivo):
// si REACT_APP_BRANDING_LOCKED === 'true', no se muestra el editor de colores.
const BRANDING_LOCKED = String(process.env.REACT_APP_BRANDING_LOCKED || '').toLowerCase() === 'true';

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
  const [colorsLocal, setColorsLocal] = useState(colors);
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
  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'dashboard'), snap => {
      const d = (snap && snap.data()) || {};
      setHorario({ ...HORARIO_DEFAULT, ...(d.horario || {}) });
      setExcepciones(d.excepciones || {});
      setPrecios(d.precios || {});
      setServicios(Array.isArray(d.servicios) && d.servicios.length ? d.servicios : SERVICIOS_DEFAULT);
    }, () => {});
  }, []);
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
  colorRow: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--dark)' },
  colorInput: { width: 44, height: 34, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer', padding: 2 },
};
