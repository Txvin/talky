import { useAuth } from '../../context/AuthContext'

export default function Sidebar({
  activeServer,
  activeServerChannels,
  activeCh,
  onSelectCh,
  onOpenSettings,
  onLogout,
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
        <div className="up-avatar-wrap">
          <img src={avatar} alt="Avatar" className="up-avatar" />
          <span className="up-status-dot online"></span>
        </div>
        <div className="up-meta">
          <strong>{currentUser?.name}</strong>
          <span>{currentUser?.status || 'Online'}</span>
        </div>
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
          <button className="up-btn danger" title="Sair" onClick={onLogout}>
            <i className="fa-solid fa-power-off"></i>
          </button>
        </div>
      </div>
    </aside>
  )
}