import { useEffect, useRef } from 'react'

function ScreenTile({ label, stream }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.warn('Erro ao dar play no vídeo de tela:', e)
          }
        })
      }
    }
  }, [stream])

  return (
    <div style={{
      borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)',
      background: '#000', position: 'relative', aspectRatio: '16/9',
    }}>
      {/* Sempre muted para contornar políticas de autoplay do Chrome e garantir início imediato do vídeo */}
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      <span style={{
        position: 'absolute', bottom: 6, left: 8, fontSize: 11, fontWeight: 700,
        color: '#fff', background: 'rgba(0,0,0,.6)', padding: '2px 8px', borderRadius: 4,
      }}>
        {label}
      </span>
    </div>
  )
}

export default function ScreenShareStrip({ screenShares, currentUserName, voiceUsers }) {
  const entries = Object.entries(screenShares)
  if (entries.length === 0) return null

  function labelFor(peerId) {
    if (peerId === 'me') return `${currentUserName} (você)`
    const found = voiceUsers.find(([id]) => id === peerId)
    return found ? found[1]?.name || 'Membro' : 'Membro'
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${Math.min(entries.length, 2)}, 1fr)`,
      gap: 10, padding: '14px 20px 0',
    }}>
      {entries.map(([peerId, stream]) => (
        <ScreenTile key={peerId} label={labelFor(peerId)} stream={stream} isMe={peerId === 'me'} />
      ))}
    </div>
  )
}