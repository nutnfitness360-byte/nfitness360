import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// La configuración de Firebase se toma EXCLUSIVAMENTE de variables de entorno:
// una instancia por nutrióloga, cada despliegue apunta a su propio proyecto.
//
// IMPORTANTE (multi-tenant): ANTES aquí había valores de respaldo hacia el
// proyecto de Natalia (nfitness360-35df5). Eso era un riesgo: si una instancia
// nueva se desplegaba SIN sus variables, se conectaba EN SILENCIO a la base de
// Natalia y podía mezclar pacientes entre clientas. Ahora, si falta alguna
// variable, la app se detiene con un error VISIBLE en vez de conectarse a la
// base equivocada. (Los valores de Firebase web no son secretos: viajan en el
// navegador; por eso se marcan como "Config" en Vercel.)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FB_SENDER_ID,
  appId: process.env.REACT_APP_FB_APP_ID,
};

// Verificación de arranque: todas las variables deben estar definidas. Si falta
// alguna, detenemos la app con un mensaje claro (mejor un error visible que
// terminar escribiendo en la base de datos de otra instancia).
const NOMBRE_VAR = {
  apiKey: 'REACT_APP_FB_API_KEY',
  authDomain: 'REACT_APP_FB_AUTH_DOMAIN',
  projectId: 'REACT_APP_FB_PROJECT_ID',
  storageBucket: 'REACT_APP_FB_STORAGE_BUCKET',
  messagingSenderId: 'REACT_APP_FB_SENDER_ID',
  appId: 'REACT_APP_FB_APP_ID',
};
const faltantes = Object.keys(NOMBRE_VAR).filter((k) => !firebaseConfig[k]);
if (faltantes.length) {
  const nombres = faltantes.map((k) => NOMBRE_VAR[k]).join(', ');
  throw new Error(
    'Configuración de Firebase incompleta: faltan las variables de entorno ' + nombres + '. ' +
    'Cada instancia debe definir sus propias variables REACT_APP_FB_* en Vercel. ' +
    'Se detuvo el arranque para no conectarse a la base de datos de otra instancia.'
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// ID del proyecto Firebase de ESTA instancia. El frontend lo manda al backend en
// las operaciones de créditos, para que el backend escriba en la base correcta.
export const FB_PROJECT_ID = firebaseConfig.projectId;
export const googleProvider = new GoogleAuthProvider();
// Forzar que Google pregunte SIEMPRE qué cuenta usar (evita reutilizar la sesión
// anterior del navegador; importante para la confidencialidad entre nutrióloga y paciente).
googleProvider.setCustomParameters({ prompt: 'select_account' });
