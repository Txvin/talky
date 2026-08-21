import { useState } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useFileToDataUrl } from '../../hooks/useFileToDataUrl'
import { PRESET_USERS } from '../../constants'

// ------------------------------------------------------------------
// Detecta o erro de "e-mail já cadastrado" do Supabase Auth. Checamos
// error.code (mais estável) e também a mensagem em inglês como
// fallback, já que versões diferentes do backend podem não mandar o
// code.
// ------------------------------------------------------------------
function isAlreadyRegisteredError(error) {
  if (!error) return false
  if (error.code === 'user_already_exists') return true
  const msg = (error.message || '').toLowerCase()
  return msg.includes('already registered') || msg.includes('already exists')
}

export default function AuthModal({ onClose }) {
  const { login } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('quick') // quick | email | register

  // Cadastro
  const [regAvatar, setRegAvatar] = useState(null) // null = sem foto escolhida
  const [regName, setRegName] = useState('')
  const [regHandle, setRegHandle] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regSubmitting, setRegSubmitting] = useState(false)
  const handleRegFile = useFileToDataUrl(setRegAvatar)

  // Email
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)

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
  // Acesso rápido — apenas as 3 contas de demonstração fixas.
  // NUNCA liste usuários reais aqui: antes essa lista vinha do banco
  // (todas as contas cadastradas) e qualquer pessoa podia clicar
  // "Entrar" e assumir a conta de outra pessoa sem nenhuma senha.
  // ------------------------------------------------------------------
  function handlePreset(u) {
    onClose()
    login(u)
  }

  // ------------------------------------------------------------------
  // Login por e-mail + senha (Supabase Auth de verdade)
  // ------------------------------------------------------------------
  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (emailSubmitting) return
    setEmailSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        toast('E-mail ou senha incorretos.', 'error')
        return
      }
      // O restante do login (carregar/criar o perfil e setar currentUser)
      // é feito automaticamente pelo listener onAuthStateChange no AuthContext.
      onClose()
    } catch (err) {
      console.error('Erro no login por e-mail:', err)
      toast('Não foi possível entrar. Tente novamente.', 'error')
    } finally {
      setEmailSubmitting(false)
    }
  }

  // ------------------------------------------------------------------
  // Cadastro de novo usuário — cria uma conta real com senha
  // ------------------------------------------------------------------
  async function handleRegisterSubmit(e) {
    e.preventDefault()
    if (regSubmitting) return
    if (regPassword.length < 6) {
      toast('A senha precisa ter pelo menos 6 caracteres.', 'error')
      return
    }
    setRegSubmitting(true)

    const name = regName.trim() || 'Novo Usuário'
    let handle = regHandle.trim() || '@' + name.split(' ')[0].toLowerCase()
    if (!handle.startsWith('@')) handle = '@' + handle
    const emailVal = regEmail.trim()

    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailVal,
        password: regPassword,
        options: {
          data: { name, handle, avatar_url: regAvatar || null },
        },
      })

      if (error) {
        // Supabase manda esse erro em inglês quando a confirmação de
        // e-mail está DESATIVADA no projeto (aí o duplicado é detectado
        // na hora). Traduzimos e já jogamos a pessoa pra aba de login.
        if (isAlreadyRegisteredError(error)) {
          toast('Esse e-mail já tem uma conta. Faça login na aba Email.', 'error')
          setTab('email')
          setEmail(emailVal)
        } else {
          toast(error.message || 'Não foi possível criar a conta.', 'error')
        }
        return
      }

      // ------------------------------------------------------------------
      // Gotcha conhecido do Supabase: quando a confirmação de e-mail está
      // ATIVADA, um cadastro repetido NÃO retorna erro — ele responde com
      // sucesso "fake" (proteção contra enumeração de e-mail), mas
      // data.user.identities vem como array vazio. Sem checar isso, o
      // usuário via um toast de "conta criada" e nunca mais conseguia
      // entrar com aquele e-mail.
      // ------------------------------------------------------------------
      const identities = data?.user?.identities
      if (data?.user && Array.isArray(identities) && identities.length === 0) {
        toast('Esse e-mail já tem uma conta. Faça login na aba Email.', 'error')
        setTab('email')
        setEmail(emailVal)
        return
      }

      if (data.session) {
        // Confirmação de e-mail desativada no projeto — sessão já ativa.
        // O onAuthStateChange no AuthContext cuida de criar o perfil e logar.
        onClose()
      } else {
        // Confirmação de e-mail ativada — precisa confirmar antes de entrar.
        toast('Conta criada! Confira seu e-mail para confirmar o cadastro.', 'success')
        onClose()
      }
    } catch (err) {
      console.error('Erro ao criar conta:', err)
      toast('Não foi possível criar a conta. Tente novamente.', 'error')
    } finally {
      setRegSubmitting(false)
    }
  }

  const regAvatarDisplay = regAvatar || null
  const presetList = Object.values(PRESET_USERS)

  return (
    <div className="modal-backdrop active" role="dialog" aria-modal="true" aria-label="Entrar no Talky" onClick={closeOnBackdrop}>
      <div className="modal-box glass">
        <button className="modal-close" aria-label="Fechar" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="modal-top">
          <div className="brand-icon lg"><i className="fa-solid fa-waveform-lines"></i></div>
          <h2>Entrar no Talky</h2>
          <p>Contas de demonstração ou entre com sua conta.</p>
        </div>

        <div className="google-auth-wrap">
          <button type="button" className="btn-google" onClick={handleGoogleLogin}>
            <i className="fa-brands fa-google"></i> Continuar com o Google
          </button>
        </div>

        <div className="auth-divider"><span>OU ACESSO MANUAL</span></div>

        <div className="tab-bar">
          <button className={`tab-btn${tab === 'quick' ? ' active' : ''}`} onClick={() => setTab('quick')}>
            <i className="fa-solid fa-bolt"></i> Demo
          </button>
          <button className={`tab-btn${tab === 'email' ? ' active' : ''}`} onClick={() => setTab('email')}>
            <i className="fa-solid fa-envelope"></i> Email
          </button>
          <button className={`tab-btn${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>
            <i className="fa-solid fa-user-plus"></i> Criar Conta
          </button>
        </div>

        {/* ── Contas de demonstração ── */}
        <div className={`tab-pane${tab === 'quick' ? ' active' : ''}`}>
          <p className="preset-hint">
            Contas públicas de exemplo, só para testar o app rapidamente. Sua conta real fica protegida por senha na aba Email.
          </p>
          <div className="preset-list">
            {presetList.map((u) => (
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
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <button type="submit" className="btn-primary full" disabled={emailSubmitting}>
              <i className="fa-solid fa-arrow-right-to-bracket"></i>
              {emailSubmitting ? 'Entrando...' : 'Entrar na Conta'}
            </button>
          </form>
        </div>

        {/* ── Criar Conta ── */}
        <div className={`tab-pane${tab === 'register' ? ' active' : ''}`}>
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="avatar-upload-preview">
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
              <input
                type="password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </label>
            <button type="submit" className="btn-primary full" disabled={regSubmitting}>
              <i className="fa-solid fa-user-check"></i>
              {regSubmitting ? 'Criando...' : 'Criar Conta e Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}