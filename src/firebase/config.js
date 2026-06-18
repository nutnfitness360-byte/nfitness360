import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyANnYbxOqa_bThJT_06_hP_fqATKHE_MwI",
  authDomain: "nfitness360-35df5.firebaseapp.com",
  projectId: "nfitness360-35df5",
  storageBucket: "nfitness360-35df5.firebasestorage.app",
  messagingSenderId: "746556814888",
  appId: "1:746556814888:web:fa2cc4566f608ffb71671d"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
// Forzar que Google pregunte SIEMPRE qué cuenta usar (evita reutilizar la sesión
// anterior del navegador; importante para la confidencialidad entre nutrióloga y paciente).
googleProvider.setCustomParameters({ prompt: 'select_account' });
