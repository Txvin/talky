import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'

// Paleta de cores de destaque predefinidas
const PRESET_COLORS = [
  '#8b7cf6', // Roxo (padrão)
  '#6366f1', // Índigo
  '#38bdf8', // Ciano
  '#22c55e', // Verde
  '#f59e0b', // Âmbar
  '#ec4899', // Rosa
  '#ef4444', // Vermelho
  '#f97316', // Laranja
]

export default function SettingsModal({ onClose }) {
  const { currentUser, updateProfile } = useAuth()

  const [form, setForm] = useState({
    name:         currentUser?.name         || '',
    handle:       currentUser?.handle       || '',
    status:       currentUser?.status       || '',
    avatar_url:   currentUser?.avatar_url   || currentUser?.avatar || '',
    accent_color: currentUser?.accent_color || '#8b7cf6',
  })
  const [avatarPreview, setAvatarPreview] = useState(form.avatar_url)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef(null)

  // ------------------------------------------------------------------
  // Upload de avatar via FileReader (dataURL, limite 2 MB)
  // ------------------------------------------------------------------
  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setAvatarError('')

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Imagem muito grande. Máximo permitido: 2 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setAvatarPreview(dataUrl)
      setForm(prev => ({ ...prev, avatar_url: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  // ------------------------------------------------------------------
  // Salvar perfil
  // ------------------------------------------------------------------
  async function handleSave() {
    if (!form.name.trim()) return
    setIsSaving(true)
    await updateProfile({
      name:         form.name.trim(),
      handle:       form.handle.trim(),
      status:       form.status.trim(),
      avatar_url:   form.avatar_url,
      accent_color: form.accent_color,
    })
    setIsSaving(false)
    onClose()
  }

  // ------------------------------------------------------------------
  // Fechar ao clicar no overlay
  // ------------------------------------------------------------------
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="settings-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Configurações de Perfil">

        {/* Cabeçalho */}
        <header className="settings-header">
          <h2 className="settings-title">
            <i className="fa-solid fa-user-pen settings-title-icon"></i>
            Configurações de Perfil
          </h2>
          <button className="settings-close-btn" onClick={onClose} title="Fechar" aria-label="Fechar modal">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        {/* Corpo */}
        <div className="settings-body">

          {/* Seção: Avatar */}
          <section className="settings-section">
            <h3 className="settings-section-title">Foto de Perfil</h3>
            <div className="settings-avatar-row">
              <div
                className="settings-avatar-wrap"
                onClick={() => fileInputRef.current?.click()}
                title="Clique para trocar a foto"
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="settings-avatar-img" />
                ) : (
                  <div className="settings-avatar-placeholder">
                    <i className="fa-solid fa-user"></i>
                  </div>
                )}
                <div className="settings-avatar-overlay">
                  <i className="fa-solid fa-camera"></i>
                  <span>Trocar foto</span>
                </div>
              </div>
              <div className="settings-avatar-info">
                <p className="settings-avatar-hint">
                  Clique no avatar para fazer upload de uma imagem.
                </p>
                <p className="settings-avatar-hint dim">Máximo: 2 MB · JPG, PNG ou GIF</p>
                {avatarError && (
                  <p className="settings-avatar-error">
                    <i className="fa-solid fa-triangle-exclamation"></i> {avatarError}
                  </p>
                )}
                <button
                  className="settings-btn-secondary sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fa-solid fa-upload"></i> Escolher imagem
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>
          </section>

          <div className="settings-divider"></div>

          {/* Seção: Informações */}
          <section className="settings-section">
            <h3 className="settings-section-title">Informações</h3>

            <div className="settings-field-group">
              <label className="settings-label" htmlFor="settings-name">
                Nome de exibição
              </label>
              <input
                id="settings-name"
                type="text"
                className="settings-input"
                placeholder="Seu nome completo"
                maxLength={60}
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label" htmlFor="settings-handle">
                Handle <span className="settings-label-dim">(@usuario)</span>
              </label>
              <div className="settings-input-prefix-wrap">
                <span className="settings-input-prefix">@</span>
                <input
                  id="settings-handle"
                  type="text"
                  className="settings-input has-prefix"
                  placeholder="seunome"
                  maxLength={32}
                  value={form.handle.replace(/^@/, '')}
                  onChange={e => {
                    const val = e.target.value.replace(/[^a-z0-9._-]/gi, '').toLowerCase()
                    setForm(prev => ({ ...prev, handle: '@' + val }))
                  }}
                />
              </div>
            </div>

            <div className="settings-field-group">
              <label className="settings-label" htmlFor="settings-status">
                Status / Bio
              </label>
              <textarea
                id="settings-status"
                className="settings-textarea"
                placeholder="Deixe uma mensagem de status..."
                maxLength={100}
                rows={2}
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
              />
              <span className="settings-char-count">{form.status.length}/100</span>
            </div>
          </section>

          <div className="settings-divider"></div>

          {/* Seção: Cor de destaque */}
          <section className="settings-section">
            <h3 className="settings-section-title">Cor de Destaque</h3>
            <p className="settings-section-desc">
              Esta cor é usada em elementos de interface personalizados.
            </p>
            <div className="settings-color-picker-row">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  className={`settings-color-swatch${form.accent_color === color ? ' selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setForm(prev => ({ ...prev, accent_color: color }))}
                  title={color}
                  aria-label={`Selecionar cor ${color}`}
                  type="button"
                >
                  {form.accent_color === color && (
                    <i className="fa-solid fa-check settings-color-check"></i>
                  )}
                </button>
              ))}

              {/* Color picker customizado */}
              <label className="settings-color-custom" title="Escolher cor personalizada">
                <span className="settings-color-custom-preview" style={{ backgroundColor: form.accent_color }}></span>
                <i className="fa-solid fa-eyedropper"></i>
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={e => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                  className="settings-color-input-hidden"
                />
              </label>
            </div>

            {/* Preview da cor escolhida */}
            <div className="settings-color-preview-bar" style={{ backgroundColor: form.accent_color }}>
              <span>Pré-visualização da cor selecionada</span>
            </div>
          </section>
        </div>

        {/* Rodapé */}
        <footer className="settings-footer">
          <button className="settings-btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button
            className="settings-btn-primary"
            onClick={handleSave}
            disabled={isSaving || !form.name.trim()}
          >
            {isSaving ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</>
            ) : (
              <><i className="fa-solid fa-floppy-disk"></i> Salvar alterações</>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
