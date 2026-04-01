import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAkEErL1RV04Uza1cH553Lcp1drrIOaznQ",
    authDomain: "shamilapp-d61f0.firebaseapp.com",
    projectId: "shamilapp-d61f0",
    storageBucket: "shamilapp-d61f0.firebasestorage.app",
    messagingSenderId: "532939856893",
    appId: "1:532939856893:web:82091d6e557a54a7389794"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تهيئة خدمة التحقق
export const auth = getAuth(app);
export default app;