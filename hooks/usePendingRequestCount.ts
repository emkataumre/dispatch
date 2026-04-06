import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// Lightweight hook used by the tab layout to drive the Friends tab badge.
// Returns the count of pending incoming friend requests, or 0 on error/no session.
export function usePendingRequestCount(): number {
  const { session } = useAuth()
  const [count, setCount] = useState(0)
  const channelId = useRef(`pending-count-${Date.now()}-${Math.random()}`)

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setCount(0)
      return
    }

    let active = true

    async function load() {
      try {
        const { count: c, error } = await supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .eq('addressee_id', userId!)
          .eq('status', 'pending')

        if (!active) return
        if (!error) setCount(c ?? 0)
      } catch {
        // Non-fatal — badge simply stays at 0
      }
    }

    load()

    const channel = supabase
      .channel(channelId.current)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships' }, () => {
        if (active) load()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships' }, () => {
        if (active) load()
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'friendships' }, () => {
        if (active) load()
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [session?.user.id])

  return count
}
