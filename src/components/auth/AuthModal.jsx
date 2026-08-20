import { useState } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import { useFileToDataUrl } from '../../hooks/useFileToDataUrl'
import { PRESET_USERS } from '../../constants'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
const GOOGLE_FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'

export default function AuthModal({ onClose }) {
  const { login } = useAuth()
  const [tab, setTab] = useState('quick') // quick | email | register

  // Cadastro
  const [regAvatar, setRegAvatar] = useState(DEFAULT_AVATAR)
  const [regName, setRegName] = useState('')
  const [regHandle, setRegHandle] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const handleRegFile = useFileToDataUrl(setRegAvatar)

  // Email
  const [email, setEmail] = useState('otavio@talky.dev')

  function closeOnBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleGoogleLogin() {
    onClose()
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err) {
      console.log('Google Auth fallback local:', err)
      const googleUser = {
        id: 'google-' + Math.floor(Math.random() * 89999 + 10000),
        name: 'Usuário Google',
        handle: '@google_user',
        email: 'google.user@gmail.com',
        avatar_url: GOOGLE_FALLBACK_AVATAR,
        role: 'Google VIP',
        status: 'Conectado via Google',
      }
      await supabase.from('users').upsert(googleUser)
      login(googleUser)
    }
  }

  function handlePreset(key) {
    const u = PRESET_USERS[key]
    if (!u) return
    onClose()
    login(u)
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim()
    onClose()

    const { data } = await supabase.from('users').select('*').eq('email', trimmed).maybeSingle()
    if (data) {
      login(data)
    } else {
      const newUser = {
        id: crypto.randomUUID(),
        name: trimmed.split('@')[0],
        handle: '@' + trimmed.split('@')[0].toLowerCase(),
        email: trimmed,
        avatar_url: DEFAULT_AVATAR,
        role: 'Membro Talky',
        status: 'Online no Talky',
      }
      await supabase.from('users').upsert(newUser)
      login(newUser)
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault()
    const name = regName.trim() || 'Novo Usuário'
    let handle = regHandle.trim() || '@' + name.split(' ')[0].toLowerCase()
    if (!handle.startsWith('@')) handle = '@' + handle
    const emailVal = regEmail.trim() || `user_${Date.now()}@talky.dev`
    onClose()

    const newUser = {
      id: crypto.randomUUID(),
      name,
      handle,
      email: emailVal,
      avatar_url: regAvatar,
      role: 'Novo Membro',
      status: 'Acabou de entrar!',
    }
    await supabase.from('users').upsert(newUser)
    login(newUser)
  }

  return (
    <div className="modal-backdrop active" role="dialog" aria-modal="true" aria-label="Entrar no Talky" onClick={closeOnBackdrop}>
      <div className="modal-box glass">
        <button className="modal-close" aria-label="Fechar" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="modal-top">
          <div className="brand-icon lg"><i className="fa-solid fa-waveform-lines"></i></div>
          <h2>Entrar no Talky</h2>
          <p>Acesso rápido ou entre com sua conta.</p>
        </div>

        <div className="google-auth-wrap">
          <button type="button" className="btn-google" onClick={handleGoogleLogin}>
            <i className="fa-brands fa-google"></i> Continuar com o Google
          </button>
        </div>

        <div className="auth-divider"><span>OU ACESSO MANUAL</span></div>

        <div className="tab-bar">
          <button className={`tab-btn${tab === 'quick' ? ' active' : ''}`} onClick={() => setTab('quick')}>
            <i className="fa-solid fa-bolt"></i> Rápido
          </button>
          <button className={`tab-btn${tab === 'email' ? ' active' : ''}`} onClick={() => setTab('email')}>
            <i className="fa-solid fa-envelope"></i> Email
          </button>
          <button className={`tab-btn${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>
            <i className="fa-solid fa-user-plus"></i> Criar Conta
          </button>
        </div>

        {/* Quick Login */}
        <div className={`tab-pane${tab === 'quick' ? ' active' : ''}`}>
          <div className="preset-list">
            {Object.entries(PRESET_USERS).map(([key, u]) => (
              <div className="preset-item" key={key} onClick={() => handlePreset(key)}>
                <img src={u.avatar_url} alt={u.name} />
                <div className="preset-meta">
                  <strong>{u.name}</strong>
                  <span>{u.handle} · {u.role}</span>
                </div>
                <span className="chip chip-indigo">Entrar</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email Login */}
        <div className={`tab-pane${tab === 'email' ? ' active' : ''}`}>
          <form className="auth-form" onSubmit={handleEmailSubmit}>
            <label className="field">
              <span>E-MAIL</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </label>
            <label className="field">
              <span>SENHA</span>
              <input type="password" placeholder="••••••••" defaultValue="12345678" required />
            </label>
            <button type="submit" className="btn-primary full">
              <i className="fa-solid fa-arrow-right-to-bracket"></i> Entrar na Conta
            </button>
          </form>
        </div>

        {/* Register */}
        <div className={`tab-pane${tab === 'register' ? ' active' : ''}`}>
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="avatar-upload-preview">
              <img src={regAvatar} alt="Avatar Preview" className="reg-preview-img" />
              <div className="upload-btn-wrap">
                <label htmlFor="reg-avatar-file" className="btn-file-upload">
                  <i className="fa-solid fa-camera"></i> Escolher Foto PNG
                </label>
                <input type="file" id="reg-avatar-file" accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} onChange={handleRegFile} />
              </div>
            </div>

            <div className="grid-2-fields">
              <label className="field">
                <span>NOME COMPLETO</span>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Ex: Otávio Henrique" required />
              </label>
              <label className="field">
                <span>APELIDO / USERNAME</span>
                <input type="text" value={regHandle} onChange={e => setRegHandle(e.target.value)} placeholder="Ex: @otavio" required />
              </label>
            </div>

            <label className="field">
              <span>E-MAIL</span>
              <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="seu@email.com" required />
            </label>
            <label className="field">
              <span>SENHA</span>
              <input type="password" placeholder="Mínimo 6 caracteres" required />
            </label>
            <button type="submit" className="btn-primary full">
              <i className="fa-solid fa-user-check"></i> Criar Conta e Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}