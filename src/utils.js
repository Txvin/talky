// ==========================================================================
// TALKY — Funções utilitárias
// ==========================================================================

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

export function fmtTime(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}