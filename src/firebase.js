import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
 
const firebaseConfig = {
  apiKey: "AIzaSyCC54iIWV3mopeoz0Lvaq4aM7lEweQQjvc",
  authDomain: "journal-bebe.firebaseapp.com",
  projectId: "journal-bebe",
  storageBucket: "journal-bebe.firebasestorage.app",
  messagingSenderId: "599551246218",
  appId: "1:599551246218:web:8a748c479aa9f2f2fc5273",
  measurementId: "G-S2DJFNE4EV"
};
 
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
 
// Enable offline persistence so the app works without internet
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence unavailable: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence not supported by this browser');
  }
});
