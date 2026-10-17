import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// The web config of the "Nezu Games" Firebase project (it is not a secret: the rules in firestore.rules are what protect the data).
const firebaseConfig = {
  apiKey: "AIzaSyBp4hse4ztfYH6h1B4X1NUURXUygPtLS8E",
  authDomain: "nezu-games.firebaseapp.com",
  projectId: "nezu-games",
  storageBucket: "nezu-games.firebasestorage.app",
  messagingSenderId: "181765743782",
  appId: "1:181765743782:web:ab49653147e5fd2c6e8067",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
