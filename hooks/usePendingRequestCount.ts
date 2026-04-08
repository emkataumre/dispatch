import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// Lightweight hook used by the tab layout to drive the Friends tab badge.
// Returns the count of pending incoming friend requests, or 0 on error/no session.
// NOTE: This hook maintains its own Realtime subscription, independent of
// useFriendships, because it is mounted in the tab layout which outlives the friends screen.
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
        if (error) {
          console.error('usePendingRequestCount: query error', error.message)
          return
        }
        setCount(c ?? 0)
      } catch (err) {
        // Non-fatal — badge simply stays at its last value
        console.error('usePendingRequestCount: failed to fetch count', err)
      }
    }

    load()

    let subscribedOnce = false
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
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          if (subscribedOnce) {
            // Reconnected after a drop — re-fetch so the badge count is fresh
            if (active) load()
          } else {
            subscribedOnce = true
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('usePendingRequestCount: Realtime error', err ?? '(no details)')
        }
      })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [session?.user.id])

  return count
}
