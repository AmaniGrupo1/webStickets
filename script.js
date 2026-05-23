import { 
    db, auth, ref, push, set, onValue, update, remove, get,
    GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup,
    onAuthStateChanged, signOut
} from './firebase-config.js';

let tickets = [];
let currentTicketId = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ========== FUNCIÓN PARA ALERTAS PERSONALIZADAS ==========
function mostrarAlerta(titulo, mensaje, tipo) {
    // Crear elemento de alerta flotante
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
    
    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
        alerta.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => alerta.remove(), 300);
    }, 3000);
}

// Agregar animación fadeOut si no existe
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    }
`;
document.head.appendChild(style);

// ========== AUTENTICACIÓN CON ALERTAS ==========
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
    
    // Mostrar alerta de carga
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
        
        // Limpiar campo contraseña por seguridad
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

window.loginWithGoogle = async () => {
    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 20px 25px; display: flex; align-items: center; gap: 15px;">
            <i class="fas fa-spinner fa-pulse" style="font-size: 24px; color: #667eea;"></i>
            <span style="color: #333;">Abriendo Google para iniciar sesión...</span>
        </div>
    `;
    loadingAlert.style.position = 'fixed';
    loadingAlert.style.top = '50%';
    loadingAlert.style.left = '50%';
    loadingAlert.style.transform = 'translate(-50%, -50%)';
    loadingAlert.style.zIndex = '10000';
    document.body.appendChild(loadingAlert);

    try {
        await signInWithPopup(auth, googleProvider);
        loadingAlert.remove();
        mostrarAlerta('✅ ¡Bienvenido!', 'Sesión iniciada con Google correctamente', 'success');
    } catch (error) {
        loadingAlert.remove();

        if (error.code === 'auth/popup-closed-by-user') {
            mostrarAlerta('ℹ️ Cancelado', 'Cerraste la ventana de Google sin completar el inicio de sesión', 'info');
            return;
        }

        mostrarAlerta('❌ Error', error.message || 'No se pudo iniciar sesión con Google', 'error');
    }
};

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    
    if (user) {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'block';
        document.getElementById('userEmail').innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;
        cargarTickets();
    } else {
        loginScreen.style.display = 'flex';
        dashboard.style.display = 'none';
        tickets = [];
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

// ========== FUNCIONES PRINCIPALES ==========
async function actualizarEstado(id, nuevoEstado) {
    try {
        await update(ref(db, `tickets/${id}`), { estado: nuevoEstado });
        mostrarAlerta('✅ Estado actualizado', `Ticket cambiado a ${getStatusText(nuevoEstado)}`, 'success');
        
        if (nuevoEstado === 'cerrado') {
            mostrarAlerta('🗑️ Ticket cerrado', 'El ticket será eliminado automáticamente', 'info');
            setTimeout(async () => {
                await remove(ref(db, `tickets/${id}`));
                mostrarAlerta('✅ Eliminado', 'Ticket cerrado eliminado del sistema', 'success');
            }, 1500);
        }
    } catch (error) {
        mostrarAlerta('❌ Error', 'No se pudo actualizar el estado', 'error');
    }
}

function showToast(msg, isError = false) {
    const toast = document.createElement('div');
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${msg}`;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = isError ? '#ff7675' : '#4caf50';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '2000';
    toast.style.fontFamily = 'Segoe UI, sans-serif';
    toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function cargarTickets() {
    const ticketsRef = ref(db, 'tickets');
    
    onValue(ticketsRef, (snapshot) => {
        tickets = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const ticketData = child.val();
                if (ticketData.estado !== 'cerrado') {
                    tickets.push({
                        id: child.key,
                        ...ticketData
                    });
                } else {
                    remove(ref(db, `tickets/${child.key}`)).catch(console.error);
                }
            });
            
            tickets.sort((a, b) => b.fecha - a.fecha);
        }
        
        actualizarStats();
        renderTickets();
    });
}

function actualizarStats() {
    document.getElementById('totalTickets').textContent = tickets.length;
    document.getElementById('ticketsAbiertos').textContent = tickets.filter(t => t.estado === 'abierto').length;
    document.getElementById('ticketsResueltos').textContent = tickets.filter(t => t.estado === 'resuelto').length;
}

function renderTickets() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filter = document.getElementById('filterStatus').value;
    let filtered = tickets.filter(t => 
        (filter === 'all' || t.estado === filter) &&
        (t.titulo?.toLowerCase().includes(search) || t.email?.toLowerCase().includes(search))
    );
    
    const container = document.getElementById('ticketsList');
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
                        <td>${new Date(t.fecha).toLocaleDateString()}</td>
                        <td class="action-btns">
                            <button class="btn-view" onclick="window.verTicket('${t.id}')"><i class="fas fa-eye"></i> Ver</button>
                            <button class="btn-delete" onclick="window.eliminarTicket('${t.id}')"><i class="fas fa-trash-alt"></i> Eliminar</button>
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

document.getElementById('ticketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('titulo').value.trim();
    const categoria = document.getElementById('categoria').value;
    const descripcion = document.getElementById('descripcion').value.trim();
    const email = document.getElementById('email').value.trim();
    
    if (titulo.length < 5) return showToast('Título muy corto', true);
    if (!categoria) return showToast('Selecciona categoría', true);
    if (descripcion.length < 10) return showToast('Descripción muy corta', true);
    if (!email.includes('@')) return showToast('Email inválido', true);
    
    try {
        const ticketsRef = ref(db, 'tickets');
        const newTicketRef = push(ticketsRef);
        
        await set(newTicketRef, {
            id: newTicketRef.key,
            titulo,
            categoria,
            descripcion,
            email,
            estado: 'abierto',
            respuestaAdmin: '',
            fecha: Date.now(),
            dispositivo: document.getElementById('dispositivo').value.trim() || 'Web',
            appVersion: document.getElementById('appVersion').value.trim() || 'Web v1.0'
        });
        
        mostrarAlerta('✅ Ticket creado', 'El ticket ha sido creado exitosamente', 'success');
        document.getElementById('ticketForm').reset();
        showTab('view');
    } catch (error) {
        mostrarAlerta('❌ Error', 'No se pudo crear el ticket', 'error');
    }
});

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

document.getElementById('changeForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('changeTitle').value.trim();
    const responsible = document.getElementById('changeResponsible').value.trim();
    const description = document.getElementById('changeDescription').value.trim();
    const type = document.getElementById('changeType').value;
    const date = document.getElementById('changeDate').value || new Date().toISOString().slice(0, 10);

    if (!title || !responsible || !description) {
        showToast('Completa los campos obligatorios', true);
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
    mostrarAlerta('✅ Cambio guardado', 'El registro se guardó correctamente en este navegador', 'success');
});

window.verTicket = async (id) => {
    try {
        const snapshot = await get(ref(db, `tickets/${id}`));
        if (snapshot.exists()) {
            const t = snapshot.val();
            document.getElementById('modalContent').innerHTML = `
                <p><i class="fas fa-hashtag"></i> <strong>ID:</strong> ${id}</p>
                <p><i class="fas fa-heading"></i> <strong>Título:</strong> ${escapeHtml(t.titulo)}</p>
                <p><i class="fas fa-tag"></i> <strong>Categoría:</strong> ${escapeHtml(t.categoria)}</p>
                <p><i class="fas fa-chart-simple"></i> <strong>Estado:</strong> ${getStatusText(t.estado)}</p>
                <p><i class="fas fa-align-left"></i> <strong>Descripción:</strong><br>${escapeHtml(t.descripcion)}</p>
                <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${escapeHtml(t.email)}</p>
                <p><i class="fas fa-mobile-alt"></i> <strong>Dispositivo:</strong> ${escapeHtml(t.dispositivo)}</p>
                <p><i class="fas fa-calendar"></i> <strong>Fecha:</strong> ${new Date(t.fecha).toLocaleString()}</p>
                ${t.respuestaAdmin ? `<p><i class="fas fa-reply"></i> <strong>Respuesta:</strong><br>${escapeHtml(t.respuestaAdmin)}</p>` : ''}
            `;
            document.getElementById('modal').style.display = 'flex';
        } else {
            mostrarAlerta('❌ Error', 'Ticket no encontrado', 'error');
        }
    } catch (error) {
        mostrarAlerta('❌ Error', 'No se pudo cargar el ticket', 'error');
    }
};

window.eliminarTicket = async (id) => {
    if (confirm('¿Eliminar este ticket?')) {
        try {
            await remove(ref(db, `tickets/${id}`));
            mostrarAlerta('🗑️ Ticket eliminado', 'El ticket ha sido eliminado', 'info');
        } catch (error) {
            mostrarAlerta('❌ Error', 'No se pudo eliminar el ticket', 'error');
        }
    }
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

window.closeModal = () => document.getElementById('modal').style.display = 'none';

window.showTab = (tab) => {
    document.getElementById('createTab').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('viewTab').style.display = tab === 'view' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach((btn, i) => btn.classList.toggle('active', (tab === 'create' && i === 0) || (tab === 'view' && i === 1)));
};

document.getElementById('searchInput').addEventListener('input', renderTickets);
document.getElementById('filterStatus').addEventListener('change', renderTickets);
renderChanges();

console.log('🔥 Sistema listo - esperando login');