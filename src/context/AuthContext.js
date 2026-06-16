import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Correo principal (bootstrap): siempre se considera nutrióloga, aunque la
// lista "autorizados" estuviera vacía. Evita que te quedes fuera del sistema.
const NUTRI_EMAIL = 'nutnfitness360@gmail.com';

// Decide el rol del usuario:
//  - "nutriologa" si es el correo principal o está en /autorizados con rol nutriologa
//  - "paciente" en cualquier otro caso (acceso abierto)
async function resolverRol(u) {
  const email = (u.email || '').toLowerCase();
  if (email === NUTRI_EMAIL) return 'nutriologa';
  try {
    const snap = await getDoc(doc(db, 'autorizados', email));
    if (snap.exists() && snap.data().rol === 'nutriologa') return 'nutriologa';
  } catch (e) { /* sin acceso a la lista → se trata como paciente */ }
  return 'paciente';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        const r = await resolverRol(u);
        setUser(u);
        setRole(r);
        registrarSuscriptor(u);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
