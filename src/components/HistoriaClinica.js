import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   NFITNESS 360 — Historia Clínico-Nutriológica
   Formulario editable para el panel de la nutrióloga.
   - No. de paciente con consecutivo automático y persistente.
   - Captura completa en consulta; se guarda en Firestore.
   - Los datos quedan disponibles para el módulo de cálculo del
     plan (Sistema de Equivalentes) — paso siguiente.
   ============================================================ */

/* Logo de la clínica. Pega aquí el data-URI de logo.png
   (p. ej. "data:image/png;base64,....") para que aparezca en
   el encabezado y en el PDF. Vacío = se muestra un marcador. */
const LOGO = "data:image/jpeg;base64,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";

const T = {
  bg: "#EEE4DA",        // crema de marca
  surface: "#FFFFFF",
  ink: "#36302B",       // texto oscuro cálido
  inkSoft: "#978C87",   // taupe de marca (apagado)
  line: "#E3D8CC",
  lineSoft: "#EFE7DD",
  pine: "#211C17",      // negro cálido de marca (botones, píldoras, encabezados)
  pineSoft: "#000000",  // hover / texto fuerte
  amber: "#CDA788",     // dorado de marca (acento)
  mint: "#F4EBDF",      // tinte crema (fondos suaves)
  danger: "#B0593F",    // ladrillo cálido
  sage: "#9AB9AD",      // verde de marca (jugo verde)
  black: "#000000",     // barra del logo
};

const SECTIONS = [
  { id: "datos", n: "1", label: "Datos generales" },
  { id: "bioquimica", n: "2", label: "Bioquímica" },
  { id: "suplementacion", n: "3", label: "Suplementación" },
  { id: "sintomas", n: "4", label: "Signos y síntomas" },
  { id: "antecedentes", n: "5", label: "Antecedentes" },
  { id: "dietetica", n: "6", label: "Dietético" },
  { id: "ejercicio", n: "7", label: "Ejercicio" },
];

const TIEMPOS = ["Desayuno", "Colación", "Comida", "Colación", "Cena"];

const OBJETIVOS = ["Aumento de masa muscular", "Baja de grasa", "Recomposición corporal", "Salud", "Rendimiento deportivo", "Otro"];


function baseSeed() {
  return {
    datos: {
      nombre: "", pacienteNo: "", fecha: "", edad: "", sexo: "Femenino",
      peso: "", talla: "", correo: "", ocupacion: "", objetivo: "",
    },
    bioquimica: {
      fecha: "",
      filas: [
        { parametro: "Glucosa", resultado: "", referencia: "" },
        { parametro: "Colesterol total", resultado: "", referencia: "" },
        { parametro: "Triglicéridos", resultado: "", referencia: "" },
        { parametro: "HDL", resultado: "", referencia: "" },
        { parametro: "LDL", resultado: "", referencia: "" },
        { parametro: "Vitamina D", resultado: "", referencia: "" },
      ],
      observaciones: "",
      analisis: [],
    },
    suplementacion: {
      items: [
        { nombre: "", dosis: "", frecuencia: "" },
        { nombre: "", dosis: "", frecuencia: "" },
      ],
      notas: "",
    },
    sintomas: { digestivos: "", dermatologicos: "", energiaSueno: "", otros: "" },
    antecedentes: { heredofamiliares: "", alcohol: "", tabaco: "", otros: "" },
    dietetica: {
      comidasDia: "", alergias: "", agua: "", liquidos: "",
      leGusta: "", noLeGusta: "", despierta: "", duerme: "",
      dieta: TIEMPOS.map((t) => ({ momento: t, alimentos: "" })),
    },
    ejercicio: {
      tipo: "", dias: "", tiempoDia: "", intensidad: "",
      comeAntes: "No", queComeAntes: "", comeDespues: "No", queComeDespues: "",
      hidratacion: "", notas: "",
    },
  };
}


/* ---------- documento imprimible (PDF) ---------- */
function buildPrintHTML(data) {
  const esc = (s) =>
    String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const v = (s) => (s && String(s).trim() ? esc(s) : "—");

  const row = (label, value) =>
    `<div class="row"><div class="lbl">${esc(label)}</div><div class="val">${v(value)}</div></div>`;

  const block = (title, inner) =>
    `<section class="blk"><h2>${esc(title)}</h2>${inner}</section>`;

  const d = data.datos, b = data.bioquimica, s = data.suplementacion,
    si = data.sintomas, a = data.antecedentes, di = data.dietetica, ej = data.ejercicio;

  const bioFilas = (b.filas || [])
    .filter((f) => f.parametro || f.resultado || f.referencia)
    .map((f) => `<tr><td>${v(f.parametro)}</td><td>${v(f.resultado)}</td><td>${v(f.referencia)}</td></tr>`)
    .join("");
  const bioTable = bioFilas
    ? `<table><thead><tr><th>Parámetro</th><th>Resultado</th><th>Referencia</th></tr></thead><tbody>${bioFilas}</tbody></table>`
    : `<p class="empty">Sin estudios registrados.</p>`;

  const supFilas = (s.items || [])
    .filter((it) => it.nombre || it.dosis || it.frecuencia)
    .map((it) => `<tr><td>${v(it.nombre)}</td><td>${v(it.dosis)}</td><td>${v(it.frecuencia)}</td></tr>`)
    .join("");
  const supTable = supFilas
    ? `<table><thead><tr><th>Suplemento</th><th>Dosis</th><th>Frecuencia</th></tr></thead><tbody>${supFilas}</tbody></table>`
    : `<p class="empty">Sin suplementación registrada.</p>`;

  const dietaTable =
    `<table><tbody>${(di.dieta || [])
      .map((r) => `<tr><td class="momento">${esc(r.momento)}</td><td>${v(r.alimentos)}</td></tr>`)
      .join("")}</tbody></table>`;

  const logo = LOGO
    ? `<img src="${LOGO}" alt="Logo" class="logo"/>`
    : `<div class="logoph">N</div>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<title>Historial clínico ${esc(d.pacienteNo || "")}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; }
body { font-family: 'Montserrat', system-ui, Arial, sans-serif; color: ${T.ink}; margin: 0; padding: 34px 40px; }
.head { background:#000; color:#fff; display: flex; align-items: center; gap: 18px; padding: 16px 22px; border-radius: 10px; margin-bottom: 18px; }
.logo { height: 44px; width: auto; max-width: 240px; object-fit: contain; }
.logoph { width: 48px; height: 48px; border-radius: 12px; background: ${T.amber}; color:#000; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:24px; }
.head h1 { font-size: 20px; margin: 0; letter-spacing: -0.3px; color: #fff; }
.head .sub { font-size: 11px; color: ${T.amber}; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700; }
.meta { display:flex; gap:18px; flex-wrap:wrap; margin: 14px 0 22px; font-size: 12.5px; }
.meta .pill { background:${T.amber}; color:#211C17; font-weight:800; padding:4px 12px; border-radius:7px; letter-spacing:.5px; }
.meta b { color:${T.pine}; }
.blk { margin-bottom: 20px; break-inside: avoid; }
.blk h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: ${T.pine}; border-bottom:1px solid ${T.line}; padding-bottom:6px; margin:0 0 10px; }
.row { display: grid; grid-template-columns: 200px 1fr; gap: 10px; padding: 4px 0; font-size: 13px; border-bottom: 1px solid ${T.lineSoft}; }
.row .lbl { color: ${T.inkSoft}; font-weight: 600; }
.row .val { color: ${T.ink}; white-space: pre-wrap; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 4px; }
th { background: ${T.mint}; color: ${T.pine}; text-align: left; padding: 7px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
td { padding: 7px 10px; border-bottom: 1px solid ${T.lineSoft}; vertical-align: top; }
td.momento { background:#F7FAF7; font-weight:700; color:${T.pine}; width: 130px; }
.empty { font-size: 12.5px; color: ${T.inkSoft}; font-style: italic; }
.foot { margin-top: 26px; padding-top: 12px; border-top: 1px solid ${T.line}; font-size: 10.5px; color: ${T.inkSoft}; }
@page { margin: 16mm; }
</style></head><body>
<div class="head">${logo}<div><div class="sub">Panel de la nutrióloga</div><h1>Historial clínico</h1></div></div>
<div class="meta">
  <span class="pill">${v(d.pacienteNo)}</span>
  <span><b>Paciente:</b> ${v(d.nombre)}</span>
  <span><b>Edad:</b> ${v(d.edad)} años</span>
  <span><b>Sexo:</b> ${v(d.sexo)}</span>
  <span><b>Fecha:</b> ${v(d.fecha)}</span>
</div>

${block("Datos generales",
    row("Peso (kg)", d.peso) + row("Talla (cm)", d.talla) +
    row("Correo electrónico", d.correo) + row("Ocupación", d.ocupacion) +
    row("Objetivo", d.objetivo))}

${block("Evaluación bioquímica", row("¿De cuándo son los estudios?", b.fecha) + bioTable +
    (b.observaciones ? row("Observaciones", b.observaciones) : ""))}

${block("Suplementación", supTable + (s.notas ? row("Notas", s.notas) : ""))}

${block("Signos y síntomas recientes",
    row("Digestivos", si.digestivos) + row("Dermatológicos", si.dermatologicos) +
    row("Energía y sueño", si.energiaSueno) + row("Otros", si.otros))}

${block("Antecedentes y estilo de vida",
    row("Heredofamiliares", a.heredofamiliares) + row("Alcohol", a.alcohol) +
    row("Tabaco", a.tabaco) + row("Otros", a.otros))}

${block("Historia dietética",
    row("Comidas al día", di.comidasDia) + row("Consumo de agua natural", di.agua) +
    row("Alergias o intolerancias", di.alergias) + row("Otros líquidos", di.liquidos) +
    row("Qué SÍ le gusta", di.leGusta) + row("Qué NO le gusta", di.noLeGusta) +
    `<h3 style="font-size:12px;color:${T.pine};margin:14px 0 6px;text-transform:uppercase;letter-spacing:.4px;">Dieta habitual</h3>` +
    dietaTable +
    row("Hora en que despierta", di.despierta) + row("Hora en que se duerme", di.duerme))}

${block("Ejercicio",
    row("Tipo de ejercicio", ej.tipo) + row("Días por semana", ej.dias) +
    row("Tiempo de actividad al día", ej.tiempoDia) + row("Intensidad", ej.intensidad) +
    row("Hidratación", ej.hidratacion) +
    row("¿Come antes de entrenar?", ej.comeAntes === "Sí" ? "Sí — " + (ej.queComeAntes || "—") : "No") +
    row("¿Come después de entrenar?", ej.comeDespues === "Sí" ? "Sí — " + (ej.queComeDespues || "—") : "No") +
    row("Notas", ej.notas))}

<div class="foot">Documento generado desde el panel de la nutrióloga · ${esc(d.pacienteNo || "")}</div>
</body></html>`;
}

export default function HistoriaClinica({ initial, codigo, onSave, onBack }) {
  const [data, setData] = useState(() => {
    const s = baseSeed();
    if (initial && typeof initial === "object") {
      return { ...s, ...initial, datos: { ...s.datos, ...(initial.datos || {}) } };
    }
    s.datos.pacienteNo = codigo || "";
    s.datos.fecha = new Date().toLocaleDateString("es-MX");
    return s;
  });
  const [active, setActive] = useState("datos");
  const [status, setStatus] = useState("guardado");
  const [anaStatus, setAnaStatus] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  const sectionRefs = useRef({});
  const analisisInput = useRef(null);

  /* ---- sección activa según scroll ---- */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.dataset.sid);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const setField = useCallback((sec, field, value) => {
    setData((d) => ({ ...d, [sec]: { ...d[sec], [field]: value } }));
  }, []);

  const setRow = useCallback((sec, listKey, idx, key, value) => {
    setData((d) => {
      const list = d[sec][listKey].map((r, i) => (i === idx ? { ...r, [key]: value } : r));
      return { ...d, [sec]: { ...d[sec], [listKey]: list } };
    });
  }, []);

  const addRow = (sec, listKey, blank) =>
    setData((d) => ({ ...d, [sec]: { ...d[sec], [listKey]: [...d[sec][listKey], blank] } }));

  const removeRow = (sec, listKey, idx) =>
    setData((d) => ({
      ...d, [sec]: { ...d[sec], [listKey]: d[sec][listKey].filter((_, i) => i !== idx) },
    }));

  const setDietaCampo = useCallback((idx, key, value) => {
    setData((d) => ({
      ...d,
      dietetica: {
        ...d.dietetica,
        dieta: d.dietetica.dieta.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
      },
    }));
  }, []);

  const subirAnalisis = async (file) => {
    if (!file) return;
    const nombre = (data.datos.nombre || "").trim();
    if (!nombre) { setAnaStatus('Escribe el nombre del paciente (apartado 1) antes de subir el análisis.'); return; }
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setAnaStatus('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    setAnaStatus('Subiendo análisis a Drive…');
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1]);
        r.onerror = rej; r.readAsDataURL(file);
      });
      const filename = /\.pdf$/i.test(file.name || '') ? file.name : ((file.name || 'analisis') + '.pdf');
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveAnalisis', patient: nombre, filename, pdfBase64: b64 }), redirect: 'follow',
      });
      let d; try { d = JSON.parse(await res.text()); } catch (_) { d = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (d.ok && d.link) {
        const nuevo = { nombre: filename, fecha: new Date().toLocaleDateString('es-MX'), link: d.link };
        setData((prev) => ({ ...prev, bioquimica: { ...prev.bioquimica, analisis: [...(prev.bioquimica.analisis || []), nuevo] } }));
        setAnaStatus('Análisis subido a Drive ✓');
      } else { setAnaStatus('Error: ' + (d.error || 'no se recibió enlace.')); }
    } catch (e) { setAnaStatus('No se pudo subir: ' + e.message); }
  };

  const guardar = () => { setConfirmOpen(true); };

  const guardarYGenerar = async () => {
    setConfirmOpen(false);
    if (typeof onSave !== "function") return;
    setStatus("guardando");
    // 1) Guardar la historia PRIMERO (rápido). Nunca depende del PDF.
    try {
      await Promise.resolve(onSave(data));
      setStatus("guardado");
    } catch (e) {
      setStatus("error");
      return;
    }
    // 2) Generar y subir el PDF del historial a Drive (mejor esfuerzo, en segundo plano).
    const nombre = (data.datos.nombre || "").trim();
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (nombre && url) {
      try {
        const html = buildPrintHTML(data);
        const filename = "Historial clínico " + nombre + " " + new Date().toLocaleDateString("es-MX").replace(/\//g, "-") + ".pdf";
        await fetch(url, {
          method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "saveHistorial", patient: nombre, filename, html }), redirect: "follow",
        });
      } catch (e) { /* el PDF es secundario; la historia ya quedó guardada */ }
    }
  };

  const generarPDF = async () => {
    const nombre = (data.datos.nombre || "").trim();
    if (!nombre) { setPdfStatus("Escribe el nombre del paciente (apartado 1) antes de generar el PDF."); return; }
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setPdfStatus("Falta configurar REACT_APP_APPSCRIPT_URL en Vercel."); return; }
    setPdfStatus("Generando PDF y guardando en Drive…");
    try {
      const html = buildPrintHTML(data);
      const filename = "Historial clínico " + nombre + " " + new Date().toLocaleDateString("es-MX").replace(/\//g, "-") + ".pdf";
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "saveHistorial", patient: nombre, filename, html }), redirect: "follow",
      });
      let d; try { d = JSON.parse(await res.text()); } catch (_) { d = { ok: false }; }
      if (d.ok && d.link) setPdfStatus("PDF guardado en Drive ✓");
      else setPdfStatus("Error: " + (d.error || "no se pudo generar el PDF."));
    } catch (e) { setPdfStatus("No se pudo generar: " + e.message); }
  };

  const scrollTo = (id) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reg = (id) => (el) => { if (el) sectionRefs.current[id] = el; };

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* ---------- ENCABEZADO ---------- */}
      <header style={styles.header}>
        <div style={styles.brandRow}>
          {LOGO ? (
            <img src={LOGO} alt="Nfitness 360" style={styles.logoImg} />
          ) : (
            <span style={styles.logoMark}>N</span>
          )}
          <SaveBadge status={status} />
        </div>

        <div style={styles.titleRow}>
          <div>
            <div style={styles.eyebrow}>Panel de la nutrióloga</div>
            <h1 style={styles.h1}>Historial clínico</h1>
            <div style={styles.idBlock}>
              <span style={styles.noPill}>{data.datos.pacienteNo || "NF-…"}</span>
              <p style={styles.patientLine}>
                {data.datos.nombre ? (
                  <>
                    <strong>{data.datos.nombre}</strong>
                    {data.datos.edad ? ` · ${data.datos.edad} años` : ""}
                    {data.datos.sexo ? ` · ${data.datos.sexo}` : ""}
                  </>
                ) : "Paciente nueva sin nombre"}
              </p>
            </div>
          </div>
          <button style={styles.ghostBtn} onClick={onBack}>← Volver</button>
        </div>

        <nav style={styles.tabs}>
          {SECTIONS.slice(0, 5).map((s) => (
            <button key={s.id} onClick={() => scrollTo(s.id)} className="nf-tab"
              style={{ ...styles.tab, ...(active === s.id ? styles.tabOn : null) }}>
              <span style={{ ...styles.tabNum, ...(active === s.id ? styles.tabNumOn : null) }}>{s.n}</span>
              {s.label}
            </button>
          ))}
        </nav>
        <nav style={{ ...styles.tabs, marginTop: 6 }}>
          {SECTIONS.slice(5).map((s) => (
            <button key={s.id} onClick={() => scrollTo(s.id)} className="nf-tab"
              style={{ ...styles.tab, ...(active === s.id ? styles.tabOn : null) }}>
              <span style={{ ...styles.tabNum, ...(active === s.id ? styles.tabNumOn : null) }}>{s.n}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ---------- CONTENIDO (scroll completo) ---------- */}
      <main style={styles.main}>

        {/* 1. DATOS GENERALES */}
        <Section reg={reg("datos")} sid="datos" title="Datos generales" n="1"
          hint="Identificación de la paciente y medidas base para el cálculo.">
          <Grid>
            <Field label="No. de paciente">
              <div style={styles.autoWrap}>
                <input style={{ ...styles.input, ...styles.inputAuto }} value={data.datos.pacienteNo} readOnly />
                <span style={styles.autoTag}>auto</span>
              </div>
            </Field>
            <Field label="Fecha de consulta">
              <input type="date" style={styles.input} value={data.datos.fecha}
                onChange={(e) => setField("datos", "fecha", e.target.value)} />
            </Field>
            <Field label="Nombre" full>
              <input style={styles.input} value={data.datos.nombre} placeholder="Nombre completo"
                onChange={(e) => setField("datos", "nombre", e.target.value)} />
            </Field>
            <Field label="Edad (años)">
              <input style={styles.input} inputMode="numeric" value={data.datos.edad} placeholder="29"
                onChange={(e) => setField("datos", "edad", e.target.value)} />
            </Field>
            <Field label="Sexo">
              <select style={styles.input} value={data.datos.sexo}
                onChange={(e) => setField("datos", "sexo", e.target.value)}>
                <option>Femenino</option><option>Masculino</option>
              </select>
            </Field>
            <Field label="Peso (kg)">
              <input style={styles.input} inputMode="decimal" value={data.datos.peso} placeholder="kg"
                onChange={(e) => setField("datos", "peso", e.target.value)} />
            </Field>
            <Field label="Talla (cm)">
              <input style={styles.input} inputMode="decimal" value={data.datos.talla} placeholder="cm"
                onChange={(e) => setField("datos", "talla", e.target.value)} />
            </Field>
            <Field label="Correo electrónico" full>
              <input style={styles.input} value={data.datos.correo} placeholder="correo@ejemplo.com"
                onChange={(e) => setField("datos", "correo", e.target.value)} />
            </Field>
            <Field label="Ocupación (trabaja / estudia)" full>
              <input style={styles.input} value={data.datos.ocupacion}
                onChange={(e) => setField("datos", "ocupacion", e.target.value)} />
            </Field>
            <Field label="Objetivo" full>
              <select style={styles.input}
                value={OBJETIVOS.includes(data.datos.objetivoTipo) ? data.datos.objetivoTipo : (OBJETIVOS.slice(0, -1).includes(data.datos.objetivo) ? data.datos.objetivo : (data.datos.objetivo ? "Otro" : ""))}
                onChange={(e) => {
                  const v = e.target.value;
                  setData((d) => ({
                    ...d,
                    datos: {
                      ...d.datos,
                      objetivoTipo: v,
                      objetivo: v === "Otro"
                        ? (OBJETIVOS.slice(0, -1).includes(d.datos.objetivo) ? "" : d.datos.objetivo)
                        : v,
                    },
                  }));
                }}>
                <option value="">Selecciona un objetivo…</option>
                {OBJETIVOS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {(data.datos.objetivoTipo === "Otro" ||
                (!data.datos.objetivoTipo && data.datos.objetivo && !OBJETIVOS.slice(0, -1).includes(data.datos.objetivo))) && (
                <input style={{ ...styles.input, marginTop: 8 }} value={data.datos.objetivo}
                  placeholder="Especifica el objetivo de la consulta"
                  onChange={(e) => setField("datos", "objetivo", e.target.value)} />
              )}
            </Field>
          </Grid>
          <p style={styles.note}>
            Peso, talla, edad y sexo alimentan las ecuaciones de gasto energético (Mifflin-St Jeor y
            Harris-Benedict) del módulo de cálculo.
          </p>
        </Section>

        {/* 2. EVALUACIÓN BIOQUÍMICA */}
        <Section reg={reg("bioquimica")} sid="bioquimica" title="Evaluación bioquímica" n="2"
          hint="Estudios de laboratorio referidos por la paciente.">
          <Grid>
            <Field label="¿De cuándo son los estudios?" full>
              <input style={styles.input} value={data.bioquimica.fecha}
                placeholder="Ej. Hace 4 años / fecha aproximada"
                onChange={(e) => setField("bioquimica", "fecha", e.target.value)} />
            </Field>
          </Grid>
          <div style={styles.tableWrap}>
            <div style={{ ...styles.bioRow, ...styles.bioHead }}>
              <div>Parámetro</div><div>Resultado</div><div>Referencia</div><div></div>
            </div>
            {data.bioquimica.filas.map((f, i) => (
              <div key={i} style={styles.bioRow}>
                <input style={styles.cellInput} value={f.parametro} placeholder="Parámetro"
                  onChange={(e) => setRow("bioquimica", "filas", i, "parametro", e.target.value)} />
                <input style={styles.cellInput} value={f.resultado} placeholder="Valor"
                  onChange={(e) => setRow("bioquimica", "filas", i, "resultado", e.target.value)} />
                <input style={styles.cellInput} value={f.referencia} placeholder="Rango normal"
                  onChange={(e) => setRow("bioquimica", "filas", i, "referencia", e.target.value)} />
                <button style={styles.rowDel} title="Quitar"
                  onClick={() => removeRow("bioquimica", "filas", i)}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
            <button style={styles.addBtn}
              onClick={() => addRow("bioquimica", "filas", { parametro: "", resultado: "", referencia: "" })}>
              + Agregar parámetro
            </button>
            <button style={styles.uploadBtn} onClick={() => analisisInput.current && analisisInput.current.click()}>
              Cargar análisis (PDF)
            </button>
            <input ref={analisisInput} type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; subirAnalisis(f); }} />
          </div>
          {anaStatus && <div style={styles.anaStatus}>{anaStatus}</div>}
          {(data.bioquimica.analisis || []).length > 0 && (
            <div style={styles.anaList}>
              {(data.bioquimica.analisis || []).map((a, i) => (
                <div key={i} style={styles.anaItem}>
                  <span style={{ flex: 1, fontSize: 13, color: T.ink }}>{a.nombre} · {a.fecha}</span>
                  {a.link && <a href={a.link} target="_blank" rel="noreferrer" style={styles.anaLink}>Abrir</a>}
                  <button style={styles.rowDel} title="Quitar de la lista"
                    onClick={() => setData((prev) => ({ ...prev, bioquimica: { ...prev.bioquimica, analisis: prev.bioquimica.analisis.filter((_, k) => k !== i) } }))}>×</button>
                </div>
              ))}
            </div>
          )}
          <Field label="Observaciones / interpretación" full style={{ marginTop: 16 }}>
            <textarea style={styles.textarea} rows={2} value={data.bioquimica.observaciones}
              placeholder="Notas sobre los estudios…"
              onChange={(e) => setField("bioquimica", "observaciones", e.target.value)} />
          </Field>
        </Section>

        {/* 3. SUPLEMENTACIÓN */}
        <Section reg={reg("suplementacion")} sid="suplementacion" title="Suplementación" n="3"
          hint="Suplementos que consume actualmente con dosis y frecuencia.">
          <div style={styles.tableWrap}>
            <div style={{ ...styles.supRow, ...styles.bioHead }}>
              <div>Suplemento</div><div>Dosis</div><div>Frecuencia</div><div></div>
            </div>
            {data.suplementacion.items.map((it, i) => (
              <div key={i} style={styles.supRow}>
                <input style={styles.cellInput} value={it.nombre} placeholder="Proteína, vitamina D…"
                  onChange={(e) => setRow("suplementacion", "items", i, "nombre", e.target.value)} />
                <input style={styles.cellInput} value={it.dosis} placeholder="Cantidad"
                  onChange={(e) => setRow("suplementacion", "items", i, "dosis", e.target.value)} />
                <input style={styles.cellInput} value={it.frecuencia} placeholder="Diario, semanal…"
                  onChange={(e) => setRow("suplementacion", "items", i, "frecuencia", e.target.value)} />
                <button style={styles.rowDel} title="Quitar"
                  onClick={() => removeRow("suplementacion", "items", i)}>×</button>
              </div>
            ))}
          </div>
          <button style={styles.addBtn}
            onClick={() => addRow("suplementacion", "items", { nombre: "", dosis: "", frecuencia: "" })}>
            + Agregar suplemento
          </button>
          <Field label="Notas de suplementación" full style={{ marginTop: 16 }}>
            <textarea style={styles.textarea} rows={2} value={data.suplementacion.notas}
              placeholder="Marca, indicación, adherencia…"
              onChange={(e) => setField("suplementacion", "notas", e.target.value)} />
          </Field>
        </Section>

        {/* 4. SIGNOS Y SÍNTOMAS RECIENTES */}
        <Section reg={reg("sintomas")} sid="sintomas" title="Signos y síntomas recientes" n="4"
          hint="Sintomatología actual organizada por aparato o sistema.">
          <Grid>
            <Field label="Digestivos" full>
              <textarea style={styles.textarea} rows={2} value={data.sintomas.digestivos}
                placeholder="Reflujo, distensión, tránsito intestinal…"
                onChange={(e) => setField("sintomas", "digestivos", e.target.value)} />
            </Field>
            <Field label="Dermatológicos" full>
              <textarea style={styles.textarea} rows={2} value={data.sintomas.dermatologicos}
                placeholder="Acné, brotes, resequedad, caída de cabello…"
                onChange={(e) => setField("sintomas", "dermatologicos", e.target.value)} />
            </Field>
            <Field label="Energía y sueño" full>
              <textarea style={styles.textarea} rows={2} value={data.sintomas.energiaSueno}
                placeholder="Dolor de cabeza, fatiga, calidad del sueño…"
                onChange={(e) => setField("sintomas", "energiaSueno", e.target.value)} />
            </Field>
            <Field label="Otros signos y síntomas" full>
              <textarea style={styles.textarea} rows={2} value={data.sintomas.otros}
                placeholder="Cualquier otra molestia referida…"
                onChange={(e) => setField("sintomas", "otros", e.target.value)} />
            </Field>
          </Grid>
        </Section>

        {/* 5. ANTECEDENTES Y ESTILO DE VIDA */}
        <Section reg={reg("antecedentes")} sid="antecedentes" title="Antecedentes y estilo de vida" n="5"
          hint="Antecedentes heredofamiliares y consumo de sustancias.">
          <Grid>
            <Field label="Antecedentes heredofamiliares" full>
              <textarea style={styles.textarea} rows={2} value={data.antecedentes.heredofamiliares}
                placeholder="Diabetes, cáncer, hipertensión… (parentesco)"
                onChange={(e) => setField("antecedentes", "heredofamiliares", e.target.value)} />
            </Field>
            <Field label="Consumo de alcohol">
              <input style={styles.input} value={data.antecedentes.alcohol}
                placeholder="Frecuencia y cantidad"
                onChange={(e) => setField("antecedentes", "alcohol", e.target.value)} />
            </Field>
            <Field label="Tabaco">
              <input style={styles.input} value={data.antecedentes.tabaco}
                placeholder="Sí / No · frecuencia"
                onChange={(e) => setField("antecedentes", "tabaco", e.target.value)} />
            </Field>
            <Field label="Otros" full>
              <textarea style={styles.textarea} rows={2} value={data.antecedentes.otros}
                placeholder="Notas adicionales…"
                onChange={(e) => setField("antecedentes", "otros", e.target.value)} />
            </Field>
          </Grid>
        </Section>

        {/* 6. HISTORIA DIETÉTICA */}
        <Section reg={reg("dietetica")} sid="dietetica" title="Historia dietética" n="6"
          hint="Hábitos de alimentación, líquidos, preferencias, dieta habitual y rutina.">
          <Grid>
            <Field label="Comidas al día">
              <input style={styles.input} inputMode="numeric" value={data.dietetica.comidasDia} placeholder="4"
                onChange={(e) => setField("dietetica", "comidasDia", e.target.value)} />
            </Field>
            <Field label="Consumo de agua natural">
              <input style={styles.input} value={data.dietetica.agua} placeholder="1–2 L diario"
                onChange={(e) => setField("dietetica", "agua", e.target.value)} />
            </Field>
            <Field label="Alergias o intolerancias" full>
              <textarea style={styles.textarea} rows={2} value={data.dietetica.alergias}
                placeholder="Alimentos a evitar…"
                onChange={(e) => setField("dietetica", "alergias", e.target.value)} />
            </Field>
            <Field label="Consumo de otros líquidos" full>
              <textarea style={styles.textarea} rows={2} value={data.dietetica.liquidos}
                placeholder="Café, té, bebidas light…"
                onChange={(e) => setField("dietetica", "liquidos", e.target.value)} />
            </Field>
            <Field label="Qué SÍ le gusta" full>
              <textarea style={{ ...styles.textarea, ...styles.likeYes }} rows={2} value={data.dietetica.leGusta}
                placeholder="Alimentos y marcas de preferencia…"
                onChange={(e) => setField("dietetica", "leGusta", e.target.value)} />
            </Field>
            <Field label="Qué NO le gusta" full>
              <textarea style={{ ...styles.textarea, ...styles.likeNo }} rows={2} value={data.dietetica.noLeGusta}
                placeholder="Alimentos que rechaza…"
                onChange={(e) => setField("dietetica", "noLeGusta", e.target.value)} />
            </Field>
          </Grid>

          <h3 style={styles.subhead}>Dieta habitual</h3>
          <div style={styles.tableWrap}>
            {data.dietetica.dieta.map((r, i) => (
              <div key={i} style={styles.dietRow}>
                <input style={styles.dietMomentoInput} value={r.momento} placeholder="Tiempo"
                  onChange={(e) => setDietaCampo(i, "momento", e.target.value)} />
                <textarea style={styles.dietCell} rows={1} value={r.alimentos}
                  placeholder="Alimentos y bebidas…" onChange={(e) => setDietaCampo(i, "alimentos", e.target.value)} />
                <button style={styles.dietDel} title="Quitar tiempo"
                  onClick={() => removeRow("dietetica", "dieta", i)}>×</button>
              </div>
            ))}
          </div>
          <button style={styles.addBtn} onClick={() => addRow("dietetica", "dieta", { momento: "", alimentos: "" })}>
            + Agregar tiempo
          </button>

          <Grid style={{ marginTop: 18 }}>
            <Field label="Hora en que despierta">
              <input style={styles.input} value={data.dietetica.despierta} placeholder="6:45 am"
                onChange={(e) => setField("dietetica", "despierta", e.target.value)} />
            </Field>
            <Field label="Hora en que se duerme">
              <input style={styles.input} value={data.dietetica.duerme} placeholder="11:30 pm"
                onChange={(e) => setField("dietetica", "duerme", e.target.value)} />
            </Field>
          </Grid>
        </Section>

        {/* 7. EJERCICIO */}
        <Section reg={reg("ejercicio")} sid="ejercicio" title="Ejercicio" n="7"
          hint="Actividad física y alimentación alrededor del entrenamiento.">
          <Grid>
            <Field label="Tipo de ejercicio" full>
              <input style={styles.input} value={data.ejercicio.tipo}
                placeholder="Fuerza, cardio, deporte, clases…"
                onChange={(e) => setField("ejercicio", "tipo", e.target.value)} />
            </Field>
            <Field label="Días por semana">
              <input style={styles.input} value={data.ejercicio.dias} placeholder="Ej. 4"
                onChange={(e) => setField("ejercicio", "dias", e.target.value)} />
            </Field>
            <Field label="Tiempo de actividad al día">
              <input style={styles.input} value={data.ejercicio.tiempoDia} placeholder="Ej. 60 min"
                onChange={(e) => setField("ejercicio", "tiempoDia", e.target.value)} />
            </Field>
            <Field label="Intensidad">
              <select style={styles.input} value={data.ejercicio.intensidad}
                onChange={(e) => setField("ejercicio", "intensidad", e.target.value)}>
                <option value="">Seleccionar…</option>
                <option>Ligera</option><option>Moderada</option><option>Intensa</option>
              </select>
            </Field>
            <Field label="Hidratación durante el ejercicio">
              <input style={styles.input} value={data.ejercicio.hidratacion}
                placeholder="Agua, electrolitos…"
                onChange={(e) => setField("ejercicio", "hidratacion", e.target.value)} />
            </Field>

            <Field label="¿Come algo ANTES de entrenar?">
              <select style={styles.input} value={data.ejercicio.comeAntes}
                onChange={(e) => setField("ejercicio", "comeAntes", e.target.value)}>
                <option>No</option><option>Sí</option>
              </select>
            </Field>
            <Field label="¿Qué come antes?">
              <input style={styles.input} value={data.ejercicio.queComeAntes}
                disabled={data.ejercicio.comeAntes !== "Sí"} placeholder="Si aplica…"
                onChange={(e) => setField("ejercicio", "queComeAntes", e.target.value)} />
            </Field>
            <Field label="¿Come algo DESPUÉS de entrenar?">
              <select style={styles.input} value={data.ejercicio.comeDespues}
                onChange={(e) => setField("ejercicio", "comeDespues", e.target.value)}>
                <option>No</option><option>Sí</option>
              </select>
            </Field>
            <Field label="¿Qué come después?">
              <input style={styles.input} value={data.ejercicio.queComeDespues}
                disabled={data.ejercicio.comeDespues !== "Sí"} placeholder="Si aplica…"
                onChange={(e) => setField("ejercicio", "queComeDespues", e.target.value)} />
            </Field>
            <Field label="Notas" full>
              <textarea style={styles.textarea} rows={2} value={data.ejercicio.notas}
                placeholder="Lesiones, horarios, observaciones…"
                onChange={(e) => setField("ejercicio", "notas", e.target.value)} />
            </Field>
          </Grid>
        </Section>
      </main>

      {/* ---------- PIE ---------- */}
      <footer style={styles.footer}>
        <div style={styles.footerInfo}>
          {pdfStatus ? pdfStatus : (
            <>
              {status === "guardado" && "Historia guardada."}
              {status === "guardando" && "Guardando cambios…"}
              {status === "error" && "No se pudo guardar. Revisa la conexión."}
              {status === "listo" && "Listo."}
              {status === "cargando" && "Cargando…"}
            </>
          )}
        </div>
        <div style={styles.footerBtns}>
          <button style={styles.secondaryBtn} onClick={generarPDF} className="nf-secondary">
            Generar PDF
          </button>
          <button style={styles.primaryBtn} onClick={guardar} className="nf-primary">
            Guardar historia clínica
          </button>
        </div>
      </footer>

      {confirmOpen && (
        <div style={styles.modalOverlay} onClick={() => setConfirmOpen(false)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalText}>¿Deseas continuar? No se podrán hacer cambios futuros.</div>
            <div style={styles.modalBtns}>
              <button style={styles.modalNo} onClick={() => setConfirmOpen(false)}>No</button>
              <button style={styles.modalSi} onClick={guardarYGenerar}>Sí</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== subcomponentes ===================== */
function Section({ reg, sid, title, n, hint, children }) {
  return (
    <section ref={reg} data-sid={sid} style={styles.card}>
      <div style={styles.cardHead}>
        <span style={styles.cardNum}>{n}</span>
        <div>
          <h2 style={styles.h2}>{title}</h2>
          {hint && <p style={styles.hint}>{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
function Grid({ children, style }) { return <div style={{ ...styles.grid, ...(style || {}) }}>{children}</div>; }
function Field({ label, children, full, style }) {
  return (
    <label style={{ ...styles.field, ...(full ? styles.fieldFull : null), ...(style || {}) }}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}
function SaveBadge({ status }) {
  const map = {
    guardado: { t: "Guardado", c: T.sage, dot: T.sage },
    guardando: { t: "Guardando…", c: T.amber, dot: T.amber },
    error: { t: "Error al guardar", c: T.danger, dot: T.danger },
    listo: { t: "Completo", c: T.sage, dot: T.sage },
    cargando: { t: "Cargando…", c: "#C9BEB4", dot: "#C9BEB4" },
  };
  const s = map[status] || map.guardado;
  return (
    <div style={styles.saveBadge}>
      <span style={{ ...styles.saveDot, background: s.dot }} className={status === "guardando" ? "nf-pulse" : ""} />
      <span style={{ color: s.c, fontWeight: 600 }}>{s.t}</span>
    </div>
  );
}

/* ===================== estilos ===================== */
const styles = {
  root: {
    fontFamily: "'Montserrat', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    background: T.bg, color: T.ink, minHeight: "100%", maxWidth: 980, margin: "0 auto",
    padding: "0 0 96px", WebkitFontSmoothing: "antialiased",
  },
  header: { position: "sticky", top: 0, zIndex: 5, background: T.bg, paddingTop: 0, borderBottom: `1px solid ${T.line}` },
  brandRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 22px", background: T.black },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: { width: 38, height: 38, borderRadius: 11, background: T.amber, color: "#000", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 20, letterSpacing: -0.5 },
  logoImg: { height: 34, width: "auto", maxWidth: 230, objectFit: "contain", display: "block" },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.amber, marginBottom: 4 },
  brand: { fontWeight: 800, letterSpacing: 0.5, fontSize: 15, color: T.pine },
  brandSub: { fontSize: 11.5, color: T.inkSoft, marginTop: 1, letterSpacing: 0.2 },
  saveBadge: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, background: T.surface, border: `1px solid ${T.line}`, padding: "6px 12px", borderRadius: 999 },
  saveDot: { width: 8, height: 8, borderRadius: 999, display: "inline-block" },
  titleRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "18px 24px 14px", gap: 16 },
  h1: { fontSize: 26, fontWeight: 800, letterSpacing: -0.6, margin: 0, color: T.ink },
  patientLine: { margin: 0, color: T.inkSoft, fontSize: 14 },
  idBlock: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, marginTop: 8 },
  noPill: { background: T.amber, color: "#211C17", fontWeight: 800, fontSize: 12.5, padding: "4px 11px", borderRadius: 7, letterSpacing: 0.6, display: "inline-block" },
  ghostBtn: { background: "transparent", border: `1px solid ${T.line}`, color: T.inkSoft, padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  tabs: { display: "flex", gap: 4, padding: "0 18px", overflowX: "auto" },
  tab: { display: "flex", alignItems: "center", gap: 7, background: "transparent", border: "none", borderBottom: "2px solid transparent", padding: "10px 11px 13px", fontSize: 13, fontWeight: 600, color: T.inkSoft, cursor: "pointer", whiteSpace: "nowrap" },
  tabOn: { color: T.pine, borderBottomColor: T.amber },
  tabNum: { width: 20, height: 20, borderRadius: 6, display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 700, background: T.lineSoft, color: T.inkSoft },
  tabNumOn: { background: T.amber, color: "#211C17" },
  main: { padding: "22px 24px 12px", display: "flex", flexDirection: "column", gap: 16 },
  card: { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: "22px 22px 24px", boxShadow: "0 1px 2px rgba(22,34,30,0.03)", scrollMarginTop: 132 },
  cardHead: { display: "flex", gap: 14, marginBottom: 20, alignItems: "flex-start" },
  cardNum: { minWidth: 30, height: 30, borderRadius: 9, background: T.amber, color: "#211C17", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, marginTop: 1 },
  h2: { fontSize: 18, fontWeight: 750, margin: 0, letterSpacing: -0.3, color: T.ink },
  hint: { margin: "3px 0 0", fontSize: 13, color: T.inkSoft, lineHeight: 1.45 },
  subhead: { fontSize: 12, fontWeight: 700, color: T.pine, margin: "24px 0 10px", letterSpacing: 0.4, textTransform: "uppercase" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldFull: { gridColumn: "1 / -1" },
  label: { fontSize: 12.5, fontWeight: 600, color: T.inkSoft, letterSpacing: 0.1 },
  input: { width: "100%", border: `1px solid ${T.line}`, borderRadius: 9, padding: "10px 12px", fontSize: 14, color: T.ink, background: "#FCFDFC", boxSizing: "border-box", fontFamily: "inherit" },
  inputAuto: { background: T.mint, color: T.pine, fontWeight: 700, letterSpacing: 0.5 },
  autoWrap: { position: "relative", display: "flex", alignItems: "center" },
  autoTag: { position: "absolute", right: 10, fontSize: 10.5, fontWeight: 700, color: T.pineSoft, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 6, padding: "1px 6px", textTransform: "uppercase", letterSpacing: 0.5 },
  textarea: { width: "100%", border: `1px solid ${T.line}`, borderRadius: 9, padding: "10px 12px", fontSize: 14, color: T.ink, background: "#FCFDFC", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 },
  likeYes: { borderLeft: `3px solid ${T.sage}` },
  likeNo: { borderLeft: `3px solid ${T.danger}` },
  note: { marginTop: 16, fontSize: 12.5, color: T.pineSoft, background: T.mint, borderRadius: 10, padding: "10px 13px", lineHeight: 1.5 },
  tableWrap: { border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden" },
  bioRow: { display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 40px", borderBottom: `1px solid ${T.lineSoft}` },
  supRow: { display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 40px", borderBottom: `1px solid ${T.lineSoft}` },
  bioHead: { background: T.mint, fontSize: 11, fontWeight: 700, color: T.pine, textTransform: "uppercase", letterSpacing: 0.4 },
  cellInput: { border: "none", borderRight: `1px solid ${T.lineSoft}`, padding: "10px 12px", fontSize: 13.5, background: "transparent", fontFamily: "inherit", color: T.ink, width: "100%", boxSizing: "border-box" },
  rowDel: { border: "none", background: "transparent", color: T.inkSoft, fontSize: 18, cursor: "pointer", lineHeight: 1 },
  addBtn: { marginTop: 12, background: T.mint, color: T.pine, border: "none", padding: "9px 14px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  uploadBtn: { marginTop: 12, background: T.pine, color: "#fff", border: "none", padding: "9px 14px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  anaStatus: { marginTop: 10, fontSize: 12.5, color: T.inkSoft },
  anaList: { marginTop: 10, display: "flex", flexDirection: "column", gap: 6 },
  anaItem: { display: "flex", alignItems: "center", gap: 10, background: "#FBF8F4", border: `1px solid ${T.lineSoft}`, borderRadius: 8, padding: "8px 12px" },
  anaLink: { background: T.amber, color: "#211C17", textDecoration: "none", padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700 },
  dietRow: { display: "grid", gridTemplateColumns: "150px 1fr 34px", borderBottom: `1px solid ${T.lineSoft}`, alignItems: "stretch" },
  dietMomento: { background: "#F7FAF7", padding: "12px 14px", fontSize: 13, fontWeight: 700, color: T.pine, borderRight: `1px solid ${T.lineSoft}`, display: "flex", alignItems: "center" },
  dietMomentoInput: { background: "#F7FAF7", padding: "12px 14px", fontSize: 13, fontWeight: 700, color: T.pine, borderRight: `1px solid ${T.lineSoft}`, border: "none", borderRadius: 0, fontFamily: "inherit", boxSizing: "border-box", width: "100%" },
  dietDel: { border: "none", background: "transparent", color: T.inkSoft, fontSize: 18, cursor: "pointer", lineHeight: 1, alignSelf: "center" },
  dietCell: { border: "none", padding: "11px 13px", fontSize: 13.5, background: "transparent", fontFamily: "inherit", color: T.ink, resize: "vertical", lineHeight: 1.5, minHeight: 42 },
  footer: { margin: "10px 24px 0", background: "#fff", border: `1px solid ${T.line}`, borderRadius: 14, padding: "16px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 12 },
  footerInfo: { fontSize: 12, color: T.inkSoft, flex: "1 1 100%" },
  footerBtns: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  secondaryBtn: { background: "#fff", color: T.pine, border: `1px solid ${T.pine}`, padding: "11px 16px", borderRadius: 11, fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  primaryBtn: { background: T.amber, color: "#211C17", border: "none", padding: "11px 18px", borderRadius: 11, fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(33,28,23,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modalBox: { background: "#fff", borderRadius: 16, padding: "26px 24px", maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", textAlign: "center" },
  modalText: { fontSize: 15.5, fontWeight: 600, color: T.ink, lineHeight: 1.5, marginBottom: 22 },
  modalBtns: { display: "flex", gap: 12, justifyContent: "center" },
  modalNo: { flex: 1, background: "#fff", color: T.ink, border: `1px solid ${T.line}`, padding: "11px 0", borderRadius: 10, fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  modalSi: { flex: 1, background: T.amber, color: "#211C17", border: "none", padding: "11px 0", borderRadius: 10, fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
.nf-tab:hover { color: ${T.pine}; }
.nf-primary:hover { background: #C0986F; }
.nf-secondary:hover { background: ${T.mint}; }
input:focus, textarea:focus, select:focus { outline: none; border-color: ${T.amber} !important; box-shadow: 0 0 0 3px rgba(205,167,136,0.30); }
input::placeholder, textarea::placeholder { color: #A9B4AE; }
input:disabled { background: #F0F2F0; color: #A9B4AE; }
.nf-pulse { animation: nfpulse 1s ease-in-out infinite; }
@keyframes nfpulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
`;
