import { useEffect, useState, useRef } from 'react'
import { useToast } from '../../context/ToastContext'

// ─── Subcomponentes definidos FORA do componente pai ────────────────────────
// Isso é CRÍTICO: se definidos dentro, o React recria o componente a cada render,
// desmonta o <video>, limpa o srcObject e a tela fica preta.

function VideoElement({ stream, isLocal, mirror, isScreenShare }) {
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
      className={`voice-tile-video${isScreenShare ? ' is-screen-share' : ''}`}
      style={mirror ? { transform: 'scaleX(-1)' } : {}}
    />
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
  const toast = useToast()

  // ------------------------------------------------------------------
  // Igual ao Discord: uma tela compartilhada não toca sozinha pra quem
  // assiste — cada pessoa escolhe se quer assistir (peerId → watching).
  // O dono da própria transmissão sempre vê a própria prévia direto.
  // ------------------------------------------------------------------
  const [watchingScreens, setWatchingScreens] = useState(() => new Set())

  function watchScreen(peerId) {
    setWatchingScreens(prev => new Set(prev).add(peerId))
  }
  function stopWatchingScreen(peerId) {
    setWatchingScreens(prev => {
      const next = new Set(prev)
      next.delete(peerId)
      return next
    })
  }

  // Se a pessoa parar de compartilhar, tira ela da lista de "assistindo"
  // pra não sobrar estado morto (e não reabrir sozinho se ela compartilhar de novo).
  useEffect(() => {
    setWatchingScreens(prev => {
      const activeIds = new Set(Object.keys(screenShares || {}))
      let changed = false
      const next = new Set(prev)
      for (const id of prev) {
        if (!activeIds.has(id)) { next.delete(id); changed = true }
      }
      return changed ? next : prev
    })
  }, [screenShares])

  function comingSoon() {
    toast('Em breve!', 'info')
  }

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

  // Lista completa de participantes na chamada (Você + Outros).
  // Prioridade de exibição na própria bolha: tela compartilhada > câmera > avatar.
  // Assim a call fica mais limpa — sem um painel grande separado flutuando,
  // o que a pessoa está transmitindo já aparece direto no lugar da foto dela.
  const participants = [
    {
      id: 'me',
      name: `${currentUser?.name || 'Você'} (Você)`,
      avatar: currentUser?.avatar_url || currentUser?.avatar,
      isSpeaking: !!speakingPeers?.me,
      isLocal: true,
      screenStream: screenShares?.me,
      camStream: isCameraOn ? webcamStreams?.me : null,
    },
    ...voiceUsers.map(([peerId, user]) => ({
      id: peerId,
      name: user?.name || 'Membro',
      avatar: user?.avatar || user?.avatar_url,
      isSpeaking: !!speakingPeers?.[peerId],
      isLocal: false,
      screenStream: screenShares?.[peerId],
      camStream: webcamStreams && (peerId in webcamStreams) ? webcamStreams[peerId] : null,
    }))
  ]



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

      {/* Área Central: Grid de Participantes (tela/câmera aparecem direto na bolha de cada um) */}
      <div className="voice-call-main-content">
        <div className={`voice-call-grid grid-${Math.min(participants.length, 4)}`}>
          {participants.map((p, idx) => {
            const isScreenShare = !!p.screenStream
            // Dono da transmissão sempre vê a própria tela; os outros
            // só veem depois de clicar em "Assistir" (como no Discord).
            const isWatchingScreen = p.isLocal || watchingScreens.has(p.id)
            const showScreenVideo = isScreenShare && isWatchingScreen
            const activeStream = showScreenVideo ? p.screenStream : p.camStream
            const hasVideo = !!activeStream
            const showWatchPrompt = isScreenShare && !isWatchingScreen
            const tileBg = tileColors[idx % tileColors.length]
            const tileStyle = !hasVideo ? { backgroundColor: tileBg } : {}

            return (
              <div
                key={p.id}
                className={`voice-call-tile${p.isSpeaking ? ' speaking' : ''}${hasVideo ? ' has-video' : ''}`}
                style={tileStyle}
              >
                {hasVideo ? (
                  <VideoElement
                    stream={activeStream}
                    isLocal={p.isLocal}
                    mirror={p.isLocal && !showScreenVideo}
                    isScreenShare={showScreenVideo}
                  />
                ) : (
                  <div className="voice-tile-placeholder">
                    {p.avatar ? (
                      <img className="voice-tile-avatar-img" src={p.avatar} alt={p.name} />
                    ) : (
                      <div className="voice-tile-circle">
                        <span className="voice-circle-initials">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Alguém está compartilhando tela e você ainda não escolheu assistir */}
                {showWatchPrompt && (
                  <div
                    className="voice-tile-watch-overlay"
                    onClick={() => watchScreen(p.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <i className="fa-solid fa-arrow-up-from-bracket voice-tile-watch-icon"></i>
                    <span className="voice-tile-watch-text"><strong>{p.name}</strong> está compartilhando a tela</span>
                    <span className="voice-tile-watch-btn">
                      <i className="fa-solid fa-eye"></i> Assistir
                    </span>
                  </div>
                )}

                {/* Assistindo a tela de outra pessoa: badge + botão pra parar */}
                {showScreenVideo && !p.isLocal && (
                  <button
                    className="voice-tile-stop-watch"
                    title="Parar de assistir"
                    onClick={() => stopWatchingScreen(p.id)}
                  >
                    <i className="fa-solid fa-eye-slash"></i>
                  </button>
                )}

                {isScreenShare && isWatchingScreen && (
                  <span className="voice-tile-status-icon screen-share-badge">
                    <i className="fa-solid fa-arrow-up-from-bracket"></i> Compartilhando tela
                  </span>
                )}

                {p.isLocal && isMuted && (
                  <span className="voice-tile-status-icon muted">
                    <i className="fa-solid fa-microphone-slash"></i>
                  </span>
                )}

                <span className="voice-tile-name-tag">{p.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Barra de Controle de Chamada inferior flutuante */}
      <footer className="voice-call-controls-bar">
        <div className="vcc-pill">
          {/* Microfone + dropdown */}
          <div className="vcc-group">
            <button
              className={`vcc-sq${isMuted ? ' danger' : ''}`}
              onClick={onToggleMic}
              title={isMuted ? 'Ativar Microfone' : 'Mutar Microfone'}
            >
              <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button className={`vcc-caret${isMuted ? ' danger' : ''}`} onClick={comingSoon} title="Opções de entrada">
              <i className="fa-solid fa-chevron-down"></i>
            </button>
          </div>

          {/* Câmera + dropdown */}
          <div className="vcc-group">
            <button
              className={`vcc-sq${!isCameraOn ? ' muted-off' : ''}`}
              onClick={onToggleCamera}
              title={isCameraOn ? 'Desligar Câmera' : 'Ligar Câmera'}
            >
              <i className={`fa-solid ${isCameraOn ? 'fa-video' : 'fa-video-slash'}`}></i>
            </button>
            <button className="vcc-caret" onClick={comingSoon} title="Opções de vídeo">
              <i className="fa-solid fa-chevron-down"></i>
            </button>
          </div>

          <span className="vcc-sep"></span>

          <button
            className={`vcc-sq${isSharingScreen ? ' active' : ''}`}
            onClick={onToggleScreenShare}
            title={isSharingScreen ? 'Parar Compartilhamento de Tela' : 'Compartilhar Tela'}
          >
            <i className="fa-solid fa-arrow-up-from-bracket"></i>
          </button>

          <button className="vcc-sq" onClick={comingSoon} title="Ativar aplicativos">
            <i className="fa-solid fa-grip"></i>
          </button>

          <button className="vcc-sq" onClick={comingSoon} title="Efeitos">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </button>

          <button className="vcc-sq" onClick={toggleFullscreen} title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}>
            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-ellipsis'}`}></i>
          </button>

          <button
            className="vcc-hangup"
            onClick={onLeaveVoice}
            title="Sair da Chamada"
          >
            <i className="fa-solid fa-phone-slash"></i>
          </button>
        </div>
      </footer>
    </div>
  )
}