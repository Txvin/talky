import { useState, useEffect } from 'react'
import { WORKSPACES_META } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useMessages } from '../../hooks/useMessages'
import { useMembers } from '../../hooks/useMembers'
import { useVoice } from '../../hooks/useVoice'
import { useServers, DEFAULT_SERVER_CHANNELS } from '../../hooks/useServers'
import Rail from './Rail'
import Sidebar from './Sidebar'
import ChatMain from './ChatMain'
import MembersPanel from './MembersPanel'
import CreateServerModal from './CreateServerModal'
import JoinServerModal from './JoinServerModal'
import InviteModal from './InviteModal'

// ------------------------------------------------------------------
// Canais estáticos de fallback (WORKSPACES_META) convertidos para o
// novo formato de servidores dinâmicos. São SEMPRE exibidos como
// servidores padrão, mesmo quando existem servidores no banco.
// ------------------------------------------------------------------
const STATIC_SERVERS = Object.entries(WORKSPACES_META).map(([key, ws]) => ({
  id: key,
  name: ws.name,
  icon_url: null,
  _isStatic: true,
  _channels: ws.channels,
}))

function getServerChannels(server) {
  if (!server) return DEFAULT_SERVER_CHANNELS
  if (server._isStatic && server._channels) return server._channels
  return DEFAULT_SERVER_CHANNELS
}

export default function TalkyApp({ onOpenSettings, onGoHome }) {
  const { logout } = useAuth()
  const {
    servers: dbServers,
    loading: serversLoading,
    createServer,
    joinServerByInvite,
    generateInvite,
    refetch: refetchServers,
  } = useServers()

  // ------------------------------------------------------------------
  // Combina sempre: servidores estáticos (padrão) + servidores do banco
  // Os estáticos ficam primeiro e nunca somem
  // ------------------------------------------------------------------
  const servers = [
    ...STATIC_SERVERS,
    ...dbServers, // UUIDs nunca colidem com as string-keys estáticas
  ]

  // Servidor e canal ativos
  const [activeServerId, setActiveServerId] = useState(null)
  const [activeCh, setActiveCh] = useState('geral')
  const [showVoiceLayout, setShowVoiceLayout] = useState(false)

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // ------------------------------------------------------------------
  // Seleciona o primeiro servidor da lista quando ela carrega
  // ------------------------------------------------------------------
  useEffect(() => {
    if (servers.length > 0 && !activeServerId) {
      const first = servers[0]
      setActiveServerId(first.id)
      const channels = getServerChannels(first)
      setActiveCh(Object.keys(channels)[0])
    }
  }, [servers, activeServerId])

  // ------------------------------------------------------------------
  // Deriva o servidor ativo e seus canais
  // ------------------------------------------------------------------
  const activeServer = servers.find(s => s.id === activeServerId) || servers[0]
  const activeServerChannels = getServerChannels(activeServer)

  // Canal ativo (garante que está dentro dos canais do servidor atual)
  const safeActiveCh = activeServerChannels[activeCh]
    ? activeCh
    : Object.keys(activeServerChannels)[0] || 'geral'

  const channel = activeServerChannels[safeActiveCh] || { name: safeActiveCh, topic: '' }

  // ------------------------------------------------------------------
  // Hooks de mensagens e voz
  // Usa um ID composto "serverId:channelKey" para escopar mensagens por servidor
  // ------------------------------------------------------------------
  const messageRoomId = activeServer ? `${activeServer.id}:${safeActiveCh}` : safeActiveCh
  const { messages, sendMessage } = useMessages(messageRoomId)
  const members = useMembers()
  const voice = useVoice(activeServer?.id || 'default')

  // Esconde o layout de voz ao sair da sala
  useEffect(() => {
    if (!voice.inVoiceRoom) {
      setShowVoiceLayout(false)
    }
  }, [voice.inVoiceRoom])

  // ------------------------------------------------------------------
  // Navegação
  // ------------------------------------------------------------------
  function handleSelectServer(server) {
    if (server.id === activeServerId) return
    setActiveServerId(server.id)
    const channels = getServerChannels(server)
    setActiveCh(Object.keys(channels)[0])
    setShowVoiceLayout(false)
  }

  function handleSelectCh(chKey) {
    setActiveCh(chKey)
    setShowVoiceLayout(false)
  }

  // Chamado quando um novo servidor é criado ou o usuário entra via convite
  async function handleCreateServer(name, iconDataUrl) {
    const server = await createServer(name, iconDataUrl)
    if (server) {
      handleServerReady(server)
    }
    return server
  }

  async function handleJoinServer(codeOrLink) {
    const server = await joinServerByInvite(codeOrLink)
    if (server) {
      handleServerReady(server)
    }
    return server
  }

  function handleServerReady(server) {
    if (server) {
      setActiveServerId(server.id)
      setActiveCh(Object.keys(getServerChannels(server))[0])
    }
  }

  return (
    <div className="app-layout active">
      <Rail
        servers={servers}
        activeServerId={activeServer?.id}
        onSelectServer={handleSelectServer}
        onGoHome={onGoHome}
        onOpenCreate={() => setShowCreateModal(true)}
        onOpenJoin={() => setShowJoinModal(true)}
      />

      <Sidebar
        activeServer={activeServer}
        activeServerChannels={activeServerChannels}
        activeCh={safeActiveCh}
        onSelectCh={handleSelectCh}
        onOpenSettings={onOpenSettings}
        onLogout={logout}
        inVoiceRoom={voice.inVoiceRoom}
        onToggleVoice={() => {
          if (!voice.inVoiceRoom) {
            voice.toggleVoiceRoom()
            setShowVoiceLayout(true)
          } else {
            if (!showVoiceLayout) {
              setShowVoiceLayout(true)
            } else {
              voice.toggleVoiceRoom()
            }
          }
        }}
        isMuted={voice.isMuted}
        isDeafened={voice.isDeafened}
        onToggleMic={voice.toggleMic}
        onToggleDeafen={voice.toggleDeafen}
        voiceUsers={voice.voiceUsers}
        isSharingScreen={voice.isSharingScreen}
        onToggleScreenShare={voice.toggleScreenShare}
        onOpenInvite={activeServer && !activeServer._isStatic
          ? () => setShowInviteModal(true)
          : null
        }
      />

      <ChatMain
        channel={channel}
        messages={messages}
        onSendMessage={sendMessage}
        micLevel={voice.micLevel}
        screenShares={voice.screenShares}
        webcamStreams={voice.webcamStreams}
        voiceUsers={voice.voiceUsers}
        inVoiceRoom={voice.inVoiceRoom}
        showVoiceLayout={showVoiceLayout}
        onShowVoiceLayout={setShowVoiceLayout}
        isMuted={voice.isMuted}
        isDeafened={voice.isDeafened}
        isSharingScreen={voice.isSharingScreen}
        isCameraOn={voice.isCameraOn}
        onToggleMic={voice.toggleMic}
        onToggleDeafen={voice.toggleDeafen}
        onToggleScreenShare={voice.toggleScreenShare}
        onToggleCamera={voice.toggleCamera}
        onLeaveVoice={voice.toggleVoiceRoom}
        speakingPeers={voice.speakingPeers}
      />

      <MembersPanel members={members} />

      {/* Modais de servidor */}
      {showCreateModal && (
        <CreateServerModal
          onClose={() => setShowCreateModal(false)}
          onCreateServer={handleCreateServer}
        />
      )}

      {showJoinModal && (
        <JoinServerModal
          onClose={() => setShowJoinModal(false)}
          onJoinServer={handleJoinServer}
        />
      )}

      {showInviteModal && activeServer && (
        <InviteModal
          server={activeServer}
          onGenerateInvite={generateInvite}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}