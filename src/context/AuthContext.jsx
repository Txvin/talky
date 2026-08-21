import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useToast } from './ToastContext'
import { applyAccentColor } from '../utils'

const AuthContext = createContext(null)

const SUPABASE_URL  = 'https://ntfgfdtnnfuyuunacyxi.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50ZmdmZHRubmZ1eXV1bmFjeXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Mjg3NjMsImV4cCI6MjEwMjQwNDc2M30.JRCwnCnrpI4pbM3vqB5307KsMtEmQSvE3CsTa-mxoxk'

// ------------------------------------------------------------------
// Marca o usuário como offline de forma confiável ao fechar/recarregar
// a aba. Uma chamada supabase-js normal (fetch assíncrono) costuma ser
// cancelada nesse momento — por isso usamos fetch com keepalive: true,
// que o navegador garante completar mesmo com a página descarregando.
// ------------------------------------------------------------------
function markOfflineBeacon(userId) {
  if (!userId) return
  try {
    fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ is_online: false }),
    })
  } catch (err) {
    console.warn('Falha ao marcar usuário como offline:', err)
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState({ active: false, progress: 0, text: '' })
  const toast = useToast()
  const currentUserRef = useRef(null)

  useEffect(() => {
    currentUserRef.current = currentUser
    // Sempre que o usuário logado mudar (login, restauração de sessão,
    // troca de conta), aplica a cor de destaque salva no perfil dele
    // — se não tiver nenhuma ainda, volta pro roxo/indigo padrão.
    applyAccentColor(currentUser?.accent_color || '#6366f1')
  }, [currentUser])

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
    // upsert em vez de update: contas demo/preset ainda não existem na
    // tabela `users` na primeira vez — um UPDATE não cria a linha, só
    // um upsert garante que o membro passe a existir e apareça no painel.
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      handle: user.handle || '@' + user.name.split(' ')[0].toLowerCase(),
      email: user.email || `${user.id}@talky.local`,
      avatar_url: user.avatar_url || user.avatar || null,
      role: user.role || 'Membro',
      status: user.status || 'Online',
      is_online: true,
    }, { onConflict: 'id' })
    if (error) console.error('Erro ao sincronizar usuário no login:', error)
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
    // Encerra também a sessão real do Supabase Auth (Google/email+senha).
    // Sem isso, a sessão continuava válida no navegador e o listener
    // onAuthStateChange logava o usuário de volta sozinho no próximo reload.
    await supabase.auth.signOut()
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
        const savedUser = JSON.parse(saved)
        setCurrentUser(savedUser)
        // Volta a marcar como online (pode ter ficado offline num fechamento anterior)
        supabase.from('users').update({ is_online: true }).eq('id', savedUser.id)
      } catch {
        localStorage.removeItem('talky_user')
      }
    }

    // ------------------------------------------------------------------
    // Marca offline ao fechar a aba/janela. 'pagehide' é mais confiável
    // que 'beforeunload' (também dispara em navegação por bfcache/mobile).
    // ------------------------------------------------------------------
    function handleUnload() {
      markOfflineBeacon(currentUserRef.current?.id)
    }
    window.addEventListener('pagehide', handleUnload)
    window.addEventListener('beforeunload', handleUnload)

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
        // Novo usuário (Google OAuth ou cadastro por e-mail/senha) — cria
        // o perfil na tabela users. Preferimos o handle escolhido no
        // cadastro (meta.handle); só geramos um a partir do nome quando
        // não veio nenhum (caso do login via Google).
        const name = meta.full_name || meta.name || authUser.email.split('@')[0]
        const handle = meta.handle || '@' + name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
        resolvedUser = {
          id: authUser.id,
          name,
          handle,
          email: authUser.email,
          avatar_url: meta.avatar_url || meta.picture ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          role: meta.name ? 'Membro Talky' : 'Membro Google',
          status: 'Acabou de entrar!',
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

    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener('pagehide', handleUnload)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  const value = { currentUser, setCurrentUser, login, logout, updateProfile, loading, loadingTransition, toast }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}