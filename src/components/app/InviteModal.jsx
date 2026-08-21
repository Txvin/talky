import { useState, useEffect } from 'react'

export default function InviteModal({ server, onClose, onGenerateInvite }) {
  const [invite, setInvite] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expiryOption, setExpiryOption] = useState('never') // 'never' | '24h' | '7d' | '1h'
  const [maxUsesOption, setMaxUsesOption] = useState('unlimited') // 'unlimited' | '1' | '5' | '10' | '25'

  // Gera convite ao abrir o modal
  useEffect(() => {
    if (server?.id) handleGenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id])

  async function handleGenerate() {
    if (!server?.id || isGenerating) return
    setIsGenerating(true)
    setCopied(false)
    const expiresInHours = expiryOption === '1h' ? 1 : expiryOption === '24h' ? 24 : expiryOption === '7d' ? 168 : null
    const maxUses = maxUsesOption === 'unlimited' ? null : parseInt(maxUsesOption)
    const result = await onGenerateInvite(server.id, { expiresInHours, maxUses })
    setInvite(result)
    setIsGenerating(false)
  }

  function handleCopy() {
    if (!invite?.link) return
    navigator.clipboard.writeText(invite.link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  const serverInitials = server?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="settings-overlay" onClick={handleOverlay}>
      <div className="settings-modal" style={{ maxWidth: 480 }} role="dialog" aria-modal="true" aria-label="Convidar pessoas">

        <header className="settings-header">
          <h2 className="settings-title">
            <i className="fa-solid fa-user-plus settings-title-icon"></i>
            Convidar para {server?.name || 'Servidor'}
          </h2>
          <button className="settings-close-btn" onClick={onClose} aria-label="Fechar">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="settings-body">

          {/* Info do servidor */}
          <section className="settings-section">
            <div className="invite-server-info">
              {server?.icon_url ? (
                <img src={server.icon_url} alt={server.name} className="invite-server-icon-img" />
              ) : (
                <div className="invite-server-icon-placeholder">{serverInitials}</div>
              )}
              <div>
                <strong style={{ color: 'var(--tx-1)', fontSize: '.95rem' }}>{server?.name}</strong>
                <p style={{ color: 'var(--tx-3)', fontSize: '.78rem' }}>Compartilhe o link abaixo para convidar pessoas.</p>
              </div>
            </div>
          </section>

          <div className="settings-divider"></div>

          {/* Opções de expiração e uso */}
          <section className="settings-section">
            <div className="invite-options-row">
              <div className="settings-field-group" style={{ flex: 1 }}>
                <label className="settings-label">Expira em</label>
                <select
                  className="invite-select"
                  value={expiryOption}
                  onChange={e => setExpiryOption(e.target.value)}
                >
                  <option value="never">Nunca</option>
                  <option value="1h">1 hora</option>
                  <option value="24h">24 horas</option>
                  <option value="7d">7 dias</option>
                </select>
              </div>
              <div className="settings-field-group" style={{ flex: 1 }}>
                <label className="settings-label">Máx. de usos</label>
                <select
                  className="invite-select"
                  value={maxUsesOption}
                  onChange={e => setMaxUsesOption(e.target.value)}
                >
                  <option value="unlimited">Ilimitado</option>
                  <option value="1">1 uso</option>
                  <option value="5">5 usos</option>
                  <option value="10">10 usos</option>
                  <option value="25">25 usos</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="settings-btn-secondary sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  title="Gerar novo link"
                >
                  <i className={`fa-solid ${isGenerating ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i>
                  Novo link
                </button>
              </div>
            </div>
          </section>

          <div className="settings-divider"></div>

          {/* Link de convite */}
          <section className="settings-section">
            <label className="settings-label">Link de convite</label>
            <div className="invite-link-row">
              <div className="invite-link-box">
                {isGenerating ? (
                  <span style={{ color: 'var(--tx-3)', fontSize: '.82rem' }}>Gerando link...</span>
                ) : invite?.link ? (
                  <span className="invite-link-text">{invite.link}</span>
                ) : (
                  <span style={{ color: 'var(--tx-3)', fontSize: '.82rem' }}>Nenhum link gerado ainda</span>
                )}
              </div>
              <button
                className={`invite-copy-btn${copied ? ' copied' : ''}`}
                onClick={handleCopy}
                disabled={!invite?.link || isGenerating}
                title={copied ? 'Copiado!' : 'Copiar link'}
              >
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            {invite?.code && (
              <p style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>
                Código: <code style={{ color: 'var(--indigo)', fontWeight: 700 }}>{invite.code}</code>
              </p>
            )}
          </section>
        </div>

        <footer className="settings-footer">
          <button className="settings-btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}
