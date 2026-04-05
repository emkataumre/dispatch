import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ActivePresence } from '@/lib/presence'

export function useActivePresence() {
  const { session } = useAuth()
  const [activePresence, setActivePresence] = useState<ActivePresence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setActivePresence(null)
      setLoading(false)
      return
    }

    let active = true

    supabase
      .from('live_presence')
      .select('id, poi_id, message, visible_to')
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setActivePresence((data && data.length > 0) ? (data[0] as ActivePresence) : null)
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [session?.user.id])

  const setBroadcast = useCallback((presence: ActivePresence) => {
    setActivePresence(presence)
  }, [])

  const clearBroadcast = useCallback(() => {
    setActivePresence(null)
  }, [])

  return { activePresence, loading, error, setBroadcast, clearBroadcast }
}
