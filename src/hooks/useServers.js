// src/hooks/useServers.js
// Hook para gerenciar servidores dinâmicos: buscar, criar, entrar via convite e gerar convites
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// Canais padrão para todo servidor novo
export const DEFAULT_SERVER_CHANNELS = {
  geral: { name: 'geral', topic: 'Canal principal de conversas.' },
}

// Gera código de convite aleatório (sem dependências externas)
function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function useServers() {
  const { currentUser } = useAuth()
  const toast = useToast()
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)

  // ------------------------------------------------------------------
  // Busca todos os servidores onde o usuário é membro
  // ------------------------------------------------------------------
  const fetchServers = useCallback(async () => {
    if (!currentUser) { setLoading(false); return }
    try {
      const { data, error } = await supabase
        .from('server_members')
        .select('role, servers(*)')
        .eq('user_id', currentUser.id)
        .order('joined_at', { ascending: true })

      if (error) throw error

      const list = (data || [])
        .map(row => ({ ...row.servers, myRole: row.role }))
        .filter(Boolean)

      setServers(list)
    } catch (err) {
      console.error('Erro ao buscar servidores:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { fetchServers() }, [fetchServers])

  // ------------------------------------------------------------------
  // Cria um novo servidor e adiciona o criador como owner
  // ------------------------------------------------------------------
  const createServer = useCallback(async (name, iconDataUrl) => {
    if (!currentUser || !name.trim()) return null
    try {
      // ------------------------------------------------------------------
      // Garante que o usuário existe na tabela users (evita FK violation).
      // Usuários logados via preset/email-mock têm ID no localStorage mas
      // podem ainda não existir no banco, o que quebra a FK de owner_id.
      // ------------------------------------------------------------------
      const { error: upsertUserErr } = await supabase.from('users').upsert({
        id:        currentUser.id,
        name:      currentUser.name,
        handle:    currentUser.handle || '@' + currentUser.name.split(' ')[0].toLowerCase(),
        email:     currentUser.email  || `${currentUser.id}@talky.local`,
        avatar_url: currentUser.avatar_url || currentUser.avatar || null,
        role:      currentUser.role   || 'Membro',
        status:    currentUser.status || 'Online',
        is_online: true,
      }, { onConflict: 'id' })

      if (upsertUserErr) {
        console.error('Erro ao sincronizar usuário no banco:', upsertUserErr)
        // Não bloqueia — tenta continuar mesmo assim
      }

      let icon_url = null

      // Upload do ícone se fornecido (dataURL → Blob → Supabase Storage)
      if (iconDataUrl && iconDataUrl.startsWith('data:')) {
        try {
          const res = await fetch(iconDataUrl)
          const blob = await res.blob()
          const filename = `${currentUser.id}/${Date.now()}.png`
          const { error: uploadErr } = await supabase.storage
            .from('server-icons')
            .upload(filename, blob, { upsert: true, contentType: 'image/png' })
          if (!uploadErr) {
            const { data: urlData } = supabase.storage
              .from('server-icons')
              .getPublicUrl(filename)
            icon_url = urlData.publicUrl
          }
        } catch (uploadErr) {
          console.warn('Upload de ícone falhou, continuando sem ícone:', uploadErr)
        }
      }

      // Insere o servidor
      const { data: server, error: serverErr } = await supabase
        .from('servers')
        .insert({ name: name.trim(), icon_url, owner_id: currentUser.id })
        .select()
        .single()

      if (serverErr) throw serverErr

      // Adiciona o criador como owner na tabela de membros
      const { error: memberErr } = await supabase.from('server_members').insert({
        server_id: server.id,
        user_id:   currentUser.id,
        role:      'owner',
      })

      if (memberErr) {
        console.warn('Erro ao adicionar membro owner (não crítico):', memberErr)
      }

      await fetchServers()
      toast(`Servidor "${server.name}" criado com sucesso!`, 'success')
      return server
    } catch (err) {
      // Exibe a mensagem real do Supabase para facilitar o diagnóstico
      const detail = err?.message || err?.details || err?.hint || 'Erro desconhecido'
      const code   = err?.code ? ` (código ${err.code})` : ''
      console.error('Erro ao criar servidor:', err)
      toast(`Erro ao criar servidor: ${detail}${code}`, 'error')
      return null
    }
  }, [currentUser, fetchServers, toast])

  // ------------------------------------------------------------------
  // Entra em um servidor usando um código ou link de convite
  // ------------------------------------------------------------------
  const joinServerByInvite = useCallback(async (codeOrLink) => {
    if (!currentUser) return null

    // Extrai o código do link (pega a última parte da URL) ou usa direto
    const code = codeOrLink.trim().split('/').pop().trim()
    if (!code) throw new Error('Código de convite vazio.')

    try {
      // Garante que o usuário existe no banco antes de criar o vínculo de membro
      await supabase.from('users').upsert({
        id:         currentUser.id,
        name:       currentUser.name,
        handle:     currentUser.handle || '@' + currentUser.name.split(' ')[0].toLowerCase(),
        email:      currentUser.email  || `${currentUser.id}@talky.local`,
        avatar_url: currentUser.avatar_url || currentUser.avatar || null,
        role:       currentUser.role   || 'Membro',
        status:     currentUser.status || 'Online',
        is_online:  true,
      }, { onConflict: 'id' })

      // Busca o convite com o servidor associado
      const { data: invite, error: inviteErr } = await supabase
        .from('server_invites')
        .select('*, servers(*)')
        .eq('code', code)
        .single()

      if (inviteErr || !invite) {
        throw new Error('Código de convite inválido ou não encontrado.')
      }

      // Valida expiração
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        throw new Error('Este convite expirou.')
      }

      // Valida limite de usos
      if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
        throw new Error('Este convite atingiu o limite máximo de usos.')
      }

      // Verifica se já é membro
      const { data: existing } = await supabase
        .from('server_members')
        .select('id')
        .eq('server_id', invite.server_id)
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (existing) {
        toast('Você já é membro deste servidor!', 'info')
        return invite.servers
      }

      // Adiciona como membro
      const { error: memberErr } = await supabase.from('server_members').insert({
        server_id: invite.server_id,
        user_id:   currentUser.id,
        role:      'member',
      })

      if (memberErr) throw memberErr

      // Incrementa uses_count
      await supabase.from('server_invites')
        .update({ uses_count: (invite.uses_count || 0) + 1 })
        .eq('id', invite.id)

      await fetchServers()
      toast(`Você entrou em "${invite.servers?.name}"!`, 'success')
      return invite.servers
    } catch (err) {
      const msg = err?.message || err?.details || 'Erro ao entrar no servidor.'
      console.error('Erro ao entrar no servidor via convite:', err)
      toast(msg, 'error')
      throw new Error(msg)
    }
  }, [currentUser, fetchServers, toast])

  // ------------------------------------------------------------------
  // Gera um novo link/código de convite para um servidor
  // ------------------------------------------------------------------
  const generateInvite = useCallback(async (serverId, options = {}) => {
    if (!currentUser) return null
    const { expiresInHours = null, maxUses = null } = options
    try {
      const code = generateCode(8)
      const payload = {
        server_id:  serverId,
        code,
        created_by: currentUser.id,
        max_uses:   maxUses || null,
        expires_at: expiresInHours
          ? new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()
          : null,
      }

      const { error } = await supabase.from('server_invites').insert(payload)
      if (error) throw error

      const link = `${window.location.origin}/invite/${code}`
      return { code, link }
    } catch (err) {
      const detail = err?.message || err?.details || 'Erro desconhecido'
      console.error('Erro ao gerar convite:', err)
      toast(`Erro ao gerar convite: ${detail}`, 'error')
      return null
    }
  }, [currentUser, toast])

  return {
    servers,
    loading,
    createServer,
    joinServerByInvite,
    generateInvite,
    refetch: fetchServers,
  }
}
