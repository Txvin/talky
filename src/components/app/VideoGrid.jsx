import { useState, useEffect, useRef } from 'react'

function VideoTile({ label, stream, isMuted, isSpeaking, isLocal }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.warn('Erro ao dar play no vídeo da webcam:', e)
          }
        })
      }
    }
  }, [stream])

  return (
    <div className={`video-tile${isSpeaking ? ' speaking' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="video-element"
        style={isLocal ? { transform: 'scaleX(-1)' } : {}}
      />
      <div className="video-tile-meta">
        <span className="video-tile-name">{label}</span>
        {isMuted && (
          <span className="video-tile-mic-status">
            <i className="fa-solid fa-microphone-slash"></i>
          </span>
        )}
      </div>
    </div>
  )
}

export default function VideoGrid({ webcamStreams, currentUserName, voiceUsers, speakingPeers }) {
  const [minimized, setMinimized] = useState(false)
  const entries = Object.entries(webcamStreams)
  if (entries.length === 0) return null

  function labelFor(peerId) {
    if (peerId === 'me') return `${currentUserName} (Você)`
    const found = voiceUsers.find(([id]) => id === peerId)
    return found ? found[1]?.name || 'Membro' : 'Membro'
  }

  function isMutedFor(peerId) {
    if (peerId === 'me') return false // Local state is shown separately in bottom bar
    const found = voiceUsers.find(([id]) => id === peerId)
    return found ? !!found[1]?.isMuted : false
  }

  function isSpeakingFor(peerId) {
    return !!speakingPeers?.[peerId]
  }

  return (
    <div className={`video-grid-container${minimized ? ' minimized' : ''}`}>
      <div className="video-grid-header">
        <div className="vgh-title">
          <i className="fa-solid fa-video text-cyan"></i>
          <span>Câmeras Ao Vivo ({entries.length})</span>
        </div>
        <button className="vgh-action-btn" onClick={() => setMinimized(!minimized)} title={minimized ? "Maximizar" : "Minimizar"}>
          <i className={`fa-solid ${minimized ? 'fa-expand' : 'fa-compress'}`}></i>
        </button>
      </div>
      {!minimized && (
        <div className="video-grid-layout" style={{
          gridTemplateColumns: entries.length === 1 ? '1fr' : entries.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(220px, 1fr))'
        }}>
          {entries.map(([peerId, stream]) => (
            <VideoTile
              key={peerId}
              label={labelFor(peerId)}
              stream={stream}
              isMuted={isMutedFor(peerId)}
              isSpeaking={peerId === 'me' ? isSpeakingFor('me') : isSpeakingFor(peerId)}
              isLocal={peerId === 'me'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
