import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function useMembers() {
  const [members, setMembers] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('users')
        .select('id, name, avatar_url, status, is_online')
        .order('created_at', { ascending: true })
        .limit(20)
      if (!cancelled && data) setMembers(data)
    }
    load()

    const chan = supabase
      .channel('global_members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, load)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(chan)
    }
  }, [])

  return members
}