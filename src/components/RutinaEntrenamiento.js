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
const ENFOQUES = [['completo', 'Cuerpo completo'], ['superior', 'Tren superior'], ['inferior', 'Tren inferior']];
const enfoqueLabel = (v) => { const f = ENFOQUES.find(x => x[0] === v); return f ? f[1] : 'Cuerpo completo'; };

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

/* HTML de la rutina para el PDF que se envía por correo (texto claro, legible para todos). */
function buildRutinaHTML(rutina, patient, form) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dias = (rutina && rutina.dias) ? rutina.dias : [];
  const diasHTML = dias.map(d => (
    '<div style="margin:0 0 18px;">'
    + '<div style="background:#1a1612;color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;font-weight:700;font-size:15px;">'
    + esc(d.dia) + ' <span style="color:#CDA788;font-weight:600;font-size:13px;float:right;">' + esc(d.foco) + '</span></div>'
    + '<table style="width:100%;border-collapse:collapse;border:1px solid #e8ddd4;border-top:none;">'
    + (d.ejercicios || []).map((e, i) => (
        '<tr style="background:' + (i % 2 ? '#faf6f1' : '#fff') + ';">'
        + '<td style="padding:8px 12px;border-bottom:1px solid #eee;">'
        + '<div style="font-weight:700;font-size:14px;color:#1a1612;">' + esc(e.nombre) + '</div>'
        + '<div style="font-size:13px;color:#978C87;margin-top:2px;"><b>' + esc(e.series) + ' series × ' + esc(e.reps) + '</b>'
        + (e.descanso ? ' · descanso ' + esc(e.descanso) : '') + '</div>'
        + (e.cue ? '<div style="font-size:12px;color:#55504b;margin-top:3px;">' + esc(e.cue) + '</div>' : '')
        + '</td></tr>'
      )).join('')
    + '</table></div>'
  )).join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
    + '<body style="font-family:Arial,Helvetica,sans-serif;color:#1a1612;max-width:700px;margin:0 auto;padding:24px;">'
    + '<h1 style="font-size:22px;margin:0 0 4px;">Rutina de entrenamiento</h1>'
    + '<div style="color:#978C87;font-size:14px;margin-bottom:4px;">' + esc(patient && patient.nombre || '') + '</div>'
    + '<div style="color:#978C87;font-size:13px;margin-bottom:18px;">'
    + esc(form.objetivo) + ' · ' + esc(form.nivel) + ' · ' + esc(form.dias) + ' días/semana · ' + esc(enfoqueLabel(form.enfoque)) + '</div>'
    + diasHTML
    + '<div style="margin-top:18px;font-size:11px;color:#aaa;">Generada por tu nutrióloga. Ejecuta cada ejercicio con buena técnica; ante cualquier duda, consúltala.</div>'
    + '</body></html>';
}

export default function RutinaEntrenamiento({ patient, onBack, onGuardChange }) {
  const [status, setStatus] = useState('cargando');  // cargando | listo
  const [rutina, setRutina] = useState(null);         // { dias:[...] }
  const [estado, setEstado] = useState('');           // '' | borrador | aprobada
  const [form, setForm] = useState({ objetivo: '', nivel: 'Intermedio', dias: '4', enfoque: 'completo' });
  const [genBusy, setGenBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmRegen, setConfirmRegen] = useState(false);  // ventana propia (no window.confirm) al regenerar
  const [cat, setCat] = useState(null);               // catálogo [{id,nombre,musculo,equipo,imgs}]
  const [picker, setPicker] = useState(null);         // { modo:'swap'|'add', di, ei?, musculo, q }
  const [editSheet, setEditSheet] = useState(null);   // { di, ei }
  const [historial, setHistorial] = useState([]);     // rutinas aprobadas anteriores
  const [verHist, setVerHist] = useState(null);       // snapshot de historial abierto (solo lectura)
  const [registros, setRegistros] = useState({});     // registro del paciente (lo que levantó), solo lectura
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
          enfoque: d.enfoque || 'completo',
        });
        setHistorial(Array.isArray(d.historial) ? d.historial : []);
        cargadoRef.current = true;
        setStatus('listo');
      }
    }, () => setStatus('listo'));
    return unsub;
  }, [patient]);

  // Registro del paciente (lo que ha levantado), para mostrarlo en la edición.
  useEffect(() => {
    if (!patient || !patient.id) return undefined;
    return onSnapshot(doc(db, 'registrosRutina', patient.id), snap => {
      const d = snap.exists() ? snap.data() : {};
      setRegistros(d.porEjercicio || {});
    }, () => setRegistros({}));
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
  const generar = () => {
    if (!form.objetivo) { setMsg('Elige un objetivo primero.'); return; }
    if (!process.env.REACT_APP_APPSCRIPT_URL) { setMsg('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    if (rutina && estado) { setConfirmRegen(true); return; }  // confirma con ventana propia antes de reemplazar
    ejecutarGeneracion();
  };
  const ejecutarGeneracion = async () => {
    setConfirmRegen(false);
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    setGenBusy(true); setMsg('Generando rutina con IA… (puede tardar unos segundos)');
    try {
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'generarRutina', objetivo: form.objetivo, nivel: form.nivel, dias: Number(form.dias), enfoque: form.enfoque }),
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
      // Al APROBAR, se guarda una copia en el historial (lista de rutinas, como los menús).
      let hist = historial;
      if (est === 'aprobada') {
        const snap = { rutina, objetivo: form.objetivo, nivel: form.nivel, dias: Number(form.dias), enfoque: form.enfoque, fecha: Date.now() };
        hist = [snap, ...historial].slice(0, 12);
      }
      await setDoc(doc(db, 'rutinas', patient.id), {
        rutina, estado: est,
        objetivo: form.objetivo, nivel: form.nivel, dias: Number(form.dias), enfoque: form.enfoque,
        historial: hist,
        correo: (patient.correo || ''),   // para la regla de Firestore (el paciente lee solo la suya)
        actualizado: Date.now(),
        ...selloDueno(patient && patient.nutriDueno),
      });
      setHistorial(hist);
      setEstado(est);
      dirtyRef.current = false;
      if (est === 'aprobada') {
        setMsg('Rutina aprobada ✓ — visible para el paciente. Enviando por correo…');
        enviarCorreoRutina();  // envío automático del PDF al aprobar
      } else {
        setMsg('Cambios guardados.');
      }
    } catch (e) {
      setMsg('No se pudo guardar: ' + (e && e.message ? e.message : 'error'));
    }
  };

  // ---- Envío automático de la rutina por correo (PDF), al aprobar ----
  const enviarCorreoRutina = async () => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    const correo = (patient.correo || '').trim();
    if (!url || !correo) { setMsg('Rutina aprobada ✓ — visible para el paciente. (Sin correo del paciente para enviar el PDF.)'); return; }
    try {
      const html = buildRutinaHTML(rutina, patient, form, catById.current);
      const filename = 'Rutina de entrenamiento ' + String(patient.nombre || 'paciente').trim() + '.pdf';
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'enviarRutina', patient: patient.nombre, correo, filename, html }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false }; }
      setMsg(data.ok && data.enviado
        ? 'Rutina aprobada ✓ y enviada por correo al paciente.'
        : 'Rutina aprobada ✓ (el correo no se pudo enviar; revisa el correo del paciente).');
    } catch (e) {
      setMsg('Rutina aprobada ✓ (el correo no se pudo enviar).');
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
          <Field label="Enfoque">
            <select style={S.input} value={form.enfoque} onChange={e => setForm(f => ({ ...f, enfoque: e.target.value }))}>
              {ENFOQUES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
        <button style={S.genBtn} onClick={generar} disabled={genBusy}>
          {genBusy ? 'Generando…' : (rutina ? '↻ Nueva rutina con IA' : '⚡ Generar rutina con IA')}
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
                  <button style={S.delX} title="Quitar ejercicio" onClick={() => quitarEj(di, ei)}>✕</button>
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

      {/* Historial de rutinas (como la lista de menús) */}
      {historial.length > 0 && (
        <div style={{ ...S.card, marginTop: 14 }}>
          <div style={S.secTitle}>Historial de rutinas</div>
          {historial.map((h, i) => (
            <div key={i} style={S.histRow} onClick={() => setVerHist(h)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.ejName}>{(h.objetivo || 'Rutina')} · {enfoqueLabel(h.enfoque)}</div>
                <div style={S.ejSub}>{h.nivel} · {h.dias} días · {h.fecha ? new Date(h.fecha).toLocaleDateString('es-MX') : ''}</div>
              </div>
              <span style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 700 }}>Ver ▸</span>
            </div>
          ))}
        </div>
      )}

      {msg && <div style={{ fontSize: 12.5, color: 'var(--stone)', marginTop: 12 }}>{msg}</div>}
      <button style={{ ...S.back, marginTop: 18 }} onClick={() => requestExit(onBack)}>← Atrás</button>

      {/* Hoja de edición de un ejercicio */}
      {editSheet && (() => {
        const e = rutina.dias[editSheet.di].ejercicios[editSheet.ei];
        if (!e) return null;
        return (
          <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={ev => { if (ev.target === ev.currentTarget) setEditSheet(null); }}>
            <div className="modal" style={{ maxWidth: 520 }}>
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
              {registros[e.id] && registros[e.id].length > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={S.label}>Registro del paciente (lo que ha levantado)</div>
                  {registros[e.id].slice(0, 6).map((ses, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--dark)', padding: '4px 0', borderBottom: '0.5px solid var(--border)' }}>
                      <b>{ses.fecha}</b> — {(ses.series || []).map(x => (x.peso || '–') + ' kg × ' + (x.reps || '–')).join('  ·  ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Buscador del catálogo (cambiar / agregar) */}
      {picker && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={ev => { if (ev.target === ev.currentTarget) setPicker(null); }}>
          <div className="modal" style={{ maxWidth: 520 }}>
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

      {/* Ver una rutina del historial (solo lectura) */}
      {verHist && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={ev => { if (ev.target === ev.currentTarget) setVerHist(null); }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div style={S.sheetTop}>
              <b style={{ fontSize: 15 }}>{(verHist.objetivo || 'Rutina')} · {enfoqueLabel(verHist.enfoque)}</b>
              <span style={S.close} onClick={() => setVerHist(null)}>✕</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 10 }}>{verHist.nivel} · {verHist.dias} días · {verHist.fecha ? new Date(verHist.fecha).toLocaleDateString('es-MX') : ''}</div>
            {((verHist.rutina && verHist.rutina.dias) ? verHist.rutina.dias : []).map((d, di) => (
              <div key={di} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{d.dia} <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 12 }}>{d.foco}</span></div>
                {(d.ejercicios || []).map((e, ei) => (
                  <div key={ei} style={{ fontSize: 12.5, color: 'var(--dark)', padding: '4px 0', borderBottom: '0.5px solid var(--border)' }}>
                    {e.nombre} — {e.series} × {e.reps}{e.descanso ? ' · ' + e.descanso : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmación de regenerar (ventana propia con el formato de la instancia, no window.confirm) */}
      {confirmRegen && (
        <div className="modal-overlay" style={{ zIndex: 2100 }} onClick={ev => { if (ev.target === ev.currentTarget) setConfirmRegen(false); }}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>Nueva rutina</div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--dark)', margin: '0 0 16px' }}>Se generará una rutina nueva en lugar de la actual. Las rutinas aprobadas anteriores se conservan en el historial. ¿Continuar?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...S.saveBtn, flex: 1 }} onClick={() => setConfirmRegen(false)}>Cancelar</button>
              <button style={{ ...S.genBtn, flex: 1, marginTop: 0 }} onClick={ejecutarGeneracion}>Sí, regenerar</button>
            </div>
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
  delX: { background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 16, fontWeight: 700, cursor: 'pointer', padding: 6, lineHeight: 1 },
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
  histRow: { display: 'flex', gap: 10, alignItems: 'center', padding: '10px 2px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' },
};
