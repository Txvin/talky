import { useAuth } from '../../context/AuthContext'

export default function Navbar({ onOpenAuth }) {
  const { currentUser } = useAuth()

  return (
    <header className="nav-header">
      <div className="container nav-inner">
        <a href="#" className="brand">
          <div className="brand-icon"><i className="fa-solid fa-waveform-lines"></i></div>
          <span className="brand-name">talky</span>
        </a>

        <nav className="nav-links" aria-label="Navegação principal">
          <a href="#features">Recursos</a>
          <a href="#demo">Demo</a>
          <a href="#comunidades">Comunidades</a>
        </nav>

        <div className="nav-actions">
          <button className="btn-ghost" onClick={onOpenAuth}>
            {currentUser ? (
              <><i className="fa-solid fa-user"></i> {currentUser.name.split(' ')[0]}</>
            ) : (
              'Entrar'
            )}
          </button>
          <button className="btn-primary" onClick={onOpenAuth}>
            {currentUser ? 'Ir para o App' : 'Abrir App'} <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </header>
  )
}