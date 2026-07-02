import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// La configuración se toma de variables de entorno para permitir una instancia
// por nutrióloga (cada despliegue apunta a su propio proyecto de Firebase).
// Si no hay variables definidas, usa el proyecto actual de Natalia como respaldo,
// así el despliegue de producción sigue funcionando sin cambios.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY || "AIzaSyANnYbxOqa_bThJT_06_hP_fqATKHE_MwI",
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN || "nfitness360-35df5.firebaseapp.com",
  projectId: process.env.REACT_APP_FB_PROJECT_ID || "nfitness360-35df5",
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET || "nfitness360-35df5.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FB_SENDER_ID || "746556814888",
  appId: process.env.REACT_APP_FB_APP_ID || "1:746556814888:web:fa2cc4566f608ffb71671d",
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
// Forzar que Google pregunte SIEMPRE qué cuenta usar (evita reutilizar la sesión
// anterior del navegador; importante para la confidencialidad entre nutrióloga y paciente).
googleProvider.setCustomParameters({ prompt: 'select_account' });
