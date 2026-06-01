// ========== MÓDULO DE AUTENTICACIÓN ==========

import {
    auth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from '../firebase-config.js';

import { mostrarAlerta, mostrarCargando } from './ui.js';

/**
 * Realiza el inicio de sesión con email y contraseña.
 * Muestra un spinner mientras valida y luego notifica el resultado.
 */
export async function login() {
    const email     = document.getElementById('loginEmail').value;
    const password  = document.getElementById('loginPassword').value;
    const errorDiv  = document.getElementById('loginError');

    errorDiv.style.display = 'none';

    if (!email || !password) {
        mostrarAlerta('❌ Campos vacíos', 'Por favor ingresa email y contraseña', 'error');
        errorDiv.textContent    = 'Por favor ingresa email y contraseña';
        errorDiv.style.display  = 'block';
        return;
    }

    const loading = mostrarCargando('Verificando credenciales...');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loading.remove();
        mostrarAlerta('✅ ¡Bienvenido!', `Sesión iniciada como ${email}`, 'success');
    } catch (error) {
        loading.remove();
        const mensaje = resolveAuthError(error.code) || error.message;
        mostrarAlerta('⛔ Acceso Denegado', mensaje, 'error');
        errorDiv.textContent    = mensaje;
        errorDiv.style.display  = 'block';
        document.getElementById('loginPassword').value = '';
    }
}

/**
 * Cierra la sesión del usuario actual.
 */
export async function logout() {
    try {
        await signOut(auth);
        mostrarAlerta('👋 Sesión cerrada', 'Has cerrado sesión correctamente', 'info');
    } catch {
        mostrarAlerta('Error', 'No se pudo cerrar la sesión', 'error');
    }
}

/**
 * Observa los cambios de estado de autenticación y ejecuta los callbacks correspondientes.
 * @param {Function} onLogin  - Llamado cuando un usuario inicia sesión. Recibe el objeto user.
 * @param {Function} onLogout - Llamado cuando el usuario cierra sesión.
 */
export function observeAuthState(onLogin, onLogout) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            onLogin(user);
        } else {
            onLogout();
        }
    });
}

/**
 * Traduce códigos de error de Firebase Auth a mensajes en español.
 * @param {string} code
 * @returns {string}
 */
function resolveAuthError(code) {
    const errores = {
        'auth/invalid-credential': 'El email o contraseña son incorrectos',
        'auth/user-not-found':     'No existe una cuenta con este email',
        'auth/wrong-password':     'Contraseña incorrecta',
        'auth/invalid-email':      'Formato de email inválido',
        'auth/too-many-requests':  'Demasiados intentos. Intenta más tarde'
    };
    return errores[code] || null;
}

/**
 * Configura el inicio de sesión con la tecla Enter.
 * @param {Function} loginFn - Función a invocar al presionar Enter en la pantalla de login.
 */
export function setupEnterKeyLogin(loginFn) {
    document.addEventListener('keydown', (e) => {
        const loginVisible = document.getElementById('loginScreen')?.style.display !== 'none';
        if (e.key === 'Enter' && loginVisible) loginFn();
    });
}
