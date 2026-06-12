import { 
    db, auth, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, onSnapshot, query, orderBy,
    signInWithEmailAndPassword, onAuthStateChanged, signOut
} from './firebase-config.js';

import { 
    getAuth as getAdminAuth, 
    createUserWithEmailAndPassword,
    updatePassword,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let tickets = [];
let currentTicketId = null;
let unsubscribeTickets = null;
let usersList = [];

// ========== FUNCIÓN PARA ALERTAS PERSONALIZADAS ==========
function mostrarAlerta(titulo, mensaje, tipo) {
    const alerta = document.createElement('div');
    const icono = tipo === 'error' ? 'fa-times-circle' : (tipo === 'success' ? 'fa-check-circle' : 'fa-info-circle');
    const color = tipo === 'error' ? '#ff7675' : (tipo === 'success' ? '#4caf50' : '#667eea');
    
    alerta.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 20px 25px;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            border-left: 4px solid ${color};
        ">
            <div style="display: flex; align-items: center; gap: 15px;">
                <i class="fas ${icono}" style="font-size: 28px; color: ${color};"></i>
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #333; font-size: 16px;">${titulo}</h4>
                    <p style="margin: 0; color: #666; font-size: 14px;">${mensaje}</p>
                </div>
            </div>
        </div>
    `;
    
    alerta.style.position = 'fixed';
    alerta.style.top = '50%';
    alerta.style.left = '50%';
    alerta.style.transform = 'translate(-50%, -50%)';
    alerta.style.zIndex = '10000';
    alerta.style.animation = 'fadeInUp 0.3s ease';
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        alerta.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => alerta.remove(), 300);
    }, 3000);
}

// Agregar animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    }
`;
document.head.appendChild(style);

// ========== MOSTRAR/OCULTAR CONTRASEÑA ==========
function setupPasswordToggles() {
    // Toggle para login
    const toggleLogin = document.getElementById('togglePassword');
    const loginPassword = document.getElementById('loginPassword');
    if (toggleLogin && loginPassword) {
        toggleLogin.addEventListener('click', () => {
            const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPassword.setAttribute('type', type);
            toggleLogin.classList.toggle('fa-eye-slash');
        });
    }
    
    // Toggle para crear usuario
    const toggleCreate = document.querySelector('#newUserPassword + .toggle-password');
    const createPassword = document.getElementById('newUserPassword');
    if (toggleCreate && createPassword) {
        toggleCreate.addEventListener('click', () => {
            const type = createPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            createPassword.setAttribute('type', type);
            toggleCreate.classList.toggle('fa-eye-slash');
        });
    }
    
    // Toggle para editar usuario (modal)
    const toggleModal = document.querySelector('#editUserPassword + .toggle-password-modal');
    const modalPassword = document.getElementById('editUserPassword');
    if (toggleModal && modalPassword) {
        toggleModal.addEventListener('click', () => {
            const type = modalPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            modalPassword.setAttribute('type', type);
            toggleModal.classList.toggle('fa-eye-slash');
        });
    }
}

// Login con tecla Enter
document.addEventListener('keydown', (e) => {
    const loginVisible = document.getElementById('loginScreen').style.display !== 'none';
    if (e.key === 'Enter' && loginVisible) {
        window.login();
    }
});

// ========== AUTENTICACIÓN ==========
window.login = async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.style.display = 'none';
    
    if (!email || !password) {
        mostrarAlerta('❌ Campos vacíos', 'Por favor ingresa email y contraseña', 'error');
        errorDiv.textContent = 'Por favor ingresa email y contraseña';
        errorDiv.style.display = 'block';
        return;
    }
    
    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 20px 25px; display: flex; align-items: center; gap: 15px;">
            <i class="fas fa-spinner fa-pulse" style="font-size: 24px; color: #667eea;"></i>
            <span style="color: #333;">Verificando credenciales...</span>
        </div>
    `;
    loadingAlert.style.position = 'fixed';
    loadingAlert.style.top = '50%';
    loadingAlert.style.left = '50%';
    loadingAlert.style.transform = 'translate(-50%, -50%)';
    loadingAlert.style.zIndex = '10000';
    document.body.appendChild(loadingAlert);
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loadingAlert.remove();
        mostrarAlerta('✅ ¡Bienvenido!', `Sesión iniciada como ${email}`, 'success');
        cargarUsuarios();
    } catch (error) {
        loadingAlert.remove();
        
        let mensaje = '';
        let titulo = '⛔ Acceso Denegado';
        
        switch (error.code) {
            case 'auth/invalid-credential':
                mensaje = 'El email o contraseña son incorrectos';
                break;
            case 'auth/user-not-found':
                mensaje = 'No existe una cuenta con este email';
                break;
            case 'auth/wrong-password':
                mensaje = 'Contraseña incorrecta';
                break;
            case 'auth/invalid-email':
                mensaje = 'Formato de email inválido';
                break;
            case 'auth/too-many-requests':
                mensaje = 'Demasiados intentos. Intenta más tarde';
                break;
            default:
                mensaje = error.message;
        }
        
        mostrarAlerta(titulo, mensaje, 'error');
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
        document.getElementById('loginPassword').value = '';
    }
};

window.logout = async () => {
    try {
        await signOut(auth);
        mostrarAlerta('👋 Sesión cerrada', 'Has cerrado sesión correctamente', 'info');
    } catch (error) {
        mostrarAlerta('Error', 'No se pudo cerrar la sesión', 'error');
    }
};

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    
    if (user) {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'block';
        document.getElementById('userEmail').textContent = user.email;
        cargarTickets();
        cargarUsuarios();
        renderChanges();
        setupPasswordToggles();
    } else {
        if (unsubscribeTickets) {
            unsubscribeTickets();
            unsubscribeTickets = null;
        }
        loginScreen.style.display = 'flex';
        dashboard.style.display = 'none';
        tickets = [];
        usersList = [];
    }
});

// ========== CONTROL DE TEMA Y COLOR ==========
let iconosBlancos = true;
const toggleIconBtn = document.getElementById('toggleIconColor');
const toggleThemeBtn = document.getElementById('toggleTheme');

if (toggleIconBtn) {
    toggleIconBtn.addEventListener('click', () => {
        if (iconosBlancos) {
            document.body.classList.add('icon-dark');
            toggleIconBtn.innerHTML = '<i class="fas fa-palette"></i> Iconos Blancos';
            iconosBlancos = false;
        } else {
            document.body.classList.remove('icon-dark');
            toggleIconBtn.innerHTML = '<i class="fas fa-palette"></i> Iconos Negros';
            iconosBlancos = true;
        }
    });
}

let temaOscuro = false;
if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener('click', () => {
        if (temaOscuro) {
            document.body.classList.remove('dark-theme');
            toggleThemeBtn.innerHTML = '<i class="fas fa-moon"></i> Oscuro';
            temaOscuro = false;
        } else {
            document.body.classList.add('dark-theme');
            toggleThemeBtn.innerHTML = '<i class="fas fa-sun"></i> Claro';
            temaOscuro = true;
        }
    });
}

// ========== GESTIÓN DE USUARIOS ==========
async function cargarUsuarios() {
    try {
        const usersCollection = collection(db, 'users');
        const snapshot = await getDocs(usersCollection);
        usersList = [];
        snapshot.forEach(doc => {
            usersList.push({ uid: doc.id, ...doc.data() });
        });
        
        renderUsers();
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        renderUsers();
    }
}

function renderUsers() {
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

// Crear usuario
document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    
    if (!email || !password) {
        mostrarAlerta('❌ Error', 'Completa todos los campos', 'error');
        return;
    }
    
    if (password.length < 6) {
        mostrarAlerta('❌ Error', 'La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = `<div style="background: white; border-radius: 12px; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Creando usuario...</div>`;
    loadingAlert.style.position = 'fixed';
    loadingAlert.style.top = '50%';
    loadingAlert.style.left = '50%';
    loadingAlert.style.transform = 'translate(-50%, -50%)';
    loadingAlert.style.zIndex = '10000';
    document.body.appendChild(loadingAlert);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const usersCollection = collection(db, 'users');
        await addDoc(usersCollection, {
            uid: userCredential.user.uid,
            email: email,
            createdAt: Date.now()
        });
        
        loadingAlert.remove();
        mostrarAlerta('✅ Usuario creado', `Usuario ${email} creado exitosamente`, 'success');
        document.getElementById('createUserForm').reset();
        cargarUsuarios();
        
        const changes = loadChanges();
        changes.push({
            title: `Usuario creado: ${email}`,
            responsible: auth.currentUser?.email || 'Admin',
            type: 'Nuevo feature',
            date: new Date().toISOString().slice(0, 10),
            description: `Se creó un nuevo usuario con email ${email}`,
            createdAt: new Date().toISOString()
        });
        saveChanges(changes);
        
    } catch (error) {
        loadingAlert.remove();
        let mensaje = '';
        switch (error.code) {
            case 'auth/email-already-in-use':
                mensaje = 'El email ya está registrado';
                break;
            case 'auth/weak-password':
                mensaje = 'Contraseña débil, usa al menos 6 caracteres';
                break;
            case 'auth/operation-not-allowed':
                mensaje = 'La creación de usuarios está deshabilitada. Habilítala en Firebase Console → Authentication → Settings → User actions → Enable Create';
                break;
            default:
                mensaje = error.message;
        }
        mostrarAlerta('❌ Error', mensaje, 'error');
    }
});

window.editarUsuario = (uid, email) => {
    document.getElementById('editUserEmail').value = email;
    document.getElementById('editUserPassword').value = '';
    document.getElementById('userModal').style.display = 'flex';
    
    window.currentEditUid = uid;
};

window.closeUserModal = () => {
    document.getElementById('userModal').style.display = 'none';
    window.currentEditUid = null;
};

document.getElementById('editUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('editUserPassword').value;
    const uid = window.currentEditUid;
    const email = document.getElementById('editUserEmail').value;
    
    if (!newPassword) {
        mostrarAlerta('ℹ️ Sin cambios', 'No se proporcionó nueva contraseña', 'info');
        closeUserModal();
        return;
    }
    
    if (newPassword.length < 6) {
        mostrarAlerta('❌ Error', 'La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = `<div style="background: white; border-radius: 12px; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Actualizando usuario...</div>`;
    loadingAlert.style.position = 'fixed';
    loadingAlert.style.top = '50%';
    loadingAlert.style.left = '50%';
    loadingAlert.style.transform = 'translate(-50%, -50%)';
    loadingAlert.style.zIndex = '10000';
    document.body.appendChild(loadingAlert);
    
    try {
        mostrarAlerta('⚠️ Limitación', 'Para cambiar contraseña de otro usuario, necesitas implementar una Cloud Function en Firebase', 'info');
        loadingAlert.remove();
        closeUserModal();
    } catch (error) {
        loadingAlert.remove();
        mostrarAlerta('❌ Error', error.message, 'error');
    }
});

window.eliminarUsuario = async (uid) => {
    if (!confirm(`¿Eliminar este usuario? Esta acción es irreversible.`)) return;
    
    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = `<div style="background: white; border-radius: 12px; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Eliminando usuario...</div>`;
    loadingAlert.style.position = 'fixed';
    loadingAlert.style.top = '50%';
    loadingAlert.style.left = '50%';
    loadingAlert.style.transform = 'translate(-50%, -50%)';
    loadingAlert.style.zIndex = '10000';
    document.body.appendChild(loadingAlert);
    
    try {
        mostrarAlerta('⚠️ Limitación', 'Para eliminar usuarios, necesitas implementar una Cloud Function en Firebase', 'info');
        loadingAlert.remove();
    } catch (error) {
        loadingAlert.remove();
        mostrarAlerta('❌ Error', error.message, 'error');
    }
};

// ========== SELECTOR DE ESTADOS FLOTANTE ==========
const statusSelector = document.getElementById('statusSelector');

function mostrarSelectorEstados(id, elemento) {
    currentTicketId = id;
    const rect = elemento.getBoundingClientRect();
    const selectorHeight = 180;
    const espacioArriba = rect.top;
    
    statusSelector.classList.remove('up', 'down');
    
    if (espacioArriba > selectorHeight) {
        statusSelector.style.top = (rect.top - selectorHeight - 5) + 'px';
        statusSelector.style.left = rect.left + 'px';
    } else {
        statusSelector.style.top = (rect.bottom + 8) + 'px';
        statusSelector.style.left = rect.left + 'px';
    }
    
    statusSelector.style.display = 'block';
    
    const selectorRect = statusSelector.getBoundingClientRect();
    if (selectorRect.right > window.innerWidth) {
        statusSelector.style.left = (window.innerWidth - selectorRect.width - 10) + 'px';
    }
    if (selectorRect.left < 0) {
        statusSelector.style.left = '10px';
    }
}

function ocultarSelectorEstados() {
    statusSelector.style.display = 'none';
    currentTicketId = null;
}

document.querySelectorAll('.status-option').forEach(option => {
    option.addEventListener('click', async () => {
        const nuevoEstado = option.getAttribute('data-estado');
        if (currentTicketId && nuevoEstado) {
            await actualizarEstado(currentTicketId, nuevoEstado);
        }
        ocultarSelectorEstados();
    });
});

document.addEventListener('click', (e) => {
    if (!statusSelector.contains(e.target) && !e.target.classList.contains('status-badge')) {
        ocultarSelectorEstados();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ocultarSelectorEstados();
    }
});

// ========== FUNCIONES DE TICKETS ==========
async function actualizarEstado(id, nuevoEstado) {
    try {
        const ticketRef = doc(db, 'tickets', id);
        await updateDoc(ticketRef, { estado: nuevoEstado });
        mostrarAlerta('✅ Estado actualizado', `Ticket cambiado a ${getStatusText(nuevoEstado)}`, 'success');
        
        if (nuevoEstado === 'cerrado') {
            mostrarAlerta('🗑️ Ticket cerrado', 'El ticket será eliminado automáticamente', 'info');
            setTimeout(async () => {
                await deleteDoc(ticketRef);
                mostrarAlerta('✅ Eliminado', 'Ticket cerrado eliminado del sistema', 'success');
            }, 1500);
        }
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        mostrarAlerta('❌ Error', 'No se pudo actualizar el estado', 'error');
    }
}

function cargarTickets() {
    const ticketsCollection = collection(db, 'tickets');
    const q = query(ticketsCollection, orderBy('fecha', 'desc'));
    
    if (unsubscribeTickets) {
        unsubscribeTickets();
    }
    
    unsubscribeTickets = onSnapshot(q, (snapshot) => {
        tickets = [];
        
        snapshot.forEach((doc) => {
            const ticketData = doc.data();
            if (ticketData.estado !== 'cerrado') {
                tickets.push({
                    id: doc.id,
                    ...ticketData
                });
            } else {
                deleteDoc(doc.ref).catch(console.error);
            }
        });
        
        actualizarStats();
        renderTickets();
    }, (error) => {
        console.error('Error al cargar tickets:', error);
        mostrarAlerta('❌ Error', 'No se pudieron cargar los tickets', 'error');
    });
}

function actualizarStats() {
    const totalEl = document.getElementById('totalTickets');
    const abiertosEl = document.getElementById('ticketsAbiertos');
    const resueltosEl = document.getElementById('ticketsResueltos');
    
    if (totalEl) totalEl.textContent = tickets.length;
    if (abiertosEl) abiertosEl.textContent = tickets.filter(t => t.estado === 'abierto').length;
    if (resueltosEl) resueltosEl.textContent = tickets.filter(t => t.estado === 'resuelto').length;
}

function renderTickets() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filter = document.getElementById('filterStatus')?.value || 'all';
    let filtered = tickets.filter(t => 
        (filter === 'all' || t.estado === filter) &&
        (t.titulo?.toLowerCase().includes(search) || t.email?.toLowerCase().includes(search))
    );
    
    const container = document.getElementById('ticketsList');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading"><i class="fas fa-inbox"></i> No hay tickets</div>';
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr><th><i class="fas fa-hashtag"></i> ID</th><th><i class="fas fa-heading"></i> Título</th><th><i class="fas fa-tag"></i> Categoría</th><th><i class="fas fa-chart-simple"></i> Estado</th><th><i class="fas fa-envelope"></i> Email</th><th><i class="fas fa-calendar"></i> Fecha</th><th><i class="fas fa-cogs"></i> Acciones</th></tr>
            </thead>
            <tbody>
                ${filtered.map(t => `
                    <tr>
                        <td><code>${(t.id || '').substring(0,8)}...</code></td>
                        <td><strong>${escapeHtml(t.titulo)}</strong></td>
                        <td>${escapeHtml(t.categoria)}</td>
                        <td><span class="status-badge status-${t.estado}" data-id="${t.id}" style="cursor: pointer;">${getStatusText(t.estado)}</span></td>
                        <td>${escapeHtml(t.email)}</td>
                        <td>${t.fecha ? new Date(t.fecha).toLocaleDateString() : 'N/A'}</td>
                        <td class="action-btns">
                            <button class="btn-view" onclick="window.verTicket('${t.id}')"><i class="fas fa-eye"></i> Ver</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.querySelectorAll('.status-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = badge.getAttribute('data-id');
            mostrarSelectorEstados(id, badge);
        });
    });
}

// ========== REGISTRO DE CAMBIOS ==========
const CHANGES_STORAGE_KEY = 'amani-changes-log';

function loadChanges() {
    try {
        return JSON.parse(localStorage.getItem(CHANGES_STORAGE_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

function saveChanges(changes) {
    localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify(changes));
}

function renderChanges() {
    const container = document.getElementById('changesList');
    const changes = loadChanges();

    if (!container) return;
    
    if (!changes.length) {
        container.innerHTML = '<div class="change-card-empty"><i class="fas fa-inbox"></i> Aún no hay cambios registrados.</div>';
        return;
    }

    container.innerHTML = changes
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(change => `
            <div class="change-card">
                <div class="change-card-header">
                    <div>
                        <div class="change-card-title">${escapeHtml(change.title)}</div>
                    </div>
                    <div class="change-card-meta">
                        <span class="change-pill">${escapeHtml(change.type)}</span>
                        <span class="change-pill">${escapeHtml(change.responsible)}</span>
                        <span class="change-pill">${escapeHtml(change.date || 'Sin fecha')}</span>
                    </div>
                </div>
                <div class="change-card-description">${escapeHtml(change.description)}</div>
            </div>
        `).join('');
}

const changeForm = document.getElementById('changeForm');
if (changeForm) {
    changeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('changeTitle').value.trim();
        const responsible = document.getElementById('changeResponsible').value.trim();
        const description = document.getElementById('changeDescription').value.trim();
        const type = document.getElementById('changeType').value;
        const date = document.getElementById('changeDate').value || new Date().toISOString().slice(0, 10);

        if (!title || !responsible || !description) {
            mostrarAlerta('⚠️ Campos incompletos', 'Completa los campos obligatorios', 'error');
            return;
        }

        const changes = loadChanges();
        changes.push({
            title,
            responsible,
            type,
            date,
            description,
            createdAt: new Date().toISOString()
        });

        saveChanges(changes);
        renderChanges();
        
        document.getElementById('changeForm').reset();
        document.getElementById('changeType').value = 'Mejora';
        document.getElementById('changeDate').value = '';
        
        mostrarAlerta('✅ Cambio guardado', 'El registro se guardó correctamente', 'success');
    });
}

// ========== FUNCIONES PARA GESTIONAR DOCUMENTOS PDF ==========
const API_BASE_URL = "http://localhost:8080/api/rag";

// Cargar lista de documentos desde el backend
async function cargarDocumentos() {
    const container = document.getElementById('documentsList');
    if (!container) return;

    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-pulse"></i> Cargando documentos...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/documents`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const documentos = await response.json();
        
        if (!documentos || documentos.length === 0) {
            container.innerHTML = `
                <div class="document-empty">
                    <i class="fas fa-folder-open"></i>
                    <p>No hay documentos almacenados</p>
                    <p style="font-size: 12px; margin-top: 10px;">Sube tu primer PDF usando el formulario de arriba</p>
                </div>
            `;
            return;
        }

        container.innerHTML = documentos.map(doc => `
            <div class="document-card" data-id="${doc.idDocumento}">
                <div class="document-info">
                    <i class="fas fa-file-pdf"></i>
                    <div class="document-details">
                        <div class="document-title">${escapeHtml(doc.titulo || doc.nombreArchivo || 'Sin título')}</div>
                        <div class="document-meta">
                            <span><i class="fas fa-hashtag"></i> ID: ${doc.idDocumento}</span>
                            <span><i class="fas fa-tag"></i> ${escapeHtml(doc.categoria || 'Sin categoría')}</span>
                            <span><i class="fas fa-layer-group"></i> Chunks: ${doc.totalChunks || 0}</span>
                            <span><i class="fas fa-calendar"></i> ${doc.creadoEn ? new Date(doc.creadoEn).toLocaleDateString() : 'Fecha desconocida'}</span>
                        </div>
                        ${doc.nombreArchivo ? `<div class="document-meta"><span><i class="fas fa-file"></i> ${escapeHtml(doc.nombreArchivo)}</span></div>` : ''}
                    </div>
                </div>
                <div class="document-actions">
                    <button class="btn-delete-doc" onclick="eliminarDocumento(${doc.idDocumento}, '${escapeHtml(doc.titulo || doc.nombreArchivo || 'documento')}')">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error al cargar documentos:', error);
        container.innerHTML = `
            <div class="document-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al conectar con el backend</p>
                <p style="font-size: 12px; margin-top: 10px;">Verifica que el backend esté corriendo en ${API_BASE_URL}</p>
                <p style="font-size: 12px;">Error: ${error.message}</p>
            </div>
        `;
    }
}

// Eliminar documento por ID
window.eliminarDocumento = async (idDocumento, nombreDocumento) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el documento "${nombreDocumento}"?\n\nEsta acción es irreversible y eliminará todos los chunks asociados.`)) {
        return;
    }

    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = `<div style="background: white; border-radius: 12px; padding: 20px;"><i class="fas fa-spinner fa-pulse"></i> Eliminando documento...</div>`;
    loadingAlert.style.position = 'fixed';
    loadingAlert.style.top = '50%';
    loadingAlert.style.left = '50%';
    loadingAlert.style.transform = 'translate(-50%, -50%)';
    loadingAlert.style.zIndex = '10000';
    document.body.appendChild(loadingAlert);

    try {
        const response = await fetch(`${API_BASE_URL}/documents/${idDocumento}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const resultado = await response.json();
        
        loadingAlert.remove();
        mostrarAlerta('✅ Documento eliminado', `"${nombreDocumento}" ha sido eliminado correctamente`, 'success');
        
        // Registrar en el registro de cambios
        const changes = loadChanges();
        changes.push({
            title: `Documento eliminado: ${nombreDocumento}`,
            responsible: auth.currentUser?.email || 'Admin',
            type: 'Documentación',
            date: new Date().toISOString().slice(0, 10),
            description: `Se eliminó el documento "${nombreDocumento}" del sistema RAG`,
            createdAt: new Date().toISOString()
        });
        saveChanges(changes);
        
        // Recargar la lista de documentos
        await cargarDocumentos();
        
        // También recargar el registro de cambios si está visible
        renderChanges();
        
    } catch (error) {
        loadingAlert.remove();
        console.error('Error al eliminar documento:', error);
        mostrarAlerta('❌ Error', `No se pudo eliminar el documento: ${error.message}`, 'error');
    }
};

// Función para subir PDF
window.subirPDF = async () => {
    const fileInput = document.getElementById('pdfFile');
    const file = fileInput?.files[0];

    if (!file) {
        mostrarAlerta("Error", "Selecciona un PDF", "error");
        return;
    }

    if (file.type !== 'application/pdf') {
        mostrarAlerta("Error", "Solo se permiten archivos PDF", "error");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const uploadBtn = document.getElementById('uploadPdfBtn');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Subiendo...';

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: "POST",
            body: formData
        });

        const resultado = await response.json();

        if (response.ok) {
            mostrarAlerta("Éxito", resultado.message || "PDF subido correctamente", "success");
            console.log(resultado);
            
            // Limpiar input
            fileInput.value = '';
            
            // Recargar la lista de documentos
            await cargarDocumentos();
            
            // Registrar en el registro de cambios
            const changes = loadChanges();
            changes.push({
                title: `PDF subido: ${file.name}`,
                responsible: auth.currentUser?.email || 'Admin',
                type: 'Nuevo feature',
                date: new Date().toISOString().slice(0, 10),
                description: `Se subió el documento PDF "${file.name}" al backend`,
                createdAt: new Date().toISOString()
            });
            saveChanges(changes);
            
            // Recargar registro de cambios si está visible
            renderChanges();
        } else {
            mostrarAlerta("Error", resultado.message || resultado.error || "Error al subir PDF", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta("Error", "No se pudo conectar con el backend: " + error.message, "error");
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalText;
    }
};

// ========== CONTROL DE PESTAÑAS ==========
window.showTab = (tab) => {
    const usersTab = document.getElementById('usersTab');
    const viewTab = document.getElementById('viewTab');
    const changesTab = document.getElementById('changesTab');
    const uploadTab = document.getElementById('uploadTab');
    
    if (usersTab) usersTab.style.display = 'none';
    if (viewTab) viewTab.style.display = 'none';
    if (changesTab) changesTab.style.display = 'none';
    if (uploadTab) uploadTab.style.display = 'none';
    
    if (tab === 'users') {
        if (usersTab) usersTab.style.display = 'block';
        cargarUsuarios();
    } else if (tab === 'view') {
        if (viewTab) viewTab.style.display = 'block';
        renderTickets();
    } else if (tab === 'changes') {
        if (changesTab) changesTab.style.display = 'block';
        renderChanges();
    } else if (tab === 'upload') {
        if (uploadTab) uploadTab.style.display = 'block';
        cargarDocumentos(); // Cargar documentos al mostrar la pestaña
    }
    
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        const isUsers = btn.textContent.includes('Usuarios');
        const isView = btn.textContent.includes('Ver Tickets');
        const isChanges = btn.textContent.includes('Registro de Cambios');
        const isUpload = btn.textContent.includes('Subir PDF');
        
        if ((tab === 'users' && isUsers) || 
            (tab === 'view' && isView) || 
            (tab === 'changes' && isChanges) ||
            (tab === 'upload' && isUpload)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

// ========== FUNCIONES DE TICKETS ==========
window.verTicket = async (id) => {
    try {
        const ticketRef = doc(db, 'tickets', id);
        const docSnap = await getDoc(ticketRef);
        
        if (docSnap.exists()) {
            const t = docSnap.data();
            document.getElementById('modalContent').innerHTML = `
                <p><i class="fas fa-hashtag"></i> <strong>ID:</strong> ${id}</p>
                <p><i class="fas fa-heading"></i> <strong>Título:</strong> ${escapeHtml(t.titulo)}</p>
                <p><i class="fas fa-tag"></i> <strong>Categoría:</strong> ${escapeHtml(t.categoria)}</p>
                <p><i class="fas fa-chart-simple"></i> <strong>Estado:</strong> ${getStatusText(t.estado)}</p>
                <p><i class="fas fa-align-left"></i> <strong>Descripción:</strong><br>${escapeHtml(t.descripcion)}</p>
                <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${escapeHtml(t.email)}</p>
                <p><i class="fas fa-mobile-alt"></i> <strong>Dispositivo:</strong> ${escapeHtml(t.dispositivo)}</p>
                <p><i class="fas fa-calendar"></i> <strong>Fecha:</strong> ${t.fecha ? new Date(t.fecha).toLocaleString() : 'N/A'}</p>
                ${t.respuestaAdmin ? `<p><i class="fas fa-reply"></i> <strong>Respuesta:</strong><br>${escapeHtml(t.respuestaAdmin)}</p>` : ''}
            `;
            document.getElementById('modal').style.display = 'flex';
        } else {
            mostrarAlerta('❌ Error', 'Ticket no encontrado', 'error');
        }
    } catch (error) {
        console.error('Error al ver ticket:', error);
        mostrarAlerta('❌ Error', 'No se pudo cargar el ticket', 'error');
    }
};

window.closeModal = () => {
    document.getElementById('modal').style.display = 'none';
};

function escapeHtml(str) { 
    return str?.replace(/[&<>]/g, function(m) { 
        return {'&':'&amp;','<':'&lt;','>':'&gt;'}[m]; 
    }) || ''; 
}

function getStatusText(s) { 
    return { 
        'abierto':'🟡 Abierto',
        'en-proceso':'🔵 En proceso', 
        'resuelto':'🟢 Resuelto',
        'cerrado':'⚫ Cerrado' 
    }[s] || s; 
}

const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');

if (searchInput) searchInput.addEventListener('input', renderTickets);
if (filterStatus) filterStatus.addEventListener('change', renderTickets);

// Agregar event listener para el botón de subida
document.getElementById('uploadPdfBtn')?.addEventListener('click', window.subirPDF);

console.log('🔥 Sistema listo con Firestore, gestión de usuarios, gestión de documentos y subida de PDFs');
