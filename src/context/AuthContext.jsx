import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState({ active: false, progress: 0, text: '' })
  const toast = useToast()
  const didHandleOAuth = useRef(false)

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
  // Restaura sessão local + escuta login via Google OAuth
  // ------------------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem('talky_user')
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved))
      } catch {
        localStorage.removeItem('talky_user')
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        session?.user &&
        !didHandleOAuth.current
      ) {
        didHandleOAuth.current = true
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
        loadingTransition(() => setCurrentUser(resolvedUser), `Bem-vindo, ${resolvedUser.name.split(' ')[0]}!`)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value = { currentUser, setCurrentUser, login, logout, loading, loadingTransition, toast }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}