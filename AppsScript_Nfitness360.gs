/**
 * Nfitness 360 · Conector de Google Drive
 * ----------------------------------------
 * Crea la estructura de carpetas por paciente y guarda los PDF de los planes.
 *
 * Estructura que mantiene en tu Drive:
 *   Sistema Nfitness 360 / Pacientes / <Nombre del paciente> / Planes / <archivo.pdf>
 *
 * Acciones que entiende (vía POST con JSON):
 *   - { "action": "createPatient", "patient": "Jimena Pérez" }
 *        -> crea (si no existe) la carpeta del paciente y su subcarpeta "Planes".
 *           Devuelve el enlace de la carpeta del paciente.
 *   - { "action": "savePlan", "patient": "Jimena Pérez",
 *       "filename": "Plan_Jimena_2026-06-11.pdf", "html": "<html del reporte>" }
 *        -> Google convierte ese HTML a PDF y lo guarda en .../<paciente>/Planes/.
 *           (Alternativa: enviar "pdfBase64" en vez de "html" para guardar un PDF ya hecho.)
 *           Devuelve el enlace del archivo.
 *
 * CÓMO PUBLICARLO (una sola vez):
 *   1. Ve a https://script.google.com  ->  Nuevo proyecto.
 *   2. Pega TODO este código y guarda.
 *   3. Implementar  ->  Nueva implementación  ->  Tipo: "Aplicación web".
 *        - Ejecutar como: "Yo" (tu cuenta).
 *        - Quién tiene acceso: "Cualquier usuario".
 *   4. Autoriza los permisos de Drive cuando lo pida.
 *   5. Copia la "URL de la aplicación web" (termina en /exec). Esa URL va en el panel.
 */

var ROOT_NAME = "Sistema Nfitness 360";
var PACIENTES_NAME = "Pacientes";
var PLANES_NAME = "Planes";
var ANALISIS_NAME = "Análisis";
var HISTORIAL_NAME = "Historial Clínico";
var INBODY_NAME = "InBody";
var ISAK_NAME = "ISAK";

// ── IA (Capa 2): generación de menús ──
var IA_MODEL = "claude-sonnet-4-6";   // si Anthropic te da otro nombre exacto de modelo, cámbialo aquí
var IA_MAX_TOKENS = 4000;

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || "savePlan";
    var patient = sanitize_(body.patient || "Paciente");

    if (action === "createPatient") {
      var pf = ensurePath_([ROOT_NAME, PACIENTES_NAME, patient, PLANES_NAME]);
      var patientFolder = pf.getParents().hasNext() ? pf.getParents().next() : pf;
      return json_({ ok: true, action: action, patient: patient,
                     patientFolder: patientFolder.getUrl(), planesFolder: pf.getUrl() });
    }

    if (action === "savePlan") {
      var filename = (body.filename || ("Plan_" + patient + ".pdf")).toString();
      if (filename.slice(-4).toLowerCase() !== ".pdf") filename += ".pdf";

      var blob;
      if (body.html) {
        // OPCIÓN 1: Google convierte el HTML del reporte a PDF.
        blob = Utilities.newBlob(body.html, "text/html", filename).getAs("application/pdf");
        blob.setName(filename);
      } else if (body.pdfBase64) {
        // Alternativa: guardar un PDF ya generado (base64).
        var b64 = body.pdfBase64;
        var ci = b64.indexOf("base64,");
        if (ci > -1) b64 = b64.substring(ci + 7);
        blob = Utilities.newBlob(Utilities.base64Decode(b64), "application/pdf", filename);
      } else {
        throw new Error("Falta 'html' o 'pdfBase64'.");
      }

      var planes = ensurePath_([ROOT_NAME, PACIENTES_NAME, patient, PLANES_NAME]);
      var file = planes.createFile(blob);
      var compartidoPlan = compartirConPaciente_(file, body.correo);
      // Programa el seguimiento a 15 días (anota fecha del plan en la bitácora).
      registrarSeguimiento15_(patient, body.correo);
      // NOTA DE PRIVACIDAD: por defecto el archivo NO se hace público.
      // Queda en tu Drive y lo abres con tu cuenta. Si quieres compartirlo por
      // enlace, descomenta la línea siguiente bajo tu propio criterio:
      // file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return json_({ ok: true, action: action, patient: patient,
                     fileId: file.getId(), link: file.getUrl(),
                     filename: filename, planesFolder: planes.getUrl(), compartido: compartidoPlan });
    }

    if (action === "saveAnalisis") {
      var fnameA = (body.filename || ("Analisis_" + patient + ".pdf")).toString();
      if (fnameA.slice(-4).toLowerCase() !== ".pdf") fnameA += ".pdf";
      if (!body.pdfBase64) throw new Error("Falta 'pdfBase64'.");
      var b64a = body.pdfBase64;
      var cia = b64a.indexOf("base64,");
      if (cia > -1) b64a = b64a.substring(cia + 7);
      var blobA = Utilities.newBlob(Utilities.base64Decode(b64a), "application/pdf", fnameA);

      var analisisFolder = ensurePath_([ROOT_NAME, PACIENTES_NAME, patient, ANALISIS_NAME]);
      var fileA = analisisFolder.createFile(blobA);
      compartirConPaciente_(fileA, body.correo);

      return json_({ ok: true, action: action, patient: patient,
                     fileId: fileA.getId(), link: fileA.getUrl(),
                     filename: fnameA, analisisFolder: analisisFolder.getUrl() });
    }

    if (action === "saveHistorial") {
      var fnameH = (body.filename || ("Historial_" + patient + ".pdf")).toString();
      if (fnameH.slice(-4).toLowerCase() !== ".pdf") fnameH += ".pdf";

      var blobH;
      if (body.html) {
        blobH = Utilities.newBlob(body.html, "text/html", fnameH).getAs("application/pdf");
        blobH.setName(fnameH);
      } else if (body.pdfBase64) {
        var b64h = body.pdfBase64;
        var cih = b64h.indexOf("base64,");
        if (cih > -1) b64h = b64h.substring(cih + 7);
        blobH = Utilities.newBlob(Utilities.base64Decode(b64h), "application/pdf", fnameH);
      } else {
        throw new Error("Falta 'html' o 'pdfBase64'.");
      }

      var histFolder = ensurePath_([ROOT_NAME, PACIENTES_NAME, patient, HISTORIAL_NAME]);
      var fileH = histFolder.createFile(blobH);
      compartirConPaciente_(fileH, body.correo);

      return json_({ ok: true, action: action, patient: patient,
                     fileId: fileH.getId(), link: fileH.getUrl(),
                     filename: fnameH, historialFolder: histFolder.getUrl() });
    }

    if (action === "saveInBody") {
      var fnameIB = (body.filename || ("InBody_" + patient + ".pdf")).toString();
      if (fnameIB.slice(-4).toLowerCase() !== ".pdf") fnameIB += ".pdf";
      if (!body.pdfBase64) throw new Error("Falta 'pdfBase64'.");
      var b64ib = body.pdfBase64;
      var ciib = b64ib.indexOf("base64,");
      if (ciib > -1) b64ib = b64ib.substring(ciib + 7);
      var blobIB = Utilities.newBlob(Utilities.base64Decode(b64ib), "application/pdf", fnameIB);

      var inbodyFolder = ensurePath_([ROOT_NAME, PACIENTES_NAME, patient, INBODY_NAME]);
      var fileIB = inbodyFolder.createFile(blobIB);
      compartirConPaciente_(fileIB, body.correo);

      return json_({ ok: true, action: action, patient: patient,
                     fileId: fileIB.getId(), link: fileIB.getUrl(),
                     filename: fnameIB, inbodyFolder: inbodyFolder.getUrl() });
    }

    if (action === "saveISAK") {
      var fnameISAK = (body.filename || ("ISAK_" + patient + ".pdf")).toString();
      if (fnameISAK.slice(-4).toLowerCase() !== ".pdf") fnameISAK += ".pdf";
      if (!body.pdfBase64) throw new Error("Falta 'pdfBase64'.");
      var b64is = body.pdfBase64;
      var cis = b64is.indexOf("base64,");
      if (cis > -1) b64is = b64is.substring(cis + 7);
      var blobIS = Utilities.newBlob(Utilities.base64Decode(b64is), "application/pdf", fnameISAK);

      var isakFolder = ensurePath_([ROOT_NAME, PACIENTES_NAME, patient, ISAK_NAME]);
      var fileIS = isakFolder.createFile(blobIS);
      compartirConPaciente_(fileIS, body.correo);

      return json_({ ok: true, action: action, patient: patient,
                     fileId: fileIS.getId(), link: fileIS.getUrl(),
                     filename: fnameISAK, isakFolder: isakFolder.getUrl() });
    }

    if (action === "generarMenusIA") {
      return generarMenusIA_(body);
    }

    if (action === "listaSuperIA") {
      return listaSuperIA_(body);
    }

    if (action === "crearCita") {
      return crearCita_(body);
    }

    if (action === "cancelarCita") {
      return cancelarCita_(body);
    }

    throw new Error("Acción no reconocida: " + action);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet(e) {
  return json_({ ok: true, service: "Nfitness 360 Drive", status: "activo" });
}

/* ---------- utilidades de carpetas ---------- */
function ensurePath_(parts) {
  var folder = getOrCreateTop_(parts[0]);
  for (var i = 1; i < parts.length; i++) folder = getOrCreateChild_(folder, parts[i]);
  return folder;
}
function getOrCreateTop_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
function getOrCreateChild_(parent, name) {
  var it = parent.getFoldersByName(name);
  while (it.hasNext()) { var f = it.next(); if (f.getParents().hasNext() && f.getParents().next().getId() === parent.getId()) return f; }
  return parent.createFolder(name);
}
function sanitize_(name) {
  return String(name).replace(/[\\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim() || "Paciente";
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---- Comparte un archivo como SOLO LECTURA con el correo del paciente ----
// Así el paciente lo abre con su cuenta sin pedir acceso, y nadie más lo ve.
function compartirConPaciente_(file, correo) {
  var c = (correo || "").toString().trim().toLowerCase();
  if (!c || c.indexOf("@") < 0) return false;
  try { file.addViewer(c); return true; }
  catch (e) { return false; }
}

/* =====================================================================
 *  CITAS · Google Calendar + correo de confirmación personalizado
 *  Acción: { action:"crearCita", paciente, correo, fecha:"YYYY-MM-DD",
 *            hora:"HH:MM", dur:60, tipoNombre:"Primera vez",
 *            online:true|false, objetivo:"", notas:"" }
 *  Requisitos en el editor de Apps Script (una sola vez):
 *    - Servicios (＋)  ->  "Calendar API"  (servicio avanzado, para el enlace de Meet).
 *    - Al re-implementar, autoriza permisos de Calendar y Gmail.
 * ===================================================================== */

// ---- Datos fijos del consultorio (cámbialos aquí cuando lo necesites) ----
var TZ          = "America/Mexico_City";
var NEGOCIO     = "Nfitness 360";
var NUTRIOLOGA  = "Lic. N. Natalia Flores";
var DIRECCION   = "Av. América 224 Int. 207, Parque San Andrés, Coyoacán, CDMX, 04040";
var TEL_WA      = "55 4828 0417";
var CORREO_CONT = "nutnfitness360@gmail.com";
var REDES       = "@nfitness360 · @nf360store";
var REAGENDA_MAX = 3;
// Logo del encabezado del correo (PNG dorado, fondo transparente).
// Súbelo a tu repo en: public/logo-email.png  (queda en esta URL pública)
var LOGO_URL = "https://raw.githubusercontent.com/nutnfitness360-byte/nfitness360/main/public/logo-email.png";

// Marca / colores del correo
var C_PINE = "#211C17", C_GOLD = "#CDA788", C_INK = "#36302B",
    C_CREAM = "#EEE4DA", C_LINE = "#E3D8CC", C_STONE = "#978C87";

var DIAS_SEM = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
var MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function crearCita_(body) {
  var nombre = (body.paciente || "Paciente").toString();
  var correo = (body.correo || "").toString().trim();
  if (!correo) throw new Error("Falta el correo del paciente.");
  var fecha = (body.fecha || "").toString();        // YYYY-MM-DD
  var hora  = (body.hora || "").toString();         // HH:MM
  if (!fecha || !hora) throw new Error("Falta fecha u hora.");
  var dur = parseInt(body.dur, 10) || 60;
  var tipoNombre = (body.tipoNombre || "Consulta").toString();
  var online = !!body.online;
  var objetivo = (body.objetivo || "").toString();
  var notas = (body.notas || "").toString();

  var esSeguimiento = /seguimiento/i.test(tipoNombre);
  var horaFin = sumarMin_(hora, dur);

  // ---- Crear el evento en Google Calendar (servicio avanzado, para Meet) ----
  var titulo = tipoNombre + " · " + nombre + (online ? " (en línea)" : "");
  var descParts = [];
  descParts.push("Tipo: " + tipoNombre);
  if (objetivo) descParts.push("Objetivo: " + objetivo);
  descParts.push("Paciente: " + nombre + " (" + correo + ")");
  if (notas) descParts.push("Notas: " + notas);

  var recurso = {
    summary: titulo,
    description: descParts.join("\n"),
    start: { dateTime: fecha + "T" + pad2_(hora) + ":00", timeZone: TZ },
    end:   { dateTime: fecha + "T" + horaFin + ":00",     timeZone: TZ }
  };
  if (online) {
    recurso.conferenceData = { createRequest: {
      requestId: "nf-" + Date.now(),
      conferenceSolutionKey: { type: "hangoutsMeet" }
    } };
  } else {
    recurso.location = DIRECCION;
  }

  var creado = Calendar.Events.insert(recurso, "primary", { conferenceDataVersion: 1 });
  var eventId = creado.id;
  var meetLink = "";
  if (online && creado.conferenceData && creado.conferenceData.entryPoints) {
    var eps = creado.conferenceData.entryPoints;
    for (var i = 0; i < eps.length; i++) {
      if (eps[i].entryPointType === "video") { meetLink = eps[i].uri; break; }
    }
  }

  // ---- Enviar el correo de confirmación ----
  var fechaBonita = fechaLarga_(fecha);
  var asunto = (online ? "Confirmación de tu cita en línea | " : "Confirmación de tu cita | ") + NEGOCIO;
  var html = online
    ? correoOnline_(nombre, fechaBonita, hora, meetLink, esSeguimiento)
    : correoPresencial_(nombre, fechaBonita, hora, esSeguimiento);

  MailApp.sendEmail({ to: correo, subject: asunto, htmlBody: html, name: NUTRIOLOGA + " · " + NEGOCIO });

  return json_({ ok: true, action: "crearCita", eventId: eventId, meet: meetLink });
}

/* ---------- plantillas de correo ---------- */
function correoPresencial_(nombre, fechaBonita, hora, esSeguimiento) {
  var refCita = esSeguimiento ? "cita de seguimiento nutricional" : "cita de valoración nutricional";
  var refInd  = esSeguimiento ? "tu cita de seguimiento" : "tu primera cita";
  var datos =
    fila_("Fecha", fechaBonita) +
    fila_("Hora", hora) +
    fila_("Modalidad", "Presencial") +
    fila_("Ubicación", DIRECCION) +
    fila_("Nutrióloga", NUTRIOLOGA);

  var indicaciones =
    "<ul style='margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:" + C_INK + ";'>" +
    li_("Preséntate con ropa ligera y cómoda (que permita realizar mediciones corporales con facilidad).") +
    li_("En el caso de las mujeres, evita agendar durante el periodo de menstruación, ya que la retención de líquidos puede alterar el análisis de composición corporal. Si tu cita coincide con esos días, te invitamos a reagendar.") +
    li_("Acude bien hidratada(o), pero evita beber grandes cantidades de líquido justo antes de la consulta.") +
    li_("Procura no realizar ejercicio ni consumir alcohol en las 12 horas previas.") +
    li_("Si es posible, llega sin haber comido en las últimas 2 a 3 horas (consulta ligera previa).") +
    li_("Vacía la vejiga antes de la medición.") +
    li_("Retira objetos metálicos (relojes, joyería, celular) al momento de la valoración.") +
    li_("Trae contigo, si los tienes: estudios de laboratorio recientes (biometría, química sanguínea, perfil de lípidos, tiroides, etc.), lista de medicamentos y suplementos que tomas, y cualquier diagnóstico médico relevante.") +
    li_("Te recomendamos llegar 5 a 10 minutos antes de tu cita.") +
    "</ul>";

  var pago =
    seccion_("Nota importante",
      "<p style='margin:6px 0 0;font-size:13px;line-height:1.6;'>El plan nutricional no será enviado hasta que el pago de la consulta esté reflejado.</p>") +
    seccion_("Medios de pago disponibles en consultorio",
      "<p style='margin:6px 0 0;font-size:13px;line-height:1.6;'>Transferencia · Depósito · Efectivo · Tarjeta</p>" +
      "<p style='margin:8px 0 0;font-size:12px;color:" + C_STONE + ";'>Nota: si ya realizaste el pago a través de la página al momento de reservar, haz caso omiso de la información anterior sobre medios de pago.</p>");

  var cuerpo =
    "<p style='font-size:14px;'>Estimado(a) <strong>" + escapar_(nombre) + "</strong>:</p>" +
    "<p style='font-size:13px;line-height:1.6;'>Es un gusto saludarte. Por medio de este correo confirmamos tu " + refCita + ":</p>" +
    tablaDatos_(datos) +
    seccion_("Indicaciones para " + refInd, indicaciones) +
    politicasHtml_() +
    pago +
    cierreHtml_();
  return wrapEmail_(cuerpo);
}

function correoOnline_(nombre, fechaBonita, hora, meetLink, esSeguimiento) {
  var refCita = esSeguimiento ? "cita de seguimiento nutricional en línea" : "cita de valoración nutricional en línea";
  var refInd  = esSeguimiento ? "tu cita de seguimiento en línea" : "tu primera cita en línea";
  var enlace = meetLink
    ? "<a href='" + meetLink + "' style='color:" + C_PINE + ";font-weight:700;'>" + meetLink + "</a>"
    : "(se compartirá el enlace de Google Meet)";
  var datos =
    fila_("Fecha", fechaBonita) +
    fila_("Hora", hora) +
    fila_("Modalidad", "En línea (videollamada)") +
    fila_("Plataforma", "Google Meet") +
    fila_("Enlace de acceso", enlace) +
    fila_("Nutrióloga", NUTRIOLOGA);

  var indicaciones =
    "<ul style='margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:" + C_INK + ";'>" +
    li_("Conéctate desde un lugar tranquilo, privado y con buena iluminación, libre de interrupciones.") +
    li_("Asegúrate de contar con una conexión a internet estable y con tu cámara y micrófono funcionando correctamente.") +
    li_("Ingresa al enlace 5 a 10 minutos antes de la hora de tu cita.") +
    li_("Ten a la mano papel y lápiz o un dispositivo para tomar notas.") +
    li_("Si cuentas con báscula y cinta métrica en casa, tenlas disponibles; la nutrióloga podría pedirte algunas mediciones (peso, estatura, cintura).") +
    li_("Ten preparados, si los tienes: estudios de laboratorio recientes, lista de medicamentos y suplementos, y cualquier diagnóstico médico relevante. Puedes enviarlos previamente al correo " + CORREO_CONT + " para agilizar la consulta.") +
    "</ul>";

  var pago =
    seccion_("Nota importante",
      "<p style='margin:6px 0 0;font-size:13px;line-height:1.6;'>La nutrióloga no accederá a la liga de la reunión hasta que el pago correspondiente esté generado. Te pedimos enviar tu comprobante de pago al WhatsApp de la nutrióloga " + TEL_WA + ".</p>") +
    seccion_("Medios de pago disponibles",
      "<p style='margin:6px 0 0;font-size:13px;line-height:1.6;'>Transferencia · Depósito · Tarjeta (mediante liga de pago en línea)</p>" +
      "<p style='margin:8px 0 0;font-size:12px;color:" + C_STONE + ";'>Nota: si ya realizaste el pago a través de la página al momento de reservar, haz caso omiso de la información anterior sobre medios de pago.</p>");

  var cuerpo =
    "<p style='font-size:14px;'>Estimado(a) <strong>" + escapar_(nombre) + "</strong>:</p>" +
    "<p style='font-size:13px;line-height:1.6;'>Es un gusto saludarte. Por medio de este correo confirmamos tu " + refCita + ":</p>" +
    tablaDatos_(datos) +
    seccion_("Indicaciones para " + refInd, indicaciones) +
    politicasHtml_() +
    pago +
    cierreHtml_();
  return wrapEmail_(cuerpo);
}

/* ---------- piezas de correo ---------- */
function politicasHtml_() {
  var ul =
    "<ul style='margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:" + C_INK + ";'>" +
    li_("Si necesitas cancelar o reagendar, te pedimos avisar con un mínimo de 24 horas de anticipación al teléfono o WhatsApp " + TEL_WA + ".") +
    li_("Las cancelaciones con menos de 24 horas de aviso generarán la pérdida total del pago realizado previamente.") +
    li_("En caso de no presentarte sin aviso previo (no-show), se cobrará el total de la consulta.") +
    li_("Cada cita puede reagendarse hasta " + REAGENDA_MAX + " veces; después será necesario realizar una nueva reservación.") +
    li_("Si la nutrióloga necesitara reprogramar por causas de fuerza mayor, se te notificará lo antes posible y se reagendará sin costo adicional.") +
    "</ul>";
  return seccion_("Políticas de cancelación y reagendamiento", ul);
}
function cierreHtml_() {
  return "<p style='margin:18px 0 0;font-size:13px;line-height:1.6;'>Si tienes alguna duda antes de tu cita, con gusto te atenderemos a través de " +
    CORREO_CONT + " o WhatsApp " + TEL_WA + ".</p>" +
    "<p style='margin:12px 0 0;font-size:13px;line-height:1.6;'>¡Te esperamos! Será un gusto acompañarte en este proceso.</p>";
}
function wrapEmail_(cuerpo) {
  return "<div style='background:" + C_CREAM + ";padding:24px;font-family:Montserrat,Arial,Helvetica,sans-serif;color:" + C_INK + ";'>" +
    "<div style='max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid " + C_LINE + ";'>" +
      "<div style='background:" + C_PINE + ";padding:18px 24px;text-align:left;'>" +
        "<img src='" + LOGO_URL + "' alt='NFITNESS 360' height='34' style='height:34px;width:auto;display:inline-block;border:0;outline:none;text-decoration:none;' />" +
      "</div>" +
      "<div style='padding:22px 24px;'>" + cuerpo + "</div>" +
      "<div style='border-top:1px solid " + C_LINE + ";padding:18px 24px;font-size:12px;color:" + C_STONE + ";line-height:1.6;'>" +
        "Saludos cordiales,<br><strong style='color:" + C_INK + ";'>" + NUTRIOLOGA + "</strong><br>" +
        "Nutrióloga · " + NEGOCIO + "<br>" +
        "Tel/WhatsApp: " + TEL_WA + " · " + CORREO_CONT + "<br>" + REDES +
      "</div>" +
    "</div></div>";
}
function tablaDatos_(filas) {
  return "<table style='width:100%;border-collapse:collapse;margin:10px 0 4px;background:" + C_CREAM + ";border-radius:10px;'>" +
    "<tbody>" + filas + "</tbody></table>";
}
function fila_(lbl, val) {
  return "<tr>" +
    "<td style='padding:8px 12px;font-size:12px;font-weight:700;color:" + C_STONE + ";width:120px;vertical-align:top;'>" + lbl + "</td>" +
    "<td style='padding:8px 12px;font-size:13px;color:" + C_INK + ";'>" + val + "</td></tr>";
}
function seccion_(titulo, htmlInterno) {
  return "<div style='margin-top:18px;'>" +
    "<div style='font-size:13px;font-weight:700;color:" + C_PINE + ";border-left:3px solid " + C_GOLD + ";padding-left:8px;'>" + titulo + "</div>" +
    htmlInterno + "</div>";
}
function li_(t) { return "<li style='margin-bottom:5px;'>" + t + "</li>"; }
function escapar_(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* ---------- utilidades de fecha/hora ---------- */
function pad2_(hhmm) { var p = hhmm.split(":"); return ("0"+p[0]).slice(-2) + ":" + ("0"+(p[1]||"00")).slice(-2); }
function sumarMin_(hhmm, min) {
  var p = hhmm.split(":"); var t = parseInt(p[0],10)*60 + parseInt(p[1]||"0",10) + min;
  var h = Math.floor(t/60), m = t%60;
  return ("0"+h).slice(-2) + ":" + ("0"+m).slice(-2);
}
function fechaLarga_(fecha) {
  var p = fecha.split("-"); var y = +p[0], mo = +p[1], d = +p[2];
  var dow = new Date(y, mo-1, d).getDay();
  var nom = DIAS_SEM[dow]; nom = nom.charAt(0).toUpperCase() + nom.slice(1);
  return nom + ", " + d + " de " + MESES_ES[mo-1] + " de " + y;
}

/* =====================================================================
 *  RECORDATORIO · se envía 72 h antes (revisa las citas de 3 días después)
 *  Se ejecuta SOLO mediante un disparador de tiempo (no desde la app).
 *  Para activarlo: ejecuta una vez la función  instalarTriggerRecordatorios()
 * ===================================================================== */
function instalarTriggerRecordatorios() {
  // Elimina triggers previos de esta función para no duplicar
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "enviarRecordatorios_") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // Crea un disparador diario ~8:00 a.m.
  ScriptApp.newTrigger("enviarRecordatorios_")
    .timeBased().everyDays(1).atHour(8).inTimezone(TZ).create();
  return "Trigger de recordatorios instalado (diario ~8:00 a.m.).";
}

function enviarRecordatorios_() {
  // Día objetivo = hoy + 3 días (en la zona horaria del consultorio)
  var ahora = new Date();
  var objetivo = new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000);
  var ymd = Utilities.formatDate(objetivo, TZ, "yyyy-MM-dd");
  var timeMin = ymd + "T00:00:00-06:00"; // CDMX ya no usa horario de verano (-06:00 fijo)
  var timeMax = ymd + "T23:59:59-06:00";

  var resp = Calendar.Events.list("primary", {
    timeMin: timeMin, timeMax: timeMax, singleEvents: true, orderBy: "startTime", maxResults: 100
  });
  var items = (resp && resp.items) || [];
  var enviados = 0;

  for (var i = 0; i < items.length; i++) {
    var ev = items[i];
    if (!ev.start || !ev.start.dateTime) continue;            // ignora eventos de día completo
    var desc = ev.description || "";
    var mCorreo = desc.match(/Paciente:\s*.*\(([^)]+@[^)]+)\)/);
    if (!mCorreo) continue;                                    // no es una cita del sistema
    // anti-duplicados: si ya se envió, saltar
    var ext = ev.extendedProperties && ev.extendedProperties.private;
    if (ext && ext.recordatorioEnviado === "1") continue;

    var correo = mCorreo[1].trim();
    var mNom = desc.match(/Paciente:\s*([^(]+)\(/);
    var nombre = mNom ? mNom[1].trim() : "Paciente";

    var inicio = new Date(ev.start.dateTime);
    var hora = Utilities.formatDate(inicio, TZ, "HH:mm");
    var fechaBonita = fechaLarga_(ymd);

    // modalidad / enlace
    var meetLink = "";
    if (ev.conferenceData && ev.conferenceData.entryPoints) {
      for (var k = 0; k < ev.conferenceData.entryPoints.length; k++) {
        if (ev.conferenceData.entryPoints[k].entryPointType === "video") { meetLink = ev.conferenceData.entryPoints[k].uri; break; }
      }
    }
    var online = !!meetLink || /en l[ií]nea/i.test(ev.summary || "");
    var ubicacion = online ? (meetLink || "(se compartirá el enlace de Google Meet)") : (ev.location || DIRECCION);

    try {
      MailApp.sendEmail({
        to: correo,
        subject: "Recordatorio de tu cita | " + NEGOCIO,
        htmlBody: correoRecordatorio_(nombre, fechaBonita, hora, online, ubicacion),
        name: NUTRIOLOGA + " · " + NEGOCIO
      });
      // marcar como recordado
      Calendar.Events.patch({ extendedProperties: { private: { recordatorioEnviado: "1" } } }, "primary", ev.id);
      enviados++;
    } catch (e) { /* continúa con los demás aunque uno falle */ }
  }
  Logger.log("Recordatorios enviados para " + ymd + ": " + enviados);
  return enviados;
}

function correoRecordatorio_(nombre, fechaBonita, hora, online, ubicacion) {
  var enlaceVal = online
    ? "<a href='" + ubicacion + "' style='color:" + C_PINE + ";font-weight:700;'>" + ubicacion + "</a>"
    : ubicacion;
  var datos =
    fila_("Fecha", fechaBonita) +
    fila_("Hora", hora) +
    fila_("Modalidad", online ? "En línea" : "Presencial") +
    fila_(online ? "Enlace" : "Ubicación", enlaceVal) +
    fila_("Nutrióloga", NUTRIOLOGA);

  var cuerpo =
    "<p style='font-size:14px;'>Estimado(a) <strong>" + escapar_(nombre) + "</strong>:</p>" +
    "<p style='font-size:13px;line-height:1.6;'>Es un gusto saludarte. Te escribimos para recordarte tu próxima cita de valoración nutricional:</p>" +
    tablaDatos_(datos) +
    "<p style='margin:16px 0 0;font-size:13px;line-height:1.6;'>Te pedimos llegar (o conectarte) 5 a 10 minutos antes de la hora de tu cita.</p>" +
    "<p style='margin:10px 0 0;font-size:13px;line-height:1.6;'>Si necesitas cancelar o reagendar, recuerda avisarnos con un mínimo de 24 horas de anticipación a través de WhatsApp " + TEL_WA + ". Las cancelaciones con menos de 24 horas de aviso generan la pérdida total del pago realizado previamente.</p>" +
    "<p style='margin:14px 0 0;font-size:13px;line-height:1.6;'>¡Te esperamos! Será un gusto acompañarte en este proceso.</p>";
  return wrapEmail_(cuerpo);
}

// ---- PRUEBA del recordatorio: envía a ti misma con datos de ejemplo ----
function PRUEBA_recordatorio() {
  var html = correoRecordatorio_("Paciente Prueba", fechaLarga_("2026-06-18"), "11:30", false, DIRECCION);
  MailApp.sendEmail({ to: CORREO_CONT, subject: "PRUEBA Recordatorio | " + NEGOCIO, htmlBody: html, name: NUTRIOLOGA + " · " + NEGOCIO });
}

/* =====================================================================
 *  CANCELAR CITA · borra el evento de Calendar + correos de cancelación
 *  Acción: { action:"cancelarCita", eventId, correo, paciente, fecha:"YYYY-MM-DD",
 *            hora:"HH:MM", tipoNombre, online, canceladoPor:"paciente"|"nutriologa" }
 * ===================================================================== */
function cancelarCita_(body) {
  var nombre = (body.paciente || "Paciente").toString();
  var correo = (body.correo || "").toString().trim();
  var fecha = (body.fecha || "").toString();
  var hora  = (body.hora || "").toString();
  var tipoNombre = (body.tipoNombre || "Consulta").toString();
  var online = !!body.online;
  var canceladoPor = (body.canceladoPor || "paciente").toString();
  var eventId = (body.eventId || "").toString();

  // 1) Borrar el evento del calendario (si tenemos su id)
  var eventoBorrado = false;
  if (eventId) {
    try { Calendar.Events.remove("primary", eventId); eventoBorrado = true; }
    catch (e) { /* el evento pudo no existir; continuamos con los correos */ }
  }

  var fechaBonita = fechaLarga_(fecha);

  // 2) Correo al PACIENTE (de marca)
  if (correo) {
    MailApp.sendEmail({
      to: correo,
      subject: "Cita cancelada | " + NEGOCIO,
      htmlBody: correoCancelacion_(nombre, fechaBonita, hora, online, canceladoPor),
      name: NUTRIOLOGA + " · " + NEGOCIO
    });
  }

  // 3) Aviso interno a la NUTRIÓLOGA
  var quien = (canceladoPor === "nutriologa") ? "la nutrióloga" : "el paciente";
  var interno =
    "<div style='font-family:Montserrat,Arial,sans-serif;color:" + C_INK + ";font-size:13px;line-height:1.6;'>" +
    "<p>Se canceló una cita (cancelada por " + quien + "):</p>" +
    "<ul>" +
      "<li><strong>Paciente:</strong> " + escapar_(nombre) + (correo ? " (" + escapar_(correo) + ")" : "") + "</li>" +
      "<li><strong>Fecha:</strong> " + fechaBonita + "</li>" +
      "<li><strong>Hora:</strong> " + escapar_(hora) + "</li>" +
      "<li><strong>Tipo:</strong> " + escapar_(tipoNombre) + (online ? " (en línea)" : "") + "</li>" +
      "<li><strong>Evento en Calendar:</strong> " + (eventoBorrado ? "eliminado" : "no se encontró / sin id") + "</li>" +
    "</ul></div>";
  MailApp.sendEmail({ to: CORREO_CONT, subject: "Cita cancelada: " + nombre + " · " + fecha + " " + hora, htmlBody: interno, name: NEGOCIO });

  return json_({ ok: true, action: "cancelarCita", eventoBorrado: eventoBorrado });
}

function correoCancelacion_(nombre, fechaBonita, hora, online, canceladoPor) {
  var porNutri = (canceladoPor === "nutriologa");
  var datos =
    fila_("Fecha", fechaBonita) +
    fila_("Hora", hora) +
    fila_("Modalidad", online ? "En línea" : "Presencial") +
    fila_("Nutrióloga", NUTRIOLOGA);

  var disculpa = porNutri
    ? "<p style='font-size:13px;line-height:1.6;'>Lamentamos el inconveniente y te ofrecemos una disculpa.</p>"
    : "";

  var cuerpo =
    "<p style='font-size:14px;'>Estimado(a) <strong>" + escapar_(nombre) + "</strong>:</p>" +
    "<p style='font-size:15px;font-weight:700;color:" + C_PINE + ";margin:6px 0;'>¡Tu cita ha sido cancelada!</p>" +
    "<p style='font-size:13px;line-height:1.6;'>Te confirmamos que tu cita ha sido cancelada correctamente:</p>" +
    tablaDatos_(datos) +
    disculpa +
    "<p style='margin:16px 0 0;font-size:13px;line-height:1.6;'>Esperamos poder verte pronto para continuar con tu objetivo.</p>" +
    "<p style='margin:10px 0 0;font-size:13px;line-height:1.6;'>Si deseas reagendar una nueva cita, con gusto te apoyamos a través de tu sesión en el sistema.</p>" +
    "<p style='margin:10px 0 0;font-size:13px;line-height:1.6;'>Quedamos a tus órdenes para cualquier duda o para ayudarte a programar tu próxima consulta.</p>";
  return wrapEmail_(cuerpo);
}

/* =====================================================================
 *  ENCUESTA DE SATISFACCIÓN · se envía el día después de la cita
 *  Trigger diario (~8:00 a.m.) que revisa las citas del DÍA ANTERIOR.
 *  Para activarlo: ejecuta una vez la función  instalarTriggerEncuestas()
 * ===================================================================== */
var FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfzl19B7D6HR6edisu8vNLxZ3-8GgyiH5_SA3WXlsa4Q5g6Cw/viewform";

// Cuestionario de SEGUIMIENTO a 15 días (otro Google Form distinto al de satisfacción).
// Pega aquí la URL de tu formulario:
var SEG15_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScJKNWLlo8EawJFtU5Q2UTiuSEY8kxxQY2Ze9QkUQxPJxdA5A/viewform";
var SEG_SHEET_NAME = "Nfitness 360 · Seguimientos 15d";

function instalarTriggerEncuestas() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "enviarEncuestas_") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("enviarEncuestas_")
    .timeBased().everyDays(1).atHour(8).inTimezone(TZ).create();
  return "Trigger de encuestas instalado (diario ~8:00 a.m., revisa el día anterior).";
}

function enviarEncuestas_() {
  // Día a revisar = ayer (en la zona horaria del consultorio)
  var ayer = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  var ymd = Utilities.formatDate(ayer, TZ, "yyyy-MM-dd");
  var timeMin = ymd + "T00:00:00-06:00"; // CDMX sin horario de verano (-06:00 fijo)
  var timeMax = ymd + "T23:59:59-06:00";

  var resp = Calendar.Events.list("primary", {
    timeMin: timeMin, timeMax: timeMax, singleEvents: true, orderBy: "startTime", maxResults: 100
  });
  var items = (resp && resp.items) || [];
  var enviados = 0;

  for (var i = 0; i < items.length; i++) {
    var ev = items[i];
    if (!ev.start || !ev.start.dateTime) continue;            // ignora eventos de día completo
    var desc = ev.description || "";
    var mCorreo = desc.match(/Paciente:\s*.*\(([^)]+@[^)]+)\)/);
    if (!mCorreo) continue;                                    // no es una cita del sistema
    var ext = ev.extendedProperties && ev.extendedProperties.private;
    if (ext && ext.encuestaEnviada === "1") continue;          // anti-duplicados

    var correo = mCorreo[1].trim();
    var mNom = desc.match(/Paciente:\s*([^(]+)\(/);
    var nombre = mNom ? mNom[1].trim() : "Paciente";

    try {
      MailApp.sendEmail({
        to: correo,
        subject: "¿Cómo fue tu experiencia? | " + NEGOCIO,
        htmlBody: correoEncuesta_(nombre),
        name: NUTRIOLOGA + " · " + NEGOCIO
      });
      Calendar.Events.patch({ extendedProperties: { private: { encuestaEnviada: "1" } } }, "primary", ev.id);
      enviados++;
    } catch (e) { /* continúa con los demás aunque uno falle */ }
  }
  Logger.log("Encuestas enviadas para " + ymd + ": " + enviados);
  return enviados;
}

function correoEncuesta_(nombre) {
  var preguntas = [
    "En general, ¿qué tan satisfecho(a) quedaste con tu consulta? (1 a 5)",
    "¿Cómo calificarías la atención y el trato de la nutrióloga? (1 a 5)",
    "¿Sentiste que se resolvieron tus dudas y se atendieron tus objetivos? (1 a 5)",
    "¿Qué tan claras te parecieron las indicaciones y tu plan nutricional? (1 a 5)",
    "¿Cómo calificarías la puntualidad y el tiempo de tu consulta? (1 a 5)",
    "¿Qué tan sencillo fue el proceso de agendar y realizar tu pago? (1 a 5)",
    "¿Recomendarías nuestro servicio a familiares o amigos? (Sí / No / Tal vez)",
    "¿Volverías a agendar una consulta con nosotros? (Sí / No / Tal vez)",
    "¿Tienes algún comentario o sugerencia para mejorar? (Respuesta abierta)"
  ];
  var lista = "<ol style='margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:" + C_INK + ";'>";
  for (var i = 0; i < preguntas.length; i++) lista += "<li style='margin-bottom:6px;'>" + escapar_(preguntas[i]) + "</li>";
  lista += "</ol>";

  var boton =
    "<div style='text-align:center;margin:22px 0 6px;'>" +
      "<a href='" + FORM_URL + "' style='display:inline-block;background:" + C_PINE + ";color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 30px;border-radius:11px;'>Responder encuesta</a>" +
    "</div>" +
    "<p style='text-align:center;font-size:11px;color:" + C_STONE + ";margin:6px 0 0;'>Solo te tomará un par de minutos.</p>";

  var cuerpo =
    "<p style='font-size:14px;'>Estimado(a) <strong>" + escapar_(nombre) + "</strong>:</p>" +
    "<p style='font-size:13px;line-height:1.6;'>Es un gusto saludarte. Queremos seguir mejorando para acompañarte de la mejor manera en tu proceso. Por ello, te pedimos unos minutos para responder esta breve <strong>encuesta de satisfacción</strong> sobre tu consulta de nutrición.</p>" +
    "<p style='font-size:13px;line-height:1.6;'>Tus respuestas son completamente confidenciales y nos ayudan muchísimo a brindarte un mejor servicio.</p>" +
    boton +
    seccion_("Lo que te preguntaremos",
      "<p style='margin:6px 0 0;font-size:12px;color:" + C_STONE + ";'>Para las preguntas con escala: 1 = Muy insatisfecho · 5 = Excelente.</p>" + lista) +
    "<p style='margin:18px 0 0;font-size:13px;line-height:1.6;'>Agradecemos mucho tu tiempo y la confianza que depositas en nosotros.</p>";
  return wrapEmail_(cuerpo);
}

// ---- PRUEBA de la encuesta: envía a ti misma ----
function PRUEBA_encuesta() {
  MailApp.sendEmail({
    to: CORREO_CONT,
    subject: "PRUEBA Encuesta | " + NEGOCIO,
    htmlBody: correoEncuesta_("Paciente Prueba"),
    name: NUTRIOLOGA + " · " + NEGOCIO
  });
}

// ── IA (Capa 2): genera opciones de platillos por tiempo de comida ──
// Requiere una Propiedad del script llamada ANTHROPIC_API_KEY.
// (Apps Script → Configuración del proyecto → Propiedades del script → Agregar)
function generarMenusIA_(body) {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return json_({ ok: false, error: "Falta ANTHROPIC_API_KEY en las Propiedades del script." });

  var tiempos = body.tiempos || [];
  if (!tiempos.length) return json_({ ok: false, error: "No se recibieron tiempos de comida." });
  var nOp = body.nOpciones || 3;

  var sys = "Eres asistente de una nutrióloga mexicana. Propones platillos concretos para un plan basado en el " +
    "Sistema Mexicano de Alimentos Equivalentes (SMAE). Para cada tiempo de comida recibes los equivalentes por grupo " +
    "y los macros objetivo (kcal, proteína, lípidos, hidratos). Propón opciones que se CIÑAN lo más posible a esos " +
    "equivalentes y macros, con alimentos comunes y accesibles en México y porciones caseras claras. " +
    "Devuelve EXCLUSIVAMENTE JSON válido, sin texto adicional ni markdown.";

  var datos = {
    objetivo: body.objetivo || "",
    totales_del_dia: body.totales || {},
    n_opciones_por_tiempo: nOp,
    tiempos: tiempos.map(function (t) {
      return { nombre: t.nombre, hora: t.hora, equivalentes: t.equivalentes, objetivo_macros: t.objetivoMacros };
    })
  };

  var instruccion = "Genera exactamente " + nOp + " opciones por cada tiempo, en el MISMO ORDEN recibido. " +
    "Cada opción debe tener 'nombre' (nombre del platillo) y 'prep' (preparación breve de 1-2 frases con cantidades " +
    "acordes a los equivalentes). Responde SOLO con JSON con esta forma exacta: " +
    "{\"tiempos\":[{\"opciones\":[{\"nombre\":\"\",\"prep\":\"\"}]}]}. " +
    "Debe haber un elemento en 'tiempos' por cada tiempo recibido y en el mismo orden.\n\nDatos:\n" + JSON.stringify(datos);

  var payload = {
    model: IA_MODEL,
    max_tokens: IA_MAX_TOKENS,
    system: sys,
    messages: [{ role: "user", content: instruccion }]
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
  if (code < 200 || code >= 300) return json_({ ok: false, error: "IA HTTP " + code + ": " + raw.slice(0, 300) });

  var out;
  try { out = JSON.parse(raw); } catch (e) { return json_({ ok: false, error: "Respuesta de IA no parseable." }); }

  var text = "";
  if (out && out.content && out.content.length) {
    for (var i = 0; i < out.content.length; i++) {
      if (out.content[i].type === "text") text += out.content[i].text;
    }
  }
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  var parsed;
  try { parsed = JSON.parse(text); } catch (e) { return json_({ ok: false, error: "La IA no devolvió JSON válido." }); }

  return json_({ ok: true, tiempos: (parsed.tiempos || []) });
}

// ── IA (Capa 2): genera la LISTA DEL SÚPER a partir de los menús ──
// Una lista por OPCIÓN, para N días (multiplica las cantidades de un día por 'dias').
function listaSuperIA_(body) {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return json_({ ok: false, error: "Falta ANTHROPIC_API_KEY en las Propiedades del script." });

  var opciones = body.opciones || [];
  if (!opciones.length) return json_({ ok: false, error: "No se recibieron menús para la lista." });
  var dias = parseInt(body.dias, 10) || 5;

  var sys = "Eres asistente de una nutrióloga mexicana. A partir de los platillos de un menú (nombre y preparación con " +
    "cantidades caseras), generas una LISTA DE INSUMOS para comprar en el supermercado. Trabajas por OPCIÓN: cada opción " +
    "es un día completo de comidas, y la lista de esa opción debe cubrir " + dias + " días (multiplica las cantidades de " +
    "un día por " + dias + "). Reúne los insumos repetidos en un solo renglón sumando cantidades. Usa nombres de insumo " +
    "genéricos y comprables (p. ej. 'Pechuga de pollo', 'Tortilla de maíz', 'Avena en hojuelas'), nunca nombres de " +
    "platillos. Agrupa por categoría de pasillo, usando exactamente estos nombres cuando apliquen: 'Frutas y verduras', " +
    "'Carnes, pollo y pescado', 'Lácteos y huevo', 'Cereales, granos y leguminosas', 'Abarrotes y aceites', 'Otros'. " +
    "Da cantidades aproximadas y prácticas para el súper (kg, g, piezas, paquetes, litros). " +
    "Devuelve EXCLUSIVAMENTE JSON válido, sin texto adicional ni markdown.";

  var datos = {
    objetivo: body.objetivo || "",
    dias: dias,
    opciones: opciones.map(function (o) {
      return {
        opcion: o.opcion,
        platillos: (o.platillos || []).map(function (p) {
          return { tiempo: p.tiempo, nombre: p.nombre, preparacion: p.prep };
        })
      };
    })
  };

  var instruccion = "Genera una lista por cada opción recibida, en el MISMO ORDEN. " +
    "Responde SOLO con JSON con esta forma exacta: " +
    "{\"listas\":[{\"opcion\":1,\"categorias\":[{\"nombre\":\"\",\"items\":[{\"insumo\":\"\",\"cantidad\":\"\"}]}]}]}. " +
    "Debe haber un elemento en 'listas' por cada opción recibida y en el mismo orden. " +
    "Incluye únicamente categorías que tengan al menos un insumo.\n\nDatos:\n" + JSON.stringify(datos);

  var payload = {
    model: IA_MODEL,
    max_tokens: IA_MAX_TOKENS,
    system: sys,
    messages: [{ role: "user", content: instruccion }]
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
  if (code < 200 || code >= 300) return json_({ ok: false, error: "IA HTTP " + code + ": " + raw.slice(0, 300) });

  var out;
  try { out = JSON.parse(raw); } catch (e) { return json_({ ok: false, error: "Respuesta de IA no parseable." }); }

  var text = "";
  if (out && out.content && out.content.length) {
    for (var i = 0; i < out.content.length; i++) {
      if (out.content[i].type === "text") text += out.content[i].text;
    }
  }
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  var parsed;
  try { parsed = JSON.parse(text); } catch (e) { return json_({ ok: false, error: "La IA no devolvió JSON válido." }); }

  return json_({ ok: true, listas: (parsed.listas || []) });
}

/* =====================================================================
 *  SEGUIMIENTO A 15 DÍAS · cuestionario de Google Forms
 *  - Cuando se guarda un plan (savePlan), se anota en una hoja "bitácora"
 *    la fecha del plan + correo del paciente.
 *  - Un disparador diario (~8:00 a.m.) revisa esa bitácora y, cuando un
 *    plan cumple 15 días, envía el correo con el enlace al formulario.
 *  Para activarlo: ejecuta UNA vez  instalarTriggerSeguimientos15()
 *  Requisito: pega la URL de tu formulario en  SEG15_FORM_URL  (arriba).
 *  NOTA: la primera vez pedirá un permiso nuevo (Hojas de cálculo).
 * ===================================================================== */

// Abre (o crea) la hoja de bitácora. Guarda su ID en las Propiedades del script.
function getSeguimientoSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SEG_SHEET_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SEG_SHEET_NAME);
    props.setProperty('SEG_SHEET_ID', ss.getId());
    ss.getSheets()[0].appendRow(['Correo', 'Nombre', 'FechaPlan', 'Enviado', 'FechaEnvio']);
  }
  return ss.getSheets()[0];
}

// Anota (o actualiza) el seguimiento pendiente de un paciente con la fecha de HOY.
function registrarSeguimiento15_(nombre, correo) {
  var c = (correo || '').toString().trim();
  if (!c || c.indexOf('@') < 0) return; // sin correo válido no se programa
  try {
    var sh = getSeguimientoSheet_();
    var hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    var data = sh.getDataRange().getValues();
    // Si ya hay un seguimiento PENDIENTE para este correo, reinicia su fecha (gana el plan más reciente).
    for (var i = 1; i < data.length; i++) {
      var enviado = String(data[i][3] || '');
      if (String(data[i][0]).trim().toLowerCase() === c.toLowerCase() && enviado !== '1') {
        sh.getRange(i + 1, 3).setValue(hoy);
        return;
      }
    }
    sh.appendRow([c, nombre || '', hoy, '', '']);
  } catch (e) { /* no bloquear el guardado del plan si falla la bitácora */ }
}

// Disparador diario: envía el correo cuando un plan ya cumplió 15 días.
function enviarSeguimientos15_() {
  var sh = getSeguimientoSheet_();
  var data = sh.getDataRange().getValues();
  var hoy = new Date();
  var enviados = 0;
  for (var i = 1; i < data.length; i++) {
    var correo = String(data[i][0] || '').trim();
    var nombre = String(data[i][1] || 'Paciente');
    var fechaPlan = String(data[i][2] || '');
    var enviado = String(data[i][3] || '');
    if (!correo || enviado === '1' || !fechaPlan) continue;
    var d = new Date(fechaPlan + 'T00:00:00');
    if (isNaN(d)) continue;
    var dias = Math.floor((hoy.getTime() - d.getTime()) / 86400000);
    if (dias < 15) continue; // todavía no cumple 15 días
    try {
      MailApp.sendEmail({
        to: correo,
        subject: "¿Cómo vas con tu plan? | " + NEGOCIO,
        htmlBody: correoSeguimiento15_(nombre),
        name: NUTRIOLOGA + " · " + NEGOCIO
      });
      sh.getRange(i + 1, 4).setValue('1');
      sh.getRange(i + 1, 5).setValue(Utilities.formatDate(hoy, TZ, 'yyyy-MM-dd'));
      enviados++;
    } catch (e) { /* sigue con los demás aunque uno falle */ }
  }
  Logger.log("Seguimientos 15d enviados: " + enviados);
  return enviados;
}

function instalarTriggerSeguimientos15() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "enviarSeguimientos15_") ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger("enviarSeguimientos15_").timeBased().everyDays(1).atHour(8).inTimezone(TZ).create();
  return "Trigger de seguimiento a 15 días instalado (diario ~8:00 a.m.).";
}

function correoSeguimiento15_(nombre) {
  var boton =
    "<div style='text-align:center;margin:22px 0 6px;'>" +
      "<a href='" + SEG15_FORM_URL + "' style='display:inline-block;background:" + C_PINE + ";color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 30px;border-radius:11px;'>Responder cuestionario</a>" +
    "</div>" +
    "<p style='text-align:center;font-size:11px;color:" + C_STONE + ";margin:6px 0 0;'>Te tomará solo un par de minutos.</p>";
  var cuerpo =
    "<p style='font-size:14px;'>Estimado(a) <strong>" + escapar_(nombre) + "</strong>:</p>" +
    "<p style='font-size:13px;line-height:1.6;'>Es un gusto saludarte. Ya pasaron aproximadamente 15 días desde que recibiste tu plan nutricional, y queremos saber cómo te ha ido: cómo te has sentido, qué tan fácil te resultó seguirlo y si han surgido dudas en el camino.</p>" +
    "<p style='font-size:13px;line-height:1.6;'>Te pedimos unos minutos para responder este breve <strong>cuestionario de seguimiento</strong>. Tus respuestas le permiten a la nutrióloga ajustar lo que haga falta y acompañarte mejor en tu proceso.</p>" +
    boton +
    "<p style='margin:18px 0 0;font-size:13px;line-height:1.6;'>Si en este punto te gustaría agendar tu consulta de seguimiento, con gusto te apoyamos a través de tu sesión en el sistema o por WhatsApp " + TEL_WA + ".</p>" +
    "<p style='margin:10px 0 0;font-size:13px;line-height:1.6;'>¡Seguimos contigo en este proceso!</p>";
  return wrapEmail_(cuerpo);
}

// ---- PRUEBA: envíate a ti misma el correo de seguimiento ----
function PRUEBA_seguimiento15() {
  MailApp.sendEmail({
    to: CORREO_CONT,
    subject: "PRUEBA Seguimiento 15d | " + NEGOCIO,
    htmlBody: correoSeguimiento15_("Paciente Prueba"),
    name: NUTRIOLOGA + " · " + NEGOCIO
  });
}
