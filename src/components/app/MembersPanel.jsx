export default function MembersPanel({ members }) {
  const onlineCount = members.filter(m => m.is_online !== false).length || 1

  return (
    <aside className="members-panel" aria-label="Membros online">
      <div className="mp-header">MEMBROS — <span>{onlineCount}</span> online</div>

      <div className="mp-section">
        <div className="mp-section-label">ONLINE</div>
        <div>
          {members.map(m => {
            const avatar = m.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
            return (
              <div className="mp-member" key={m.id}>
                <div className="mp-av-wrap">
                  <img src={avatar} alt={m.name} className="mp-av" />
                  <span className={`mp-dot ${m.is_online !== false ? 'online' : 'dnd'}`}></span>
                </div>
                <div className="mp-info">
                  <strong>{m.name}</strong>
                  <span className="text-muted" style={{ fontSize: 11, color: 'var(--tx-3)' }}>
                    {m.status || 'Online'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}