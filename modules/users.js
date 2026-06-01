// ========== MÓDULO DE USUARIOS ==========

import {
    db, auth, collection, addDoc, getDocs
} from '../firebase-config.js';

import {
    createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import { mostrarAlerta, mostrarCargando } from './ui.js';
import { escapeHtml } from './utils.js';
import { loadChanges, saveChanges } from './changes.js';

// Estado interno del módulo
let usersList = [];

// ────────────────────────────────────────────
// CARGA Y RENDER
// ────────────────────────────────────────────

/**
 * Obtiene los usuarios desde la colección 'users' de Firestore y los renderiza.
 */
export async function cargarUsuarios() {
    try {
        const snapshot = await getDocs(collection(db, 'users'));
        usersList = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
    }
    renderUsers();
}

/**
 * Renderiza la lista de usuarios en el contenedor #usersList.
 */
export function renderUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;

    if (usersList.length === 0) {
        container.innerHTML = '<div class="change-card-empty"><i class="fas fa-inbox"></i> No hay usuarios registrados</div>';
        return;
    }

    container.innerHTML = usersList.map(user => `
        <div class="user-card">
            <div class="user-card-info">
                <i class="fas fa-user-circle"></i>
                <div>
                    <div class="user-email-display">${escapeHtml(user.email)}</div>
                    <div class="user-id">UID: ${escapeHtml(user.uid?.substring(0, 12))}...</div>
                </div>
            </div>
            <div class="user-card-actions">
                <button class="btn-edit" onclick="window.editarUsuario('${user.uid}', '${escapeHtml(user.email)}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete" onclick="window.eliminarUsuario('${user.uid}')">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// ────────────────────────────────────────────
// CREAR USUARIO
// ────────────────────────────────────────────

/**
 * Maneja el envío del formulario de creación de usuario.
 * Requiere que la creación de usuarios esté habilitada en Firebase Console
 * (Authentication → Settings → User actions → Enable Create).
 */
export function setupCreateUserForm() {
    document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value;

        if (!email || !password) {
            mostrarAlerta('❌ Error', 'Completa todos los campos', 'error');
            return;
        }
        if (password.length < 6) {
            mostrarAlerta('❌ Error', 'La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        const loading = mostrarCargando('Creando usuario...');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            await addDoc(collection(db, 'users'), {
                uid:       userCredential.user.uid,
                email,
                createdAt: Date.now()
            });

            loading.remove();
            mostrarAlerta('✅ Usuario creado', `Usuario ${email} creado exitosamente`, 'success');
            document.getElementById('createUserForm').reset();
            cargarUsuarios();

            // Registrar el cambio en el log
            const changes = loadChanges();
            changes.push({
                title:       `Usuario creado: ${email}`,
                responsible: auth.currentUser?.email || 'Admin',
                type:        'Nuevo feature',
                date:        new Date().toISOString().slice(0, 10),
                description: `Se creó un nuevo usuario con email ${email}`,
                createdAt:   new Date().toISOString()
            });
            saveChanges(changes);
        } catch (error) {
            loading.remove();
            mostrarAlerta('❌ Error', resolveCreateUserError(error.code) || error.message, 'error');
        }
    });
}

// ────────────────────────────────────────────
// EDITAR USUARIO
// ────────────────────────────────────────────

/**
 * Abre el modal de edición para el usuario indicado.
 * @param {string} uid
 * @param {string} email
 */
export function editarUsuario(uid, email) {
    document.getElementById('editUserEmail').value    = email;
    document.getElementById('editUserPassword').value = '';
    document.getElementById('userModal').style.display = 'flex';
    window.currentEditUid = uid;
}

/**
 * Cierra el modal de edición de usuario.
 */
export function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    window.currentEditUid = null;
}

/**
 * Registra el listener del formulario de edición de usuario.
 * NOTA: updatePassword requiere autenticación reciente; para admin se necesita Cloud Function.
 */
export function setupEditUserForm() {
    document.getElementById('editUserForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById('editUserPassword').value;

        if (!newPassword) {
            mostrarAlerta('ℹ️ Sin cambios', 'No se proporcionó nueva contraseña', 'info');
            closeUserModal();
            return;
        }
        if (newPassword.length < 6) {
            mostrarAlerta('❌ Error', 'La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        const loading = mostrarCargando('Actualizando usuario...');
        try {
            // Para cambiar contraseña de otro usuario se requiere Cloud Function
            mostrarAlerta(
                '⚠️ Limitación',
                'Para cambiar contraseña de otro usuario, necesitas implementar una Cloud Function en Firebase',
                'info'
            );
        } finally {
            loading.remove();
            closeUserModal();
        }
    });
}

// ────────────────────────────────────────────
// ELIMINAR USUARIO
// ────────────────────────────────────────────

/**
 * Solicita confirmación y procede a eliminar un usuario.
 * NOTA: deleteUser requiere Cloud Function para operaciones de admin.
 * @param {string} uid
 */
export async function eliminarUsuario(uid) {
    if (!confirm('¿Eliminar este usuario? Esta acción es irreversible.')) return;

    const loading = mostrarCargando('Eliminando usuario...');
    try {
        // Para eliminar usuarios de Auth se requiere Cloud Function
        mostrarAlerta(
            '⚠️ Limitación',
            'Para eliminar usuarios, necesitas implementar una Cloud Function en Firebase',
            'info'
        );
    } catch (error) {
        mostrarAlerta('❌ Error', error.message, 'error');
    } finally {
        loading.remove();
    }
}

// ────────────────────────────────────────────
// HELPERS PRIVADOS
// ────────────────────────────────────────────

function resolveCreateUserError(code) {
    const errores = {
        'auth/email-already-in-use':  'El email ya está registrado',
        'auth/weak-password':         'Contraseña débil, usa al menos 6 caracteres',
        'auth/operation-not-allowed': 'La creación de usuarios está deshabilitada. Habilítala en Firebase Console → Authentication → Settings → User actions → Enable Create'
    };
    return errores[code] || null;
}
