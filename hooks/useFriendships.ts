import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  FriendshipStatus,
  FriendshipWithProfiles,
  fetchFriendships,
  sendRequest as libSendRequest,
  cancelRequest as libCancelRequest,
  acceptRequest as libAcceptRequest,
  declineRequest as libDeclineRequest,
  unfriend as libUnfriend,
} from '@/lib/friendships'

export type FriendEntry = {
  friendshipId: string
  userId: string
  displayName: string
  avatarUrl: string | null
}

export type IncomingRequestEntry = {
  friendshipId: string
  requesterId: string
  displayName: string
  avatarUrl: string | null
}

function deriveState(rows: FriendshipWithProfiles[], userId: string) {
  const friends: FriendEntry[] = []
  const incomingRequests: IncomingRequestEntry[] = []
  // Maps counterparty userId → friendshipId for pending-sent rows.
  // Using a Map enables O(1) status lookups in the search results view.
  const outgoingRequestMap = new Map<string, string>()

  for (const row of rows) {
    const iAmRequester = row.requester_id === userId
    const counterparty = iAmRequester ? row.addressee : row.requester

    if (row.status === 'accepted') {
      friends.push({
        friendshipId: row.id,
        userId: counterparty.id,
        displayName: counterparty.display_name,
        avatarUrl: counterparty.avatar_url,
      })
    } else if (row.status === 'pending') {
      if (iAmRequester) {
        outgoingRequestMap.set(counterparty.id, row.id)
      } else {
        incomingRequests.push({
          friendshipId: row.id,
          requesterId: row.requester.id,
          displayName: row.requester.display_name,
          avatarUrl: row.requester.avatar_url,
        })
      }
    }
  }

  return { friends, incomingRequests, outgoingRequestMap }
}

export function useFriendships() {
  const { session } = useAuth()
  const [rows, setRows] = useState<FriendshipWithProfiles[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelId = useRef(`friendships-changes-${Date.now()}-${Math.random()}`)

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setRows([])
      setLoading(false)
      return
    }

    let active = true
    setError(null)
    setLoading(true)

    async function load() {
      try {
        const data = await fetchFriendships(supabase)
        if (!active) return
        setRows(data)
      } catch (err) {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('useFriendships:', message)
        setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    // Subscribe to changes on the friendships table and refetch.
    // RLS ensures only events for the current user's rows are delivered.
    // This keeps both parties in sync without a reload — e.g. the recipient
    // sees an incoming request immediately when the sender taps "Add Friend".
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
        if (!active) return
        if (status === 'SUBSCRIBED') {
          if (subscribedOnce) {
            // Reconnected after a drop — re-fetch to catch missed events and clear error
            if (active) {
              setError(null)
              load()
            }
          } else {
            subscribedOnce = true
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('useFriendships: Realtime channel error', err ?? '(no details)')
          if (active) setError('Live updates disconnected — pull to refresh.')
        } else if (status === 'TIMED_OUT') {
          console.error('useFriendships: Realtime subscription timed out')
          if (active) setError('Live updates disconnected — pull to refresh.')
        } else if (status === 'CLOSED') {
          console.error('useFriendships: Realtime channel closed unexpectedly')
          if (active) setError('Live updates disconnected — pull to refresh.')
        }
      })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [session?.user.id])

  const userId = session?.user.id ?? ''

  const { friends, incomingRequests, outgoingRequestMap } = useMemo(
    () => deriveState(rows, userId),
    [rows, userId]
  )

  const readonlyOutgoingRequestMap: ReadonlyMap<string, string> = outgoingRequestMap
  const pendingCount = incomingRequests.length

  const getStatusForUser = useCallback((targetUserId: string): FriendshipStatus => {
    if (friends.some((f) => f.userId === targetUserId)) return 'accepted'
    if (outgoingRequestMap.has(targetUserId)) return 'pending_sent'
    if (incomingRequests.some((r) => r.requesterId === targetUserId)) return 'pending_received'
    return 'none'
  }, [friends, outgoingRequestMap, incomingRequests])

  const getFriendshipId = useCallback((targetUserId: string): string | null => {
    return outgoingRequestMap.get(targetUserId) ??
      incomingRequests.find((r) => r.requesterId === targetUserId)?.friendshipId ??
      friends.find((f) => f.userId === targetUserId)?.friendshipId ??
      null
  }, [friends, outgoingRequestMap, incomingRequests])

  const sendRequest = useCallback(async (addresseeId: string): Promise<void> => {
    // Optimistic: insert a synthetic row into raw state so deriveState()
    // immediately reflects the pending-sent status.
    const optimisticRow: FriendshipWithProfiles = {
      id: `optimistic-${Date.now()}`,
      requester_id: userId,
      addressee_id: addresseeId,
      status: 'pending',
      created_at: new Date().toISOString(),
      requester: { id: userId, display_name: '', avatar_url: null },
      addressee: { id: addresseeId, display_name: '', avatar_url: null },
    }
    setRows((prev) => [...prev, optimisticRow])
    try {
      const inserted = await libSendRequest(supabase, { addresseeId })
      // Replace optimistic row with real row. Profile data is still placeholder —
      // the Realtime INSERT event will trigger a full refetch with joined profiles.
      setRows((prev) =>
        prev.map((r) =>
          r.id === optimisticRow.id
            ? { ...optimisticRow, id: inserted.id }
            : r
        )
      )
    } catch (err) {
      setRows((prev) => prev.filter((r) => r.id !== optimisticRow.id))
      throw err
    }
  }, [userId])

  const cancelRequest = useCallback(async (friendshipId: string): Promise<void> => {
    let snapshot: FriendshipWithProfiles[] = []
    setRows((current) => { snapshot = current; return current.filter((row) => row.id !== friendshipId) })
    try {
      await libCancelRequest(supabase, { friendshipId })
    } catch (err) {
      setRows(snapshot)
      throw err
    }
  }, [])

  const acceptRequest = useCallback(async (friendshipId: string): Promise<void> => {
    let snapshot: FriendshipWithProfiles[] = []
    setRows((current) => {
      snapshot = current
      return current.map((row) => row.id === friendshipId ? { ...row, status: 'accepted' as const } : row)
    })
    try {
      await libAcceptRequest(supabase, { friendshipId })
    } catch (err) {
      setRows(snapshot)
      throw err
    }
  }, [])

  const declineRequest = useCallback(async (friendshipId: string): Promise<void> => {
    let snapshot: FriendshipWithProfiles[] = []
    setRows((current) => { snapshot = current; return current.filter((row) => row.id !== friendshipId) })
    try {
      await libDeclineRequest(supabase, { friendshipId })
    } catch (err) {
      setRows(snapshot)
      throw err
    }
  }, [])

  const unfriend = useCallback(async (friendshipId: string): Promise<void> => {
    let snapshot: FriendshipWithProfiles[] = []
    setRows((current) => { snapshot = current; return current.filter((row) => row.id !== friendshipId) })
    try {
      await libUnfriend(supabase, { friendshipId })
    } catch (err) {
      setRows(snapshot)
      throw err
    }
  }, [])

  return {
    friends,
    incomingRequests,
    outgoingRequestMap: readonlyOutgoingRequestMap,
    pendingCount,
    loading,
    error,
    sendRequest,
    cancelRequest,
    acceptRequest,
    declineRequest,
    unfriend,
    getStatusForUser,
    getFriendshipId,
  }
}
