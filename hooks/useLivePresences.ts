import { useState, useEffect, useRef } from 'react'
import { AppState } from 'react-native'
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

export function useLivePresences(friendIds: string[]) {
  const { session } = useAuth()
  const [presences, setPresences] = useState<LivePresenceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const profileCache = useRef<Map<string, ProfileData>>(new Map())
  const channelId = useRef(`live-presence-changes-${Date.now()}-${Math.random()}`)
  // Tracks whether each channel has successfully subscribed, used to distinguish
  // initial connect (initial load is in flight — no refetch needed) from reconnects.
  const channelHealth = useRef({ community: false, friends: false })
  // Monotonic: flips true on first SUBSCRIBED, never reset to false.
  // Distinct from channelHealth so that a CHANNEL_ERROR doesn't erase the
  // "we've connected before" signal and break the reconnect-refetch path.
  const everSubscribed = useRef({ community: false, friends: false })

  // Stable string key for the dependency array — avoids re-running the effect
  // on every render when the caller passes a new array reference with the same IDs.
  const friendIdsKey = friendIds.join(',')

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setPresences([])
      setLoading(false)
      return
    }

    let active = true
    // Reset health for this effect run — channels are recreated on every re-subscribe.
    channelHealth.current = { community: false, friends: false }
    everSubscribed.current = { community: false, friends: false }
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
        console.error(
          `useLivePresences: Failed to process INSERT for presence ${payload.new.id} / user ${payload.new.user_id}`,
          err
        )
      }
    }

    const handleUpdate = (payload: { new: Record<string, unknown> }) => {
      if (!active) return
      try {
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
      } catch (err) {
        console.error(
          `useLivePresences: Failed to process UPDATE for presence ${payload.new.id} / user ${payload.new.user_id}`,
          err
        )
      }
    }

    // Creates a status handler for the named channel.
    // Each channel tracks its own health independently so that one channel reconnecting
    // does not clear the error state set by a still-broken sibling channel.
    const makeStatusHandler = (channelName: 'community' | 'friends') => (status: string, err?: Error) => {
      if (!active) return
      if (status === 'SUBSCRIBED') {
        const wasEverSubscribed = everSubscribed.current[channelName]
        everSubscribed.current[channelName] = true
        channelHealth.current[channelName] = true
        if (wasEverSubscribed) {
          // Reconnected after a drop or CHANNEL_ERROR — re-fetch to catch missed events.
          // fetchPresences() calls setError(null) on success, so we intentionally do NOT
          // clear the error here — clearing it before the async fetch resolves would
          // create a race where the banner dismisses even if the refetch fails.
          fetchPresences()
        } else {
          // Initial connect — no refetch needed. Clear any stale error if all channels healthy.
          const allHealthy = channelHealth.current.community &&
            (friendIds.length === 0 || channelHealth.current.friends)
          if (allHealthy) setError(null)
        }
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        channelHealth.current[channelName] = false
        // App backgrounding drops the WebSocket — suppress noise, reconnect handles recovery
        if (AppState.currentState === 'background') return
        console.error(`useLivePresences [${channelName}]: Realtime ${status}`, err?.message ?? '(no details)')
        setError('Live updates disconnected — pull to refresh.')
      }
    }

    // Channel 1: community broadcasts — always active, no friend list needed.
    const communityChannel = supabase
      .channel(`${channelId.current}-community`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_presence',
        filter: 'visible_to=eq.community',
      }, handleInsert)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'live_presence',
        filter: 'visible_to=eq.community',
      }, handleUpdate)
      .subscribe(makeStatusHandler('community'))

    // Channel 2: friends-only broadcasts — only created when the caller has accepted friends.
    // Filtered to visible_to==='friends' in the handler to avoid double-processing a friend's
    // community broadcast (which arrives via the community channel above).
    const friendsChannel = friendIds.length > 0
      ? supabase
          .channel(`${channelId.current}-friends`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'live_presence',
            filter: `user_id=in.(${friendIdsKey})`,
          }, (payload) => {
            if ((payload.new as Record<string, unknown>).visible_to === 'friends') handleInsert(payload)
          })
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'live_presence',
            filter: `user_id=in.(${friendIdsKey})`,
          }, (payload) => {
            if ((payload.new as Record<string, unknown>).visible_to === 'friends') handleUpdate(payload)
          })
          .subscribe(makeStatusHandler('friends'))
      : null

    return () => {
      active = false
      supabase.removeChannel(communityChannel)
      if (friendsChannel) supabase.removeChannel(friendsChannel)
    }
  }, [session?.user.id, friendIdsKey])

  return { presences, loading, error }
}
