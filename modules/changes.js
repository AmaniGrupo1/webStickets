// ========== MÓDULO DE REGISTRO DE CAMBIOS ==========

import { mostrarAlerta } from './ui.js';
import { escapeHtml } from './utils.js';

const CHANGES_STORAGE_KEY = 'amani-changes-log';

// ────────────────────────────────────────────
// PERSISTENCIA
// ────────────────────────────────────────────

/**
 * Carga el array de cambios desde localStorage.
 * @returns {Array}
 */
export function loadChanges() {
    try {
        return JSON.parse(localStorage.getItem(CHANGES_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Persiste el array de cambios en localStorage.
 * @param {Array} changes
 */
export function saveChanges(changes) {
    localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify(changes));
}

// ────────────────────────────────────────────
// RENDER
// ────────────────────────────────────────────

/**
 * Renderiza los cambios registrados en el contenedor #changesList, ordenados por fecha descendente.
 */
export function renderChanges() {
    const container = document.getElementById('changesList');
    if (!container) return;

    const changes = loadChanges();

    if (!changes.length) {
        container.innerHTML = '<div class="change-card-empty"><i class="fas fa-inbox"></i> Aún no hay cambios registrados.</div>';
        return;
    }

    container.innerHTML = [...changes]
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

// ────────────────────────────────────────────
// FORMULARIO
// ────────────────────────────────────────────

/**
 * Registra el listener del formulario de registro de cambios (#changeForm).
 */
export function setupChangeForm() {
    const changeForm = document.getElementById('changeForm');
    if (!changeForm) return;

    changeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title       = document.getElementById('changeTitle').value.trim();
        const responsible = document.getElementById('changeResponsible').value.trim();
        const description = document.getElementById('changeDescription').value.trim();
        const type        = document.getElementById('changeType').value;
        const date        = document.getElementById('changeDate').value || new Date().toISOString().slice(0, 10);

        if (!title || !responsible || !description) {
            mostrarAlerta('⚠️ Campos incompletos', 'Completa los campos obligatorios', 'error');
            return;
        }

        const changes = loadChanges();
        changes.push({ title, responsible, type, date, description, createdAt: new Date().toISOString() });
        saveChanges(changes);
        renderChanges();

        // Reset parcial del formulario
        changeForm.reset();
        document.getElementById('changeType').value = 'Mejora';
        document.getElementById('changeDate').value = '';

        mostrarAlerta('✅ Cambio guardado', 'El registro se guardó correctamente', 'success');
    });
}
