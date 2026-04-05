import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PresenceJoin, joinPresence, cancelJoin } from '@/lib/presenceJoins'

export function usePresenceJoins() {
  const { session } = useAuth()
  const [joins, setJoins] = useState<PresenceJoin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setJoins([])
      setLoading(false)
      return
    }

    let active = true

    supabase
      .from('presence_joins')
      .select('id, presence_id, joiner_user_id, joined_at, confirmed')
      .eq('joiner_user_id', userId)
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) {
          console.error('usePresenceJoins:', fetchError.message)
          setError(fetchError.message)
        } else {
          setJoins((data ?? []) as PresenceJoin[])
        }
        setLoading(false)
      })

    return () => { active = false }
  }, [session?.user.id])

  const join = useCallback(async (presenceId: string): Promise<PresenceJoin> => {
    const newJoin = await joinPresence(supabase, { presenceId })
    setJoins((prev) => [...prev, newJoin])
    return newJoin
  }, [])

  const cancel = useCallback(async (joinId: string): Promise<void> => {
    await cancelJoin(supabase, { joinId })
    setJoins((prev) => prev.filter((j) => j.id !== joinId))
  }, [])

  const getJoinForPresence = useCallback(
    (presenceId: string): PresenceJoin | undefined =>
      joins.find((j) => j.presence_id === presenceId),
    [joins]
  )

  return { joins, loading, error, join, cancel, getJoinForPresence }
}
