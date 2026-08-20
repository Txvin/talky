import { useState } from 'react'

const DEMO_CHANNELS = [
  { key: 'geral',    name: 'geral',    icon: 'fa-hashtag',      topic: 'Canal principal de conversa e atualizações.' },
  { key: 'projetos', name: 'projetos', icon: 'fa-hashtag',      topic: 'Projetos em andamento e roadmaps.' },
  { key: 'sala-hq',  name: 'Sala HQ',  icon: 'fa-volume-high',  topic: 'Canal de voz com baixa latência e alta fidelidade.' },
]

const INITIAL_MESSAGES = [
  {
    id: 1,
    name: 'Samira Vance',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
    tag: 'CEO',
    time: '18:40',
    text: 'Sejam bem-vindos ao Talky! Leve, limpo e rápido. 🚀',
  },
]

export default function DemoSection() {
  const [activeCh, setActiveCh] = useState('geral')
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')

  const currentChannel = DEMO_CHANNELS.find(c => c.key === activeCh)

  function sendDemoMsg() {
    const text = input.trim()
    if (!text) return
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        name: 'Você',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
        tag: 'Demo',
        time: 'Agora',
        text,
      },
    ])
    setInput('')
  }

  return (
    <section className="demo-section" id="demo">
      <div className="container">
        <div className="section-label">INTERATIVO</div>
        <h2 className="section-title">Experimente antes de entrar</h2>
        <p className="section-sub">Digite uma mensagem abaixo e veja como o Talky funciona.</p>

        <div className="demo-app glass">
          <div className="demo-bar">
            <div className="demo-dots"><span></span><span></span><span></span></div>
            <span className="demo-bar-title"><i className="fa-solid fa-waveform-lines"></i> talky demo</span>
          </div>
          <div className="demo-body">
            <aside className="demo-sidebar">
              <div className="ds-header">Dev Squad HQ</div>
              <div className="ds-group">CANAIS DE TEXTO</div>
              {DEMO_CHANNELS.slice(0, 2).map(ch => (
                <button
                  key={ch.key}
                  className={`ds-ch${activeCh === ch.key ? ' active' : ''}`}
                  onClick={() => setActiveCh(ch.key)}
                >
                  <i className={`fa-solid ${ch.icon}`}></i> {ch.name}
                </button>
              ))}
              <div className="ds-group">CANAIS DE VOZ</div>
              <button
                className={`ds-ch${activeCh === 'sala-hq' ? ' active' : ''}`}
                onClick={() => setActiveCh('sala-hq')}
              >
                <i className="fa-solid fa-volume-high"></i> Sala HQ
              </button>
            </aside>

            <div className="demo-chat">
              <div className="demo-chat-header">
                <i className="fa-solid fa-hashtag"></i>
                <span>{currentChannel.name}</span>
                <span className="demo-topic">{currentChannel.topic}</span>
              </div>

              <div className="demo-messages">
                {messages.map(m => (
                  <div className="demo-msg" key={m.id}>
                    <img src={m.avatar} alt={m.name} className="demo-av" />
                    <div className="demo-msg-body">
                      <div className="demo-msg-meta">
                        <strong>{m.name}</strong>
                        <span className="chip chip-indigo">{m.tag}</span>
                        <time>{m.time}</time>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="demo-composer">
                <button className="composer-icon"><i className="fa-solid fa-circle-plus"></i></button>
                <input
                  type="text"
                  placeholder="Escreva em #geral e pressione Enter..."
                  autoComplete="off"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendDemoMsg()}
                />
                <button className="composer-icon"><i className="fa-solid fa-face-smile"></i></button>
                <button className="composer-send" onClick={sendDemoMsg}>
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}