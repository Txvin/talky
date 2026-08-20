const FEATURES = [
  {
    color: '#6366f1',
    icon: 'fa-microphone-lines',
    title: 'Voz HD Real',
    desc: 'Web Audio API com AnalyserNode em tempo real. Sem delays, sem artefatos.',
  },
  {
    color: '#38bdf8',
    icon: 'fa-bolt',
    title: 'Latência Ultra-baixa',
    desc: 'Infraestrutura otimizada para menos de 20ms de latência percebida.',
  },
  {
    color: '#10b981',
    icon: 'fa-layer-group',
    title: 'Canais Organizados',
    desc: 'Texto, voz e categorias — tudo estruturado de forma intuitiva e limpa.',
  },
  {
    color: '#ec4899',
    icon: 'fa-shield-halved',
    title: 'Privacidade Primeiro',
    desc: 'Sem rastreamento, sem anúncios. Seus dados ficam com você.',
  },
]

export default function Features() {
  return (
    <section className="features-section" id="features">
      <div className="container">
        <div className="section-label">RECURSOS</div>
        <h2 className="section-title">Tudo que você precisa.<br />Nada que você não.</h2>

        <div className="features-grid">
          {FEATURES.map(f => (
            <div className="feature-card" key={f.title}>
              <div className="fc-icon" style={{ '--c': f.color }}>
                <i className={`fa-solid ${f.icon}`}></i>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}