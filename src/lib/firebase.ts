import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD0PSCCUG1gtzgLSsBON-7CdtxsG4iRU-8",
  authDomain: "mario-s-grid.firebaseapp.com",
  projectId: "mario-s-grid",
  storageBucket: "mario-s-grid.firebasestorage.app",
  messagingSenderId: "238779148431",
  appId: "1:238779148431:web:789c40daf421665a5668fa",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
