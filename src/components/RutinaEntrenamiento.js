import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { selloDueno } from '../utils/multiTenant';

/* ============================================================
   NFITNESS 360 — Rutina de entrenamiento (gimnasio) con IA
   Sección NUEVA e independiente del "Plan deportivo" (competencias).
   Flujo: la nutrióloga genera un borrador con IA (objetivo + nivel + días),
   lo revisa/edita/aprueba, y el paciente lo ve en su app con la animación.
   La rutina vive en su propia colección 'rutinas/{pacienteId}'.
   El banco de imágenes se carga de /catalogo_ejercicios.json (public/).
   ============================================================ */

const NIVELES = ['Principiante', 'Intermedio', 'Avanzado'];
const OBJETIVOS = ['Ganancia muscular', 'Fuerza', 'Baja de grasa', 'Resistencia', 'Salud general'];
const DIAS_OPC = ['2', '3', '4', '5', '6'];

/* Animación: alterna las 2 fotos del ejercicio (1.8 s por imagen, fundido 0.5 s). */
function Anim({ imgs, size = 52 }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (!imgs || imgs.length < 2) return undefined;
    const t = setInterval(() => setF(x => (x ? 0 : 1)), 1800);
    return () => clearInterval(t);
  }, [imgs]);
  const a = imgs && imgs[0];
  const b = imgs && (imgs[1] || imgs[0]);
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: 9, overflow: 'hidden', background: '#f3ece3', flexShrink: 0 }}>
      {b && <img src={b} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      {a && <img src={a} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: f ? 0 : 1, transition: 'opacity 0.5s ease-in-out' }} />}
    </div>
  );
}

export default function RutinaEntrenamiento({ patient, onBack, onGuardChange }) {
  const [status, setStatus] = useState('cargando');  // cargando | listo
  const [rutina, setRutina] = useState(null);         // { dias:[...] }
  const [estado, setEstado] = useState('');           // '' | borrador | aprobada
  const [form, setForm] = useState({ objetivo: '', nivel: 'Intermedio', dias: '4' });
  const [genBusy, setGenBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [cat, setCat] = useState(null);               // catálogo [{id,nombre,musculo,equipo,imgs}]
  const [picker, setPicker] = useState(null);         // { modo:'swap'|'add', di, ei?, musculo, q }
  const [editSheet, setEditSheet] = useState(null);   // { di, ei }
  const cargadoRef = useRef(false);
  const dirtyRef = useRef(false);

  // Mapas del catálogo (id -> entrada) para resolver imágenes.
  const catById = useRef({});

  // Carga del catálogo de ejercicios (una vez).
  useEffect(() => {
    let vivo = true;
    fetch('/catalogo_ejercicios.json')
      .then(r => r.json())
      .then(arr => {
        if (!vivo) return;
        setCat(arr);
        const m = {};
        arr.forEach(e => { m[e.id] = e; });
        catById.current = m;
      })
      .catch(() => { if (vivo) setCat([]); });
    return () => { vivo = false; };
  }, []);

  // Carga inicial desde Firestore.
  useEffect(() => {
    if (!patient || !patient.id) return undefined;
    const unsub = onSnapshot(doc(db, 'rutinas', patient.id), snap => {
      if (!cargadoRef.current) {
        const d = snap.exists() ? snap.data() : {};
        setRutina(d.rutina && Array.isArray(d.rutina.dias) ? d.rutina : null);
        setEstado(d.estado || '');
        setForm({
          objetivo: d.objetivo || (patient.objetivo || ''),
          nivel: d.nivel || 'Intermedio',
          dias: String(d.dias || '4'),
        });
        cargadoRef.current = true;
        setStatus('listo');
      }
    }, () => setStatus('listo'));
    return unsub;
  }, [patient]);

  const marcarSucio = () => { dirtyRef.current = true; };

  // Aviso de salida con cambios sin guardar (igual que PlanDeportivo).
  const requestExit = useCallback((proceed) => {
    const salir = typeof proceed === 'function' ? proceed : () => {};
    if (dirtyRef.current) {
      if (window.confirm('Tienes cambios sin guardar en la rutina. ¿Salir de todos modos?')) salir();
    } else { salir(); }
  }, []);
  useEffect(() => {
    if (onGuardChange) onGuardChange(requestExit);
    return () => { if (onGuardChange) onGuardChange(null); };
  }, [onGuardChange, requestExit]);

  const imgsDe = (id) => (catById.current[id] ? catById.current[id].imgs : null);

  // ---- Generación con IA (motor: action generarRutina) ----
  const generar = async () => {
    if (!form.objetivo) { setMsg('Elige un objetivo primero.'); return; }
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setMsg('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    if (rutina && estado && !window.confirm('Esto reemplazará la rutina actual por un borrador nuevo. ¿Continuar?')) return;
    setGenBusy(true); setMsg('Generando rutina con IA… (puede tardar unos segundos)');
    try {
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'generarRutina', objetivo: form.objetivo, nivel: form.nivel, dias: Number(form.dias) }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (data.ok && data.rutina && Array.isArray(data.rutina.dias)) {
        setRutina(data.rutina);
        setEstado('borrador');
        setMsg('Borrador generado por IA. Revísalo, ajústalo y apruébalo.');
        marcarSucio();
      } else {
        setMsg('No se pudo generar: ' + (data.error || 'error del servidor.'));
      }
    } catch (e) {
      setMsg('No se pudo generar: ' + (e && e.message ? e.message : 'error'));
    } finally {
      setGenBusy(false);
    }
  };

  // ---- Edición del borrador ----
  const setEj = (di, ei, patch) => {
    setRutina(r => {
      const dias = r.dias.map((d, k) => {
        if (k !== di) return d;
        const ejercicios = d.ejercicios.map((e, m) => (m === ei ? { ...e, ...patch } : e));
        return { ...d, ejercicios };
      });
      return { ...r, dias };
    });
    marcarSucio();
    if (estado === 'aprobada') setEstado('borrador'); // un cambio vuelve a borrador hasta re-aprobar
  };
  const quitarEj = (di, ei) => {
    setRutina(r => {
      const dias = r.dias.map((d, k) => (k === di ? { ...d, ejercicios: d.ejercicios.filter((_, m) => m !== ei) } : d));
      return { ...r, dias };
    });
    marcarSucio();
    if (estado === 'aprobada') setEstado('borrador');
    setEditSheet(null);
  };
  const swapEj = (di, ei, c) => {
    setEj(di, ei, { id: c.id, nombre: c.nombre, musculo: c.musculo, cue: '' });
    setPicker(null); setEditSheet(null);
  };
  const addEj = (di, c) => {
    setRutina(r => {
      const dias = r.dias.map((d, k) => (k === di
        ? { ...d, ejercicios: [...d.ejercicios, { id: c.id, nombre: c.nombre, musculo: c.musculo, series: 3, reps: '10-12', descanso: '60 s', cue: '' }] }
        : d));
      return { ...r, dias };
    });
    marcarSucio();
    if (estado === 'aprobada') setEstado('borrador');
    setPicker(null);
  };

  // ---- Guardar / aprobar ----
  const guardar = async (nuevoEstado) => {
    if (!rutina) return;
    setMsg(nuevoEstado === 'aprobada' ? 'Aprobando…' : 'Guardando…');
    try {
      const est = nuevoEstado || estado || 'borrador';
      await setDoc(doc(db, 'rutinas', patient.id), {
        rutina, estado: est,
        objetivo: form.objetivo, nivel: form.nivel, dias: Number(form.dias),
        actualizado: Date.now(),
        ...selloDueno(patient && patient.nutriDueno),
      });
      setEstado(est);
      dirtyRef.current = false;
      setMsg(est === 'aprobada' ? 'Rutina aprobada ✓ — ya es visible para el paciente.' : 'Cambios guardados.');
    } catch (e) {
      setMsg('No se pudo guardar: ' + (e && e.message ? e.message : 'error'));
    }
  };

  if (status === 'cargando') {
    return <div style={S.wrap}><div style={S.note}>Cargando rutina…</div></div>;
  }

  const catMusculos = cat ? Array.from(new Set(cat.map(c => c.musculo))).filter(Boolean).sort() : [];

  return (
    <div style={S.wrap}>
      <button style={S.back} onClick={() => requestExit(onBack)}>← {patient.nombre || 'Atrás'}</button>
      <div style={S.eyebrow}>RUTINA DE ENTRENAMIENTO</div>
      <h2 style={S.h2}>Gimnasio · generada con IA</h2>
      <div style={S.note}>La IA arma un borrador según el objetivo, el nivel y los días. Revísalo, ajústalo y apruébalo: el paciente solo ve la rutina una vez aprobada.</div>

      {/* 1 · Parámetros + generar */}
      <div style={S.card}>
        <div style={S.secTitle}>Parámetros</div>
        <div style={S.grid}>
          <Field label="Objetivo">
            <select style={S.input} value={form.objetivo} onChange={e => { setForm(f => ({ ...f, objetivo: e.target.value })); }}>
              <option value="">— Elegir —</option>
              {OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Nivel">
            <select style={S.input} value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}>
              {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Días por semana">
            <select style={S.input} value={form.dias} onChange={e => setForm(f => ({ ...f, dias: e.target.value }))}>
              {DIAS_OPC.map(d => <option key={d} value={d}>{d} días</option>)}
            </select>
          </Field>
        </div>
        <button style={S.genBtn} onClick={generar} disabled={genBusy}>
          {genBusy ? 'Generando…' : (rutina ? '↻ Regenerar con IA' : '⚡ Generar rutina con IA')}
        </button>
      </div>

      {/* 2 · Borrador / rutina */}
      {rutina && rutina.dias && (
        <>
          <div style={estado === 'aprobada' ? S.bannerOk : S.banner}>
            {estado === 'aprobada'
              ? '✓ Rutina aprobada — visible para el paciente.'
              : '✨ Borrador generado por IA. Edita (✏️) o agrega/quita ejercicios y, cuando esté listo, apruébalo. El paciente aún no la ve.'}
          </div>

          {rutina.dias.map((d, di) => (
            <div key={di} style={S.card}>
              <div style={S.dayHead}>
                <div style={S.dayName}>{d.dia || ('Día ' + (di + 1))}</div>
                <div style={S.dayFoco}>{d.foco || ''}</div>
              </div>
              {(d.ejercicios || []).map((e, ei) => (
                <div key={ei} style={S.ej}>
                  <Anim imgs={imgsDe(e.id)} />
                  <div style={S.ejInfo}>
                    <div style={S.ejName}>{e.nombre}</div>
                    <div style={S.ejSub}>{e.series} series × {e.reps}{e.descanso ? ' · ' + e.descanso + ' desc.' : ''}</div>
                  </div>
                  <button style={S.editBtn} title="Editar" onClick={() => setEditSheet({ di, ei })}>✏️</button>
                </div>
              ))}
              <button style={S.addChip} onClick={() => setPicker({ modo: 'add', di, musculo: (d.ejercicios && d.ejercicios[0] ? d.ejercicios[0].musculo : (catMusculos[0] || '')), q: '' })}>＋ Agregar ejercicio</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            {estado !== 'aprobada' && <button style={S.okBtn} onClick={() => guardar('aprobada')}>✓ Aprobar y enviar al paciente</button>}
            <button style={S.saveBtn} onClick={() => guardar()}>Guardar cambios</button>
          </div>
        </>
      )}

      {msg && <div style={{ fontSize: 12.5, color: 'var(--stone)', marginTop: 12 }}>{msg}</div>}
      <button style={{ ...S.back, marginTop: 18 }} onClick={() => requestExit(onBack)}>← Atrás</button>

      {/* Hoja de edición de un ejercicio */}
      {editSheet && (() => {
        const e = rutina.dias[editSheet.di].ejercicios[editSheet.ei];
        if (!e) return null;
        return (
          <div style={S.overlay} onClick={ev => { if (ev.target === ev.currentTarget) setEditSheet(null); }}>
            <div style={S.sheet}>
              <div style={S.sheetTop}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Anim imgs={imgsDe(e.id)} size={46} /><b style={{ fontSize: 15 }}>{e.nombre}</b></div>
                <span style={S.close} onClick={() => setEditSheet(null)}>✕</span>
              </div>
              <Field label="Nombre"><input style={S.input} value={e.nombre} onChange={ev => setEj(editSheet.di, editSheet.ei, { nombre: ev.target.value })} /></Field>
              <div style={S.grid3}>
                <Field label="Series"><input style={S.input} value={e.series} onChange={ev => setEj(editSheet.di, editSheet.ei, { series: ev.target.value })} /></Field>
                <Field label="Reps"><input style={S.input} value={e.reps} onChange={ev => setEj(editSheet.di, editSheet.ei, { reps: ev.target.value })} /></Field>
                <Field label="Descanso"><input style={S.input} value={e.descanso} onChange={ev => setEj(editSheet.di, editSheet.ei, { descanso: ev.target.value })} /></Field>
              </div>
              <Field label="Indicación (cómo hacerlo)" full><textarea style={S.area} rows={2} value={e.cue || ''} onChange={ev => setEj(editSheet.di, editSheet.ei, { cue: ev.target.value })} /></Field>
              <button style={S.swapBtn} onClick={() => { setPicker({ modo: 'swap', di: editSheet.di, ei: editSheet.ei, musculo: e.musculo || (catMusculos[0] || ''), q: '' }); }}>🔁 Cambiar ejercicio</button>
              <button style={S.delBtn} onClick={() => quitarEj(editSheet.di, editSheet.ei)}>🗑️ Quitar ejercicio</button>
            </div>
          </div>
        );
      })()}

      {/* Buscador del catálogo (cambiar / agregar) */}
      {picker && (
        <div style={S.overlay} onClick={ev => { if (ev.target === ev.currentTarget) setPicker(null); }}>
          <div style={S.sheet}>
            <div style={S.sheetTop}>
              <b style={{ fontSize: 15 }}>{picker.modo === 'swap' ? 'Cambiar ejercicio' : 'Agregar ejercicio'}</b>
              <span style={S.close} onClick={() => setPicker(null)}>✕</span>
            </div>
            {!cat ? <div style={S.note}>Cargando catálogo…</div> : (
              <>
                <div style={S.grid}>
                  <Field label="Músculo">
                    <select style={S.input} value={picker.musculo} onChange={e => setPicker(p => ({ ...p, musculo: e.target.value }))}>
                      {catMusculos.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Buscar">
                    <input style={S.input} value={picker.q} onChange={e => setPicker(p => ({ ...p, q: e.target.value }))} placeholder="Nombre…" />
                  </Field>
                </div>
                <div style={{ maxHeight: '48vh', overflowY: 'auto', marginTop: 8 }}>
                  {cat
                    .filter(c => (!picker.musculo || c.musculo === picker.musculo) && (!picker.q || c.nombre.toLowerCase().includes(picker.q.toLowerCase())))
                    .slice(0, 80)
                    .map(c => (
                      <div key={c.id} style={S.pickRow} onClick={() => (picker.modo === 'swap' ? swapEj(picker.di, picker.ei, c) : addEj(picker.di, c))}>
                        <Anim imgs={c.imgs} size={44} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={S.ejName}>{c.nombre}</div>
                          <div style={S.ejSub}>{c.musculo} · {c.equipo}</div>
                        </div>
                      </div>
                    ))}
                </div>
                <div style={{ ...S.note, marginTop: 6 }}>Nombres del catálogo en inglés; al elegirlo puedes renombrarlo en español desde la edición.</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={S.label}>{label}</div>
      {children}
    </div>
  );
}

const S = {
  wrap: { maxWidth: 900, margin: '0 auto', padding: '4px 2px 40px', fontFamily: 'var(--font)' },
  back: { background: '#fff', border: '0.5px solid var(--border)', color: 'var(--dark)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 14px', borderRadius: 8, marginBottom: 14 },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, color: 'var(--gold)', fontWeight: 700 },
  h2: { fontSize: 24, fontWeight: 700, color: 'var(--dark)', margin: '2px 0 6px' },
  note: { fontSize: 12, color: 'var(--stone)', marginBottom: 16, lineHeight: 1.5 },
  card: { background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '16px 16px', marginBottom: 14 },
  secTitle: { fontSize: 11, letterSpacing: 1, color: 'var(--gold)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 4 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  label: { fontSize: 11, color: 'var(--stone)', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--dark)', fontFamily: 'inherit', boxSizing: 'border-box' },
  area: { width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--dark)', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' },
  genBtn: { width: '100%', background: 'var(--gold)', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 10 },
  banner: { background: 'rgba(205,167,136,0.16)', border: '1px solid var(--gold)', borderRadius: 11, padding: '10px 12px', fontSize: 12.5, color: '#6b4a28', marginBottom: 12, lineHeight: 1.5 },
  bannerOk: { background: 'rgba(154,185,173,0.18)', border: '1px solid var(--sage)', borderRadius: 11, padding: '10px 12px', fontSize: 12.5, color: '#2d6b5e', marginBottom: 12, fontWeight: 600 },
  dayHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, paddingBottom: 8, borderBottom: '0.5px solid var(--border)' },
  dayName: { fontSize: 15, fontWeight: 800, color: 'var(--dark)' },
  dayFoco: { fontSize: 12, fontWeight: 700, color: 'var(--gold)' },
  ej: { display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)' },
  ejInfo: { flex: 1, minWidth: 0 },
  ejName: { fontSize: 13, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2 },
  ejSub: { fontSize: 11.5, color: 'var(--stone)', marginTop: 2 },
  editBtn: { background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 17, cursor: 'pointer', padding: 6 },
  addChip: { background: '#fff', border: '1px dashed var(--gold)', color: 'var(--gold)', borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 10 },
  okBtn: { background: 'var(--sage)', color: '#173b32', border: 'none', padding: '11px 20px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font)' },
  saveBtn: { background: '#fff', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '11px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000, padding: 0 },
  sheet: { background: 'var(--cream, #EEE4DA)', borderRadius: '18px 18px 0 0', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: 16 },
  sheetTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  close: { fontSize: 22, color: 'var(--stone)', cursor: 'pointer', lineHeight: 1 },
  swapBtn: { width: '100%', background: '#fff', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '11px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 10 },
  delBtn: { width: '100%', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '11px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 8 },
  pickRow: { display: 'flex', gap: 10, alignItems: 'center', padding: '8px', border: '0.5px solid var(--border)', borderRadius: 11, marginBottom: 7, cursor: 'pointer', background: '#fff' },
};
