import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { MULTI_NUTRI, slugNutriURL, cargarNutriologos, correoDeSlug } from '../utils/multiTenant';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Correo principal (bootstrap): siempre se considera nutrióloga, aunque la
// lista "autorizados" estuviera vacía. Evita que te quedes fuera del sistema.
export const NUTRI_EMAIL = (process.env.REACT_APP_NUTRI_EMAIL || 'nutnfitness360@gmail.com').toLowerCase();

// Decide el rol y si es ADMIN del equipo:
//  - "nutriologa" si es el correo principal (semilla) o está en /autorizados con rol nutriologa
//  - admin: el correo semilla, o quien tenga `admin:true` en su doc de /autorizados
//  - "paciente" en cualquier otro caso (acceso abierto)
async function resolverAcceso(u) {
  const email = (u.email || '').toLowerCase();
  if (email === NUTRI_EMAIL) return { rol: 'nutriologa', admin: true };
  try {
    const snap = await getDoc(doc(db, 'autorizados', email));
    if (snap.exists() && snap.data().rol === 'nutriologa') {
      return { rol: 'nutriologa', admin: !!snap.data().admin };
    }
  } catch (e) { /* sin acceso a la lista → se trata como paciente */ }
  return { rol: 'paciente', admin: false };
}

// Multi-inquilino: si el paciente entró por el link ?n=<slug> de un nutriólogo y aún
// no tiene dueño, se lo asigna (una sola vez) en su registro de suscriptor.
async function asignarDuenoPorLink(email) {
  if (!MULTI_NUTRI || !email) return;
  const slug = slugNutriURL();
  if (!slug) return;
  try {
    const ref = doc(db, 'suscriptores', email);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().nutriDueno) return; // ya tiene dueño → no re-asignar
    const correo = correoDeSlug(await cargarNutriologos(db), slug);
    if (correo) await setDoc(ref, { correo, nutriDueno: correo }, { merge: true });
  } catch (_) { /* asignación por link es secundaria; no bloquea el acceso */ }
}

// Registra o actualiza al suscriptor cada vez que inicia sesión.
// Guarda: correo, nombre, método de acceso, primer registro y último acceso.
// El campo "sexo" lo completa después la nutrióloga desde el expediente.
async function registrarSuscriptor(u) {
  const email = (u.email || '').toLowerCase();
  if (!email) return;
  const metodo = (u.providerData && u.providerData[0] && u.providerData[0].providerId) === 'google.com' ? 'Google' : 'Correo';
  const ref = doc(db, 'suscriptores', email);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await setDoc(ref, {
        nombre: u.displayName || snap.data().nombre || '',
        metodo,
        ultimoAcceso: Date.now(),
      }, { merge: true });
    } else {
      await setDoc(ref, {
        correo: email,
        nombre: u.displayName || '',
        metodo,
        sexo: '',
        creado: Date.now(),
        ultimoAcceso: Date.now(),
      });
    }
  } catch (e) { /* el registro de suscriptor es secundario; no debe bloquear el acceso */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        const acc = await resolverAcceso(u);
        setUser(u);
        setRole(acc.rol);
        setEsAdmin(!!acc.admin);
        registrarSuscriptor(u);
        if (acc.rol === 'paciente') asignarDuenoPorLink((u.email || '').toLowerCase());
      } else {
        setUser(null);
        setRole(null);
        setEsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Multi-inquilino (opt-in): el "dueño" del nutriólogo logueado es su propio correo.
  // Para pacientes es null aquí; su dueño se resuelve donde se necesita (agendado) a
  // partir de su expediente. Con la bandera apagada, nutriDueno queda null y no se usa.
  const _email = (user && user.email ? user.email : '').toLowerCase();
  const nutriDueno = (MULTI_NUTRI && role === 'nutriologa' && _email) ? _email : null;
  // Admin del equipo (solo relevante en multi-inquilino): puede administrar a las demás nutriólogas.
  const adminEquipo = MULTI_NUTRI && role === 'nutriologa' && esAdmin;

  return (
    <AuthContext.Provider value={{ user, role, loading, multiNutri: MULTI_NUTRI, nutriDueno, esAdmin: adminEquipo }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
