import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCisDtdn_ByiuPA0c72pXIPniHrB2LrHns",
  authDomain: "minesweeper-4309b.firebaseapp.com",
  databaseURL: "https://minesweeper-4309b-default-rtdb.firebaseio.com",
  projectId: "minesweeper-4309b",
  storageBucket: "minesweeper-4309b.firebasestorage.app",
  messagingSenderId: "237441993856",
  appId: "1:237441993856:web:b678646f13a686ce79ea65",
  measurementId: "G-QTDQRM8CVZ",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Set persistence to LOCAL (keeps user logged in for ~1 week)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Firebase persistence error:", error)
})
