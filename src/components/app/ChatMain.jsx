import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import MessageList from './MessageList'
import ScreenShareStrip from './ScreenShareStrip'
import VideoGrid from './VideoGrid'
import VoiceCallLayout from './VoiceCallLayout'

export default function ChatMain({
  channel,
  messages,
  onSendMessage,
  micLevel,
  screenShares,
  webcamStreams,
  voiceUsers,
  inVoiceRoom,
  showVoiceLayout,
  onShowVoiceLayout,
  isMuted,
  isDeafened,
  isSharingScreen,
  isCameraOn,
  onToggleMic,
  onToggleDeafen,
  onToggleScreenShare,
  onToggleCamera,
  onLeaveVoice,
  speakingPeers
}) {
  const { currentUser } = useAuth()
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const streamRef = useRef(null)

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight
    }
  }, [messages])

  if (inVoiceRoom && showVoiceLayout) {
    return (
      <VoiceCallLayout
        currentUser={currentUser}
        voiceUsers={voiceUsers}
        webcamStreams={webcamStreams}
        screenShares={screenShares}
        isMuted={isMuted}
        isDeafened={isDeafened}
        isCameraOn={isCameraOn}
        isSharingScreen={isSharingScreen}
        onToggleMic={onToggleMic}
        onToggleDeafen={onToggleDeafen}
        onToggleCamera={onToggleCamera}
        onToggleScreenShare={onToggleScreenShare}
        onLeaveVoice={onLeaveVoice}
        speakingPeers={speakingPeers}
        onBackToChat={() => onShowVoiceLayout(false)}
        channelName={channel.name}
      />
    )
  }

  function handleSend() {
    if (!input.trim()) return
    onSendMessage(input, currentUser)
    setInput('')
  }

  const filtered = search.trim()
    ? messages.filter(m =>
        (m.content || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.users?.name || '').toLowerCase().includes(search.toLowerCase())
      )
    : messages

  return (
    <main className="app-chat" aria-label="Chat principal">
      <header className="chat-header">
        <div className="ch-title">
          <i className="fa-solid fa-hashtag"></i>
          <h3>{channel.name}</h3>
          <span className="ch-sep">|</span>
          <span className="ch-topic">{channel.topic}</span>
        </div>

        <div className="chat-header-actions">
          <div className="mic-meter-widget" title="Volume do microfone em tempo real">
            <i className="fa-solid fa-microphone mic-widget-icon"></i>
            <div className="mic-meter-track">
              <div className="mic-meter-fill" style={{ width: `${micLevel ?? 0}%` }}></div>
            </div>
          </div>

          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Buscar..."
              aria-label="Buscar mensagens"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button className="icon-btn" title="Membros"><i className="fa-solid fa-users"></i></button>
        </div>
      </header>

      {inVoiceRoom && (
        <div className="voice-call-panel">
          <div className="vcp-info">
            <div className="vcp-status-indicator">
              <span className="vcp-status-dot"></span>
              <span>Voz conectada</span>
            </div>
            <span className="text-muted" style={{ margin: '0 4px' }}>/</span>
            <span className="vcp-room-name">Sala HQ</span>
          </div>

          <div className="vcp-users">
            {/* Usuário local */}
            <div className={`vcp-user-avatar-wrap${speakingPeers?.me ? ' speaking' : ''}`}>
              <img
                src={currentUser?.avatar_url || currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                alt="Você"
                className="vcp-user-avatar"
              />
              {isMuted && (
                <div className="vcp-user-badge" title="Mutado">
                  <i className="fa-solid fa-microphone-slash"></i>
                </div>
              )}
              {isSharingScreen && (
                <span className="vcp-live-badge">AO VIVO</span>
              )}
              <span className="vcp-user-name-tooltip">Você</span>
            </div>

            {/* Outros usuários da call */}
            {voiceUsers.map(([peerId, user]) => {
              const speaking = !!speakingPeers?.[peerId]
              const isUserMuted = !!user?.isMuted
              const isSharing = screenShares && (peerId in screenShares)
              return (
                <div className={`vcp-user-avatar-wrap${speaking ? ' speaking' : ''}`} key={peerId}>
                  <img
                    src={user?.avatar || user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={user?.name || 'Membro'}
                    className="vcp-user-avatar"
                  />
                  {isUserMuted && (
                    <div className="vcp-user-badge" title="Mutado">
                      <i className="fa-solid fa-microphone-slash"></i>
                    </div>
                  )}
                  {isSharing && (
                    <span className="vcp-live-badge">AO VIVO</span>
                  )}
                  <span className="vcp-user-name-tooltip">{user?.name || 'Membro'}</span>
                </div>
              )
            })}
          </div>

          <div className="vcp-actions">
            <button
              className={`vcp-btn${isMuted ? ' muted' : ''}`}
              title={isMuted ? 'Ativar microfone' : 'Mutar microfone'}
              onClick={onToggleMic}
            >
              <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button
              className={`vcp-btn${isDeafened ? ' muted' : ''}`}
              title={isDeafened ? 'Ativar áudio' : 'Ensurdecer'}
              onClick={onToggleDeafen}
            >
              <i className={`fa-solid ${isDeafened ? 'fa-volume-xmark' : 'fa-headphones'}`}></i>
            </button>
            <button
              className={`vcp-btn${isCameraOn ? ' active' : ''}`}
              title={isCameraOn ? 'Desligar câmera' : 'Ligar câmera'}
              onClick={onToggleCamera}
            >
              <i className={`fa-solid ${isCameraOn ? 'fa-video' : 'fa-video-slash'}`}></i>
            </button>
            <button
              className={`vcp-btn${isSharingScreen ? ' active' : ''}`}
              title={isSharingScreen ? 'Parar tela' : 'Compartilhar tela'}
              onClick={onToggleScreenShare}
            >
              <i className="fa-solid fa-desktop"></i>
            </button>
            <button
              className="vcp-btn danger"
              title="Sair da chamada"
              onClick={onLeaveVoice}
            >
              <i className="fa-solid fa-phone-slash"></i>
            </button>
          </div>
        </div>
      )}

      <VideoGrid webcamStreams={webcamStreams} currentUserName={currentUser?.name} voiceUsers={voiceUsers} speakingPeers={speakingPeers} />
      <ScreenShareStrip screenShares={screenShares} currentUserName={currentUser?.name} voiceUsers={voiceUsers} />

      <div className="messages-stream" ref={streamRef} aria-label="Mensagens">
        <MessageList messages={filtered} />
      </div>

      <div className="composer">
        <div className="composer-box">
          <button className="composer-ico" title="Anexar"><i className="fa-solid fa-circle-plus"></i></button>
          <input
            type="text"
            placeholder={`Escrever em #${channel.name}...`}
            autoComplete="off"
            aria-label="Escrever mensagem"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
          />
          <div className="composer-right">
            <button className="composer-ico" title="Falar"><i className="fa-solid fa-microphone"></i></button>
            <button className="composer-ico" title="Emoji"><i className="fa-regular fa-face-smile"></i></button>
            <button className="send-btn" aria-label="Enviar" onClick={handleSend}>
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}