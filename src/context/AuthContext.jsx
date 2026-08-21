import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState({ active: false, progress: 0, text: '' })
  const toast = useToast()

  // ------------------------------------------------------------------
  // Transição de loading (igual ao original: barra de progresso falsa)
  // ------------------------------------------------------------------
  function loadingTransition(callback, statusText = 'Carregando...') {
    setLoading({ active: true, progress: 0, text: statusText })
    let prog = 0
    const iv = setInterval(() => {
      prog = Math.min(100, prog + Math.floor(Math.random() * 28) + 18)
      setLoading(l => ({ ...l, progress: prog }))
      if (prog >= 100) {
        clearInterval(iv)
        setTimeout(() => {
          setLoading({ active: false, progress: 0, text: '' })
          callback()
        }, 200)
      }
    }, 50)
  }

  // ------------------------------------------------------------------
  // Login: recebe um user (preset, email ou cadastro) já resolvido
  // ------------------------------------------------------------------
  async function login(user) {
    localStorage.setItem('talky_user', JSON.stringify(user))
    await supabase.from('users').update({ is_online: true }).eq('id', user.id)
    loadingTransition(() => setCurrentUser(user), `Entrando como ${user.name}...`)
  }

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------
  async function logout() {
    if (currentUser) {
      await supabase.from('users').update({ is_online: false }).eq('id', currentUser.id)
    }
    localStorage.removeItem('talky_user')
    loadingTransition(() => setCurrentUser(null), 'Saindo da conta...')
  }

  // ------------------------------------------------------------------
  // Atualiza perfil do usuário logado (nome, avatar, cor de destaque, etc.)
  // ------------------------------------------------------------------
  async function updateProfile(updates) {
    if (!currentUser) return
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', currentUser.id)

      if (error) throw error

      const updatedUser = { ...currentUser, ...updates }
      localStorage.setItem('talky_user', JSON.stringify(updatedUser))
      setCurrentUser(updatedUser)
      toast('Perfil atualizado com sucesso!', 'success')
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err)
      toast('Erro ao salvar perfil. Tente novamente.', 'error')
    }
  }

  // ------------------------------------------------------------------
  // Restaura sessão local + escuta login via Google OAuth
  // ------------------------------------------------------------------
  useEffect(() => {
    // Tenta restaurar sessão do localStorage (login manual/preset)
    const saved = localStorage.getItem('talky_user')
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved))
      } catch {
        localStorage.removeItem('talky_user')
      }
    }

    // Escuta eventos de autenticação do Supabase (OAuth Google, etc.)
    // O Supabase SDK detecta automaticamente o token na URL após o redirecionamento
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Processar quando o usuário fez login via OAuth (SIGNED_IN)
      // ou quando o SDK detecta a sessão inicial após o redirecionamento (INITIAL_SESSION)
      const isOAuthReturn = (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user
      if (!isOAuthReturn) return

      // Verifica se já está logado com este usuário para evitar loop
      const savedRaw = localStorage.getItem('talky_user')
      if (savedRaw) {
        try {
          const savedUser = JSON.parse(savedRaw)
          // Se o usuário já está logado com a mesma conta OAuth, não reprocessar
          if (savedUser.id === session.user.id) return
        } catch { /* continua */ }
      }

      const authUser = session.user
      const meta = authUser.user_metadata || {}

      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle()

      let resolvedUser
      if (existing) {
        await supabase.from('users').update({ is_online: true }).eq('id', existing.id)
        resolvedUser = existing
      } else {
        // Novo usuário OAuth — cria perfil na tabela users
        const name = meta.full_name || meta.name || authUser.email.split('@')[0]
        const handle = '@' + name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
        resolvedUser = {
          id: authUser.id,
          name,
          handle,
          email: authUser.email,
          avatar_url: meta.avatar_url || meta.picture ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          role: 'Membro Google',
          status: 'Conectado via Google',
          is_online: true,
        }
        await supabase.from('users').upsert(resolvedUser)
      }

      localStorage.setItem('talky_user', JSON.stringify(resolvedUser))
      loadingTransition(
        () => setCurrentUser(resolvedUser),
        `Bem-vindo, ${resolvedUser.name.split(' ')[0]}!`
      )
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value = { currentUser, setCurrentUser, login, logout, updateProfile, loading, loadingTransition, toast }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}