# Backend — Google Apps Script (Nfitness 360®)

Esta carpeta es la **fuente de verdad** del backend de Nfitness 360®, que corre en
Google Apps Script (no en Vercel). El frontend (React) se despliega solo vía
GitHub → Vercel; el backend se despliega **a mano** en Apps Script. Estos archivos
existen para versionar ese backend y no volver a perder el rastro de la versión buena.

## Archivos (el backend completo son estos 3)

| Archivo | Qué contiene |
|---|---|
| `AppsScript_Nfitness360.gs` | Es el **Código.gs** del proyecto. Dispatch de acciones (`doPost`), citas (Google Calendar + correos), guardado de plan / análisis / historia / InBody / ISAK / recomendaciones en Drive, pagos Stripe, generación de menús con IA (usa el recetario), reactivación de pacientes inactivos, seguimientos a 15 días, encuestas y recordatorios. |
| `Handlers_faltantes.gs` | Funciones auxiliares que viven en archivo aparte: `leerInBody_`, `saveEstudio_`, `kcalHabitualIA_`, `ajustarMenuIA_` (y helpers `iaJSON_`, `num_`). |
| `Recetario.gs` | Banco de ~670 platillos reales por tiempo (`var RECETARIO = {...}`). Solo datos, sin funciones. Lo usa `generarMenusIA_`. |

> Nota: idealmente estos 3 archivos se consolidarían en 1 o 2 para evitar el riesgo de
> funciones duplicadas entre archivos (eso causó el bug histórico de Stripe). Pendiente de higiene.

## Cómo desplegar un cambio de backend (checklist)

1. En el editor de Apps Script, **pega** el contenido del/los archivo(s) que cambiaron
   (Código.gs ↔ `AppsScript_Nfitness360.gs`, etc.). Para `Recetario.gs`, si el editor
   se pone lento por el tamaño, es normal.
2. **Guarda** en el editor.
3. **Implementar → Administrar implementaciones → (editar la implementación web) →
   Nueva versión → Implementar.** ⚠️ Sin este paso, lo pegado NO entra en vivo.
4. **Commitea** aquí el/los `.gs` actualizado(s) para que el repo siga siendo la fuente de verdad.

## Reglas que ya nos costó aprender

- El `/exec` que usa la app requiere **Nueva versión** en cada cambio; pegar no basta.
- Nada de **funciones duplicadas** entre archivos: gana la última cargada y puede ser la vieja.
- Los archivos subidos al frontend deben conservar su extensión `.js`; sin ella, Vercel los trata como asset y truena.
- Scope OAuth `script.external_request` debe estar presente para llamar a la API de Anthropic.
- El renderer HTML→PDF de Google requiere `print-color-adjust: exact`, fuentes embebidas y `@page` A4.
