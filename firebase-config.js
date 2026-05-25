// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAwQTSzKnxsqKHfTTfLYWzKnWdHxFo1YUU",
    authDomain: "amani-160bf.firebaseapp.com",
    databaseURL: "https://amani-160bf-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "amani-160bf",
    storageBucket: "amani-160bf.firebasestorage.app",
    messagingSenderId: "560473593904",
    appId: "1:560473593904:web:bc7c7de6727d97a74ff5f5",
    measurementId: "G-F9T5P8TTSS"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);
const dbFirestore = getFirestore(app);

// Exportar todo para usar en otros archivos
export { 
    db, 
    dbFirestore,
    collection,
    addDoc,
    auth, 
    ref, 
    push, 
    set, 
    onValue, 
    update, 
    remove, 
    get,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    signInWithPopup,
    onAuthStateChanged,
    signOut
};