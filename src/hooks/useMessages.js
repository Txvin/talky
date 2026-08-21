import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { CH_IDS } from '../constants'
import { useToast } from '../context/ToastContext'

// chKey deve ser uma chave presente em CH_IDS (canais estáticos de
// demonstração). Para servidores criados dinamicamente ainda não temos
// uma tabela `channels` no banco com UUID por canal — nesse caso o
// TalkyApp passa `null` aqui de propósito, e avisamos o usuário em vez
// de falhar em silêncio (era isso que fazia o chat "não fazer nada").
export function useMessages(chKey) {
  const [messages, setMessages] = useState([])
  const channelRef = useRef(null)
  const renderedIds = useRef(new Set())
  const toast = useToast()

  useEffect(() => {
    const channelId = CH_IDS[chKey]
    if (!channelId) return

    let cancelled = false
    renderedIds.current = new Set()
    setMessages([])

    async function load() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id, users(id, name, avatar_url, role)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(80)

      if (error) console.error('Erro ao carregar mensagens:', error)
      if (cancelled) return

      const loaded = data || []
      loaded.forEach(m => renderedIds.current.add(m.id))
      setMessages(loaded)
    }
    load()

    const chan = supabase.channel(`chat_${chKey}`, {
      config: { broadcast: { self: false } },
    })

    chan
      .on('broadcast', { event: 'new_msg' }, (payload) => {
        const msg = payload.payload
        if (msg && msg.channel_id === channelId && !renderedIds.current.has(msg.id)) {
          renderedIds.current.add(msg.id)
          setMessages(prev => [...prev, msg])
        }
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (renderedIds.current.has(payload.new.id)) return
          const { data: user } = await supabase
            .from('users')
            .select('id, name, avatar_url, role')
            .eq('id', payload.new.user_id)
            .maybeSingle()
          renderedIds.current.add(payload.new.id)
          setMessages(prev => [...prev, { ...payload.new, users: user }])
        }
      )
      .subscribe()

    channelRef.current = chan

    return () => {
      cancelled = true
      supabase.removeChannel(chan)
      channelRef.current = null
    }
  }, [chKey])

  const sendMessage = useCallback(async (content, currentUser) => {
    if (!content.trim() || !currentUser) return

    const channelId = CH_IDS[chKey]
    if (!channelId) {
      // Servidor sem canal persistido no banco (ver comentário acima).
      toast('Este servidor ainda não tem chat configurado no banco de dados.', 'error')
      return
    }

    const msgObj = {
      id: crypto.randomUUID(),
      channel_id: channelId,
      user_id: currentUser.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      users: currentUser,
    }

    renderedIds.current.add(msgObj.id)
    setMessages(prev => [...prev, msgObj])

    channelRef.current?.send({ type: 'broadcast', event: 'new_msg', payload: msgObj })

    const { error } = await supabase.from('messages').insert({
      id: msgObj.id,
      channel_id: channelId,
      user_id: currentUser.id,
      content: msgObj.content,
    })

    if (error) {
      console.error('Erro ao salvar mensagem:', error)
      toast('Sua mensagem não foi salva. Tente reenviar.', 'error')
    }
  }, [chKey, toast])

  return { messages, sendMessage }
}