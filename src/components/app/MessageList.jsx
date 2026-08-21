import { fmtTime } from '../../utils'

function MessageContent({ text }) {
  if (!text.includes('```')) {
    return <div className="msg-text">{text}</div>
  }
  const parts = text.split('```')
  return (
    <>
      {parts.map((p, idx) =>
        idx % 2 === 1 ? (
          <div className="msg-code" key={idx}>
            <div className="msg-code-header">
              <span><i className="fa-solid fa-code" style={{ color: 'var(--cyan)' }}></i> código</span>
              <button onClick={(e) => {
                const code = e.currentTarget.closest('.msg-code').querySelector('code').textContent
                navigator.clipboard.writeText(code)
              }}>
                <i className="fa-regular fa-copy"></i> copiar
              </button>
            </div>
            <pre><code>{p.trim()}</code></pre>
          </div>
        ) : p.trim() ? (
          <div className="msg-text" key={idx}>{p.trim()}</div>
        ) : null
      )}
    </>
  )
}

export default function MessageList({ messages }) {
  if (messages.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--tx-3)', fontSize: 13, padding: 30 }}>
        Nenhuma mensagem ainda. Seja o primeiro a falar! 👋
      </div>
    )
  }

  return (
    <>
      {messages.map(msg => {
        const user = msg.users ?? {}
        const avatar = user.avatar_url || user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
        return (
          <div className="msg-card" key={msg.id}>
            <img src={avatar} alt={user.name || 'Usuário'} className="msg-av" />
            <div className="msg-body">
              <div className="msg-meta">
                <span className="msg-name">{user.name || 'Usuário'}</span>
                <span className="msg-role admin">{user.role || 'Membro'}</span>
                <time className="msg-time">{fmtTime(msg.created_at)}</time>
              </div>
              <MessageContent text={msg.content || ''} />
            </div>
          </div>
        )
      })}
    </>
  )
}