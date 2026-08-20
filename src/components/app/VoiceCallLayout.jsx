import { useEffect, useState, useRef } from 'react'

// ─── Subcomponentes definidos FORA do componente pai ────────────────────────
// Isso é CRÍTICO: se definidos dentro, o React recria o componente a cada render,
// desmonta o <video>, limpa o srcObject e a tela fica preta.

function VideoElement({ stream, isLocal }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.warn('Erro ao reproduzir vídeo na webcam:', e)
          }
        })
      }
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className="voice-tile-video"
      style={isLocal ? { transform: 'scaleX(-1)' } : {}}
    />
  )
}

function ScreenShareWidget({ peerId, stream, ownerName }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.warn('Erro ao reproduzir tela compartilhada:', e)
          }
        })
      }
    }
  }, [stream])

  return (
    <div className="voice-screen-share-hero">
      <video ref={videoRef} autoPlay playsInline muted className="voice-screen-video" />
      <div className="voice-screen-meta">
        <span className="live-pill">AO VIVO</span>
        <span>Transmissão de tela de {ownerName}</span>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

const tileColors = [
  '#E8E6E3', // Bege claro
  '#2B2D31', // Cinza escuro
  '#4752C4', // Roxo/azul escuro
  '#A93226', // Vermelho escuro
  '#2E4053', // Azul acinzentado
  '#117A65'  // Verde escuro
]

export default function VoiceCallLayout({
  currentUser,
  voiceUsers,
  webcamStreams,
  screenShares,
  isMuted,
  isDeafened,
  isCameraOn,
  isSharingScreen,
  onToggleMic,
  onToggleDeafen,
  onToggleCamera,
  onToggleScreenShare,
  onLeaveVoice,
  speakingPeers,
  onBackToChat,
  channelName
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  function toggleFullscreen() {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(err => {
        console.warn('Erro ao ativar tela cheia:', err)
      })
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Lista completa de participantes na chamada (Você + Outros)
  const participants = [
    {
      id: 'me',
      name: `${currentUser?.name || 'Você'} (Você)`,
      avatar: currentUser?.avatar_url || currentUser?.avatar,
      isSpeaking: !!speakingPeers?.me,
      isLocal: true,
      hasCamera: isCameraOn,
      stream: webcamStreams?.me,
    },
    ...voiceUsers.map(([peerId, user]) => ({
      id: peerId,
      name: user?.name || 'Membro',
      avatar: user?.avatar || user?.avatar_url,
      isSpeaking: !!speakingPeers?.[peerId],
      isLocal: false,
      hasCamera: webcamStreams && (peerId in webcamStreams),
      stream: webcamStreams?.[peerId],
    }))
  ]

  // Detecta se há compartilhamento de tela ativo na chamada
  const activeScreenShares = Object.entries(screenShares)

  function ownerNameFor(peerId) {
    if (peerId === 'me') return `${currentUser?.name} (Você)`
    return voiceUsers.find(([id]) => id === peerId)?.[1]?.name || 'Membro'
  }

  return (
    <div className={`voice-call-layout-container${isFullscreen ? ' is-fullscreen' : ''}`} ref={containerRef}>
      {/* Cabeçalho superior preto simples (Estilo Bubble Chat) */}
      <header className="voice-call-header">
        <div className="vch-left">
          <i className="fa-solid fa-volume-high vch-icon-volume"></i>
          <span className="vch-title">Bubble Chat</span>
          <span className="vch-channel-name">/ #{channelName}</span>
        </div>
        <div className="vch-right">
          <button className="vch-chat-btn" onClick={onBackToChat} title="Voltar ao Chat de Texto">
            <i className="fa-solid fa-message"></i>
            <span>Chat de Texto</span>
          </button>
        </div>
      </header>

      {/* Área Central: Tela Compartilhada (se houver) + Grid de Participantes */}
      <div className="voice-call-main-content">
        {activeScreenShares.length > 0 && (
          <div className="voice-call-screens-container">
            {activeScreenShares.map(([peerId, stream]) => (
              <ScreenShareWidget
                key={peerId}
                peerId={peerId}
                stream={stream}
                ownerName={ownerNameFor(peerId)}
              />
            ))}
          </div>
        )}

        <div className={`voice-call-grid grid-${Math.min(participants.length, 4)}`}>
          {participants.map((p, idx) => {
            const hasVideo = p.hasCamera && p.stream
            const tileBg = tileColors[idx % tileColors.length]
            const tileStyle = !hasVideo ? { backgroundColor: tileBg } : {}

            // Legenda exibida no segundo card quando o participante está falando
            const showSubtitle = idx === 1 && p.isSpeaking

            return (
              <div
                key={p.id}
                className={`voice-call-tile${p.isSpeaking ? ' speaking' : ''}${hasVideo ? ' has-video' : ''}`}
                style={tileStyle}
              >
                {hasVideo ? (
                  <VideoElement stream={p.stream} isLocal={p.isLocal} />
                ) : (
                  <div className="voice-tile-placeholder">
                    <div className="voice-tile-circle">
                      <span className="voice-circle-initials">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {showSubtitle && (
                  <div className="voice-tile-subtitle">
                    Alright Important question for our friendship
                  </div>
                )}

                <div className="voice-tile-meta-overlay">
                  <span className="voice-tile-username">{p.name}</span>
                  {p.isLocal && isMuted && (
                    <span className="voice-tile-status-icon muted">
                      <i className="fa-solid fa-microphone-slash"></i>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Barra de Controle de Chamada inferior flutuante */}
      <footer className="voice-call-controls-bar">
        <div className="vcc-left-spacer"></div>

        <div className="vcc-center-actions">
          <button
            className={`vcc-btn-circle${isCameraOn ? ' active' : ' disabled'}`}
            onClick={onToggleCamera}
            title={isCameraOn ? 'Desligar Câmera' : 'Ligar Câmera'}
          >
            <i className={`fa-solid ${isCameraOn ? 'fa-video' : 'fa-video-slash'}`}></i>
          </button>

          <button
            className={`vcc-btn-circle${!isMuted ? ' active' : ' disabled'}`}
            onClick={onToggleMic}
            title={isMuted ? 'Ativar Microfone' : 'Mutar Microfone'}
          >
            <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>

          <button
            className={`vcc-btn-circle${isSharingScreen ? ' active' : ''}`}
            onClick={onToggleScreenShare}
            title={isSharingScreen ? 'Parar Compartilhamento de Tela' : 'Compartilhar Tela'}
          >
            <i className="fa-solid fa-desktop"></i>
          </button>

          <button
            className="vcc-btn-circle disconnect"
            onClick={onLeaveVoice}
            title="Sair da Chamada"
          >
            <i className="fa-solid fa-phone-slash"></i>
          </button>
        </div>

        <div className="vcc-right-actions">
          <button className="vcc-small-btn" title="Janela Popout">
            <i className="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
          <button className="vcc-small-btn" onClick={toggleFullscreen} title="Tela Cheia">
            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
          </button>
        </div>
      </footer>
    </div>
  )
}
