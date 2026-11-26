import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

/**
 * TerminosModal.js
 * ------------------------------------------------------------------
 * Aceptación obligatoria de Términos y Condiciones + Aviso de Privacidad
 * la PRIMERA vez que el usuario (nutrióloga O paciente) entra a la plataforma.
 *
 *  - Muestra una ventana bloqueante (no se puede cerrar) hasta que acepta.
 *  - Guarda la aceptación en Firestore, en su doc de "suscriptores/<correo>",
 *    con versión y fecha/hora. Ya no vuelve a aparecer.
 *  - Guarda TAMBIÉN un historial completo (terminosHistorial): cada aceptación
 *    { version, fechaISO, rol } se AGREGA (no se sobrescribe) → respaldo legal
 *    del clickwrap: qué versión aceptó cada quién y cuándo, a lo largo del tiempo.
 *  - El paciente ve el Aviso de Privacidad del paciente (URL propia por instancia);
 *    la nutrióloga ve los Términos + Aviso de la suscripción.
 *  - Si algún día actualizas los términos, sube VERSION_TERMINOS y el modal
 *    vuelve a salir UNA vez para que acepten la versión nueva.
 *
 * USO (ya queda hecho en App.js):
 *    <TerminosGate><NutriDashboard /></TerminosGate>
 * ------------------------------------------------------------------
 */

// 👉 Sube esta fecha cada vez que cambies el contenido de los términos.
export const VERSION_TERMINOS = '2026-09-25';

// URLs de tus documentos legales. Por instancia (Aretia / Fitmeal) puedes
// sobreescribirlas con variables de entorno en Vercel; si no, usa las de Aretia.
const URL_TERMINOS =
  process.env.REACT_APP_URL_TERMINOS || 'https://aretia.mx/terminos.html';
const URL_PRIVACIDAD =
  process.env.REACT_APP_URL_PRIVACIDAD || 'https://aretia.mx/terminos.html#p1';
// Aviso de privacidad ESPECÍFICO del paciente (titular de datos de salud). Si la
// instancia no lo define, cae al Aviso general (URL_PRIVACIDAD) para no romper nada.
const URL_AVISO_PACIENTE =
  process.env.REACT_APP_URL_AVISO_PACIENTE || URL_PRIVACIDAD;
const MARCA = process.env.REACT_APP_MARCA_NOMBRE || 'Aretia';

/* ================================================================
   GATE — envuelve el dashboard y decide si mostrar el modal
   ================================================================ */
export function TerminosGate({ children }) {
  const { user, role } = useAuth();
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'ok' | 'pendiente'

  useEffect(() => {
    let activo = true;
    (async () => {
      const email = (user && user.email ? user.email : '').toLowerCase();
      if (!email) {
        if (activo) setEstado('ok');
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'suscriptores', email));
        const yaAcepto =
          snap.exists() && snap.data().terminosVersion === VERSION_TERMINOS;
        if (activo) setEstado(yaAcepto ? 'ok' : 'pendiente');
      } catch (e) {
        // Si no se puede leer, por seguridad pedimos la aceptación.
        if (activo) setEstado('pendiente');
      }
    })();
    return () => {
      activo = false;
    };
  }, [user]);

  async function handleAceptar() {
    const email = (user && user.email ? user.email : '').toLowerCase();
    if (email) {
      const ahora = new Date().toISOString();
      await setDoc(
        doc(db, 'suscriptores', email),
        {
          // Estado vigente (lo que lee la compuerta para no volver a preguntar):
          terminosAceptados: true,
          terminosVersion: VERSION_TERMINOS,
          terminosFechaISO: ahora,
          // Historial completo (NO se sobrescribe): respaldo legal del clickwrap.
          terminosHistorial: arrayUnion({
            version: VERSION_TERMINOS,
            fechaISO: ahora,
            rol: role || '',
          }),
        },
        { merge: true }
      );
    }
    setEstado('ok');
  }

  return (
    <>
      {children}
      {estado === 'pendiente' && <TerminosModal onAceptar={handleAceptar} rol={role} />}
    </>
  );
}

/* ================================================================
   MODAL (presentación)
   ================================================================ */
export function TerminosModal({ onAceptar, rol }) {
  const [marcado, setMarcado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // El paciente (titular de datos) ve SU aviso de privacidad; la nutrióloga ve
  // los Términos + Aviso de la suscripción.
  const esPaciente = String(rol || '').toLowerCase() !== 'nutriologa';
  const urlAvisoPac = URL_AVISO_PACIENTE;

  // Bloquea el scroll del fondo y evita cerrar con ESC (es obligatorio).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const bloquearEsc = (e) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    window.addEventListener('keydown', bloquearEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', bloquearEsc);
    };
  }, []);

  async function confirmar() {
    if (!marcado || guardando) return;
    setGuardando(true);
    try {
      await onAceptar();
    } catch (e) {
      setGuardando(false);
      alert('No se pudo guardar tu aceptación. Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminos-titulo"
      style={estilos.overlay}
    >
      <div style={estilos.tarjeta}>
        <h2 id="terminos-titulo" style={estilos.titulo}>
          Antes de continuar
        </h2>

        {esPaciente ? (
          <p style={estilos.texto}>
            Para usar {MARCA} necesitas leer y aceptar nuestro{' '}
            <a href={urlAvisoPac} target="_blank" rel="noopener noreferrer" style={estilos.link}>
              Aviso de Privacidad
            </a>
            . Solo tienes que hacerlo esta vez.
          </p>
        ) : (
          <p style={estilos.texto}>
            Para usar {MARCA} necesitas leer y aceptar nuestros{' '}
            <a href={URL_TERMINOS} target="_blank" rel="noopener noreferrer" style={estilos.link}>
              Términos y Condiciones
            </a>{' '}
            y nuestro{' '}
            <a href={URL_PRIVACIDAD} target="_blank" rel="noopener noreferrer" style={estilos.link}>
              Aviso de Privacidad
            </a>
            . Solo tienes que hacerlo esta vez.
          </p>
        )}

        <label style={estilos.check}>
          <input
            type="checkbox"
            checked={marcado}
            onChange={(e) => setMarcado(e.target.checked)}
            style={estilos.checkbox}
          />
          <span>
            {esPaciente
              ? `He leído y acepto el Aviso de Privacidad de ${MARCA}.`
              : `He leído y acepto los Términos y Condiciones y el Aviso de Privacidad de ${MARCA}.`}
          </span>
        </label>

        <button
          onClick={confirmar}
          disabled={!marcado || guardando}
          style={{
            ...estilos.boton,
            opacity: !marcado || guardando ? 0.5 : 1,
            cursor: !marcado || guardando ? 'not-allowed' : 'pointer',
          }}
        >
          {guardando ? 'Guardando…' : 'Acepto y continúo'}
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   Estilos (en línea; usan tus variables de marca --dark / --gold / --card)
   ================================================================ */
const estilos = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20, 40, 63, 0.55)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 99999,
  },
  tarjeta: {
    background: 'var(--card, #ffffff)',
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    padding: '28px 26px',
    boxShadow: '0 20px 60px rgba(20,40,63,0.25)',
    border: '1px solid var(--border, #E4E1D8)',
  },
  titulo: {
    margin: '0 0 12px',
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--dark, #1E3A5F)',
  },
  texto: {
    margin: '0 0 20px',
    fontSize: 15,
    lineHeight: 1.55,
    color: 'var(--stone, #3c5069)',
  },
  link: {
    color: 'var(--dark, #1E3A5F)',
    fontWeight: 600,
    textDecoration: 'underline',
  },
  check: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    fontSize: 14,
    lineHeight: 1.5,
    color: 'var(--dark, #14283F)',
    marginBottom: 24,
    cursor: 'pointer',
  },
  checkbox: {
    marginTop: 3,
    width: 18,
    height: 18,
    accentColor: 'var(--dark, #1E3A5F)',
    flexShrink: 0,
  },
  boton: {
    width: '100%',
    border: 'none',
    borderRadius: 10,
    padding: '14px 20px',
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    background: 'var(--dark, #1E3A5F)',
    transition: 'opacity .15s ease',
  },
};

export default TerminosModal;
