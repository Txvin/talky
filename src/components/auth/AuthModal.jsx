import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import { useFileToDataUrl } from '../../hooks/useFileToDataUrl'
import { PRESET_USERS } from '../../constants'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'

// IDs dos usuários preset para não duplicá-los na lista dinâmica
const PRESET_IDS = new Set(Object.values(PRESET_USERS).map(u => u.id))

export default function AuthModal({ onClose }) {
  const { login } = useAuth()
  const [tab, setTab] = useState('quick') // quick | email | register

  // Usuários reais do Supabase para o Acesso Rápido
  const [dynamicUsers, setDynamicUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Cadastro
  const [regAvatar, setRegAvatar] = useState(null) // null = sem foto escolhida
  const [regName, setRegName] = useState('')
  const [regHandle, setRegHandle] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const handleRegFile = useFileToDataUrl(setRegAvatar)

  // Email
  const [email, setEmail] = useState('')

  // ------------------------------------------------------------------
  // Busca todos os usuários do Supabase para o Acesso Rápido dinâmico
  // ------------------------------------------------------------------
  useEffect(() => {
    async function loadUsers() {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, name, handle, avatar_url, role, status, email')
          .order('created_at', { ascending: false })
          .limit(20)

        if (data) {
          // Filtra os presets fixos (já mostrados abaixo) e usuários sem nome
          const extras = data.filter(u => !PRESET_IDS.has(u.id) && u.name)
          setDynamicUsers(extras)
        }
      } catch (err) {
        console.warn('Não foi possível carregar usuários dinâmicos:', err)
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
  }, [])

  function closeOnBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  // ------------------------------------------------------------------
  // Login com Google
  // ------------------------------------------------------------------
  async function handleGoogleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) {
        console.error('Erro no Google OAuth:', error)
        onClose()
      }
    } catch (err) {
      console.error('Google Auth erro inesperado:', err)
      onClose()
    }
  }

  // ------------------------------------------------------------------
  // Acesso rápido — usuários preset fixos
  // ------------------------------------------------------------------
  function handlePreset(u) {
    onClose()
    login(u)
  }

  // ------------------------------------------------------------------
  // Login por e-mail
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Cadastro de novo usuário — aparece no Acesso Rápido na próxima vez
  // ------------------------------------------------------------------
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
      avatar_url: regAvatar || DEFAULT_AVATAR,
      role: 'Novo Membro',
      status: 'Acabou de entrar!',
    }
    await supabase.from('users').upsert(newUser)
    login(newUser)
  }

  // ------------------------------------------------------------------
  // Avatar placeholder para o registro (sem foto escolhida)
  // ------------------------------------------------------------------
  const regAvatarDisplay = regAvatar || null

  const allQuickUsers = [
    // Primeiro os presets fixos, depois os dinâmicos do banco
    ...Object.values(PRESET_USERS),
    ...dynamicUsers,
  ]

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

        {/* ── Acesso Rápido ── */}
        <div className={`tab-pane${tab === 'quick' ? ' active' : ''}`}>
          <div className="preset-list">
            {allQuickUsers.map((u) => (
              <div className="preset-item" key={u.id} onClick={() => handlePreset(u)}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.name} />
                ) : (
                  <div className="preset-avatar-placeholder">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="preset-meta">
                  <strong>{u.name}</strong>
                  <span>{u.handle} · {u.role || 'Membro'}</span>
                </div>
                <span className="chip chip-indigo">Entrar</span>
              </div>
            ))}

            {loadingUsers && dynamicUsers.length === 0 && (
              <div className="preset-loading">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Carregando perfis...</span>
              </div>
            )}

            {!loadingUsers && allQuickUsers.length === 0 && (
              <div className="preset-empty">
                <i className="fa-solid fa-users-slash"></i>
                <span>Nenhum perfil encontrado. Crie uma conta!</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Login por Email ── */}
        <div className={`tab-pane${tab === 'email' ? ' active' : ''}`}>
          <form className="auth-form" onSubmit={handleEmailSubmit}>
            <label className="field">
              <span>E-MAIL</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
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

        {/* ── Criar Conta ── */}
        <div className={`tab-pane${tab === 'register' ? ' active' : ''}`}>
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="avatar-upload-preview">
              {/* Placeholder real quando sem foto, foto real quando escolhida */}
              {regAvatarDisplay ? (
                <img src={regAvatarDisplay} alt="Avatar Preview" className="reg-preview-img" />
              ) : (
                <div className="reg-avatar-placeholder">
                  <i className="fa-solid fa-user"></i>
                </div>
              )}
              <div className="upload-btn-wrap">
                <label htmlFor="reg-avatar-file" className="btn-file-upload">
                  <i className="fa-solid fa-camera"></i> Escolher Foto
                </label>
                <input
                  type="file"
                  id="reg-avatar-file"
                  accept="image/png, image/jpeg, image/webp"
                  style={{ display: 'none' }}
                  onChange={handleRegFile}
                />
              </div>
            </div>

            <div className="grid-2-fields">
              <label className="field">
                <span>NOME COMPLETO</span>
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Ex: Otávio Henrique"
                  required
                />
              </label>
              <label className="field">
                <span>APELIDO / USERNAME</span>
                <input
                  type="text"
                  value={regHandle}
                  onChange={e => setRegHandle(e.target.value)}
                  placeholder="Ex: @otavio"
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>E-MAIL</span>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
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