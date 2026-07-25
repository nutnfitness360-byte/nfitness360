import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { buildDeportivoHTML } from '../report/deportivoHTML';

/* ============================================================
   NFITNESS 360 — Plan deportivo (alto rendimiento)
   Etapa 1: captura + carga de imágenes por estación + guardado.
   El plan vive en su propia colección 'deportivo/{pacienteId}' para
   no inflar el expediente del paciente con las imágenes.
   La generación del PDF con el diseño de línea de tiempo va en Etapa 2.
   ============================================================ */

const MODALIDADES = ['Maratón', 'Medio maratón', '10K', '15K', '21K', 'Hyrox', 'Triatlón', 'Trail', 'Otro'];
const SUPLEMENTOS = ['', 'Gel', 'Gomitas', 'Bebida deportiva', 'Barrita', 'Dátiles', 'Otro'];
const CAFEINA = ['', 'Sí', 'No'];

const nuevaEstacion = () => ({ punto: '', hidratacion: '', suplemento: '', marca: '', cantidad: '', cafeina: '', notas: '', img: '' });
const nuevaDistancia = () => ({
  tipo: 'distancia', titulo: '', eje: 'km',
  cenaPrevia: '', electrolitos: false,
  preWorkout: '', bebida: '', hidratacion: '', nadaNuevo: false,
  estaciones: [nuevaEstacion()],
  post: '', notas: '',
});
const nuevaCarga = () => ({
  tipo: 'carga', dias: '2',
  comidas: {
    desayuno: { ind: '', eq: '' }, comida: { ind: '', eq: '' },
    cena: { ind: '', eq: '' }, snacks: { ind: '', eq: '' },
  },
  hidratacion: '', evitar: '', notas: '',
});

// Comprime la imagen antes de guardarla. Conserva transparencia si es PNG/WebP.
const comprimirImagen = (file, max = 240) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
      else if (h >= w && h > max) { w = Math.round(w * max / h); h = max; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const conAlfa = /png|webp/i.test(file.type || '');
      resolve(conAlfa ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject;
    img.src = reader.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const COMIDAS = [['desayuno', 'Desayuno'], ['comida', 'Comida'], ['cena', 'Cena'], ['snacks', 'Snacks']];

export default function PlanDeportivo({ patient, onBack, onGuardChange }) {
  const [comp, setComp] = useState({ nombre: '', modalidad: '', fecha: '', objetivo: '' });
  const [paginas, setPaginas] = useState([]);
  const [status, setStatus] = useState('cargando'); // cargando | listo | guardando | guardado | error
  const [msg, setMsg] = useState('');
  const [dragIdx, setDragIdx] = useState(''); // "pIdx:eIdx" de la estación con drag encima
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfLink, setPdfLink] = useState('');
  const cargadoRef = useRef(false);
  const dirtyRef = useRef(false);

  // Carga inicial desde Firestore
  useEffect(() => {
    if (!patient || !patient.id) return;
    const unsub = onSnapshot(doc(db, 'deportivo', patient.id), snap => {
      if (!cargadoRef.current) {
        const d = snap.exists() ? snap.data() : {};
        setComp({ nombre: '', modalidad: '', fecha: '', objetivo: '', ...(d.competencia || {}) });
        setPaginas(Array.isArray(d.paginas) ? d.paginas : []);
        cargadoRef.current = true;
        setStatus('listo');
      }
    }, () => setStatus('listo'));
    return unsub;
  }, [patient]);

  const marcarSucio = () => { dirtyRef.current = true; if (status === 'guardado') setStatus('listo'); };

  // Aviso de salida con cambios sin guardar
  const requestExit = useCallback((proceed) => {
    const salir = typeof proceed === 'function' ? proceed : () => {};
    if (dirtyRef.current) {
      if (window.confirm('Tienes cambios sin guardar en el plan deportivo. ¿Salir de todos modos?')) salir();
    } else { salir(); }
  }, []);
  useEffect(() => {
    if (onGuardChange) onGuardChange(requestExit);
    return () => { if (onGuardChange) onGuardChange(null); };
  }, [onGuardChange, requestExit]);

  // ---- Helpers de edición ----
  const setCompCampo = (k, v) => { setComp(c => ({ ...c, [k]: v })); marcarSucio(); };
  const setPagina = (i, patch) => { setPaginas(ps => ps.map((p, k) => k === i ? { ...p, ...patch } : p)); marcarSucio(); };
  const addDistancia = () => { setPaginas(ps => [...ps, nuevaDistancia()]); marcarSucio(); };
  const addCarga = () => { setPaginas(ps => [...ps, nuevaCarga()]); marcarSucio(); };
  const removePagina = (i) => {
    if (!window.confirm('¿Quitar esta página del plan?')) return;
    setPaginas(ps => ps.filter((_, k) => k !== i)); marcarSucio();
  };
  const moverPagina = (i, dir) => {
    setPaginas(ps => {
      const j = i + dir;
      if (j < 0 || j >= ps.length) return ps;
      const nx = ps.slice(); const t = nx[i]; nx[i] = nx[j]; nx[j] = t; return nx;
    });
    marcarSucio();
  };

  const setEstacion = (pi, ei, patch) => {
    setPaginas(ps => ps.map((p, k) => {
      if (k !== pi) return p;
      const est = (p.estaciones || []).map((e, m) => m === ei ? { ...e, ...patch } : e);
      return { ...p, estaciones: est };
    }));
    marcarSucio();
  };
  const addEstacion = (pi) => { setPaginas(ps => ps.map((p, k) => k === pi ? { ...p, estaciones: [...(p.estaciones || []), nuevaEstacion()] } : p)); marcarSucio(); };
  const removeEstacion = (pi, ei) => {
    setPaginas(ps => ps.map((p, k) => {
      if (k !== pi) return p;
      const est = (p.estaciones || []).filter((_, m) => m !== ei);
      return { ...p, estaciones: est.length ? est : [nuevaEstacion()] };
    }));
    marcarSucio();
  };

  const cargarImagen = async (pi, ei, file) => {
    if (!file || !/^image\//.test(file.type || '')) { setMsg('Ese archivo no es una imagen.'); return; }
    try {
      const dataUrl = await comprimirImagen(file);
      setEstacion(pi, ei, { img: dataUrl });
      setMsg('');
    } catch (e) { setMsg('No se pudo cargar la imagen.'); }
  };

  const cargarImagenComida = async (pi, key, file) => {
    if (!file || !/^image\//.test(file.type || '')) { setMsg('Ese archivo no es una imagen.'); return; }
    try {
      const dataUrl = await comprimirImagen(file);
      setComida(pi, key, 'img', dataUrl);
      setMsg('');
    } catch (e) { setMsg('No se pudo cargar la imagen.'); }
  };

  const setComida = (pi, key, campo, v) => {
    setPaginas(ps => ps.map((p, k) => {
      if (k !== pi) return p;
      const comidas = { ...(p.comidas || {}) };
      comidas[key] = { ...(comidas[key] || {}), [campo]: v };
      return { ...p, comidas };
    }));
    marcarSucio();
  };

  const guardar = async () => {
    setStatus('guardando'); setMsg('');
    try {
      await setDoc(doc(db, 'deportivo', patient.id), {
        competencia: comp, paginas, actualizado: Date.now(),
      });
      dirtyRef.current = false;
      setStatus('guardado');
      setMsg('Plan deportivo guardado.');
    } catch (e) {
      setStatus('error');
      // El error más común aquí sería exceder el tamaño del documento por muchas imágenes.
      setMsg('No se pudo guardar: ' + (e && e.message ? e.message : 'error') + ' — si tienes muchas imágenes, quita algunas o usa fotos más ligeras.');
    }
  };

  const generarPDF = async () => {
    if (!paginas.length) { setMsg('Agrega al menos una página antes de generar el PDF.'); return; }
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setMsg('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    setPdfBusy(true); setPdfLink(''); setMsg('Guardando y generando el PDF…');
    try {
      // Guarda primero para no perder cambios.
      await setDoc(doc(db, 'deportivo', patient.id), { competencia: comp, paginas, actualizado: Date.now() });
      dirtyRef.current = false;

      const html = buildDeportivoHTML({ comp, paginas });
      const fechaTxt = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
      const filename = 'Plan deportivo ' + String(patient.nombre || 'paciente').trim() + ' ' + fechaTxt + '.pdf';
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveDeportivo', patient: patient.nombre, correo: (patient.correo || ''), filename, html }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (data.ok && data.link) {
        setPdfLink(data.link);
        setMsg('PDF generado y guardado en Drive.');
        // Registra el enlace en el paciente para tenerlo a la mano.
        try {
          const nuevo = { nombre: filename.replace(/\.pdf$/i, ''), fecha: new Date().toISOString().slice(0, 10), link: data.link };
          await updateDoc(doc(db, 'pacientes', patient.id), { planesDeportivos: [...(patient.planesDeportivos || []), nuevo] });
        } catch (_) { /* secundario */ }
      } else {
        setMsg('No se pudo generar el PDF: ' + (data.error || 'error del servidor.'));
      }
    } catch (e) {
      setMsg('No se pudo generar el PDF: ' + (e && e.message ? e.message : 'error'));
    } finally {
      setPdfBusy(false);
    }
  };

  if (status === 'cargando') {
    return <div style={S.wrap}><div style={S.note}>Cargando plan deportivo…</div></div>;
  }

  return (
    <div style={S.wrap}>
      <button style={S.back} onClick={() => requestExit(onBack)}>← {patient.nombre || 'Atrás'}</button>

      <div style={S.eyebrow}>PLAN DEPORTIVO</div>
      <h2 style={S.h2}>Alto rendimiento</h2>
      <div style={S.note}>Captura el plan de la competencia. Agrega una página por cada distancia y las de carga de carbohidratos que necesite el paciente; todas se unirán en un solo PDF (diseño en la siguiente etapa).</div>

      {/* 1 · Datos de la competencia */}
      <div style={S.card}>
        <div style={S.secTitle}>1 · Datos de la competencia</div>
        <div style={S.grid}>
          <Field label="Nombre de la competencia">
            <input style={S.input} value={comp.nombre} onChange={e => setCompCampo('nombre', e.target.value)} placeholder="Athens Marathon" />
          </Field>
          <Field label="Modalidad">
            <select style={S.input} value={comp.modalidad} onChange={e => setCompCampo('modalidad', e.target.value)}>
              <option value="">—</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Fecha">
            <input type="date" style={S.input} value={comp.fecha} onChange={e => setCompCampo('fecha', e.target.value)} />
          </Field>
          <Field label="Objetivo">
            <input style={S.input} value={comp.objetivo} onChange={e => setCompCampo('objetivo', e.target.value)} placeholder="Rendimiento deportivo" />
          </Field>
        </div>
      </div>

      {/* 2 · Páginas del plan */}
      <div style={S.secTitle2}>2 · Páginas del plan</div>

      {paginas.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', color: 'var(--stone)', fontSize: 13 }}>
          Aún no hay páginas. Agrega una distancia o una carga de carbohidratos.
        </div>
      )}

      {paginas.map((p, pi) => (
        <div key={pi} style={S.card}>
          <div style={S.pagHead}>
            <div style={S.pagTitle}>{p.tipo === 'distancia' ? 'Página · Distancia' : 'Página · Carga de carbohidratos'}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button style={S.iconBtn} title="Subir" onClick={() => moverPagina(pi, -1)}>↑</button>
              <button style={S.iconBtn} title="Bajar" onClick={() => moverPagina(pi, 1)}>↓</button>
              <button style={S.rm} title="Quitar página" onClick={() => removePagina(pi)}>×</button>
            </div>
          </div>

          {p.tipo === 'distancia' ? (
            <>
              <div style={S.grid}>
                <Field label="Distancia (título)">
                  <input style={S.input} value={p.titulo} onChange={e => setPagina(pi, { titulo: e.target.value })} placeholder="16K" />
                </Field>
                <Field label="Eje de la línea de tiempo">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Chip on={p.eje === 'km'} onClick={() => setPagina(pi, { eje: 'km' })}>Por kilómetros</Chip>
                    <Chip on={p.eje === 'tiempo'} onClick={() => setPagina(pi, { eje: 'tiempo' })}>Por tiempo</Chip>
                  </div>
                </Field>
              </div>

              <div style={S.grid}>
                <Field label="Cena previa (PM)" full>
                  <textarea style={S.area} rows={2} value={p.cenaPrevia} onChange={e => setPagina(pi, { cenaPrevia: e.target.value })} placeholder="Rica en carbos, sin grasa, poca verdura y proteína…" />
                </Field>
              </div>
              <label style={S.check}>
                <input type="checkbox" checked={!!p.electrolitos} onChange={e => setPagina(pi, { electrolitos: e.target.checked })} /> Incluir electrolitos en la cena previa
              </label>

              <div style={S.grid}>
                <Field label="Pre-workout (AM)"><input style={S.input} value={p.preWorkout} onChange={e => setPagina(pi, { preWorkout: e.target.value })} placeholder="Rompe ayuno…" /></Field>
                <Field label="Bebida previa"><input style={S.input} value={p.bebida} onChange={e => setPagina(pi, { bebida: e.target.value })} placeholder="Tragos de electrolito" /></Field>
                <Field label="Regla de hidratación"><input style={S.input} value={p.hidratacion} onChange={e => setPagina(pi, { hidratacion: e.target.value })} placeholder="Cada 15-20 min" /></Field>
              </div>
              <label style={S.check}>
                <input type="checkbox" checked={!!p.nadaNuevo} onChange={e => setPagina(pi, { nadaNuevo: e.target.checked })} /> Mostrar aviso <b>&nbsp;“NADA NUEVO”</b>&nbsp; en esta página
              </label>

              {/* Estaciones */}
              <div style={S.subTitle}>Estaciones (durante)</div>
              {(p.estaciones || []).map((est, ei) => (
                <div key={ei} style={S.estCard}>
                  <div style={S.estGrid}>
                    <Field label={p.eje === 'km' ? 'Punto (km)' : 'Punto (tiempo)'}><input style={S.input} value={est.punto} onChange={e => setEstacion(pi, ei, { punto: e.target.value })} placeholder={p.eje === 'km' ? '6K' : '30min'} /></Field>
                    <Field label="Hidratación"><input style={S.input} value={est.hidratacion} onChange={e => setEstacion(pi, ei, { hidratacion: e.target.value })} placeholder="150ml agua + 150ml bebida" /></Field>
                    <Field label="Suplemento">
                      <select style={S.input} value={est.suplemento} onChange={e => setEstacion(pi, ei, { suplemento: e.target.value })}>
                        {SUPLEMENTOS.map(s => <option key={s} value={s}>{s || '—'}</option>)}
                      </select>
                    </Field>
                    <Field label="Marca"><input style={S.input} value={est.marca} onChange={e => setEstacion(pi, ei, { marca: e.target.value })} placeholder="GU / SIS…" /></Field>
                    <Field label="Cantidad"><input style={S.input} value={est.cantidad} onChange={e => setEstacion(pi, ei, { cantidad: e.target.value })} placeholder="1 gel / 6-8 gomitas" /></Field>
                    <Field label="Cafeína">
                      <select style={S.input} value={est.cafeina} onChange={e => setEstacion(pi, ei, { cafeina: e.target.value })}>
                        {CAFEINA.map(c => <option key={c} value={c}>{c || '—'}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Notas" full><input style={S.input} value={est.notas} onChange={e => setEstacion(pi, ei, { notas: e.target.value })} placeholder="5 min antes de empezar, etc." /></Field>

                  {/* Imagen del producto: arrastrar o cargar */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    {est.img ? (
                      <div style={{ position: 'relative' }}>
                        <img src={est.img} alt="producto" style={S.thumb} />
                        <button style={S.thumbX} title="Quitar imagen" onClick={() => setEstacion(pi, ei, { img: '' })}>×</button>
                      </div>
                    ) : (
                      <label
                        style={{ ...S.drop, ...(dragIdx === pi + ':' + ei ? S.dropOver : {}) }}
                        onDragOver={e => { e.preventDefault(); if (dragIdx !== pi + ':' + ei) setDragIdx(pi + ':' + ei); }}
                        onDragLeave={() => setDragIdx('')}
                        onDrop={e => { e.preventDefault(); setDragIdx(''); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; cargarImagen(pi, ei, f); }}
                      >
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => cargarImagen(pi, ei, e.target.files && e.target.files[0])} />
                        <span style={{ fontSize: 11.5, color: 'var(--stone)', textAlign: 'center', lineHeight: 1.4 }}>Arrastra o haz clic para cargar la imagen del producto</span>
                      </label>
                    )}
                    <div style={{ flex: 1, minWidth: 160, fontSize: 11, color: 'var(--stone)', lineHeight: 1.5 }}>
                      Ideal: PNG con fondo transparente. El sistema encuadra la imagen a un tamaño uniforme para la línea de tiempo.
                    </div>
                    <button style={S.rmLine} onClick={() => removeEstacion(pi, ei)}>Quitar estación</button>
                  </div>
                </div>
              ))}
              <button style={S.addChip} onClick={() => addEstacion(pi)}>＋ Agregar estación</button>

              <div style={S.grid}>
                <Field label="Post (recuperación)" full><textarea style={S.area} rows={2} value={p.post} onChange={e => setPagina(pi, { post: e.target.value })} placeholder="Comida completa + hidratación…" /></Field>
              </div>
              <div style={S.grid}>
                <Field label="Notas de la página" full><textarea style={S.area} rows={2} value={p.notas} onChange={e => setPagina(pi, { notas: e.target.value })} placeholder="Lleva un gel extra…" /></Field>
              </div>
            </>
          ) : (
            <>
              <div style={S.grid}>
                <Field label="Días de carga">
                  <select style={S.input} value={p.dias} onChange={e => setPagina(pi, { dias: e.target.value })}>
                    <option value="1">1 día</option>
                    <option value="2">2 días</option>
                    <option value="3">3 días</option>
                  </select>
                </Field>
              </div>
              {COMIDAS.map(([key, label]) => (
                <div key={key} style={S.estCard}>
                  <div style={S.subTitle2}>{label}</div>
                  <Field label="Indicaciones" full><textarea style={S.area} rows={2} value={(p.comidas && p.comidas[key] && p.comidas[key].ind) || ''} onChange={e => setComida(pi, key, 'ind', e.target.value)} placeholder="Rico en carbohidratos, baja proteína…" /></Field>
                  <Field label="Equivalencias" full><input style={S.input} value={(p.comidas && p.comidas[key] && p.comidas[key].eq) || ''} onChange={e => setComida(pi, key, 'eq', e.target.value)} placeholder="5 cereales / 2 proteínas / 1 fruta" /></Field>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    {(p.comidas && p.comidas[key] && p.comidas[key].img) ? (
                      <div style={{ position: 'relative' }}>
                        <img src={p.comidas[key].img} alt={label} style={S.thumb} />
                        <button style={S.thumbX} title="Quitar imagen" onClick={() => setComida(pi, key, 'img', '')}>×</button>
                      </div>
                    ) : (
                      <label
                        style={{ ...S.drop, ...(dragIdx === 'c' + pi + ':' + key ? S.dropOver : {}) }}
                        onDragOver={e => { e.preventDefault(); if (dragIdx !== 'c' + pi + ':' + key) setDragIdx('c' + pi + ':' + key); }}
                        onDragLeave={() => setDragIdx('')}
                        onDrop={e => { e.preventDefault(); setDragIdx(''); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; cargarImagenComida(pi, key, f); }}
                      >
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => cargarImagenComida(pi, key, e.target.files && e.target.files[0])} />
                        <span style={{ fontSize: 11.5, color: 'var(--stone)', textAlign: 'center', lineHeight: 1.4 }}>Arrastra o haz clic para cargar la foto del platillo</span>
                      </label>
                    )}
                    <div style={{ flex: 1, minWidth: 160, fontSize: 11, color: 'var(--stone)', lineHeight: 1.5 }}>
                      Opcional. Aparecerá en la burbuja de {label.toLowerCase()} del diagrama de carga.
                    </div>
                  </div>
                </div>
              ))}
              <div style={S.grid}>
                <Field label="Hidratación" full><input style={S.input} value={p.hidratacion} onChange={e => setPagina(pi, { hidratacion: e.target.value })} placeholder="Mínimo 2L de agua + electrolitos…" /></Field>
              </div>
              <div style={S.grid}>
                <Field label="Qué evitar" full><textarea style={S.area} rows={2} value={p.evitar} onChange={e => setPagina(pi, { evitar: e.target.value })} placeholder="Frituras, irritantes, alcohol, frijoles…" /></Field>
              </div>
              <div style={S.grid}>
                <Field label="Notas de la página" full><textarea style={S.area} rows={2} value={p.notas} onChange={e => setPagina(pi, { notas: e.target.value })} /></Field>
              </div>
            </>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6, marginBottom: 14 }}>
        <button style={S.addBtn} onClick={addDistancia}>＋ Distancia</button>
        <button style={S.addBtn} onClick={addCarga}>＋ Carga de carbos</button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={S.saveBtn} onClick={guardar} disabled={status === 'guardando'}>
          {status === 'guardando' ? 'Guardando…' : 'Guardar plan deportivo'}
        </button>
        <button style={S.pdfBtn} onClick={generarPDF} disabled={pdfBusy || status === 'guardando'}>
          {pdfBusy ? 'Generando…' : 'Generar PDF'}
        </button>
        {pdfLink && <a href={pdfLink} target="_blank" rel="noreferrer" style={S.pdfLink}>Abrir PDF ↗</a>}
        {msg && <span style={{ fontSize: 12.5, color: status === 'error' ? 'var(--danger)' : 'var(--stone)' }}>{msg}</span>}
      </div>

      <button style={{ ...S.back, marginTop: 18 }} onClick={() => requestExit(onBack)}>← Atrás</button>
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
function Chip({ on, onClick, children }) {
  return <button type="button" onClick={onClick} style={{ ...S.chip, ...(on ? S.chipOn : {}) }}>{children}</button>;
}

const S = {
  wrap: { maxWidth: 900, margin: '0 auto', padding: '4px 2px 40px', fontFamily: 'var(--font)' },
  back: { background: '#fff', border: '0.5px solid var(--border)', color: 'var(--dark)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 14px', borderRadius: 8, marginBottom: 14 },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, color: 'var(--gold)', fontWeight: 700 },
  h2: { fontSize: 24, fontWeight: 700, color: 'var(--dark)', margin: '2px 0 6px' },
  note: { fontSize: 12, color: 'var(--stone)', marginBottom: 16, lineHeight: 1.5 },
  card: { background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '16px 16px', marginBottom: 14 },
  secTitle: { fontSize: 11, letterSpacing: 1, color: 'var(--gold)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' },
  secTitle2: { fontSize: 11, letterSpacing: 1, color: 'var(--gold)', fontWeight: 700, margin: '4px 0 12px', textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 4 },
  label: { fontSize: 11, color: 'var(--stone)', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--dark)', fontFamily: 'inherit', boxSizing: 'border-box' },
  area: { width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--dark)', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--dark)', margin: '8px 0 10px', cursor: 'pointer' },
  pagHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '0.5px solid var(--border)' },
  pagTitle: { fontSize: 14, fontWeight: 700, color: 'var(--dark)' },
  subTitle: { fontSize: 12, fontWeight: 700, color: 'var(--dark)', margin: '10px 0 8px' },
  subTitle2: { fontSize: 12, fontWeight: 700, color: 'var(--gold)', marginBottom: 8 },
  estCard: { background: 'var(--mint)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 12px', marginBottom: 10 },
  estGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 4 },
  chip: { background: 'var(--mint)', border: '0.5px solid var(--border)', color: 'var(--dark)', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  chipOn: { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' },
  addChip: { background: '#fff', border: '1px dashed var(--gold)', color: 'var(--gold)', borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 2, marginBottom: 6 },
  addBtn: { background: '#fff', border: '1px dashed var(--gold)', color: 'var(--gold)', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
  saveBtn: { background: 'var(--gold)', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
  pdfBtn: { background: '#fff', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '11px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
  pdfLink: { fontSize: 13, fontWeight: 700, color: 'var(--gold)', textDecoration: 'none' },
  iconBtn: { background: '#fff', border: '0.5px solid var(--border)', color: 'var(--dark)', borderRadius: 7, width: 28, height: 28, fontSize: 13, cursor: 'pointer', lineHeight: 1 },
  rm: { background: 'transparent', border: 'none', color: 'var(--stone)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' },
  rmLine: { background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0, alignSelf: 'center' },
  drop: { width: 120, height: 120, border: '1px dashed var(--gold)', borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, cursor: 'pointer', flexShrink: 0 },
  dropOver: { background: 'var(--mint)', borderStyle: 'solid' },
  thumb: { width: 120, height: 120, objectFit: 'contain', border: '0.5px solid var(--border)', borderRadius: 10, background: '#fff' },
  thumbX: { position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: 'var(--dark)', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', lineHeight: 1 },
};
