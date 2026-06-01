// ========== UTILIDADES COMPARTIDAS ==========

/**
 * Escapa caracteres HTML peligrosos para evitar XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    return str?.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]) || '';
}

/**
 * Devuelve el texto legible de un estado de ticket.
 * @param {string} s - Clave del estado ('abierto', 'en-proceso', etc.)
 * @returns {string}
 */
export function getStatusText(s) {
    return {
        'abierto':    '🟡 Abierto',
        'en-proceso': '🔵 En proceso',
        'resuelto':   '🟢 Resuelto',
        'cerrado':    '⚫ Cerrado'
    }[s] || s;
}
