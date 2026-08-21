import { useState } from 'react'

export default function JoinServerModal({ onClose, onJoinServer }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim() || isJoining) return
    setError('')
    setIsJoining(true)
    try {
      const server = await onJoinServer(code.trim())
      if (server) onClose()
    } catch (err) {
      setError(err.message || 'Código inválido ou expirado.')
    } finally {
      setIsJoining(false)
    }
  }

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="settings-overlay" onClick={handleOverlay}>
      <div className="settings-modal" style={{ maxWidth: 440 }} role="dialog" aria-modal="true" aria-label="Entrar em servidor">

        <header className="settings-header">
          <h2 className="settings-title">
            <i className="fa-solid fa-link settings-title-icon"></i>
            Entrar com Convite
          </h2>
          <button className="settings-close-btn" onClick={onClose} aria-label="Fechar">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="settings-body">

            <section className="settings-section">
              <div className="join-server-hero">
                <div className="join-server-icon">
                  <i className="fa-solid fa-ticket"></i>
                </div>
                <p className="join-server-desc">
                  Cole o link ou código de convite do servidor que deseja entrar.
                </p>
                <p className="join-server-example">
                  Exemplo: <code>http://localhost:5173/invite/AbCd1234</code> ou somente <code>AbCd1234</code>
                </p>
              </div>
            </section>

            <div className="settings-divider"></div>

            <section className="settings-section">
              <div className="settings-field-group">
                <label className="settings-label" htmlFor="js-code">
                  Link ou código de convite
                </label>
                <input
                  id="js-code"
                  type="text"
                  className={`settings-input${error ? ' input-error' : ''}`}
                  placeholder="https://... ou AbCd1234"
                  value={code}
                  onChange={e => { setCode(e.target.value); setError('') }}
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                />
                {error && (
                  <div className="join-server-error">
                    <i className="fa-solid fa-circle-xmark"></i>
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </section>

          </div>

          <footer className="settings-footer">
            <button type="button" className="settings-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="settings-btn-primary"
              disabled={!code.trim() || isJoining}
            >
              {isJoining
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Entrando...</>
                : <><i className="fa-solid fa-arrow-right-to-bracket"></i> Entrar no Servidor</>
              }
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
