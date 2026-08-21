import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({
  activeServer,
  activeServerChannels,
  activeCh,
  onSelectCh,
  onOpenSettings,
  inVoiceRoom,
  onToggleVoice,
  isMuted,
  isDeafened,
  onToggleMic,
  onToggleDeafen,
  voiceUsers,
  isSharingScreen,
  onToggleScreenShare,
  onOpenInvite,
}) {
  const { currentUser } = useAuth()
  const avatar = currentUser?.avatar_url || currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'

  const serverName = activeServer?.name || 'Servidor'

  // ------------------------------------------------------------------
  // Cartão de perfil (estilo Discord) — abre ao clicar no avatar/nome
  // no rodapé, fecha ao clicar fora ou apertar Esc.
  // ------------------------------------------------------------------
  const [showProfileCard, setShowProfileCard] = useState(false)
  const profileCardRef = useRef(null)

  useEffect(() => {
    if (!showProfileCard) return
    function handleOutside(e) {
      if (profileCardRef.current && !profileCardRef.current.contains(e.target)) {
        setShowProfileCard(false)
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape') setShowProfileCard(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [showProfileCard])

  // ------------------------------------------------------------------
  // Texto de status dinâmico: prioriza o estado real de voz sobre o
  // status customizado, igual ao Discord (ex: "Ensurdecido" some quando
  // você reativa o som, sem precisar editar o status manualmente).
  // ------------------------------------------------------------------
  let liveStatusText = currentUser?.status || 'Online'
  if (isDeafened) liveStatusText = 'Ensurdecido'
  else if (isMuted) liveStatusText = 'Mudo'
  else if (inVoiceRoom) liveStatusText = 'Em chamada de voz'

  function handleEditProfile() {
    setShowProfileCard(false)
    onOpenSettings()
  }

  return (
    <aside className="app-sidebar" aria-label="Canais">
      <div className="sidebar-header">
        <h2 className="workspace-name">{serverName}</h2>
        <div style={{ display: 'flex', gap: 4 }}>
          {/* Botão de convidar pessoas */}
          {onOpenInvite && (
            <button
              className="sidebar-header-btn"
              title="Convidar pessoas"
              onClick={onOpenInvite}
            >
              <i className="fa-solid fa-user-plus" style={{ fontSize: '.8rem' }}></i>
            </button>
          )}
          <button className="sidebar-header-btn">
            <i className="fa-solid fa-chevron-down"></i>
          </button>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="ch-group">
          <button className="ch-group-header">
            <i className="fa-solid fa-chevron-down"></i> TEXTO
          </button>
          <div className="ch-list">
            {Object.entries(activeServerChannels).map(([key, ch]) => (
              <button
                key={key}
                className={`ch-row${activeCh === key ? ' active' : ''}`}
                onClick={() => onSelectCh(key)}
              >
                <i className="fa-solid fa-hashtag ch-ico"></i>
                <span>{ch.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ch-group">
          <button className="ch-group-header">
            <i className="fa-solid fa-chevron-down"></i> VOZ
          </button>
          <div className="ch-list">
            <button className={`ch-row ch-voice${inVoiceRoom ? ' active' : ''}`} onClick={onToggleVoice}>
              <i className="fa-solid fa-volume-high ch-ico"></i>
              <span>Sala HQ</span>
              <span className="voice-badge">{inVoiceRoom ? 'DESCONECTAR' : 'CONECTAR'}</span>
            </button>

            <div className="voice-users">
              {inVoiceRoom && (
                <div className="vu-item">
                  <img src={avatar} alt="Você" />
                  <span>{currentUser?.name?.split(' ')[0]}</span>
                  <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} vu-mic`}></i>
                </div>
              )}
              {voiceUsers.map(([peerId, user]) => (
                <div className="vu-item" key={peerId} id={`vuser-${peerId}`}>
                  <img src={user?.avatar || user?.avatar_url} alt={user?.name || 'Membro'} />
                  <span>{(user?.name || 'Membro').split(' ')[0]}</span>
                  <i className="fa-solid fa-microphone vu-mic text-green"></i>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="user-panel">
        <div
          className="up-clickable"
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={showProfileCard}
          onClick={() => setShowProfileCard(v => !v)}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowProfileCard(v => !v)}
        >
          <div className="up-avatar-wrap">
            <img src={avatar} alt="Avatar" className="up-avatar" />
            <span className={`up-status-dot${isDeafened || isMuted ? ' dnd' : ' online'}`}></span>
          </div>
          <div className="up-meta">
            <strong>{currentUser?.name}</strong>
            <span>{liveStatusText}</span>
          </div>
        </div>

        {showProfileCard && (
          <div className="up-profile-card" ref={profileCardRef} role="dialog" aria-label="Perfil">
            <div className="upc-banner"></div>
            <div className="upc-avatar-wrap">
              <img src={avatar} alt="Avatar" className="upc-avatar" />
              <span className={`up-status-dot lg${isDeafened || isMuted ? ' dnd' : ' online'}`}></span>
            </div>
            <div className="upc-body">
              <strong className="upc-name">{currentUser?.name}</strong>
              {currentUser?.handle && <span className="upc-handle">{currentUser.handle}</span>}
              <div className="upc-divider"></div>
              <span className="upc-label">STATUS</span>
              <span className="upc-status">{liveStatusText}</span>
              {currentUser?.status && liveStatusText !== currentUser.status && (
                <span className="upc-custom-status">"{currentUser.status}"</span>
              )}
              <button className="upc-edit-btn" onClick={handleEditProfile}>
                <i className="fa-solid fa-user-pen"></i> Editar Perfil
              </button>
            </div>
          </div>
        )}

        <div className="up-actions">
          <button className={`up-btn${isMuted ? ' muted' : ''}`} title="Microfone" onClick={onToggleMic}>
            <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>
          <button className={`up-btn${isDeafened ? ' muted' : ''}`} title="Ensurdecer" onClick={onToggleDeafen}>
            <i className="fa-solid fa-headphones"></i>
          </button>
          {inVoiceRoom && (
            <button className={`up-btn${isSharingScreen ? ' muted' : ''}`} title="Compartilhar tela" onClick={onToggleScreenShare}>
              <i className="fa-solid fa-desktop"></i>
            </button>
          )}
          <button className="up-btn" title="Configurações" onClick={onOpenSettings}>
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>
      </div>
    </aside>
  )
}