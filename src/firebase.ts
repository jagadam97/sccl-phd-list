import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Replace with your own Firebase project's configuration if needed
const firebaseConfig = {
  apiKey: "AIzaSyDBzKP-KAYm2jP4IgrKwyPo8KN6_pK-SJE",
  authDomain: "jagadam98.firebaseapp.com",
  projectId: "jagadam98",
  storageBucket: "jagadam98.appspot.com", // Corrected to common format
  messagingSenderId: "494648287662",
  appId: "1:494648287662:web:cd9a5139792bf6d872a83f",
  measurementId: "G-9HWJ5CHLD9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the auth service
export const auth = getAuth(app);
