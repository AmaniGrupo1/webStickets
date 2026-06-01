// ========== MÓDULO DE TICKETS ==========

import {
    db, collection, doc, addDoc, updateDoc, deleteDoc,
    getDocs, getDoc, onSnapshot, query, orderBy
} from '../firebase-config.js';

import { mostrarAlerta } from './ui.js';
import { escapeHtml, getStatusText } from './utils.js';

// Estado interno del módulo
let tickets           = [];
let currentTicketId   = null;
let unsubscribeTickets = null;

const statusSelector = document.getElementById('statusSelector');

// ────────────────────────────────────────────
// SUSCRIPCIÓN EN TIEMPO REAL
// ────────────────────────────────────────────

/**
 * Inicia la escucha en tiempo real de la colección 'tickets' de Firestore.
 * Los tickets cerrados se eliminan automáticamente.
 */
export function cargarTickets() {
    const ticketsCollection = collection(db, 'tickets');
    const q = query(ticketsCollection, orderBy('fecha', 'desc'));

    if (unsubscribeTickets) unsubscribeTickets();

    unsubscribeTickets = onSnapshot(q, (snapshot) => {
        tickets = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.estado !== 'cerrado') {
                tickets.push({ id: docSnap.id, ...data });
            } else {
                deleteDoc(docSnap.ref).catch(console.error);
            }
        });
        actualizarStats();
        renderTickets();
    }, (error) => {
        console.error('Error al cargar tickets:', error);
        mostrarAlerta('❌ Error', 'No se pudieron cargar los tickets', 'error');
    });
}

/**
 * Cancela la suscripción activa de tickets.
 */
export function cancelarSuscripcionTickets() {
    if (unsubscribeTickets) {
        unsubscribeTickets();
        unsubscribeTickets = null;
    }
}

// ────────────────────────────────────────────
// ACTUALIZACIÓN DE ESTADO
// ────────────────────────────────────────────

/**
 * Actualiza el estado de un ticket en Firestore.
 * Si el nuevo estado es 'cerrado', el ticket se elimina tras 1.5 s.
 * @param {string} id
 * @param {string} nuevoEstado
 */
export async function actualizarEstado(id, nuevoEstado) {
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

// ────────────────────────────────────────────
// RENDER
// ────────────────────────────────────────────

/**
 * Actualiza los contadores del panel de estadísticas.
 */
export function actualizarStats() {
    const totalEl    = document.getElementById('totalTickets');
    const abiertosEl = document.getElementById('ticketsAbiertos');
    const resueltosEl = document.getElementById('ticketsResueltos');

    if (totalEl)     totalEl.textContent     = tickets.length;
    if (abiertosEl)  abiertosEl.textContent  = tickets.filter(t => t.estado === 'abierto').length;
    if (resueltosEl) resueltosEl.textContent = tickets.filter(t => t.estado === 'resuelto').length;
}

/**
 * Renderiza la tabla de tickets aplicando los filtros activos.
 */
export function renderTickets() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filter = document.getElementById('filterStatus')?.value || 'all';

    const filtered = tickets.filter(t =>
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
                <tr>
                    <th><i class="fas fa-hashtag"></i> ID</th>
                    <th><i class="fas fa-heading"></i> Título</th>
                    <th><i class="fas fa-tag"></i> Categoría</th>
                    <th><i class="fas fa-chart-simple"></i> Estado</th>
                    <th><i class="fas fa-envelope"></i> Email</th>
                    <th><i class="fas fa-calendar"></i> Fecha</th>
                    <th><i class="fas fa-cogs"></i> Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(t => `
                    <tr>
                        <td><code>${(t.id || '').substring(0, 8)}...</code></td>
                        <td><strong>${escapeHtml(t.titulo)}</strong></td>
                        <td>${escapeHtml(t.categoria)}</td>
                        <td>
                            <span class="status-badge status-${t.estado}"
                                  data-id="${t.id}" style="cursor: pointer;">
                                ${getStatusText(t.estado)}
                            </span>
                        </td>
                        <td>${escapeHtml(t.email)}</td>
                        <td>${t.fecha ? new Date(t.fecha).toLocaleDateString() : 'N/A'}</td>
                        <td class="action-btns">
                            <button class="btn-view" onclick="window.verTicket('${t.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Asociar el selector de estado a cada badge
    document.querySelectorAll('.status-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarSelectorEstados(badge.getAttribute('data-id'), badge);
        });
    });
}

// ────────────────────────────────────────────
// MODAL VER TICKET
// ────────────────────────────────────────────

/**
 * Carga y muestra el detalle de un ticket en el modal.
 * @param {string} id
 */
export async function verTicket(id) {
    try {
        const docSnap = await getDoc(doc(db, 'tickets', id));
        if (!docSnap.exists()) {
            mostrarAlerta('❌ Error', 'Ticket no encontrado', 'error');
            return;
        }
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
    } catch (error) {
        console.error('Error al ver ticket:', error);
        mostrarAlerta('❌ Error', 'No se pudo cargar el ticket', 'error');
    }
}

/**
 * Cierra el modal de detalle de ticket.
 */
export function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// ────────────────────────────────────────────
// SELECTOR FLOTANTE DE ESTADOS
// ────────────────────────────────────────────

/**
 * Posiciona y muestra el selector flotante de estados junto al badge pulsado.
 * @param {string} id - ID del ticket.
 * @param {HTMLElement} elemento - Badge que disparó la acción.
 */
export function mostrarSelectorEstados(id, elemento) {
    currentTicketId = id;
    const rect           = elemento.getBoundingClientRect();
    const selectorHeight = 180;

    if (rect.top > selectorHeight) {
        statusSelector.style.top  = (rect.top - selectorHeight - 5) + 'px';
        statusSelector.style.left = rect.left + 'px';
    } else {
        statusSelector.style.top  = (rect.bottom + 8) + 'px';
        statusSelector.style.left = rect.left + 'px';
    }

    statusSelector.style.display = 'block';

    // Ajuste horizontal para que no salga de la pantalla
    const sRect = statusSelector.getBoundingClientRect();
    if (sRect.right > window.innerWidth) {
        statusSelector.style.left = (window.innerWidth - sRect.width - 10) + 'px';
    }
    if (sRect.left < 0) {
        statusSelector.style.left = '10px';
    }
}

/**
 * Oculta el selector flotante de estados.
 */
export function ocultarSelectorEstados() {
    if (statusSelector) statusSelector.style.display = 'none';
    currentTicketId = null;
}

/**
 * Registra los eventos del selector flotante y del documento para cerrarlo.
 */
export function setupStatusSelector() {
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
        if (statusSelector &&
            !statusSelector.contains(e.target) &&
            !e.target.classList.contains('status-badge')) {
            ocultarSelectorEstados();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') ocultarSelectorEstados();
    });
}

/**
 * Configura los event listeners de búsqueda y filtro de tickets.
 */
export function setupTicketFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    if (searchInput)  searchInput.addEventListener('input', renderTickets);
    if (filterStatus) filterStatus.addEventListener('change', renderTickets);
}
