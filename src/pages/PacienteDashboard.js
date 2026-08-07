import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useBranding, aplicarColores } from '../context/BrandingContext';
import Topbar from '../components/Topbar';
import PerfilPaciente from '../components/PerfilPaciente';
import Agenda from '../components/Agenda';
import { buildRecomendacionesHTML } from '../report/recomendacionesHTML';
import { renderRich } from '../utils/richText';
import { parseDriveLink } from '../utils/drive';
import { resumenSaldo, venceDeLote, familiaLabel, nuevoLote, PAQUETES_DEFAULT } from '../utils/creditos';
import { REGIMENES_FISCALES, USOS_CFDI, CFDI_DEFAULT } from '../data/catalogosCFDI';

/* ===== mini gráfica de línea (SVG, idéntica a la del expediente) ===== */
const METODO_LABEL = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', stripe: 'En línea', consultorio: 'Consultorio', reagendado: 'Reagendada' };
const MESES_MINI = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const fmtMesP = (f) => { const d = new Date(f + 'T00:00:00'); return isNaN(d) ? f : `${d.getDate()} ${MESES_MINI[d.getMonth()]}`; };
const fmtSello = (ts) => { const d = new Date(ts); return isNaN(d) ? '' : d.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
function Linea({ data, field, color, unit }) {
  const valid = (data || []).filter(d => typeof d[field] === 'number' && !isNaN(d[field]));
  if (valid.length === 0) return <div style={{ fontSize: 12, color: 'var(--stone)', padding: '20px 0', textAlign: 'center' }}>Sin mediciones aún</div>;
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
        <text key={'x' + i} x={X(i)} y={h - pad + 14} fontSize="8.5" fill="var(--stone)" textAnchor="middle">{fmtMesP(d.fecha)}</text>
      ))}
      <text x={pad - 4} y={Y(max) + 3} fontSize="9" fill="var(--stone)" textAnchor="end">{max}{unit}</text>
      {min !== max && <text x={pad - 4} y={Y(min) + 3} fontSize="9" fill="var(--stone)" textAnchor="end">{min}{unit}</text>}
    </svg>
  );
}

const D = {
  section: { fontSize: 18, fontWeight: 700, color: 'var(--dark)', margin: '20px 4px 10px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  gridAcc: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  tile: { background: '#fff', border: '0.5px solid var(--border)', borderRadius: 14, padding: '14px 14px 10px' },
  tileTitle: { fontSize: 15, fontWeight: 700, color: 'var(--dark)' },
  tileValue: { fontSize: 26, fontWeight: 800, color: 'var(--dark)', margin: '0 0 6px', lineHeight: 1.1 },
  tileUnit: { fontSize: 12, fontWeight: 600, color: 'var(--stone)' },
  access: { background: '#fff', border: '0.5px solid var(--border)', borderRadius: 14, padding: '18px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' },
  accessLabel: { fontSize: 15, fontWeight: 700, color: 'var(--dark)' },
  accessSub: { fontSize: 11, color: 'var(--stone)' },
};

const IconAgendar = <svg viewBox="0 0 24 24" width="30" height="30" strokeWidth="1.5" fill="none" stroke="var(--gold)"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
const IconPlan = <svg viewBox="0 0 24 24" width="30" height="30" strokeWidth="1.5" fill="none" stroke="var(--gold)"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const IconRecom = <svg viewBox="0 0 24 24" width="30" height="30" strokeWidth="1.5" fill="none" stroke="var(--gold)"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>;

const APARIENCIA_TOKENS = [
  { k: 'cream', l: 'Fondo' },
  { k: 'card', l: 'Tarjetas' },
  { k: 'gold', l: 'Acento (botones)' },
  { k: 'dark', l: 'Texto' },
];

// Preferencia personal de colores del paciente: solo afecta SU vista (capa por encima de la marca).
function AparienciaPaciente({ expediente, brandColors }) {
  const [val, setVal] = useState({ ...brandColors, ...((expediente && expediente.coloresPersonales) || {}) });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setVal({ ...brandColors, ...((expediente && expediente.coloresPersonales) || {}) });
  }, [brandColors, expediente]);

  const setColor = (k, v) => {
    const next = { ...val, [k]: v };
    setVal(next);
    aplicarColores({ ...brandColors, ...next }); // vista previa en vivo
  };

  const guardar = async () => {
    if (!expediente) { setMsg('Tu cuenta aún no está vinculada a un expediente.'); return; }
    const personal = {};
    APARIENCIA_TOKENS.forEach(({ k }) => { if (val[k]) personal[k] = val[k]; });
    setBusy(true); setMsg('');
    try {
      await updateDoc(doc(db, 'pacientes', expediente.id), { coloresPersonales: personal });
      setMsg('Colores guardados ✓');
    } catch (e) { setMsg('No se pudo guardar: ' + e.message); }
    setBusy(false);
  };

  const restablecer = async () => {
    setVal({ ...brandColors });
    aplicarColores(brandColors);
    setMsg('');
    if (!expediente) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'pacientes', expediente.id), { coloresPersonales: {} });
      setMsg('Se restablecieron los colores de la marca.');
    } catch (e) { setMsg('No se pudo restablecer: ' + e.message); }
    setBusy(false);
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', marginTop: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>Apariencia</div>
      <div style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.5, marginBottom: 16 }}>Personaliza los colores de tu vista. Solo afectan cómo tú ves la app; no cambian la marca de tu nutriólogo(a).</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 360 }}>
        {APARIENCIA_TOKENS.map(({ k, l }) => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13.5, color: 'var(--stone)' }}>
            {l}
            <input type="color" value={val[k] || '#000000'} onChange={e => setColor(k, e.target.value)}
              style={{ width: 46, height: 30, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 18 }}>
        <button onClick={guardar} disabled={busy}
          style={{ background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {busy ? 'Guardando…' : 'Guardar mis colores'}
        </button>
        <button onClick={restablecer} disabled={busy}
          style={{ background: 'transparent', color: 'var(--stone)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>
          Volver a los colores de la marca
        </button>
        {msg ? <span style={{ fontSize: 12.5, color: 'var(--stone)' }}>{msg}</span> : null}
      </div>
    </div>
  );
}

function DatosFacturacion({ email }) {
  const correo = (email || '').toLowerCase();
  const [f, setF] = useState({ rfc: '', razonSocial: '', regimen: '', usoCFDI: 'G03', cp: '', correoFactura: '' });
  const [cfg, setCfg] = useState(CFDI_DEFAULT);
  const [st, setSt] = useState('');
  const [busy, setBusy] = useState(false);
  const [factura, setFactura] = useState(null);   // { uuid, pdfBase64 } tras timbrar
  useEffect(() => {
    if (!correo) return undefined;
    return onSnapshot(doc(db, 'datosFiscales', correo), snap => {
      if (snap.exists()) setF(prev => ({ ...prev, ...snap.data() }));
    }, () => {});
  }, [correo]);
  // Configuración de facturación (interruptor + datos del emisor + precio).
  useEffect(() => onSnapshot(doc(db, 'config', 'dashboard'), snap => {
    const d = (snap && snap.data()) || {};
    setCfg({ ...CFDI_DEFAULT, ...(d.cfdi || {}) });
  }, () => {}), []);
  const activo = !!cfg.activo;
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const inp = { border: '0.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)', background: '#fff', width: '100%', boxSizing: 'border-box' };
  const lbl = { fontSize: 9.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4, display: 'block' };
  const guardar = async () => {
    const datos = {
      correo,
      rfc: (f.rfc || '').trim().toUpperCase(),
      razonSocial: (f.razonSocial || '').trim(),
      regimen: f.regimen || '',
      usoCFDI: f.usoCFDI || '',
      cp: (f.cp || '').trim(),
      correoFactura: (f.correoFactura || '').trim().toLowerCase(),
    };
    await setDoc(doc(db, 'datosFiscales', correo), datos, { merge: true });
    return datos;
  };
  const soloGuardar = async () => {
    setBusy(true); setSt('');
    try { await guardar(); setSt('Datos guardados ✓'); } catch (e) { setSt('No se pudieron guardar: ' + e.message); }
    setBusy(false);
  };
  const descargarPDF = () => {
    if (!factura || !factura.pdfBase64) return;
    try {
      const a = document.createElement('a');
      a.href = 'data:application/pdf;base64,' + factura.pdfBase64;
      a.download = 'Factura_' + factura.uuid + '.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { /* noop */ }
  };
  const facturar = async () => {
    if (!activo) return;   // botón inhabilitado hasta que la nutrióloga active la facturación
    if (!(f.rfc || '').trim() || !(f.razonSocial || '').trim() || !f.regimen || !(f.cp || '').trim()) {
      setSt('Completa RFC, nombre/razón social, régimen y código postal para poder facturar.'); return;
    }
    if (!cfg.emisorNombre || !cfg.lugarExpedicion || !cfg.regimenEmisor || !(Number(cfg.precioConsulta) > 0)) {
      setSt('La facturación todavía no está configurada por completo (datos del emisor o precio). Avísale a tu nutrióloga.'); return;
    }
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setSt('No se pudo conectar con el servicio de facturación. Inténtalo más tarde.'); return; }
    setBusy(true); setSt(''); setFactura(null);
    try {
      await guardar();
      const payload = {
        action: 'facturarCFDI',
        ambiente: cfg.produccion ? 'produccion' : 'sandbox',
        emisor: { nombre: cfg.emisorNombre, regimenFiscal: cfg.regimenEmisor, lugarExpedicion: cfg.lugarExpedicion },
        receptor: {
          rfc: (f.rfc || '').trim().toUpperCase(), nombre: (f.razonSocial || '').trim(),
          cp: (f.cp || '').trim(), regimenFiscal: f.regimen, usoCFDI: f.usoCFDI || 'G03',
          correo: (f.correoFactura || correo),
        },
        conceptos: [{
          cantidad: 1, valorUnitario: Number(cfg.precioConsulta),
          descripcion: cfg.descripcion || 'Consulta de nutrición',
          claveProdServ: cfg.claveProdServ || '85121800', claveUnidad: cfg.claveUnidad || 'E48',
          unidad: 'Servicio', ivaCode: cfg.iva || 'exento',
        }],
        retencion: { aplica: !!cfg.retencionAplica, isrPct: cfg.retIsr, ivaPct: cfg.retIva },
        formaPago: '03', metodoPago: 'PUE',
        referencia: 'NF' + Date.now(),
        correoFactura: (f.correoFactura || correo),
      };
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload), redirect: 'follow',
      });
      let d; try { d = JSON.parse(await res.text()); } catch (_) { d = null; }
      if (d && d.ok && d.uuid) {
        setFactura({ uuid: d.uuid, pdfBase64: d.pdfBase64 || '' });
        setSt('¡Factura generada! Folio fiscal (UUID): ' + d.uuid + (d.pdfBase64 ? ' — puedes descargar el PDF abajo.' : ' — te la enviamos por correo.'));
      } else {
        setSt('No se pudo generar la factura: ' + ((d && d.error) || 'error desconocido') + '. Revisa que tus datos coincidan EXACTO con tu Constancia de Situación Fiscal del SAT.');
      }
    } catch (e) { setSt('No se pudo procesar: ' + e.message); }
    setBusy(false);
  };
  return (
    <div className="card">
      <div className="card-title">Datos de facturación (CFDI)</div>
      {activo ? (
        <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 12, lineHeight: 1.5 }}>
          Captura tus datos fiscales (deben coincidir con tu Constancia de Situación Fiscal del SAT) y presiona <b>Facturar</b> para generar tu factura.
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 12, lineHeight: 1.5 }}>
          Puedes dejar aquí guardados tus datos fiscales. La <b>facturación en línea estará disponible muy pronto</b>; en cuanto se active, podrás generar tu factura desde aquí.
        </div>
      )}
      {!activo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FBF4EF', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 12px', marginBottom: 12, fontSize: 12, color: 'var(--stone)' }}>
          <span aria-hidden style={{ fontSize: 14 }}>🕓</span>
          <span>Facturación <b>próximamente</b>. Por ahora el botón está deshabilitado.</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <label><span style={lbl}>RFC</span><input style={inp} value={f.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())} placeholder="XAXX010101000" /></label>
        <label><span style={lbl}>Código postal (fiscal)</span><input style={inp} value={f.cp} onChange={e => set('cp', e.target.value.replace(/[^0-9]/g, '').slice(0, 5))} placeholder="00000" inputMode="numeric" /></label>
        <label style={{ gridColumn: '1 / -1' }}><span style={lbl}>Razón social / Nombre (como en el SAT)</span><input style={inp} value={f.razonSocial} onChange={e => set('razonSocial', e.target.value)} placeholder="Nombre o razón social, sin régimen societario" /></label>
        <label><span style={lbl}>Régimen fiscal</span>
          <select style={inp} value={f.regimen} onChange={e => set('regimen', e.target.value)}>
            <option value="">Selecciona…</option>
            {REGIMENES_FISCALES.map(r => <option key={r.clave} value={r.clave}>{r.nombre}</option>)}
          </select></label>
        <label><span style={lbl}>Uso del CFDI</span>
          <select style={inp} value={f.usoCFDI} onChange={e => set('usoCFDI', e.target.value)}>
            {USOS_CFDI.map(u => <option key={u.clave} value={u.clave}>{u.nombre}</option>)}
          </select></label>
        <label style={{ gridColumn: '1 / -1' }}><span style={lbl}>Correo para la factura (opcional)</span><input style={inp} value={f.correoFactura} onChange={e => set('correoFactura', e.target.value)} placeholder={correo || 'correo@ejemplo.com'} /></label>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button onClick={facturar} disabled={busy || !activo}
          title={activo ? 'Generar tu factura' : 'La facturación en línea aún no está disponible'}
          style={{ background: activo ? 'var(--gold)' : '#e8ddd4', color: activo ? '#fff' : 'var(--stone)', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 700, fontSize: 13.5, cursor: (busy || !activo) ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', opacity: (busy || !activo) ? 0.75 : 1 }}>
          {busy ? 'Procesando…' : 'Facturar'}
        </button>
        <button onClick={soloGuardar} disabled={busy}
          style={{ background: '#fff', color: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          Guardar datos
        </button>
        {factura && factura.pdfBase64 && (
          <button onClick={descargarPDF}
            style={{ background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Descargar PDF
          </button>
        )}
      </div>
      {st && <div style={{ fontSize: 12.5, color: 'var(--stone)', marginTop: 10, lineHeight: 1.5 }}>{st}</div>}
    </div>
  );
}
export default function PacienteDashboard() {
  const { user } = useAuth();
  const { colors } = useBranding();
  const [tab, setTab] = useState('inicio');
  const [citas, setCitas] = useState([]);
  const [expediente, setExpediente] = useState(null);
  const [creditos, setCreditos] = useState({ lotes: [], usos: [] });
  const [paquetesCfg, setPaquetesCfg] = useState(PAQUETES_DEFAULT);
  const [compraMsg, setCompraMsg] = useState('');
  const [compraBusy, setCompraBusy] = useState('');
  const [modalCita, setModalCita] = useState(null);
  const [confirmarCancel, setConfirmarCancel] = useState(false);
  const [reagendando, setReagendando] = useState(null);
  const [pagoMsg, setPagoMsg] = useState('');
  const [recoPdfMsg, setRecoPdfMsg] = useState('');
  const [visor, setVisor] = useState(null);   // { url, nombre } del documento abierto dentro de la app
  const [visorMsg, setVisorMsg] = useState('');
  // Abre cualquier archivo del paciente DENTRO de la app (visor con /preview), nunca en Drive.
  const abrirArchivo = (link, nombre) => {
    const p = parseDriveLink(link);
    if (p.kind === 'folder') { setVisorMsg('Ese enlace es de una carpeta, no de un archivo. Pídele a tu nutrióloga el enlace del documento.'); return; }
    if (!p.url) { setVisorMsg('No se pudo abrir el documento. Inténtalo de nuevo o avisa a tu nutrióloga.'); return; }
    setVisor({ url: p.url, nombre: nombre || 'Documento' });
  };
  const [secAbierta, setSecAbierta] = useState({ plan: true, isak: false, inbody: false, estudios: false });
  const toggleSec = (id) => setSecAbierta(s => ({ ...s, [id]: !s[id] }));
  const [estudioBusy, setEstudioBusy] = useState(false);
  const [estudioMsg, setEstudioMsg] = useState('');
  const estudioInputRef = useRef(null);
  const [uploadBusy, setUploadBusy] = useState('');
  const [uploadMsg, setUploadMsg] = useState({});
  const isakInputRef = useRef(null);
  const inbodyInputRef = useRef(null);

  // Al volver de Stripe: confirma el pago y agenda (o cancela si se abandonó el pago).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pago = params.get('pago');
    const compra = params.get('compra');
    if (!pago && !compra) return;
    const citaId = params.get('cita');
    const session = params.get('session');
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    const limpiarUrl = () => window.history.replaceState({}, '', window.location.pathname);
    (async () => {
      try {
        if (compra === 'paquete') {
          const paqueteId = params.get('paquete');
          const correoC = (user?.email || '').toLowerCase();
          if (paqueteId && session && url && correoC) {
            const rv = await fetch(url, {
              method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'verificarPagoStripe', sessionId: session }), redirect: 'follow',
            });
            let dv; try { dv = JSON.parse(await rv.text()); } catch (_) { dv = null; }
            if (dv && dv.ok && dv.pagado) {
              let pkgs = PAQUETES_DEFAULT;
              try { const cs = await getDoc(doc(db, 'config', 'dashboard')); const cd = cs.exists() ? cs.data() : {}; if (Array.isArray(cd.paquetes) && cd.paquetes.length) pkgs = cd.paquetes; } catch (e) {}
              const pkg = pkgs.find(p => p.id === paqueteId);
              if (pkg) {
                const cc = await getDoc(doc(db, 'creditosConsultas', correoC));
                const cur = cc.exists() ? { lotes: [], usos: [], ...cc.data() } : { lotes: [], usos: [] };
                // Idempotencia: no acreditar dos veces la misma sesión de pago (p. ej. si recarga la página).
                if (!(cur.lotes || []).some(l => l.stripeSession === session)) {
                  const lote = { ...nuevoLote({ familia: pkg.familia, consultas: pkg.consultas, monto: pkg.precio, vigenciaMeses: pkg.vigenciaMeses, origen: 'stripe', paqueteId: pkg.id, paqueteNombre: pkg.nombre }), stripeSession: session };
                  await setDoc(doc(db, 'creditosConsultas', correoC), { correo: correoC, lotes: [...(cur.lotes || []), lote], usos: cur.usos || [] }, { merge: true });
                }
                setPagoMsg('¡Pago confirmado! Se agregaron ' + pkg.consultas + ' consultas a tu saldo. Ya puedes agendarlas.');
              } else {
                setPagoMsg('Tu pago se recibió, pero no encontramos el paquete. Avísale a la nutrióloga para acreditarlo.');
              }
            } else {
              setPagoMsg('Recibimos tu regreso del pago, pero aún no podemos confirmar el cobro. Si el cargo se realizó, tu saldo se reflejará en breve.');
            }
          }
          limpiarUrl();
          return;
        }
        if (compra === 'cancelada') {
          setPagoMsg('La compra del paquete no se completó. Puedes intentarlo de nuevo cuando quieras.');
          limpiarUrl();
          return;
        }
        if (pago === 'ok' && citaId && session && url) {
          const res = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'verificarPagoStripe', sessionId: session }), redirect: 'follow',
          });
          let d; try { d = JSON.parse(await res.text()); } catch (_) { d = null; }
          if (d && d.ok && d.pagado) {
            await updateDoc(doc(db, 'citas', citaId), { estado: 'confirmada', estadoPago: 'pagado' });
            // Ya con el pago confirmado, crea el evento de Calendar + correo de confirmación.
            try {
              const snap = await getDoc(doc(db, 'citas', citaId));
              const c = snap.exists() ? snap.data() : null;
              if (c && !c.eventId) {
                const r2 = await fetch(url, {
                  method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'crearCita', paciente: c.pacienteNombre, correo: c.pacienteEmail, fecha: c.fecha, hora: c.hora, dur: c.dur, tipoNombre: c.tipoNombre, online: c.online, objetivo: c.objetivo, notas: c.notas }), redirect: 'follow',
                });
                let d2; try { d2 = JSON.parse(await r2.text()); } catch (_) { d2 = null; }
                if (d2 && d2.eventId) { try { await updateDoc(doc(db, 'citas', citaId), { eventId: d2.eventId }); } catch (e) {} }
              }
            } catch (e) { /* el evento/correo es secundario; la cita ya quedó pagada */ }
            setPagoMsg('¡Pago confirmado! Tu cita quedó agendada. Te llegará el correo de confirmación.');
          } else {
            setPagoMsg('Recibimos tu regreso de la página de pago, pero todavía no podemos confirmar el cobro. Si el cargo se realizó, tu cita se reflejará en breve; si no, puedes intentar agendar de nuevo.');
          }
        } else if (pago === 'cancelado' && citaId) {
          try { await updateDoc(doc(db, 'citas', citaId), { estado: 'cancelada', estadoPago: 'cancelado' }); } catch (e) {}
          setPagoMsg('El pago no se completó, así que la cita no quedó agendada. Puedes intentarlo de nuevo cuando quieras.');
        }
      } catch (e) {
        setPagoMsg('Ocurrió un detalle al confirmar el pago. Si el cargo se realizó, tu cita se reflejará en breve.');
      }
      limpiarUrl();
    })();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'citas'), where('pacienteEmail', '==', user.email));
    return onSnapshot(q, snap => setCitas(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.fecha.localeCompare(b.fecha))));
  }, [user]);

  // Saldo de consultas (paquetes) del paciente, por su correo de sesión.
  useEffect(() => {
    const correo = (user?.email || '').toLowerCase();
    if (!correo) return undefined;
    return onSnapshot(doc(db, 'creditosConsultas', correo), snap => {
      setCreditos(snap.exists() ? { lotes: [], usos: [], ...snap.data() } : { lotes: [], usos: [] });
    }, () => setCreditos({ lotes: [], usos: [] }));
  }, [user]);

  // Paquetes disponibles para comprar (desde la configuración).
  useEffect(() => onSnapshot(doc(db, 'config', 'dashboard'), snap => {
    const d = (snap && snap.data()) || {};
    setPaquetesCfg(Array.isArray(d.paquetes) && d.paquetes.length ? d.paquetes : PAQUETES_DEFAULT);
  }, () => {}), []);

  // Aplica la preferencia de colores del paciente (capa por encima de la marca) en toda su vista.
  useEffect(() => {
    const personal = (expediente && expediente.coloresPersonales) || null;
    aplicarColores(personal ? { ...colors, ...personal } : colors);
  }, [colors, expediente]);

  // Vincula el expediente del paciente con su cuenta por el correo de sesión.
  useEffect(() => {
    if (!user?.email) return;
    const q = query(collection(db, 'pacientes'), where('correo', '==', user.email.toLowerCase()));
    return onSnapshot(q,
      snap => {
        if (!snap.docs.length) { setExpediente(null); return; }
        // Si por error hubiera más de un expediente con el mismo correo,
        // elegimos de forma determinista el más completo (no uno al azar),
        // para no cruzar datos entre registros.
        const cand = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const score = e => (e.mediciones || []).length + (e.recomendaciones || []).length +
          (e.planes || []).length + (e.bitacora || []).length + (e.isak || []).length;
        cand.sort((a, b) => score(b) - score(a) || String(a.id).localeCompare(String(b.id)));
        setExpediente(cand[0]);
      },
      () => setExpediente(null));
  }, [user]);

  const hoyKey = new Date().toISOString().slice(0, 10);
  const ahoraMs = Date.now();
  const yaPaso = (c) => { const dt = new Date(c.fecha + 'T' + (c.hora || '23:59') + ':00'); return !isNaN(dt.getTime()) && dt.getTime() < ahoraMs; };
  const proxima = citas.find(c => c.fecha >= hoyKey && c.estado !== 'cancelada' && !yaPaso(c));
  const nombre = user?.displayName?.split(' ')[0] || 'bienvenida';
  const saldoResumen = resumenSaldo(creditos, new Date().toISOString());
  const tieneSaldo = (saldoResumen.normal.lotes.length + saldoResumen.deportiva.lotes.length) > 0;

  const comprarPaquete = async (pkg) => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    const correo = (user?.email || '').toLowerCase();
    if (!url || !correo) { setCompraMsg('No se pudo iniciar la compra. Intenta más tarde.'); return; }
    if (!(pkg.precio > 0)) { setCompraMsg('Este paquete no tiene precio configurado.'); return; }
    setCompraBusy(pkg.id); setCompraMsg('');
    try {
      const base = window.location.origin;
      const successUrl = base + '/?compra=paquete&paquete=' + encodeURIComponent(pkg.id) + '&session={CHECKOUT_SESSION_ID}';
      const cancelUrl = base + '/?compra=cancelada';
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'crearCheckoutStripe', montoCentavos: Math.round(pkg.precio * 100), descripcion: 'Paquete ' + pkg.nombre, correo, citaId: 'pkg_' + pkg.id + '_' + Date.now(), successUrl, cancelUrl }), redirect: 'follow',
      });
      let dp; try { dp = JSON.parse(await res.text()); } catch (_) { dp = null; }
      if (dp && dp.ok && dp.url) { window.location.href = dp.url; return; }
      setCompraMsg('No se pudo iniciar el pago: ' + ((dp && dp.error) || 'intenta de nuevo.'));
    } catch (e) { setCompraMsg('No se pudo iniciar el pago. Intenta de nuevo.'); }
    setCompraBusy('');
  };

  const generarPDFReco = async (reco) => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRecoPdfMsg('No se pudo generar el PDF (configuración del servidor).'); return; }
    if (!reco || !(reco.texto || reco.estudios || reco.suplementos || reco.ejercicio || reco.hidratacion || reco.generales)) { setRecoPdfMsg('No hay recomendación para generar el PDF.'); return; }
    setRecoPdfMsg('Generando tu PDF…');
    try {
      const nombrePac = expediente?.nombre || user?.displayName || 'Paciente';
      const html = buildRecomendacionesHTML({ nombre: nombrePac, recomendaciones: [reco], fecha: Date.now(), suplementacion: expediente?.historia?.suplementacion });
      const stamp = (reco.fecha && !isNaN(new Date(reco.fecha).getTime())) ? new Date(reco.fecha).getTime() : Date.now();
      const filename = `Recomendacion_${String(nombrePac).replace(/[^\w-]+/g, '_')}_${stamp}.pdf`;
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveRecomendaciones', patient: nombrePac, correo: (expediente?.correo || user?.email || '').toLowerCase(), filename, html }),
        redirect: 'follow',
      });
      let d; try { d = JSON.parse(await res.text()); } catch (_) { d = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (!d.ok || !d.link) throw new Error(d.error || 'No se recibió el enlace del PDF.');
      setRecoPdfMsg('');
      abrirArchivo(d.link, 'Recomendación');
    } catch (e) {
      setRecoPdfMsg('No se pudo generar el PDF. Intenta de nuevo.');
    }
  };

  // Cancelación en servidor (sin confirm; la confirmación es la ventanilla).
  const ejecutarCancelacion = async (c) => {
    if (!c || c.estado === 'cancelada') return;
    try {
      await updateDoc(doc(db, 'citas', c.id), { estado: 'cancelada' });
      const url = process.env.REACT_APP_APPSCRIPT_URL;
      if (url) {
        try {
          await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'cancelarCita',
              eventId: c.eventId || '',
              correo: (c.pacienteEmail || user.email || '').toLowerCase(),
              paciente: c.pacienteNombre || nombre,
              fecha: c.fecha,
              hora: c.hora,
              tipoNombre: c.tipoNombre || c.motivo || '',
              online: !!c.online,
              canceladoPor: 'paciente',
            }), redirect: 'follow',
          });
        } catch (e) { /* secundario: ya quedó cancelada */ }
      }
    } catch (e) { alert('No se pudo cancelar: ' + e.message); }
  };

  // ¿Faltan 24 h o más para la cita? (define si puede reagendar)
  const horasFaltantes = (c) => {
    if (!c) return 0;
    const dt = new Date(c.fecha + 'T' + (c.hora || '00:00') + ':00');
    return (dt.getTime() - Date.now()) / 3600000;
  };
  const puedeReagendar = (c) => horasFaltantes(c) >= 24;

  // Botones de la ventanilla
  const pedirConfirmacion = () => setConfirmarCancel(true);
  const confirmarCancelar = async () => { const c = modalCita; setModalCita(null); setConfirmarCancel(false); await ejecutarCancelacion(c); };
  const cerrarModal = () => { setModalCita(null); setConfirmarCancel(false); };
  const iniciarReagendar = () => { const c = modalCita; setModalCita(null); setConfirmarCancel(false); setReagendando(c); setTab('agendar'); };

  const fmtFecha = (key) => {
    if (!key) return '';
    const [y, m, d] = key.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase());
  };

  const planes = expediente && Array.isArray(expediente.planes) ? [...expediente.planes].reverse() : [];
  const medics = expediente && Array.isArray(expediente.mediciones) ? expediente.mediciones : [];
  const ultMed = medics.length ? medics[medics.length - 1] : null;
  const apegoData = (expediente && Array.isArray(expediente.bitacora) ? expediente.bitacora : [])
    .filter(b => typeof b.apego === 'number')
    .map(b => { const d = new Date(b.fecha); const iso = isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return { fecha: iso, apego: b.apego }; });
  const ultApego = apegoData.length ? apegoData[apegoData.length - 1].apego : null;

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg> },
    { id: 'agendar', label: 'Agendar', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg> },
    { id: 'planes', label: 'Mis archivos', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg> },
    { id: 'recomendaciones', label: 'Recomendaciones', icon: <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg> },
  ];

  const navEl = (
    <nav className="bottomnav">
      {tabs.map(t => (
        <button key={t.id} className={`nav-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
      <div className="nav-spacer" />
      <button className={`nav-item${tab === 'perfil' ? ' active' : ''}`} onClick={() => setTab('perfil')}>
        <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
        <span>Mi perfil</span>
      </button>
    </nav>
  );

  if (tab === 'perfil') {
    return (
      <div className="app">
        <Topbar role="paciente" user={user} onPerfil={() => setTab('perfil')} />
        <div className="content">
          <PerfilPaciente onBack={() => setTab('inicio')} />
          <AparienciaPaciente expediente={expediente} brandColors={colors} />
        </div>
        {navEl}
      </div>
    );
  }

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const subirEstudio = async (file) => {
    if (!file) return;
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setEstudioMsg('No está configurada la conexión para subir archivos.'); return; }
    if (!expediente) { setEstudioMsg('Tu cuenta aún no está vinculada a un expediente.'); return; }
    setEstudioBusy(true); setEstudioMsg('Subiendo…');
    try {
      const b64 = await fileToBase64(file);
      const fecha = new Date().toISOString().slice(0, 10);
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const filename = 'Estudio_' + (expediente.codigo || '') + '_' + fecha + '.' + ext;
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveEstudio', patient: expediente.nombre || '', correo: (expediente.correo || user.email || ''), filename, mime: file.type || 'application/pdf', fileBase64: b64 }),
        redirect: 'follow',
      });
      const data = await resp.json().catch(() => null);
      if (!data || !data.ok || !data.link) throw new Error((data && data.error) || 'No se recibió el enlace del archivo.');
      const arr = [...(expediente.estudios || []), { nombre: file.name || filename, fecha, link: data.link }];
      await updateDoc(doc(db, 'pacientes', expediente.id), { estudios: arr });
      setEstudioMsg('Estudio cargado ✓');
    } catch (e) { setEstudioMsg('No se pudo cargar: ' + e.message); }
    setEstudioBusy(false);
    if (estudioInputRef.current) estudioInputRef.current.value = '';
  };

  // Subidor genérico para ISAK e InBody (mismo comportamiento que estudios, a su carpeta/arreglo).
  const UPLOAD_CFG = {
    isak:   { action: 'saveISAK',   campo: 'isak',           prefijo: 'ISAK' },
    inbody: { action: 'leerInBody', campo: 'inbodyArchivos', prefijo: 'InBody' },
  };
  const subirArchivoExtra = async (file, tipo) => {
    if (!file) return;
    const cfg = UPLOAD_CFG[tipo];
    if (!cfg) return;
    const setMsg = (m) => setUploadMsg(s => ({ ...s, [tipo]: m }));
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setMsg('No está configurada la conexión para subir archivos.'); return; }
    if (!expediente) { setMsg('Tu cuenta aún no está vinculada a un expediente.'); return; }
    setUploadBusy(tipo); setMsg('Subiendo…');
    try {
      const b64 = await fileToBase64(file);
      const fecha = new Date().toISOString().slice(0, 10);
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const filename = cfg.prefijo + '_' + (expediente.codigo || '') + '_' + fecha + '.' + ext;
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: cfg.action, patient: expediente.nombre || '', correo: (expediente.correo || user.email || ''), filename, mime: file.type || 'application/pdf', fileBase64: b64, pdfBase64: b64 }),
        redirect: 'follow',
      });
      const data = await resp.json().catch(() => null);
      if (!data || !data.ok || !data.link) throw new Error((data && data.error) || 'No se recibió el enlace del archivo.');
      const arr = [...(expediente[cfg.campo] || []), { nombre: file.name || filename, fecha, link: data.link }];
      await updateDoc(doc(db, 'pacientes', expediente.id), { [cfg.campo]: arr });
      setMsg('Archivo cargado ✓');
    } catch (e) { setMsg('No se pudo cargar: ' + e.message); }
    setUploadBusy('');
    const ref = tipo === 'isak' ? isakInputRef : inbodyInputRef;
    if (ref.current) ref.current.value = '';
  };

  // Fila con botón de subida (misma apariencia que la de estudios).
  const uploadUI = (tipo, label, aceptaImagen) => {
    const ref = tipo === 'isak' ? isakInputRef : inbodyInputRef;
    const busy = uploadBusy === tipo;
    const msg = uploadMsg[tipo];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <input ref={ref} type="file" accept={aceptaImagen ? 'application/pdf,image/*' : 'application/pdf'} style={{ display: 'none' }}
          onChange={e => subirArchivoExtra(e.target.files && e.target.files[0], tipo)} />
        <button onClick={() => ref.current && ref.current.click()} disabled={busy || !expediente}
          style={{ background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: (busy || !expediente) ? 'default' : 'pointer', opacity: (busy || !expediente) ? 0.6 : 1, fontFamily: 'var(--font)' }}>
          {busy ? 'Subiendo…' : label}
        </button>
        {msg ? <span style={{ fontSize: 12.5, color: 'var(--stone)' }}>{msg}</span> : null}
      </div>
    );
  };

  const secHeader = (id, titulo) => (
    <button onClick={() => toggleSec(id)}
      style={{ width: '100%', background: 'var(--dark)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px 14px', borderRadius: 10, letterSpacing: 0.3, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font)' }}>
      <span>{titulo}</span>
      <span style={{ display: 'inline-block', transition: 'transform .15s', transform: secAbierta[id] ? 'rotate(90deg)' : 'none', fontSize: 12 }}>▸</span>
    </button>
  );
  const listaArchivos = (items, vacio, etiqueta) => {
    const arr = Array.isArray(items) ? [...items].reverse() : [];
    if (arr.length === 0) return <div className="empty-state">{vacio}</div>;
    return arr.map((r, i) => (
      <div className="cita-item" key={i}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--dark)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>PDF</div>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <div className="cita-nombre">{r.nombre || etiqueta}</div>
          <div className="cita-motivo">{r.fecha ? fmtFecha(r.fecha) : ''}</div>
        </div>
        {r.link
          ? <button onClick={() => abrirArchivo(r.link, r.nombre || etiqueta)} style={{ background: 'var(--gold)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>Abrir</button>
          : <span style={{ fontSize: 11, color: 'var(--stone)' }}>Sin archivo</span>}
      </div>
    ));
  };

  return (
    <div className="app">
      {pagoMsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,12,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }} onClick={() => setPagoMsg('')}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '24px 22px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 18px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>Pago</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--dark)', margin: 0 }}>{pagoMsg}</p>
            <button onClick={() => setPagoMsg('')} style={{ marginTop: 16, background: '#CDA788', color: '#211C17', border: 'none', borderRadius: 11, padding: '11px 22px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font)' }}>Entendido</button>
          </div>
        </div>
      )}
      {visor && (
        <div style={{ position: 'fixed', inset: 0, background: '#1a1612', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: '#1a1612', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
            <span style={{ color: '#EEE4DA', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{visor.nombre}</span>
            <button onClick={() => setVisor(null)}
              style={{ background: 'var(--gold)', color: '#211C17', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>
              ✕ Cerrar
            </button>
          </div>
          <iframe
            title={visor.nombre}
            src={visor.url}
            style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
            sandbox="allow-scripts allow-same-origin"
            allow="autoplay"
          />
        </div>
      )}
      {visorMsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,12,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 2100 }} onClick={() => setVisorMsg('')}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '24px 22px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 18px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>Documento</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--dark)', margin: 0 }}>{visorMsg}</p>
            <button onClick={() => setVisorMsg('')} style={{ marginTop: 16, background: '#CDA788', color: '#211C17', border: 'none', borderRadius: 11, padding: '11px 22px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font)' }}>Entendido</button>
          </div>
        </div>
      )}
      <Topbar role="paciente" user={user} onPerfil={() => setTab('perfil')} />

      <div className="content">
        {tab === 'inicio' && (
          <>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--dark)', margin: '4px 4px 16px', fontFamily: 'var(--font)', letterSpacing: 0.2 }}>¡Hola, {nombre}!</h1>
            <div className="card">
              <div className="card-title">Próximas citas</div>
              {proxima ? (
                <div className="cita-item" style={{ paddingTop: 0, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="cita-hora">{proxima.hora}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cita-nombre">{proxima.tipoNombre || proxima.motivo}</div>
                      <div className="cita-motivo">Tu próxima cita · {fmtFecha(proxima.fecha)}</div>
                    </div>
                    <span className={`badge b-${proxima.estado === 'confirmada' ? 'confirm' : proxima.estado === 'cancelada' ? 'cancel' : 'pending'}`}>{proxima.estado}</span>
                  </div>
                  {(proxima.estadoPago || proxima.estado !== 'cancelada') && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      {proxima.estadoPago ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: proxima.estadoPago === 'pagado' ? '#E9F1ED' : '#F7EAE5', color: proxima.estadoPago === 'pagado' ? '#3E6B5B' : '#B0593F' }}>
                            {proxima.estadoPago === 'pagado' ? 'Pagado' : 'Pendiente de pago'}
                          </span>
                          {proxima.metodoPago && METODO_LABEL[proxima.metodoPago] && proxima.estadoPago !== 'pagado' && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--stone)' }}>· {METODO_LABEL[proxima.metodoPago]}</span>
                          )}
                        </span>
                      ) : <span />}
                      {proxima.estado !== 'cancelada' && (
                        <button onClick={() => setModalCita(proxima)} title="Cancelar o reagendar"
                          style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #B0593F', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#B0593F', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">No tienes citas próximas</div>
              )}
            </div>

            {tieneSaldo && (
              <div className="card">
                <div className="card-title">Tus consultas de paquete</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {['normal', 'deportiva'].map(f => (
                    saldoResumen[f].lotes.length ? (
                      <div key={f} style={{ background: 'var(--cream)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--stone)' }}>{familiaLabel(f)}</div>
                        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.1 }}>{saldoResumen[f].disponible}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--stone)' }}> disponible{saldoResumen[f].disponible === 1 ? '' : 's'}</span></div>
                        {(() => {
                          const venc = saldoResumen[f].lotes.map(l => venceDeLote(l)).filter(Boolean).sort();
                          return venc.length
                            ? <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 2 }}>Próximo vencimiento: {new Date(venc[0]).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            : <div style={{ fontSize: 12, color: 'var(--stone)', marginTop: 2 }}>Vence a partir de tu 1ª consulta.</div>;
                        })()}
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}

            {paquetesCfg.length > 0 && (
              <div className="card">
                <div className="card-title">Comprar paquete de consultas</div>
                <div style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 12, lineHeight: 1.5 }}>Paga en línea y tus consultas se agregan al instante. La vigencia empieza a correr desde tu primera consulta.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                  {paquetesCfg.map(pk => (
                    <div key={pk.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{pk.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--stone)' }}>{pk.consultas} consultas · {familiaLabel(pk.familia)} · vigencia {pk.vigenciaMeses} meses</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)' }}>{'$' + Number(pk.precio || 0).toLocaleString('es-MX')}</div>
                      <button onClick={() => comprarPaquete(pk)} disabled={compraBusy === pk.id}
                        style={{ marginTop: 4, background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        {compraBusy === pk.id ? 'Redirigiendo…' : 'Comprar'}
                      </button>
                    </div>
                  ))}
                </div>
                {compraMsg && <div style={{ fontSize: 12.5, color: 'var(--stone)', marginTop: 10 }}>{compraMsg}</div>}
              </div>
            )}

            <DatosFacturacion email={user.email} />

            <h2 style={D.section}>Tu progreso</h2>
            <div style={D.grid}>
              <div style={D.tile}>
                <div style={D.tileTitle}>Peso</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.peso === 'number' ? ultMed.peso : '—'}<span style={D.tileUnit}> kg</span></div>
                <Linea data={medics} field="peso" color="var(--gold)" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>% de grasa</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.grasa === 'number' ? ultMed.grasa : '—'}<span style={D.tileUnit}> %</span></div>
                <Linea data={medics} field="grasa" color="var(--stone)" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>Masa muscular</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.musculo === 'number' ? ultMed.musculo : '—'}<span style={D.tileUnit}> kg</span></div>
                <Linea data={medics} field="musculo" color="var(--sage)" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>Masa grasa</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.grasaKg === 'number' ? ultMed.grasaKg : '—'}<span style={D.tileUnit}> kg</span></div>
                <Linea data={medics} field="grasaKg" color="#B0593F" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>Grasa visceral</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.visceral === 'number' ? ultMed.visceral : '—'}</div>
                <Linea data={medics} field="visceral" color="#36302B" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>Agua corporal total</div>
                <div style={D.tileValue}>{ultMed && typeof ultMed.agua === 'number' ? ultMed.agua : '—'}<span style={D.tileUnit}> L</span></div>
                <Linea data={medics} field="agua" color="#5B7C99" unit="" />
              </div>
              <div style={D.tile}>
                <div style={D.tileTitle}>Apego al plan</div>
                <div style={D.tileValue}>{ultApego != null ? ultApego : '—'}<span style={D.tileUnit}> %</span></div>
                <Linea data={apegoData} field="apego" color="#3E6B5B" unit="%" />
              </div>
            </div>

            <h2 style={D.section}>Accesos rápidos</h2>
            <div style={D.gridAcc}>
              <button style={D.access} onClick={() => setTab('agendar')}>
                {IconAgendar}
                <span style={D.accessLabel}>Agendar cita</span>
                <span style={D.accessSub}>Reserva tu próxima consulta</span>
              </button>
              <button style={D.access} onClick={() => setTab('planes')}>
                {IconPlan}
                <span style={D.accessLabel}>Mis archivos</span>
                <span style={D.accessSub}>Consulta tus archivos relevantes</span>
              </button>
              <button style={D.access} onClick={() => setTab('recomendaciones')}>
                {IconRecom}
                <span style={D.accessLabel}>Recomendaciones</span>
                <span style={D.accessSub}>Consejos para tu proceso</span>
              </button>
            </div>
          </>
        )}

        {tab === 'agendar' && (
          <Agenda isNutri={false} reagendarDe={reagendando} onReagendado={() => { setReagendando(null); setTab('inicio'); }} onSolicitarCancelar={(c) => setModalCita(c)} />
        )}

        {tab === 'planes' && (
          <div className="card">
            <button onClick={() => setTab('inicio')}
              style={{ background: '#fff', border: '0.5px solid var(--border)', color: 'var(--dark)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 14px', borderRadius: 8, marginBottom: 14 }}>
              ← Atrás
            </button>

            <div style={{ marginBottom: 12 }}>
              {secHeader('plan', 'Mi plan alimenticio')}
              {secAbierta.plan && (
                <div style={{ marginTop: 14 }}>
                  {expediente && expediente.plan && expediente.plan.totales && (
                    <div style={{ background: 'var(--cream)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>Tu plan</div>
                      <div style={{ fontSize: '15px', color: 'var(--dark)', fontWeight: 700, marginTop: '2px' }}>
                        {expediente.plan.totales.kcal} kcal al día
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--stone)', marginTop: '2px' }}>
                        HC {expediente.plan.totales.hc} g · Proteína {expediente.plan.totales.prot} g · Grasa {expediente.plan.totales.lip} g
                      </div>
                    </div>
                  )}
                  {!expediente ? (
                    <div className="empty-state">
                      <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>🥗</div>
                      Aún no hay un plan vinculado a esta cuenta.<br />
                      Pídele a tu nutrióloga que registre tu correo: <strong>{user.email}</strong>
                    </div>
                  ) : planes.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>🥗</div>
                      Tu plan estará disponible aquí en cuanto tu nutrióloga lo genere.
                    </div>
                  ) : (
                    planes.map((p, i) => (
                      <div className="cita-item" key={i}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--dark)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>PDF</div>
                        <div style={{ flex: 1, marginLeft: '12px' }}>
                          <div className="cita-nombre">{p.nombre || 'Plan nutricional'}</div>
                          <div className="cita-motivo">{p.fecha ? fmtFecha(p.fecha) : ''}</div>
                        </div>
                        {p.link
                          ? <button onClick={() => abrirArchivo(p.link, p.nombre || 'Plan nutricional')} style={{ background: 'var(--gold)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>Abrir</button>
                          : <span style={{ fontSize: '11px', color: 'var(--stone)' }}>Sin archivo</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              {secHeader('isak', 'Reportes ISAK')}
              {secAbierta.isak && <div style={{ marginTop: 14 }}>{uploadUI('isak', '+ Subir reporte ISAK (PDF)', false)}{listaArchivos(expediente && expediente.isak, 'Aún no tienes reportes ISAK.', 'Reporte ISAK')}</div>}
            </div>

            <div style={{ marginBottom: 12 }}>
              {secHeader('inbody', 'InBody')}
              {secAbierta.inbody && <div style={{ marginTop: 14 }}>{uploadUI('inbody', '+ Subir InBody (PDF o imagen)', true)}{listaArchivos(expediente && expediente.inbodyArchivos, 'Aún no tienes reportes InBody.', 'Reporte InBody')}</div>}
            </div>

            <div>
              {secHeader('estudios', 'Estudios clínicos')}
              {secAbierta.estudios && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    <input ref={estudioInputRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }}
                      onChange={e => subirEstudio(e.target.files && e.target.files[0])} />
                    <button onClick={() => estudioInputRef.current && estudioInputRef.current.click()} disabled={estudioBusy || !expediente}
                      style={{ background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: (estudioBusy || !expediente) ? 'default' : 'pointer', opacity: (estudioBusy || !expediente) ? 0.6 : 1, fontFamily: 'var(--font)' }}>
                      {estudioBusy ? 'Subiendo…' : '+ Subir estudio (PDF o imagen)'}
                    </button>
                    {estudioMsg ? <span style={{ fontSize: 12.5, color: 'var(--stone)' }}>{estudioMsg}</span> : null}
                  </div>
                  {listaArchivos(expediente && expediente.estudios, 'Aún no tienes estudios clínicos.', 'Estudio clínico')}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'recomendaciones' && (
          <div className="card">
            <button onClick={() => setTab('inicio')}
              style={{ background: '#fff', border: '0.5px solid var(--border)', color: 'var(--dark)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 14px', borderRadius: 8, marginBottom: 14 }}>
              ← Atrás
            </button>
            <div className="card-title">Recomendaciones</div>
            <div style={{ margin: '4px 0 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: 'var(--stone)' }}>Genera el PDF de cada recomendación con su botón.</span>
              {recoPdfMsg && <span style={{ fontSize: 12, color: 'var(--stone)' }}>{recoPdfMsg}</span>}
            </div>
            {(!expediente || !Array.isArray(expediente.recomendaciones) || expediente.recomendaciones.length === 0) ? (
              <div className="empty-state">
                <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>💡</div>
                Aún no tienes recomendaciones. Tu nutrióloga las publicará aquí cuando las tenga listas.
              </div>
            ) : (
              [...expediente.recomendaciones].reverse().map((r, i) => {
                const secs = [['estudios', 'Estudios'], ['suplementos', 'Suplementos'], ['ejercicio', 'Ejercicio'], ['hidratacion', 'Hidratación'], ['generales', 'Generales']]
                  .filter(([k]) => (r[k] || '').toString().trim());
                return (
                <div key={i} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10, background: 'var(--cream)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 5 }}>{fmtSello(r.fecha)}</div>
                      {secs.length > 0
                        ? secs.map(([k, t]) => (
                          <div key={k} style={{ marginTop: 7 }}>
                            <div style={{ fontSize: 10.5, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{t}</div>
                            <div className="reco-rich" style={{ fontSize: 13.5, color: 'var(--dark)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: renderRich(r[k]) }} />
                          </div>))
                        : <div className="reco-rich" style={{ fontSize: 13.5, color: 'var(--dark)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: renderRich(r.texto) }} />}
                    </div>
                    <button onClick={() => generarPDFReco(r)} title="Generar PDF de esta recomendación"
                      style={{ background: '#221C16', color: '#EEE4DA', border: 'none', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      PDF
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {modalCita && (
        <div onClick={cerrarModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, padding: '22px 20px', fontFamily: 'var(--font)' }}>

            {!confirmarCancel ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>¿Cancelar o reagendar tu cita?</div>
                <div style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.5, marginBottom: 16 }}>
                  {fmtFecha(modalCita.fecha)} a las {modalCita.hora}.
                </div>

                {!puedeReagendar(modalCita) && (
                  <div style={{ background: '#fbeae6', color: '#B0593F', fontSize: 11.5, padding: '9px 11px', borderRadius: 8, marginBottom: 14, lineHeight: 1.45 }}>
                    Ya no es posible reagendar: falta menos de 24 h para tu cita. Según las políticas, una cancelación a destiempo o inasistencia se penaliza con el importe total de la consulta.
                  </div>
                )}

                <button onClick={iniciarReagendar} disabled={!puedeReagendar(modalCita)}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', marginBottom: 9, cursor: puedeReagendar(modalCita) ? 'pointer' : 'not-allowed', border: 'none', background: puedeReagendar(modalCita) ? 'var(--gold)' : 'var(--border)', color: puedeReagendar(modalCita) ? '#fff' : 'var(--stone)' }}>
                  Reagendar
                </button>
                <button onClick={pedirConfirmacion}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', marginBottom: 9, cursor: 'pointer', background: 'transparent', border: '1px solid #B0593F', color: '#B0593F' }}>
                  Cancelar cita
                </button>
                <button onClick={cerrarModal}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 10, fontSize: 12.5, fontFamily: 'var(--font)', cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--stone)' }}>
                  Volver
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>¿Seguro que deseas cancelar?</div>
                <div style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.5, marginBottom: 16 }}>
                  Cancelarás tu cita del {fmtFecha(modalCita.fecha)} a las {modalCita.hora}. Esta acción no se puede deshacer.
                </div>
                <button onClick={confirmarCancelar}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', marginBottom: 9, cursor: 'pointer', background: '#B0593F', border: 'none', color: '#fff' }}>
                  Sí, cancelar mi cita
                </button>
                <button onClick={() => setConfirmarCancel(false)}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--stone)' }}>
                  No, volver
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {navEl}
    </div>
  );
}
