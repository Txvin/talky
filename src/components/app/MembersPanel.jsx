const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'

function MemberRow({ m, online }) {
  const avatar = m.avatar_url || DEFAULT_AVATAR
  return (
    <div className={`mp-member${online ? '' : ' offline'}`} key={m.id}>
      <div className="mp-av-wrap">
        <img src={avatar} alt={m.name} className="mp-av" />
        <span className={`mp-dot ${online ? 'online' : 'offline'}`}></span>
      </div>
      <div className="mp-info">
        <strong>{m.name}</strong>
        <span className="text-muted" style={{ fontSize: 11, color: 'var(--tx-3)' }}>
          {online ? (m.status || 'Online') : 'Offline'}
        </span>
      </div>
    </div>
  )
}

export default function MembersPanel({ members }) {
  // Só considera online quem tem is_online estritamente true — evita
  // tratar usuários com valor ausente/nulo como se estivessem online.
  const onlineMembers = members.filter(m => m.is_online === true)
  const offlineMembers = members.filter(m => m.is_online !== true)

  return (
    <aside className="members-panel" aria-label="Membros">
      <div className="mp-header">MEMBROS — <span>{onlineMembers.length}</span> online</div>

      {onlineMembers.length > 0 && (
        <div className="mp-section">
          <div className="mp-section-label">ONLINE — {onlineMembers.length}</div>
          <div>
            {onlineMembers.map(m => <MemberRow key={m.id} m={m} online />)}
          </div>
        </div>
      )}

      {offlineMembers.length > 0 && (
        <div className="mp-section">
          <div className="mp-section-label">OFFLINE — {offlineMembers.length}</div>
          <div>
            {offlineMembers.map(m => <MemberRow key={m.id} m={m} online={false} />)}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <div className="mp-empty">
          <i className="fa-solid fa-user-slash"></i>
          <span>Nenhum membro encontrado.</span>
        </div>
      )}
    </aside>
  )
}