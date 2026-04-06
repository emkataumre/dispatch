import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type LivePresenceEntry = {
  id: string
  userId: string
  poiId: string
  displayName: string
  avatarUrl: string | null
  message: string | null
}

type ProfileData = {
  displayName: string
  avatarUrl: string | null
}

export function useLivePresences() {
  const { session } = useAuth()
  const [presences, setPresences] = useState<LivePresenceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const profileCache = useRef<Map<string, ProfileData>>(new Map())
  const channelId = useRef(`live-presence-changes-${Date.now()}-${Math.random()}`)

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setPresences([])
      setLoading(false)
      return
    }

    let active = true
    let initialSubscribe = true
    setError(null)
    setLoading(true)

    const fetchPresences = async () => {
      const { data, error: fetchError } = await supabase
        .from('live_presence')
        .select('id, user_id, poi_id, message, profiles(display_name, avatar_url)')
        .is('dismissed_at', null)
        .neq('user_id', userId)
      if (!active) return
      if (fetchError) {
        console.error('useLivePresences:', fetchError.message)
        setError(fetchError.message)
        setLoading(false)
        return
      }
      const entries: LivePresenceEntry[] = []
      for (const row of (data ?? [])) {
        const profile = row.profiles as { display_name: string; avatar_url: string | null } | null
        const displayName = profile?.display_name ?? ''
        const avatarUrl = profile?.avatar_url ?? null
        profileCache.current.set(row.user_id, { displayName, avatarUrl })
        entries.push({
          id: row.id,
          userId: row.user_id,
          poiId: row.poi_id,
          displayName,
          avatarUrl,
          message: row.message,
        })
      }
      setPresences(entries)
      setError(null)
      setLoading(false)
    }

    fetchPresences()

    const handleInsert = async (payload: { new: Record<string, unknown> }) => {
      if (!active) return
      try {
        const row = payload.new
        const rowUserId = row.user_id as string
        if (rowUserId === userId || !!row.dismissed_at) return

        // Always fetch fresh profile data on INSERT — the cache may hold a stale
        // avatar_url if the user updated their profile picture since it was cached.
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', rowUserId)
          .single()
        if (!active) return
        if (profileError) {
          console.error(`useLivePresences: Failed to fetch profile for ${rowUserId}:`, profileError.message)
          if (!profileCache.current.has(rowUserId)) {
            console.warn(`useLivePresences: no cached profile for user ${rowUserId}, presence will show as Unknown`)
          }
        }
        const profile: ProfileData = data
          ? { displayName: data.display_name, avatarUrl: data.avatar_url }
          : profileCache.current.get(rowUserId) ?? { displayName: 'Unknown', avatarUrl: null }
        profileCache.current.set(rowUserId, profile)

        const entry: LivePresenceEntry = {
          id: row.id as string,
          userId: rowUserId,
          poiId: row.poi_id as string,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          message: (row.message as string | null) ?? null,
        }

        setPresences((prev) => {
          if (prev.some((p) => p.id === entry.id)) return prev
          return [...prev, entry]
        })
      } catch (err) {
        console.error('useLivePresences: Failed to process INSERT event', err)
      }
    }

    const handleUpdate = (payload: { new: Record<string, unknown> }) => {
      if (!active) return
      const row = payload.new
      if ((row.user_id as string) === userId) return
      if (!!row.dismissed_at) {
        setPresences((prev) => prev.filter((p) => p.id !== (row.id as string)))
      } else {
        // Non-dismissal UPDATE (e.g. message edit) — update in-place
        setPresences((prev) =>
          prev.map((p) =>
            p.id === (row.id as string)
              ? { ...p, message: (row.message as string | null) ?? null }
              : p
          )
        )
      }
    }

    const channel = supabase
      .channel(channelId.current)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_presence' }, handleInsert)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_presence' }, handleUpdate)
      .subscribe((status: string, err?: Error) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          if (initialSubscribe) {
            initialSubscribe = false
          } else {
            // Reconnected after a drop — re-fetch to catch missed events
            fetchPresences()
          }
        } else if (status === 'TIMED_OUT') {
          console.error('useLivePresences: Realtime subscription timed out')
          setError('Live updates timed out — pull to refresh.')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('useLivePresences: Realtime channel error', err?.message ?? '(no details)')
          setError('Live updates unavailable — pull to refresh.')
        } else if (status === 'CLOSED') {
          console.error('useLivePresences: Realtime channel closed unexpectedly')
        }
      })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [session?.user.id])

  return { presences, loading, error }
}
