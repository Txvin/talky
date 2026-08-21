import { useEffect, useRef, useState } from 'react'

function ScreenTile({ label, stream, onClose }) {
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
    <div className="screen-tile">
      {/* Sempre muted para contornar políticas de autoplay do Chrome e garantir início imediato do vídeo */}
      <video ref={videoRef} autoPlay playsInline muted className="screen-tile-video" />
      <span className="screen-tile-label">{label}</span>
      <button className="screen-tile-close" title="Fechar transmissão" onClick={onClose}>
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  )
}

// Aviso compacto — não abre a transmissão sozinho, só avisa que existe
// uma ativa. Cada pessoa decide se quer assistir ou não.
function ScreenShareBanner({ label, onWatch }) {
  return (
    <div className="screen-share-banner">
      <div className="ssb-info">
        <i className="fa-solid fa-arrow-up-from-bracket ssb-icon"></i>
        <span><strong>{label}</strong> está compartilhando a tela</span>
      </div>
      <button className="ssb-watch-btn" onClick={onWatch}>
        <i className="fa-solid fa-eye"></i> Assistir
      </button>
    </div>
  )
}

export default function ScreenShareStrip({ screenShares, currentUserName, voiceUsers }) {
  const entries = Object.entries(screenShares)
  const [watching, setWatching] = useState(() => new Set())

  // Se a pessoa parar de compartilhar, tira ela da lista de "assistindo"
  // pra não sobrar estado morto (e não reabrir sozinho se ela compartilhar de novo).
  useEffect(() => {
    setWatching(prev => {
      const activeIds = new Set(entries.map(([id]) => id))
      let changed = false
      const next = new Set(prev)
      for (const id of prev) {
        if (!activeIds.has(id)) { next.delete(id); changed = true }
      }
      return changed ? next : prev
    })
  }, [screenShares])

  if (entries.length === 0) return null

  function labelFor(peerId) {
    if (peerId === 'me') return `${currentUserName} (você)`
    const found = voiceUsers.find(([id]) => id === peerId)
    return found ? found[1]?.name || 'Membro' : 'Membro'
  }

  function watch(peerId) {
    setWatching(prev => new Set(prev).add(peerId))
  }
  function stopWatching(peerId) {
    setWatching(prev => {
      const next = new Set(prev)
      next.delete(peerId)
      return next
    })
  }

  const watched = entries.filter(([peerId]) => watching.has(peerId))
  const notWatched = entries.filter(([peerId]) => !watching.has(peerId))

  return (
    <div className="screen-share-strip">
      {notWatched.map(([peerId]) => (
        <ScreenShareBanner
          key={peerId}
          label={labelFor(peerId)}
          onWatch={() => watch(peerId)}
        />
      ))}

      {watched.length > 0 && (
        <div
          className="screen-share-grid"
          style={{ gridTemplateColumns: `repeat(${Math.min(watched.length, 2)}, 1fr)` }}
        >
          {watched.map(([peerId, stream]) => (
            <ScreenTile
              key={peerId}
              label={labelFor(peerId)}
              stream={stream}
              onClose={() => stopWatching(peerId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}