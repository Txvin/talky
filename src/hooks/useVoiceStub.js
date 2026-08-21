import { useCallback, useState } from 'react'

// Versão temporária — mic local funciona (mute/deafen visual),
// mas sem WebRTC real ainda. Substituído por useVoice.js no próximo passo.
export function useVoiceStub() {
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [inVoiceRoom, setInVoiceRoom] = useState(false)
  const [micLevel] = useState(0)
  const [voiceUsers] = useState([]) // array de [peerId, user]

  const toggleMic = useCallback(() => setIsMuted(m => !m), [])
  const toggleDeafen = useCallback(() => setIsDeafened(d => !d), [])
  const toggleVoiceRoom = useCallback(() => setInVoiceRoom(v => !v), [])

  return { isMuted, isDeafened, inVoiceRoom, micLevel, voiceUsers, toggleMic, toggleDeafen, toggleVoiceRoom }
}