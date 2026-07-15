import React, { useState, useMemo, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { mapearPaciente } from '../utils/mapearSistemaMP';

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const sinId = (p) => { const o = { ...p }; delete o.id; return o; };

export default function ImportarPacientes({ open, onClose, pacientes, prefix = 'NF-' }) {
  const [raws, setRaws] = useState(null);      // array de registros crudos del archivo
  const [nombreArch, setNombreArch] = useState('');
  const [busy, setBusy] = useState(false);
  const [progreso, setProgreso] = useState({ hecho: 0, total: 0 });
  const [resultado, setResultado] = useState(null); // { creados, actualizados }
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  // Mapa correo -> paciente existente (para upsert y para calcular nuevos vs actualizar).
  const porCorreo = useMemo(() => {
    const m = new Map();
    (pacientes || []).forEach(p => { if (p.correo) m.set(String(p.correo).toLowerCase(), p); });
    return m;
  }, [pacientes]);

  // Detecta el último lote importado (para "Deshacer último lote").
  const ultimoLote = useMemo(() => {
    const conLote = (pacientes || []).filter(p => p.origen === 'sistema-mp' && p.loteId);
    if (!conLote.length) return null;
    let max = 0;
    conLote.forEach(p => { if ((p.importadoEn || 0) > max) max = p.importadoEn; });
    const loteId = (conLote.find(p => p.importadoEn === max) || {}).loteId;
    const miembros = conLote.filter(p => p.loteId === loteId);
    return { loteId, miembros };
  }, [pacientes]);

  const conteo = useMemo(() => {
    if (!raws) return null;
    let nuevos = 0, actualiza = 0;
    raws.forEach(r => {
      const correo = String((r.campos && r.campos.Email) || '').trim().toLowerCase();
      if (correo && porCorreo.has(correo)) actualiza++; else nuevos++;
    });
    return { total: raws.length, nuevos, actualiza };
  }, [raws, porCorreo]);

  if (!open) return null;

  const cargarArchivo = (file) => {
    setError(''); setResultado(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const arr = Array.isArray(data) ? data : [data];
        if (!arr.length || !arr[0].campos) throw new Error('El archivo no tiene el formato esperado (se espera una lista con "campos").');
        setRaws(arr); setNombreArch(file.name);
      } catch (e) {
        setRaws(null); setNombreArch('');
        setError('No se pudo leer el archivo: ' + e.message);
      }
    };
    reader.onerror = () => setError('No se pudo leer el archivo.');
    reader.readAsText(file);
  };

  const importar = async () => {
    if (!raws) return;
    setBusy(true); setError(''); setResultado(null);
    setProgreso({ hecho: 0, total: raws.length });

    const loteId = 'lote-' + new Date().toISOString().replace(/[:.]/g, '-');
    const importadoEn = Date.now();
    let mx = 0;
    (pacientes || []).forEach(p => { const m = /(\d+)/.exec(p.codigo || ''); if (m) mx = Math.max(mx, +m[1]); });

    let creados = 0, actualizados = 0;
    try {
      for (let i = 0; i < raws.length; i++) {
        const rec = mapearPaciente(raws[i], hoyISO());
        rec.origen = 'sistema-mp';
        rec.loteId = loteId;
        rec.importadoEn = importadoEn;

        const correo = rec.correo;
        const existente = correo ? porCorreo.get(correo) : null;

        if (existente) {
          // Respaldamos el documento anterior (para poder restaurar) y fusionamos.
          rec.respaldoImport = sinId(existente);
          rec.importCreado = false;
          rec.codigo = existente.codigo || (prefix + String(++mx).padStart(4, '0'));
          rec.mediciones = (existente.mediciones || []).concat(rec.mediciones || []);
          rec.planes = existente.planes || [];
          rec.creado = existente.creado || rec.creado;
          await updateDoc(doc(db, 'pacientes', existente.id), rec);
          actualizados++;
        } else {
          rec.importCreado = true;
          rec.codigo = prefix + String(++mx).padStart(4, '0');
          await addDoc(collection(db, 'pacientes'), rec);
          creados++;
        }
        setProgreso({ hecho: i + 1, total: raws.length });
      }
      setResultado({ creados, actualizados });
    } catch (e) {
      setError('Se detuvo la importación: ' + e.message + ' (los ya cargados se pueden deshacer).');
    } finally {
      setBusy(false);
    }
  };

  const deshacerUltimo = async () => {
    if (!ultimoLote) return;
    if (!window.confirm(`¿Deshacer el último lote (${ultimoLote.miembros.length} pacientes)?\n\nSe borran los creados y se restauran los actualizados. No toca a nadie más.`)) return;
    setBusy(true); setError('');
    try {
      for (const p of ultimoLote.miembros) {
        if (p.importCreado) {
          await deleteDoc(doc(db, 'pacientes', p.id));
        } else if (p.respaldoImport) {
          // set completo: regresa el documento a como estaba (quita etiquetas de import).
          await setDoc(doc(db, 'pacientes', p.id), p.respaldoImport);
        }
      }
      setResultado(null); setRaws(null); setNombreArch('');
    } catch (e) {
      setError('No se pudo deshacer del todo: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.overlay} onClick={busy ? undefined : onClose}>
      <div style={S.card} onClick={(e) => e.stopPropagation()}>
        <div style={S.head}>
          <div style={S.title}>Importar pacientes de Sistema MP</div>
          <button style={S.x} onClick={onClose} disabled={busy}>✕</button>
        </div>

        {!resultado && (
          <>
            <div
              style={{ ...S.drop, ...(dragOver ? S.dropOver : {}) }}
              onClick={() => inputRef.current && inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); cargarArchivo(e.dataTransfer.files[0]); }}
            >
              <input ref={inputRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
                onChange={(e) => cargarArchivo(e.target.files[0])} />
              {nombreArch
                ? <div><b>{nombreArch}</b><div style={S.muted}>Haz clic para elegir otro archivo</div></div>
                : <div>Arrastra aquí el archivo <b>.json</b><div style={S.muted}>o haz clic para elegirlo</div></div>}
            </div>

            {conteo && (
              <div style={S.info}>
                <div><b>{conteo.total}</b> pacientes en el archivo</div>
                <div style={S.muted}>{conteo.nuevos} nuevos · {conteo.actualiza} ya existen (se actualizarán por correo)</div>
              </div>
            )}

            {busy && progreso.total > 0 && (
              <div style={S.info}>Cargando… {progreso.hecho} de {progreso.total}</div>
            )}

            <div style={S.actions}>
              <button style={S.primary} onClick={importar} disabled={!raws || busy}>
                {busy ? 'Importando…' : 'Importar'}
              </button>
              <button style={S.ghost} onClick={onClose} disabled={busy}>Cancelar</button>
            </div>
          </>
        )}

        {resultado && (
          <div style={S.info}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Importación completa</div>
            <div>Creados: <b>{resultado.creados}</b> · Actualizados: <b>{resultado.actualizados}</b></div>
            <div style={{ ...S.muted, marginTop: 6 }}>Revisa un par de pacientes en su historia clínica. Si algo quedó mal, usa “Deshacer último lote”.</div>
            <div style={S.actions}>
              <button style={S.primary} onClick={onClose}>Listo</button>
            </div>
          </div>
        )}

        {ultimoLote && (
          <div style={S.undo}>
            <div style={S.muted}>Último lote importado: {ultimoLote.miembros.length} pacientes</div>
            <button style={S.danger} onClick={deshacerUltimo} disabled={busy}>Deshacer último lote</button>
          </div>
        )}

        {error && <div style={S.err}>{error}</div>}
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  card: { background: '#fff', color: 'var(--dark)', width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 14, padding: 20, fontFamily: 'var(--font)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: 800 },
  x: { background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)' },
  drop: { border: '1.5px dashed var(--border)', borderRadius: 12, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--cream)', fontSize: 14 },
  dropOver: { borderColor: 'var(--mint)', background: '#fff' },
  info: { marginTop: 14, fontSize: 14, lineHeight: 1.5 },
  muted: { color: 'var(--muted)', fontSize: 12, marginTop: 2 },
  actions: { display: 'flex', gap: 8, marginTop: 18 },
  primary: { background: 'var(--mint)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
  ghost: { background: '#fff', color: 'var(--dark)', border: '0.5px solid var(--border)', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  danger: { background: '#fff', color: 'var(--danger)', border: '0.5px solid var(--danger)', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 8 },
  undo: { marginTop: 18, paddingTop: 14, borderTop: '0.5px solid var(--border)' },
  err: { marginTop: 14, background: '#fdecec', color: '#a12', padding: '10px 12px', borderRadius: 8, fontSize: 13 },
};
