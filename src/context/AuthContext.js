import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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
