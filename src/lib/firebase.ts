import { initializeApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";

// The web config of the "Nezu Games" Firebase project (it is not a secret: the rules in firestore.rules are what protect the data).
const firebaseConfig = {
  apiKey: "AIzaSyBp4hse4ztfYH6h1B4X1NUURXUygPtLS8E",
  authDomain: "nezu-games.firebaseapp.com",
  projectId: "nezu-games",
  storageBucket: "nezu-games.firebasestorage.app",
  messagingSenderId: "181765743782",
  appId: "1:181765743782:web:ab49653147e5fd2c6e8067",
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
// Live duels listen to the other player's document: on a phone the connection may need long polling, which is detected automatically.
export const db = (() => {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app); // already initialised (a hot reload)
  }
})();
