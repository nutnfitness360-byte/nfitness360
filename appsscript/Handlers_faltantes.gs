/**
 * =====================================================================
 *  HANDLERS FALTANTES · Nfitness 360
 * =====================================================================
 *  Acciones de IA / Drive que el sistema web usa:
 *
 *    · kcalHabitualIA  → estima kcal/macros/equivalentes de la dieta habitual
 *    · leerInBody      → lee el InBody (foto o PDF) con IA y guarda el archivo
 *    · ajustarMenuIA   → aplica los cambios de la nota de seguimiento al menú
 *    · saveEstudio     → guarda un estudio del paciente en Drive
 *
 *  NOTA: Las funciones de Stripe (crearCheckoutStripe / verificarPagoStripe)
 *  YA NO viven aquí — se movieron a Código.gs para evitar duplicados.
 *  El ruteo (doPost) de estas acciones está en Código.gs.
 *
 *  Propiedad del script necesaria:  ANTHROPIC_API_KEY  (para las acciones de IA)
 * =====================================================================
 */

/* ---------- utilidades internas ---------- */

// Llama a Claude y devuelve el JSON que respondió (o lanza error).
function iaJSON_(sys, instruccion, contenidoExtra) {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error("Falta ANTHROPIC_API_KEY en las Propiedades del script.");

  var model = (typeof IA_MODEL !== "undefined") ? IA_MODEL : "claude-sonnet-4-5";
  var maxTok = (typeof IA_MAX_TOKENS !== "undefined") ? IA_MAX_TOKENS : 4000;

  var contenido = contenidoExtra
    ? [contenidoExtra, { type: "text", text: instruccion }]
    : instruccion;

  var payload = {
    model: model,
    max_tokens: maxTok,
    system: sys,
    messages: [{ role: "user", content: contenido }]
  };

  var resp = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    contentType: "application/json",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = resp.getResponseCode();
  var raw = resp.getContentText();
  if (code < 200 || code >= 300) throw new Error("IA HTTP " + code + ": " + raw.slice(0, 300));

  var out;
  try { out = JSON.parse(raw); } catch (e) { throw new Error("Respuesta de IA no parseable."); }

  var text = "";
  if (out && out.content && out.content.length) {
    for (var i = 0; i < out.content.length; i++) {
      if (out.content[i].type === "text") text += out.content[i].text;
    }
  }
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  try { return JSON.parse(text); }
  catch (e) { throw new Error("La IA no devolvió JSON válido."); }
}

function num_(v) { var x = parseFloat(v); return isNaN(x) ? 0 : x; }


/* =====================================================================
 *  1) kcalHabitualIA · kcal, macros y equivalentes de la dieta habitual
 * ===================================================================== */
function kcalHabitualIA_(body) {
  try {
    var dieta = body.dieta || [];
    if (!dieta.length) return json_({ ok: false, error: "No se recibió la dieta habitual." });

    var sys = "Eres asistente de una nutrióloga mexicana. Recibes la DIETA HABITUAL de un paciente (lo que come " +
      "normalmente en cada tiempo, en lenguaje casero). ESTIMA su contenido con el Sistema Mexicano de Alimentos " +
      "Equivalentes (SMAE).\n" +
      "1) Convierte los alimentos de cada tiempo a EQUIVALENTES por grupo. Llaves válidas: cereales, cereales_grasa, " +
      "leguminosas, verdura, fruta, aoa_mb, aoa_b, aoa_m, aoa_a, leche_desc, leche_semi, leche_entera, leche_azucar, " +
      "grasas, grasas_proteina, azucares, azucares_grasa. (aoa = alimento de origen animal; mb/b/m/a = muy bajo/bajo/" +
      "moderado/alto en grasa.)\n" +
      "2) SUMA los equivalentes de todos los tiempos (total del día).\n" +
      "3) Calcula kcal y macros con los valores del SMAE por equivalente:\n" +
      "cereales 70/2/0/15 · cereales_grasa 115/2/5/15 · leguminosas 120/8/1/20 · verdura 25/2/0/4 · fruta 60/0/0/15 · " +
      "aoa_mb 40/7/1/0 · aoa_b 55/7/3/0 · aoa_m 75/7/5/0 · aoa_a 100/7/8/0 · leche_desc 95/9/2/12 · leche_semi 110/9/4/12 · " +
      "leche_entera 150/9/8/12 · leche_azucar 200/8/5/30 · grasas 45/0/5/0 · grasas_proteina 70/3/5/3 · azucares 40/0/0/10 · " +
      "azucares_grasa 85/0/5/10  (kcal/proteína/lípidos/hidratos).\n" +
      "Sé realista con las porciones caseras; si algo es ambiguo, asume una porción estándar. " +
      "Devuelve EXCLUSIVAMENTE JSON válido, sin texto adicional ni markdown.";

    var instruccion = "Estima los equivalentes SMAE del día completo y sus kcal y macros totales. " +
      "Responde SOLO con JSON con esta forma exacta: " +
      "{\"equivalentes\":{\"cereales\":0,\"cereales_grasa\":0,\"leguminosas\":0,\"verdura\":0,\"fruta\":0,\"aoa_mb\":0," +
      "\"aoa_b\":0,\"aoa_m\":0,\"aoa_a\":0,\"leche_desc\":0,\"leche_semi\":0,\"leche_entera\":0,\"leche_azucar\":0," +
      "\"grasas\":0,\"grasas_proteina\":0,\"azucares\":0,\"azucares_grasa\":0},\"kcal\":0,\"prot\":0,\"lip\":0,\"hc\":0}. " +
      "Los equivalentes pueden llevar decimales; kcal y macros enteros.\n\nDieta habitual:\n" +
      JSON.stringify({ tiempos: dieta });

    var p = iaJSON_(sys, instruccion, null);

    return json_({
      ok: true,
      equivalentes: p.equivalentes || {},
      kcal: Math.round(num_(p.kcal)),
      prot: Math.round(num_(p.prot)),
      lip: Math.round(num_(p.lip)),
      hc: Math.round(num_(p.hc))
    });
  } catch (e) {
    return json_({ ok: false, error: e.message });
  }
}


/* =====================================================================
 *  2) leerInBody · lee el reporte InBody (imagen o PDF) y guarda el archivo
 * ===================================================================== */
function leerInBody_(body) {
  try {
    var b64 = (body.pdfBase64 || "").toString();
    if (!b64) return json_({ ok: false, error: "No se recibió el archivo del InBody." });
    var ci = b64.indexOf("base64,");
    if (ci > -1) b64 = b64.substring(ci + 7);

    var mime = (body.mime || "").toLowerCase();
    var esPDF = mime.indexOf("pdf") >= 0;

    var sys = "Eres asistente de una nutrióloga. Recibes el reporte de una báscula de composición corporal (InBody o " +
      "similar). Extrae los datos numéricos con precisión. Si un dato no aparece, devuélvelo como 0. " +
      "Devuelve EXCLUSIVAMENTE JSON válido, sin texto adicional ni markdown.";

    var instruccion = "Extrae del reporte y responde SOLO con JSON con esta forma exacta: " +
      "{\"fecha\":\"YYYY-MM-DD\",\"peso\":0,\"talla\":0,\"grasa\":0,\"grasaKg\":0,\"mme\":0,\"visceral\":0,\"agua\":0,\"tmb\":0}. " +
      "Donde: fecha = fecha de la medición (si no aparece, usa \"\"); peso = peso en kg; talla = estatura en cm; " +
      "grasa = porcentaje de grasa corporal (PGC); grasaKg = masa de grasa corporal en kg; mme = masa muscular " +
      "esquelética en kg; visceral = nivel de grasa visceral; agua = agua corporal total en litros; " +
      "tmb = tasa metabólica basal en kcal. Todos los valores numéricos (usa punto decimal).";

    var contenido = esPDF
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : { type: "image", source: { type: "base64", media_type: (mime || "image/jpeg"), data: b64 } };

    var d = iaJSON_(sys, instruccion, contenido);

    // Guardar el archivo en Drive (carpeta InBody del paciente)
    var link = "", fileId = "";
    try {
      var patient = (body.patient || "Paciente").toString();
      var fname = (body.filename || ("InBody_" + patient + ".pdf")).toString();
      var blob = Utilities.newBlob(Utilities.base64Decode(b64), (mime || "application/pdf"), fname);
      var folder = ensurePath_([ROOT_NAME, PACIENTES_NAME, patient, INBODY_NAME]);
      var file = folder.createFile(blob);
      try { compartirConPaciente_(file, body.correo); } catch (e2) {}
      link = file.getUrl(); fileId = file.getId();
    } catch (eDrive) {
      // Si falla el guardado, igual devolvemos los datos leídos.
    }

    return json_({
      ok: true,
      fecha: d.fecha || "",
      peso: num_(d.peso), talla: num_(d.talla),
      grasa: num_(d.grasa), grasaKg: num_(d.grasaKg),
      mme: num_(d.mme), visceral: num_(d.visceral),
      agua: num_(d.agua), tmb: num_(d.tmb),
      link: link, fileId: fileId
    });
  } catch (e) {
    return json_({ ok: false, error: e.message });
  }
}


/* =====================================================================
 *  3) ajustarMenuIA · aplica la nota de seguimiento al menú existente
 * ===================================================================== */
function ajustarMenuIA_(body) {
  try {
    var tiempos = body.tiempos || [];
    var nota = (body.nota || "").toString().trim();
    if (!tiempos.length) return json_({ ok: false, error: "No se recibieron los tiempos del menú." });
    if (!nota) return json_({ ok: false, error: "No se recibió la nota de seguimiento." });

    var sys = "Eres asistente de una nutrióloga mexicana. Recibes un MENÚ ya armado (tiempos con sus opciones) y una " +
      "NOTA DE SEGUIMIENTO con los cambios que pide la nutrióloga o el paciente. Tu tarea es AJUSTAR el menú aplicando " +
      "SOLO lo que pide la nota.\n" +
      "REGLAS:\n" +
      "1) Cambia ÚNICAMENTE lo que la nota indica. Todo lo demás debe quedar IGUAL (mismo platillo, misma redacción).\n" +
      "2) NO cambies las cantidades ni los gramajes, salvo que la nota lo pida expresamente: los equivalentes del plan " +
      "deben respetarse.\n" +
      "3) Cada platillo debe seguir siendo APROPIADO para su tiempo de comida (desayuno con comida de desayuno, etc.) " +
      "y de la cocina mexicana.\n" +
      "4) Devuelve TODOS los tiempos y TODAS las opciones recibidas, en el MISMO ORDEN y en la misma cantidad.\n" +
      "Devuelve EXCLUSIVAMENTE JSON válido, sin texto adicional ni markdown.";

    var datos = { objetivo: body.objetivo || "", nota_de_seguimiento: nota, menu_actual: tiempos };

    var instruccion = "Aplica la nota de seguimiento al menú. Responde SOLO con JSON con esta forma exacta: " +
      "{\"tiempos\":[{\"opciones\":[{\"nombre\":\"\",\"prep\":\"\"}]}]}. " +
      "Debe haber un elemento en 'tiempos' por cada tiempo recibido, en el mismo orden, y la misma cantidad de opciones " +
      "por tiempo. Conserva sin cambios lo que la nota no pida modificar.\n\nDatos:\n" + JSON.stringify(datos);

    var p = iaJSON_(sys, instruccion, null);
    return json_({ ok: true, tiempos: (p.tiempos || []) });
  } catch (e) {
    return json_({ ok: false, error: e.message });
  }
}


/* =====================================================================
 *  4) saveEstudio · guarda un estudio del paciente en Drive
 * ===================================================================== */
function saveEstudio_(body) {
  try {
    var patient = (body.patient || "").toString();
    if (!patient) return json_({ ok: false, error: "Falta el nombre del paciente." });

    var b64 = (body.fileBase64 || "").toString();
    if (!b64) return json_({ ok: false, error: "No se recibió el archivo." });
    var ci = b64.indexOf("base64,");
    if (ci > -1) b64 = b64.substring(ci + 7);

    var fname = (body.filename || ("Estudio_" + patient + ".pdf")).toString();
    var mime = (body.mime || "application/pdf").toString();

    var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, fname);
    // Guarda en la carpeta de Análisis del paciente (misma que usa saveAnalisis)
    var folder = ensurePath_([ROOT_NAME, PACIENTES_NAME, patient, ANALISIS_NAME]);
    var file = folder.createFile(blob);
    var compartido = false;
    try { compartido = compartirConPaciente_(file, body.correo); } catch (e2) {}

    return json_({
      ok: true, action: "saveEstudio", patient: patient,
      fileId: file.getId(), link: file.getUrl(), filename: fname,
      folder: folder.getUrl(), compartido: compartido
    });
  } catch (e) {
    return json_({ ok: false, error: e.message });
  }
}
