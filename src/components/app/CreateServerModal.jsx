import { useState, useRef } from 'react'

export default function CreateServerModal({ onClose, onCreateServer }) {
  const [name, setName] = useState('')
  const [iconPreview, setIconPreview] = useState(null)
  const [iconDataUrl, setIconDataUrl] = useState(null)
  const [iconError, setIconError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const fileInputRef = useRef(null)

  // ------------------------------------------------------------------
  // Upload de ícone circular
  // ------------------------------------------------------------------
  function handleIconChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setIconError('')
    if (file.size > 2 * 1024 * 1024) {
      setIconError('Imagem muito grande. Máximo 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setIconPreview(ev.target.result)
      setIconDataUrl(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  // ------------------------------------------------------------------
  // Cria o servidor
  // ------------------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || isCreating) return
    setIsCreating(true)
    const server = await onCreateServer(name.trim(), iconDataUrl)
    setIsCreating(false)
    if (server) onClose()
  }

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  // Gera iniciais do nome para exibição no ícone placeholder
  const initials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '+'

  return (
    <div className="settings-overlay" onClick={handleOverlay}>
      <div className="settings-modal" style={{ maxWidth: 440 }} role="dialog" aria-modal="true" aria-label="Criar servidor">

        <header className="settings-header">
          <h2 className="settings-title">
            <i className="fa-solid fa-server settings-title-icon"></i>
            Criar Servidor
          </h2>
          <button className="settings-close-btn" onClick={onClose} aria-label="Fechar">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="settings-body">

            {/* Ícone circular clicável */}
            <section className="settings-section" style={{ alignItems: 'center' }}>
              <p style={{ fontSize: '.82rem', color: 'var(--tx-2)', textAlign: 'center' }}>
                Dê uma identidade ao seu servidor com um ícone e um nome.
              </p>

              <div
                className="cs-icon-wrap"
                onClick={() => fileInputRef.current?.click()}
                title="Clique para adicionar um ícone"
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                {iconPreview ? (
                  <img src={iconPreview} alt="Ícone" className="cs-icon-img" />
                ) : (
                  <span className="cs-icon-initials">{initials}</span>
                )}
                <div className="cs-icon-overlay">
                  <i className="fa-solid fa-camera"></i>
                  <span>Trocar</span>
                </div>
              </div>

              {iconError && (
                <p className="settings-avatar-error">
                  <i className="fa-solid fa-triangle-exclamation"></i> {iconError}
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleIconChange}
              />
            </section>

            <div className="settings-divider"></div>

            {/* Nome do servidor */}
            <section className="settings-section">
              <div className="settings-field-group">
                <label className="settings-label" htmlFor="cs-name">
                  Nome do Servidor
                </label>
                <input
                  id="cs-name"
                  type="text"
                  className="settings-input"
                  placeholder="Ex: Dev Squad HQ, Gaming Arena..."
                  maxLength={50}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <p style={{ fontSize: '.78rem', color: 'var(--tx-3)' }}>
                Ao criar um servidor, você concorda em respeitar as nossas diretrizes da comunidade.
              </p>
            </section>

          </div>

          <footer className="settings-footer">
            <button type="button" className="settings-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="settings-btn-primary"
              disabled={!name.trim() || isCreating}
            >
              {isCreating
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Criando...</>
                : <><i className="fa-solid fa-plus"></i> Criar Servidor</>
              }
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
