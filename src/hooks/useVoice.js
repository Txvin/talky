import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { RTC_CONFIG } from '../constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function useVoice(activeWs) {
  const { currentUser } = useAuth()
  const toast = useToast()

  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [inVoiceRoom, setInVoiceRoom] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [voiceUsers, setVoiceUsers] = useState([]) // [[peerId, user], ...]
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [screenShares, setScreenShares] = useState({}) // { peerId: MediaStream }
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [webcamStreams, setWebcamStreams] = useState({}) // { peerId: MediaStream }
  const [speakingPeers, setSpeakingPeers] = useState({}) // { peerId: bool }

  // Refs mutáveis (não precisam re-renderizar o componente)
  const localAudioStreamRef = useRef(null)
  const localScreenStreamRef = useRef(null)
  const localCameraStreamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserNodeRef = useRef(null)
  const micRafIdRef = useRef(null)
  const voiceRoomChanRef = useRef(null)
  const peerConnectionsRef = useRef(new Map())
  const pendingCandidatesRef = useRef(new Map())
  const remoteAudiosRef = useRef(new Map())
  const voiceUsersMapRef = useRef(new Map())
  const isMutedRef = useRef(false)
  const isDeafenedRef = useRef(false)
  const isCameraOnRef = useRef(false)
  const inVoiceRoomRef = useRef(false)
  const activeWsRef = useRef(activeWs)
  // Flag per-peer para o padrão Perfect Negotiation
  const makingOfferRef = useRef(new Map())
  // Transceivers de vídeo por peer
  const cameraSendersRef = useRef(new Map())
  const screenSendersRef = useRef(new Map())
  const receivedWebcamStreamsRef = useRef(new Map())
  const receivedScreenSharesRef = useRef(new Map())

  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => { isDeafenedRef.current = isDeafened }, [isDeafened])
  useEffect(() => { isCameraOnRef.current = isCameraOn }, [isCameraOn])
  useEffect(() => { inVoiceRoomRef.current = inVoiceRoom }, [inVoiceRoom])
  useEffect(() => { activeWsRef.current = activeWs }, [activeWs])

  const syncVoiceUsers = useCallback(() => {
    setVoiceUsers(Array.from(voiceUsersMapRef.current.entries()))
  }, [])

  // ------------------------------------------------------------------
  // Microfone local
  // ------------------------------------------------------------------
  const requestLocalMic = useCallback(async () => {
    if (localAudioStreamRef.current) return localAudioStreamRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      localAudioStreamRef.current = stream
      stream.getAudioTracks().forEach(t => (t.enabled = !isMutedRef.current))

      const AC = window.AudioContext || window.webkitAudioContext
      const ctx = new AC()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      audioCtxRef.current = ctx
      analyserNodeRef.current = analyser

      startMicLoop()
      return stream
    } catch (err) {
      console.warn('Permissão de microfone:', err)
      toast('Microfone: autorize para usar voz.', 'info')
      return null
    }
  }, [toast])

  function startMicLoop() {
    const analyser = analyserNodeRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)

    function tick() {
      if (!localAudioStreamRef.current || isMutedRef.current || isDeafenedRef.current) {
        setMicLevel(0)
        setSpeakingPeers(prev => (prev.me ? { ...prev, me: false } : prev))
      } else {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const pct = Math.min(100, Math.round((avg / 128) * 100))
        setMicLevel(pct)
        setSpeakingPeers(prev => {
          const speaking = pct > 12
          if (!!prev.me === speaking) return prev
          return { ...prev, me: speaking }
        })
      }
      micRafIdRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  const toggleMic = useCallback(() => {
    if (!localAudioStreamRef.current) {
      requestLocalMic()
      return
    }
    setIsMuted(prev => {
      const next = !prev
      localAudioStreamRef.current.getAudioTracks().forEach(t => (t.enabled = !next))
      if (inVoiceRoomRef.current && voiceRoomChanRef.current) {
        voiceRoomChanRef.current.send({
          type: 'broadcast',
          event: 'voice_mic_state',
          payload: { peerId: currentUser?.id, isMuted: next },
        })
      }
      toast(next ? 'Microfone mutado' : 'Microfone ativo', next ? 'info' : 'success')
      return next
    })
  }, [currentUser, requestLocalMic, toast])

  const toggleDeafen = useCallback(() => {
    setIsDeafened(prev => {
      const next = !prev
      remoteAudiosRef.current.forEach(audio => { audio.muted = next })
      if (next && !isMutedRef.current) toggleMic()
      toast(next ? 'Áudio ensurdecido' : 'Áudio reativado', next ? 'info' : 'success')
      return next
    })
  }, [toast, toggleMic])

  // ------------------------------------------------------------------
  // Peer connections (voz + tela + webcam)
  // ------------------------------------------------------------------
  const myUserPayload = useCallback(() => {
    if (!currentUser) return null
    return {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar_url || currentUser.avatar,
      isMuted: isMutedRef.current,
    }
  }, [currentUser])

  function sendSignal(payload) {
    voiceRoomChanRef.current?.send({ type: 'broadcast', event: 'voice_signal', payload })
  }

  async function initiatePeerConnection(peerId, peerUser, isPolite) {
    if (peerConnectionsRef.current.has(peerId)) return
    const pc = new RTCPeerConnection(RTC_CONFIG)
    peerConnectionsRef.current.set(peerId, pc)
    pendingCandidatesRef.current.set(peerId, [])
    makingOfferRef.current.set(peerId, false)

    if (peerUser) voiceUsersMapRef.current.set(peerId, peerUser)
    syncVoiceUsers()

    // Adiciona tracks de áudio local
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getAudioTracks().forEach(t => pc.addTrack(t, localAudioStreamRef.current))
    }

    // Adiciona transceiver de vídeo para câmera de forma dinâmica
    const cameraDir = localCameraStreamRef.current ? 'sendrecv' : 'recvonly'
    const cameraTransceiver = pc.addTransceiver('video', { direction: cameraDir })
    cameraSendersRef.current.set(peerId, cameraTransceiver.sender)

    // Adiciona transceiver de vídeo para screen share de forma dinâmica
    const screenDir = localScreenStreamRef.current ? 'sendrecv' : 'recvonly'
    const screenTransceiver = pc.addTransceiver('video', { direction: screenDir })
    screenSendersRef.current.set(peerId, screenTransceiver.sender)

    // Se já estiver com a câmera ligada, envia a track atual
    if (localCameraStreamRef.current) {
      const videoTrack = localCameraStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        await cameraTransceiver.sender.replaceTrack(videoTrack)
      }
    }

    // Se já estiver compartilhando tela, envia a track atual
    if (localScreenStreamRef.current) {
      const videoTrack = localScreenStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        await screenTransceiver.sender.replaceTrack(videoTrack)
      }
    }

    // onnegotiationneeded — Padrão Perfect Negotiation
    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current.set(peerId, true)
        await pc.setLocalDescription()
        sendSignal({
          toPeer: peerId,
          fromPeer: currentUser.id,
          fromUser: myUserPayload(),
          sdp: pc.localDescription,
        })
      } catch (err) {
        console.error('Erro em onnegotiationneeded:', err)
      } finally {
        makingOfferRef.current.set(peerId, false)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          toPeer: peerId,
          fromPeer: currentUser.id,
          fromUser: myUserPayload(),
          candidate: event.candidate,
        })
      }
    }

    pc.ontrack = (event) => {
      const track = event.track
      if (track.kind === 'video') {
        const videoTransceivers = pc.getTransceivers().filter(t => t.receiver.track.kind === 'video')
        const idx = videoTransceivers.indexOf(event.transceiver)
        const stream = event.streams[0] || new MediaStream([track])

        if (idx === 0) {
          // É a Câmera!
          receivedWebcamStreamsRef.current.set(peerId, stream)
          const showCamera = () => {
            if (track.readyState === 'live' && !track.muted) {
              setWebcamStreams(prev => ({ ...prev, [peerId]: stream }))
            }
          }
          const removeCamera = () => {
            setWebcamStreams(prev => {
              if (!(peerId in prev)) return prev
              const next = { ...prev }
              delete next[peerId]
              return next
            })
          }
          track.onunmute = showCamera
          track.onended = removeCamera
          track.onmute = removeCamera
          
          if (track.readyState === 'live' && !track.muted) {
            showCamera()
          }
        } else if (idx === 1) {
          // É o Screen Share!
          receivedScreenSharesRef.current.set(peerId, stream)
          const showShare = () => {
            if (track.readyState === 'live' && !track.muted) {
              setScreenShares(prev => ({ ...prev, [peerId]: stream }))
            }
          }
          const removeScreenShare = () => {
            setScreenShares(prev => {
              if (!(peerId in prev)) return prev
              const next = { ...prev }
              delete next[peerId]
              return next
            })
          }
          track.onunmute = showShare
          track.onended = removeScreenShare
          track.onmute = removeScreenShare
          
          if (track.readyState === 'live' && !track.muted) {
            showShare()
          }
        }
        return
      }

      if (track.kind === 'audio') {
        const stream = event.streams[0] || new MediaStream([track])
        let audio = remoteAudiosRef.current.get(peerId)
        if (!audio) {
          audio = document.createElement('audio')
          audio.autoplay = true
          audio.playsInline = true
          audio.style.display = 'none'
          document.body.appendChild(audio)
          remoteAudiosRef.current.set(peerId, audio)
        }
        audio.srcObject = stream
        audio.muted = isDeafenedRef.current
        audio.play().catch(e => console.warn('Audio play permit:', e))
        setupRemoteAudioAnalyser(peerId, stream)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state [${peerId.slice(0,8)}]: ${pc.iceConnectionState}`)
      if (pc.iceConnectionState === 'failed') {
        console.warn('ICE failed, tentando restart...')
        pc.restartIce()
      }
    }
  }

  async function handleWebRTCSignal(payload) {
    const { fromPeer, fromUser, sdp, candidate } = payload
    if (fromUser) {
      voiceUsersMapRef.current.set(fromPeer, fromUser)
      syncVoiceUsers()
    }

    let pc = peerConnectionsRef.current.get(fromPeer)
    if (!pc) {
      // Peer desconhecido mandou sinal — criar conexão como "polite" (responde)
      const isPolite = currentUser.id > fromPeer
      await initiatePeerConnection(fromPeer, fromUser, isPolite)
      pc = peerConnectionsRef.current.get(fromPeer)
    }

    // Perfect Negotiation: determina quem é "polite" vs "impolite"
    const isPolite = currentUser.id > fromPeer

    try {
      if (sdp) {
        const offerCollision = sdp.type === 'offer' &&
          (makingOfferRef.current.get(fromPeer) || pc.signalingState !== 'stable')

        const ignoreOffer = offerCollision && !isPolite
        if (ignoreOffer) {
          console.warn('Colisão de oferta ignorada (impolite) para peer:', fromPeer.slice(0,8))
          return
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp))

        // Aplica candidatos ICE pendentes acumulados para este peer
        const pending = pendingCandidatesRef.current.get(fromPeer) || []
        for (const cand of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e =>
            console.warn('Erro ao adicionar candidato pendente:', e)
          )
        }
        pendingCandidatesRef.current.set(fromPeer, [])

        if (sdp.type === 'offer') {
          await pc.setLocalDescription()
          sendSignal({
            toPeer: fromPeer,
            fromPeer: currentUser.id,
            fromUser: myUserPayload(),
            sdp: pc.localDescription,
          })
        }
      } else if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          // Se remoteDescription não está definida ainda, enfileira
          if (!pc.remoteDescription || !pc.remoteDescription.type) {
            const pending = pendingCandidatesRef.current.get(fromPeer) || []
            pending.push(candidate)
            pendingCandidatesRef.current.set(fromPeer, pending)
          } else {
            console.warn('Erro ao adicionar ICE candidate:', e)
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao processar sinal WebRTC:', e)
    }
  }

  function closePeerConnection(peerId) {
    const pc = peerConnectionsRef.current.get(peerId)
    if (pc) { pc.close(); peerConnectionsRef.current.delete(peerId) }
    
    const audio = remoteAudiosRef.current.get(peerId)
    if (audio) { 
      audio.srcObject = null
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio)
      }
      remoteAudiosRef.current.delete(peerId) 
    }
    
    pendingCandidatesRef.current.delete(peerId)
    makingOfferRef.current.delete(peerId)
    cameraSendersRef.current.delete(peerId)
    screenSendersRef.current.delete(peerId)
    voiceUsersMapRef.current.delete(peerId)
    setScreenShares(prev => {
      if (!(peerId in prev)) return prev
      const next = { ...prev }
      delete next[peerId]
      return next
    })
    setWebcamStreams(prev => {
      if (!(peerId in prev)) return prev
      const next = { ...prev }
      delete next[peerId]
      return next
    })
    syncVoiceUsers()
  }

  function setupRemoteAudioAnalyser(peerId, remoteStream) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      const ctx = new AC()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(remoteStream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)

      function check() {
        if (!remoteAudiosRef.current.has(peerId)) { ctx.close(); return }
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setSpeakingPeers(prev => {
          const speaking = avg > 14
          if (!!prev[peerId] === speaking) return prev
          return { ...prev, [peerId]: speaking }
        })
        requestAnimationFrame(check)
      }
      check()
    } catch (e) {
      console.warn('Analyser remoto falhou:', e)
    }
  }

  // ------------------------------------------------------------------
  // Entrar / sair da sala de voz
  // ------------------------------------------------------------------
  const joinVoiceRoom = useCallback(async () => {
    if (!currentUser || !voiceRoomChanRef.current) return
    const stream = await requestLocalMic()
    if (!stream) {
      toast('Ative o microfone para entrar na sala.', 'error')
      return
    }

    setInVoiceRoom(true)
    inVoiceRoomRef.current = true
    toast('Entrou na Sala de Voz!', 'success')

    const chan = voiceRoomChanRef.current
    await chan.track({ userId: currentUser.id, user: myUserPayload() })

    // Anuncia sua presença para todos os participantes que já estão na sala
    chan.send({ type: 'broadcast', event: 'voice_peer_announce', payload: { peerId: currentUser.id, user: myUserPayload() } })

    // Conecta-se a peers que já estão presentes
    const state = chan.presenceState()
    Object.entries(state).forEach(([userId, presences]) => {
      if (userId === currentUser.id) return
      const p = presences[0]
      if (!p?.user) return
      if (!peerConnectionsRef.current.has(userId)) {
        // Usa comparação de IDs para definir quem é "polite"
        const isPolite = currentUser.id > userId
        initiatePeerConnection(userId, p.user, isPolite)
      }
    })
  }, [currentUser, requestLocalMic, toast])

  const leaveVoiceRoom = useCallback(async () => {
    if (!inVoiceRoomRef.current) return
    setInVoiceRoom(false)
    inVoiceRoomRef.current = false

    if (localCameraStreamRef.current) {
      localCameraStreamRef.current.getTracks().forEach(t => t.stop())
      localCameraStreamRef.current = null
      setIsCameraOn(false)
    }

    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop())
      localScreenStreamRef.current = null
      setIsSharingScreen(false)
    }

    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getTracks().forEach(t => t.stop())
      localAudioStreamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserNodeRef.current = null
    if (micRafIdRef.current) {
      cancelAnimationFrame(micRafIdRef.current)
      micRafIdRef.current = null
    }
    setMicLevel(0)

    const chan = voiceRoomChanRef.current
    if (chan) {
      chan.send({ type: 'broadcast', event: 'voice_peer_leave', payload: { peerId: currentUser?.id } })
      await chan.untrack()
    }

    peerConnectionsRef.current.forEach((_, peerId) => closePeerConnection(peerId))
    peerConnectionsRef.current.clear()

    remoteAudiosRef.current.forEach(audio => {
      audio.srcObject = null
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio)
      }
    })
    remoteAudiosRef.current.clear()
    pendingCandidatesRef.current.clear()
    makingOfferRef.current.clear()
    cameraSendersRef.current.clear()
    screenSendersRef.current.clear()

    // Sincroniza a lista de usuários baseada no Presence State remanescente para
    // continuar mostrando quem está na sala
    if (chan) {
      const state = chan.presenceState()
      voiceUsersMapRef.current.clear()
      Object.entries(state).forEach(([userId, presences]) => {
        if (userId === currentUser.id) return
        const p = presences[0]
        if (!p?.user) return
        voiceUsersMapRef.current.set(userId, p.user)
      })
      syncVoiceUsers()
    } else {
      voiceUsersMapRef.current.clear()
      setVoiceUsers([])
    }

    setScreenShares({})
    setWebcamStreams({})
    setSpeakingPeers({})
    toast('Saiu da Sala de Voz.', 'info')
  }, [currentUser, toast, syncVoiceUsers])

  const toggleVoiceRoom = useCallback(() => {
    if (inVoiceRoomRef.current) leaveVoiceRoom()
    else joinVoiceRoom()
  }, [joinVoiceRoom, leaveVoiceRoom])

  // ------------------------------------------------------------------
  // Câmera
  // ------------------------------------------------------------------
  const startCamera = useCallback(async () => {
    if (!inVoiceRoomRef.current) {
      toast('Entre na sala de voz para ligar a câmera.', 'info')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      localCameraStreamRef.current = stream
      setIsCameraOn(true)
      setWebcamStreams(prev => ({ ...prev, me: stream }))

      const videoTrack = stream.getVideoTracks()[0]
      videoTrack.onended = () => stopCamera()

      for (const [peerId, sender] of cameraSendersRef.current) {
        try {
          await sender.replaceTrack(videoTrack)
          const pc = peerConnectionsRef.current.get(peerId)
          if (pc) {
            const transceiver = pc.getTransceivers().find(t => t.sender === sender)
            if (transceiver && transceiver.direction !== 'sendrecv') {
              transceiver.direction = 'sendrecv'
            }
          }
        } catch (err) {
          console.warn(`Erro ao enviar câmera para ${peerId.slice(0,8)}:`, err)
        }
      }

      voiceRoomChanRef.current?.send({
        type: 'broadcast',
        event: 'voice_camera_state',
        payload: { peerId: currentUser.id, isCameraOn: true },
      })

      toast('Câmera ligada!', 'success')
    } catch (err) {
      console.warn('Câmera cancelada ou negada:', err)
      toast('Câmera: autorize para compartilhar vídeo.', 'error')
    }
  }, [currentUser, toast])

  const stopCamera = useCallback(async () => {
    const stream = localCameraStreamRef.current
    if (!stream) return
    stream.getTracks().forEach(t => t.stop())
    localCameraStreamRef.current = null
    setIsCameraOn(false)
    setWebcamStreams(prev => {
      const next = { ...prev }
      delete next.me
      return next
    })

    for (const [peerId, sender] of cameraSendersRef.current) {
      try {
        await sender.replaceTrack(null)
        const pc = peerConnectionsRef.current.get(peerId)
        if (pc) {
          const transceiver = pc.getTransceivers().find(t => t.sender === sender)
          if (transceiver && transceiver.direction !== 'recvonly') {
            transceiver.direction = 'recvonly'
          }
        }
      } catch (err) {
        console.warn(`Erro ao remover câmera de ${peerId.slice(0,8)}:`, err)
      }
    }

    voiceRoomChanRef.current?.send({
      type: 'broadcast',
      event: 'voice_camera_state',
      payload: { peerId: currentUser.id, isCameraOn: false },
    })

    toast('Câmera desligada.', 'info')
  }, [currentUser, toast])

  const toggleCamera = useCallback(() => {
    if (isCameraOnRef.current) stopCamera()
    else startCamera()
  }, [startCamera, stopCamera])

  // ------------------------------------------------------------------
  // Compartilhamento de tela
  // ------------------------------------------------------------------
  const startScreenShare = useCallback(async () => {
    if (!inVoiceRoomRef.current) {
      toast('Entre na sala de voz para compartilhar a tela.', 'info')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      localScreenStreamRef.current = stream
      setIsSharingScreen(true)
      setScreenShares(prev => ({ ...prev, me: stream }))

      const videoTrack = stream.getVideoTracks()[0]
      videoTrack.onended = () => stopScreenShare()

      // Usa replaceTrack no transceiver de vídeo existente de cada peer
      for (const [peerId, sender] of screenSendersRef.current) {
        try {
          await sender.replaceTrack(videoTrack)
          const pc = peerConnectionsRef.current.get(peerId)
          if (pc) {
            const transceiver = pc.getTransceivers().find(t => t.sender === sender)
            if (transceiver && transceiver.direction !== 'sendrecv') {
              transceiver.direction = 'sendrecv'
            }
          }
        } catch (err) {
          console.warn(`Erro ao enviar screen share para ${peerId.slice(0,8)}:`, err)
        }
      }

      // Notifica via broadcast que estamos compartilhando tela (metadado)
      voiceRoomChanRef.current?.send({
        type: 'broadcast',
        event: 'voice_screen_state',
        payload: { peerId: currentUser.id, isSharing: true },
      })

      toast('Compartilhando tela!', 'success')
    } catch (err) {
      console.warn('Compartilhamento de tela cancelado ou negado:', err)
    }
  }, [currentUser, toast])

  const stopScreenShare = useCallback(async () => {
    const stream = localScreenStreamRef.current
    if (!stream) return
    stream.getTracks().forEach(t => t.stop())
    localScreenStreamRef.current = null
    setIsSharingScreen(false)
    setScreenShares(prev => {
      const next = { ...prev }
      delete next.me
      return next
    })

    // Remove a track de vídeo dos transceivers via replaceTrack(null)
    for (const [peerId, sender] of screenSendersRef.current) {
      try {
        await sender.replaceTrack(null)
        const pc = peerConnectionsRef.current.get(peerId)
        if (pc) {
          const transceiver = pc.getTransceivers().find(t => t.sender === sender)
          if (transceiver && transceiver.direction !== 'recvonly') {
            transceiver.direction = 'recvonly'
          }
        }
      } catch (err) {
        console.warn(`Erro ao remover screen share de ${peerId.slice(0,8)}:`, err)
      }
    }

    // Notifica via broadcast
    voiceRoomChanRef.current?.send({
      type: 'broadcast',
      event: 'voice_screen_state',
      payload: { peerId: currentUser.id, isSharing: false },
    })

    toast('Compartilhamento de tela encerrado.', 'info')
  }, [currentUser, toast])

  const toggleScreenShare = useCallback(() => {
    if (isSharingScreen) stopScreenShare()
    else startScreenShare()
  }, [isSharingScreen, startScreenShare, stopScreenShare])

  // Controla a inscrição de presença e eventos em tempo real para o workspace ativo
  useEffect(() => {
    if (!currentUser) return

    if (inVoiceRoomRef.current) {
      leaveVoiceRoom()
    }

    const topic = `voice_room_${activeWs}`
    const chan = supabase.channel(topic, {
      config: { broadcast: { self: false }, presence: { key: currentUser.id } },
    })
    voiceRoomChanRef.current = chan

    function announceMyself() {
      if (!inVoiceRoomRef.current) return
      chan.send({ type: 'broadcast', event: 'voice_peer_announce', payload: { peerId: currentUser.id, user: myUserPayload() } })
    }

    chan
      .on('presence', { event: 'sync' }, () => {
        const state = chan.presenceState()
        voiceUsersMapRef.current.clear()
        Object.entries(state).forEach(([userId, presences]) => {
          if (userId === currentUser.id) return
          const p = presences[0]
          if (!p?.user) return
          voiceUsersMapRef.current.set(userId, p.user)
          
          if (inVoiceRoomRef.current && !peerConnectionsRef.current.has(userId)) {
            const isPolite = currentUser.id > userId
            initiatePeerConnection(userId, p.user, isPolite)
          }
        })
        syncVoiceUsers()
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === currentUser.id) return
        const p = newPresences[0]
        if (!p?.user) return
        voiceUsersMapRef.current.set(key, p.user)
        syncVoiceUsers()
        
        if (inVoiceRoomRef.current) {
          if (!peerConnectionsRef.current.has(key)) {
            const isPolite = currentUser.id > key
            initiatePeerConnection(key, p.user, isPolite)
          }
          announceMyself()
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== currentUser.id) {
          closePeerConnection(key)
        }
      })
      .on('broadcast', { event: 'voice_peer_announce' }, ({ payload }) => {
        if (!inVoiceRoomRef.current) return
        if (payload.peerId === currentUser.id) return
        if (!voiceUsersMapRef.current.has(payload.peerId)) {
          voiceUsersMapRef.current.set(payload.peerId, payload.user)
          syncVoiceUsers()
        }
        chan.send({ type: 'broadcast', event: 'voice_peer_welcome', payload: { toPeer: payload.peerId, peerId: currentUser.id, user: myUserPayload() } })
        if (!peerConnectionsRef.current.has(payload.peerId)) {
          const isPolite = currentUser.id > payload.peerId
          initiatePeerConnection(payload.peerId, payload.user, isPolite)
        }
      })
      .on('broadcast', { event: 'voice_peer_welcome' }, ({ payload }) => {
        if (!inVoiceRoomRef.current) return
        if (payload.toPeer !== currentUser.id) return
        if (!voiceUsersMapRef.current.has(payload.peerId)) {
          voiceUsersMapRef.current.set(payload.peerId, payload.user)
          syncVoiceUsers()
        }
        if (!peerConnectionsRef.current.has(payload.peerId)) {
          const isPolite = currentUser.id > payload.peerId
          initiatePeerConnection(payload.peerId, payload.user, isPolite)
        }
      })
      .on('broadcast', { event: 'voice_signal' }, ({ payload }) => {
        if (!inVoiceRoomRef.current) return
        if (payload.toPeer === currentUser.id) handleWebRTCSignal(payload)
      })
      .on('broadcast', { event: 'voice_mic_state' }, ({ payload }) => {
        const { peerId, isMuted: peerMuted } = payload
        const user = voiceUsersMapRef.current.get(peerId)
        if (user) {
          const updatedUser = { ...user, isMuted: peerMuted }
          voiceUsersMapRef.current.set(peerId, updatedUser)
          syncVoiceUsers()
        }
      })
      .on('broadcast', { event: 'voice_camera_state' }, ({ payload }) => {
        const { peerId, isCameraOn: peerCameraOn } = payload
        if (peerCameraOn) {
          // Se já recebemos a track original via ontrack, usamos ela para forçar a montagem
          const stream = receivedWebcamStreamsRef.current.get(peerId)
          if (stream) {
            setWebcamStreams(prev => ({ ...prev, [peerId]: stream }))
          } else {
            // Caso o broadcast chegue antes, usamos a track do transceiver
            const pc = peerConnectionsRef.current.get(peerId)
            if (pc) {
              const videoTransceivers = pc.getTransceivers().filter(t => t.receiver.track.kind === 'video')
              const cameraTransceiver = videoTransceivers[0]
              if (cameraTransceiver && cameraTransceiver.receiver.track) {
                const fallback = new MediaStream([cameraTransceiver.receiver.track])
                setWebcamStreams(prev => {
                  if (peerId in prev) return prev
                  return { ...prev, [peerId]: fallback }
                })
              }
            }
          }
        } else {
          setWebcamStreams(prev => {
            if (!(payload.peerId in prev)) return prev
            const next = { ...prev }
            delete next[payload.peerId]
            return next
          })
        }
      })
      .on('broadcast', { event: 'voice_screen_state' }, ({ payload }) => {
        const { peerId, isSharing: peerSharing } = payload
        if (peerSharing) {
          // Se já recebemos a track original via ontrack, usamos ela para forçar a montagem
          const stream = receivedScreenSharesRef.current.get(peerId)
          if (stream) {
            setScreenShares(prev => ({ ...prev, [peerId]: stream }))
          } else {
            // Caso o broadcast chegue antes, usamos a track do transceiver
            const pc = peerConnectionsRef.current.get(peerId)
            if (pc) {
              const videoTransceivers = pc.getTransceivers().filter(t => t.receiver.track.kind === 'video')
              const screenTransceiver = videoTransceivers[1]
              if (screenTransceiver && screenTransceiver.receiver.track) {
                const fallback = new MediaStream([screenTransceiver.receiver.track])
                setScreenShares(prev => {
                  if (peerId in prev) return prev
                  return { ...prev, [peerId]: fallback }
                })
              }
            }
          }
        } else {
          setScreenShares(prev => {
            if (!(payload.peerId in prev)) return prev
            const next = { ...prev }
            delete next[payload.peerId]
            return next
          })
        }
      })
      .on('broadcast', { event: 'voice_peer_leave' }, ({ payload }) => {
        closePeerConnection(payload.peerId)
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return
        if (inVoiceRoomRef.current) {
          await chan.track({ userId: currentUser.id, user: myUserPayload() })
          announceMyself()
        }
      })

    return () => {
      chan.untrack()
      supabase.removeChannel(chan)
      voiceRoomChanRef.current = null
      
      peerConnectionsRef.current.forEach((_, peerId) => closePeerConnection(peerId))
      peerConnectionsRef.current.clear()
      
      remoteAudiosRef.current.forEach(audio => {
        audio.srcObject = null
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio)
        }
      })
      remoteAudiosRef.current.clear()
      pendingCandidatesRef.current.clear()
      makingOfferRef.current.clear()
      cameraSendersRef.current.clear()
      screenSendersRef.current.clear()
      receivedWebcamStreamsRef.current.clear()
      receivedScreenSharesRef.current.clear()

      voiceUsersMapRef.current.clear()
      setVoiceUsers([])
      setScreenShares({})
      setWebcamStreams({})
      setSpeakingPeers({})
      if (micRafIdRef.current) cancelAnimationFrame(micRafIdRef.current)
    }
   }, [activeWs, currentUser?.id, syncVoiceUsers])

  return {
    isMuted,
    isDeafened,
    inVoiceRoom,
    micLevel,
    voiceUsers,
    speakingPeers,
    isSharingScreen,
    screenShares,
    isCameraOn,
    webcamStreams,
    toggleMic,
    toggleDeafen,
    toggleVoiceRoom,
    toggleScreenShare,
    toggleCamera,
    leaveVoiceRoomForWsChange: leaveVoiceRoom,
  }
}