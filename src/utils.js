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

// ------------------------------------------------------------------
// Tema de cor de destaque (accent color)
// ------------------------------------------------------------------

// Converte "#6366f1" em { r, g, b }
function hexToRgb(hex) {
  const clean = (hex || '').replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  const num = parseInt(full, 16)
  if (Number.isNaN(num) || full.length !== 6) return { r: 99, g: 102, b: 241 } // fallback: indigo padrão
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

// Aplica a cor de destaque escolhida pelo usuário nas variáveis CSS
// globais que todo o app usa (--indigo, --indigo-dim, --indigo-glow,
// --border-active). Assim, botões, bordas ativas, ícones etc. mudam de
// cor no site inteiro, sem precisar tocar em cada componente.
export function applyAccentColor(hex) {
  if (!hex) return
  const { r, g, b } = hexToRgb(hex)
  const root = document.documentElement.style
  root.setProperty('--indigo', hex)
  root.setProperty('--indigo-dim', `rgba(${r},${g},${b},.15)`)
  root.setProperty('--indigo-glow', `rgba(${r},${g},${b},.35)`)
  root.setProperty('--border-active', `rgba(${r},${g},${b},.45)`)
}