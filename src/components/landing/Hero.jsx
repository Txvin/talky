import { useCountUp } from '../../hooks/useCountUp'

function Stat({ target, unit, label }) {
  const [ref, value] = useCountUp(target)
  return (
    <div className="stat">
      <strong className="stat-num" ref={ref}>{value}</strong>
      <span className="stat-unit">{unit}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export default function Hero({ onEnterApp }) {
  return (
    <section className="hero" id="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="pill pill-live">
            <span className="live-dot"></span>
            Microfone Real — Web Audio API Ativa
          </div>

          <h1 className="hero-h1">
            Comunique-se.<br />
            <span className="gradient-text">Sem fricção.</span>
          </h1>

          <p className="hero-lead">
            Canais de voz HD, chat limpo e latência ultrabaixa — tudo num design que fica fora do seu caminho.
          </p>

          <div className="hero-cta">
            <button className="btn-primary btn-lg" onClick={onEnterApp}>
              <i className="fa-solid fa-rocket"></i> Entrar no Talky
            </button>
            <button
              className="btn-outline btn-lg"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <i className="fa-solid fa-play"></i> Ver Demo
            </button>
          </div>

          <div className="hero-stats">
            <Stat target={150} unit="M+" label="Usuários" />
            <div className="stat-sep"></div>
            <Stat target={45} unit="M+" label="Servidores" />
            <div className="stat-sep"></div>
            <Stat target={12} unit="ms" label="Latência" />
          </div>
        </div>

        <div className="hero-visual">
          <div className="app-mockup">
            <div className="mockup-bar">
              <span className="dot-r"></span><span className="dot-y"></span><span className="dot-g"></span>
              <span className="mockup-title"><i className="fa-solid fa-waveform-lines"></i> talky — Dev Squad HQ</span>
            </div>
            <div className="mockup-body">
              <div className="mockup-rail">
                <div className="mock-icon active"><i className="fa-solid fa-code"></i></div>
                <div className="mock-icon"><i className="fa-solid fa-gamepad"></i></div>
                <div className="mock-icon"><i className="fa-solid fa-palette"></i></div>
              </div>
              <div className="mockup-sidebar">
                <p className="mock-ws">Dev Squad HQ</p>
                <p className="mock-group">TEXTO</p>
                <div className="mock-ch active"><i className="fa-solid fa-hashtag"></i> geral</div>
                <div className="mock-ch"><i className="fa-solid fa-hashtag"></i> dev-lounge</div>
                <p className="mock-group">VOZ</p>
                <div className="mock-ch voice-ch">
                  <i className="fa-solid fa-volume-high"></i> Sala HQ <span className="live-tag">AO VIVO</span>
                </div>
              </div>
              <div className="mockup-chat">
                <div className="mock-msg">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80" alt="avatar" className="mock-av" />
                  <div>
                    <div className="mock-meta"><strong>Samira</strong><span className="badge-admin">CEO</span><time>18:40</time></div>
                    <p>Bem-vindos ao novo Talky! Design limpo, voz real. 🎙️</p>
                  </div>
                </div>
                <div className="mock-msg">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80" alt="avatar" className="mock-av" />
                  <div>
                    <div className="mock-meta"><strong>Gabriel</strong><span className="badge-dev">Dev</span><time>18:42</time></div>
                    <p>Microfone ao vivo funcionando perfeitamente! 🔥</p>
                  </div>
                </div>
                <div className="mock-input">
                  <i className="fa-solid fa-circle-plus"></i>
                  <span>Escreva uma mensagem...</span>
                  <i className="fa-solid fa-paper-plane"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="float-card float-mic">
            <div className="fc-dot fc-green"></div>
            <i className="fa-solid fa-microphone"></i>
            <div>
              <strong>Samira Vance</strong>
              <small>falando agora</small>
            </div>
          </div>

          <div className="float-card float-ping">
            <i className="fa-solid fa-signal"></i>
            <span>Ping <strong>12 ms</strong></span>
          </div>
        </div>
      </div>
    </section>
  )
}