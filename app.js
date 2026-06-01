// ========== PUNTO DE ENTRADA PRINCIPAL ==========
// Este módulo actúa como orquestador: importa todos los módulos especializados,
// inicializa los listeners globales y gestiona el estado de la aplicación.

import { injectAlertAnimations, setupPasswordToggles, setupThemeControls } from './modules/ui.js';
import { login, logout, observeAuthState, setupEnterKeyLogin }             from './modules/auth.js';
import {
    cargarTickets, cancelarSuscripcionTickets,
    verTicket, closeModal,
    setupStatusSelector, setupTicketFilters
} from './modules/tickets.js';
import {
    cargarUsuarios,
    editarUsuario, closeUserModal,
    eliminarUsuario, setupCreateUserForm, setupEditUserForm
} from './modules/users.js';
import { renderChanges, setupChangeForm } from './modules/changes.js';

// ────────────────────────────────────────────
// INICIALIZACIÓN
// ────────────────────────────────────────────

// Inyectar CSS de animaciones de alertas
injectAlertAnimations();

// Configurar controles de UI globales
setupThemeControls();
setupEnterKeyLogin(login);

// Configurar módulos con formularios y eventos
setupStatusSelector();
setupTicketFilters();
setupCreateUserForm();
setupEditUserForm();
setupChangeForm();

// ────────────────────────────────────────────
// ESTADO DE AUTENTICACIÓN
// ────────────────────────────────────────────

observeAuthState(
    // Usuario autenticado
    (user) => {
        document.getElementById('loginScreen').style.display  = 'none';
        document.getElementById('dashboard').style.display    = 'block';
        document.getElementById('userEmail').textContent      = user.email;

        cargarTickets();
        cargarUsuarios();
        renderChanges();
        setupPasswordToggles();
    },
    // Usuario no autenticado
    () => {
        cancelarSuscripcionTickets();
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboard').style.display   = 'none';
    }
);

// ────────────────────────────────────────────
// CONTROL DE PESTAÑAS
// ────────────────────────────────────────────

/**
 * Muestra la pestaña indicada y oculta las demás.
 * @param {'users'|'view'|'changes'} tab
 */
window.showTab = (tab) => {
    const TAB_MAP = {
        users:   { id: 'usersTab',   action: cargarUsuarios },
        view:    { id: 'viewTab',    action: () => {} /* tickets se refresca en tiempo real */ },
        changes: { id: 'changesTab', action: renderChanges }
    };

    // Ocultar todas las pestañas
    Object.values(TAB_MAP).forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Mostrar y activar la pestaña seleccionada
    const selected = TAB_MAP[tab];
    if (selected) {
        const tabEl = document.getElementById(selected.id);
        if (tabEl) tabEl.style.display = 'block';
        selected.action();
    }

    // Actualizar clases activas en los botones de navegación
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        const isActive =
            (tab === 'users'   && btn.textContent.includes('Usuarios'))   ||
            (tab === 'view'    && btn.textContent.includes('Ver Tickets')) ||
            (tab === 'changes' && btn.textContent.includes('Registro de Cambios'));
        btn.classList.toggle('active', isActive);
    });
};

// ────────────────────────────────────────────
// EXPONER FUNCIONES AL DOM (onclick="…")
// ────────────────────────────────────────────

window.login          = login;
window.logout         = logout;
window.verTicket      = verTicket;
window.closeModal     = closeModal;
window.editarUsuario  = editarUsuario;
window.closeUserModal = closeUserModal;
window.eliminarUsuario = eliminarUsuario;

console.log('🔥 Sistema listo con Firestore y gestión de usuarios');
