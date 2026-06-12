import React, { useState } from 'react';

/* =====================================================================
   PUNTO DE MIGRACIÓN A OCR (Opción 1)
   Hoy esta función devuelve campos vacíos: la nutrióloga lee la imagen
   y teclea los valores (captura asistida).
   Mañana: enviar la imagen al OCR (Drive / Apps Script), parsear el texto
   y devolver aquí { fecha, peso, grasa, mme, grasaKg, tmb }. El resto del
   modal y el formulario de confirmación NO cambian.
   ===================================================================== */
async function extractInBody(/* file */) {
  return { fecha: '', peso: '', grasa: '', mme: '', grasaKg: '', tmb: '' };
}

export default function InBodyModal({ patient, onClose, onDesdeCero, onInBody }) {
  const [step, setStep] = useState('choose');
  const [imgUrl, setImgUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    peso: '', grasa: '', mme: '', grasaKg: '', tmb: '',
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImgUrl(URL.createObjectURL(file));
    setBusy(true);
    try {
      const d = await extractInBody(file);
      const limpio = Object.fromEntries(Object.entries(d).filter(([, v]) => v !== '' && v != null));
      setF(p => ({ ...p, ...limpio }));
    } catch (_) {}
    setBusy(false);
  };

  const S = styles;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={(e) => e.stopPropagation()}>
        <div style={S.head}>
          <div style={S.title}>Plan para {patient.nombre}</div>
          <button style={S.x} onClick={onClose}>×</button>
        </div>

        {step === 'choose' && (
          <div>
            <div style={S.sub}>¿Cómo quieres iniciar el plan?</div>
            <button style={S.bigBtn} onClick={() => setStep('capture')}>
              <span style={S.bigIcon}>＋</span>
              <span>
                <span style={S.bigTitle}>Cargar resultado de InBody</span>
                <span style={S.bigDesc}>Sube la hoja del estudio y confirma los datos</span>
              </span>
            </button>
            <button style={{ ...S.bigBtn, ...S.bigGhost }} onClick={onDesdeCero}>
              <span style={S.bigIcon}>✎</span>
              <span>
                <span style={S.bigTitle}>Hacer plan desde cero</span>
                <span style={S.bigDesc}>Captura manual sin estudio</span>
              </span>
            </button>
          </div>
        )}

        {step === 'capture' && (
          <div>
            <button style={S.back} onClick={() => setStep('choose')}>← Volver</button>

            <label style={S.upload}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
              {imgUrl ? 'Cambiar imagen' : 'Seleccionar imagen del InBody'}
            </label>

            {imgUrl && (
              <div style={S.previewWrap}>
                <img src={imgUrl} alt="Resultado InBody" style={S.preview} />
                <div style={S.hint}>Lee la hoja y confirma los valores abajo.</div>
              </div>
            )}

            {busy && <div style={S.hint}>Procesando imagen…</div>}

            <div style={S.formTitle}>Datos del estudio</div>
            <div style={S.grid}>
              <Field l="Fecha del test"><input type="date" style={S.inp} value={f.fecha} onChange={e => set('fecha', e.target.value)} /></Field>
              <Field l="Peso (kg)"><input style={S.inp} inputMode="decimal" value={f.peso} onChange={e => set('peso', e.target.value)} placeholder="74.0" /></Field>
              <Field l="% grasa (PGC)"><input style={S.inp} inputMode="decimal" value={f.grasa} onChange={e => set('grasa', e.target.value)} placeholder="18.2" /></Field>
              <Field l="MME · músculo (kg)"><input style={S.inp} inputMode="decimal" value={f.mme} onChange={e => set('mme', e.target.value)} placeholder="34.5" /></Field>
              <Field l="Masa grasa (kg)"><input style={S.inp} inputMode="decimal" value={f.grasaKg} onChange={e => set('grasaKg', e.target.value)} placeholder="13.4" /></Field>
              <Field l="TMB (kcal)"><input style={S.inp} inputMode="numeric" value={f.tmb} onChange={e => set('tmb', e.target.value)} placeholder="1678" /></Field>
            </div>

            <div style={S.note}>Estos valores se guardan como una medición del paciente y precargan el cálculo del plan.</div>
            <button style={S.continueBtn} onClick={() => onInBody({ ...f })}>Continuar al cálculo</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ l, children }) {
  return <label style={styles.field}><span style={styles.fieldLbl}>{l}</span>{children}</label>;
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(26,22,18,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 470, maxHeight: '90vh', overflowY: 'auto', padding: '18px 20px', fontFamily: 'var(--font)' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 700, color: 'var(--dark)' },
  x: { background: 'transparent', border: 'none', fontSize: 26, color: 'var(--stone)', cursor: 'pointer', lineHeight: 1, padding: 0 },
  sub: { fontSize: 13, color: 'var(--stone)', marginBottom: 16 },
  bigBtn: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 16px', marginBottom: 12, cursor: 'pointer', fontFamily: 'var(--font)' },
  bigGhost: { background: 'var(--cream)', color: 'var(--dark)', border: '0.5px solid var(--border)' },
  bigIcon: { fontSize: 22, width: 26, textAlign: 'center', flexShrink: 0 },
  bigTitle: { display: 'block', fontSize: 14, fontWeight: 700 },
  bigDesc: { display: 'block', fontSize: 11.5, opacity: 0.85, marginTop: 2 },
  back: { background: 'transparent', border: 'none', color: 'var(--stone)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 12, fontFamily: 'var(--font)' },
  upload: { display: 'block', textAlign: 'center', background: 'var(--cream)', border: '1px dashed var(--gold)', borderRadius: 10, padding: '14px', fontSize: 13, fontWeight: 600, color: 'var(--dark)', cursor: 'pointer', marginBottom: 12 },
  previewWrap: { marginBottom: 14 },
  preview: { width: '100%', borderRadius: 10, border: '0.5px solid var(--border)' },
  hint: { fontSize: 11.5, color: 'var(--stone)', marginTop: 6, textAlign: 'center' },
  formTitle: { fontSize: 12, fontWeight: 700, color: 'var(--dark)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '6px 0 10px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLbl: { fontSize: 9.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' },
  inp: { border: '0.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', width: '100%' },
  note: { fontSize: 11.5, color: 'var(--stone)', margin: '12px 0', lineHeight: 1.5 },
  continueBtn: { background: 'var(--dark)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', width: '100%' },
};
