import { useState } from 'react'
import { WORKSPACES_META } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useMessages } from '../../hooks/useMessages'
import { useMembers } from '../../hooks/useMembers'
import { useVoice } from '../../hooks/useVoice'
import Rail from './Rail'
import Sidebar from './Sidebar'
import ChatMain from './ChatMain'
import MembersPanel from './MembersPanel'

export default function TalkyApp({ onOpenSettings, onGoHome }) {
  const { logout } = useAuth()
  const [activeWs, setActiveWs] = useState('dev-squad')
  const [activeCh, setActiveCh] = useState('geral')

  const { messages, sendMessage } = useMessages(activeCh)
  const members = useMembers()
  const voice = useVoice(activeWs)

  function handleSelectWs(wsKey) {
    setActiveWs(wsKey)
    const firstCh = Object.keys(WORKSPACES_META[wsKey].channels)[0]
    setActiveCh(firstCh)
  }

  const channel = WORKSPACES_META[activeWs].channels[activeCh]

  return (
    <div className="app-layout active">
      <Rail activeWs={activeWs} onSelectWs={handleSelectWs} onGoHome={onGoHome} />

               <Sidebar
        activeWs={activeWs}
        activeCh={activeCh}
        onSelectCh={setActiveCh}
        onOpenSettings={onOpenSettings}
        onLogout={logout}
        inVoiceRoom={voice.inVoiceRoom}
        onToggleVoice={voice.toggleVoiceRoom}
        isMuted={voice.isMuted}
        isDeafened={voice.isDeafened}
        onToggleMic={voice.toggleMic}
        onToggleDeafen={voice.toggleDeafen}
        voiceUsers={voice.voiceUsers}
        isSharingScreen={voice.isSharingScreen}
        onToggleScreenShare={voice.toggleScreenShare}
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
    </div>
  )
}