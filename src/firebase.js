import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            "AIzaSyCQV1YVx5GGUV_xvq_sjeD-SAJ4F8aaqjM",
  authDomain:        "evolve-d487a.firebaseapp.com",
  projectId:         "evolve-d487a",
  storageBucket:     "evolve-d487a.firebasestorage.app",
  messagingSenderId: "800367582368",
  appId:             "1:800367582368:web:6622b10668fc7dc532bdc5",
};

const app        = initializeApp(firebaseConfig);
export const db2 = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
