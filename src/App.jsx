import { useState } from 'react'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage from './components/landing/LandingPage'
import AuthModal from './components/auth/AuthModal'
import TalkyApp from './components/app/TalkyApp'
import SettingsModal from './components/app/SettingsModal'

function AppShell() {
  const { currentUser, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showApp, setShowApp] = useState(true) // permite "voltar pra landing" sem deslogar
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  function handleRequestAuth() {
    if (currentUser) {
      setShowApp(true)
      return
    }
    setShowAuthModal(true)
  }

  function handleGoHome() {
    setShowApp(false)
  }

  const isInApp = currentUser && showApp

  return (
    <>
      <div className="orb orb-a"></div>
      <div className="orb orb-b"></div>

      {!isInApp && <LandingPage onRequestAuth={handleRequestAuth} />}

      {isInApp && (
        <TalkyApp
          onGoHome={handleGoHome}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      )}

      {showAuthModal && !currentUser && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {showSettingsModal && currentUser && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {loading.active && (
        <div className="load-screen active">
          <div className="load-inner">
            <div className="load-pulse-wrap">
              <div className="load-ring"></div>
              <div className="brand-icon lg"><i className="fa-solid fa-waveform-lines"></i></div>
            </div>
            <h3>Carregando Talky</h3>
            <p>{loading.text}</p>
            <div className="load-bar-track">
              <div className="load-bar-fill" style={{ width: `${loading.progress}%` }}></div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App