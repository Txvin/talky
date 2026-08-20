import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { CH_IDS } from '../constants'

export function useMessages(chKey) {
  const [messages, setMessages] = useState([])
  const channelRef = useRef(null)
  const renderedIds = useRef(new Set())

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
    const channelId = CH_IDS[chKey]
    if (!channelId || !currentUser || !content.trim()) return

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

    await supabase.from('messages').insert({
      id: msgObj.id,
      channel_id: channelId,
      user_id: currentUser.id,
      content: msgObj.content,
    })
  }, [chKey])

  return { messages, sendMessage }
}