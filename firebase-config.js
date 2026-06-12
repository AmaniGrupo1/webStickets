// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc, 
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAwQTSzKnxsqKHfTTfLYWzKnWdHxFo1YUU",
    authDomain: "amani-160bf.firebaseapp.com",
    projectId: "amani-160bf",
    storageBucket: "amani-160bf.firebasestorage.app",
    messagingSenderId: "560473593904",
    appId: "1:560473593904:web:bc7c7de6727d97a74ff5f5",
    measurementId: "G-F9T5P8TTSS"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exportar todo
export { 
    db, 
    auth, 
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    onSnapshot,
    query,
    orderBy,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
};
